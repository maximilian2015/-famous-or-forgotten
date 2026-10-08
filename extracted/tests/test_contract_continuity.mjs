// Regressions from the 73edbb9 audit. Each case catches a dropped or overwritten
// transition, not a tuned probability. Real systems, seeded draws and JSON saves.
import assert from 'node:assert/strict';
import { career, renewal, withSeed, openRoom, roundTrip, nextMonth } from './helpers/contracts.mjs';
import { draftContract, markClause, sendContract, contractsTick, signContract } from '../src/systems/career/contract.js';
import { callTheRoom, takeTheRoom, walkTheRoom, writeOut, itFails, asksFor, askFor } from '../src/systems/career/standoff.js';
import { startProduction } from '../src/systems/career/production.js';
import { scheduleRelease, releaseTick, runTick } from '../src/systems/career/release.js';
import { maybeContinue } from '../src/systems/career/franchise.js';
import { freezeProject, frozenTick } from '../src/systems/career/stability.js';
import { dressOffers } from '../src/systems/career/script.js';

let failed = 0;
function test(name, fn) {
  try { withSeed(1, fn); console.log('ok    ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + ' :: ' + e.message); }
}
function meeting() {
  const s = career(), o = renewal(); openRoom(s, o);
  return { s, o };
}
function heldMeeting() {
  const s = career(), o = renewal();
  startProduction(s, renewal({ id: 'other', kind: undefined, projectTitle: 'Other Film',
    type: 'Studio Film', scale: 'feature', perEpisode: false, exclusive: true, months: 8 }));
  openRoom(s, o);
  const schedule = o.contract.clauses.find(c => c.id === 'schedule');
  assert.equal(schedule.must, true, 'fixture: the exclusive set did not require a date');
  const hold = schedule.options.find(op => op.id === 'hold');
  assert.ok(hold, 'fixture: no hold option');
  return { s, o, schedule, hold };
}
const benefits = { tvPoints: 3, producing: true, directOne: true, guaranteed: 2, billing: true };
function post() {
  const s = career({ filmography: [], people: [{ id: 'dir-1', name: 'Lena Ward', role: 'Film Director',
    born: 2012, relationship: 65, fromSet: 'An earlier film' }] });
  startProduction(s, renewal({ kind: undefined, projectTitle: 'Black Harbor', season: 1, directorId: 'dir-1' }));
  const p = s.productions[0];
  // Isolate the post boundary with the terms it must accept from a completed shoot.
  Object.assign(p, benefits);
  const rel = scheduleRelease(s, { title: p.title, type: p.type, genre: p.genre, role: p.role,
    salary: p.salary, rating: 85, status: 'Hit', year: s.year }, p);
  return { s, p, rel };
}
function expectBenefits(x) {
  for (const [key, value] of Object.entries(benefits)) assert.equal(x[key], value, key);
}
function thawed() {
  let s = career();
  startProduction(s, renewal({ kind: undefined, projectTitle: 'Black Harbor', season: 1, ...benefits }));
  const p = s.productions[0];
  freezeProject(s, p); s = roundTrip(s); nextMonth(s); nextMonth(s);
  const random = Math.random;
  try { Math.random = () => 0; frozenTick(s); } finally { Math.random = random; }
  const o = s.offers.find(x => x.kind === 'thaw');
  assert.ok(o, 'fixture: two-month rescue did not happen');
  dressOffers(s); return { s, p, o };
}

test('signing keeps the fee shaken on in the room, including after save/load', () => {
  let { s } = meeting(); takeTheRoom(s); s = roundTrip(s); signContract(s, 'renewal');
  assert.equal(s.productions[0].episodeFee, 141400);
});
test('signing pays the agreed seven episodes, not the original ten', () => {
  const { s } = meeting(); takeTheRoom(s); signContract(s, 'renewal');
  assert.equal(s.productions[0].episodes, 7);
  assert.equal(s.productions[0].salary, 989800);
});
test('the reopened paper displays the agreed fee and episode count after save/load', () => {
  let { s } = meeting(); takeTheRoom(s); s = roundTrip(s);
  const fee = draftContract(s, s.offers[0]).clauses.find(c => c.id === 'fee');
  assert.equal(fee.text, `€${(141400).toLocaleString()} an episode, 7 episodes — €${(989800).toLocaleString()}`);
});
// A handshake is final. This used to keep the higher fee asks open ("Discuss ▾" under a number
// everybody had just shaken on); Maxi called that a bug, and it was: the room was final in words only.
test('after a handshake the fee is not up for discussion, and asking anyway changes nothing', () => {
  const { s, o } = meeting(), fee = o.contract.clauses.find(c => c.id === 'fee');
  const higher = fee.options.find(op => op.value > s.standoff.pack.fee);
  assert.ok(higher, 'fixture: there was a higher ask before the room');
  takeTheRoom(s);
  assert.deepEqual(draftContract(s, o).clauses.find(c => c.id === 'fee').options, []);
  markClause(s, o.id, 'fee', higher.id);
  assert.equal(draftContract(s, o).clauses.find(c => c.id === 'fee').stance, 'ok');
  signContract(s, o.id);
  assert.equal(s.productions[0].episodeFee, 141400);
});
// Until a perk does something, the room does not offer it (standoff.js NOT_YET).
test('perks that do nothing yet are neither on the table nor askable', () => {
  const { s, o } = meeting();
  assert.equal(s.standoff.pack.points, 0); assert.equal(s.standoff.pack.producer, false); assert.equal(s.standoff.pack.directOne, false);
  const top = { ...s, fame: 100, respect: 95 }, late = { ...o, season: 6 };
  const asks = asksFor(top, late);
  for (const id of ['points', 'producer', 'guarantee', 'billing']) assert.ok(!asks.includes(id), id);
  for (const id of ['money', 'fewer', 'exclusivity']) assert.ok(asks.includes(id), id);
  const ap = s.ap; askFor(s, 'billing');
  assert.equal(s.ap, ap, 'energy was spent on a perk that is not offered');
});
test('no clause on a settled paper can be reopened', () => {
  const { s, o } = meeting(); takeTheRoom(s);
  for (const c of draftContract(s, o).clauses) assert.deepEqual(c.options, [], c.id);
});
test('an old more-money ask cannot cut the fee settled in the room', () => {
  let { s, o } = meeting();
  const old = o.contract.clauses.find(c => c.id === 'fee').options.find(op => op.value <= s.standoff.pack.fee);
  assert.ok(old, 'fixture: no stale ask');
  takeTheRoom(s); s = roundTrip(s);
  markClause(s, o.id, 'fee', old.id); sendContract(s, o.id); nextMonth(s);
  const random = Math.random;
  try { Math.random = () => 0; contractsTick(s); } finally { Math.random = random; }
  signContract(s, o.id);
  assert.equal(s.productions[0].episodeFee, 141400); assert.equal(s.productions[0].salary, 989800);
});
test('the reopened paper displays the granted exclusivity window', () => {
  const { s, o } = meeting(), c = o.contract.clauses.find(c => c.id === 'exclusive');
  c.value = true; c.text = 'Nothing else while you shoot — not a day, not a voice session';
  s.standoff.pack.conflictFree = true; takeTheRoom(s);
  assert.equal(draftContract(s, o).clauses.find(c => c.id === 'exclusive').text,
    'A day’s work alongside is fine with them');
});
test('settled fee and granted exclusivity stop showing a previous refusal', () => {
  const { s, o } = meeting();
  const fee = o.contract.clauses.find(c => c.id === 'fee'); fee.result = 'refused';
  const exclusive = o.contract.clauses.find(c => c.id === 'exclusive');
  exclusive.value = true; exclusive.result = 'refused';
  s.standoff.pack.conflictFree = true; takeTheRoom(s);
  assert.equal(fee.result, 'agreed'); assert.equal(exclusive.result, 'agreed');
});
test('an agreed schedule displays the shorter span without losing its start date', () => {
  const { s, o } = meeting(), c = o.contract.clauses.find(c => c.id === 'schedule');
  c.result = 'agreed'; const start = c.value.start;
  s.standoff.pack.span = 3; takeTheRoom(s);
  const schedule = draftContract(s, o).clauses.find(c => c.id === 'schedule');
  assert.match(schedule.text, /^3 months of shooting,/); assert.equal(schedule.value.start, start);
});
test('a held start keeps the agreed span, and the agreed dates are not reopened', () => {
  const { s, o, schedule, hold } = heldMeeting();
  schedule.value = { ...hold.value }; schedule.result = 'agreed';
  s.standoff.pack.span = 3; takeTheRoom(s);
  const after = draftContract(s, o).clauses.find(c => c.id === 'schedule');
  assert.equal(after.value.months, 3); assert.equal(after.value.start, hold.value.start);
  assert.deepEqual(after.options, []);
});
test('asking for a held date cannot undo the shorter span settled in the room', () => {
  let { s, o, schedule, hold } = heldMeeting();
  schedule.value = { ...hold.value }; schedule.result = 'agreed';
  s.standoff.pack.span = 3; takeTheRoom(s); s = roundTrip(s);
  markClause(s, o.id, 'schedule', hold.id); sendContract(s, o.id); nextMonth(s);
  const random = Math.random;
  try { Math.random = () => 0; contractsTick(s); } finally { Math.random = random; }
  signContract(s, o.id);
  assert.equal(s.offers.find(x => x.id === o.id).months, 3);
});
test('settling a span still requires an answer to an outstanding mandatory date', () => {
  const { s, o } = heldMeeting(); s.standoff.pack.span = 3; takeTheRoom(s);
  // The one thing still open on a settled paper: a question, not a negotiation.
  assert.ok(draftContract(s, o).clauses.find(c => c.id === 'schedule').options.length > 0, 'the mandatory date cannot be answered');
  signContract(s, o.id);
  assert.equal(o.signed, undefined); assert.match(s.lastEvent, /They need to know when you can start/);
});
test('signing honours the room removing an exclusive clause', () => {
  const { s, o } = meeting();
  o.contract.clauses.find(c => c.id === 'exclusive').value = true;
  s.standoff.pack.conflictFree = true;
  takeTheRoom(s); signContract(s, o.id);
  assert.equal(s.productions[0].exclusive, false);
});
test('signing honours the shorter span agreed in the room', () => {
  const { s, o } = meeting(); s.standoff.pack.span = 3;
  // A previously agreed schedule is not regenerated by draftContract. Updating
  // only o.months works for a fresh schedule, but loses this already settled one.
  o.contract.clauses.find(c => c.id === 'schedule').result = 'agreed';
  takeTheRoom(s); signContract(s, o.id);
  assert.equal(s.productions[0].months, 3);
});
test('leaving resolves the first non-pay outcome and never reopens the room', () => {
  const { s, o } = meeting();
  // 0 chooses the first non-pay outcome in walkTheRoom; a SECOND roll at 0
  // would choose pay in itFails. This caught the ignored _forced argument.
  const random = Math.random;
  try { Math.random = () => 0; walkTheRoom(s); } finally { Math.random = random; }
  assert.equal(s.standoff, null);
  assert.equal(s.offers.some(x => x.id === o.id), false);
  assert.equal(s.walkedOff.length, 1);
  assert.equal(s.grudges.length, 1);
});
test('an explicitly chosen failure outcome is not rolled again', () => {
  const { s, o } = meeting();
  const random = Math.random;
  try { Math.random = () => 0; assert.equal(itFails(s, { ...o, _forced: 'killed' }).how, 'killed'); }
  finally { Math.random = random; }
});
test('an ordinary failure can still result in paying rather than cancellation', () => {
  const { s, o } = meeting(); const random = Math.random;
  try { Math.random = () => 0; assert.equal(itFails(s, o).kept, true); }
  finally { Math.random = random; }
  assert.ok(s.standoff); assert.ok(s.offers.some(x => x.id === o.id));
});

test('signing preserves every additional room term on the shoot', () => {
  const { s, o } = meeting(); Object.assign(s.standoff.pack,
    { points: 3, producer: true, directOne: true, guarantee: 2, billing: true });
  takeTheRoom(s); signContract(s, o.id); expectBenefits(s.productions[0]);
});
test('explicit zero and false TV terms remain zero and false', () => {
  const s = career(); startProduction(s, renewal({ tvPoints: 0, producing: false, directOne: false,
    guaranteed: 0, billing: false }));
  const p = s.productions[0];
  assert.equal(p.tvPoints, 0); assert.equal(p.producing, false); assert.equal(p.directOne, false);
  assert.equal(p.guaranteed, 0); assert.equal(p.billing, false);
});
test('post preserves additional TV terms for opening night', () => {
  expectBenefits(post().rel);
});
test('the release job preserves additional TV terms for future seasons', () => {
  expectBenefits(post().rel.job);
});
test('the premiered credit preserves additional TV terms through JSON', () => {
  let { s, rel } = post(); s = roundTrip(s);
  s.year = Math.floor(rel.due / 12); s.month = rel.due % 12; releaseTick(s);
  expectBenefits(s.filmography[0]);
});
test('a renewal preserves the existing additional TV terms', () => {
  const { s, p } = post();
  const o = maybeContinue(s, { title: p.title, rating: 85, viewers: 8 }, p, true);
  assert.ok(o); expectBenefits(o);
});
test('a release identifies the real showrunner on the next offer', () => {
  const { s, rel } = post();
  const o = maybeContinue(s, { title: rel.title, rating: 85, viewers: 8 }, roundTrip(rel.job), true);
  assert.equal(o.showrunner, 'Lena Ward');
  assert.equal(o.showrunnerId, 'dir-1');
});
test('a legacy release job can recover a known director from its credit', () => {
  const { s, rel } = post(), job = roundTrip(rel.job);
  delete job.showrunner; delete job.showrunnerId;
  const o = maybeContinue(s, { title: rel.title, rating: 85, viewers: 8, director: 'Lena Ward' }, job, true);
  assert.equal(o.showrunner, 'Lena Ward'); assert.equal(o.showrunnerId, 'dir-1');
});
test('release closure retains TV terms and connects renewal to the source credit ID', () => {
  let { s, rel } = post(); s = roundTrip(s);
  s.year = Math.floor(rel.due / 12); s.month = rel.due % 12; releaseTick(s);
  const id = s.filmography[0].id;
  for (let n = 0; n < 30 && s.filmography[0].running; n++) { nextMonth(s); runTick(s); }
  const c = s.filmography[0]; assert.equal(c.running, false); expectBenefits(c.job);
  const o = maybeContinue(s, c, c.job, true);
  assert.equal(o.sourceCreditId, id);
});

test('thaw keeps the same character rather than generating another one', () => {
  assert.deepEqual(thawed().o.character, { name: 'Ethan Cole', what: 'the son who stayed', tier: 'lead' });
});
test('thaw keeps the same script after saving while frozen', () => {
  assert.equal(thawed().o.premise, 'The son who stayed.');
});
test('thaw preserves the franchise identity and its existing TV terms', () => {
  const { o } = thawed(); assert.equal(o.seriesTitle, 'Black Harbor');
  assert.equal(o.potential, 'open'); expectBenefits(o);
});
test('a legacy frozen project without script metadata can still be rescued', () => {
  const s = career({ offers: [], frozen: [{ id: 'old', title: 'Old Film', role: 'Lead', type: 'Indie Film',
    genre: 'Drama', scale: 'indie', tier: 'lead', monthsLeft: 2, prestigeScore: 55,
    stability: 60, owed: 8000, salary: 10000, paid: 2000, since: 2058 * 12 - 2, patience: 30 }] });
  const random = Math.random;
  try { Math.random = () => 0; frozenTick(s); } finally { Math.random = random; }
  assert.equal(s.offers[0].salary, 8000); dressOffers(s);
  assert.ok(s.offers[0].character.name);
});

test('money-related write-out updates the source season, not another season/show', () => {
  const s = career(); s.filmography.push(
    { id: 'other', title: 'Other Show · season 2', season: 2, renewal: 'renewed' },
    { id: 'older', title: 'Black Harbor · season 1', season: 1, renewal: 'renewed' });
  const o = renewal({ tier: 'supporting', role: 'Supporting', sourceCreditId: 'season-2' });
  s.offers = [o]; writeOut(s, o);
  assert.equal(s.filmography[0].renewal, 'writtenOut');
  assert.equal(s.filmography[1].renewal, 'renewed'); assert.equal(s.filmography[2].renewal, 'renewed');
});
test('write-out also updates a legacy renewal without a source ID', () => {
  const s = career(), o = renewal({ tier: 'supporting', role: 'Supporting' });
  writeOut(s, o); assert.equal(s.filmography[0].renewal, 'writtenOut');
});
test('the chosen scripted exit remains on the source credit', () => {
  const s = career(), o = renewal({ tier: 'supporting', role: 'Supporting' });
  const random = Math.random;
  try { Math.random = () => 0.3; writeOut(s, o); } finally { Math.random = random; }
  assert.equal(s.filmography[0].renewalReason, 'a death');
});
test('failed room cancellation records that the ordered season will not happen', () => {
  const { s, o } = meeting(); itFails(s, { ...o, _forced: 'cancel' });
  assert.equal(s.filmography[0].renewal, 'cancelled');
});
test('being killed/written around changes the prior credit to without-you', () => {
  const { s, o } = meeting(); itFails(s, { ...o, _forced: 'around' });
  assert.equal(s.filmography[0].renewal, 'writtenOut');
});
test('the failed meeting remembers a killed-off outcome rather than only its prose', () => {
  const { s, o } = meeting(); itFails(s, { ...o, _forced: 'killed' });
  assert.equal(s.filmography[0].renewalReason, 'killed');
});
test('the invitation names the upcoming third season, not the fourth', () => {
  const s = career(), o = renewal(); s.offers = [o];
  draftContract(s, o); callTheRoom(s, o);
  assert.ok(s.standoff); assert.match(s.lastEvent, /Nothing about season 3 moves/);
});
test('the failed meeting refers to the offered season, not an extra season', () => {
  const { s, o } = meeting(); itFails(s, { ...o, _forced: 'around' });
  assert.match(s.lastEvent, /Season 3 goes ahead/);
});
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exitCode = failed ? 1 : 0;
