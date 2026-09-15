// Where does an icon's money come from? One perfect life, income by source and by decade.
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

const s = createInitialState({ name: 'P', dream: 'actor', created: true });
beginLife(s);
Object.assign(s, { stage: 'career', ageY: 22, year: 2050, month: 0, hasApartment: true, housing: 'room', cash: 9000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, fame: 0, peakFame: 0 });
let t = s; const byDecade = {}; const bySrc = {};
let lastLen = 0;
for (let m = 0; m < 45 * 12; m++) {
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
  const before = t.cash;
  t = advanceMonth(t);
  const L = (t.inbox || []).find((x) => x.tag === 'agent'); if (L) EM.emailAct(t, L.id, 0);
  // new timeline lines this month that mention money
  const tl = t.timeline || [];
  const fresh = tl.slice(0, Math.max(0, tl.length - lastLen)); lastLen = tl.length;
  const dec = Math.floor(t.ageY / 10) * 10;
  for (const e of fresh) {
    const mm = /\+€([\d,]+)/.exec(e.text); if (!mm) continue;
    const v = +mm[1].replace(/,/g, '');
    const src = /wages/.test(e.text) ? 'wages' : /month \d/.test(e.text) ? 'shoot fee' : /paid/.test(e.text) ? 'one-day/ad' : /bonus|back end|residual|royalt/i.test(e.text) ? 'bonus' : /interest|dividend|rent/i.test(e.text) ? 'passive' : 'other:' + e.text.slice(0, 40);
    byDecade[dec] = (byDecade[dec] || 0) + v; bySrc[src] = (bySrc[src] || 0) + v;
  }
  if (!t.alive) break;
}
const m = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'm' : Math.round(n / 1e3) + 'k';
console.log('age', t.ageY, 'fame', t.fame, 'cash', m(t.cash), 'credits', (t.filmography || []).length, 'quote', m(t.quote || 0));
console.log('by decade:', Object.entries(byDecade).map(([k, v]) => k + 's ' + m(v)).join(' · '));
console.log('by source:', Object.entries(bySrc).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => k + ' ' + m(v)).join(' · '));
const late = (t.filmography || []).filter((c) => c.year >= t.year - 3);
console.log('last 3 years credits:', late.length, late.slice(0, 15).map((c) => `${c.type}/${c.role} €${m(c.salary || 0)}${c.minor ? ' (minor)' : ''}`).join(' | '));
