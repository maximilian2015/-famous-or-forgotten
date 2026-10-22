// Streaming Movies V1 (career/streaming.js FILM, release/streaming.js, release/acquisition.js; plan
// docs/handoffs/2026-10-21-streaming-movies-v1-plan.md, revision 2). The plan's examples from its own
// formulas; momentum and completion each counted once; the fee never added to the cost; a platform's
// film through the real systems — a film to the critics and the Asker, never a season, never a box
// office; the paper; who pays for the campaign; the festival's two buyers and the later sale; the
// platform's sequel.
import assert from 'node:assert/strict';
import { career, withSeed, nextMonth } from './helpers/contracts.mjs';
import { startProduction } from '../src/systems/career/production.js';
import { scheduleRelease, releaseTick, runTick, answerFestMail } from '../src/systems/career/release.js';
import { platformFilmSequel } from '../src/systems/career/franchise.js';
import { getProject, adoptProject } from '../src/systems/career/project.js';
import { trackOfWork, ASKER, SERIES, campaignKind, campaignBacker } from '../src/systems/career/awards.js';
import { draftContract } from '../src/systems/career/contract.js';
import { emailTick } from '../src/systems/meta/email.js';
import { rollLaterSale } from '../src/systems/career/release/acquisition.js';
import * as ST from '../src/systems/career/streaming.js';

let failed = 0;
function test(name, fn) {
  try { withSeed(17, fn); console.log('ok    ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + ' :: ' + e.message); }
}
const near = (a, b, d, what) => assert.ok(Math.abs(a - b) <= d, `${what}: ${a}, expected ${b}`);
const plat = (archetype) => ({ id: 'plt-' + archetype, archetype, name: archetype });
const fixedDice = (fn, v = 0) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };
const castDraw = (names) => names.filter((n) => n > 0).sort((a, b) => b - a).reduce((n, f, i) => n + Math.pow(f, 0.82) * ([1, 0.55, 0.25, 0.12][i] ?? 0.05), 0);

// ── the plan's examples (revision 2), dice at 1 ──────────────────────────────
// Written with the plan's starting values; when the probe calibrates FILM, they are put back for the
// length of each check, as the series' are (test_streaming.mjs PLAN).
const PLAN = { global: { target: 0.18, breakout: 70 }, prestige: { target: 0.32, breakout: 25 }, library: { target: 0.65, breakout: 35 }, niche: { target: 0.33, breakout: 10 } };
function withPlanValues(fn) {
  const was = {};
  for (const k of Object.keys(PLAN)) { was[k] = { ...ST.FILM[k] }; Object.assign(ST.FILM[k], PLAN[k]); }
  try { return fn(); } finally { for (const k of Object.keys(was)) Object.assign(ST.FILM[k], was[k]); }
}
const EX = [
  // name, platform, genre, budget, price, names, hype, word, crowd, rating → starts28, completion, score, outcome
  ['A unknown, genre horror', 'niche', 'Horror', 2, null, [8], 0, 55, 56, 52, 1.2, 0.59, 1.07, 'solid'],
  ['B rising, ad-supported rom-com', 'library', 'Romance', 10, null, [30], 15, 62, 64, 58, 11.2, 0.65, 1.08, 'solid'],
  ['C star, giant event, ordinary', 'global', 'Sci-Fi', 180, null, [70, 50], 40, 60, 60, 60, 61.2, 0.62, 1.07, 'solid'],
  ['D the same, loved', 'global', 'Sci-Fi', 180, null, [70, 50], 40, 82, 84, 78, 84.6, 0.79, 1.87, 'breakout'],
  ['E known, premium drama 8.6', 'prestige', 'Drama', 22, null, [45], 10, 72, 64, 86, 10.2, 0.65, 1.17, 'solid'],
  ['F festival prize, bought', 'prestige', 'Drama', 2.5, 4, [15], 30, 74, 68, 84, 4.9, 0.68, 3.31, 'hit'],
  ['G supporting, giant event', 'global', 'Thriller', 140, null, [60, 30], 10, 64, 66, 62, 49.7, 0.66, 1.19, 'solid'],
];
for (const [name, p, genre, budget, price, names, hype, word, crowd, rating, s28, comp, score, outcome] of EX) {
  test(`the plan's example ${name} lands where the table says`, () => {
    const d = withPlanValues(() => ST.dropFilm({ platform: plat(p), genre, budget, price, draw: castDraw(names), hype, word, crowd, rating, dice: 1 }));
    near(d.views28, s28, 0.15, 'starts28'); near(d.completion, comp, 0.006, 'completion'); near(d.score, score, 0.02, 'score');
    assert.equal(d.outcome, outcome, 'outcome');
  });
}

// ── each thing counted once ───────────────────────────────────────────────────
test('the score is the finishers against the whole cost: momentum is in the starts and nowhere else', () => {
  const base = { platform: plat('library'), genre: 'Comedy', budget: 10, draw: 12, hype: 0, crowd: 60, rating: 60, dice: 1 };
  for (const word of [45, 60, 75, 90]) {
    const d = ST.dropFilm({ ...base, word });
    near(d.score, d.finished28 / d.cost / ST.FILM.library.target, 0.02, `word ${word}: score`);
    near(d.finished28, d.views28 * d.completion, 0.15, `word ${word}: finished28`);
  }
  // The crowd moves who finishes it, never who starts it.
  const lo = ST.dropFilm({ ...base, word: 60, crowd: 40 }), hi = ST.dropFilm({ ...base, word: 60, crowd: 85 });
  assert.equal(lo.views28, hi.views28, 'the starts moved with completion');
  assert.ok(hi.finished28 > lo.finished28);
});
test('a Breakout needs a strong second week: a big Hit that did not keep finding people is a Hit', () => {
  const base = { platform: plat('global'), genre: 'Sci-Fi', budget: 60, draw: 46, hype: 60, crowd: 80, rating: 75, dice: 1.2 };
  const [held, faded] = withPlanValues(() => [ST.dropFilm({ ...base, word: 82 }), ST.dropFilm({ ...base, word: 74 })]);
  assert.ok(held.momentum >= ST.FILM_BREAKOUT_MOMENTUM && held.outcome === 'breakout', JSON.stringify(held));
  assert.ok(faded.score >= 1.4 && faded.views28 >= PLAN.global.breakout &&faded.momentum < ST.FILM_BREAKOUT_MOMENTUM, JSON.stringify(faded));
  assert.equal(faded.outcome, 'hit');
});
test("a film's completion lives in a film's band, and its first week is most of its life", () => {
  assert.equal(ST.filmCompletionFor(0), 0.40); assert.equal(ST.filmCompletionFor(100), 0.85);
  const shrug = ST.dropFilm({ platform: plat('library'), genre: 'Drama', budget: 8, draw: 10, word: 50, crowd: 50, dice: 1 });
  assert.ok(shrug.opening7 / shrug.views28 > 0.65, 'a film nobody talks about lives in its first week');
});
test('the fee is never added to the cost: the budget is all-in', () => {
  const d = ST.dropFilm({ platform: plat('global'), genre: 'Crime', budget: 100, draw: 30, word: 60, crowd: 60, dice: 1 });
  near(d.cost, 100 * (1 + ST.FILM.global.sell), 0.05, 'cost');
});

// ── a platform's film, played through the real systems ──────────────────────
const filmListing = (over = {}) => ({ id: 'cast-f1', via: 'casting', projectTitle: 'Night Ferry', role: 'Lead', tier: 'lead',
  type: 'Streaming Film', genre: 'Horror', scale: 'indie', episodes: 0, perEpisode: false, salary: 60000,
  months: 2, prestigeScore: 55, stability: 95, deadline: 3, payMarket: 'film_indie', platformId: 'plt-niche', budget: 3, needs: [], ...over });
function throughTheDrop(s, rating = 70) {
  const p = s.productions[0];
  const rel = scheduleRelease(s, { title: p.title, type: p.type, genre: p.genre, role: p.role, salary: p.salary, rating, status: 'Well-received', year: s.year, projectId: p.projectId }, p);
  s.productions = []; s.production = null;
  s.year = Math.floor(rel.due / 12); s.month = rel.due % 12; releaseTick(s);
  const opened = s.filmography[0];
  for (let n = 0; n < 40 && s.filmography[0].running; n++) { nextMonth(s); runTick(s); }
  return { p, rel, opened, credit: s.filmography[0] };
}
test("a platform's film is a streaming movie from the day it is taken: the film track, never the series track", () => {
  const s = career({ fame: 20 }); startProduction(s, filmListing());
  const pr = getProject(s, s.productions[0].projectId);
  assert.equal(pr.medium, 'streaming'); assert.equal(pr.format, 'movie'); assert.equal(pr.awardsTrack, 'film'); assert.equal(pr.distribution, 'drop');
  assert.equal(pr.platformId, 'plt-niche'); assert.ok(!pr.seriesId, 'a film is not a series');
});
test("a platform's film goes out on the platform, closes in four weeks, and is never a season", () => {
  const s = career({ fame: 20, peakFame: 20, bubbles: [] }); startProduction(s, filmListing());
  const market = JSON.stringify(s.market || null);
  const { rel, opened, credit } = throughTheDrop(s, 72);
  assert.ok(rel.wait >= 2, 'a film is finished like a film');
  assert.ok(opened.streaming && opened.weeksTotal === ST.FILM_WEEKS, 'four weeks: ' + opened.weeksTotal);
  assert.equal(credit.running, false);
  assert.ok(['miss', 'solid', 'hit', 'breakout'].includes(credit.verdict), credit.verdict);
  assert.equal(credit.boxOffice, 0, 'a box office'); assert.equal(credit.tv, false, 'a television face');
  assert.ok(credit.views28 > 0 && credit.completion >= 0.4 && credit.filmCost > 0 && credit.momentum > 0, JSON.stringify(credit));
  assert.ok(credit.seasonCost == null && !credit.renewal && !credit.nextCost, 'renewed like a season');
  assert.ok(!(s.offers || []).some((o) => o.kind === 'renewal' || o.season), 'a season offer');
  assert.equal((s.bubbles || []).length, 0, 'on the bubble');
  assert.equal(JSON.stringify(s.market || null), market, 'the cinema genre market was fed');
  assert.ok(!credit.worldHit && credit.status !== 'World Hit', 'a world hit');
  assert.equal(trackOfWork(s, credit), 'film');
  assert.ok(ASKER.eligible(s, credit) && !SERIES.eligible(s, credit), 'the wrong award');
});
test('a platform does not pay points: the paper says so on the line, with nothing to ask', () => {
  const s = career({ fame: 90, peakFame: 90 });
  for (const scale of ['indie', 'feature', 'blockbuster']) {
    const o = { ...filmListing({ scale, tier: 'lead', months: 5, salary: 8000000, payMarket: scale === 'indie' ? 'film_indie' : 'film_studio', platformId: 'plt-global' }), id: 'off-' + scale };
    const k = draftContract(s, o);
    const ids = k.clauses.map((c) => c.id);
    assert.ok(!ids.includes('backend') && !ids.includes('merch') && !ids.includes('points'), scale + ': ' + ids.join(','));
    const b = k.clauses.find((c) => c.id === 'buyout');
    assert.ok(b && b.options.length === 0 && /up front/.test(b.text), scale + ': no buyout line');
    assert.ok(ids.includes('fee') && ids.includes('exclusive'), scale + ': the rest of the paper went with it');
  }
});
test('the campaign is the one you know; the platform pays for it when it backs the film', () => {
  const s = career(); ST.streamingOf(s);
  const film = (platformId, rating) => ({ title: 'X', streaming: true, scale: 'feature', platformId, rating });
  assert.equal(campaignKind(film('plt-prestige', 74)), 'studio'); assert.equal(campaignKind(film('plt-prestige', 66)), 'own');
  assert.equal(campaignKind(film('plt-global', 78)), 'own'); assert.equal(campaignKind(film('plt-global', 84)), 'studio');
  assert.equal(campaignKind(film('plt-library', 95)), 'own');
  assert.equal(campaignBacker(s, film('plt-prestige', 74)), ST.platformOfKind(s, 'prestige').name);
  assert.equal(campaignKind({ title: 'Y', scale: 'feature', rating: 60 }), 'studio', 'a studio picture still backed');
});

// ── the festival's two buyers (plan §7) ──────────────────────────────────────
const festListing = (over = {}) => ({ id: 'cast-fest', via: 'casting', projectTitle: 'Low Tide', role: 'Lead', tier: 'lead',
  type: 'Festival Film', genre: 'Horror', scale: 'festival', episodes: 0, perEpisode: false, salary: 30000,
  months: 2, prestigeScore: 60, stability: 95, deadline: 3, payMarket: 'film_indie', budget: 2, needs: [], ...over });
function toTheFestival(s, rating = 78) {
  const p = s.productions[0];
  const rel = scheduleRelease(s, { title: p.title, type: p.type, genre: p.genre, role: p.role, salary: p.salary, rating, status: 'Well-received', year: s.year, projectId: p.projectId }, p);
  s.productions = []; s.production = null;
  s.year = Math.floor(rel.due / 12); s.month = rel.due % 12;
  fixedDice(() => releaseTick(s), 0);   // the jury and the buyers say yes
  return rel;
}
test('two buyers: the release waits for the player, the letter says what each road does, the platform road is one film', () => {
  const s = career({ fame: 20, peakFame: 20, inbox: [] }); startProduction(s, festListing());
  const before = s.filmography.length;
  const rel = toTheFestival(s);
  assert.equal(s.filmography.length, before, 'it opened before anybody chose');
  assert.ok(rel.awaitingBuyer && rel.bidder === 'plt-niche' && s.releases.includes(rel), 'not held');
  emailTick(s);
  const m = s.inbox.find((x) => x.tag === 'fest' && x.releaseId === rel.id);
  assert.ok(m && m.cta.length === 2 && m.cta[0].fest === 'cinema' && m.cta[1].fest === 'platform', 'no letter');
  assert.ok(/box office/.test(m.body) && /next month/.test(m.body), 'the letter does not say what happens');
  answerFestMail(s, m.id, 1);
  assert.equal(rel.buyer, 'platform');
  nextMonth(s); releaseTick(s);
  const mine = s.filmography.filter((c) => c.title === 'Low Tide');
  assert.equal(mine.length, 1, 'one film, one credit');
  assert.ok(mine[0].streaming && mine[0].platformId === 'plt-niche' && mine[0].festival, JSON.stringify(mine[0]));
  const pr = getProject(s, rel.projectId);
  assert.ok(pr.medium === 'streaming' && pr.platformId === 'plt-niche' && pr.awardsTrack === 'festival', JSON.stringify(pr));
  assert.ok(!s.releases.some((r) => r.id === rel.id), 'released twice');
});
test('no answer: the producers take the distributor, as the letter said, and it opens in cinemas', () => {
  const s = career({ fame: 20, peakFame: 20, inbox: [] }); startProduction(s, festListing({ id: 'cast-fest2', projectTitle: 'High Water' }));
  const rel = toTheFestival(s);
  nextMonth(s); releaseTick(s);
  const mine = s.filmography.filter((c) => c.title === 'High Water');
  assert.equal(mine.length, 1); assert.ok(!mine[0].streaming && rel.buyer === 'cinema', JSON.stringify(mine[0]));
});
test('with streaming off a festival picture goes out exactly as it did', () => {
  ST.setStreamingPool(false);
  try {
    const s = career({ fame: 20, peakFame: 20, inbox: [] }); startProduction(s, festListing({ id: 'cast-fest3', projectTitle: 'Dry Land' }));
    const rel = toTheFestival(s);
    assert.ok(!rel.awaitingBuyer && s.filmography.some((c) => c.title === 'Dry Land' && !c.streaming), 'held with streaming off');
  } finally { ST.setStreamingPool(true); }
});
test('a later sale answers to the film, the fit, the name and how it failed to sell — and never makes a second credit', () => {
  assert.equal(ST.laterSaleOdds({ genre: 'Horror', rating: 50 }).odds, 0, 'a film rated 5.0');
  const good = ST.laterSaleOdds({ genre: 'Horror', rating: 78, leadFame: 30 });
  assert.equal(good.archetype, 'niche');
  assert.ok(ST.laterSaleOdds({ genre: 'Drama', rating: 78 }).odds < good.odds, 'the fit');
  const mid = ST.laterSaleOdds({ genre: 'Horror', rating: 70 });   // under the 40% ceiling, so the history shows
  assert.ok(ST.laterSaleOdds({ genre: 'Horror', rating: 70, push: 'agent' }).odds < mid.odds, 'the buyers already passed');
  assert.ok(ST.laterSaleOdds({ genre: 'Horror', rating: 70, push: 'went' }).odds > mid.odds, 'they met you');
  assert.ok(ST.laterSaleOdds({ genre: 'Horror', rating: 70, leadFame: 40 }).odds > mid.odds, 'the name');
  assert.ok(ST.laterSaleOdds({ genre: 'Horror', rating: 66 }).odds < ST.laterSaleOdds({ genre: 'Horror', rating: 78 }).odds, 'the quality');
  // Played: unsold on the night, bought months later, one credit.
  const s = career({ fame: 20, peakFame: 20, inbox: [] }); startProduction(s, festListing({ id: 'cast-fest4', projectTitle: 'Salt Marsh' }));
  const p = s.productions[0];
  const rel = scheduleRelease(s, { title: p.title, type: p.type, genre: p.genre, role: p.role, salary: p.salary, rating: 78, status: 'Well-received', year: s.year, projectId: p.projectId }, p);
  s.productions = []; s.year = Math.floor(rel.due / 12); s.month = rel.due % 12;
  fixedDice(() => releaseTick(s), 0.999);   // no prize, no buyer, no later sale rolled on the night
  assert.equal(s.filmography[0].verdict, 'unsold');
  const sale = fixedDice(() => rollLaterSale(s, rel, rel.fest), 0);
  assert.ok(sale && sale.platformId === 'plt-niche');
  s.year = Math.floor(sale.due / 12); s.month = sale.due % 12; releaseTick(s);
  const mine = s.filmography.filter((c) => c.title === 'Salt Marsh');
  assert.equal(mine.length, 1, 'two credits');
  assert.ok(mine[0].streaming && mine[0].running && mine[0].festival && mine[0].festival.result === 'unsold', JSON.stringify(mine[0]));
});

// ── the platform's sequel ─────────────────────────────────────────────────────
test("a platform's second film: on the outcome, through laterOffers, the same platform, a franchise not a season", () => {
  const s = career({ fame: 60, laterOffers: [] }); ST.streamingOf(s);
  const job = { title: 'Dark Orbit', type: 'Streaming Film', role: 'Lead', tier: 'lead', genre: 'Sci-Fi', scale: 'feature', salary: 5000000, months: 4, budget: 90, part: 1, projectId: null };
  const st = { opening7: 30, views28: 80, completion: 0.7, cost: 99, platformId: 'plt-global' };
  const line = fixedDice(() => platformFilmSequel(s, { verdict: 'breakout' }, job, st), 0);
  assert.ok(/second one/.test(line), line);
  const x = s.laterOffers[0];
  assert.ok(x && x.offer.kind === 'sequel' && x.offer.platformId === 'plt-global' && x.offer.part === 2 && x.offer.budget > 90, JSON.stringify(x));
  const pr = adoptProject(s, x.offer, 'seq');
  assert.ok(pr.medium === 'streaming' && pr.format === 'movie' && !pr.seriesId, JSON.stringify(pr));
  s.laterOffers = [];
  fixedDice(() => platformFilmSequel(s, { verdict: 'breakout' }, { ...job, tier: 'supporting' }, st), 0);
  fixedDice(() => platformFilmSequel(s, { verdict: 'hit' }, job, { ...st, platformId: 'plt-prestige' }), 0);
  assert.equal(s.laterOffers.length, 0, 'a supporting part, or the premium service, made a sequel');
});

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
