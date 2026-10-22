// A festival picture a platform buys (Streaming Movies V1, docs/handoffs/2026-10-21-streaming-movies-v1-plan.md §7).
//
// The jury, the odds of selling at all, and what going or paying a sales agent does to them are the
// festival's and stay in release/theatrical.js, untouched. What is here is WHO buys it:
//
//   two buyers   it sold (or won), a distributor wants it as always, and a platform bids too. The release
//                waits a month and the choice is the player's, in Messages (meta/email.js writes the
//                letter, theatrical.js answerFestival takes the answer). Cinemas: a small release that
//                can grow, a box office, the standing a sale to cinemas gives. The platform: everywhere
//                at once at a price agreed now, the points paid out of that price, the reach. No answer
//                by the next month and the producers take the distributor's offer.
//   a home later an unsold picture can be bought by a platform months afterwards, once, at a low price;
//                the chance is rolled on the night from the film, the fit, the name on it and how it
//                failed to sell (career/streaming.js laterSaleOdds).
//
// One film, one project, one credit, whichever way it goes: the release that goes out is the one that
// screened, and a later sale replaces the unsold credit rather than adding a second one.
import { rint, chance } from '../../../engine/rng.js';
import { hash } from '../../../engine/hash.js';
import { addTimeline } from '../../../engine/timeline.js';
import { paid } from '../agent.js';
import { getProject } from '../project.js';
import { STREAMING, festivalBidder, laterSaleOdds, platformById, platformOfKind, filmNumbersOf } from '../streaming.js';

const DISTRIBUTORS = ['Monarch Pictures', 'Lantern Releasing', 'Bright Road', 'Northlight', 'Harbour Films'];
export function distributorFor(title) { return DISTRIBUTORS[hash('dist:' + String(title || '')) % DISTRIBUTORS.length]; }
const nowOf = (s) => (s.year || 0) * 12 + (s.month || 0);
const leadFameOf = (s, rel) => (rel.tier === 'supporting' ? (rel.withFame || 0) : (s.fame || 0));
// What a platform pays for a festival picture: a little over its cost if it sold, more if it won — and
// never less than the cheapest film of its own it would make (its low push line). Measured, the giant
// buying a €2m picture for €2.6m and showing it to sixty million scored 26 where its own films score 1.
export function festivalPrice(rel, fest, platform = null) {
  const budget = Number.isFinite(rel.budget) && rel.budget > 0 ? rel.budget : 1.5;
  const floor = platform ? filmNumbersOf(platform).low : 0;
  return Math.round(Math.max(floor, budget * (fest && fest.result === 'prize' ? 2.2 : 1.3)) * 10) / 10;
}

// Called by release.js open() the night the picture screens. True when the release now waits for the
// player's answer; the letter goes out with this month's post (meta/email.js).
export function holdForBuyers(s, rel, fest) {
  if (!fest || fest.result === 'unsold' || rel.buyer) return false;
  if (rel.awaitingBuyer) {
    // The month is up and nobody answered. The letter said what would happen.
    rel.awaitingBuyer = false;
    rel.buyer = 'cinema';
    addTimeline(s, `No answer about "${rel.title}". The producers took the offer from ${rel.distributor}.`);
    return false;
  }
  if (!STREAMING.pool) return false;
  const platform = festivalBidder(s, { genre: rel.genre, rating: rel.rating || 0, leadFame: leadFameOf(s, rel) });
  if (!platform) return false;
  rel.bidder = platform.id;
  rel.distributor = distributorFor(rel.title);
  rel.price = festivalPrice(rel, fest, platform);
  rel.awaitingBuyer = true;
  rel.due = nowOf(s) + 1;
  (s.releases = s.releases || []).push(rel);
  const how = fest.result === 'prize' ? `took the prize at ${fest.name}` : `screened at ${fest.name}`;
  s.lastEvent = `"${rel.title}" ${how}, and two buyers want it: ${rel.distributor} for cinemas, and ${platform.name}. The choice is yours — it is in Messages.`;
  addTimeline(s, `"${rel.title}" ${how}. Two buyers: ${rel.distributor} and ${platform.name}.`);
  return true;
}
// The player's answer (theatrical.js answerFestival). The release goes out next month, by that road.
export function chooseBuyer(s, rel, what) {
  rel.buyer = what === 'platform' ? 'platform' : 'cinema';
  rel.awaitingBuyer = false;
  const platform = platformById(s, rel.bidder);
  s.lastEvent = rel.buyer === 'platform'
    ? `${platform ? platform.name : 'The platform'} it is. "${rel.title}" goes out everywhere at once next month — no cinemas, no box office, and a lot more people than a small release would find.`
    : `${rel.distributor || 'The distributor'} it is. A small release next month, a few cities, the laurels on the poster — and whatever the box office makes of it.`;
  addTimeline(s, `"${rel.title}" — sold to ${rel.buyer === 'platform' ? (platform ? platform.name : 'a platform') : (rel.distributor || 'a distributor')}.`);
}

// The release becomes the platform's: the same release and the same project, now going out on a platform.
// If you took points on it, the price pays them: a share of what it sold for past what it cost.
export function sellToPlatform(s, rel, platform = null) {
  const p = platform || platformById(s, rel.bidder) || platformOfKind(s, 'niche');
  rel.streaming = true;
  rel.platformId = p.id;
  const pr = getProject(s, rel.projectId);
  if (pr) { pr.medium = 'streaming'; pr.distribution = 'drop'; pr.platformId = p.id; pr.acquired = true; }
  if (rel.backend > 0 && rel.price > 0) {
    const over = Math.max(0, rel.price - (rel.budget || 0));
    const cut = Math.round(over * 1e6 * (rel.backend / 100));
    if (cut > 0) { paid(s, cut, `"${rel.title}" — ${rel.backend}% of what ${p.name} paid for it`); rel.pointsPaid = cut; }
  }
  return p;
}

// ── a home later ──────────────────────────────────────────────────────────────
// On the night nobody bought it: whether somebody will, months from now. Kept until then.
export function rollLaterSale(s, rel, fest) {
  if (!STREAMING.pool) return null;
  const { odds, archetype } = laterSaleOdds({ genre: rel.genre, rating: rel.rating || 0, leadFame: leadFameOf(s, rel), push: rel.festPush || null });
  if (!odds || !chance(odds)) return null;
  const platform = platformOfKind(s, archetype);
  const budget = Number.isFinite(rel.budget) && rel.budget > 0 ? rel.budget : 1.5;
  const sale = { id: rel.id, due: nowOf(s) + rint(3, 9), platformId: platform.id, price: Math.round(Math.max(filmNumbersOf(platform).low * 0.5, budget * 0.6) * 10) / 10,
    festival: fest || null, rel: { ...rel } };
  (s.laterSales = s.laterSales || []).push(sale);
  return sale;
}
// Monthly (release.js releaseTick): the sales whose month has come, as releases to open tonight. The
// unsold credit leaves the filmography here and the release that opens puts it back, bought.
export function dueLaterSales(s) {
  const now = nowOf(s);
  const due = (s.laterSales || []).filter((x) => x.due <= now);
  if (!due.length) return [];
  s.laterSales = (s.laterSales || []).filter((x) => x.due > now);
  const out = [];
  for (const x of due) {
    const platform = platformById(s, x.platformId);
    if (!platform) continue;
    for (const bucket of ['filmography', 'discography']) if (s[bucket]) s[bucket] = s[bucket].filter((c) => c.id !== x.id);
    const rel = { ...x.rel, fest: null, buyer: 'platform', price: x.price, laterSale: { festival: x.festival }, due: now };
    sellToPlatform(s, rel, platform);
    addTimeline(s, `"${rel.title}" found a home: ${platform.name} bought it, months after nobody would.`);
    out.push(rel);
  }
  return out;
}
