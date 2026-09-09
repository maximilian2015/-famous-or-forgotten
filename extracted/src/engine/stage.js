// `stage` was quietly doing two jobs, and they are not the same job:
//   1. where you are in a life — child, teen, leaving home, working
//   2. whether the career half of the game is switched on
//
// Losing your flat drops you to `moving_out`, and a dozen systems read that as "this
// person has no career": the award season, the agent, the invitations, relevance drift,
// the news, the set arcs. Measured over ten well-played careers, EVERY ONE fell out of
// `career` at twenty-five and none of them ever came back — 4,218 months spent in
// `moving_out` against 138 in `career`, while still shooting sixty to a hundred films.
// Not one of them was ever nominated for anything, because runNominations never ran.
//
// So the career systems ask this instead. Where you sleep is not who you are: an actor
// with credits still gets a call from a casting office while they are on a friend's sofa,
// and the trades still print the nominations.
//
// It lives in engine/ with no imports of its own on purpose — economy.js needs it, and
// economy.js is what systems/life/stages.js imports HOUSING from.
export function inCareer(s) {
  if (!s) return false;
  if (s.stage === 'career') return true;
  if (s.stage !== 'moving_out') return false;
  return ((s.filmography || []).length + (s.discography || []).length) > 0;
}
