import { count } from '../../engine/text.js';
import { markBillion } from './billion.js';
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
import { setQuote, setFame, setRespect } from '../meta/status.js';
import { addTimeline, showMoment } from '../../engine/timeline.js';
import { regardAfterWorking } from '../life/regard.js';
import { markReleased } from '../../engine/economy.js';
import { appetiteFor, marketAfterRelease } from '../meta/market.js';
import { maybeContinue, streamingRenewal } from './franchise.js';
import { getProject } from './project.js';
import { isFilmScale as isFilm } from './scale.js';
import { platformById, platformOfKind, dropSeason, fameFromViews, hypeFor, OUTCOME_WORD } from './streaming.js';
import { tvTermsOf } from './terms.js';
import { appealShift } from './story.js';
import { dirAppeal, remindLift, reminderOf, holdFactor, retentionLine } from './chapter.js';
import { comebackFloor } from '../meta/standing.js';
import { paid } from './agent.js';
import { reviewsFor } from '../world/critics.js';
import { actorById, applyFilmToActor } from '../world/world.js';
import { tourMultiplier, tourFame } from './tour.js';
import { networkLine } from './franchise.js';
import { typecastAfterCredit, typeFit, roleAcceptance, acceptanceWord } from '../meta/typecast.js';
import { storyAfterCredit } from '../meta/stories.js';
import { addHype, flopHype, hype, hypeSource } from '../meta/hype.js';
import { ensureBudget, planEpisodeCost } from './budget.js';
import { projectOutcome, isSmash, isProfitable, isBomb, isWatched, isSeen } from './outcome.js';
import { asOldTrackSawIt, boxOfficeFor, breakEvenFor, budgetFor, campaignOf, campaignSpend, castDraw,
  festivalResult, FESTIVALS, genreResidual, isWorldHit, PAR, previousPart, reachOf, studioCall,
  studioCampaign, windowWord, wordFor } from './release/theatrical.js';
import { viewersFor } from './release/television.js';
export { viewersFor } from './release/television.js';
export { againstYou, agentCost, answerFestival, answerFestMail, APPEAL, asOldTrackSawIt, boxOfficeFor,
  breakEvenFor, budgetFor, budgetM, CAMPAIGN, campaignOf, campaignSpend, castDraw, demandCore,
  demandFor, expansionFor, FEST_ENERGY, festivalOdds, genreResidual, grossFor, isWorldHit, legsFor,
  openingFor, ORDINARY, PAR, previousPart, previousRating, REACH, reachOf, runStory, SCREENS,
  studioCampaign, windowFor, windowWord, wordFor } from './release/theatrical.js';

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
export { isFilmScale as isFilm } from './scale.js';
import { tvVerdict } from './release/television.js';
import { moneyVerdict } from './release/theatrical.js';
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
//
// There was a genre table here too — horror +9, comedy +8, drama -7 — and it was the second of
// three places the genre was counted (the genre audit, tests/probes/probe_genre_audit.mjs,
// 18 Oct 2026). How many people want a horror picture is APPEAL's question, asked once, in
// demandCore. What the crowd made of THIS picture is this function's, and a drama people liked
// is liked as much as a horror picture people liked. With the table, a drama the critics called
// a 6.0 was scored 53 by its own audience and ran like a picture nobody wanted.
//
// TEMPORARY, AND ONLY FOR TENTPOLES. The table is kept for blockbusters alone, untouched, to hold
// the Billion Club where it was calibrated: without it a star's tentpoles past a billion fell from
// 19.7% to 13.5% on the controlled probe (tests/probes/probe_tentpoles.mjs), because the billions
// were the horror and science-fiction tentpoles riding it. That is a regression target protected for one
// pass, not how a tentpole should work — when tentpoles are next tuned on their own, this goes.
// test_genre_layers.mjs holds both halves: no genre in the crowd below a tentpole, and this one.
export const TENTPOLE_CROWD = { Horror: 9, Comedy: 8, 'Sci-Fi': 6, Thriller: 4, Crime: 0, Romance: 0, Musical: -3, Drama: -7 };
const CROWD_SCALE = { blockbuster: 9, feature: 3, recurring: 2, episode: 0, small: -3, indie: -6, prestige: -6, festival: -11 };
export function audienceFor(s, rel) {
  const r = rel.rating || 0;
  // Half of the critics' opinion, flattened: they are kinder to a bad film and colder
  // about a masterpiece, because they paid for a Friday night either way.
  let v = 46 + (r - 50) * 0.55;
  v += CROWD_SCALE[rel.scale] ?? 0;
  if (rel.scale === 'blockbuster') v += TENTPOLE_CROWD[rel.genre] ?? 0;   // temporary, see above
  // They came for you, and for whoever is on the poster with you.
  v += Math.min(11, Math.max(s.fame || 0, (rel.withFame || 0) * 0.9) / 9);
  // The version you argued for on day one is the whole trade, said plainly (story.js).
  if (rel.take === 'bigger') v += 10;
  if (rel.take === 'about') v -= 9;
  if (rel.take === 'strange') v += rint(-18, 18);
  // A season they have been with for years is a habit; they are gentle with it.
  if ((rel.season || 0) > 2) v += 4;
  // The days you went bigger than anybody asked, and the days you did almost nothing.
  v += Math.max(-12, Math.min(12, rel.sceneCrowd || 0));
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
  // roleAcceptance, not typeFit. Reading the casting number again said that what the audience
  // makes of a performance is decided before anybody sees it, which is the thing this whole
  // rewrite exists to stop doing. A part against type is now a BET: play to your label and it
  // is safe and small; take a stretch and it is judged on whether you landed it. A stretch you
  // land is worth more than anything safe, which is both true and the only reason to take one.
  v += roleAcceptance(s, rel) * 7;
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

// ── opening night ─────────────────────────────────────────────────────────────
// Maxi, at the old card: one generic cinema, a paragraph, a button — "it does not feel like an
// event". It is now the film: its poster, what kind of picture it is, who you played, who made
// it with you, and what is actually known tonight. ONLY what the game knows and what really
// goes into the money — the campaign, the date, what opened against it, the talk about you —
// read off the same fields demandFor and openingFor read. Nothing invented: no screen counts, no
// forecast, and no money at all. The money is the next weeks, and that is the point.
// Anything an old save does not have is left out rather than guessed.
export function premiereCard(s, rel, talk) {
  const film = isFilm(rel.scale);
  const ch = rel.character;
  const character = typeof ch === 'string' ? ch : (ch && ch.name) || null;
  const card = { type: rel.type || null, genre: rel.genre || null, role: rel.role || null,
    you: s.name || null, character, director: rel.director || null, with: rel.with || null, withIcon: !!rel.withIcon,
    tonight: [], sequel: null };
  if (film && rel.campaignTier) {
    const c = campaignOf(rel);
    // Not "the studio's": a festival picture is sold by whoever bought it.
    card.tonight.push({ k: 'campaign', t: `Selling it: ${c.label.toLowerCase()} — ${c.word}.` });
  }
  if (film && rel._window != null) card.tonight.push({ k: 'date', t: `The date: ${windowWord(s.month || 0)}.` });
  if (film && rel._against != null) card.tonight.push({ k: 'against', t: rel._against < 1 ? 'Something enormous opened the same weekend.' : 'Nothing big opened against it.' });
  if (film && rel.tour) card.tonight.push({ k: 'tour', t: 'You did the press tour.' });
  else if (film && rel.tourSkipped) card.tonight.push({ k: 'tour', t: 'You skipped the press tour.' });
  if (film && reminderOf(rel)) card.tonight.push({ k: 'remind', t: `${reminderOf(rel).label}, paid for.` });
  if (film && talk) {
    const h = talk.hype || 0;
    card.tonight.push({ k: 'talk', t: talk.source === 'scandal' ? 'The talk about you this month is a scandal. That does not sell a ticket.'
      : h >= 45 ? 'Everybody is talking about you this month.' : h >= 20 ? 'People are talking about you this month.' : 'Nobody much is talking about you this month.' });
  }
  // A sequel, from the part before it and nothing else: which part, how long ago, how the room took it.
  const prev = film ? previousPart(s, rel) : null;
  if (prev) {
    const gap = Math.max(0, (s.year || 0) - (prev.year || s.year || 0));
    const room = Number.isFinite(prev.audience) ? prev.audience : null;
    const took = room == null ? '' : room >= 70 ? ` The audience loved that one (${(room / 10).toFixed(1)}).`
      : room >= 55 ? ` The audience liked that one well enough (${(room / 10).toFixed(1)}).` : ` The audience did not care for that one (${(room / 10).toFixed(1)}).`;
    card.sequel = `Part ${rel.part}. The last one opened ${gap === 0 ? 'this year' : gap === 1 ? 'a year ago' : `${gap} years ago`}.${took}`;
  }
  return card;
}
// The words under the poster: short, and different for the kind of night it is.
export function premiereBody(rel) {
  const after = ' Nobody knows anything yet — not the reviews, not the money, not you.';
  if (rel.scale === 'blockbuster') return 'Searchlights, barriers, a carpet two blocks long, and a studio that needs this one to land.' + after;
  if (rel.scale === 'feature') return 'A full house, the carpet, the same four questions eleven times. Then the lights went down and the film belonged to the room.' + after;
  return 'A smaller room, but the right people are in it. A picture this size lives on what they tell each other.' + after;
}
// Old saves. `critical` arrived after most of a long career was made — Alex Moon had it on 2 of
// 52 credits — so the column's verdict and the "why" line under SMASH were missing on nearly
// every film. It is criticalOf(rating), set at close for every credit, so a finished credit with
// a rating gets it at load (state/store.js), silently and only where missing. `needed` is not
// filled the same way: it depends on the marketing campaign, which old credits did not record,
// and re-deriving it contradicted the stored verdict on 3 of 27 of his films.
export function settleCritical(s) {
  for (const c of [...(s.filmography || []), ...(s.discography || [])]) {
    if (c && !c.running && !c.critical && !c.minor && Number.isFinite(c.rating)) c.critical = criticalOf(c.rating);
  }
  return s;
}
export function criticalOf(rating) {
  const r = rating || 0;
  if (r >= 85) return 'acclaimed';
  if (r >= 70) return 'well received';
  if (r >= 55) return 'mixed';
  if (r >= 40) return 'poorly reviewed';
  return 'panned';
}
// What it did to the career, which is neither of the other two and is the one the player is
// actually playing for. Built from what the close of the run really moved, not from the money.
export function careerOf(d) {
  const resp = d.respect || 0, fame = d.fame || 0, noms = d.noms || 0;
  if (resp >= 8 || noms >= 3) return { word: 'a major prestige win', tone: 'gold' };
  if (fame >= 9) return { word: 'this is the one people will know you for', tone: 'gold' };
  if (resp >= 4) return { word: 'the right people noticed', tone: 'good' };
  if (fame >= 4) return { word: 'more people know your name', tone: 'good' };
  if (fame <= -2 || resp <= -5) return { word: 'this cost you', tone: 'bad' };
  if (resp <= -2) return { word: 'prestige damage', tone: 'bad' };
  return { word: 'it happened', tone: 'flat' };
}
// A picture is judged on its money (release/theatrical.js moneyVerdict), a season on its audience
// (release/television.js tvVerdict). A platform's season has its own words, set at the drop.
export function verdictOf(rel) {
  return isFilm(rel.scale) ? moneyVerdict(rel) : tvVerdict(rel);
}

// Booked at wrap, opens months later. Nothing about fame moves until it does.
export function scheduleRelease(s, credit, p) {
  // A platform's season goes out every episode at once, four to seven months after the last day
  // (Streaming V1, plan §5). Which market it is in is its project's (career/project.js).
  const proj = getProject(s, p.projectId);
  const streaming = !!(proj && proj.medium === 'streaming');
  const wait = streaming ? rint(4, 7) : postProduction(p.scale || 'feature');
  const rel = {
    id: uid(s, 'rel'),
    ...(streaming ? { streaming: true } : {}),
    ...tvTermsOf(p),
    projectId: p.projectId ?? null,   // career/project.js
    title: credit.title, role: credit.role, type: credit.type, genre: credit.genre,
    scale: p.scale || 'feature', tier: p.tier || 'lead', season: p.season || 0,
    // What it cost and what it needed (career/budget.js), carried to the night it closes.
    budget: p.budget ?? null, needs: p.needs ?? null,
    episodes: p.episodes || 0, part: p.part || 1, salary: credit.salary,
    rating: credit.rating, status: credit.status, worldHit: credit.status === 'World Hit',
    // The shoot where everything landed (production.js). It has to ride all the way to the
    // filmography, and the credit is REBUILT on opening night from this object — so a field
    // that stops here is a field that does not exist. Mine stopped here and was dead from the
    // moment it was committed: across six careers, 23 films rated 90+ and not one credit
    // carried the flag at all, which is what the probe was for.
    exceptional: !!credit.exceptional,
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
    // And what you decided to do on the days that mattered. Playing it big plays better in the
    // room and worse in the column; stripping it back does the reverse. career/scenes.js.
    sceneCrowd: p.sceneCrowd || 0,
    // What happened while they were shooting it. Written at wrap (production.js onSetStory)
    // and carried through post, because the credit that reaches the filmography is a NEW
    // object built on opening night — anything not carried here is simply lost.
    onSet: credit.onSet || null,
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
      ...tvTermsOf(p),
      projectId: p.projectId ?? null,   // the next season or part is born from THIS project
      // maybeContinue receives this job, not the original crew. Preserve the
      // person the player will negotiate with, including their contact ID.
      showrunner: ((p.crew || [])[0] || {}).name || null,
      showrunnerId: ((p.crew || [])[0] || {}).knownId || null,
      months: p.months, episodes: p.episodes || 0, episodeFee: p.episodeFee || 0, baseSalary: p.baseSalary || p.salary, arc: p.arc || null,
      season: p.season || 0, part: p.part || 1, tier: p.tier, scale: p.scale, stability: p.stability,
      // What this one cost, so the next part is priced off it (franchise.js, budget.js sequelBudget).
      budget: p.budget ?? null, needs: p.needs ?? null,
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
  ensureBudget(rel, p.id || credit.title);   // a set from before budgets: priced now, the same way every time
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

function open(s, rel) {
  const film = isFilm(rel.scale);
  // What was being said about you as it opened — the number demandFor reads, taken before the
  // opening's own noise lands on top of it below.
  const talk = { hype: hype(s), source: hypeSource(s) };
  // A festival picture is decided in the room, before anybody else sees it: a prize sells
  // it, a buyer sells it a little, and no buyer means there is nothing to open.
  let fest = null;
  if (rel.scale === 'festival') {
    fest = { name: pick(FESTIVALS), result: festivalResult(rel.rating, s.fame || 0, rel.tier !== 'supporting', rel.festPush), push: rel.festPush || null };
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
  let stream = null;
  if (fest && fest.result === 'unsold') rel.finalGross = 0;
  // The tour, the reminder campaign and a known name are all AWARENESS, so they are inside
  // demandFor now rather than multiplied onto the finished total. Multiplying the total said
  // that a trailer campaign makes a film play longer, which is the opposite of what it does.
  else if (film) rel.finalGross = boxOfficeFor(s, rel);
  // A platform's season: its own audience, judged on its own terms (career/streaming.js).
  else if (rel.streaming) { stream = dropStreaming(s, rel, talk); rel.viewers = stream.views28; }
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
  const verdict = stream ? stream.outcome : verdictOf({ ...rel, boxOffice: rel.finalGross || 0 });

  // The credit exists the night it opens. What it WAS does not — the score and the money
  // land when the run ends, which is the difference between a premiere and a verdict.
  const credit = {
    title: rel.title, role: rel.role, type: rel.type, genre: rel.genre, salary: rel.salary,
    ...tvTermsOf(rel),
    projectId: rel.projectId ?? null,
    rating: rel.rating, status: rel.status, year: s.year, season: rel.season,
    part: rel.part > 1 ? rel.part : 0, episodes: rel.episodes,
    // In cinemas. Everything below is provisional until runTick closes it.
    running: true, weeks: 0, weeksTotal: stream ? STREAM_WEEKS : runWeeks(rel, verdict), openedAt: (s.year || 0) * 12 + (s.month || 0),
    budget: rel.budget ?? null, needs: rel.needs ?? null,   // what it cost, for the filmography and the press (budget.js)
    boxOffice: 0, viewers: rel.viewers || 0, openViewers: rel.openViewers || 0, endViewers: rel.endViewers || 0,
    // What the room thought, which is not what the column thought. See audienceFor above.
    // The credit carries the RECEPTION — out of a hundred, what splitLine and the critics
    // read. The viewers live on openViewers/endViewers and always did.
    audience: rel.reception != null ? rel.reception : null,
    direction: rel.direction || null, remind: rel.remind || null, character: rel.character || null,
    onSet: rel.onSet || null,
    verdict: 'in cinemas', score: null,
    // Carried for the Asker season: what kind of thing it was, and whether it was pushed.
    scale: rel.scale, tier: rel.tier, prestigeScore: rel.prestigeScore, director: rel.director || null,
    premise: rel.premise || null, take: rel.take || null, potential: rel.potential || null,
    campaignShare: rel.campaign ? 0.65 : 0,
    exceptional: !!rel.exceptional,
    with: rel.with || null, withId: rel.withId || null, withIcon: !!rel.withIcon, withFame: rel.withFame || 0,
    festival: fest,
    // A platform's three numbers, and the ones under them (career/streaming.js). The score stays off
    // every screen; the cost is said only when it is the reason a show ends.
    ...(stream ? { streaming: true, platformId: stream.platform.id, views7: stream.opening7, views28: stream.views28, completion: stream.completion,
      finished28: stream.finished28, reach: stream.reach, seasonCost: stream.cost, push: stream.push, platformScore: stream.score } : {}),
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
      // The film and who made it, and nothing about a release that is not going to happen.
      genre: rel.genre, scale: rel.scale, card: premiereCard(s, { ...rel, campaignTier: null }, null),
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
  // A drop has no carpet: a platform's season makes a name only from how many saw it (plan §3).
  if (!stream) setFame(s, (s.fame || 0) + opening * headroom(118, s.fame));
  if (fest && fest.result === 'prize') setRespect(s, (s.respect || 0) + 4 * Math.max(0.16, 1 - (s.respect || 0) / 112));
  // The finished thing is kept ON the release so runTick can close it out properly.
  credit._rel = { rating: rel.rating, worldHit: rel.worldHit, tier: rel.tier, scale: rel.scale, budget: rel.budget ?? null, projectId: rel.projectId ?? null,
    salary: rel.salary, finalGross: rel.finalGross || 0, job: rel.job, film,
    // The campaign has to survive to closeRun. The verdict is measured against what the thing
    // cost to make AND to sell, and without this line every picture would be judged at the end
    // against a default campaign instead of the one it actually had.
    campaignTier: rel.campaignTier, genre: rel.genre, part: rel.part, appetite: rel._appetite ?? null, oldAppetite: rel._oldAppetite ?? null,
    // Read by closeRun and by the critics. These were read off _rel and never written to it,
    // so a carried set and a part got over dinner were both invisible once the run closed.
    meter: rel.meter || 0, viaPartner: rel.viaPartner || null, fellApart: !!rel.fellApart, backend: rel.backend || 0, merch: rel.merch || 0, potential: rel.potential || null,
    moments: rel.moments || [], crewKnown: rel.crewKnown || [],
    with: rel.with || null, withIcon: !!rel.withIcon,
    stream: stream ? { outcome: stream.outcome, views28: stream.views28, completion: stream.completion, finished28: stream.finished28, platformId: stream.platform.id } : null };
  // BY ID, never by reference. A save is JSON, and JSON.parse hands back a fresh object for
  // every entry — so a list holding the credit itself pointed at a copy the moment anybody
  // reloaded, and the run finished on the copy while the credit in the filmography sat at
  // week four with no score, forever. Any film in cinemas when you closed the game was lost.
  credit.id = rel.id;
  (s.running = s.running || []).push(rel.id);

  // Television does not open, it goes out. A soap starts on a Tuesday at seven; a pilot
  // airs; a prestige season drops at midnight. Maxi: "for a soap there is no premiere — a
  // TV set, the sound of the show, a new soap starting season one on television."
  // A platform's season does not make you a television face (plan §12: cross-market typecasting is stage 4).
  credit.tv = !film && !stream;
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
    : stream ? `"${rel.title}" dropped on ${stream.platform.name} — all ${rel.episodes || 8} episodes at once. The platform will not say a number for four weeks.`
    : film
    ? `"${rel.title}" opened tonight. Now everybody finds out what it is.`
    : tvKind === 'soap' ? `"${rel.title}" went out at seven. Your mother rang before the credits.`
    : tvKind === 'prestige' ? `"${rel.title}" dropped at midnight. Everybody you know is on episode three by morning.`
    : `"${rel.title}" aired tonight.`;
  addTimeline(s, fest ? (fest.result === 'prize' ? `"${rel.title}" won at ${fest.name}.` : `"${rel.title}" sold at ${fest.name}.`) : film ? `"${rel.title}" opened.` : stream ? `"${rel.title}" dropped on ${stream.platform.name}.` : `"${rel.title}" went out.`);
  showMoment(s, fest ? {
    id: 'premiere', kind: 'good', festival: fest.name, result: fest.result, genre: rel.genre, scale: rel.scale, title: rel.title,
    card: premiereCard(s, rel, talk),
    verdict: fest.result === 'prize' ? 'the jury prize' : 'sold on the Sunday',
    body: fest.result === 'prize'
      ? `A cinema at nine in the morning, a jury in the front row, and at the end of the week your title read out in a room of people who buy films for a living. Three distributors by Sunday. The trades used the word "discovery", and they used your name.`
      : `Two screenings, a good one and a quiet one, and on the Sunday a distributor who liked the quiet one. A small release, a few cities, a poster with the laurels on it. It exists now. What it does is the next few weeks.`,
  } : film ? {
    id: 'premiere', kind: 'good', title: rel.title, verdict: 'opening night', genre: rel.genre, scale: rel.scale,
    card: premiereCard(s, rel, talk), body: premiereBody(rel),
  } : {
    id: 'premiere', kind: 'good', tv: stream ? 'streaming' : tvKind, genre: rel.genre, scale: rel.scale, title: rel.title, verdict: (rel.season || 0) > 1 ? `season ${rel.season}` : 'season one',
    episodes: rel.episodes || 0, card: premiereCard(s, rel, null),
    body: stream
      ? `Every episode at once, on ${stream.platform.name}. No carpet and no first night — a title on a home screen, between two others, and four weeks before the platform says how many got to the end.`
      : tvKind === 'soap'
      ? `Seven o'clock, a Tuesday. The theme, the titles, your face for the first time in ${(rel.episodes || 25)} episodes of it. Nobody watches a soap for the reviews — they watch it every week, or they do not, and you find out over the run.`
      : tvKind === 'prestige'
      ? `Every episode at once, at midnight. No carpet, no room — a screen in a kitchen somewhere, and a number the network will not say out loud for a few weeks yet.`
      : `The episode went out. You watched it on your own phone, on the sofa, and it was over in an hour. Whether anybody else did is the next few weeks' question.`,
  });

  return s;
}

// ── a platform's season (Streaming V1) ────────────────────────────────────────
// Four weeks to the number the platform judges, and a month of the tail after it.
const STREAM_WEEKS = 8;
// On a supporting part the name above yours is the platform's own lead, a known face.
const HOUSE_LEAD = 45;
function dropStreaming(s, rel, talk) {
  const pr = getProject(s, rel.projectId) || {};
  const platform = platformById(s, pr.platformId) || platformOfKind(s, 'library');
  const rootOf = (t) => String(t || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();
  const root = rootOf(rel.title);
  // Last season on a platform: its finishers are this season's first week, and a Hit is pushed hard.
  const prev = (rel.season || 1) > 1 ? (s.filmography || []).find((c) => c.streaming && c.season === rel.season - 1 && rootOf(c.title) === root) : null;
  const names = rel.tier === 'supporting' ? [HOUSE_LEAD, s.fame || 0] : [s.fame || 0, rel.withFame || 0];
  const drop = dropSeason({ platform, genre: rel.genre, episodes: rel.episodes || 8, season: rel.season || 1,
    rating: rel.rating || 0, word: wordFor(rel), hype: (talk && talk.hype) || 0, draw: castDraw(names),
    salaryM: (rel.salary || 0) / 1e6,
    episodeCost: pr.episodeCost ?? planEpisodeCost({ seed: pr.seriesId || rel.projectId || root, genre: rel.genre, archetype: platform.archetype }),
    legacy: pr.legacy || 0,
    prev: prev ? { finished28: prev.finished28 || 0, views28: prev.views28 || 0, outcome: prev.verdict } : null,
    dice: 0.8 + Math.random() * 0.45 });
  return { platform, ...drop };
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
  const verdict = r.stream ? r.stream.outcome : verdictOf({ scale: r.scale, budget: r.budget ?? credit.budget ?? null, rating: r.rating, boxOffice: credit.boxOffice,
    // What it cost to sell, so the bar is the one this picture actually had to clear.
    campaignTier: r.campaignTier,
    // Television needs to know who turned up; without these it fell back to the column.
    type: credit.type, endViewers: credit.endViewers, viewers: credit.viewers });
  credit.verdict = verdict;
  credit.needed = breakEvenFor({ scale: r.scale, campaignTier: r.campaignTier, budget: r.budget ?? credit.budget ?? null });
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
  const film = r.film;

  // The score buys respect; the money buys reach. They are different currencies, and both
  // of them are settled here rather than on opening night.
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
  // What the three of them say, measured across this close rather than inferred from the money.
  credit.critical = criticalOf(r.rating);
  const _fameBefore = s.fame || 0, _respBefore = s.respect || 0;
  const bySkill = { tentpole: 9, lead: 5, supporting: 2 }[r.tier] || 2;
  let fame = bySkill + (r.rating >= 85 ? 4 : 0) + (r.worldHit ? 25 : 0);
  // A platform's season makes a name from how many pressed play, not from the band it landed in.
  if (r.stream) fame = fameFromViews(r.stream.views28, r.tier);
  // Hype: where the talk comes from this year. A hit replaces whatever was there; a flop
  // takes it off the lead, and only a little off a supporting part. See meta/hype.js.
  // How it turned out, asked through the one place that knows the words (career/outcome.js).
  const o = projectOutcome(s, credit);
  if (r.stream) { const h = hypeFor(r.stream.outcome, r.tier); if (h) addHype(s, h, 'hit'); }
  else if (r.worldHit) addHype(s, 85, 'hit');
  else if (isSmash(o)) addHype(s, 70, 'hit');
  else if (isProfitable(o) || r.rating >= 80) addHype(s, r.tier === 'supporting' ? 30 : 50, 'hit');
  else if (!film && (isWatched(o) || credit.renewal === 'renewed')) addHype(s, r.tier === 'supporting' ? 26 : (credit.renewal === 'renewed' ? 48 : 40), 'hit');
  else if (!film && isSeen(o) && r.tier !== 'supporting') addHype(s, 22, 'hit');
  else if (isBomb(o)) flopHype(s, r.tier);
  if (isSmash(o)) fame += 8;
  else if (isProfitable(o)) fame += 3;
  // A flop cuts what the film does for your name — and at the top it takes some of the
  // name with it. Maxi: "at the top there is nothing to lose." A supporting part is not
  // blamed for a picture; the lead is, and the bigger the name the louder the blame.
  else if (isBomb(o)) fame = r.tier !== 'supporting' && r.scale !== 'episode' && (s.fame || 0) >= 45 ? -(2 + ((s.fame || 0) - 45) / 14) : Math.max(1, fame - 3);
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
    const over = Math.max(0, (credit.boxOffice || 0) - budgetFor({ scale: r.scale, budget: r.budget ?? credit.budget ?? null }) * 2.2);
    const cut = Math.round(over * (r.backend / 100));
    if (cut > 0) { paid(s, cut, `"${credit.title}" — ${r.backend}% of the gross`); credit.backendPaid = cut; }
    else addTimeline(s, `"${credit.title}" never passed break-even. Your points are worth nothing.`, true);
  }

  // The gross means nothing on its own — "a billion" is only a triumph next to what it cost.
  // The industry never quotes one without the other and neither should this.
  const bud = budgetFor({ scale: r.scale, budget: r.budget ?? credit.budget ?? null });
  // Past a billion it is written as a billion. "€1163m" is a number you have to stop and count
  // the digits of, which is the opposite of what that line is for. This half came in with an
  // uncommitted cut to the opening constant that was reverted — the cut made a billion
  // impossible and broke three tests; saying the number properly was right and stayed.
  const money = r.stream ? `${r.stream.views28}m in 28 days · ${Math.round((r.stream.completion || 0) * 100)}% finished`
    : film
    ? `${credit.boxOffice >= 1e9 ? `€${(credit.boxOffice / 1e9).toFixed(2)}bn` : `€${(credit.boxOffice / 1000000).toFixed(credit.boxOffice >= 100000000 ? 0 : 1)}m`} on a €${(bud / 1000000).toFixed(0)}m film, ${credit.weeksTotal} weeks`
    : (credit.openViewers && credit.endViewers)
      ? `${credit.openViewers}m for the first, ${credit.endViewers}m for the last`
      : `${credit.viewers}m watching`;
  const score = credit.score.toFixed(1);
  const line = r.worldHit
    ? `🌍 "${credit.title}" is a phenomenon. ${score}/10 · ${money}.`
    : `"${credit.title}" finished its run. ${score}/10 · ${money} · ${r.stream ? OUTCOME_WORD[verdict] : verdict}.`
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
  // Only now does anyone know whether there is a second one. A platform decides on what the next
  // season would cost (franchise.js streamingRenewal); everything else as it always did.
  let streamLine = null;
  if (r.job && r.stream) {
    const sr = streamingRenewal(s, credit, r.job);
    if (sr.offer) (s.offers = s.offers || []).push(sr.offer);
    streamLine = sr.line;
  } else if (r.job) {
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
    lateShelf: /Character lead|matriarch|Elder|Grandparent/.test(credit.role || ''),
    series: !film });   // a season is reviewed as a series, not a film (world/critics.js asSeries)
  // Standing next to an icon is worth something on its own: the photographs, the poster,
  // the fact that they said yes to a film you were in.
  if (r.withIcon) { setFame(s, (s.fame || 0) + 3 * headroom(s.fame)); setRespect(s, (s.respect || 0) + 2 * soft(112, s.respect)); addTimeline(s, `Your name is on a poster next to ${r.with}'s. People noticed.`); }
  // The third verdict: what the thing did to you. Read off what actually moved.
  credit.careerFame = Math.round(((s.fame || 0) - _fameBefore) * 10) / 10;
  credit.careerRespect = Math.round(((s.respect || 0) - _respBefore) * 10) / 10;
  credit.career = careerOf({ fame: credit.careerFame, respect: credit.careerRespect }).word;
  credit.careerTone = careerOf({ fame: credit.careerFame, respect: credit.careerRespect }).tone;
  // And if the part was a stretch, whether the room bought you in it (meta/typecast.js).
  credit.acceptance = acceptanceWord(s, { genre: credit.genre, scale: r.scale, type: credit.type,
    perEpisode: !!credit.episodes, rating: r.rating });
  typecastAfterCredit(s, credit);
  storyAfterCredit(s, credit);
  showMoment(s, {
    id: 'verdict', tv: film ? null : r.stream ? 'streaming' : (r.scale === 'recurring' ? 'soap' : r.scale === 'prestige' ? 'prestige' : 'episode'), kind: r.rating >= 70 || verdict === 'smash' || verdict === 'hit' || verdict === 'breakout' ? 'good' : 'bad',
    title: credit.title, score, money, verdict, reviews: credit.reviews, genre: credit.genre, scale: r.scale,
    // Television: the network's number against yours, and what it decided.
    network: r.stream ? streamLine : !film && r.scale !== 'episode' && credit.renewal ? networkLine(credit.type, credit.endViewers || credit.viewers, null, r.rating, credit.renewal) : null,
    // A platform's three numbers (BigMoment draws them in place of the box office).
    streaming: r.stream ? { views: `${r.stream.views28}m`, completion: `${Math.round((r.stream.completion || 0) * 100)}%`, outcome: OUTCOME_WORD[verdict] } : null,
    // How many were there on the first night and how many on the last. Maxi asked how a
    // season is measured; this is the answer, on the night it is answered.
    retention: !film && !r.stream && r.scale !== 'episode' ? retentionLine(credit.openViewers, credit.endViewers) : null,
    // When the column and the room have seen different films. career/release.js splitLine
    split: splitLine(r.rating, credit.audience),
    // What the run cost and took, kept for the money card the verdict will get (gross, total
    // cost, studio revenue, profit). Maxi, at a 5.9 that took €216m on a €90m film and was called
    // "broke even": "how much does the film itself cost?" A one-line "it had to take €209m" was
    // tried and left out of main: "needed" is one more number to decode, not an answer.
    // Nothing draws this yet; tests/test_breakeven_card.mjs keeps it honest until something does.
    breakEven: film && credit.needed ? { need: credit.needed, budget: bud, sell: Math.round(campaignSpend(r) * 1000000), gross: credit.boxOffice || 0, verdict } : null,
    renewal: credit.renewal || null,
    body: r.worldHit
      ? 'Nobody expected this. It has stopped being a film and started being an event.'
      : r.rating >= 85 ? 'The reviews are the kind people screenshot.'
      : r.rating >= 70 ? 'Well received. Not the one they will remember you for, but a good run.'
      : r.rating >= 50 ? 'It came and went. Some people liked it.'
      : verdict === 'bomb' ? 'The reviews are bad and the numbers are worse. Somebody will be blamed.'
      : 'It did not land. These are the ones you leave off the reel.',
  });
  // A thousand million euros, which is not a verdict about anything and does not pretend to be
  // one: it sits beside the verdict and the world hit, and all three can be true at once.
  // career/billion.js.
  //
  // AFTER the run card is queued, not before. The billion puts its two screens at the front of
  // the queue so a career event does not arrive fourth — and marking it earlier meant it
  // jumped ahead of the card announcing that the run had ended, so the game said "a billion"
  // and then "the run is over", in that order. Played by hand, that reads backwards.
  if (film) markBillion(s, credit);
  return s;
}
