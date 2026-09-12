// Fame × Respect.
//
// Two ladders that never spoke to each other. Fame is how many people know the name;
// standing is what the people who hire you think of it — and the interesting careers are
// the ones where those disagree. Maxi: "an A-lister who is Avoided, a Star who is
// Reliable, a name in the room nobody has heard of — they should work differently."
//
// Six combinations, each a real archetype from the business, and each one DOES something
// somewhere else in the game rather than only being named here:
//
//   the face     known, not respected     the prestige shelf shuts; the press enjoys you
//   the craft    respected, not known     the board reaches further; the agent comes early
//   a star       known, respected enough  the ordinary shape of a career
//   the real     known and trusted        people keep asking — you are forgotten slower
//   the tale     fallen and avoided       a comeback has to be better than good
//   beginning    neither yet              nothing special, which is the point
//
// Read by castings.js (reach, the prestige shelf), access.js (the agent), economy.js
// (how fast you are forgotten, how fast scandal fades) and release.js (the comeback).

import { comboOf } from '../../engine/combo.js';
export { comboOf };

export const COMBOS = {
  face: {
    label: 'The face',
    line: 'Everyone knows the name. Nobody good wants it on their film.',
    long: 'Known everywhere and trusted nowhere. The money still comes — fame is what the money follows — but the prestige shelf has quietly closed to you, and the press has decided you are a story rather than an actor: bad press sticks to you for longer than it does to anyone else.',
    fx: ['No prestige series or drama leads on the board until standing is back at 30', 'Scandal fades at 60% of the normal speed'],
  },
  craft: {
    label: 'The actor’s actor',
    line: 'The public could not pick you out of a line-up. Every director in the city can.',
    long: 'Respected before you are known. The board sends you parts your fame does not yet justify, and the agent comes to you earlier than fame would bring them. What you do not have is an audience — and nothing on this list sells a single ticket.',
    fx: ['The board reaches further: standing above 40 counts toward the parts you are sent', 'An agent will take you at standing 50, without waiting for fame 40'],
  },
  star: {
    label: 'A star',
    line: 'Known, and taken seriously enough. The ordinary shape of a career that is working.',
    long: 'Both numbers are doing their job. Nothing is shut to you and nothing is handed to you — this is what most successful careers look like from the inside.',
    fx: [],
  },
  real: {
    label: 'The real thing',
    line: 'Known and trusted. This is what people mean when they say "a star".',
    long: 'Fame and standing both high, and they feed each other: the public wants you and so do the directors, and because people keep asking for you, the world is slower to forget you between films.',
    fx: ['Forgotten at 80% of the normal speed — people keep asking', 'Every door on both ladders is open'],
  },
  tale: {
    label: 'The cautionary tale',
    line: 'They remember the name, and they remember why.',
    long: 'Forgotten by the public and avoided by the business at the same time. The board is nearly empty, nobody is calling, and a comeback — the one way out — has to be genuinely good rather than merely good, because the trades will not use the word for anything less.',
    fx: ['A comeback needs a film rated 80, not 70', 'The board is thinner than a newcomer’s'],
  },
  beginning: {
    label: 'Beginning',
    line: 'Neither number has anything to say yet. That is not a problem, it is a starting position.',
    long: 'Nobody knows the name and nobody has an opinion of it. Everything above you is open in principle and closed in practice, which is what the first ten years of any career are.',
    fx: [],
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
export function prestigeShut(s) { return comboOf(s) === 'face'; }
// Scandal sticking to the face (×0.6) and the real thing being forgotten slower (×0.8) are
// applied in engine/economy.js, which reads comboOf directly — it cannot import this file.
// An agent takes the actor's actor early.
export function agentTakesYou(s) { return comboOf(s) === 'craft' && (s.respect || 0) >= 50; }
// A comeback from the bottom of both ladders has to be better than good.
export function comebackFloor(s) { return comboOf(s) === 'tale' ? 80 : 70; }
