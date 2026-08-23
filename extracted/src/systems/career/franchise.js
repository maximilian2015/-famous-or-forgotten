// A career is not a list of unrelated jobs. The show that ran six years and the
// franchise you could not get out of are the things a life is remembered for.
//
// Nothing here existed: a series wrapped and vanished, a film never had a sequel.
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { quoteBand } from '../meta/status.js';

// How long a format can plausibly run. Daytime soaps run for decades; prestige
// streaming shows are written to end. This is the ceiling, not the expectation —
// most shows die at the first or second renewal regardless.
export const SEASON_CAP = {
  'Soap Opera': 12,
  'Talent Series': 10,
  'Crime Series': 8,
  'Drama Series': 7,
  'Music Show': 6,
  'Prestige Series': 5,
};
export function seasonCap(type) { return SEASON_CAP[type] || 5; }

// The network decides on the numbers. A flop is gone; a hit is renewed before the
// finale airs. Long-running shows also get tired — each season shaves the odds.
export function renewalOdds(rating, season, type) {
  // Anything the audience actually likes comes back — sixty is the line, and above it
  // renewal is the default rather than a coin toss. Below fifty the network starts
  // looking for a reason, and below forty it has one.
  const base = rating >= 88 ? 96 : rating >= 78 ? 93 : rating >= 68 ? 90 : rating >= 60 ? 86
    : rating >= 50 ? 55 : rating >= 40 ? 20 : 4;
  const fatigue = Math.max(0, season - 3) * 4;                  // long runs tire slowly
  const room = season >= seasonCap(type) ? -100 : 0;            // the format runs out
  return Math.max(0, Math.min(97, base - fatigue + room));
}

// Staying gets you a bump; being in a hit gets you a raise. A slipping show does not
// hand out money — the network knows the numbers as well as you do, and a cast with no
// leverage takes a cut. This is why the same season five can be worth +70% or −10%.
//
// Three parts: the automatic bump for coming back, what the last season actually rated,
// and whether it is climbing or sliding.
export function seasonBase(season) {
  if (season <= 2) return 1.10;
  if (season === 3) return 1.35;       // the season the whole cast renegotiates together
  if (season <= 6) return 1.15;
  return 1.08;
}
export function performanceFactor(rating) {
  if (rating >= 88) return 1.45;
  if (rating >= 78) return 1.25;
  if (rating >= 68) return 1.10;
  if (rating >= 60) return 1.00;
  if (rating >= 50) return 0.92;       // they trim the cast budget
  return 0.85;
}
export function trendFactor(rating, prevRating) {
  if (prevRating == null) return 1;
  if (rating >= prevRating + 5) return 1.12;   // the show is growing and you are why
  if (rating <= prevRating - 5) return 0.94;
  return 1;
}
export function seasonRaise(season, rating = 70, prevRating = null) {
  return seasonBase(season) * performanceFactor(rating) * trendFactor(rating, prevRating);
}
// The name of the show itself, with however many season suffixes have accumulated
// stripped off. Season 3 was being built from the season-2 TITLE, so shows were coming
// out as "Lost Signal · season 2 · season 3" and growing a segment every year.
export function seriesRoot(title) {
  return String(title || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();
}
// What the season before this one rated, so a trend can exist at all.
function previousRating(s, title, season) {
  if (!season || season < 2) return null;
  const root = seriesRoot(title);
  const prev = [...(s.filmography || []), ...(s.discography || [])]
    .find((c) => c.season === season - 1 && seriesRoot(c.title) === root);
  return prev ? prev.rating : null;
}

const SEQUEL_WORDS = ['II', 'III', 'IV', 'V', 'VI'];
function sequelTitle(title, n) {
  const clean = String(title).replace(/\s+(II|III|IV|V|VI)$/, '');
  return `${clean} ${SEQUEL_WORDS[n - 2] || n}`;
}

// Films continue when they made money, and a franchise you optioned continues whether
// you want it to or not.
//
// Reviews are the smaller half of this. A studio greenlights a sequel off the opening
// weekend, which is why beloved films die and stupid ones run five parts — the verdict
// can rescue a mediocre picture and can bury a well-reviewed one that nobody bought.
const SEQUEL_MONEY = { smash: 45, profitable: 18, 'broke even': -8, bomb: -55 };
export function sequelOdds(rating, part, obliged, verdict = null) {
  if (obliged) return 100;
  if (part > 4) return 0;
  const base = rating >= 92 ? 72 : rating >= 84 ? 52 : rating >= 78 ? 30 : rating >= 70 ? 9 : 0;
  const money = verdict ? (SEQUEL_MONEY[verdict] || 0) : 0;
  return Math.max(0, Math.min(95, base + money - (part - 1) * 12));
}
export function sequelRaise(part) { return part === 2 ? 1.6 : part === 3 ? 2.2 : 2.6; }

// The ceiling on any of this. Franchise money is real money — a fourth outing pays far more
// than the first — but it is still bounded by what somebody of your standing can command,
// and it was not bounded by anything at all: the raise multiplied the PREVIOUS part's fee,
// so part 4 paid nine times the first, part 8 four hundred times, and part 12 nineteen
// thousand times. A €5m picture became a €95bn one and the player ended a career on a
// billion euros. Every raise is measured against the FIRST part now, and capped here.
// A fourth outing pays a premium over the top of your band. Half again, not triple — the
// top of the icon band is already €80m for a tentpole, and tripling that put a career on
// nine figures a picture.
const FRANCHISE_PREMIUM = 1.5;
function ceilingFor(s, medium, share = 1) {
  const band = quoteBand(s, medium);
  if (!band) return Infinity;
  return Math.round(band[1] * share * FRANCHISE_PREMIUM);
}
function mediumOf(p) {
  if (p.episodes || p.season) return p.scale === 'prestige' ? 'tv_prestige' : 'tv_network';
  return p.tier === 'tentpole' ? 'film_tentpole' : p.scale === 'blockbuster' ? 'film_studio'
    : p.scale === 'feature' ? 'film_studio' : 'film_indie';
}

// Called at the end of every production. Returns an offer to push, or null.
export function maybeContinue(s, credit, p) {
  const isSeries = !!p.episodes || !!p.season;
  const season = p.season || 1;
  const part = p.part || 1;

  if (isSeries) {
    // Always build from the name of the SHOW, never from last season's project title.
    const root = seriesRoot(p.seriesTitle || p.title);
    const odds = renewalOdds(credit.rating, season, p.type);
    if (!chance(odds)) {
      if (season > 1) addTimeline(s, `"${root}" was not renewed after ${season} season${season === 1 ? '' : 's'}.`, true);
      return null;
    }
    const nextSeason = season + 1;
    const raise = seasonRaise(nextSeason, credit.rating, previousRating(s, root, season));
    const pct = Math.round((raise - 1) * 100);
    // Television does compound season on season, and it still cannot outrun what somebody
    // of your standing is paid — twelve renewals used to reach numbers with no meaning.
    const wasFee = p.episodeFee || Math.round(p.salary / Math.max(1, p.episodes || 1));
    const episodeFee = Math.min(Math.round(wasFee * raise), ceilingFor(s, mediumOf(p)));
    const episodes = Math.max(4, Math.round((p.episodes || 8) * (0.9 + Math.random() * 0.3)));
    addTimeline(s, `"${root}" was renewed for season ${nextSeason}.`);
    return {
      id: 'ren' + Date.now() + Math.floor(Math.random() * 1000),
      // A show that got renewed is a show that works. The money is not the question here.
      kind: 'renewal', seriesTitle: root, season: nextSeason, scale: p.scale,
      stability: Math.max(82, p.stability || 82),
      projectTitle: `${root} · season ${nextSeason}`, role: p.role, type: p.type, genre: p.genre,
      episodes, episodeFee, salary: episodeFee * episodes, baseSalary: p.baseSalary || p.salary,
      months: Math.max(2, Math.round((p.months || 4) * (0.9 + Math.random() * 0.25))),
      prestigeScore: Math.min(96, (p.prestigeScore || 45) + rint(2, 7)), tier: p.tier || 'lead',
      fame: p.tier === 'tentpole' ? 9 : 5, deadline: rint(2, 3),
      note: nextSeason === 3 && pct > 0
        ? `Third season — the whole cast renegotiates together and the network knows it. ${pct}% more an episode.`
        : pct > 0 ? `The network wants you back. Same part, ${pct}% more an episode.`
        : pct < 0 ? `The network wants you back — at ${-pct}% less an episode. The numbers were not good.`
        : 'The network wants you back. Same part, same money.',
    };
  }

  const obliged = !!p.optioned && part < (p.optionParts || 3);
  const odds = sequelOdds(credit.rating, part, obliged, credit.verdict);
  if (!chance(odds)) return null;
  const nextPart = part + 1;
  // Against the first part, never against the last one. See ceilingFor above.
  const first = p.baseSalary || p.salary;
  const raw = obliged ? p.salary : Math.round(first * sequelRaise(nextPart));
  const salary = Math.min(raw, ceilingFor(s, mediumOf(p)));
  addTimeline(s, `A sequel to "${p.title}" is going ahead.`);
  return {
    id: 'seq' + Date.now() + Math.floor(Math.random() * 1000),
    kind: 'sequel', part: nextPart, optioned: p.optioned, optionParts: p.optionParts, scale: p.scale,
    stability: Math.max(85, p.stability || 85),   // nobody defunds a sequel to something that made money
    projectTitle: sequelTitle(p.title, nextPart), role: p.role, type: p.type, genre: p.genre,
    salary, baseSalary: first, months: Math.max(2, Math.round((p.months || 5) * (0.95 + Math.random() * 0.25))),
    prestigeScore: Math.max(15, (p.prestigeScore || 50) - rint(2, 9)),   // sequels rarely out-prestige the first
    tier: p.tier || 'lead', fame: p.tier === 'tentpole' ? 9 : 5, deadline: rint(2, 3),
    note: obliged
      ? 'You signed for this one. The fee is the fee you agreed to years ago.'
      : credit.verdict === 'smash'
      ? `The last one printed money. They are paying ${Math.round((sequelRaise(nextPart) - 1) * 100)}% more and they are not haggling.`
      : `The first one made money. They are paying ${Math.round((sequelRaise(nextPart) - 1) * 100)}% more this time.`,
  };
}
