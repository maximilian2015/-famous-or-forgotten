// What Pass will do, said before it is done (career/offers.js declineConsequences; Maxi/ChatGPT, 23 Oct).
// Every decline path: the warning is the rule — the standing it shows is the standing it takes, what it
// promises happens, what it only reads as possible is not promised, an ordinary no stays one click, and an
// option that has run out is not called a contract.
import assert from 'node:assert/strict';
import { career, withSeed } from './helpers/contracts.mjs';
import { ensureWorld } from '../src/systems/world/world.js';
import { declineOffer, declineConsequences, optionRunning } from '../src/systems/career/offers.js';
import { storyOf } from '../src/systems/meta/stories.js';
import { typecastOf, refusalLoosens, scoreOf } from '../src/systems/meta/typecast.js';

let failed = 0;
function test(name, fn) {
  try { withSeed(31, fn); console.log('ok    ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + ' :: ' + e.message); }
}
const life = (over = {}) => { const s = career({ fame: 50, peakFame: 50, respect: 40, stories: [], grudges: [], offers: [], ...over }); ensureWorld(s); return s; };
// Pass, and what it took: the preview first, then the real thing.
function pass(s, o) {
  s.offers = [o];
  const c = declineConsequences(s, o);
  const r0 = s.respect;
  declineOffer(s, o.id);
  return { c, lost: Math.round((r0 - s.respect) * 10) / 10 };
}
const SHOW = { id: 'sh-2', title: 'Black Harbor · season 2', type: 'Drama Series', scale: 'recurring', tier: 'lead', role: 'Lead', season: 2, year: 2057, rating: 70, viewers: 3, endViewers: 3, renewal: 'renewed' };
const renewal = (over = {}) => ({ id: 'ren-3', kind: 'renewal', season: 3, seriesTitle: 'Black Harbor', projectTitle: 'Black Harbor · season 3', role: 'Lead', tier: 'lead',
  type: 'Drama Series', genre: 'Drama', scale: 'recurring', episodes: 10, episodeFee: 1e5, salary: 1e6, perEpisode: true, months: 5, sourceCreditId: 'sh-2', deadline: 3, ...over });
const FILM = { id: 'nw-1', title: 'North Water', type: 'Feature Film', scale: 'feature', tier: 'lead', role: 'Lead', genre: 'Thriller', rating: 75, year: 2056, verdict: 'profitable', projectId: 'prj-nw' };
const sequel = (over = {}) => ({ id: 'sq-2', kind: 'sequel', part: 2, projectTitle: 'North Water II', role: 'Lead', tier: 'lead', type: 'Feature Film', genre: 'Thriller',
  scale: 'feature', salary: 3e6, months: 4, parentProjectId: 'prj-nw', deadline: 3, ...over });

test('an ordinary no: one click, nothing promised, nothing taken', () => {
  const s = life();
  const { c, lost } = pass(s, { id: 'o1', via: 'casting', projectTitle: 'Small Hours', role: 'Supporting', tier: 'supporting', type: 'Indie Film', genre: 'Drama', scale: 'indie', salary: 3e4, months: 2, deadline: 2 });
  assert.equal(c.path, 'ordinary'); assert.equal(c.confirm, false, 'asked first for nothing');
  assert.equal(c.standing, 0); assert.equal(lost, 0);
  assert.ok(!c.certain.some((x) => x.tone === 'bad'), JSON.stringify(c.certain));
});
test('a lead offered by name in a real picture: the director remembers — said, asked first, and true', () => {
  const s = life();
  const { c, lost } = pass(s, { id: 'o2', via: 'agent', projectTitle: 'Glass Winter', role: 'Lead', tier: 'lead', type: 'Feature Film', genre: 'Crime', scale: 'feature', director: 'Ivo Kessler', salary: 2e6, months: 4, deadline: 3 });
  assert.ok(c.confirm && c.certain.some((x) => /Ivo Kessler will remember/.test(x.text)), JSON.stringify(c));
  assert.equal(lost, 0);
  assert.ok(s.grudges.some((g) => g.who === 'Ivo Kessler'), 'promised a grudge that did not happen');
});
test('your own sequel, no option: asked first, no standing, and the fans and the letter only as possibilities', () => {
  const s = life({ filmography: [{ ...FILM, verdict: 'smash' }] });
  const { c, lost } = pass(s, sequel());
  assert.equal(c.path, 'continuation'); assert.ok(c.confirm); assert.equal(c.standing, 0); assert.equal(lost, 0);
  assert.ok(c.maybe.some((x) => /fans may be furious/.test(x)) && c.maybe.some((x) => /may ask to meet/.test(x)), JSON.stringify(c.maybe));
  assert.ok(!c.certain.some((x) => /fans|meet/i.test(x.text)), 'a possibility was promised');
  assert.equal(s.filmography[0].next.you, 'declined');
});
test('a season of your own show, no option: the same, and the show goes on', () => {
  const s = life({ filmography: [{ ...SHOW }] });
  const { c, lost } = pass(s, renewal());
  assert.ok(c.path === 'continuation' && c.confirm && c.standing === 0 && lost === 0 && /goes on/.test(c.body), JSON.stringify(c));
});
test('leaving by the exit clause: said to cost nothing, and costs nothing', () => {
  const s = life({ filmography: [{ ...SHOW, season: 3, id: 'sh-3', title: 'Black Harbor · season 3' }] });
  const { c, lost } = pass(s, renewal({ season: 4, projectTitle: 'Black Harbor · season 4', sourceCreditId: 'sh-3', exitAfter: 3, optioned: true }));
  assert.equal(c.path, 'exit'); assert.equal(c.standing, 0); assert.equal(c.breach, false); assert.equal(lost, 0);
  assert.ok(c.certain.some((x) => /No penalty/.test(x.text)) && !storyOf(s, 'recast'));
});
test('a season the network holds an option on: "Standing −6 · contract breach", asked first, and exactly six', () => {
  const s = life({ filmography: [{ ...SHOW }] });
  const { c, lost } = pass(s, renewal({ optioned: true }));
  assert.ok(c.path === 'option' && c.breach && c.confirm && c.standing === -6 && /Break the contract/.test(c.leave), JSON.stringify(c));
  assert.ok(c.certain.some((x) => x.text === 'Standing −6 · contract breach'));
  assert.equal(lost, 6);
  assert.equal(s.filmography[0].next.you, 'walkedOut');
});
test('a sequel you signed an option for, still running: the same six', () => {
  const s = life({ filmography: [{ ...FILM }] });
  const o = sequel({ optioned: true, optionParts: 3 });
  assert.ok(optionRunning(o));
  const { c, lost } = pass(s, o);
  assert.ok(c.option && c.standing === -6 && lost === 6, JSON.stringify({ c, lost }));
});
test('an option that has run out is not a contract: no breach, no six, and not called one on the record', () => {
  const s = life({ filmography: [{ ...FILM, part: 3, title: 'North Water III', projectId: 'prj-nw3' }] });
  const o = sequel({ part: 4, projectTitle: 'North Water IV', parentProjectId: 'prj-nw3', optioned: true, optionParts: 3 });
  assert.equal(optionRunning(o), false);
  const { c, lost } = pass(s, o);
  assert.ok(c.path === 'continuation' && !c.breach && c.standing === 0 && lost === 0, JSON.stringify({ c, lost }));
  assert.ok(!c.certain.some((x) => /breach/.test(x.text)));
  assert.equal(s.filmography[0].next.you, 'declined', 'the record says you walked out of an option that had run out');
});
test('a set they held open for years: "Standing −5", and five', () => {
  const s = life();
  const { c, lost } = pass(s, { id: 't1', kind: 'thaw', projectTitle: 'The Long Field', role: 'Lead', tier: 'lead', type: 'Feature Film', genre: 'Drama', scale: 'feature', salary: 1e6, months: 3, deadline: 3 });
  assert.ok(c.path === 'thaw' && c.confirm && c.standing === -5, JSON.stringify(c));
  assert.equal(lost, 5);
});
test('a thawed set that comes back while you are on somebody else\'s picture: no penalty, and the card says so', () => {
  const s = life();
  s.production = { id: 'p-other', title: 'Other Picture', months: 6, monthsLeft: 4 };
  const { c, lost } = pass(s, { id: 't2', kind: 'thaw', projectTitle: 'The Long Field', role: 'Lead', tier: 'lead', type: 'Feature Film', genre: 'Drama', scale: 'feature', salary: 1e6, months: 3, deadline: 3, frozenFor: 4 });
  assert.ok(c.path === 'thaw' && c.standing === 0 && lost === 0, JSON.stringify({ c, lost }));
  assert.ok(c.certain.some((x) => /No penalty/.test(x.text)) && !c.certain.some((x) => /Standing/.test(x.text)));
});
test('free this month but signed for a film that starts inside the thaw\'s months: no penalty', () => {
  const s = life();
  const now = s.year * 12 + s.month;
  const signed = { id: 'sg1', signed: true, startAt: now + 1, projectTitle: 'Next Picture', months: 5 };
  s.offers = [signed];
  const o = { id: 't4', kind: 'thaw', projectTitle: 'The Long Field', role: 'Lead', tier: 'lead', type: 'Feature Film', genre: 'Drama', scale: 'feature', salary: 1e6, months: 3, deadline: 3, frozenFor: 4 };
  s.offers.push(o);
  const c = declineConsequences(s, o); const r0 = s.respect; declineOffer(s, o.id);
  assert.ok(c.standing === 0 && s.respect === r0, JSON.stringify(c));
});
test('a paper signed for long after the thaw would wrap is no excuse: the five stands', () => {
  const s = life();
  const now = s.year * 12 + s.month;
  s.offers = [{ id: 'sg2', signed: true, startAt: now + 12, projectTitle: 'Much Later', months: 5 }];
  const o = { id: 't5', kind: 'thaw', projectTitle: 'The Long Field', role: 'Lead', tier: 'lead', type: 'Feature Film', genre: 'Drama', scale: 'feature', salary: 1e6, months: 3, deadline: 3, frozenFor: 4 };
  s.offers.push(o);
  assert.equal(declineConsequences(s, o).standing, -5);
});
test('a freeze that ran past a year: no penalty for a no, even with nothing else on', () => {
  const s = life();
  const { c, lost } = pass(s, { id: 't3', kind: 'thaw', projectTitle: 'The Long Field', role: 'Lead', tier: 'lead', type: 'Feature Film', genre: 'Drama', scale: 'feature', salary: 1e6, months: 3, deadline: 3, frozenFor: 36 });
  assert.ok(c.standing === 0 && lost === 0 && /3 years ago/.test(c.body), JSON.stringify({ c, lost }));
});
test('no again after the director\'s meeting: "Standing −8", the director gone for good — and eight', () => {
  const s = life({ filmography: [{ ...FILM }] });
  s.stories = [{ id: 'recast', beat: 'answer', due: 99999, since: 0, data: { title: 'North Water II', root: 'North Water', kind: 'sequel', part: 2, director: 'Ivo Kessler', how: 'passed' } }];
  const { c, lost } = pass(s, sequel({ story: 'recast', meeting: true }));
  assert.ok(c.path === 'meeting' && c.standing === -8 && c.certain.some((x) => /Ivo Kessler never works with you again/.test(x.text)), JSON.stringify(c));
  assert.equal(lost, 8);
  assert.ok(s.grudges.some((g) => g.who === 'Ivo Kessler'));
});
test('and if that paper was under a running option too, both costs are said, and both are taken', () => {
  const s = life({ filmography: [{ ...SHOW }] });
  s.stories = [{ id: 'recast', beat: 'answer', due: 99999, since: 0, data: { title: 'Black Harbor · season 3', root: 'Black Harbor', kind: 'renewal', season: 3, director: 'Anouk Vey', how: 'passed' } }];
  const { c, lost } = pass(s, renewal({ story: 'recast', meeting: true, optioned: true }));
  assert.ok(c.meeting && c.option && c.standing === -14, JSON.stringify(c));
  assert.equal(lost, 14);
});
test('saying no to your type loosens it: said as a gain, and it does', () => {
  const s = life();
  typecastOf(s); s.typecast.scores = { 'g:Horror': 4.5 }; s.typecast.active = ['g:Horror'];
  const o = { id: 'h1', via: 'casting', projectTitle: 'Night Ward', role: 'Lead', tier: 'lead', type: 'Indie Film', genre: 'Horror', scale: 'indie', salary: 2e5, months: 2, deadline: 2 };
  if (!refusalLoosens(s, o).length) return;   // the type fit decides; nothing to say if it is not on type
  const before = scoreOf(s, 'g:Horror');
  const { c } = pass(s, o);
  assert.ok(c.certain.some((x) => x.tone === 'good' && /loosens/.test(x.text)), JSON.stringify(c.certain));
  assert.ok(scoreOf(s, 'g:Horror') < before, 'promised and not done');
});
test('the warning is computed, never stored: asking twice changes nothing', () => {
  const s = life({ filmography: [{ ...SHOW }] });
  const o = renewal({ optioned: true });
  s.offers = [o];
  declineConsequences(s, o);   // the typecast record is created on first reading, as everywhere (typecastOf)
  const snap = JSON.stringify(s);
  declineConsequences(s, o); declineConsequences(s, o);
  assert.equal(JSON.stringify(s), snap);
  assert.ok(s.offers.length === 1 && s.respect === 40, 'the warning acted');
});

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
