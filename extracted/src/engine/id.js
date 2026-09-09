// Unique ids that are actually unique.
//
// Everything in the game used `'rel' + Date.now() + Math.floor(Math.random() * 1000)`.
// Date.now() has millisecond resolution, so anything created in the same millisecond
// shares that half, leaving one thousand possible suffixes — and a long career makes
// thousands of these. Two releases collided in a sweep and the damage was ugly and silent:
// s.running held the id twice, the first pass closed the credit and deleted the finished
// figures off it, the second pass found the SAME credit with nothing left on it and wrote
// a score of NaN — and the other film stayed "in cinemas" for the rest of the character's
// life, because nothing was left pointing at it.
//
// A counter on the save cannot collide with itself. The random tail is only there so two
// saves merged by hand still cannot clash.
export function uid(s, prefix = 'id') {
  s._seq = (s._seq || 0) + 1;
  return prefix + s._seq.toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}
