// What the films of a played career come to: every verdict, cut by scale, genre, rating, the
// lead's fame and the month's hype at opening, and the rest of the industry's films beside them.
// Run on two trees to compare (Budget V2 was judged this way): the numbers are the game's own,
// from closed credits, nothing recomputed.
//   node tests/probes/probe_verdicts.mjs [careers] [label] [featureWidth] [indieWidth]
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
const WD = await import(P + 'systems/world/world.js');

const CAREERS = Number(process.argv[2] || 30), LABEL = process.argv[3] || '', YEARS = 32;
// Optional: try other standard/indie widths without editing the game (calibration runs).
if (process.argv[4] && R.SCREENS) R.SCREENS.feature = Number(process.argv[4]);
if (process.argv[5] && R.SCREENS) R.SCREENS.indie = Number(process.argv[5]);
function actor() {
  const s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true, housing: 'flat', cash: 20000, alive: true, ap: 100, apMax: 100, apMaxEff: 100,
    acting: 40, fame: 0, peakFame: 0, respect: 20, offers: [], castingPool: [], submissions: [], running: [], releases: [], laterOffers: [], frozen: [] });
  return s;
}
const mine = [], world = [];
for (let k = 0; k < CAREERS; k++) {
  let s = actor();
  const at = new Map();   // title|year -> fame and hype the month it opened
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
    const fame = s.fame || 0, hype = HY.hypeSource(s) === 'scandal' ? 0 : HY.hype(s);
    const due = (s.releases || []).filter((r) => R.isFilm(r.scale));
    s = advanceMonth(s);
    if (!s.alive) break;
    for (const r of due) if (r._demand != null && !at.has(r.title)) at.set(r.title, { fame, hype });
  }
  for (const c of s.filmography || []) {
    if (c.running || c.minor || !c.verdict || !R.isFilm(c.scale) || c.scale === 'festival' || !(c.boxOffice > 0)) continue;
    const a = at.get(c.title) || {};
    mine.push({ scale: c.scale, genre: c.genre, rating: c.rating || 0, verdict: c.verdict, gross: c.boxOffice, needed: c.needed || 0, budget: c.budget || null, fame: a.fame ?? null, hype: a.hype ?? null, lead: !/Supporting|Victim|Elder|Grandparent/.test(c.role || '') });
  }
  WD.ensureWorld(s);
  const actors = WD.activeActors(s); const saved = JSON.stringify(s.market || null);
  for (let i = 0; i < 400 && actors.length; i++) {
    const f = WD.makeWorldFilm(s, actors[Math.floor(Math.random() * actors.length)], s.year, new Set());
    s.market = JSON.parse(saved);
    if (f.scale === 'festival') continue;
    world.push({ scale: f.scale, genre: f.genre, rating: f.rating, gross: f.gross, verdict: R.verdictOf({ scale: f.scale, boxOffice: f.gross, budget: f.budget ?? null }) });
  }
}
const V = ['bomb', 'broke even', 'profitable', 'smash'];
const pct = (l, f) => (l.length ? Math.round(l.filter(f).length / l.length * 100) : 0);
const q = (a, p) => { const v = a.slice().sort((x, y) => x - y); return v.length ? v[Math.min(v.length - 1, Math.floor(v.length * p))] : 0; };
const row = (name, l) => console.log(`   ${name.padEnd(22)} n=${String(l.length).padStart(4)}  ${V.map((v) => `${v === 'broke even' ? 'even' : v} ${String(pct(l, (f) => f.verdict === v)).padStart(2)}%`).join('  ')}   gross med €${Math.round(q(l.map((f) => f.gross), 0.5) / 1e6)}m`);
console.log(`VERDICTS ${LABEL} · ${CAREERS} careers × ${YEARS} years · ${mine.length} player films, ${world.length} world films`);
console.log('\n PLAYER, by scale');
for (const sc of ['small', 'indie', 'feature', 'blockbuster']) row(sc, mine.filter((f) => f.scale === sc));
console.log('\n PLAYER standard features, by rating');
for (const [lo, hi] of [[0, 49], [50, 59], [60, 69], [70, 100]]) row(`${(lo / 10).toFixed(1)}–${((hi + 1) / 10).toFixed(1)}`, mine.filter((f) => f.scale === 'feature' && f.rating >= lo && f.rating <= hi));
console.log('\n PLAYER standard features, by the lead\'s fame at opening');
for (const [lo, hi] of [[0, 39], [40, 69], [70, 100]]) row(`fame ${lo}–${hi}`, mine.filter((f) => f.scale === 'feature' && f.fame != null && f.fame >= lo && f.fame <= hi));
console.log('\n PLAYER standard features rated under 6.0, by fame — can a star still sell a weak film');
for (const [lo, hi] of [[0, 59], [60, 100]]) row(`<6.0, fame ${lo}–${hi}`, mine.filter((f) => f.scale === 'feature' && f.rating < 60 && f.fame != null && f.fame >= lo && f.fame <= hi));
console.log('\n PLAYER standard features, by hype at opening');
for (const [lo, hi] of [[0, 19], [20, 100]]) row(`hype ${lo}–${hi}`, mine.filter((f) => f.scale === 'feature' && f.hype != null && f.hype >= lo && f.hype <= hi));
console.log('\n PLAYER standard features, by genre');
for (const g of ['Comedy', 'Drama', 'Romance', 'Horror', 'Thriller', 'Crime', 'Musical', 'Sci-Fi']) row(g, mine.filter((f) => f.scale === 'feature' && f.genre === g));
console.log('\n PLAYER indies, by rating');
for (const [lo, hi] of [[0, 59], [60, 100]]) row(`${(lo / 10).toFixed(1)}–${((hi + 1) / 10).toFixed(1)}`, mine.filter((f) => f.scale === 'indie' && f.rating >= lo && f.rating <= hi));
const bb = mine.filter((f) => f.scale === 'blockbuster');
const bbl = bb.filter((f) => f.lead), bbs = bb.filter((f) => !f.lead);
console.log(`\n PLAYER blockbusters, your lead n=${bbl.length}: €1bn+ ${pct(bbl, (f) => f.gross >= 1e9)}% · fame at opening med ${q(bbl.map((f) => f.fame ?? 0), 0.5)} · a supporting part n=${bbs.length}: €1bn+ ${pct(bbs, (f) => f.gross >= 1e9)}%`);
console.log(`\n PLAYER blockbusters: gross median €${Math.round(q(bb.map((f) => f.gross), 0.5) / 1e6)}m · p90 €${Math.round(q(bb.map((f) => f.gross), 0.9) / 1e6)}m · €1bn+ ${pct(bb, (f) => f.gross >= 1e9)}% · budget median €${q(bb.map((f) => f.budget || 220), 0.5)}m`);
console.log('\n WORLD, by scale');
for (const sc of ['small', 'indie', 'feature', 'blockbuster']) row(sc, world.filter((f) => f.scale === sc));
console.log('\n WORLD standard features, by rating');
for (const [lo, hi] of [[0, 49], [50, 59], [60, 69], [70, 100]]) row(`${(lo / 10).toFixed(1)}–${((hi + 1) / 10).toFixed(1)}`, world.filter((f) => f.scale === 'feature' && f.rating >= lo && f.rating <= hi));
const wb = world.filter((f) => f.scale === 'blockbuster');
console.log(`\n WORLD blockbusters: €1bn+ ${pct(wb, (f) => f.gross >= 1e9)}% · gross median €${Math.round(q(wb.map((f) => f.gross), 0.5) / 1e6)}m`);
