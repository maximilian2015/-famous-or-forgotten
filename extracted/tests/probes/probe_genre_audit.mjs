// Genre audit, Budget V2 before merge (Maxi, 18 Oct 2026): "horror practically prints money and
// drama is almost never a smash — where does the genre move the box office, and is it counted
// more than once?" Measurement only: nothing in the game is changed, and every number here comes
// from the game's own functions in career/release.js.
//
//   node tests/probes/probe_genre_audit.mjs [lives for the market reading]
//
// 1. One hypothetical standard feature — rating 6.0, fame 50, hype 15, €40m, no co-star, a
//    standard campaign — released as each of the eight genres. Once into a neutral market
//    (every genre's appetite 1.0) and once into the market as it usually stands in a played life.
// 2. What each place the genre enters is worth to that same film, as a multiple.
// 3. One representative standard feature per genre, at what a played career usually brings to
//    it (rating 7.0, fame 75, hype 25) and at its genre's usual budget, through the whole formula.
const P = new URL('../../src/', import.meta.url).href;
const R = await import(P + 'systems/career/release.js');
const BG = await import(P + 'systems/career/budget.js');
const MK = await import(P + 'systems/meta/market.js');
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');

const G = ['Horror', 'Comedy', 'Thriller', 'Sci-Fi', 'Crime', 'Romance', 'Musical', 'Drama'];
const LIVES = Number(process.argv[2] || 10);
const MUSCLE_FEATURE = 52;   // release.js MUSCLE.feature, not exported

// Where the market usually stands: the median appetite of each genre, yearly, in lives with
// nobody playing (the same reading as probe_appetite.mjs).
const seen = Object.fromEntries(G.map((g) => [g, []]));
for (let k = 0; k < LIVES; k++) {
  let s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true, housing: 'flat', cash: 5e6, alive: true });
  for (let m = 0; m < 32 * 12; m++) {
    s.bigMoment = null; s.pendingArc = null;
    s = advanceMonth(s); if (!s.alive) break;
    if (m % 12 === 11 && m > 36) for (const g of G) seen[g].push(MK.appetiteFor(s, g));
  }
}
const med = (a) => { const v = a.slice().sort((x, y) => x - y); return v[Math.floor(v.length / 2)] || 0; };
const MARKET = Object.fromEntries(G.map((g) => [g, med(seen[g])]));
// What a standard feature of each genre usually costs under Budget V2.
const BUDGET = Object.fromEntries(G.map((g) => [g, med(Array.from({ length: 4000 }, (_, i) => BG.planBudget({ seed: 'audit' + i, genre: g, scale: 'feature' }).budget))]));

// Every die at its middle: the opening's ±10%, the run's ±8%, the crowd's ±9, an ordinary month,
// nothing opening against it.
function fixed(fn) { const r = Math.random; Math.random = () => 0.5; try { return fn(); } finally { Math.random = r; } }
function film({ genre, rating, fame, hype, budget, appetite, noAppeal = false, noCrowd = false, dice = false }) {
  const s = { fame, acting: 60, month: dice ? Math.floor(Math.random() * 12) : 0, typecast: { scores: {}, active: [] } };
  const rel = { scale: 'feature', genre, rating, budget, campaignTier: 'standard', part: 1, appealMod: 1, withFame: 0 };
  const keep = R.APPEAL[genre]; if (noAppeal) R.APPEAL[genre] = 1;
  const demand = R.demandCore({ scale: 'feature', genre, cast: [fame, 0], appetite, campaignTier: 'standard', budget, buzz: hype });
  R.APPEAL[genre] = keep;
  rel.reception = R.audienceFor(s, noCrowd ? { ...rel, genre: null } : rel);
  if (!dice) { rel._window = 1; rel._against = 1; }
  const opening = R.openingFor(s, rel, demand);
  const legs = R.legsFor(rel);
  const gross = opening * legs * R.expansionFor(rel) * 1e6;
  const need = R.breakEvenFor(rel);
  return { demand, opening, reception: rel.reception, word: R.wordFor(rel), legs, gross, need, ratio: gross / need,
    verdict: R.verdictOf({ scale: 'feature', boxOffice: gross, budget, campaignTier: 'standard' }) };
}
const at = (o) => fixed(() => film(o));
const spread = (o, n = 20000) => {
  const out = Array.from({ length: n }, () => film({ ...o, dice: true }));
  const p = (v) => Math.round(out.filter((x) => x.verdict === v).length / n * 100);
  return { gross: med(out.map((x) => x.gross)), v: ['bomb', 'broke even', 'profitable', 'smash'].map(p) };
};
const M = (x) => '€' + Math.round(x / 1e6) + 'm';
const pad = (x, n) => String(x).padStart(n);

console.log(`GENRE AUDIT · market read from ${LIVES} lives with nobody playing`);
console.log('  usual appetite: ' + G.map((g) => `${g} ${MARKET[g].toFixed(2)}`).join(' · '));
console.log('  usual feature budget: ' + G.map((g) => `${g} €${BUDGET[g]}m`).join(' · '));

// ── 1 ─────────────────────────────────────────────────────────────────────────
const SAME = { rating: 60, fame: 50, hype: 15, budget: 40 };
console.log(`\n1. THE SAME FILM, ONLY THE GENRE CHANGED — rating 6.0, fame 50, hype 15, €40m, no co-star, standard campaign`);
console.log(`   break-even ${M(R.breakEvenFor({ scale: 'feature', budget: 40, campaignTier: 'standard' }))}, smash from ${M(2 * R.breakEvenFor({ scale: 'feature', budget: 40, campaignTier: 'standard' }))}`);
console.log('   genre     | neutral market (appetite 1.00): demand · crowd · legs · gross · verdict · dice: median, bomb/even/profit/smash | usual market: appetite · gross · dice: median, b/e/p/s');
for (const g of G) {
  const a = at({ ...SAME, genre: g, appetite: 1 }), sa = spread({ ...SAME, genre: g, appetite: 1 });
  const b = at({ ...SAME, genre: g, appetite: MARKET[g] }), sb = spread({ ...SAME, genre: g, appetite: MARKET[g] });
  console.log(`   ${g.padEnd(9)} | ${pad(a.demand, 3)} · ${pad(a.reception, 3)} · ${a.legs.toFixed(2)} · ${pad(M(a.gross), 5)} · ${a.verdict.padEnd(10)} · ${pad(M(sa.gross), 5)} ${sa.v.map((x) => pad(x, 2)).join('/')}`
    + ` | ${MARKET[g].toFixed(2)} · ${pad(M(b.gross), 5)} · ${pad(M(sb.gross), 5)} ${sb.v.map((x) => pad(x, 2)).join('/')}`);
}

// ── 2 ─────────────────────────────────────────────────────────────────────────
console.log('\n2. WHAT EACH PLACE THE GENRE ENTERS IS WORTH to that same film, against the same film with no genre at all');
console.log('   APPEAL  — demandCore: demand × (0.45 + 0.55 × APPEAL), before the opening raises demand to 1.45');
console.log('   CROWD   — audienceFor: the crowd\'s score ± a genre table, which sets word of mouth and so the run (legs)');
console.log('   MARKET  — demandCore: demand × (0.52 + 0.48 × appetite); the appetite is fed every year by how the genre\'s pictures did');
console.log('   COST    — budget.js: where the genre places the budget; break-even, the campaign it buys and how wide it opens');
console.log('   genre     |  APPEAL ×  |  CROWD ×  |  MARKET × | together (gross) |  COST: ratio at its usual budget against €40m |  all four on the ratio');
const none = at({ ...SAME, genre: 'Crime', appetite: 1, noAppeal: true, noCrowd: true });
for (const g of G) {
  const ap = at({ ...SAME, genre: g, appetite: 1, noCrowd: true }).gross / none.gross;
  const cr = at({ ...SAME, genre: g, appetite: 1, noAppeal: true }).gross / none.gross;
  const mk = at({ ...SAME, genre: g, appetite: MARKET[g], noAppeal: true, noCrowd: true }).gross / none.gross;
  const all = at({ ...SAME, genre: g, appetite: MARKET[g] });
  const cost = at({ ...SAME, genre: g, appetite: 1, noAppeal: true, noCrowd: true, budget: BUDGET[g] }).ratio / none.ratio;
  const four = at({ ...SAME, genre: g, appetite: MARKET[g], budget: BUDGET[g] }).ratio / none.ratio;
  console.log(`   ${g.padEnd(9)} |  ${ap.toFixed(2)}      |  ${cr.toFixed(2)}     |  ${mk.toFixed(2)}     |  ${(all.gross / none.gross).toFixed(2)}            |  ${cost.toFixed(2)}                                         |  ${four.toFixed(2)}`);
}

// ── 3 ─────────────────────────────────────────────────────────────────────────
console.log('\n3. ONE REPRESENTATIVE STANDARD FEATURE PER GENRE, TRACED — rating 7.0, fame 75, hype 25, its genre\'s usual budget, the usual market');
const REP = { rating: 70, fame: 75, hype: 25 };
for (const g of G) {
  const budget = BUDGET[g], appetite = MARKET[g];
  const cast = R.castDraw([REP.fame, 0]) * 0.52, buzz = REP.hype * 0.28;
  const camp = Math.min(26, Math.sqrt(R.campaignSpend({ scale: 'feature', campaignTier: 'standard', budget })) * 2.1);
  const muscle = MUSCLE_FEATURE * 0.22, d0 = 6 + cast + buzz + camp + muscle;
  const fm = 0.52 + appetite * 0.48, fa = 0.45 + (R.APPEAL[g] || 1) * 0.55;
  const f = at({ ...REP, genre: g, budget, appetite });
  const crowd0 = at({ ...REP, genre: g, budget, appetite, noCrowd: true }).reception;
  const reach = R.reachOf({ scale: 'feature', budget });
  console.log(`   ${g} (€${budget}m)`);
  console.log(`     demand  6 + cast ${cast.toFixed(1)} + hype ${buzz.toFixed(1)} + campaign ${camp.toFixed(1)} + muscle ${muscle.toFixed(1)} = ${d0.toFixed(1)}`
    + `  × market ${fm.toFixed(3)} (appetite ${appetite.toFixed(2)})  × APPEAL ${fa.toFixed(3)} (${R.APPEAL[g]})  = ${f.demand}`);
  console.log(`     opening ${f.demand}^1.45 × 0.46 × width 0.34 × reach ${reach.toFixed(2)} = ${M(f.opening * 1e6)}`
    + `   ·  crowd ${crowd0} ${f.reception - crowd0 >= 0 ? '+' : '−'} ${Math.abs(f.reception - crowd0)} (CROWD) = ${f.reception}, word ${f.word.toFixed(1)}, legs ×${f.legs.toFixed(2)}`);
  console.log(`     gross ${M(f.gross)}  against break-even ${M(f.need)} = ${f.ratio.toFixed(2)}× → ${f.verdict}   (with the dice: ${spread({ ...REP, genre: g, budget, appetite }).v.join('/')} b/e/p/s)`);
}
