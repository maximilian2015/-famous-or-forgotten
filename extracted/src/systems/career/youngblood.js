// The people nobody has heard of yet.
//
// Maxi: "a young-blood column, actors and directors you can work with — the agent sends
// their work sometimes, and they have to bring you something new. For example, getting out
// of the comedy or action-hero box." And then the question that matters more than any of
// it: "and what comes after? We need to hold the player's interest."
//
// The answer is that you are not betting on a film. You are betting on a PERSON, and the
// bet takes ten years to pay. A first feature that works turns its director into a name
// (world/directors.js creditDirector moves them on every picture), and the one thing a
// director who has just become somebody does is ring the actor who said yes when nobody
// else would. So the payoff is not the review — it is the phone call in 2081 from one of
// the five, asking for you by name, for a picture you could never have been cast in.
//
// And if it does not work, you took a pay cut for nothing and the trades say you were
// slumming. That is the bet. Both halves have to be real or it is not one.
import { rint, chance, pick } from '../../engine/rng.js';
import { uid } from '../../engine/id.js';
import { addTimeline } from '../../engine/timeline.js';
import { inCareer } from '../../engine/stage.js';
import { quoteFor, setRespect } from '../meta/status.js';
import { newTitle } from '../world/titles.js';
import { GENRES } from '../meta/news.js';
import { rollStability } from './stability.js';
import { rollPotential } from './franchise.js';
import { directors, directorById, isOneOfTheFive, ensureDirectors, workingDirectors } from '../world/directors.js';
import { activeActors } from '../world/world.js';
import { boxedInto } from '../meta/typecast.js';

const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const first = (n) => String(n || '').split(' ')[0];

// ── the column ────────────────────────────────────────────────────────────────
// Who is worth knowing before anybody knows them. Directors on a first feature, and the
// actors the business has started to notice.
export function youngBlood(s) {
  ensureDirectors(s);
  const year = s.year || 0;
  const dirs = workingDirectors(s)
    .filter((d) => d.band === 'new' && year - (d.born || year) <= 42)
    .sort((a, b) => b.standing - a.standing)
    .slice(0, 5)
    .map((d) => ({
      kind: 'director', id: d.id, name: d.name, genre: d.genre, standing: d.standing,
      age: year - (d.born || year), films: d.films, best: d.best || 0,
      line: d.best >= 80 ? 'One film, and everybody who saw it is still talking about it'
        : d.films > 0 ? 'Has made one. Nobody agrees about it yet.'
        : 'Has not made anything you could see yet.',
      worked: (s._youngWorked || []).includes(d.id),
    }));
  const cast = activeActors(s)
    .filter((a) => (a.fame || 0) >= 12 && (a.fame || 0) < 40 && (a.talent || 0) >= 78)
    .sort((a, b) => (b.talent || 0) - (a.talent || 0))
    .slice(0, 4)
    .map((a) => ({
      kind: 'actor', id: a.id, name: a.name, genre: a.genre, standing: a.fame,
      age: year - (a.born || year), films: (a.credits || []).length, best: 0,
      line: 'Nobody is casting them above the title. Somebody is about to.',
      worked: false,
    }));
  return [...dirs, ...cast];
}

// ── the agent brings one ──────────────────────────────────────────────────────
// Rarely, and never for the money. This is the one offer in the game where the fee is the
// reason to say no and the material is the reason to say yes — the exception the agent's
// own floor already carves out (castings.js).
export const YOUNG_EVERY = 14;                 // months between these, at the soonest
export function maybeYoungOffer(s) {
  if (!inCareer(s)) return s;
  if ((s.fame || 0) < 25) return s;            // they need you to be worth something first
  if ((s._youngOfferAt || 0) > stamp(s) - YOUNG_EVERY) return s;
  if ((s.offers || []).some((o) => o.kind === 'young')) return s;
  ensureDirectors(s);
  const pool = workingDirectors(s).filter((d) => d.band === 'new');
  if (!pool.length) return s;
  // More likely when the business has a word for you — a first-timer is exactly who goes
  // looking for the comic actor everybody else casts as the comic actor.
  const box = boxedInto(s);
  let p = 7 + (box ? 9 : 0) + Math.min(8, (s.respect || 0) / 9);
  if (!chance(p)) return s;
  const d = pick(pool);
  s._youngOfferAt = stamp(s);
  // Against your box on purpose, if you have one. That is the whole point of them.
  const genre = box ? pick(GENRES.filter((g) => g !== box)) : (d.genre || pick(GENRES));
  const title = newTitle(s, genre);
  // A fraction of what you are worth, and everybody involved knows it.
  const scale = chance(45) ? 'festival' : 'indie';
  const band = quoteFor(s, 'film_indie') || 60000;
  const salary = Math.round(band * (0.18 + Math.random() * 0.17));
  (s.offers = s.offers || []).push({
    id: uid(s, 'yng'), kind: 'young', via: 'agent', from: d.name,
    director: d.name, directorId: null, youngId: d.id,
    projectTitle: title, role: 'Lead', type: scale === 'festival' ? 'Festival Film' : 'Indie Film',
    genre, salary, months: rint(2, 3), fame: 2, prestigeScore: rint(64, 90), tier: 'lead', scale,
    stability: Math.max(55, rollStability(scale) - 12), deadline: rint(2, 3),
    potential: rollPotential(scale, genre),
    note: `${d.name} has made one film and is making their second. They asked for you, which nobody has done for a part like this. The money is a fraction of your quote and they know it — what they are offering is the part, and it is nothing like the parts you get sent.`,
  });
  addTimeline(s, `${d.name} — a director nobody has heard of — asked for you by name.`);
  s.lastEvent = `A letter from ${d.name}. One film behind them, no money, and a part that is not remotely what the business sends you. Your agent forwarded it with no comment at all, which from them is a comment.`;
  return s;
}

// ── and then the ten years ────────────────────────────────────────────────────
// What you actually bought. A first feature that works makes its director somebody, and
// the first thing somebody does is ring the person who said yes when nobody would.
export function youngAfterCredit(s, credit, p) {
  const id = p && p.youngId;
  if (!id) return s;
  (s._youngWorked = s._youngWorked || []).push(id);
  const d = directorById(s, id);
  if (!d) return s;
  const good = (credit.rating || 0) >= 72;
  if (!good) {
    setRespect(s, (s.respect || 0) - 1);
    addTimeline(s, `"${credit.title}" did not work. You took a fraction of your fee for it, and the trades noticed both halves of that.`, true);
    return s;
  }
  setRespect(s, (s.respect || 0) + 3);
  addTimeline(s, `"${credit.title}" worked, and it was ${d.name}'s second film. People are going to remember who said yes to it.`);
  // They come back, years out, at a size neither of you could reach today. Whether they are
  // one of the five by then is up to what they make in between — nobody promises that.
  const gap = rint(30, 84);
  const genre = credit.genre || pick(GENRES);
  (s.laterOffers = s.laterOffers || []).push({
    due: stamp(s) + gap, since: stamp(s),
    line: `${d.name} is making something big, and they want you in it.`,
    event: `${d.name} called. It has been years, they are not the person you made that film with any more, and they still asked for you first.`,
    offer: {
      id: uid(s, 'yng2'), kind: 'youngback', via: 'director', from: d.name, director: d.name, youngId: d.id,
      projectTitle: newTitle(s, genre), role: 'Lead', type: 'Feature Film', genre,
      salary: 0,            // priced when it arrives — by then you are both different people
      months: rint(3, 5), fame: 6, prestigeScore: rint(70, 94), tier: 'lead', scale: 'feature',
      stability: 86, deadline: 3, potential: rollPotential('feature', genre),
      note: `The one you made for nothing, years ago. They are not making those any more.`,
    },
  });
  return s;
}
// The fee on the way back is what they are worth NOW, not what they were worth then.
export function priceYoungReturn(s, o) {
  if (!o || o.kind !== 'youngback' || o.salary > 0) return o;
  const d = directorById(s, o.youngId);
  const five = d ? isOneOfTheFive(s, d) : false;
  o.scale = five ? 'blockbuster' : 'feature';
  o.salary = Math.round((quoteFor(s, five ? 'film_tentpole' : 'film_studio') || quoteFor(s, 'film_indie') || 1e6) * (0.85 + Math.random() * 0.3));
  o.note = five
    ? `${first(o.director)} is one of the five names in the business now. The first thing they did with that was ring you.`
    : `${first(o.director)} has made three films since yours and people take their calls. They asked for you before anybody else.`;
  return o;
}
