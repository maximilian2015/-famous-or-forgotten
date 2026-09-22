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
  if ((c.asker || 0) > 0) return 'Asker';
  if (c.verdict === 'smash') return 'smash';
  if ((c.boxOffice || 0) >= 200e6) return '€' + Math.round((c.boxOffice || 0) / 1e6) + 'm';
  if (rankOf(s, c) <= 10) return '#' + rankOf(s, c) + ' of ' + c.year;
  return scoreOf(c).toFixed(1) + '/10';
}
// Known for the biggest thing of the last four years — a tie goes to the newer one. Older
// than that, the most recent hit there ever was; never a hit, the best thing you did.
export function knownFor(s) {
  const all = [...(s.filmography || []), ...(s.discography || [])].filter((c) => !minor(c) && !c.running);
  const year = s.year || 0;
  const recent = all.filter((c) => year - (c.year || 0) <= 4 && hitWeight(c, s) > 0)
    .sort((a, b) => hitWeight(b, s) - hitWeight(a, s) || (b.year || 0) - (a.year || 0));
  const hit = recent[0] || all.find((c) => hitWeight(c, s) > 0);
  if (hit) return { title: hit.title, year: hit.year, hit: true, why: whyOf(s, hit) };
  const best = all.filter((c) => scoreOf(c) >= 6).sort((a, b) => scoreOf(b) - scoreOf(a))[0];
  if (best) return { title: best.title, year: best.year, hit: false, why: scoreOf(best).toFixed(1) + '/10' };
  return null;
}
