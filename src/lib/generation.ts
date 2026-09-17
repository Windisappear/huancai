import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { db, transaction } from './db';
import { AppError, demoMode, expiry, settlement } from './core';
import { adapterAvailable } from './providers';
import { poolData, routeReady, reserveRoute, publicTask } from './provider-pool';
export const quoteSchema = z.object({ modelId: z.string(), mode: z.enum(['TEXT', 'REFERENCE']), size: z.string(), quality: z.string(), count: z.number().int().min(1).max(4) });
export const taskSchema = z.object({ quoteId: z.string(), prompt: z.string().trim().min(1).max(4000), referenceIds: z.array(z.string()).max(8).default([]), requestKey: z.string().uuid() });
export async function catalog() {
  const [models, channels, prices] = await Promise.all([db.model.findMany({ orderBy: { id: 'asc' } }), db.channel.findMany(), db.price.findMany({ where: { active: true } })]);
  const pool = await poolData();
  return models.filter(m => m.mediaType === 'IMAGE' && (m.family !== 'TEST' || demoMode()) && !(!m.enabled && !m.pooled && ['gpt', 'gemini', 'grok', 'seedream'].includes(m.id))).map(m => {
    const c = channels.find(c => c.id === m.channelId);
    const supported = !!c && adapterAvailable(c.adapter);
    const modelPrices = prices.filter(p => p.modelId === m.id);
    const readyPrices = m.pooled ? modelPrices.filter(p => pool.routes.some(r => r.modelId === m.id && r.mode === p.mode && r.size === p.size && r.quality === p.quality && r.costMicros <= p.unitCents * 10000 && pool.accounts.some(a => { const ch = channels.find(c => c.id === r.channelId); return ch && routeReady(r, a, ch); }))).map(p => p.id) : modelPrices.map(p => p.id);
    return { ...m, available: m.pooled ? m.enabled && readyPrices.length > 0 : !!(m.enabled && c?.enabled && c.verified && supported), prices: modelPrices, readyPriceIds: readyPrices, unavailableReason: '暂无可用账号或该规格线路尚未开放' };
  });
}
export async function quote(userId: string, input: unknown) {
  const p = quoteSchema.parse(input); const models = await catalog(); const m = models.find(m => m.id === p.modelId);
  if (!m?.available) throw new AppError('该模型尚未开放');
  if (!(m.sizes as string[]).includes(p.size) || !(m.qualities as string[]).includes(p.quality) || p.count > m.maxCount || (p.mode === 'REFERENCE' && !m.maxReferences)) throw new AppError('模型不支持这些参数');
  const price = m.prices.find(x => x.mode === p.mode && x.size === p.size && x.quality === p.quality);
  if (!price || price.unitCents < 1) throw new AppError('当前规格暂未定价');
  if (m.pooled && !m.readyPriceIds.includes(price.id)) throw new AppError('此规格暂无可用线路');
  return db.quote.create({ data: { ...p, userId, priceId: price.id, unitCents: price.unitCents, expiresAt: new Date(Date.now() + 5 * 60000) } });
}
export async function createTask(userId: string, input: unknown) {
  const p = taskSchema.parse(input);
  return transaction(async tx => {
    const existing = await tx.task.findUnique({ where: { userId_requestKey: { userId, requestKey: p.requestKey } } });
    if (existing) return existing;
    const q = await tx.quote.findUnique({ where: { id: p.quoteId } });
    if (!q || q.userId !== userId || q.expiresAt <= new Date()) throw new AppError('报价已失效，请重新选择参数');
    const used = await tx.task.findUnique({ where: { quoteId: q.id } }); if (used) return used;
    const m = await tx.model.findUniqueOrThrow({ where: { id: q.modelId } });
    const c = await tx.channel.findUniqueOrThrow({ where: { id: m.channelId } });
    if (!m.enabled || (!m.pooled && (!c.enabled || !c.verified || !adapterAvailable(c.adapter)))) throw new AppError('当前渠道不可用');
    if (!(m.sizes as string[]).includes(q.size) || !(m.qualities as string[]).includes(q.quality) || q.count > m.maxCount) throw new AppError('模型能力已更新，请重新报价');
    const ids = [...new Set(p.referenceIds)];
    if ((q.mode === 'TEXT' && ids.length) || (q.mode === 'REFERENCE' && (!ids.length || ids.length > m.maxReferences))) throw new AppError('参考图数量不符合要求');
    const assets = await tx.asset.count({ where: { id: { in: ids }, userId, kind: 'REFERENCE', ready: true, deletedAt: null, expiresAt: { gt: new Date() } } });
    if (assets !== ids.length) throw new AppError('参考图不存在或已过期');
    const chosen = m.pooled ? await reserveRoute(tx, { modelId: m.id, mode: q.mode, size: q.size, quality: q.quality, unitCents: q.unitCents, references: ids.length }) : null;
    const total = q.unitCents * q.count;
    const updated = await tx.wallet.updateMany({ where: { userId, available: { gte: total } }, data: { available: { decrement: total }, frozen: { increment: total } } });
    if (updated.count !== 1) throw new AppError('余额不足，请先充值');
    const task = await tx.task.create({ data: { userId, requestKey: p.requestKey, quoteId: q.id, modelId: m.id, modelName: m.name, channelId: chosen?.channel.id || c.id, adapter: chosen?.route.adapter || c.adapter, upstreamModel: chosen?.route.upstreamModel || m.upstreamModel, ...(chosen ? { accountId: chosen.account.id, routeId: chosen.route.id, endpointBaseUrl: chosen.channel.baseUrl, credentialEnv: chosen.account.secretEnv, upstreamParams: chosen.route.params as Prisma.InputJsonValue, estimatedCostMicros: chosen.route.costMicros * q.count } : {}), mode: q.mode, size: q.size, quality: q.quality, count: q.count, unitCents: q.unitCents, priceId: q.priceId } });
    await tx.taskContent.create({ data: { taskId: task.id, prompt: p.prompt, referenceIds: ids, expiresAt: expiry() } });
    await tx.ledger.create({ data: { userId, eventKey: `hold:${task.id}`, kind: 'GENERATION_HOLD', availableDelta: -total, frozenDelta: total, reference: task.id } });
    await tx.outbox.create({ data: { taskId: task.id } });
    return task;
  });
}
export async function settleTask(taskId: string, delivered: number, error?: string) {
  return transaction(async tx => {
    const t = await tx.task.findUniqueOrThrow({ where: { id: taskId } }); if (t.settledAt) return t;
    const amount = settlement(t.count, t.unitCents, delivered);
    await tx.wallet.update({ where: { userId: t.userId }, data: { frozen: { decrement: amount.frozen }, available: { increment: amount.release } } });
    await tx.ledger.create({ data: { userId: t.userId, eventKey: `settle:${t.id}`, kind: 'GENERATION_SETTLED', availableDelta: amount.release, frozenDelta: -amount.frozen, reference: t.id } });
    return tx.task.update({ where: { id: t.id }, data: { status: delivered === t.count ? 'SUCCEEDED' : delivered ? 'PARTIAL' : 'FAILED', deliveredCount: delivered, settledAt: new Date(), error: error ?? null } });
  });
}
export async function history(userId: string) {
  const liveAssets = await db.asset.findMany({ where: { userId, taskId: { not: null }, ready: true, deletedAt: null, expiresAt: { gt: new Date() } }, select: { taskId: true } });
  const tasks = await db.task.findMany({ where: { userId, OR: [{ createdAt: { gt: new Date(Date.now() - 72 * 3600_000) } }, { id: { in: liveAssets.map(a => a.taskId!) } }, { settledAt: null }] }, orderBy: { createdAt: 'desc' }, take: 100 });
  return Promise.all(tasks.map(async t => {
    const [content, assets] = await Promise.all([db.taskContent.findFirst({ where: { taskId: t.id, expiresAt: { gt: new Date() } } }), db.asset.findMany({ where: { taskId: t.id, ready: true, deletedAt: null, expiresAt: { gt: new Date() } } })]);
    const references = content ? await db.asset.findMany({ where: { id: { in: content.referenceIds as string[] }, userId, ready: true, deletedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, width: true, height: true, expiresAt: true } }) : [];
    return { ...publicTask(t), prompt: content?.prompt ?? null, referenceIds: references.map(r => r.id), referenceAssets: references, assets: assets.map(({ key: _key, ...a }) => a) };
  }));
}
