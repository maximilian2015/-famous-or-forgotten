// The big story of a busy year (random events, 15 Nov): the takeover (meta/stories.js `takeover`).
// The studio paying for your picture is sold; the new owners review everything they did not start;
// what you do decides who remembers you for it, and a year on what that is worth.
//
// Held here: it only happens in a busy year and only on a studio picture; the whole flow runs
// through the monthly tick from the sale to the year after; a shelved picture goes into the freezer
// for a reason that is not money and the director who was stood by can buy it back; the director
// remembers either way; it does not come again for ten years.
import assert from 'node:assert/strict';
import { career, withSeed } from './helpers/contracts.mjs';
import { startProduction, productionTick } from '../src/systems/career/production.js';
import { CHAINS, storiesTick, resolveStory, storyOf, hiding, strikeOdds, directorCall, ownerCall } from '../src/systems/meta/stories.js';
import { PROBE } from '../src/systems/life/pace.js';
import { frozenTick, freezeProject, thawOffer } from '../src/systems/career/stability.js';
import { feltBy, keyOfCrew } from '../src/systems/meta/memory.js';
import { ensureWorld } from '../src/systems/world/world.js';
import { canWork } from '../src/systems/life/strain.js';
import { offersTick } from '../src/systems/career/offers.js';
import { ensureDirectors, directorsYear, creditDirector, craftOf } from '../src/systems/world/directors.js';
import { advanceMonth } from '../src/engine/time.js';

let failed = 0;
function test(name, fn) {
  try { withSeed(7, fn); console.log('ok    ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + ' :: ' + e.message); }
  finally { PROBE.temper = null; }
}
// A roll forced one way, and the seeded random put back after it.
function forced(r, fn) { const was = Math.random; Math.random = () => r; try { return fn(); } finally { Math.random = was; } }
const film = (title, over = {}) => ({ id: 'o' + title.replace(/\W/g, ''), projectTitle: title, role: 'Lead', tier: 'lead', type: 'Feature Film', genre: 'Drama',
  scale: 'feature', months: 6, salary: 900000, prestigeScore: 60, stability: 92, deadline: 3, ...over });
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
function life(temper = 'busy') {
  PROBE.temper = temper;
  const s = career({ gender: 'female', filmography: [], fame: 45, charisma: 50, mental: 70, cash: 500000 });
  s.stories = []; s._storyLog = {};
  return s;
}
function shoot(s, title, over) {
  startProduction(s, film(title, over));
  const p = s.productions[s.productions.length - 1]; p.prepLeft = 0; p.monthsLeft = 5;
  Object.assign(p.crew[0], { name: 'Ulrich Beaumont', gender: 'male', trait: 'chill', bond: 50 });
  return p;
}
// Every chain but this one is kept out of the way, so whatever starts is the takeover.
function onlyTheTakeover(s) { for (const id of Object.keys(CHAINS)) if (id !== 'takeover') (s._storyLog[id] = [stamp(s)]); }
// The month passes for the story engine only (the shoot itself is held still).
function month(s) { s.month = (s.month || 0) + 1; if (s.month > 11) { s.month = 0; s.year++; } storiesTick(s); }
function startIt(s) { onlyTheTakeover(s); forced(0.01, () => storiesTick(s)); return storyOf(s, 'takeover'); }
function answer(s, i, rnd = 0.5) { assert.ok(s.pendingArc && s.pendingArc.story === 'takeover', 'a takeover card is on the screen'); forced(rnd, () => resolveStory(s, s.pendingArc, i)); }
function until(s, beat) { for (let i = 0; i < 24 && !(s.pendingArc && s.pendingArc.beat === beat); i++) month(s); assert.ok(s.pendingArc && s.pendingArc.beat === beat, `the ${beat} beat came`); }

test('only in a busy year, and only on a studio picture', () => {
  for (const temper of ['quiet', 'ordinary']) { const s = life(temper); onlyTheTakeover(s); shoot(s, 'Glass Harbour'); assert.equal(startIt(s), null, temper); }
  for (const scale of ['indie', 'festival']) { const s = life(); onlyTheTakeover(s); shoot(s, 'Small Hours', { scale, type: 'Indie Film' }); assert.equal(startIt(s), null, scale); }
  { const s = life(); onlyTheTakeover(s); assert.equal(startIt(s), null, 'not on a set'); }
  { const s = life(); onlyTheTakeover(s); const p = shoot(s, 'Glass Harbour'); const st = startIt(s);
    assert.ok(st, 'a busy year on a studio picture starts it');
    assert.equal(st.data.setId, p.id); assert.equal(st.data.director, 'Ulrich Beaumont');
    assert.ok(s.pendingArc && s.pendingArc.beat === 'sold' && s.pendingArc.text.includes('Glass Harbour'), 'the sale is told the month it happens');
    assert.equal(s.pendingArc.choices.length, 3); }
});

test('stand with the director, the picture shelved: the freezer for a reason that is not money, and they buy it back', () => {
  const s = life(); onlyTheTakeover(s); const p = shoot(s, 'Glass Harbour'); startIt(s);
  answer(s, 0, 0.99999);                                     // the argument fails
  const key = keyOfCrew(p.crew[0]);
  assert.ok(feltBy(s, key) > 0, 'the director remembers who stood with them');
  until(s, 'review');
  answer(s, 0);
  assert.ok(!s.productions.some((x) => x.title === 'Glass Harbour'), 'the set is gone');
  const fz = (s.frozen || []).find((x) => x.title === 'Glass Harbour');
  assert.ok(fz && /sold/.test(fz.why) && !/money|financ|fund|bond/.test(fz.why), `frozen for the sale: ${fz && fz.why}`);
  storyOf(s, 'takeover').data.called = true;                 // this time they do call (the odds: below)
  until(s, 'year');
  const before = (s.offers || []).length;
  answer(s, 0);
  const o = s.offers[s.offers.length - 1];
  assert.equal(s.offers.length, before + 1); assert.equal(o.kind, 'thaw'); assert.equal(o.projectTitle, 'Glass Harbour');
  assert.ok(/bought it back/.test(o.note), o.note);
  assert.ok(!(s.frozen || []).some((x) => x.title === 'Glass Harbour'), 'out of the freezer');
  assert.equal(storyOf(s, 'takeover'), null, 'the story is over');
});

test('the picture they buy back is shot by the same people: the same director, the same co-star, on the same record', () => {
  const s = life(); ensureWorld(s); ensureDirectors(s); onlyTheTakeover(s);
  const r = s.world.directors.find((x) => x.band === 'working' || x.band === 'strong');
  startProduction(s, film('Glass Harbour', { director: r.name, directorId: r.id }));
  const p = s.productions[0]; p.prepLeft = 0; p.monthsLeft = 5;
  const star = s.world.actors.find((a) => a.alive && !a.retired);
  p.crew[1] = { ...p.crew[1], name: star.name, worldId: star.id, bond: 33, bond0: 33 };
  const crewBefore = p.crew.map((c) => c.id);
  startIt(s);
  answer(s, 0, 0.99999);                                     // stand with them; the argument fails
  const dirId = p.crew[0].knownId;
  assert.ok(dirId, 'the director is somebody in your phone now');
  until(s, 'review'); answer(s, 0);
  const person = s.people.find((x) => x.id === dirId); person.relationship = 77;   // a year of being close
  storyOf(s, 'takeover').data.called = true;
  until(s, 'year'); answer(s, 0);
  const o = s.offers.find((x) => x.kind === 'thaw' && x.projectTitle === 'Glass Harbour');
  assert.ok(o && o.resume && o.director === r.name, 'the paper names the director who bought it back');
  startProduction(s, o);
  const q = s.productions.find((x) => x.title === 'Glass Harbour');
  assert.deepEqual(q.crew.map((c) => c.id), crewBefore, 'the same crew, member for member');
  assert.equal(q.crew[0].knownId, dirId, 'the same person directing');
  assert.equal(q.crew[0].bond, 77, 'arriving at the relationship you have now');
  assert.equal(q.crew[1].worldId, star.id, 'the same co-star of the world'); assert.equal(q.crew[1].bond, 33, 'where you left them');
  assert.equal(q.with, star.name);
  assert.equal(q.rosterDirector, r.id, 'the set knows whose film it is');
  assert.ok(/again/.test(s.lastEvent), s.lastEvent);
  assert.equal(o.via, 'director', 'and Messages says the director sent it, not the agent');
  // The wrap: the film lands on that director's record, and nobody else's.
  const made = r.made || 0, others = s.world.directors.filter((x) => x !== r).map((x) => x.made || 0);
  s.productions = [q]; s.production = q; q.prepLeft = 0; q.monthsLeft = 1;
  forced(0.5, () => productionTick(s));
  assert.ok(!s.productions.some((x) => x.title === 'Glass Harbour'), 'it wrapped');
  assert.equal(r.made, made + 1, `on ${r.name}'s record`);
  assert.deepEqual(s.world.directors.filter((x) => x !== r).map((x) => x.made || 0), others, 'and on no other director\'s');
});

test('somebody who cannot come back is replaced, and it is said; a freeze from an old save still thaws', () => {
  const s = life(); ensureWorld(s); const p = shoot(s, 'Long Pause');
  const star = s.world.actors.find((a) => a.alive && !a.retired);
  p.crew[1] = { ...p.crew[1], name: star.name, worldId: star.id };
  freezeProject(s, p, { quiet: true });
  star.alive = false;
  const o = thawOffer(s, s.frozen[0]);
  startProduction(s, o);
  const q = s.productions.find((x) => x.title === 'Long Pause');
  assert.equal(q.crew[0].name, 'Ulrich Beaumont', 'the director is back');
  assert.ok(q.crew[1].worldId !== star.id && q.crew[1].name !== star.name, 'the co-star who died is not');
  assert.ok(s.timeline.some((t) => /has died/.test(t.text || t) && /Long Pause/.test(t.text || t)), 'and the timeline says why');
  const old = life(); const p2 = shoot(old, 'Old Freeze'); freezeProject(old, p2, { quiet: true });
  delete old.frozen[0].crew; delete old.frozen[0].rosterDirector;    // what a save from before this kept
  const o2 = thawOffer(old, old.frozen[0]);
  assert.equal(o2.resume, null);
  startProduction(old, o2);
  assert.equal(old.productions.find((x) => x.title === 'Old Freeze').crew.length, p2.crew.length, 'a fresh crew, as before');
});

test('lunch with the new owners: the director remembers it the other way, and the owners send their big picture', () => {
  const s = life(); onlyTheTakeover(s); const p = shoot(s, 'Glass Harbour'); startIt(s);
  answer(s, 1, 0.01);                                        // the picture is kept
  assert.ok(feltBy(s, keyOfCrew(p.crew[0])) < 0, 'the director remembers you went over their head');
  until(s, 'review'); answer(s, 0);
  assert.ok(s.productions.some((x) => x.title === 'Glass Harbour'), 'the picture stays on the slate');
  const respect = s.respect;
  storyOf(s, 'takeover').data.called = true;
  until(s, 'year'); answer(s, 0);
  const o = s.offers[s.offers.length - 1];
  assert.equal(o.kind, 'takeover'); assert.equal(o.scale, 'blockbuster'); assert.equal(o.tier, 'lead');
  assert.ok(s.respect < respect, 'the trades notice who found the new owners first');
});

test('a year on is not a promise: your Standing, how close you are and the director\'s own name decide it', () => {
  const s = life(); ensureWorld(s); ensureDirectors(s);
  s.people.push({ id: 'dir1', name: 'Ulrich Beaumont', role: 'Film Director', relationship: 20 });
  const d = { dirId: 'dir1', rosterId: null, saved: true };
  s.respect = 10; const low = directorCall(s, d).odds;
  s.respect = 80; s.people.find((x) => x.id === 'dir1').relationship = 85;
  const high = directorCall(s, d).odds;
  assert.ok(low <= 30 && high >= 70, `${low} → ${high}`);
  const r = s.world.directors[0]; d.rosterId = r.id;
  r.standing = 20; const flop = directorCall(s, d).odds; r.standing = 90; const hit = directorCall(s, d).odds;
  assert.ok(hit - flop >= 15, `a director with hits behind them gets you made: ${flop} → ${hit}`);
  s.fame = 20; const nobody = ownerCall(s); s.fame = 80; assert.ok(ownerCall(s) - nobody >= 30, 'the new owners want a name while it is one');
  // When nobody calls, the card says why, and there is no paper.
  const t = life(); onlyTheTakeover(t); shoot(t, 'Glass Harbour'); startIt(t);
  answer(t, 0, 0.01); until(t, 'review'); answer(t, 0);
  t.respect = 2; storyOf(t, 'takeover').data.called = false;
  until(t, 'year');
  assert.ok(/name with more weight/.test(t.pendingArc.text), t.pendingArc.text);
  const n = (t.offers || []).length; answer(t, 0);
  assert.equal((t.offers || []).length, n, 'no paper');
  assert.equal(storyOf(t, 'takeover'), null, 'and the story is over');
});

test('head down: the review is a coin, and nothing comes a year on', () => {
  const s = life(); onlyTheTakeover(s); shoot(s, 'Glass Harbour'); startIt(s);
  answer(s, 2, 0.01);
  until(s, 'review'); answer(s, 0);
  assert.equal(storyOf(s, 'takeover'), null, 'it ends at the review');
});

test('not again for ten years', () => {
  const s = life(); onlyTheTakeover(s); shoot(s, 'Glass Harbour'); startIt(s);
  answer(s, 2, 0.01); until(s, 'review'); answer(s, 0);
  s.productions = []; s.production = null; shoot(s, 'Second Harbour');
  s.year += 9; assert.equal(startIt(s), null, 'nine years on');
  s.year += 2; assert.ok(startIt(s), 'eleven years on');
});

test('a freeze something else will end is left alone by the freezer', () => {
  const s = life(); const p = shoot(s, 'Picket Line');
  freezeProject(s, p, { why: 'the actors are on strike', held: 'strike', quiet: true });
  const f = s.frozen[0]; f.since = stamp(s) - 40; f.patience = 10;   // long past anybody's patience
  forced(0, () => frozenTick(s));
  assert.equal(s.frozen.length, 1, 'still in the freezer, waiting for the strike to end');
  assert.ok(!s.bigMoment, 'a quiet freeze shows no shutdown screen');
});

// ── the strike (wave one, no. 9) ─────────────────────────────────────────────
function strikeStart(s) { for (const id of Object.keys(CHAINS)) if (id !== 'strike') (s._storyLog[id] = [stamp(s)]); s._strikeCalm = stamp(s) - 400; forced(0.001, () => storiesTick(s)); return storyOf(s, 'strike'); }
test('the strike: not for ten years after the last, then the pressure builds', () => {
  assert.equal(strikeOdds(0), 0); assert.equal(strikeOdds(119), 0);
  assert.ok(strikeOdds(180) > 0 && strikeOdds(180) < strikeOdds(260)); assert.equal(strikeOdds(900), 1.5);
  const s = life(); for (const id of Object.keys(CHAINS)) if (id !== 'strike') s._storyLog[id] = [stamp(s)];
  forced(0.001, () => storiesTick(s)); assert.equal(storyOf(s, 'strike'), null, 'an old save has no pressure built up the first time it is asked');
  assert.equal(s._strikeCalm, stamp(s));
});
test('the strike: every set stops, pay-or-play pays nothing, openings move back, nothing is cast, nothing lapses while it lasts', () => {
  const s = life(); shoot(s, 'Glass Harbour', { payOrPlay: true });
  const fee = s.productions[0].salary, paidBefore = s.productions[0].paid || 0;
  s.offers = [{ id: 'waiting', projectTitle: 'Desk Part', role: 'Lead', tier: 'lead', scale: 'feature', months: 3, deadline: 1, salary: 1e5 }];
  s.releases = [{ id: 'r1', title: 'Early Light', due: stamp(s) + 1, wait: 6 }, { id: 'r2', title: 'Far Out', due: stamp(s) + 30, wait: 6 }];
  const cash = s.cash;
  const st = strikeStart(s);
  assert.ok(st, 'it starts'); const months = st.data.months;
  assert.equal(s.productions.length, 0, 'the set has stopped');
  const fz = s.frozen.find((f) => f.title === 'Glass Harbour');
  assert.ok(fz && fz.held === 'strike' && /strike/.test(fz.why), 'into the freezer, held for the strike');
  assert.equal(s.cash, cash, 'force majeure: pay-or-play pays nothing');
  assert.equal(fz.owed, fee - paidBefore, 'and the rest of the fee is still what it would come back for');
  const early = s.releases.find((r) => r.id === 'r1'), far = s.releases.find((r) => r.id === 'r2');
  assert.ok(early.due > st.data.until && early.due - early.wait === stamp(s) + 1 - 6, `an opening inside the strike is moved past it: ${early.due} vs ${st.data.until}`);
  assert.equal(far.due, stamp(s) + 30, 'one long after it is not');
  assert.ok(/moved it back/.test(s.pendingArc.text), 'and the card says so');
  assert.ok(hiding(s), 'nobody is cast while it lasts');
  assert.equal(canWork(s).ok, false); assert.ok(/strike/.test(canWork(s).why), canWork(s).why);
  assert.ok(s.pendingArc && s.pendingArc.story === 'strike' && s.pendingArc.text.includes('Glass Harbour'), 'the card names your picture');
  forced(0.5, () => resolveStory(s, s.pendingArc, 0));       // the picket line
  storyOf(s, 'strike').data.fates = { pics: [{ id: fz.id, title: fz.title, fate: 'back', cut: 20 }], pulled: [] };
  for (let i = 0; i < months + 2 && !(s.pendingArc && s.pendingArc.beat === 'over'); i++) { month(s); offersTick(s); forced(0.99, () => frozenTick(s)); }
  assert.ok(s.offers.some((o) => o.id === 'waiting'), 'the part on the desk waited');
  assert.ok(s.pendingArc && s.pendingArc.beat === 'over', 'it ends when the guild said');
  assert.ok(s.frozen.some((f) => f.title === 'Glass Harbour'), 'the freezer held it the whole time, rescue rolls or not');
  forced(0.5, () => resolveStory(s, s.pendingArc, 0));
  const o = s.offers.find((x) => x.kind === 'thaw' && x.projectTitle === 'Glass Harbour');
  assert.ok(o && o.salary === Math.round((fee - paidBefore) * 0.8) && /20% less/.test(o.note), `it comes back smaller: ${o && o.salary} — ${o && o.note}`);
  assert.ok(!s.strike && !hiding(s) && canWork(s).ok, 'and work is possible again');
});

test('while it lasts nobody rings back with a part, and a signed date moves with the strike', () => {
  const s = life(); shoot(s, 'Glass Harbour');
  s.submissions = [{ id: 'sub1', casting: { title: 'Read For It', role: 'Lead' }, title: 'Read For It', role: 'Lead', odds: 100, quality: 70, due: stamp(s) + 1, wait: 1 }];
  s.offers = [film('Signed Part', { id: 'sig', signed: true, startAt: stamp(s) + 1 })];
  const st = strikeStart(s);
  assert.equal(s.submissions[0].due, st.data.until + 1, 'the read answers the first month after it, and its date says so');
  s.laterOffers = [{ due: stamp(s) + 1, since: stamp(s) - 12, offer: film('Sequel Two', { kind: 'sequel' }) }];
  s.pendingArc = null; s.bigMoment = null;
  advanceMonth(s);
  assert.ok(!(s.offers || []).some((o) => o.projectTitle === 'Sequel Two'), 'no sequel paper while the sets are dark');
  assert.ok(s.offers.some((o) => o.id === 'sig'), 'the signed part is not recast for a date the strike took');
  storyOf(s, 'strike').data.fates = { pics: [], pulled: [] };
  s.month += st.data.until - stamp(s); while (s.month > 11) { s.month -= 12; s.year++; }
  const end = { ...storyOf(s, 'strike'), beat: 'over' };
  forced(0.5, () => CHAINS.strike.beats.over.build(s, end).choices[0].apply());
  assert.equal(s.offers.find((o) => o.id === 'sig').startAt, stamp(s), 'its date is today, and the two months they hold it start now');
});

// The day it ends, drawn straight from the chain — with every roll one way, or (no rnd) the seeded dice.
function endDay(s, rnd) {
  s.strike = { since: stamp(s) - 4, until: stamp(s) };
  const st = { id: 'strike', beat: 'over', data: { months: 4, until: stamp(s), path: 'home', stopped: [] } };
  const run = (fn) => (rnd == null ? fn() : forced(rnd, fn));
  const b = run(() => CHAINS.strike.beats.over.build(s, st));
  run(() => b.choices[0].apply());
  return b;
}
const heldPic = (s, id, stability) => (s.frozen = s.frozen || []).push({ id, title: id, role: 'Lead', scale: 'feature', tier: 'lead', monthsLeft: 2, owed: 500000, stability, since: stamp(s) - 4, held: 'strike', patience: 30 });
test('the strike\'s last day: a picture comes back smaller, stays in the freezer or is cancelled, and parts are pulled', () => {
  { const s = life(); heldPic(s, 'Doomed', 80); s.offers = [{ id: 'a', projectTitle: 'Pulled Part', kind: 'film' }, { id: 'b', projectTitle: 'Signed Part', signed: true }, { id: 'c', projectTitle: 'Face Of', kind: 'brand' }];
    const mental = s.mental; const b = endDay(s, 0);
    assert.ok(!s.frozen.length, 'cancelled: gone from the freezer'); assert.ok(s.mental < mental, 'and it costs you');
    assert.deepEqual(s.offers.map((o) => o.id), ['b', 'c'], 'an unsigned part is pulled; a signed one and a brand are not');
    assert.ok(/cancelled/.test(b.text) && /Pulled Part/.test(b.text), b.text); }
  { const s = life(); heldPic(s, 'Cold', 80); endDay(s, 0.2);
    assert.ok(s.frozen.length === 1 && !s.frozen[0].held && /money/.test(s.frozen[0].why), 'stays in the freezer, as an ordinary freeze from here');
    assert.ok(!(s.offers || []).length, 'and no paper'); }
  { const s = life(); heldPic(s, 'Back', 80); endDay(s, 0.99999);
    assert.ok(!s.frozen.length && s.offers.some((o) => o.kind === 'thaw' && o.salary < 500000), 'comes back, on less money'); }
  // By how solid the money was: a locked picture nearly always comes back, money nobody could name often does not.
  const backRate = (stability) => { let n = 0; for (let i = 0; i < 300; i++) { const s = life(); heldPic(s, 'P', stability); s.offers = []; endDay(s); if ((s.offers || []).some((o) => o.kind === 'thaw')) n++; } return n / 300; };
  const locked = backRate(95), fragile = backRate(40);
  assert.ok(locked > 0.65 && fragile < 0.5 && locked - fragile > 0.25, `locked ${locked.toFixed(2)}, no real money ${fragile.toFixed(2)}`);
});

// ── the director who remembered (wave one, no. 1): the world's directors make films now ──────
test('a director of the world is re-read on every film, theirs and yours, and a first-timer can become a name', () => {
  const s = { year: 2030, month: 0, world: {} };
  ensureDirectors(s);
  const d = s.world.directors.find((x) => x.band === 'new');
  const before = d.standing;
  creditDirector(s, d.id, 92);                                 // a film you made together, and it was very good
  assert.ok(d.standing > before + 10, `${before} → ${d.standing}`);
  d.craft = 90; d.born = 2000;
  for (let y = 0; y < 9; y++) { s.year++; forced(0.3, () => directorsYear(s)); }
  assert.ok(d.standing >= 62, `nine years of good films make a name: ${d.standing}`);
  const old = { id: 'dx', name: 'Old Save', standing: 70, band: 'strong', alive: true, born: 1990 };
  s.world.directors.push(old); assert.equal(craftOf(old) >= 76 && craftOf(old) <= 84, true, 'an old save gets the craft its standing says');
});
test('a shoot with a director of the world lands on their record at the wrap', () => {
  const s = life(); ensureWorld(s); ensureDirectors(s);
  const d = s.world.directors.find((x) => x.band === 'working');
  startProduction(s, film('Roster Picture', { director: d.name, directorId: d.id }));
  assert.equal(s.productions[0].rosterDirector, d.id);
  const y = { id: 'p-me', name: 'Phone Person', role: 'Film Director', relationship: 50 }; s.people.push(y);
  startProduction(s, film('Phone Picture', { director: y.name, directorId: y.id }));
  assert.equal(s.productions.find((p) => p.title === 'Phone Picture').rosterDirector, null, 'somebody in your phone is not on the roster');
});

if (failed) { console.log(`\n${failed} FAILED`); process.exit(1); }
console.log('\nall passed');
