import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { earn, markReleased } from '../../engine/economy.js';
import { GENRES } from '../meta/news.js';
import { addGenreXP, genreBonus } from './genres.js';
import { startProduction } from './production.js';
import { quoteFor, episodeRate } from '../meta/status.js';
import { rollStability, feeFactor, riskPrestige } from './stability.js';
import { askerStanding } from './awards.js';
import { ageFit, seenForIt } from './age.js';
import { canWork, insurability, depressed } from '../life/strain.js';
// What a casting office will see you for. Usually that is fame — but an Asker counts,
// and it is the one route into work above your level that does not run through
// blockbusters. An actor with a statuette and forty fame gets read for parts that used
// to want seventy.
export function reach(s) { return (s.fame || 0) + askerStanding(s); }
const clamp = (v) => Math.max(0, Math.min(100, v));
// Two things the old table got wrong, both of them real-world facts:
//   · television is paid PER EPISODE, film is paid for the picture. They are not the
//     same unit and showing both as "per month" made a soap look like a salary.
//   · every number here is SCALE — what an unknown gets. A name is paid a multiple of
//     it (systems/meta/status.js), which is why the same lead role is €45k for a nobody
//     and several million for an A-lister. That gap is the whole career.
//
// The fee is no longer a base number here — it is a MEDIUM, and what you are paid in
// that medium is looked up against your name (systems/meta/status.js). A rising star
// gets €25,000 an episode of network drama and €500,000 for a studio picture, and no
// single multiplier produces both.
//
// A `share` under 1 is a smaller part in the same medium: a guest spot on a network
// drama is not a series-regular fee, even though the show pays network rates.
//
// series: [type, role, [minMo,maxMo], [minEps,maxEps], medium, scale, minFame, share]
// film:   [type, role, [minMo,maxMo], medium, scale, minFame, share]
const POOLS = {
  actor: {
    series: [
      ['Soap Opera', 'Recurring', [3, 5], [22, 44], 'tv_daytime', 'recurring'],
      ['Drama Series', 'Guest role', [2, 3], [2, 4], 'tv_network', 'episode', 0, 0.45],
      ['Crime Series', 'Episode', [2, 3], [1, 3], 'tv_network', 'episode', 0, 0.55],
      ['Network Drama', 'Series regular', [5, 8], [10, 16], 'tv_network', 'recurring', 25],
      ['Prestige Series', 'Season lead', [7, 10], [8, 10], 'tv_prestige', 'prestige', 55],
      // Opens late. It pays in standing, and it is the shelf that replaces the one that closes.
      ['Prestige Series', 'The matriarch', [6, 9], [6, 9], 'tv_prestige', 'prestige', 30, 0.8],
    ],
    film: [
      ['Short Film', 'Lead', [1, 2], 'film_indie', 'small', 0, 0.12],
      ['Horror Movie', 'Victim', [1, 2], 'film_indie', 'small', 0, 0.3],
      ['Indie Film', 'Supporting', [2, 4], 'film_indie', 'indie', 0, 0.5],
      ['Indie Film', 'Lead', [3, 5], 'film_indie', 'indie', 15],
      ['Feature Film', 'Lead', [5, 8], 'film_studio', 'feature', 30],
      ['Studio Blockbuster', 'Lead', [10, 14], 'film_tentpole', 'blockbuster', 70],
      // The late-career shelf: the parts that win things and do not sell tickets.
      ['Prestige Drama', 'Character lead', [4, 7], 'film_indie', 'indie', 20, 1.6],
      ['Feature Film', 'Elder statesman', [3, 6], 'film_studio', 'feature', 25, 0.55],
      ['Indie Film', 'Grandparent', [2, 4], 'film_indie', 'indie', 0, 0.7],
    ],
    ads: [['Brand Campaign', 'Face', [1, 1], 'ad', 'oneoff'], ['Commercial', 'Actor', [1, 1], 'ad', 'oneoff', 0, 0.35]],
    gigs: [['Theatre Run', 'Stage', [2, 2], 'gig', 'small', 0, 4], ['Voice Session', 'Voice', [1, 1], 'gig', 'oneoff', 0, 2], ['TV Extra', 'Background', [1, 1], 'gig', 'oneoff']],
  },
  singer: {
    series: [
      ['Music Show', 'Guest', [1, 2], [1, 2], 'tv_network', 'episode', 0, 0.4],
      ['Talent Series', 'Judge', [4, 7], [10, 16], 'tv_network', 'recurring', 40],
    ],
    film: [
      ['Music Video', 'Star', [1, 1], 'ad', 'oneoff', 0, 0.5],
      ['Concert Film', 'Headliner', [2, 3], 'film_indie', 'feature', 30],
      ['Stadium Tour', 'Headliner', [8, 12], 'film_tentpole', 'blockbuster', 70],
    ],
    ads: [['Jingle', 'Voice', [1, 1], 'ad', 'oneoff', 0, 0.3], ['Brand Song', 'Artist', [1, 1], 'ad', 'oneoff']],
    gigs: [['Open Mic', 'Performer', [1, 1], 'gig', 'oneoff', 0, 0.4], ['Festival Slot', 'Act', [1, 1], 'gig', 'oneoff', 0, 3], ['Session Work', 'Session', [1, 1], 'gig', 'oneoff', 0, 1.5]],
  },
};
// What the shoot is worth to your name, and how the world treats the credit.
const SCALE = {
  oneoff:      { prestige: [8, 20],  tier: 'supporting', label: 'One-off' },
  small:       { prestige: [15, 30], tier: 'supporting', label: 'Small' },
  episode:     { prestige: [30, 45], tier: 'supporting', label: 'Episode' },
  indie:       { prestige: [35, 55], tier: 'supporting', label: 'Indie' },
  recurring:   { prestige: [40, 55], tier: 'lead', label: 'Recurring' },
  feature:     { prestige: [55, 72], tier: 'lead', label: 'Feature' },
  prestige:    { prestige: [70, 88], tier: 'lead', label: 'Prestige' },
  blockbuster: { prestige: [80, 96], tier: 'tentpole', label: 'Blockbuster' },
};
export function scaleOf(c) { return SCALE[c?.scale] || SCALE.episode; }
// Six words by six words is thirty-six titles, and six listings drawn out of that
// collide constantly — the board regularly showed the same film twice on two shelves,
// and two films of the same name collapsed into one row in the filmography.
const TITLE_A = ['Late', 'Golden', 'Silent', 'Broken', 'Bright', 'Lost', 'Quiet', 'Last', 'Paper', 'Neon',
  'Bitter', 'Hollow', 'Certain', 'Northern', 'Second', 'Patient', 'Crooked', 'Tender'];
const TITLE_B = ['River', 'Avenue', 'Season', 'Signal', 'Harbor', 'Echo', 'Hour', 'Room', 'Line', 'City',
  'Winter', 'Weather', 'Machine', 'Country', 'Animal', 'Kingdom', 'Daughter', 'Distance'];
function titleFor(taken) {
  for (let i = 0; i < 60; i++) {
    const t = `${pick(TITLE_A)} ${pick(TITLE_B)}`;
    if (!taken || !taken.has(t)) return t;
  }
  // Astronomically unlikely, but a title is never worth an infinite loop.
  return `${pick(TITLE_A)} ${pick(TITLE_B)} ${rint(2, 99)}`;
}
// How many listings the board carries for you. This is the real shape of a career: not
// that the work gets worse, but that there is less of it. A board that always held six
// options meant a seventy-year-old worked exactly as hard as a thirty-year-old, and
// since fame and craft only climb, the oldest version of you was the strongest — the
// median Asker across a hundred careers was won at fifty-seven.
export function boardSize(s) {
  const age = s.ageY || 0;
  // It turns for women first, which is the ugly part of this business and worth saying
  // rather than smoothing away.
  const peakEnd = 42 - (s.gender === 'female' ? 5 : 0);
  if (age <= peakEnd) return 6;
  return Math.max(2, Math.round(6 - 4 * Math.min(1, (age - peakEnd) / 28)));
}
export function refreshCastingPool(s, force) {
  s.castingPool = s.castingPool || [];
  const want = boardSize(s);
  if (!force && s.castingPool.length >= want) return;
  const career = s.dream === 'singer' ? 'singer' : 'actor';
  const shelves = POOLS[career];
  s.castingPool = force ? [] : s.castingPool.filter((c) => (c._expires || 0) > ((s.year || 0) * 12 + (s.month || 0)));
  // No two things on the board share a name, and nothing is named after something you
  // have already made or are already shooting.
  const taken = new Set([
    ...s.castingPool.map((c) => c.title),
    ...(s.filmography || []).map((c) => c.title),
    ...(s.discography || []).map((c) => c.title),
    ...(s.releases || []).map((r) => r.title),
    ...(s.frozen || []).map((f) => f.title),
    ...(s.offers || []).map((o) => String(o.projectTitle || '').replace('⭐ ', '')),
    s.production ? s.production.title : '',
  ]);
  let guard = 0;
  while (s.castingPool.length < want && guard++ < 200) {
    const shelf = pick(Object.keys(shelves));
    const row = pick(shelves[shelf]);
    const perEpisode = shelf === 'series';
    const [type, role, span] = row;
    // A casting office reading somebody else's age never sends you the sides at all.
    if (!seenForIt(s, role)) continue;
    const [eps, medium, scale, minFame, share] = perEpisode ? row.slice(3) : [null, ...row.slice(3)];
    // What YOU are worth in this medium. Zero means they would not have you at any
    // price yet — the listing simply does not appear.
    const quoted = Math.round(quoteFor(s, medium) * (share || 1));
    if (quoted <= 0) continue;
    const months = rint(span[0], span[1]);
    const episodes = perEpisode ? rint(eps[0], eps[1]) : 0;
    // How solid the money behind this one is, and what they have to pay to make you
    // take that on. The player sees both before signing — that is the whole point.
    // A job that is over by the evening cannot fall apart, so it is never priced as if
    // it might — otherwise a one-day short would pay a risk premium for no risk.
    const stability = months < 2 ? rint(88, 97) : rollStability(scale);
    const fee = feeFactor(stability);
    // Bands are quoted against a typical season. A longer order pays less per episode.
    const base = perEpisode ? episodeRate(quoted, (eps[0] + eps[1]) / 2, episodes) : quoted;
    const rate = Math.round(base * fee);
    if (rate <= 0) continue;
    const title = titleFor(taken);
    taken.add(title);
    s.castingPool.push({
      id: 'cast' + Date.now() + Math.floor(Math.random() * 10000), title: title, type, role, shelf, scale, medium,
      share: share || 1,   // negotiation needs it to know the top of YOUR band for this part
      stability, feeFactor: fee,   // negotiation argues inside the band this job actually pays in
      months, episodes, perEpisode, episodeFee: perEpisode ? rate : 0,
      salary: perEpisode ? rate * episodes : rate,        // the whole fee, paid across the shoot
      genre: pick(GENRES), minFame: minFame || 0,
      _expires: (s.year || 0) * 12 + (s.month || 0) + rint(2, 4),
    });
  }
}
export function castingChance(s, c) {
  const skill = s.dream === 'singer' ? s.singing : s.acting;
  // Scandal was purely cosmetic before — it accumulated and did nothing.
  const base = clamp(15 + skill * 0.5 + s.charisma * 0.2 + s.looks * 0.15 + s.luck * 0.1 - (s.scandal || 0) * 0.3);
  // And at the edge of a part's age you are the second choice in the room. And nobody
  // wants to bond an actor who has walked off three sets — see systems/life/strain.js.
  const fit = c ? ageFit(s, c.role) : 1;
  // And you are not yourself in a room when you are carrying this.
  return Math.round(base * (0.35 + 0.65 * fit) * insurability(s) * (depressed(s) ? 0.62 : 1));
}
// quality (0-100) comes from the audition minigame: nail the read and your odds jump,
// fumble it and the room cools on you.
export function auditionFor(s, id, quality = 50) {
  const c = (s.castingPool || []).find((x) => x.id === id); if (!c) return s;
  if (s.production) { s.lastEvent = `You are shooting "${s.production.title}". Nobody can be in two places.`; return s; }
  const fit = canWork(s);
  if (!fit.ok) { s.lastEvent = fit.why; return s; }
  if (reach(s) < (c.minFame || 0)) { s.lastEvent = 'You need more fame before they will see you for this.'; return s; }
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  s.ap = (s.ap || 0) - 1;
  const odds = clamp(castingChance(s, c) + (quality - 50) * 0.55);
  if (chance(odds)) {
    // Anything with a real schedule becomes a shoot you have to live through. Booking used
    // to hand you the finished rating in the same click, which threw away months of the game.
    if ((c.months || 1) >= 2) {
      const sc = scaleOf(c);
      startProduction(s, {
        id: c.id, projectTitle: c.title, role: c.role, type: c.type, genre: c.genre,
        salary: c.salary, months: c.months, tier: sc.tier, scale: c.scale,
        episodes: c.episodes, episodeFee: c.episodeFee, season: c.perEpisode ? 1 : 0,
        stability: c.stability,
        // Shaky money buys better material. It is the only thing it has to offer.
        prestigeScore: rint(sc.prestige[0], sc.prestige[1]) + Math.round((quality - 50) * 0.12) + riskPrestige(c.stability),
      });
      s.castingPool = (s.castingPool || []).filter((x) => x.id !== id);
      s.lastEvent = `${quality >= 80 ? 'The room goes quiet — you nailed it. ' : ''}You booked "${c.title}". ${c.months} months of shooting — `
        + (c.perEpisode ? `€${c.episodeFee.toLocaleString()} an episode across ${c.episodes}.` : `€${c.salary.toLocaleString()} for the picture.`);
      return s;
    }
    // A voice session or a day as an extra really is over by the evening.
    const skill = s.dream === 'singer' ? s.singing : s.acting;
    const rating = clamp(25 + skill * 0.30 + (quality - 50) * 0.25 + (s.looks - 40) * 0.1 + genreBonus(s, c.genre) + rint(-8, 14));
    const status = rating >= 85 ? 'Hit' : rating >= 70 ? 'Well-received' : rating >= 50 ? 'Released' : 'Flop';
    const bucket = s.dream === 'singer' ? 'discography' : 'filmography';
    // A commercial is not a credit in the sense a film is. It still happened and still
    // paid, so it is kept — but under Other work, without a score. Nobody rates a
    // shampoo advert out of ten, and letting them do so dragged the whole filmography.
    (s[bucket] = s[bucket] || []).unshift({ title: c.title, role: c.role, type: c.type, genre: c.genre,
      salary: c.salary, rating, status, year: s.year, minor: true });
    addGenreXP(s, c.genre, rating);
    earn(s, c.salary, `"${c.title}" paid`); markReleased(s); s.fame = clamp(s.fame + rint(1, 3)); s.confidence = clamp(s.confidence + 2);
    s.lastEvent = `${quality >= 80 ? 'The room goes quiet — you nailed it. ' : ''}One day's work on "${c.title}". It came out ${status.toLowerCase()} (${Math.round(rating)}/100).`;
    addTimeline(s, `Booked ${c.title}: ${status}.`, rating < 50);
  } else {
    s.mental = clamp(s.mental - 2);
    s.lastEvent = quality < 35
      ? `You fumbled the read for "${c.title}". They thank you before you've finished. No callback.`
      : `You auditioned for "${c.title}" and didn't get it. Next time.`;
    addTimeline(s, `Auditioned for ${c.title} — no callback.`);
  }
  s.castingPool = (s.castingPool || []).filter((x) => x.id !== id);
  return s;
}
export const SHELVES = [['series','Series'],['film','Film'],['ads','Ads'],['gigs','Gigs']];
export const SHELF_BLURB = { series: 'Recurring work — slower money, but your face every week.', film: 'One shot, one release. The credits that define you.', ads: 'Brand money. Pays fast, spends a little credibility.', gigs: 'Small paid work. Keeps the lights on and the reps up.' };
