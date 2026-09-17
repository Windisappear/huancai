import 'dotenv/config';
import { cp } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
await cp('.next/static', '.next/standalone/.next/static', { recursive: true });
const child = spawn(process.execPath, ['.next/standalone/server.js'], { stdio: 'inherit', env: { ...process.env, HOSTNAME: '127.0.0.1', RELAY_CONFIG_FILE: path.resolve(process.env.RELAY_CONFIG_FILE || 'api key.txt'), LOCAL_STORAGE_ROOT: path.resolve(process.env.LOCAL_STORAGE_ROOT || '.local/assets') } });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code || 0));
