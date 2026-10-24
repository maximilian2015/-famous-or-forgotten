// Film stories (career/plot), stage one: a new film offer is given its story once, the offer
// shows its synopsis and never its twist, the story rides with the project to the credit, and
// nothing old is rewritten. The story generator's own checks (every combination, every part
// two, every title) live in tools/story-proto and are run there.
import assert from 'node:assert/strict';
import { career, withSeed, roundTrip } from './helpers/contracts.mjs';
import { dressOffers } from '../src/systems/career/script.js';
import { startProduction, productionTick } from '../src/systems/career/production.js';
import { freezeProject } from '../src/systems/career/stability.js';

let failed = 0;
function test(name, fn) {
  try { withSeed(7, fn); console.log('ok    ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + ' :: ' + e.message); }
}
const film = (over = {}) => ({ id: 'o' + Math.random().toString(36).slice(2, 7), projectTitle: 'Midnight Talker', role: 'Lead', tier: 'lead',
  type: 'Feature Film', genre: 'Comedy', scale: 'feature', months: 3, salary: 200000, prestigeScore: 60, stability: 95, deadline: 3, ...over });
const shown = (o) => [o.premise, o.character && o.character.what, o.note].filter(Boolean).join(' ');

test('a new film offer is given a story; the offer shows its synopsis and not its twist', () => {
  const s = career({ gender: 'male', filmography: [] }); const o = film(); s.offers = [o];
  dressOffers(s);
  assert.ok(o.plot, 'no story');
  assert.equal(o.premise, o.plot.synopsis);
  assert.ok(o.plot.twist && !shown(o).includes(o.plot.twist.replace(/\.$/, '')), 'the twist is on the card');
  assert.equal(o.character.what, o.plot.hero.replace(/^./, (c) => c.toLowerCase()), 'the lead is not the hero');
});
test('the title chooses the story: "Midnight Talker" is the radio host', () => {
  const s = career({ gender: 'male', filmography: [] }); const o = film(); s.offers = [o];
  dressOffers(s);
  assert.equal(o.plot.shape, 'lastShow');
});
test('a heroine is she, a hero is he', () => {
  const sf = career({ gender: 'female', filmography: [] }); const a = film({ projectTitle: 'Paper Cousin' }); sf.offers = [a]; dressOffers(sf);
  const sm = career({ gender: 'male', filmography: [] }); const b = film({ projectTitle: 'Paper Cousin' }); sm.offers = [b]; dressOffers(sm);
  assert.ok(!/\b(he|his|him)\b/.test(a.plot.synopsis), a.plot.synopsis);
  assert.ok(!/\b(she|her)\b/.test(b.plot.synopsis), b.plot.synopsis);
});
test('a supporting part is somebody else in the story, and of your gender when it says so', () => {
  for (let i = 0; i < 60; i++) {
    const s = career({ gender: 'male', filmography: [] }); const o = film({ tier: 'supporting', role: 'Supporting', projectTitle: 'Film ' + i, genre: ['Crime', 'Horror', 'Romance', 'Musical'][i % 4] });
    s.offers = [o]; dressOffers(s);
    assert.equal(o.character.what, o.plot.part.replace(/^./, (c) => c.toLowerCase()));
    assert.ok(o.plot.part !== o.plot.hero, 'the part is the hero');
    assert.ok(!/\b(her|she|woman|widow|sister|mother|grandmother|daughter)\b/.test(o.plot.part), `a man was given "${o.plot.part}"`);
  }
});
test('an offer already dressed in an old save keeps what it said', () => {
  const s = career({ filmography: [] }); const o = film({ premise: 'A hospital on the last week before it closes.', character: { name: 'Ann Lee', what: 'the son who stayed', tier: 'lead' } });
  s.offers = [o]; dressOffers(s);
  assert.equal(o.premise, 'A hospital on the last week before it closes.');
  assert.equal(o.plot, undefined);
});
test('sequels, seasons, renewals and series are not given a new story', () => {
  const s = career({ filmography: [] });
  const os = [film({ kind: 'sequel', part: 2, projectTitle: 'Midnight Talker II' }), film({ kind: 'renewal', seriesTitle: 'Talker', season: 2 }),
    film({ episodes: 8, type: 'Drama Series' }), film({ part: 3 })];
  s.offers = os; dressOffers(s);
  for (const o of os) { assert.equal(o.plot, undefined, o.projectTitle); assert.ok(o.premise, 'not dressed at all'); }
});
test('a genre the stories do not know keeps the old premise', () => {
  const s = career({ filmography: [] }); const o = film({ genre: 'Commercial' }); s.offers = [o]; dressOffers(s);
  assert.equal(o.plot, undefined); assert.ok(o.premise);
});
test('two films in a row in the same genre do not get the same hero', () => {
  const s = career({ gender: 'male', filmography: [] });
  const heroes = [];
  for (let i = 0; i < 8; i++) { const o = film({ projectTitle: 'Ordinary Film ' + i, genre: 'Drama' }); s.offers = [...(s.offers || []), o]; dressOffers(s); heroes.push(o.plot.hero); }
  assert.equal(new Set(heroes).size, heroes.length, heroes.join(' / '));
});
test('the story rides with the shoot, survives a save, a freeze and the wrap', () => {
  const s = career({ gender: 'female', filmography: [] }); const o = film({ months: 1 }); s.offers = [o]; dressOffers(s);
  startProduction(s, o);
  const p = s.productions[0];
  assert.deepEqual(p.plot, o.plot);
  const back = roundTrip(s); assert.deepEqual(back.productions[0].plot, o.plot);
  const f = freezeProject(back, back.productions[0]);
  assert.deepEqual(f.plot, o.plot, 'a frozen project forgot its story');
  // and to the credit, through the real wrap
  const t = roundTrip(s); const q = t.productions[0]; q.prepLeft = 0; q.monthsLeft = 1;
  for (let i = 0; i < 3 && t.productions.length; i++) productionTick(t);
  const credit = [...(t.releases || []), ...(t.filmography || [])].find((c) => (c.title || c.projectTitle) === o.projectTitle);
  assert.ok(credit, 'the film never wrapped');
  assert.deepEqual(credit.plot, o.plot, 'the credit lost the story');
});
if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
