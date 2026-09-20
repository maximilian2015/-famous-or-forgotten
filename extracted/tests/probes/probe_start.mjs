// The first six years, as a sensible player. Maxi: "how easy is it to play?" — measured
// before the start was reworked: first real credit in month seventeen, eight reads to a
// booking, half the month's energy unspent, money never in doubt. The bot trains while
// teachers help, reads for the best odds, goes out around town, signs what it wins.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const K = await import(P + 'systems/career/castings.js');
const PR = await import(P + 'systems/career/production.js');
const ST = await import(P + 'systems/career/story.js');
const T = await import(P + 'systems/career/training.js');
const W = await import(P + 'systems/life/work.js');
const C = await import(P + 'systems/career/contract.js');
const TW = await import(P + 'systems/life/town.js');
const N = +(process.argv[2] || 40);
const agg = { lives: 0, firstCredit: [], reads: 0, bookings: 0, idleEnergy: [], months: 0, cashLow: 0, fameAt6: [], actAt6: [], credits6: [], contacts6: [], broke: 0, townNights: 0 };
for (let i = 0; i < N; i++) {
  let s = createInitialState({ name: 'P', dream: 'actor', created: true, gender: i % 2 ? 'female' : 'male' }); beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 18, year: 2050, month: 0, hasApartment: true, livingWith: 'own_place', housing: 'room', cash: 5000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, fame: 0, peakFame: 0, acting: 10 });
  let first = null;
  for (let m = 0; m < 72; m++) {
    s.bigMoment = null; s.pendingArc = null; s.moments = []; s.night = null; s.openContract = null;
    for (const p of PR.sets(s)) if (!p.take) ST.pushTake(s, 'about');
    if (!s.job) { const j = W.availableJobs(s)[0]; if (j) W.takeJob(s, j.id); }
    if (s.job && (s.fame || 0) > 30) W.quitJob(s);
    if ((s.acting || 0) < 40 && (s.ap || 0) >= 40 && (s.cash || 0) > 1200) { const b = T.SCHOOLS[1]; if (b) T.train(s, b.id); }
    K.refreshCastingPool(s);
    for (const o of [...(s.offers || [])]) {
      const k = C.draftContract(s, o); if (k.sent) continue;
      const sched = k.clauses.find((c) => c.id === 'schedule');
      if (sched && sched.must && sched.result !== 'agreed') { C.markClause(s, o.id, 'schedule', sched.options[0].id); C.sendContract(s, o.id); continue; }
      C.signContract(s, o.id);
    }
    const pool = (s.castingPool || []).filter((c) => c.minFame <= (s.fame || 0) + 0.01);
    if (pool.length && (s.ap || 0) >= 20 && !(s.submissions || []).length) {
      const c = pool.sort((a, b) => K.castingChance(s, b) - K.castingChance(s, a))[0];
      if (K.castingChance(s, c) >= 20) { K.auditionFor(s, c.id, 70); agg.reads++; }
    }
    if (s.production && (s.ap || 0) >= 15) PR.rehearse(s);
    // and the evenings: the reading night, the bar, a post — whatever the month leaves room for
    for (const t of TW.townFor(s)) if (t.open) { TW.goOut(s, t.id); agg.townNights++; }
    agg.idleEnergy.push(s.ap || 0);
    if ((s.cash || 0) < 500) agg.cashLow++;
    agg.months++;
    s = advanceMonth(s);
    if (!first && (s.filmography || []).filter((c) => !c.minor).length) first = m + 1;
    if (!s.alive) break;
  }
  agg.lives++;
  agg.firstCredit.push(first || 99);
  agg.bookings += (s.filmography || []).filter((c) => !c.minor).length;
  agg.fameAt6.push(s.fame || 0); agg.actAt6.push(s.acting || 0); agg.credits6.push((s.filmography || []).filter((c) => !c.minor).length); agg.contacts6.push((s.people || []).length);
  if ((s.cash || 0) < 0 || s.homeless) agg.broke++;
}
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
console.log(`first real credit: median month ${med(agg.firstCredit)} (mean ${mean(agg.firstCredit).toFixed(0)})`);
console.log(`reads per booking: ${(agg.reads / Math.max(1, agg.bookings)).toFixed(1)} · credits by 24: median ${med(agg.credits6)} · fame at 24: median ${med(agg.fameAt6).toFixed(0)} · acting at 24: median ${med(agg.actAt6).toFixed(0)} · contacts at 24: median ${med(agg.contacts6)}`);
console.log(`energy left at month end: mean ${mean(agg.idleEnergy).toFixed(0)} · nights out: ${(agg.townNights / agg.months).toFixed(1)} a month · months under €500: ${(100 * agg.cashLow / agg.months).toFixed(0)}% · broke/homeless: ${agg.broke}/${agg.lives}`);
