// The money, across a whole life. Never measured: does cash ever stop mattering, can you
// get permanently stuck at zero, and what is there to spend it on at the top?
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const K = await import(P + 'systems/career/castings.js');
const PR = await import(P + 'systems/career/production.js');
const ST = await import(P + 'systems/career/story.js');
const T = await import(P + 'systems/career/training.js');
const H = await import(P + 'systems/life/health.js');
const W = await import(P + 'systems/life/work.js');
const E = await import(P + 'engine/economy.js');

const decades = {};   // cash at each decade of age
const stuck = [], negative = [], housing = {};
for (let i = 0; i < 40; i++) {
  const s = createInitialState({ name: 'M' + i, dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 22, year: 2050, month: 0, hasApartment: true,
    housing: 'room', cash: 9000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, fame: 0, peakFame: 0 });
  let t = s, brokeMonths = 0, worstRun = 0;
  for (let m = 0; m < 55 * 12; m++) {
    t.bigMoment = null; t.pendingArc = null;
    if (t.production && !t.production.take) ST.pushTake(t, 'straight');
    if (t.illness && (t.cash || 0) > H.treatmentCost(t, t.illness)) H.seeDoctor(t);
    if (!t.job && (t.fame || 0) < 20) { const j = W.availableJobs(t)[0]; if (j) W.takeJob(t, j.id); }
    if (t.job && (t.fame || 0) > 35) W.quitJob(t);
    // upgrade the flat whenever it is affordable — a normal thing a player does
    for (const h of [...E.HOUSING_ORDER].reverse()) {
      const cost = E.HOUSING[h].cost;
      if (t.housing !== h && (t.cash || 0) > cost * 20) { const S = await import(P + 'systems/meta/status.js'); S.setHousing(t, h); break; }
    }
    K.refreshCastingPool(t);
    if (!t.production && (t.ap || 0) > 0 && (t.castingPool || []).length) {
      const c = t.castingPool[Math.floor(Math.random() * t.castingPool.length)];
      K.auditionFor(t, c.id, 55 + Math.random() * 25);
    }
    if ((t.offers || []).length && !t.production) { const o = t.offers[0]; PR.startProduction(t, o); t.offers = t.offers.filter((x) => x.id !== o.id); }
    if (t.production && (t.ap || 0) > 0) PR.rehearse(t);
    t = advanceMonth(t);
    if ((t.cash || 0) < 0) negative.push(Math.round(t.cash));
    if ((t.cash || 0) < 500) { brokeMonths++; worstRun = Math.max(worstRun, brokeMonths); } else brokeMonths = 0;
    const d = Math.floor(t.ageY / 10) * 10;
    (decades[d] = decades[d] || []).push(t.cash || 0);
    if (!t.alive) break;
  }
  housing[t.housing] = (housing[t.housing] || 0) + 1;
  if (worstRun > 24) stuck.push({ i, months: worstRun, age: t.ageY, fame: Math.round(t.fame) });
}
const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : 0);
const M = (n) => (Math.abs(n) >= 1e6 ? '€' + (n / 1e6).toFixed(1) + 'm' : '€' + Math.round(n / 1000) + 'k');
console.log('cash by age (median across 40 lives):');
for (const d of Object.keys(decades).sort((a, b) => a - b)) console.log('  ' + d + 's  ' + M(med(decades[d])).padStart(9) + '   90th ' + M([...decades[d]].sort((a,b)=>a-b)[Math.floor(decades[d].length*0.9)]));
console.log('\nhousing at death:', JSON.stringify(housing));
console.log('lives stuck under €500 for over two years:', stuck.length + '/40', stuck.slice(0, 4).map((x) => `${x.months}mo @${x.age} fame ${x.fame}`).join(' · '));
console.log('months in overdraft:', negative.length, negative.length ? 'worst ' + M(Math.min(...negative)) : '');
