import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { lightweightMode } from './core';
const localJobs = new Map<string, { id: string; remove(): Promise<void> }>();
const localLimits = new Map<string, { count: number; expires: number }>();
const localQueue = {
  async add(_name: string, _data: unknown, opts: { jobId: string }) { if (!localJobs.has(opts.jobId)) localJobs.set(opts.jobId, { id: opts.jobId, async remove() { localJobs.delete(opts.jobId); } }); return localJobs.get(opts.jobId); },
  async getJob(id: string) { return localJobs.get(id); }, async close() {}
};
const localRedis = { async eval(_script: string, _count: number, key: string, seconds: number) { const now = Date.now(); const row = localLimits.get(key); if (!row || row.expires <= now) { localLimits.set(key, { count: 1, expires: now + seconds * 1000 }); return 1; } return ++row.count; }, async quit() {}, disconnect() {} };
const globalQueue = globalThis as unknown as { redis?: IORedis; queue?: Queue };
export const redis = globalQueue.redis ?? (lightweightMode() ? localRedis as unknown as IORedis : new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', { maxRetriesPerRequest: null, lazyConnect: true }));
export const queue = globalQueue.queue ?? (lightweightMode() ? localQueue as unknown as Queue : new Queue('generation', { connection: redis, defaultJobOptions: { attempts: 1, removeOnComplete: { age: 86400 }, removeOnFail: { age: 3 * 86400 } } }));
globalQueue.redis = redis; globalQueue.queue = queue;
