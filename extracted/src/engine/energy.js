// Energy.
//
// A month used to be three actions, and every action cost one — a chat with your mother
// and a day of rehearsal were the same size, and most small things cost nothing at all.
// Maxi, watching himself press every button on a person in one go: "a hundred energy a
// month, every action its own price, more for some, less for others; a bad month gives
// you eighty, a good one can reach a hundred and twenty."
//
// So: ENERGY a month, refilled on the first, never banked. Every action has a COST. What
// the month gives you is read in engine/time.js from where you live, who you pay, whether
// you have a day job, whether you are ill or worn out. The point of money in this game is
// mostly here — an assistant, a driver, a house are energy you did not have.
//
// This file has no imports on purpose: it is read by everything.

export const ENERGY = 100;       // an ordinary month
export const ENERGY_CAP = 120;   // the best month there is

export const COST = {
  // the set
  rehearse: 15, take: 15, bond: 10, argue: 10,
  // the board
  audition: 20, sides: 10, train: 20, shift: 25, careerAction: 15,
  // people
  chat: 5, joke: 5, kind: 5, advice: 5, gift: 0, evening: 15, realTalk: 10, apology: 10, ask: 10, call: 5,
  meet: 15, visit: 10, sms: 10,
  // the evenings
  dateHome: 10, dateDinner: 10, datePublic: 15, dateAway: 40,
  party: 20, partyBig: 25, partyHuge: 30, event: 20, talkIn: 10, askHelp: 5,
  // the body
  doctor: 10, rest: 0, therapy: 10, gym: 5,
};

// What a month gives you, before the day you spend it.
export const REFILL = {
  home: { room: 0, studio: 0, flat: 5, house: 15, penthouse: 25 },
  assistant: 10, driver: 10, nanny: 15,
  jobSlot: 30,          // a day job takes this much of the month per slot
  depressionSlot: 30,   // and so does not being able to get out of bed
  illness: 20, wornOut: 20,
  set: 20,              // every set you are on past the first
};

export function canAfford(s, n) { return (s.ap || 0) >= (n || 0); }
export function spend(s, n) { s.ap = Math.max(0, (s.ap || 0) - (n || 0)); return s; }
export function give(s, n) { s.ap = Math.min(ENERGY_CAP, (s.ap || 0) + (n || 0)); return s; }
// The line every action says when the month has run out.
export function tooTired(s, n) {
  const left = Math.round(s.ap || 0);
  // A child's turn is a year, not a month.
  const span = s.stage === 'child' || s.stage === 'teen' ? 'year' : 'month';
  return left <= 0 ? `No energy left this ${span}. Live a bit first.` : `That takes ${n} energy and you have ${left} left this ${span}.`;
}
