// The world around one perfect life: who had the years, who the Askers went to, icons.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth, advanceYear } = await import(P + 'engine/time.js');
const K = await import(P + 'systems/career/castings.js');
const PR = await import(P + 'systems/career/production.js');
const ST = await import(P + 'systems/career/story.js');
const T = await import(P + 'systems/career/training.js');
const H = await import(P + 'systems/life/health.js');
const W = await import(P + 'systems/life/work.js');
const EM = await import(P + 'systems/meta/email.js');
const { yearsOf, moneyOf } = await import(P + 'systems/world/yearbook.js');
const { icons } = await import(P + 'systems/world/world.js');

let s = createInitialState({ name: 'Mira Vale', dream: 'actor', created: true });
beginLife(s);
for (let y = 0; y < 18; y++) { s.bigMoment = null; s.moments = []; s = advanceYear(s); }
Object.assign(s, { stage: 'career', hasApartment: true, housing: 'room', cash: 9000, alive: true, ap: 100, apMax: 100, apMaxEff: 100 });
let t = s;
for (let m = 0; m < 45 * 12; m++) {
  t.bigMoment = null; t.pendingArc = null; t.moments = [];
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
const years = yearsOf(t);
console.log('years kept', years.length, 'actors in world', t.world.actors.length, 'alive+working', t.world.actors.filter((a) => a.alive && !a.retired).length);
for (const y of years.filter((_, i) => i % 9 === 0).slice(0, 6)) {
  console.log(`\n${y.year}  icons: ${y.icons.join(', ')}`);
  console.log('  films: ' + y.films.slice(0, 5).map((f) => `#${f.rank} ${f.title} (${f.actor}${f.with ? ' & ' + f.with : ''}) ${moneyOf(f.gross)}${f.you ? ' ★' : ''}`).join(' | '));
  console.log('  actors: ' + y.actors.map((a) => `#${a.rank} ${a.name} ${moneyOf(a.gross)}${a.you ? ' ★' : ''}`).join(' | '));
  console.log('  askers: ' + (y.askers || []).map((a) => `${a.category}: ${a.name}${a.you ? ' ★' : ''} (${a.work})`).join(' | '));
}
const wins = (t.awards.wins || []).length, noms = (t.awards.nominations || []).length;
console.log('\nyou: age', t.ageY, 'fame', Math.round(t.fame), 'respect', Math.round(t.respect), 'askers', wins, 'noms', noms, 'credits', t.filmography.length);
console.log('icons now:', icons(t).map((a) => `${a.name} (${a.askers} askers, fame ${Math.round(a.fame)}, since ${a.iconSince})`).join(' · '));
const top = [...t.world.actors].sort((a, b) => b.askers - a.askers).slice(0, 5);
console.log('most askers:', top.map((a) => `${a.name} ${a.askers}`).join(' · '));
console.log('year lines:', t.timeline.filter((x) => /year in film|The Askers:/.test(x.text)).slice(0, 6).map((x) => x.when + ' ' + x.text).join('\n  '));
console.log('titles used', Object.keys(t._titlesUsed || {}).length, 'review lines used', Object.keys(t._reviewLines || {}).length);
