// Why a star's blockbuster takes a billion.
//
// The career measurement found it: inside real lives, the median blockbuster of an A-list actor
// grosses €913m and 45% of them pass a billion, against 5-7% in the business. No threshold on
// top of that can make anything rare, so the question stopped being "where do we put the bar"
// and became "what is making the number".
//
// Two things here, and neither one changes anything:
//   the gross of real blockbusters, split by how famous their lead was AT THE TIME;
//   and an ablation — the same films recomputed with one advantage removed at a time.
//
// Captured from played careers rather than generated, because the whole lesson of the last two
// days is that a film sampled with fame spread evenly from 10 to 95 is not a film anybody in
// this game actually makes.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const PR = await import(P + 'systems/career/production.js');
const K = await import(P + 'systems/career/castings.js');
const T = await import(P + 'systems/career/training.js');
const W = await import(P + 'systems/life/work.js');
const R = await import(P + 'systems/career/release.js');

const CAREERS = Number(process.argv[2] || 24);
const YEARS = 32;

function actor() {
  const s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true,
    housing: 'flat', cash: 20000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, acting: 40,
    fame: 0, peakFame: 0, respect: 20, offers: [], castingPool: [], submissions: [],
    running: [], releases: [], laterOffers: [], frozen: [] });
  return s;
}

// Every film, with the state of the person at the month it opened — which is the thing a
// generated sample cannot have and the thing the whole question turns on.
const shots = [];
let mine = 0;
function career() {
  mine++;
  let s = actor();
  let seen = 0;
  for (let m = 0; m < YEARS * 12; m++) {
    s.bigMoment = null; s.pendingArc = null;
    if (!s.job && (s.fame || 0) < 22) { const j = W.availableJobs(s).filter((x) => x.slots === 1).slice(-1)[0]; if (j) W.takeJob(s, j.id); }
    if (s.job && (s.fame || 0) > 35) W.quitJob(s);
    const best = [...T.SCHOOLS].reverse().find((sc) => (s.cash || 0) > sc.cost * 4);
    if (best && (s.ap || 0) > 1) T.train(s, best.id);
    K.refreshCastingPool(s);
    if (!s.production && !(s.offers || []).length && !(s.submissions || []).length) {
      const pool = (s.castingPool || []).map((c) => ({ c, o: K.castingChance(s, c) })).sort((a, b) => b.o - a.o);
      if (pool[0] && (s.ap || 0) > 0) K.auditionFor(s, pool[0].c.id, 78);
    }
    if ((s.offers || []).length && !s.production) {
      const o = [...s.offers].sort((a, b) => (b.salary || 0) - (a.salary || 0))[0];
      PR.startProduction(s, o); s.offers = s.offers.filter((x) => x.id !== o.id);
    }
    let g = 0;
    while ((s.ap || 0) > 0 && g++ < 5) { if (s.production) PR.rehearse(s); else break; }
    const fameAt = s.fame || 0, mediaAt = s.media || 0;
    s = advanceMonth(s);
    if (!s.alive) break;
    // Anything that appeared on the filmography this month opened this month, and the fame
    // above is the fame it opened on.
    const film = s.filmography || [];
    for (let i = 0; i < film.length - seen; i++) {
      const c = film[i];
      if (!c || !c.scale) continue;
      // The gross is NOT here yet: a credit exists the night it opens and the money lands when
      // the run closes, months later. The first version read c.boxOffice at this moment and
      // every single film came back at zero. Captured by name and filled in at the end.
      shots.push({ fame: fameAt, media: mediaAt, scale: c.scale, genre: c.genre, part: c.part || 1,
        withFame: c.withFame || 0, campaignShare: c.campaignShare || 0, campaign: !!c.campaignShare,
        rating: c.rating || 50, reception: c.audience != null ? c.audience : (c.rating || 50),
        gross: 0, title: c.title, year: c.year, month: s.month, mine });
    }
    seen = film.length;
  }
  // Now the runs have closed and the credits carry their money. Matched by name and year,
  // which is unique enough inside one filmography.
  for (const x of shots) {
    if (x.mine !== mine || x.gross) continue;
    const c = (s.filmography || []).find((y) => y.title === x.title && y.year === x.year);
    if (c) { x.gross = c.boxOffice || 0; x.rating = c.rating || x.rating; if (c.audience != null) x.reception = c.audience; }
  }
  return s;
}
for (let i = 0; i < CAREERS; i++) career();

// What campaign tier the share corresponds to, so a recomputation uses the one it really had.
const TIER = (share) => (share >= 0.7 ? 'event' : share >= 0.5 ? 'major' : share >= 0.3 ? 'standard' : 'minimal');
const relOf = (x, over = {}) => ({ scale: x.scale, genre: x.genre, part: x.part, withFame: x.withFame,
  campaignTier: TIER(x.campaignShare), rating: x.rating, reception: x.reception, appealMod: 1, ...over });
const stOf = (x, over = {}) => ({ fame: x.fame, media: x.media, hypeSource: null, year: x.year,
  month: x.month, typecast: { scores: {}, active: [] }, acting: 70, ...over });
// Recomputed rather than read off the credit, so an ablation and its baseline are made the same
// way. The baseline is checked against the real number below; if they disagree this is noise.
const regross = (x, s, rel) => {
  const d = R.demandFor(s, rel);
  return R.openingFor(s, rel, d) * R.legsFor(rel) * R.expansionFor(rel) * 1e6;
};

const q = (a, p) => (a.length ? Math.round(a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] / 1e6) : 0);
const pc = (a, over) => (a.length ? Math.round(a.filter((x) => x >= over).length / a.length * 100) : 0);

// ── 1. the gross of a blockbuster, by how famous its lead was ────────────────
const BANDS = [[0, 24], [25, 49], [50, 74], [75, 89], [90, 100]];
console.log('BLOCKBUSTER GROSS BY THE LEAD’S FAME AT RELEASE   (from ' + CAREERS + ' played careers)');
console.log('  fame band      n   median     P75     P90     P95      max   >700m   >1bn');
for (const [lo, hi] of BANDS) {
  const g = shots.filter((x) => x.scale === 'blockbuster' && x.fame >= lo && x.fame <= hi && x.gross > 0).map((x) => x.gross);
  if (!g.length) { console.log(`  ${String(lo + '-' + hi).padEnd(10)} ${String(0).padStart(5)}        —`); continue; }
  console.log(`  ${String(lo + '-' + hi).padEnd(10)} ${String(g.length).padStart(5)}  ${('€' + q(g, 0.5) + 'm').padStart(7)} ${('€' + q(g, 0.75) + 'm').padStart(7)} ${('€' + q(g, 0.9) + 'm').padStart(7)} ${('€' + q(g, 0.95) + 'm').padStart(7)} ${('€' + q(g, 0.999) + 'm').padStart(8)}  ${String(pc(g, 700e6) + '%').padStart(5)}  ${String(pc(g, 1e9) + '%').padStart(5)}`);
}
// And every scale, for scale: the question is whether this is a blockbuster problem or a
// box-office problem.
console.log();
console.log('  for comparison, by scale (all fame):');
for (const sc of ['small', 'festival', 'indie', 'prestige', 'feature', 'blockbuster']) {
  const g = shots.filter((x) => x.scale === sc && x.gross > 0).map((x) => x.gross);
  if (g.length) console.log(`    ${sc.padEnd(12)} n=${String(g.length).padStart(4)}  median ${('€' + q(g, 0.5) + 'm').padStart(7)}  P90 ${('€' + q(g, 0.9) + 'm').padStart(7)}  >1bn ${pc(g, 1e9)}%`);
}

// ── 2. ablation on the A-list blockbuster sample ─────────────────────────────
const star = shots.filter((x) => x.scale === 'blockbuster' && x.fame >= 70 && x.gross > 0);
console.log();
console.log(`ABLATION · ${star.length} blockbusters opened at fame 70+, each recomputed ${11} times`);
const RUNS = 11;   // odd, so the median of the runs is one of them, and the dice average out
const med = (fn) => {
  const out = [];
  for (const x of star) {
    const each = [];
    for (let i = 0; i < RUNS; i++) each.push(fn(x));
    each.sort((a, b) => a - b);
    out.push(each[(RUNS - 1) / 2]);
  }
  return q(out, 0.5);
};
const base = med((x) => regross(x, stOf(x), relOf(x)));
const real = q(star.map((x) => x.gross), 0.5);
console.log(`  recomputed baseline  €${base}m   (the real median of the same films: €${real}m)`);
const rows = [
  ['no fame at all', (x) => regross(x, stOf(x, { fame: 0 }), relOf(x, { withFame: 0 }))],
  ['the lead is a nobody', (x) => regross(x, stOf(x, { fame: 0 }), relOf(x))],
  ['no co-star draw', (x) => regross(x, stOf(x), relOf(x, { withFame: 0 }))],
  ['no hype that month', (x) => regross(x, stOf(x, { media: 0 }), relOf(x))],
  ['the cheapest campaign', (x) => regross(x, stOf(x), relOf(x, { campaignTier: 'minimal' }))],
  ['genre appetite neutral', (x) => regross(x, stOf(x, { market: { genres: {} } }), relOf(x, { genre: 'Crime' }))],
  ['first instalment only', (x) => regross(x, stOf(x), relOf(x, { part: 1 }))],
  ['nobody liked it (word 40)', (x) => regross(x, stOf(x), relOf(x, { rating: 40, reception: 40 }))],
];
for (const [name, fn] of rows) {
  const v = med(fn);
  const d = base ? Math.round((v - base) / base * 100) : 0;
  console.log(`  ${name.padEnd(26)} €${String(v).padStart(5)}m   ${(d > 0 ? '+' : '') + d}%`);
}

// ── 3. and the demand itself, because of the exponent ────────────────────────
console.log();
console.log('DEMAND, which is raised to the power of 1.45 before it becomes money');
for (const [lo, hi] of BANDS) {
  const g = shots.filter((x) => x.scale === 'blockbuster' && x.fame >= lo && x.fame <= hi);
  if (!g.length) continue;
  const ds = g.map((x) => R.demandFor(stOf(x), relOf(x))).sort((a, b) => a - b);
  const mid = ds[Math.floor(ds.length / 2)];
  console.log(`  fame ${String(lo + '-' + hi).padEnd(8)} median demand ${String(mid).padStart(3)}  →  ${Math.round(Math.pow(mid, 1.45))} before screens and legs`);
}
