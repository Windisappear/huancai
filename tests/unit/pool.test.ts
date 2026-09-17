import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@prisma/client';
import sharp from 'sharp';
import { parseLocalKeys, providerSecret, safeProviderBase } from '../../src/lib/provider-secrets';
import { selectCandidate, type Candidate } from '../../src/lib/pool-selection';
import { pooledProvider } from '../../src/lib/pool-adapters';
import { presetModels, presetPrices, presetRoutes } from '../../src/lib/pool-presets';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const row: Candidate = { accountId: 'a', routeId: 'r', costMicros: 100000, priority: 0, inFlight: 0, maxInFlight: 2, lastUsedAt: null, cooldownUntil: null };
function task(adapter = 'toapis-images') { vi.stubEnv('POOL_TEST_1_KEY', 'test-only-secret'); return { id: 'task1', adapter, upstreamModel: 'gpt-image-2-vip', size: '1024x1024', count: 1, quality: 'low', credentialEnv: 'POOL_TEST_1_KEY', endpointBaseUrl: 'https://provider.example', upstreamParams: { ratio: '1:1', resolution: '1K' } } as unknown as Task; }
it('keeps labelled credentials isolated including full-width key labels', () => {
  expect(parseLocalKeys('image2：\nhttps://legacy.example/v1\nsk-legacy\n多元探索\nkey：sk-duoyuan\ntoapis\nkey：sk-toapis')).toEqual({ RELAY_API_KEY: 'sk-legacy', POOL_DUOYUAN_1_KEY: 'sk-duoyuan', POOL_TOAPIS_1_KEY: 'sk-toapis' });
  expect(parseLocalKeys('unknown\nsk-secret')).toEqual({});
  vi.stubEnv('DATABASE_URL', 'not-an-api-key'); expect(providerSecret('DATABASE_URL')).toBeUndefined();
});
it('selects cheap ready accounts but excludes over-capacity, cooldown and loss-making routes', () => {
  expect(selectCandidate([{ ...row, accountId: 'busy', inFlight: 2 }, { ...row, accountId: 'cool', cooldownUntil: new Date(Date.now()+60000) }, { ...row, accountId: 'expensive', costMicros: 400000 }, row], 200000)?.accountId).toBe('a');
  expect(selectCandidate([{ ...row, inFlight: 2 }], 200000)).toBeUndefined();
  expect(selectCandidate([{ ...row, inFlight: 1 }, { ...row, accountId: 'idle' }], 200000)?.accountId).toBe('idle');
});
it('rejects endpoints containing credentials and local hosts', () => {
  for (const s of ['http://example.com', 'https://key@example.com', 'https://example.com?key=secret', 'https://127.0.0.1', 'https://localhost']) expect(() => safeProviderBase(s)).toThrow();
});
it('submits the documented ToAPIs shape and queries the same upstream id', async () => {
  const t = task(); const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).png().toBuffer();
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ id: 'upstream-1', status: 'queued' })).mockResolvedValueOnce(Response.json({ status: 'completed', result: { data: [{ b64_json: png.toString('base64') }] } })); vi.stubGlobal('fetch', fetcher);
  const adapter = pooledProvider(t); expect(await adapter.submit(t, 'test', [])).toEqual({ state: 'PENDING', upstreamId: 'upstream-1' });
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ size: '1:1', resolution: '1k', quality: 'low', n: 1 });
  expect((await adapter.query('upstream-1')).state).toBe('SUCCEEDED');
  expect(fetcher.mock.calls.map(c => c[1].method)).toEqual(['POST', 'GET']);
});
it('never retries ambiguous generation or leaks an upstream error body', async () => {
  const t = task(); const fn = vi.fn().mockResolvedValue(new Response('test-only-secret', { status: 502 })); vi.stubGlobal('fetch', fn);
  await expect(pooledProvider(t).submit(t, 'test', [])).rejects.toThrow('待核查'); expect(fn).toHaveBeenCalledTimes(1);
  fn.mockResolvedValue(new Response('test-only-secret', { status: 429 })); expect(await pooledProvider(t).submit(t, 'test', [])).toEqual({ state: 'FAILED', message: '上游拒绝请求（HTTP 429）', httpStatus: 429 });
});
it('uses only the task-bound credential and sends reference uploads before ToAPIs generation', async () => {
  const t = task(); vi.stubEnv('RELAY_API_KEY', 'wrong-provider-key'); const fn = vi.fn().mockResolvedValueOnce(Response.json({ success: true, data: { url: 'https://files.example/ref.png' } })).mockResolvedValueOnce(Response.json({ id: 't', status: 'queued' })); vi.stubGlobal('fetch', fn);
  await pooledProvider(t).submit(t, 'ref', [Buffer.from('image')]);
  expect(fn.mock.calls[0][0]).toBe('https://provider.example/v1/uploads/images');
  expect(fn.mock.calls[1][1].headers.Authorization).toBe('Bearer test-only-secret');
  expect(JSON.parse(fn.mock.calls[1][1].body).reference_images).toEqual(['https://files.example/ref.png']);
});
it('sends Gemini native fields and extracts inline image data', async () => {
  const t = task('gemini-native'); t.upstreamModel = 'gemini-3-pro-image-preview';
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).png().toBuffer();
  const fn = vi.fn().mockResolvedValue(Response.json({ candidates: [{ content: { parts: [{ text: 'do not treat as image' }, { inlineData: { data: png.toString('base64') } }] } }] })); vi.stubGlobal('fetch', fn);
  expect((await pooledProvider(t).submit(t, 'test', [png])).state).toBe('SUCCEEDED');
  expect(JSON.parse(fn.mock.calls[0][1].body).generationConfig.imageConfig).toEqual({ aspectRatio: '1:1', imageSize: '1K' });
});
describe('curated presets', () => {
  it('keeps high-resolution Flash off Duoyuan and all retail prices above estimated output costs', () => {
    expect(presetRoutes.filter(r => r.modelId === 'banana2' && r.channelId === 'duoyuan').every(r => r.size === '1024x1024')).toBe(true);
    for (const p of presetPrices) { expect(p.unitCents).toBeGreaterThan(0); expect(presetRoutes.some(r => r.modelId === p.modelId && r.mode === p.mode && r.size === p.size && r.quality === p.quality && r.costMicros < p.unitCents * 10000)).toBe(true); }
    expect(new Set(presetModels.map(m => m.id)).size).toBe(presetModels.length);
    expect(new Set(presetRoutes.map(r => r.id)).size).toBe(presetRoutes.length);
  });
});
