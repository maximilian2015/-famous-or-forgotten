// What the part actually is. Maxi: "everywhere in a film, when they offer it, write down who
// they are proposing you play — lead or not — and a couple of lines of the plot, so when the
// sequels come you understand where we are going."
//
// The game HAD a premise — one good line about the picture — but it was rolled the day the
// cameras started, which is months after you signed. You were saying yes to a genre and a
// fee. Now the premise is on the offer, with a name and a person attached to it, and the
// same line follows the part all the way through: the paper, the set, the credit, and the
// brief for the next one.
import { pick, rint } from '../../engine/rng.js';
import { makePremise } from './story.js';
import { FIRST_F, FIRST_M, LAST } from '../world/names.js';

// Who you would be. The genre tables are what that kind of picture is actually about; the
// last table is everything, because a person is not only their genre.
const BY_GENRE = {
  Crime: ['a detective two years off the pension', 'the one in the room who is not taking money', 'a lawyer defending somebody they believe did it', 'the brother who drove the car'],
  Thriller: ['somebody who saw the wrong thing on the wrong night', 'the negotiator, who is lying to both sides', 'a translator who starts changing what is said', 'the one who is being followed and cannot prove it'],
  Drama: ['the daughter who came home when it was too late', 'a headteacher holding a school together with nothing', 'somebody leaving a marriage very slowly', 'the son who stayed'],
  Comedy: ['a man who has decided this is the year', 'the worst wedding planner in the county', 'somebody failing upward with tremendous confidence', 'a very serious person in a very stupid situation'],
  Horror: ['the one who does not believe any of it', 'a mother who knows exactly what is in the house', 'the last one left who is still thinking clearly', 'somebody who came back different'],
  Romance: ['somebody who is with the wrong person and knows it', 'the one who left and came back at the worst moment', 'a widower being set up by his children', 'the friend who waited too long to say it'],
  'Sci-Fi': ['the engineer who reads the numbers first', 'a copy who has just found out', 'the one sent to bring the others home', 'a translator for something that does not want to talk'],
  Musical: ['a singer three years past the good years', 'the understudy, and everybody knows it', 'a bandleader holding a room together', 'somebody who can only say it in a song'],
};
const ANY = ['somebody who used to be somebody', 'the quiet one everything turns on', 'a parent who is not coping and will not say so',
  'the one who tells the truth at the worst time', 'somebody who has been forgiven and cannot accept it', 'the person everybody else is afraid of'];

// A name for the part. It matches you, because that is how casting works, and it is a
// stranger's name so it never collides with somebody in your life.
function castName(s) {
  const pool = (s.gender === 'male' ? FIRST_M : s.gender === 'female' ? FIRST_F : Math.random() < 0.5 ? FIRST_M : FIRST_F);
  return `${pick(pool)} ${pick(LAST)}`;
}
export function makeCharacter(s, genre, tier) {
  const what = Math.random() < 0.72 ? pick(BY_GENRE[genre] || ANY) : pick(ANY);
  return { name: castName(s), what, tier: tier || 'lead' };
}
// How much of the picture is yours. The tier is already on every offer; this is what it
// means in a sentence, which is the part nobody was being told.
export function sizeLine(o) {
  const t = o.tier || (o.role === 'Lead' ? 'lead' : 'supporting');
  // A season is not a picture and should not be described as one.
  const tv = !!(o.episodes || o.season);
  const it = tv ? 'the show' : 'the film';
  if (t === 'tentpole') return 'Above the title. The picture is sold on your face.';
  if (t === 'lead') return `Lead. You are in nearly every scene and ${it} is about them.`;
  if (t === 'supporting') return (o.months || 0) >= 2
    ? `Supporting. Not your ${tv ? 'show' : 'film'} — but the part has a spine, and people remember it.`
    : 'Supporting. A handful of days, a handful of scenes.';
  return `A day or two on somebody else's ${tv ? 'show' : 'picture'}.`;
}
// The two lines a card shows.
export function partLine(o) {
  const c = o.character;
  if (!c) return null;
  return `${c.name} — ${c.what}`;
}
// Every offer in the game comes from a different place — the board, the agent, a party, a
// sequel, a renewal, somebody you know. Rather than teach six files to write a premise,
// every offer is dressed once a month, wherever it came from. Called by engine/time.js.
export function dressOffers(s) {
  const lists = [s.offers, (s.laterOffers || []).map((x) => x.offer).filter(Boolean)];
  for (const list of lists) {
    for (const o of (list || [])) {
      if (!o || o.kind === 'brand') continue;                 // a brand is not a part
      if (!o.premise) o.premise = makePremise();
      if (!o.character) o.character = makeCharacter(s, o.genre, o.tier);
    }
  }
  return s;
}
// A season or a part that continues something keeps the same person. Rolling a new name for
// season four of the show you have been on for three years was the kind of thing that made
// the whole business feel like it was not keeping notes.
export function carryCharacter(from, to) {
  if (from && from.character && !to.character) to.character = { ...from.character };
  return to;
}
