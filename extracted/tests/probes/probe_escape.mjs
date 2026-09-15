// Is the trap escapable? A liability (A-lister, standing −25) and a difficult (fame 30,
// standing −25) who REFORM: rehearse with everything, one evening with the director a
// month, argue the version, take what the board still sends. How long to get off the
// Avoided rung, and how long to zero?
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const K = await import(P + 'systems/career/castings.js');
const PR = await import(P + 'systems/career/production.js');
const ST = await import(P + 'systems/career/story.js');
const H = await import(P + 'systems/life/health.js');
const { comboOf } = await import(P + 'engine/combo.js');

function live(kind, bondToo, years = 15) {
  const s = createInitialState({ name: 'P', dream: 'actor', created: true }); beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 34, year: 2062, month: 0, hasApartment: true, livingWith: 'own_place', housing: 'flat', cash: 900000, alive: true,
    ap: 100, apMax: 100, apMaxEff: 100, acting: 62, respect: -25, _combo: null,
    fame: kind === 'liability' ? 78 : 30, peakFame: kind === 'liability' ? 78 : 30,
    filmography: Array.from({ length: 12 }, (_, i) => ({ title: 'f' + i, rating: 55, tier: 'lead', role: 'Lead', year: 2050 + i, score: 5.5 })) });
  let t = s, off = null, zero = null, credits = 0;
  for (let m = 0; m < years * 12; m++) {
    t.bigMoment = null; t.pendingArc = null;
    if (t.production && !t.production.take) ST.pushTake(t, 'about');
    if (t.illness && (t.cash || 0) > H.treatmentCost(t, t.illness)) H.seeDoctor(t);
    K.refreshCastingPool(t);
    if (!t.production && (t.ap || 0) > 0 && (t.castingPool || []).length) {
      const g = t.castingPool.filter((x) => ['prestige', 'indie', 'feature', 'small', 'recurring'].includes(x.scale));
      const c = (g.length ? g : t.castingPool)[0];
      K.prepareFor(t, c.id); K.auditionFor(t, c.id, 85);
    }
    if ((t.offers || []).length && !t.production) { const o = t.offers[0]; PR.startProduction(t, o); t.offers = t.offers.filter((x) => x.id !== o.id); credits++; }
    if (t.production) {
      if (bondToo && (t.ap || 0) > 1) PR.bondWithCrew(t, t.production.crew[0].id);
      while ((t.ap || 0) > 0) { const a = t.ap; PR.rehearse(t); if (t.ap >= a) break; }
    }
    t = advanceMonth(t);
    if (off == null && (t.respect || 0) >= -15) off = m + 1;
    if (zero == null && (t.respect || 0) >= 0) zero = m + 1;
    if (!t.alive) break;
  }
  return { off, zero, end: Math.round(t.respect), credits, combo: comboOf(t), fame: Math.round(t.fame) };
}
const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : '—');
for (const kind of ['liability', 'difficult']) for (const bondToo of [false, true]) {
  const runs = []; for (let i = 0; i < 12; i++) runs.push(live(kind, bondToo));
  const offs = runs.map((r) => r.off).filter((x) => x != null), zeros = runs.map((r) => r.zero).filter((x) => x != null);
  console.log(`${kind.padEnd(10)} ${bondToo ? 'rehearse+bond' : 'rehearse only'}  off the rung: ${offs.length}/12 lives, median ${med(offs)} months · to zero: ${zeros.length}/12, median ${med(zeros)} months · ends at ${med(runs.map((r) => r.end))} after ${med(runs.map((r) => r.credits))} shoots · ends as ${runs.map((r) => r.combo).join(',')}`);
}
