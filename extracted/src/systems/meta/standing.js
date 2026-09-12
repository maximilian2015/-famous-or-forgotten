// Fame × Respect.
//
// Two ladders that never spoke to each other. Fame is how many people know the name;
// standing is what the people who hire you think of it — and the interesting careers are
// the ones where those disagree. Maxi: "an A-lister who is Avoided, a Star who is
// Reliable, a name in the room nobody has heard of — they should work differently."
//
// Eleven combinations, each a real archetype from the business, and each one DOES
// something somewhere else in the game rather than only being named here. Five of them
// are bad, which is the point — the first cut had two, and a game called Famous or
// Forgotten with two ways to be in trouble is not that game.
//
//   beginning   nothing decided yet         nothing special, which is the point
//   difficult   Avoided, not famous         the room has heard; crews start cold
//   craft       respected, not known        the board reaches further; the agent comes early
//   working     recognised and reliable     the ordinary middle of a career that is working
//   face        known, not respected        the prestige shelf shuts; scandal sticks
//   liability   known AND Avoided           the studio shelf shuts too; the agent goes quiet
//   star        known, respected enough     the ordinary shape of a career at the top
//   real        known and trusted           people keep asking — you are forgotten slower
//   faded       fallen, nobody angry        Forgotten, and only that
//   tale        fallen and avoided          a comeback has to be better than good
//   asked       fallen, still respected     the business remembers: a comeback needs less
//
// The rule is engine/combo.js. Read by castings.js (reach, the shelves, the board, the
// room), access.js (the agent), production.js (how a crew starts), economy.js (how fast
// you are forgotten, how fast scandal fades) and release.js (the comeback).

import { comboOf } from '../../engine/combo.js';
export { comboOf };

export const COMBOS = {
  beginning: {
    label: 'Beginning', tone: 'plain',
    line: 'Nothing on either ladder has decided anything yet. That is not a problem, it is a starting position.',
    long: 'Nobody has formed an opinion of the name, and not enough people know it for the opinion to matter yet. Everything above you is open in principle and closed in practice, which is what the first ten years of any career are.',
    fx: [],
  },
  difficult: {
    label: 'Difficult', tone: 'bad',
    line: 'Not famous enough for it to be a story. Avoided all the same.',
    long: 'Avoided before anybody knows who you are. The public has no opinion; the business does, and it is a small business — the casting offices talk, and the crew on your next set has heard about your last one before you walk in. Bad work alone does not put you here. Behaviour does.',
    fx: ['Auditions are 15% harder — the room has heard', 'Crews start colder: the director’s opinion of you begins twelve points lower'],
  },
  craft: {
    label: 'The actor’s actor', tone: 'good',
    line: 'The public could not pick you out of a line-up. Every director in the city can.',
    long: 'Respected before you are known. The board sends you parts your fame does not yet justify, and the agent comes to you earlier than fame would bring them. What you do not have is an audience — and nothing on this list sells a single ticket.',
    fx: ['The board reaches further: standing above 40 counts toward the parts you are sent', 'An agent will take you at standing 50, without waiting for fame 40'],
  },
  working: {
    label: 'The working actor', tone: 'plain',
    line: 'Recognised in the street, trusted on the set. Not a star, and working every year.',
    long: 'A Known Face with a reputation to match. Nothing is shut to you at this height and nothing is handed to you either; this is the middle of the business, where most of the people who last are.',
    fx: [],
  },
  face: {
    label: 'The face', tone: 'bad',
    line: 'Everyone knows the name. Nobody good wants it on their film.',
    long: 'Known everywhere and trusted nowhere. The money still comes — fame is what the money follows — but the prestige shelf has quietly closed to you, and the press has decided you are a story rather than an actor: bad press sticks to you for longer than it does to anyone else.',
    fx: ['No prestige series or drama leads on the board until standing is back at 30', 'Scandal fades at 60% of the normal speed'],
  },
  liability: {
    label: 'The liability', tone: 'bad',
    line: 'Famous enough to sell it. Nobody will insure it.',
    long: 'A star the business avoids. The audience still turns up, which is the only reason anybody still calls — but the studio shelf has closed along with the prestige one, your agent has stopped bringing you things, and every set you walk onto has already decided what you are like. This is the A-lister who is Avoided, and it is a worse place than Forgotten.',
    fx: ['No studio features, blockbusters or prestige work on the board until you are off the Avoided rung', 'Your agent brings you nothing', 'Auditions are 15% harder, and crews start twelve points colder', 'Scandal fades at 60% of the normal speed'],
  },
  star: {
    label: 'A star', tone: 'plain',
    line: 'Known, and taken seriously enough. The ordinary shape of a career that is working.',
    long: 'Both numbers are doing their job. Nothing is shut to you and nothing is handed to you — this is what most successful careers look like from the inside.',
    fx: [],
  },
  real: {
    label: 'The real thing', tone: 'good',
    line: 'Known and trusted. This is what people mean when they say "a star".',
    long: 'Fame and standing both high, and they feed each other: the public wants you and so do the directors, and because people keep asking for you, the world is slower to forget you between films.',
    fx: ['Forgotten at 80% of the normal speed — people keep asking', 'Every door on both ladders is open'],
  },
  faded: {
    label: 'Faded', tone: 'bad',
    line: 'Nobody is angry with you. Nobody is thinking about you at all.',
    long: 'Forgotten, and only that. The business has no quarrel with the name; it simply has not heard it in a while, and a has-been is sent fewer scripts than a newcomer because everybody already knows how the story ends. One good film and they will call it a comeback.',
    fx: ['The board is thinner than a newcomer’s', 'A comeback needs a film rated 70'],
  },
  tale: {
    label: 'The cautionary tale', tone: 'bad',
    line: 'They remember the name, and they remember why.',
    long: 'Forgotten by the public and avoided by the business at the same time. The board is nearly empty, the room has heard, and a comeback — the one way out — has to be genuinely good rather than merely good, because the trades will not use the word for anything less.',
    fx: ['A comeback needs a film rated 80, not 70', 'The board is thinner than a newcomer’s', 'Auditions are 15% harder, and crews start twelve points colder'],
  },
  asked: {
    label: 'Still asked about', tone: 'good',
    line: 'The public moved on. The business did not.',
    long: 'Forgotten by the audience and respected by everyone who hires. Directors still say your name in meetings, which is why the board is not thinner for you the way it is for the merely fallen — and why a comeback needs less: a decent film is enough, because people were waiting for a reason.',
    fx: ['The board is not thinned by being Forgotten', 'A comeback needs a film rated 60, not 70'],
  },
};

export function combo(s) { return COMBOS[comboOf(s)]; }

// ── what each one does, read by the systems that apply it ──────────────────────────────
// Standing above forty extends what the board sends you. Capped, because a respected
// nobody should be reaching for feature leads, not for blockbusters.
export function reachFromStanding(s) {
  if (comboOf(s) !== 'craft') return 0;
  return Math.min(20, Math.max(0, ((s.respect || 0) - 40) * 0.6));
}
// The prestige shelf is closed to a name nobody good wants on their film.
export function prestigeShut(s) { const c = comboOf(s); return c === 'face' || c === 'liability'; }
// And the studio shelf — features, blockbusters — is closed to a name nobody will insure.
export function insuranceShut(s) { return comboOf(s) === 'liability'; }
// Scandal sticking to the face and the liability (×0.6) and the real thing being forgotten
// slower (×0.8) are applied in engine/economy.js, which reads comboOf directly — it
// cannot import this file.
// An agent takes the actor's actor early, and stops calling the liability.
export function agentTakesYou(s) { return comboOf(s) === 'craft' && (s.respect || 0) >= 50; }
export function agentDropped(s) { return comboOf(s) === 'liability'; }
// On the Avoided rung the room has heard about you, whoever you are. The three combinations
// here are exactly "standing below −15", which is what that rung promises.
export function roomHasHeard(s) { const c = comboOf(s); return c === 'difficult' || c === 'liability' || c === 'tale' ? 0.85 : 1; }
export function coldStart(s) { const c = comboOf(s); return c === 'difficult' || c === 'liability' || c === 'tale' ? 12 : 0; }
// A comeback from the bottom of both ladders has to be better than good; one from a name
// the business still says needs less.
export function comebackFloor(s) { const c = comboOf(s); return c === 'tale' ? 80 : c === 'asked' ? 60 : 70; }
// Forgotten thins the board — unless the business is still asking about you.
export function boardThinned(s) { const c = comboOf(s); return c === 'faded' || c === 'tale'; }
