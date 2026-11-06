// Every day on set, played by hand, through the real interface.
//
// There are sixteen days on fourteen mechanics, and autoplay_career.mjs has hands for three of
// the mechanics: the bar, the grid and the quick answer. It leaves the other twelve days to
// "Let the take happen", so nothing had ever pressed a line of the monologue, flagged a boom or
// swapped two shots. test_rules reads the rules of four; test_scenes calls resolveScene with a
// number. Nothing joined them up.
//
// So this walks each of the sixteen the way a player does: the brief, the choice of how to play
// it, Action, the game itself with clicks, the card with the score on it, the button under the
// card, and what that wrote onto the film. Then each mechanic again, played badly.
//
// The expected scores are read off the components (ui/components/SceneGames.jsx, SceneLogic.jsx,
// ScenePuzzles.jsx, TimingBar.jsx, GridRisk.jsx), not off RULES and not off memory. The answers
// to the thinking days come from the real generators, sampled here in node; everything else the
// hands can only know from what is on the screen, as a player can.
//
// Slow on purpose: a monologue takes as long as a monologue. About three minutes.
//   node tests/test_minigames.mjs            all of it
//   node tests/test_minigames.mjs hold,keys  only those mechanics
import './helpers/seeded.mjs';
import { bootGame, sleep } from './helpers/ui.mjs';
import { shoot } from './helpers/shoot.mjs';
import { sets } from '../src/systems/career/production.js';
import { addEvent } from '../src/systems/social/events.js';
import { SCENES, SCENE_IDS, RULES, sceneDay } from '../src/systems/career/scenes.js';
import { chronologyFor, linesFor, motiveFor, assemblyFor, readFor } from '../src/systems/career/scenework.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e !== '' ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const only = (process.argv[2] || '').split(',').filter(Boolean);
const wanted = (game) => !only.length || only.includes(game);
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const FRAME = 1000 / 60;

// ── the answer keys ───────────────────────────────────────────────────────────
// Sampling rather than exporting the tables: this is exactly what the game can deal out.
function keys(s) {
  const p = sets(s)[0];
  const k = { chrono: {}, tone: {}, fits: {}, shots: [], who: {} };
  for (let i = 0; i < 400; i++) {
    const c = chronologyFor(s, p, 1); c.beats.forEach((b) => { k.chrono[b.text] = b.pos > c.reveal; });
    linesFor(s, p, 1).gaps.forEach((g) => g.options.forEach((o) => { k.tone[o.text] = o.tone; }));
    motiveFor(s, p, 1).beats.forEach((b) => b.options.forEach((o) => { k.fits[o.text] = o.fits; }));
    const a = assemblyFor(s, p, 1).shots; if (!k.shots.some((x) => x[0] === a[0])) k.shots.push(a);
    readFor(s, p, 2).pairs.forEach((r) => { k.who[r.line] = r.who; k.who[r.who] = k.who[r.who] || r.who; });
  }
  return k;
}

// ── the screen ────────────────────────────────────────────────────────────────
const BAD_WORDS = /\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b/;
function hands(g) {
  const { D, W } = g;
  const all = () => [...D.querySelectorAll('#root button')];
  const on = () => all().filter((b) => !b.disabled);
  const named = (re) => all().find((b) => re.test(g.label(b)));
  const press = async (b, ms = 25) => { if (!b) return false; g.click(b); await sleep(ms); return true; };
  const until = async (fn, ms = 12000, every = 4) => { const t = Date.now(); while (Date.now() - t < ms) { const v = fn(); if (v) return v; await sleep(every); } return null; };
  const score = () => { const el = [...D.querySelectorAll('#root div')].find((d) => d.children.length === 0 && d.textContent.trim() === 'out of a hundred'); return el ? Number(el.previousElementSibling.textContent) : null; };
  const finished = async () => { const v = await until(() => { const n = score(); return n == null ? null : { n }; }); return v ? v.n : null; };
  return { D, W, all, on, named, press, until, score, finished };
}

// Boots at the brief, chooses how to play it, reads the rules off the screen and presses Action.
async function begin(id, { seed = 11, approach = /^.*Play it as written/, plot = true, over = {}, frameMs = FRAME } = {}) {
  const state = shoot(id, { plot, over });
  const g = await bootGame({ seed, save: state, frameMs });
  const h = hands(g);
  const game = SCENES[id].game;
  const seen = [];
  const look = (where) => { const t = g.text(); if (BAD_WORDS.test(t)) seen.push(`${where}: ${t.match(/.{0,40}(undefined|NaN|\[object Object\]|null).{0,20}/)[0]}`); };
  look('the brief');
  const choice = h.all().find((b) => approach.test(b.textContent.replace(/\s+/g, ' ').trim()));
  await h.press(choice, 40);
  look('before Action');
  const before = g.text();
  await h.press(h.named(/^Action$/), 40);
  look('the game');
  return { g, h, id, game, state, look, seen, before, d: (g.save().scene || {}).difficulty || 1 };
}

// The card, the button under it, and what it wrote down.
async function finish(day, name, { bigger = false } = {}) {
  const { g, h } = day;
  const n = await h.finished();
  day.look('the card');
  const before = day.state.productions ? sets(day.state)[0] : null;
  const label = n >= 70 ? /^That is the day$/ : /^Move on$/;
  const pressed = n == null ? false : await h.press(h.named(label), 40);
  const s = g.save();
  const p = s && (s.productions || [])[0];
  const log = p && (p._sceneLog || [])[(p._sceneLog || []).length - 1];
  ok(`${name}: the card says a score and its button closes the day`, n != null && pressed && s.scene == null, `score ${n}, scene ${s && s.scene ? 'still up' : 'gone'}`);
  ok(`${name}: the film has the same number on it`, !!log && log.q === n, `card ${n}, log ${log && log.q}`);
  if (before && p && n != null) {
    const moved = (p.meter || 0) - (before.meter || 0);
    ok(`${name}: the shoot moved the right way`, n >= 45 ? moved > 0 : moved < 0, `score ${n}, meter ${before.meter} -> ${p.meter}`);
  }
  if (!bigger && n >= 88) ok(`${name}: a day like that left a moment`, (p.moments || []).length === 1 && !BAD_WORDS.test(p.moments[0]), JSON.stringify(p.moments));
  ok(`${name}: nothing threw`, g.errors.length === 0, g.errors[0] || '');
  ok(`${name}: no word on any screen is a broken value`, day.seen.length === 0, day.seen[0] || '');
  g.close();
  return { n, p, s };
}

// Runs a game to its card without the checks on the film: a rule, not a whole day.
async function scoreOf(day) { const n = await day.h.finished(); day.g.close(); return n; }

// ── the hands: one for each mechanic ──────────────────────────────────────────
const BAR = /95,\s*206,\s*138,\s*0?\.4\)/;
function bar(h) {
  const zone = [...h.D.querySelectorAll('div')].find((d) => BAR.test(d.style.background));
  if (!zone) return null;
  const mark = zone.parentElement.children[1];
  const at = () => parseFloat(((mark.style.left || '').match(/calc\(([\d.]+)%/) || [])[1]);
  return { el: zone.parentElement, left: parseFloat(zone.style.left), width: parseFloat(zone.style.width), at };
}
async function stopBar(day, want) {
  const b = await day.h.until(() => bar(day.h));
  const hit = await day.h.until(() => { const pos = b.at(); return want(pos, b) ? { pos } : null; }, 8000, 1);
  day.g.click(b.el);
  const c = b.left + b.width / 2;
  return { quality: hit ? clamp(Math.round(100 - (Math.abs(hit.pos - c) / (b.width / 2 + 6)) * 100)) : null };
}

const tiles = (h) => h.on().filter((b) => b.textContent.trim() === '?');
const stopHere = (h) => h.named(/^Stop here$/);

const say = (h) => h.named(/^Say it$/);
async function monologue(day, pressLine) {
  const { h, g } = day;
  let was = null, seen = 0;
  const textOf = () => say(h).parentElement.children[0].textContent.trim();
  while (h.score() == null && say(h)) {
    const t = textOf();
    if (t !== was && t !== 'and… action') { was = t; seen += 1; if (pressLine(seen)) g.click(say(h)); }
    await sleep(3);
  }
  return seen;
}

const markOf = (h) => [...h.D.querySelectorAll('div')].find((d) => d.style.width === '18px' && /calc/.test(d.style.bottom));
const posOf = (m) => parseFloat(((m.style.bottom || '').match(/calc\(([\d.]+)%/) || [])[1]);
async function holdIt(day, policy) {
  const { h, g } = day;
  const btn = await h.until(() => h.named(/^Hold$/));
  const m = await h.until(() => markOf(h));
  let down = false;
  const set = (v) => { if (v === down) return; down = v; btn.dispatchEvent(new g.W.MouseEvent(v ? 'pointerdown' : 'pointerup', { bubbles: true, cancelable: true })); };
  while (h.score() == null && h.named(/^Hold$/)) { set(policy(posOf(m), down)); await sleep(4); }
}
const steer = (pos, down) => (down ? pos < 62 : pos < 56);

const SYMBOLS = ['↑', '↓', '←', '→', '●', '✶'];
async function watchSequence(day) {
  const { h } = day;
  const pad = await h.until(() => h.all().find((b) => b.textContent.trim() === '↑'));
  const row = pad.parentElement.parentElement.children[0];
  const seq = [];
  await h.until(() => {
    [...row.children].forEach((c, k) => { const t = c.textContent.trim(); if (t && t !== '?') seq[k] = t; });
    return !pad.disabled;
  }, 9000, 8);
  return { seq, row, tap: (t) => h.press(h.all().find((b) => b.textContent.trim() === t), 10) };
}

const body = (b) => b.textContent.replace(/\s+/g, ' ').trim();

function solveFrame(h) {
  const cells = h.all().slice(0, 16);
  const hidden = [], shown = [];
  cells.forEach((c, i) => { const t = c.textContent.trim(); if (t === '?') hidden.push(i); else shown.push([i, Number(t)]); });
  const around = (a, b) => { const dr = Math.abs(Math.floor(a / 4) - Math.floor(b / 4)), dc = Math.abs(a % 4 - b % 4); return (dr || dc) && dr <= 1 && dc <= 1; };
  const out = [];
  for (let m = 0; m < (1 << hidden.length); m++) {
    const flagged = hidden.filter((_, k) => m & (1 << k));
    if (shown.every(([i, n]) => flagged.filter((f) => around(i, f)).length === n)) out.push(flagged);
  }
  return { cells, hidden, solutions: out };
}

function nonoGrid(h) {
  const cells = h.all().slice(0, 25);
  const grid = cells[0].parentElement;
  const kids = [...grid.children];
  const cols = kids.slice(1, 6).map((c) => c.textContent.trim());
  const rws = [0, 1, 2, 3, 4].map((r) => kids[6 + r * 6].textContent.trim());
  return { cells, cols, rows: rws };
}
const runsOf = (a) => { const o = []; let n = 0; for (const v of a) { if (v) n++; else if (n) { o.push(n); n = 0; } } if (n) o.push(n); return (o.length ? o : [0]).join(' '); };
function solveNono(rowClues, colClues, want = 2) {
  const lineChoices = rowClues.map((clue) => { const out = []; for (let m = 0; m < 32; m++) { const a = [0, 1, 2, 3, 4].map((k) => (m >> k) & 1); if (runsOf(a) === clue) out.push(a); } return out; });
  const found = [];
  const walk = (r, acc) => {
    if (found.length >= want) return;
    if (r === 5) { if ([0, 1, 2, 3, 4].every((c) => runsOf(acc.map((x) => x[c])) === colClues[c])) found.push(acc.flat()); return; }
    for (const a of lineChoices[r]) walk(r + 1, [...acc, a]);
  };
  walk(0, []);
  return found;
}

// What each mechanic does when it is played well. Returns what the card should say, or a check
// on it: every number here is the arithmetic in the component.
const GOOD = {
  async timing(day) {
    const { quality } = await stopBar(day, (pos, b) => Math.abs(pos - (b.left + b.width / 2)) < b.width * 0.25);
    return (n) => [n >= 70 && Math.abs(n - quality) <= 3, `dead centre gave ${n}, the position said ${quality}`];
  },
  async grid(day) {
    const { h } = day;
    await h.press(tiles(h)[0], 15); await h.press(tiles(h)[0], 15);
    const stop = stopHere(h);
    const goal = 12 - Number((h.D.querySelector('#root').textContent.match(/(\d+) of 12 go wrong/) || [])[1]);
    const taken = 12 - tiles(h).length;
    if (h.score() == null && stop) await h.press(stop, 15);
    return (n) => [n === 0 || n === Math.round((taken / goal) * 100), `${taken} of ${goal} clean takes gave ${n}`];
  },
  async rhythm(day) {
    await monologue(day, () => true);
    return (n) => [n >= 85, `every line pressed as it landed gave ${n}`];
  },
  async hold(day) {
    await holdIt(day, steer);
    return (n) => [n >= 70, `kept in the band gave ${n}`];
  },
  async keys(day) {
    const { seq, tap } = await watchSequence(day);
    for (const t of seq) await tap(t);
    return (n) => [n >= 90, `the whole sequence, quickly, gave ${n}`];
  },
  async quick(day) {
    const { h } = day;
    const opt = await h.until(() => h.named(/^Stay in it/));
    await h.press(opt, 10);
    return (n) => [n >= 82 && n <= 94, `the strongest answer, at once, gave ${n}`];
  },
  async chrono(day) {
    const { h } = day;
    const beats = h.all().slice(0, -1);
    for (const b of beats) if (day.key.chrono[body(b).replace(/^✓/, '')]) await h.press(b, 8);
    await h.press(h.named(/^That is the order$/), 10);
    return (n) => [n === 100, `all six right gave ${n}`];
  },
  async lines(day) {
    const { h } = day;
    for (const b of h.all()) if (day.key.tone[body(b)] === 'cold') await h.press(b, 8);
    await h.press(h.named(/^Play it that way$/), 10);
    return (n) => [n === Math.round(clamp(100 - (day.d - 1) * 8)), `one reading held gave ${n} at difficulty ${day.d}`];
  },
  async motive(day) {
    const { h } = day;
    const first = h.all()[0];
    await h.press(first, 20);
    const mine = motiveId(first);
    for (const b of h.all().slice(4)) if (day.key.fits[body(b)] === mine) await h.press(b, 8);
    await h.press(h.named(/^That is who she is$/), 10);
    return (n) => [n === Math.round(clamp(100 - (day.d - 1) * 10)), `the motive held gave ${n} at difficulty ${day.d}`];
  },
  async frame(day) {
    const { h } = day;
    const { cells, solutions } = solveFrame(h);
    day.ambiguous = solutions.length !== 1;
    for (const i of solutions[0] || []) await h.press(cells[i], 6);
    await h.press(h.named(/^That is the list$/), 10);
    return (n) => [day.ambiguous ? n > 0 : n === 100, `the numbers allow ${solutions.length} answer(s) and the card said ${n}`];
  },
  async light(day) {
    const { h } = day;
    const tries = Number((h.D.querySelector('#root').textContent.match(/(\d+) more before/) || [])[1]);
    const wantTries = Math.max(2, 4 - Math.round((day.d - 1) * 1.2));
    ok(`${day.id}: ${wantTries} goes at difficulty ${day.d}, and the screen says so`, tries === wantTries, `screen says ${tries}`);
    const cheb = (a, b) => Math.max(Math.abs(Math.floor(a / 5) - Math.floor(b / 5)), Math.abs(a % 5 - b % 5));
    let cand = Array.from({ length: 25 }, (_, i) => i); const asked = []; let foundAt = 0;
    const WORD = { warm: 1, cool: 2 };
    while (h.score() == null) {
      const cells = h.all();
      if (cells.length < 25 || cells.every((c) => c.disabled)) break;
      // Stand where the answer would split what is left best: the honest way to play it.
      const open = cand.filter((i) => !asked.includes(i));
      const pickFrom = open.length ? open : Array.from({ length: 25 }, (_, i) => i).filter((i) => !asked.includes(i));
      const spot = pickFrom.reduce((best, i) => { const groups = {}; cand.forEach((c) => { const d = Math.min(cheb(i, c), 3); groups[d] = (groups[d] || 0) + 1; }); const worst = Math.max(...Object.values(groups)); return worst < best[0] ? [worst, i] : best; }, [99, pickFrom[0]])[1];
      asked.push(spot);
      await h.press(cells[spot], 12);
      const t = h.all()[spot].textContent.trim();
      if (t === '☀') { foundAt = asked.length; break; }
      if (t === '') break;
      day.best = Math.min(day.best ?? 9, WORD[t] || 3);
      cand = cand.filter((c) => (WORD[t] ? cheb(spot, c) === WORD[t] : cheb(spot, c) >= 3));
    }
    return (n) => {
      if (foundAt) return [n === clamp(100 - (foundAt - 1) * 14), `found on go ${foundAt} gave ${n}`];
      const exp = Math.round(clamp(52 - (day.best ?? 3) * 14 - (day.d - 1) * 6));
      return [Math.abs(n - exp) <= (day.best === 3 ? 14 : 0), `not found, closest ${day.best}, gave ${n}, the arithmetic ${exp}`];
    };
  },
  async cut(day) {
    const { h } = day;
    const texts = () => h.all().slice(0, 6).map((b) => body(b).replace(/^\d/, ''));
    const list = day.key.shots.find((l) => texts().every((t) => l.includes(t)));
    let u = 0;
    for (let i = 0; i < 6 && h.score() == null; i++) {
      const now = texts();
      if (now[i] === list[i]) continue;
      const j = now.indexOf(list[i]);
      await h.press(h.all()[i], 8); await h.press(h.all()[j], 8); u++;
    }
    const lock = h.named(/^Lock the cut$/);
    if (lock && !lock.disabled) await h.press(lock, 8);
    return (n) => [n === clamp(100 - Math.max(0, u - 2) * 6), `the right order in ${u} swap(s) gave ${n}`];
  },
  async pairs(day) {
    const { h } = day;
    const cells = () => h.all();
    const n = cells().length;
    const known = {}, gone = new Set();
    const match = (x, y) => x !== y && (day.key.who[x] === y || day.key.who[y] === x);
    const flip = async (i) => { await h.press(cells()[i], 15); known[i] = body(cells()[i]); return known[i]; };
    const unknown = () => [...Array(n).keys()].filter((i) => known[i] == null && !gone.has(i));
    const partner = (i) => Object.keys(known).map(Number).find((k) => k !== i && !gone.has(k) && match(known[i], known[k]));
    const wrongs = () => Number((h.D.querySelector('#root').textContent.match(/(\d+) wrong so far/) || [])[1] ?? 0);
    let missed = 0, guard = 0;
    while (h.score() == null && gone.size < n && guard++ < 40) {
      missed = wrongs();
      // A pair it has already seen, then a new card and its partner if it knows it, then a guess.
      const seen = Object.keys(known).map(Number).find((i) => !gone.has(i) && partner(i) != null);
      if (seen != null) { const p = partner(seen); await flip(seen); await flip(p); gone.add(seen); gone.add(p); continue; }
      const [x, y] = unknown();
      if (x == null) break;
      await flip(x);
      const p = partner(x);
      if (p != null) { await flip(p); gone.add(x); gone.add(p); continue; }
      if (y == null) break;
      await flip(y);
      if (match(known[x], known[y])) { gone.add(x); gone.add(y); continue; }
      await sleep(760);
    }
    return (m) => [m === Math.round(clamp(100 - missed * 13 - (day.d - 1) * 8)), `${missed} wrong gave ${m} at difficulty ${day.d}`];
  },
  async nono(day) {
    const { h } = day;
    const { cells, rows: r, cols: c } = nonoGrid(h);
    const answer = solveNono(r, c)[0];
    for (let i = 0; i < 25; i++) if (answer[i]) await h.press(cells[i], 4);
    await h.press(h.named(/^That is the sheet$/), 10);
    return (n) => [n === 100, `an answer that fits every number gave ${n}`];
  },
};
function motiveId(btn) {
  const t = body(btn);
  return /loves/.test(t) ? 'love' : /frightened/.test(t) ? 'fear' : /asked/.test(t) ? 'pride' : 'duty';
}

// ── 1. every day, start to finish ─────────────────────────────────────────────
ok('sixteen days and fourteen mechanics, as the rules and this file believe', SCENE_IDS.length === 16 && new Set(SCENE_IDS.map((i) => SCENES[i].game)).size === 14);
const ids = SCENE_IDS.filter((id) => wanted(SCENES[id].game));
let ambiguousBoards = 0;
const played = [];
for (const id of ids) {
  const game = SCENES[id].game;
  const name = `${id} (${game})`;
  const day = await begin(id);
  day.key = keys(day.state);
  ok(`${name}: the rules of the game are on the screen before Action`, RULES[game].every((l) => day.before.includes(l)), RULES[game].find((l) => !day.before.includes(l)) || '');
  ok(`${name}: and Action starts it`, !/^.*How it is played/.test(day.g.text()), day.g.text().slice(0, 80));
  const check = await GOOD[game](day);
  const ambiguous = day.ambiguous;
  const { n } = await finish(day, name);
  if (ambiguous) ambiguousBoards += 1;
  played.push(`${id} ${n}`);
  if (check) { const [c, why] = check(n); ok(`${name}: played well, it scores what the game says it should`, c, why); }
}

// ── 2. the same mechanics, played badly, and what each rule says about that ───
if (wanted('timing')) {
  const day = await begin('mark', { approach: /Make it bigger/ });
  ok('mark: going bigger makes the day harder before it starts', day.d > sceneDay(day.state, sets(day.state)[0], 'mark').difficulty, `difficulty ${day.d}`);
  await stopBar(day, (pos, b) => Math.abs(pos - (b.left + b.width / 2)) > b.width / 2 + 12);
  const r = await finish(day, 'mark, way off the green', { bigger: true });
  ok('mark: way off the green is nothing', r.n <= 10, String(r.n));
}
if (wanted('grid')) {
  const day = await begin('takes');
  ok('takes: Stop is refused until there is something to keep', stopHere(day.h).disabled);
  await day.h.press(tiles(day.h)[0], 10);
  ok('takes: the first tile is safe', day.h.score() == null && !/✕/.test(day.g.text()));
  let guard = 0;
  while (day.h.score() == null && tiles(day.h).length && guard++ < 12) await day.h.press(tiles(day.h)[0], 5);
  const n = await day.h.finished();
  ok('takes: push until it goes wrong and it is a zero, clear the board and it is a hundred', n === 0 || n === 100, String(n));
  await finish(day, 'takes, pushed all the way');
}
if (wanted('rhythm')) {
  const silent = await begin('monologue');
  await monologue(silent, () => false);
  const a = await finish(silent, 'monologue, never pressed');
  ok('monologue: "a line you never press is a line you dropped"', a.n === 0, String(a.n));
  const half = await begin('monologue');
  await monologue(half, (k) => k % 2 === 0);
  const b = await scoreOf(half);
  ok('monologue: half the lines is half the take', b >= 40 && b <= 50, String(b));
  // A thumb going as fast as it goes, without reading a word of it.
  const mash = await begin('monologue');
  while (mash.h.score() == null && say(mash.h)) { mash.g.click(say(mash.h)); await sleep(110); }
  const m = await scoreOf(mash);
  console.log(`      a thumb hammering the monologue scores ${m}`);
  ok('monologue: hammering the button without reading is not the best take of your life', m < 45, String(m));
  const slip = await begin('monologue');
  await monologue(slip, (k) => { if (k === 3) slip.g.click(say(slip.h)); return true; });
  const sl = await scoreOf(slip);
  ok('monologue: one slip of the thumb costs a little and not the take', sl >= 75, String(sl));
}
if (wanted('hold')) {
  const off = await begin('tears');
  await holdIt(off, () => false);
  ok('tears: never holding it never reaches the band', (await scoreOf(off)) === 0);
  const top = await begin('tears');
  await holdIt(top, () => true);
  const n = await scoreOf(top);
  ok('tears: holding it down the whole way goes straight through the band and out', n > 0 && n < 45, String(n));
  // The same thumb on a phone at 60Hz, a phone at 120Hz, a monitor at 144Hz and a slow laptop.
  const byScreen = {};
  for (const hz of [30, 60, 120, 144]) { const d = await begin('tears', { frameMs: 1000 / hz }); await holdIt(d, steer); byScreen[hz] = await scoreOf(d); }
  const vals = Object.values(byScreen);
  console.log(`      the same hands by refresh rate: ${JSON.stringify(byScreen)}`);
  ok('tears: the same hands score the same on any screen', Math.max(...vals) - Math.min(...vals) <= 12, JSON.stringify(byScreen));
}
if (wanted('keys')) {
  const wrong = await begin('stunt');
  ok('stunt: nothing can be pressed while it is being shown', wrong.h.all().filter((b) => SYMBOLS.includes(b.textContent.trim())).every((b) => b.disabled));
  const w = await watchSequence(wrong);
  const miss = SYMBOLS.find((x) => x !== w.seq[0]);
  await w.tap(miss);
  const r = await finish(wrong, 'stunt, wrong on the first move');
  ok('stunt: one wrong move ends the take', r.n === 0, String(r.n));
  ok('stunt: and you land badly, which costs health and days', r.s.health < 80 && (r.p.lostDays || 0) > 0 && (r.s.timeline || []).some((x) => /landed badly/.test(x.text)), `health ${r.s.health}, lost ${r.p.lostDays}`);
  const late = await begin('oner');
  const l = await watchSequence(late);
  await l.tap(l.seq[0]); await l.tap(l.seq[1]);
  const t = await scoreOf(late);
  ok('oner: stop halfway and the clock ends it, for what you got through', t === Math.round((2 / l.seq.length) * 70), `${t} after 2 of ${l.seq.length}`);
}
if (wanted('quick')) {
  const worst = await begin('improv');
  await worst.h.press(await worst.h.until(() => worst.h.named(/^Wait for the director/)), 10);
  const a = await scoreOf(worst);
  ok('improv: the weakest answer still beats silence', a >= 24 && a <= 36, String(a));
  const none = await begin('improv');
  const b = await scoreOf(none);
  ok('improv: "letting the clock run out is worse than any of them"', b === 8, String(b));
}
if (wanted('chrono')) {
  const day = await begin('order');
  day.key = keys(day.state);
  const beats = day.h.all().slice(0, -1);
  ok('order: six scenes, as the rules say', beats.length === 6, String(beats.length));
  ok('order: three before she knows and three after', beats.filter((b) => day.key.chrono[body(b)]).length === 3, beats.map((b) => body(b)).join(' / '));
  ok('order: the screen says which person it is asking about', /Tick every scene/.test(day.g.text()));
  await day.h.press(day.h.named(/^That is the order$/), 10);
  const n = await scoreOf(day);
  ok('order: ticking nothing gets half of them right and pays for it', n === Math.round(clamp(50 - 18 - (day.d - 1) * 6)), `${n} at difficulty ${day.d}`);
  // A film with no story — an old save, a sequel — deals from the other table.
  const old = await begin('order', { plot: false });
  old.key = keys(old.state);
  const check = await GOOD.chrono(old);
  const r = await finish(old, 'order on a film with no story');
  const [c, why] = check(r.n); ok('order: on a film with no story the answers are still answers', c, why);
}
if (wanted('lines')) {
  const day = await begin('reading');
  const key = keys(day.state);
  const go = day.h.named(/^Three lines$/);
  ok('reading: the button says what it is waiting for and refuses until then', !!go && go.disabled);
  const rowsOf = day.h.all().slice(0, 6);
  const tones = ['cold', 'warm', 'cold'];
  for (let i = 0; i < 3; i++) await day.h.press(rowsOf.slice(i * 2, i * 2 + 2).find((b) => key.tone[body(b)] === tones[i]), 8);
  await day.h.press(day.h.named(/^Play it that way$/), 10);
  const n = await scoreOf(day);
  const exp = Math.round(clamp(clamp((2 / 3) * 100 - 14) - (day.d - 1) * 8));
  ok('reading: changing your mind on the turn costs more than drifting', n === exp, `${n}, the arithmetic ${exp}`);
}
if (wanted('motive')) {
  const day = await begin('why');
  const key = keys(day.state);
  const first = day.h.all()[0];
  ok('why: four motives and nothing else until you have answered', day.h.all().length === 4, String(day.h.all().length));
  await day.h.press(first, 20);
  const mine = motiveId(first);
  ok('why: the answer cannot be changed afterwards', day.h.all().slice(0, 4).every((b) => b.disabled));
  const beats = day.h.all().slice(4, -1);
  ok('why: "then the day asks you twice more", four ways each', beats.length === 8, String(beats.length));
  for (let i = 0; i < 2; i++) await day.h.press(beats.slice(i * 4, i * 4 + 4).find((b) => key.fits[body(b)] !== mine), 8);
  await day.h.press(day.h.named(/^That is who she is$/), 10);
  ok('why: both beats played by somebody else is nothing', (await scoreOf(day)) === 0);
}
if (wanted('frame')) {
  const day = await begin('boom');
  const { cells, hidden } = solveFrame(day.h);
  ok('boom: a cleared setup cannot be flagged', cells.filter((_, i) => !hidden.includes(i)).every((c) => c.disabled));
  await day.h.press(cells[hidden[0]], 10);
  ok('boom: a ? can be flagged', day.h.all()[hidden[0]].textContent.trim() === '⚑');
  await day.h.press(day.h.all()[hidden[0]], 10);
  ok('boom: and unflagged', day.h.all()[hidden[0]].textContent.trim() === '?');
  await day.h.press(day.h.named(/^That is the list$/), 10);
  const n = await scoreOf(day);
  ok('boom: flagging nothing misses every one of them', n > 0 && n <= 60, String(n));
}
if (wanted('cut')) {
  const day = await begin('assembly');
  const swapsAt = () => Number((day.h.D.querySelector('#root').textContent.match(/(\d+) swaps? before/) || [])[1] ?? -1);
  const budget = swapsAt();
  ok('assembly: the screen says how many swaps are left', budget >= 2, String(budget));
  for (let k = 0; k < budget && day.h.score() == null; k++) { await day.h.press(day.h.all()[0], 6); await day.h.press(day.h.all()[1], 6); if (k === 0) ok('assembly: a swap uses one', swapsAt() === budget - 1, String(swapsAt())); }
  const n = await scoreOf(day);
  ok('assembly: run out of swaps and the cut locks itself', n != null, String(n));
}
if (wanted('pairs')) {
  const day = await begin('read');
  const { h } = day;
  ok('read: every line and everybody, face down', h.all().length % 2 === 0 && h.all().length >= 6 && h.all().every((b) => body(b) === '·'), String(h.all().length));
  const key = keys(day.state);
  const wrongsNow = () => Number((h.D.querySelector('#root').textContent.match(/(\d+) wrong so far/) || [])[1]);
  // Find a pair that does not match and tap a third card while it is still up.
  await h.press(h.all()[0], 10);
  const a = body(h.all()[0]);
  let b = 1;
  for (; b < h.all().length; b++) { await h.press(h.all()[b], 10); const t = body(h.all()[b]); if (key.who[a] !== t && key.who[t] !== a) break; await h.press(h.all()[(b + 1) % h.all().length], 10); break; }
  const was = wrongsNow();
  const third = h.all().findIndex((c) => body(c) === '·');
  await h.press(h.all()[third], 10);
  ok('read: a card tapped while the last two are still showing is not another mistake', wrongsNow() === was, `${was} -> ${wrongsNow()}`);
  day.g.close();
}
if (wanted('nono')) {
  const day = await begin('sheet');
  const { rows: r, cols: c } = nonoGrid(day.h);
  ok('sheet: ten clues, five rows and five columns, and every one is a run', [...r, ...c].length === 10 && [...r, ...c].every((x) => /^\d( \d)*$/.test(x)), [...r, ...c].join('|'));
  await day.h.press(day.h.named(/^That is the sheet$/), 10);
  const n = await scoreOf(day);
  ok('sheet: an empty sheet is not a hundred', n < 100, String(n));
  // "Any answer that fits every number counts": find a sheet with two answers and play both.
  let tried = 0, both = false;
  for (let seed = 21; seed < 60 && !both && tried < 25; seed++) {
    tried++;
    const probe = await begin('sheet', { seed });
    const q = nonoGrid(probe.h);
    const answers = solveNono(q.rows, q.cols);
    if (answers.length < 2) { probe.g.close(); continue; }
    both = true;
    const scores = [];
    for (let which = 0; which < 2; which++) {
      const run = which === 0 ? probe : await begin('sheet', { seed });
      const cells = nonoGrid(run.h).cells;
      for (let i = 0; i < 25; i++) if (answers[which][i]) await run.h.press(cells[i], 3);
      await run.h.press(run.h.named(/^That is the sheet$/), 10);
      const borders = new Set(nonoGrid(run.h).cells.filter((b, i) => !answers[which][i]).map((b) => b.style.borderColor));
      ok(`sheet: answer ${which + 1} of 2 is not drawn with squares marked wrong`, borders.size === 1, [...borders].join(' / '));
      scores.push(await scoreOf(run));
    }
    ok('sheet: two different answers that both fit are both a hundred', scores[0] === 100 && scores[1] === 100, scores.join(', '));
  }
  if (!both) console.log('      (no sheet with two answers in the seeds tried)');
}

// ── and the one that is not a day on set: the back stairs ─────────────────────
// Six doors light up and you go through them in order. The third door of sneaking into a party,
// reached only after a good walk past security and two right answers, so nothing plays it either.
if (wanted('stairs')) {
  const toStairs = async (seed) => {
    // Fame 30: at 50 a premiere has you on the list already, and nobody sneaks in to that.
    const s = shoot(null); s.fame = 30; addEvent(s, 'premiere', { door: { stage: 2, quiz: [], asked: 0, right: 0 } });
    const g = await bootGame({ seed, save: s, frameMs: FRAME });
    const h = hands(g);
    await h.press(h.all().find((b) => /Career/.test(g.label(b))), 40);
    await h.press(h.named(/^Events$/), 40);
    const doors = () => h.all().filter((b) => b.style.height === '54px');
    const seq = [];
    await h.until(() => {
      const lit = doors().findIndex((d) => /gradient/.test(d.style.background));
      if (lit >= 0 && seq[seq.length - 1] !== lit) seq.push(lit);
      return doors().length === 6 && !doors()[0].disabled;
    }, 8000, 6);
    return { g, h, doors, seq };
  };
  const good = await toStairs(31);
  ok('stairs: five doors light up, none twice running', good.seq.length === 5 && good.seq.every((d, i) => d !== good.seq[i - 1]), good.seq.join(','));
  for (const d of good.seq) await good.h.press(good.doors()[d], 30);
  const ev = (good.g.save().events || [])[0] || {};
  ok('stairs: through them in order and you are on the list', ev.invited === true && !ev.door, JSON.stringify({ invited: ev.invited, door: ev.door }));
  ok('stairs: nothing threw', good.g.errors.length === 0, good.g.errors[0] || '');
  good.g.close();
  const bad = await toStairs(32);
  await bad.h.press(bad.doors()[(bad.seq[0] + 1) % 6], 30);
  const out = (bad.g.save().events || [])[0] || {};
  ok('stairs: one wrong door and you are outside, and the door remembers', !out.invited && !out.door && out.doorTried === true, JSON.stringify({ invited: out.invited, door: out.door, tried: out.doorTried }));
  bad.g.close();
}

// ── what the good hands scored, so a run can be read ──────────────────────────
console.log(`
      played well: ${played.join(', ')}`);
if (ambiguousBoards) console.log(`      ${ambiguousBoards} frame board(s) above had more than one answer: known, ROADMAP Step 3.`);

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
