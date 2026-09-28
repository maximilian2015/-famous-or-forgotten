// The account, and the petition. Two features that are really one idea: the audience you
// own is the only lever in this game nobody has to hand you.
//
// What is pinned here is the balance, because the balance is the whole design:
//   · you cannot out-post your own fame — the drift takes a viral year back
//   · what the followers buy is capped, and priced off the part above your fame
//   · a petition does not move the network; it moves the buyers
import { ensureWorld } from '../src/systems/world/world.js';
import * as S from '../src/systems/social/posting.js';
import { reach } from '../src/systems/career/castings.js';
import * as B from '../src/systems/career/bubble.js';

let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.log('  FAIL: ' + msg); fails++; } };

const st = (fame = 60) => {
  const s = { version: 'x', name: 'M', gender: 'female', ageY: 34, stage: 'career', dream: 'actor',
    fame, respect: 40, acting: 70, charisma: 60, looks: 70, luck: 50, scandal: 0, media: 0, mental: 80,
    health: 92, strain: 10, year: 2070, month: 0, timeline: [], filmography: [], productions: [],
    offers: [], releases: [], inbox: [], peakFame: fame, hasApartment: true, housing: 'flat',
    ap: 100, apMax: 100, apMaxEff: 100, cash: 2e6, genreXP: {}, people: [], quote: 2e6,
    awards: { wins: [], nominations: [] }, alive: true, cooldowns: {}, bubbles: [], laterOffers: [] };
  ensureWorld(s); return s;
};
const month = (s) => { s.month++; if (s.month > 11) { s.month = 0; s.year++; } };

// ── the ladder ────────────────────────────────────────────────────────────────
// A bigger name has more followers, always, and the gap between the levels is not a line.
{
  const counts = [15, 30, 45, 60, 75, 90].map((f) => S.natural(st(f)));
  for (let i = 1; i < counts.length; i++) ok(counts[i] > counts[i - 1] * 1.5, 'followers climb hard with fame: ' + counts.join(' '));
  ok(S.natural(st(90)) > 8000, 'a name people say in other countries has millions, not thousands: ' + S.natural(st(90)));
  ok(S.natural(st(15)) < 300, 'a near-unknown does not have half a million: ' + S.natural(st(15)));
}

// ── you cannot out-post your own fame ─────────────────────────────────────────
// This is the load-bearing rule. Post every single month for five years, never once miss,
// and the number walks back to where the career put it. A viral week is a loan.
{
  const s = st(60);
  S.socialTick(s);
  const start = S.followers(s);
  let peak = start;
  for (let m = 0; m < 60; m++) {
    s.cooldowns = {};
    S.post(s, 'joke');
    month(s);
    S.socialTick(s);
    peak = Math.max(peak, S.followers(s));
  }
  ok(peak > start * 1.25, 'posting hard does move the number in the short run: ' + peak + ' vs ' + start);
  ok(S.overIndex(s) < 1.2, 'and five years of it still ends up back at your own level: ' + S.overIndex(s).toFixed(2) + 'x');
  ok(s.fame === 60, 'posting is not a way to get famous — fame is untouched: ' + s.fame);
}

// ── the price ─────────────────────────────────────────────────────────────────
{
  const s = st(60);
  S.socialTick(s);
  for (let m = 0; m < 24; m++) { s.cooldowns = {}; S.post(s, 'joke'); month(s); }
  ok((s.scandal || 0) >= 15, 'two years of jokes on the internet costs you something: scandal ' + s.scandal);
}
{
  // Four photographs of yourself and somebody describes you as a personality.
  const s = st(60);
  S.socialTick(s);
  const r0 = s.respect;
  for (let m = 0; m < 30; m++) { s.cooldowns = {}; S.post(s, 'self'); month(s); }
  ok(s.respect < r0, 'the tally of selfies costs standing eventually: ' + r0 + ' -> ' + s.respect);
}
{
  // And the reverse. A year of saying nothing is read the other way round.
  const s = st(60);
  S.socialTick(s);
  const r0 = s.respect;
  for (let m = 0; m < 14; m++) { month(s); S.socialTick(s); }
  ok(s.respect > r0, 'a year of silence is worth standing: ' + r0 + ' -> ' + s.respect);
}

// ── what it buys, and the cap ─────────────────────────────────────────────────
{
  const plain = st(60); S.socialTick(plain);
  const big = st(60); S.socialTick(big); big.social.followers = S.natural(big) * 2.4;
  ok(S.socialReach(plain) === 0, 'an ordinary following buys no extra reach: ' + S.socialReach(plain));
  ok(S.socialReach(big) > 4, 'a following well above your fame gets you read for more: +' + S.socialReach(big).toFixed(1));
  ok(S.socialReach(big) <= 9, 'and it is capped — followers do not make you a film star: +' + S.socialReach(big).toFixed(1));
  ok(reach(big) > reach(plain), 'which shows up in what the agent brings: ' + reach(plain).toFixed(1) + ' -> ' + reach(big).toFixed(1));
  ok(S.socialBrandLift(big) > 1.3, 'brands are priced on followers: x' + S.socialBrandLift(big).toFixed(2));
  const huge = st(60); S.socialTick(huge); huge.social.followers = S.natural(huge) * 40;
  ok(S.socialBrandLift(huge) <= 1.85, 'the brand lift has a ceiling too: x' + S.socialBrandLift(huge).toFixed(2));
}

// ── one a month ───────────────────────────────────────────────────────────────
{
  const s = st(60); S.socialTick(s);
  S.post(s, 'work');
  const after = S.followers(s);
  S.post(s, 'work');
  ok(S.followers(s) === after, 'a second post in the same month does nothing');
  ok(!S.canPost(s, 'work').ok, 'and the button knows why');
}

// ── the petition: the network does not move, the buyers do ────────────────────
{
  const runs = 400;
  let netMoved = 0, rescuedBacked = 0, cancelledBacked = 0, rescuedQuiet = 0, cancelledQuiet = 0;
  const job = () => ({ role: 'Lead', type: 'Drama Series', genre: 'Drama', scale: 'recurring', tier: 'lead',
    episodes: 13, episodeFee: 2e5, salary: 13 * 2e5, prestigeScore: 58, stability: 78, medium: 'tv' });
  for (const backed of [true, false]) {
    for (let i = 0; i < runs; i++) {
      const s = st(60);
      const credit = { title: 'The Show', type: 'Drama Series', season: 1, rating: 78, endViewers: 6.2, viewers: 6.2 };
      s.filmography.push(credit);
      B.hangIt(s, credit, job(), 40);
      const before = s.bubbles[0].odds;
      if (backed) B.backTheCampaign(s, s.bubbles[0].id);
      if (backed) netMoved += s.bubbles[0].odds - before;
      for (let m = 0; m < 10 && s.bubbles.length; m++) { month(s); B.bubbleTick(s); }
      const moved = (s.offers || []).some((o) => o.kind === 'rescue');
      const dead = credit.renewal !== 'renewed';
      if (backed) { if (dead) cancelledBacked++; if (moved) rescuedBacked++; }
      else { if (dead) cancelledQuiet++; if (moved) rescuedQuiet++; }
    }
  }
  const moveAvg = netMoved / runs;
  ok(moveAvg > 0 && moveAvg < 7, 'your name on the campaign barely moves the network: +' + moveAvg.toFixed(1) + ' points');
  const backedRate = rescuedBacked / Math.max(1, cancelledBacked);
  const quietRate = rescuedQuiet / Math.max(1, cancelledQuiet);
  ok(backedRate > quietRate, 'but it does move the buyers: rescue after cancellation ' + Math.round(quietRate * 100) + '% -> ' + Math.round(backedRate * 100) + '%');
  ok(backedRate < 0.75, 'and a rescue is never the expected outcome: ' + Math.round(backedRate * 100) + '%');
}
{
  // A show nobody watched has nobody to sell. No audience, no rescue.
  let moved = 0;
  for (let i = 0; i < 300; i++) {
    const s = st(60);
    const credit = { title: 'The Show', type: 'Drama Series', season: 1, rating: 51, endViewers: 0.9, viewers: 0.9 };
    s.filmography.push(credit);
    B.hangIt(s, credit, { role: 'Lead', type: 'Drama Series', genre: 'Drama', scale: 'recurring', tier: 'lead', episodes: 13, episodeFee: 2e5, salary: 26e5, prestigeScore: 48, stability: 78 }, 40);
    B.backTheCampaign(s, s.bubbles[0].id);
    for (let m = 0; m < 10 && s.bubbles.length; m++) { month(s); B.bubbleTick(s); }
    if ((s.offers || []).some((o) => o.kind === 'rescue')) moved++;
  }
  ok(moved / 300 < 0.16, 'a show nobody watched cannot be sold to anybody either: ' + Math.round(moved / 3) + '%');
}
{
  // And the account is what carries it: the same campaign, a bigger following.
  const lift = [];
  for (const mult of [1, 2.4]) {
    const s = st(60); S.socialTick(s); s.social.followers = S.natural(s) * mult;
    lift.push(S.socialShopLift(s));
  }
  ok(lift[1] > lift[0], 'a following you own makes the campaign reach further: x' + lift[0].toFixed(2) + ' -> x' + lift[1].toFixed(2));
}

if (fails) { console.log('test_social: ' + fails + ' failed'); process.exit(1); }
console.log('test_social: all passed');
