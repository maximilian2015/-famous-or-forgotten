// Does any of it actually happen? Maxi: "I have a feeling half the features we implemented
// do not work at all." So: play lives properly — take contracts, answer the beats, go out,
// take the day work — and count every new system's fingerprints. Anything that comes back
// zero is dead code, whatever the unit tests say about it in isolation.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const K = await import(P + 'systems/career/castings.js');
const PR = await import(P + 'systems/career/production.js');
const ST = await import(P + 'systems/career/story.js');
const T = await import(P + 'systems/career/training.js');
const H = await import(P + 'systems/life/health.js');
const C = await import(P + 'systems/career/contract.js');
const AR = await import(P + 'systems/life/arcs.js');
const EM = await import(P + 'systems/meta/email.js');
const EV = await import(P + 'systems/social/events.js');
const NI = await import(P + 'systems/social/night.js');
const A = await import(P + 'systems/career/actions.js');
const HY = await import(P + 'systems/meta/hype.js');
const TC = await import(P + 'systems/meta/typecast.js');
const RK = await import(P + 'systems/meta/risk.js');
const SS = await import(P + 'systems/meta/stories.js');
const FA = await import(P + 'systems/meta/factions.js');
const GO = await import(P + 'systems/meta/goals.js');
const AM = await import(P + 'systems/meta/ambition.js');
const NM = await import(P + 'systems/career/naming.js');
const TW = await import(P + 'systems/life/town.js');
const DR = await import(P + 'systems/life/drink.js');
const OF = await import(P + 'systems/career/offers.js');
const CO = await import(P + 'systems/career/collab.js');

const N = +(process.argv[2] || 12), YEARS = 45;
const hits = {};
const saw = (k, n = 1) => { hits[k] = (hits[k] || 0) + n; };
const seen = (k) => hits[k] || 0;

for (let i = 0; i < N; i++) {
  let t = createInitialState({ name: 'P', dream: 'actor', created: true, gender: i % 2 ? 'female' : 'male' }); beginLife(t);
  Object.assign(t, { stage: 'career', ageY: 22, year: 2050, month: 0, hasApartment: true, livingWith: 'own_place', housing: 'room', cash: 9000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, fame: 0, peakFame: 0 });
  t.ambition = ['star', 'serious', 'tv', 'face', 'working'][i % 5];
  // One life in four sticks to a single genre — the player Maxi asked about, who only ever
  // does comedies. Nothing else in the probe would ever concentrate a career.
  const onlyGenre = i % 4 === 1 ? 'Comedy' : i % 4 === 3 ? 'Horror' : null;
  if (onlyGenre) saw('a life in one genre');
  saw('ambition set');
  let named = 0; const asked = new Set();
  for (let m = 0; m < YEARS * 12; m++) {
    t.bigMoment = null; t.night = null; t.openContract = null;
    // a career story's beat, answered at random
    if (t.pendingArc && t.pendingArc.story) { saw('story beat shown'); saw('beat:' + t.pendingArc.story + ':' + t.pendingArc.beat); AR.resolveArc(t, Math.floor(Math.random() * t.pendingArc.choices.length)); }
    t.pendingArc = null;
    // The record is capped at 200 entries (engine/timeline.js), so counting by length
    // silently reads one line a month for most of a life — which is how half of this census
    // came out low. Hold the entry that was on top and read down to it instead.
    const tlTop = (t.timeline || [])[0];
    for (const p of PR.sets(t)) if (!p.take) ST.pushTake(t, 'about');
    if (t.illness && (t.cash || 0) > H.treatmentCost(t, t.illness)) H.seeDoctor(t);
    if ((t.strain || 0) >= 80) A.runAction(t, 'rest');
    if (HY.canGoQuiet(t) && Math.random() < 0.25) { const before = HY.hype(t); A.runAction(t, 'quiet'); if (HY.hype(t) < before) saw('a month out of sight'); }
    if (!t.production) { const b = [...T.SCHOOLS].reverse().find((sc) => (t.cash || 0) > sc.cost * 4); if (b && (t.ap || 0) >= 20) T.train(t, b.id); }
    // the stance: a third of lives coast, a third steady, a third all in
    for (const p of PR.sets(t)) { const want = ['coast', 'steady', 'allin'][i % 3]; if (PR.stanceOf(p) !== want) { PR.setStance(t, p.id, want); saw('stance set'); } if (p._stanceDone === want && want !== 'coast') saw('stance did the month'); if (p._stanceDone === 'broke') saw('stance could not be afforded'); }
    // name one project a life, to prove the road works from a real state
    if (!named) { const r = NM.renameable(t)[0]; if (r && NM.canRename(t, r.kind, r.id).ok && !NM.whyNot(t, r.kind, r.id, 'My Own Title')) { NM.rename(t, r.kind, r.id, 'My Own Title'); named = 1; saw('named a project'); } }
    // a life that is actually lived: a post, a drink, and now and then a set walked off
    if ((t.ap || 0) >= 12 && Math.random() < 0.3) { const was = HY.hypeSource(t); TW.goOut(t, 'post'); if (HY.hypeSource(t) === 'viral' && was !== 'viral') saw('something went viral'); }
    if (i % 4 === 0) { if (!Object.keys(t.bottles || {}).length && (t.cash || 0) > 500) DR.buyBottle(t, DR.BOTTLE_ORDER ? DR.BOTTLE_ORDER[1] : 'wine', 3); DR.drinkThrough(t); }
    if (PR.sets(t).length && Math.random() < 0.01) { PR.walkOffSet(t, PR.sets(t)[0].id, 'something bigger'); saw('walked off a set'); }
    // ask somebody you know to make something with you — the thing that only exists if
    // the player reaches for it (career/collab.js)
    for (const p of (t.people || [])) {
      if (!CO.canPropose(t, p).ok || Math.random() > 0.25) continue;
      saw('asked somebody to collaborate');
      const n0 = (t.collabs || []).length;
      CO.propose(t, p.id);
      if ((t.collabs || []).length > n0) saw('they said yes');
      break;
    }
    K.refreshCastingPool(t);
    // the papers
    for (const o of [...(t.offers || [])]) {
      if (o.signed) { if (o.kind === 'renewal' && /took up its option/.test(o.note || '')) saw('the network took its option'); continue; }
      // turn one paper in six down, so the business gets to remember a no
      if (!asked.has(o.id) && Math.random() < 0.16) { asked.add(o.id); saw('turned a paper down'); OF.declineOffer(t, o.id); continue; }
      const k = C.draftContract(t, o);
      for (const cl of k.clauses) { saw('clause:' + cl.id); if (cl.options && cl.options.length) saw('ask:' + cl.id); }
      const sched = k.clauses.find((c) => c.id === 'schedule');
      if (sched && sched.must && sched.result !== 'agreed') { C.markClause(t, o.id, 'schedule', sched.options[0].id); C.sendContract(t, o.id); continue; }
      // ask for one thing in three papers, so the kinds of paper are exercised
      const asks = k.clauses.filter((c) => c.options && c.options.length && c.id !== 'schedule');
      if (asks.length && !asked.has(o.id) && Math.random() < 0.5) { asked.add(o.id); const a = asks[Math.floor(Math.random() * asks.length)]; C.markClause(t, o.id, a.id, a.options[0].id); saw('asked for something'); saw('asked:' + a.id); C.sendContract(t, o.id); continue; }
      C.signContract(t, o.id);
      const set = PR.sets(t).find((p) => p.offerId === o.id);
      // the terms live on the offer the moment it is signed, and on the set once it starts
      const w = PR.sets(t).find((p) => p.offerId === o.id) || o;
      if (w.optionSeasons) saw('signed with season options'); if (w.exitAfter) saw('signed with an exit'); if (w.payOrPlay) saw('signed pay-or-play'); if (w.merch) saw('signed for merchandise'); if (w.points) saw('signed for points');
    }
    // reads
    const pool = (t.castingPool || []).filter((c) => c.minFame <= (t.fame || 0));
    const day = pool.filter((c) => K.dayWork(c));
    if (day.length && (t.ap || 0) >= 25 && Math.random() < 0.4) { const c = day[0]; if (c.medium === 'ad') saw('an ad on the board'); K.auditionFor(t, c.id, 80); }
    if (!PR.sets(t).length && (t.ap || 0) >= 30) {
      let g = pool.filter((c) => !K.dayWork(c));
      if (onlyGenre) { const mine = g.filter((c) => c.genre === onlyGenre); if (mine.length) g = mine; else if (Math.random() < 0.75) g = []; }
      const c = g[Math.floor(Math.random() * g.length)] || pool[0];
      if (c) { K.prepareFor(t, c.id); if (TC.typeWord(t, c)) saw('a read read as ' + TC.typeWord(t, c)); K.auditionFor(t, c.id, 85); }
    }
    if (t.production && (t.ap || 0) >= 15 && Math.random() < 0.3) PR.rehearse(t);
    // a night out now and then
    if (Math.random() < 0.3) { const ev = (t.events || []).find((e) => EV.isInvited(t, e) && EV.isTonight(t, e)); if (ev && (t.ap || 0) >= 30) { EV.attendEvent(t, ev.id); saw('a night out'); for (let h = 0; h < 5 && t.night && !t.night.done; h++) NI.nightAct(t, 'move'); t.night = null; } }
    t = advanceMonth(t);
    // answered before the record is read, or everything an answer writes is missed
    for (const mail of [...(t.inbox || [])]) if (['agent', 'show'].includes(mail.tag)) { if (mail.tag === 'show') saw('booked on a show'); EM.emailAct(t, mail.id, 0); }
    // what the month left on the record
    const fresh = []; for (const e of (t.timeline || [])) { if (e === tlTop) break; fresh.push(e); }
    for (const e of fresh) {
      const x = e.text;
      if (/^Worth watching — /.test(x)) saw('a risk warned');
      if (/The business has a word for you now/.test(x)) saw('a label landed');
      if (/it is what you are to them now/.test(x)) saw('a label went strong');
      if (/: it has started\./.test(x)) saw('a story started');
      if (/is a cult classic/.test(x)) saw('a cult classic');
      if (/is dead\. Three writers/.test(x)) saw('a sequel died in development');
      if (/Fans are furious/.test(x)) saw('fans furious');
      if (/will not work with you again/.test(x)) saw('a bridge burned');
      if (/pay-or-play/.test(x)) saw('pay-or-play paid out');
      if (/of the merchandise is yours/.test(x)) saw('merchandise paid out');
      if (/took up its option/.test(x)) saw('the network took its option');
      if (/is called "/.test(x)) saw('a rename landed');
      if (/opened at .* without you|went out without you/.test(x)) saw('it opened without you');
      // the older half of the game, which nothing has counted until now
      if (/Asker nominations:/.test(x)) saw('an Asker nomination');
      if (/won (Best Picture|the Asker)|Asker for/i.test(x)) saw('an Asker won');
      if (/collapsed —/.test(x)) saw('a picture collapsed');
      if (/is on hold|stopped. |frozen/i.test(x)) saw('a picture froze');
      if (/went to the festival|at w+ Festival|festival/i.test(x)) saw('a festival');
      if (/is your agent now/.test(x)) saw('signed an agent');
      if (/moved you up:/.test(x)) saw('the agent moved you up a desk');
      if (/has stopped returning your calls/.test(x)) saw('dropped by the agent');
      if (/Married |Started seeing |Divorced /.test(x)) saw('a life outside the work');
      if (/Welcomed a new baby/.test(x)) saw('a child');
      if (/burnout|signed off/i.test(x)) saw('burnout');
      if (/rehab|a clinic/i.test(x)) saw('rehab');
      if (/Bought |Moved into|moved to a/i.test(x)) saw('bought something');
      if (/world hit|the whole world/i.test(x)) saw('a world hit');
      if (/tour|junket|press tour/i.test(x)) saw('a press tour');
      if (/renewed for season/.test(x)) saw('a season renewed');
      if (/was not renewed|cancelled/i.test(x)) saw('a show cancelled');
      if (/written out/.test(x)) saw('written out of a show');
      if (/telling people you were difficult/.test(x)) saw('a rumour');
      if (/list is out: you were #/.test(x)) saw('overtaken on the list');
      if (/box office poison/.test(x)) saw('box office poison');
      if (/A post of yours went everywhere/.test(x)) saw('something went viral');
      if (/never found the money/.test(x)) saw('a collaboration died in development');
      if (/got it made\./.test(x)) saw('a collaboration got financed');
      if (/passed on making something with you/.test(x)) saw('they passed');
    }
    if (HY.hypeSource(t)) saw('hype:' + HY.hypeSource(t));
    for (const r of RK.liveRisks(t)) saw('risk:' + r.id);
    for (const g of GO.goals(t)) saw('goal:' + g.id.split(':')[0]);
    if (DR.level(t) >= 18) saw('drinking noticed');
    if (!t.alive) break;
  }
  // end of life
  saw('lives');
  for (const id of TC.activeLabels(t)) saw('label:' + id);
  if (onlyGenre && TC.activeLabels(t).includes('g:' + onlyGenre)) saw('a one-genre life got the genre label');
  for (const c of (t.filmography || []).filter((x) => !x.minor)) { if (c.potential) saw('potential:' + c.potential); if (c.sequelDead) saw('a dead sequel on the shelf'); if ((c.part || 1) > 1) saw('a sequel made'); if (c.cult) saw('a cult classic on the shelf'); }
  for (const k of Object.keys(t._storyLog || {})) saw('story ran:' + k, (t._storyLog[k] || []).length);
  const f = FA.factions(t); saw('faction spread', Math.max(...f.map((x) => x.score)) - Math.min(...f.map((x) => x.score)));
  const amb = AM.ambitionProgress(t); if (amb) { saw('ambition read'); if (amb.met) saw('ambition met'); }
  // The older half, read off the finished life — a rare line is unreliable to fish out of
  // the timeline, but the state it left behind is not.
  const aw = t.awards || {}; const films = (t.filmography || []).filter((c) => !c.minor);
  saw('Asker nominations', (aw.nominations || []).length);
  saw('Askers won', (aw.wins || []).length);
  saw('world hits', t.worldHits || 0);
  saw('films that went to a festival', films.filter((c) => c.festival).length);
  saw('festival prizes', films.filter((c) => c.festival && c.festival.result === 'prize').length);
  saw('seasons of television', films.filter((c) => c.episodes && c.scale !== 'episode').length);
  saw('pictures that collapsed', (t._collapsed || 0) || ((t.frozen || []).length));
  saw('burnouts', t.burnouts || 0);
  saw('ever had an agent', t.agent || t._agentCool ? 1 : 0);
  saw('best rung the agent reached', t.agent ? 1 : 0);
  saw('moved out of a rented room', t.housing && t.housing !== 'room' ? 1 : 0);
  saw('a partner at the end', t.partner || (t.family || []).some((x) => x.relation === 'Spouse' && x.alive) ? 1 : 0);
  saw('children', (t.family || []).filter((x) => x.relation === 'Child').length);
  saw('the drink noticed', (t.drink && t.drink.level) >= 18 ? 1 : 0);
  saw('died before the end', t.alive ? 0 : 1);
}

const group = (title, keys) => {
  console.log('\n' + title);
  for (const k of keys) {
    const n = seen(k);
    console.log(`  ${n ? ' ' : '✗'} ${k.padEnd(34)} ${n ? (n / N).toFixed(2) + ' per life' : 'NEVER'}`);
  }
};
console.log(`${N} lives, ${YEARS} years each.`);
group('Typecast (meta/typecast.js)', ['a label landed', 'a label went strong', 'label:romantic', 'label:villain', 'label:tv', 'label:serious', 'label:commercial', 'label:scandal', 'label:child', 'a life in one genre', 'a one-genre life got the genre label', ...Object.keys(TC.GENRE_LABEL).map((g) => 'label:g:' + g), 'a read read as on type', 'a read read as against type']);
group('Risk warnings (meta/risk.js)', ['a risk warned', ...RK.RISK_ORDER.map((r) => 'risk:' + r)]);
group('Career stories (meta/stories.js)', ['a story started', 'story beat shown', ...SS.CHAIN_ORDER.map((c) => 'story ran:' + c), 'fans furious', 'a bridge burned']);
group('Hype v2 (meta/hype.js)', ['hype:hit', 'hype:award', 'hype:viral', 'hype:scandal', 'something went viral', 'booked on a show', 'a month out of sight', 'an ad on the board']);
group('Kinds of paper (career/contract.js)', ['clause:fee', 'clause:schedule', 'clause:exclusive', 'clause:prep', 'clause:backend', 'clause:option', 'clause:seasons', 'clause:exit', 'clause:payOrPlay', 'clause:merch', 'clause:points', 'asked for something', 'signed with season options', 'signed with an exit', 'signed pay-or-play', 'signed for merchandise', 'signed for points', 'the network took its option', 'pay-or-play paid out', 'merchandise paid out']);
group('Franchises (career/franchise.js)', ['potential:built', 'potential:open', 'potential:closed', 'a sequel made', 'a sequel died in development', 'a dead sequel on the shelf', 'a cult classic', 'a cult classic on the shelf']);
group('The set (career/production.js, naming.js)', ['stance set', 'stance did the month', 'stance could not be afforded', 'named a project', 'a rename landed']);
group('Collaborations (career/collab.js)', ['asked somebody to collaborate', 'they said yes', 'they passed', 'a collaboration died in development', 'a collaboration got financed']);
group('The board (meta/goals.js, ambition.js, factions.js)', ['goal:fame', 'goal:respect', 'goal:ambition', 'goal:aaa', 'goal:agent', 'goal:room', 'goal:poison', 'goal:comeback', 'goal:risk', 'ambition read', 'ambition met']);
group('The older half, read off the finished life', ['Asker nominations', 'Askers won', 'world hits', 'films that went to a festival', 'festival prizes', 'seasons of television', 'pictures that collapsed', 'burnouts', 'ever had an agent', 'moved out of a rented room', 'a partner at the end', 'children', 'the drink noticed', 'died before the end', 'a season renewed', 'a show cancelled', 'a rumour', 'overtaken on the list', 'box office poison', 'a night out', 'turned a paper down', 'walked off a set']);
console.log(`\nfaction spread, average high-to-low: ${(seen('faction spread') / N).toFixed(0)} points`);
const dead = Object.keys(hits).length;
console.log(`${dead} distinct things happened across ${N} lives.`);
