// Things that must never be true. A feature census says what never happens; this says what
// happens that never should. Every month of every life is checked against the rules the
// rest of the code assumes, and the first violation of each kind is printed with the month
// it happened in, so it can be reproduced.
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
const SETS = await import(P + 'engine/sets.js');
const SS = await import(P + 'systems/meta/stories.js');
const OF = await import(P + 'systems/career/offers.js');
const TW = await import(P + 'systems/life/town.js');
const NM = await import(P + 'systems/career/naming.js');

const N = +(process.argv[2] || 10), YEARS = 50;
const bad = {};
const fail = (rule, where, detail) => { if (!bad[rule]) bad[rule] = { n: 0, first: `${where} — ${detail}` }; bad[rule].n++; };
const finite = (v) => typeof v !== 'number' || Number.isFinite(v);
const root = (t) => String(t || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();

function check(s, where) {
  const pct = { fame: s.fame, respect: s.respect, mental: s.mental, health: s.health, scandal: s.scandal, media: s.media, acting: s.acting, charisma: s.charisma, looks: s.looks, confidence: s.confidence, discipline: s.discipline, strain: s.strain };
  for (const [k, v] of Object.entries(pct)) {
    if (v == null) continue;
    if (!finite(v)) fail(`${k} is not a number`, where, String(v));
    else if (v > 100.001) fail(`${k} above 100`, where, `${k}=${v}`);
    else if (v < (k === 'respect' ? -40.001 : -0.001)) fail(`${k} below its floor`, where, `${k}=${v}`);
  }
  if (!finite(s.cash)) fail('cash is not a number', where, String(s.cash));
  if (!finite(s.quote) || (s.quote || 0) < 0) fail('quote is negative or broken', where, String(s.quote));
  // peakFame is settled once a month, at the end of the tick, so inside a month the fame a
  // day's work just paid may legitimately be ahead of it. Only the settled state has to hold.
  if (/after/.test(where) && (s.peakFame || 0) + 0.001 < (s.fame || 0)) fail('peak fame below current fame', where, `${s.peakFame} < ${s.fame}`);
  if ((s.ap || 0) > (s.apMaxEff || 100) + 0.001) fail('energy above the month’s maximum', where, `${s.ap} / ${s.apMaxEff}`);
  if ((s.ap || 0) < -0.001) fail('energy below zero', where, String(s.ap));

  const sets = PR.sets(s);
  if (sets.length > SETS.MAX_SETS) fail('more sets than anyone may have', where, `${sets.length}`);
  if (sets.length > 1 && sets.some((p) => p.exclusive)) fail('a set alongside an exclusive one', where, sets.map((p) => `${p.title}${p.exclusive ? '(EX)' : ''}`).join(' + '));
  for (const p of sets) {
    if ((p.monthsLeft || 0) < 0) fail('a shoot with negative months left', where, `${p.title} ${p.monthsLeft}`);
    if (!finite(p.meter) || p.meter < -0.001 || p.meter > 100.001) fail('shoot quality out of range', where, `${p.title} ${p.meter}`);
    if (!finite(p.salary) || p.salary < 0) fail('a shoot with a broken fee', where, `${p.title} ${p.salary}`);
    if ((p.paid || 0) > (p.salary || 0) + 1) fail('paid more than the fee', where, `${p.title} ${p.paid} of ${p.salary}`);
    for (const c of p.crew || []) if (!finite(c.bond) || c.bond < -0.001 || c.bond > 100.001) fail('a crew bond out of range', where, `${p.title} ${c.name} ${c.bond}`);
    if (!p.title) fail('a shoot with no title', where, JSON.stringify(p.id));
  }
  const ids = new Set();
  for (const o of s.offers || []) {
    if (ids.has(o.id)) fail('two offers with one id', where, String(o.id)); ids.add(o.id);
    if (!o.projectTitle) fail('an offer with no title', where, String(o.id));
    if (!finite(o.salary) || o.salary < 0) fail('an offer with a broken fee', where, `${o.projectTitle} ${o.salary}`);
    if (!o.signed && (o.deadline || 0) > 90) fail('an unsigned offer that never expires', where, `${o.projectTitle} ${o.deadline}`);
    if (o.signed && !o.waitsForWrap && !PR.sets(s).some((p) => p.offerId === o.id)) fail('a signed paper with no set and no wait', where, `${o.projectTitle}`);
  }
  const titles = new Map();
  for (const c of s.filmography || []) {
    if (!c.title) fail('a credit with no title', where, JSON.stringify(c));
    if (!finite(c.rating)) fail('a credit with a broken rating', where, `${c.title} ${c.rating}`);
    if (c.running && c.verdict && c.verdict !== 'in cinemas') fail('a credit both running and judged', where, `${c.title} ${c.verdict}`);
    if (!c.running && c.score == null && !c.minor) fail('a closed credit with no score', where, `${c.title}`);
    if (!finite(c.boxOffice) || (c.boxOffice || 0) < 0) fail('a credit with broken box office', where, `${c.title} ${c.boxOffice}`);
    const key = (c.title || '') + '|' + (c.year || 0);
    if (titles.has(key)) fail('two credits with one name in one year', where, key); titles.set(key, 1);
  }
  for (const r of s.releases || []) {
    if (!finite(r.due)) fail('a release with a broken date', where, `${r.title} ${r.due}`);
    if (!r.title) fail('a release with no title', where, String(r.id));
  }
  const t = s.typecast || {};
  for (const [k, v] of Object.entries(t.scores || {})) {
    if (!finite(v) || v < -0.001 || v > 10.001) fail('a typecast score out of range', where, `${k}=${v}`);
    if (String(k).startsWith('g:') && !TC.GENRE_LABEL[k.slice(2)]) fail('a genre label for a genre that does not exist', where, k);
  }
  for (const id of t.active || []) if (!TC.labelInfo(id).label) fail('an active label with no name', where, id);
  for (const st of s.stories || []) {
    const chain = SS.CHAINS[st.id];
    if (!chain) fail('a story with no chain', where, st.id);
    else if (!chain.beats[st.beat]) fail('a story stuck on a beat that does not exist', where, `${st.id}:${st.beat}`);
  }
  if (s.pendingArc && !(s.pendingArc.choices || []).length) fail('a question with no answers', where, JSON.stringify(s.pendingArc.speaker));
  for (const e of (s.timeline || []).slice(0, 5)) {
    if (!e.text) fail('a timeline line with no text', where, JSON.stringify(e));
    else if (/undefined|NaN|\[object/.test(e.text)) fail('a timeline line with a hole in it', where, e.text.slice(0, 90));
  }
  if (s.lastEvent && /undefined|NaN|\[object/.test(s.lastEvent)) fail('a screen message with a hole in it', where, String(s.lastEvent).slice(0, 90));
  for (const p of s.people || []) if (!p.name) fail('a person with no name', where, JSON.stringify(p.id));
}

for (let i = 0; i < N; i++) {
  let t = createInitialState({ name: 'P', dream: 'actor', created: true, gender: i % 2 ? 'female' : 'male' }); beginLife(t);
  Object.assign(t, { stage: 'career', ageY: 22, year: 2050, month: 0, hasApartment: true, livingWith: 'own_place', housing: 'room', cash: 9000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, fame: 0, peakFame: 0 });
  t.ambition = ['star', 'serious', 'tv', 'face', 'working'][i % 5];
  const asked = new Set();
  for (let m = 0; m < YEARS * 12; m++) {
    const where = `life ${i} month ${m} (age ${t.ageY})`;
    t.bigMoment = null; t.night = null; t.openContract = null;
    if (t.pendingArc && t.pendingArc.story) AR.resolveArc(t, Math.floor(Math.random() * t.pendingArc.choices.length));
    t.pendingArc = null;
    for (const p of PR.sets(t)) if (!p.take) ST.pushTake(t, 'about');
    if (t.illness && (t.cash || 0) > H.treatmentCost(t, t.illness)) H.seeDoctor(t);
    if ((t.strain || 0) >= 80 && Math.random() < 0.6) A.runAction(t, 'rest');
    if (HY.canGoQuiet(t) && Math.random() < 0.2) A.runAction(t, 'quiet');
    if (!t.production && Math.random() < 0.4) { const b = [...T.SCHOOLS].reverse().find((sc) => (t.cash || 0) > sc.cost * 4); if (b && (t.ap || 0) >= 20) T.train(t, b.id); }
    for (const p of PR.sets(t)) { const want = ['coast', 'steady', 'allin'][(i + m) % 3]; if (PR.stanceOf(p) !== want) PR.setStance(t, p.id, want); }
    if (Math.random() < 0.06) { const r = NM.renameable(t)[Math.floor(Math.random() * Math.max(1, NM.renameable(t).length))]; if (r && !NM.whyNot(t, r.kind, r.id, 'Title ' + m)) NM.rename(t, r.kind, r.id, 'Title ' + m); }
    if ((t.ap || 0) >= 12 && Math.random() < 0.25) TW.goOut(t, 'post');
    if (PR.sets(t).length && Math.random() < 0.01) PR.walkOffSet(t, PR.sets(t)[0].id, 'something bigger');
    K.refreshCastingPool(t);
    for (const o of [...(t.offers || [])]) {
      if (o.signed) continue;
      if (!asked.has(o.id) && Math.random() < 0.15) { asked.add(o.id); OF.declineOffer(t, o.id); continue; }
      const k = C.draftContract(t, o);
      const sched = k.clauses.find((c) => c.id === 'schedule');
      if (sched && sched.must && sched.result !== 'agreed') { C.markClause(t, o.id, 'schedule', sched.options[Math.floor(Math.random() * sched.options.length)].id); C.sendContract(t, o.id); continue; }
      const asks = k.clauses.filter((c) => c.options && c.options.length && c.id !== 'schedule');
      if (asks.length && !asked.has(o.id) && Math.random() < 0.5) { asked.add(o.id); const a = asks[Math.floor(Math.random() * asks.length)]; C.markClause(t, o.id, a.id, a.options[0].id); C.sendContract(t, o.id); continue; }
      C.signContract(t, o.id);
    }
    const pool = (t.castingPool || []).filter((c) => c.minFame <= (t.fame || 0));
    const day = pool.filter((c) => K.dayWork(c));
    if (day.length && (t.ap || 0) >= 25 && Math.random() < 0.35) K.auditionFor(t, day[0].id, 80);
    if (PR.sets(t).length < 2 && (t.ap || 0) >= 30) {
      const g = pool.filter((c) => !K.dayWork(c));
      const c = g[Math.floor(Math.random() * g.length)];
      if (c) { K.prepareFor(t, c.id); K.auditionFor(t, c.id, 60 + Math.floor(Math.random() * 40)); }
    }
    for (const p of PR.sets(t)) if ((t.ap || 0) >= 15 && Math.random() < 0.25) PR.rehearse(t, p.id);
    if (Math.random() < 0.25) { const ev = (t.events || []).find((e) => EV.isInvited(t, e) && EV.isTonight(t, e)); if (ev && (t.ap || 0) >= 30) { EV.attendEvent(t, ev.id); for (let h = 0; h < 5 && t.night && !t.night.done; h++) NI.nightAct(t, 'move'); t.night = null; } }
    check(t, where + ' [before the month]');
    t = advanceMonth(t);
    for (const mail of [...(t.inbox || [])]) if (Math.random() < 0.5) EM.emailAct(t, mail.id, Math.floor(Math.random() * Math.max(1, (mail.cta || []).length)));
    check(t, where + ' [after the month]');
    if (!t.alive) break;
  }
}
const rules = Object.keys(bad);
console.log(`${N} lives, ${YEARS} years each, checked every month.`);
if (!rules.length) console.log('no rule was broken.');
else for (const r of rules.sort((a, b) => bad[b].n - bad[a].n)) console.log(`  ✗ ${r} — ${bad[r].n} times\n      first: ${bad[r].first}`);
