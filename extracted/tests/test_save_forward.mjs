// A save that a newer build has touched, opened in this one. Maxi plays a single HTML file, and a
// preview build or a rollback can meet a save written by code this build has never seen. Found on
// 27 Oct: a career story from a newer build (the cover) stopped every month and the story list
// from drawing in the build before it. From this build on, what it does not know it keeps,
// untouched, for the build that does — and skips.
import assert from 'node:assert/strict';
import { career, withSeed, roundTrip } from './helpers/contracts.mjs';
import { advanceMonth } from '../src/engine/time.js';
import { activeStories, storiesTick } from '../src/systems/meta/stories.js';
import { resolveArc, arcCard } from '../src/systems/life/arcs.js';

let failed = 0;
function test(name, fn) {
  try { withSeed(5, fn); console.log('ok    ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + ' :: ' + e.message); }
}
const future = () => career({ filmography: [], stories: [{ id: 'fromTheFuture', beat: 'whatever', due: 0, since: 0, data: { who: 'Someone' } }] });

test('the story list draws, and leaves out what it cannot tell', () => {
  const s = future();
  const list = activeStories(s);
  assert.ok(!list.some((x) => x.id === 'fromTheFuture'));
});
test('a year goes by without a throw, and the unknown story is still there for the build that knows it', () => {
  let s = future();
  for (let m = 0; m < 12; m++) { s = advanceMonth(s); s.pendingArc = null; s.bigMoment = null; }
  assert.ok((s.stories || []).some((x) => x.id === 'fromTheFuture'), 'it was thrown away');
  assert.ok(roundTrip(s));
});
test('it does not hold one of the two places a running story needs', () => {
  const s = future(); s.stories.push({ id: 'alsoFuture', beat: 'x', due: 0, since: 0, data: {} });
  storiesTick(s);                                           // must not throw, and may start a real one
  assert.ok(s.stories.length >= 2);
});
test('a beat from a newer build left open on the screen closes instead of throwing', () => {
  const s = future();
  s.pendingArc = { story: 'fromTheFuture', beat: 'whatever', speaker: 'x', text: 'y', choices: [{ label: 'A' }] };
  assert.ok(arcCard(s, s.pendingArc));
  resolveArc(s, 0);
  assert.equal(s.pendingArc, null);
});
if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
