import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { earn, markReleased } from '../../engine/economy.js';
import { GENRES } from '../meta/news.js';
import { addGenreXP, genreBonus } from './genres.js';
import { startProduction } from './production.js';
import { feeFor } from '../meta/status.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
// Two things the old table got wrong, both of them real-world facts:
//   · television is paid PER EPISODE, film is paid for the picture. They are not the
//     same unit and showing both as "per month" made a soap look like a salary.
//   · every number here is SCALE — what an unknown gets. A name is paid a multiple of
//     it (systems/meta/status.js), which is why the same lead role is €45k for a nobody
//     and several million for an A-lister. That gap is the whole career.
//
// series: [type, role, [minMo,maxMo], [minEps,maxEps], perEpisodeBase, scale, minFame]
// film:   [type, role, [minMo,maxMo], totalBase, scale, minFame]
const POOLS = {
  actor: {
    series: [
      ['Soap Opera', 'Recurring', [3, 5], [22, 44], 900, 'recurring'],
      ['Drama Series', 'Guest role', [2, 3], [2, 4], 2600, 'episode'],
      ['Crime Series', 'Episode', [2, 3], [1, 3], 3200, 'episode'],
      ['Prestige Series', 'Season lead', [7, 10], [8, 10], 22000, 'prestige', 55],
    ],
    film: [
      ['Short Film', 'Lead', [1, 2], 3500, 'small'],
      ['Horror Movie', 'Victim', [1, 2], 9000, 'small'],
      ['Indie Film', 'Supporting', [2, 4], 18000, 'indie'],
      ['Indie Film', 'Lead', [3, 5], 40000, 'indie', 15],
      ['Feature Film', 'Lead', [5, 8], 120000, 'feature', 30],
      ['Studio Blockbuster', 'Lead', [10, 14], 600000, 'blockbuster', 65],
    ],
    ads: [['Brand Campaign', 'Face', [1, 1], 25000, 'oneoff'], ['Commercial', 'Actor', [1, 1], 6000, 'oneoff']],
    gigs: [['Theatre Run', 'Stage', [2, 2], 7000, 'small'], ['Voice Session', 'Voice', [1, 1], 1400, 'oneoff'], ['TV Extra', 'Background', [1, 1], 350, 'oneoff']],
  },
  singer: {
    series: [
      ['Music Show', 'Guest', [1, 2], [1, 2], 3500, 'episode'],
      ['Talent Series', 'Judge', [4, 7], [10, 16], 14000, 'recurring', 40],
    ],
    film: [
      ['Music Video', 'Star', [1, 1], 9000, 'oneoff'],
      ['Concert Film', 'Headliner', [2, 3], 60000, 'feature', 30],
      ['Stadium Tour', 'Headliner', [8, 12], 900000, 'blockbuster', 65],
    ],
    ads: [['Jingle', 'Voice', [1, 1], 7000, 'oneoff'], ['Brand Song', 'Artist', [1, 1], 30000, 'oneoff']],
    gigs: [['Open Mic', 'Performer', [1, 1], 250, 'oneoff'], ['Festival Slot', 'Act', [1, 1], 3000, 'oneoff'], ['Session Work', 'Session', [1, 1], 1800, 'oneoff']],
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
function titleFor() { const A=['Late','Golden','Silent','Broken','Bright','Lost']; const B=['River','Avenue','Season','Signal','Harbor','Echo']; return `${pick(A)} ${pick(B)}`; }
export function refreshCastingPool(s, force) {
  s.castingPool = s.castingPool || [];
  if (!force && s.castingPool.length >= 6) return;
  const career = s.dream === 'singer' ? 'singer' : 'actor';
  const shelves = POOLS[career];
  s.castingPool = force ? [] : s.castingPool.filter((c) => (c._expires || 0) > ((s.year || 0) * 12 + (s.month || 0)));
  while (s.castingPool.length < 6) {
    const shelf = pick(Object.keys(shelves));
    const row = pick(shelves[shelf]);
    const perEpisode = shelf === 'series';
    const [type, role, span] = row;
    const [eps, base, scale, minFame] = perEpisode ? row.slice(3) : [null, ...row.slice(3)];
    const months = rint(span[0], span[1]);
    const episodes = perEpisode ? rint(eps[0], eps[1]) : 0;
    // What YOU would be paid, not what the part is worth to an unknown.
    const rate = feeFor(s, base);
    s.castingPool.push({
      id: 'cast' + Date.now() + Math.floor(Math.random() * 10000), title: titleFor(), type, role, shelf, scale,
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
  return Math.round(clamp(15 + skill * 0.5 + s.charisma * 0.2 + s.looks * 0.15 + s.luck * 0.1 - (s.scandal || 0) * 0.3));
}
// quality (0-100) comes from the audition minigame: nail the read and your odds jump,
// fumble it and the room cools on you.
export function auditionFor(s, id, quality = 50) {
  const c = (s.castingPool || []).find((x) => x.id === id); if (!c) return s;
  if (s.production) { s.lastEvent = `You are shooting "${s.production.title}". Nobody can be in two places.`; return s; }
  if ((s.fame || 0) < (c.minFame || 0)) { s.lastEvent = 'You need more fame before they will see you for this.'; return s; }
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
        salary: c.salary, months: c.months, tier: sc.tier,
        episodes: c.episodes, episodeFee: c.episodeFee, season: c.perEpisode ? 1 : 0,
        prestigeScore: rint(sc.prestige[0], sc.prestige[1]) + Math.round((quality - 50) * 0.12),
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
    (s[bucket] = s[bucket] || []).unshift({ title: c.title, role: c.role, type: c.type, genre: c.genre, salary: c.salary, rating, status, year: s.year });
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
