// The rest of the business. Forty-odd actors with names, ages and careers of their own, who
// make films every year whether you do or not, get famous and stop being famous, win the
// Askers you did not, retire, die, and are replaced by somebody twenty-two. Before this the
// world was a random name conjured for one awards night and thrown away — you could not
// come second to anybody, because there was nobody to come second to.
//
// Everything here is one arithmetic with yours: a rival's film is priced by release.js's
// grossFor, scored the way production.js scores yours (skill as a floor, the rest luck and
// material), and moves their fame by the same shape as closeRun moves yours. Otherwise the
// lists would be nonsense — a year's top ten has to compare like with like.
import { rint, chance, pick } from '../../engine/rng.js';
import { fameTier } from '../meta/status.js';
import { grossFor } from '../career/release.js';
import { personName, namesInUse, OUTLETS } from './names.js';
import { newTitle } from './titles.js';

export const GENRES = ['Drama', 'Comedy', 'Thriller', 'Horror', 'Romance', 'Crime', 'Sci-Fi', 'Musical'];
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

// ── the roster ────────────────────────────────────────────────────────────────
// How many of each kind exist at any time. Three icons is about right for a business:
// everybody can name them, and there is room for one more.
const SEED = [
  ['icon', 3, [88, 96]], ['alist', 5, [75, 88]], ['star', 8, [55, 74]],
  ['known', 10, [35, 54]], ['rising', 8, [15, 34]], ['unknown', 8, [2, 14]],
];
function makeActor(s, tier, fameSpan, taken, age) {
  const gender = chance(50) ? 'female' : 'male';
  const fame = rint(fameSpan[0], fameSpan[1]);
  // Craft roughly follows standing — you do not get to the top without it — with room
  // for the famous-and-mediocre and the brilliant-and-unknown.
  const craft = clamp(30 + fame * 0.55 + rint(-14, 18), 25, 96);
  // How good they could get. Craft grows with every film toward it, so a twenty-two-year-old
  // nobody with the talent becomes the icon of your fifties — the roster has to renew itself
  // or the wall goes empty once the first generation retires.
  const talent = clamp(Math.max(craft, 55 + rint(0, 43)), 55, 98);
  return {
    id: 'w' + Math.random().toString(36).slice(2, 8), name: personName(gender, taken), gender,
    born: (s.year || 2026) - age, fame, craft, talent, genre: pick(GENRES), respect: clamp(craft * 0.6 + rint(-10, 15)),
    icon: tier === 'icon', iconSince: tier === 'icon' ? (s.year || 2026) - rint(2, 12) : null,
    alive: true, retired: false, askers: 0, noms: 0, credits: [], debut: (s.year || 2026) - Math.max(0, age - rint(18, 24)),
  };
}
export function ensureWorld(s) {
  if (s.world && s.world.actors) return s.world;
  const taken = namesInUse(s);
  const actors = [];
  for (const [tier, n, span] of SEED) {
    for (let i = 0; i < n; i++) {
      const age = tier === 'icon' ? rint(38, 62) : tier === 'alist' ? rint(30, 55) : tier === 'star' ? rint(26, 50)
        : tier === 'known' ? rint(24, 48) : tier === 'rising' ? rint(20, 34) : rint(18, 28);
      actors.push(makeActor(s, tier, span, taken, age));
    }
  }
  s.world = { actors, critics: makeCritics(taken), years: {}, seeded: s.year || 2026 };
  return s.world;
}
export function actorById(s, id) { return ((s.world && s.world.actors) || []).find((a) => a.id === id) || null; }
export function ageOf(s, a) { return (s.year || 0) - (a.born || 0); }
export function icons(s) { return ((s.world && s.world.actors) || []).filter((a) => a.icon && a.alive); }
export function activeActors(s) { return ((s.world && s.world.actors) || []).filter((a) => a.alive && !a.retired); }

// ── a year of everybody else's work ───────────────────────────────────────────
const SCALE_BY_TIER = {
  unknown: [['small', 60], ['indie', 40]],
  rising: [['indie', 60], ['small', 20], ['feature', 20]],
  known: [['feature', 45], ['indie', 40], ['small', 15]],
  star: [['feature', 55], ['indie', 25], ['blockbuster', 20]],
  alist: [['blockbuster', 40], ['feature', 45], ['indie', 15]],
  icon: [['blockbuster', 50], ['feature', 35], ['indie', 15]],
};
function weighted(rows) { let r = Math.random() * 100; for (const [v, w] of rows) { r -= w; if (r <= 0) return v; } return rows[0][0]; }
function filmsThisYear(tier) {
  if (tier === 'icon') return chance(15) ? 0 : chance(30) ? 2 : 1;
  if (tier === 'alist') return chance(40) ? 2 : 1;
  if (tier === 'star' || tier === 'known') return rint(1, 2);
  if (tier === 'rising') return chance(30) ? 2 : 1;
  return chance(60) ? 1 : 0;
}
// The same shape production.js uses for you: skill is a floor, the material and the luck
// are the rest. A master makes a bad film now and then; a nobody makes a good one now and then.
const MATERIAL = { small: 0, indie: 6, feature: 8, blockbuster: 4 };
function ratingFor(a, scale) {
  // Now and then one simply comes together, and now and then one falls apart in the edit —
  // the same two accidents production.js allows you.
  return clamp(18 + a.craft * 0.52 + (MATERIAL[scale] || 0) + rint(-16, 14) + (chance(8) ? rint(8, 16) : 0) + (chance(10) ? rint(-22, -10) : 0), 10, 96);
}
const PRESTIGE = { small: [15, 30], indie: [35, 55], feature: [55, 72], blockbuster: [80, 96] };
export function makeWorldFilm(s, a, year, taken) {
  const tier = a.icon ? 'icon' : fameTier(a.fame).id;
  const scale = weighted(SCALE_BY_TIER[tier] || SCALE_BY_TIER.unknown);
  const genre = chance(65) ? a.genre : pick(GENRES);
  const rating = ratingFor(a, scale);
  const gross = grossFor({ scale, rating, genre, fame: a.fame, trend: chance(12) });
  const pr = PRESTIGE[scale] || PRESTIGE.indie;
  return { id: 'wf' + Math.random().toString(36).slice(2, 8), title: newTitle(s, genre, taken), genre, scale, rating, gross, year,
    actorId: a.id, actor: a.name, prestigeScore: rint(pr[0], pr[1]), tier: scale === 'blockbuster' ? 'tentpole' : scale === 'small' ? 'supporting' : 'lead' };
}
// The same headroom closeRun applies to you: ordinary work climbs to Star; the wall is above it.
function headroom(f) {
  if (f < 55) return 1 - f / 130;
  return Math.max(0.03, 0.577 * Math.pow(Math.max(0, (104 - f) / 49), 1.9));
}
function verdictOf(scale, gross) {
  const budget = { small: 1, indie: 12, feature: 90, blockbuster: 220 }[scale] || 1;
  const ratio = gross / (budget * 1000000);
  return ratio >= 4 ? 'smash' : ratio >= 2.2 ? 'profitable' : ratio >= 1.1 ? 'broke even' : 'bomb';
}
export function applyFilmToActor(a, f) {
  const by = { blockbuster: 9, feature: 5, indie: 3, small: 2 }[f.scale] || 2;
  const v = verdictOf(f.scale, f.gross);
  let fame = by + (f.rating >= 85 ? 4 : 0) + (v === 'smash' ? 8 : v === 'profitable' ? 3 : v === 'bomb' ? -3 : 0);
  fame = Math.max(1, fame);
  a.fame = clamp(a.fame + fame * headroom(a.fame));
  a.respect = clamp((a.respect || 50) + (f.rating >= 85 ? 4 : f.rating >= 70 ? 1.5 : f.rating < 45 ? -2 : 0));
  a.craft = clamp(Math.min(a.talent || 96, a.craft + rint(1, 3)));
  a.credits.push({ title: f.title, year: f.year, rating: f.rating, gross: f.gross, scale: f.scale, genre: f.genre, withYou: !!f.withYou });
  if (a.credits.length > 60) a.credits.shift();
}
// An icon is not a number. Ninety fame and either a statuette or three enormous pictures —
// and there are never more than a handful at once: past five, the bar goes up.
export function maybeIcon(a, year, living = 0) {
  if (a.icon) return;
  const big = a.credits.filter((c) => c.gross >= 300000000).length;
  const bar = 90 + Math.max(0, living - 4) * 2;
  if (a.fame >= bar && ((a.askers || 0) >= 1 || big >= 3)) { a.icon = true; a.iconSince = year; }
}

// Runs once a year, in January, for the year just gone. Everybody works, ages, and some of
// them stop. Your own films for the year are folded in by yearbook.js, which calls this.
export function worldYear(s, year) {
  const w = ensureWorld(s);
  const taken = new Set([...(s.castingPool || []).map((c) => c.title), ...(s.filmography || []).map((c) => c.title)]);
  const films = [];
  const names = namesInUse(s);
  for (const a of w.actors) {
    if (!a.alive) continue;
    const age = year - a.born;
    if (a.retired) { if (age >= 72 && chance(age >= 84 ? 22 : 7)) { a.alive = false; a.died = year; } continue; }
    // A career ends the way they do: the phone stops, or you stop answering it. And most
    // people who try this never get anywhere and quietly do something else.
    const years = year - (a.debut || year);
    if ((age >= 60 && a.fame < 35 && chance(35)) || (age >= 70 && chance(30)) || age >= 80
      || (years >= 10 && a.fame < 20 && chance(40))) { a.retired = true; a.retiredIn = year; continue; }
    if (age >= 68 && chance(age >= 78 ? 14 : 4)) { a.alive = false; a.died = year; continue; }
    const tier = a.icon ? 'icon' : fameTier(a.fame).id;
    const living = w.actors.filter((x) => x.icon && x.alive && !x.retired).length;
    const n = filmsThisYear(tier);
    // Films already made with you this year are on their sheet already.
    const already = a.credits.filter((c) => c.year === year && c.withYou).length;
    for (let i = already; i < n; i++) {
      const f = makeWorldFilm(s, a, year, taken);
      applyFilmToActor(a, f);
      maybeIcon(a, year, living);
      films.push(f);
    }
    if (n === 0 && !a.credits.some((c) => c.year === year)) a.fame = clamp(a.fame - (a.icon ? 2 : 4));
    // The parts thin out past a certain age, and the name goes with them — unless it is one
    // of the names that does not go.
    if (age > (a.gender === 'female' ? 45 : 52) && !a.icon) a.fame = clamp(a.fame - 1.5);
    if (a.icon) a.fame = Math.max(a.fame, 75);
  }
  // Somebody new every year. Two of them, twenty-two, nobody has heard of either.
  for (let i = 0; i < 2; i++) {
    const a = makeActor(s, 'unknown', [2, 12], names, rint(18, 24));
    a.debut = year; w.actors.push(a);
  }
  // The roster does not grow without limit: the dead and the long-retired are kept for the
  // wall and dropped from the working list after a while.
  if (w.actors.length > 90) w.actors = w.actors.filter((a) => a.alive && (!a.retired || year - (a.retiredIn || year) < 15)).concat(w.actors.filter((a) => !a.alive).slice(-10));
  return films;
}

// ── critics ───────────────────────────────────────────────────────────────────
// Twelve people who write about films for a living. Each has a paper, a genre they love,
// one they cannot stand, and a temperament — the one who never gives five stars is a
// feature, not a bug: you learn who they are. They retire and are replaced like anybody.
export function makeCritics(taken) {
  const outlets = [...OUTLETS].sort(() => Math.random() - 0.5);
  const critics = [];
  for (let i = 0; i < 12; i++) {
    const gender = chance(50) ? 'female' : 'male';
    const loves = pick(GENRES); let hates = pick(GENRES); if (hates === loves) hates = null;
    critics.push({ id: 'cr' + Math.random().toString(36).slice(2, 7), name: personName(gender, taken), outlet: outlets[i] || pick(OUTLETS),
      loves, hates, harsh: Math.round((Math.random() * 2 - 1) * 10) / 10,   // −1 generous … +1 merciless
      pop: chance(40),   // writes for the audience, not the academy — cares about the money
      since: 0 });
  }
  return critics;
}
export function critics(s) { return ensureWorld(s).critics; }
