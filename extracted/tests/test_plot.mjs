// Film stories (career/plot), stage one: a new film offer is given its story once, the offer
// shows its synopsis and never its twist, the story rides with the project to the credit, and
// nothing old is rewritten. The story generator's own checks (every combination, every part
// two, every title) live in tools/story-proto and are run there.
import assert from 'node:assert/strict';
import { career, withSeed, roundTrip } from './helpers/contracts.mjs';
import { dressOffers } from '../src/systems/career/script.js';
import { startProduction, productionTick } from '../src/systems/career/production.js';
import { freezeProject, frozenTick } from '../src/systems/career/stability.js';
import { declineOffer } from '../src/systems/career/offers.js';
import { draftContract, signContract } from '../src/systems/career/contract.js';
import { sheetOf, pageAt } from '../src/systems/career/plot/sheet.js';
import { chronologyFor } from '../src/systems/career/scenework.js';
import { strainTick } from '../src/systems/life/strain.js';

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
    // the part's own words, not the hero's: "the producer who hired her" is about the heroine
    const own = o.plot.part.split(/ who | whose |, | with /)[0];
    assert.ok(!/\b(her|she|woman|widow|sister|mother|grandmother|daughter|dancer)\b/.test(own) && !/in her shoe/.test(o.plot.part), `a man was given "${o.plot.part}"`);
    assert.ok(!/[{}]/.test(o.character.what), `an unfilled word on the card: "${o.character.what}"`);
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
// ── the same film never gets a second story ──────────────────────────────────
test('dressing again, and loading the save again, never re-tells a story', () => {
  const s = career({ gender: 'female', filmography: [] }); const o = film({ projectTitle: 'Hollow Echo', genre: 'Thriller' }); s.offers = [o];
  dressOffers(s); const first = JSON.stringify(o.plot);
  dressOffers(s); assert.equal(JSON.stringify(o.plot), first, 'a second dressing changed it');
  const back = roundTrip(s); dressOffers(back);                  // what store.js does on load
  assert.equal(JSON.stringify(back.offers[0].plot), first, 'loading changed it');
  assert.equal(back.offers[0].premise, o.premise);
});
test('a frozen film that thaws comes back as the same story', () => {
  const s = career({ gender: 'male', filmography: [] }); const o = film({ projectTitle: 'Protocol 79', genre: 'Horror', months: 4 }); s.offers = [o];
  dressOffers(s); startProduction(s, o);
  freezeProject(s, s.productions[0]);
  s.offers = []; s.month += 4;                                    // nothing moves for the first couple of months
  const random = Math.random; Math.random = () => 0;               // and then the money comes back
  try { frozenTick(s); } finally { Math.random = random; }
  const thaw = (s.offers || []).find((x) => x.kind === 'thaw');
  assert.ok(thaw, 'nothing thawed');
  dressOffers(s);
  assert.deepEqual(thaw.plot, o.plot, 'the thawed offer has a different story');
  startProduction(s, thaw);
  assert.deepEqual(s.productions.find((p) => p.title === o.projectTitle).plot, o.plot);
});
test('a shoot that stops because you burned out thaws as the same film, the same part and the same story', () => {
  // Found by tests/probes/probe_integration.mjs: this freeze (life/strain.js) kept none of it, so a
  // rescued shoot came back with a new story and a stranger's name in your part.
  const s = career({ gender: 'male', filmography: [] }); const o = film({ projectTitle: 'Protocol 56', genre: 'Sci-Fi', months: 6 }); s.offers = [o];
  dressOffers(s); startProduction(s, o);
  const name = s.productions[0].character.name;
  Object.assign(s, { strain: 100, _redMonths: 6 });
  const random = Math.random; Math.random = () => 0;
  try { strainTick(s); } finally { Math.random = random; }
  assert.ok((s.frozen || []).length, 'the shoot did not stop');
  assert.deepEqual(s.frozen[0].plot, o.plot, 'the frozen shoot forgot its story');
  s.offers = []; s.month += 4;
  Math.random = () => 0;
  try { frozenTick(s); } finally { Math.random = random; }
  const thaw = (s.offers || []).find((x) => x.kind === 'thaw');
  assert.ok(thaw, 'nothing thawed');
  dressOffers(s);
  assert.deepEqual(thaw.plot, o.plot, 'it came back as a different story');
  assert.equal(thaw.character.name, name, 'it came back with a stranger in your part');
});
test('turning a film down takes its story with it and leaves nothing to be re-told', () => {
  const s = career({ filmography: [] }); const o = film({ projectTitle: 'Small Wedding', genre: 'Romance' }); s.offers = [o];
  dressOffers(s);
  declineOffer(s, o.id);
  dressOffers(s);
  assert.ok(!(s.offers || []).some((x) => x.projectTitle === 'Small Wedding'), 'the offer is still on the table');
});
test('signing the paper keeps the story the offer had', () => {
  const s = career({ gender: 'male', filmography: [] }); const o = film({ projectTitle: 'Midnight Talker' }); s.offers = [o];
  dressOffers(s); const plot = JSON.stringify(o.plot);
  draftContract(s, o); signContract(s, o.id);
  const p = (s.productions || []).find((x) => x.title === 'Midnight Talker') || ((s.laterOffers || []).find((x) => x.offer && x.offer.projectTitle === 'Midnight Talker') || {}).offer;
  assert.ok(p, 'signing went nowhere');
  assert.equal(JSON.stringify(p.plot), plot);
});
// ── what the actor reads, and what the set does with it ──────────────────────
test('the script: a lead reads the twist and learns it late; the public premise never has it', () => {
  const s = career({ gender: 'female', filmography: [] }); const o = film({ projectTitle: 'Protocol 79', genre: 'Horror' }); s.offers = [o];
  dressOffers(s); startProduction(s, o);
  const p = s.productions[0]; const sh = sheetOf(p.plot, p.character, p.tier);
  assert.ok(sh.lead && sh.wants && sh.secret === p.plot.twist && /last third/.test(sh.learns));
  assert.ok(!p.premise.includes(p.plot.twist.slice(0, 25)));
});
test('the script: a supporting part plays opposite a named hero, and some parts know from the start', () => {
  const sh = sheetOf({ shape: 'theOneWhoLeft', g: 'm', hero: 'a teacher', heroName: 'Ezra Holt', synopsis: 'x', twist: 'y', part: 'the friend who has known all along', lead: false },
    { name: 'Ann Lee', what: 'the friend who has known all along' }, 'supporting');
  assert.equal(sh.lead, false); assert.equal(sh.knows, true); assert.equal(sh.heroName, 'Ezra Holt');
  assert.ok(!sh.people.includes('the friend who has known all along'), 'your own part is listed among the others');
});
test('a scene day knows which page of the story it is', () => {
  const plot = { spark: 'a caller rings in', block: 'the engineer is the ex', twist: 'Three callers claim it.', g: 'm' };
  assert.equal(pageAt(plot, 0.1).phase, 'start'); assert.equal(pageAt(plot, 0.5).phase, 'middle'); assert.equal(pageAt(plot, 0.9).phase, 'turn');
});
test('"Out of order" is shot around this film\'s secret, from the side of the part you play', () => {
  const s = career({ gender: 'male', filmography: [] }); const o = film({ projectTitle: 'Protocol 79', genre: 'Horror' }); s.offers = [o];
  dressOffers(s); startProduction(s, o);
  const p = s.productions[0]; const day = chronologyFor(s, p, 1);
  const name = p.character.name.split(' ')[0];
  assert.ok(day.beats.every((b) => b.text.startsWith(name)), 'the scenes are not about you');
  assert.ok(day.ask.includes(name) && day.ask.includes(day.what));
  const sup = film({ projectTitle: 'Protocol 79', genre: 'Horror', tier: 'supporting', role: 'Supporting' }); const s2 = career({ gender: 'male', filmography: [] }); s2.offers = [sup];
  dressOffers(s2); startProduction(s2, sup);
  const q = s2.productions[0]; const d2 = chronologyFor(s2, q, 1);
  assert.ok(d2.beats.every((b) => b.text.startsWith(q.plot.heroName.split(' ')[0])), 'a supporting day is not about the hero');
});
test('a film without a story shoots the days as it always did', () => {
  const s = career({ filmography: [] }); const o = film({ kind: 'sequel', part: 2, projectTitle: 'Midnight Talker II' }); s.offers = [o];
  dressOffers(s); startProduction(s, o);
  const day = chronologyFor(s, s.productions[0], 1);
  assert.ok(day.beats.length === 6 && !day.ask);
});
if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
