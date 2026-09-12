// Which combination of the two ladders you are in. See systems/meta/standing.js for what
// each one means and does; this is only the rule, kept here with no imports because
// engine/economy.js needs it and cannot reach into systems/.
//
// Read top to bottom: Forgotten is decided first, then Star-and-above, then the Avoided
// rung, then the two ways of being respected before you are famous.
//
// The bad-standing combinations start at the AVOIDED rung (below −15), not at zero. Bad
// work alone bottoms out around −5 — the first fifteen films of any career are bad — and
// a first cut that opened the trap at zero caught every actor alive at twenty-four for a
// few months and, measured, took the ordinary player from a lowest of −14 to forty years
// at the floor: crews starting cold made every wrap a cold verdict. Below −15 is
// behaviour — a walk-off, a pattern of cold sets — and behaviour is what the room hears.
const AVOIDED = -15;
export function comboOf(s) {
  const f = s.fame || 0, r = s.respect || 0;
  const forgotten = (s.peakFame || 0) >= 35 && f < 15;
  if (forgotten) return r < AVOIDED ? 'tale' : r >= 40 ? 'asked' : 'faded';
  if (f >= 55) return r < AVOIDED ? 'liability' : r < 30 ? 'face' : r >= 60 ? 'real' : 'star';
  if (r < AVOIDED) return 'difficult';
  if (r >= 40 && f < 35) return 'craft';
  if (f >= 35 && r >= 30) return 'working';
  return 'beginning';
}
