// Same seed, same life. Math.random is replaced by a seeded generator before the game is loaded, a
// few careers are played by the same bot as probe_verdicts.mjs, and every credit is printed. Run it
// on two trees: a change that is meant to move nothing (Media Ecosystem stage 1) must print the same
// lives to the last digit. Anything that draws one extra random number shifts everything after it,
// which is the point — that is how an "invisible" change is caught.
//   node tests/probes/probe_same_life.mjs <path to extracted/src/> [careers] [years] > lives.txt
import { pathToFileURL } from 'node:url';
let seed = 0x9e3779b9;
const mulberry = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry;
const P = pathToFileURL(process.argv[2]).href;
const CAREERS = Number(process.argv[3] || 4), YEARS = Number(process.argv[4] || 30);
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const PR = await import(P + 'systems/career/production.js');
const K = await import(P + 'systems/career/castings.js');
const T = await import(P + 'systems/career/training.js');
const W = await import(P + 'systems/life/work.js');
const OF = await import(P + 'systems/career/offers.js');

for (let k = 0; k < CAREERS; k++) {
  seed = 1000 + k * 7919;
  let s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true, housing: 'flat', cash: 20000, alive: true, ap: 100, apMax: 100, apMaxEff: 100,
    acting: 40, fame: 0, peakFame: 0, respect: 20, offers: [], castingPool: [], submissions: [], running: [], releases: [], laterOffers: [], frozen: [] });
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
    // Through the real door this time (offers.js acceptOffer), so both roads a project can take —
    // a set, or a day's work in one click — are on the record.
    if ((s.offers || []).length && !s.production) { const o = [...s.offers].sort((a, b) => (b.salary || 0) - (a.salary || 0))[0]; OF.acceptOffer(s, o.id); s.offers = (s.offers || []).filter((x) => x.id !== o.id); }
    let g = 0; while ((s.ap || 0) > 0 && g++ < 5) { if (s.production) PR.rehearse(s); else break; }
    s = advanceMonth(s);
    if (!s.alive) break;
  }
  console.log(`== career ${k} · ${s.year} · age ${s.ageY} · fame ${Math.round(s.fame || 0)} · cash ${Math.round(s.cash || 0)} · credits ${(s.filmography || []).length}`);
  for (const c of [...(s.filmography || [])].reverse()) {
    console.log([c.year, c.title, c.type, c.scale || '', c.role, Math.round(c.rating || 0), c.verdict || '', Math.round(c.boxOffice || 0), c.viewers || 0, c.endViewers || 0,
      c.season || 0, c.part || 0, Math.round(c.salary || 0), c.minor ? 'minor' : '', c.renewal || ''].join(' | '));
  }
}
