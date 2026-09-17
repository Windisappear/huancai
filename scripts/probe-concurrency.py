"""Bounded, explicitly authorized paid probe. Never retries a generation POST.
Reads credentials locally; writes only task IDs, timings and sanitized statuses.
Run manually: python -u scripts/probe-concurrency.py --run-paid-probe
"""
import concurrent.futures
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

if '--run-paid-probe' not in sys.argv:
    raise SystemExit('Paid probe disabled. Requires explicit --run-paid-probe.')
sys.stdout.reconfigure(encoding='utf-8')
keys = {}
section = None
for line in pathlib.Path('api key.txt').read_text(encoding='utf-8-sig').splitlines():
    s = line.strip()
    if s.lower() == 'toapis': section = 'toapis'
    elif s == '多元探索': section = 'duoyuan'
    elif re.match(r'^image2', s, re.I): section = None
    else:
        m = re.search(r'sk-[A-Za-z0-9_-]+', s)
        if m and section: keys[section] = m.group(); section = None
if set(keys) != {'toapis', 'duoyuan'}: raise SystemExit('Two labelled provider keys are required.')
base = {'toapis': 'https://toapis.cn', 'duoyuan': 'https://duoyuanx.com'}
stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
path = pathlib.Path('research') / ('concurrency-' + stamp + '.json')
report = {'startedAt': stamp, 'estimatedBudgetCny': 5, 'maxStage': 8, 'providers': {}}

def save():
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs): return None
opener = urllib.request.build_opener(NoRedirect)

def request(provider, endpoint, body=None, timeout=180):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base[provider] + endpoint, data=data, headers={'Authorization': 'Bearer ' + keys[provider], 'User-Agent': 'FrameStudio-ConcurrencyProbe/1.0', 'Content-Type': 'application/json'})
    try:
        with opener.open(req, timeout=timeout) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, {}  # Never log upstream error bodies, which may echo credentials.

def usage(provider):
    try:
        status, data = request(provider, '/v1/balance' if provider == 'toapis' else '/api/usage/token/', timeout=20)
        if provider == 'toapis':
            return {'http': status, **{k: v for k,v in data.items() if k in ['used_balance', 'used_credits', 'credits_per_usd', 'unlimited_quota']}}
        row = data.get('data', {})
        return {'http': status, **{k: v for k, v in row.items() if k in ['total_used', 'total_available', 'total_granted', 'unlimited_quota']}}
    except Exception: return {'unavailable': True}

def generate(provider, index):
    start = time.monotonic()
    row = {'index': index, 'startedOffset': start - stage_start}
    body = {'model': 'gpt-image-2-vip' if provider == 'toapis' else 'gpt-image-2', 'prompt': 'Minimal flat icon: one blue circle on a plain white background. No text.', 'n': 1}
    body.update({'size': '1:1', 'resolution': '1k', 'quality': 'low'} if provider == 'toapis' else {'size': '1024x1024'})
    try:
        status, payload = request(provider, '/v1/images/generations', body)
        row.update(http=status, submitSeconds=round(time.monotonic()-start, 3))
        if not 200 <= status < 300:
            row['state'] = 'REJECTED' if status in [400, 401, 402, 403, 404, 429] else 'UNKNOWN'
            return row
        upstream = payload.get('id') or payload.get('task_id')
        if upstream: row['upstreamId'] = upstream
        if provider == 'toapis':
            if not upstream: row['state'] = 'UNKNOWN'; return row
            deadline = start + 420
            while payload.get('status') not in ['completed', 'failed', 'cancelled'] and time.monotonic() < deadline:
                time.sleep(3)
                try:
                    poll_status, polled = request(provider, '/v1/images/generations/' + urllib.parse.quote(upstream, safe=''), timeout=30)
                    if poll_status == 200: payload = polled
                    elif poll_status in [401,403,429]: row['pollHttp'] = poll_status; break
                except Exception: pass  # Only retry read-only status queries.
            results = payload.get('result', {}).get('data', [])
            row['state'] = 'SUCCEEDED' if payload.get('status') == 'completed' and results else 'FAILED' if payload.get('status') in ['failed','cancelled'] else 'UNKNOWN'
            billing = payload.get('billing', {})
            row['billing'] = {k:v for k,v in billing.items() if k in ['status','credits','cost_usd']}
        else:
            row['state'] = 'SUCCEEDED' if payload.get('data') else 'UNKNOWN'
        row['seconds'] = round(time.monotonic()-start,3)
        return row
    except Exception as error:
        row.update(state='UNKNOWN', exception=type(error).__name__, seconds=round(time.monotonic()-start,3))
        return row

for provider in ['toapis', 'duoyuan']:
    before = usage(provider)
    data = report['providers'][provider] = {'usageBefore': before, 'model': 'gpt-image-2-vip low 1K' if provider == 'toapis' else 'gpt-image-2 default 1024x1024', 'stages': []}
    print(provider, 'starting; no generation retries', flush=True)
    save()
    for concurrency in [1,2,4,8]:
        # Conservative reservation: ToAPIs Low <= .014/image, Duoyuan <= .25/image.
        stage_start = time.monotonic()
        stage = {'concurrency': concurrency, 'results': []}
        data['stages'].append(stage)
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
            futures = [executor.submit(generate, provider, i+1) for i in range(concurrency)]
            for future in concurrent.futures.as_completed(futures):
                row = future.result(); stage['results'].append(row); save()
                print(provider, 'stage', concurrency, 'request', row['index'], row['state'], 'http', row.get('http'), 'seconds', row.get('seconds'), flush=True)
        stage['wallSeconds'] = round(time.monotonic()-stage_start,3)
        stage['successCount'] = sum(r['state']=='SUCCEEDED' for r in stage['results'])
        data['usageAfter'] = usage(provider); save()
        if stage['successCount'] != concurrency:
            data['stoppedBecause'] = 'Failure, rejection or ambiguous outcome. No higher stage submitted.'
            save(); break
        # Stop if observed quota spending exceeds the conservative allowance.
        old, new = before.get('used_balance' if provider == 'toapis' else 'total_available'), data['usageAfter'].get('used_balance' if provider == 'toapis' else 'total_available')
        if isinstance(old,(int,float)) and isinstance(new,(int,float)):
            cost = (new-old)*7 if provider == 'toapis' else (old-new)/500000
            data['observedQuotaDeltaCny'] = round(cost,6)
            if cost > (0.25 if provider=='toapis' else 4):
                data['stoppedBecause'] = 'Observed spend exceeds planned allowance.'; save(); break
        time.sleep(2)
report['finishedAt'] = datetime.now(timezone.utc).isoformat()
save()
print('Report saved:', path, flush=True)
