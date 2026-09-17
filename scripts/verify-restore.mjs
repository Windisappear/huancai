import { execFileSync } from 'node:child_process';
const container = 'frame-studio-dev-postgres-1';
const database = `frame_verify_${Date.now()}`;
const archive = `/tmp/${database}.dump`;
const docker = args => execFileSync('docker', ['exec', container, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
let created = false;
try {
  docker(['pg_dump', '-U', 'frame', '-d', 'frame', '-Fc', '--exclude-table-data=public."TaskContent"', '--exclude-table-data=public."Asset"', '-f', archive]);
  docker(['createdb', '-U', 'frame', database]); created = true;
  docker(['pg_restore', '-U', 'frame', '-d', database, '--no-owner', archive]);
  const sql = `SELECT count(*) FROM "Wallet" w LEFT JOIN (SELECT "userId", sum("availableDelta") AS a, sum("frozenDelta") AS f FROM "Ledger" GROUP BY "userId") l ON w."userId"=l."userId" WHERE w.available<>coalesce(l.a,0) OR w.frozen<>coalesce(l.f,0)`;
  const mismatches = Number(docker(['psql', '-U', 'frame', '-d', database, '-Atc', sql]).trim());
  const creativeRows = Number(docker(['psql', '-U', 'frame', '-d', database, '-Atc', 'SELECT (SELECT count(*) FROM "TaskContent")+(SELECT count(*) FROM "Asset")']).trim());
  if (mismatches || creativeRows) throw new Error(`Restore validation failed: mismatches=${mismatches}, creativeRows=${creativeRows}`);
  console.log('Restore passed: wallet ledger reconciled; creative rows excluded.');
} finally {
  if (created) docker(['dropdb', '-U', 'frame', database]);
  if (!archive.startsWith('/tmp/frame_verify_')) throw new Error('Invalid temporary archive target');
  docker(['rm', '-f', '--', archive]);
}
