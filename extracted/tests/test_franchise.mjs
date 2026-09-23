import { maybeContinue, sequelGap, laterOffersTick, renewalOdds, sequelOdds, seasonRaise, seasonBase, performanceFactor, trendFactor, sequelRaise, seasonCap, SEASON_CAP } from '../src/systems/career/franchise.js';
import * as F2 from '../src/systems/career/franchise.js';
import { startProduction, productionTick } from '../src/systems/career/production.js';
import { releaseTick } from '../src/systems/career/release.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', ageY: 30, stage: 'career', dream: 'actor', cash: 0, fame: 40, mental: 60,
  acting: 60, singing: 0, looks: 50, respect: 40, confidence: 40, genreXP: {}, filmography: [], discography: [],
  offers: [], timeline: [], year: 2030, month: 0, ...over });
const series = (over) => ({ title: 'Late River', role: 'Recurring', type: 'Soap Opera', genre: 'Drama',
  salary: 60000, months: 4, episodes: 30, episodeFee: 2000, season: 1, prestigeScore: 45, tier: 'lead', ...over });
const film = (over) => ({ title: 'Golden Echo', role: 'Lead', type: 'Feature Film', genre: 'Thriller',
  salary: 500000, months: 6, part: 1, prestigeScore: 60, tier: 'lead', ...over });

// renewal odds behave like a network
// Renewal is the audience, not the reviews: a soap is a habit, network drama lives on its
// numbers, prestige on acclaim.
ok('a network flop is cancelled', renewalOdds(30, 1, 'Network Drama') < 15, renewalOdds(30, 1, 'Network Drama') + '%');
ok('a hit is renewed', renewalOdds(90, 1, 'Network Drama') > 80, renewalOdds(90, 1, 'Network Drama') + '%');
ok('sixty and up comes back as a matter of course', renewalOdds(60, 1, 'Network Drama') >= 80, renewalOdds(60, 1, 'Network Drama') + '%');
ok('fifty to sixty is the genuine coin toss', renewalOdds(55, 1, 'Network Drama') > 40 && renewalOdds(55, 1, 'Network Drama') < 75, renewalOdds(55, 1, 'Network Drama') + '%');
ok('a soap is a habit — it comes back whatever the critics say', renewalOdds(45, 1, 'Soap Opera') >= 85, renewalOdds(45, 1, 'Soap Opera') + '%');
ok('even a bad soap mostly comes back', renewalOdds(35, 1, 'Soap Opera') >= 60, renewalOdds(35, 1, 'Soap Opera') + '%');
ok('nobody watching cancels what the reviews would have kept', renewalOdds(70, 1, 'Network Drama', 0.8) < renewalOdds(70, 1, 'Network Drama', 4), `${renewalOdds(70, 1, 'Network Drama', 0.8)}% vs ${renewalOdds(70, 1, 'Network Drama', 4)}%`);
ok('prestige lives on acclaim', renewalOdds(50, 1, 'Prestige Series') < 50 && renewalOdds(75, 1, 'Prestige Series') > 85);
ok('long shows get tired', renewalOdds(80, 6, 'Soap Opera') < renewalOdds(80, 2, 'Soap Opera'), `s2 ${renewalOdds(80, 2, 'Soap Opera')}% → s6 ${renewalOdds(80, 6, 'Soap Opera')}%`);
ok('the format runs out at the cap', renewalOdds(95, seasonCap('Prestige Series'), 'Prestige Series') === 0);
ok('a soap can run far longer than prestige', seasonCap('Soap Opera') > seasonCap('Prestige Series'), `${seasonCap('Soap Opera')} vs ${seasonCap('Prestige Series')}`);
ok('every format declares a cap', Object.values(SEASON_CAP).every((v) => v >= 5));
console.log('      season caps — ' + Object.entries(SEASON_CAP).map(([k, v]) => `${k} ${v}`).join(', '));

// pay follows the ratings, not just the season number
ok('season three is the renegotiation', seasonBase(3) > seasonBase(2) && seasonBase(3) > seasonBase(4),
  `s2 ${seasonBase(2)}, s3 ${seasonBase(3)}, s4 ${seasonBase(4)}`);
ok('a hit pays far better than a survivor', performanceFactor(90) > performanceFactor(65) * 1.3,
  `${performanceFactor(90)} vs ${performanceFactor(65)}`);
ok('a bad season is a pay cut, not a raise', performanceFactor(45) < 1, String(performanceFactor(45)));
ok('a climbing show is worth more than a flat one', trendFactor(80, 70) > trendFactor(80, 80));
ok('a sliding show is worth less', trendFactor(70, 80) < 1, String(trendFactor(70, 80)));
ok('a first season has no trend to read', trendFactor(80, null) === 1);
// the whole point: the same season can be a raise or a cut
const hitRaise = seasonRaise(5, 90, 78), flopRaise = seasonRaise(5, 44, 70);
ok('season five is a raise for a hit and a cut for a flop', hitRaise > 1.4 && flopRaise < 1,
  `hit ×${hitRaise.toFixed(2)}, flop ×${flopRaise.toFixed(2)}`);
console.log(`      season 5 — rated 90 and climbing: ×${hitRaise.toFixed(2)} · rated 44 and sliding: ×${flopRaise.toFixed(2)}`);

// a renewal actually arrives as an offer
function renewUntilItHappens(rating, season) {
  for (let i = 0; i < 400; i++) {
    const s = st(); const p = series({ season });
    const next = maybeContinue(s, { rating, title: p.title }, p);
    if (next) return { s, next };
  }
  return null;
}
const got = renewUntilItHappens(88, 1);
ok('a renewed show comes back as an offer', !!got && got.next.kind === 'renewal');
ok('it is the next season of the same show', got.next.season === 2 && /Late River/.test(got.next.projectTitle), got.next.projectTitle);
ok('and it pays more per episode', got.next.episodeFee > 2000, `€2,000 → €${got.next.episodeFee}`);
ok('the fee still adds up', got.next.salary === got.next.episodeFee * got.next.episodes);
ok('the renewal explains itself', !!got.next.note, got.next.note);
const s3 = renewUntilItHappens(88, 2);
ok('season three says the cast is renegotiating', /renegotiat/i.test(s3.next.note), s3.next.note);

// cancellation is written down
const cancelled = st(); let wasCancelled = false;
for (let i = 0; i < 200 && !wasCancelled; i++) { cancelled.timeline = []; const r = maybeContinue(cancelled, { rating: 20, title: 'Late River' }, series({ season: 3 })); if (!r) wasCancelled = true; }
ok('a cancellation goes in the diary', /not renewed/.test(JSON.stringify(cancelled.timeline)), JSON.stringify(cancelled.timeline.slice(-1)));

// a show can actually run its whole life
function runShow(rating, type = 'Network Drama', viewers = null) {
  let p = series({ type }); let seasons = 1;
  for (let guard = 0; guard < 30; guard++) {
    const s = st();
    const next = maybeContinue(s, { rating, title: p.title, viewers }, p);
    if (!next) break;
    seasons = next.season;
    p = series({ type, season: next.season, episodes: next.episodes, episodeFee: next.episodeFee, salary: next.salary, months: next.months });
  }
  return { seasons, lastFee: p.episodeFee };
}
let longest = 0, totalRuns = 0;
for (let i = 0; i < 300; i++) { const r = runShow(86); longest = Math.max(longest, r.seasons); totalRuns += r.seasons; }
ok('a good show can run for years', longest >= 5, 'longest ' + longest);
ok('but not forever', longest <= seasonCap('Network Drama'), 'longest ' + longest);
console.log(`      a show rated 86 runs ${(totalRuns / 300).toFixed(1)} seasons on average, longest ${longest}`);
// A 52-rated show renews at 55% a season, so it CAN limp to five — the point is the
// average, not any single run.
let weakTotal = 0, weakLong = 0;
for (let i = 0; i < 300; i++) { const r = runShow(52); weakTotal += r.seasons; if (r.seasons >= 5) weakLong++; }
const weakAvg = weakTotal / 300;
ok('a weak show usually dies early', weakAvg < 3.4, `average ${weakAvg.toFixed(1)} seasons`);
ok('but it can occasionally limp on', weakLong > 0 && weakLong < 90, `${weakLong}/300 reached five`);
console.log(`      a show rated 52 runs ${weakAvg.toFixed(1)} seasons on average`);

// sequels
ok('a flop gets no sequel', sequelOdds(40, 1, false) === 0);
ok('a big hit often does', sequelOdds(92, 1, false) > 60, sequelOdds(92, 1, false) + '%');
ok('each part is less likely than the last', sequelOdds(92, 3, false) < sequelOdds(92, 1, false));
ok('nothing runs past part five', sequelOdds(99, 5, false) === 0);
ok('an option is not a question', sequelOdds(10, 2, true) === 100);
function sequelUntil(rating, part, optioned) {
  for (let i = 0; i < 500; i++) {
    const s = st(); const p = film({ part, optioned, optionParts: 3 });
    // A sequel is not offered the month the last one closed any more — it is announced and
    // then it is years. maybeContinue parks it on s.laterOffers and returns null.
    maybeContinue(s, { rating, title: p.title, verdict: 'smash' }, p);
    if ((s.laterOffers || []).length) return s.laterOffers[0].offer;
  }
  return null;
}
const seq = sequelUntil(92, 1, false);
ok('a sequel is titled as one', /Golden Echo II/.test(seq.projectTitle), seq.projectTitle);
ok('and pays more', seq.salary > 500000, '€' + seq.salary.toLocaleString());
// Most sequels are thinner than the first. A few are not — the second one is occasionally
// the better film, which is the reason anybody still argues about Terminator. One sample
// cannot see that, so count them.
let worse = 0, better = 0;
for (let i = 0; i < 200; i++) { const x = sequelUntil(92, 1, false); if (!x) continue; if (x.prestigeScore < 60) worse++; else better++; }
// A quarter of franchises hold up and an eighth get better, so "most" is now about seven
// in ten rather than nine — which is the point of giving them a character at all.
ok('most sequels are thinner than the first', worse > better * 1.7, worse + ' thinner vs ' + better + ' better');
ok('but the second one is occasionally the better film', better > 0, String(better));
const third = sequelUntil(92, 2, false);
ok('the third one is titled III', /Golden Echo III/.test(third.projectTitle), third.projectTitle);
const forced = sequelUntil(20, 1, true);
ok('an optioned sequel arrives even after a flop', !!forced);
ok('at the old money', forced.salary === 500000, '€' + forced.salary.toLocaleString());
ok('and says so', /signed for this one/.test(forced.note), forced.note);

// end to end: a wrapped shoot goes into post, and the RENEWAL waits for the premiere
const live = st({ fame: 50 });
startProduction(live, { id: 'x', projectTitle: 'Late River', role: 'Recurring', type: 'Soap Opera', genre: 'Drama',
  salary: 60000, months: 2, episodes: 30, episodeFee: 2000, season: 1, prestigeScore: 45, tier: 'lead', scale: 'recurring' });
live.production.meter = 95; live.acting = 95; live.production.stability = 100;   // pinned: a random collapse here was the one-in-twenty TypeError
productionTick(live); productionTick(live);
ok('the shoot wrapped into post', live.production === null && live.releases.length === 1 && live.filmography.length === 0);
ok('the release remembers its season', live.releases[0].season === 1, JSON.stringify(live.releases[0]));
ok('nobody talks about a second season yet', live.offers.length === 0, JSON.stringify(live.offers));
// wind the clock forward until it opens
for (let i = 0; i < 24 && live.releases.length; i++) { live.month += 1; if (live.month > 11) { live.month = 0; live.year += 1; } releaseTick(live); }
ok('it eventually opens', live.filmography.length === 1, JSON.stringify(live.filmography));
ok('and the credit remembers its season', live.filmography[0].season === 1);
if (live.offers.length) {
  ok('the renewal offer is playable', live.offers[0].months >= 2 && live.offers[0].salary > 0 && live.offers[0].deadline > 0);
} else { ok('the renewal offer is playable', true, 'show was cancelled this run'); }

// the money decides the sequel, not only the reviews
ok('a smash rescues a merely-good film', sequelOdds(75, 1, false, 'smash') > sequelOdds(75, 1, false, null),
  `${sequelOdds(75, 1, false, null)}% → ${sequelOdds(75, 1, false, 'smash')}%`);
ok('a bomb buries a well-reviewed one', sequelOdds(88, 1, false, 'bomb') < sequelOdds(88, 1, false, null),
  `${sequelOdds(88, 1, false, null)}% → ${sequelOdds(88, 1, false, 'bomb')}%`);
ok('an option still overrides the money', sequelOdds(20, 2, true, 'bomb') === 100);

// ── is it franchise material at all (Maxi: not every film with a box office) ─────
{
  const share = (sc, g) => { const c = { built: 0, open: 0, closed: 0 }; for (let i = 0; i < 3000; i++) c[F2.rollPotential(sc, g)]++; return c; };
  const bb = share('blockbuster', 'Sci-Fi'), dr = share('feature', 'Drama');
  ok('a sci-fi tentpole is usually built for it', bb.built > 1200 && bb.closed > 150, JSON.stringify(bb));
  ok('a drama feature usually ends', dr.closed > 1600 && dr.built < 400, JSON.stringify(dr));
  ok('a closed story never gets a sequel, whatever it took', F2.sequelOdds(95, 1, false, 'smash', 'blockbuster', 'Sci-Fi', 'closed') === 0);
  ok('and one built for it does, when it made money', F2.sequelOdds(80, 1, false, 'smash', 'blockbuster', 'Sci-Fi', 'built') > 60);
  ok('a smash drama mostly does not', F2.sequelOdds(88, 1, false, 'smash', 'feature', 'Drama', 'open') < 15);
  ok('breaking even is not a sequel, however kind the reviews', F2.sequelOdds(92, 1, false, 'broke even', 'blockbuster', 'Sci-Fi', 'built') === 0);
  ok('an option still overrides all of it', F2.sequelOdds(20, 2, true, 'bomb', 'indie', 'Drama', 'closed') === 100);
  // development hell
  const s = { year: 2060, month: 0, timeline: [], offers: [], filmography: [{ title: 'Iron Tide', rating: 80 }], laterOffers: [] };
  let died = 0, made = 0;
  for (let i = 0; i < 300; i++) {
    const t = JSON.parse(JSON.stringify(s));
    t.laterOffers = [{ due: 2060 * 12, since: 2060 * 12 - 30, offer: { id: 'x', kind: 'sequel', part: 2, projectTitle: 'Iron Tide II', role: 'Lead', months: 5, salary: 1e6, deadline: 3 } }];
    F2.laterOffersTick(t);
    if (t.timeline.some((x) => /is dead\./.test(x.text))) died++; else if (t.offers.length) made++;
  }
  ok('a quarter of announced sequels are never made', died > 40 && died < 130, `${died} dead, ${made} made of 300`);
  const t = JSON.parse(JSON.stringify(s));
  t.laterOffers = [{ due: 2060 * 12, since: 2060 * 12 - 30, offer: { id: 'x', kind: 'sequel', part: 2, projectTitle: 'Iron Tide II', role: 'Lead', months: 5, salary: 1e6, deadline: 3 } }];
  let n = 0; while (!t.filmography[0].sequelDead && n++ < 200) { t.laterOffers = [{ due: 2060 * 12, since: 2060 * 12 - 30, offer: { id: 'x', kind: 'sequel', part: 2, projectTitle: 'Iron Tide II', role: 'Lead', months: 5, salary: 1e6, deadline: 3 } }]; F2.laterOffersTick(t); }
  ok('and the film says so in the filmography', t.filmography[0].sequelDead === true);
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);

