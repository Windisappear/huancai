import 'dotenv/config';
import { db } from '../src/lib/db';
import { demoMode } from '../src/lib/core';
import { relayConfig, relayImageModel } from '../src/lib/relay-config';
import { seedPool } from '../src/lib/pool-presets';
async function main() {
  await seedPool(db);
  const relay = relayConfig();
  await db.channel.upsert({ where: { id: 'laoli' }, create: { id: 'laoli', name: '老李 GPT 图片中转', adapter: 'openai-images', baseUrl: relay?.baseUrl || 'https://api.laoliimage2.win/v1', secretEnv: 'RELAY_API_KEY', enabled: false, verified: false }, update: { name: '老李 GPT 图片中转', adapter: 'openai-images', baseUrl: relay?.baseUrl || 'https://api.laoliimage2.win/v1', secretEnv: 'RELAY_API_KEY', enabled: false, verified: false } });
  for (const [id, name] of [['gpt', 'GPT Image'], ['gemini', 'Gemini'], ['grok', 'Grok'], ['seedream', 'Seedream']]) {
    const isGpt = id === 'gpt';
    const modelData = isGpt ? { name: 'GPT Image 2', family: 'GPT', channelId: 'laoli', upstreamModel: relayImageModel(), enabled: false, sizes: [], qualities: [], maxCount: 1, maxReferences: 0 } : { name, family: id.toUpperCase(), channelId: 'laoli', upstreamModel: '', enabled: false, sizes: [], qualities: [], maxCount: 1, maxReferences: 0 };
    await db.model.upsert({ where: { id }, create: { id, ...modelData }, update: modelData });
    await db.channel.upsert({ where: { id: `official-${id}` }, create: { id: `official-${id}`, name: `${name} 官方（预留）`, adapter: 'unconfigured' }, update: {} });
  }
  if (demoMode()) {
    await db.channel.upsert({ where: { id: 'demo' }, create: { id: 'demo', name: '本地测试', adapter: 'demo', enabled: true, verified: true }, update: {} });
    await db.model.upsert({ where: { id: 'demo' }, create: { id: 'demo', name: '流程测试模型', family: 'TEST', channelId: 'demo', upstreamModel: 'test-pattern', enabled: true, sizes: ['1024x1024', '1536x1024', '1024x1536'], qualities: ['standard'], maxCount: 4, maxReferences: 2 }, update: {} });
    for (const mode of ['TEXT', 'REFERENCE']) for (const size of ['1024x1024', '1536x1024', '1024x1536']) {
      if (!await db.price.findFirst({ where: { modelId: 'demo', mode, size, active: true } })) await db.price.create({ data: { modelId: 'demo', mode, size, quality: 'standard', unitCents: 10 } });
    }
  }
}
main().finally(() => db.$disconnect());
