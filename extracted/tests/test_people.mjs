import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Renders the built dist/game.html in jsdom. Needs `npm i` (jsdom is a devDependency) and a
// fresh build first: node build-singlefile.mjs
const gameDir = fileURLToPath(new URL('../', import.meta.url));
const html = fs.readFileSync(path.join(gameDir, 'dist/game.html'), 'utf8');
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => console.log('JSDOM ERROR:', e.message, e.detail && e.detail.stack));
vc.on('error', (...a) => console.log('CONSOLE.ERROR:', ...a));
vc.on('warn', (...a) => console.log('CONSOLE.WARN:', ...a));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'file:///' + gameDir.replace(/\\/g, '/') + '/dist/game.html',
  virtualConsole: vc,
});
dom.window.onerror = (msg) => console.log('WINDOW ONERROR:', msg);

setTimeout(() => {
  const doc = dom.window.document;
  const btns = Array.from(doc.querySelectorAll('button'));
  const peopleBtn = btns.find((b) => b.textContent.includes('People'));
  console.log('found People button:', !!peopleBtn, 'total buttons:', btns.length);
  if (peopleBtn) peopleBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  setTimeout(() => {
    console.log('BODY TEXT:', doc.body.textContent.replace(/\s+/g, ' ').slice(0, 900));
  }, 300);
}, 800);
