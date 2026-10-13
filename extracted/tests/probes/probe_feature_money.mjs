// "€216m on a €90m film, rated 5.9, BROKE EVEN — and ★ HIT next to it." Three questions, measured
// on the production code, nothing changed:
//   1. how often a film is a HIT and only broke even (or bombed), and which rule says so;
//   2. what a €90m feature takes at a forced rating of 5, 6, 7 and 8;
//   3. what decides a film's budget, by genre and scale.
//
// The features are captured from played careers at the month they open, with the demand the
// game actually computed for them (rel._demand — fame, hype, campaign, genre appetite, the
// casting question and the franchise are all inside it, and none of them depend on quality).
// The rating sweep then reruns ONLY the stages that read quality — openingFor's dice, legsFor,
// expansionFor — through the real functions. The crowd's number moves with the forced rating
// by audienceFor's own slope (0.55), so a 5.0 is not given an 8.0's audience.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const PR = await import(P + 'systems/career/production.js');
const K = await import(P + 'systems/career/castings.js');
const T = await import(P + 'systems/career/training.js');
const W = await import(P + 'systems/life/work.js');
const R = await import(P + 'systems/career/release.js');
const HY = await import(P + 'systems/meta/hype.js');
const MK = await import(P + 'systems/meta/market.js');
const TC = await import(P + 'systems/meta/typecast.js');
const KF = await import(P + 'systems/meta/knownFor.js');
const WD = await import(P + 'systems/world/world.js');

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

const shots = [];      // the player's features, at the month they opened
const credits = [];    // every finished film credit, for the HIT audit
const worldF = [];     // the rest of the industry's features
const scaleMix = [];   // every film made, player and world, for the budget question
function career(k) {
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
    if ((s.offers || []).length && !s.production) {
      const o = [...s.offers].sort((a, b) => (b.salary || 0) - (a.salary || 0))[0];
      PR.startProduction(s, o); s.offers = s.offers.filter((x) => x.id !== o.id);
    }
    let g = 0;
    while ((s.ap || 0) > 0 && g++ < 5) { if (s.production) PR.rehearse(s); else break; }
    // The inputs as they stand the month before it opens. The release objects are shared with
    // the next state (advanceMonth copies shallowly), so open() writes its stages onto these.
    const pre = new Map((s.releases || []).filter((r) => R.isFilm(r.scale)).map((r) => [r, {
      fame: s.fame || 0, hype: HY.hype(s), scandal: HY.hypeSource(s) === 'scandal',
      appetite: MK.appetiteFor(s, r.genre), anticipation: TC.castingExpectation(s, r) }]));
    s = advanceMonth(s);
    if (!s.alive) break;
    for (const [r, inp] of pre) {
      if (r._demand == null || r._probeSeen) continue;
      r._probeSeen = true;
      scaleMix.push({ who: 'you', scale: r.scale, genre: r.genre });
      if (r.scale === 'feature') shots.push({ ...inp, career: k, month: s.month, genre: r.genre, rating: r.rating, reception: r.reception,
        campaignTier: r.campaignTier, part: r.part || 1, withFame: r.withFame || 0, demand: r._demand, opening: r._opening,
        legs: r._legs, window: r._window, against: r._against, gross: r.finalGross || 0, title: r.title });
    }
  }
  for (const c of s.filmography || []) {
    if (!c.running && c.verdict && R.isFilm(c.scale) && !c.minor) credits.push({ c, hit: KF.hitWeight(c, s), flop: KF.isFlop(c) });
  }
  // The rest of the industry's year, priced by world.js itself. makeWorldFilm spends the genre
  // market as it goes, so the market is put back after every draw — a probe must not drift it.
  WD.ensureWorld(s);
  const actors = WD.activeActors(s);
  const saved = JSON.stringify(s.market || null);
  for (let i = 0; i < 600 && actors.length; i++) {
    const a = actors[Math.floor(Math.random() * actors.length)];
    const f = WD.makeWorldFilm(s, a, s.year, new Set());
    s.market = JSON.parse(saved);
    scaleMix.push({ who: 'world', scale: f.scale, genre: f.genre });
    if (f.scale === 'feature') worldF.push({ rating: f.rating, gross: f.gross, genre: f.genre });
  }
}
const t0 = Date.now();
for (let i = 0; i < CAREERS; i++) career(i);

// ── helpers ───────────────────────────────────────────────────────────────────
const sorted = (a) => a.slice().sort((x, y) => x - y);
const q = (a, p) => { const v = sorted(a); return v.length ? v[Math.min(v.length - 1, Math.floor(v.length * p))] : 0; };
const pct = (a, f) => (a.length ? Math.round(a.filter(f).length / a.length * 100) : 0);
const M = (n) => '€' + Math.round(n / 1e6) + 'm';
const pad = (x, n) => String(x).padStart(n);
const clamp = (v) => Math.max(0, Math.min(100, v));
const NEED = { minimal: R.breakEvenFor({ scale: 'feature', campaignTier: 'minimal' }), standard: R.breakEvenFor({ scale: 'feature', campaignTier: 'standard' }),
  major: R.breakEvenFor({ scale: 'feature', campaignTier: 'major' }), event: R.breakEvenFor({ scale: 'feature', campaignTier: 'event' }) };

console.log(`${CAREERS} careers × ${YEARS} years, ${((Date.now() - t0) / 1000).toFixed(0)}s · ${shots.length} player features captured at opening, ${worldF.length} world features`);
console.log(`a €90m feature has to take: minimal ${M(NEED.minimal)} · standard ${M(NEED.standard)} · major ${M(NEED.major)} · event ${M(NEED.event)}`);

// ── 0. the captured stages reproduce the gross ────────────────────────────────
{
  let worst = 0;
  for (const x of shots) { const g = x.opening * x.legs * 1e6; worst = Math.max(worst, Math.abs(g - x.gross) / Math.max(1, x.gross)); }
  console.log(`${worst < 0.01 ? 'ok  ' : 'FAIL'} opening × legs reproduces every captured gross (worst ${(worst * 100).toFixed(2)}%)`);
}

// ── 1. the inputs a player's feature actually opens with ─────────────────────
console.log('\n1. WHAT A PLAYER FEATURE OPENS WITH (captured, n=' + shots.length + ')');
const row = (name, a, f = (v) => v.toFixed(1)) => console.log(`   ${name.padEnd(22)} p10 ${pad(f(q(a, 0.1)), 7)}  median ${pad(f(q(a, 0.5)), 7)}  p90 ${pad(f(q(a, 0.9)), 7)}`);
row('lead fame', shots.map((x) => x.fame));
row('hype (s.media)', shots.map((x) => x.hype));
row('genre appetite', shots.map((x) => x.appetite), (v) => v.toFixed(2));
row('anticipation', shots.map((x) => x.anticipation), (v) => v.toFixed(2));
row('co-star fame', shots.map((x) => x.withFame));
row('demand index', shots.map((x) => x.demand));
row('opening (€m)', shots.map((x) => x.opening));
row('legs (×)', shots.map((x) => x.legs), (v) => v.toFixed(2));
row('rating', shots.map((x) => x.rating), (v) => (v / 10).toFixed(1));
row('audience', shots.map((x) => x.reception), (v) => (v / 10).toFixed(1));
console.log(`   campaign: ${['minimal', 'standard', 'major', 'event'].map((t) => `${t} ${pct(shots, (x) => x.campaignTier === t)}%`).join(' · ')}`);
console.log(`   opened against something big: ${pct(shots, (x) => x.against < 1)}% · sequels: ${pct(shots, (x) => x.part > 1)}%`);

// ── 2. the rating sweep ───────────────────────────────────────────────────────
const RUNS = 25;
console.log(`\n2. THE SAME ${shots.length} FEATURES, RATING FORCED (each re-rolled ${RUNS}× through openingFor/legsFor/expansionFor)`);
console.log('   rating   median     p10     p90   >€100m  >€200m  >€300m  >need  ≥broke-even  profitable  smash   ★HIT(money)');
const sweep = {};
for (const rating of [50, 60, 70, 80]) {
  const gross = [], ratio = [], hit = [];
  for (const x of shots) {
    for (let i = 0; i < RUNS; i++) {
      const rel = { scale: 'feature', genre: x.genre, rating, reception: clamp(x.reception + (rating - x.rating) * 0.55),
        campaignTier: x.campaignTier, part: x.part, _window: x.window };
      const g = R.openingFor({ month: x.month }, rel, x.demand) * R.legsFor(rel) * R.expansionFor(rel) * 1e6;
      const need = R.breakEvenFor(rel);
      const v = R.verdictOf({ scale: 'feature', boxOffice: g, campaignTier: x.campaignTier });
      gross.push(g); ratio.push(g / need);
      // The money half of hitWeight: a smash, €200m+, or a 7.5. Ranks and nominations left out.
      hit.push({ g, v, hit: v === 'smash' || g >= 200e6 || rating >= 75 });
    }
  }
  sweep[rating] = { gross, ratio, hit };
  console.log(`   ${(rating / 10).toFixed(1).padStart(5)}  ${pad(M(q(gross, 0.5)), 7)} ${pad(M(q(gross, 0.1)), 7)} ${pad(M(q(gross, 0.9)), 7)}  ${pad(pct(gross, (g) => g > 100e6) + '%', 6)}  ${pad(pct(gross, (g) => g > 200e6) + '%', 6)}  ${pad(pct(gross, (g) => g > 300e6) + '%', 6)}  ${pad(pct(ratio, (r) => r >= 1) + '%', 5)}  ${pad(pct(ratio, (r) => r >= 0.7) + '%', 11)}  ${pad(pct(ratio, (r) => r >= 1.25) + '%', 10)}  ${pad(pct(ratio, (r) => r >= 2) + '%', 5)}   ${pad(pct(hit, (h) => h.hit) + '%', 5)}`);
}
// The same at 5.9 / 6.7, split by fame, because a fame-80 lead and a fame-40 lead are not the
// same picture and "a mediocre feature" averages the two.
console.log('\n   at 5.9 with a 6.7 audience (This Lantern), by the lead\'s fame at opening:');
for (const [lo, hi] of [[0, 39], [40, 59], [60, 79], [80, 100]]) {
  const g = [], r = [];
  for (const x of shots.filter((y) => y.fame >= lo && y.fame <= hi)) {
    for (let i = 0; i < RUNS; i++) {
      const rel = { scale: 'feature', genre: x.genre, rating: 59, reception: 67, campaignTier: x.campaignTier, part: x.part, _window: x.window };
      const gg = R.openingFor({ month: x.month }, rel, x.demand) * R.legsFor(rel) * 1e6;
      g.push(gg); r.push(gg / R.breakEvenFor(rel));
    }
  }
  if (!g.length) { console.log(`     fame ${lo}-${hi}: none`); continue; }
  console.log(`     fame ${pad(lo + '-' + hi, 6)} n=${pad(g.length / RUNS, 4)}  median ${pad(M(q(g, 0.5)), 6)}  p10 ${pad(M(q(g, 0.1)), 6)}  p90 ${pad(M(q(g, 0.9)), 6)}  >€200m ${pad(pct(g, (v) => v > 200e6) + '%', 4)}  ≥broke-even ${pad(pct(r, (v) => v >= 0.7) + '%', 4)}  profitable ${pad(pct(r, (v) => v >= 1.25) + '%', 4)}`);
}

// ── 2b. what the features really did, unforced ────────────────────────────────
console.log('\n   as played (no forcing), by rating band:');
for (const [lo, hi] of [[0, 49], [50, 59], [60, 69], [70, 79], [80, 100]]) {
  const xs = shots.filter((x) => x.rating >= lo && x.rating <= hi && x.gross > 0);
  if (!xs.length) { console.log(`     ${lo / 10}-${(hi + 1) / 10}: none`); continue; }
  const g = xs.map((x) => x.gross), r = xs.map((x) => x.gross / R.breakEvenFor({ scale: 'feature', campaignTier: x.campaignTier }));
  console.log(`     rated ${(lo / 10).toFixed(1)}-${(hi / 10 + 0.09).toFixed(1)} n=${pad(xs.length, 4)}  median ${pad(M(q(g, 0.5)), 6)}  p10 ${pad(M(q(g, 0.1)), 6)}  p90 ${pad(M(q(g, 0.9)), 6)}  >€200m ${pad(pct(g, (v) => v > 200e6) + '%', 4)}  ≥broke-even ${pad(pct(r, (v) => v >= 0.7) + '%', 4)}  profitable ${pad(pct(r, (v) => v >= 1.25) + '%', 4)}  smash ${pad(pct(r, (v) => v >= 2) + '%', 3)}`);
}
console.log('\n   the rest of the industry\'s features (world.js makeWorldFilm), by rating band:');
for (const [lo, hi] of [[0, 49], [50, 59], [60, 69], [70, 79], [80, 100]]) {
  const g = worldF.filter((x) => x.rating >= lo && x.rating <= hi).map((x) => x.gross);
  if (!g.length) continue;
  console.log(`     rated ${(lo / 10).toFixed(1)}-${(hi / 10 + 0.09).toFixed(1)} n=${pad(g.length, 5)}  median ${pad(M(q(g, 0.5)), 6)}  p10 ${pad(M(q(g, 0.1)), 6)}  p90 ${pad(M(q(g, 0.9)), 6)}  >€100m ${pad(pct(g, (v) => v > 100e6) + '%', 4)}  >€200m ${pad(pct(g, (v) => v > 200e6) + '%', 4)}  >€300m ${pad(pct(g, (v) => v > 300e6) + '%', 4)}`);
}

// ── 2c. why the player's features take about twice the world's ───────────────
// demandCore again from the captured inputs. They were read the month BEFORE opening, so this
// cannot match the real demand exactly (hype moves inside the tick); the match is reported so
// the ablation below is only trusted as far as it reproduces the baseline.
{
  const dem = (x, over = {}) => R.demandCore({ scale: 'feature', genre: x.genre, cast: [over.fame ?? x.fame, over.withFame ?? x.withFame],
    appetite: over.appetite ?? x.appetite, campaignTier: x.campaignTier, part: x.part,
    buzz: over.hype ?? (x.scandal ? 0 : x.hype), anticipation: over.anticipation ?? x.anticipation });
  const off = shots.map((x) => Math.abs(dem(x) - x.demand));
  console.log(`\n   why: demand rebuilt from the captured inputs is within ±3 of the real one for ${pct(off, (d) => d <= 3)}% (median miss ${q(off, 0.5)})`);
  const at59 = (fn) => { const g = []; for (const x of shots) for (let i = 0; i < RUNS; i++) {
    const rel = { scale: 'feature', genre: x.genre, rating: 59, reception: 67, campaignTier: x.campaignTier, part: x.part, _window: x.window };
    g.push(R.openingFor({ month: x.month }, rel, fn(x)) * R.legsFor(rel) * 1e6); } return g; };
  const line = (name, g) => console.log(`     ${name.padEnd(44)} median ${pad(M(q(g, 0.5)), 6)}  >€200m ${pad(pct(g, (v) => v > 200e6) + '%', 4)}  ≥€209m ${pad(pct(g, (v) => v >= NEED.major) + '%', 4)}`);
  line('rebuilt, everything as captured', at59((x) => dem(x)));
  line('without the month\'s hype', at59((x) => dem(x, { hype: 0 })));
  line('without the co-star', at59((x) => dem(x, { withFame: 0 })));
  line('without hype, co-star or casting question', at59((x) => dem(x, { hype: 0, withFame: 0, anticipation: 0 })));
  line('…and the lead at fame 50', at59((x) => dem(x, { hype: 0, withFame: 0, anticipation: 0, fame: 50 })));
  line('…and the lead at fame 30', at59((x) => dem(x, { hype: 0, withFame: 0, anticipation: 0, fame: 30 })));
  line('…and genre appetite 1.0 (a steady market)', at59((x) => dem(x, { hype: 0, withFame: 0, anticipation: 0, fame: 50, appetite: 1 })));
}

// ── 3. HIT against the verdict, on every finished film credit ────────────────
console.log(`\n3. ★ HIT (knownFor.js hitWeight > 0) AGAINST THE COMMERCIAL VERDICT, ${credits.length} finished film credits`);
for (const v of ['smash', 'profitable', 'broke even', 'bomb']) {
  const xs = credits.filter((x) => x.c.verdict === v);
  const hits = xs.filter((x) => x.hit > 0);
  // Since film-labels the money only counts when the film made it, so a film that broke even or
  // bombed can be a hit only by its reviews, the year's chart or an Asker.
  const why = { money: 0, score: 0, rank: 0, nom: 0 };
  for (const x of hits) {
    const c = x.c, sc = c.score != null ? c.score : (c.rating || 0) / 10;
    if (c.status === 'World Hit' || (c.asker || 0) > 0 || (c.nominated || 0) > 0) why.nom++;
    else if (c.verdict === 'smash' || c.verdict === 'profitable') why.money++;
    else if (sc >= 7.5) why.score++;
    else why.rank++;
  }
  console.log(`   ${v.padEnd(11)} n=${pad(xs.length, 4)}  ★HIT ${pad(hits.length, 4)} (${pct(xs, (x) => x.hit > 0)}%)  — because: made money ${why.money}, score ≥7.5 ${why.score}, year's top ten ${why.rank}, Asker/world hit ${why.nom}`);
  const money = hits.filter((x) => x.c.verdict !== 'smash' && x.c.verdict !== 'profitable' && KF.hitTags(x.c).some((t) => t.id === 'money')).length;
  if (money) console.log(`   FAIL ${money} ${v} films carry 💰 COMMERCIAL HIT`);
}
const fb = credits.filter((x) => x.c.scale === 'feature' && x.c.verdict === 'broke even');
console.log(`   features that broke even: ${fb.length}, of them ★HIT ${pct(fb, (x) => x.hit > 0)}%; blockbusters that BOMBED and are ★HIT: ${credits.filter((x) => x.c.scale === 'blockbuster' && x.c.verdict === 'bomb' && x.hit > 0).length} of ${credits.filter((x) => x.c.scale === 'blockbuster' && x.c.verdict === 'bomb').length}`);

// ── 4. the budget: what decides it ────────────────────────────────────────────
console.log('\n4. BUDGET BY GENRE AND SCALE (release.js BUDGET is one number per scale; genre is not read)');
const BUD = { small: 1, festival: 1.5, indie: 12, feature: 90, blockbuster: 220 };
for (const b of [12, 90, 220]) console.log(`   ${b === 12 ? 'indie' : b === 90 ? 'feature' : 'blockbuster'} = €${b}m for every genre: ${Object.keys(BUD).filter((k) => BUD[k] === b).join(',')} (the budget of every film is fixed by scale)`);
console.log('   share of each genre\'s films made at each budget (player + world):');
console.log('   genre      n      €1-1.5m   €12m   €90m   €220m    ≥€70m');
for (const g of MK.GENRES) {
  const xs = scaleMix.filter((x) => x.genre === g);
  if (!xs.length) continue;
  const b = (x) => BUD[x.scale] || 0;
  console.log(`   ${g.padEnd(9)} ${pad(xs.length, 5)}   ${pad(pct(xs, (x) => b(x) <= 1.5) + '%', 6)}  ${pad(pct(xs, (x) => b(x) === 12) + '%', 5)}  ${pad(pct(xs, (x) => b(x) === 90) + '%', 5)}  ${pad(pct(xs, (x) => b(x) === 220) + '%', 6)}   ${pad(pct(xs, (x) => b(x) >= 70) + '%', 5)}`);
}
