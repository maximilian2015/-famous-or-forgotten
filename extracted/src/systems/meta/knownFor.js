// The film next to your name. Maxi: "the hits should be framed so we can tell, and the last
// hit should sit next to your name — and change when there is a new one."
const MINOR = /^(Brand Campaign|Commercial|Jingle|Brand Song|TV Extra|Voice Session|Open Mic|Festival Slot|Session Work|Music Video)$/;
const minor = (c) => c.minor === true || (c.minor === undefined && MINOR.test(c.type || ''));
const scoreOf = (c) => (c.score != null ? c.score : (c.rating || 0) / 10);
function rankOf(s, c) {
  const y = s && s.world && s.world.years && s.world.years[c.year];
  const f = y && (y.films || []).find((x) => x.you && x.title === c.title);
  return f ? f.rank : 99;
}
// A hit is what the business would call one — by the reviews OR by the money. Maxi: "the
// film took 627 million and was on the year's list, and it still says the series?" A score
// alone missed a blockbuster that made its money and sat sixth in its year. The weight is
// how big a hit: a world hit, an Asker, a smash or three hundred million, the year's top
// ten or a rave, and the plain good ones.
export function hitWeight(c, s) {
  if (!c || minor(c) || c.running) return 0;
  const score = scoreOf(c), bo = c.boxOffice || 0;
  if (c.worldHit || c.status === 'World Hit') return 5;
  if ((c.asker || 0) > 0) return 4;
  // Maxi: "an Asker is above any other award — why is it not in the known-for list?" It is
  // now, and so is being up for one. A nomination sits above a smash and below a win,
  // which is where the business puts it.
  if ((c.nominated || 0) > 0) return 3.5;
  if (c.verdict === 'smash' || bo >= 300e6) return 3;
  if (score >= 8.5 || rankOf(s, c) <= 10 || bo >= 200e6) return 2;
  if (score >= 7.5 || (c.verdict === 'profitable' && c.scale === 'blockbuster')) return 1;
  return 0;
}
export function isHit(c, s) { return hitWeight(c, s) > 0; }
export function isFlop(c) {
  if (!c || minor(c) || c.running) return false;
  if (c.scale === 'episode' || (c.episodes && c.episodes <= 4 && !c.season)) return false;   // a guest spot is somebody else's show
  return c.verdict === 'bomb' || c.verdict === 'ignored' || scoreOf(c) < 4.5;
}
function whyOf(s, c) {
  if (c.worldHit || c.status === 'World Hit') return 'world hit';
  if ((c.asker || 0) > 0) return (c.asker || 0) > 1 ? `${c.asker} Askers` : 'Asker';
  if ((c.nominated || 0) > 0) return 'Asker nominee';
  if (c.verdict === 'smash') return 'smash';
  if ((c.boxOffice || 0) >= 200e6) return '€' + Math.round((c.boxOffice || 0) / 1e6) + 'm';
  if (rankOf(s, c) <= 10) return '#' + rankOf(s, c) + ' of ' + c.year;
  return scoreOf(c).toFixed(1) + '/10';
}
// Everything the business would call a hit, biggest first. Maxi: "make Known for tappable
// and show her hits — not one, the really popular and big-grossing ones, and what she
// actually became famous for, so we understand who she is and not just what she did last."
// The line on the front is the LATEST big thing, which is the right line for a front; this
// is the shelf behind it, and the two answer different questions.
// Maxi: "there should be FEW works — the biggest grossing, the most expensive. Not every
// project that worked. It is the cream."  So weight 1 — a solid picture that did its job —
// does not belong on this wall; it belongs in the filmography, where it already is. Only
// what the business would name unprompted: the world hit, the Asker, the smash, the one in
// the year's top ten. Five at the most, because a career has about that many.
export const CREAM_AT = 2, CREAM_MAX = 5;
export function theHits(s, limit = CREAM_MAX) {
  const all = [...(s.filmography || []), ...(s.discography || [])].filter((c) => !minor(c) && !c.running);
  const ranked = all
    .map((c) => ({ c, w: hitWeight(c, s) }))
    .filter((x) => x.w > 0)
    .sort((a, b) => b.w - a.w || (b.c.boxOffice || 0) - (a.c.boxOffice || 0) || scoreOf(b.c) - scoreOf(a.c));
  // The cream, and never an empty wall: if nothing has reached that shelf yet, the one
  // best thing stands in for it, which is the honest answer to "what are you known for".
  const cream = ranked.filter((x) => x.w >= CREAM_AT);
  return (cream.length ? cream : ranked.slice(0, 1)).slice(0, limit)
    .map((x) => ({
      title: x.c.title, year: x.c.year, role: x.c.role, genre: x.c.genre, weight: x.w,
      why: whyOf(s, x.c), score: scoreOf(x.c), boxOffice: x.c.boxOffice || 0,
      band: x.w >= 5 ? 'The one the whole world saw' : x.w >= 4 ? 'The one that won'
        : x.w >= 3 ? 'The one that printed money' : x.w >= 2 ? 'A real hit' : 'It worked',
    }));
}
// And the ones that are still brought up. A career is both shelves.
export function theFlops(s) {
  const all = [...(s.filmography || []), ...(s.discography || [])].filter((c) => !minor(c) && !c.running);
  return all.filter((c) => isFlop(c))
    .sort((a, b) => scoreOf(a) - scoreOf(b))
    .slice(0, 3)
    .map((c) => ({ title: c.title, year: c.year, genre: c.genre, score: scoreOf(c), verdict: c.verdict || null }));
}
// Known for the biggest thing of the last four years — a tie goes to the newer one. Older
// than that, the most recent hit there ever was; never a hit, the best thing you did.
export function knownFor(s) {
  const all = [...(s.filmography || []), ...(s.discography || [])].filter((c) => !minor(c) && !c.running);
  const year = s.year || 0;
  // Four years is the right window for a hit: a blockbuster that did well in 2068 is not
  // what anybody says about you in 2075. But Maxi: "if my film won an Asker it should say
  // so, and it should become what I am known for." It should, and it should never stop.
  // An Asker and a world hit are the two things that do not age — they are the sentence in
  // front of your name for the rest of your life, so they stay in the running for ever and
  // everything else has its four years. hitWeight scores both of those at 4 and above.
  const recent = all.filter((c) => hitWeight(c, s) > 0 && (hitWeight(c, s) >= 3.5 || year - (c.year || 0) <= 4))
    .sort((a, b) => hitWeight(b, s) - hitWeight(a, s) || (b.year || 0) - (a.year || 0));
  const hit = recent[0] || all.find((c) => hitWeight(c, s) > 0);
  if (hit) return { title: hit.title, year: hit.year, hit: true, why: whyOf(s, hit) };
  const best = all.filter((c) => scoreOf(c) >= 6).sort((a, b) => scoreOf(b) - scoreOf(a))[0];
  if (best) return { title: best.title, year: best.year, hit: false, why: scoreOf(best).toFixed(1) + '/10' };
  return null;
}
