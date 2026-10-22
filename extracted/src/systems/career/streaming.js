// Streaming Series V1 — Media Ecosystem stage 3 (docs/handoffs/2026-10-20-streaming-series-v1-plan.md,
// revision 4, Maxi's decisions of 20 Oct).
//
// A streaming season is not a network season. It is not on at seven on a Tuesday against a slot,
// it is all of it at once, and the platform does not ask how many watched the finale: it asks how
// many FINISHED it in the first four weeks, against what the season cost. So the numbers are its own:
//
//   opening7    who pressed play in the first week — the names, the talk, the platform's push and its
//               taste for the genre; nobody has seen it yet, so quality is nowhere in it
//   completion  how many of them got to the end — the one door quality has into the verdict
//   views28     who pressed play in four weeks: the opening's run (×2.4), and virality only for the
//               few shows people pass around (word 82+, 70% finishing). No completion term in it —
//               revision 3 had completion² here and ×completion again below, which counted it twice
//   finished28  views28 × completion — what the platform judges
//   reach       the show's life afterwards (library value, later reach); never the verdict
//
//   score = finished28 per €m of the season's cost, against the platform's target
//   Miss < 0.7 · Solid < 1.4 · Hit · Breakout = a Hit whose views28 clear the platform's bar
//
// Four platforms, one of each kind, with fixed tastes until stage 5. The save keeps who they are
// (an id, the kind, a name); the numbers stay in this table, because they are starting values the
// 40-career probe calibrates (tests/probes/probe_streaming.mjs) and a save must not freeze them.
// Pure arithmetic and tables: no state is changed here except the platforms' first appearance, and
// nothing here draws Math.random — release.js passes the dice in — so a seeded life is reproducible.
import { hash, rng } from '../../engine/hash.js';

// subscribers (M) · target: M who finished it in 28 days per €1m of season cost, at par · breakout:
// views28 (M) a Hit needs to be a Breakout · renew: the projected score a next season needs · cap:
// seasons · big / low: the push lines on season cost (€m) · maxSeason: the dearest season it renews ·
// maxFee: the most it pays anybody for a season (€m) — the cheap services do not ring a name they cannot afford.
//
// Calibrated on careers (tests/probes/probe_streaming.mjs, 20 Oct; the plan's starting values in
// brackets, kept in tests/test_streaming.mjs PLAN). Targets were set so a FIRST season's median score
// is about 1 on every platform — measured, the starting values put it at 3.2 on the ad-supported
// service, 2.1 on the premium one and 1.7 on the genre one; the giant's came out right at first and
// rose to 1.4 once fame per view was doubled (fameFromViews), so its target followed. Breakout bars sit
// near the top tenth of what a star's first season draws; the renewal bars give a first season about
// an even chance (the cheap services' were raised to 0.8 when they renewed 80% of everything). Since
// a Breakout needs virality too (outcomeFor), it is rare. Result, 40 careers that take streaming work:
// first seasons Miss 29% · Solid 40% · Hit 30% · Breakout 0–1%, renewed 48%; later seasons Hit ~69%; an
// unsteered career: first seasons Miss 17–19% · Solid 43–45% · Hit 32–33% · Breakout 5–6%.
export const ARCHETYPES = {
  global: { subscribers: 260, target: 0.21, breakout: 75, renew: 0.85, cap: 5, big: 120, low: 30, word: 'the giant' },              // [0.15 · 60 · 1.0]
  prestige: { subscribers: 90, target: 0.135, breakout: 35, renew: 0.65, cap: 4, big: 80, low: 25, word: 'the premium service' },   // [0.07 · 25 · 0.8]
  library: { subscribers: 150, target: 0.31, breakout: 40, renew: 0.8, cap: 6, big: 40, low: 22, maxSeason: 40, maxFee: 8, word: 'the ad-supported service' },   // [0.10 · 30 · 0.7]
  niche: { subscribers: 25, target: 0.073, breakout: 9, renew: 0.8, cap: 4, big: 30, low: 12, maxFee: 4, word: 'the genre service' },          // [0.045 · 8 · 0.8]
};
// What each platform's audience likes — the only place genre enters a streaming audience (the
// theatrical APPEAL table is never read for streaming).
export const AFFINITY = {
  global: { Comedy: 1.10, Crime: 1.00, Drama: 0.95, Horror: 1.10, Musical: 0.85, Romance: 0.95, 'Sci-Fi': 1.10, Thriller: 1.10 },
  prestige: { Comedy: 0.80, Crime: 1.25, Drama: 1.30, Horror: 0.70, Musical: 0.85, Romance: 0.90, 'Sci-Fi': 0.95, Thriller: 1.10 },
  library: { Comedy: 1.25, Crime: 1.20, Drama: 1.00, Horror: 0.85, Musical: 0.90, Romance: 1.15, 'Sci-Fi': 0.80, Thriller: 0.95 },
  niche: { Comedy: 0.60, Crime: 0.80, Drama: 0.60, Horror: 1.50, Musical: 0.60, Romance: 0.60, 'Sci-Fi': 1.40, Thriller: 1.10 },
};
const NAMES = { global: ['Lumen', 'Meridian', 'Orbit'], prestige: ['Halcyon', 'Vellum', 'Marlowe'], library: ['Sundays', 'Couch+', 'Rerun'], niche: ['Nightjar', 'Static', 'Hollow'] };
export const PUSH = { low: 0.6, standard: 1.0, big: 1.6 };
export const LEGS = 2.4;            // four weeks against one: what pressed play after the first week
export const CAST_SHARE = 0.12;     // everybody on the call sheet who is not you, against what the episodes cost
export const MISS_BELOW = 0.7, HIT_FROM = 1.4;
export const OUTCOME_WORD = { miss: 'Miss', solid: 'Solid', hit: 'Hit', breakout: 'Breakout' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = (v) => Math.round(v * 10) / 10;

// The streaming shelf on the board can be switched off for a probe, so a seeded life with streaming
// off plays out to the last digit as it did before (tests/probes/probe_same_life.mjs).
export const STREAMING = { pool: true };
export function setStreamingPool(on) { STREAMING.pool = !!on; }

// ── the platforms ─────────────────────────────────────────────────────────────
// Created the first time anything asks, named from the life (not from Math.random), kept on the world.
export function streamingOf(s) {
  if (!s) return null;
  if (!s.world) s.world = {};
  if (s.world.streaming && Array.isArray(s.world.streaming.platforms)) return s.world.streaming;
  const r = rng(hash('platforms:' + (s.name || '') + ':' + (s.world.seeded || s.year || 0)));
  const platforms = Object.keys(ARCHETYPES).map((archetype) => {
    const names = NAMES[archetype];
    return { id: 'plt-' + archetype, archetype, name: names[Math.floor(r() * names.length) % names.length] };
  });
  s.world.streaming = { platforms, seeded: s.year || 0 };
  return s.world.streaming;
}
export function platformById(s, id) {
  const all = streamingOf(s);
  return (all && all.platforms.find((p) => p.id === id)) || null;
}
export function platformOfKind(s, archetype) {
  const all = streamingOf(s);
  return (all && all.platforms.find((p) => p.archetype === archetype)) || null;
}
export function numbersOf(p) { return ARCHETYPES[p && p.archetype] || ARCHETYPES.library; }
export function platformWord(p) { return p ? `${p.name}, ${numbersOf(p).word}` : 'a streamer'; }

// ── the season ────────────────────────────────────────────────────────────────
// Everything about the drop, from what release.js knows on the night: the names (castDraw), the talk
// (hype), what the crowd made of it (word, release.js wordFor) and the dice. € in millions.
export function seasonCost({ episodes, episodeCost, salaryM }) {
  return r1((episodes || 8) * (episodeCost || 0) * (1 + CAST_SHARE) + (salaryM || 0));
}
export function pushFor(platform, cost, draw, prev = null) {
  const P = numbersOf(platform);
  if (prev && (prev.outcome === 'hit' || prev.outcome === 'breakout')) return 'big';
  if (cost >= P.big || draw >= 40) return 'big';
  if (cost <= P.low && draw < 15) return 'low';
  return 'standard';
}
export function completionFor({ word, episodes, season }) {
  return clamp(0.30 + (word - 50) * 0.012 - 0.01 * Math.max(0, (episodes || 8) - 8) - 0.03 * Math.max(0, (season || 1) - 1), 0.12, 0.90);
}
export function viralityFor(completion, word) {
  return completion >= 0.70 && word >= 82 ? Math.min(2.5, 1 + (word - 82) / 10 * 1.5) : 1;
}
export function acclaimFor(platform, rating) {
  return platform && platform.archetype === 'prestige' ? 1 + Math.max(0, (rating || 0) - 70) / 50 : 1;
}
// A Breakout is three things at once (Maxi, 20 Oct): a Hit, past the platform's bar for how many pressed
// play, AND passed around — the word that makes virality (viralityFor). The last one is a condition for
// the word, never another multiplier on the score: a star and a hard push can make an enormous Hit, and
// that is all they make. Measured before this, 42–55% of a star's later seasons were Breakouts.
export function outcomeFor(platform, score, views28, viral = false) {
  if (score < MISS_BELOW) return 'miss';
  if (score < HIT_FROM) return 'solid';
  return views28 >= numbersOf(platform).breakout && viral ? 'breakout' : 'hit';
}
export function dropSeason({ platform, genre, episodes, season = 1, rating = 50, word = 50, hype = 0, draw = 0,
  salaryM = 0, episodeCost = 0, legacy = 0, prev = null, dice = 1 }) {
  const P = numbersOf(platform);
  const cost = seasonCost({ episodes, episodeCost, salaryM });
  const push = pushFor(platform, cost, draw, prev);
  const awareness = 0.5 + draw / 40 + hype / 100 + 0.4 * (legacy || 0);
  const affinity = (AFFINITY[platform && platform.archetype] || {})[genre] ?? 1;
  // Last season's finishers come back in week one — they are in the opening, and they are counted
  // once. The four-week run (LEGS) and virality are NEW viewers finding it, so they multiply only the
  // fresh opening: multiplying the fans by them too made every returning season more than double the
  // one before (the 40-career probe, 20 Oct: 52–59% of second seasons were Breakouts).
  const fresh7 = P.subscribers * 0.03 * awareness * PUSH[push] * affinity * dice;
  const fans = 0.6 * ((prev && prev.finished28) || 0);
  const opening7 = fresh7 + fans;
  const completion = completionFor({ word, episodes, season });
  const virality = viralityFor(completion, word);
  const views28 = Math.min(fresh7 * LEGS * virality + fans, P.subscribers * 0.45);
  const finished28 = views28 * completion;
  const reach = views28 * (1.3 + 2.2 * Math.pow(completion, 1.5));
  const score = finished28 / Math.max(0.1, cost) / P.target * acclaimFor(platform, rating);
  return {
    push, cost, awareness: Math.round(awareness * 100) / 100, opening7: r1(opening7), completion: Math.round(completion * 100) / 100,
    virality: Math.round(virality * 100) / 100, views28: r1(views28), finished28: r1(finished28), reach: r1(reach),
    score: Math.round(score * 100) / 100, outcome: outcomeFor(platform, score, views28, virality > 1), viral: virality > 1,
  };
}

// ── after it ──────────────────────────────────────────────────────────────────
// Fame is awareness, so it comes from how many saw it, not from the score band: +1 for a lead per
// five million who pressed play in four weeks, up to eight; half that for a supporting part. A Miss
// watched by almost nobody gives nothing and takes nothing. (The plan started at one per ten million,
// up to six: measured, a median streaming season moved a name a fifth of what a network season does,
// so a global season of thirty million now weighs about what a network lead's season weighs — five.)
export const FAME_PER = 5, FAME_CAP = 8;
export function fameFromViews(views28, tier) {
  const lead = Math.min(FAME_CAP, Math.floor((views28 || 0) / FAME_PER));
  return tier === 'supporting' ? Math.floor(lead / 2) : lead;
}
export function hypeFor(outcome, tier) {
  if (outcome === 'breakout') return 70;
  if (outcome === 'hit') return tier === 'supporting' ? 26 : 48;
  if (outcome === 'solid') return tier === 'supporting' ? 0 : 22;
  return 0;
}

// Renewal, on what the next season will really cost (franchise.js streamingRenewal works out that
// cost — the cast's real raise — and asks here). A season that is neither clearly in nor clearly
// out goes on the bubble, exactly as television does (bubble.js).
export const BUBBLE_BAND = 0.15;
export function renewalFor({ platform, season = 1, limited = false, rating = 50, finished28 = 0, views28 = 0, prevViews28 = null, nextCost = 1 }) {
  const P = numbersOf(platform);
  if (limited) return { decision: 'ended', projected: null };
  if (season >= P.cap) return { decision: 'capped', projected: null };
  // Fatigue is the NEXT season's: season two is one past the first, so ×0.92 (plan §4).
  const fatigue = Math.max(0.4, 1 - 0.08 * Math.max(0, season));
  const trend = prevViews28 ? clamp(views28 / prevViews28, 0.75, 1.15) : 1;
  const projected = Math.round(finished28 * fatigue * trend / Math.max(0.1, nextCost) / P.target * acclaimFor(platform, rating) * 100) / 100;
  // The ad-supported service has a ceiling on a season, whatever the numbers.
  if (P.maxSeason && nextCost > P.maxSeason) return { decision: 'cancelled', why: 'dear', projected };
  // The premium service renews what the critics love, if anybody watched it at all.
  if (platform.archetype === 'prestige' && rating >= 82 && projected >= 0.5) return { decision: 'renewed', why: 'acclaim', projected };
  if (projected >= P.renew + BUBBLE_BAND) return { decision: 'renewed', projected };
  if (projected <= P.renew - BUBBLE_BAND) return { decision: 'cancelled', why: views28 >= P.breakout * 0.4 ? 'dear' : 'numbers', projected };
  return { decision: 'bubble', projected, odds: Math.round(clamp(50 + (projected - P.renew) / BUBBLE_BAND * 30, 20, 80)) };
}

// The platform's reasons, in one line, for the night the verdict lands (Maxi: a show cancelled at
// fifty-nine million views reads like a bug unless it says why).
export function platformLine({ platform, views28, completion, decision, why = null, nextCost = null, cap = null }) {
  const name = platform ? platform.name : 'The platform';
  const pct = Math.round((completion || 0) * 100);
  const seen = `${views28}m pressed play in 28 days and ${pct}% finished it.`;
  if (decision === 'renewed') return `${seen} ${name} has ordered another season.`;
  if (decision === 'bubble') return `${seen} ${name} has not decided.`;
  if (decision === 'ended') return `${seen} A limited series — it was always going to end here.`;
  if (decision === 'capped') return `${seen} ${name} ends its shows at ${cap || numbersOf(platform).cap} seasons. This was the last one.`;
  if (why === 'dear') return `${seen} A real audience — but €${Math.round(nextCost || 0)}m for another season was too much for ${name} at these numbers. Cancelled.`;
  return `${seen} Not enough of them, for what it cost. ${name} cancelled it.`;
}

// A network show the network let go, picked up by a platform (bubble.js rescue): the fans it brings
// are worth a little awareness on its first streaming week. Dimensionless — no head count moves.
export function legacyIndex(finalePull, heat) {
  return Math.round(clamp((finalePull || 0) * ({ none: 1, some: 1.15, loud: 1.3 }[heat] || 1), 0, 2) * 100) / 100;
}

// ── a platform's film (Streaming Movies V1) ───────────────────────────────────
// docs/handoffs/2026-10-21-streaming-movies-v1-plan.md, revision 2 (Maxi's corrections of 21 Oct).
// A film is not a season with the renewal taken out. Three things are kept apart, each counted once:
//
//   starts      unique accounts that pressed play. Week one is the names, the talk, the push and the
//               platform's taste — nobody has seen it, so no quality. After that each week finds NEW
//               viewers, a share of the week before: that share is the MOMENTUM, from what people tell
//               each other (wordFor — the crowd's reception and the critics, the number that gives a
//               cinema run its legs). Momentum is inside starts28 and nowhere else in the score.
//   completion  how many of those who started it finished it — from what the room made of it. A
//               two-hour film is mostly finished, so its band is narrow (0.40–0.85, a season's 0.12–0.90).
//   finished28  starts28 × completion, against the whole cost: the platform's verdict.
//
//   Miss < 0.7 · Solid < 1.4 · Hit · Breakout = a Hit with a big audience (starts28 past the
//   platform's bar) AND a strong second week (momentum 0.6+). The second week is a condition for the
//   word, never a second multiplier on the same viewers. No "Number one": that needs a ranking against
//   the platform's other titles, which is the stage 5 streaming world.
//
// What a platform wants from a film, by kind. target: M who finished it in 28 days per €1m of the whole
// cost, at par · breakout: starts28 (M) a Hit needs to be a Breakout · big / low: the push lines on the
// cost (€m) · sell: what the platform spends selling it, a share of the budget (a cinema release spends
// half to all of its budget; a home screen is free) · maxFee: the most it pays anybody (€m) · backs: the
// rating from which it pays for an Asker campaign itself · sequel: % it makes a second one, by outcome.
// Calibrated on careers (tests/probes/probe_streaming_movies.mjs, 21 Oct; the plan's starting values in
// brackets, kept in tests/test_streaming_movies.mjs PLAN). At the starting values a film's median score
// came out at 2.9 on the giant, 2.4 on the premium service, 1.9–2.7 on the ad-supported one, and half
// of the giant's films were Breakouts: on a real career the names are bigger, the talk louder and the
// crowd kinder than in the plan's examples. Targets were set so the median film scores about 1 where
// most of that platform's films are made (the giant's and the premium service's by names, the cheap
// services' by a career that is starting); Breakout bars sit near the top tenth of what pressed play.
// Budgets are career/budget.js PLATFORM_FILM_RANGE.
export const FILM = {
  global: { target: 0.52, breakout: 120, big: 120, low: 30, sell: 0.10, backs: 80, sequel: { breakout: 60, hit: 25 } },   // [0.18 · 70]
  prestige: { target: 0.74, breakout: 32, big: 35, low: 10, sell: 0.06, backs: 70, sequel: null },                        // [0.32 · 25]
  library: { target: 1.2, breakout: 40, big: 18, low: 6, sell: 0.04, maxFee: 3, backs: null, sequel: { breakout: 20, hit: 20 } },   // [0.65 · 35]
  niche: { target: 0.26, breakout: 10, big: 6, low: 2, sell: 0.03, maxFee: 1, backs: null, sequel: { breakout: 30, hit: 30 } },     // [0.33 · 10]
};
export const FILM_WEEKS = 4;            // a film's credit closes at its verdict: no tail month
export const FILM_BUYOUT = 1.25;        // the cinema fee for its size, bought out: no points, no merchandise
export const FILM_BREAKOUT_MOMENTUM = 0.6;
export const filmNumbersOf = (p) => FILM[p && p.archetype] || FILM.library;
// A platform's film is a platform's work on a film scale. One test, read everywhere a film's market
// matters — the critics, the crowd and the Asker read the scale and see a film; the money does not.
const FILM_SCALE = new Set(['small', 'festival', 'indie', 'feature', 'blockbuster']);
export function isPlatformFilm(x) { return !!(x && x.streaming && FILM_SCALE.has(x.scale)); }
// Platform ids are 'plt-' + their kind (streamingOf), so the kind is known without the save.
export function archetypeOfId(id) { return typeof id === 'string' && id.startsWith('plt-') ? id.slice(4) : null; }

export function filmCost({ platform, budget, price = null }) {
  return price != null ? price : (budget || 0) * (1 + filmNumbersOf(platform).sell);
}
export function filmPushFor(platform, cost, draw, prev = null) {
  const P = filmNumbersOf(platform);
  if (prev && (prev.outcome === 'hit' || prev.outcome === 'breakout')) return 'big';
  if (cost >= P.big || draw >= 30) return 'big';
  if (cost <= P.low && draw < 12) return 'low';
  return 'standard';
}
export function momentumFor(word) { return clamp(0.30 + ((word ?? 50) - 50) * 0.01, 0.15, 0.75); }
export function filmCompletionFor(crowd) { return clamp(0.55 + ((crowd ?? 50) - 50) * 0.007, 0.40, 0.85); }
export function filmOutcomeFor(platform, score, starts28, momentum) {
  if (score < MISS_BELOW) return 'miss';
  if (score < HIT_FROM) return 'solid';
  return starts28 >= filmNumbersOf(platform).breakout && momentum >= FILM_BREAKOUT_MOMENTUM ? 'breakout' : 'hit';
}
export function dropFilm({ platform, genre, rating = 50, word = 50, crowd = 50, hype = 0, draw = 0, budget = 0, price = null, prev = null, dice = 1 }) {
  const cost = filmCost({ platform, budget, price });
  const push = filmPushFor(platform, cost, draw, prev);
  const subs = numbersOf(platform).subscribers;
  // A film is sold on a thumbnail with a face on it: the names count for more than on a season (draw/40).
  const awareness = 0.5 + draw / 25 + hype / 100;
  const affinity = (AFFINITY[platform && platform.archetype] || {})[genre] ?? 1;
  const fresh7 = subs * 0.03 * awareness * PUSH[push] * affinity * dice;
  // A sequel's audience is in its first week, and counted there once (the series' lesson).
  const fans = 0.4 * ((prev && prev.views28) || 0);
  const m = momentumFor(word);
  const starts28 = Math.min(fresh7 * (1 + m + m * m + m * m * m) + fans, subs * 0.6);
  const completion = filmCompletionFor(crowd);
  const finished28 = starts28 * completion;
  const score = finished28 / Math.max(0.1, cost) / filmNumbersOf(platform).target * acclaimFor(platform, rating);
  return {
    movie: true, push, cost: r1(cost), awareness: Math.round(awareness * 100) / 100, opening7: r1(fresh7 + fans), momentum: Math.round(m * 100) / 100,
    views28: r1(starts28), completion: Math.round(completion * 100) / 100, finished28: r1(finished28), reach: r1(starts28 * (1 + m)),
    score: Math.round(score * 100) / 100, outcome: filmOutcomeFor(platform, score, starts28, m), viral: false,
  };
}
// Fame from a film: the face on the thumbnail, and then how many pressed play at the series' rate.
export function filmFame(views28, tier, event = false) {
  const poster = tier === 'supporting' ? 1 : event ? 5 : 3;
  return poster + fameFromViews(views28, tier);
}
// The platform's reasons, in one line, on the night of the verdict.
export function filmLine({ platform, opening7, views28, completion, outcome, cost, sequel = false }) {
  const name = platform ? platform.name : 'The platform';
  const pct = Math.round((completion || 0) * 100);
  const seen = `${opening7}m started it in the first week, ${views28}m in 28 days, and ${pct}% finished it.`;
  if (sequel) return `${seen} ${name} wants a second one.`;
  if (outcome === 'breakout') return `${seen} It kept finding people every week. ${name} is very pleased.`;
  if (outcome === 'hit') return `${seen} More than ${name} paid for.`;
  if (outcome === 'solid') return `${seen} About what ${name} paid for.`;
  return `${seen} For €${Math.round(cost || 0)}m, ${name} wanted more of them.`;
}
export function filmSequelOdds(platform, outcome) {
  const q = filmNumbersOf(platform).sequel;
  return (q && q[outcome]) || 0;
}
// Whether the platform pays for an Asker campaign on its film, the way a studio pays for its picture's.
export function platformBacksCampaign(archetype, rating) {
  const P = FILM[archetype];
  return !!(P && P.backs != null && (rating || 0) >= P.backs);
}

// ── a festival picture and a platform ─────────────────────────────────────────
// Who, besides the distributor, wants a festival picture that sold (plan §7): the genre service for
// horror and science fiction, the premium one for a serious picture rated 70+, the ad-supported one
// for a comedy or a romance rated 60+, the giant only for a name it can put on its home screen.
export function festivalBidder(s, { genre, rating = 0, leadFame = 0 }) {
  if (leadFame >= 60) return platformOfKind(s, 'global');
  if (genre === 'Horror' || genre === 'Sci-Fi') return platformOfKind(s, 'niche');
  if ((genre === 'Drama' || genre === 'Crime' || genre === 'Thriller') && rating >= 70) return platformOfKind(s, 'prestige');
  if ((genre === 'Comedy' || genre === 'Romance') && rating >= 60) return platformOfKind(s, 'library');
  return null;
}
// An unsold festival picture that a platform buys months later (plan §7). Rolled once, on the night.
// Quality, how well it fits the platform that would buy it, the audience a name could bring, and how
// it already failed to sell: a sales agent showed it to every buyer and they passed; you went and they
// met you. Returns the chance (%) and the kind of platform that would buy it.
export function laterSaleOdds({ genre, rating = 0, leadFame = 0, push = null }) {
  if (rating < 55) return { odds: 0, archetype: null };
  const kinds = rating >= 72 ? ['niche', 'library', 'prestige'] : ['niche', 'library'];
  const archetype = kinds.reduce((a, k) => ((AFFINITY[k][genre] ?? 1) > (AFFINITY[a][genre] ?? 1) ? k : a), kinds[0]);
  const fit = AFFINITY[archetype][genre] ?? 1;
  const base = rating >= 75 ? 24 : rating >= 65 ? 14 : 6;
  const history = push === 'agent' ? 0.6 : push === 'went' ? 1.15 : 1;
  return { odds: Math.round(Math.min(40, base * fit * (1 + leadFame / 100) * history)), archetype };
}
