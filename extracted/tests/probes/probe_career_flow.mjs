// How many films a career can physically hold, and why.
//
// The last report said "93 credits in 32 years, 2.9 films a year" and that was my own number
// read carelessly: s.filmography holds EVERYTHING — a commercial, a magazine cover, a day as an
// extra, a television episode — and `minor` marks most of it. The screen credits are a smaller
// number and the whole argument turns on which one we are talking about. This counts them apart.
//
// Three players, and none of them is told how many films to make: the calendar is whatever the
// game's own rules allow. That is the question — not what a relentless harness can squeeze out,
// but what the rules permit a person to do.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const PR = await import(P + 'systems/career/production.js');
const K = await import(P + 'systems/career/castings.js');
const T = await import(P + 'systems/career/training.js');
const W = await import(P + 'systems/life/work.js');
const S = await import(P + 'systems/meta/status.js');
const SETS = await import(P + 'engine/sets.js');

const N = Number(process.argv[2] || 12);
const YEARS = 32;
const SCREEN = new Set(['small', 'indie', 'festival', 'feature', 'blockbuster']);
const TV = new Set(['episode', 'recurring', 'prestige']);

function actor() {
  const s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true,
    housing: 'flat', cash: 20000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, acting: 40,
    fame: 0, peakFame: 0, respect: 20, offers: [], castingPool: [], submissions: [],
    running: [], releases: [], laterOffers: [], frozen: [] });
  return s;
}

// aggressive — reads for everything every month, takes the best-paid offer the moment it can,
//              and takes a second and third set whenever the rules allow one.
// normal     — reads when it is not already on something, takes what it is offered, trains.
// struggling — reads for the LONGEST odds on the board, turns down about a third of what comes,
//              and does not train much.
function career(kind) {
  const s0 = actor();
  let s = s0;
  const perYear = new Map();          // year -> screen credits completed
  const busy = [];                    // months occupied by a shoot, per film
  const marks = { 50: null, 75: null, 85: null };
  let idle = 0, shooting = 0, everMulti = 0, seen = 0;
  const started = new Map();
  for (let m = 0; m < YEARS * 12; m++) {
    s.bigMoment = null; s.pendingArc = null;
    if (!s.job && (s.fame || 0) < 22) { const j = W.availableJobs(s).filter((x) => x.slots === 1).slice(-1)[0]; if (j) W.takeJob(s, j.id); }
    if (s.job && (s.fame || 0) > 35) W.quitJob(s);
    if (kind !== 'struggling') {
      const best = [...T.SCHOOLS].reverse().find((sc) => (s.cash || 0) > sc.cost * (kind === 'aggressive' ? 4 : 8));
      if (best && (s.ap || 0) > 1) T.train(s, best.id);
    }
    K.refreshCastingPool(s);
    // Reading. Only the aggressive player reads while already working — which the game allows
    // and says so in castings.js: "a read is a read: you go up for a part while you are on a set".
    const canRead = kind === 'aggressive' ? true : !s.production;
    if (canRead && !(s.submissions || []).length) {
      const pool = (s.castingPool || []).map((c) => ({ c, o: K.castingChance(s, c) }));
      if (kind === 'struggling') pool.sort((a, b) => a.o - b.o); else pool.sort((a, b) => b.o - a.o);
      if (pool[0] && (s.ap || 0) > 0) K.auditionFor(s, pool[0].c.id, kind === 'aggressive' ? 78 : kind === 'normal' ? 62 : 44);
    }
    // Taking. Nobody is forced: the rules say whether a set fits (engine/sets.js canTakeSet).
    for (const o of [...(s.offers || [])].sort((a, b) => (b.salary || 0) - (a.salary || 0))) {
      if (kind === 'struggling' && Math.random() < 0.35) continue;      // turns things down
      if (kind === 'normal' && SETS.sets(s).length >= 1) break;         // one picture at a time
      if (!SETS.canTakeSet(s, o).ok) continue;
      PR.startProduction(s, o); s.offers = s.offers.filter((x) => x.id !== o.id);
      if (kind !== 'aggressive') break;
    }
    const sets = SETS.sets(s);
    if (sets.length > 1) everMulti++;
    if (sets.length) shooting++; else idle++;
    for (const p of sets) if (!started.has(p.id)) started.set(p.id, m);
    if (kind === 'aggressive') { let g = 0; while ((s.ap || 0) > 0 && g++ < 5) { if (s.production) PR.rehearse(s); else break; } }
    s = advanceMonth(s);
    if (!s.alive) break;
    for (const k of [50, 75, 85]) if (marks[k] == null && (s.fame || 0) >= k) marks[k] = Math.floor(m / 12) + 1;
    // Anything new on the filmography opened this month; count the screen ones by year.
    const film = s.filmography || [];
    for (let i = 0; i < film.length - seen; i++) {
      const c = film[i];
      if (c && !c.minor && SCREEN.has(c.scale)) perYear.set(c.year, (perYear.get(c.year) || 0) + 1);
    }
    seen = film.length;
    // How long each shoot physically held a slot.
    for (const [id, at] of started) if (!sets.some((p) => p.id === id)) { busy.push(m - at); started.delete(id); }
  }
  const all = s.filmography || [];
  return { s, perYear, busy, marks, idle, shooting, everMulti,
    screen: all.filter((c) => !c.minor && SCREEN.has(c.scale)).length,
    tv: all.filter((c) => !c.minor && TV.has(c.scale)).length,
    minor: all.filter((c) => c.minor).length, total: all.length };
}

const KINDS = ['aggressive', 'normal', 'struggling'];
const out = {};
for (const k of KINDS) { out[k] = []; for (let i = 0; i < N; i++) out[k].push(career(k)); }

const med = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);
const mean = (a) => (a.length ? (a.reduce((n, x) => n + x, 0) / a.length) : 0);

console.log(`CAREER FLOW  ·  ${N} careers each, ${YEARS} years, the calendar decided by the rules`);
console.log();
console.log('                     screen   TV    minor   total   films/yr   idle months   two sets at once');
for (const k of KINDS) {
  const r = out[k];
  console.log(`  ${k.padEnd(12)} ${String(med(r.map((x) => x.screen))).padStart(8)} ${String(med(r.map((x) => x.tv))).padStart(5)} ${String(med(r.map((x) => x.minor))).padStart(7)} ${String(med(r.map((x) => x.total))).padStart(7)}` +
    `   ${(mean(r.map((x) => x.screen)) / YEARS).toFixed(2).padStart(6)}   ${String(med(r.map((x) => x.idle))).padStart(8)}/${YEARS * 12}   ${String(med(r.map((x) => x.everMulti))).padStart(6)} months`);
}

console.log();
console.log('SCREEN CREDITS PER YEAR');
for (const k of KINDS) {
  const b = [0, 0, 0, 0, 0];
  for (const r of out[k]) {
    const yrs = new Map();
    for (const [y, n] of r.perYear) yrs.set(y, n);
    for (let y = 2050; y < 2050 + YEARS; y++) b[Math.min(4, yrs.get(y) || 0)]++;
  }
  const t = b.reduce((n, x) => n + x, 0);
  console.log(`  ${k.padEnd(12)} ` + b.map((n, i) => `${i === 4 ? '4+' : i}: ${String(Math.round(n / t * 100)).padStart(3)}%`).join('  '));
}

console.log();
console.log('HOW LONG A FILM HOLDS A SLOT  (signing to wrap, in months)');
for (const k of KINDS) {
  const b = out[k].flatMap((r) => r.busy);
  console.log(`  ${k.padEnd(12)} median ${med(b)}  ·  mean ${mean(b).toFixed(1)}  ·  n=${b.length}`);
}

console.log();
console.log('FAME');
console.log('                 year to 50   to 75   to 85    final fame   peak');
for (const k of KINDS) {
  const r = out[k];
  const y = (n) => { const v = r.map((x) => x.marks[n]).filter(Boolean); return v.length ? med(v) + (v.length < r.length ? `(${v.length}/${r.length})` : '') : '—'; };
  console.log(`  ${k.padEnd(12)} ${String(y(50)).padStart(10)} ${String(y(75)).padStart(7)} ${String(y(85)).padStart(7)} ${String(Math.round(med(r.map((x) => x.s.fame || 0)))).padStart(13)} ${String(Math.round(med(r.map((x) => x.s.peakFame || 0)))).padStart(6)}`);
}

// What one film is worth in fame, by scale — measured off the careers rather than the formula,
// because the headroom curve means the same credit is worth nothing like the same at 20 and 80.
console.log();
console.log('A-LIST THRESHOLD IS FAME ' + (S.FAME_TIERS.find((t) => t.id === 'alist') || {}).min);
const reached = KINDS.map((k) => `${k} ${out[k].filter((x) => (x.s.peakFame || 0) >= 75).length}/${N}`);
console.log('  careers that ever reached it: ' + reached.join(' · '));
