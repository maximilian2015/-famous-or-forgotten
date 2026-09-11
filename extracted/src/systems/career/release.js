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
import { rint } from '../../engine/rng.js';
import { setQuote, setFame, setRespect } from '../meta/status.js';
import { addTimeline } from '../../engine/timeline.js';
import { markReleased } from '../../engine/economy.js';
import { hotGenre } from '../meta/news.js';
import { maybeContinue } from './franchise.js';
import { appealShift } from './story.js';

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
  const gross = budget * PAR * qualityPull(rel.rating) * (APPEAL[rel.genre] || 1) * (rel.appealMod ?? 1) * star * trend * luck();
  return Math.round(gross * 1000000);
}
export function viewersFor(s, rel) {
  const span = VIEWERS[rel.scale] || VIEWERS.episode;
  const star = 0.8 + (s.fame || 0) / 250;
  // A show that is coming back already HAS an audience. Rolling a fresh number every season
  // meant a season rated 7.2 drew 8.9m, the next one rated 9.1 drew 3m and the one after
  // that drew 18m — the same programme, on the same night, with no explanation. An audience
  // is inherited and then it moves: a better season brings people, a worse one loses them.
  const prev = previousAudience(s, rel);
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
    campaign: !!p.campaign, prestigeScore: p.prestigeScore,
    // What the version you shot does to the box office, and the line it was pitched on.
    appealMod: appealShift(p), premise: p.premise || credit.premise || null, take: credit.take || null,
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
const RUN_WEEKS = { small: 3, indie: 6, feature: 11, blockbuster: 15, oneoff: 2,
  episode: 6, recurring: 12, prestige: 10 };

function open(s, rel) {
  const film = isFilm(rel.scale);
  // What it will end up taking. The player does not see this number yet — it arrives a
  // few thousand at a time, week by week, which is how anybody actually experiences it.
  if (film) rel.finalGross = boxOfficeFor(s, rel);
  else rel.viewers = viewersFor(s, rel);
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
    running: true, weeks: 0, weeksTotal: RUN_WEEKS[rel.scale] || 8,
    boxOffice: 0, viewers: rel.viewers || 0, verdict: 'in cinemas', score: null,
    // Carried for the Asker season: what kind of thing it was, and whether it was pushed.
    scale: rel.scale, tier: rel.tier, prestigeScore: rel.prestigeScore,
    premise: rel.premise || null, take: rel.take || null,
    campaignShare: rel.campaign ? 0.65 : 0,
  };
  const bucket = s.dream === 'singer' ? 'discography' : 'filmography';
  // Two years without anything coming out and the trades will call the next one a
  // comeback whether it deserves the word or not.
  const last = (s[bucket] || [])[0];
  if (last && (s.year || 0) - (last.year || 0) >= 3) credit.comeback = (s.year || 0) - last.year;
  (s[bucket] = s[bucket] || []).unshift(credit);
  markReleased(s);

  // Opening night is worth something on its own — the carpet, the photographs, the fact
  // that it exists. The rest of what this film does to your name waits for the run.
  const headroom = (limit, cur) => Math.max(0.16, 1 - (cur || 0) / limit);
  const opening = { tentpole: 3, lead: 2, supporting: 1 }[rel.tier] || 1;
  setFame(s, (s.fame || 0) + opening * headroom(118, s.fame));
  // The finished thing is kept ON the release so runTick can close it out properly.
  credit._rel = { rating: rel.rating, worldHit: rel.worldHit, tier: rel.tier, scale: rel.scale,
    salary: rel.salary, finalGross: rel.finalGross || 0, job: rel.job, film };
  // BY ID, never by reference. A save is JSON, and JSON.parse hands back a fresh object for
  // every entry — so a list holding the credit itself pointed at a copy the moment anybody
  // reloaded, and the run finished on the copy while the credit in the filmography sat at
  // week four with no score, forever. Any film in cinemas when you closed the game was lost.
  credit.id = rel.id;
  (s.running = s.running || []).push(rel.id);

  s.lastEvent = film
    ? `"${rel.title}" opened tonight. Now everybody finds out what it is.`
    : `"${rel.title}" went out tonight.`;
  addTimeline(s, `"${rel.title}" opened.`);
  s.bigMoment = {
    id: 'premiere', kind: 'good', title: rel.title, verdict: 'opening night',
    body: 'You stood on a carpet and answered the same four questions eleven times, and then '
      + 'the lights went down and you watched it with strangers. Nobody knows anything yet — '
      + 'not the reviews, not the money, not you. That comes over the next few weeks.',
  };
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
  // A flop cuts what the film does for your name, but it can never take your name
  // backwards: a bad film still put your face on a screen.
  else if (verdict === 'bomb') fame = Math.max(1, fame - 3);
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
    return Math.max(0.03, 0.577 * Math.pow(Math.max(0, (104 - f) / 49), 1.9));
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
  if (wasForgotten && r.rating >= 70 && !s._cameBack) {
    s._cameBack = true;
    s.media = Math.min(100, (s.media || 0) + 28);
    setRespect(s, (s.respect || 0) + 4);
    setFame(s, Math.max(s.fame || 0, 35));   // straight to Known Face; the film's own fame lands on top below
    addTimeline(s, `The trades are calling ${credit.title} a comeback. Every piece uses the word, and every piece uses your name.`);
    s.lastEvent = `"${credit.title}" is being written about as a comeback. It is a generous word for it, and it is doing more for you than the film is.`;
  }
  setFame(s, (s.fame || 0) + fame * headroom(s.fame));
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
  const respectGain = r.rating >= 85 ? 5 : r.rating >= 70 ? 2 : r.rating < 45 ? -4 * expected : 0;
  const soft = (limit, cur) => Math.max(0.16, 1 - (cur || 0) / limit);
  setRespect(s, (s.respect || 0) + (respectGain > 0 ? respectGain * soft(112, s.respect) : respectGain));
  if (film && verdict === 'smash') setQuote(s, Math.max(s.quote || 0, (r.salary || 0) * 1.6));

  // The gross means nothing on its own — "a billion" is only a triumph next to what it cost.
  // The industry never quotes one without the other and neither should this.
  const bud = budgetFor({ scale: r.scale });
  const money = film
    ? `€${(credit.boxOffice / 1000000).toFixed(credit.boxOffice >= 100000000 ? 0 : 1)}m on a €${(bud / 1000000).toFixed(0)}m film, ${credit.weeksTotal} weeks`
    : `${credit.viewers}m watching`;
  const score = credit.score.toFixed(1);
  const line = r.worldHit
    ? `🌍 "${credit.title}" is a phenomenon. ${score}/10 · ${money}.`
    : `"${credit.title}" finished its run. ${score}/10 · ${money} · ${verdict}.`;
  s.lastEvent = line;
  addTimeline(s, line, r.rating < 50 || verdict === 'bomb');

  // Only now does anyone know whether there is a second one.
  if (r.job) {
    const next = maybeContinue(s, credit, r.job);
    if (next) (s.offers = s.offers || []).push(next);
  }

  s.bigMoment = {
    id: 'verdict', kind: r.rating >= 70 || verdict === 'smash' ? 'good' : 'bad',
    title: credit.title, score, money, verdict,
    body: r.worldHit
      ? 'Nobody expected this. It has stopped being a film and started being an event.'
      : r.rating >= 85 ? 'The reviews are the kind people screenshot.'
      : r.rating >= 70 ? 'Well received. Not the one they will remember you for, but a good run.'
      : r.rating >= 50 ? 'It came and went. Some people liked it.'
      : verdict === 'bomb' ? 'The reviews are bad and the numbers are worse. Somebody will be blamed.'
      : 'It did not land. These are the ones you leave off the reel.',
  };
  return s;
}
