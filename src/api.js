import { getModel, IMAGE_SIZES, SEEDREAM_SIZES, RATIOS } from './models.js';

export function normalizeBaseUrl(value) {
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('请输入完整的接口地址，例如 https://duoyuanx.com'); }
  if (url.username || url.password || url.search || url.hash) throw new Error('接口地址不能包含账号、查询参数或锚点。');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('中转站地址必须使用 HTTPS（本机调试除外）。');
  const path = url.pathname.replace(/\/+$/, '').replace(/\/(?:v1\/images\/(?:generations|edits)|v1beta\/models|v1|v1beta)$/, '');
  return `${url.origin}${path}`;
}

export function buildRequest(draft, references = []) {
  const model = getModel(draft.modelId);
  if (!model) throw new Error('请选择已接入的模型。');
  if (!draft.prompt?.trim()) throw new Error('请先填写画面描述。');
  if (draft.prompt.length > 4000) throw new Error('画面描述最多 4000 字。');
  if (!RATIOS.includes(draft.ratio)) throw new Error('请选择有效的画面比例。');
  const refs = draft.mode === 'reference' ? references : [];
  if (draft.mode === 'reference' && !refs.length) throw new Error('图生图至少需要一张参考图片。');
  if (refs.length > 6) throw new Error('每次最多使用 6 张参考图片。');
  if (model.family === 'banana') {
    return {
      path: `/v1beta/models/${encodeURIComponent(model.id)}:generateContent`,
      body: {
        contents: [{ role: 'user', parts: [{ text: draft.prompt.trim() }, ...refs.map(ref => ({ inlineData: { mimeType: ref.mimeType, data: ref.base64 } }))] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: draft.ratio, imageSize: model.pro ? draft.resolution : '1K' } },
      },
    };
  }
  const body = { model: model.id, prompt: draft.prompt.trim(), n: 1, size: (model.family === 'seedream' ? SEEDREAM_SIZES : IMAGE_SIZES)[draft.ratio], response_format: 'b64_json' };
  if (model.family === 'image') body.quality = draft.quality;
  if (refs.length) body.image = refs.map(ref => `data:${ref.mimeType};base64,${ref.base64}`);
  return { path: '/v1/images/generations', body };
}

export function safeImageUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) ? url.href : null; } catch { return null; }
}

export function parseImages(data) {
  if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message || '中转站返回了错误。');
  const images = [];
  function add(value, mimeType = 'image/png', revisedPrompt = '') {
    if (typeof value !== 'string' || !value.trim()) return;
    const url = safeImageUrl(value);
    if (url) images.push({ url, revisedPrompt });
    else if (/^data:image\/(?:png|jpeg|webp);base64,/i.test(value)) images.push({ base64: value.split(',')[1], mimeType: value.slice(5, value.indexOf(';')), revisedPrompt });
    else if (/^[A-Za-z0-9+/=\s]+$/.test(value)) images.push({ base64: value.replace(/\s/g, ''), mimeType: /^image\/(png|jpeg|webp)$/.test(mimeType) ? mimeType : 'image/png', revisedPrompt });
  }
  for (const item of Array.isArray(data?.data) ? data.data : []) add(item.b64_json || item.url, item.mime_type, item.revised_prompt);
  for (const candidate of data?.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      const inline = part.inlineData || part.inline_data;
      if (inline) add(inline.data, inline.mimeType || inline.mime_type);
      const file = part.fileData || part.file_data;
      if (file) add(file.fileUri || file.file_uri, file.mimeType || file.mime_type);
    }
  }
  if (!images.length) {
    if (data?.promptFeedback?.blockReason || data?.candidates?.some(c => ['SAFETY', 'IMAGE_SAFETY', 'BLOCKLIST', 'PROHIBITED_CONTENT'].includes(c.finishReason))) throw new Error('模型未返回图片：提示词或参考图被上游内容策略拦截，请调整后重新生成。');
    const message = data?.candidates?.flatMap(c => c.content?.parts || []).map(p => p.text || '').filter(Boolean).join(' ').slice(0, 350);
    throw new Error(message ? `模型只返回了文字：${message}` : '接口响应中没有图片。请确认该 Key 的模型权限和中转站图像渠道。');
  }
  return images;
}

export function redact(message, key) {
  let text = String(message);
  if (key) text = text.split(key).join('[密钥已隐藏]');
  return text.replace(/Bearer\s+\S+/gi, 'Bearer [已隐藏]').slice(0, 600);
}

export async function generateImage(config, draft, references, signal) {
  const base = normalizeBaseUrl(config.baseUrl);
  if (!config.apiKey.trim()) throw new Error('请先在 API 设置中填写 API Key。');
  const request = buildRequest(draft, references);
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, Math.min(600, Math.max(30, config.timeout || 300)) * 1000);
  try {
    const response = await fetch(`${base}${request.path}`, { method: 'POST', headers: { Authorization: `Bearer ${config.apiKey.trim()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(request.body), signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' });
    let data;
    try { data = await response.json(); } catch { if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError'); throw new Error(`接口返回非 JSON 数据（HTTP ${response.status}），请检查接口地址。`); }
    if (!response.ok) {
      const messages = { 401: 'API Key 无效或已过期', 403: '没有访问该模型的权限，或额度不足', 404: '接口或模型不存在', 429: '请求过于频繁或额度不足', 413: '参考图太大，请压缩后重试' };
      const detail = typeof data?.error === 'string' ? data.error : data?.error?.message || data?.message || '';
      throw new Error(`${messages[response.status] || '中转站请求失败'}（HTTP ${response.status}）${detail ? `：${detail}` : ''}`);
    }
    return parseImages(data);
  } catch (error) {
    if (timedOut) throw new Error('等待图片超时。上游可能仍在处理，请先核对中转站记录，再决定是否重新生成。');
    if (controller.signal.aborted) throw new DOMException('已停止等待；上游可能仍会生成和计费。', 'AbortError');
    if (error instanceof TypeError) throw new Error('无法连接中转站。请检查网络、接口地址和中转站 CORS 设置（需允许当前网站来源及 Authorization 请求头）。');
    throw new Error(redact(error.message, config.apiKey));
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}

export async function materializeImage(image, signal) {
  if (image.base64) {
    let binary;
    try { binary = atob(image.base64); } catch { throw new Error('上游返回的图片 Base64 无效。'); }
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new Blob([bytes], { type: image.mimeType || 'image/png' });
  }
  if (!safeImageUrl(image.url)) throw new Error('上游返回了无效的图片地址。');
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 60000);
  try {
    // Never forward the API key to a generated image URL or CDN.
    const response = await fetch(image.url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error(`图片下载失败（HTTP ${response.status}）`);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/') || blob.type.includes('svg')) throw new Error('图片地址返回的内容不是支持的图片文件。');
    return blob;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}

export async function fileToReference(blob) {
  const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('读取参考图失败。')); reader.readAsDataURL(blob); });
  return { mimeType: blob.type, base64: data.slice(data.indexOf(',') + 1) };
}

export async function checkConnection(config, signal) {
  const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/v1/models`, { headers: { Authorization: `Bearer ${config.apiKey.trim()}` }, signal, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' });
  if (!response.ok) throw new Error(`连接检查失败（HTTP ${response.status}），请确认 Key 和模型列表权限。`);
  const data = await response.json();
  if (!Array.isArray(data.data)) throw new Error('模型列表格式不兼容；仍可保存配置并尝试生成。');
  return data.data.map(item => item.id);
}
