const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const AG = await import(P + 'systems/career/agent.js');
function run(withAgent) {
  let s = createInitialState({ name: 'X', dream: 'actor', created: true }); beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 36, year: 2066, month: 0, alive: true, hasApartment: true, livingWith: 'own_place', housing: 'flat', cash: 500000, ap: 3, apMax: 3, apMaxEff: 3,
    fame: 57, peakFame: 57, respect: 35, acting: 66, filmography: [{ title: 'one', rating: 70, tier: 'lead', role: 'Lead', year: 2064, score: 7 }] });
  if (withAgent) AG.signAgent(s, { name: 'Lena Voss', tier: 'solid' });
  let got = 0;
  for (let m = 0; m < 36; m++) { s.bigMoment = null; s.pendingArc = null; s = advanceMonth(s); got += (s.offers || []).length; s.offers = []; }
  return got;
}
const a = [], b = [];
for (let i = 0; i < 10; i++) { a.push(run(true)); b.push(run(false)); }
const avg = (x) => (x.reduce((p, q) => p + q, 0) / x.length).toFixed(1);
console.log('offers in 3 years — with agent:', avg(a), '· without:', avg(b));
