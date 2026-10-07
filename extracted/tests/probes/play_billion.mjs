// Plays the whole visible billion chain through the real built interface, one click at a time:
// run closes -> billion club -> the studio letter -> the talk show card -> the studio's night.
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const gameDir = fileURLToPath(new URL('../../', import.meta.url));
const HTML = path.join(gameDir, 'dist/game.html');
const html = fs.readFileSync(HTML, 'utf8');
const SAVE = process.argv[2];

const P = new URL('../../src/', import.meta.url).href;
const { markBillion } = await import(P + 'systems/career/billion.js');

const s = JSON.parse(fs.readFileSync(SAVE, 'utf8'));
s.bigMoment = null; s.moments = []; s.inbox = []; s.castingPool = [];
s.production = null; s.pendingArc = null; s.scene = null; s.offers = []; s.sets = [];
const cr = (s.filmography || []).slice(-1)[0];
cr.title = 'The Long Fall'; cr.boxOffice = 1.312e9; cr.billion = false;
cr.budget = 220e6; cr.scale = 'blockbuster';
// The verdict card the run really queues first, so the ordering is played, not asserted.
s.bigMoment = { id: 'wrap', kind: 'good', title: 'THE RUN IS OVER', body: '"' + cr.title + '" has finished playing. PROFITABLE.' };
const r = markBillion(s, cr);
console.log('markBillion ->', r, '| queued:', [s.bigMoment, ...s.moments].map((m) => m.id + (m.letter ? ':letter' : '')).join(' -> '));

const vc = new VirtualConsole();
const errors = [];
vc.on('jsdomError', (e) => errors.push('threw: ' + e.message));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ').slice(0, 300)));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://localhost/game.html', virtualConsole: vc,
  beforeParse(w) { try { w.localStorage.setItem('fof_react_save', JSON.stringify(s)); } catch (e) { console.log('no localStorage'); } } });
const W = dom.window, D = W.document;
W.requestAnimationFrame = (fn) => W.setTimeout(() => fn(Date.now()), 16);
W.cancelAnimationFrame = (id) => W.clearTimeout(id);
W.confirm = () => true; W.alert = () => {}; W.prompt = () => '';
if (W.URL && !W.URL.createObjectURL) { W.URL.createObjectURL = () => 'blob:stub'; W.URL.revokeObjectURL = () => {}; }
const sleep = (ms) => new Promise((r2) => setTimeout(r2, ms));
await sleep(1200);

const txt = () => (D.body.textContent || '').replace(/\s+/g, ' ').trim();
const btns = () => Array.from(D.querySelectorAll('button')).filter((b) => !b.disabled);
const lab = (b) => (b.textContent || '').replace(/\s+/g, ' ').trim();
async function press(re, what) {
  const b = btns().find((x) => re.test(lab(x)));
  if (!b) { console.log('\n!! cannot press ' + what + ' — buttons: ' + btns().map(lab).slice(0, 18).join(' | ')); process.exit(1); }
  b.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await sleep(350);
  return lab(b);
}
const show = (n, cut = 520) => console.log('\n── ' + n + ' ──\n' + txt().slice(0, cut));

show('SCREEN 1 (the run)');
await press(/^(Go on|Continue|OK|Onwards|Take it in|Good|Right|I see|Noted)/i, 'past the verdict');
show('SCREEN 2 (the milestone)');
await press(/^(Go on|Continue|OK|Onwards|Take it in|Good|Right|I see|Noted)/i, 'past the milestone');
show('SCREEN 3 (the letter has arrived)');
await press(/^(Go on|Continue|OK|Onwards|Take it in|Good|Right|I see|Noted)/i, 'past the letter card');

// Whatever else the month put in front of me — an arc, a note from a director — is cleared the
// way a player clears it, by answering. The billion chain is what is being read, not these.
async function clearToPhone() {
  for (let i = 0; i < 6; i++) {
    if (btns().some((b) => /^(📱)?Phone[0-9]*$/.test(lab(b)))) return;
    const b = btns().find((x) => !/^(🏠|🎬|❤️|📱|🛍️|🏆)/.test(lab(x)));
    if (!b) return;
    console.log('   (cleared: ' + lab(b).slice(0, 44) + ')');
    b.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await sleep(320);
  }
}
await clearToPhone();
await press(/^(📱)?Phone[0-9]*$/, 'the phone');
await press(/Mail|Email|✉/i, 'the mail app');
show('SCREEN 4 (the inbox)');
await press(/office of the chairman/i, 'the letter');
show('SCREEN 4b (the letter, open)', 1100);
await press(/Both, then/i, 'both invitations');
show('SCREEN 5 (after answering)');

await press(/^(📱)?Phone[0-9]*$/, 'back to the phone');
await press(/Apps/i, 'the app list');
await press(/OpenCall|Open Call/i, 'OpenCall');
show('SCREEN 6 (OpenCall)', 1400);
await press(/SPECIAL INVITATION/, 'the invitation row');
show('SCREEN 6b (the card, open)', 1500);
await press(/Accept the invitation/i, 'accepting the chair');
show('SCREEN 7 (accepted)');

// What the acceptance actually did to the state, read out of the save rather than guessed:
// a chair kept at 100% must land, and the party must be on the calendar.
const sv = JSON.parse(W.localStorage.getItem('fof_react_save') || '{}');
console.log('offers: ' + (sv.offers || []).map((o) => o.title + ' (' + o.type + ')').join(' | '));
console.log('still in the pool: ' + (sv.castingPool || []).filter((c) => c.invited).length);
console.log('the evening itself: ' + (sv.lastEvent || '').slice(0, 160));
console.log('credit: ' + JSON.stringify(((sv.filmography || []).find((c2) => c2.type === 'Talk Show') || {})));
console.log('events: ' + (sv.events || []).map((e) => (e.label || e.tier) + (e.billion ? ' [billion]' : '') + ' — ' + (e.why || '')).join(' | '));
await press(/^(❤️)?People[0-9]*$/, 'people');
const ev = btns().find((b) => /^Events[0-9]*$|^Calendar[0-9]*$/.test(lab(b))) || btns().find((b) => /Events|Calendar/i.test(lab(b)));
if (ev) { ev.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await sleep(300); }
show('SCREEN 8 (the calendar)', 900);

console.log('\nerrors: ' + (errors.length ? errors.join(' / ') : 'none'));
process.exit(0);
