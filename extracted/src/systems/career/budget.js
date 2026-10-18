// What a picture costs to make. Budget Model V2 (Maxi, 18 Oct 2026, at a family comedy that cost
// €220m because its lead was the lead of a big film: "чиним бюджеты").
//
// Six things are kept apart on purpose, because the Media Ecosystem will need every one of them
// separately: the MEDIUM (film, television), the FORMAT (feature, series, soap, advert), the
// SCALE (how big a release the project is — small, festival, indie, feature, blockbuster), the
// GENRE, the PRODUCTION REQUIREMENTS (effects, stunts, a period setting, a big cast, set pieces),
// and the PLAYER'S ROLE. The budget reads the scale, the genre and the requirements. It never
// reads the role.
//
// A scale is a range, not a number. The genre places a picture in it — horror and drama are cheap
// to make, a musical has to build its stage, science fiction its world — and the requirements and
// the project itself move it from there, so a comedy can be €18m, €38m, or now and then €90m
// when what it has to put on screen costs that. Deterministic: the same project always costs the
// same, seeded by its id (stable through a rename), and kept on it once given.
import { hash, rng } from '../../engine/hash.js';

// €m, low and high. The blockbuster range is set so its middle stays where the single number was
// (€220m): the box office for tentpoles — and the Billion Club — was calibrated there.
export const RANGE = { small: [0.3, 3], festival: [0.6, 6], indie: [1.5, 22], feature: [15, 130], blockbuster: [170, 290] };
// Where a genre starts inside its range, 0 to 1.
export const GENRE_AT = { Horror: 0.12, Drama: 0.22, Romance: 0.28, Comedy: 0.3, Crime: 0.42, Thriller: 0.46, Musical: 0.58, 'Sci-Fi': 0.7 };
// What a production can need, how likely in each genre (%), and how far up the range it moves it.
export const NEEDS = {
  effects: { label: 'effects', push: 0.22, odds: { 'Sci-Fi': 70, Horror: 25, Thriller: 15, Musical: 10, Comedy: 6, Crime: 5 } },
  stunts: { label: 'stunts', push: 0.14, odds: { Thriller: 45, Crime: 35, 'Sci-Fi': 40, Comedy: 12, Horror: 15, Romance: 4 } },
  period: { label: 'a period setting', push: 0.1, odds: { Drama: 25, Romance: 25, Musical: 30, Crime: 15, Comedy: 6 } },
  ensemble: { label: 'a big cast', push: 0.08, odds: { Comedy: 22, Musical: 40, Drama: 12, Crime: 12, Thriller: 6 } },
  spectacle: { label: 'set pieces', push: 0.28, odds: { Comedy: 5, Drama: 3, Romance: 3, Crime: 6, Thriller: 8, Horror: 5, Musical: 8, 'Sci-Fi': 12 } },
};
const FILM = new Set(['small', 'festival', 'indie', 'feature', 'blockbuster']);
export const hasBudget = (scale) => FILM.has(scale);

// The budget a project of this scale and genre costs, from its seed. { budget: €m, needs: [...] }
export function planBudget({ seed, genre, scale }) {
  const [lo, hi] = RANGE[scale] || RANGE.indie;
  const r = rng(hash('budget:' + String(seed) + '|' + (genre || '') + '|' + scale));
  let t = GENRE_AT[genre] ?? 0.4;
  const needs = [];
  for (const [k, n] of Object.entries(NEEDS)) if (r() * 100 < (n.odds[genre] || 0)) { t += n.push; needs.push(k); }
  t += (r() - 0.5) * 0.36;
  // Every tentpole is expensive, whatever it is about: the genre moves one half as far, so a
  // science-fiction tentpole does not need €900m to break even (the box office and the Billion
  // Club for tentpoles were calibrated at €220m, and this keeps them near it).
  if (scale === 'blockbuster') t = 0.5 + (t - 0.5) * 0.5;
  t = Math.max(0, Math.min(1, t));
  const m = lo * Math.pow(hi / lo, t);
  return { budget: m >= 10 ? Math.round(m) : Math.round(m * 10) / 10, needs };
}
// Give a project its budget if it has none: an offer, a casting, a set, a release, a credit. Kept
// on it from then on. Only films have one; television is priced by the episode elsewhere.
export function ensureBudget(p, seed) {
  if (!p || !hasBudget(p.scale) || (Number.isFinite(p.budget) && p.budget > 0)) return p;
  const plan = planBudget({ seed: seed ?? p.id ?? p.title ?? p.projectTitle, genre: p.genre, scale: p.scale });
  p.budget = plan.budget; p.needs = plan.needs;
  return p;
}
// A sequel costs more than the film it follows — the same requirements, a bigger version of them —
// and stays inside its scale's range.
export function sequelBudget(prev, scale, part = 2) {
  const [lo, hi] = RANGE[scale] || RANGE.feature;
  const grown = (prev || lo) * (1 + 0.18 * Math.min(3, part - 1));
  return Math.round(Math.max(lo, Math.min(hi * 1.1, grown)));
}
export function needsWords(needs) { return (needs || []).map((k) => (NEEDS[k] ? NEEDS[k].label : k)); }
