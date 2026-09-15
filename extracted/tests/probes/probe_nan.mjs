const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const K = await import(P + 'systems/career/castings.js');
const PR = await import(P + 'systems/career/production.js');
const ST = await import(P + 'systems/career/story.js');
const H = await import(P + 'systems/life/health.js');

for (let i = 0; i < 60; i++) {
  const s = createInitialState({ name: 'N' + i, dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 20, year: 2050, month: 0, hasApartment: true,
    housing: 'room', cash: 30000, alive: true, ap: 100, apMax: 100, apMaxEff: 100 });
  let t = s, prev = null;
  for (let m = 0; m < 70 * 12; m++) {
    t.bigMoment = null; t.pendingArc = null;
    if (t.production && !t.production.take) ST.pushTake(t, 'straight');
    if (t.illness && (t.cash || 0) > H.treatmentCost(t, t.illness)) H.seeDoctor(t);
    K.refreshCastingPool(t);
    if (!t.production && (t.ap || 0) > 0 && (t.castingPool || []).length) {
      const c = t.castingPool[Math.floor(Math.random() * t.castingPool.length)];
      K.auditionFor(t, c.id, 70);
    }
    if ((t.offers || []).length && !t.production) { const o = t.offers[0]; PR.startProduction(t, o); t.offers = t.offers.filter(x => x.id !== o.id); }
    const hadProd = t.production ? { ...t.production } : null;
    t = advanceMonth(t);
    if (!Number.isFinite(t.acting)) {
      console.log('acting went NaN at life', i, 'month', m);
      console.log('  production that just wrapped:', hadProd && JSON.stringify({ title: hadProd.title, months: hadProd.months, monthsTotal: hadProd.monthsTotal, monthsLeft: hadProd.monthsLeft, meter: hadProd.meter, tier: hadProd.tier, season: hadProd.season, part: hadProd.part }));
      process.exit(0);
    }
    if (!t.alive) break;
  }
}
console.log('no NaN in 60 lives');
