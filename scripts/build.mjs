import { mkdir, copyFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = path.join(root, 'dist');
await mkdir(path.join(dist, 'src'), { recursive: true });
for (const name of ['index.html', 'favicon.svg']) await copyFile(path.join(root, name), path.join(dist, name));
for (const name of await readdir(path.join(root, 'src'))) if (/\.(js|css)$/.test(name)) await copyFile(path.join(root, 'src', name), path.join(dist, 'src', name));
console.log('已生成 dist/：纯静态 HTML、CSS、JavaScript，无运行时依赖，可部署在任意静态网站托管。');
