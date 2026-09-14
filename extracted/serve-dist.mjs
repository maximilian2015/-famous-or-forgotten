// Serves dist/ (the built game.html) on :5174 so the built file can be opened in a browser
// pane the way Maxi opens it — a double-click on game.html. node serve-dist.mjs
import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(dir, u === '/' ? 'game.html' : u);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end('nope'); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(5174, () => console.log('dist on http://localhost:5174'));
