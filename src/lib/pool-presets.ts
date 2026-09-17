// Public price snapshot: 2026-09-17. CNY costs use USD * 7, distinct from retail cents.
// Never overwrite operator edits when reseeding.
import type { Prisma } from '@prisma/client';
type Preset = { id: string; name: string; family: string; channelId: string; upstreamModel: string; sizes: string[]; qualities: string[]; maxReferences: number };
type Route = { id: string; modelId: string; channelId: string; upstreamModel: string; adapter: string; mode: string; size: string; quality: string; params: { ratio: string; resolution: '1K' | '2K' | '3K' | '4K' }; requiredGroup: string; costMicros: number; priority: number; maxReferences: number; enabled: boolean; priceNote: string };
export const presetChannels = [
  { id: 'toapis', name: 'ToAPIs', baseUrl: 'https://toapis.cn', adapter: 'toapis-images', secretEnv: 'POOL_TOAPIS_1_KEY' },
  { id: 'duoyuan', name: '多元探索', baseUrl: 'https://duoyuanx.com', adapter: 'duoyuan-images', secretEnv: 'POOL_DUOYUAN_1_KEY' },
  { id: 'openai', name: 'OpenAI 官方', baseUrl: 'https://api.openai.com', adapter: 'openai-native', secretEnv: 'POOL_OPENAI_1_KEY' },
  { id: 'google', name: 'Google 官方', baseUrl: 'https://generativelanguage.googleapis.com', adapter: 'gemini-native', secretEnv: 'POOL_GOOGLE_1_KEY' },
  { id: 'xai', name: 'xAI 官方', baseUrl: 'https://api.x.ai', adapter: 'xai-native', secretEnv: 'POOL_XAI_1_KEY' },
  { id: 'volcengine', name: '火山方舟官方', baseUrl: 'https://ark.cn-beijing.volces.com', adapter: 'seedream-native', secretEnv: 'POOL_VOLCENGINE_1_KEY' },
  { id: 'aliyun', name: '阿里百炼官方 · 北京', baseUrl: 'https://dashscope.aliyuncs.com', adapter: 'wan-native', secretEnv: 'POOL_ALIYUN_1_KEY' }
];
export const presetModels: Preset[] = [];
export const presetRoutes: Route[] = [];
export const presetPrices: { modelId: string; mode: string; size: string; quality: string; unitCents: number }[] = [];
const square = (r: string) => ({ '1K': '1024x1024', '2K': '2048x2048', '3K': '3072x3072', '4K': '4096x4096' }[r]!);
type Spec = { resolution: Route['params']['resolution']; quality: string; cost: number; sale: number; size?: string };
function add(id: string, name: string, family: string, channelId: string, upstream: string, specs: Spec[], refs = 1) {
  presetModels.push({ id, name, family, channelId, upstreamModel: upstream, sizes: [...new Set(specs.map(s => s.size || square(s.resolution)))], qualities: [...new Set(specs.map(s => s.quality))], maxReferences: refs });
  for (const s of specs) for (const mode of refs ? ['TEXT', 'REFERENCE'] : ['TEXT']) {
    const size = s.size || square(s.resolution);
    presetPrices.push({ modelId: id, mode, size, quality: s.quality, unitCents: s.sale });
    route(id, channelId, upstream, size, s.quality, s.resolution, s.cost, mode, refs);
  }
}
function route(modelId: string, channelId: string, upstreamModel: string, size: string, quality: string, resolution: Route['params']['resolution'], cost: number, mode: string, refs: number, group = 'default', adapter?: string, enabled = true) {
  presetRoutes.push({ id: `${modelId}:${channelId}:${group}:${size}:${quality}:${mode}`, modelId, channelId, upstreamModel, adapter: adapter || presetChannels.find(c => c.id === channelId)!.adapter, mode, size, quality, params: { ratio: '1:1', resolution }, requiredGroup: group, costMicros: Math.round(cost * 1_000_000), priority: 0, maxReferences: refs, enabled, priceNote: `${channelId === 'duoyuan' ? '人民币公开分组价；分组需与上游令牌一致' : '公开输出/单次价；美元按7折算，输入和实际充值折扣未计'} · 2026-09-17` });
}
add('gpt2-quality', 'GPT Image 2 · 省钱与精细', 'GPT', 'toapis', 'gpt-image-2-vip', [
  { resolution: '1K', quality: 'low', cost: .0133, sale: 3 }, { resolution: '1K', quality: 'medium', cost: .1183, sale: 20 }, { resolution: '1K', quality: 'high', cost: .4725, sale: 70 }
]);
add('gpt2-standard', 'GPT Image 2 · 日常', 'GPT', 'toapis', 'gpt-image-2', [
  { resolution: '1K', quality: 'auto', cost: .105, sale: 20 }, { resolution: '2K', quality: 'auto', cost: .14, sale: 25 }, { resolution: '4K', size: '2880x2880', quality: 'auto', cost: .175, sale: 35 }
]);
for (const mode of ['TEXT', 'REFERENCE']) route('gpt2-standard', 'duoyuan', 'gpt-image-2', '1024x1024', 'auto', '1K', .10, mode, 1);
// Only the verified 1K public quote is preselected for 2.5; larger tiers can be added later.
for (const variant of ['flare', 'sunburst']) add(`gpt25-${variant}`, `GPT Image 2.5 · ${variant === 'flare' ? 'Flare' : 'Sunburst'}`, 'GPT', 'toapis', `gpt-image-2.5-${variant}`, [{ resolution: '1K', quality: 'high', cost: .1575, sale: 30 }]);
add('banana2', 'Nano Banana 2 · 日常', 'Gemini', 'toapis', 'gemini-3.1-flash-image-preview', [
  { resolution: '1K', quality: 'standard', cost: .175, sale: 30 }, { resolution: '2K', quality: 'standard', cost: .21, sale: 40 }, { resolution: '4K', quality: 'standard', cost: .28, sale: 50 }
]);
add('banana-pro', 'Nano Banana Pro · 精修', 'Gemini', 'toapis', 'gemini-3-pro-image-preview', [
  { resolution: '1K', quality: 'standard', cost: .28, sale: 50 }, { resolution: '2K', quality: 'standard', cost: .35, sale: 60 }, { resolution: '4K', quality: 'standard', cost: .42, sale: 80 }
]);
for (const mode of ['TEXT', 'REFERENCE']) for (const group of ['default', 'gemini']) {
  route('banana2', 'duoyuan', 'gemini-3.1-flash-image-preview', '1024x1024', 'standard', '1K', group === 'gemini' ? .16 : .20, mode, 1, group, 'gemini-native');
  for (const r of ['1K', '2K'] as const) route('banana-pro', 'duoyuan', 'gemini-3-pro-image-preview', square(r), 'standard', r, group === 'gemini' ? .24 : .30, mode, 1, group, 'gemini-native');
}
add('seedream5-lite', 'Seedream 5 Lite · 中文创作', 'Seedream', 'toapis', 'doubao-seedream-5-0', [{ resolution: '2K', quality: 'standard', cost: .2205, sale: 35 }, { resolution: '3K', quality: 'standard', cost: .2205, sale: 40 }]);
for (const mode of ['TEXT', 'REFERENCE']) for (const group of ['default', 'gc-video']) route('seedream5-lite', 'duoyuan', 'doubao-seedream-5-0-260128', square('2K'), 'standard', '2K', group === 'default' ? .18 : .153, mode, 1, group);
add('seedream45', 'Seedream 4.5', 'Seedream', 'toapis', 'doubao-seedream-4-5', [{ resolution: '2K', quality: 'standard', cost: .2499, sale: 40 }, { resolution: '4K', quality: 'standard', cost: .2499, sale: 45 }]);
add('seedream5-pro', 'Seedream 5 Pro', 'Seedream', 'toapis', 'doubao-seedream-5-0-pro', [{ resolution: '1K', quality: 'standard', cost: .30, sale: 50 }, { resolution: '2K', quality: 'standard', cost: .60, sale: 90 }]);
add('official-gpt2', 'GPT Image 2 · 官方', 'GPT', 'openai', 'gpt-image-2', [{ resolution: '1K', quality: 'low', cost: .042, sale: 10 }, { resolution: '1K', quality: 'medium', cost: .371, sale: 60 }, { resolution: '1K', quality: 'high', cost: 1.477, sale: 200 }]);
add('official-banana2', 'Nano Banana 2 · 官方', 'Gemini', 'google', 'gemini-3.1-flash-image', [{ resolution: '1K', quality: 'standard', cost: .469, sale: 70 }, { resolution: '2K', quality: 'standard', cost: .707, sale: 100 }, { resolution: '4K', quality: 'standard', cost: 1.057, sale: 150 }]);
add('official-banana-pro', 'Nano Banana Pro · 官方', 'Gemini', 'google', 'gemini-3-pro-image-preview', [{ resolution: '1K', quality: 'standard', cost: .938, sale: 140 }, { resolution: '2K', quality: 'standard', cost: .938, sale: 140 }, { resolution: '4K', quality: 'standard', cost: 1.68, sale: 230 }]);
add('official-seedream5', 'Seedream 5 Lite · 官方', 'Seedream', 'volcengine', 'doubao-seedream-5-0-260128', [{ resolution: '2K', quality: 'standard', cost: .22, sale: 35 }]);
add('official-grok', 'Grok Imagine · 官方', 'Grok', 'xai', 'grok-imagine-image', [{ resolution: '1K', quality: 'standard', cost: .14, sale: 25 }], 0);
add('official-wan27', '万相 2.7 · 官方', 'Wan', 'aliyun', 'wan2.7-image', [{ resolution: '2K', quality: 'standard', cost: .20, sale: 35 }]);
add('official-wan27-pro', '万相 2.7 Pro · 官方', 'Wan', 'aliyun', 'wan2.7-image-pro', [{ resolution: '2K', quality: 'standard', cost: .50, sale: 75 }]);

export async function seedPool(tx: Prisma.TransactionClient) {
  for (const c of presetChannels) {
    await tx.channel.upsert({ where: { id: c.id }, create: { ...c, enabled: true, verified: false }, update: {} });
    await tx.providerAccount.upsert({ where: { id: `${c.id}-1` }, create: { id: `${c.id}-1`, channelId: c.id, name: `${c.name} · 账号1`, secretEnv: c.secretEnv, group: 'default', maxInFlight: ['toapis', 'duoyuan'].includes(c.id) ? 4 : 2 }, update: {} });
  }
  for (const m of presetModels) await tx.model.upsert({ where: { id: m.id }, create: { ...m, pooled: true, enabled: true, maxCount: 1 }, update: {} });
  for (const r of presetRoutes) await tx.modelRoute.upsert({ where: { id: r.id }, create: r, update: {} });
  for (const p of presetPrices) if (!await tx.price.findFirst({ where: { modelId: p.modelId, mode: p.mode, size: p.size, quality: p.quality } })) await tx.price.create({ data: p });
}
