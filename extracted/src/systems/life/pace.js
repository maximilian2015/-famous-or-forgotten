// The conductor (random events, stage 2: extracted/docs/random-events-plan.md).
//
// Four places opened a card or a story on their own and none of them knew about the others: the
// cards (life/arcs.js), the career stories (meta/stories.js), the people who need something
// (life/needs.js), and once a year, youth. Measured on 9 Nov (probe_random_events, 12 lives, a player
// who rests): 1.07 choices a year, most of them the doctor and the same few chains, and every year
// the same as the last. The plan: one place that knows what this year has already brought.
//
// - A year has a temper, rolled in January: quiet, ordinary or busy. It says how many NEW things
//   that ask for a choice the year will open (2, 4 or 6), not how many it must.
// - A year behind its temper looks harder (`keen` raises the odds where a source rolls them); a
//   year that has had its fill opens nothing new that can wait.
// - After a loss (a death in the family) the months that follow are quiet: nothing new opens. What
//   was already running still comes: those are the consequences you were promised.
// - What the state demands (no money, burnt out) is not the conductor's to hold back. It counts.
//
// Continuations are never asked for here. Only beginnings.
const stampOf = (s) => (s.year || 0) * 12 + (s.month || 0);
const TEMPER = { quiet: 2, ordinary: 4, busy: 6 };
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
// How far behind its temper the year is: 1 on pace, up to 2 behind, down to a half ahead. A source
// that rolls a chance multiplies by it, so a quiet stretch looks a little harder for something.
export function keen(s) {
  const p = paceOf(s);
  const due = (p.room * ((s.month || 0) + 1)) / 12;
  return Math.max(0.5, Math.min(2, 1 + (due - p.opened) * 0.5));
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
