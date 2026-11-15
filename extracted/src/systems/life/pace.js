// The conductor (random events, stage 2: extracted/docs/random-events-plan.md).
//
// Four places opened a card or a story on their own and none of them knew about the others: the
// cards (life/arcs.js), the career stories (meta/stories.js), the people who need something
// (life/needs.js), and once a year, youth. Measured on 9 Nov (probe_random_events, 12 lives, a player
// who rests): 1.07 choices a year, most of them the doctor and the same few chains, and every year
// the same as the last. The plan: one place that knows what this year has already brought.
//
// - A year has a temper, rolled in January: quiet, ordinary or busy. It says how many NEW things
//   that ask for a choice the year can open (1, 3 or 6), and how likely each one is (`keen`: a source
//   that rolls a chance multiplies by it). A year that has had its fill opens nothing new that can wait.
// - The big story of a busy year (meta/stories.js `takeover`) comes only in a busy year.
//
// 15 Nov: the temper did not show. Measured with every year held to one temper (12 lives, 20 years,
// a player who rests and goes out): quiet 1.19 choices a year, busy 1.23. `keen` used to say how far
// behind its cap the year was, and nothing ever reached a cap, so every year was behind — a quiet one
// looked twice as hard for something as a busy one by December. Now the temper is the multiplier.
// - After a loss (a death in the family) the months that follow are quiet: nothing new opens. What
//   was already running still comes: those are the consequences you were promised.
// - What the state demands (no money, burnt out) is not the conductor's to hold back. It counts.
//
// Continuations are never asked for here. Only beginnings.
const stampOf = (s) => (s.year || 0) * 12 + (s.month || 0);
const TEMPER = { quiet: 1, ordinary: 3, busy: 6 };
// How likely a new thing is, by the year's temper (keen).
const TEMPO = { quiet: 0.5, ordinary: 1.5, busy: 2.4 };
// a quarter of years are quiet, a quarter busy
const roll = () => { const r = Math.random(); return r < 0.25 ? 'quiet' : r < 0.75 ? 'ordinary' : 'busy'; };
// For the probes only (tests/probes/probe_random_events.mjs): every year held to one temper, so the
// same life can be lived three ways. Nothing in the game sets it.
export const PROBE = { temper: null };

// Created the first time it is asked for, so an old save simply starts its first year now.
export function paceOf(s) {
  const y = s.year || 0;
  let p = s._pace;
  if (!p || p.year !== y) {
    const temper = PROBE.temper || roll();
    p = s._pace = { year: y, temper, room: TEMPER[temper], opened: 0, hush: p ? p.hush || 0 : 0, log: p ? p.log || [] : [] };
  }
  return p;
}
export const hushed = (s) => stampOf(s) < (paceOf(s).hush || 0);
// Whether the year has room for something new that can wait.
export function mayOpen(s) {
  const p = paceOf(s);
  return !hushed(s) && p.opened < p.room;
}
// What the year's temper does to the odds of something new: a quiet year half as likely, a busy one
// more than twice. A source that rolls a chance multiplies by it.
export function keen(s) {
  return TEMPO[paceOf(s).temper] || 1;
}
// Something new opened (a card, a story, somebody asking).
export function opened(s, what) {
  const p = paceOf(s);
  p.opened++;
  p.log = [...(p.log || []), { at: stampOf(s), what }].slice(-24);
}
// After a loss: nothing new for a while. The longer of two hushes wins.
export function hushFor(s, months) {
  const p = paceOf(s);
  p.hush = Math.max(p.hush || 0, stampOf(s) + months);
}
