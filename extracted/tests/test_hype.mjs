import { hype, hypeSource, addHype, bumpHype, showBump, hypeTick, hypeReach, hypeDemand, hypePrice, hypeBrands, flopHype, canGoQuiet, goQuiet, SHOW_STEPS } from '../src/systems/meta/hype.js';
import { reach } from '../src/systems/career/castings.js';
import { quoteBand, quoteFor } from '../src/systems/meta/status.js';
import { availableActions, runAction } from '../src/systems/career/actions.js';
import { hiding } from '../src/systems/meta/stories.js';
import { emailAct } from '../src/systems/meta/email.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', name: 'Mira Vale', ageY: 30, stage: 'career', dream: 'actor', fame: 40, respect: 20, acting: 60, charisma: 50, looks: 50, luck: 50, scandal: 0, media: 0, mental: 60, year: 2050, month: 2, timeline: [], filmography: [], peakFame: 40, hasApartment: true, housing: 'room', ap: 100, apMax: 100, cash: 50000, genreXP: {}, inbox: [], ...over });

// ── bursts replace, small things add, it fades ──────────────────────────────────
{
  const s = st();
  addHype(s, 70, 'hit');
  ok('a hit is seventy and says so', hype(s) === 70 && hypeSource(s) === 'hit');
  addHype(s, 50, 'award');
  ok('a smaller story does not stack on a bigger one', hype(s) === 70 && hypeSource(s) === 'hit');
  addHype(s, 75, 'award');
  ok('a bigger one replaces it and takes the label', hype(s) === 75 && hypeSource(s) === 'award');
  bumpHype(s, 3);
  ok('the small things add', hype(s) === 78);
  for (let i = 0; i < 14; i++) hypeTick(s);
  ok('a year and a bit and it is gone', hype(s) < 12 && hypeSource(s) === null, String(hype(s).toFixed(1)));
  const p = st({ staff: { publicist: true } }); addHype(p, 40, 'scandal');
  ok('a publicist blunts the tabloid kind', hype(p) === 24 && hypeSource(p) === 'scandal');
}
// ── the shows are worth less each time ─────────────────────────────────────────
{
  const s = st();
  const got = [showBump(s), showBump(s), showBump(s), showBump(s)];
  ok('ten, six, two, nothing', got.join(',') === SHOW_STEPS.join(','), got.join(','));
  const e = st({ media: 30, hypeSource: 'hit' });
  e.inbox = [{ id: 'm1', tag: 'show', kind: 'invite', subj: 'Sofa', cta: [{ label: 'Go', fx: { fame: 1, media: 1 }, reply: 'ok' }] }];
  emailAct(e, 'm1', 0);
  ok('the sofa email goes through the same rule', hype(e) === 40 && (e._shows || []).length === 1, String(hype(e)));
}
// ── what it buys, and what the tabloid kind does not ───────────────────────────
{
  const h = st({ media: 60, hypeSource: 'hit' }), q = st(), t = st({ media: 60, hypeSource: 'scandal' });
  ok('access: the room reads you as a bigger name', reach(h) > reach(q) && hypeReach(h) === 7.5);
  ok('demand: the phone rings more', hypeDemand(h) === 1.6 && hypeDemand(q) === 1);
  ok('price: you ask more', hypePrice(h) === 1.24);
  let lo = Infinity, hi = 0; for (let i = 0; i < 200; i++) { const v = quoteFor(h, 'film_studio'); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const band = quoteBand(h, 'film_studio');
  ok('and the quote shows it', hi > band[1] * 1.1 && lo >= band[0], `${lo}–${hi} vs ${band}`);
  ok('the tabloid kind buys none of that', hypeReach(t) === 0 && hypeDemand(t) === 1 && hypePrice(t) === 1);
  ok('but the brands ring', hypeBrands(t) > hypeBrands(h) && hypeBrands(h) > hypeBrands(q));
}
// ── a flop after a hit, by the size of the part ─────────────────────────────────
{
  const a = st({ media: 70, hypeSource: 'hit' }), b = st({ media: 70, hypeSource: 'hit' });
  flopHype(a, 'lead'); flopHype(b, 'supporting');
  ok('the lead carries the bomb; the supporting part is not blamed', hype(a) === 45 && hype(b) === 60);
}
// ── a month out of sight ───────────────────────────────────────────────────────
{
  const s = st({ media: 60, hypeSource: 'hit', scandal: 10 });
  ok('the action is there when there is something to put down', availableActions(s).some((x) => x.id === 'quiet') && canGoQuiet(s));
  ok('and not when there is nothing', !availableActions(st()).some((x) => x.id === 'quiet'));
  runAction(s, 'quiet');
  ok('phone off: hype and the scandal down, out of sight', hype(s) === 30 && s.scandal === 5 && hiding(s));
  ok('and the action is gone while you are', !availableActions(s).some((x) => x.id === 'quiet'));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
