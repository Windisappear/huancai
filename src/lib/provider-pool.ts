import type { Prisma, ModelRoute, ProviderAccount, Channel, Task } from '@prisma/client';
import { db } from './db';
import { AppError } from './core';
import { providerSecret } from './provider-secrets';
import { poolAdapters } from './pool-types';
import { selectCandidate } from './pool-selection';

export const isPoolAdapter = (adapter: string) => (poolAdapters as readonly string[]).includes(adapter);
export function routeReady(route: ModelRoute, account: ProviderAccount, channel: Channel, now = new Date()) {
  const allowed = account.accessibleModels;
  return route.enabled && account.enabled && channel.enabled && !!channel.baseUrl && isPoolAdapter(route.adapter) &&
    route.channelId === channel.id && account.channelId === channel.id && account.group === route.requiredGroup &&
    (!account.cooldownUntil || account.cooldownUntil <= now) && !!providerSecret(account.secretEnv) &&
    (!Array.isArray(allowed) || allowed.includes(route.upstreamModel));
}
export async function poolData(client: Prisma.TransactionClient = db) {
  const [routes, accounts, channels] = await Promise.all([client.modelRoute.findMany(), client.providerAccount.findMany(), client.channel.findMany()]);
  return { routes, accounts, channels };
}
export async function reserveRoute(tx: Prisma.TransactionClient, spec: { modelId: string; mode: string; size: string; quality: string; unitCents: number; references: number }) {
  const { routes, accounts, channels } = await poolData(tx);
  const loads = await tx.task.groupBy({ by: ['accountId'], where: { accountId: { not: null }, settledAt: null }, _count: true });
  const candidates = routes.filter(r => r.modelId === spec.modelId && r.mode === spec.mode && r.size === spec.size && r.quality === spec.quality && r.maxReferences >= spec.references)
    .flatMap(r => accounts.filter(a => { const c = channels.find(c => c.id === r.channelId); return c && routeReady(r, a, c); }).map(a => ({ routeId: r.id, accountId: a.id, costMicros: r.costMicros, priority: r.priority, inFlight: loads.find(l => l.accountId === a.id)?._count ?? 0, maxInFlight: a.maxInFlight, lastUsedAt: a.lastUsedAt, cooldownUntil: a.cooldownUntil })));
  const selected = selectCandidate(candidates, spec.unitCents * 10000);
  if (!selected) throw new AppError('此规格暂无可用账号，可能繁忙、冷却中或成本超出售价，请稍后重试', 503);
  const route = routes.find(r => r.id === selected.routeId)!;
  const account = accounts.find(a => a.id === selected.accountId)!;
  const channel = channels.find(c => c.id === route.channelId)!;
  // This write participates in createTask's serializable transaction, preventing overbooking.
  await tx.providerAccount.update({ where: { id: account.id }, data: { lastUsedAt: new Date() } });
  return { route, account, channel };
}
export async function coolAccount(accountId: string | null, status?: number) {
  if (!accountId) return;
  const seconds = status === 401 || status === 403 ? 3600 : status === 429 ? 60 : 300;
  await db.providerAccount.update({ where: { id: accountId }, data: { cooldownUntil: new Date(Date.now() + seconds * 1000), lastError: status ? `HTTP ${status}` : '结果不明确，请核查上游记录' } });
}
export function publicTask<T extends Task>(task: T) {
  const { accountId: _a, routeId: _r, endpointBaseUrl: _b, credentialEnv: _e, upstreamParams: _p, estimatedCostMicros: _c, upstreamCost: _u, ...safe } = task;
  return safe;
}
