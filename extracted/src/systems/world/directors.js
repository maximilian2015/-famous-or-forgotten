// The people who decide what a film is.
//
// Maxi: "the agent only brings the top directors — the best, the most popular, the icons —
// or world-scale projects." That sentence needs a thing the world did not have. There were
// directors on a set, generated at wrap and thrown away, and a director in your phone if
// one warmed to you; there was nobody in the business for you to want to work with. So the
// world has a roster of them now, the same way it has actors: names with a standing, a
// genre they are known for, a body of work that grows, and a rank that moves.
//
// This is the thing that makes "who is directing" a reason to take a part — which is the
// whole of how a star actually chooses, and none of how this game let you choose.
import { rint, chance, pick } from '../../engine/rng.js';
import { personName, namesInUse } from './names.js';
import { GENRES } from '../meta/news.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

// How many of each kind exist at once. A business has a handful of people everybody wants
// and a long tail of people who work — and the handful is small, which is the point of it.
const SEED = [
  ['great', 4, [82, 96]],     // the five names. Everybody would clear a year for them.
  ['strong', 7, [62, 81]],    // a name on a poster. A good film with them is expected.
  ['working', 12, [38, 61]],  // they make the films. Most of what you do is with these.
  ['new', 8, [18, 37]],       // a first feature, and nobody knows yet.
];
export const RANK_LABEL = { great: 'One of the five', strong: 'A name', working: 'Works constantly', new: 'A first film' };

function makeDirector(s, band, span, taken) {
  const gender = chance(50) ? 'female' : 'male';
  const standing = rint(span[0], span[1]);
  return {
    id: 'd' + Math.random().toString(36).slice(2, 8),
    name: personName(gender, taken), gender,
    born: (s.year || 2026) - rint(band === 'new' ? 28 : band === 'working' ? 34 : band === 'strong' ? 42 : 48, band === 'new' ? 38 : band === 'working' ? 58 : 70),
    standing,                                  // what the business thinks of them, 0..100
    band,
    genre: pick(GENRES),                       // what they are known for
    films: 0, best: 0, askers: 0,
    alive: true, retired: false,
  };
}
export function ensureDirectors(s) {
  if (!s.world) return [];
  if (s.world.directors && s.world.directors.length) return s.world.directors;
  const taken = namesInUse(s);
  const out = [];
  for (const [band, n, span] of SEED) for (let i = 0; i < n; i++) out.push(makeDirector(s, band, span, taken));
  s.world.directors = out;
  return out;
}
export function directors(s) { return (s.world && s.world.directors) || []; }
export function directorById(s, id) { return directors(s).find((d) => d.id === id) || null; }
export function workingDirectors(s) { return directors(s).filter((d) => d.alive && !d.retired); }
// The five. Ranked by standing, and it is a real ranking — it moves when their films do.
export function theFive(s) {
  return workingDirectors(s).slice().sort((a, b) => b.standing - a.standing).slice(0, 5);
}
export function isOneOfTheFive(s, d) { return !!d && theFive(s).some((x) => x.id === d.id); }
export function bandOf(d) { return d ? d.band : null; }

// Who would be directing a picture of this size. Nobody gives a first feature to a
// tentpole, and one of the five is not making a two-week horror for scale.
const BY_SCALE = {
  blockbuster: [['great', 34], ['strong', 52], ['working', 14]],
  feature:     [['great', 16], ['strong', 42], ['working', 40], ['new', 2]],
  prestige:    [['great', 26], ['strong', 44], ['working', 30]],
  festival:    [['great', 10], ['strong', 26], ['working', 40], ['new', 24]],
  indie:       [['great', 5], ['strong', 22], ['working', 48], ['new', 25]],
  small:       [['working', 40], ['new', 60]],
  recurring:   [['strong', 18], ['working', 62], ['new', 20]],
  episode:     [['working', 55], ['new', 45]],
};
export function directorFor(s, scale, genre) {
  const rows = BY_SCALE[scale];
  if (!rows) return null;
  const pool = workingDirectors(s);
  if (!pool.length) return null;
  // The band first, then — within it — somebody who makes this kind of thing, if there is one.
  const total = rows.reduce((n, r) => n + r[1], 0);
  let r = Math.random() * total, want = rows[0][0];
  for (const [band, w] of rows) { r -= w; if (r <= 0) { want = band; break; } }
  let cands = pool.filter((d) => d.band === want);
  if (!cands.length) cands = pool;
  const onGenre = cands.filter((d) => d.genre === genre);
  return pick(onGenre.length && chance(55) ? onGenre : cands);
}
// What a director does to the film you make with them. This is the reason to want one:
// it is the single biggest thing outside your own craft, the same way it is in life.
// What a shoot can still know about them months later: which shelf they came off. A great
// director is worth about as much to a picture as three good days on it; a first-timer is
// a gamble that mostly does not come off, which is why they are cheap.
const BAND_LIFT = { great: 6, strong: 3, working: 0, new: -2 };
export function bandLift(band, top) {
  return (BAND_LIFT[band] || 0) + (top ? 2 : 0);
}
export function directorLift(d) {
  if (!d) return 0;
  return Math.round(((d.standing || 0) - 52) * 0.16 * 10) / 10;   // about −5 to +7
}
// And what they do to how likely the thing is to be any good at all — a name attracts a
// crew, a cast and a studio that leaves them alone.
export function directorLine(s, d) {
  if (!d) return null;
  const five = isOneOfTheFive(s, d);
  return five ? `${d.name} is directing — one of the five names in the business`
    : d.band === 'strong' ? `${d.name} is directing. A name; people take their calls.`
    : d.band === 'working' ? `${d.name} is directing. They work constantly and nobody argues about them.`
    : `${d.name} is directing. It is their first feature.`;
}

// A year of everybody's work: the roster ages, retires, and moves on what it made. Called
// once a year from the yearbook, next to the actors.
export function directorsYear(s) {
  const all = directors(s);
  if (!all.length) return s;
  const year = s.year || 0;
  for (const d of all) {
    if (!d.alive) continue;
    const age = year - (d.born || year);
    // They do not stop at sixty-five. They stop when the calls stop, or when they die.
    if (age > 74 && chance(9)) { d.retired = true; continue; }
    if (age > 80 && chance(7)) { d.alive = false; continue; }
    if (d.retired) continue;
    // Standing drifts on what the year did to them: a great year lifts, a quiet one costs
    // a little, because a director who has not made anything is a director nobody is
    // talking about.
    d.standing = clamp(d.standing + rint(-3, 3) + (d.films > 0 ? 1 : -1));
    d.films = 0;
    if (age > 66) d.standing = clamp(d.standing - 1);
  }
  // The roster renews itself. Somebody makes a first feature every year or two.
  const live = workingDirectors(s).length;
  if (live < 26 && chance(55)) {
    const taken = namesInUse(s);
    all.push(makeDirector(s, 'new', [18, 37], taken));
  }
  // And the bands are re-read off the standing, so somebody who made two enormous films
  // really does become one of the five and somebody who stopped really does fall out.
  for (const d of all) {
    if (!d.alive || d.retired) continue;
    d.band = d.standing >= 82 ? 'great' : d.standing >= 62 ? 'strong' : d.standing >= 38 ? 'working' : 'new';
  }
  return s;
}
// A film you made with them lands on their record too.
export function creditDirector(s, id, rating) {
  const d = directorById(s, id);
  if (!d) return s;
  d.films = (d.films || 0) + 1;
  d.best = Math.max(d.best || 0, rating || 0);
  // The business re-reads a director on every picture, hard. This is how the five change.
  d.standing = clamp(d.standing + ((rating || 0) >= 88 ? rint(3, 7) : (rating || 0) >= 74 ? rint(1, 3) : (rating || 0) >= 55 ? 0 : rint(-6, -2)));
  return s;
}
