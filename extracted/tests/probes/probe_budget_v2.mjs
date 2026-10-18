// Budget Model V2, measured before it is built. Nothing in the game changes here.
//
// Maxi, at "€647m on a €220m film — BROKE EVEN" for a family comedy: "I thought we fixed the
// budgets." We fixed the labels. The budget is still one number per scale (release.js BUDGET:
// indie €12m, feature €90m, blockbuster €220m), genre is never read, and an agent's offer picks
// the scale from the size of your PART (offers.js generateOffer: lead → feature, supporting →
// indie, tentpole → blockbuster).
//
// The proposal measured here: the production budget is the project's — a range per scale, the
// genre and the production's needs (effects, stunts, period, a big cast) placing it inside the
// range. What the studio spends to SELL it stays what it is now (campaignSpend, by scale and
// campaign tier), so demand — and therefore every gross — is untouched; only what the film had
// to take changes. Every number below is a real film from a played career, its real gross, and
// its verdict now against its verdict with the proposed budget.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const PR = await import(P + 'systems/career/production.js');
const K = await import(P + 'systems/career/castings.js');
const T = await import(P + 'systems/career/training.js');
const W = await import(P + 'systems/life/work.js');
const R = await import(P + 'systems/career/release.js');
const WD = await import(P + 'systems/world/world.js');
const PS = await import(P + 'ui/components/poster-spec.js');
const HY = await import(P + 'systems/meta/hype.js');
const MK = await import(P + 'systems/meta/market.js');
const TC = await import(P + 'systems/meta/typecast.js');

// ── the proposal ──────────────────────────────────────────────────────────────
// A range per scale, and a position inside it: lo × (hi/lo)^t, so the steps are proportional.
export const RANGE = { small: [0.4, 3], festival: [0.8, 6], indie: [2, 20], feature: [15, 110], blockbuster: [110, 320] };
// Where a genre sits in its range before anything is added. Horror and drama are cheap to make;
// a musical has to build its stage and a science-fiction film has to build its world.
export const GENRE_AT = { Horror: 0.12, Drama: 0.22, Romance: 0.28, Comedy: 0.32, Crime: 0.45, Thriller: 0.5, Musical: 0.62, 'Sci-Fi': 0.72 };
// What a production can need on top, how likely in each genre (%), and how far it pushes.
export const NEEDS = {
  effects: { push: 0.22, odds: { 'Sci-Fi': 70, Horror: 25, Thriller: 15, Musical: 10, Comedy: 6 } },
  stunts: { push: 0.14, odds: { Thriller: 45, Crime: 35, 'Sci-Fi': 40, Comedy: 12, Horror: 15 } },
  period: { push: 0.1, odds: { Drama: 25, Romance: 25, Musical: 30, Crime: 15 } },
  ensemble: { push: 0.08, odds: { Comedy: 22, Musical: 40, Drama: 12, Crime: 12 } },
};
export function budgetV2({ title, genre, scale }) {
  const [lo, hi] = RANGE[scale] || RANGE.indie;
  const r = PS.rng(PS.hash('budget:' + String(title || '') + (genre || '')));
  let t = GENRE_AT[genre] ?? 0.4;
  const needs = [];
  for (const [k, n] of Object.entries(NEEDS)) if (r() * 100 < (n.odds[genre] || 0)) { t += n.push; needs.push(k); }
  t += (r() - 0.5) * 0.24;
  t = Math.max(0, Math.min(1, t));
  return { m: Math.round(lo * Math.pow(hi / lo, t) * 10) / 10, needs };
}
const ratioVerdict = (x) => (x >= 2 ? 'smash' : x >= 1.25 ? 'profitable' : x >= 0.7 ? 'broke even' : 'bomb');
const needNew = (rel, m) => (m + R.campaignSpend(rel)) * 1.5 * 1e6;

// ── 1. what budgets would be ─────────────────────────────────────────────────
const GENRES = ['Comedy', 'Drama', 'Romance', 'Horror', 'Thriller', 'Crime', 'Musical', 'Sci-Fi'];
const q = (a, p) => { const v = a.slice().sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(v.length * p))]; };
const pct = (a, f) => Math.round(a.filter(f).length / a.length * 100);
console.log('1. PROPOSED PRODUCTION BUDGETS (€m) — median [p10–p90], 2,000 titles each. Today: indie 12 · feature 90 · blockbuster 220 for every genre.');
console.log('   genre      indie            feature            blockbuster       feature ≥€70m  ≥€90m');
for (const g of GENRES) {
  const row = ['indie', 'feature', 'blockbuster'].map((sc) => Array.from({ length: 2000 }, (_, i) => budgetV2({ title: 'T' + i * 7919, genre: g, scale: sc }).m));
  const f = (a) => `${String(q(a, 0.5)).padStart(5)} [${q(a, 0.1)}–${q(a, 0.9)}]`.padEnd(18);
  console.log(`   ${g.padEnd(9)} ${f(row[0])} ${f(row[1])} ${f(row[2])}  ${String(pct(row[1], (x) => x >= 70)).padStart(4)}%  ${String(pct(row[1], (x) => x >= 90)).padStart(4)}%`);
}

// ── 2. the same played films, judged against the proposed budget ─────────────
const CAREERS = Number(process.argv[2] || 30), YEARS = 32;
function actor() {
  const s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true, housing: 'flat', cash: 20000, alive: true, ap: 100, apMax: 100, apMaxEff: 100,
    acting: 40, fame: 0, peakFame: 0, respect: 20, offers: [], castingPool: [], submissions: [], running: [], releases: [], laterOffers: [], frozen: [] });
  return s;
}
const films = [];
for (let k = 0; k < CAREERS; k++) {
  let s = actor();
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
    if ((s.offers || []).length && !s.production) { const o = [...s.offers].sort((a, b) => (b.salary || 0) - (a.salary || 0))[0]; PR.startProduction(s, o); s.offers = s.offers.filter((x) => x.id !== o.id); }
    let g = 0; while ((s.ap || 0) > 0 && g++ < 5) { if (s.production) PR.rehearse(s); else break; }
    const pre = (s.releases || []).filter((r) => R.isFilm(r.scale)).map((r) => [r, { fame: s.fame || 0, hype: HY.hype(s), scandal: HY.hypeSource(s) === 'scandal', appetite: MK.appetiteFor(s, r.genre), anticipation: TC.castingExpectation(s, r) }]);
    s = advanceMonth(s);
    if (!s.alive) break;
    for (const [r, inp] of pre) if (r._demand != null && !r._probeSeen && r.scale !== 'festival') {
      r._probeSeen = true;
      films.push({ title: r.title, genre: r.genre, scale: r.scale, rating: r.rating, campaignTier: r.campaignTier, gross: r.finalGross || 0, tier: r.tier, role: r.role,
        demand: r._demand, inp: { ...inp, withFame: r.withFame || 0, part: r.part || 1, lastRating: r.lastRating, appealMod: r.appealMod, tour: r.tour ? 1 : 1, remind: 1 } });
    }
  }
}
console.log(`\n2. ${films.length} PLAYER FILMS FROM ${CAREERS} PLAYED CAREERS — the same gross, judged now and with the proposed budget`);
const V = ['bomb', 'broke even', 'profitable', 'smash'];
const dist = (list, key) => V.map((v) => `${v} ${pct(list, (f) => f[key] === v)}%`).join(' · ');
for (const f of films) {
  const rel = { scale: f.scale, campaignTier: f.campaignTier };
  f.oldNeed = R.breakEvenFor(rel); f.old = ratioVerdict(f.gross / f.oldNeed);
  const b = budgetV2(f); f.budget = b.m; f.newNeed = needNew(rel, b.m); f.now = ratioVerdict(f.gross / f.newNeed);
  // With the campaign a share of the real budget, what it had to take is (budget × (1 + share)) × 1.5.
  f.newNeed2 = R.breakEvenFor({ ...rel, budget: b.m });
}
for (const sc of ['small', 'indie', 'feature', 'blockbuster']) {
  const l = films.filter((f) => f.scale === sc); if (!l.length) continue;
  console.log(`   ${sc.padEnd(11)} n=${String(l.length).padStart(4)}  NOW:  ${dist(l, 'old')}`);
  console.log(`   ${''.padEnd(11)}         V2:   ${dist(l, 'now')}   (budget median €${q(l.map((f) => f.budget), 0.5)}m)`);
}
console.log('\n   features by rating, now → V2');
for (const [lo, hi] of [[0, 49], [50, 59], [60, 69], [70, 79], [80, 100]]) {
  const l = films.filter((f) => f.scale === 'feature' && f.rating >= lo && f.rating <= hi); if (!l.length) continue;
  console.log(`   ${(lo / 10).toFixed(1)}–${((hi + 1) / 10).toFixed(1)} n=${String(l.length).padStart(3)}  NOW: ${dist(l, 'old')}`);
  console.log(`   ${''.padEnd(13)} V2:  ${dist(l, 'now')}`);
}
console.log('\n   by genre (features), share at least profitable, now → V2');
for (const g of GENRES) {
  const l = films.filter((f) => f.scale === 'feature' && f.genre === g); if (l.length < 5) continue;
  console.log(`   ${g.padEnd(9)} n=${String(l.length).padStart(3)}  ${pct(l, (f) => f.old === 'profitable' || f.old === 'smash')}% → ${pct(l, (f) => f.now === 'profitable' || f.now === 'smash')}%   budget median €${q(l.map((f) => f.budget), 0.5)}m`);
}

// ── 3. Maxi's two films ───────────────────────────────────────────────────────
console.log('\n3. THE TWO ON MAXI\'S SCREEN (gross as shown, campaign as the scale\'s usual)');
for (const [title, genre, scale, tier, gross] of [['My Crazy Family', 'Comedy', 'blockbuster', 'event', 647e6], ["This Lantern Doesn't Work", 'Comedy', 'feature', 'major', 216e6]]) {
  const rel = { scale, campaignTier: tier }; const b = budgetV2({ title, genre, scale });
  const n0 = R.breakEvenFor(rel), n1 = needNew(rel, b.m);
  console.log(`   ${title}: budget €${R.budgetFor(rel) / 1e6}m → €${b.m}m${b.needs.length ? ' (' + b.needs.join(', ') + ')' : ''}; needed €${Math.round(n0 / 1e6)}m → €${Math.round(n1 / 1e6)}m; ${ratioVerdict(gross / n0)} (${(gross / n0).toFixed(2)}×) → ${ratioVerdict(gross / n1)} (${(gross / n1).toFixed(2)}×)`);
}

// ── 4. if the film's money follows its budget ────────────────────────────────
// Section 2 holds every gross where it is, and the answer is that a realistic budget makes
// nearly every player film a smash: the grosses were calibrated against €90m. So the other half
// is measured here — what the studio spends to sell a film is a share of what the film COST
// (campaignSpend already says so; it read the scale's single number), and, for variant C, a
// cheaper picture also opens on fewer screens. Demand is rebuilt with the real demandCore from
// the inputs captured at opening; the gross moves by the opening's own exponent (openingFor:
// demand^1.45 × width), the run and the dice unchanged.
{
  const dem = (f, budget) => R.demandCore({ scale: f.scale, genre: f.genre, cast: [f.inp.fame, f.inp.withFame], appetite: f.inp.appetite, campaignTier: f.campaignTier,
    part: f.inp.part, lastRating: f.inp.lastRating, appealMod: f.inp.appealMod, buzz: f.inp.scandal ? 0 : f.inp.hype, anticipation: f.inp.anticipation, budget });
  const miss = films.map((f) => Math.abs(dem(f, null) - f.demand));
  console.log(`\n4. THE FILM'S MONEY FOLLOWS ITS BUDGET  (rebuilt demand within ±3 of the real one for ${pct(miss, (d) => d <= 3)}%)`);
  const BASE = { small: 1, festival: 1.5, indie: 12, feature: 90, blockbuster: 220 };
  for (const [name, wideK] of [['B · the campaign is a share of the real budget', 0], ['C · and a cheaper film opens on fewer screens (width ∝ budget^0.3)', 0.3]]) {
    for (const f of films) {
      const d0 = dem(f, null), d1 = dem(f, f.budget);
      const width = Math.pow(f.budget / BASE[f.scale], wideK);
      f.grossV = f.gross * Math.pow(Math.max(2, d1) / Math.max(2, d0), 1.45) * width;
      f.vV = ratioVerdict(f.grossV / f.newNeed2);
    }
    console.log(`   ${name}`);
    for (const sc of ['indie', 'feature', 'blockbuster']) {
      const l = films.filter((f) => f.scale === sc); if (!l.length) continue;
      console.log(`     ${sc.padEnd(11)} ${dist(l, 'vV')}   gross median €${Math.round(q(l.map((f) => f.grossV), 0.5) / 1e6)}m (now €${Math.round(q(l.map((f) => f.gross), 0.5) / 1e6)}m)`);
    }
    for (const [lo, hi] of [[0, 49], [50, 59], [60, 69], [70, 79], [80, 100]]) {
      const l = films.filter((f) => f.scale === 'feature' && f.rating >= lo && f.rating <= hi); if (!l.length) continue;
      console.log(`     feature ${(lo / 10).toFixed(1)}–${((hi + 1) / 10).toFixed(1)}  ${dist(l, 'vV')}`);
    }
  }
}
