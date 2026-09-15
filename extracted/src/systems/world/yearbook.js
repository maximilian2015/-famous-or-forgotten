// The year in film. Every January the business publishes its lists — the ten films that
// took the most money, the five actors whose year it was — and your name is on them or it
// is not. This is where a career becomes comparative: not "7.8/10" in a vacuum but "the
// third film of the year, behind two people you have heard of". Kept for every year of the
// life, from the year you were born, so the wall in Legacy has the icons of your childhood
// on it before you have done anything at all.
import { addTimeline } from '../../engine/timeline.js';
import { setFame, setRespect } from '../meta/status.js';
import { isFilm } from '../career/release.js';
import { ensureWorld, worldYear, actorById } from './world.js';

const money = (n) => n >= 1e9 ? `€${(n / 1e9).toFixed(2)}bn` : n >= 1e6 ? `€${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}m` : `€${Math.round(n / 1000)}k`;

// Your films that opened in a year, as list rows. The money is the final gross, which is
// known the night it opens even though you are shown it a week at a time.
function yourFilms(s, year) {
  return (s.filmography || [])
    .filter((c) => c.year === year && isFilm(c.scale) && !c.minor)
    .map((c) => ({ id: c.id, title: c.title, genre: c.genre, scale: c.scale, rating: c.rating || 0,
      gross: c._rel ? (c._rel.finalGross || 0) : (c.boxOffice || 0), actor: s.name, actorId: 'you', you: true, with: c.with || null, withId: c.withId || null }));
}

export function closeYear(s, year) {
  const w = ensureWorld(s);
  if (w.years[year]) return w.years[year];
  const theirs = worldYear(s, year);
  const yours = yourFilms(s, year);
  const all = [...yours, ...theirs].sort((a, b) => b.gross - a.gross);
  const films = all.slice(0, 10).map((f, i) => ({ rank: i + 1, title: f.title, genre: f.genre, gross: f.gross, rating: f.rating,
    actor: f.actor, actorId: f.actorId, you: !!f.you, with: f.with || null }));
  // Actors of the year: the money their films took, together. A co-star's film counts for both.
  const byActor = {};
  for (const f of all) {
    const add = (id, name) => { byActor[id] = byActor[id] || { id, name, gross: 0, best: 0, films: 0 }; byActor[id].gross += f.gross; byActor[id].best = Math.max(byActor[id].best, f.rating); byActor[id].films += 1; };
    add(f.actorId, f.actor);
    if (f.you && f.withId) { const a = actorById(s, f.withId); if (a) add(a.id, a.name); }
  }
  const actors = Object.values(byActor).sort((a, b) => b.gross - a.gross).slice(0, 5).map((a, i) => ({ rank: i + 1, ...a, you: a.id === 'you' }));
  // Best reviewed: the five films the critics liked most, whatever they took.
  const best = [...all].filter((f) => f.scale !== 'small' || f.you).sort((a, b) => b.rating - a.rating).slice(0, 5)
    .map((f, i) => ({ rank: i + 1, title: f.title, rating: f.rating, actor: f.actor, actorId: f.actorId, you: !!f.you }));
  const iconsThen = w.actors.filter((a) => a.icon && a.alive && !a.retired).map((a) => a.name);
  // What the Askers pick from: the year's best-reviewed work by everybody else, with enough
  // on each film for awards.js to weigh it the way it weighs yours.
  const pool = [...theirs].filter((f) => f.rating >= 62).sort((a, b) => b.rating - a.rating).slice(0, 24)
    .map((f) => ({ title: f.title, actor: f.actor, actorId: f.actorId, rating: f.rating, genre: f.genre, scale: f.scale, prestigeScore: f.prestigeScore, category: f.scale === 'small' ? 'supporting' : 'lead' }));
  const entry = { year, films, actors, best, icons: iconsThen, askers: [], pool };
  w.years[year] = entry;
  // The years before you were born are not kept; the map stays a few decades long at most.
  const keys = Object.keys(w.years).map(Number).sort((a, b) => a - b);
  if (keys.length > 60) delete w.years[keys[0]];

  // What it does to you. A name on the list is the thing everybody sees.
  const yourFilm = films.find((f) => f.you);
  const yourActor = actors.find((a) => a.you);
  const lines = [];
  if (yourFilm) {
    const r = yourFilm.rank;
    const soft = (limit, cur) => Math.max(0.16, 1 - (cur || 0) / limit);
    if (r === 1) { setFame(s, (s.fame || 0) + 5 * soft(118, s.fame)); setRespect(s, (s.respect || 0) + 3 * soft(112, s.respect)); }
    else if (r <= 3) { setFame(s, (s.fame || 0) + 3 * soft(118, s.fame)); setRespect(s, (s.respect || 0) + 1 * soft(112, s.respect)); }
    else setFame(s, (s.fame || 0) + 1 * soft(118, s.fame));
    lines.push(r === 1 ? `"${yourFilm.title}" was the biggest film of ${year}.` : `"${yourFilm.title}" was the #${r} film of ${year}.`);
  }
  if (yourActor) {
    const soft = (limit, cur) => Math.max(0.16, 1 - (cur || 0) / limit);
    setRespect(s, (s.respect || 0) + (yourActor.rank === 1 ? 5 : 3) * soft(112, s.respect));
    setFame(s, (s.fame || 0) + (yourActor.rank === 1 ? 4 : 2) * soft(118, s.fame));
    lines.push(yourActor.rank === 1 ? `You were the actor of the year.` : `You were the year's #${yourActor.rank} actor.`);
  }
  if (lines.length) { const line = `The year in film: ${lines.join(' ')}`; addTimeline(s, line); s.lastEvent = line; }
  // The tick's own peak update comes later and the month can end early (a death); keep the invariant here.
  s.peakFame = Math.max(s.peakFame || 0, s.fame || 0);
  // A modal only once there is a career to measure. The lists themselves are always kept.
  // Queued rather than set: January is a busy month, and anything that writes bigMoment
  // after this would have thrown the lists away. engine/time.js shows it when the screen is free.
  if (s.stage === 'career' || yours.length) {
    (s.moments = s.moments || []).push({
      id: 'yearbook', kind: 'good', title: String(year), year,
      sections: [
        { head: `The most successful films of ${year}`, rows: films.map((f) => ({ n: f.rank, a: f.title, b: f.with ? `${f.actor} & ${f.with}` : f.actor, c: money(f.gross), you: f.you })) },
        { head: 'Actors of the year', rows: actors.map((a) => ({ n: a.rank, a: a.name, b: `${a.films} film${a.films === 1 ? '' : 's'}`, c: money(a.gross), you: a.you })) },
      ],
      body: yourFilm || yourActor ? lines.join(' ')
        : yours.length ? `Nothing of yours made the list this year. ${films[0].actor} had the year.` : `${films[0].actor} had the year. You were not in it.`,
    });
  }
  return entry;
}

// Read by the wall in Legacy.
export function yearsOf(s) {
  const w = s.world; if (!w) return [];
  return Object.keys(w.years).map(Number).sort((a, b) => b - a).map((y) => w.years[y]);
}
export { money as moneyOf };
