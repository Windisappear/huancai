import { db } from './db';
import { queue } from './queue';
import { provider } from './providers';
import { getObject, putObject, deleteObject } from './storage';
import { settleTask } from './generation';
import { expiry } from './core';
import sharp from 'sharp';
import type { Task } from '@prisma/client';
import { pooledProvider, UpstreamFailure } from './pool-adapters';
import { coolAccount } from './provider-pool';
export async function dispatch() {
  const rows = await db.outbox.findMany({ where: { sentAt: null }, take: 100 });
  for (const row of rows) {
    await queue.add('generate', { taskId: row.taskId }, { jobId: row.taskId });
    await db.outbox.update({ where: { id: row.id }, data: { sentAt: new Date() } });
  }
}
export async function processTask(taskId: string) {
  const claim = await db.task.updateMany({ where: { id: taskId, status: 'QUEUED', settledAt: null }, data: { status: 'RUNNING' } });
  if (!claim.count) return; // Never resubmit a possibly charged request on queue redelivery.
  const task = await db.task.findUniqueOrThrow({ where: { id: taskId } });
  try {
    const content = await db.taskContent.findUnique({ where: { taskId } });
    if (!content || content.expiresAt <= new Date()) { await settleTask(taskId, 0, '提示词已过期，已释放金额'); return; }
    const ids = content.referenceIds as string[];
    const refs = await db.asset.findMany({ where: { id: { in: ids }, userId: task.userId, ready: true, deletedAt: null, expiresAt: { gt: new Date() } } });
    if (refs.length !== ids.length) { await settleTask(taskId, 0, '参考图已过期，已释放金额'); return; }
    const buffers = await Promise.all(ids.map(id => getObject(refs.find(a => a.id === id)!.key)));
    if (task.accountId) {
      const [account, channel] = await Promise.all([db.providerAccount.findUnique({ where: { id: task.accountId } }), db.channel.findUnique({ where: { id: task.channelId } })]);
      if (!account?.enabled || !channel?.enabled || (account.cooldownUntil && account.cooldownUntil > new Date())) { await settleTask(taskId, 0, '账号已停用或冷却，尚未提交上游'); return; }
    }
    const result = await (task.accountId ? pooledProvider(task) : provider(task.adapter)).submit(task, content.prompt, buffers);
    if (result.state === 'PENDING') { await db.task.update({ where: { id: taskId }, data: { status: 'PENDING', upstreamId: result.upstreamId } }); return; }
    if (result.state === 'FAILED') { if (result.httpStatus) await coolAccount(task.accountId, result.httpStatus); await settleTask(taskId, 0, result.message); return; }
    await saveOutputs(task, result.outputs);
  } catch (error) {
    if (task.accountId) await coolAccount(task.accountId, error instanceof UpstreamFailure ? error.status : undefined);
    await db.task.updateMany({ where: { id: taskId, settledAt: null }, data: { status: 'REVIEW', error: '结果待核查，未再次提交；处理中金额暂时保留' } });
    await alert('generation_review');
  }
}
async function saveOutputs(task: Task, outputs: Buffer[]) {
    const taskId = task.id;
    await db.task.update({ where: { id: taskId }, data: { status: 'SAVING' } });
    let delivered = 0;
    for (const [slot, bytes] of outputs.slice(0, task.count).entries()) {
      const meta = await sharp(bytes).metadata();
      if (!meta.width || !meta.height) throw new Error('Invalid output dimensions');
      const { width, height } = meta;
      const key = `outputs/${task.userId}/${taskId}/${slot}.png`;
      const asset = await db.asset.upsert({ where: { taskId_slot: { taskId, slot } }, create: { userId: task.userId, taskId, slot, kind: 'OUTPUT', key, mime: 'image/png', width, height, bytes: bytes.length, expiresAt: expiry() }, update: {} });
      if (!asset.ready) {
        // Retrying storage is safe: it does not submit another generation.
        for (let attempt = 0; ; attempt++) { try { await putObject(key, bytes, 'image/png'); break; } catch (e) { if (attempt === 2) throw e; } }
        await db.asset.update({ where: { id: asset.id }, data: { ready: true, expiresAt: expiry() } });
      }
      delivered++;
    }
    await settleTask(taskId, delivered, delivered < task.count ? '部分结果未交付，已释放对应金额' : undefined);
}
export async function pollPending() {
  const tasks = await db.task.findMany({ where: { status: 'PENDING', settledAt: null, upstreamId: { not: null }, updatedAt: { lt: new Date(Date.now() - 5000) } }, take: 10 });
  for (const task of tasks) {
    if (!task.accountId || !task.upstreamId) continue;
    const claimed = await db.task.updateMany({ where: { id: task.id, status: 'PENDING' }, data: { status: 'RUNNING' } });
    if (!claimed.count) continue;
    if (Date.now() - task.createdAt.getTime() > 30 * 60000) { await db.task.update({ where: { id: task.id }, data: { status: 'REVIEW', error: '上游任务超过30分钟，请核查；未重复提交' } }); continue; }
    try {
      const result = await pooledProvider(task).query(task.upstreamId);
      if (result.state === 'PENDING') await db.task.update({ where: { id: task.id }, data: { status: 'PENDING' } });
      else if (result.state === 'FAILED') await settleTask(task.id, 0, result.message);
      else await saveOutputs(task, result.outputs);
    } catch {
      // Keep the same upstream ID on query/download errors. Never re-run submit().
      await db.task.updateMany({ where: { id: task.id, settledAt: null }, data: { status: 'PENDING', error: '结果查询暂不可用，将继续查询原任务' } });
    }
  }
}
export async function cleanup(now = new Date()) {
  const assets = await db.asset.findMany({ where: { purgedAt: null, OR: [{ expiresAt: { lte: now } }, { deletedAt: { not: null } }] }, take: 500 });
  for (const a of assets) { await deleteObject(a.key); await db.asset.update({ where: { id: a.id }, data: { purgedAt: now, ready: false } }); }
  await db.taskContent.deleteMany({ where: { expiresAt: { lte: now } } });
  await db.session.deleteMany({ where: { expiresAt: { lte: now } } });
  await db.quote.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 86400_000) }, id: { notIn: (await db.task.findMany({ select: { quoteId: true } })).map(t => t.quoteId) } } });
}
export async function monitor() {
  // Recover dispatch after Redis loss using database truth, without replaying submitted jobs.
  const queued = await db.task.findMany({ where: { status: 'QUEUED', createdAt: { lt: new Date(Date.now() - 60000) } }, take: 100 });
  for (const task of queued) if (!await queue.getJob(task.id)) await queue.add('generate', { taskId: task.id }, { jobId: task.id });
  const stale = await db.task.updateMany({ where: { settledAt: null, status: { in: ['RUNNING', 'SAVING', 'PENDING'] }, updatedAt: { lt: new Date(Date.now() - 15 * 60000) } }, data: { status: 'REVIEW', error: '任务长时间未确认，请联系管理员核查' } });
  if (stale.count) await alert('stale_generation');
}
export async function alert(event: string) {
  console.error(JSON.stringify({ event, time: new Date().toISOString() }));
  if (process.env.ALERT_WEBHOOK) try { await fetch(process.env.ALERT_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event }), signal: AbortSignal.timeout(5000) }); } catch { console.error('alert_delivery_failed'); }
}
