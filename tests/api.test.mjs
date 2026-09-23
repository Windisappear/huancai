import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRequest, normalizeBaseUrl, parseImages, safeImageUrl, generateImage, materializeImage } from '../src/api.js';
import { MODELS, DEFAULT_DRAFT, IMAGE_SIZES, sanitizeDraft } from '../src/models.js';

const reference = { mimeType: 'image/png', base64: 'aGVsbG8=' };
const draft = { ...DEFAULT_DRAFT, prompt: '测试图片', ratio: '16:9' };

test('normalizes common base URL suffixes without dropping custom prefixes', () => {
  assert.equal(normalizeBaseUrl('https://duoyuanx.com/v1/'), 'https://duoyuanx.com');
  assert.equal(normalizeBaseUrl('https://relay.example/proxy/v1/images/generations'), 'https://relay.example/proxy');
  assert.equal(normalizeBaseUrl('https://relay.example/v1beta'), 'https://relay.example');
  assert.throws(() => normalizeBaseUrl('https://name:secret@relay.example'), /账号/);
  assert.throws(() => normalizeBaseUrl('http://relay.example'), /HTTPS/);
  assert.throws(() => normalizeBaseUrl('https://relay.example?key=secret'), /查询参数/);
});

test('all three families build their documented routes for text and reference input', () => {
  for (const model of MODELS) {
    for (const mode of ['text', 'reference']) {
      const { path, body } = buildRequest({ ...draft, modelId: model.id, mode, resolution: '2K', quality: 'high' }, [reference]);
      if (model.family === 'banana') {
        assert.match(path, /\/v1beta\/models\/.+:generateContent$/);
        assert.deepEqual(body.generationConfig.responseModalities, ['TEXT', 'IMAGE']);
        assert.equal(body.generationConfig.imageConfig.aspectRatio, '16:9');
        assert.equal(body.generationConfig.imageConfig.imageSize, model.pro ? '2K' : '1K');
        assert.equal(body.contents[0].parts.length, mode === 'text' ? 1 : 2);
        if (mode === 'reference') assert.deepEqual(body.contents[0].parts[1].inlineData, { mimeType: 'image/png', data: reference.base64 });
      } else {
        assert.equal(path, '/v1/images/generations');
        assert.equal(body.n, 1);
        assert.equal(body.response_format, 'b64_json');
        assert.equal(body.model, model.id);
        assert.equal(body.size, model.family === 'image' ? '1536x864' : '2560x1440');
        assert.equal(body.quality, model.family === 'image' ? 'high' : undefined);
        assert.deepEqual(body.image, mode === 'reference' ? [`data:image/png;base64,${reference.base64}`] : undefined);
      }
    }
  }
});

test('GPT dimensions satisfy the documented multiples-of-16 and pixel limits', () => {
  for (const value of Object.values(IMAGE_SIZES)) {
    const [w, h] = value.split('x').map(Number);
    assert.equal(w % 16, 0); assert.equal(h % 16, 0);
    assert.ok(w * h >= 655360 && w * h <= 8294400);
    assert.ok(w / h >= 1 / 3 && w / h <= 3);
  }
});

test('validates required input and excludes references from text-only generation', () => {
  assert.throws(() => buildRequest({ ...draft, prompt: ' ' }), /描述/);
  assert.throws(() => buildRequest({ ...draft, mode: 'reference' }), /参考图片/);
  assert.throws(() => buildRequest({ ...draft, modelId: 'unsupported' }), /已接入/);
  assert.equal(buildRequest(draft, [reference]).body.image, undefined);
  assert.equal(sanitizeDraft({ count: 99 }).count, 4);
});

test('parses OpenAI base64/url and Gemini camel/snake data and URL output', () => {
  assert.equal(parseImages({ data: [{ b64_json: 'aGVsbG8=' }] })[0].base64, 'aGVsbG8=');
  assert.equal(parseImages({ data: [{ url: 'https://cdn.example/result.png' }] })[0].url, 'https://cdn.example/result.png');
  assert.equal(parseImages({ candidates: [{ content: { parts: [{ inlineData: { data: 'https://cdn.example/gemini.png' } }] } }] })[0].url, 'https://cdn.example/gemini.png');
  assert.equal(parseImages({ candidates: [{ content: { parts: [{ inline_data: { data: 'aGVsbG8=', mime_type: 'image/webp' } }] } }] })[0].mimeType, 'image/webp');
  assert.throws(() => parseImages({ candidates: [{ finishReason: 'SAFETY' }] }), /拦截/);
  assert.throws(() => parseImages({ candidates: [{ content: { parts: [{ text: 'No image available' }] } }] }), /只返回了文字/);
  assert.throws(() => parseImages({ data: [{ url: 'javascript:alert(1)' }] }), /没有图片/);
  assert.equal(safeImageUrl('https://cdn.example/image.png'), 'https://cdn.example/image.png');
  assert.equal(safeImageUrl('file:///secret'), null);
});

test('HTTP errors are not retried and returned errors redact the API key', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ error: { message: 'bad secret-test-key' } }, { status: 401 }); };
  try {
    await assert.rejects(generateImage({ baseUrl: 'https://relay.example', apiKey: 'secret-test-key' }, draft, []), error => /401/.test(error.message) && !error.message.includes('secret-test-key'));
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test('API credentials go to the relay, and never to image downloads', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => { requests.push({ url, options }); return requests.length === 1 ? Response.json({ data: [{ url: 'https://cdn.example/image.png' }] }) : new Response(new Blob(['image'], { type: 'image/png' })); };
  try {
    const images = await generateImage({ baseUrl: 'https://relay.example/v1', apiKey: 'example-key' }, draft, []);
    const blob = await materializeImage(images[0]);
    assert.equal(requests[0].url, 'https://relay.example/v1/images/generations');
    assert.equal(requests[0].options.headers.Authorization, 'Bearer example-key');
    assert.equal(requests[0].options.redirect, 'error');
    assert.equal(requests[1].options.headers, undefined);
    assert.equal(requests[1].options.credentials, 'omit');
    assert.equal(blob.type, 'image/png');
  } finally { globalThis.fetch = originalFetch; }
});

test('cancelled generations abort waiting without automatically retrying', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException('Aborted', 'AbortError'));
    if (options.signal.aborted) abort(); else options.signal.addEventListener('abort', abort);
  });
  try {
    const controller = new AbortController();
    const promise = generateImage({ baseUrl: 'https://relay.example', apiKey: 'test' }, draft, [], controller.signal);
    controller.abort();
    await assert.rejects(promise, { name: 'AbortError' });
  } finally { globalThis.fetch = originalFetch; }
});
