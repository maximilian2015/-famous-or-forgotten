// Burnout Core (ROADMAP Step 1b, life/burnout.js): the rules, each held to what the handler does.
// The balance — three strategies over twenty years and Alex Moon's save — is tests/probes/probe_burnout.mjs.
import assert from 'node:assert/strict';
import { career, withSeed, roundTrip } from './helpers/contracts.mjs';
import { startProduction } from '../src/systems/career/production.js';
import { strainTick, canWork, insurability } from '../src/systems/life/strain.js';
import { decide, holdFor, medicalPause, forcedStop, askOdds, askProduction, asksFor, forecast, loadOf,
  signLater, signLaterOdds, takeBreak, canTakeBreak, forcedStopOdds, resolveHealth, healthBeat, recoveryDrag } from '../src/systems/life/burnout.js';
import { acceptOffer } from '../src/systems/career/offers.js';
import { draftContract } from '../src/systems/career/contract.js';
import { goAway, stepAway } from '../src/engine/time.js';

let failed = 0;
function test(name, fn) {
  try { withSeed(11, fn); console.log('ok    ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + ' :: ' + e.message); }
}
const always = (fn) => { const r = Math.random; Math.random = () => 0; try { return fn(); } finally { Math.random = r; } };
const never = (fn) => { const r = Math.random; Math.random = () => 0.9999; try { return fn(); } finally { Math.random = r; } };
const film = (o = {}) => ({ id: 'o' + Math.random().toString(36).slice(2, 7), projectTitle: 'The Long Night', role: 'Lead', tier: 'lead',
  type: 'Feature Film', genre: 'Drama', salary: 5e6, months: 8, scale: 'feature', prestigeScore: 70, stability: 90, ...o });
function onSet(s, o) { startProduction(s, film(o)); const p = s.productions[s.productions.length - 1]; p.prepLeft = 0; return p; }
const now = (s) => s.year * 12 + s.month;

// ── the studio decides, by what the production is ─────────────────────────────
test('a lead with most of it shot, and a name: they wait', () => {
  const s = career({ fame: 80, filmography: [] }); const p = onSet(s, {}); p.monthsLeft = 2;
  assert.equal(decide(s, p, 3).how, 'wait');
});
test('the same lead in month one of a blockbuster, away for six months: recast', () => {
  const s = career({ fame: 40, filmography: [] }); const p = onSet(s, { scale: 'blockbuster' }); p.monthsLeft = 8;
  assert.equal(never(() => decide(s, p, 6)).how, 'recast');
});
test('nobody waits for ever, not even for an icon', () => {
  const s = career({ fame: 100, filmography: [] }); const p = onSet(s, { part: 3, optioned: true }); p.monthsLeft = 1;
  assert.ok(holdFor(s, p) <= 9, String(holdFor(s, p)));
  assert.notEqual(decide(s, p, 12).how, 'wait');
});
test('a supporting part half shot is finished without your last scenes', () => {
  const s = career({ fame: 40, filmography: [] }); const p = onSet(s, { tier: 'supporting', role: 'Supporting' }); p.monthsLeft = 4;
  assert.equal(decide(s, p, 6).how, 'cut');
});
test('a series goes on without you: written out, not frozen', () => {
  const s = career({ fame: 40, filmography: [] }); const p = onSet(s, { type: 'Drama Series', scale: 'recurring', episodes: 10, months: 5 }); p.monthsLeft = 3;
  assert.equal(decide(s, p, 8).how, 'writtenOut');
});
test('a stop never touches Standing, and never puts anything in the freezer', () => {
  const s = career({ fame: 40, respect: 33, filmography: [] }); onSet(s, { scale: 'blockbuster' }); s.productions[0].monthsLeft = 8;
  forcedStop(s);
  assert.equal(s.respect, 33);
  assert.equal((s.frozen || []).length, 0);
  assert.ok(s.bigMoment && /recast|wait|around|without/.test(s.bigMoment.body), s.bigMoment && s.bigMoment.body);
});
test('a recast sequel is written down as lost to health, with its story', () => {
  const s = career({ fame: 30, filmography: [] }); const p = onSet(s, { part: 2, projectTitle: 'Red Line II', scale: 'blockbuster', plot: { shape: 'x', hero: 'h' } });
  p.monthsLeft = 8;
  never(() => forcedStop(s));
  assert.ok(!(s.productions || []).some((x) => x.title === 'Red Line II'), 'still on set');
  assert.ok((s.lostToHealth || []).some((x) => x.title === 'Red Line II'));
});
test('a part they hold starts again when you are cleared, with the same story', () => {
  const s = career({ fame: 85, filmography: [] }); const p = onSet(s, { plot: { shape: 'a', hero: 'b' } }); p.monthsLeft = 2;
  medicalPause(s, 2);
  assert.ok(p.heldUntil > now(s));
  for (let m = 0; m < 3; m++) { s.month++; strainTick(s); }
  assert.ok(!(p.heldUntil > now(s)), 'still held');
  assert.deepEqual(p.plot, { shape: 'a', hero: 'b' });
});

// ── asking the production ─────────────────────────────────────────────────────
test('asks only appear when you are tired, and say their odds', () => {
  const s = career({ strain: 30, filmography: [] }); const p = onSet(s, {});
  assert.equal(asksFor(s, p).length, 0);
  s.strain = 85;
  const a = asksFor(s, p);
  assert.ok(a.length >= 3 && a.every((x) => x.odds >= 5 && x.odds <= 95));
});
test('a second postponement is much harder than the first', () => {
  const s = career({ strain: 90, filmography: [] }); const p = onSet(s, {});
  const first = askOdds(s, p, 'postpone'); p._postponed = 1; p._asks = 1;
  assert.ok(askOdds(s, p, 'postpone') < first - 20);
});
test('a yes moves the dates and gives up the schedule bonus; a no costs the director a little', () => {
  const s = career({ strain: 90, filmography: [] }); const p = onSet(s, {}); p.crew = [{ name: 'Ada Wren', bond: 50, trait: 'chill' }];
  always(() => askProduction(s, p.id, 'postpone'));
  assert.ok(p.heldUntil > now(s) && p.lostBonus);
  const q = onSet(s, { projectTitle: 'Second' }); q.crew = [{ name: 'Bo Hale', bond: 50, trait: 'perfectionist' }];
  never(() => askProduction(s, q.id, 'lighter'));
  assert.ok(q.crew[0].bond < 50 && !q.light);
  assert.equal(askProduction(s, q.id, 'lighter').ok, false, 'asked twice in a month');
});

// ── the doctor ────────────────────────────────────────────────────────────────
test('three months at the top on a set brings the doctor, with the odds on the screen', () => {
  const s = career({ strain: 100, _redMonths: 12, _topMonths: 2, filmography: [] }); onSet(s, {});
  s.pendingArc = null; strainTick(s);
  assert.equal(s.pendingArc && s.pendingArc.health, 'doctor');
  const b = healthBeat(s, s.pendingArc);
  assert.ok(b.choices.some((c) => /medical pause/i.test(c.label)) && b.choices.some((c) => /Carry on/.test(c.label)));
});
test('carrying on after the doctor nearly doubles the odds for a year', () => {
  const s = career({ strain: 100, _redMonths: 12, _topMonths: 4, filmography: [] }); onSet(s, {});
  const before = forcedStopOdds(s);
  s.pendingArc = { health: 'doctor', speaker: 'The doctor' };
  const i = healthBeat(s, s.pendingArc).choices.findIndex((c) => /Carry on/.test(c.label));
  resolveHealth(s, s.pendingArc, i);
  assert.ok(forcedStopOdds(s) > before * 1.5, `${before} → ${forcedStopOdds(s)}`);
});
test('nothing stops you while you are not working', () => {
  const s = career({ strain: 100, _redMonths: 40, _topMonths: 10, filmography: [] });
  assert.equal(forcedStopOdds(s), 0);
});

// ── off work: signing what starts after ───────────────────────────────────────
test('signed off, you can still sign a shoot to start when you are back', () => {
  const s = career({ filmography: [] }); medicalPause(s, 2);
  const o = film(); s.offers = [o];
  assert.equal(signLaterOdds(s, o), 100);
  acceptOffer(s, o.id);
  assert.ok(o.signed && o.startAt === now(s) + 2, s.lastEvent);
  assert.ok(!(s.productions || []).some((p) => p.title === 'The Long Night'), 'it started while you were off');
});
test('a long way off, they may not wait — and the button says how likely', () => {
  const s = career({ filmography: [] }); takeBreak(s, 12);
  const o = film({ scale: 'blockbuster' });
  assert.ok(signLaterOdds(s, o) < 30, String(signLaterOdds(s, o)));
  const r = never(() => signLater(s, o));
  assert.equal(r.ok, false);
});

// ── the break ─────────────────────────────────────────────────────────────────
test('a break waits for the set to wrap, and says so', () => {
  const s = career({ filmography: [] }); onSet(s, {});
  assert.equal(canTakeBreak(s).ok, false);
  assert.match(canTakeBreak(s).why, /until it wraps/);
});
test('a year away, lived in one step: the load and the head come back, the name mostly stays, and you are told', () => {
  const s = career({ strain: 95, mental: 40, fame: 80, filmography: [], burnouts: 2 });
  const fame = s.fame;
  let out = goAway(s, 12);
  // It stops only for something that wants a decision; answer it and carry on, as the screen does.
  for (let k = 0; k < 10 && out.onBreak; k++) { out.pendingArc = null; out.scene = null; out = stepAway(out); }
  assert.ok(!out.onBreak, 'still away');
  assert.ok(out.strain < 20 && out.mental > 50, `${out.strain} ${out.mental}`);
  assert.ok(out.fame > fame - 12, `${fame} → ${out.fame}`);
  assert.equal(out.burnouts, 1, 'a year away resets one past stop');
  assert.equal(out.bigMoment && out.bigMoment.id, 'breakSummary');
  assert.match(out.bigMoment.body, /Workload 95 →/);
  assert.ok(roundTrip(out));
});
test('while away you cannot start work, and the reason says you can sign for later', () => {
  const s = career({ filmography: [] }); takeBreak(s, 6);
  assert.equal(canWork(s).ok, false);
  assert.match(canWork(s).why, /when you are back/);
});

// ── the load record and the insurers ──────────────────────────────────────────
test('an old save with no record reads one off its strain, without writing to it', () => {
  const s = career({ strain: 100, filmography: [] });
  assert.equal(loadOf(s), 36);
  assert.ok(!('loadLog' in s));
  assert.ok(recoveryDrag(s) > 1.4);
});
test('light work brings the load down; a feature puts it up', () => {
  // (starting any set costs something on the day — production.js — so the month is measured after it)
  const a = career({ strain: 60, filmography: [] }); onSet(a, { scale: 'oneoff', months: 1 }); const a0 = a.strain; strainTick(a);
  const b = career({ strain: 60, filmography: [] }); onSet(b, {}); const b0 = b.strain; strainTick(b);
  assert.ok(a.strain < a0 && b.strain > b0, `${a0}→${a.strain} / ${b0}→${b.strain}`);
});
test('insurance reads recent stops, and forgets them', () => {
  const s = career({ filmography: [] }); forcedStop(s);
  assert.ok(insurability(s) < 1);
  s.year += 4;
  assert.equal(insurability(s), 1);
});

// ── before you sign ───────────────────────────────────────────────────────────
test('the offer forecasts the load and the overlap', () => {
  const s = career({ strain: 50, filmography: [] }); onSet(s, { months: 8 }); s.productions[0].monthsLeft = 6;
  const f = forecast(s, film({ months: 8 }));
  assert.ok(f.to > f.from && f.overlap >= 5 && f.danger, JSON.stringify(f));
});
test('a lead in a feature carries a schedule bonus and the postponement terms on the paper', () => {
  const s = career({ filmography: [] }); const o = film(); s.offers = [o];
  const k = draftContract(s, o);
  const bonus = k.clauses.find((c) => c.id === 'scheduleBonus');
  assert.ok(bonus && bonus.value === 500000, JSON.stringify(bonus));
  assert.ok(k.clauses.some((c) => c.id === 'postpone'));
});

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
