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
for (const id of ['rising', 'known', 'star', 'alist', 'icon']) {
  const ages = runs.map((r) => r.firstAt[id]).filter(Boolean).sort((a, b) => a - b);
  const label = (S.FAME_TIERS.find((t) => t.id === id) || {}).label || id;
  console.log(`  ${label.padEnd(12)} reached by ${ages.length}/25 · earliest ${ages[0] ?? '—'} · median age ${ages[Math.floor(ages.length / 2)] ?? '—'}`);
}

// ── 2. what wins an Asker ────────────────────────────────────────────────────
console.log('\n════ WHAT THE ASKER ACTUALLY REWARDS ════');
const kinds = [
  ['a prestige indie drama', { scale: 'indie', genre: 'Drama', prestigeScore: 78, tier: 'lead' }],
  ['a studio feature drama', { scale: 'feature', genre: 'Drama', prestigeScore: 65, tier: 'lead' }],
  ['a blockbuster (sci-fi)', { scale: 'blockbuster', genre: 'Sci-Fi', prestigeScore: 88, tier: 'tentpole' }],
  ['a horror hit', { scale: 'feature', genre: 'Horror', prestigeScore: 70, tier: 'lead' }],
  ['a prestige tv season', { scale: 'prestige', genre: 'Drama', prestigeScore: 80, tier: 'lead' }],
  ['a franchise sequel', { scale: 'blockbuster', genre: 'Sci-Fi', prestigeScore: 62, tier: 'tentpole' }],
];
for (const [label, c] of kinds) {
  const at88 = A.awardStrength({ ...c, rating: 88 });
  const at80 = A.awardStrength({ ...c, rating: 80 });
  console.log(`  ${label.padEnd(24)} rated 8.8 → strength ${at88.toFixed(0).padStart(4)}   rated 8.0 → ${at80.toFixed(0).padStart(3)}`);
}
console.log('  (the rest of the field draws between ' + 50 + ' and ' + 305 + ')');

// ── 3. money: cheap work against the big stuff ───────────────────────────────
console.log('\n════ WHAT EACH KIND OF JOB PAYS ════');
for (const tier of ['unknown', 'rising', 'known', 'star', 'alist', 'icon']) {
  const fake = { fame: (S.FAME_TIERS.find((t) => t.id === tier) || { min: 0 }).min };
  const row = ['gig', 'ad', 'film_indie', 'film_studio', 'film_tentpole']
    .map((m) => { const b = S.quoteBand(fake, m); return b ? M(b[1]) : '—'; });
  console.log(`  ${tier.padEnd(8)} gig ${row[0].padStart(7)} · ad ${row[1].padStart(7)} · indie ${row[2].padStart(7)} · studio ${row[3].padStart(7)} · tentpole ${row[4].padStart(7)}`);
}

// ── 4. how often the money walks ─────────────────────────────────────────────
console.log('\n════ PROJECTS THAT STOP ════');
for (const scale of ['blockbuster', 'feature', 'indie', 'small']) {
  let froze = 0, died = 0, finished = 0;
  for (let i = 0; i < 400; i++) {
    const s = actor({ fame: 45 });
    const stab = ST.rollStability(scale);
    PR.startProduction(s, { id: 'x', projectTitle: 'P' + i, role: 'Lead', type: 'Feature Film',
      genre: 'Drama', salary: 1e6, months: scale === 'blockbuster' ? 12 : scale === 'feature' ? 6 : 3,
      tier: 'lead', scale, prestigeScore: 60, stability: stab });
    for (let m = 0; m < 16 && s.production; m++) { s.month++; PR.productionTick(s); }
    if ((s.frozen || []).length) froze++;
    else if (!s.production && !(s.releases || []).length) died++;
    else finished++;
  }
  const band = ST.stabilityBand(Math.round((ST.rollStability(scale) + ST.rollStability(scale)) / 2));
  console.log(`  ${scale.padEnd(12)} typical backing "${band.label}" · froze ${(froze / 4).toFixed(0)}% · collapsed ${(died / 4).toFixed(0)}% · finished ${(finished / 4).toFixed(0)}%`);
}

// ── 5. do frozen projects ever come back? ────────────────────────────────────
console.log('\n════ DO FROZEN PROJECTS COME BACK? ════');
let back = 0, dead = 0, waiting = 0;
for (let i = 0; i < 200; i++) {
  let s = actor({ fame: 50 });
  PR.startProduction(s, { id: 'f', projectTitle: 'Frozen One', role: 'Lead', type: 'Feature Film',
    genre: 'Drama', salary: 1e6, months: 6, tier: 'lead', scale: 'indie', prestigeScore: 60, stability: 40 });
  ST.freezeProject(s, s.production);
  for (let m = 0; m < 60; m++) { s.bigMoment = null; s = advanceMonth(s); if (!s.alive) break; }
  if ((s.offers || []).some((o) => o.kind === 'thaw') || (s.releases || []).length || s.production) back++;
  else if (!(s.frozen || []).length) dead++;
  else waiting++;
}
console.log(`  of 200 frozen indies, after five years: ${back} came back · ${dead} declared dead · ${waiting} still sitting`);
