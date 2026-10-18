// Budget V2, step 4: calibrating standard features and indies. Measurement only.
//
// The films of played careers are captured at opening with everything their demand was made of,
// then re-run under candidate settings of the two levers the calibration may touch — how wide a
// standard (or indie) release goes, release.js SCREENS, how far its budget widens that (REACH), and
// how far a feature's genre spreads its budget (squeeze) — through the real demandCore. Fame, hype and the co-star are not
// levers. The gross moves by the opening's own arithmetic (demand^1.45 × width); the run and the
// dice are the ones it had. The settings are written back afterwards and nothing is kept.
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
const WD = await import(P + 'systems/world/world.js');

const CAREERS = Number(process.argv[2] || 30), YEARS = 32;
function actor() {
  const s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true, housing: 'flat', cash: 20000, alive: true, ap: 100, apMax: 100, apMaxEff: 100,
    acting: 40, fame: 0, peakFame: 0, respect: 20, offers: [], castingPool: [], submissions: [], running: [], releases: [], laterOffers: [], frozen: [] });
  return s;
}
const films = [], worldActors = [];
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
    const pre = (s.releases || []).filter((r) => r.scale === 'feature' || r.scale === 'indie')
      .map((r) => [r, { fame: s.fame || 0, hype: HY.hype(s), scandal: HY.hypeSource(s) === 'scandal', appetite: MK.appetiteFor(s, r.genre), anticipation: TC.castingExpectation(s, r) }]);
    s = advanceMonth(s);
    if (!s.alive) break;
    for (const [r, inp] of pre) if (r._demand != null && !r._calSeen) {
      r._calSeen = true;
      films.push({ scale: r.scale, genre: r.genre, rating: r.rating, budget: r.budget, campaignTier: r.campaignTier, demand: r._demand, opening: r._opening, legs: r._legs, expansion: r._expansion,
        fame: inp.fame, hype: inp.hype, inp: { ...inp, withFame: r.withFame || 0, part: r.part || 1, lastRating: r.lastRating, appealMod: r.appealMod } });
    }
  }
  WD.ensureWorld(s); worldActors.push({ s, actors: WD.activeActors(s) });
}
const squeeze = (f, cz) => { if (cz === 1 || f.scale !== 'feature') return f.budget; const lo = 15, hi = 130; const t0 = Math.log(f.budget / lo) / Math.log(hi / lo); const t1 = 0.4 + (t0 - 0.4) * cz; return Math.round(lo * Math.pow(hi / lo, Math.max(0, Math.min(1, t1)))); };
const dem = (f, b = f.budget) => R.demandCore({ scale: f.scale, genre: f.genre, cast: [f.inp.fame, f.inp.withFame], appetite: f.inp.appetite, campaignTier: f.campaignTier,
  part: f.inp.part, lastRating: f.inp.lastRating, appealMod: f.inp.appealMod, buzz: f.inp.scandal ? 0 : f.inp.hype, anticipation: f.inp.anticipation, budget: b });
const base = films.map((f) => dem(f));
const miss = films.map((f, i) => Math.abs(base[i] - f.demand));
const pct = (l, fn) => (l.length ? Math.round(l.filter(fn).length / l.length * 100) : 0);
const V = ['bomb', 'broke even', 'profitable', 'smash'];
const ratioV = (x) => (x >= 2 ? 'smash' : x >= 1.25 ? 'profitable' : x >= 0.7 ? 'broke even' : 'bomb');
console.log(`${films.length} feature/indie releases from ${CAREERS} careers · demand rebuilt within ±3 for ${pct(miss, (d) => d <= 3)}%`);
{ const med = (a) => { const v = a.slice().sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : 0; };
  console.log("\n features by genre: n · demand · opening €m · legs · fame · hype · appetite · anticipation · co-star · rating · budget");
  for (const g of ["Horror", "Comedy", "Thriller", "Crime", "Sci-Fi", "Drama", "Romance", "Musical"]) { const l = films.filter((x) => x.scale === "feature" && x.genre === g); if (!l.length) continue;
    console.log("  " + g.padEnd(9) + [l.length, med(l.map((x) => x.demand)), Math.round(med(l.map((x) => x.opening))), med(l.map((x) => x.legs)).toFixed(2), Math.round(med(l.map((x) => x.fame))), Math.round(med(l.map((x) => x.hype))), med(l.map((x) => x.inp.appetite)).toFixed(2), med(l.map((x) => x.inp.anticipation)).toFixed(2), Math.round(med(l.map((x) => x.inp.withFame))), med(l.map((x) => x.rating)), med(l.map((x) => x.budget))].join(" · ")); } }
const W0 = { feature: R.SCREENS.feature, indie: R.SCREENS.indie };
function judge(wf, wi, rk = 0.3, cz = 1) {
  R.SCREENS.feature = wf; R.SCREENS.indie = wi; R.REACH.k = rk;
  const out = films.map((f, i) => {
    const b1 = squeeze(f, cz); const d1 = dem(f, b1);
    const reachNow = R.reachOf({ scale: f.scale, budget: b1 }); R.REACH.k = 0.3; const reachWas = R.reachOf({ scale: f.scale, budget: f.budget }); R.REACH.k = rk;
    const w = (f.scale === 'feature' ? wf / W0.feature : wi / W0.indie) * reachNow / reachWas;
    const gross = f.opening * Math.pow(Math.max(2, d1) / Math.max(2, base[i]), 1.45) * w * f.legs * (f.expansion || 1) * 1e6;
    const need = R.breakEvenFor({ scale: f.scale, campaignTier: f.campaignTier, budget: b1 });
    return { ...f, gross, v: ratioV(gross / need) };
  });
  // The world's own standard features, made live under these settings.
  const world = [];
  for (const { s, actors } of worldActors) {
    const saved = JSON.stringify(s.market || null);
    for (let i = 0; i < 120 && actors.length; i++) { const x = WD.makeWorldFilm(s, actors[(i * 7) % actors.length], s.year, new Set()); s.market = JSON.parse(saved); if (x.scale === 'feature') world.push({ ...x, v: R.verdictOf({ scale: x.scale, boxOffice: x.gross, budget: x.budget }) }); }
  }
  R.SCREENS.feature = W0.feature; R.SCREENS.indie = W0.indie; R.REACH.k = 0.3;
  return { out, world };
}
const show = (l, key = 'v') => V.map((v) => `${String(pct(l, (f) => f[key] === v)).padStart(2)}`).join('/');
console.log('\n features: bomb/even/profit/smash — overall · <5 · 5–5.9 · 6–6.9 · 7+ · fame70+ <6 · genres H/C/D/S · world features · indie <6 · indie 6+');
// The films were made at the shipped settings; squeeze 1 replays them as they were.
for (const cz of [1]) for (const wf of [0.3, 0.34, 0.38]) for (const wi of [0.07, 0.05]) {
  const rk = 0.3; const { out, world } = judge(wf, wi, rk, cz);
  const fe = out.filter((f) => f.scale === 'feature'), ind = out.filter((f) => f.scale === 'indie');
  const r = (lo, hi) => fe.filter((f) => f.rating >= lo && f.rating <= hi);
  const g = (x) => fe.filter((f) => f.genre === x);
  console.log(` squeeze ${cz} width ${wf}/${wi}: ${show(fe)} · ${show(r(0, 49))} · ${show(r(50, 59))} · ${show(r(60, 69))} · ${show(r(70, 100))} · ${show(fe.filter((f) => f.fame >= 70 && f.rating < 60))} · ${['Horror', 'Comedy', 'Drama', 'Sci-Fi', 'Musical'].map((x) => pct(g(x), (f) => f.v === 'smash') + 's' + pct(g(x), (f) => f.v === 'bomb') + 'b').join(' ')} · W ${show(world)} · i ${show(ind.filter((f) => f.rating < 60))} · ${show(ind.filter((f) => f.rating >= 60))}`);
}
