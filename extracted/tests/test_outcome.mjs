// How a piece of work turned out, in one shape (Media Ecosystem stage 2, career/outcome.js). The
// grade is an adapter beside each market's own result, and stage 2 moves nothing: every question a
// reader used to ask by comparing strings must get the same answer through the adapter, for every
// kind of credit there is. The seeded-lives probe proves it for what a career exercises
// (tests/probes/probe_same_life.mjs); this proves it for every case, including the ones a bot never
// reaches — a party, a favour, the Passport.
import assert from 'node:assert/strict';
import { projectOutcome, isSmash, isProfitable, isBrokeEven, isBomb, madeMoney, isWatched, isSeen, isIgnored, wentBadly } from '../src/systems/career/outcome.js';

let failed = 0;
function test(name, fn) { try { fn(); console.log('ok    ' + name); } catch (e) { failed++; console.log('FAIL  ' + name + ' :: ' + e.message); } }

const FILM = ['smash', 'profitable', 'broke even', 'bomb', 'seen', 'unsold'];
const TV = ['watched', 'seen', 'ignored'];
const credits = [];
for (const verdict of FILM) for (const scale of ['feature', 'blockbuster', 'indie', 'festival']) credits.push({ title: 'F', scale, verdict });
for (const verdict of TV) for (const scale of ['recurring', 'prestige', 'episode', 'oneoff']) credits.push({ title: 'T', scale, verdict });
credits.push({ title: 'W', scale: 'blockbuster', verdict: 'broke even', status: 'World Hit' });           // a world hit that only covered its cost
credits.push({ title: 'R', scale: 'feature', verdict: 'in cinemas', running: true });
credits.push({ title: 'A', type: 'Commercial', scale: 'oneoff', rating: 95, status: 'Hit', minor: true });  // an advert rated 95
credits.push({ title: 'O', verdict: 'smash' }, { title: 'O2', verdict: 'watched' });                    // very old credits with no scale

test('the mapping', () => {
  const g = (c) => projectOutcome(null, c).grade;
  for (const [v, want] of [['bomb', -2], ['broke even', 0], ['profitable', 1], ['smash', 2], ['seen', 0]]) assert.equal(g({ scale: 'feature', verdict: v }), want, 'film ' + v);
  for (const [v, want] of [['ignored', -1], ['seen', 0], ['watched', 1]]) assert.equal(g({ scale: 'recurring', verdict: v }), want, 'tv ' + v);
  // A world hit is a flag beside the grade, never a +3 of its own (Maxi, 20 Oct).
  const wh = projectOutcome(null, { scale: 'blockbuster', verdict: 'broke even', status: 'World Hit' });
  assert.equal(wh.grade, 0, 'a world hit that only covered its cost graded ' + wh.grade);
  assert.equal(wh.worldHit, true, 'and it is still a world hit');
  assert.equal(projectOutcome(null, { scale: 'blockbuster', verdict: 'smash', status: 'World Hit' }).grade, 2, 'a smash world hit is a smash');
  for (let v of ['bomb', 'broke even', 'profitable', 'smash']) assert.ok(projectOutcome(null, { scale: 'feature', verdict: v, worldHit: true }).grade < 3, 'nothing reaches +3 yet');
  assert.equal(g({ scale: 'festival', verdict: 'unsold' }), null, 'a festival picture nobody bought is not judged');
  assert.equal(g({ scale: 'feature', verdict: 'in cinemas', running: true }), null, 'a run in progress is not judged');
});

test('an advert is never a career hit, whatever it was rated', () => {
  const o = projectOutcome(null, { type: 'Commercial', scale: 'oneoff', rating: 95, status: 'Hit', minor: true });
  assert.equal(o.career, false); assert.equal(o.grade, null);
  assert.ok(![isSmash, isProfitable, madeMoney, isWatched, wentBadly].some((f) => f(o)));
});

test('every question asks what the strings asked, for every kind of credit', () => {
  for (const c of credits) {
    const o = projectOutcome(null, c), v = c.verdict;
    const tv = !['smash', 'profitable', 'broke even', 'bomb', 'unsold'].includes(v) && !['small', 'indie', 'festival', 'feature', 'blockbuster'].includes(c.scale);
    const at = `${c.title} ${c.scale} ${v}`;
    assert.equal(isSmash(o), v === 'smash', 'smash ' + at);
    assert.equal(isProfitable(o), v === 'profitable', 'profitable ' + at);
    assert.equal(isBrokeEven(o), v === 'broke even', 'broke even ' + at);
    assert.equal(isBomb(o), v === 'bomb', 'bomb ' + at);
    assert.equal(madeMoney(o), v === 'smash' || v === 'profitable', 'made money ' + at);
    assert.equal(isWatched(o), v === 'watched', 'watched ' + at);
    assert.equal(isIgnored(o), v === 'ignored', 'ignored ' + at);
    assert.equal(isSeen(o), v === 'seen' && tv, 'seen on television ' + at);
    assert.equal(wentBadly(o), v === 'bomb' || v === 'ignored', 'went badly ' + at);
  }
});

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
