// Reads the four screens Block 1 changed, off the BUILT game, because that is the only place
// they exist. CLAUDE.md: a green suite does not prove a screen says anything.
//   the stat tile      -> Standing, not Respect
//   the Passport       -> Industry typecast, what you are before what may stick
//   Known for ›        -> five different reasons
//   Acting             -> the typecast box
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const gameDir = fileURLToPath(new URL('../../', import.meta.url));
const html = fs.readFileSync(path.join(gameDir, 'dist/game.html'), 'utf8');
const P = new URL('../../src/', import.meta.url).href;
const { typecastBump } = await import(P + 'systems/meta/typecast.js');

const s = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
s.bigMoment = null; s.moments = []; s.production = null; s.pendingArc = null; s.scene = null;
s.offers = []; s.sets = []; s.inbox = [];
// A career of blockbusters with a television score behind it — the screen Maxi photographed.
const film = s.filmography.filter((c) => !c.minor);
const give = (i, over) => Object.assign(film[i] || {}, over);
give(0, { title: 'Light and Rain', year: 2059, boxOffice: 1.62e9, billion: true, verdict: 'smash', rating: 74, part: 1, genre: 'Action', scale: 'blockbuster' });
give(1, { title: 'Light and Rain II', year: 2062, boxOffice: 1.31e9, billion: true, verdict: 'smash', rating: 68, part: 2, genre: 'Action', scale: 'blockbuster' });
give(2, { title: 'Midnight Talker', year: 2064, boxOffice: 1.16e9, billion: true, verdict: 'smash', rating: 71, part: 1, genre: 'Thriller', scale: 'blockbuster' });
give(3, { title: 'Blue Roommate', year: 2065, boxOffice: 1.04e9, billion: true, verdict: 'smash', rating: 66, part: 1, genre: 'Comedy', scale: 'blockbuster' });
give(4, { title: 'A Voice Above Your Door', year: 2061, boxOffice: 82e6, nominated: 1, verdict: 'profitable', rating: 85, part: 1, genre: 'Drama', scale: 'prestige' });
s.typecast = { scores: {}, active: [], primary: null };
typecastBump(s, 'commercial', 6);
typecastBump(s, 'tv', 1.7);

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('threw: ' + e.message));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ').slice(0, 200)));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://localhost/game.html', virtualConsole: vc,
  beforeParse(w) { try { w.localStorage.setItem('fof_react_save', JSON.stringify(s)); } catch (e) { /* opaque origin */ } } });
const W = dom.window, D = W.document;
W.requestAnimationFrame = (fn) => W.setTimeout(() => fn(Date.now()), 16);
W.cancelAnimationFrame = (id) => W.clearTimeout(id);
W.confirm = () => true; W.alert = () => {}; W.prompt = () => '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1200);

const txt = () => (D.body.textContent || '').replace(/!function\(\)[\s\S]*$/, '').replace(/\s+/g, ' ').trim();
const btns = () => Array.from(D.querySelectorAll('button')).filter((b) => !b.disabled);
const lab = (b) => (b.textContent || '').replace(/\s+/g, ' ').trim();
async function press(re, what) {
  const b = btns().find((x) => re.test(lab(x)));
  if (!b) { console.log('!! cannot press ' + what); return false; }
  b.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await sleep(350); return true;
}
// The known-for line and the figure on the header are divs with an onClick, not buttons.
async function tap(re, what) {
  const all = Array.from(D.querySelectorAll('div, span, img, svg'));
  const el = all.reverse().find((x) => re.test((x.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90)));
  if (!el) { console.log('!! nothing to tap for ' + what); return false; }
  // The handler may be on the line, on its row, or on the block around both — React puts it
  // wherever the component did. Walk up a few levels rather than guessing which one it was.
  const before = txt().slice(0, 120);
  for (let n = el; n && n !== D.body; n = n.parentElement) {
    n.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await sleep(250);
    if (txt().slice(0, 120) !== before) return true;
  }
  console.log('!! tapped ' + what + ' and the screen did not change');
  return false;
}
const cut = (from, to, n = 700) => { const t = txt(); const i = t.indexOf(from); return i < 0 ? '(not on screen: ' + from + ')' : t.slice(i, to ? Math.min(t.indexOf(to, i) + to.length, i + n) : i + n); };

// Whatever the month put on screen first is answered the way a player answers it. The arc is
// not what is being read here.
for (let i = 0; i < 8; i++) {
  if (btns().some((b) => /^(🏠)?Home[0-9]*$/.test(lab(b)))) break;
  const b = btns().find((x) => !/^(🏠|🎬|❤️|📱|🛍️|🏆)/.test(lab(x)));
  if (!b) break;
  b.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await sleep(320);
}
console.log('── the stat tile ──');
console.log(txt().slice(0, 300));

console.log('\n── known for, the wall ──');
if (await tap(/^[^A-Za-z]{0,4}Known for "/, 'the known-for line')) console.log(cut('Known for', null, 800));
await press(/^(Go on|Continue|OK|Back|‹|✕|Close)/i, 'back');

console.log('\n── the passport ──');
await tap(/^.{0,3}$/, 'the figure on the header') || await tap(/Known for/, 'the header');
console.log(cut('Who thinks what', null, 1000));
console.log('\n' + cut('Industry typecast', null, 620));

console.log('\n── acting, the box ──');
await press(/^(🎬)?Career[0-9]*$/, 'career');
await press(/^Acting[0-9]*$/, 'the acting tab');
console.log(cut('What they call you', null, 560));

console.log('\nerrors: ' + (errors.length ? errors.join(' / ') : 'none'));
process.exit(0);
