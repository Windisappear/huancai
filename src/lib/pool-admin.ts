import { db, transaction } from './db';
import { AppError } from './core';
import { poolData } from './provider-pool';
import { providerSecret, safeProviderBase } from './provider-secrets';
import { accountSchema, channelSchema, routeSchema } from './pool-types';

export async function poolOverview() {
  const data = await poolData();
  const loads = await db.task.groupBy({ by: ['accountId'], where: { accountId: { not: null }, settledAt: null }, _count: true });
  return { ...data, channels: data.channels.filter(c => c.id !== 'demo' && c.id !== 'laoli' && !c.id.startsWith('official-')), accounts: data.accounts.map(a => ({ ...a, accessibleModels: undefined, modelCount: Array.isArray(a.accessibleModels) ? a.accessibleModels.length : null, hasKey: !!providerSecret(a.secretEnv), inFlight: loads.find(l => l.accountId === a.id)?._count ?? 0 })), models: await db.model.findMany({ where: { pooled: true }, orderBy: { id: 'asc' } }) };
}
export async function checkAccount(id: string) {
  const a = await db.providerAccount.findUniqueOrThrow({ where: { id } });
  const c = await db.channel.findUniqueOrThrow({ where: { id: a.channelId } });
  const key = providerSecret(a.secretEnv);
  if (!key || !c.baseUrl) throw new AppError('请先在服务端配置该账号的密钥');
  const root = safeProviderBase(c.baseUrl).replace(/\/(v1|v1beta)$/, '');
  const google = new URL(root).hostname === 'generativelanguage.googleapis.com';
  if (c.adapter === 'wan-native' || c.adapter === 'seedream-native') throw new AppError('此官方渠道没有配置只读模型探测；密钥就绪后可按文档调用，未宣称实测通过');
  let response: Response;
  try { response = await fetch(`${root}/${google ? 'v1beta/models' : 'v1/models'}`, { headers: google ? { 'x-goog-api-key': key } : { Authorization: `Bearer ${key}` }, redirect: 'error', signal: AbortSignal.timeout(20000) }); }
  catch { throw new AppError('模型列表检查连接失败，未调用付费生成'); }
  if (!response.ok) throw new AppError(`模型列表检查失败（HTTP ${response.status}），未调用付费生成`);
  const payload = await response.json();
  const rows = google ? payload.models : payload.data;
  if (!Array.isArray(rows)) throw new AppError('未返回有效模型列表');
  const ids = rows.map((m: { id?: string; name?: string }) => google ? m.name?.replace(/^models\//, '') : m.id).filter((s: unknown): s is string => typeof s === 'string');
  await db.providerAccount.update({ where: { id }, data: { accessibleModels: ids, checkedAt: new Date(), lastError: null, cooldownUntil: null } });
  return { ok: true, modelCount: ids.length, message: '鉴权与模型列表已通过；未进行付费生图测试' };
}
export async function savePool(kind: string, input: unknown, actorId: string) {
  if (kind === 'accounts') {
    const p = accountSchema.parse(input);
    return transaction(async tx => {
      await tx.channel.findUniqueOrThrow({ where: { id: p.channelId } });
      const existing = await tx.providerAccount.findUnique({ where: { id: p.id } });
      if (existing && (existing.channelId !== p.channelId || existing.secretEnv !== p.secretEnv) && await tx.task.count({ where: { accountId: p.id, settledAt: null } })) throw new AppError('此账号有未结算任务，暂不能更换所属站点或密钥引用');
      await tx.providerAccount.upsert({ where: { id: p.id }, create: p, update: { ...p, ...(existing && (existing.channelId !== p.channelId || existing.secretEnv !== p.secretEnv) ? { checkedAt: null, accessibleModels: [] } : {}) } });
      await tx.audit.create({ data: { actorId, action: 'POOL_ACCOUNT_SAVE', reference: p.id } });
      return { ok: true };
    });
  }
  if (kind === 'channels') {
    const p = channelSchema.parse(input); const baseUrl = safeProviderBase(p.baseUrl);
    return transaction(async tx => {
      const existing = await tx.channel.findUnique({ where: { id: p.id } });
      if (existing && existing.baseUrl !== baseUrl && await tx.task.count({ where: { channelId: p.id, settledAt: null } })) throw new AppError('此站点有未结算任务，暂不能更改地址');
      await tx.channel.upsert({ where: { id: p.id }, create: { ...p, baseUrl }, update: { ...p, baseUrl } });
      await tx.audit.create({ data: { actorId, action: 'POOL_CHANNEL_SAVE', reference: p.id } });
      return { ok: true };
    });
  }
  if (kind === 'routes') {
    const p = routeSchema.parse(input);
    return transaction(async tx => {
      const m = await tx.model.findUniqueOrThrow({ where: { id: p.modelId } });
      await tx.channel.findUniqueOrThrow({ where: { id: p.channelId } });
      if (!m.pooled || !(m.sizes as string[]).includes(p.size) || !(m.qualities as string[]).includes(p.quality) || p.maxReferences > m.maxReferences || (p.mode === 'REFERENCE' && p.maxReferences < 1)) throw new AppError('线路规格超出模型能力范围');
      await tx.modelRoute.upsert({ where: { id: p.id }, create: p, update: p });
      await tx.audit.create({ data: { actorId, action: 'POOL_ROUTE_SAVE', reference: p.id } });
      return { ok: true };
    });
  }
  throw new AppError('未知号池配置');
}
