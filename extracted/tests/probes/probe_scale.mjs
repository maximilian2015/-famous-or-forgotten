// The shape of a career, measured on a player who plays well: chases good parts, prepares,
// argues for the version, trains, rehearses every month.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const K = await import(P + 'systems/career/castings.js');
const PR = await import(P + 'systems/career/production.js');
const ST = await import(P + 'systems/career/story.js');
const T = await import(P + 'systems/career/training.js');
const H = await import(P + 'systems/life/health.js');

const N = 30;
const all = [], icons = [], iconAges = [], wins = [], noms = [], hits = [], peaks = [];
for (let i = 0; i < N; i++) {
  const s = createInitialState({ name: 'R' + i, dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true,
    housing: 'flat', cash: 60000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, acting: 40,
    fame: 0, peakFame: 0, respect: 20 });
  let t = s, iconAge = null;
  for (let m = 0; m < 40 * 12; m++) {
    t.bigMoment = null; t.pendingArc = null;
    if (t.production && !t.production.take) ST.pushTake(t, 'about');
    if (t.illness && (t.cash || 0) > H.treatmentCost(t, t.illness)) H.seeDoctor(t);
    const best = [...T.SCHOOLS].reverse().find((sc) => (t.cash || 0) > sc.cost * 4);
    if (best && (t.ap || 0) > 1) T.train(t, best.id);
    K.refreshCastingPool(t);
    if (!t.production && (t.ap || 0) > 0 && (t.castingPool || []).length) {
      const good = [...t.castingPool].filter((c) => ['prestige', 'indie', 'feature', 'small'].includes(c.scale));
      const c = (good.length ? good : t.castingPool)[0];
      K.prepareFor(t, c.id); K.auditionFor(t, c.id, 85);
    }
    if ((t.offers || []).length && !t.production) { const o = t.offers[0]; PR.startProduction(t, o); t.offers = t.offers.filter((x) => x.id !== o.id); }
    while ((t.ap || 0) > 0 && t.production) { const b = t.ap; PR.rehearse(t); if (t.ap >= b) break; }
    t = advanceMonth(t);
    if (!iconAge && (t.fame || 0) >= 90) iconAge = t.ageY;
    if (!t.alive) break;
  }
  for (const c of (t.filmography || [])) if (!c.minor && Number.isFinite(c.rating)) all.push(c.rating);
  wins.push(((t.awards && t.awards.wins) || []).length);
  noms.push(((t.awards && t.awards.nominations) || []).length);
  hits.push(t.worldHits || 0);
  peaks.push(Math.round(t.peakFame || 0));
  if (iconAge) { icons.push(1); iconAges.push(iconAge); }
}
all.sort((a, b) => a - b);
const pct = (p) => all[Math.floor(all.length * p)].toFixed(0);
const share = (n) => ((all.filter((x) => x >= n).length / all.length) * 100).toFixed(1) + '%';
const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : '—');
console.log(`${N} well-played careers, 40 years (${all.length} credits)`);
console.log(`  ratings   median ${pct(.5)}  ·  75th ${pct(.75)}  ·  90th ${pct(.9)}  ·  99th ${pct(.99)}  ·  max ${all[all.length - 1].toFixed(1)}`);
console.log(`  pegged at 10.0/10: ${all.filter((x) => x >= 99.5).length}   ·  over 85 (Hit): ${share(85)}  ·  over 90: ${share(90)}  ·  over 70 (award floor): ${share(70)}`);
console.log(`  Askers won  ${wins.filter((x) => x).length}/${N} careers · median wins ${med(wins)} · most ${Math.max(...wins)}`);
console.log(`  nominated   ${noms.filter((x) => x).length}/${N} careers · median noms ${med(noms)}`);
console.log(`  world hits  ${hits.filter((x) => x).length}/${N} careers · most ${Math.max(...hits)}`);
console.log(`  peak fame   median ${med(peaks)}  ·  reached Icon ${icons.length}/${N} · median age ${med(iconAges)}`);
