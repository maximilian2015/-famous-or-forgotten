// The real game in jsdom, with jsdom's gaps filled (tests/autoplay_career.mjs). tests/autoplay.mjs
// still boots its own copy of the same stubs; move it onto this when it is next touched, so the
// two cannot drift apart.
//
//   const g = await bootGame({ seed, save })   seed: dice inside the page; save: a state to start from
//   g.W, g.D           the window and document
//   g.shot()           the screen as text
//   g.buttons()        every enabled button
//   g.label(b)         a button's text, short
//   g.click(el)        a real click event, bubbling
//   g.save()           the save as the game wrote it, or null
//   g.errors           everything that threw or was logged as an error
//   g.close()
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const gameDir = fileURLToPath(new URL('../../', import.meta.url));
export const HTML = path.join(gameDir, 'dist/game.html');
export const KEY = 'fof_react_save';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// mulberry32, the same as helpers/seeded.mjs, but as a value: a page gets its own sequence.
export function rng(seed) {
  let x = seed | 0;
  return () => {
    x = (x + 0x6d2b79f5) | 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function bootGame({ seed = null, save = null } = {}) {
  if (!fs.existsSync(HTML)) { console.log('No dist/game.html — run `node build-singlefile.mjs` first.'); process.exit(1); }
  const html = fs.readFileSync(HTML, 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('threw: ' + e.message));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ').slice(0, 200)));

  const dom = new JSDOM(html, {
    runScripts: 'dangerously', resources: 'usable',
    // An http origin, not file://. jsdom gives a file:// page an opaque origin where
    // localStorage silently does nothing — so every life reported zero credits, no year and
    // no age, and the numbers looked like the game rather than like the harness.
    url: 'https://localhost/game.html',
    virtualConsole: vc,
    // Before the game's script runs: its dice, and the life it will load.
    beforeParse(W) {
      if (seed != null) W.Math.random = rng(seed);
      try { W.localStorage.clear(); if (save) W.localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* no storage */ }
      // jsdom does not implement these. Left alone they surface as 'the game threw', which is
      // the harness blaming its subject for its own gaps: the arcade game uses rAF and the
      // save-to-file button uses createObjectURL, and both work in a real browser.
      if (!W.requestAnimationFrame) {
        W.requestAnimationFrame = (fn) => W.setTimeout(() => fn(Date.now()), 16);
        W.cancelAnimationFrame = (id) => W.clearTimeout(id);
      }
      // No confirm/alert/prompt either, and a game that asks 'are you sure?' would otherwise
      // be reported as having crashed.
      W.confirm = () => true; W.alert = () => {}; W.prompt = () => '';
      if (W.URL && !W.URL.createObjectURL) { W.URL.createObjectURL = () => 'blob:stub'; W.URL.revokeObjectURL = () => {}; }
      // And the download itself: jsdom treats a click on <a download> as navigating away and
      // reports "navigation to another Document". A browser saves the file.
      const aClick = W.HTMLAnchorElement.prototype.click;
      W.HTMLAnchorElement.prototype.click = function () { if (this.download) return; return aClick.call(this); };
      W.onerror = (msg) => errors.push('window.onerror: ' + String(msg).slice(0, 200));
      W.addEventListener('unhandledrejection', (e) => errors.push('unhandled: ' + String(e.reason).slice(0, 200)));
    },
  });
  const W = dom.window, D = W.document;
  await sleep(900);
  const g = {
    W, D, errors,
    shot: () => (D.body.textContent || '').replace(/\s+/g, ' '),
    buttons: () => Array.from(D.querySelectorAll('button')).filter((b) => !b.disabled),
    label: (b) => (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
    click: (el) => el.dispatchEvent(new W.MouseEvent('click', { bubbles: true, cancelable: true })),
    save: () => { try { return JSON.parse(W.localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } },
    close: () => dom.window.close(),
  };
  return g;
}
