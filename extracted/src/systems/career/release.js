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
import { markReleased } from '../../engine/economy.js';
import { hotGenre, GENRES } from '../meta/news.js';
import { maybeContinue } from './franchise.js';
import { appealShift } from './story.js';
import { comebackFloor } from '../meta/standing.js';
import { paid } from './agent.js';
import { reviewsFor } from '../world/critics.js';
import { actorById, applyFilmToActor } from '../world/world.js';
import { tourMultiplier, tourFame } from './tour.js';
import { networkLine, slotNorm } from './franchise.js';
import { typecastAfterCredit, typeFit } from '../meta/typecast.js';

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
// What a competent, averagely-received picture of this size takes. Roughly 2.2× the
// budget, which is about where a studio stops losing money once marketing is paid.
const PAR = 2.25;
// Television does not sell tickets. It has an audience, in millions per episode.
const VIEWERS = { episode: [0.4, 6], recurring: [1, 9], prestige: [2, 14] };

// A good film sells more than a bad one, and the gap is enormous — the difference
// between a 9 and a 3 is not thirty per cent, it is an order of magnitude.
function qualityPull(rating) {
  if (rating >= 90) return 2.30;
  if (rating >= 80) return 1.60;
  if (rating >= 70) return 1.15;
  if (rating >= 60) return 0.80;
  if (rating >= 45) return 0.50;
  return 0.25;
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
function luck() { return 0.5 + (Math.random() + Math.random()) * 0.55; }

export function isFilm(scale) { return ['small', 'indie', 'festival', 'feature', 'blockbuster'].includes(scale); }

// The commercial result. Star power sells tickets — that is what a name is FOR.
// One formula for everybody: your films and the ones the rest of the world makes in the
// same year sit on the same list, so they have to be priced by the same arithmetic.
export function grossFor({ scale, rating, genre, fame = 0, trend = false, appealMod = 1 }) {
  const budget = BUDGET[scale];
  if (!budget) return 0;
  const star = 0.7 + (fame || 0) / 180;                    // 0.7 at nobody, 1.26 at icon
  const gross = budget * PAR * qualityPull(rating) * (APPEAL[genre] || 1) * (appealMod ?? 1) * star * (trend ? 1.25 : 1) * luck();
  return Math.round(gross * 1000000);
}
export function boxOfficeFor(s, rel) {
  // The bigger name on the poster sells the tickets. A nobody opposite an icon opens like
  // an icon's film, mostly — which is the whole reason to want to be in one.
  const fame = Math.max(s.fame || 0, (rel.withFame || 0) * 0.85);
  return grossFor({ scale: rel.scale, rating: rel.rating, genre: rel.genre, fame, trend: rel.genre === hotGenre(s), appealMod: rel.appealMod ?? 1 });
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
  const base = span[0] + Math.random() * (span[1] - span[0]);
  return Math.round(base * qualityPull(rel.rating) * star * 10) / 10;
}
// What the season before this one drew, if there was one.
function previousAudience(s, rel) {
  if (!rel.season || rel.season < 2) return null;
  const root = String(rel.title || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();
  const prev = [...(s.filmography || []), ...(s.discography || [])]
    .find((c) => c.season === rel.season - 1
      && String(c.title || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim() === root);
  return prev && prev.viewers > 0 ? prev.viewers : null;
}

// Did it make its money back? This is what the industry actually remembers.
export function budgetFor(rel) { return Math.round((BUDGET[rel.scale] || 0) * 1000000); }
export function verdictOf(rel) {
  if (!isFilm(rel.scale)) return rel.rating >= 78 ? 'watched' : rel.rating >= 55 ? 'seen' : 'ignored';
  const budget = budgetFor(rel);
  if (!budget) return 'seen';
  const ratio = (rel.boxOffice || 0) / budget;
  if (ratio >= 4) return 'smash';
  if (ratio >= 2.2) return 'profitable';
  if (ratio >= 1.1) return 'broke even';
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
    meter: p.meter || 0, viaPartner: p.viaPartner || null, fellApart: !!p.fellApart, backend: p.backend || 0,
    // Who was on the poster with you, if it was somebody. See production.js makeCrew.
    with: p.with || null, withId: p.withId || null, withFame: p.withFame || 0, withIcon: !!p.withIcon,
    // What the version you shot does to the box office, and the line it was pitched on.
    appealMod: appealShift(p), premise: p.premise || credit.premise || null, take: credit.take || null,
    joined: !!p.joined, audience: p.audience || 0,
    due: (s.year || 0) * 12 + (s.month || 0) + wait, wait,
    // Whether the thing gets a second season or a sequel is decided on the numbers, so
    // the shoot has to keep enough of itself alive to be asked that question later.
    job: {
      title: p.title, seriesTitle: p.seriesTitle, role: p.role, type: p.type, genre: p.genre, salary: p.salary,
      months: p.months, episodes: p.episodes || 0, episodeFee: p.episodeFee || 0, baseSalary: p.baseSalary || p.salary, arc: p.arc || null,
      season: p.season || 0, part: p.part || 1, tier: p.tier, scale: p.scale, stability: p.stability,
      prestigeScore: p.prestigeScore, optioned: !!p.optioned, optionParts: p.optionParts || 0,
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
export function festivalOdds(rating) {
  const prize = rating >= 84 ? 48 : rating >= 76 ? 32 : rating >= 68 ? 18 : rating >= 60 ? 8 : 2;
  const sold = rating >= 76 ? 62 : rating >= 66 ? 48 : rating >= 56 ? 32 : rating >= 46 ? 16 : 5;
  return { prize, sold };
}
function festivalResult(rating) {
  const o = festivalOdds(rating);
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
    fest = { name: pick(FESTIVALS), result: festivalResult(rel.rating) };
    if (fest.result === 'prize') { rel.appealMod = (rel.appealMod ?? 1) * 2.2; rel.rating = clamp(rel.rating + 3, 0, 96); }
    else if (fest.result === 'sold') rel.appealMod = (rel.appealMod ?? 1) * 1.3;
  }
  // What it will end up taking. The player does not see this number yet — it arrives a
  // few thousand at a time, week by week, which is how anybody actually experiences it.
  // The press tour, or the lack of one, is the studio's marketing working or not — see tour.js.
  // A sequel or a later season opens on a name people know: a tenth more, before anybody
  // has seen it. Maxi: "the system remembers it was a good picture and gives benefits."
  const known = ((rel.part || 1) > 1 || (rel.season || 0) > 1) ? 1.12 : 1;
  if (fest && fest.result === 'unsold') rel.finalGross = 0;
  else if (film) rel.finalGross = Math.round(boxOfficeFor(s, rel) * tourMultiplier(rel) * known);
  else rel.viewers = Math.max(0.1, Math.round(viewersFor(s, rel) * tourMultiplier(rel) * known * 10) / 10);   // millions, one decimal — rounding to a whole made a bad soap draw nobody
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
    boxOffice: 0, viewers: rel.viewers || 0, verdict: 'in cinemas', score: null,
    // Carried for the Asker season: what kind of thing it was, and whether it was pushed.
    scale: rel.scale, tier: rel.tier, prestigeScore: rel.prestigeScore, director: rel.director || null,
    premise: rel.premise || null, take: rel.take || null,
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
    // Read by closeRun and by the critics. These were read off _rel and never written to it,
    // so a carried set and a part got over dinner were both invisible once the run closed.
    meter: rel.meter || 0, viaPartner: rel.viaPartner || null, fellApart: !!rel.fellApart, backend: rel.backend || 0,
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
    id: 'premiere', kind: 'good', festival: fest.name, result: fest.result, title: rel.title,
    verdict: fest.result === 'prize' ? 'the jury prize' : 'sold on the Sunday',
    body: fest.result === 'prize'
      ? `A cinema at nine in the morning, a jury in the front row, and at the end of the week your title read out in a room of people who buy films for a living. Three distributors by Sunday. The trades used the word "discovery", and they used your name.`
      : `Two screenings, a good one and a quiet one, and on the Sunday a distributor who liked the quiet one. A small release, a few cities, a poster with the laurels on it. It exists now. What it does is the next few weeks.`,
  } : film ? {
    id: 'premiere', kind: 'good', title: rel.title, verdict: 'opening night',
    body: 'You stood on a carpet and answered the same four questions eleven times, and then '
      + 'the lights went down and you watched it with strangers. Nobody knows anything yet — '
      + 'not the reviews, not the money, not you. That comes over the next few weeks.',
  } : {
    id: 'premiere', kind: 'good', tv: tvKind, title: rel.title, verdict: (rel.season || 0) > 1 ? `season ${rel.season}` : 'season one',
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
  const verdict = verdictOf({ scale: r.scale, rating: r.rating, boxOffice: credit.boxOffice });
  credit.verdict = verdict;
  const film = r.film;

  // The score buys respect; the money buys reach. They are different currencies, and both
  // of them are settled here rather than on opening night.
  const bySkill = { tentpole: 9, lead: 5, supporting: 2 }[r.tier] || 2;
  let fame = bySkill + (r.rating >= 85 ? 4 : 0) + (r.worldHit ? 25 : 0);
  if (verdict === 'smash') fame += 8;
  else if (verdict === 'profitable') fame += 3;
  // A flop cuts what the film does for your name — and at the top it takes some of the
  // name with it. Maxi: "at the top there is nothing to lose." A supporting part is not
  // blamed for a picture; the lead is, and the bigger the name the louder the blame.
  else if (verdict === 'bomb') fame = r.tier !== 'supporting' && (s.fame || 0) >= 45 ? -(2 + ((s.fame || 0) - 45) / 14) : Math.max(1, fame - 3);
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
    s.media = Math.min(100, (s.media || 0) + 28);
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
    actorName: s.name, meter: r.meter, fellApart: r.fellApart, viaPartner: r.viaPartner, worldHit: r.worldHit, take: credit.take,
    costar: r.with, costarIcon: r.withIcon, comeback: !!credit.comeback, sequel: (credit.part || 0) > 1,
    lateShelf: /Character lead|matriarch|Elder|Grandparent/.test(credit.role || '') });
  // Standing next to an icon is worth something on its own: the photographs, the poster,
  // the fact that they said yes to a film you were in.
  if (r.withIcon) { setFame(s, (s.fame || 0) + 3 * headroom(s.fame)); setRespect(s, (s.respect || 0) + 2 * soft(112, s.respect)); addTimeline(s, `Your name is on a poster next to ${r.with}'s. People noticed.`); }
  typecastAfterCredit(s, credit);
  showMoment(s, {
    id: 'verdict', tv: film ? null : (r.scale === 'recurring' ? 'soap' : r.scale === 'prestige' ? 'prestige' : 'episode'), kind: r.rating >= 70 || verdict === 'smash' ? 'good' : 'bad',
    title: credit.title, score, money, verdict, reviews: credit.reviews,
    // Television: the network's number against yours, and what it decided.
    network: !film && r.scale !== 'episode' && credit.renewal ? networkLine(credit.type, credit.viewers, null, r.rating, credit.renewal) : null,
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
