// What a career's shelf looks like, on two trees: Asker nominations and wins, and the series award's.
// Written for the series award (20 Oct 2026): the Asker became films only, every series went to its own
// award. Same bot as probe_verdicts.mjs.
//   node tests/probes/probe_awards.mjs <path to extracted/src/> [careers] [label]
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
const rows = [];
for (let k = 0; k < CAREERS; k++) {
  let s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true, housing: 'flat', cash: 20000, alive: true, ap: 100, apMax: 100, apMaxEff: 100,
    acting: 40, fame: 0, peakFame: 0, respect: 20, offers: [], castingPool: [], submissions: [], running: [], releases: [], laterOffers: [], frozen: [] });
  for (let m = 0; m < 34 * 12; m++) {
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
    s = advanceMonth(s);
    if (!s.alive) break;
  }
  const tvShare = (s.filmography || []).filter((c) => !c.minor && ['episode', 'recurring', 'prestige'].includes(c.scale)).length / Math.max(1, (s.filmography || []).filter((c) => !c.minor).length);
  const a = s.awards || {}, z = s.seriesAwards || {};
  rows.push({ tvShare, askerNoms: (a.nominations || []).length, askerWins: (a.wins || []).filter((w) => w.category !== 'picture').length,
    seriesNoms: (z.nominations || []).length, seriesWins: (z.wins || []).filter((w) => w.category !== 'picture').length, fame: s.fame || 0 });
}
const sum = (f, l = rows) => l.reduce((n, r) => n + f(r), 0);
const show = (name, l) => console.log(`  ${name.padEnd(28)} careers ${String(l.length).padStart(2)} · Asker noms ${sum((r) => r.askerNoms, l)} wins ${sum((r) => r.askerWins, l)} (careers with a win ${l.filter((r) => r.askerWins).length}) · series noms ${sum((r) => r.seriesNoms, l)} wins ${sum((r) => r.seriesWins, l)} (careers with a win ${l.filter((r) => r.seriesWins).length})`);
console.log(`AWARDS ${LABEL} · ${CAREERS} careers × 34 years`);
show('all', rows);
show('mostly film (TV < 25%)', rows.filter((r) => r.tvShare < 0.25));
show('a real TV share (≥ 25%)', rows.filter((r) => r.tvShare >= 0.25));
