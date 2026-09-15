// Two questions the combo probe raised.
//  1. The perfect player is "the face" for ~4 years mid-career. When, and why — does fame
//     simply cross 55 before standing crosses 30?
//  2. Nobody reaches the actor's actor. Is it reachable at all — by a SELECTIVE player who
//     takes one good part every couple of years and lets fame fade between them?
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
const { comboOf } = await import(P + 'engine/combo.js');

function live(kind, years = 40) {
  const s = createInitialState({ name: 'P', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 22, year: 2050, month: 0, hasApartment: true,
    housing: 'room', cash: 9000, _rlog: {}, alive: true, ap: 100, apMax: 100, apMaxEff: 100, fame: 0, peakFame: 0 });
  let t = s, f55 = null, r30 = null, r40 = null, lastWrap = -99, faceMonths = 0, craftMonths = 0, trail = [];
  for (let m = 0; m < years * 12; m++) {
    t.bigMoment = null; t.pendingArc = null;
    if (t.production && !t.production.take) ST.pushTake(t, 'about');
    if (t.illness && (t.cash || 0) > H.treatmentCost(t, t.illness)) H.seeDoctor(t);
    if (!t.job && (t.fame || 0) < 20) { const j = W.availableJobs(t)[0]; if (j) W.takeJob(t, j.id); }
    if (t.job && (t.fame || 0) > 35) W.quitJob(t);
    if (!t.production) { const b = [...T.SCHOOLS].reverse().find((sc) => (t.cash || 0) > sc.cost * 4); if (b && (t.ap || 0) > 1) T.train(t, b.id); }
    K.refreshCastingPool(t);
    // selective: one good part, then nothing for 24 months
    const free = kind === 'perfect' || (m - lastWrap) > 24;
    if (free && !t.production && (t.ap || 0) > 0 && (t.castingPool || []).length) {
      const g = t.castingPool.filter((x) => ['prestige', 'indie', 'feature', 'small'].includes(x.scale));
      const c = (g.length ? g : t.castingPool)[0];
      K.prepareFor(t, c.id);
      K.auditionFor(t, c.id, 85);
    }
    if ((t.offers || []).length && !t.production) { const o = t.offers[0]; PR.startProduction(t, o); t.offers = t.offers.filter((x) => x.id !== o.id); }
    if (t.production) { while ((t.ap || 0) > 0) { const a = t.ap; PR.rehearse(t); if (t.ap >= a) break; } }
    const had = !!t.production;
    t = advanceMonth(t);
    if (had && !t.production) lastWrap = m;
    const cb = comboOf(t);
    if (cb === 'face') faceMonths++;
    if (cb === 'craft') craftMonths++;
    if (f55 == null && (t.fame || 0) >= 55) f55 = t.ageY;
    if (r30 == null && (t.respect || 0) >= 30) r30 = t.ageY;
    if (r40 == null && (t.respect || 0) >= 40) r40 = t.ageY;
    if (m % 36 === 0) trail.push(`${t.ageY}:${Math.round(t.fame)}/${Math.round(t.respect)}`);
    if (!t.alive) break;
  }
  return { rlog: t._rlog, rcount: t._rcount, f55, r30, r40, faceMonths, craftMonths, trail, credits: (t.filmography || []).length, endF: Math.round(t.fame), endR: Math.round(t.respect) };
}
const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : '—');
for (const kind of ['perfect', 'selective']) {
  const runs = []; for (let i = 0; i < 15; i++) runs.push(live(kind));
  console.log(kind.padEnd(10), 'fame≥55 @' + med(runs.map((r) => r.f55).filter(Boolean)), 'standing≥30 @' + med(runs.map((r) => r.r30).filter(Boolean)), 'standing≥40 @' + med(runs.map((r) => r.r40).filter(Boolean)),
    '| face months med', med(runs.map((r) => r.faceMonths)), '| craft months med', med(runs.map((r) => r.craftMonths)), 'lives with craft', runs.filter((r) => r.craftMonths > 0).length + '/15',
    '| credits', med(runs.map((r) => r.credits)), 'end', med(runs.map((r) => r.endF)) + '/' + med(runs.map((r) => r.endR)));
  console.log('   age:fame/standing every 3y —', runs[0].trail.join(' '));
  const agg = {}, cnt = {}; for (const r of runs) { for (const k in r.rlog) agg[k] = (agg[k] || 0) + r.rlog[k]; for (const k in r.rcount) cnt[k] = (cnt[k] || 0) + r.rcount[k]; }
  for (const k of Object.keys(agg).sort((a, b) => agg[b] - agg[a])) console.log('   ' + k.padEnd(60) + (agg[k] / runs.length).toFixed(1).padStart(8) + ' per life  (' + (cnt[k] / runs.length).toFixed(0) + ' times)');
}
