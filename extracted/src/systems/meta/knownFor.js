// The film next to your name. Maxi: "the hits should be framed so we can tell, and the last
// hit should sit next to your name — and change when there is a new one." A hit is a credit
// the business would call one: a smash, a world hit, an Asker, or a score of 7.5 and up.
// Known for the most recent of those; if there has never been one, the best thing you did.
const MINOR = /^(Brand Campaign|Commercial|Jingle|Brand Song|TV Extra|Voice Session|Open Mic|Festival Slot|Session Work|Music Video)$/;
const minor = (c) => c.minor === true || (c.minor === undefined && MINOR.test(c.type || ''));
export function isHit(c) {
  if (!c || minor(c) || c.running) return false;
  return !!(c.worldHit || c.status === 'World Hit' || c.verdict === 'smash' || (c.asker || 0) > 0 || (c.score != null ? c.score >= 7.5 : (c.rating || 0) >= 75));
}
export function isFlop(c) {
  if (!c || minor(c) || c.running) return false;
  return c.verdict === 'bomb' || c.verdict === 'ignored' || (c.score != null ? c.score < 4.5 : (c.rating || 0) < 45);
}
export function knownFor(s) {
  const all = [...(s.filmography || []), ...(s.discography || [])].filter((c) => !minor(c) && !c.running);
  const hit = all.find(isHit);   // filmography is newest first
  if (hit) return { title: hit.title, year: hit.year, hit: true, why: hit.worldHit || hit.status === 'World Hit' ? 'world hit' : (hit.asker || 0) > 0 ? 'Asker' : hit.verdict === 'smash' ? 'smash' : `${(hit.score != null ? hit.score : (hit.rating || 0) / 10).toFixed(1)}/10` };
  const best = all.filter((c) => (c.score != null ? c.score : (c.rating || 0) / 10) >= 6).sort((a, b) => ((b.score != null ? b.score : (b.rating || 0) / 10) - (a.score != null ? a.score : (a.rating || 0) / 10)))[0];
  if (best) return { title: best.title, year: best.year, hit: false, why: `${(best.score != null ? best.score : (best.rating || 0) / 10).toFixed(1)}/10` };
  return null;
}
