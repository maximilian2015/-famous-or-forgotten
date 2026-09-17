// Отдаёт папку train/ на :5175, чтобы открыть train.html в браузерной панели. node serve.mjs
// POST /shot с data:image/png — сохраняет полноразмерный кадр канваса в shots/ (для проверки картинки).
import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/shot') {
    let body = ''; req.on('data', c => body += c); req.on('end', () => {
      const b64 = body.replace(/^data:image\/png;base64,/, '');
      const out = path.join(dir, 'shots'); fs.mkdirSync(out, { recursive: true });
      const f = path.join(out, `shot-${Date.now()}.png`); fs.writeFileSync(f, Buffer.from(b64, 'base64'));
      res.writeHead(200, { 'content-type': 'text/plain' }); res.end(f);
    }); return;
  }
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(dir, u === '/' ? 'train.html' : u);
  if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nope'); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}).listen(5175, () => console.log('train on http://localhost:5175'));
