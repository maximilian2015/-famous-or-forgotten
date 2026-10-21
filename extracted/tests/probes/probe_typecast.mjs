// The typecast's turn-away, measured on careers — written for the doubled filter (21 Oct 2026):
// refreshCastingPool ran the same "a label turns things away" block twice in a row, so a part against
// type survived 0.48 × 0.48 = 23% of the time, not 48%. Run on two trees, before and after.
//   node tests/probes/probe_typecast.mjs <path to extracted/src/> [careers] [label]
// Same bot as probe_awards.mjs (the ordinary one: best-paid offer). Every month, after the board is
// drawn: how many listings, and — while a label is active — what share of them is against type
// (typeFit ≤ −0.5, the filter's own test). At the end: the genre and market mix of the work, how many
// careers carried a label and later lost it, and how the careers came out.
import { pathToFileURL } from 'node:url';
const P = pathToFileURL(process.argv[2]).href;
const CAREERS = Number(process.argv[3] || 40), LABEL = process.argv[4] || '';
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const PR = await import(P + 'systems/career/production.js');
const K = await import(P + 'systems/career/castings.js');
const T = await import(P + 'systems/career/training.js');
const W = await import(P + 'systems/life/work.js');
const TC = await import(P + 'systems/meta/typecast.js');
const { computeLegacy } = await import(P + 'systems/meta/legacy.js');
const film = new Set(['small', 'festival', 'indie', 'feature', 'blockbuster']);
const rows = [];
let boardMonths = 0, boardListings = 0, labelledMonths = 0, labelledListings = 0, againstListings = 0;
for (let k = 0; k < CAREERS; k++) {
  let s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true, housing: 'flat', cash: 20000, alive: true, ap: 100, apMax: 100, apMaxEff: 100,
    acting: 40, fame: 0, peakFame: 0, respect: 20, offers: [], castingPool: [], submissions: [], running: [], releases: [], laterOffers: [], frozen: [] });
  const everActive = new Set();
  for (let m = 0; m < 34 * 12; m++) {
    s.bigMoment = null; s.pendingArc = null;
    if (!s.job && (s.fame || 0) < 22) { const j = W.availableJobs(s).filter((x) => x.slots === 1).slice(-1)[0]; if (j) W.takeJob(s, j.id); }
    if (s.job && (s.fame || 0) > 35) W.quitJob(s);
    const best = [...T.SCHOOLS].reverse().find((sc) => (s.cash || 0) > sc.cost * 4);
    if (best && (s.ap || 0) > 1) T.train(s, best.id);
    K.refreshCastingPool(s);
    // The board as the player sees it this month (the streaming shelf is not filtered by type).
    const board = (s.castingPool || []).filter((c) => c.shelf !== 'stream');
    boardMonths++; boardListings += board.length;
    if (TC.activeLabels(s).length) {
      labelledMonths++; labelledListings += board.length;
      againstListings += board.filter((c) => TC.typeFit(s, { genre: c.genre, scale: c.scale, type: c.type, perEpisode: !!c.perEpisode }) <= -0.5).length;
      for (const id of TC.activeLabels(s)) everActive.add(id);
    }
    if (!s.production && !(s.offers || []).length && !(s.submissions || []).length) {
      const pool = (s.castingPool || []).map((c) => ({ c, o: K.castingChance(s, c) })).sort((a, b) => b.o - a.o);
      if (pool[0] && (s.ap || 0) > 0) K.auditionFor(s, pool[0].c.id, 78);
    }
    if ((s.offers || []).length && !s.production) { const o = [...s.offers].sort((a, b) => (b.salary || 0) - (a.salary || 0))[0]; PR.startProduction(s, o); s.offers = s.offers.filter((x) => x.id !== o.id); }
    let g = 0; while ((s.ap || 0) > 0 && g++ < 5) { if (s.production) PR.rehearse(s); else break; }
    s = advanceMonth(s);
    if (!s.alive) break;
  }
  const work = (s.filmography || []).filter((c) => !c.minor);
  const genres = {}; for (const c of work) genres[c.genre] = (genres[c.genre] || 0) + 1;
  const L = computeLegacy(s);
  const endActive = new Set(TC.activeLabels(s));
  rows.push({
    work: work.length, genres,
    film: work.filter((c) => film.has(c.scale)).length, streaming: work.filter((c) => c.streaming).length,
    tv: work.filter((c) => !film.has(c.scale) && !c.streaming).length,
    labelled: everActive.size > 0, escaped: [...everActive].some((id) => !endActive.has(id)),
    endLabels: endActive.size, fame: s.fame || 0, peak: s.peakFame || 0, points: L.points || 0,
    askers: ((s.awards || {}).wins || []).filter((w) => w.category !== 'picture').length,
  });
}
const sum = (f) => rows.reduce((n, r) => n + f(r), 0);
const avg = (f) => sum(f) / rows.length;
const pct = (a, b) => (b ? Math.round(a / b * 1000) / 10 + '%' : '—');
console.log(`TYPECAST ${LABEL} · ${CAREERS} careers × 34 years`);
console.log(`  board: ${(boardListings / boardMonths).toFixed(1)} listings a month · while a label is active (${pct(labelledMonths, boardMonths)} of months): ${(labelledListings / Math.max(1, labelledMonths)).toFixed(1)} a month, ${pct(againstListings, labelledListings)} of them against type`);
const allGenres = {}; for (const r of rows) for (const [g, n] of Object.entries(r.genres)) allGenres[g] = (allGenres[g] || 0) + n;
const W0 = sum((r) => r.work);
console.log(`  genres of the work: ${Object.entries(allGenres).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} ${pct(n, W0)}`).join(' · ')}`);
console.log(`  market mix: film ${pct(sum((r) => r.film), W0)} · television ${pct(sum((r) => r.tv), W0)} · streaming ${pct(sum((r) => r.streaming), W0)} · credits a career ${(W0 / rows.length).toFixed(1)}`);
console.log(`  labels: careers that ever carried one ${rows.filter((r) => r.labelled).length}/${rows.length} · of those, lost one by the end ${rows.filter((r) => r.escaped).length} · labels at the end, average ${avg((r) => r.endLabels).toFixed(2)}`);
console.log(`  careers: fame at the end ${avg((r) => r.fame).toFixed(1)} · peak ${avg((r) => r.peak).toFixed(1)} · A-list reached ${rows.filter((r) => r.peak >= 75).length}/${rows.length} · legacy points ${Math.round(avg((r) => r.points))} · Askers ${sum((r) => r.askers)}`);
