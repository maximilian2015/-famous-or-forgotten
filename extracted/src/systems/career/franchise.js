// A career is not a list of unrelated jobs. The show that ran six years and the
// franchise you could not get out of are the things a life is remembered for.
//
// Nothing here existed: a series wrapped and vanished, a film never had a sequel.
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';

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

// Staying gets you paid more. Real series regulars get annual bumps, and after the
// third season the cast has leverage and uses it.
export function seasonRaise(season) {
  if (season <= 2) return 1.18;
  if (season === 3) return 1.6;        // the renegotiation season
  if (season <= 6) return 1.35;
  return 1.22;
}

const SEQUEL_WORDS = ['II', 'III', 'IV', 'V', 'VI'];
function sequelTitle(title, n) {
  const clean = String(title).replace(/\s+(II|III|IV|V|VI)$/, '');
  return `${clean} ${SEQUEL_WORDS[n - 2] || n}`;
}

// Films continue when they made money, and a franchise you optioned continues whether
// you want it to or not.
export function sequelOdds(rating, part, obliged) {
  if (obliged) return 100;
  if (part > 4) return 0;
  const base = rating >= 92 ? 72 : rating >= 84 ? 52 : rating >= 78 ? 30 : rating >= 70 ? 9 : 0;
  return Math.max(0, base - (part - 1) * 12);
}
export function sequelRaise(part) { return part === 2 ? 1.6 : part === 3 ? 2.2 : 2.6; }

// Called at the end of every production. Returns an offer to push, or null.
export function maybeContinue(s, credit, p) {
  const isSeries = !!p.episodes || !!p.season;
  const season = p.season || 1;
  const part = p.part || 1;

  if (isSeries) {
    const odds = renewalOdds(credit.rating, season, p.type);
    if (!chance(odds)) {
      if (season > 1) addTimeline(s, `"${p.title}" was not renewed after ${season} season${season === 1 ? '' : 's'}.`, true);
      return null;
    }
    const nextSeason = season + 1;
    const episodeFee = Math.round((p.episodeFee || Math.round(p.salary / Math.max(1, p.episodes || 1))) * seasonRaise(nextSeason));
    const episodes = Math.max(4, Math.round((p.episodes || 8) * (0.9 + Math.random() * 0.3)));
    addTimeline(s, `"${p.title}" was renewed for season ${nextSeason}.`);
    return {
      id: 'ren' + Date.now() + Math.floor(Math.random() * 1000),
      kind: 'renewal', seriesTitle: p.title, season: nextSeason,
      projectTitle: `${p.title} · season ${nextSeason}`, role: p.role, type: p.type, genre: p.genre,
      episodes, episodeFee, salary: episodeFee * episodes,
      months: Math.max(2, Math.round((p.months || 4) * (0.9 + Math.random() * 0.25))),
      prestigeScore: Math.min(96, (p.prestigeScore || 45) + rint(2, 7)), tier: p.tier || 'lead',
      fame: p.tier === 'tentpole' ? 9 : 5, deadline: rint(2, 3),
      note: nextSeason === 3
        ? 'Third season. The whole cast is renegotiating and the network knows it.'
        : `The network wants you back. Same part, ${Math.round((seasonRaise(nextSeason) - 1) * 100)}% more an episode.`,
    };
  }

  const obliged = !!p.optioned && part < (p.optionParts || 3);
  const odds = sequelOdds(credit.rating, part, obliged);
  if (!chance(odds)) return null;
  const nextPart = part + 1;
  const salary = Math.round((obliged ? p.salary : p.salary * sequelRaise(nextPart)));
  addTimeline(s, `A sequel to "${p.title}" is going ahead.`);
  return {
    id: 'seq' + Date.now() + Math.floor(Math.random() * 1000),
    kind: 'sequel', part: nextPart, optioned: p.optioned, optionParts: p.optionParts,
    projectTitle: sequelTitle(p.title, nextPart), role: p.role, type: p.type, genre: p.genre,
    salary, months: Math.max(2, Math.round((p.months || 5) * (0.95 + Math.random() * 0.25))),
    prestigeScore: Math.max(15, (p.prestigeScore || 50) - rint(2, 9)),   // sequels rarely out-prestige the first
    tier: p.tier || 'lead', fame: p.tier === 'tentpole' ? 9 : 5, deadline: rint(2, 3),
    note: obliged
      ? 'You signed for this one. The fee is the fee you agreed to years ago.'
      : `The first one made money. They are paying ${Math.round((sequelRaise(nextPart) - 1) * 100)}% more this time.`,
  };
}
