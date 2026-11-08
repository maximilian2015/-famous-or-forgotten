// The five cards on a set (life/arcs.js scope 'production'), after 8 Nov: rarer, with a reason,
// and with consequences that outlive the film.
//
// tests/probes/probe_random_events.mjs measured each of them at about twenty times a life, a
// different stranger every time, and nothing came of any of it for the people in them. Maxi/ChatGPT:
// the habit is the person's and goes with them to the next set; what happened costs THEM, on their
// own career, whether or not you do anything; and the three-year rest is for these old cards only.
import assert from 'node:assert/strict';
import { career, withSeed } from './helpers/contracts.mjs';
import { startProduction } from '../src/systems/career/production.js';
import { ARCS, maybeStartArc, resolveArc, habitOf, arcCard } from '../src/systems/life/arcs.js';
import { rollDemand } from '../src/systems/career/demands.js';
import { feltBy, keyOfCrew } from '../src/systems/meta/memory.js';

let failed = 0;
function test(name, fn) {
  try { withSeed(5, fn); console.log('ok    ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + ' :: ' + e.message); }
}
const film = (title, over = {}) => ({ id: 'o' + Math.random().toString(36).slice(2, 7), projectTitle: title, role: 'Lead', tier: 'lead', type: 'Feature Film', genre: 'Drama',
  scale: 'feature', months: 8, salary: 900000, prestigeScore: 60, stability: 95, deadline: 3, ...over });
const ON_SET = ARCS.filter((a) => a.scope === 'production').map((a) => a.id);
// An actor of the world who drinks on the job, and a life with nothing else waiting to happen.
const DRINKER = { id: 'actor-kai', name: 'Kai Rook', fame: 60, alive: true, retired: false, born: 2030, credits: [], habit: 'drink' };
function life() {
  const s = career({ gender: 'female', filmography: [], fame: 35, mental: 70, cash: 500000 });
  s.world = { ...(s.world || {}), actors: [{ ...DRINKER }], directors: (s.world && s.world.directors) || [] };
  s._arcsDone = ARCS.filter((a) => a.once).map((a) => a.id);
  return s;
}
// A shoot opposite Kai, going well, with an easy-going director: nothing but Kai can happen on it.
function shootWithKai(s, title) {
  startProduction(s, film(title));
  const p = s.productions[0]; p.prepLeft = 0; p.monthsLeft = 6; p.meter = 60; p.lostDays = 0;
  Object.assign(p.crew[0], { name: 'Ulrich Beaumont', gender: 'male', trait: 'chill', bond: 50 });
  Object.assign(p.crew[1], { name: DRINKER.name, worldId: DRINKER.id, bond: 45 });
  s.production = p;
  return p;
}
// Months on the set until a card comes (bounded), as the monthly tick asks.
function until(s, n = 60) { for (let i = 0; i < n && !s.pendingArc; i++) { maybeStartArc(s); s.month++; if (s.month > 11) { s.month = 0; s.year++; } } return s.pendingArc; }
const wrap = (s) => { s.productions = []; s.production = null; s.pendingArc = null; };

test('a habit is the person\'s: the same person reads the same every time, about one in seven carry it', () => {
  const people = Array.from({ length: 7000 }, (_, i) => ({ id: 'crew' + i.toString(36) + 'x', name: 'P' + i }));
  const share = people.filter((c) => habitOf({}, c) === 'drink').length / people.length;
  assert.ok(share > 0.11 && share < 0.18, String(share));
  assert.ok(people.every((c) => habitOf({}, c) === habitOf({}, { ...c })));
});

test('a co-star without the habit never turns up wrecked', () => {
  const s = life(); const p = shootWithKai(s, 'Glass Harbor');
  s.world.actors[0].habit = null;
  const got = until(s);
  assert.ok(!got || got.id !== 'costarWrecked', got && got.id);
  assert.ok(!(p._incidents || []).includes('costarWrecked'));
});

test('Kai turns up wrecked, and it costs Kai whatever you do: fame, and a mark on the record', () => {
  const s = life(); const p = shootWithKai(s, 'Glass Harbor'); p._trouble = true;
  const fame0 = s.world.actors[0].fame;
  const got = until(s);
  assert.equal(got && got.id, 'costarWrecked');
  const kai = s.world.actors[0];
  assert.ok(kai.fame < fame0 && fame0 - kai.fame <= 4, `${fame0} -> ${kai.fame}`);
  assert.deepEqual(kai.incidents.map((x) => x.title), ['Glass Harbor']);
  // You stayed out of it: the card is answered with the first choice that is not a roll; it is still on Kai.
  resolveArc(s, 2);
  assert.equal(s.world.actors[0].incidents.length, 1);
});

test('one card a film, and not the same card on the next film, and not again for three years', () => {
  const s = life(); const p = shootWithKai(s, 'Glass Harbor'); p._trouble = true;
  assert.equal(until(s).id, 'costarWrecked'); s.pendingArc = null;
  assert.equal(until(s, 24), null, 'a second card on the same film');
  wrap(s);
  const q = shootWithKai(s, 'Low Tide'); q._trouble = true;
  const next = until(s, 24);
  assert.ok(!next || next.id !== 'costarWrecked', 'the same card two films running');
  wrap(s);
  // Thirty months after it happened, on a third film where it is not the card before: still resting.
  // (Set the clock exactly: the loops above walk it on, and past 36 months it would rightly come back.)
  const at = s._arcAt.costarWrecked; const put = (m) => { s.year = Math.floor(m / 12); s.month = m % 12; };
  put(at + 30); s._lastSetIncident = 'somethingElse';
  const r = shootWithKai(s, 'Third Film'); r._trouble = true;
  const third = until(s, 5);
  assert.ok(!third || third.id !== 'costarWrecked', 'the same card inside three years');
  wrap(s); put(at + 37); s._lastSetIncident = 'somethingElse';
  const f4 = shootWithKai(s, 'Fourth Film'); f4._trouble = true;
  assert.equal((until(s) || {}).id, 'costarWrecked', 'and back after three years');
});

test('Kai on a later film of yours is still Kai: the card says so, and names the film it happened on', () => {
  const s = life(); const p = shootWithKai(s, 'Glass Harbor'); p._trouble = true;
  until(s); resolveArc(s, 0);
  wrap(s); s.year += 4; s._lastSetIncident = 'droneOverSet';
  const q = shootWithKai(s, 'Low Tide'); q._trouble = true;
  const again = until(s);
  assert.equal(again && again.id, 'costarWrecked');
  assert.ok(/^Kai Rook again\. On "Glass Harbor"/.test(again.text), again.text);
  assert.equal(s.world.actors[0].incidents.length, 2);
});

test('what you did is remembered by the person it was done to, and the card says so before you choose', () => {
  const s = life(); const p = shootWithKai(s, 'Glass Harbor'); p._trouble = true;
  const card = until(s);
  const shown = arcCard(s, card);
  assert.ok(shown.choices[2].tags.some((t) => /Kai will remember it/.test(t.t)), JSON.stringify(shown.choices[2].tags));
  assert.ok(shown.choices[0].tags.some((t) => /it may come back later/.test(t.t)));
  const key = keyOfCrew(p.crew[1]);
  resolveArc(s, 2);   // take the scene from them
  assert.ok(feltBy(s, key) < 0, String(feltBy(s, key)));
});

test('covering for Kai is the cover story, and the set will not then ask you to cover for Kai as well', () => {
  const s = life(); const p = shootWithKai(s, 'Glass Harbor'); p._trouble = true;
  until(s); resolveArc(s, 0);
  assert.ok((s.stories || []).some((x) => x.id === 'cover'), 'no cover story');
  for (let i = 0; i < 40; i++) { p.demand = null; p._demandMonth = null; rollDemand(s, p); assert.ok(!p.demand || p.demand.id !== 'cover'); }
});

test('a director who cracks pays for it in the business, more if you were the one who called the studio', () => {
  const s = life(); s.world.actors[0].habit = null;
  const p = shootWithKai(s, 'Glass Harbor'); p._trouble = true; p.meter = 20;
  Object.assign(p.crew[0], { trait: 'perfectionist' });
  let card = until(s);
  while (card && card.id !== 'directorCracks') { s.pendingArc = null; p._incidents = []; s._lastSetIncident = null; s._arcAt = {}; card = until(s); }
  assert.equal(card && card.id, 'directorCracks');
  const who = (s.people || []).find((x) => x.id === p.crew[0].knownId);
  assert.ok(who && who.incidents && who.incidents[0].what === 'cracked', 'nothing on the director');
  const w0 = who.industryWeight;
  resolveArc(s, 1);   // tell the studio
  assert.ok(who.industryWeight <= w0 - 6, `${w0} -> ${who.industryWeight}`);
  assert.ok(feltBy(s, 'p:' + who.id) < 0);
});

test('most shoots have none of these, decided once per shoot', () => {
  let some = 0;
  for (let i = 0; i < 300; i++) { const s = life(); const p = shootWithKai(s, 'F' + i); until(s, 1); if (p._trouble) some++; assert.ok(p._trouble === true || p._trouble === false); }
  assert.ok(some > 90 && some < 150, String(some));
});

test('an old save: a shoot with none of the new fields loads and plays', () => {
  const s = life(); const p = shootWithKai(s, 'Old'); delete p._trouble; delete p._incidents; delete s._arcAt; delete s._lastSetIncident;
  s.world.actors[0].incidents = undefined; s.world.actors[0].habit = undefined;
  assert.doesNotThrow(() => until(s));
});

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
