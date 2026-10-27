// Covering for a co-star, end to end (career/cover.js, meta/memory.js): the ask on the set, what
// happens after — they straighten out, they ask again, it comes out, nothing — how the director's
// character decides it, the door that closes with its reason on it, the way back, and the meeting
// years later where both of them remember. And the line ChatGPT drew: a lie is personal, so none
// of it ever moves Standing.
import assert from 'node:assert/strict';
import { career, withSeed, roundTrip } from './helpers/contracts.mjs';
import { startProduction } from '../src/systems/career/production.js';
import { answerDemand, optionsFor } from '../src/systems/career/demands.js';
import { storiesTick, resolveStory, holdsAGrudge } from '../src/systems/meta/stories.js';
import { sendsOffers } from '../src/systems/career/offers.js';
import { memoryLine, feltBy, keyOfCrew } from '../src/systems/meta/memory.js';
import { yourDirectors } from '../src/systems/meta/yourDirectors.js';

let failed = 0;
function test(name, fn) {
  try { withSeed(3, fn); console.log('ok    ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + ' :: ' + e.message); }
}
const film = (over = {}) => ({ id: 'o' + Math.random().toString(36).slice(2, 7), projectTitle: 'Vanished Margo', role: 'Lead', tier: 'lead', type: 'Feature Film', genre: 'Drama',
  scale: 'feature', months: 8, salary: 900000, prestigeScore: 60, stability: 95, deadline: 3, ...over });
// A shoot with a director of a given character and a co-star who is an actor of the world.
function onSet(trait, s = career({ gender: 'male', filmography: [] })) {
  startProduction(s, film());
  const p = s.productions[0]; p.prepLeft = 0;
  Object.assign(p.crew[0], { name: 'Ulrich Beaumont', gender: 'male', trait, bond: 50 });
  Object.assign(p.crew[1], { name: 'Mara Vance', worldId: 'actor-mara', bond: 45 });
  return { s, p };
}
const month = (s) => { s.month++; if (s.month > 11) { s.month = 0; s.year++; } };
// Live months until a story beat opens; return it.
function nextBeat(s, max = 30) {
  for (let i = 0; i < max; i++) { month(s); storiesTick(s); if (s.pendingArc && s.pendingArc.story === 'cover') return s.pendingArc; }
  return null;
}
const pick = (s, label) => { const i = s.pendingArc.choices.findIndex((c) => c.label.startsWith(label)); assert.ok(i >= 0, `no choice "${label}" in ${s.pendingArc.choices.map((c) => c.label)}`); resolveStory(s, s.pendingArc, i); };
function cover(s, p, next) {
  p.demand = { id: 'cover', at: 0 };
  const opts = optionsFor(s, p);
  const c = opts.find((o) => o.id === 'cover');
  answerDemand(s, p.id, 'cover');
  const st = s.stories.find((x) => x.id === 'cover');
  if (next) { st.beat = next; st.data.next = next; }       // the outcome is rolled; a test chooses it
  return c;
}

test('the choice says what kind of director this is, before you lie to them', () => {
  const { s, p } = onSet('perfectionist');
  p.demand = { id: 'cover', at: 0 };
  const c = optionsFor(s, p).find((o) => o.id === 'cover');
  assert.match(c.hint, /Ulrich is a perfectionist/);
  const { s: s2, p: p2 } = onSet('chill'); p2.demand = { id: 'cover', at: 0 };
  assert.match(optionsFor(s2, p2).find((o) => o.id === 'cover').hint, /easy-going/);
});
test('they straighten out: the co-star owes you, and nobody else ever knows', () => {
  const { s, p } = onSet('perfectionist');
  cover(s, p, 'straight');
  assert.ok(nextBeat(s)); pick(s, 'Keep it');
  assert.ok(feltBy(s, 'w:actor-mara') >= 3, 'the co-star does not remember it');
  assert.equal(feltBy(s, keyOfCrew(p.crew[0])), 0, 'the director felt something he never knew about');
  assert.ok(!s.stories.some((x) => x.id === 'cover'));
});
test('it comes out, twice over, to a perfectionist: his door shuts with the reason on it — and Standing does not move', () => {
  const { s, p } = onSet('perfectionist');
  const respect = s.respect;
  cover(s, p, 'again');
  assert.ok(nextBeat(s)); pick(s, 'Cover again');
  const st = s.stories.find((x) => x.id === 'cover'); st.beat = 'found';
  assert.ok(nextBeat(s)); pick(s, 'Own it');
  assert.ok(holdsAGrudge(s, 'Ulrich Beaumont'), 'no grudge');
  const g = s.grudges.find((x) => x.who === 'Ulrich Beaumont');
  assert.match(g.why, /lied to him for Mara Vance on Vanished Margo/);
  assert.equal(s.respect, respect, 'a personal lie moved Standing');
  const person = s.people.find((x) => x.name === 'Ulrich Beaumont');
  assert.ok(person && person.trait === 'perfectionist', 'he is not somebody you know, or lost his character');
  assert.equal(sendsOffers(s, { ...person, relationship: 60, fromSet: 'Vanished Margo' }), false, 'he still sends offers');
  const row = yourDirectors(s).find((x) => x.name === 'Ulrich Beaumont');
  assert.ok(row, 'not on the Directors screen');
  assert.ok(JSON.stringify(row).includes('lied to him'), 'the screen does not say why: ' + JSON.stringify(row).slice(0, 300));
});
test('the same thing to an easy-going director: he shrugs, and no door shuts', () => {
  const { s, p } = onSet('chill');
  cover(s, p, 'found');
  assert.ok(nextBeat(s)); pick(s, 'Own it');
  assert.ok(!holdsAGrudge(s, 'Ulrich Beaumont'));
});
test('blaming the co-star costs the co-star, not Standing', () => {
  const { s, p } = onSet('difficult');
  const respect = s.respect;
  cover(s, p, 'found');
  assert.ok(nextBeat(s)); pick(s, 'Say it was');
  assert.ok(feltBy(s, 'w:actor-mara') < 0, 'the co-star does not mind being blamed');
  assert.equal(s.respect, respect);
});
test('nothing comes of it: the story ends and nobody is changed by it but the co-star', () => {
  const { s, p } = onSet('diva');
  cover(s, p, 'quiet');
  assert.ok(nextBeat(s)); pick(s, 'Let it go');
  assert.ok(!s.stories.some((x) => x.id === 'cover'));
  assert.ok(!holdsAGrudge(s, 'Ulrich Beaumont'));
});
test('telling the first AD: both of them remember who said it', () => {
  const { s, p } = onSet('perfectionist');
  p.demand = { id: 'cover', at: 0 }; answerDemand(s, p.id, 'tell');
  assert.ok(feltBy(s, 'w:actor-mara') < 0);
  assert.ok(feltBy(s, keyOfCrew(p.crew[0])) > 0);
});
test('the way back: a year and a half later, a letter can end it, and his door opens again', () => {
  const { s, p } = onSet('perfectionist');
  cover(s, p, 'again'); nextBeat(s); pick(s, 'Cover again');
  s.stories.find((x) => x.id === 'cover').beat = 'found';
  nextBeat(s); pick(s, 'Own it');
  s.charisma = 100;
  const real = Math.random; Math.random = () => 0;        // the letter lands
  let arc;
  try { arc = nextBeat(s, 30); assert.ok(arc && arc.text.includes('has not forgotten'), 'no second chance came'); pick(s, 'Write to'); } finally { Math.random = real; }
  assert.ok(!holdsAGrudge(s, 'Ulrich Beaumont'), 'the grudge is still there');
});
test('years later he directs you again: he keeps his character, and the set card says what he remembers', () => {
  const { s, p } = onSet('perfectionist');
  cover(s, p, 'found'); nextBeat(s); pick(s, 'Own it');
  const back = roundTrip(s);                                // and it survives a save
  const person = back.people.find((x) => x.name === 'Ulrich Beaumont');
  back.productions = []; back.year += 4;
  startProduction(back, film({ projectTitle: 'Second Light', directorId: person.id, director: person.name }));
  const q = back.productions.find((x) => x.title === 'Second Light');
  assert.equal(q.crew[0].name, 'Ulrich Beaumont');
  assert.equal(q.crew[0].trait, 'perfectionist', 'he came back with a different character');
  assert.match(q.crew[0].remembers || '', /Ulrich Beaumont remembers Vanished Margo \(\d+\): that you lied to him for Mara Vance/);
  assert.match(back.lastEvent, /remembers/);
});
test('a co-star who is an actor of the world remembers too, and starts the next shoot where it left off', () => {
  const { s, p } = onSet('chill');
  cover(s, p, 'straight'); nextBeat(s); pick(s, 'Keep it');
  s.productions = [];
  const before = 30;
  startProduction(s, film({ projectTitle: 'Third Thing', costarId: 'actor-mara' }));
  const q = s.productions.find((x) => x.title === 'Third Thing');
  const mara = q.crew.find((c) => c.worldId === 'actor-mara');
  if (mara) {                                               // the world may not have her (a fixture); when it does:
    assert.ok(mara.bond > before, `she starts cold: ${mara.bond}`);
    assert.match(mara.remembers || '', /covered for them/);
  }
  assert.ok(memoryLine(s, 'w:actor-mara'), 'nothing remembered');
});
test('an old save with no memory loads and runs a month', () => {
  const s = career({ filmography: [] }); delete s.memory;
  storiesTick(s);
  assert.equal(s.memory, undefined, 'a quiet month created the ledger');
});
if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
