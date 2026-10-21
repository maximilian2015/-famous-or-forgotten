// The examples in 2026-10-21-streaming-movies-v1-plan.md §3, computed from the plan's own formulas
// (the series plan's revision 3 table did not match its formulas; this is why it is a script).
// The film side is the PLAN's arithmetic, written out here; the series side is the shipped
// dropSeason, imported, so the comparison is against what the game really does.
//   node docs/handoffs/2026-10-21-streaming-movies-examples.mjs
import { dropSeason } from '../../src/systems/career/streaming.js';

const SUBS = { global: 260, prestige: 90, library: 150, niche: 25 };
const AFFINITY = {
  global: { Comedy: 1.10, Crime: 1.00, Drama: 0.95, Horror: 1.10, Musical: 0.85, Romance: 0.95, 'Sci-Fi': 1.10, Thriller: 1.10 },
  prestige: { Comedy: 0.80, Crime: 1.25, Drama: 1.30, Horror: 0.70, Musical: 0.85, Romance: 0.90, 'Sci-Fi': 0.95, Thriller: 1.10 },
  library: { Comedy: 1.25, Crime: 1.20, Drama: 1.00, Horror: 0.85, Musical: 0.90, Romance: 1.15, 'Sci-Fi': 0.80, Thriller: 0.95 },
  niche: { Comedy: 0.60, Crime: 0.80, Drama: 0.60, Horror: 1.50, Musical: 0.60, Romance: 0.60, 'Sci-Fi': 1.40, Thriller: 1.10 },
};
// plan §1: target (views28 per €1m of the whole cost) · Number-one bar (views28, M) · push lines (€m) · the platform's own marketing
const FILM = {
  global: { target: 0.24, bar: 70, big: 120, low: 30, sell: 0.10 },
  prestige: { target: 0.40, bar: 25, big: 35, low: 10, sell: 0.06 },
  library: { target: 0.90, bar: 35, big: 18, low: 6, sell: 0.04 },
  niche: { target: 0.50, bar: 10, big: 6, low: 2, sell: 0.03 },
};
const PUSH = { low: 0.6, standard: 1, big: 1.6 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const castDraw = (names) => names.filter((n) => n > 0).sort((a, b) => b - a).reduce((n, f, i) => n + Math.pow(f, 0.82) * ([1, 0.55, 0.25, 0.12][i] ?? 0.05), 0);
const fameFromViews = (v, supporting) => { const lead = Math.min(8, Math.floor(v / 5)); return supporting ? Math.floor(lead / 2) : lead; };

function dropFilm({ p, genre, budget, price = null, feeM, names, hype, word, rating, tier = 'lead', event = false }) {
  const P = FILM[p], draw = castDraw(names);
  const cost = (price ?? budget * (1 + P.sell)) + feeM;
  const push = cost >= P.big || draw >= 30 ? 'big' : cost <= P.low && draw < 12 ? 'low' : 'standard';
  const awareness = 0.5 + draw / 25 + hype / 100;
  const weekend = SUBS[p] * 0.016 * awareness * PUSH[push] * AFFINITY[p][genre];
  const week1 = weekend * 1.8;
  const hold = clamp(0.25 + (word - 50) * 0.01, 0.15, 0.75);
  const views28 = Math.min(week1 * (1 + hold + hold ** 2 + hold ** 3), 0.6 * SUBS[p]);
  const acclaim = p === 'prestige' ? 1 + Math.max(0, rating - 70) / 50 : 1;
  const score = views28 / cost / P.target * acclaim;
  const outcome = score < 0.7 ? 'Miss' : score < 1.4 ? 'Solid' : views28 >= P.bar && hold >= 0.55 ? 'Number one' : 'Hit';
  let top10 = 0; for (let k = 0; k < 8; k++) if (week1 * hold ** k >= SUBS[p] * 0.01) top10++;
  const poster = tier === 'supporting' ? 1 : event ? 5 : 3;
  return { platform: p, cost: +cost.toFixed(1), push, weekend: +weekend.toFixed(1), week1: +week1.toFixed(1), hold: +hold.toFixed(2),
    'week 1 %': Math.round(100 * week1 / views28), views28: +views28.toFixed(1), score: +score.toFixed(2), outcome, 'top 10 wks': top10,
    afterlife: +(views28 * (0.4 + 1.2 * hold)).toFixed(1), fame: poster + fameFromViews(views28, tier === 'supporting') };
}

const star = [70, 50];
console.table({
  'A unknown · genre service horror': dropFilm({ p: 'niche', genre: 'Horror', budget: 2, feeM: 0.03, names: [8], hype: 0, word: 55, rating: 52 }),
  'B rising · ad-supported rom-com': dropFilm({ p: 'library', genre: 'Romance', budget: 10, feeM: 0.25, names: [30], hype: 15, word: 62, rating: 58 }),
  'C star · giant event, ordinary': dropFilm({ p: 'global', genre: 'Sci-Fi', budget: 180, feeM: 18, names: star, hype: 40, word: 60, rating: 60, event: true }),
  'D star · giant event, loved': dropFilm({ p: 'global', genre: 'Sci-Fi', budget: 180, feeM: 18, names: star, hype: 40, word: 82, rating: 78, event: true }),
  'E known · premium drama 8.6': dropFilm({ p: 'prestige', genre: 'Drama', budget: 22, feeM: 1.5, names: [45], hype: 10, word: 72, rating: 86 }),
  'F festival prize, bought': dropFilm({ p: 'prestige', genre: 'Drama', budget: 2.5, price: 4, feeM: 0, names: [15], hype: 30, word: 74, rating: 84 }),
  'G supporting · giant event': dropFilm({ p: 'global', genre: 'Thriller', budget: 140, feeM: 1, names: [60, 30], hype: 10, word: 64, rating: 62, tier: 'supporting' }),
});

// The same star, the same genre, the same giant — a season instead of a film (the shipped arithmetic).
const lumen = { id: 'plt-global', archetype: 'global', name: 'Lumen' };
const season = (word, rating) => {
  const d = dropSeason({ platform: lumen, genre: 'Sci-Fi', episodes: 8, season: 1, rating, word, hype: 40, draw: castDraw(star), salaryM: 18, episodeCost: 15, dice: 1 });
  return { cost: d.cost, push: d.push, opening7: d.opening7, 'week 1 %': Math.round(100 * d.opening7 / d.views28), views28: d.views28, completion: d.completion, finished28: d.finished28, score: d.score, outcome: d.outcome, reach: d.reach };
};
console.table({ 'C′ star · giant season, ordinary': season(60, 60), 'D′ star · giant season, loved': season(82, 78) });
