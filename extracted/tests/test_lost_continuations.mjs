// The season or the sequel that went on without you (career/continuation.js; Maxi/ChatGPT, 22 Oct,
// at "The Last Woman": renewed for season 2, never came, and nothing anywhere said why).
// The show's fate and yours kept apart; the loss written down whatever else is going on; what it
// did worked out by the game's own arithmetic, with somebody real in your part, and told once; the
// fans reacting to how much it meant; nobody's standing moved by a negotiation; old saves migrated
// only on what they say outright.
import assert from 'node:assert/strict';
import { withSeed } from './helpers/contracts.mjs';
import { createInitialState } from '../src/state/initialState.js';
import { ensureWorld, actorById } from '../src/systems/world/world.js';
import { declineOffer, offersTick } from '../src/systems/career/offers.js';
import { itFails } from '../src/systems/career/standoff.js';
import { storiesTick, storyOf } from '../src/systems/meta/stories.js';
import { resolveArc } from '../src/systems/life/arcs.js';
import { passedOn } from '../src/systems/meta/passed.js';
import { tvVerdict } from '../src/systems/career/release/television.js';
import * as C from '../src/systems/career/continuation.js';

let failed = 0;
function test(name, fn) {
  try { withSeed(23, fn); console.log('ok    ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + ' :: ' + e.message); }
}
const stamp = (s) => s.year * 12 + s.month;
const to = (s, abs) => { s.year = Math.floor(abs / 12); s.month = abs % 12; };
function life(over = {}) {
  const s = { ...createInitialState({ created: true }), name: 'Mira Vale', gender: 'female', ageY: 34, stage: 'career', alive: true,
    fame: 55, peakFame: 55, respect: 30, scandal: 0, year: 2077, month: 1, timeline: [], inbox: [], offers: [], stories: [], people: [],
    productions: [], filmography: [], cash: 1e6, ap: 100, apMax: 100, apMaxEff: 100, ...over };
  ensureWorld(s);
  return s;
}
// A show people watched (a prestige season at 37m against a slot of 6m), and the paper for the next one.
const SHOW = { id: 'tlw-1', title: 'The Last Woman', type: 'Prestige Series', scale: 'prestige', tier: 'lead', role: 'Season lead', season: 1,
  episodes: 9, rating: 47, viewers: 41.6, openViewers: 46, endViewers: 37.2, verdict: 'ignored', renewal: 'renewed', year: 2076, closedAt: 2077 * 12 + 1, director: 'Lena Ulloa' };
const season2 = (over = {}) => ({ id: 'ren-tlw', kind: 'renewal', season: 2, seriesTitle: 'The Last Woman', projectTitle: 'The Last Woman · season 2',
  role: 'Season lead', tier: 'lead', type: 'Prestige Series', genre: 'Sci-Fi', scale: 'prestige', episodes: 9, months: 5, salary: 2e6, episodeFee: 222222,
  perEpisode: true, sourceCreditId: 'tlw-1', deadline: 1, ...over });
const FILM = { id: 'skb-1', title: 'Skinless Bone', type: 'Feature Film', scale: 'feature', tier: 'lead', role: 'Lead', genre: 'Horror', rating: 80,
  year: 2076, verdict: 'smash', boxOffice: 4.7e8, director: 'Ivo Kessler', projectId: 'prj-skb' };
const part2 = (over = {}) => ({ id: 'seq-skb', kind: 'sequel', part: 2, projectTitle: 'Skinless Bone II', role: 'Lead', tier: 'lead', type: 'Feature Film',
  genre: 'Horror', scale: 'feature', salary: 4e6, months: 5, budget: 60, parentProjectId: 'prj-skb', deadline: 3, ...over });

// ── the show's fate and yours ────────────────────────────────────────────────
test('failed negotiations: the paper lapses after a fight — renewed stays renewed, you are recast, and the deal is why', () => {
  const s = life({ filmography: [{ ...SHOW }] });
  s.offers = [season2({ contract: { round: 2, clauses: [] } })];
  const r0 = s.respect;
  offersTick(s);
  const c = s.filmography[0], rec = c.next;
  assert.equal(c.renewal, 'renewed', 'the show');
  assert.ok(rec && rec.you === 'recast' && rec.how === 'talks' && rec.kind === 'season' && rec.n === 2, JSON.stringify(rec));
  assert.ok(rec.by && actorById(s, rec.by.id), 'somebody real has the part');
  assert.equal(s.respect, r0, 'standing moved because a negotiation did not close');
  assert.ok(!s.filmography.some((x) => x.season === 2), 'a credit for a season you did not play');
  assert.ok(passedOn(s).some((p) => p.title === 'The Last Woman · season 2' && p.how === 'talks'), 'not in the ledger');
});
test('voluntary departure: leaving by the exit clause is written down, and costs nothing', () => {
  const s = life({ filmography: [{ ...SHOW, season: 3, id: 'tlw-3' }] });
  s.offers = [season2({ season: 4, projectTitle: 'The Last Woman · season 4', sourceCreditId: 'tlw-3', exitAfter: 3 })];
  const r0 = s.respect;
  declineOffer(s, 'ren-tlw');
  const rec = s.filmography[0].next;
  assert.ok(rec && rec.you === 'left' && rec.how === 'exit' && rec.n === 4, JSON.stringify(rec));
  assert.equal(s.respect, r0); assert.ok(!storyOf(s, 'recast'), 'a graceful exit started a recast story');
});
test('recasting by your own no: declined, with a replacement, and the director writes', () => {
  const s = life({ filmography: [{ ...SHOW }] });
  s.offers = [season2()];
  declineOffer(s, 'ren-tlw');
  const rec = s.filmography[0].next;
  assert.ok(rec.you === 'declined' && rec.how === 'passed' && rec.by, JSON.stringify(rec));
  assert.ok(storyOf(s, 'recast') && storyOf(s, 'recast').beat === 'meeting');
});
test('written out in the room: the show is renewed, your character is not in it, and nobody plays it', () => {
  const s = life({ filmography: [{ ...SHOW }], standoff: { title: 'The Last Woman', season: 2 } });
  const o = season2(); s.offers = [o];
  itFails(s, { ...o, _forced: 'killed' });
  const c = s.filmography[0];
  assert.equal(c.renewal, 'renewed');
  assert.ok(c.next.you === 'killed' && c.next.by === null && c.next.show === 'on', JSON.stringify(c.next));
});
test('a season nobody would make: the show is cancelled, and there is nothing to simulate', () => {
  const s = life({ filmography: [{ ...SHOW }], standoff: { title: 'The Last Woman', season: 2 } });
  const o = season2(); s.offers = [o];
  itFails(s, { ...o, _forced: 'cancel' });
  const c = s.filmography[0];
  assert.equal(c.renewal, 'cancelled');
  assert.ok(c.next.show === 'notMade' && c.next.due === null, JSON.stringify(c.next));
  to(s, stamp(s) + 30); C.continuationTick(s);
  assert.ok(!c.next.result && !s.inbox.some((m) => m.tag === 'trades'), 'a season that was never made went out');
});

// ── what it did ──────────────────────────────────────────────────────────────
test('a renewed show without you: it goes out the month it would have, worked out, told once', () => {
  const s = life({ filmography: [{ ...SHOW }] });
  s.offers = [season2({ contract: { round: 1, clauses: [] } })];
  offersTick(s);
  const rec = s.filmography[0].next;
  s.stories = [];   // no "Without you" story telling it: the trades do
  to(s, rec.due - 1); C.continuationTick(s);
  assert.ok(!rec.result, 'told before it came out');
  to(s, rec.due); C.continuationTick(s); C.continuationTick(s);
  assert.ok(rec.result && rec.result.open > 0 && rec.result.end > 0 && ['watched', 'seen', 'ignored'].includes(rec.result.verdict), JSON.stringify(rec.result));
  const mails = s.inbox.filter((m) => m.tag === 'trades');
  assert.equal(mails.length, 1, 'told twice');
  assert.ok(mails[0].body.includes(rec.by.name) && /season 2/i.test(mails[0].subj), mails[0].body);
  const lines = C.nextLines(s.filmography[0]);
  assert.ok(/Season 2: Recast/.test(lines.you) && /went out without you/.test(lines.after), JSON.stringify(lines));
});
test('a sequel without you: a world film with somebody real in your part, on their own record', () => {
  const s = life({ filmography: [{ ...FILM }] });
  s.offers = [part2()];
  declineOffer(s, 'seq-skb');
  const rec = s.filmography[0].next;
  assert.ok(rec.kind === 'part' && rec.n === 2 && rec.by, JSON.stringify(rec));
  s.stories = [];
  to(s, rec.due); C.continuationTick(s);
  assert.ok(rec.result.gross > 0 && ['smash', 'profitable', 'broke even', 'bomb'].includes(rec.result.verdict), JSON.stringify(rec.result));
  const a = actorById(s, rec.by.id);
  assert.ok(a.credits.some((x) => x.title === 'Skinless Bone II' && x.gross === rec.result.gross), 'not on the replacement\'s record');
});
test('the arithmetic is the continuation\'s own: the same answer twice, and the life\'s dice untouched', () => {
  const s = life({ filmography: [{ ...SHOW }] });
  s.offers = [season2()]; declineOffer(s, 'ren-tlw');
  const src = s.filmography[0], rec = src.next;
  const a = C.simulate(s, src, rec), b = C.simulate(s, src, rec);
  assert.deepEqual(a, b);
  // The life's own next number is the same whether or not the season was worked out in between.
  const withIt = withSeed(99, () => { C.simulate(s, src, rec); return Math.random(); });
  const without = withSeed(99, () => Math.random());
  assert.equal(withIt, without);
});

// ── the fans ─────────────────────────────────────────────────────────────────
test('the fans react to how much it meant: a hit show furious, a show nobody watched in a paragraph or not at all', () => {
  const big = life({ filmography: [{ ...SHOW }] }); big.offers = [season2()];
  declineOffer(big, 'ren-tlw');
  assert.ok(big.scandal > 0 && big.timeline.some((x) => /Fans are furious/.test(x.text)), 'a hit show and no fury');
  const small = life({ filmography: [{ ...SHOW, viewers: 1.2, openViewers: 1.5, endViewers: 1.1 }] }); small.offers = [season2()];
  declineOffer(small, 'ren-tlw');
  assert.ok(small.scandal === 0 && !small.timeline.some((x) => /Fans are furious/.test(x.text)), 'a show nobody watched and the fans furious');
  assert.ok(small.filmography[0].next && small.filmography[0].next.you === 'declined', 'quiet is not forgotten');
});
test('written out of a hit by the network: the fans are angry with the network, not with you', () => {
  const s = life({ filmography: [{ ...SHOW }] });
  C.writtenOutAtRenewal(s, s.filmography[0], { tier: 'lead', episodes: 9 }, 'The Last Woman', 2, 5);
  assert.equal(s.scandal, 0);
  assert.ok(s.timeline.some((x) => /with the network/.test(x.text)) && s.filmography[0].next.you === 'writtenOut');
});

// ── nothing lost, nothing twice ──────────────────────────────────────────────
test('two losses at once: the second is written down and waits its turn instead of never being told', () => {
  const s = life({ filmography: [{ ...SHOW }, { ...FILM }] });
  s.offers = [season2(), part2()];
  declineOffer(s, 'ren-tlw'); declineOffer(s, 'seq-skb');
  assert.ok(s.filmography[0].next && s.filmography[1].next, 'one of them was not written down');
  assert.equal(storyOf(s, 'recast').data.title, 'The Last Woman · season 2');
  assert.ok((s.recastQueue || []).some((x) => x.title === 'Skinless Bone II'), 'the second is not waiting');
  // The first ends; the second starts from the queue.
  s.stories = []; storiesTick(s);
  assert.equal(storyOf(s, 'recast') && storyOf(s, 'recast').data.title, 'Skinless Bone II');
});
test('a queued one that is already too late for a meeting goes straight to the news, the month it opens', () => {
  const s = life({ filmography: [{ ...SHOW }, { ...FILM }] });
  s.offers = [season2(), part2()];
  declineOffer(s, 'ren-tlw'); declineOffer(s, 'seq-skb');
  const rec = s.filmography[1].next;
  to(s, rec.due - 3); s.stories = []; storiesTick(s);
  const st = storyOf(s, 'recast');
  assert.ok(st && st.beat === 'without' && st.due === rec.due, JSON.stringify(st && { beat: st.beat, due: st.due }));
});
test('delayed follow-up: the story tells it when it comes out, with the real result — and the trades do not tell it again', () => {
  const s = life({ filmography: [{ ...FILM }] });
  s.offers = [part2()]; declineOffer(s, 'seq-skb');
  const st = storyOf(s, 'recast'), rec = s.filmography[0].next;
  st.beat = 'without'; st.due = stamp(s);
  storiesTick(s);
  assert.ok(!s.pendingArc, 'told before it opened');
  to(s, rec.due); C.continuationTick(s);
  assert.ok(!s.inbox.some((m) => m.tag === 'trades'), 'the trades told it over the story');
  storiesTick(s);
  assert.ok(s.pendingArc && s.pendingArc.beat === 'without' && s.pendingArc.text.includes(rec.by.name) && rec.told, s.pendingArc && s.pendingArc.text);
  resolveArc(s, 0);
  C.continuationTick(s);
  assert.ok(!s.inbox.some((m) => m.tag === 'trades'), 'told twice');
});
test('the same loss reported twice is one record and one ledger entry', () => {
  const s = life({ filmography: [{ ...SHOW }] });
  const o = season2();
  C.loseContinuation(s, o, 'talks'); C.loseContinuation(s, o, 'talks');
  assert.equal(passedOn(s).filter((p) => p.title === 'The Last Woman · season 2').length, 1);
  assert.equal(s.timeline.filter((x) => /Fans are furious/.test(x.text)).length, 1, 'the fans twice');
});
test('you went back after all: nothing goes out without you', () => {
  const s = life({ filmography: [{ ...SHOW }] });
  s.offers = [season2()]; declineOffer(s, 'ren-tlw');
  const rec = s.filmography[0].next;
  s.filmography.unshift({ id: 'tlw-2', title: 'The Last Woman · season 2', season: 2, year: 2078 });
  s.stories = []; to(s, rec.due); C.continuationTick(s);
  assert.ok(rec.you === 'returned' && !rec.result && !s.inbox.some((m) => m.tag === 'trades'));
});

// ── an old save ──────────────────────────────────────────────────────────────
test('The Last Woman, from Maxi\'s save: recast after the talks, Feb 2078, worked out quietly', () => {
  const s = life({ year: 2079, month: 3, filmography: [{ ...SHOW }], timeline: [
    { text: 'They stopped waiting on The Last Woman · season 2 and cast someone else.', when: 'Feb 2078', bad: true },
    { text: 'The meeting about "The Last Woman · season 2".', when: 'Feb 2078' },
    { text: 'A date for "The Last Woman · season 2". Everybody who can say yes will be in one room.', when: 'Dec 2077' },
    { text: 'Sent the contract for The Last Woman · season 2 back.', when: 'Nov 2077' }] });
  C.settleLostContinuations(s);
  const c = s.filmography[0], rec = c.next;
  assert.equal(c.renewal, 'renewed');
  assert.ok(rec && rec.you === 'recast' && rec.how === 'talks' && rec.at === 2078 * 12 + 1 && rec.migrated, JSON.stringify(rec));
  assert.ok(rec.result && rec.told && !s.inbox.some((m) => m.tag === 'trades'), 'history arrived as news');
  // Display only: the stored word stays, the word its numbers give is "watched".
  assert.equal(c.verdict, 'ignored');
  assert.equal(tvVerdict({ endViewers: c.endViewers, viewers: c.viewers, type: c.type, rating: c.rating }), 'watched');
});
test('old saves: nothing inferred from a season that simply never appeared, the old "written out" split in two, and once only', () => {
  const s = life({ year: 2080, filmography: [{ ...SHOW, id: 'a', title: 'Quiet Harbour' }, { ...SHOW, id: 'b', title: 'Low Road', renewal: 'writtenOut', renewalReason: 'a death' }] });
  C.settleLostContinuations(s);
  assert.ok(!s.filmography[0].next, 'a missing season taken as a recast');
  const b = s.filmography[1];
  assert.ok(b.renewal === 'renewed' && b.next.you === 'killed' && b.next.migrated, JSON.stringify(b));
  const snap = JSON.stringify(s.filmography);
  s.continuationsVersion = 0; C.settleLostContinuations(s);
  assert.equal(JSON.stringify(s.filmography), snap, 'a second pass changed it');
});

// ── integration (Maxi/ChatGPT, 22 Oct, before the merge) ─────────────────────
test('while it is still being argued over it is "Negotiations pending", not a recast — no replacement, no outcome', () => {
  const s = life({ filmography: [{ ...SHOW }] });
  s.offers = [season2()]; declineOffer(s, 'ren-tlw');
  const c = s.filmography[0], rec = c.next;
  assert.equal(storyOf(s, 'recast').beat, 'meeting');
  let nl = C.nextLines(c, s);
  assert.ok(nl.pending && /Negotiations pending/.test(nl.you) && !/Recast/.test(nl.you) && !nl.after, JSON.stringify(nl));
  // Their new paper, after the meeting: still pending.
  s.offers = [{ ...season2(), id: 'meet-1', story: 'recast', meeting: true }];
  storyOf(s, 'recast').beat = 'answer';
  to(s, rec.due + 1); C.continuationTick(s);
  assert.ok(!rec.result && !s.inbox.some((m) => m.tag === 'trades'), 'worked out while still being argued over');
  nl = C.nextLines(c, s);
  assert.ok(nl.pending && /new paper/.test(nl.you), JSON.stringify(nl));
  // The second no: now it is a recast.
  declineOffer(s, 'meet-1');
  nl = C.nextLines(c, s);
  assert.ok(!nl.pending && /Season 2: Recast/.test(nl.you) && rec.by, JSON.stringify(nl));
});
test('a platform\'s sequel without you stays a platform\'s film: dropped on the platform, on the replacement\'s record as one', () => {
  const s = life({ filmography: [{ id: 'nf-1', title: 'Night Ferry', type: 'Streaming Film', scale: 'indie', tier: 'lead', role: 'Lead', genre: 'Horror', rating: 72,
    streaming: true, platformId: 'plt-niche', views28: 3.2, finished28: 2, completion: 0.62, filmCost: 3, verdict: 'hit', year: 2076, projectId: 'prj-nf' }] });
  s.offers = [{ id: 'seq-nf', kind: 'sequel', part: 2, projectTitle: 'Night Ferry II', type: 'Streaming Film', role: 'Lead', tier: 'lead', genre: 'Horror',
    scale: 'indie', platformId: 'plt-niche', parentProjectId: 'prj-nf', budget: 3, months: 3, salary: 1e5, deadline: 3 }];
  declineOffer(s, 'seq-nf');
  const rec = s.filmography[0].next;
  assert.ok(rec.medium === 'streaming' && rec.platformId === 'plt-niche' && rec.kind === 'part', JSON.stringify(rec));
  s.stories = []; to(s, rec.due); C.continuationTick(s);
  assert.ok(rec.result.streaming && rec.result.movie && !('gross' in rec.result) && ['miss', 'solid', 'hit', 'breakout'].includes(rec.result.verdict), JSON.stringify(rec.result));
  assert.ok(/dropped on .+ without you/.test(C.withoutYouLine(rec, s.filmography[0])), C.withoutYouLine(rec, s.filmography[0]));
  const a = actorById(s, rec.by.id);
  assert.ok(a.credits.some((x) => x.title === 'Night Ferry II' && x.streaming && x.gross === 0), 'not on the replacement\'s record as a platform film');
});
test('the show goes on after you, season by season, to its end — each season on the card and told once, in order', () => {
  const s = life({ filmography: [{ ...SHOW, type: 'Drama Series', scale: 'recurring', viewers: 9, openViewers: 9.5, endViewers: 8.8, rating: 74 }] });
  s.offers = [season2()]; declineOffer(s, 'ren-tlw');
  const rec = s.filmography[0].next;
  s.stories = [];
  for (let m = rec.due; m <= rec.due + 12 * 25; m++) { to(s, m); C.continuationTick(s); }
  assert.ok(rec.result && rec.ended, 'the show never ended: ' + JSON.stringify({ later: rec.later.length, ended: rec.ended }));
  const last = rec.later.length ? rec.later[rec.later.length - 1] : rec.result;
  assert.equal(rec.ended.n, last.n);
  assert.ok(rec.later.every((x, i) => x.n === rec.n + 1 + i && x.told), 'a season skipped or untold');
  const mails = s.inbox.filter((m) => m.tag === 'trades');
  assert.equal(mails.length, 1 + rec.later.length, 'told twice, or not at all');
  assert.equal(new Set(mails.map((m) => m.subj)).size, mails.length);
  const line = C.nextLines(s.filmography[0], s).after;
  if (rec.later.length) assert.ok(/Then: S\d/.test(line) && /(cancelled|ended) after season/.test(line), line);
});
test('nothing is lost while a story holds the news: later seasons are recorded, then told in order once it has spoken', () => {
  const s = life({ filmography: [{ ...SHOW, type: 'Drama Series', scale: 'recurring', viewers: 9, openViewers: 9.5, endViewers: 8.8, rating: 74 }] });
  s.offers = [season2()]; declineOffer(s, 'ren-tlw');
  const rec = s.filmography[0].next;
  const st = storyOf(s, 'recast'); st.beat = 'without'; st.due = 999999;   // a story that has the first season to tell
  for (let m = rec.due; m <= rec.due + 12 * 6; m++) { to(s, m); C.continuationTick(s); }
  assert.ok(rec.result && !rec.told && !s.inbox.some((m) => m.tag === 'trades'), 'the trades spoke over the story');
  const recorded = rec.later.length;
  s.stories = [];   // the story is done (or gone): the trades take over
  C.continuationTick(s);
  assert.ok(rec.told && rec.later.every((x) => x.told), 'left untold');
  assert.equal(s.inbox.filter((m) => m.tag === 'trades').length, 1 + recorded);
});

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
