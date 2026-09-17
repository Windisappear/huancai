import 'dotenv/config';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { readFile, readdir, mkdir, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';

const e2e = process.argv.includes('--e2e');
const test = process.argv.includes('--test') || e2e;
const preview = process.argv.includes('--preview') || e2e;
const setup = process.argv.includes('--setup');
const port = Number(process.env.LIGHTWEIGHT_DB_PORT || (test ? 55434 : 55433));
await mkdir('.local', { recursive: true });
const lite = await PGlite.create(test ? undefined : path.resolve('.local/pglite-dev'));
await lite.exec('CREATE TABLE IF NOT EXISTS "_LocalMigrations" (name TEXT PRIMARY KEY, hash TEXT NOT NULL)');
for (const entry of (await readdir('prisma/migrations', { withFileTypes: true })).filter(e => e.isDirectory()).sort((a,b) => a.name.localeCompare(b.name))) {
  const sql = await readFile(`prisma/migrations/${entry.name}/migration.sql`, 'utf8');
  const hash = createHash('sha256').update(sql).digest('hex');
  const previous = await lite.query('SELECT hash FROM "_LocalMigrations" WHERE name=$1', [entry.name]);
  if (previous.rows.length) { if (previous.rows[0].hash !== hash) throw new Error('本地已应用迁移发生变更，请创建新迁移'); continue; }
  await lite.transaction(async tx => { await tx.exec(sql); await tx.query('INSERT INTO "_LocalMigrations" VALUES ($1,$2)', [entry.name, hash]); });
}
const server = new PGLiteSocketServer({ db: lite, host: '127.0.0.1', port, maxConnections: 10 });
await server.start();
const env = { ...process.env, NODE_USE_ENV_PROXY: process.env.NODE_USE_ENV_PROXY || '1', DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?connection_limit=1&pool_timeout=30&pgbouncer=true&statement_cache_size=0`, DEMO_MODE: 'true', LIGHTWEIGHT_TEST: 'true', STORAGE_DRIVER: 'local', APP_ORIGIN: 'http://localhost:3000', SESSION_SECURE: 'false', HOSTNAME: '127.0.0.1', RELAY_CONFIG_FILE: path.resolve('api key.txt'), LOCAL_STORAGE_ROOT: path.resolve(test ? '.local/test-assets' : '.local/assets') };
const children = new Set();
function start(args) { const child = spawn(process.execPath, args, { env, stdio: 'inherit', windowsHide: true }); children.add(child); child.on('exit', () => children.delete(child)); return child; }
function run(args) { return new Promise((resolve, reject) => { const child = start(args); child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`子进程失败，退出码 ${code}`))); }); }
let closing = false;
async function stop(code = 0) { if (closing) return; closing = true; for (const child of children) child.kill(); await server.stop(); await lite.close(); process.exit(code); }
process.on('SIGINT', () => void stop()); process.on('SIGTERM', () => void stop());
try {
  await run(['node_modules/tsx/dist/cli.mjs', 'prisma/seed.ts']);
  if (test && !e2e) {
    await run(['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.integration.config.mts']);
    await stop();
  } else {
    if (!e2e) await run(['node_modules/tsx/dist/cli.mjs', 'scripts/pool-check.ts']);
    if (setup) await stop();
    else {
      console.log('轻量测试：PGlite + 本地任务轮询，无 Docker/Redis。打开 http://localhost:3000；Ctrl+C 停止。');
      start(['node_modules/tsx/dist/cli.mjs', 'src/worker.ts']);
      if (preview) await cp('.next/static', '.next/standalone/.next/static', { recursive: true });
      start(preview ? ['.next/standalone/server.js'] : ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1']);
      if (e2e) {
        let ready = false;
        for (let i = 0; i < 60; i++) { try { ready = (await fetch('http://localhost:3000/api/health')).ok; } catch {} if (ready) break; await new Promise(r => setTimeout(r, 1000)); }
        if (!ready) throw new Error('Preview did not become ready');
        await run(['node_modules/@playwright/test/cli.js', 'test']);
        await stop();
      }
    }
  }
} catch { console.error('轻量测试启动/执行失败；原 PostgreSQL 配置未修改。'); await stop(1); }
