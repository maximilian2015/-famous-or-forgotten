// How many films in this game reach a billion.
//
// Maxi, looking at €1,163m on a €220m picture: "бокс офис какой-то нереальный, такое собирают
// ну очень мало фильмов." The only honest answer is the distribution, so this runs the real
// release model over a few thousand pictures in the mix the business actually makes them and
// reports what comes out.
//
// What it has to be measured against, because a number on its own means nothing:
//   about fifty films in the whole history of cinema have passed a billion dollars;
//   in a strong year two or three do it, out of roughly seven hundred wide releases;
//   so: well under one percent of everything, and roughly one in fifteen or twenty of the
//   fifty-odd pictures a year that are actually built to try.
import { demandFor, openingFor, legsFor, expansionFor, verdictOf, breakEvenFor } from '../src/systems/career/release.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const GENRES = ['Drama', 'Crime', 'Romance', 'Musical', 'Thriller', 'Sci-Fi', 'Comedy', 'Horror'];
// The mix a year of cinema is actually made in: a few tentpoles, a lot of middle, and a long
// tail of things nobody outside a festival ever hears about.
const MIX = ['small', 'small', 'small', 'festival', 'festival', 'indie', 'indie', 'indie', 'indie',
  'prestige', 'prestige', 'feature', 'feature', 'feature', 'feature', 'feature', 'blockbuster', 'blockbuster'];
const CAMPAIGNS = ['minimal', 'standard', 'standard', 'major', 'major', 'event'];

const state = (fame, media) => ({ fame, media, year: 2066, month: Math.floor(Math.random() * 12),
  hypeSource: null, typecast: { scores: {}, active: [] }, market: null, acting: 60 });

const one = (over = {}) => {
  const scale = over.scale || pick(MIX);
  const rel = {
    scale, genre: over.genre || pick(GENRES),
    rating: over.rating != null ? over.rating : 30 + Math.round(Math.random() * 62),
    campaignTier: over.campaignTier || (scale === 'blockbuster' ? pick(['major', 'event', 'event']) : pick(CAMPAIGNS)),
    part: 1, appealMod: 1, withFame: Math.random() < 0.4 ? 20 + Math.random() * 60 : 0,
  };
  rel.reception = Math.max(0, Math.min(100, rel.rating + (Math.random() * 24 - 12)));
  const s = state(over.fame != null ? over.fame : 10 + Math.round(Math.random() * 85), Math.round(Math.random() * 40));
  const demand = demandFor(s, rel);
  const opening = openingFor(s, rel, demand);
  // openingFor is in MILLIONS — boxOfficeFor multiplies the three stages by 1e6 at the end.
  // The first version of this divided by a million again and reported that no film in the game
  // had ever made a hundred euros, which is the probe being wrong, not the model.
  const gross = opening * legsFor(rel) * expansionFor(rel) * 1e6;
  return { ...rel, demand, opening, gross, needed: breakEvenFor(rel),
    verdict: verdictOf({ scale: rel.scale, rating: rel.rating, boxOffice: gross, campaignTier: rel.campaignTier, type: 'Feature Film' }) };
};

const N = 6000;
const all = Array.from({ length: N }, () => one());
const M = (x) => x / 1e6;
const pct = (n) => (n / N * 100).toFixed(2) + '%';

const over = (m) => all.filter((f) => M(f.gross) >= m).length;
console.log(`${N} pictures, in the mix a year of cinema is made in`);
console.log();
console.log('  over €1,000m : ' + String(over(1000)).padStart(5) + '   ' + pct(over(1000)).padStart(7) + '   (real: well under 0.5%)');
console.log('  over   €700m : ' + String(over(700)).padStart(5) + '   ' + pct(over(700)).padStart(7));
console.log('  over   €400m : ' + String(over(400)).padStart(5) + '   ' + pct(over(400)).padStart(7));
console.log('  over   €200m : ' + String(over(200)).padStart(5) + '   ' + pct(over(200)).padStart(7));
console.log('  over   €100m : ' + String(over(100)).padStart(5) + '   ' + pct(over(100)).padStart(7));
console.log();

// The one that matters: of the pictures actually built to try for it.
const tent = all.filter((f) => f.scale === 'blockbuster');
const tentOver = tent.filter((f) => M(f.gross) >= 1000).length;
console.log(`  of the ${tent.length} blockbusters: ${tentOver} passed a billion — ${(tentOver / tent.length * 100).toFixed(1)}%   (real: about 5-7% of tentpoles)`);
const feat = all.filter((f) => f.scale === 'feature');
console.log(`  of the ${feat.length} ordinary features: ${feat.filter((f) => M(f.gross) >= 1000).length} passed a billion   (real: essentially none)`);
console.log();

const sorted = all.map((f) => M(f.gross)).sort((a, b) => a - b);
const q = (p) => Math.round(sorted[Math.floor(sorted.length * p)]);
console.log(`  median €${q(0.5)}m   ·  75th €${q(0.75)}m  ·  90th €${q(0.9)}m  ·  99th €${q(0.99)}m  ·  top €${Math.round(sorted[sorted.length - 1])}m`);
console.log();

// And whether the top of the market is reachable only by the things that should reach it.
const billion = all.filter((f) => M(f.gross) >= 1000);
if (billion.length) {
  const byScale = {};
  for (const f of billion) byScale[f.scale] = (byScale[f.scale] || 0) + 1;
  const avgRating = Math.round(billion.reduce((n, f) => n + f.rating, 0) / billion.length);
  const avgFameless = billion.filter((f) => f.rating < 70).length;
  console.log('  the billion club: ' + Object.entries(byScale).map(([k, v]) => `${k} ${v}`).join(', '));
  console.log(`  their average rating ${avgRating}; ${avgFameless} of ${billion.length} were rated under 70`);
}
console.log();
const v = {};
for (const f of all) v[f.verdict] = (v[f.verdict] || 0) + 1;
console.log('  verdicts: ' + Object.entries(v).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${pct(n)}`).join(' · '));

// ── and the picture on Maxi's screen ──────────────────────────────────────────
// The marginal distribution above answers "do films in general reach a billion" (they do not).
// It does not answer the question he actually asked, which is about ONE configuration: a
// blockbuster, an event campaign, a known face, and a crowd that liked it. A thing can be one
// in six thousand overall and routine inside its own corner, and that is worth knowing.
console.log();
console.log('— the configuration on the screen: blockbuster, event campaign, rating 77 —');
for (const fame of [25, 50, 75, 95]) {
  const run = Array.from({ length: 3000 }, () => one({ scale: 'blockbuster', campaignTier: 'event', rating: 77, fame }));
  const g = run.map((f) => f.gross / 1e6).sort((a, b) => a - b);
  const bn = run.filter((f) => f.gross >= 1e9).length;
  console.log(`  fame ${String(fame).padStart(2)}:  median €${Math.round(g[1500])}m   top €${Math.round(g[2999])}m   past a billion: ${(bn / 30).toFixed(1)}%`);
}
