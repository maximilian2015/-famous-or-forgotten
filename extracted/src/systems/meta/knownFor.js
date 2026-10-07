// The film next to your name. Maxi: "the hits should be framed so we can tell, and the last
// hit should sit next to your name — and change when there is a new one."
import { isBillion } from '../career/billion.js';
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
  // A billion first: it is the rarer of the two and the louder. A picture can be a world hit
  // at €700m and this at a thousand million, and the line has room for one word.
  if (isBillion(c)) return '€' + ((c.boxOffice || 0) / 1e9).toFixed(2) + 'bn';
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
// WHY this one is on the wall, in words, and a different answer for each. The band used to come
// off the weight alone, so four billion-euro pictures were four identical lines reading "The one
// that printed money" — a wall of five that said one thing. Maxi: "это слабое место."
//
// Nothing new is stored for it. Every reason below is read off the credit the way `whyOf` reads
// the number next to it: the money, the sequel, the Asker, the reviews, the year's table. The
// reasons are tried in order of how much the business would lead with them, and a reason already
// used on the wall is passed over for the next one — which is what makes the second billion say
// something other than the first.
function bandsFor(s, c, ctx) {
  const bo = c.boxOffice || 0, sc = scoreOf(c);
  const out = [];
  if (bo >= 200e6 && bo === ctx.topGross) out.push('Your biggest picture');
  if ((c.part || 1) > 1) out.push('The one they came back for');
  // A career with four of them needs four different sentences, and the order they happened in
  // is the one thing that genuinely differs: the first is the career event, the fourth is a
  // Tuesday. Chronological, so it does not change when a later one out-grosses an earlier.
  if (isBillion(c)) {
    const n = ctx.billionRank[c.title] || 0;
    out.push(n === 1 ? 'Your first billion' : n === 2 ? 'The second billion' : n >= 3 ? `Billion number ${n}` : 'Billion club', 'Billion club');
  }
  if ((c.asker || 0) > 0) out.push((c.asker || 0) > 1 ? 'The night it swept' : 'The one that won');
  if ((c.nominated || 0) > 0) out.push('The performance they nominated');
  if (c.worldHit || c.status === 'World Hit') out.push('The one the whole world saw');
  if (sc >= 8 && sc === ctx.topScore) out.push('The best thing you have done');
  if (c.verdict === 'smash') out.push('A smash', 'Another smash');
  if (bo >= 300e6) out.push('The one that printed money');
  const r = rankOf(s, c);
  if (r <= 10) out.push(`Number ${r} of ${c.year}`);
  if (sc >= 8.5) out.push('The reviews nobody expected');
  if (c.genre) out.push(`The ${String(c.genre).toLowerCase()} everybody saw`);
  return out;
}
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
  const shown = (cream.length ? cream : ranked.slice(0, 1)).slice(0, limit);
  const ctx = {
    topGross: Math.max(0, ...shown.map((x) => x.c.boxOffice || 0)),
    topScore: Math.max(0, ...shown.map((x) => scoreOf(x.c))),
    billionRank: {},
  };
  // Which billion each one was, counted over the whole career rather than the wall — the third
  // is the third even if the second is not shown.
  all.filter(isBillion)
    .sort((a, b) => (a.year || 0) - (b.year || 0) || (a.boxOffice || 0) - (b.boxOffice || 0))
    .forEach((c, i) => { ctx.billionRank[c.title] = i + 1; });
  const used = new Set();
  return shown.map((x) => {
    // The weight bands are the floor, for a wall where every specific reason is already spoken
    // for. They are allowed to repeat; the reasons above are not.
    const floor = x.w >= 5 ? 'The one the whole world saw' : x.w >= 4 ? 'The one that won'
      : x.w >= 3 ? 'The one that printed money' : x.w >= 2 ? 'A real hit' : 'It worked';
    const band = bandsFor(s, x.c, ctx).find((b) => !used.has(b)) || floor;
    used.add(band);
    return {
      title: x.c.title, year: x.c.year, role: x.c.role, genre: x.c.genre, weight: x.w,
      why: whyOf(s, x.c), score: scoreOf(x.c), boxOffice: x.c.boxOffice || 0, band,
    };
  });
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
