// Three players, one game. Plays whole lives through the real monthly loop and reports what
// each of them ends up with — which is the only way to answer "does the decision matter".
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const W = await import(P + 'systems/life/work.js');
const K = await import(P + 'systems/career/castings.js');
const T = await import(P + 'systems/career/training.js');
const PR = await import(P + 'systems/career/production.js');
const ST = await import(P + 'systems/life/strain.js');
const LG = await import(P + 'systems/meta/legacy.js');

function fresh() {
  const s = createInitialState({ name: 'Player One', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 19, year: 2045, month: 0, hasApartment: true,
    housing: 'room', cash: 4000, alive: true, ap: 100, apMax: 100, apMaxEff: 100 });
  return s;
}
const clear = (s) => { s.bigMoment = null; s.pendingArc = null; };

// ── the three of them ─────────────────────────────────────────────────────────
// natural: does the sensible thing without knowing any numbers.
// reckless: takes every risk, never trains, never rests, drinks when offered.
// optimal:  trains to the ceiling, only auditions when the odds are good, rests on schedule.
function live(kind, years = 45) {
  const s0 = fresh();
  let s = s0;
  const marks = []; const tally = { shooting:0, burnt:0, ill:0, rehab:0, free:0, months:0 };
  for (let m = 0; m < years * 12; m++) {
    clear(s);
    if (!s.alive) break;

    // a steady job while nobody is hiring you
    if (!s.job && (s.fame || 0) < 22 && kind !== 'reckless') {
      const j = W.availableJobs(s).filter((x) => x.slots === 1).slice(-1)[0];
      if (j) W.takeJob(s, j.id);
    }
    if (s.job && (s.fame || 0) > 35) W.quitJob(s);

    // training
    const key = T.trainingKey(s);
    if (kind === 'optimal') {
      const best = [...T.SCHOOLS].reverse().find((sc) => (s.cash || 0) > sc.cost * 3);
      if (best && (s.ap || 0) > 0 && (s[key] || 0) < 100) T.train(s, best.id);
    } else if (kind === 'natural') {
      const cheap = [...T.SCHOOLS].reverse().find((sc) => (s.cash || 0) > sc.cost * 8);
      if (cheap && (s.ap || 0) > 1 && Math.random() < 0.45) T.train(s, cheap.id);
    }

    // auditions
    K.refreshCastingPool(s);
    if (!s.production && !(s.offers || []).length) {
      const pool = (s.castingPool || []).map((c) => ({ c, odds: K.castingChance(s, c) }));
      pool.sort((a, b) => b.odds - a.odds);
      const wanted = kind === 'optimal' ? pool.find((x) => x.odds >= 45) || pool[0]
        : kind === 'reckless' ? pool[pool.length - 1] : pool[0];
      if (wanted && (s.ap || 0) > 0) {
        // how well you actually do the audition minigame
        const q = kind === 'optimal' ? 92 : kind === 'natural' ? 62 : 25;
        K.auditionFor(s, wanted.c.id, q);
      }
    }
    if ((s.offers || []).length && !s.production) {
      const o = kind === 'reckless'
        ? [...s.offers].sort((a, b) => (a.stability || 50) - (b.stability || 50))[0]
        : [...s.offers].sort((a, b) => (b.salary || 0) - (a.salary || 0))[0];
      const fit = ST.canWork(s);
      if (fit.ok) { PR.startProduction(s, o); s.offers = (s.offers || []).filter((x) => x.id !== o.id); }
    }

    // what is left of the month
    let guard = 0;
    while ((s.ap || 0) > 0 && guard++ < 6) {
      if (s.production) {
        if (kind === 'reckless') PR.riskyTake(s, s[key] || 0);
        else if (kind === 'optimal' && (s[key] || 0) >= 60) PR.riskyTake(s, s[key] || 0);
        else PR.rehearse(s);
      } else if (kind !== 'reckless' && (s.strain || 0) > 45) ST.markRested(s);
      else {
        const sh = W.pickShift(s);
        if (sh) W.doShift(s, sh.id, kind === 'optimal' ? 85 : 50); else break;
      }
    }
    tally.months++;
    if (s.burnout && s.burnout.left > 0) tally.burnt++;
    else if (s.rehab && s.rehab.left > 0) tally.rehab++;
    else if (s.illness && s.illness.freezes) tally.ill++;
    else if (s.production) tally.shooting++;
    else tally.free++;
    s = advanceMonth(s);
    if (m % 60 === 59) marks.push({ age: s.ageY, fame: Math.round(s.fame), cash: Math.round(s.cash),
      skill: Math.round(s[key] || 0), credits: (s.filmography || []).length });
  }
  const L = LG.computeLegacy(s);
  return { alive: s.alive, age: s.ageY, fame: Math.round(s.peakFame || s.fame), cash: Math.round(s.cash),
    skill: Math.round(s[T.trainingKey(s)] || 0), credits: (s.filmography || []).length,
    hits: L.hits, worldHits: L.worldHits, askers: L.askerWins, tier: L.tier, points: L.points,
    respect: Math.round(s.respect), burnouts: s.burnouts || 0, quote: Math.round(s.quote || 0), marks, tally, burnouts2: s.burnouts||0 };
}

const N = 40;
function survey(kind) {
  const runs = []; for (let i = 0; i < N; i++) runs.push(live(kind));
  const med = (f) => { const v = runs.map(f).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
  const tiers = {}; for (const r of runs) tiers[r.tier] = (tiers[r.tier] || 0) + 1;
  return { fame: med((r) => r.fame), cash: med((r) => r.cash), skill: med((r) => r.skill),
    credits: med((r) => r.credits), hits: med((r) => r.hits), points: med((r) => r.points),
    quote: med((r) => r.quote), burnouts: med((r) => r.burnouts),
    died: runs.filter((r) => !r.alive).length, tiers, sample: runs[0] };
}

const runs = []; for (let i = 0; i < 30; i++) runs.push(live('natural'));
const sum = (f) => Math.round(runs.reduce((a, r) => a + f(r), 0) / runs.length);
const bucket = (k) => sum(r => r.tally[k]);
const tot = sum(r => r.tally.months);
console.log('WHERE A 45-YEAR CAREER ACTUALLY GOES (average of 30 lives, ' + tot + ' months):');
for (const k of ['shooting','free','burnt','ill','rehab']) console.log('  ' + k.padEnd(9) + String(bucket(k)).padStart(4) + ' months  (' + (100*bucket(k)/tot).toFixed(0) + '%)');
console.log('  burnouts per life: ' + sum(r => r.burnouts2));
console.log('  credits per life:  ' + sum(r => r.credits));
process.exit(0);
const nat = survey('natural'), rec = survey('reckless'), opt = survey('optimal');
const row = (l, o) => console.log(
  `  ${l.padEnd(10)} fame ${String(o.fame).padStart(3)} · skill ${String(o.skill).padStart(3)} · credits ${String(o.credits).padStart(3)}`
  + ` · hits ${String(o.hits).padStart(2)} · €${o.cash.toLocaleString().padStart(11)} · quote €${(o.quote/1e6).toFixed(1)}m`
  + ` · legacy ${String(o.points).padStart(5)} · died ${o.died}/${N}`);
console.log('\n45 years of a career, median of ' + N + ' lives each:\n');
row('natural', nat); row('reckless', rec); row('optimal', opt);
console.log('\ntiers reached:');
for (const [l, o] of [['natural', nat], ['reckless', rec], ['optimal', opt]]) {
  console.log('  ' + l.padEnd(10) + JSON.stringify(o.tiers));
}
console.log('\nthe natural player, every 5 years:');
for (const k of nat.sample.marks) console.log(`  age ${k.age}: fame ${k.fame} · skill ${k.skill} · ${k.credits} credits · €${k.cash.toLocaleString()}`);
