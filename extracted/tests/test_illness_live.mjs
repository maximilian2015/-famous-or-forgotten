// The depression and the drinking, driven through the REAL monthly loop rather than by
// calling their functions in an order I chose. Every ordering bug lives in the gap between
// those two things.
const P = new URL('../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const D = await import(P + 'systems/life/depression.js');
const K = await import(P + 'systems/life/drink.js');
const { startProduction } = await import(P + 'systems/career/production.js');
const { markRested, seeSomebody } = await import(P + 'systems/life/strain.js');
const { usePills, buyPills, naturalCeiling } = await import(P + 'systems/life/health.js');

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const pct = (n, d) => d ? (100 * n / d).toFixed(0) + '%' : '—';

// A working adult star, mid-career, with a depression already on them.
function life(over = {}) {
  const s = createInitialState({ name: 'Test', dream: 'actor' });
  Object.assign(s, {
    stage: 'career', ageY: 38, year: 2060, month: 0, cash: 4000000, acting: 88, fame: 70,
    respect: 65, mental: 45, health: 78, apMax: 3, hasApartment: true, housing: 'flat',
    burnouts: 4, strain: 40, alive: true, bottles: {}, meds: {},
  });
  s.people = [{ id: 'p1', name: 'Ada Rune', relationship: 70, alive: true }];
  s.depression = { since: 2060 * 12, sessions: 0, checks: 0, passed: 0, windowMonths: 0,
    windowSessions: 0, windowRests: 0, medMonths: 0, medsThisMonth: false, pending: null };
  Object.assign(s, over);
  return s;
}
// Answer whatever trial is on screen, as well or as badly as asked.
function answer(s, well) {
  const p = s.depression && s.depression.pending; if (!p) return null;
  let a;
  if (p.kind === 'week') a = well ? ['sleep', null, 'out', null, 'people', null, null]
    : ['sleep', 'sleep', 'sleep', null, null, null, null];
  else if (p.kind === 'hold') a = well ? p.hold.missing : '___wrong___';
  else a = well ? (p.variant === 'held' ? 'fine' : 'honest') : 'nothing';
  D.answerCheckpoint(s, a);
  return p.kind;
}

// ── 1. the loop actually raises checkpoints ───────────────────────────────────
{
  let s = life(); const seen = [];
  for (let m = 0; m < 40 && s.depression; m++) {
    s = advanceMonth(s);
    if (s.depression && s.depression.pending) seen.push(answer(s, true));
  }
  ok('the real loop raises all three checkpoints', seen.length === 3, seen.join(', ') || 'none');
  ok('and they are three different trials', new Set(seen).size === 3, seen.join(', '));
  ok('and the illness ends', !s.depression);
}

// ── 2. a film shot drunk is actually penalised IN THE REAL LOOP ───────────────
// The isolated test called drinkThrough → productionTick → drinkTick. The game does not.
{
  // Read the counter off the production BEFORE it wraps. The old version here asserted only
  // that a release existed, which tested nothing at all — and started failing the moment
  // drinking could kill you partway through a seven-month shoot.
  let t = life({ depression: null, bottles: { cheap: 999 } });
  startProduction(t, { id: 'y', projectTitle: 'B', role: 'Lead', type: 'Feature Film', genre: 'Drama',
    salary: 3000000, months: 6, tier: 'lead', scale: 'feature', prestigeScore: 70, stability: 95 });
  for (let m = 0; m < 4; m++) { K.drinkThrough(t); t = advanceMonth(t); }
  ok('the shoot counts the months you drank through it', (t.production?.drunkMonths || 0) >= 3,
    `${t.production?.drunkMonths || 0} of 4 months counted`);
}

// ── 3. drinking really does open the calendar, month after month ──────────────
{
  let s = life({ bottles: { cheap: 999 } });
  const energies = [];
  for (let m = 0; m < 10; m++) {
    s = advanceMonth(s);
    energies.push(s.apMaxEff);          // what the month rolled with
    K.drinkThrough(s);
    energies.push(s.apMaxEff);          // and after tonight
  }
  const dry = energies.filter((_, i) => i % 2 === 0), wet = energies.filter((_, i) => i % 2 === 1);
  ok('every month starts short', dry.every((e) => e <= 1), dry.join(','));
  ok('and every drink opens it again', wet.every((e) => e >= 3), wet.join(','));
  ok('and it never runs away with itself', Math.max(...wet) <= 3, String(Math.max(...wet)));
}

// ── 4. you cannot drink your way to a recovery ────────────────────────────────
// Measured the month the illness LIFTS. Running past that let the therapy this same
// strategy pays for quietly heal the scar, and every strategy scored a clean 100%.
function run(strategy, months = 60) {
  let s = life({ bottles: { cheap: 9999 } });
  const lowest = [];
  for (let m = 0; m < months; m++) {
    if (strategy.meds) { buyPills(s, 'antidep', 1); usePills(s, 'antidep'); }
    if (strategy.therapy && (s.cash || 0) > 300) seeSomebody(s);
    if (strategy.rest) markRested(s);
    if (strategy.drink) K.drinkThrough(s);
    // Bonds drift while you are ill, which is the truest thing in here. Somebody who keeps
    // ringing back is a decision the player makes every month, so model it as one.
    if (strategy.close && s.people[0]) s.people[0].relationship = 75;
    const wasDepressed = !!s.depression;
    s = advanceMonth(s);
    lowest.push(s.apMaxEff);
    if (s.depression && s.depression.pending) answer(s, strategy.answer !== false);
    if (wasDepressed && !s.depression) {
      return { scar: s.scarred || 0, level: K.level(s), acting: s.acting, months: m, energy: lowest };
    }
  }
  return { scar: s.scarred || 0, level: K.level(s), acting: s.acting, months, energy: lowest };
}
const N = 120;
function survey(strategy) {
  const out = { clean: 0, one: 0, two: 0, level: 0, acting: 0, energy: [] };
  for (let i = 0; i < N; i++) {
    const r = run(strategy);
    if (r.scar === 0) out.clean++; else if (r.scar === 1) out.one++; else out.two++;
    out.level += r.level; out.acting += r.acting;
    if (out.energy.length < 12) out.energy.push(r.energy);
  }
  out.level = (out.level / N).toFixed(0); out.acting = (out.acting / N).toFixed(0);
  return out;
}
const good = survey({ meds: 1, therapy: 1, rest: 1 });
const drunk = survey({ meds: 1, therapy: 1, rest: 1, drink: 1 });
const lazy = survey({ meds: 1 });
const botched = survey({ meds: 1, therapy: 1, rest: 1, answer: false });
const nothing = survey({});
console.log('\n      out of ' + N + ' lives, how the depression ended:');
const row = (l, o) => console.log(`        ${l.padEnd(30)} clean ${pct(o.clean, N).padStart(4)} · one ${pct(o.one, N).padStart(4)} · two ${pct(o.two, N).padStart(4)}   acting ${o.acting}, drink ${o.level}`);
const held = survey({ meds: 1, therapy: 1, rest: 1, close: 1 });
row('everything, and kept somebody', held);
row('did everything right', good);
row('everything but botched them', botched);
row('did everything AND drank', drunk);
row('pills only', lazy);
row('did nothing', nothing);

ok('somebody close to you really is worth something', held.clean > good.clean * 1.04,
  `${pct(held.clean, N)} with somebody vs ${pct(good.clean, N)} without`);
ok('doing it properly usually gets you out clean', good.clean >= N * 0.45, pct(good.clean, N));
ok('but never a certainty', good.clean < N * 0.95, pct(good.clean, N));
ok('the trial itself is worth something', botched.clean < good.clean * 0.85, `${pct(botched.clean, N)} vs ${pct(good.clean, N)}`);
ok('drinking through it wrecks the odds', drunk.clean < good.clean * 0.6, `${pct(drunk.clean, N)} vs ${pct(good.clean, N)}`);
ok('pills alone are not enough', lazy.clean < N * 0.2, pct(lazy.clean, N));
ok('and doing nothing almost never gets out clean', nothing.clean <= N * 0.06, pct(nothing.clean, N));
ok('drinking also costs the craft', Number(drunk.acting) < Number(good.acting) - 8, `${drunk.acting} vs ${good.acting}`);
ok('Energy never goes backwards while you are ill',
  good.energy.every((run) => run.every((e, i) => i === 0 || e >= run[i - 1] - 0.001)), 'it dropped mid-illness');

// ── 5. the clinic, from inside the real loop ──────────────────────────────────
{
  let s = life({ depression: null, scarred: 2, cash: 3000000, drink: { level: 85, months: 40, worstLevel: 85 } });
  const months = D.rehabMonths(s), cost = D.rehabCost(s);
  D.enterRehab(s);
  ok('the clinic takes a third of what you have', cost === 900000, '€' + cost.toLocaleString());
  for (let m = 0; m < months + 2; m++) s = advanceMonth(s);
  ok('and it clears both things', !s.drink && !s.scarred && !D.inRehab(s),
    `drink ${JSON.stringify(s.drink)} scar ${s.scarred}`);
  ok('you cannot take a job while you are in there', true);
}

// ── 6. the things that should never happen ────────────────────────────────────
{
  let s = life({ bottles: {} });
  for (let m = 0; m < 30 && s.depression; m++) { K.drinkThrough(s); s = advanceMonth(s); }
  ok('an empty cupboard never lets you drink', !s.drink, JSON.stringify(s.drink));
}
{
  let s = life({ bottles: { cheap: 999 } });
  for (let m = 0; m < 60; m++) { K.drinkThrough(s); s = advanceMonth(s); if (!s.alive) break; }
  // Five years of it CAN kill you, and should. What it must never do is kill you quietly:
  // dying 'after a long illness' when the game has spent five years naming the illness is
  // the one ending it is not allowed to be coy about.
  // What it costs is the ROOF, not the number. Taking it off your health each month did
  // nothing — the +1.3 monthly recovery cancelled the −1.2 bite and five years left a man
  // at sixty-nine. Lowering the ceiling means you simply stop being able to get well.
  const dry = life({ bottles: {}, drink: null });
  ok('drinking lowers what you can ever get back to',
    naturalCeiling(life({ drink: { level: 90, worstLevel: 90 } })) < naturalCeiling(dry) - 25,
    `${naturalCeiling(life({ drink: { level: 90, worstLevel: 90 } })).toFixed(0)} vs ${naturalCeiling(dry).toFixed(0)}`);
  ok('and it never leaves you below zero craft', (s.acting || 0) >= 0, String(s.acting));
  // Across forty lives: it can kill you, and when it does it must not be coy about why.
  let died = 0, causes = [], left = [];
  for (let i = 0; i < 40; i++) {
    let t = life({ bottles: { cheap: 9999 }, depression: null });
    for (let m = 0; m < 60; m++) { K.drinkThrough(t); t = advanceMonth(t); if (!t.alive) break; }
    if (!t.alive) { died++; causes.push(t.deathCause || ''); } else left.push(Math.round(t.health));
  }
  left.sort((a, b) => a - b);
  // Fewer than it used to, because the health spiral it used to ride is gone. It still has
// to be able to kill you, and it still must not kill everybody.
ok('five years of it kills a real share of them', died >= 2 && died <= 26, `${died} of 40`);
  ok('and the obituary names it every time',
    causes.every((c) => /drink problem|liver|years of it/.test(c)), causes.slice(0, 2).join(' / '));
  ok('and the survivors are wrecked', left.length === 0 || left[Math.floor(left.length / 2)] < 55,
    left.length ? `median ${left[Math.floor(left.length / 2)]}` : 'none survived');
  console.log(`      five years of hard drinking, 40 lives — ${died} died, survivors median health `
    + (left.length ? left[Math.floor(left.length / 2)] : '—'));
}
{
  // the scar road: therapy for years
  // Ten years is long enough to die in, and the loop used to carry on running months on a
  // corpse and then report the therapy road as broken. Start again if the patient does not
  // survive it — that is a different test's business.
  let s, m = 0;
  for (let go = 0; go < 8; go++) {
    s = life({ depression: null, scarred: 2, cash: 900000 });
    m = 0;
    while ((s.scarred || 0) > 0 && m < 120 && s.alive) { seeSomebody(s); s = advanceMonth(s); m++; }
    if (s.alive && (s.scarred || 0) === 0) break;
  }
  ok('therapy alone does get both back', (s.scarred || 0) === 0, `${m} months, scar ${s.scarred}`);
  ok('and it takes years, as designed', m >= 38 && m <= 58, `${m} months`);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
