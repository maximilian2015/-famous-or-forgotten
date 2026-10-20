// Streaming Series V1 (career/streaming.js; plan docs/handoffs/2026-10-20-streaming-series-v1-plan.md,
// revision 4). The plan's examples from its own formulas; push, renewal, a limited series, a dear show
// and a raise that cancel; a network show a platform rescues; the shelf on top of the board; the
// money and the fame; the adapter; no television typecast; the series award and the supporting race.
import assert from 'node:assert/strict';
import { career, withSeed, roundTrip, nextMonth } from './helpers/contracts.mjs';
import { startProduction } from '../src/systems/career/production.js';
import { scheduleRelease, releaseTick, runTick } from '../src/systems/career/release.js';
import { streamingRenewal } from '../src/systems/career/franchise.js';
import { getProject, adoptProject, projectOf } from '../src/systems/career/project.js';
import { refreshCastingPool, boardSize, submissionsTick } from '../src/systems/career/castings.js';
import { bubbleTick, hangIt, liveBubbles } from '../src/systems/career/bubble.js';
import { maybeGenerateOffer, maybePlatformOffer } from '../src/systems/career/offers.js';
import { reviewsFor } from '../src/systems/world/critics.js';
import { projectOutcome, isWatched, isBreakout, wentBadly } from '../src/systems/career/outcome.js';
import { trackOfWork, awardRoleOf, ASKER, SERIES } from '../src/systems/career/awards.js';
import * as ST from '../src/systems/career/streaming.js';

let failed = 0;
function test(name, fn) {
  try { withSeed(11, fn); console.log('ok    ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + ' :: ' + e.message); }
}
const near = (a, b, d, what) => assert.ok(Math.abs(a - b) <= d, `${what}: ${a}, expected ${b}`);
const plat = (archetype) => ({ id: 'plt-' + archetype, archetype, name: archetype });

// ── the plan's examples (revision 4), dice at the middle ─────────────────────
// The cost is handed in whole (salaryM, no episodes cost), as the table states it. The table was
// written with the plan's STARTING values; the game now runs on the probe's calibrated ones, so the
// formulas are held to the table with the starting values put back for the length of each check.
const PLAN = { global: { target: 0.15, breakout: 60, renew: 1.0 }, prestige: { target: 0.07, breakout: 25, renew: 0.8 },
  library: { target: 0.10, breakout: 30, renew: 0.7 }, niche: { target: 0.045, breakout: 8, renew: 0.8 } };
function withPlanValues(fn) {
  const was = {};
  for (const k of Object.keys(PLAN)) { was[k] = { ...ST.ARCHETYPES[k] }; Object.assign(ST.ARCHETYPES[k], PLAN[k]); }
  try { return fn(); } finally { for (const k of Object.keys(was)) Object.assign(ST.ARCHETYPES[k], was[k]); }
}
const EX = [
  // name, platform, genre, cost, draw, hype, legacy, word, episodes, season → views28, completion, score, outcome, push
  ['A small', 'library', 'Drama', 20, 6.6, 0, 0, 53, 8, 1, 4.3, 0.34, 0.72, 'solid', 'low'],
  ['G middling', 'global', 'Crime', 76, 24.7, 15, 0, 72, 8, 1, 23.7, 0.56, 1.17, 'solid', 'standard'],
  ['B dear', 'global', 'Sci-Fi', 250, 48.4, 0, 0, 66, 10, 1, 56.3, 0.47, 0.71, 'solid', 'big'],
  ['C sleeper', 'library', 'Drama', 25, 14, 0, 0, 85, 8, 1, 13.3, 0.72, 3.83, 'hit', 'standard'],
  ['D global', 'global', 'Horror', 75, 20.6, 0, 0, 89, 8, 1, 42.8, 0.77, 2.93, 'hit', 'standard'],
  ['D2 + buzz', 'global', 'Horror', 75, 20.6, 25, 0, 89, 8, 1, 53.4, 0.77, 3.65, 'hit', 'standard'],
  ['E prestige limited', 'prestige', 'Drama', 80, 36.4, 0, 0, 82, 6, 1, 19.0, 0.68, 2.88, 'hit', 'big'],
  ['F rescued', 'library', 'Crime', 32, 22.7, 0, 1.56, 72, 10, 4, 21.9, 0.45, 3.11, 'hit', 'standard'],
];
for (const [name, p, genre, cost, draw, hype, legacy, word, episodes, season, v28, c, score, outcome, push] of EX) {
  test(`the plan's example ${name} lands where the table says`, () => {
    const d = withPlanValues(() => ST.dropSeason({ platform: plat(p), genre, episodes, season, rating: word, word, hype, draw, salaryM: cost, episodeCost: 0, legacy, dice: 1 }));
    assert.equal(d.push, push, 'push');
    near(d.views28, v28, 0.15, 'views28'); near(d.completion, c, 0.006, 'completion'); near(d.score, score, 0.02, 'score');
    assert.equal(d.outcome, outcome, 'outcome');
  });
}
test('completion enters the 28-day verdict once: views28 does not move with it', () => {
  const base = { platform: plat('library'), genre: 'Drama', episodes: 8, rating: 70, hype: 0, draw: 10, salaryM: 20, dice: 1 };
  const lo = ST.dropSeason({ ...base, word: 60 }), hi = ST.dropSeason({ ...base, word: 80 });   // both below the virality line
  assert.equal(lo.views28, hi.views28, 'views28 moved with the word');
  near(hi.finished28 / lo.finished28, hi.completion / lo.completion, 0.05, 'finished28 is views28 × completion (both rounded)');
});
test('a Breakout is a Hit past the bar that people passed around — a star and a push alone make a big Hit', () => {
  const star = { platform: plat('global'), genre: 'Horror', episodes: 8, rating: 80, hype: 60, draw: 45, salaryM: 40, episodeCost: 0, dice: 1.25 };
  const pushed = ST.dropSeason({ ...star, word: 80 }), passed = ST.dropSeason({ ...star, word: 90 });
  assert.ok(pushed.views28 >= ST.ARCHETYPES.global.breakout, 'fixture: the star show does not clear the bar: ' + pushed.views28);
  assert.equal(pushed.viral, false); assert.equal(pushed.outcome, 'hit', 'no virality, no Breakout');
  assert.equal(passed.viral, true); assert.equal(passed.outcome, 'breakout');
  assert.equal(ST.outcomeFor(plat('global'), 3, 99, false), 'hit'); assert.equal(ST.outcomeFor(plat('global'), 3, 99, true), 'breakout');
});
test('genre enters once, through the platform', () => {
  const at = (genre) => ST.dropSeason({ platform: plat('niche'), genre, episodes: 8, word: 60, rating: 60, draw: 5, salaryM: 5, dice: 1 }).views28;
  near(at('Horror') / at('Drama'), 1.5 / 0.6, 0.06, 'horror against drama on the genre service');
});

// ── renewal on the real next cost ─────────────────────────────────────────────
test('a dear Solid show with fifty million viewers is cancelled by what the next season costs, and says so', () => {
  const r = withPlanValues(() => ST.renewalFor({ platform: plat('global'), season: 1, rating: 66, finished28: 26.6, views28: 56.3, nextCost: 253 }));
  assert.equal(r.decision, 'cancelled'); assert.equal(r.why, 'dear'); near(r.projected, 0.64, 0.02, 'projected');
  const line = ST.platformLine({ platform: { ...plat('global'), name: 'Lumen' }, views28: 56.3, completion: 0.47, decision: r.decision, why: r.why, nextCost: 253 });
  assert.match(line, /€253m/); assert.match(line, /Cancelled/);
});
test('a limited series never renews; a show ends at its platform\'s cap', () => {
  assert.equal(ST.renewalFor({ platform: plat('prestige'), limited: true, finished28: 99, views28: 99, nextCost: 1 }).decision, 'ended');
  assert.equal(ST.renewalFor({ platform: plat('prestige'), season: 4, finished28: 99, views28: 99, nextCost: 1 }).decision, 'capped');
});
test('near the bar it goes on the bubble, with odds the bubble reads as undecided', () => {
  const G = ST.ARCHETYPES.global;   // a next season whose projection lands exactly on the renewal bar
  const r = ST.renewalFor({ platform: plat('global'), season: 1, finished28: 15, views28: 30, nextCost: 15 * 0.92 / G.target / G.renew });
  assert.ok(Math.abs(r.projected - G.renew) < 0.02, 'fixture: ' + r.projected);
  assert.equal(r.decision, 'bubble'); assert.ok(r.odds > 18 && r.odds < 88, String(r.odds));
});

// ── a season, played through the real systems ───────────────────────────────
const listing = (over = {}) => ({ id: 'cast-s1', via: 'casting', projectTitle: 'Glass Harbour', seriesTitle: 'Glass Harbour', role: 'Series lead', tier: 'lead',
  type: 'Streaming Series', genre: 'Crime', scale: 'recurring', season: 1, episodes: 8, episodeFee: 60000, salary: 480000, perEpisode: true,
  months: 4, prestigeScore: 60, stability: 95, deadline: 3, payMarket: 'stream_series', platformId: 'plt-library', episodeCost: 2.5, ...over });
function throughTheDrop(s, rating = 80) {
  const p = s.productions[0];
  const rel = scheduleRelease(s, { title: p.title, type: p.type, genre: p.genre, role: p.role, salary: p.salary, rating, status: 'Well-received', year: s.year, projectId: p.projectId }, p);
  s.productions = []; s.production = null;
  s.year = Math.floor(rel.due / 12); s.month = rel.due % 12; releaseTick(s);
  const opened = s.filmography[0];
  const moment = [s.bigMoment, ...(s.moments || [])].find((m) => m && m.id === 'premiere');
  for (let n = 0; n < 40 && s.filmography[0].running; n++) { nextMonth(s); runTick(s); }
  return { p, rel, opened, moment, credit: s.filmography[0] };
}
test('a platform\'s season is a streaming project from the day it is taken', () => {
  const s = career({ fame: 40 }); startProduction(s, listing());
  const pr = getProject(s, s.productions[0].projectId);
  assert.equal(pr.medium, 'streaming'); assert.equal(pr.format, 'series'); assert.equal(pr.platformId, 'plt-library');
  assert.equal(pr.episodeCost, 2.5); assert.equal(pr.awardsTrack, 'series'); assert.equal(pr.seriesId, pr.id); assert.equal(pr.distribution, 'drop');
  const lim = career(); startProduction(lim, listing({ id: 'cast-l1', type: 'Limited Series', payMarket: 'stream_premium', platformId: 'plt-prestige', scale: 'prestige' }));
  assert.equal(getProject(lim, lim.productions[0].projectId).format, 'limited_series');
});
test('it drops all at once, months after the wrap, and the verdict is the platform\'s three numbers', () => {
  let s = career({ fame: 40, peakFame: 40, inbox: [] }); startProduction(s, listing());
  s = roundTrip(s);
  const { rel, opened, moment, credit } = throughTheDrop(s);
  assert.ok(rel.wait >= 4 && rel.wait <= 7, 'post: ' + rel.wait); assert.ok(rel.streaming);
  assert.equal(moment && moment.tv, 'streaming', 'the night is a drop');
  assert.ok(opened.views28 > 0 && opened.completion > 0 && opened.finished28 > 0, 'the numbers on the credit');
  assert.ok(!credit.running, 'the run did not close');
  assert.ok(['miss', 'solid', 'hit', 'breakout'].includes(credit.verdict), credit.verdict);
  assert.ok(credit.renewal || (s.bubbles || []).length, 'nobody decided anything');
  const v = [s.bigMoment, ...(s.moments || [])].find((m) => m && m.id === 'verdict');
  assert.ok(v && v.streaming && v.streaming.views && v.network, 'the verdict screen has no platform numbers');
});
test('a streaming season does not make you a television face', () => {
  const s = career({ fame: 40 }); startProduction(s, listing());
  const { credit } = throughTheDrop(s);
  assert.ok(!credit.tv, 'credit.tv was set');
  assert.ok(!((s.typecast || {}).tv > 0), 'the tv label moved: ' + JSON.stringify(s.typecast));
});
test('fame comes from views; a Miss gives nothing and takes nothing', () => {
  assert.equal(ST.fameFromViews(24, 'lead'), 4); assert.equal(ST.fameFromViews(30, 'lead'), 6); assert.equal(ST.fameFromViews(99, 'lead'), 8);
  assert.equal(ST.fameFromViews(30, 'supporting'), 3); assert.equal(ST.fameFromViews(3, 'lead'), 0);
  assert.equal(ST.hypeFor('miss', 'lead'), 0); assert.equal(ST.hypeFor('breakout', 'supporting'), 70);
});
test('the adapter reads the platform\'s words: −1, 0, +1, +2', () => {
  const s = career();
  const g = (verdict) => projectOutcome(s, { verdict, streaming: true, payMarket: 'stream_series', type: 'Streaming Series', scale: 'recurring', views28: 10, completion: 0.5 });
  assert.deepEqual(['miss', 'solid', 'hit', 'breakout'].map((v) => g(v).grade), [-1, 0, 1, 2]);
  assert.ok(isWatched(g('hit')) && isWatched(g('breakout')) && isBreakout(g('breakout')) && wentBadly(g('miss')));
});
test('a star\'s raise can be what cancels the show', () => {
  // The ad-supported service never pays more than €40m a season. Season one fits under it; the lead's
  // market raise for season two does not.
  const s = career({ fame: 80 }); startProduction(s, listing({ episodeFee: 1200000, salary: 9600000, episodeCost: 3 }));
  const p = s.productions[0];
  const credit = { title: 'Glass Harbour', rating: 90, verdict: 'hit', streaming: true, views28: 30, completion: 0.7, finished28: 21, season: 1, projectId: p.projectId };
  const job = { title: 'Glass Harbour', seriesTitle: 'Glass Harbour', projectId: p.projectId, season: 1, episodes: 8, episodeFee: 1200000, salary: 9600000, type: 'Streaming Series', genre: 'Crime', scale: 'recurring', tier: 'lead', role: 'Series lead' };
  assert.ok(ST.seasonCost({ episodes: 8, episodeCost: 3, salaryM: 9.6 }) < 40, 'fixture: season one is over the ceiling');
  const r = streamingRenewal(s, credit, job);
  assert.equal(r.decision, 'cancelled', JSON.stringify({ r, next: credit.nextCost }));
  assert.ok(credit.nextCost > 40, 'next cost ' + credit.nextCost);
});
test('renewed, the next season is the same show on the same platform', () => {
  const s = career({ fame: 30 }); startProduction(s, listing({ episodeCost: 1.2, episodeFee: 20000, salary: 160000 }));
  const p = s.productions[0];
  const credit = { title: 'Glass Harbour', rating: 85, verdict: 'hit', streaming: true, views28: 30, completion: 0.75, finished28: 22, season: 1, projectId: p.projectId };
  const job = { title: 'Glass Harbour', seriesTitle: 'Glass Harbour', projectId: p.projectId, season: 1, episodes: 8, episodeFee: 20000, salary: 160000, type: 'Streaming Series', genre: 'Crime', scale: 'recurring', tier: 'lead', role: 'Series lead', months: 4, prestigeScore: 60 };
  const r = streamingRenewal(s, credit, job);
  assert.equal(r.decision, 'renewed'); assert.ok(r.offer, 'no offer');
  assert.equal(r.offer.payMarket, 'stream_series'); assert.doesNotMatch(r.offer.note, /network/i);
  startProduction(s, r.offer);
  const child = getProject(s, s.productions[s.productions.length - 1].projectId), parent = getProject(s, p.projectId);
  assert.equal(child.medium, 'streaming'); assert.equal(child.seriesId, parent.seriesId); assert.equal(child.platformId, parent.platformId); assert.equal(child.episodeCost, parent.episodeCost);
});

// ── a network show a platform picks up (plan §9) ─────────────────────────────
test('a network show a platform rescues is streaming from its next season, the same series, with the fans\' loyalty', () => {
  const s = career({ fame: 50 });
  startProduction(s, listing({ id: 'net1', type: 'Network Drama', payMarket: 'tv_network', platformId: undefined, episodeCost: undefined, role: 'Series regular' }));
  const p = s.productions[0];
  const was = getProject(s, p.projectId);
  assert.equal(was.medium, 'television', 'fixture: not a network show');
  s.filmography = [{ title: 'Glass Harbour', type: 'Network Drama', season: 1, rating: 80, endViewers: 4.2, viewers: 4, projectId: p.projectId }];
  s.bubbles = [{ id: 'b1', title: 'Glass Harbour', root: 'Glass Harbour', type: 'Network Drama', season: 1, odds: 0, base: 0, heat: 'loud',
    since: 0, due: 0, backed: false, campaign: null, shopped: 100, job: { ...p, projectId: p.projectId, seriesTitle: 'Glass Harbour' }, rating: 80, viewers: 4.2 }];
  const random = Math.random;
  try { Math.random = () => 0; bubbleTick(s); } finally { Math.random = random; }
  const o = (s.offers || []).find((x) => x.kind === 'rescue');
  assert.ok(o, 'no rescue: ' + JSON.stringify(s.lastEvent));
  assert.equal(o.payMarket, 'stream_series'); assert.ok(o.platformId); assert.ok(o.legacy > 0 && o.legacy <= 2, 'legacy ' + o.legacy);
  startProduction(s, o);
  const now = getProject(s, s.productions[s.productions.length - 1].projectId);
  assert.equal(now.medium, 'streaming'); assert.equal(now.seriesId, was.seriesId, 'not the same series'); assert.equal(now.legacy, o.legacy);
});

// ── the shelf ────────────────────────────────────────────────────────────────
test('the streaming shelf sits on top of the board and takes nothing from it', () => {
  for (const fame of [0, 40, 80]) {
    const on = career({ fame, peakFame: fame, castingPool: [] });
    refreshCastingPool(on, true);
    const board = on.castingPool.filter((c) => c.shelf !== 'stream').length, stream = on.castingPool.filter((c) => c.shelf === 'stream');
    assert.equal(board, boardSize(on), `fame ${fame}: the board has ${board}, not ${boardSize(on)}`);
    assert.ok(stream.length >= 1 && stream.length <= 3, `fame ${fame}: ${stream.length} on the streaming shelf`);
    for (const c of stream) assert.ok(c.platformId && c.episodeCost > 0 && c.perEpisode && /^stream_/.test(c.payMarket), JSON.stringify(c));
  }
  ST.setStreamingPool(false);
  try { const off = career({ castingPool: [] }); refreshCastingPool(off, true); assert.ok(!off.castingPool.some((c) => c.shelf === 'stream'), 'off is off'); }
  finally { ST.setStreamingPool(true); }
});
test('a supporting part on a platform is a supporting part — in the offer, the fee and the award', () => {
  const s = career({ fame: 20, peakFame: 20, castingPool: [] });
  const c = { ...listing({ id: 'cast-sup', role: 'Ensemble', tier: 'supporting', share: 0.6 }), title: 'Glass Harbour', shelf: 'stream' };
  s.submissions = [{ id: 'sub1', casting: c, title: c.title, role: c.role, odds: 100, quality: 60, due: 0, wait: 1 }];
  submissionsTick(s);
  const o = (s.offers || [])[0];
  assert.ok(o, 'no offer'); assert.equal(o.tier, 'supporting'); assert.equal(o.platformId, 'plt-library'); assert.equal(o.episodeCost, 2.5);
  const credit = { title: 'Glass Harbour', type: 'Streaming Series', role: 'Ensemble', tier: 'supporting', scale: 'recurring', payMarket: 'stream_series' };
  assert.equal(trackOfWork(s, credit), 'series'); assert.ok(SERIES.eligible(s, credit) && !ASKER.eligible(s, credit), 'the wrong award');
  assert.equal(awardRoleOf(credit), 'supporting');
});

// ── the routes (plan §8) ─────────────────────────────────────────────────────
const fixedDice = (fn, v = 0) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };
test('the shelf is for a career that is starting: supporting parts only', () => {
  for (const fame of [0, 20, 40, 80]) {
    const s = career({ fame, peakFame: fame, castingPool: [] }); refreshCastingPool(s, true);
    for (const c of s.castingPool.filter((x) => x.shelf === 'stream')) assert.equal(c.tier, 'supporting', `fame ${fame}: ${c.role} on the shelf`);
  }
});
test('from Known Face an agent brings a platform\'s lead', () => {
  const s = career({ fame: 45, peakFame: 45, offers: [], agent: { name: 'Ada Vance', tier: 'novice', level: 1 } });
  let o = null;
  for (let i = 0; i < 400 && !o; i++) { s.offers = []; maybeGenerateOffer(s); o = (s.offers || []).find((x) => x.platformId); }
  assert.ok(o, 'no agent ever brought a streaming part');
  assert.equal(o.via, 'agent'); assert.equal(o.tier, 'lead'); assert.ok(/^stream_/.test(o.payMarket) && o.episodeCost > 0);
  const none = career({ fame: 45, peakFame: 45, offers: [], agent: null });
  for (let i = 0; i < 200; i++) { none.offers = []; maybeGenerateOffer(none); assert.ok(!(none.offers || []).some((x) => x.platformId), 'no agent, and yet'); }
});
test('a star is rung by the platform itself, in Email', () => {
  const s = career({ fame: 80, peakFame: 80, offers: [], inbox: [] });
  fixedDice(() => maybePlatformOffer(s));
  const o = (s.offers || []).find((x) => x.platformId);
  assert.ok(o, 'no call'); assert.equal(o.via, 'platform'); assert.ok(o.from); assert.equal(o.tier, 'lead');
  assert.ok((s.inbox || []).some((m) => m.offerId === o.id), 'no letter');
  const low = career({ fame: 40, peakFame: 40, offers: [], inbox: [] });
  fixedDice(() => maybePlatformOffer(low)); assert.ok(!(low.offers || []).length, 'a known face was rung directly');
});
test('a platform\'s show on the bubble is decided by the platform, by name', () => {
  const s = career({ fame: 40 }); startProduction(s, listing());
  const p = s.productions[0];
  const credit = { title: 'Glass Harbour', rating: 70, streaming: true, platformId: 'plt-library', views28: 12, completion: 0.6, type: 'Streaming Series', season: 1 };
  hangIt(s, credit, { ...p, seriesTitle: 'Glass Harbour' }, 80);   // 'going to keep it' — the line that names who decides
  const b = liveBubbles(s)[0], name = ST.platformById(s, 'plt-library').name;
  for (const k of ['line', 'mood', 'elsewhere']) assert.doesNotMatch(b[k], /network/i, k + ': ' + b[k]);
  assert.match(b.elsewhere + ' ' + b.mood, new RegExp(name.replace(/[+]/g, '\\+')), 'the platform is not named');
  assert.doesNotMatch(s.timeline ? JSON.stringify(s.timeline.slice(-1)) : '', /network/i);
});
test('the critics review a series as a series', () => {
  const s = career();
  for (let i = 0; i < 40; i++) {
    const r = reviewsFor(s, { title: 'Glass Harbour', rating: 40 + i, genre: ['Crime', 'Thriller', 'Drama', 'Comedy'][i % 4], verdict: 'hit', actorName: 'Audit Actor', series: true });
    for (const x of r.reviews) assert.doesNotMatch(x.text, /\b(film|films|movie|movies|picture|pictures|cinema)\b/i, x.text);
  }
});

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
