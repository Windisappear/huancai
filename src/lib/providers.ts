import type { Task } from '@prisma/client';
import sharp from 'sharp';
import { AppError, demoMode } from './core';
import { relayConfig } from './relay-config';
export type ProviderResult = { state: 'SUCCEEDED'; outputs: Buffer[] } | { state: 'PENDING'; upstreamId: string } | { state: 'FAILED'; message: string; httpStatus?: number };
export interface GenerationAdapter {
  submit(task: Task, prompt: string, references: Buffer[]): Promise<ProviderResult>;
  query(upstreamId: string): Promise<ProviderResult>;
}

export function adapterAvailable(adapter: string) {
  if (adapter === 'demo') return demoMode();
  if (adapter === 'openai-images') return !!relayConfig();
  return false;
}

function demoProvider(): GenerationAdapter {
  return {
    async submit(task, _prompt, references) {
      const [width, height] = task.size.split('x').map(Number);
      const outputs: Buffer[] = [];
      for (let i = 0; i < task.count; i++) {
        const svg = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#263247"/><stop offset="1" stop-color="#81878b"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${width * .63}" cy="${height * .4}" r="${Math.min(width, height) * .2}" fill="#c7d2df"/><path d="M0 ${height * .8} L${width * .4} ${height * .5} L${width} ${height} H0Z" fill="#162637"/><text x="40" y="70" fill="white" font-size="26" font-family="sans-serif">TEST IMAGE / NOT AI GENERATED</text><text x="40" y="${height - 35}" fill="white" font-size="22">${width} x ${height} / ${i + 1}</text></svg>`);
        const watermark = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect y="0" width="100%" height="90" fill="#000" fill-opacity=".7"/><text x="30" y="55" fill="white" font-size="22" font-family="sans-serif">REFERENCE TEST / NOT AI GENERATED</text></svg>`);
        outputs.push(references.length ? await sharp(references[0]).resize(width, height, { fit: 'cover' }).composite([{ input: watermark }]).png().toBuffer() : await sharp(svg).png().toBuffer());
      }
      return { state: 'SUCCEEDED', outputs };
    },
    async query() { return { state: 'FAILED', message: '测试适配器没有异步上游任务' }; }
  };
}

async function imageBytes(item: { b64_json?: string; url?: string }) {
  let bytes: Buffer;
  if (item.b64_json) {
    bytes = Buffer.from(item.b64_json, 'base64');
  } else if (item.url) {
    const response = await fetch(item.url, { redirect: 'follow', signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`下载上游图片失败（HTTP ${response.status}）`);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > 40 * 1024 * 1024) throw new Error('上游图片超过 40 MB');
    bytes = Buffer.from(await response.arrayBuffer());
  } else {
    throw new Error('上游没有返回图片数据');
  }
  if (!bytes.length || bytes.length > 40 * 1024 * 1024) throw new Error('上游图片为空或过大');
  return sharp(bytes, { limitInputPixels: 80_000_000 }).rotate().png().toBuffer();
}

function openAiImagesProvider(): GenerationAdapter {
  const config = relayConfig();
  if (!config) throw new AppError('中转接口尚未配置');
  return {
    async submit(task, prompt, references) {
      try {
        const headers = { Authorization: `Bearer ${config.apiKey}` };
        let response: Response;
        if (references.length) {
          const body = new FormData();
          body.set('model', task.upstreamModel);
          body.set('prompt', prompt);
          body.set('n', String(task.count));
          body.set('size', task.size);
          if (task.quality !== 'auto') body.set('quality', task.quality);
          for (const [index, reference] of references.entries()) {
            const png = await sharp(reference).rotate().png().toBuffer();
            body.append('image', new Blob([new Uint8Array(png)], { type: 'image/png' }), `reference-${index + 1}.png`);
          }
          response = await fetch(`${config.baseUrl}/images/edits`, { method: 'POST', headers, body, signal: AbortSignal.timeout(180_000) });
        } else {
          response = await fetch(`${config.baseUrl}/images/generations`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: task.upstreamModel, prompt, n: task.count, size: task.size, ...(task.quality === 'auto' ? {} : { quality: task.quality }) }),
            signal: AbortSignal.timeout(180_000)
          });
        }
        if (!response.ok) {
          if (response.status >= 500 || response.status === 408) throw new Error('上游结果不明确');
          return { state: 'FAILED', message: `上游拒绝请求（HTTP ${response.status}）` };
        }
        const payload = await response.json() as { data?: { b64_json?: string; url?: string }[] };
        const outputs = await Promise.all((payload.data || []).slice(0, task.count).map(imageBytes));
        if (!outputs.length) throw new Error('上游未返回可确认的结果');
        return { state: 'SUCCEEDED', outputs };
      } catch (error) {
        // Worker places ambiguous submissions in REVIEW; never encourage a paid retry.
        throw new Error('上游结果待核查，禁止自动重新生成');
      }
    },
    async query() { return { state: 'FAILED', message: '当前图片接口不提供异步任务查询' }; }
  };
}

export function provider(adapter: string): GenerationAdapter {
  if (!adapterAvailable(adapter)) throw new AppError('供应商接口未配置或未验证，禁止调用');
  if (adapter === 'demo') return demoProvider();
  if (adapter === 'openai-images') return openAiImagesProvider();
  throw new AppError('未知供应商适配器');
}
