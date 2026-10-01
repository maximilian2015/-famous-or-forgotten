import { count } from '../../engine/text.js';
import { uid } from '../../engine/id.js';
// Nothing you shoot comes out the day you finish shooting. A film wraps, sits in post
// for months, and then opens — and THAT is the day you find out what you made.
//
// Two numbers come back, and they are not the same number:
//   · the score, out of ten, which is what people thought of it
//   · the box office, which is what people paid for it
// A film can be adored and lose money, or panned and take a billion. They pull your
// career in different directions, and that is the whole point of having both.
import { rint, chance, pick } from '../../engine/rng.js';
import { setQuote, setFame, setRespect, quoteFor } from '../meta/status.js';
import { newTitle } from '../world/titles.js';
import { addTimeline, showMoment } from '../../engine/timeline.js';
import { regardAfterWorking } from '../life/regard.js';
import { markReleased } from '../../engine/economy.js';
import { hotGenre, GENRES } from '../meta/news.js';
import { appetiteFor, marketAfterRelease } from '../meta/market.js';
import { maybeContinue } from './franchise.js';
import { appealShift } from './story.js';
import { dirAppeal, remindLift, holdFactor, retentionLine } from './chapter.js';
import { comebackFloor } from '../meta/standing.js';
import { paid } from './agent.js';
import { reviewsFor } from '../world/critics.js';
import { actorById, applyFilmToActor } from '../world/world.js';
import { tourMultiplier, tourFame } from './tour.js';
import { networkLine, slotNorm } from './franchise.js';
import { typecastAfterCredit, typeFit } from '../meta/typecast.js';
import { storyAfterCredit } from '../meta/stories.js';
import { addHype, flopHype, hype, hypeSource } from '../meta/hype.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

// How long a thing sits between the last day of shooting and opening night.
const POST_MONTHS = {
  oneoff: [1, 2], small: [2, 4], indie: [4, 8], festival: [3, 7], episode: [2, 5],
  recurring: [2, 4], prestige: [4, 7], feature: [5, 9], blockbuster: [7, 12],
};
export function postProduction(scale) {
  const span = POST_MONTHS[scale] || [3, 6];
  return rint(span[0], span[1]);
}

// Everything commercial is measured against the budget, because that is the only number
// the industry compares anything to. A picture is not "big" — it is big AGAINST its cost.
const BUDGET = { small: 1, festival: 1.5, indie: 12, feature: 90, blockbuster: 220 };   // millions
// Television does not sell tickets. It has an audience, in millions per episode.
const VIEWERS = { episode: [0.4, 6], recurring: [1, 9], prestige: [2, 14] };

// A good film sells more than a bad one, and the gap is enormous. That used to be a single curve
// — qualityPull — applied to the whole gross, which amounted to saying that how good a film is
// decides how many people turn up on the first weekend. Nobody has seen it on the first weekend.
// The same truth now lives in legsFor, where it belongs: quality decides how LONG a run lasts.
// Television, which is a different thing entirely. Maxi: "in life, does something rated
// 6.5 get six million watching, or fewer?" Six million is exactly right — and the question
// found that this used to run off the cinema curve, swinging the audience by a factor of
// NINE on the critics’ score alone. That is a game’s assumption, not a fact. Watching a
// series is a habit rather than a purchase: a crime procedural nobody reviews kindly
// out-draws a prestige drama with a nine, most weeks, because it is a crime procedural.
// Quality moves the number here. It does not decide it.
function watchPull(rating) {
  if (rating >= 90) return 1.35;
  if (rating >= 80) return 1.20;
  if (rating >= 70) return 1.08;
  if (rating >= 60) return 1.00;
  if (rating >= 45) return 0.88;
  return 0.72;
}
// Not everything good is commercial. A prestige drama and a horror picture with the same
// score do not do the same business, and that is the whole reason the score and the money
// are two separate numbers rather than one number written twice.
const APPEAL = {
  Horror: 1.35, 'Sci-Fi': 1.25, Comedy: 1.1, Thriller: 1.05, Crime: 0.95,
  Musical: 0.85, Romance: 0.8, Drama: 0.7,
};
// Opening weekend is a coin toss with a heavy coin. Triangular, so the extremes are
// rare rather than routine — most films land near what they deserved.
// An outside reading: a film’s result should be mostly the sum of what already happened in
// the game, with luck worth ten or twenty per cent rather than half the answer. Measured,
// this was worth eighty-two per cent between a bad roll and a good one — and the rating that
// feeds it is ALREADY randomised upstream, by rint(-16, 12) plus the stability swings. The
// variance was being applied twice and the second one was the bigger.
//
// So: narrow in the middle, where most films land, and a rare genuine surprise in either
// direction — which is also closer to the truth than a wide even spread. Most pictures open
// roughly where everybody expected. The breakout and the catastrophe are the exceptions, and
// they are exceptional because they are rare.
// The outlier is gone with it, and deliberately. A one-in-eighteen die that multiplied the whole
// result by 1.5 was how this model used to produce a surprise hit, and a surprise that arrives
// by die is not a story — nobody can point at what caused it. A sleeper now comes out of the
// crowd liking it and the distributor adding screens, which is both the truth and legible.

// Ten years on, the picture that sank is the one they screen at midnight. Once a year, for
// a film of yours that failed a decade ago — a small one, mostly — a small chance it comes
// back as a cult classic: a t-shirt, a quote everybody knows, and the standing that goes
// with having been in it. Maxi's list: "shot a trash film → ten years later a cult classic".
export function cultTick(s) {
  const y = s.year || 0;
  const cands = (s.filmography || []).filter((c) => !c.minor && !c.cult && isFilm(c.scale || 'indie') && (c.rating || 0) < 55 && (c.verdict === 'bomb' || c.verdict === 'broke even' || !c.verdict) && y - (c.year || 0) >= 8 && y - (c.year || 0) <= 16);
  if (!cands.length) return s;
  const c = pick(cands);
  const odds = c.scale === 'blockbuster' ? 2 : /Horror|Sci-Fi|Musical/.test(c.genre || '') ? 10 : 6;
  if (!chance(odds)) return s;
  c.cult = y;
  setRespect(s, (s.respect || 0) + 4);
  addHype(s, 35, 'hit');
  addTimeline(s, `Ten years on, "${c.title}" is a cult classic. Midnight screenings, a t-shirt, and a line of yours everybody can quote.`);
  s.lastEvent = `"${c.title}" — the one that sank — is a cult classic now. Somebody screens it at midnight, somebody made a t-shirt, and a line of yours is a thing people say. Nobody saw it coming, least of all the people who made it.`;
  return s;
}
export function isFilm(scale) { return ['small', 'indie', 'festival', 'feature', 'blockbuster'].includes(scale); }

// ── what a picture takes, in four stages ──────────────────────────────────────
//
// This used to be one line: budget × 2.25 × a steep quality curve × genre × star × trend ×
// luck. Which made the BUDGET the answer. A blockbuster took about twenty times what an indie
// took because it cost about twenty times as much, and the only things that could move it were
// how good the film was and a die roll.
//
// Four stages instead, each one a question somebody in this business actually asks:
//
//   1. DEMAND   — how many people want to see it before anybody HAS. No quality in it at all,
//                 because nobody has seen the film. Who is on the poster, what was spent
//                 selling it, what genre it is this year, whether they know the franchise,
//                 and what is being said about you this month.
//   2. OPENING  — demand raised to a power, because the top of this market is winner-take-most,
//                 times how wide it can physically go, times the date, times whoever opened
//                 against you.
//   3. THE WORD — two things, not one. How long the run lasts, which is mostly the crowd and
//                 barely the column; and, for a small release, whether the screen count GROWS.
//                 Every sleeper in the history of cinema came out of the second one.
//   4. RESULT   — against what it cost to make AND to sell, which is the only sum the trades
//                 ever mean by asking whether it worked.
//
// The budget is not a multiplier anywhere now. It buys screens, and it raises the bar. Measured
// over five thousand simulated pictures: eighteen times the budget still buys about sixteen
// times the gross, because a wide release genuinely does take more — but the VERDICT gets
// WORSE, not better. The identical picture at €12m is profitable 38% of the time; at €220m it
// scrapes break-even 88% of the time. Money buys the gross and buys the bar faster.

// P&A as a share of the negative, which is how it is really decided. Nobody spends more than
// about three quarters of the budget again on selling it.
export const CAMPAIGN = {
  minimal: { id: 'minimal', label: 'Barely a campaign', share: 0.15, word: 'almost nothing' },
  standard: { id: 'standard', label: 'A normal campaign', share: 0.35, word: 'the usual' },
  major: { id: 'major', label: 'A real campaign', share: 0.55, word: 'properly sold' },
  event: { id: 'event', label: 'Sold as an event', share: 0.75, word: 'everywhere you look' },
};
// Who decides: the studio, by what the picture is. A player’s hand on this dial is its own
// feature and the data is ready for it — rel.campaignTier is only ever a string.
export function studioCampaign(scale) {
  if (scale === 'blockbuster') return chance(70) ? 'event' : 'major';
  if (scale === 'feature') return chance(55) ? 'major' : 'standard';
  if (scale === 'indie' || scale === 'prestige') return chance(65) ? 'standard' : 'minimal';
  return 'minimal';
}
export function campaignOf(rel) { return CAMPAIGN[rel && rel.campaignTier] || CAMPAIGN.standard; }
export function campaignSpend(rel) { return (BUDGET[rel.scale] || 0) * campaignOf(rel).share; }
// What it has to clear. The trades’ own rule: worldwide takes about two and a half times the
// negative before anybody sees a profit, because the cinema keeps roughly half of every ticket.
// This is the number that replaces comparing the gross to the bare budget.
export function breakEvenFor(rel) {
  const b = BUDGET[rel.scale] || 0;
  if (!b) return 0;
  return Math.round((b + b * campaignOf(rel).share) * 1.5 * 1000000);
}

// How wide it can physically go. THIS is what the budget buys instead of buying tickets, and
// the real gap between a platform release and a global day-and-date is enormous.
const SCREENS = { small: 0.012, festival: 0.02, indie: 0.09, prestige: 0.12, feature: 0.55, blockbuster: 0.78 };
const isPlatform = (scale) => (SCREENS[scale] ?? 0.09) < 0.2;
// There is no studio entity in this game, so distribution muscle is read off what the picture
// is — which is most of what it would say anyway. Named honestly as a stand-in.
// Spread wide on purpose. A uniform lift here raised every picture equally, which is the opposite
// of the point: what matters is the DIFFERENCE. A tentpole arrives with a studio behind it and is
// barely about whoever is leading it; a small film has none of that and is almost entirely its
// cast and what people say. The gap between the two ends is the whole content of this table.
const MUSCLE = { blockbuster: 86, feature: 52, prestige: 30, indie: 20, festival: 12, small: 10 };

// Diminishing twice over. Between the names on the poster, because the second one is worth
// about half the first and the fourth is worth almost nothing. And WITHIN a name, because the
// one thing everybody in this business already knows about star power is that the difference
// between famous and very famous sells almost no extra tickets: fifty to eighty is worth a
// great deal, eighty to ninety-seven is worth very little and costs a fortune.
const DRAW_W = [1, 0.55, 0.25, 0.12];
export function castDraw(names) {
  return (names || []).filter((n) => n > 0).sort((x, y) => y - x)
    .reduce((n, f, i) => n + Math.pow(f, 0.82) * (DRAW_W[i] ?? 0.05), 0);
}

// ── 1. DEMAND ─────────────────────────────────────────────────────────────────
// Quality is deliberately absent. Nobody has seen the film. If anything in here moved with how
// good it is, the model would be lying about what an opening weekend measures.
export function demandFor(s, rel) {
  let d = 6;
  d += castDraw([s.fame || 0, rel.withFame || 0]) * 0.52;          // who is on the poster
  // What is being said this month — and the existing rule that scandal is not the kind of
  // talk that sells a ticket is kept, because it is right. See meta/hype.js hypeReach.
  d += (hypeSource(s) === 'scandal' ? 0 : hype(s)) * 0.28;
  d += Math.min(26, Math.sqrt(Math.max(0, campaignSpend(rel))) * 2.1);   // the campaign
  // Weighted heavily on purpose, because this is the one thing the old formula had no room for
  // at all: the bigger the picture, the LESS of it is the actor. Nobody buys a ticket to a
  // tentpole for whoever is third on the poster - the franchise, the studio and the campaign sell
  // it. Measured at a tenth, a €220m picture rated 9.2 fronted by somebody at forty points of
  // fame came out exactly level, which says the lead carries a tentpole. They do not.
  d += (MUSCLE[rel.scale] ?? 40) * 0.22;                           // distribution muscle
  // The genre, as a market with a memory rather than a calendar. See meta/market.js.
  d += (appetiteFor(s, rel.genre) - 1) * 28;
  // And the kind of film it is, which is not the same question: horror is structurally cheap
  // and popular whatever the fashion is doing. APPEAL has always said that and still does.
  d *= 0.45 + ((APPEAL[rel.genre] || 1) * 0.55);
  // Familiarity, and then fatigue — and a good last one buys the fatigue back. A fourth
  // instalment nobody liked is a harder sell than a first nobody has heard of.
  const part = rel.part || 1;
  if (part > 1) {
    const fam = [0, 0, 16, 19, 19, 16, 13][Math.min(6, part)] ?? 11;
    const tired = [0, 0, 0, 4, 10, 18, 26][Math.min(6, part)] ?? 30;
    const last = rel.lastRating ?? 65;
    d += fam - tired * (last >= 75 ? 0.25 : last >= 60 ? 0.6 : 1.2);
  }
  // The press tour and anything bought to remind people it exists both belong HERE and not on
  // the final total. A digital campaign says so in its own blurb: the first night is enormous
  // and the people it brings are the people who leave first. See career/chapter.js REMINDERS.
  d *= tourMultiplier(rel) * remindLift(rel);
  // A festival prize or a buyer is the only thing that makes anybody aware of a small picture.
  d *= 0.55 + (rel.appealMod ?? 1) * 0.45;
  // No ceiling. Demand is an index, not a percentage: an event picture with a star, a genre on
  // the rise and a campaign behind it reaches 110, and a tentpole nobody asked for sits at 70.
  return Math.max(2, Math.round(d));
}

// ── 2. OPENING ────────────────────────────────────────────────────────────────
export function openingFor(s, rel, demand) {
  const wide = SCREENS[rel.scale] ?? 0.09;
  // Superlinear, because the gap between seventy and ninety matters far more than the gap
  // between twenty and forty. The top of this market is winner-take-most and always was.
  const base = Math.pow(Math.max(2, demand), 1.45) * 0.46 * wide;
  if (rel._window == null) rel._window = windowFor(s.month || 0);
  if (rel._against == null) rel._against = againstYou(rel.scale);
  return base * rel._window * rel._against * (0.9 + Math.random() * 0.2);
}

// ── 3a. THE RUN ───────────────────────────────────────────────────────────────
// How long it lasts, and it is almost entirely the crowd. A tentpole the audience dislikes
// finishes at twice its opening; one they love finishes at five. The column moves this a little
// and moves it most for the small ones, where a review is still how anybody hears of it.
export function wordFor(rel) {
  const crowd = rel.reception != null ? rel.reception : (rel.rating || 50);
  return crowd * 0.6 + (rel.rating || 50) * 0.4;
}
export function legsFor(rel) {
  const w = wordFor(rel);
  // Continuous: 1.8x for something nobody enjoyed, about 3.5x for a picture people like, and
  // five and a half for one they carry. Those are the real multiples of a worldwide opening.
  let m = 1.75 + Math.pow(Math.max(0, w - 35) / 60, 1.5) * 3.5;
  // Frontloading, which is a mechanism and not a punishment: everybody who was ever going to
  // see a bad blockbuster goes on the first weekend, and then it falls off a cliff.
  if (!isPlatform(rel.scale) && w < 60) m *= 0.78;
  return Math.max(1.35, m * (0.92 + Math.random() * 0.16));
}

// ── 3b. THE EXPANSION ─────────────────────────────────────────────────────────
// The stage that was missing, and the whole reason a sleeper can exist. A small release can get
// WIDER: the distributor watches the per-screen average and adds screens week after week. Not a
// lucky die — a thing the crowd earned. "My Big Fat Greek Wedding" opened on a hundred screens
// and finished on two thousand, and no multiplier on a fixed release could ever produce that.
export function expansionFor(rel) {
  if (!isPlatform(rel.scale)) return 1;
  const crowd = rel.reception != null ? rel.reception : (rel.rating || 50);
  // Weighted towards the reviews on purpose, and only here. A platform release widens on what
  // is written about it and on a self-selected audience telling each other, not on how broad
  // its appeal was to people who were never going to go.
  const word = crowd * 0.35 + (rel.rating || 50) * 0.65;
  if (word <= 65) return 1;                      // it closes where it opened
  // Continuous, because a step meant a film on 66 and a film on 71 had nothing in common.
  const grow = 1 + Math.pow((word - 65) / 7.5, 1.9) * (0.8 + Math.random() * 0.5);
  // And a hard ceiling, which is the thing that was missing from the ceiling-less version and
  // the reason a twelve-million picture was reaching a billion in testing. There are only so
  // many cinemas: however beloved it is, a platform release widens to about the breadth of an
  // ordinary wide release and stops. That is still an enormous result.
  return Math.min(grow, 0.36 / (SCREENS[rel.scale] ?? 0.09));
}

// The commercial result, for anybody. Your films and the ones the rest of the world makes in
// the same year sit on the same list, so they are priced by the same arithmetic — the world
// simply has fewer things to say about its own pictures, so it takes the defaults.
export function grossFor({ scale, rating, genre, fame = 0, trend = 1, appealMod = 1, crowd = null, campaignTier = null }) {
  if (!BUDGET[scale]) return 0;
  const rel = { scale, genre, rating, reception: crowd != null ? crowd : rating,
    appealMod, part: 1, campaignTier: campaignTier || studioCampaign(scale) };
  // A world film has no hype, no tour and nobody else on the poster; its genre appetite
  // arrives as a number from the caller, who has the market in hand.
  let d = 6;
  d += castDraw([fame]) * 0.52;
  d += Math.min(26, Math.sqrt(Math.max(0, campaignSpend(rel))) * 2.1);
  d += (MUSCLE[scale] ?? 40) * 0.22;
  d += ((Number.isFinite(trend) ? trend : 1) - 1) * 28;
  d *= 0.45 + ((APPEAL[genre] || 1) * 0.55);
  d *= 0.55 + (appealMod ?? 1) * 0.45;
  const demand = Math.max(2, Math.round(d));
  const wide = SCREENS[scale] ?? 0.09;
  const opening = Math.pow(demand, 1.45) * 0.46 * wide
    * windowFor(rint(0, 11)) * againstYou(scale) * (0.9 + Math.random() * 0.2);
  return Math.round(opening * legsFor(rel) * expansionFor(rel) * 1000000);
}
// ── what the room thought ─────────────────────────────────────────────────────
// Maxi: "not every film should be a success — it depends on you, the script, the shoot,
// and how the audience takes it, like life. We can bring that in too."
//
// The first three were already in (production.js: your craft, the material, the set, the
// stability, the argument you won on day one). The fourth was not. There was an audience
// number, and it was 4 + rating/25 — a squashed copy of the critics that never left the
// band 5.6 to 7.8. So the thing everybody in this business actually lives with could not
// happen: the picture the critics buried and the country went to see, and the one that
// swept the season and nobody bought a ticket for.
//
// The crowd and the column want different films, and they are only asked about the same
// one. What they agree about is the middle — a competent picture is fine by everybody —
// and they come apart at both ends.
const CROWD = { Horror: 9, Comedy: 8, 'Sci-Fi': 6, Thriller: 4, Crime: 0, Romance: 0, Musical: -3, Drama: -7 };
const CROWD_SCALE = { blockbuster: 9, feature: 3, recurring: 2, episode: 0, small: -3, indie: -6, prestige: -6, festival: -11 };
export function audienceFor(s, rel) {
  const r = rel.rating || 0;
  // Half of the critics' opinion, flattened: they are kinder to a bad film and colder
  // about a masterpiece, because they paid for a Friday night either way.
  let v = 46 + (r - 50) * 0.55;
  v += CROWD[rel.genre] ?? 0;
  v += CROWD_SCALE[rel.scale] ?? 0;
  // They came for you, and for whoever is on the poster with you.
  v += Math.min(11, Math.max(s.fame || 0, (rel.withFame || 0) * 0.9) / 9);
  // The version you argued for on day one is the whole trade, said plainly (story.js).
  if (rel.take === 'bigger') v += 10;
  if (rel.take === 'about') v -= 9;
  if (rel.take === 'strange') v += rint(-18, 18);
  // A season they have been with for years is a habit; they are gentle with it.
  if ((rel.season || 0) > 2) v += 4;
  // ── did they buy you in it ───────────────────────────────────────────────────
  // The crowd decides this AFTER watching, which is why it lands here on the reception and
  // nowhere near the opening weekend. A comedian in a grim drama opens fine on his name and
  // dies in the second week, and the columns may well call it brave — both of those are real,
  // and only a number that moves the run and not the opening can produce either.
  //
  // Measured, the same star in the same film at five levels of fit: the opening moved from
  // €86m to €99m and the run moved from 2.1x to 3.8x, so the final went €180m to €376m.
  //
  // This reads typeFit, which already exists and already knows your labels (meta/typecast.js).
  // It answers a different question there — whether anybody will CAST you — and reusing the
  // number is the point. A second table of what suits you would be a second answer to the
  // same question, and the two would drift apart within a month.
  v += typeFit(s, rel) * 7;
  // And a script shot as something it is not is a worse film than the script was. The story
  // room lets you argue a picture into another genre (career/story.js aim) — this is the bill.
  if (rel.scriptGenre && rel.scriptGenre !== rel.genre) {
    const near = { Horror: 'Thriller', Thriller: 'Horror', Crime: 'Thriller', Drama: 'Romance',
      Romance: 'Drama', Comedy: 'Romance', 'Sci-Fi': 'Thriller', Musical: 'Romance' };
    v *= near[rel.scriptGenre] === rel.genre ? 0.93 : 0.8;
  }
  return clamp(Math.round(v + rint(-9, 9)));
}
// When the two of them have seen different films, and which way round.
export const SPLIT_AT = 18;
export function splitLine(rating, audience) {
  // A credit from before the room had its own opinion has no number, and "audience || 0"
  // turned that into a forty-nine point gap: a bomb rated 4.9 was announced on the night
  // as "the reviews are the best of your career".
  if (audience == null || !Number.isFinite(audience)) return null;
  const d = Math.round(audience - (rating || 0));
  if (Math.abs(d) < SPLIT_AT) return null;
  return d > 0
    ? 'The reviews were not kind and nobody told the audience. They went anyway, and they are telling each other to go.'
    : 'The reviews are the best of your career and the people who bought a ticket came out looking at their phones.';
}

// ── when it opens, and what opened against it ─────────────────────────────────
// The one thing an outside reading listed that genuinely was not here. A picture does not
// open into a vacuum: the month decides how many people were going to the cinema at all,
// and once in a while something enormous opens the same weekend and takes the room with it.
//
// The months are the real shape of a cinema year. Summer and the back half of December are
// when everybody goes; January and September are where films are sent to be forgotten, and
// everybody in the business knows it when the date is announced.
const WINDOW = [0.82, 0.88, 0.96, 1.0, 1.08, 1.18, 1.2, 1.14, 0.84, 0.94, 1.06, 1.22];
export function windowFor(month) { return WINDOW[((month % 12) + 12) % 12] || 1; }
export function windowWord(month) {
  const w = windowFor(month);
  return w >= 1.15 ? 'the best weekend of the year to open' : w >= 1.04 ? 'a good date'
    : w >= 0.95 ? 'an ordinary date' : w >= 0.86 ? 'a quiet month' : 'the month they send things to die';
}
// And somebody else opening on top of you, which is nobody’s fault and costs you the same.
export function againstYou(scale) {
  // A small picture has the room to itself; a blockbuster is opening into a fight it did
  // not pick, because everything that size lands on the same four weekends.
  const odds = scale === 'blockbuster' ? 26 : scale === 'feature' ? 16 : 7;
  return chance(odds) ? 0.74 + Math.random() * 0.14 : 1;
}

export function boxOfficeFor(s, rel) {
  // Every stage is kept on the release, because a number with no account of itself is not
  // information. The screen can say what opened it, what carried it, and what killed it.
  if (rel.campaignTier == null) rel.campaignTier = studioCampaign(rel.scale);
  if (rel.lastRating == null) rel.lastRating = previousRating(s, rel);
  rel._demand = demandFor(s, rel);
  rel._opening = openingFor(s, rel, rel._demand);
  rel._legs = legsFor(rel);
  rel._expansion = expansionFor(rel);
  rel._breakEven = breakEvenFor(rel);
  return Math.round(rel._opening * rel._legs * rel._expansion * 1000000);
}
// What the numbers were, said in words, for the night it closes.
export function runStory(rel) {
  if (!rel || !isFilm(rel.scale)) return null;
  const out = [];
  if (rel._expansion > 1.6) out.push(`It opened small and they kept adding screens — it finished ${rel._expansion.toFixed(1)} times wider than it started.`);
  if (rel._legs != null && rel._legs <= 1.9) out.push('Everybody who was ever going to see it went on the first weekend.');
  if (rel._legs != null && rel._legs >= 4.2) out.push('It held for months. People were taking other people.');
  if (rel._against != null && rel._against < 1) out.push('Something enormous opened against it, which was nobody\u2019s fault and cost the same.');
  return out.length ? out.join(' ') : null;
}
export function viewersFor(s, rel) {
  const span = VIEWERS[rel.scale] || VIEWERS.episode;
  const star = 0.8 + (s.fame || 0) / 250;
  // A show that is coming back already HAS an audience. Rolling a fresh number every season
  // meant a season rated 7.2 drew 8.9m, the next one rated 9.1 drew 3m and the one after
  // that drew 18m — the same programme, on the same night, with no explanation. An audience
  // is inherited and then it moves: a better season brings people, a worse one loses them.
  // A show you joined in its eighth year had an audience before you arrived — the number on
  // the listing (castings.js showAudience). Your season moves it, the same as any other.
  const prev = previousAudience(s, rel) ?? (rel.audience > 0 ? rel.audience : null);
  if (prev != null) {
    const move = rel.rating >= 85 ? 1.16 + Math.random() * 0.2
      : rel.rating >= 72 ? 1.02 + Math.random() * 0.12
      : rel.rating >= 60 ? 0.9 + Math.random() * 0.12
      : 0.68 + Math.random() * 0.16;
    return Math.round(Math.max(0.2, prev * move) * 10) / 10;
  }
  // What this KIND of thing draws, which is most of it. A soap has a soap audience and a
  // prestige series has a prestige one, whatever the column says about either. The scale
  // span is the fallback for anything with no slot of its own. franchise.js SLOT_NORM
  const norm = slotNorm(rel.type);
  const base = norm > 0
    ? norm * (0.55 + Math.random() * 1.35)
    : span[0] + Math.random() * (span[1] - span[0]);
  return Math.round(base * watchPull(rel.rating) * star * 10) / 10;
}
// What the season before this one drew, if there was one.
function previousAudience(s, rel) {
  if (!rel.season || rel.season < 2) return null;
  const root = String(rel.title || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();
  const prev = [...(s.filmography || []), ...(s.discography || [])]
    .find((c) => c.season === rel.season - 1
      && String(c.title || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim() === root);
  // What the last season finished on is what this one starts from: the people still
  // watching in week ten are the people who come back in September.
  return prev ? (prev.endViewers > 0 ? prev.endViewers : (prev.viewers > 0 ? prev.viewers : null)) : null;
}

// What the last instalment was like, which is what decides whether anybody is tired of this.
// Found the same way previousAudience finds last season: by the title with the part stripped
// off, because nothing on the production carries a pointer back to the picture before it.
export function previousRating(s, rel) {
  if (!rel || (rel.part || 1) < 2) return null;
  const root = String(rel.title || '').replace(/(\s*(?:·|:)?\s*part\s+\d+)+\s*$/i, '').trim();
  if (!root) return null;
  const prev = (s.filmography || []).filter((c) => (c.part || 1) === (rel.part || 1) - 1
    && String(c.title || '').replace(/(\s*(?:·|:)?\s*part\s+\d+)+\s*$/i, '').trim() === root);
  return prev.length ? (prev[prev.length - 1].rating ?? null) : null;
}

// Did it make its money back? This is what the industry actually remembers.
export function budgetFor(rel) { return Math.round((BUDGET[rel.scale] || 0) * 1000000); }
export function verdictOf(rel) {
  if (!isFilm(rel.scale)) {
    // Television is judged on how many turned up, not on the column. Maxi: "thirty-seven
    // million are watching a hit, and the game is calling it ignored." Quite. A procedural
    // nobody reviews kindly and everybody watches is the most-seen thing on television, and
    // "ignored" should mean what the word means: nobody was there.
    const drew = rel.endViewers || rel.viewers || 0;
    // Before the run has finished there is no audience yet, so the score stands in for it.
    if (!drew) return rel.rating >= 78 ? 'watched' : rel.rating >= 55 ? 'seen' : 'ignored';
    const pull = drew / (slotNorm(rel.type) || 2.6);
    if (pull >= 1.35 || (pull >= 0.95 && (rel.rating || 0) >= 72)) return 'watched';
    if (pull >= 0.7) return 'seen';
    return 'ignored';
  }
  // Against what it cost to make AND to sell, which is the only sum anybody in the trades
  // means by asking whether it worked. It used to be measured against the bare budget, which
  // quietly gave every picture a marketing campaign that was free.
  const need = breakEvenFor(rel);
  if (!need) return 'seen';
  const ratio = (rel.boxOffice || 0) / need;
  // Four names and not five. A fifth tier would read better on a chart and would break twenty
  // call sites that switch on these exact strings — franchise.js prices a sequel from a table
  // keyed by them, and a missing key there is not a worse colour, it is NaN in somebody’s money.
  if (ratio >= 2.0) return 'smash';
  if (ratio >= 1.25) return 'profitable';
  if (ratio >= 0.7) return 'broke even';
  return 'bomb';
}

// Booked at wrap, opens months later. Nothing about fame moves until it does.
export function scheduleRelease(s, credit, p) {
  const wait = postProduction(p.scale || 'feature');
  const rel = {
    id: uid(s, 'rel'),
    title: credit.title, role: credit.role, type: credit.type, genre: credit.genre,
    scale: p.scale || 'feature', tier: p.tier || 'lead', season: p.season || 0,
    episodes: p.episodes || 0, part: p.part || 1, salary: credit.salary,
    rating: credit.rating, status: credit.status, worldHit: credit.status === 'World Hit',
    // Carried for the Asker season: whether it was pushed, and how good the material was.
    campaign: !!p.campaign, prestigeScore: p.prestigeScore, director: credit.director || null,
    // And how the set went, because the business judges the performance, not only the film.
    meter: p.meter || 0, viaPartner: p.viaPartner || null, fellApart: !!p.fellApart, backend: p.backend || 0, merch: p.merch || 0, potential: p.potential || null,
    // The days that came out right (career/scenes.js) — the critics name one of them.
    moments: (p.moments || []).slice(0, 3),
    // The people you actually know who were on it. They get their own opinion of the work
    // at the end of the run, and theirs outweighs anything they read. life/regard.js
    crewKnown: (p.crew || []).filter((c) => c && c.knownId).map((c) => c.name),
    // Who was on the poster with you, if it was somebody. See production.js makeCrew.
    with: p.with || null, withId: p.withId || null, withFame: p.withFame || 0, withIcon: !!p.withIcon,
    // What the version you shot does to the box office, and the line it was pitched on.
    appealMod: appealShift(p) * dirAppeal(p), premise: p.premise || credit.premise || null, take: credit.take || null,
    // What the studio is spending to sell it, decided when it is booked — see CAMPAIGN above.
    campaignTier: p.campaignTier || studioCampaign(p.scale || 'feature'),
    // What the script was before anybody argued it somewhere else (career/story.js).
    scriptGenre: p.scriptGenre || null,
    // Where you said it should go and whether anybody was paid to remind people it exists.
    // Both decide what the first night looks like, and one of them decides who is still
    // there at the last. See career/chapter.js.
    direction: p.direction || null, remind: p.remind || null, character: p.character || credit.character || null,
    joined: !!p.joined, audience: p.audience || 0,
    due: (s.year || 0) * 12 + (s.month || 0) + wait, wait,
    // Whether the thing gets a second season or a sequel is decided on the numbers, so
    // the shoot has to keep enough of itself alive to be asked that question later.
    job: {
      title: p.title, seriesTitle: p.seriesTitle, role: p.role, type: p.type, genre: p.genre, salary: p.salary,
      months: p.months, episodes: p.episodes || 0, episodeFee: p.episodeFee || 0, baseSalary: p.baseSalary || p.salary, arc: p.arc || null,
      season: p.season || 0, part: p.part || 1, tier: p.tier, scale: p.scale, stability: p.stability,
      // Who you played, what it was about, and where you said it should go. The next season
      // and the next part are built from this object and nothing else — leaving these out
      // meant season four was about a stranger with a new name, under a brief that said
      // "is back". See career/script.js and career/chapter.js.
      character: p.character || null, premise: p.premise || null, direction: p.direction || null,
      prestigeScore: p.prestigeScore, optioned: !!p.optioned, optionParts: p.optionParts || 0,
      // Whether there is a part two IN it at all — rolled when it was made (franchise.js).
      potential: p.potential || null,
      optionSeasons: p.optionSeasons || 0, optionFrom: p.optionFrom || 0, exitAfter: p.exitAfter || 0,
    },
  };
  (s.releases = s.releases || []).push(rel);
  addTimeline(s, `"${rel.title}" wrapped. It opens in about ${count(wait, 'month')}.`);
  return rel;
}

// Runs every month. Anything whose day has come opens.
export function releaseTick(s) {
  const now = (s.year || 0) * 12 + (s.month || 0);
  const due = (s.releases || []).filter((r) => r.due <= now);
  if (!due.length) return s;
  s.releases = (s.releases || []).filter((r) => r.due > now);
  for (const rel of due) open(s, rel);
  return s;
}

// How long the thing is in front of people before anybody knows what it was. A film runs
// for weeks and the number climbs every one of them; a season goes out and the audience
// finds it. Opening night is not the verdict — it is the start of finding out.
// Weeks in cinemas, the way it is: a studio picture six to eight, a tentpole eight, and the
// legs below stretch a hit to twelve or thirteen. Maxi: "films are not in cinemas that long"
// — a smash used to run twenty-four weeks, half a year on the calendar.
const RUN_WEEKS = { small: 2, indie: 4, festival: 4, feature: 6, blockbuster: 8, oneoff: 2,
  episode: 6, recurring: 12, prestige: 10 };
// Legs. A picture people love stays up half again as long; one nobody wants is pulled in
// a fortnight to make room. Maxi: "if it is a success it is in cinemas longer, right?"
function runWeeks(rel, verdict) {
  const base = RUN_WEEKS[rel.scale] || 8;
  if (!isFilm(rel.scale)) return base;
  const legs = verdict === 'smash' ? 1.6 : verdict === 'profitable' ? 1.25 : verdict === 'broke even' ? 1 : rel.rating >= 55 ? 0.8 : 0.5;
  return Math.max(2, Math.round(base * legs));
}

// ── the festival ──────────────────────────────────────────────────────────────
// A festival picture does not open. It screens, twice, in a town full of buyers, and one of
// three things happens: a jury gives it something and the trades use the word "discovery";
// a distributor buys it on the Sunday and it gets a small release; or nobody buys it and it
// is never seen again. Maxi: "independent films that go to festivals are the real
// alternative — a nobody can get into one, and if it works there, you know what happens."
// The first two go on to a run like any film, with the laurels on the poster. The third is
// over the night it screens.
const FESTIVALS = ['Park City', 'the Lido', 'the Croisette', 'Locarno', 'Toronto', 'Berlin'];
// Measured before this was tuned: a nobody's festival film rates in the fifties, and at the
// first numbers 111 of 117 went home unsold — a road nobody would take. Most still do go
// home with nothing; a good one has a real chance, and a very good one is a coin toss.
// Maxi, looking at his own name above the title on a 7.2 at the Croisette and the words NO
// BUYER underneath it: "what does no buyer mean if you are a star — where is the
// inconsistency, haha." There it was: this took the rating and nothing else, so it had no
// idea who was in the film. At 7.2 that is a forty-three per cent chance of going home
// with nothing, for a picture with a name on the poster that somebody can sell a territory
// on. A distributor buys the poster at least as much as the film — being the reason a small
// picture finds a buyer is most of what a star is worth to one, and it is why they are cast.
//
// The jury is untouched, because a jury watches the film. Fame buys the deal, never the prize.
export function festivalOdds(rating, star = 0, lead = true) {
  const prize = rating >= 84 ? 48 : rating >= 76 ? 32 : rating >= 68 ? 18 : rating >= 60 ? 8 : 2;
  const base = rating >= 76 ? 62 : rating >= 66 ? 48 : rating >= 56 ? 32 : rating >= 46 ? 16 : 5;
  // Above the title it is the whole pitch; further down the poster it is a line in the deck.
  const pull = (lead ? star : star * 0.35) * 0.75;
  return { prize, sold: Math.max(0, Math.min(97, Math.round(base + pull))) };
}
function festivalResult(rating, star = 0, lead = true) {
  const o = festivalOdds(rating, star, lead);
  if (chance(o.prize)) return 'prize';
  return chance(o.sold) ? 'sold' : 'unsold';
}
// The studios rang. A prize at a festival is the one thing that gets a stranger a studio
// script — one lead, a real fee, a month or two after the trades used the word.
function studioCall(s, credit, festival) {
  const genre = pick(GENRES);
  const quote = quoteFor(s, 'film_studio') || Math.round((quoteFor(s, 'film_indie') || 40000) * 3.5);
  (s.laterOffers = s.laterOffers || []).push({
    due: (s.year || 0) * 12 + (s.month || 0) + rint(1, 2),
    line: `A studio saw "${credit.title}" at ${festival}. They have sent a script.`,
    event: `The studio that saw "${credit.title}" at ${festival} sent a script. The paper is in Messages — a lead, at studio money.`,
    offer: {
      id: uid(s, 'fest'), via: 'festival', kind: 'festival',
      projectTitle: newTitle(s, genre), role: 'Lead', type: 'Feature Film', genre,
      salary: Math.round(quote * (0.8 + Math.random() * 0.3)), months: rint(3, 5), fame: 5,
      prestigeScore: rint(48, 72), tier: 'lead', scale: 'feature', stability: rint(78, 92), deadline: rint(2, 3),
      note: `They saw "${credit.title}" at ${festival}. Nobody at the studio has said the word "discovery" out loud, but it is in the email.`,
    },
  });
}

function open(s, rel) {
  const film = isFilm(rel.scale);
  // A festival picture is decided in the room, before anybody else sees it: a prize sells
  // it, a buyer sells it a little, and no buyer means there is nothing to open.
  let fest = null;
  if (rel.scale === 'festival') {
    fest = { name: pick(FESTIVALS), result: festivalResult(rel.rating, s.fame || 0, rel.tier !== 'supporting') };
    if (fest.result === 'prize') { rel.appealMod = (rel.appealMod ?? 1) * 2.2; rel.rating = clamp(rel.rating + 3, 0, 96); }
    else if (fest.result === 'sold') rel.appealMod = (rel.appealMod ?? 1) * 1.3;
  }
  // What it will end up taking. The player does not see this number yet — it arrives a
  // few thousand at a time, week by week, which is how anybody actually experiences it.
  // A later season opens on a name people know: a tenth more, before anybody has seen it.
  // Maxi: "the system remembers it was a good picture and gives benefits." For FILM this is
  // now demandFor's familiarity-and-fatigue table, which knows the difference between a second
  // part and a sixth; below, it is still television, where a returning show is simply a habit.
  const known = ((rel.part || 1) > 1 || (rel.season || 0) > 1) ? 1.12 : 1;
  // What the room made of it. Asked before the money, because the money follows it.
  // NOT onto rel.audience. Maxi, looking at a show rated 4.7 that forty-six million people
  // apparently watched: "that does not happen in life." It does not, and it was not happening
  // here either — it was a unit collision I introduced. Two different things were landing on
  // the same field: showAudience() puts the viewers of a running show you JOINED there, in
  // millions, and audienceFor() returns how the crowd took it, out of a hundred. This line
  // overwrote the millions with the score, and viewersFor() then read the score as millions.
  // audienceFor starts at 46, which is exactly the number on his screen.
  rel.reception = audienceFor(s, rel);
  if (fest && fest.result === 'unsold') rel.finalGross = 0;
  // The tour, the reminder campaign and a known name are all AWARENESS, so they are inside
  // demandFor now rather than multiplied onto the finished total. Multiplying the total said
  // that a trailer campaign makes a film play longer, which is the opposite of what it does.
  else if (film) rel.finalGross = boxOfficeFor(s, rel);
  else {
    // Maxi: "how are seasons measured — how many watched at the start and how many at the
    // end, and then they decide whether to renew?" Two numbers, not one. The first night
    // is what the name, the last season and any campaign bought you. What happens between
    // the first episode and the last IS the season, and it is the number the network
    // decides on. See career/chapter.js holdFactor.
    const open = Math.max(0.1, Math.round(viewersFor(s, rel) * tourMultiplier(rel) * known * remindLift(rel) * 10) / 10);
    // A season people enjoy holds its audience whatever the column said about it.
    const liked = 1 + ((rel.reception ?? rel.rating) - (rel.rating || 0)) / 260;
    const end = Math.max(0.1, Math.round(open * holdFactor(rel.rating, rel) * liked * 10) / 10);
    rel.openViewers = open; rel.endViewers = end;
    rel.viewers = Math.max(0.1, Math.round(((open + end) / 2) * 10) / 10);   // millions, one decimal — rounding to a whole made a bad soap draw nobody
  }
  rel.boxOffice = 0;
  const verdict = verdictOf({ ...rel, boxOffice: rel.finalGross || 0 });
  const score = (rel.rating / 10).toFixed(1);

  // The credit exists the night it opens. What it WAS does not — the score and the money
  // land when the run ends, which is the difference between a premiere and a verdict.
  const credit = {
    title: rel.title, role: rel.role, type: rel.type, genre: rel.genre, salary: rel.salary,
    rating: rel.rating, status: rel.status, year: s.year, season: rel.season,
    part: rel.part > 1 ? rel.part : 0, episodes: rel.episodes,
    // In cinemas. Everything below is provisional until runTick closes it.
    running: true, weeks: 0, weeksTotal: runWeeks(rel, verdict), openedAt: (s.year || 0) * 12 + (s.month || 0),
    boxOffice: 0, viewers: rel.viewers || 0, openViewers: rel.openViewers || 0, endViewers: rel.endViewers || 0,
    // What the room thought, which is not what the column thought. See audienceFor above.
    // The credit carries the RECEPTION — out of a hundred, what splitLine and the critics
    // read. The viewers live on openViewers/endViewers and always did.
    audience: rel.reception != null ? rel.reception : null,
    direction: rel.direction || null, remind: rel.remind || null, character: rel.character || null,
    verdict: 'in cinemas', score: null,
    // Carried for the Asker season: what kind of thing it was, and whether it was pushed.
    scale: rel.scale, tier: rel.tier, prestigeScore: rel.prestigeScore, director: rel.director || null,
    premise: rel.premise || null, take: rel.take || null, potential: rel.potential || null,
    campaignShare: rel.campaign ? 0.65 : 0,
    with: rel.with || null, withId: rel.withId || null, withIcon: !!rel.withIcon, withFame: rel.withFame || 0,
    festival: fest,
  };
  const bucket = s.dream === 'singer' ? 'discography' : 'filmography';
  // Two years without anything coming out and the trades will call the next one a
  // comeback whether it deserves the word or not.
  const last = (s[bucket] || [])[0];
  if (last && (s.year || 0) - (last.year || 0) >= 3) credit.comeback = (s.year || 0) - last.year;
  (s[bucket] = s[bucket] || []).unshift(credit);
  markReleased(s);
  // Nobody bought it. Two screenings, a bar, a flight home — and the credit closes tonight,
  // with no run and no numbers. Not a flop: nobody saw it, so nobody can hold it against
  // you. If it was good, the few who did see it remember, and that is worth a little.
  if (fest && fest.result === 'unsold') {
    credit.id = rel.id; credit.running = false; credit.weeksTotal = 0; credit.verdict = 'unsold';
    credit.score = Number((rel.rating / 10).toFixed(1)); credit.boxOffice = 0;
    const soft = (limit, cur) => Math.max(0.16, 1 - (cur || 0) / limit);
    setFame(s, (s.fame || 0) + 1 * soft(118, s.fame));
    if (rel.rating >= 74) setRespect(s, (s.respect || 0) + 3 * soft(112, s.respect));
    credit.reviews = reviewsFor(s, { title: credit.title, rating: rel.rating, genre: credit.genre, verdict: 'seen', director: credit.director,
      actorName: s.name, meter: rel.meter, fellApart: rel.fellApart, viaPartner: rel.viaPartner, take: credit.take, costar: rel.with, costarIcon: rel.withIcon });
    s.lastEvent = `"${rel.title}" screened twice at ${fest.name}. Nobody bought it.`;
    addTimeline(s, `"${rel.title}" screened at ${fest.name}. No distributor.`, rel.rating < 60);
    showMoment(s, {
      id: 'premiere', kind: rel.rating >= 74 ? 'good' : 'bad', festival: fest.name, result: 'unsold', title: rel.title, verdict: 'no buyer',
      body: rel.rating >= 74
        ? `Two screenings in a room that was half full, and the half that came stood up at the end. The buyers did not. Nobody could say what shelf it belonged on, so it stays on none — but the people who saw it will remember who was in it.`
        : `Two screenings, a bar afterwards where everybody said kind things, and a flight home. No distributor rang. It will exist on a hard drive somewhere, and nowhere else.`,
    });
    return s;
  }
  // A film you made together is on both careers. It goes on theirs tonight, at the money
  // it will take, so the year's lists count it for them as well.
  if (film && rel.withId) {
    const a = actorById(s, rel.withId);
    if (a) applyFilmToActor(a, { title: rel.title, year: s.year, rating: rel.rating, gross: rel.finalGross || 0, scale: rel.scale, genre: rel.genre, withYou: true });
  }

  // Opening night is worth something on its own — the carpet, the photographs, the fact
  // that it exists. The rest of what this film does to your name waits for the run.
  const headroom = (limit, cur) => Math.max(0.16, 1 - (cur || 0) / limit);
  // A prize is a photograph in the trades with your name under it, tonight.
  const opening = ({ tentpole: 3, lead: 2, supporting: 1 }[rel.tier] || 1) + tourFame(rel) + (fest && fest.result === 'prize' ? 4 : 0);
  setFame(s, (s.fame || 0) + opening * headroom(118, s.fame));
  if (fest && fest.result === 'prize') setRespect(s, (s.respect || 0) + 4 * Math.max(0.16, 1 - (s.respect || 0) / 112));
  // The finished thing is kept ON the release so runTick can close it out properly.
  credit._rel = { rating: rel.rating, worldHit: rel.worldHit, tier: rel.tier, scale: rel.scale,
    salary: rel.salary, finalGross: rel.finalGross || 0, job: rel.job, film,
    // The campaign has to survive to closeRun. The verdict is measured against what the thing
    // cost to make AND to sell, and without this line every picture would be judged at the end
    // against a default campaign instead of the one it actually had.
    campaignTier: rel.campaignTier, genre: rel.genre, part: rel.part,
    // Read by closeRun and by the critics. These were read off _rel and never written to it,
    // so a carried set and a part got over dinner were both invisible once the run closed.
    meter: rel.meter || 0, viaPartner: rel.viaPartner || null, fellApart: !!rel.fellApart, backend: rel.backend || 0, merch: rel.merch || 0, potential: rel.potential || null,
    moments: rel.moments || [], crewKnown: rel.crewKnown || [],
    with: rel.with || null, withIcon: !!rel.withIcon };
  // BY ID, never by reference. A save is JSON, and JSON.parse hands back a fresh object for
  // every entry — so a list holding the credit itself pointed at a copy the moment anybody
  // reloaded, and the run finished on the copy while the credit in the filmography sat at
  // week four with no score, forever. Any film in cinemas when you closed the game was lost.
  credit.id = rel.id;
  (s.running = s.running || []).push(rel.id);

  // Television does not open, it goes out. A soap starts on a Tuesday at seven; a pilot
  // airs; a prestige season drops at midnight. Maxi: "for a soap there is no premiere — a
  // TV set, the sound of the show, a new soap starting season one on television."
  credit.tv = !film;
  // Opening night is the month everybody is talking about it. What it turns out to be worth
  // is settled later, at the close (closeRun); this is the noise, not the verdict.
  {
    const loud = { blockbuster: 62, feature: 44, prestige: 46, recurring: 34, indie: 26, festival: 22, episode: 10, small: 12 }[rel.scale] || 22;
    const carried = rel.tier === 'supporting' ? 0.55 : 1;
    const good = (rel.rating || 0) >= 78 ? 1.2 : (rel.rating || 0) >= 60 ? 1 : 0.7;
    const burst = Math.round(loud * carried * good);
    if (burst >= 12) addHype(s, burst, 'hit');
  }
  const tvKind = rel.scale === 'recurring' ? 'soap' : rel.scale === 'prestige' ? 'prestige' : 'episode';
  s.lastEvent = fest
    ? (fest.result === 'prize' ? `"${rel.title}" took the prize at ${fest.name}. Your phone has not stopped.` : `"${rel.title}" was bought at ${fest.name}. A small release, but a release.`)
    : film
    ? `"${rel.title}" opened tonight. Now everybody finds out what it is.`
    : tvKind === 'soap' ? `"${rel.title}" went out at seven. Your mother rang before the credits.`
    : tvKind === 'prestige' ? `"${rel.title}" dropped at midnight. Everybody you know is on episode three by morning.`
    : `"${rel.title}" aired tonight.`;
  addTimeline(s, fest ? (fest.result === 'prize' ? `"${rel.title}" won at ${fest.name}.` : `"${rel.title}" sold at ${fest.name}.`) : film ? `"${rel.title}" opened.` : `"${rel.title}" went out.`);
  showMoment(s, fest ? {
    id: 'premiere', kind: 'good', festival: fest.name, result: fest.result, genre: rel.genre, scale: rel.scale, title: rel.title,
    verdict: fest.result === 'prize' ? 'the jury prize' : 'sold on the Sunday',
    body: fest.result === 'prize'
      ? `A cinema at nine in the morning, a jury in the front row, and at the end of the week your title read out in a room of people who buy films for a living. Three distributors by Sunday. The trades used the word "discovery", and they used your name.`
      : `Two screenings, a good one and a quiet one, and on the Sunday a distributor who liked the quiet one. A small release, a few cities, a poster with the laurels on it. It exists now. What it does is the next few weeks.`,
  } : film ? {
    id: 'premiere', kind: 'good', title: rel.title, verdict: 'opening night', genre: rel.genre, scale: rel.scale,
    body: 'You stood on a carpet and answered the same four questions eleven times, and then '
      + 'the lights went down and you watched it with strangers. Nobody knows anything yet — '
      + 'not the reviews, not the money, not you. That comes over the next few weeks.',
  } : {
    id: 'premiere', kind: 'good', tv: tvKind, genre: rel.genre, scale: rel.scale, title: rel.title, verdict: (rel.season || 0) > 1 ? `season ${rel.season}` : 'season one',
    episodes: rel.episodes || 0,
    body: tvKind === 'soap'
      ? `Seven o'clock, a Tuesday. The theme, the titles, your face for the first time in ${(rel.episodes || 25)} episodes of it. Nobody watches a soap for the reviews — they watch it every week, or they do not, and you find out over the run.`
      : tvKind === 'prestige'
      ? `Every episode at once, at midnight. No carpet, no room — a screen in a kitchen somewhere, and a number the network will not say out loud for a few weeks yet.`
      : `The episode went out. You watched it on your own phone, on the sofa, and it was over in an hour. Whether anybody else did is the next few weeks' question.`,
  });

  return s;
}

// ── the run ───────────────────────────────────────────────────────────────────
// Weeks in front of people. The money climbs, and at the end of it the score settles and
// the industry finally says what the thing was — which is when it counts for anything.
export function runTick(s) {
  const list = s.running || [];
  if (!list.length) return s;
  const shelf = [...(s.filmography || []), ...(s.discography || [])];
  const still = [];
  for (const id of list) {
    const c = shelf.find((x) => x.id === id);
    if (!c) continue;                       // the credit is gone; nothing left to finish
    const r = c._rel || {};
    // Opening night and the verdict are never the same evening. A three-week flop used to open
    // and close in one tick — the premiere and the numbers back to back on the same screen.
    // Maxi: "the premiere window and then the score straight away — is that a bug?" The run
    // counts from the month after it opens.
    if (c.openedAt === (s.year || 0) * 12 + (s.month || 0)) { still.push(id); continue; }
    c.weeks = Math.min(c.weeksTotal, (c.weeks || 0) + 4);
    const share = c.weeks / Math.max(1, c.weeksTotal);
    // Front-loaded, the way opening weekends are: most of it lands early.
    c.boxOffice = Math.round((r.finalGross || 0) * Math.min(1, Math.pow(share, 0.55)));
    if (c.weeks < c.weeksTotal) { still.push(id); continue; }
    closeRun(s, c, r);
  }
  // Never the same run twice, whatever put it in the list.
  s.running = [...new Set(still)];
  return s;
}

function closeRun(s, credit, r) {
  credit.running = false;
  credit.closedAt = (s.year || 0) * 12 + (s.month || 0);   // so the phone knows somebody saw it this month
  credit.meterAtClose = r.meter || 0;                        // the papers ask whose film it was (meta/press.js)
  // And the people who were on it decide what they think of you as an actor. This is worth
  // years of the slow drift in either direction, and it is the only thing that is.
  regardAfterWorking(s, r.crewKnown || [], credit.rating || 50, r.meter || 0);
  delete credit._rel;
  credit.boxOffice = r.finalGross || 0;
  // Belt and braces. `r` comes off the credit and is gone the moment a run closes, so if
  // anything ever hands the same credit here twice — the id collision that used to be
  // possible, a hand-edited save, a future bug — the score must still be a number. It was
  // silently writing NaN, and a NaN score is forever: it fails every comparison, so the
  // credit is neither a hit nor a flop and no screen can render it.
  const rating = Number.isFinite(r.rating) ? r.rating : (Number.isFinite(credit.rating) ? credit.rating : 50);
  credit.score = Number((rating / 10).toFixed(1));
  r = { ...r, rating };
  const verdict = verdictOf({ scale: r.scale, rating: r.rating, boxOffice: credit.boxOffice,
    // What it cost to sell, so the bar is the one this picture actually had to clear.
    campaignTier: r.campaignTier,
    // Television needs to know who turned up; without these it fell back to the column.
    type: credit.type, endViewers: credit.endViewers, viewers: credit.viewers });
  credit.verdict = verdict;
  credit.needed = breakEvenFor({ scale: r.scale, campaignTier: r.campaignTier });
  // And the genre is used up by what you released into it, exactly as the world's pictures are.
  if (r.film && r.genre) marketAfterRelease(s, r.genre, r.scale,
    credit.needed ? (credit.boxOffice || 0) / credit.needed : null);
  const film = r.film;

  // The score buys respect; the money buys reach. They are different currencies, and both
  // of them are settled here rather than on opening night.
  const bySkill = { tentpole: 9, lead: 5, supporting: 2 }[r.tier] || 2;
  let fame = bySkill + (r.rating >= 85 ? 4 : 0) + (r.worldHit ? 25 : 0);
  // Hype: where the talk comes from this year. A hit replaces whatever was there; a flop
  // takes it off the lead, and only a little off a supporting part. See meta/hype.js.
  if (r.worldHit) addHype(s, 85, 'hit');
  else if (verdict === 'smash') addHype(s, 70, 'hit');
  else if (verdict === 'profitable' || r.rating >= 80) addHype(s, r.tier === 'supporting' ? 30 : 50, 'hit');
  else if (!film && (verdict === 'watched' || credit.renewal === 'renewed')) addHype(s, r.tier === 'supporting' ? 26 : (credit.renewal === 'renewed' ? 48 : 40), 'hit');
  else if (!film && verdict === 'seen' && r.tier !== 'supporting') addHype(s, 22, 'hit');
  else if (verdict === 'bomb') flopHype(s, r.tier);
  if (verdict === 'smash') fame += 8;
  else if (verdict === 'profitable') fame += 3;
  // A flop cuts what the film does for your name — and at the top it takes some of the
  // name with it. Maxi: "at the top there is nothing to lose." A supporting part is not
  // blamed for a picture; the lead is, and the bigger the name the louder the blame.
  else if (verdict === 'bomb') fame = r.tier !== 'supporting' && r.scale !== 'episode' && (s.fame || 0) >= 45 ? -(2 + ((s.fame || 0) - 45) / 14) : Math.max(1, fame - 3);
  // The last stretch is the whole point of the ladder and it was the cheapest part of it.
  // A limit of 118 with a floor of 0.16 meant an A-lister still banked a sixth of every
  // credit forever: measured across 25 careers, A-list arrived at a median age of 33 and
  // Icon at 36, and ten of the twenty-five made Icon. In life almost nobody does, and the
  // ones who do are twenty years in. Above seventy this now costs several times what it
  // did, and a small credit is worth almost nothing at the top — which is true: nobody
  // becomes an icon by working a lot, they become one by being in something enormous.
  // Getting known is not the hard part and must not become it — a single steep curve pushed
  // "Known Face" down to five careers in twenty-five, which is nonsense: anybody who works
  // for twenty years becomes a face people recognise. The wall belongs between Star and
  // A-list, and again between A-list and Icon.
  const headroom = (cur) => {
    const f = cur || 0;
    if (f < 55) return 1 - f / 130;                 // the climb to Star is ordinary work
    // Steeper again once shoots became the length shoots are (a season, not a year): twice
    // the credits a year put twenty-one of twenty-five perfect players on the Icon chair.
    return Math.max(0.03, 0.577 * Math.pow(Math.max(0, (104 - f) / 49), 2.5));
  };
  // A comeback is a story, and the trades love a story. `credit.comeback` was a label on the
  // filmography and nothing else — a fallen name that landed something good got exactly what
  // anybody else got for it, and crawled back up through Rising Star at fifty like a
  // twenty-two-year-old. That is not how a comeback works. A comeback is a JUMP: one good
  // film and you are back in the conversation — not at the top, but straight to Known Face,
  // the middle of the ladder, where people can name a film of yours again.
  //
  // Maxi asked which rung you come back to, and this is the answer: never Unknown, never
  // Rising Star. Known Face, if the film was good. Mediocre work after a fall does not get
  // the word, and you climb through Rising Star like anyone else, with a thinner board.
  // Once, and only from Forgotten — the second comeback is just a career.
  const wasForgotten = (s.peakFame || 0) >= 35 && (s.fame || 0) < 15;
  if (wasForgotten && r.rating >= comebackFloor(s) && !s._cameBack) {
    s._cameBack = true;
    addHype(s, 60, 'hit');
    setRespect(s, (s.respect || 0) + 4);
    setFame(s, Math.max(s.fame || 0, 35));   // straight to Known Face; the film's own fame lands on top below
    addTimeline(s, `The trades are calling ${credit.title} a comeback. Every piece uses the word, and every piece uses your name.`);
    s.lastEvent = `"${credit.title}" is being written about as a comeback. It is a generous word for it, and it is doing more for you than the film is.`;
  }
  setFame(s, (s.fame || 0) + (fame < 0 ? fame : fame * headroom(s.fame)));
  // Two leads that bombed inside two years and the insurers stop covering you on a studio
  // picture: a year with no studio features or tentpoles on the board, and the trades
  // have a phrase for it. See castings.js (poison) and meta/press.js.
  if (verdict === 'bomb' && r.tier !== 'supporting' && film) {
    const now = (s.year || 0) * 12 + (s.month || 0);
    s.bombs = [...(s.bombs || []).filter((m) => now - m <= 24), now];
    if (s.bombs.length >= 2 && !(s.poisonUntil > now)) { s.poisonUntil = now + 12; addTimeline(s, `Two leads that bombed in two years. The trades are using the phrase box office poison, and the insurers have stopped returning the studios' calls about you.`, true); s.lastEvent = `Two leads that bombed inside two years. The studios will not insure you on a picture for a year — the trades' phrase for it is box office poison.`; }
  }
  // A bad film costs standing in proportion to what was expected of you. At forty it is
  // news and it costs the full four; at nothing it costs almost nothing, because nobody
  // expected anything. This mattered the moment standing could go below zero: a flat −4
  // meant the first twenty films of ANY career — which are bad, because craft starts at
  // eighteen — dug a hole it took a perfect player twenty-one years to climb out of.
  // Bad work alone bottoms out around −5. Below that is behaviour: walking off, refusing,
  // the director's word about you. Being bad at it and being trouble are different things
  // and the ladder says so — "a name people check" is a cold set or two, "avoided" is a
  // pattern of walking off. A perfect player was still hovering at −2 for nine years on
  // the first version of this, because the first fifteen films are bad whatever you do.
  const expected = (s.respect || 0) <= -5 ? 0 : Math.min(1, Math.max(0.1, ((s.respect || 0) + 5) / 45));
  let respectGain = r.rating >= 85 ? 5 : r.rating >= 70 ? 2 : r.rating < 45 ? -4 * expected : 0;
  // The business judges the performance, not only the film — and it can tell them apart.
  // Measured: an actor at a hundred, rehearsing every month, still put a quarter of their
  // small films under 45 and half of the rest in the fifties, because a short with no
  // money is a short with no money. Every one of those cost standing or earned none, so
  // the one career that should build standing before fame — good, and selective — could
  // not. A set you carried (meter 85+) changes the reading: a bad film is the film's
  // fault, and a middling one still gets your name mentioned. The word for it is the
  // oldest one in the reviews: "the only good thing in it".
  const carried = (r.meter || 0) >= 85;
  // A part you got through somebody's dinner table is judged twice. Good, and you made it
  // not matter — the five points come back with interest. Bad, and they said so at the time.
  let nepo = 0;
  if (r.viaPartner) nepo = r.rating >= 75 ? 6 : r.rating < 55 ? -5 : 0;
  if (nepo) addTimeline(s, nepo > 0 ? `"${credit.title}" is good enough that nobody mentions ${r.viaPartner.split(' ')[0]} any more.` : `"${credit.title}" is what everybody said it would be, and they are saying it again.`, nepo < 0);
  // Against type and good: the room that had you down as one thing saw something else.
  const against = typeFit(s, { genre: credit.genre, scale: r.scale, type: credit.type, perEpisode: !!credit.episodes }) <= -0.5;
  if (against && r.rating >= 65) { respectGain += 2; addTimeline(s, `"${credit.title}" was against type, and it worked. The rooms that had you down as one thing have made a note.`); }
  respectGain += nepo;
  if (carried && r.rating < 45) respectGain = 0;
  else if (carried && r.rating >= 45 && r.rating < 70) respectGain = 1;
  const soft = (limit, cur) => Math.max(0.16, 1 - (cur || 0) / limit);
  setRespect(s, (s.respect || 0) + (respectGain > 0 ? respectGain * soft(112, s.respect) : respectGain));
  if (film && verdict === 'smash') setQuote(s, Math.max(s.quote || 0, (r.salary || 0) * 1.6));
  // Points. A percentage of what it took past what it cost — the clause that only a name gets.
  // The toys. A tentpole that worked sells a market of its own, and the paper said whether
  // any of it is yours (contract.js merch). Nobody buys the lunchbox of a bomb.
  if (film && r.scale === 'blockbuster' && (r.merch || 0) > 0 && (verdict === 'smash' || verdict === 'profitable')) {
    const market = Math.round((credit.boxOffice || 0) * (verdict === 'smash' ? 0.25 : 0.1));
    const cut = Math.round(market * (r.merch / 100));
    if (cut > 0) { paid(s, cut, `"${credit.title}" — ${r.merch}% of the merchandise`); credit.merchPaid = cut; addTimeline(s, `Your face is on the toys, and ${r.merch}% of the toys is yours: €${cut.toLocaleString()}.`); }
  }
  if (film && r.backend > 0) {
    const over = Math.max(0, (credit.boxOffice || 0) - budgetFor({ scale: r.scale }) * 2.2);
    const cut = Math.round(over * (r.backend / 100));
    if (cut > 0) { paid(s, cut, `"${credit.title}" — ${r.backend}% of the gross`); credit.backendPaid = cut; }
    else addTimeline(s, `"${credit.title}" never passed break-even. Your points are worth nothing.`, true);
  }

  // The gross means nothing on its own — "a billion" is only a triumph next to what it cost.
  // The industry never quotes one without the other and neither should this.
  const bud = budgetFor({ scale: r.scale });
  const money = film
    ? `€${(credit.boxOffice / 1000000).toFixed(credit.boxOffice >= 100000000 ? 0 : 1)}m on a €${(bud / 1000000).toFixed(0)}m film, ${credit.weeksTotal} weeks`
    : (credit.openViewers && credit.endViewers)
      ? `${credit.openViewers}m for the first, ${credit.endViewers}m for the last`
      : `${credit.viewers}m watching`;
  const score = credit.score.toFixed(1);
  const line = r.worldHit
    ? `🌍 "${credit.title}" is a phenomenon. ${score}/10 · ${money}.`
    : `"${credit.title}" finished its run. ${score}/10 · ${money} · ${verdict}.`
      + (carried && r.rating < 45 ? ' The reviews agree on one thing: you were the only good thing in it.'
        : carried && r.rating < 70 ? ' The film is nothing much. Your performance is what the reviews are about.' : '');
  s.lastEvent = line;
  addTimeline(s, line, r.rating < 50 || verdict === 'bomb');

  // A prize at a festival is the one thing that turns a stranger into a name in a week: the
  // trades use the word "discovery", the standing comes with it, and a studio sends a script.
  if (credit.festival && credit.festival.result === 'prize') {
    setFame(s, (s.fame || 0) + 8 * headroom(s.fame));
    setRespect(s, (s.respect || 0) + 6 * soft(112, s.respect));
    addTimeline(s, `The trades are calling you the discovery of ${credit.festival.name}.`);
    if ((s.fame || 0) < 60) studioCall(s, credit, credit.festival.name);
  } else if (credit.festival && credit.festival.result === 'sold' && r.rating >= 70) {
    setRespect(s, (s.respect || 0) + 2 * soft(112, s.respect));
  }
  // The job stays on the credit whatever happens next: a show that was not renewed, or a
  // renewal you let go, can still be pitched back from your own sofa. See night.js revivable.
  if (r.job) credit.job = r.job;
  // Only now does anyone know whether there is a second one.
  if (r.job) {
    const next = maybeContinue(s, credit, r.job);
    if (next) (s.offers = s.offers || []).push(next);
    // The studio said no. A name in the room can push for it later — favours.js pushSequel —
    // if the thing was not a bomb and the franchise is not already four deep.
    else {
      const part = r.job.part || 1, season = r.job.season || 0;
      const eligible = season ? season < 6 && r.rating >= 55 : verdict !== 'bomb' && part < 4;
      if (eligible) { credit.job = r.job; credit.pushable = true; }
    }
  }

  // What was written about it — kept on the credit for the filmography, shown tonight.
  credit.reviews = reviewsFor(s, { title: credit.title, rating: r.rating, genre: credit.genre, verdict, director: credit.director,
    actorName: s.name, meter: r.meter, fellApart: r.fellApart, viaPartner: r.viaPartner, worldHit: r.worldHit, take: credit.take, audience: credit.audience,
    moment: (r.moments || [])[Math.floor(Math.random() * Math.max(1, (r.moments || []).length))] || null,
    costar: r.with, costarIcon: r.withIcon, comeback: !!credit.comeback, sequel: (credit.part || 0) > 1,
    lateShelf: /Character lead|matriarch|Elder|Grandparent/.test(credit.role || '') });
  // Standing next to an icon is worth something on its own: the photographs, the poster,
  // the fact that they said yes to a film you were in.
  if (r.withIcon) { setFame(s, (s.fame || 0) + 3 * headroom(s.fame)); setRespect(s, (s.respect || 0) + 2 * soft(112, s.respect)); addTimeline(s, `Your name is on a poster next to ${r.with}'s. People noticed.`); }
  typecastAfterCredit(s, credit);
  storyAfterCredit(s, credit);
  showMoment(s, {
    id: 'verdict', tv: film ? null : (r.scale === 'recurring' ? 'soap' : r.scale === 'prestige' ? 'prestige' : 'episode'), kind: r.rating >= 70 || verdict === 'smash' ? 'good' : 'bad',
    title: credit.title, score, money, verdict, reviews: credit.reviews, genre: credit.genre, scale: r.scale,
    // Television: the network's number against yours, and what it decided.
    network: !film && r.scale !== 'episode' && credit.renewal ? networkLine(credit.type, credit.endViewers || credit.viewers, null, r.rating, credit.renewal) : null,
    // How many were there on the first night and how many on the last. Maxi asked how a
    // season is measured; this is the answer, on the night it is answered.
    retention: !film && r.scale !== 'episode' ? retentionLine(credit.openViewers, credit.endViewers) : null,
    // When the column and the room have seen different films. career/release.js splitLine
    split: splitLine(r.rating, credit.audience),
    renewal: credit.renewal || null,
    body: r.worldHit
      ? 'Nobody expected this. It has stopped being a film and started being an event.'
      : r.rating >= 85 ? 'The reviews are the kind people screenshot.'
      : r.rating >= 70 ? 'Well received. Not the one they will remember you for, but a good run.'
      : r.rating >= 50 ? 'It came and went. Some people liked it.'
      : verdict === 'bomb' ? 'The reviews are bad and the numbers are worse. Somebody will be blamed.'
      : 'It did not land. These are the ones you leave off the reel.',
  });
  return s;
}
