import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { earn, markReleased } from '../../engine/economy.js';
import { GENRES } from '../meta/news.js';
import { addGenreXP, genreBonus } from './genres.js';
import { startProduction } from './production.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
// How long a shoot runs is the scale of the thing, not a constant. A soap episode is
// two months; a studio blockbuster can eat a year of your life. Pay is a MONTHLY rate —
// four months at €3,000 is €12,000, which is the number that has to make sense against
// rent. Format: [type, role, [minMonths, maxMonths], monthlyRate, scale, minFame]
const POOLS = {
  actor: {
    series: [
      ['Soap Opera', 'Recurring', [3, 5], 3000, 'recurring'],
      ['Drama Series', 'Guest role', [2, 3], 5000, 'episode'],
      ['Crime Series', 'Episode', [2, 3], 4200, 'episode'],
      ['Prestige Series', 'Season lead', [7, 10], 12000, 'prestige', 55],
    ],
    film: [
      ['Indie Film', 'Supporting', [2, 4], 3000, 'indie'],
      ['Horror Movie', 'Victim', [1, 2], 2600, 'small'],
      ['Feature Film', 'Lead', [5, 8], 6500, 'feature', 30],
      ['Studio Blockbuster', 'Lead', [10, 14], 14000, 'blockbuster', 65],
    ],
    ads: [['Brand Campaign', 'Face', [1, 1], 6000, 'oneoff'], ['Commercial', 'Actor', [1, 1], 3500, 'oneoff']],
    gigs: [['Theatre Slot', 'Stage', [2, 2], 1500, 'small'], ['Voice Session', 'Voice', [1, 1], 1200, 'oneoff'], ['TV Extra', 'Background', [1, 1], 500, 'oneoff']],
  },
  singer: {
    series: [
      ['Music Show', 'Guest', [2, 2], 3000, 'episode'],
      ['Talent Series', 'Judge', [4, 7], 9000, 'recurring', 40],
    ],
    film: [
      ['Music Video', 'Star', [1, 1], 4000, 'oneoff'],
      ['Concert Film', 'Headliner', [2, 3], 9000, 'feature', 30],
      ['Stadium Tour', 'Headliner', [8, 12], 16000, 'blockbuster', 65],
    ],
    ads: [['Jingle', 'Voice', [1, 1], 5000, 'oneoff'], ['Brand Song', 'Artist', [1, 1], 6000, 'oneoff']],
    gigs: [['Open Mic', 'Performer', [1, 1], 800, 'oneoff'], ['Festival Slot', 'Act', [1, 1], 2000, 'oneoff'], ['Session Work', 'Session', [1, 1], 1500, 'oneoff']],
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
    const [type, role, span, rate, scale, minFame] = pick(shelves[shelf]);
    const months = rint(span[0], span[1]);
    s.castingPool.push({
      id: 'cast' + Date.now() + Math.floor(Math.random() * 10000), title: titleFor(), type, role, shelf, scale,
      months, monthlyRate: rate, salary: rate * months,   // salary is the whole fee, paid across the shoot
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
        prestigeScore: rint(sc.prestige[0], sc.prestige[1]) + Math.round((quality - 50) * 0.12),
      });
      s.castingPool = (s.castingPool || []).filter((x) => x.id !== id);
      s.lastEvent = `${quality >= 80 ? 'The room goes quiet — you nailed it. ' : ''}You booked "${c.title}". ${c.months} months of shooting, €${(c.monthlyRate || 0).toLocaleString()} a month.`;
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
