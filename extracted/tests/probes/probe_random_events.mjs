// What a player actually SEES happen to them, life after life: the random events, counted.
//
// Maxi, 8 Nov: "давай подумаем в целом про рандомные события в игре". Before inventing new ones,
// measure the ones there are: how many a year, which, and how often the same words come back.
// The game has several sources and none of them knew about the others:
//   cards   — s.pendingArc: a choice, BitLife-style (life/arcs.js, meta/stories.js chain beats,
//             life/needs.js asks, life/burnout.js the doctor, life/youth.js)
//   moments — s.bigMoment and the queue behind it: the full-screen news (a death, a shutdown…)
//   feed    — new lines on the timeline, the month's log (everything writes there)
//   texts   — new messages on the phone (social/sms.js)
//   asks    — invitations (social/events.js), press pieces (meta/press.js)
//
// A player who lives a life alongside a career, as in audit_wide: castings, offers, dates,
// the people they know, the doctor, the days on set played by autoQuality, every card answered
// with a random choice so the chains go on to their next beat.
//
//   node tests/probes/probe_random_events.mjs [lives=20] [years=60] [careful]
// `careful` is a player who rests: no new work while worn out or low, two months off when the
// strain is high, and the burnout card answered with rest or help. Without it the player never
// stops, which is the worst case and not how anybody plays.
import '../helpers/seeded.mjs';
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const K = await import(P + 'systems/career/castings.js');
const PR = await import(P + 'systems/career/production.js');
const ST = await import(P + 'systems/career/story.js');
const L = await import(P + 'systems/life/dating.js');
const C = await import(P + 'systems/life/children.js');
const I = await import(P + 'systems/life/interactions.js');
const H = await import(P + 'systems/life/health.js');
const E = await import(P + 'systems/meta/email.js');
const A = await import(P + 'systems/life/arcs.js');
const SC = await import(P + 'systems/career/scenes.js');
const DM = await import(P + 'systems/career/demands.js');
const W = await import(P + 'systems/world/world.js');
const BO = await import(P + 'systems/life/burnout.js');
// The fourth word is the player: `careful` rests; `social` also goes out (a reading, a bar) and sees
// somebody every month, the way a player who makes friends does; `careful,social` is both.
const FLAGS = String(process.argv[4] || '').split(',');
const CAREFUL = FLAGS.includes('careful'), SOCIAL = FLAGS.includes('social');
const TOWN = await import(P + 'systems/life/town.js');
const NE = await import(P + 'systems/life/needs.js');
// `quiet`, `ordinary` or `busy` as a fifth word holds every year to that temper (life/pace.js), so the
// same life can be lived three ways; with one life, each year's choices are printed.
const FORCE = ['quiet', 'ordinary', 'busy'].includes(process.argv[5]) ? process.argv[5] : null;
const PACE = await import(new URL('../../src/systems/life/pace.js', import.meta.url).href);
PACE.PROBE.temper = FORCE;
let rests = 0;

const LIVES = Number(process.argv[2]) || 20;
const YEARS = Number(process.argv[3]) || 60;

// The same sentence with a different name in it is the same sentence to a player.
const shape = (t) => String(t || '')
  .replace(/"[^"]*"|“[^”]*”|«[^»]*»/g, '"…"')
  .replace(/€\s?[\d,.]+\s?[mk]?/g, '€#')
  .replace(/\d[\d,.]*/g, '#')
  .replace(/\b[A-Z][a-z]+(?:[ '-][A-Z][a-z]+)+\b/g, 'NAME')
  .replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, 'MONTH')
  .slice(0, 110);

const tally = () => new Map();
const bump = (m, k, life) => { const e = m.get(k) || { n: 0, lives: new Set() }; e.n++; e.lives.add(life); m.set(k, e); };
const CARDS = tally(), MOMENTS = tally(), FEED = tally(), BADFEED = tally(), TEXTS = tally(), ASKS = tally();
// The five on-set cards, per life, and whether what happened on one film is still there on the next.
const ONSET = ['directorCracks', 'costarWrecked', 'scriptLeak', 'droneOverSet', 'replacementThreat'];
const onsetLives = Object.fromEntries(ONSET.map((id) => [id, []]));
const carry = { again: 0, wrecked: 0, worldCostars: 0, worldFameLost: 0, remembered: 0, coverChains: 0 };
const perYear = { cards: 0, moments: 0, feed: 0, badFeed: 0, texts: 0, invites: 0, press: 0 };
let years = 0, died = 0;
const cardsInALife = [];
// Stage 2 (life/pace.js): how the years differ. Choices that are not the doctor, a year at a time,
// with the year's temper; and how many an unknown sees in the first ten years.
const spread = [], firstTen = [], known = [];

for (let life = 0; life < LIVES; life++) {
  const s = createInitialState({ name: 'R' + life, dream: Math.random() < 0.2 ? 'singer' : 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 20, year: 2050, month: 0, hasApartment: true,
    housing: 'room', cash: 12000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, livingWith: 'own_place' });
  let t = s; let cardsHere = 0, yearHere = 0, tenHere = 0; const onsetHere = Object.fromEntries(ONSET.map((id) => [id, 0]));
  for (let m = 0; m < YEARS * 12 && t.alive; m++) {
    const r = Math.random();
    // ── the player's month, as audit_wide plays it ──
    if (t.pendingArc) {
      const n = (t.pendingArc.choices || []).length;
      const pickIt = CAREFUL && t.pendingArc.id === 'burnout' ? (r < 0.5 ? 0 : 2) : Math.floor(Math.random() * Math.max(1, n));
      if (CAREFUL && t.pendingArc.id === 'burnout' && pickIt === 0) rests++;
      A.resolveArc(t, pickIt); t.pendingArc = null;
    }
    const tired = CAREFUL && ((t.strain || 0) >= 55 || (t.mental || 0) < 35);
    if (CAREFUL && !t.production && !t.onBreak && (t.strain || 0) >= 65) { BO.takeBreak(t, 2); }
    if (t.scene) SC.resolveScene(t, SC.autoQuality(t));
    t.bigMoment = null; t.moments = [];
    if (t.production && !t.production.take) { const o = ST.takesFor(t.production); ST.pushTake(t, o[Math.floor(Math.random() * o.length)]); }
    if (t.illness && (t.cash || 0) > H.treatmentCost(t, t.illness) && r < 0.7) H.seeDoctor(t);
    K.refreshCastingPool(t);
    if (!tired && !t.production && (t.ap || 0) > 0 && (t.castingPool || []).length && r < 0.75) {
      const c = t.castingPool[Math.floor(Math.random() * t.castingPool.length)];
      if (r < 0.25) K.prepareFor(t, c.id);
      K.auditionFor(t, c.id, Math.round(Math.random() * 100));
    }
    if (!tired && (t.offers || []).length && !t.production && r > 0.3) {
      const o = t.offers[Math.floor(Math.random() * t.offers.length)];
      try { PR.startProduction(t, o); } catch (e) { /* an offer the state refuses: skip it */ }
      t.offers = t.offers.filter((x) => x.id !== o.id);
    }
    const inv = (t.inbox || [])[0];
    if (inv && r > 0.5) { try { E.emailAct(t, inv.id, Math.random() < 0.5 ? 0 : 1); } catch (e) { /* */ } }
    if (!t.partner && !C.spouseOf(t) && r > 0.72) { L.refreshDatingPool(t); const who = (t.datingPool || [])[0]; if (who) L.goOnDate(t, L.DATE_ORDER[Math.floor(Math.random() * 4)], who.id); }
    if (t.partner && r > 0.45 && r <= 0.72) L.goOnDate(t, L.DATE_ORDER[Math.floor(Math.random() * 3)]);
    if (t.partner && L.canMoveIn(t) && r > 0.9) L.moveInTogether(t);
    if (t.partner && r > 0.93) L.proposeMarriage(t, L.WEDDING_ORDER[Math.floor(Math.random() * 3)], false);
    if (r > 0.8) {
      const all = [...(t.family || []), ...(t.people || [])];
      const who = all[Math.floor(Math.random() * Math.max(1, all.length))];
      const acts = who ? (I.interactionsFor(t, who.id) || []) : [];
      const a = acts[Math.floor(Math.random() * acts.length)];
      if (a && !a.locked) { try { I.interact(t, who.id, a.id); } catch (e) { /* */ } }
    }
    if (SOCIAL && !tired) {
      if (TOWN.townOpen(t) && Math.random() < 0.5) { try { TOWN.goOut(t, Math.random() < 0.5 ? 'reading' : 'bar'); } catch (e) { /* */ } }
      // Two people kept close, fellow actors first, seen every month and properly: the game's
      // friendships cool every month you do not (life/bonds.js), and one evening every other month
      // held a friend at about 35 for ten years (probed 11 Nov).
      const ppl = (t.people || []).filter((p) => !p.drifted && p.alive !== false);
      const friends = [...ppl.filter((p) => p.role === 'Fellow Actor'), ...ppl.filter((p) => p.role !== 'Fellow Actor')].sort((a, b) => (b.relationship || 0) - (a.relationship || 0)).slice(0, 2);
      const BEST = ['evening', 'deep', 'compliment', 'advice', 'joke', 'chat'];
      for (const who of friends) {
        for (let k = 0; k < 3; k++) {
          const acts = (I.interactionsFor(t, who.id) || []).filter((x) => x.open && !x.why && x.group === 'friendly');
          const a = BEST.map((id) => acts.find((x) => x.id === id)).find(Boolean);
          if (!a) break;
          try { I.interact(t, who.id, a.id); } catch (err) { break; }
        }
      }
    }
    // Somebody asking sits on Home until it is opened, and a player opens it (life/needs.js).
    if (!t.pendingArc) { const nc = NE.needCards(t)[0]; if (nc && Math.random() < 0.8) NE.openNeed(t, nc.pid); }
    if (t.production && (t.ap || 0) > 0) PR.rehearse(t);
    // What a production asks of you this month (career/demands.js), answered as any player might.
    for (const p of t.productions || []) { if (!p.demand) continue; bump(ASKS, p.demand.id, life); const ops = DM.optionsFor(t, p); if (ops.length && r > 0.2) DM.answerDemand(t, p.id, ops[Math.floor(Math.random() * ops.length)].id); }
    // ── the month itself, and what came out of it ──
    const feedBefore = new Set(t.timeline || []), textsBefore = new Set(t.sms || []);
    const invBefore = (t.events || []).length, pressBefore = new Set(t.press || []);
    const temperNow = (t._pace && t._pace.year === t.year && t._pace.temper) || '?';   // the year this month belongs to
    t = advanceMonth(t);
    if (m % 12 === 11) { years++; spread.push({ n: yearHere, temper: temperNow }); yearHere = 0; }
    if (t.pendingArc) {
      const a = t.pendingArc;
      const key = a.story ? `story ${a.story} · ${a.beat}` : a.need ? `ask ${a.need}` : a.health ? `doctor ${a.id || a.health}` : a.youth ? `youth ${a.id}` : `card ${a.id}`;
      bump(CARDS, key, life); perYear.cards++; cardsHere++;
      if (LIVES === 1 && !a.health) console.log(`  ${t.year} ${String(t.month + 1).padStart(2)}  ${key.padEnd(28)} ${String(a.text || '').slice(0, 90)}`);
      if (!a.health) { yearHere++; if (m < 120) tenHere++; }
      if (ONSET.includes(a.id)) { onsetHere[a.id]++;
        if (a.id === 'costarWrecked') { carry.wrecked++; if (/ again. On "/.test(a.text || '')) carry.again++; const co = t.production && t.production.crew[1]; if (co && co.worldId) carry.worldCostars++; } }
    }
    for (const mo of [t.bigMoment, ...(t.moments || [])].filter(Boolean)) { bump(MOMENTS, `${mo.id || mo.kind || '?'}${mo.kind ? ' (' + mo.kind + ')' : ''}`, life); perYear.moments++; }
    for (const x of (t.timeline || []).filter((x) => !feedBefore.has(x))) { bump(FEED, shape(x.text), life); perYear.feed++; if (x.bad) { bump(BADFEED, shape(x.text), life); perYear.badFeed++; } }
    for (const x of (t.sms || []).filter((x) => !textsBefore.has(x))) { bump(TEXTS, shape(x.text || x.body || x.kind || '?'), life); perYear.texts++; }
    perYear.invites += Math.max(0, (t.events || []).length - invBefore);
    { const fresh = (t.press || []).filter((x) => !pressBefore.has(x)); perYear.press += fresh.length; perYear.known = (perYear.known || 0) + fresh.filter((x) => x.known).length; }
  }
  if (!t.alive) died++;
  cardsInALife.push(cardsHere); firstTen.push(tenHere);
  // Who the life ended up knowing: is the social player social? (ChatGPT, 10 Nov: the careful one
  // hardly made friends, so everything that needs a friend was measured low.)
  known.push({ all: (t.people || []).length, close: (t.people || []).filter((p) => (p.relationship || 0) >= 40).length, actors: (t.people || []).filter((p) => p.role === 'Fellow Actor' && (p.relationship || 0) >= 40).length });
  for (const id of ONSET) onsetLives[id].push(onsetHere[id]);
  for (const a of ((t.world && t.world.actors) || [])) for (const x of a.incidents || []) if (x.what === 'drink') carry.worldFameLost++;
  carry.remembered += ((t.memory && t.memory.events) || []).filter((e) => ONSET.includes(e.act) || e.act === 'covered').length;
  carry.coverChains += ((t._storyLog || {}).cover || []).length + ((t.stories || []).some((x) => x.id === 'cover') ? 1 : 0);
}

const per = (n) => (n / Math.max(1, years)).toFixed(2);
console.log(`${LIVES} lives from 20, up to ${YEARS} years${CAREFUL ? ', a player who rests' : ', a player who never stops'}: ${years} lived years, ${died} died before the end`);
if (CAREFUL) console.log(`burnout card answered with two months' rest ${rests} times`);
console.log(`\nPER YEAR OF LIFE`);
console.log(`  choice cards ${per(perYear.cards)} · big screens ${per(perYear.moments)} · feed lines ${per(perYear.feed)} (bad news ${per(perYear.badFeed)}) · texts ${per(perYear.texts)} · invitations ${per(perYear.invites)} · press ${per(perYear.press)} (about people you know ${per(perYear.known || 0)})`);
const show = (title, m, top = 40) => {
  const rows = [...m.entries()].sort((a, b) => b[1].n - a[1].n);
  console.log(`\n${title}: ${rows.length} different`);
  for (const [k, e] of rows.slice(0, top)) console.log(`  ${String(e.n).padStart(5)}  in ${String(e.lives.size).padStart(2)}/${LIVES} lives  ${k}`);
};
show('CHOICE CARDS', CARDS, 80);
show('BIG SCREENS', MOMENTS, 50);
show('BAD NEWS IN THE FEED (by shape)', BADFEED, 30);
show('ALL FEED LINES (by shape)', FEED, 40);
show('TEXTS', TEXTS, 20);
show('ON-SET ASKS (career/demands.js)', ASKS, 20);
console.log('\nTHE FIVE ON-SET CARDS, per life (min · median · max), and in how many lives at all');
for (const id of ONSET) { const v = onsetLives[id].slice().sort((a, b) => a - b); console.log(`  ${id.padEnd(18)} ${v[0]} · ${v[Math.floor(v.length / 2)]} · ${v[v.length - 1]}   in ${v.filter((x) => x > 0).length}/${LIVES} lives, ${v.reduce((a, b) => a + b, 0)} in all`); }
console.log(`  a co-star turned up wrecked ${carry.wrecked} times: ${carry.again} of them somebody who had done it on an earlier film of yours; ${carry.worldCostars} were stars of the world`);
console.log(`  incidents left on world stars' own records: ${carry.worldFameLost} · things the people involved remember: ${carry.remembered}`);
{ const h = [0, 0, 0, 0, 0, 0]; spread.forEach((y) => { h[Math.min(5, y.n)]++; });
  console.log(`
YEARS BY CHOICES (not the doctor): ${h.map((n, i) => `${i === 5 ? '5+' : i}: ${Math.round((n / Math.max(1, spread.length)) * 100)}%`).join(' · ')}`);
  for (const tp of ['quiet', 'ordinary', 'busy']) { const ys = spread.filter((y) => y.temper === tp); if (ys.length) console.log(`  ${tp.padEnd(9)} ${ys.length} years, ${(ys.reduce((a, y) => a + y.n, 0) / ys.length).toFixed(2)} choices a year`); }
  const ft = firstTen.slice().sort((a, b) => a - b); console.log(`  the first ten years of a career: min ${ft[0]}, median ${ft[Math.floor(ft.length / 2)]}, max ${ft[ft.length - 1]} choices`); }
{ const med = (k) => { const v = known.map((x) => x[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
  console.log(`  people known at the end (median): ${med('all')}, close ${med('close')}, close fellow actors ${med('actors')}`); }
cardsInALife.sort((a, b) => a - b);
console.log(`\nchoice cards in a whole life: min ${cardsInALife[0]}, median ${cardsInALife[Math.floor(LIVES / 2)]}, max ${cardsInALife[LIVES - 1]}`);
// What never came up at all, from the cards the game has.
const fired = new Set([...CARDS.keys()].filter((k) => k.startsWith('card ')).map((k) => k.slice(5)));
console.log(`life/arcs.js cards never seen: ${A.ARCS.map((a) => a.id).filter((id) => !fired.has(id)).join(', ') || 'none'}`);
// The ones about loss, wherever they were written: a death in the family or among the people you know.
const loss = new Map([...FEED.entries()].filter(([k]) => /\bdied\b|\bdeath\b|funeral|passed away|is gone\b|widow/i.test(k)));
show('LOSS IN THE FEED', loss, 20);
