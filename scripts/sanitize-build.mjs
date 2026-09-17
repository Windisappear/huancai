import { rm } from 'node:fs/promises';
import path from 'node:path';
// Next standalone also copies env files outside tracing rules. Runtime receives env externally.
const root = path.resolve('.next/standalone');
for (const name of ['api key.txt', '.env', '.env.local', '.env.production', '.env.production.local', '.env.development', '.env.development.local']) {
  const file = path.resolve(root, name);
  if (path.dirname(file) !== root) throw new Error('Unexpected build artifact path');
  await rm(file, { force: true });
}
console.log('Standalone output sanitized: no bundled environment files.');
