import 'dotenv/config';
import { Worker } from 'bullmq';
import { redis, queue } from './lib/queue';
import { db } from './lib/db';
import { dispatch, processTask, cleanup, monitor, alert, pollPending } from './lib/jobs';
import { lightweightMode } from './lib/core';
const worker = lightweightMode() ? null : new Worker('generation', job => processTask(job.data.taskId), { connection: redis, concurrency: Number(process.env.WORKER_CONCURRENCY || 2) });
worker?.on('error', () => { void alert('worker_error'); });
let busy = false, lastClean = 0, lastMonitor = 0;
async function tick() {
  if (busy) return; busy = true;
  try { await dispatch(); if (lightweightMode()) { const tasks = await db.task.findMany({ where: { status: 'QUEUED', settledAt: null }, take: 2, orderBy: { createdAt: 'asc' } }); for (const t of tasks) await processTask(t.id); } await pollPending(); if (Date.now() - lastClean > 3600_000) { await cleanup(); lastClean = Date.now(); } if (Date.now() - lastMonitor > 60000) { await monitor(); lastMonitor = Date.now(); } }
  catch { await alert('worker_maintenance_failed'); } finally { busy = false; }
}
void tick(); const timer = setInterval(tick, 3000);
async function stop() { clearInterval(timer); await worker?.close(); await queue.close(); await redis.quit(); await db.$disconnect(); process.exit(0); }
process.on('SIGTERM', stop); process.on('SIGINT', stop);
