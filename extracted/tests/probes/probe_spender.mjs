// Three players, same game. What does the ladder look like for each?
//   perfect  — chases good parts, prepares, argues the version, trains, rehearses, sees a doctor
//   ordinary — takes what is in front of them, sometimes prepares, sometimes rehearses
//   drifting — presses the button, answers what appears, works when work arrives
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
const { comboOf } = await import(P + 'engine/combo.js');
const FV = await import(P + 'systems/career/favours.js');

function live(kind, years = 45) {
  const s = createInitialState({ name: 'P', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 22, year: 2050, month: 0, hasApartment: true,
    housing: 'room', cash: 9000, alive: true, ap: 3, apMax: 3, apMaxEff: 3, fame: 0, peakFame: 0 });
  let t = s, iconAge = null, alistAge = null, lowR = 0, negMonths = 0; const months = {}; const spent = { lead: 0, sequel: 0, smooth: 0 };
  for (let m = 0; m < years * 12; m++) {
    t.bigMoment = null; t.pendingArc = null;
    if (t.production && !t.production.take) {
      const opts = ST.takesFor(t.production);
      ST.pushTake(t, (kind === 'perfect' || kind === 'spender') ? 'about' : kind === 'ordinary' ? opts[Math.floor(Math.random() * opts.length)] : 'straight');
    }
    if (kind !== 'drifting' && t.illness && (t.cash || 0) > H.treatmentCost(t, t.illness)) H.seeDoctor(t);
    if (!t.job && (t.fame || 0) < 20) { const j = W.availableJobs(t)[0]; if (j) W.takeJob(t, j.id); }
    if (t.job && (t.fame || 0) > 35) W.quitJob(t);
    // A perfect player on a shoot puts the month into the shoot, not into a class.
    if ((kind === 'perfect' || kind === 'spender') && !t.production) { const b = [...T.SCHOOLS].reverse().find((sc) => (t.cash || 0) > sc.cost * 4); if (b && (t.ap || 0) > 1) T.train(t, b.id); }
    else if (kind === 'ordinary' && Math.random() < 0.3) { const b = T.SCHOOLS[0]; if (b && (t.ap || 0) > 1) T.train(t, b.id); }
    K.refreshCastingPool(t);
    if (kind === 'spender') {
      const sup = (t.castingPool || []).find((c) => c.shelf === 'film' && c.role !== 'Lead' && !c.askedLead);
      if (sup && FV.canUse(t, 'lead').ok) { FV.askForLead(t, sup.id); spent.lead++; }
      const push = (t.filmography || []).find((c) => c.pushable && !c.pushed);
      if (push && FV.canUse(t, 'sequel').ok) { FV.pushSequel(t, push.id); spent.sequel++; }
      if (FV.canSmooth(t) && FV.canUse(t, 'smooth').ok) { FV.smoothOver(t); spent.smooth++; }
    }
    if (!t.production && (t.ap || 0) > 0 && (t.castingPool || []).length) {
      let c;
      if ((kind === 'perfect' || kind === 'spender')) { const g = t.castingPool.filter((x) => ['prestige', 'indie', 'feature', 'small'].includes(x.scale)); c = (g.length ? g : t.castingPool)[0]; }
      else c = t.castingPool[Math.floor(Math.random() * t.castingPool.length)];
      if ((kind === 'perfect' || kind === 'spender')) K.prepareFor(t, c.id);
      else if (kind === 'ordinary' && Math.random() < 0.4) K.prepareFor(t, c.id);
      K.auditionFor(t, c.id, (kind === 'perfect' || kind === 'spender') ? 85 : kind === 'ordinary' ? 45 + Math.random() * 35 : 30 + Math.random() * 40);
    }
    if ((t.offers || []).length && !t.production) { const o = t.offers[0]; PR.startProduction(t, o); t.offers = t.offers.filter((x) => x.id !== o.id); }
    if ((kind === 'perfect' || kind === 'spender')) { while ((t.ap || 0) > 0 && t.production) { const b = t.ap; PR.rehearse(t); if (t.ap >= b) break; } }
    else if (kind === 'ordinary' && t.production && Math.random() < 0.5) PR.rehearse(t);
    t = advanceMonth(t);
    // a perfect or ordinary player signs the agent letter; the drifter does not open email
    if (kind !== 'drifting') { const L = (t.inbox || []).find((m) => m.tag === 'agent'); if (L) { EM.emailAct(t, L.id, 0); if (!t._agentAt) t._agentAt = t.ageY; } }
    const cb = comboOf(t); months[cb] = (months[cb] || 0) + 1; lowR = Math.min(lowR, t.respect || 0); if ((t.respect || 0) < 0) negMonths++;
    if (!alistAge && (t.fame || 0) >= 75) alistAge = t.ageY;
    if (!iconAge && (t.fame || 0) >= 90) iconAge = t.ageY;
    if (!t.alive) break;
  }
  const cr = [...(t.filmography || []), ...(t.discography || [])].filter((c) => !c.minor);
  const hit = cr.some((c) => (c.rating || 0) >= 85);
  const ledHit = cr.some((c) => (c.rating || 0) >= 85 && c.tier !== 'supporting');
  const twoHits = cr.filter((c) => (c.rating || 0) >= 85).length >= 2;
  const nom = ((t.awards && t.awards.nominations) || []).length > 0;
  return { spent, nameSpent: t.nameSpent || 0, agentAt: t._agentAt, agent: !!(t.agent && t.agent.level > 0), credits: cr.length, peak: Math.round(t.peakFame || 0), alistAge, iconAge,
    wins: ((t.awards && t.awards.wins) || []).length, hits: t.worldHits || 0,
    score: cr.filter((c) => c.score != null).reduce((a, c) => a + c.score, 0) / Math.max(1, cr.filter((c) => c.score != null).length),
    months, hit, ledHit, twoHits, nom, died: !t.alive, age: t.ageY, lowR, negMonths, endR: Math.round(t.respect || 0) };
}
const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : '—');
for (const kind of ['perfect', 'spender', 'ordinary']) {
  const runs = []; for (let i = 0; i < 25; i++) runs.push(live(kind));
  const tot = {}; for (const r of runs) for (const k in r.months) tot[k] = (tot[k] || 0) + r.months[k];
  const all = Object.values(tot).reduce((a, b) => a + b, 0);
  const seen = (k) => runs.filter((r) => (r.months[k] || 0) > 0).length;
  console.log('  combos: ' + ['beginning','difficult','craft','working','face','liability','star','real','faded','tale','asked'].map((k) => k + ' ' + Math.round(100 * (tot[k] || 0) / all) + '% (' + seen(k) + '/25 lives)').join(' · '));
  const alist = runs.filter((r) => r.alistAge), icon = runs.filter((r) => r.iconAge);
  console.log(kind.padEnd(9)
    + ' credits ' + String(med(runs.map((r) => r.credits))).padStart(3)
    + ' · avg score ' + (runs.reduce((a, r) => a + (r.score || 0), 0) / runs.length).toFixed(1)
    + ' · peak fame ' + String(med(runs.map((r) => r.peak))).padStart(3)
    + ' · A-list ' + String(alist.length).padStart(2) + '/25 @' + med(alist.map((r) => r.alistAge))
    + ' · Icon ' + String(icon.length).padStart(2) + '/25 @' + med(icon.map((r) => r.iconAge))
    + ' · Askers ' + runs.filter((r) => r.wins).length + '/25 (med ' + med(runs.map((r) => r.wins)) + ')'
    + ' | standing: lowest med ' + med(runs.map((r) => r.lowR)) + ' · months below zero med ' + med(runs.map((r) => r.negMonths)) + ' · ends at med ' + med(runs.map((r) => r.endR))
    + ' · spent ' + med(runs.map((r) => r.nameSpent)) + ' (lead ' + med(runs.map((r) => r.spent.lead)) + ', sequel ' + med(runs.map((r) => r.spent.sequel)) + ', smooth ' + med(runs.map((r) => r.spent.smooth)) + ')' + ' · agent ' + runs.filter((r) => r.agent).length + '/25 @' + med(runs.map((r) => r.agentAt).filter(Boolean)) + ' · hits ' + runs.filter((r) => r.hits).length + '/25' + '  KEYS: hit85 ' + runs.filter((r) => r.hit).length + '/25 nom ' + runs.filter((r) => r.nom).length + '/25 | LED a hit ' + runs.filter((r) => r.ledHit).length + '/25 | two hits ' + runs.filter((r) => r.twoHits).length + '/25 | led+nom ' + runs.filter((r) => r.ledHit || r.nom).length + '/25');
}
