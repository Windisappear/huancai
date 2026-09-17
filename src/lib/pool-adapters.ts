import type { Task } from '@prisma/client';
import sharp from 'sharp';
import { AppError } from './core';
import type { GenerationAdapter, ProviderResult } from './providers';
import { providerSecret, safeProviderBase } from './provider-secrets';
import { upstreamParamsSchema } from './pool-types';

export class UpstreamFailure extends Error {
  constructor(public status?: number) { super('上游结果待核查，禁止自动重新生成'); }
}
type Item = { url?: string; b64_json?: string };
const maxBytes = 40 * 1024 * 1024;
export async function decodeImage(item: Item) {
  let bytes: Buffer;
  if (item.b64_json) bytes = Buffer.from(item.b64_json.replace(/^data:image\/[^;]+;base64,/, ''), 'base64');
  else if (item.url) {
    safeProviderBase(item.url.split('?')[0]);
    const response = await fetch(item.url, { redirect: 'error', signal: AbortSignal.timeout(60_000) });
    if (!response.ok || Number(response.headers.get('content-length') || 0) > maxBytes || !response.body) throw new UpstreamFailure();
    const reader = response.body.getReader(); const parts: Uint8Array[] = []; let size = 0;
    while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > maxBytes) { await reader.cancel(); throw new UpstreamFailure(); } parts.push(chunk.value); }
    bytes = Buffer.concat(parts);
  } else throw new UpstreamFailure();
  if (!bytes.length || bytes.length > maxBytes) throw new UpstreamFailure();
  return sharp(bytes, { limitInputPixels: 80_000_000 }).rotate().png().toBuffer();
}

// One submission only. Querying an existing task is safe; resubmitting after a timeout is not.
export function pooledProvider(task: Task): GenerationAdapter {
  const key = task.credentialEnv && providerSecret(task.credentialEnv);
  if (!key || !task.endpointBaseUrl) throw new AppError('该任务的供应商账号未配置');
  const root = safeProviderBase(task.endpointBaseUrl);
  const opts = upstreamParamsSchema.parse(task.upstreamParams || {});
  const base = root.replace(/\/(v1|v1beta|api\/v3)$/, '');
  const auth = { Authorization: `Bearer ${key}` };
  const [w, h] = task.size.split('x').map(Number);
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  const ratio = opts.ratio || `${w / gcd(w, h)}:${h / gcd(w, h)}`;
  const resolution = opts.resolution || '1K';
  async function request(url: string, body?: unknown, headers: Record<string, string> = auth) {
    let r: Response;
    try { r = await fetch(url, { method: body === undefined ? 'GET' : 'POST', redirect: 'error', headers: { ...headers, ...(body instanceof FormData || body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body), signal: AbortSignal.timeout(180_000) }); }
    catch { throw new UpstreamFailure(); }
    if (!r.ok) throw new UpstreamFailure(r.status);
    return r.json();
  }
  async function images(items: Item[]): Promise<ProviderResult> {
    if (!items.length) throw new UpstreamFailure();
    return { state: 'SUCCEEDED', outputs: await Promise.all(items.slice(0, task.count).map(decodeImage)) };
  }
  async function toapisResult(payload: { id?: string; status?: string; result?: { data?: Item[] } }): Promise<ProviderResult> {
    if (payload.status === 'completed') return images(payload.result?.data || []);
    if (payload.status === 'failed' || payload.status === 'cancelled') return { state: 'FAILED', message: '上游任务生成失败' };
    if (payload.id && ['pending', 'queued', 'in_progress', 'processing'].includes(payload.status || '')) return { state: 'PENDING', upstreamId: payload.id };
    throw new UpstreamFailure();
  }
  return {
    async submit(_task, prompt, references) {
      try {
        // Pool entries are single-output: no hidden loop of billable submissions.
        if (task.count !== 1) throw new AppError('当前号池线路每次仅支持一张');
        if (task.adapter === 'toapis-images') {
          const urls: string[] = [];
          for (const ref of references) {
            if (ref.length > 10 * 1024 * 1024) return { state: 'FAILED', message: '此线路参考图最大10MB' };
            const form = new FormData(); form.set('file', new Blob([new Uint8Array(ref)], { type: 'image/png' }), 'reference.png');
            const upload = await request(`${base}/v1/uploads/images`, form);
            if (!upload.success || !upload.data?.url) return { state: 'FAILED', message: '参考图上传失败，未提交生成' };
            urls.push(upload.data.url);
          }
          const isGpt = task.upstreamModel.startsWith('gpt-');
          const isGemini = task.upstreamModel.startsWith('gemini-');
          const body = { model: task.upstreamModel, prompt, n: 1, size: ratio, ...(isGpt ? { resolution: resolution.toLowerCase(), ...(task.quality !== 'auto' ? { quality: task.quality } : {}) } : { metadata: { resolution } }), ...(urls.length ? isGpt ? { reference_images: urls } : { image_urls: isGemini ? urls.map(url => ({ url })) : urls } : {}) };
          return toapisResult(await request(`${base}/v1/images/generations`, body));
        }
        if (task.adapter === 'gemini-native') {
          const headers = new URL(base).hostname === 'generativelanguage.googleapis.com' ? { 'x-goog-api-key': key } : auth;
          const payload = await request(`${base}/v1beta/models/${encodeURIComponent(task.upstreamModel)}:generateContent`, { contents: [{ role: 'user', parts: [{ text: prompt }, ...references.map(r => ({ inlineData: { mimeType: 'image/png', data: r.toString('base64') } }))] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: ratio, imageSize: resolution } } }, headers);
          const parts = payload.candidates?.[0]?.content?.parts || [];
          const items: Item[] = parts.filter((p: { inlineData?: { data?: string } }) => p.inlineData?.data).map((p: { inlineData: { data: string } }) => /^https:\/\//.test(p.inlineData.data) ? { url: p.inlineData.data } : { b64_json: p.inlineData.data });
          if (!items.length && ['SAFETY', 'IMAGE_SAFETY'].includes(payload.candidates?.[0]?.finishReason)) return { state: 'FAILED', message: '上游未通过内容审核' };
          return images(items);
        }
        if (task.adapter === 'wan-native') {
          const payload = await request(`${base}/api/v1/services/aigc/multimodal-generation/generation`, { model: task.upstreamModel, input: { messages: [{ role: 'user', content: [...references.map(r => ({ image: `data:image/png;base64,${r.toString('base64')}` })), { text: prompt }] }] }, parameters: { n: 1, size: task.size.replace('x', '*'), watermark: false } });
          return images((payload.output?.choices || []).flatMap((c: { message?: { content?: { image?: string }[] } }) => (c.message?.content || []).filter(p => p.image).map(p => ({ url: p.image! }))));
        }
        if (task.adapter === 'openai-native' && references.length) {
          const body = new FormData(); body.set('model', task.upstreamModel); body.set('prompt', prompt); body.set('n', '1'); body.set('size', task.size); body.set('quality', task.quality);
          for (const r of references) body.append('image[]', new Blob([new Uint8Array(r)], { type: 'image/png' }), 'reference.png');
          return images((await request(`${base}/v1/images/edits`, body)).data || []);
        }
        const nativeSeed = task.adapter === 'seedream-native';
        const xai = task.adapter === 'xai-native';
        const endpoint = nativeSeed ? `${base}/api/v3/images/generations` : `${base}/v1/images/generations`;
        if (xai && references.length) return { state: 'FAILED', message: '此线路暂未开放参考图' };
        const body = { model: task.upstreamModel, prompt, ...(nativeSeed ? { sequential_image_generation: 'disabled', watermark: false } : { n: 1 }), ...(xai ? { aspect_ratio: ratio, resolution: resolution.toLowerCase() } : { size: task.size }), ...(['low', 'medium', 'high'].includes(task.quality) ? { quality: task.quality } : {}), ...(references.length ? { image: references.map(r => nativeSeed ? `data:image/png;base64,${r.toString('base64')}` : r.toString('base64')) } : {}) };
        return images((await request(endpoint, body)).data || []);
      } catch (e) {
        // Only an explicit request rejection can safely release the customer hold immediately.
        if (e instanceof UpstreamFailure && e.status && e.status >= 400 && e.status < 500 && e.status !== 408) return { state: 'FAILED', message: `上游拒绝请求（HTTP ${e.status}）`, httpStatus: e.status };
        throw e instanceof UpstreamFailure ? e : new UpstreamFailure();
      }
    },
    async query(id) {
      if (task.adapter !== 'toapis-images') throw new UpstreamFailure();
      const payload = await request(`${base}/v1/images/generations/${encodeURIComponent(id)}`);
      return toapisResult({ ...payload, id });
    }
  };
}
