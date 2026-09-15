// How long does a life actually last, and what does the player's screen look like on the
// way? Plays 120 careers to age 90 doing sensible things, and records ages at death.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const K = await import(P + 'systems/career/castings.js');
const PR = await import(P + 'systems/career/production.js');
const ST = await import(P + 'systems/career/story.js');
const H = await import(P + 'systems/life/health.js');

const ages = [], fames = [], creds = [], scores = [], offersSeen = [], expired = [];
for (let i = 0; i < 120; i++) {
  const s = createInitialState({ name: 'P' + i, dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 20, year: 2050, month: 0, hasApartment: true,
    housing: 'room', cash: 30000, alive: true, ap: 100, apMax: 100, apMaxEff: 100 });
  let t = s, exp = 0, sawOffer = 0;
  for (let m = 0; m < 70 * 12; m++) {
    t.bigMoment = null; t.pendingArc = null;
    if (t.production && !t.production.take) ST.pushTake(t, 'straight');
    // a player who looks after themselves
    if (t.illness && (t.cash || 0) > H.treatmentCost(t, t.illness)) H.seeDoctor(t);
    K.refreshCastingPool(t);
    if (!t.production && (t.ap || 0) > 0 && (t.castingPool || []).length) {
      const c = t.castingPool[Math.floor(Math.random() * t.castingPool.length)];
      K.auditionFor(t, c.id, 55 + Math.round(Math.random() * 30));
    }
    if ((t.offers || []).length) { sawOffer++; if (!t.production) { const o = t.offers[0]; PR.startProduction(t, o); t.offers = t.offers.filter(x => x.id !== o.id); } }
    const before = (t.offers || []).length;
    t = advanceMonth(t);
    if ((t.timeline || [])[0] && /stopped waiting|went ahead without you/.test((t.timeline[0].text || ''))) exp++;
    if (!t.alive) break;
  }
  ages.push(t.ageY); fames.push(Math.round(t.peakFame || 0));
  const cr = [...(t.filmography || []), ...(t.discography || [])].filter(c => !c.minor);
  creds.push(cr.length);
  for (const c of cr) if (c.score != null) scores.push(c.score);
  expired.push(exp); offersSeen.push(sawOffer);
}
const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
const pct = (a, p) => [...a].sort((x, y) => x - y)[Math.floor(a.length * p)];
console.log('death age    median', med(ages), ' 10th', pct(ages, .1), ' 90th', pct(ages, .9), ' died before 60:', ages.filter(a => a < 60).length + '/120');
console.log('peak fame    median', med(fames), ' 90th', pct(fames, .9));
console.log('credits      median', med(creds), ' 90th', pct(creds, .9));
console.log('scores       min', Math.min(...scores).toFixed(1), ' median', med(scores).toFixed(1), ' max', Math.max(...scores).toFixed(1),
  ' under 2.0:', scores.filter(x => x < 2).length, ' of', scores.length);
console.log('offers expired per life  median', med(expired), ' max', Math.max(...expired));
