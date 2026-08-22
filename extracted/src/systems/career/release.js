// Nothing you shoot comes out the day you finish shooting. A film wraps, sits in post
// for months, and then opens — and THAT is the day you find out what you made.
//
// Two numbers come back, and they are not the same number:
//   · the score, out of ten, which is what people thought of it
//   · the box office, which is what people paid for it
// A film can be adored and lose money, or panned and take a billion. They pull your
// career in different directions, and that is the whole point of having both.
import { rint } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { markReleased } from '../../engine/economy.js';
import { hotGenre } from '../meta/news.js';
import { maybeContinue } from './franchise.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

// How long a thing sits between the last day of shooting and opening night.
const POST_MONTHS = {
  oneoff: [1, 2], small: [2, 4], indie: [4, 8], episode: [2, 5],
  recurring: [2, 4], prestige: [4, 7], feature: [5, 9], blockbuster: [7, 12],
};
export function postProduction(scale) {
  const span = POST_MONTHS[scale] || [3, 6];
  return rint(span[0], span[1]);
}

// Everything commercial is measured against the budget, because that is the only number
// the industry compares anything to. A picture is not "big" — it is big AGAINST its cost.
const BUDGET = { small: 1, indie: 12, feature: 90, blockbuster: 220 };   // millions
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

export function isFilm(scale) { return ['small', 'indie', 'feature', 'blockbuster'].includes(scale); }

// The commercial result. Star power sells tickets — that is what a name is FOR.
export function boxOfficeFor(s, rel) {
  const budget = BUDGET[rel.scale];
  if (!budget) return 0;
  const star = 0.7 + (s.fame || 0) / 180;                  // 0.7 at nobody, 1.26 at icon
  const trend = rel.genre === hotGenre(s) ? 1.25 : 1;
  const gross = budget * PAR * qualityPull(rel.rating) * (APPEAL[rel.genre] || 1) * star * trend * luck();
  return Math.round(gross * 1000000);
}
export function viewersFor(s, rel) {
  const span = VIEWERS[rel.scale] || VIEWERS.episode;
  const base = span[0] + Math.random() * (span[1] - span[0]);
  const star = 0.8 + (s.fame || 0) / 250;
  return Math.round(base * qualityPull(rel.rating) * star * 10) / 10;
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
    id: 'rel' + Date.now() + Math.floor(Math.random() * 1000),
    title: credit.title, role: credit.role, type: credit.type, genre: credit.genre,
    scale: p.scale || 'feature', tier: p.tier || 'lead', season: p.season || 0,
    episodes: p.episodes || 0, part: p.part || 1, salary: credit.salary,
    rating: credit.rating, status: credit.status, worldHit: credit.status === 'World Hit',
    // Carried for the Asker season: whether it was pushed, and how good the material was.
    campaign: !!p.campaign, prestigeScore: p.prestigeScore,
    due: (s.year || 0) * 12 + (s.month || 0) + wait, wait,
    // Whether the thing gets a second season or a sequel is decided on the numbers, so
    // the shoot has to keep enough of itself alive to be asked that question later.
    job: {
      title: p.title, seriesTitle: p.seriesTitle, role: p.role, type: p.type, genre: p.genre, salary: p.salary,
      months: p.months, episodes: p.episodes || 0, episodeFee: p.episodeFee || 0,
      season: p.season || 0, part: p.part || 1, tier: p.tier, scale: p.scale, stability: p.stability,
      prestigeScore: p.prestigeScore, optioned: !!p.optioned, optionParts: p.optionParts || 0,
    },
  };
  (s.releases = s.releases || []).push(rel);
  addTimeline(s, `"${rel.title}" wrapped. It opens in about ${wait} months.`);
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

function open(s, rel) {
  const film = isFilm(rel.scale);
  if (film) rel.boxOffice = boxOfficeFor(s, rel);
  else rel.viewers = viewersFor(s, rel);
  const verdict = verdictOf(rel);
  const score = (rel.rating / 10).toFixed(1);

  // The credit only exists once the thing is out. Until now it was "in post".
  const credit = {
    title: rel.title, role: rel.role, type: rel.type, genre: rel.genre, salary: rel.salary,
    rating: rel.rating, status: rel.status, year: s.year, season: rel.season,
    part: rel.part > 1 ? rel.part : 0, episodes: rel.episodes,
    boxOffice: rel.boxOffice || 0, viewers: rel.viewers || 0, verdict, score: Number(score),
    // Carried for the Asker season: what kind of thing it was, and whether it was pushed.
    scale: rel.scale, tier: rel.tier, prestigeScore: rel.prestigeScore,
    campaignShare: rel.campaign ? 0.65 : 0,
  };
  const bucket = s.dream === 'singer' ? 'discography' : 'filmography';
  (s[bucket] = s[bucket] || []).unshift(credit);
  markReleased(s);

  // The score buys respect; the money buys reach. They are different currencies.
  const bySkill = { tentpole: 9, lead: 5, supporting: 2 }[rel.tier] || 2;
  let fame = bySkill + (rel.rating >= 85 ? 4 : 0) + (rel.worldHit ? 25 : 0);
  if (verdict === 'smash') fame += 8;
  else if (verdict === 'profitable') fame += 3;
  // A flop cuts what the film does for your name, but it can never take your name
  // backwards: a bad film still put your face on a screen. Subtracting here trapped a
  // low-fame actor at zero forever — every credit made them less known than before it.
  else if (verdict === 'bomb') fame = Math.max(1, fame - 3);
  s.fame = clamp((s.fame || 0) + fame);
  s.respect = clamp((s.respect || 0) + (rel.rating >= 85 ? 5 : rel.rating >= 70 ? 2 : rel.rating < 45 ? -4 : 0));

  // A commercial hit raises what you can ask for next time.
  if (film && verdict === 'smash') s.quote = Math.max(s.quote || 0, Math.round((rel.salary || 0) * 1.6));

  const money = film
    ? `€${(rel.boxOffice / 1000000).toFixed(rel.boxOffice >= 100000000 ? 0 : 1)}m at the box office`
    : `${rel.viewers}m watching`;
  const line = rel.worldHit
    ? `🌍 "${rel.title}" is a phenomenon. ${score}/10 · ${money}.`
    : `"${rel.title}" is out. ${score}/10 · ${money} · ${verdict}.`;
  s.lastEvent = line;
  addTimeline(s, line, rel.rating < 50 || verdict === 'bomb');

  // Only now does anyone know whether there is a second one. The credit carries the
  // verdict, so a beloved film that nobody bought can still fail to get a sequel.
  if (rel.job) {
    const next = maybeContinue(s, credit, rel.job);
    if (next) (s.offers = s.offers || []).push(next);
  }

  // Opening night stops the game. It is the only thing you worked a year for.
  s.bigMoment = {
    id: 'premiere', kind: rel.rating >= 70 || verdict === 'smash' ? 'good' : 'bad',
    title: rel.title,
    score, money, verdict,
    body: rel.worldHit
      ? 'Nobody expected this. It has stopped being a film and started being an event.'
      : rel.rating >= 85 ? 'The reviews are the kind people screenshot.'
      : rel.rating >= 70 ? 'Well received. Not the one they will remember you for, but a good night.'
      : rel.rating >= 50 ? 'It came and went. Some people liked it.'
      : verdict === 'bomb' ? 'The reviews are bad and the numbers are worse. Somebody will be blamed.'
      : 'It did not land. These are the ones you leave off the reel.',
  };
  return s;
}
