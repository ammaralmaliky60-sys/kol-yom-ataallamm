import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), 'dist');
const port = Number(process.env.PORT || 3000);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.zip': 'application/zip' };
const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400); response.end('Bad request'); return; }
  const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!path.startsWith(root + sep) || pathname.includes('\0')) {
    response.writeHead(403); response.end('Forbidden'); return;
  }
  try {
    const metadata = await stat(path);
    if (!metadata.isFile()) throw new Error('Not a file');
    const body = request.method === 'HEAD' ? null : await readFile(path);
    response.writeHead(200, {
      'Content-Type': mime[extname(path)] || 'application/octet-stream',
      'Content-Length': metadata.size,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      ...(path.endsWith('sw.js') ? { 'Service-Worker-Allowed': '/' } : {})
    });
    response.end(body);
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('الملف غير موجود'); }
});
server.listen(port, '0.0.0.0', () => console.log(`كل يوم أتعلم: http://localhost:${port}`));
