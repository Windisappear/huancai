import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { db } from '../../src/lib/db';
import { createTask, quote, settleTask } from '../../src/lib/generation';
import { processTask, pollPending } from '../../src/lib/jobs';
import { queue, redis } from '../../src/lib/queue';
import { deleteObject } from '../../src/lib/storage';
const prefix = `pool-it-${randomUUID().slice(0,8)}`;
const users: string[] = [];
beforeAll(async () => {
  vi.stubEnv('POOL_INTEGRATION_KEY', 'local-test-only');
  await db.channel.create({ data: { id: prefix, name: 'Integration pool', adapter: 'toapis-images', baseUrl: 'https://provider.example', enabled: true } });
  await db.providerAccount.create({ data: { id: prefix, channelId: prefix, name: 'Test account', secretEnv: 'POOL_INTEGRATION_KEY', maxInFlight: 1 } });
  await db.model.create({ data: { id: prefix, name: 'Pool test', family: 'TEST', pooled: true, enabled: true, channelId: prefix, upstreamModel: 'test-model', sizes: ['1024x1024'], qualities: ['low'] } });
  await db.modelRoute.create({ data: { id: prefix, modelId: prefix, channelId: prefix, adapter: 'toapis-images', upstreamModel: 'test-model', mode: 'TEXT', size: '1024x1024', quality: 'low', costMicros: 10000, params: { ratio: '1:1', resolution: '1K' } } });
  await db.price.create({ data: { modelId: prefix, mode: 'TEXT', size: '1024x1024', quality: 'low', unitCents: 7 } });
});
afterEach(async () => {
  vi.unstubAllGlobals();
  for (const t of await db.task.findMany({ where: { modelId: prefix, settledAt: null } })) await settleTask(t.id, 0);
  await db.providerAccount.update({ where: { id: prefix }, data: { enabled: true, cooldownUntil: null } });
  await db.modelRoute.update({ where: { id: prefix }, data: { upstreamModel: 'test-model' } });
});
async function account() { const u = await db.user.create({ data: { username: `${prefix}-${users.length}`, passwordHash: 'not-login', recoveryHash: 'not-login' } }); users.push(u.id); await db.wallet.create({ data: { userId: u.id, available: 100 } }); return u.id; }
async function input(userId: string) { const q = await quote(userId, { modelId: prefix, mode: 'TEXT', size: '1024x1024', quality: 'low', count: 1 }); return { quoteId: q.id, prompt: 'mocked generation', requestKey: randomUUID() }; }
it('atomically reserves capacity across concurrent task creation', async () => {
  const u = await account(); const a = await input(u), b = await input(u);
  const results = await Promise.allSettled([createTask(u,a), createTask(u,b)]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect(await db.wallet.findUnique({ where: { userId: u } })).toMatchObject({ available: 93, frozen: 7 });
});
it('pins account, credentials, endpoint and model without duplicate reservation', async () => {
  const u = await account(); const p = await input(u); const t = await createTask(u,p);
  expect(t).toMatchObject({ accountId: prefix, routeId: prefix, credentialEnv: 'POOL_INTEGRATION_KEY', endpointBaseUrl: 'https://provider.example', upstreamModel: 'test-model', estimatedCostMicros: 10000 });
  await db.modelRoute.update({ where: { id: prefix }, data: { upstreamModel: 'changed' } });
  expect((await createTask(u,p)).id).toBe(t.id); expect((await db.task.findUniqueOrThrow({ where: { id:t.id } })).upstreamModel).toBe('test-model');
  expect(await db.ledger.count({ where: { eventKey: `hold:${t.id}` } })).toBe(1);
});
it('rejects a disabled account without freezing money', async () => {
  const u = await account(); const p = await input(u); await db.providerAccount.update({ where: { id:prefix }, data: { enabled:false } });
  await expect(createTask(u,p)).rejects.toThrow('暂无可用账号');
  expect(await db.wallet.findUnique({ where: { userId:u } })).toMatchObject({ available:100, frozen:0 });
});
it('polls an async task to settlement without another generation and records actual dimensions', async () => {
  const u = await account(); const t = await createTask(u,await input(u));
  const png = await sharp({ create: { width:32,height:24,channels:3,background:'#fff' } }).png().toBuffer();
  const fn = vi.fn().mockResolvedValueOnce(Response.json({ id:'upstream-test',status:'queued' })).mockResolvedValueOnce(Response.json({ status:'in_progress' })).mockResolvedValueOnce(Response.json({ status:'completed',result:{ data:[{b64_json:png.toString('base64')}] } })); vi.stubGlobal('fetch',fn);
  await processTask(t.id); expect((await db.task.findUniqueOrThrow({ where:{id:t.id} })).status).toBe('PENDING');
  await processTask(t.id); // Queue redelivery must not submit again.
  for (let i=0;i<2;i++) { await db.task.update({where:{id:t.id},data:{updatedAt:new Date(Date.now()-10000)}}); await pollPending(); }
  expect((await db.task.findUniqueOrThrow({where:{id:t.id}})).status).toBe('SUCCEEDED');
  expect(fn.mock.calls.map(c=>c[1].method)).toEqual(['POST','GET','GET']);
  expect(await db.asset.findFirst({where:{taskId:t.id}})).toMatchObject({width:32,height:24,ready:true});
  expect(await db.wallet.findUnique({where:{userId:u}})).toMatchObject({available:93,frozen:0});
});
afterAll(async () => {
  const tasks = await db.task.findMany({where:{modelId:prefix}}); const ids=tasks.map(t=>t.id);
  for (const a of await db.asset.findMany({where:{taskId:{in:ids}}})) await deleteObject(a.key);
  await db.asset.deleteMany({where:{taskId:{in:ids}}}); await db.outbox.deleteMany({where:{taskId:{in:ids}}}); await db.taskContent.deleteMany({where:{taskId:{in:ids}}}); await db.task.deleteMany({where:{modelId:prefix}});
  await db.quote.deleteMany({where:{modelId:prefix}}); await db.price.deleteMany({where:{modelId:prefix}}); await db.modelRoute.deleteMany({where:{modelId:prefix}}); await db.model.delete({where:{id:prefix}}); await db.providerAccount.delete({where:{id:prefix}}); await db.channel.delete({where:{id:prefix}});
  await db.ledger.deleteMany({where:{userId:{in:users}}}); await db.wallet.deleteMany({where:{userId:{in:users}}}); await db.user.deleteMany({where:{id:{in:users}}});
  vi.unstubAllEnvs(); await queue.close(); redis.disconnect(); await db.$disconnect();
});
