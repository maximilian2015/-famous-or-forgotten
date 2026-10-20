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
// an even chance. Result, 40 careers that take streaming work, two runs: first seasons Miss 28–29% ·
// Solid 42–43% · Hit 26–29% · Breakout 1–2%, renewed 58%; later seasons Hit 56–61%, Breakout 6–10%; no
// cliff between Solid and Hit.
export const ARCHETYPES = {
  global: { subscribers: 260, target: 0.21, breakout: 75, renew: 0.85, cap: 5, big: 120, low: 30, word: 'the giant' },              // [0.15 · 60 · 1.0]
  prestige: { subscribers: 90, target: 0.135, breakout: 35, renew: 0.65, cap: 4, big: 80, low: 25, word: 'the premium service' },   // [0.07 · 25 · 0.8]
  library: { subscribers: 150, target: 0.31, breakout: 40, renew: 0.65, cap: 6, big: 40, low: 22, maxSeason: 40, maxFee: 8, word: 'the ad-supported service' },   // [0.10 · 30 · 0.7]
  niche: { subscribers: 25, target: 0.073, breakout: 9, renew: 0.7, cap: 4, big: 30, low: 12, maxFee: 4, word: 'the genre service' },          // [0.045 · 8 · 0.8]
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
export function outcomeFor(platform, score, views28) {
  if (score < MISS_BELOW) return 'miss';
  if (score < HIT_FROM) return 'solid';
  return views28 >= numbersOf(platform).breakout ? 'breakout' : 'hit';
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
    score: Math.round(score * 100) / 100, outcome: outcomeFor(platform, score, views28),
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
