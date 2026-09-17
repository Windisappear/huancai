import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import sharp from 'sharp';
import { z, ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { db, transaction } from '@/lib/db';
import { AppError, demoMode, expiry, isAccessible } from '@/lib/core';
import { currentUser, requireUser, requireAdmin, sameOrigin, rateLimit, hashPassword, digest, newSecret, issueSession } from '@/lib/auth';
import { catalog, quote, createTask, history, settleTask } from '@/lib/generation';
import { adapterAvailable } from '@/lib/providers';
import { poolOverview, checkAccount, savePool } from '@/lib/pool-admin';
import { publicTask, isPoolAdapter } from '@/lib/provider-pool';
import { confirmTestPayment, requestRefund, reviewRefund } from '@/lib/payments';
import { putObject, getObject } from '@/lib/storage';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const credentials = z.object({ username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/, '账号需为 3–24 位字母、数字或下划线'), password: z.string().min(10, '密码至少 10 位').max(128) });
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
type Context = { params: Promise<{ path: string[] }> };
async function handle(req: Request, ctx: Context) {
  try {
    const path = (await ctx.params).path.join('/'); const post = req.method === 'POST';
    if (post || req.method === 'DELETE') sameOrigin(req);
    if (path === 'health' && !post) { await db.$queryRaw`SELECT 1`; return json({ ok: true }); }
    if (path === 'models' && !post) return json({ models: await catalog(), demo: demoMode() });
    if (path === 'me' && !post) {
      const u = await currentUser(false); if (!u) return json({ user: null, demo: demoMode() });
      return json({ user: { id: u.id, username: u.username, role: u.role }, wallet: await db.wallet.findUnique({ where: { userId: u.id } }), demo: demoMode() });
    }
    if (path.startsWith('auth/') && post) {
      // Nginx overwrites X-Real-IP; do not expose the application port publicly.
      const ip = req.headers.get('x-real-ip') || 'local'; await rateLimit(`auth-ip:${ip}`, 50);
      const body = await req.json();
      if (path === 'auth/register') {
        const p = credentials.parse(body); await rateLimit(`register:${ip}`, 10, 3600);
        const recoveryCode = newSecret(); const passwordHash = await hashPassword(p.password);
        const user = await transaction(async tx => { const u = await tx.user.create({ data: { username: p.username, passwordHash, recoveryHash: digest(recoveryCode) } }); await tx.wallet.create({ data: { userId: u.id } }); return u; });
        await issueSession(user.id); return json({ recoveryCode }, 201);
      }
      if (path === 'auth/login') {
        const p = credentials.parse(body); await rateLimit(`login:${p.username}`, 12);
        const u = await db.user.findUnique({ where: { username: p.username } });
        if (!u || !await argon2.verify(u.passwordHash, p.password)) throw new AppError('账号或密码不正确', 401);
        await issueSession(u.id); return json({ ok: true });
      }
      if (path === 'auth/recover') {
        const p = credentials.extend({ recoveryCode: z.string().min(20).max(100) }).parse(body); await rateLimit(`recover:${p.username}`, 5, 3600);
        const newCode = newSecret(); const passwordHash = await hashPassword(p.password);
        await transaction(async tx => {
          const u = await tx.user.findUnique({ where: { username: p.username } }); if (!u || u.recoveryHash !== digest(p.recoveryCode)) throw new AppError('账号或恢复码不正确');
          const changed = await tx.user.updateMany({ where: { id: u.id, recoveryHash: digest(p.recoveryCode) }, data: { passwordHash, recoveryHash: digest(newCode) } });
          if (!changed.count) throw new AppError('恢复码已使用'); await tx.session.deleteMany({ where: { userId: u.id } });
        });
        (await cookies()).delete('frame_session'); return json({ recoveryCode: newCode });
      }
      const u = await requireUser();
      if (path === 'auth/logout') { const token = (await cookies()).get('frame_session')?.value; if (token) await db.session.deleteMany({ where: { tokenHash: digest(token) } }); (await cookies()).delete('frame_session'); return json({ ok: true }); }
      if (path === 'auth/revoke') { const token = (await cookies()).get('frame_session')!.value; await db.session.deleteMany({ where: { userId: u.id, tokenHash: { not: digest(token) } } }); return json({ ok: true }); }
      if (path === 'auth/password') {
        const p = z.object({ currentPassword: z.string().max(128), password: credentials.shape.password }).parse(body);
        if (!await argon2.verify(u.passwordHash, p.currentPassword)) throw new AppError('原密码不正确');
        const recoveryCode = newSecret(); const passwordHash = await hashPassword(p.password);
        await transaction(async tx => { const changed = await tx.user.updateMany({ where: { id: u.id, passwordHash: u.passwordHash }, data: { passwordHash, recoveryHash: digest(recoveryCode) } }); if (!changed.count) throw new AppError('密码已变更，请重新登录'); await tx.session.deleteMany({ where: { userId: u.id } }); });
        await issueSession(u.id); return json({ recoveryCode });
      }
      throw new AppError('接口不存在', 404);
    }
    // No public payment webhook is accepted until a real verifier is installed.
    if (path.startsWith('payments/webhook')) throw new AppError('支付渠道未开通', 503);
    const u = await requireUser();
    if (post) await rateLimit(`user:${u.id}`, 100, 60);
    if (path === 'quote' && post) return json(await quote(u.id, await req.json()));
    if (path === 'tasks' && post) return json(publicTask(await createTask(u.id, await req.json())), 201);
    if (path === 'tasks' && req.method === 'GET') return json({ tasks: await history(u.id) });
    if (path.startsWith('tasks/') && req.method === 'GET') {
      const t = (await history(u.id)).find(t => t.id === path.split('/')[1]); if (!t) throw new AppError('任务不存在或历史已过期', 404); return json(t);
    }
    if (path === 'uploads' && post) {
      await rateLimit(`upload:${u.id}`, 20, 3600);
      if (Number(req.headers.get('content-length') || 0) > 21 * 1024 * 1024) throw new AppError('图片最大 20 MB');
      const form = await req.formData(); const file = form.get('file');
      if (!(file instanceof File) || !file.size || file.size > 20 * 1024 * 1024) throw new AppError('请上传 20 MB 以内的 PNG、JPEG 或 WebP');
      const input = Buffer.from(await file.arrayBuffer());
      const meta = await sharp(input, { limitInputPixels: 40_000_000, animated: false }).metadata();
      if (!['png', 'jpeg', 'webp'].includes(meta.format || '') || !meta.width || !meta.height || (meta.pages || 1) > 1) throw new AppError('仅支持静态 PNG、JPEG、WebP 图片');
      const { data: bytes, info } = await sharp(input, { limitInputPixels: 40_000_000 }).rotate().png().toBuffer({ resolveWithObject: true });
      const a = await db.asset.create({ data: { userId: u.id, kind: 'REFERENCE', key: `references/${u.id}/${randomUUID()}.png`, mime: 'image/png', width: info.width, height: info.height, bytes: bytes.length, expiresAt: expiry() } });
      await putObject(a.key, bytes, a.mime); await db.asset.update({ where: { id: a.id }, data: { ready: true } });
      return json({ id: a.id, width: a.width, height: a.height, expiresAt: a.expiresAt }, 201);
    }
    if (path.startsWith('assets/')) {
      const a = await db.asset.findUnique({ where: { id: path.split('/')[1] } });
      if (!a || a.userId !== u.id || !a.ready || !isAccessible(a)) throw new AppError('图片不存在或已过期', 404);
      if (req.method === 'DELETE') { await db.asset.update({ where: { id: a.id }, data: { deletedAt: new Date() } }); return json({ ok: true }); }
      if (req.method !== 'GET') throw new AppError('不支持该操作', 405);
      const bytes = await getObject(a.key);
      // Check expiry again after storage I/O; never expose permanent bucket URLs.
      const stillAvailable = await db.asset.findUnique({ where: { id: a.id } });
      if (!stillAvailable || !isAccessible(stillAvailable)) throw new AppError('图片已删除或过期', 404);
      return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': a.mime, 'Cache-Control': 'private, no-store', 'Content-Disposition': `${new URL(req.url).searchParams.has('download') ? 'attachment' : 'inline'}; filename="frame-${a.width}x${a.height}-${a.id}.png"`, 'X-Content-Type-Options': 'nosniff' } });
    }
    if (path === 'wallet' && !post) return json({ wallet: await db.wallet.findUnique({ where: { userId: u.id } }), ledger: await db.ledger.findMany({ where: { userId: u.id }, orderBy: { createdAt: 'desc' }, take: 100 }), payments: await db.payment.findMany({ where: { userId: u.id }, orderBy: { createdAt: 'desc' }, take: 100 }), refunds: await db.refund.findMany({ where: { userId: u.id } }) });
    if (path === 'payments' && post) {
      if (!demoMode()) throw new AppError('充值尚未开放，不会收取费用', 503);
      const p = z.object({ amount: z.number().int().min(100).max(10000), requestKey: z.string().uuid() }).parse(await req.json());
      return json(await db.payment.upsert({ where: { userId_requestKey: { userId: u.id, requestKey: p.requestKey } }, create: { ...p, userId: u.id, provider: 'TEST' }, update: {} }));
    }
    if (path === 'payments/test-confirm' && post) { const p = z.object({ id: z.string() }).parse(await req.json()); return json(await confirmTestPayment(u.id, p.id)); }
    if (path === 'refunds' && post) { const p = z.object({ paymentId: z.string() }).parse(await req.json()); return json(await requestRefund(u.id, p.paymentId)); }
    if (path.startsWith('admin')) {
      await requireAdmin();
      if (path === 'admin/pool' && req.method === 'GET') return json(await poolOverview());
      if (path === 'admin/pool/check' && post) { const p = z.object({ id: z.string() }).parse(await req.json()); const result = await checkAccount(p.id); await db.audit.create({ data: { actorId: u.id, action: 'POOL_ACCOUNT_CHECK', reference: p.id } }); return json(result); }
      if (path.startsWith('admin/pool/') && post) return json(await savePool(path.split('/')[2], await req.json(), u.id));
      if (path === 'admin' && !post) return json({ models: await catalog(), channels: (await db.channel.findMany()).filter(c => !isPoolAdapter(c.adapter) && c.adapter !== 'unconfigured').map(({ secretEnv: _s, ...c }) => c), refunds: await db.refund.findMany({ where: { status: 'REVIEW' } }), tasks: await db.task.findMany({ where: { status: 'REVIEW' }, take: 100 }), audits: await db.audit.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }) });
      if (path === 'admin/refunds' && post) { const p = z.object({ id: z.string(), approve: z.boolean() }).parse(await req.json()); return json(await reviewRefund(u.id, p.id, p.approve)); }
      if (path === 'admin/models' && post) {
        const p = z.object({ id: z.string(), enabled: z.boolean() }).parse(await req.json());
        const m = await db.model.findUniqueOrThrow({ where: { id: p.id } }); const c = await db.channel.findUniqueOrThrow({ where: { id: m.channelId } });
        if (p.enabled && !m.pooled && (!c.verified || !adapterAvailable(c.adapter))) throw new AppError('接口未实现或未验证，无法上架');
        return json(await transaction(async tx => { await tx.audit.create({ data: { actorId: u.id, action: p.enabled ? 'MODEL_ENABLE' : 'MODEL_DISABLE', reference: p.id } }); return tx.model.update({ where: { id: p.id }, data: { enabled: p.enabled } }); }));
      }
      if (path === 'admin/channels' && post) {
        const p = z.object({ id: z.string(), enabled: z.boolean() }).parse(await req.json()); const c = await db.channel.findUniqueOrThrow({ where: { id: p.id } });
        if (p.enabled && !isPoolAdapter(c.adapter) && (!c.verified || !adapterAvailable(c.adapter))) throw new AppError('渠道未验证');
        return json(await transaction(async tx => { await tx.audit.create({ data: { actorId: u.id, action: p.enabled ? 'CHANNEL_ENABLE' : 'CHANNEL_DISABLE', reference: p.id } }); return tx.channel.update({ where: { id: p.id }, data: { enabled: p.enabled } }); }));
      }
      if (path === 'admin/prices' && post) {
        const p = z.object({ modelId: z.string(), mode: z.enum(['TEXT', 'REFERENCE']), size: z.string(), quality: z.string(), unitCents: z.number().int().min(1).max(100000) }).parse(await req.json());
        const m = await db.model.findUniqueOrThrow({ where: { id: p.modelId } }); if (!(m.sizes as string[]).includes(p.size) || !(m.qualities as string[]).includes(p.quality) || (p.mode === 'REFERENCE' && !m.maxReferences)) throw new AppError('模型不支持该规格');
        return json(await transaction(async tx => { await tx.price.updateMany({ where: { modelId: p.modelId, mode: p.mode, size: p.size, quality: p.quality, active: true }, data: { active: false } }); const price = await tx.price.create({ data: p }); await tx.audit.create({ data: { actorId: u.id, action: 'PRICE_CREATE', reference: price.id } }); return price; }));
      }
      if (path === 'admin/tasks/resolve' && post) {
        const p = z.object({ id: z.string() }).parse(await req.json()); const t = await db.task.findUniqueOrThrow({ where: { id: p.id } }); if (t.status !== 'REVIEW') throw new AppError('任务不在核查状态');
        const count = await db.asset.count({ where: { taskId: p.id, ready: true } }); const result = await settleTask(p.id, count, '管理员已按实际交付数量结算'); await db.audit.create({ data: { actorId: u.id, action: 'TASK_RESOLVE', reference: p.id } }); return json(result);
      }
    }
    throw new AppError('接口不存在', 404);
  } catch (e) {
    if (e instanceof AppError) return json({ error: e.message }, e.status);
    if (e instanceof ZodError) return json({ error: e.issues[0]?.message || '参数不正确' }, 400);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return json({ error: '账号或请求已存在，请刷新后重试' }, 409);
    console.error('api_request_failed', e instanceof Error ? e.name : 'UnknownError');
    return json({ error: '服务暂不可用，请稍后重试；尚未完成的请求请先查询状态' }, 503);
  }
}
export const GET = handle; export const POST = handle; export const DELETE = handle;
