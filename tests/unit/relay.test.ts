import { afterEach, expect, it, vi } from 'vitest';
import type { Task } from '@prisma/client';
import sharp from 'sharp';
import { provider } from '../../src/lib/providers';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function setup() {
  vi.stubEnv('RELAY_API_KEY', 'test-secret');
  vi.stubEnv('RELAY_BASE_URL', 'https://example.com/v1');
  return { upstreamModel: 'gpt-image-2', size: '1024x1024', count: 1, quality: 'auto' } as Task;
}
it('does not classify gateway failure as a safe-to-retry failed generation', async () => {
  const task = setup(); const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 502 }));
  vi.stubGlobal('fetch', fetchMock);
  await expect(provider('openai-images').submit(task, 'test', [])).rejects.toThrow('待核查');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('does not expose an upstream error body or credential to the user', async () => {
  const task = setup(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'test-secret' }), { status: 401 })));
  expect(await provider('openai-images').submit(task, 'test', [])).toEqual({ state: 'FAILED', message: '上游拒绝请求（HTTP 401）' });
});
it('decodes an image response without another generation request', async () => {
  const task = setup(); const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).png().toBuffer();
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] })));
  vi.stubGlobal('fetch', fetchMock);
  const result = await provider('openai-images').submit(task, 'test', []);
  expect(result.state).toBe('SUCCEEDED'); expect(fetchMock).toHaveBeenCalledTimes(1);
});
