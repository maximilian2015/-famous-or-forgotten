// The theatrical market: what a picture takes and whether it worked — the budget it is measured
// against, the campaign that sells it, the demand on the first weekend, the screens, the legs and the
// widening, the gross, the world hit, and the festival that decides whether a small one opens at all.
// Moved out of release.js unchanged (Media release cleanup, 20 Oct 2026); release.js still exports
// every name it exported, so nothing that imports from there had to change. The opening night and the
// close of the run stay in release.js, which calls in here. Television is release/television.js,
// streaming release/streaming.js.
import { chance, rint, pick } from '../../../engine/rng.js';
import { canAfford, tooTired, spend } from '../../../engine/energy.js';
import { uid } from '../../../engine/id.js';
import { appetiteFor } from '../../meta/market.js';
import { hypeSource, hype } from '../../meta/hype.js';
import { castingExpectation } from '../../meta/typecast.js';
import { tourMultiplier } from '../tour.js';
import { remindLift } from '../chapter.js';
import { isFilmScale as isFilm } from '../scale.js';
import { GENRES } from '../../meta/news.js';
import { quoteFor } from '../../meta/status.js';
import { newTitle } from '../../world/titles.js';
import { marketAfterRelease } from '../../meta/market.js';
import { addTimeline } from '../../../engine/timeline.js';
import { setQuote, setFame, setRespect } from '../../meta/status.js';
import { paid } from '../agent.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

// Everything commercial is measured against the budget, because that is the only number
// the industry compares anything to. A picture is not "big" — it is big AGAINST its cost.
// Since Budget V2 a picture has its own (career/budget.js); this is the fallback for one that has none.
const BUDGET = { small: 1, festival: 1.5, indie: 12, feature: 90, blockbuster: 220 };   // millions
// What the genre market measures a picture against, per screen it was given, by scale: what an
// ordinary picture of its size takes, so that an ordinary one reports to the market what it did
// before Budget V2 and the size of the whole business does not drift. Not what this picture cost
// (see closeRun). Measured on the world's own pictures, old tree against new: at the narrower
// widths and the campaigns real budgets buy, an ordinary feature takes 0.56 of what it did and an
// ordinary indie 0.54, so the yardstick is that much of the old flat budget.
export const PAR = { small: 1, festival: 1.5, indie: 6.4, feature: 50, blockbuster: 220 };   // millions
// What an ordinary run makes of an opening, by scale — the legs, the widening and the dice of a
// picture nobody loved or hated. Measured on the world's own pictures so their average surprise
// comes out at 1.00 (tests/probes/probe_market_par.mjs ordinary). The yardstick genreResidual reads.
export const ORDINARY = { small: 1.48, festival: 1.48, indie: 3.38, feature: 3.37, blockbuster: 3.15 };
const ORDINARY_NAME = 40;   // the fame of the name on an ordinary picture's poster
// Not everything good is commercial. A prestige drama and a horror picture with the same
// score do not do the same business, and that is the whole reason the score and the money
// are two separate numbers rather than one number written twice.
export const APPEAL = {
  Horror: 1.35, 'Sci-Fi': 1.25, Comedy: 1.1, Thriller: 1.05, Crime: 0.95,
  Musical: 0.85, Romance: 0.8, Drama: 0.7,
};

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
// The production budget in millions: the project's own when it carries one (Budget V2), and the
// scale's single number otherwise — which is every film made before it, so nothing moves until
// a project is given a budget of its own.
export function budgetM(rel) { return rel && Number.isFinite(rel.budget) && rel.budget > 0 ? rel.budget : (BUDGET[rel && rel.scale] || 0); }
export function campaignSpend(rel) { return budgetM(rel) * campaignOf(rel).share; }
// What it has to clear. The trades’ own rule: worldwide takes about two and a half times the
// negative before anybody sees a profit, because the cinema keeps roughly half of every ticket.
// This is the number that replaces comparing the gross to the bare budget.
export function breakEvenFor(rel) {
  const b = budgetM(rel);
  if (!b) return 0;
  return Math.round((b + b * campaignOf(rel).share) * 1.5 * 1000000);
}

// How wide it can physically go. THIS is what the budget buys instead of buying tickets, and
// the real gap between a platform release and a global day-and-date is enormous.
// Budget V2 recalibrated the two middle scales, measured on played careers (tests/probes/
// probe_calibrate_v2.mjs, probe_verdicts.mjs): feature 0.55 and indie 0.09 were set against a
// €90m and a €12m budget for every picture. With budgets of their own most pictures cost a
// fraction of that, and at the old widths nearly every standard feature of yours was a smash.
// Tentpoles are untouched.
export const SCREENS = { small: 0.012, festival: 0.02, indie: 0.05, prestige: 0.12, feature: 0.34, blockbuster: 0.78 };
// How far a platform release can widen, as a multiple of where it opened. Kept where the old
// widths put it, so the indie sleeper did not grow its ceiling by accident when the indie width moved.
const EXPAND_CAP = { indie: 4, festival: 18, small: 30 };
// Worldwide opening per unit of demand, raised to the power below. ONE source of truth: this
// number existed twice as a bare literal — once here and once inside grossFor — and when
// somebody changed it they changed one of them.
const OPEN_K = 0.46;
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
// ── the one calculation ───────────────────────────────────────────────────────
// Every film in this world goes through here: yours and the twenty a year the rest of the
// industry makes. It used to be two functions. grossFor held a second copy of this arithmetic
// AND a second copy of the opening, down to its own literal 0.46 — which is not a theory about
// technical debt: somebody cut the opening constant to 0.29 this week and patched only one of
// the two, and what caught it was a probe measuring something else entirely.
//
// What belongs here is what any film has: who is on the poster, what was spent selling it, the
// muscle behind it, the appetite for its genre, what kind of film it is, and whether anybody
// liked the last one. What does NOT belong here is what a PERSON did — the month's hype, the
// press tour, the reminders, the question an odd piece of casting makes people ask out loud.
// Those arrive as numbers and default to nothing, because a world film has no press tour and
// inventing one for it would be worse than leaving it out.
//
// The order of operations is exactly what demandFor did, because a refactor that moves a
// player's results is not a refactor. test_demandcore holds that to the decimal.
export function demandCore({ scale, genre, cast = [], appetite = 1, campaignTier = null,
  part = 1, lastRating = 65, appealMod = 1, buzz = 0, anticipation = 0, tour = 1, remind = 1, budget = null } = {}) {
  let d = 6;
  d += castDraw(cast) * 0.52;                                      // who is on the poster
  d += buzz * 0.28;                                                // what is being said this month
  d += Math.min(26, Math.sqrt(Math.max(0, campaignSpend({ scale, campaignTier, budget }))) * 2.1);
  // Weighted heavily on purpose: the bigger the picture, the LESS of it is the actor. Nobody
  // buys a ticket to a tentpole for whoever is third on the poster — the franchise, the studio
  // and the campaign sell it.
  d += (MUSCLE[scale] ?? 40) * 0.22;                               // distribution muscle
  d *= 0.52 + appetite * 0.48;                                     // the genre market
  // And the kind of film it is, which is not the same question: horror is structurally cheap
  // and popular whatever the fashion is doing.
  d *= 0.45 + ((APPEAL[genre] || 1) * 0.55);
  // Familiarity, and then fatigue — and a good last one buys the fatigue back. A fourth
  // instalment nobody liked is a harder sell than a first nobody has heard of.
  if (part > 1) {
    const fam = [0, 0, 16, 19, 19, 16, 13][Math.min(6, part)] ?? 11;
    const tired = [0, 0, 0, 4, 10, 18, 26][Math.min(6, part)] ?? 30;
    const last = lastRating ?? 65;
    d += fam - tired * (last >= 75 ? 0.25 : last >= 60 ? 0.6 : 1.2);
  }
  d += anticipation * 2.5;                                         // what the casting makes people ask
  d *= tour * remind;                                              // the tour, and being reminded
  // A festival prize or a buyer is the only thing that makes anybody aware of a small picture.
  d *= 0.55 + (appealMod ?? 1) * 0.45;
  // No ceiling. Demand is an index, not a percentage.
  return Math.max(2, Math.round(d));
}

// Your film: the same calculation, plus the four things only a person does.
export function demandFor(s, rel) {
  return demandCore({
    scale: rel.scale, genre: rel.genre,
    cast: [s.fame || 0, rel.withFame || 0],
    appetite: appetiteFor(s, rel.genre, rel.scale),
    campaignTier: rel.campaignTier, budget: rel.budget ?? null,
    part: rel.part || 1, lastRating: rel.lastRating, appealMod: rel.appealMod,
    // Scandal is not the kind of talk that sells a ticket, which was always the rule here.
    buzz: hypeSource(s) === 'scandal' ? 0 : hype(s),
    anticipation: castingExpectation(s, rel),
    tour: tourMultiplier(rel), remind: remindLift(rel),
  });
}

// ── 2. OPENING ────────────────────────────────────────────────────────────────
// How far a picture's budget carries it past its scale's usual width (Budget V2). A €25m comedy
// is a studio release and still does not open on the screens a €110m one does; a tentpole is
// everywhere whatever it cost, so its reach is left exactly where it was.
export const REACH = { k: 0.3 };
export function reachOf(rel) {
  if (!rel || !(rel.scale === 'feature' || rel.scale === 'indie')) return 1;
  const base = BUDGET[rel.scale];
  return Math.max(0.5, Math.min(1.4, Math.pow(budgetM(rel) / base, REACH.k)));
}
// How a picture did against its own kind. The expectation is the same arithmetic as the real
// thing — demandCore, then the opening — for an ordinary picture of exactly this scale, genre,
// budget, campaign and part, opening into exactly this market: everything about the picture's
// KIND is in it, so what is left is what was its own (who was on the poster, how good it was, how
// the crowd took it, luck). 1.0 is a picture that did exactly what pictures like it do. This is
// what the genre market judges a genre on (meta/market.js): a drama against dramas, not against
// horror pictures, and a dear picture's bigger campaign is not taken for appetite.
export function genreResidual({ scale, genre, gross, budget = null, appetite = 1, campaignTier = null, part = 1 }) {
  const d = demandCore({ scale, genre, cast: [ORDINARY_NAME], appetite: appetite ?? 1, campaignTier, budget, part: part || 1 });
  const expect = Math.pow(Math.max(2, d), 1.45) * OPEN_K * (SCREENS[scale] ?? 0.09) * reachOf({ scale, budget }) * (ORDINARY[scale] || 0) * 1e6;
  return expect > 0 && Number.isFinite(gross) ? gross / expect : null;
}
// TENTPOLES, TEMPORARY (meta/market.js, TENTPOLES). The old track judged a genre on pictures that
// opened into ITS heat, and that is what held its genres hot: hot, so they took more, so hotter.
// Pictures under a tentpole open into the fair market now, and fed as they are the old track lost
// that and cooled — a career's tentpoles past a billion fell from about 39% to about 32%, nearly
// all of it science-fiction and thriller tentpoles opening cooler. So each report to the old track
// is told what the same picture would have taken in the old track's heat. Goes with the track.
export function asOldTrackSawIt(ratio, appetite, legacy) {
  if (!Number.isFinite(ratio)) return ratio;
  const heat = (a) => 0.52 + (a ?? 1) * 0.48;
  return ratio * Math.pow(heat(legacy) / heat(appetite), 1.45);
}
export function openingFor(s, rel, demand) {
  const wide = (SCREENS[rel.scale] ?? 0.09) * reachOf(rel);
  // Superlinear, because the gap between seventy and ninety matters far more than the gap
  // between twenty and forty. The top of this market is winner-take-most and always was.
  const base = Math.pow(Math.max(2, demand), 1.45) * OPEN_K * wide;
  if (rel._window == null) rel._window = windowFor(s.month || 0);
  if (rel._against == null) rel._against = againstYou(rel.scale);
  return base * rel._window * rel._against * (0.9 + Math.random() * 0.2);
}

// ── 3a. THE RUN ───────────────────────────────────────────────────────────────
// How long it lasts, and it is almost entirely the crowd. A tentpole the audience dislikes
// finishes at twice its opening; one they love finishes at five. The column moves this a little
// and moves it most for the small ones, where a review is still how anybody hears of it.
// Where the word-of-mouth multiplier starts and how far it reaches, by scale.
const LEGS = {
  small: [1.85, 4.60], festival: [1.85, 4.60], indie: [1.85, 4.60],   // 1.85 … 6.45
  feature: [1.80, 4.00],                                              // 1.80 … 5.80
  blockbuster: [1.65, 2.35],                                          // 1.65 … 4.00
};
const LEGS_DEFAULT = [1.75, 3.50];

export function wordFor(rel) {
  const crowd = rel.reception != null ? rel.reception : (rel.rating || 50);
  return crowd * 0.6 + (rel.rating || 50) * 0.4;
}
export function legsFor(rel) {
  const w = wordFor(rel);
  // Continuous: 1.8x for something nobody enjoyed, about 3.5x for a picture people like, and
  // five and a half for one they carry. Those are the real multiples of a worldwide opening.
  // How far word of mouth can carry a picture depends on what KIND of picture it is, and one
  // range for all of them forced a choice nobody should have to make. Compressing it until a
  // billion was rare also made a feature rated 8.8 a smash zero times in twenty thousand;
  // leaving it where it was made a billion the ordinary result of a tentpole.
  //
  // They are not the same story. A tentpole opens enormous and saturates — everybody who was
  // ever going to see it went in the first fortnight, and there is nobody left to tell. A small
  // picture opens on nothing and can be carried a very long way by people telling each other,
  // which is the only way it was ever going to reach anybody.
  //
  // Swept four candidate sets before choosing (tests/probes/probe_legs_scale.mjs). This one is
  // the first that holds both promises at once: a feature rated 8.8 at fame 70 becomes a smash
  // about a quarter of the time, and a Midnight Talker tentpole lands around €739m with a
  // billion at roughly 6% and €1.163bn in its top half-percent.
  //
  // Anything not listed keeps the old single range, so nothing unlisted moves by accident.
  const [lo, span] = LEGS[rel.scale] || LEGS_DEFAULT;
  let m = lo + Math.pow(Math.max(0, w - 35) / 60, 1.5) * span;
  // Frontloading, which is a mechanism and not a punishment: everybody who was ever going to
  // see a bad blockbuster goes on the first weekend, and then it falls off a cliff. The run does;
  // the rule must not. It was a step — word 59 ran at 0.78 and word 60 in full, a fifth of the
  // gross on one point — and now it is a slope: a picture the crowd shrugged at (word 52 and
  // under) burns out at 0.78, a mediocre one (58) at about 0.89, and from 64, an ordinary picture
  // people were content with, the run is whole. Centred where the step was, so the pictures that
  // used to sit just under it — nearly every film rated in the fives — still run short of a
  // normal one; a slope ending at 60 gave them their whole run back (probe_verdicts, the genre audit).
  if (!isPlatform(rel.scale) && w < 64) { const k = Math.max(0, Math.min(1, (w - 52) / 12)); m *= 0.78 + 0.22 * k * k * (3 - 2 * k); }
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
  return Math.min(grow, EXPAND_CAP[rel.scale] ?? (0.36 / (SCREENS[rel.scale] ?? 0.09)));
}

// The commercial result, for anybody. Your films and the ones the rest of the world makes in
// the same year sit on the same list, so they are priced by the same arithmetic — the world
// simply has fewer things to say about its own pictures, so it takes the defaults.
// A film the rest of the industry made, priced by the same arithmetic as yours. It used to
// carry its own copy of the demand AND its own copy of the opening, literal 0.46 and all; both
// are gone. What a world film genuinely has it now passes in — the name on the poster, a second
// name when there is one, which part of a series it is and how the last one was received. What
// it does not have stays absent rather than being invented: no monthly hype, no press tour, no
// reminders, because nobody is doing any of that for it.
export function grossFor({ scale, rating, genre, fame = 0, withFame = 0, trend = 1, appealMod = 1,
  crowd = null, campaignTier = null, part = 1, lastRating = 65, budget = null }) {
  if (!BUDGET[scale]) return 0;
  const rel = { scale, genre, rating, reception: crowd != null ? crowd : rating, budget,
    appealMod, part, lastRating, campaignTier: campaignTier || studioCampaign(scale) };
  const demand = demandCore({ scale, genre, cast: [fame, withFame], appetite: trend,
    campaignTier: rel.campaignTier, part, lastRating, appealMod, budget });
  // The same opening every one of your films goes through — the window is rolled rather than
  // read off a calendar, because a world film is not released in any particular month of yours.
  const opening = openingFor({ month: rint(0, 11) }, rel, demand);
  return Math.round(opening * legsFor(rel) * expansionFor(rel) * 1000000);
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
  rel._appetite = appetiteFor(s, rel.genre, rel.scale);   // what it opened into, for the market at the close
  rel._oldAppetite = appetiteFor(s, rel.genre, 'blockbuster');   // and what the old track had (temporary, asOldTrackSawIt)
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

// What the last instalment was like, which is what decides whether anybody is tired of this.
// Found the same way previousAudience finds last season: by the title with the part stripped
// off, because nothing on the production carries a pointer back to the picture before it.
export function previousRating(s, rel) {
  const prev = previousPart(s, rel);
  return prev ? (prev.rating ?? null) : null;
}
export function previousPart(s, rel) {
  if (!rel || (rel.part || 1) < 2) return null;
  const root = String(rel.title || '').replace(/(\s*(?:·|:)?\s*part\s+\d+)+\s*$/i, '').trim();
  if (!root) return null;
  const prev = (s.filmography || []).filter((c) => (c.part || 1) === (rel.part || 1) - 1
    && String(c.title || '').replace(/(\s*(?:·|:)?\s*part\s+\d+)+\s*$/i, '').trim() === root);
  return prev.length ? prev[prev.length - 1] : null;
}

// ── three different questions, and they must not be collapsed into one ────────
// I had this wrong and was told so. Looking at a €12m picture that took €8m and was nominated
// for four things, I said the commercial verdict was the wrong yardstick for a small film.
// It is not. It is one of three yardsticks, and hiding it because the other two came out well
// destroys the only interesting thing about the situation:
//
//     COMMERCIAL   flop
//     CRITICAL     92
//     CAREER       a major prestige win
//
// A player who reads that understands something real — the film lost money and was still the
// right decision. Take the word "flop" away and there is nothing left to understand. The same
// in reverse for a sequel that takes €690m and is worth 31 to the column: commercial triumph,
// prestige damage, and the typecasting tightens another notch.
// Whether a picture became one of the few everybody has heard of. Read AFTER the run closes,
// from the final worldwide gross and from what the crowd made of it — never before, and never
// from the reviews alone.
//
// The bars are read off the distribution rather than picked: measured over 6,000 pictures in
// the mix a year of cinema is actually made in, €700m is the top 2.5% of everything and about
// one blockbuster in eight. That is the right order of magnitude for "the film of the year",
// and it is deliberately NOT a billion — a billion is the Billion Club, which is a louder thing
// and does not exist yet.
const WORLD_GROSS = 700e6;        // the scale route
const SLEEPER_GROSS = 150e6;      // the floor under the phenomenon route
const SLEEPER_OVER = 12;          // ...and how many times its own costs it has to go
export function isWorldHit(credit, rel) {
  const gross = credit.boxOffice || 0;
  if (gross <= 0) return false;
  // The same word of mouth the legs are made of: the crowd first, the column second. The crowd's
  // number does not survive onto _rel — the file warns about exactly this a few lines down from
  // where _rel is built — but it is written onto the credit at opening as `audience`, so it is
  // read from there. Without it this would be the reviews again, which is the bug being fixed.
  const word = wordFor({ reception: rel.reception != null ? rel.reception : credit.audience,
    rating: rel.rating != null ? rel.rating : credit.rating });
  const needed = credit.needed || breakEvenFor(rel) || 0;
  // Enormous, and not hated. A tentpole people disliked makes its money in a fortnight and is
  // forgotten by spring; that is a smash, not a phenomenon.
  if (gross >= WORLD_GROSS && word >= 58) return true;
  // Or it went somewhere nothing of its size goes, and people loved it. Twelve times what it
  // had to make, past a hundred and fifty million, and a crowd that sent their friends.
  if (needed > 0 && gross >= needed * SLEEPER_OVER && gross >= SLEEPER_GROSS && word >= 75) return true;
  return false;
}

// Did it make its money back? This is what the industry actually remembers.
export function budgetFor(rel) { return Math.round(budgetM(rel) * 1000000); }

// ── the festival ──────────────────────────────────────────────────────────────
// A festival picture does not open. It screens, twice, in a town full of buyers, and one of
// three things happens: a jury gives it something and the trades use the word "discovery";
// a distributor buys it on the Sunday and it gets a small release; or nobody buys it and it
// is never seen again. Maxi: "independent films that go to festivals are the real
// alternative — a nobody can get into one, and if it works there, you know what happens."
// The first two go on to a run like any film, with the laurels on the poster. The third is
// over the night it screens.
export const FESTIVALS = ['Park City', 'the Lido', 'the Croisette', 'Locarno', 'Toronto', 'Berlin'];
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
// ── a festival picture has no distributor, and that is the whole of it ───────
// Maxi, twice, looking at NO BUYER: "он никогда не вышел что ли?" — and then the real
// question: "так как его релизовать? мне опции не давалось."
//
// He was right that there was none. A festival film is financed without anybody attached to
// put it in cinemas; it premieres, buyers come, and either one of them takes it or it never
// opens at all — which is what happens to most of them. That part was true and stays true.
// What was wrong is that it was resolved in silence out of the rating and your fame, with
// the player sitting there watching it happen to them.
//
// Three things an actor can really do about it, and now does:
//   GO. Fly out, do the photocall, the Q&A after every screening, the buyer meetings. What
//       a distributor is buying is something it can sell, and you on a carpet is the thing
//       being sold. Costs the energy and a fortnight.
//   PAY FOR A SALES AGENT. Somebody whose entire job is knowing which eleven people to
//       call. Small films really are sold this way, and it really does come out of
//       somebody’s pocket.
//   NOTHING. It screens. It takes its chances. Most of them do.
export const FEST_ENERGY = 15;
export function agentCost(s) { return Math.max(18000, Math.round((s.quote || 200000) * 0.09)); }
export function festivalOdds(rating, star = 0, lead = true, push = null) {
  const prize = rating >= 84 ? 48 : rating >= 76 ? 32 : rating >= 68 ? 18 : rating >= 60 ? 8 : 2;
  const base = rating >= 76 ? 62 : rating >= 66 ? 48 : rating >= 56 ? 32 : rating >= 46 ? 16 : 5;
  // Above the title it is the whole pitch; further down the poster it is a line in the deck.
  const pull = (lead ? star : star * 0.35) * 0.75;
  // Turning up helps the jury a little and the buyers a great deal. An agent does nothing
  // for a prize at all — juries do not take calls — and a lot for a sale.
  const went = push === 'went' ? 18 : 0;
  const agent = push === 'agent' ? 24 : 0;
  return {
    prize: Math.max(0, Math.min(92, prize + (push === 'went' ? 6 : 0))),
    sold: Math.max(0, Math.min(97, Math.round(base + pull + went + agent))),
  };
}
export function festivalResult(rating, star = 0, lead = true, push = null) {
  const o = festivalOdds(rating, star, lead, push);
  if (chance(o.prize)) return 'prize';
  return chance(o.sold) ? 'sold' : 'unsold';
}
// Answered from the invitation in the inbox (meta/email.js), the way the press tour is.
export function answerFestMail(s, id, i) {
  const m = (s.inbox || []).find((x) => x.id === id); if (!m) return s;
  const c = m.cta && m.cta[i]; if (!c || !c.fest) return s;
  if (answerFestival(s, m, c.fest)) s.inbox = (s.inbox || []).filter((x) => x.id !== id);
  return s;
}
export function answerFestival(s, m, what) {
  const r = (s.releases || []).find((x) => x.id === m.releaseId);
  if (!r) { s.lastEvent = 'That one has already screened.'; return true; }
  if (what === 'skip') { r.festPush = 'none'; s.lastEvent = `You are not going. "${r.title}" screens on a Tuesday afternoon to four hundred people and whatever happens, happens.`; return true; }
  if (what === 'go') {
    if (!canAfford(s, FEST_ENERGY)) { s.lastEvent = tooTired(s, FEST_ENERGY); return false; }
    spend(s, FEST_ENERGY);
    r.festPush = 'went';
    s.strain = clamp((s.strain || 0) + 4);
    s.lastEvent = `Four days of it: the photocall, a Q&A after every screening, and eleven meetings with people who will decide in a week whether "${r.title}" is ever seen again.`;
    return true;
  }
  const cost = agentCost(s);
  if ((s.cash || 0) < cost) { s.lastEvent = `A sales agent wants €${cost.toLocaleString()} and you do not have it.`; return false; }
  s.cash = (s.cash || 0) - cost;
  r.festPush = 'agent';
  s.lastEvent = `You are paying for somebody who knows which eleven people matter. €${cost.toLocaleString()} of your own money on a picture you are only in.`;
  return true;
}
// The studios rang. A prize at a festival is the one thing that gets a stranger a studio
// script — one lead, a real fee, a month or two after the trades used the word.
export function studioCall(s, credit, festival) {
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

// How a picture did, in the words the trades use (release.js verdictOf).
export function moneyVerdict(rel) {
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

// A festival picture is decided in the room, before anybody else sees it: a prize sells
// it, a buyer sells it a little, and no buyer means there is nothing to open.
export function festivalAt(s, rel) {
  let fest = null;
  if (rel.scale === 'festival') {
    fest = { name: pick(FESTIVALS), result: festivalResult(rel.rating, s.fame || 0, rel.tier !== 'supporting', rel.festPush), push: rel.festPush || null };
    if (fest.result === 'prize') { rel.appealMod = (rel.appealMod ?? 1) * 2.2; rel.rating = clamp(rel.rating + 3, 0, 96); }
    else if (fest.result === 'sold') rel.appealMod = (rel.appealMod ?? 1) * 1.3;
  }
  return fest;
}

// What a picture's run tells its genre's market (release.js closeRun).
export function feedTheMarket(s, credit, r) {
  // And the genre is used up by what you released into it, exactly as the world's pictures are.
  // Weighted by what anybody actually saw of it, not counted as one release. See exposureOf.
  // The appetite is the AUDIENCE's, and an audience does not know what a picture cost: it is told
  // how many went to each screen the picture was given, against what a picture of this scale
  // ordinarily takes (PAR) — never against this one's own budget, and never by how wide its budget sent it.
  // Fed the real budget (Budget V2), the market read cheapness as appetite and pinned horror and
  // comedy at the top; fed the gross alone, it read the screens a dear picture buys as appetite
  // and pinned science fiction there instead (tests/probes/probe_appetite.mjs).
  const usual = breakEvenFor({ scale: r.scale, campaignTier: r.campaignTier, budget: PAR[r.scale] ?? null }) * reachOf({ scale: r.scale, budget: r.budget ?? credit.budget ?? null });
  // And, now the one a genre is judged on, how it did against its own kind (genreResidual).
  if (r.film && r.genre) marketAfterRelease(s, r.genre, r.scale,
    asOldTrackSawIt(usual ? (credit.boxOffice || 0) / usual : null, r.appetite ?? appetiteFor(s, r.genre, r.scale), r.oldAppetite ?? appetiteFor(s, r.genre, 'blockbuster')),
    campaignOf({ campaignTier: r.campaignTier }).share, r.part || 1,
    genreResidual({ scale: r.scale, genre: r.genre, gross: credit.boxOffice || 0, budget: r.budget ?? credit.budget ?? null,
      appetite: r.appetite ?? appetiteFor(s, r.genre, r.scale), campaignTier: r.campaignTier, part: r.part || 1 }));
}

// Whether a picture's run made it a world hit, settled after the close (release.js closeRun).
export function settleWorldHit(s, credit, r, film) {
  // ── was it enormous ──────────────────────────────────────────────────────────
  // It used to be decided on the set, months before anybody saw it: production.js rolled a die
  // on the RATING at wrap and wrote 'World Hit' onto the credit, and everything below read that
  // flag. So a €1.163bn picture rated 7.7 could never be one, and a festival film rated 9.2
  // that took forty million always could. The game's idea of an enormous film was the critics'
  // idea of a good one, settled before release.
  //
  // It is settled here instead, which is after the run has closed and the final worldwide gross
  // is on the credit — the rewards were always paid from here, only the flag arrived early.
  // Two ways in, because there are two ways in life:
  //   the scale of it — three quarters of a billion, and a crowd that did not hate it;
  //   the phenomenon  — a smaller picture that went enormously past what it was built for and
  //                     that people loved, which is how a five-million comedy takes four hundred.
  // Neither one is the money alone: both read the crowd, because a film nobody enjoyed does not
  // become the thing people talk about however many tickets the first weekend sold.
  r.worldHit = film ? isWorldHit(credit, r) : false;
  if (r.worldHit) {
    credit.status = 'World Hit';
    s.worldHits = (s.worldHits || 0) + 1;
  }
}

// Two leads that bombed in two years (release.js closeRun).
export function boxOfficePoison(s, r, verdict, film) {
  // Two leads that bombed inside two years and the insurers stop covering you on a studio
  // picture: a year with no studio features or tentpoles on the board, and the trades
  // have a phrase for it. See castings.js (poison) and meta/press.js.
  if (verdict === 'bomb' && r.tier !== 'supporting' && film) {
    const now = (s.year || 0) * 12 + (s.month || 0);
    s.bombs = [...(s.bombs || []).filter((m) => now - m <= 24), now];
    if (s.bombs.length >= 2 && !(s.poisonUntil > now)) { s.poisonUntil = now + 12; addTimeline(s, `Two leads that bombed in two years. The trades are using the phrase box office poison, and the insurers have stopped returning the studios' calls about you.`, true); s.lastEvent = `Two leads that bombed inside two years. The studios will not insure you on a picture for a year — the trades' phrase for it is box office poison.`; }
  }
}

// What a picture that worked pays you after it: your quote, the toys, the points (release.js closeRun).
export function pictureMoney(s, credit, r, verdict, film) {
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
    const over = Math.max(0, (credit.boxOffice || 0) - budgetFor({ scale: r.scale, budget: r.budget ?? credit.budget ?? null }) * 2.2);
    const cut = Math.round(over * (r.backend / 100));
    if (cut > 0) { paid(s, cut, `"${credit.title}" — ${r.backend}% of the gross`); credit.backendPaid = cut; }
    else addTimeline(s, `"${credit.title}" never passed break-even. Your points are worth nothing.`, true);
  }
}

// What a festival's prize or sale does for you once the run is over (release.js closeRun).
export function festivalAfterRun(s, credit, r, headroom, soft) {
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
}
