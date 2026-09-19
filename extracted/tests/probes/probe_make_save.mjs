// Plays a perfect life in node up to a target fame, writes the state as a browser save.
import fs from 'fs';
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
const EM = await import(P + 'systems/meta/email.js');
const target = +(process.argv[2] || 45);
const s = createInitialState({ name: 'Mira Vale', city: 'Los Angeles', gender: 'female', dream: 'actor', created: true });
beginLife(s);
Object.assign(s, { stage: 'career', ageY: 22, year: 2048, month: 0, hasApartment: true, livingWith: 'own_place', housing: 'room', cash: 9000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, fame: 0, peakFame: 0 });
// The jump to twenty-two skipped the family: a mother of thirty-seven with a daughter of
// twenty-eight was this line, not the game.
for (const p of s.family || []) p.age += 22;
let t = s;
for (let m = 0; m < 40 * 12 && (t.fame || 0) < target; m++) {
  t.bigMoment = null; t.pendingArc = null;
  if (t.production && !t.production.take) ST.pushTake(t, 'about');
  if (t.illness && (t.cash || 0) > H.treatmentCost(t, t.illness)) H.seeDoctor(t);
  if (!t.job && (t.fame || 0) < 20) { const j = W.availableJobs(t)[0]; if (j) W.takeJob(t, j.id); }
  if (t.job && (t.fame || 0) > 35) W.quitJob(t);
  if (!t.production) { const b = [...T.SCHOOLS].reverse().find((sc) => (t.cash || 0) > sc.cost * 4); if (b && (t.ap || 0) >= 20) T.train(t, b.id); }
  K.refreshCastingPool(t);
  if (!t.production && (t.ap || 0) >= 30 && (t.castingPool || []).length) {
    const g = t.castingPool.filter((x) => ['prestige', 'indie', 'feature', 'small'].includes(x.scale)); const c = (g.length ? g : t.castingPool)[0];
    K.prepareFor(t, c.id); K.auditionFor(t, c.id, 85);
  }
  if ((t.offers || []).length && !t.production) { const o = t.offers[0]; PR.startProduction(t, o); t.offers = t.offers.filter((x) => x.id !== o.id); }
  for (let k = 0; k < 3 && t.production && (t.ap || 0) >= 15; k++) PR.rehearse(t); if (t.production && (t.ap || 0) >= 10) PR.bondWithCrew(t, t.production.crew[0].id);
  t = advanceMonth(t);
  const L = (t.inbox || []).find((x) => x.tag === 'agent'); if (L) EM.emailAct(t, L.id, 0);
  if (!t.alive) break;
}
t.bigMoment = null; t.pendingArc = null; t.production = null; t.ap = t.apMaxEff;
console.log('age', t.ageY, 'fame', Math.round(t.fame), 'respect', Math.round(t.respect), 'cash', Math.round(t.cash), 'credits', (t.filmography || []).length, 'agent', t.agent && t.agent.name, 'housing', t.housing);
fs.writeFileSync(process.argv[3] || 'save.json', JSON.stringify(t));
