// Everything Maxi asked to see, measured rather than described.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const PR = await import(P + 'systems/career/production.js');
const K = await import(P + 'systems/career/castings.js');
const A = await import(P + 'systems/career/awards.js');
const ST = await import(P + 'systems/career/stability.js');
const S = await import(P + 'systems/meta/status.js');
const T = await import(P + 'systems/career/training.js');
const W = await import(P + 'systems/life/work.js');

const M = (n) => n >= 1e6 ? '€' + (n / 1e6).toFixed(1) + 'm' : '€' + Math.round(n / 1000) + 'k';
function actor(over = {}) {
  const s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true,
    housing: 'flat', cash: 20000, alive: true, ap: 3, apMax: 3, apMaxEff: 3, acting: 40,
    fame: 0, peakFame: 0, respect: 20, offers: [], castingPool: [], submissions: [],
    running: [], releases: [], laterOffers: [], frozen: [] });
  Object.assign(s, over);
  return s;
}

// ── 1. the ladder: how long does it take to become somebody ──────────────────
console.log('════ THE LADDER ════');
console.log('  tiers: ' + S.FAME_TIERS.map((t) => `${t.label} @${t.min}`).join(' · '));
function career(years = 30) {
  let s = actor();
  const firstAt = {};
  for (let m = 0; m < years * 12; m++) {
    s.bigMoment = null; s.pendingArc = null;
    if (!s.job && (s.fame || 0) < 22) { const j = W.availableJobs(s).filter((x) => x.slots === 1).slice(-1)[0]; if (j) W.takeJob(s, j.id); }
    if (s.job && (s.fame || 0) > 35) W.quitJob(s);
    const key = T.trainingKey(s);
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
    s = advanceMonth(s);
    if (!s.alive) break;
    const tier = S.fameTier(s.fame).id;
    if (!firstAt[tier]) firstAt[tier] = s.ageY;
  }
  return { firstAt, s };
}
const runs = [];
for (let i = 0; i < 25; i++) runs.push(career());
const fames = runs.map(r => Math.round(r.s.fame)).sort((a,b)=>a-b);
const creds = runs.map(r => (r.s.filmography||[]).length).sort((a,b)=>a-b);
const wh = runs.map(r => r.s.worldHits||0);
console.log('  final fame across 25 careers: ' + fames.join(', '));
console.log('  credits: median ' + creds[12] + ' (range ' + creds[0] + '-' + creds[24] + ')  ·  world hits total ' + wh.reduce((a,b)=>a+b,0));
for (const id of ['rising', 'known', 'star', 'alist', 'icon']) {
  const ages = runs.map((r) => r.firstAt[id]).filter(Boolean).sort((a, b) => a - b);
  const label = (S.FAME_TIERS.find((t) => t.id === id) || {}).label || id;
  console.log(`  ${label.padEnd(12)} reached by ${ages.length}/25 · earliest ${ages[0] ?? '—'} · median age ${ages[Math.floor(ages.length / 2)] ?? '—'}`);
}

