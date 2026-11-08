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
//   node tests/probes/probe_random_events.mjs [lives=20] [years=60]
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
const CARDS = tally(), MOMENTS = tally(), FEED = tally(), BADFEED = tally(), TEXTS = tally();
const perYear = { cards: 0, moments: 0, feed: 0, badFeed: 0, texts: 0, invites: 0, press: 0 };
let years = 0, died = 0;
const cardsInALife = [];

for (let life = 0; life < LIVES; life++) {
  const s = createInitialState({ name: 'R' + life, dream: Math.random() < 0.2 ? 'singer' : 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 20, year: 2050, month: 0, hasApartment: true,
    housing: 'room', cash: 12000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, livingWith: 'own_place' });
  let t = s; let cardsHere = 0;
  for (let m = 0; m < YEARS * 12 && t.alive; m++) {
    const r = Math.random();
    // ── the player's month, as audit_wide plays it ──
    if (t.pendingArc) { const n = (t.pendingArc.choices || []).length; A.resolveArc(t, Math.floor(Math.random() * Math.max(1, n))); t.pendingArc = null; }
    if (t.scene) SC.resolveScene(t, SC.autoQuality(t));
    t.bigMoment = null; t.moments = [];
    if (t.production && !t.production.take) { const o = ST.takesFor(t.production); ST.pushTake(t, o[Math.floor(Math.random() * o.length)]); }
    if (t.illness && (t.cash || 0) > H.treatmentCost(t, t.illness) && r < 0.7) H.seeDoctor(t);
    K.refreshCastingPool(t);
    if (!t.production && (t.ap || 0) > 0 && (t.castingPool || []).length && r < 0.75) {
      const c = t.castingPool[Math.floor(Math.random() * t.castingPool.length)];
      if (r < 0.25) K.prepareFor(t, c.id);
      K.auditionFor(t, c.id, Math.round(Math.random() * 100));
    }
    if ((t.offers || []).length && !t.production && r > 0.3) {
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
    if (t.production && (t.ap || 0) > 0) PR.rehearse(t);
    // ── the month itself, and what came out of it ──
    const feedBefore = new Set(t.timeline || []), textsBefore = new Set(t.sms || []);
    const invBefore = (t.events || []).length, pressBefore = new Set(t.press || []);
    t = advanceMonth(t);
    if (m % 12 === 11) years++;
    if (t.pendingArc) {
      const a = t.pendingArc;
      const key = a.story ? `story ${a.story} · ${a.beat}` : a.need ? `ask ${a.need}` : a.health ? `doctor ${a.id || a.health}` : a.youth ? `youth ${a.id}` : `card ${a.id}`;
      bump(CARDS, key, life); perYear.cards++; cardsHere++;
    }
    for (const mo of [t.bigMoment, ...(t.moments || [])].filter(Boolean)) { bump(MOMENTS, `${mo.id || mo.kind || '?'}${mo.kind ? ' (' + mo.kind + ')' : ''}`, life); perYear.moments++; }
    for (const x of (t.timeline || []).filter((x) => !feedBefore.has(x))) { bump(FEED, shape(x.text), life); perYear.feed++; if (x.bad) { bump(BADFEED, shape(x.text), life); perYear.badFeed++; } }
    for (const x of (t.sms || []).filter((x) => !textsBefore.has(x))) { bump(TEXTS, shape(x.text || x.body || x.kind || '?'), life); perYear.texts++; }
    perYear.invites += Math.max(0, (t.events || []).length - invBefore);
    perYear.press += (t.press || []).filter((x) => !pressBefore.has(x)).length;
  }
  if (!t.alive) died++;
  cardsInALife.push(cardsHere);
}

const per = (n) => (n / Math.max(1, years)).toFixed(2);
console.log(`${LIVES} lives from 20, up to ${YEARS} years: ${years} lived years, ${died} died before the end`);
console.log(`\nPER YEAR OF LIFE`);
console.log(`  choice cards ${per(perYear.cards)} · big screens ${per(perYear.moments)} · feed lines ${per(perYear.feed)} (bad news ${per(perYear.badFeed)}) · texts ${per(perYear.texts)} · invitations ${per(perYear.invites)} · press ${per(perYear.press)}`);
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
cardsInALife.sort((a, b) => a - b);
console.log(`\nchoice cards in a whole life: min ${cardsInALife[0]}, median ${cardsInALife[Math.floor(LIVES / 2)]}, max ${cardsInALife[LIVES - 1]}`);
// What never came up at all, from the cards the game has.
const fired = new Set([...CARDS.keys()].filter((k) => k.startsWith('card ')).map((k) => k.slice(5)));
console.log(`life/arcs.js cards never seen: ${A.ARCS.map((a) => a.id).filter((id) => !fired.has(id)).join(', ') || 'none'}`);
// The ones about loss, wherever they were written: a death in the family or among the people you know.
const loss = new Map([...FEED.entries()].filter(([k]) => /\bdied\b|\bdeath\b|funeral|passed away|is gone\b|widow/i.test(k)));
show('LOSS IN THE FEED', loss, 20);
