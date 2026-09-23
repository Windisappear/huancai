import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const project = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const root = process.argv.includes('--dist') ? path.join(project, 'dist') : project;
const port = Number(process.env.PORT || 4173);
const allowed = /^\/(?:index\.html|favicon\.svg|src\/[a-z-]+\.(?:js|css))$/;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const route = pathname === '/' ? '/index.html' : pathname;
  if (!['GET', 'HEAD'].includes(req.method) || !allowed.test(route)) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const content = await readFile(path.join(root, route.slice(1)));
    res.writeHead(200, { 'Content-Type': types[path.extname(route)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已被占用，请设置 PORT 后重试。` : error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`幻彩静态工作台：http://127.0.0.1:${port}\n此服务仅提供静态文件，API 请求由浏览器直连中转站。\n按 Ctrl+C 停止预览。`));
