// What never happens to a perfect player. Maxi: "becoming a star is easy, reputation is
// always good — am I right?" Twenty perfect lives, forty-five years each, and a count of
// everything that could go wrong: flops, scandals, illnesses, burnout, being dropped,
// fame going down, a year without work, a set that went cold, money in trouble. What
// comes out at zero is a hole in the game — a pressure that exists on paper and never bites.
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
const C = await import(P + 'systems/career/contract.js');
const AR = await import(P + 'systems/life/arcs.js');
const N = +(process.argv[2] || 20);
const tally = {};
const bump = (k, n = 1) => { tally[k] = (tally[k] || 0) + n; };
const by5 = {};
for (let i = 0; i < N; i++) {
  let t = createInitialState({ name: 'P', dream: 'actor', created: true, gender: i % 2 ? 'female' : 'male' }); beginLife(t);
  Object.assign(t, { stage: 'career', ageY: 22, year: 2050, month: 0, hasApartment: true, livingWith: 'own_place', housing: 'room', cash: 9000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, fame: 0, peakFame: 0 });
  let lastFame = 0, idle = 0, maxCash = 0;
  for (let m = 0; m < 45 * 12; m++) {
    t.bigMoment = null;
    // a career story's beat is answered, at random — the life dilemmas are skipped as before
    if (t.pendingArc && t.pendingArc.story) { const k = t.pendingArc.choices.length; AR.resolveArc(t, Math.floor(Math.random() * k)); }
    t.pendingArc = null; t.moments = []; t.night = null; t.openContract = null;
    for (const p of PR.sets(t)) if (!p.take) ST.pushTake(t, 'about');
    if (t.illness && (t.cash || 0) > H.treatmentCost(t, t.illness)) { H.seeDoctor(t); bump('saw a doctor'); }
    if (!t.job && (t.fame || 0) < 20) { const j = W.availableJobs(t)[0]; if (j) W.takeJob(t, j.id); }
    if (t.job && (t.fame || 0) > 35) W.quitJob(t);
    if (!t.production) { const b = [...T.SCHOOLS].reverse().find((sc) => (t.cash || 0) > sc.cost * 4); if (b && (t.ap || 0) >= 20) T.train(t, b.id); }
    K.refreshCastingPool(t);
    for (const o of [...(t.offers || [])]) {
      const k = C.draftContract(t, o); if (k.sent) continue;
      const sched = k.clauses.find((c) => c.id === 'schedule');
      if (sched && sched.must && sched.result !== 'agreed') { C.markClause(t, o.id, 'schedule', sched.options[0].id); C.sendContract(t, o.id); continue; }
      C.signContract(t, o.id);
    }
    if (!PR.sets(t).length && (t.ap || 0) >= 30 && (t.castingPool || []).length) {
      const g = t.castingPool.filter((x) => ['prestige', 'indie', 'feature', 'blockbuster', 'small', 'festival'].includes(x.scale) && x.minFame <= (t.fame || 0));
      const c = (g.length ? g : t.castingPool)[0];
      K.prepareFor(t, c.id); K.auditionFor(t, c.id, 85); bump('reads');
    }
    for (let k = 0; k < 3 && t.production && (t.ap || 0) >= 15; k++) PR.rehearse(t);
    if (t.production && (t.ap || 0) >= 10) PR.bondWithCrew(t, t.production.crew[0].id);
    const before = { fame: t.fame || 0, respect: t.respect || 0, cash: t.cash || 0, ill: !!t.illness, burnout: !!t.burnout, scandal: t.scandal || 0, drink: (t.drink && t.drink.level) || 0 };
    t = advanceMonth(t);
    const L = (t.inbox || []).find((x) => x.tag === 'agent'); if (L) EM.emailAct(t, L.id, 0);
    // what happened this month
    if ((t.fame || 0) < before.fame - 0.5) bump('fame went down (months)');
    if ((t.respect || 0) < before.respect - 0.5) bump('standing went down (months)');
    if (t.illness && !before.ill) bump('fell ill');
    if (t.burnout && !before.burnout) bump('burnout');
    if ((t.scandal || 0) > before.scandal + 2) bump('a scandal');
    if ((t.cash || 0) < 0) bump('in debt (months)');
    if (!PR.sets(t).length && !(t.releases || []).length && !(t.running || []).length) idle++; else idle = 0;
    if (idle === 12) bump('a year without work');
    for (const c of (t.filmography || []).filter((x) => x.closedAt === t.year * 12 + t.month)) { if (c.verdict === 'bomb' || (c.score || 10) < 4.5) bump('a flop'); if (c.tier !== 'supporting' && (c.verdict === 'bomb')) bump('a lead that bombed'); }
    for (const e of (t.timeline || []).slice(0, 3)) {
      if (/quietly started telling a different story|cold/.test(e.text)) bump('a director who went cold');
      if (/walked|Walked off/.test(e.text)) bump('walked off');
      if (/could not hold|cast someone else|recast/.test(e.text)) bump('lost a part they would not hold');
      if (/box office poison|poison/.test(e.text)) bump('box office poison');
      if (/telling people you were difficult/.test(e.text)) bump('a rumour that stuck');
      if (/Pulled over|A recording from the party|A lawsuit —|A co-star, an interview|A photograph you did not pose/.test(e.text)) bump('a story in the papers');
      if (/has your old chair|you are #/.test(e.text)) bump('overtaken');
      if (/nervous|insur/i.test(e.text)) bump('insurance trouble');
    }
    maxCash = Math.max(maxCash, t.cash || 0);
    if (!t.alive) { bump('died'); break; }
    if (m % 12 === 11) { bump('mental sum', Math.round(t.mental||0)); bump('mental years'); if ((t.mental||0) < 55) bump('years mental under 55'); if ((t.mental||0) >= 95) bump('years mental pinned at 95+'); }
    if (m % 60 === 59) { const y = Math.floor(m / 60) + 1; (by5[y] = by5[y] || []).push({ fame: Math.round(t.fame || 0), resp: Math.round(t.respect || 0), cash: Math.round((t.cash || 0) / 1e6 * 10) / 10, acting: Math.round(t.acting || 0), credits: (t.filmography || []).filter((c) => !c.minor).length, askers: ((t.awards && t.awards.wins) || []).length }); }
  }
  bump('lives');
  { const films = (t.filmography || []).filter((c) => !c.minor && !c.episodes);
    bump('films', films.length);
    bump('films built for it', films.filter((c) => c.potential === 'built').length);
    bump('films that end', films.filter((c) => c.potential === 'closed').length);
    bump('sequels made', films.filter((c) => (c.part || 1) > 1).length);
    bump('sequels that died', films.filter((c) => c.sequelDead).length);
    bump('hits', films.filter((c) => c.verdict === 'smash' || c.verdict === 'profitable').length); }
  for (const k of Object.keys(t._storyLog || {})) bump('story: ' + k, t._storyLog[k].length);
  for (const x of (t.stories || [])) bump('story: ' + x.id);
  bump('Askers won', ((t.awards && t.awards.wins) || []).length);
  bump('nominations', ((t.awards && t.awards.nominations) || []).length);
  if ((t.fame || 0) >= 75) bump('ended A-list or above');
  if ((t.respect || 0) >= 60) bump('ended standing 60+');
  if (t.partner || (t.family || []).some((p) => p.relation === 'Spouse' && p.alive)) bump('ended with a partner');
  bump('peak cash (m) total', Math.round(maxCash / 1e6));
}
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
console.log(`${N} perfect lives, 45 years. Per life: ` + ['reads', 'a flop', 'a lead that bombed', 'fell ill', 'burnout', 'a scandal', 'a director who went cold', 'walked off', 'lost a part they would not hold', 'a year without work', 'fame went down (months)', 'standing went down (months)', 'in debt (months)', 'Askers won', 'nominations', 'box office poison', 'a rumour that stuck', 'a story in the papers', 'overtaken'].map((k) => `${k} ${((tally[k] || 0) / N).toFixed(1)}`).join(' · '));
console.log('mental: average ' + ((tally['mental sum']||0)/(tally['mental years']||1)).toFixed(0) + ' · years under 55: ' + ((tally['years mental under 55']||0)/N).toFixed(1) + ' · years pinned at 95+: ' + ((tally['years mental pinned at 95+']||0)/N).toFixed(1));
console.log('films per life: ' + ['films','hits','films built for it','films that end','sequels made','sequels that died'].map((k)=>k+' '+((tally[k]||0)/N).toFixed(1)).join(' · '));
console.log('stories per life: ' + Object.keys(tally).filter((k) => k.startsWith('story: ')).map((k) => k.slice(7) + ' ' + (tally[k] / N).toFixed(1)).join(' · '));
console.log(`never once: ` + ['box office poison', 'a rumour that stuck', 'a story in the papers', 'overtaken', 'died', 'in debt (months)', 'burnout', 'walked off'].filter((k) => !tally[k]).join(', '));
console.log(`ended A-list+: ${tally['ended A-list or above'] || 0}/${N} · standing 60+: ${tally['ended standing 60+'] || 0}/${N} · with a partner: ${tally['ended with a partner'] || 0}/${N} · peak cash median ~€${med(Array.from({ length: N }, () => 0)).toFixed ? '' : ''}${Math.round((tally['peak cash (m) total'] || 0) / N)}m`);
for (const y of Object.keys(by5)) { const r = by5[y]; console.log(`  age ${22 + y * 5}: fame ${med(r.map((x) => x.fame))} · standing ${med(r.map((x) => x.resp))} · cash €${med(r.map((x) => x.cash))}m · acting ${med(r.map((x) => x.acting))} · credits ${med(r.map((x) => x.credits))} · Askers ${med(r.map((x) => x.askers))}`); }
