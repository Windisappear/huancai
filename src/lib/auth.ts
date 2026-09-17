import { randomBytes, createHash } from 'node:crypto';
import argon2 from 'argon2';
import { cookies } from 'next/headers';
import { db, transaction } from './db';
import { AppError } from './core';
import { redis } from './queue';
export const digest = (s: string) => createHash('sha256').update(s).digest('hex');
export const newSecret = () => randomBytes(32).toString('base64url');
export const hashPassword = (s: string) => argon2.hash(s, { type: argon2.argon2id });
export async function rateLimit(key: string, limit: number, seconds = 600) {
  const n = await redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n", 1, `limit:${digest(key)}`, seconds) as number;
  if (n > limit) throw new AppError('操作过于频繁，请稍后重试', 429);
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (origin !== process.env.APP_ORIGIN) throw new AppError('请求来源无效', 403);
}
export async function currentUser(required = true) {
  const token = (await cookies()).get('frame_session')?.value;
  const session = token ? await db.session.findUnique({ where: { tokenHash: digest(token) } }) : null;
  const user = session && session.expiresAt > new Date() ? await db.user.findUnique({ where: { id: session.userId } }) : null;
  if (!user && required) throw new AppError('请先登录', 401);
  return user;
}
export async function requireUser() { return (await currentUser(true))!; }
export async function requireAdmin() { const u = await requireUser(); if (u.role !== 'ADMIN') throw new AppError('无权访问', 403); return u; }
export async function issueSession(userId: string) {
  const token = newSecret();
  await db.session.create({ data: { tokenHash: digest(token), userId, expiresAt: new Date(Date.now() + 7 * 86400_000) } });
  (await cookies()).set('frame_session', token, { httpOnly: true, secure: process.env.SESSION_SECURE === 'true', sameSite: 'lax', path: '/', maxAge: 7 * 86400 });
}
export async function rotatePassword(userId: string, passwordHash: string, recoveryHash: string) {
  await transaction(async tx => { await tx.user.update({ where: { id: userId }, data: { passwordHash, recoveryHash } }); await tx.session.deleteMany({ where: { userId } }); });
}
