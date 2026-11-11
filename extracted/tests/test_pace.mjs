// Random events, stage 2 and the first of wave one (extracted/docs/random-events-plan.md).
//
// The conductor (life/pace.js): one place that knows what this year has already brought, so the
// cards, the career stories and the people who need something stop each opening things on their
// own. And three events built from this life: somebody who takes you for a star of the world, an
// old film of yours that is the joke of the week, the ex who marries again.
import assert from 'node:assert/strict';
import { career, withSeed } from './helpers/contracts.mjs';
import { paceOf, mayOpen, opened, hushed, keen } from '../src/systems/life/pace.js';
import { ARCS, maybeStartArc, resolveArc } from '../src/systems/life/arcs.js';
import { storiesTick, CHAINS } from '../src/systems/meta/stories.js';
import { submissionsTick } from '../src/systems/career/castings.js';
import { NEEDS, needsTick } from '../src/systems/life/needs.js';
import { pressTick } from '../src/systems/meta/press.js';
import { familyYear } from '../src/systems/life/family.js';

let failed = 0;
function test(name, fn) {
  try { withSeed(9, fn); console.log('ok    ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + ' :: ' + e.message); }
}
const ONLY = (s, id) => { s._arcsDone = ARCS.filter((a) => a.once).map((a) => a.id); s._arcAt = Object.fromEntries(ARCS.filter((a) => a.id !== id).map((a) => [a.id, (s.year || 0) * 12 + (s.month || 0)])); };
function until(s, n = 48) { for (let i = 0; i < n && !s.pendingArc; i++) { maybeStartArc(s); if (s.pendingArc) break; s.month++; if (s.month > 11) { s.month = 0; s.year++; } } return s.pendingArc; }
const STAR = { id: 'w-nina', name: 'Nina Castellan', gender: 'female', fame: 70, alive: true, retired: false, credits: [] };

test('an old save has no pace: the first time it is asked for, this year starts', () => {
  const s = career({ fame: 20 });
  delete s._pace;
  const p = paceOf(s);
  assert.equal(p.year, s.year);
  assert.ok(['quiet', 'ordinary', 'busy'].includes(p.temper));
  assert.ok(mayOpen(s));
});

test('years differ: about a quarter quiet, half ordinary, a quarter busy, each with its own room', () => {
  const s = career({ fame: 20 }); const n = { quiet: 0, ordinary: 0, busy: 0 }, room = {};
  for (let y = 0; y < 800; y++) { s.year++; const p = paceOf(s); n[p.temper]++; room[p.temper] = p.room; }
  assert.ok(n.quiet > 140 && n.quiet < 260, JSON.stringify(n));
  assert.ok(n.busy > 140 && n.busy < 260, JSON.stringify(n));
  assert.ok(room.quiet < room.ordinary && room.ordinary < room.busy, JSON.stringify(room));
});

test('a year that has had its fill opens nothing new, and the next year has room again', () => {
  const s = career({ fame: 20 }); const p = paceOf(s);
  for (let i = 0; i < p.room; i++) opened(s, 'x');
  assert.equal(mayOpen(s), false);
  s.year++;
  assert.equal(mayOpen(s), true);
});

test('a year behind its temper looks harder, one ahead of it less', () => {
  const s = career({ fame: 20 }); s.month = 10; const p = paceOf(s);
  const behind = keen(s);
  for (let i = 0; i < p.room; i++) opened(s, 'x');
  assert.ok(behind > 1 && keen(s) < behind, `${behind} then ${keen(s)}`);
});

test('a card that can wait does not come in a full year; what the state demands still does', () => {
  const s = career({ fame: 10, cash: -500 });
  s._arcsDone = ARCS.filter((a) => a.once).map((a) => a.id);
  const p = paceOf(s); for (let i = 0; i < p.room; i++) opened(s, 'x');
  let seen = null;
  for (let i = 0; i < 40 && !seen; i++) { maybeStartArc(s); seen = s.pendingArc; }
  assert.ok(seen, 'no card at all');
  assert.equal(seen.id, 'brokeMonth', `the card was ${seen.id}`);
});

test('a death in the family hushes the months after it: no new story starts, the year has no room', () => {
  const s = career({ fame: 30 });
  // A mother of ninety, lived year by year (life/family.js) until she goes.
  s.family = [{ id: 'mum', name: 'Ada Brand', relation: 'Mother', alive: true, age: 90, health: 10, job: 'retired', retired: true, relationship: 70 }];
  for (let y = 0; y < 80 && s.family[0].alive; y++) { s.year++; s.month = 0; familyYear(s); }
  assert.equal(s.family[0].alive, false, 'she outlived the test');
  assert.ok(hushed(s) && !mayOpen(s), 'the month she died, the year still had room');
  const before = (s.stories || []).length;
  for (let i = 0; i < 5; i++) { storiesTick(s); s.month++; }
  assert.equal((s.stories || []).length, before);
  s.month += 2; if (s.month > 11) { s.month -= 12; s.year++; }
  assert.ok(!hushed(s));
});

test('mistaken for a star of the world: a real name, and meeting them makes them somebody you know', () => {
  const s = career({ gender: 'female', fame: 15, ageY: 30 });
  s.world = { ...(s.world || {}), actors: [{ ...STAR, born: (s.year || 0) - 32 }] };
  ONLY(s, 'mistakenFor');
  const a = until(s);
  assert.ok(a && a.id === 'mistakenFor', a ? a.id : 'nothing came');
  assert.match(a.text + a.choices.map((c) => c.label).join(' '), /Nina/);
  const i = a.choices.findIndex((c) => /Find/.test(c.label));
  resolveArc(s, i);
  const p = (s.people || []).find((x) => x.worldId === STAR.id);
  assert.ok(p, 'nobody new');
  assert.equal(p.name, STAR.name);
  // the second time is not a second person
  s.pendingArc = a; resolveArc(s, i);
  assert.equal((s.people || []).filter((x) => x.worldId === STAR.id).length, 1);
});

test('nobody of your age and sex out there: nobody takes you for anybody', () => {
  const s = career({ gender: 'female', fame: 15, ageY: 30 });
  s.world = { ...(s.world || {}), actors: [{ ...STAR, gender: 'male', born: (s.year || 0) - 32 }, { ...STAR, id: 'w-old', born: (s.year || 0) - 60 }] };
  assert.equal(ARCS.find((x) => x.id === 'mistakenFor').when(s), false);
});

test('an old film of yours is the meme of the week, once: the same film never twice', () => {
  const s = career({ fame: 25 });
  s.filmography = [{ title: 'Paper Lanterns', year: (s.year || 0) - 5, verdict: 'bomb' }, { title: 'New Thing', year: s.year || 0 }];
  ONLY(s, 'oldFilmMeme');
  const a = until(s);
  assert.ok(a && a.id === 'oldFilmMeme', a ? a.id : 'nothing came');
  assert.match(a.text, /Paper Lanterns/);
  assert.equal(s.filmography[0].meme, s.year);
  assert.equal(ARCS.find((x) => x.id === 'oldFilmMeme').when(s), false, 'a film this year is not old, and the old one has had its week');
});

test('the ex marries again some years on: the invitation names them, and a scene at the wedding is not forgiven', () => {
  const s = career({ fame: 30 });
  const now = (s.year || 0) * 12 + (s.month || 0);
  s.family = [...(s.family || []), { id: 'ex1', name: 'Marc Delaunay', relation: 'Ex-spouse', alive: true, divorcedOn: now - 200, relationship: 40 }];
  ONLY(s, 'exWedding');
  const a = until(s);
  assert.ok(a && a.id === 'exWedding', a ? a.id : 'nothing came');
  assert.match(a.text, /Marc/);
  const ex = s.family.find((p) => p.id === 'ex1');
  assert.ok(ex.remarried != null);
  resolveArc(s, a.choices.findIndex((c) => /say what you think/.test(c.label)));
  assert.ok(ex.relationship < 40, `still ${ex.relationship}`);
  assert.equal(ARCS.find((x) => x.id === 'exWedding').when(s), false, 'they do not marry again next year');
});

test('an ex not long divorced is not getting married yet', () => {
  const s = career({ fame: 30 });
  const now = (s.year || 0) * 12 + (s.month || 0);
  s.family = [...(s.family || []), { id: 'ex2', name: 'Lena Holt', relation: 'Ex-spouse', alive: true, divorcedOn: now - 6, relationship: 40 }];
  assert.equal(ARCS.find((x) => x.id === 'exWedding').when(s), false);
});

// ── wave one, the rest that needs nothing new from the world ─────────────────
test('a good read that lost is kept, and one in four of those rings back: step in, and the part is on the table', () => {
  const s = career({ fame: 20 });
  const now = (s.year || 0) * 12 + (s.month || 0);
  s.submissions = [{ id: 'sub1', casting: { title: 'The Long Field', role: 'Supporting', genre: 'Drama', type: 'Feature Film', salary: 40000, months: 3 }, title: 'The Long Field', role: 'Supporting', odds: 0, quality: 75, due: now }];
  submissionsTick(s);
  assert.ok(s._nearMiss && s._nearMiss.title === 'The Long Field', 'the near miss was not kept');
  const titles = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map((x) => `Title ${x}`);
  const rec = ARCS.find((x) => x.id === 'recastCall');
  const rings = titles.filter((t) => { s._nearMiss = { title: t, at: now - 3 }; return rec.when(s); }).length;
  assert.ok(rings >= 1 && rings <= 6, `${rings} of 9 rang back`);
  const t = titles.find((x) => { s._nearMiss = { title: x, role: 'Supporting', salary: 40000, at: now - 3 }; return rec.when(s); });
  s._nearMiss = { title: t, role: 'Supporting', salary: 40000, at: now - 3 };
  ONLY(s, 'recastCall'); const a = until(s);
  assert.ok(a && a.id === 'recastCall', a ? a.id : 'nothing came');
  assert.equal(s._nearMiss, null, 'the same loss could ring twice');
  const before = (s.offers || []).length;
  resolveArc(s, 0);
  assert.equal((s.offers || []).length, before + 1);
  assert.equal(s.offers[s.offers.length - 1].projectTitle, t);
});

test('the rival whose name went: what you say is on them, for when your names meet again', () => {
  const s = career({ fame: 60 });
  const now = (s.year || 0) * 12 + (s.month || 0);
  s.world = { ...(s.world || {}), actors: [{ ...STAR, id: 'w-riv', name: 'Iris Wendt', fame: 12, born: (s.year || 0) - 35 }] };
  s._rivalPast = { who: 'w-riv', name: 'Iris Wendt', fame: 55, at: now - 24 };
  ONLY(s, 'rivalFell'); const a = until(s);
  assert.ok(a && a.id === 'rivalFell', a ? a.id : 'nothing came');
  resolveArc(s, a.choices.findIndex((c) => /interview/.test(c.label)));
  assert.equal(s.world.actors[0].remembers, 'gloated');
  assert.equal(ARCS.find((x) => x.id === 'rivalFell').when(s), false, 'the same fall twice');
});

test('a rival still working is not a fallen rival', () => {
  const s = career({ fame: 60 });
  const now = (s.year || 0) * 12 + (s.month || 0);
  s.world = { ...(s.world || {}), actors: [{ ...STAR, id: 'w-riv', fame: 52 }] };
  s._rivalPast = { who: 'w-riv', name: 'Iris Wendt', fame: 55, at: now - 24 };
  assert.equal(ARCS.find((x) => x.id === 'rivalFell').when(s), false);
});

test('somebody out of work asks for a word: vouch, and half a year on the business tells you how it went', () => {
  const s = career({ fame: 55, respect: 30 });
  const p = { id: 'pal', name: 'Rory Quill', role: 'Fellow Actor', relationship: 40, industryWeight: 20 };
  s.people = [p];
  assert.ok(NEEDS.work.wants(s, p));
  const need = { id: 'work', since: 0, until: 99999, data: { reliable: false, sum: 2000 } };
  const vouch = NEEDS.work.build(s, p, need).choices.find((c) => c.id === 'vouch');
  vouch.apply();
  assert.equal(NEEDS.work.wants(s, p), false, 'asks twice');
  const r0 = s.respect;
  s.year += 1;
  needsTick(s);
  assert.ok(s.respect < r0, `standing ${r0} → ${s.respect}: an unreliable friend cost nothing`);
  assert.ok((s.timeline || []).some((l) => /People remember who vouched/.test(typeof l === 'string' ? l : l.text || '')));
});

test('the friend who got there first becomes a name of the world, linked to who they are to you', () => {
  const s = career({ fame: 20 });
  s.people = [{ id: 'f1', name: 'Tom Hale', role: 'Fellow Actor', relationship: 60, born: (s.year || 0) - 29 }];
  let data = null;
  for (let i = 0; i < 2000 && !data; i++) data = CHAINS.friend.start(s);
  assert.ok(data, 'never started');
  const p = s.people[0];
  const a = (s.world.actors || []).find((x) => x.id === p.worldId);
  assert.ok(a, 'not in the world');
  assert.equal(a.name, 'Tom Hale');
  assert.equal(a.knownId, 'f1');
  assert.equal(CHAINS.friend.start(s), null, 'the same friend twice');
});

test('somebody you know out there is news to you: their film, whatever their rank, once', () => {
  const s = career({ fame: 20 });
  s.world = { ...(s.world || {}), rank: { you: 300 }, actors: [{ ...STAR, id: 'w-tom', name: 'Tom Hale', rank: 140, born: (s.year || 0) - 30,
    credits: [{ title: 'Blue Hour', year: (s.year || 0) - 1, gross: 80e6, rating: 76 }] }] };
  s.people = [{ id: 'f1', name: 'Tom Hale', role: 'Fellow Actor', relationship: 60, worldId: 'w-tom' }];
  let piece = null;
  for (let i = 0; i < 30 && !piece; i++) { pressTick(s); piece = (s.press || []).find((p) => p.known); s.month++; }
  assert.ok(piece, 'no news about Tom');
  assert.match(piece.head + piece.body, /Tom Hale/);
  assert.match(piece.body, /Your friend/);
  const n = (s.press || []).filter((p) => p.known).length;
  for (let i = 0; i < 12; i++) { pressTick(s); s.month++; if (s.month > 11) { s.month = 0; s.year++; } }
  assert.equal((s.press || []).filter((p) => p.known && /Blue Hour/.test(p.head)).length, n, 'the same film twice');
});

console.log(failed ? `\n${failed} failed` : '\nall passed');
if (failed) process.exit(1);
