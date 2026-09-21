import { scheduleRelease, releaseTick, runTick, postProduction, boxOfficeFor, viewersFor, budgetFor, verdictOf, isFilm }
  from '../src/systems/career/release.js';
import { startProduction, productionTick } from '../src/systems/career/production.js';
import { relevanceDrift } from '../src/engine/economy.js';

// The newest moment: on screen, or last in the queue behind one still up. Moments queue now.
const lastMoment = (s) => ((s.moments || []).length ? s.moments[s.moments.length - 1] : s.bigMoment);

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', ageY: 30, stage: 'career', dream: 'actor', cash: 0, fame: 40, respect: 40,
  mental: 60, acting: 60, singing: 0, looks: 50, confidence: 40, quote: 0, genreXP: {},
  filmography: [], discography: [], offers: [], releases: [], timeline: [], year: 2030, month: 0, ...over });
const job = (over) => ({ title: 'Golden Echo', role: 'Lead', type: 'Feature Film', genre: 'Thriller',
  salary: 900000, months: 6, scale: 'feature', tier: 'lead', prestigeScore: 60, part: 1, season: 0,
  episodes: 0, episodeFee: 0, crew: [{ id: 'c', name: 'Mira Croft', role: 'Director', bond: 50 }], ...over });
const credit = (over) => ({ title: 'Golden Echo', role: 'Lead', type: 'Feature Film', genre: 'Thriller',
  salary: 900000, rating: 80, status: 'Well-received', year: 2030, season: 0, part: 1, episodes: 0, ...over });
const money = (n) => n >= 1000000000 ? '€' + (n / 1000000000).toFixed(2) + 'bn'
  : n >= 1000000 ? '€' + (n / 1000000).toFixed(1) + 'm' : '€' + Math.round(n / 1000) + 'k';
const run = (s, months) => { for (let i = 0; i < months; i++) { s.month += 1; if (s.month > 11) { s.month = 0; s.year += 1; } releaseTick(s); runTick(s); } };

// ── the wait ──────────────────────────────────────────────────────────────────
ok('a one-day job is out almost at once', postProduction('oneoff') <= 2);
let tent = [], feat = [];
for (let i = 0; i < 300; i++) { tent.push(postProduction('blockbuster')); feat.push(postProduction('feature')); }
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
ok('a blockbuster waits longer than a feature', avg(tent) > avg(feat), `${avg(tent).toFixed(1)} vs ${avg(feat).toFixed(1)} months`);
ok('nothing waits more than a year', Math.max(...tent) <= 12, String(Math.max(...tent)));
console.log(`      post-production — feature ${avg(feat).toFixed(1)} mo, blockbuster ${avg(tent).toFixed(1)} mo`);

// ── scheduling ────────────────────────────────────────────────────────────────
const sch = st();
const rel = scheduleRelease(sch, credit(), job());
ok('the release is queued, not released', sch.releases.length === 1 && sch.filmography.length === 0);
ok('it has a date in the future', rel.due > sch.year * 12 + sch.month, `due ${rel.due}, now ${sch.year * 12 + sch.month}`);
ok('the diary says it is coming', /opens in about/i.test(JSON.stringify(sch.timeline)), JSON.stringify(sch.timeline));
ok('it keeps enough of the shoot to be continued later', !!rel.job && rel.job.scale === 'feature' && rel.job.salary === 900000);

// ── the day itself ────────────────────────────────────────────────────────────
const day = st();
scheduleRelease(day, credit({ rating: 82 }), job());
run(day, 1);
ok('it does not open the month after the wrap', day.filmography.length === 0 && day.releases.length === 1);
run(day, 14);
ok('it opens eventually', day.filmography.length === 1 && day.releases.length === 0);
const c = day.filmography[0];
ok('the credit knows what it made', c.boxOffice > 0, money(c.boxOffice));
ok('the credit knows what it scored', c.score > 0 && c.score <= 10, String(c.score));
ok('and how the industry read it', !!c.verdict, c.verdict);
// Two moments now, not one: the premiere the night it opens, and the verdict when the run
// finishes and the score and the money are finally real.
ok('the verdict stops the game', lastMoment(day) && lastMoment(day).id === 'verdict', JSON.stringify(lastMoment(day)).slice(0, 90));
ok('the modal has both numbers', /\d/.test(lastMoment(day).score) && /€|m/.test(lastMoment(day).money), `${lastMoment(day).score} · ${lastMoment(day).money}`);
console.log(`      a feature rated 82 opened to ${money(c.boxOffice)} — ${c.verdict}`);

// ── two things in post at once, opening in order ──────────────────────────────
const two = st();
scheduleRelease(two, credit({ title: 'A' }), job({ title: 'A', scale: 'blockbuster' }));
scheduleRelease(two, credit({ title: 'B' }), job({ title: 'B', scale: 'small' }));
ok('two films can sit in post together', two.releases.length === 2);
run(two, 24);
ok('both come out', two.filmography.length === 2, JSON.stringify(two.filmography.map((x) => x.title)));
ok('the quick one came out first', two.filmography[1].title === 'B', JSON.stringify(two.filmography.map((x) => x.title)));

// ── television counts people, not tickets ─────────────────────────────────────
const tv = st();
scheduleRelease(tv, credit({ title: 'Late River', type: 'Soap Opera', season: 1, episodes: 30, rating: 74 }),
  job({ title: 'Late River', type: 'Soap Opera', scale: 'recurring', season: 1, episodes: 30, episodeFee: 2000 }));
run(tv, 14);
ok('a show has an audience, not a gross', tv.filmography[0].viewers > 0 && !tv.filmography[0].boxOffice, JSON.stringify(tv.filmography[0]));
ok('and its verdict is a television verdict', ['watched', 'seen', 'ignored'].includes(tv.filmography[0].verdict), tv.filmography[0].verdict);
ok('a show is not a film', !isFilm('recurring') && isFilm('feature'));

// ── the money means something ─────────────────────────────────────────────────
const good = st({ fame: 60 }), bad = st({ fame: 60 });
let goodGross = 0, badGross = 0;
for (let i = 0; i < 400; i++) {
  goodGross += boxOfficeFor(good, { scale: 'feature', rating: 92, genre: 'Thriller' });
  badGross += boxOfficeFor(bad, { scale: 'feature', rating: 35, genre: 'Thriller' });
}
ok('a good film takes more than a bad one', goodGross > badGross * 2, `${money(goodGross / 400)} vs ${money(badGross / 400)}`);
let famous = 0, nobody = 0;
for (let i = 0; i < 400; i++) {
  famous += boxOfficeFor(st({ fame: 95 }), { scale: 'feature', rating: 70, genre: 'X' });
  nobody += boxOfficeFor(st({ fame: 5 }), { scale: 'feature', rating: 70, genre: 'X' });
}
ok('a name sells tickets', famous > nobody * 1.3, `icon ${money(famous / 400)} vs unknown ${money(nobody / 400)}`);
ok('a blockbuster costs more to make than an indie', budgetFor({ scale: 'blockbuster' }) > budgetFor({ scale: 'indie' }));
ok('four times the budget is a smash', verdictOf({ scale: 'feature', boxOffice: budgetFor({ scale: 'feature' }) * 5 }) === 'smash');
ok('under the budget is a bomb', verdictOf({ scale: 'feature', boxOffice: budgetFor({ scale: 'feature' }) * 0.6 }) === 'bomb');

// A well-reviewed film that nobody paid for MUST be possible — that is the whole point
// of having two numbers. Otherwise the score is just the box office in a hat.
// The mechanism is genre: an adored drama and an adored horror do different business.
// month 3 puts Sci-Fi on the front pages, so neither of these two is riding a trend.
let adoredFlops = 0, panneHits = 0;
for (let i = 0; i < 600; i++) {
  const a = { scale: 'feature', rating: 90, genre: 'Drama' }; a.boxOffice = boxOfficeFor(st({ fame: 30, month: 3 }), a);
  if (verdictOf(a) === 'bomb' || verdictOf(a) === 'broke even') adoredFlops++;
  const b = { scale: 'feature', rating: 62, genre: 'Horror' }; b.boxOffice = boxOfficeFor(st({ fame: 90, month: 3 }), b);
  if (verdictOf(b) === 'smash' || verdictOf(b) === 'profitable') panneHits++;
}
ok('a beloved drama can still lose money', adoredFlops > 0, `${adoredFlops}/600`);
ok('and a mediocre horror can still print it', panneHits > 0, `${panneHits}/600`);
console.log(`      drama rated 90, unprofitable: ${adoredFlops}/600 · horror rated 62, profitable: ${panneHits}/600`);
const dramaG = [], horrorG = [];
for (let i = 0; i < 400; i++) {
  dramaG.push(boxOfficeFor(st({ fame: 55, month: 3 }), { scale: 'feature', rating: 85, genre: 'Drama' }));
  horrorG.push(boxOfficeFor(st({ fame: 55, month: 3 }), { scale: 'feature', rating: 85, genre: 'Horror' }));
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
ok('the same score sells differently by genre', mean(horrorG) > mean(dramaG) * 1.4,
  `drama ${money(mean(dramaG))} vs horror ${money(mean(horrorG))} at the same 8.5`);

// ── what the premiere does to you ─────────────────────────────────────────────
function openWith(rating, scale, fame = 40) {
  const s = st({ fame });
  scheduleRelease(s, credit({ rating, status: rating >= 85 ? 'Hit' : 'Released' }), job({ scale }));
  const before = s.fame;
  run(s, 24);
  return { s, gained: s.fame - before, credit: s.filmography[0] };
}
let hitGain = 0, flopGain = 0;
for (let i = 0; i < 200; i++) { hitGain += openWith(92, 'blockbuster').gained; flopGain += openWith(30, 'blockbuster').gained; }
ok('a hit makes you famous', hitGain / 200 > 8, `+${(hitGain / 200).toFixed(1)} fame`);
ok('a flop does much less, and can cost you', flopGain / 200 < hitGain / 200 * 0.6, `+${(flopGain / 200).toFixed(1)} fame`);
console.log(`      opening a blockbuster — rated 92: +${(hitGain / 200).toFixed(1)} fame · rated 30: +${(flopGain / 200).toFixed(1)} fame`);
let respectUp = 0, respectDown = 0;
for (let i = 0; i < 100; i++) { respectUp += openWith(92, 'indie').s.respect; respectDown += openWith(30, 'indie').s.respect; }
ok('the score buys respect', respectUp / 100 > 40 && respectDown / 100 < 40, `${(respectUp / 100).toFixed(1)} vs ${(respectDown / 100).toFixed(1)}`);

// a commercial smash raises what you can ask for
let raised = 0;
for (let i = 0; i < 300; i++) { const r = openWith(88, 'feature', 70); if (r.s.quote > 0) raised++; }
ok('a smash raises your quote', raised > 0, `${raised}/300 openings moved the quote`);

// ── you are not forgotten while a film is in post ─────────────────────────────
function fade(withRelease) {
  const s = st({ fame: 70, stage: 'career' });
  if (withRelease) scheduleRelease(s, credit(), job({ scale: 'blockbuster' }));
  s._idleMonths = 10;
  for (let i = 0; i < 6; i++) relevanceDrift(s);
  return s.fame;
}
ok('a film in post slows the fade', fade(true) > fade(false), `${fade(true).toFixed(1)} vs ${fade(false).toFixed(1)} after six idle months`);

// ── end to end from a booking ─────────────────────────────────────────────────
const live = st({ fame: 55, cash: 0 });
startProduction(live, { id: 'x', projectTitle: 'Golden Echo', role: 'Lead', type: 'Feature Film', genre: 'Thriller',
  salary: 1200000, months: 3, tier: 'lead', scale: 'feature', prestigeScore: 65, stability: 96 });
live.production.meter = 90; live.acting = 90;
productionTick(live); productionTick(live); productionTick(live);
// Paid in three, taxed in three (agent.js taxOn): what lands is the fee less a third of what is over the threshold each month.
const expectNet = 3 * (400000 - Math.round((400000 - 30000) * 0.34));
ok('the shoot paid in full, after tax', live.cash === expectNet, '€' + live.cash.toLocaleString() + ' vs €' + expectNet.toLocaleString());
ok('and went into post', live.releases.length === 1 && live.filmography.length === 0);
ok('the wrap message talks about waiting', /wait for it to open/.test(live.lastEvent), live.lastEvent);
ok('no premiere modal at the wrap', !live.bigMoment);
run(live, 24);
ok('and the premiere arrives on its own', live.filmography.length === 1 && !!live.bigMoment, live.lastEvent);
ok('the shoot fee did not double up at the premiere', live.cash === expectNet, '€' + live.cash.toLocaleString());

// ── the table ─────────────────────────────────────────────────────────────────
console.log('\n      WHAT A PICTURE OPENS TO  (average of 300, star at fame 55)');
console.log('      ' + 'rating'.padEnd(10) + ['small', 'indie', 'feature', 'blockbuster'].map((h) => h.padStart(16)).join(''));
for (const r of [35, 55, 70, 82, 92]) {
  const cells = ['small', 'indie', 'feature', 'blockbuster'].map((scale) => {
    let sum = 0, verdicts = {};
    for (let i = 0; i < 300; i++) {
      const x = { scale, rating: r, genre: 'X' }; x.boxOffice = boxOfficeFor(st({ fame: 55 }), x);
      sum += x.boxOffice; const v = verdictOf(x); verdicts[v] = (verdicts[v] || 0) + 1;
    }
    const top = Object.entries(verdicts).sort((a, b) => b[1] - a[1])[0][0];
    return `${money(sum / 300)} ${top}`.padStart(16);
  });
  console.log('      ' + `${(r / 10).toFixed(1)}/10`.padEnd(10) + cells.join(''));
}

// ── found by playing: a credit must never make you LESS known ─────────────────
// Supporting tier gives +2 fame and a bomb took 3 away, so every small flop moved a
// beginner backwards. Play-tested to age 44 with acting 100 and ten credits: fame 0.
let wentBackwards = 0;
for (let i = 0; i < 400; i++) {
  const s = st({ fame: 20 });
  scheduleRelease(s, credit({ rating: 25, status: 'Flop' }), job({ scale: 'indie', tier: 'supporting' }));
  const before = s.fame;
  run(s, 20);
  if (s.fame < before) wentBackwards++;
}
ok('a released credit never takes your name backwards', wentBackwards === 0, `${wentBackwards}/400 lost fame for working`);

// ── found by playing: the bottom of the ladder has to be climbable ────────────
// A working actor doing one supporting job every eighteen months must slowly become
// known. The old flat drift ate 4.4 fame a year against a +2 credit.
function twentyYears() {
  const s = st({ fame: 0, peakFame: 0 });
  let gap = 0;
  for (let m = 0; m < 240; m++) {
    s.month++; if (s.month > 11) { s.month = 0; s.year++; s.ageY++; }
    if (!s.production && ++gap >= 18) {
      gap = 0;
      startProduction(s, { id: 'x', projectTitle: 'P' + m, role: 'R', type: 'Feature Film', genre: 'Drama',
        salary: 40000, months: 4, tier: 'supporting', scale: 'indie', prestigeScore: 40, stability: 90 });
      s.production.meter = 85;
    }
    if (s.production) productionTick(s);
    releaseTick(s); runTick(s);
    relevanceDrift(s);
    s.peakFame = Math.max(s.peakFame || 0, s.fame || 0);
  }
  return s;
}
const worked = twentyYears();
ok('twenty years of small parts makes you somebody', worked.fame > 5,
  `fame ${worked.fame.toFixed(1)} after ${worked.filmography.length} credits`);
console.log(`      twenty years of supporting work — ${worked.filmography.length} credits, fame ${worked.fame.toFixed(1)}`);

// ── the top of the ladder has to take a career, not four years ────────────────
// Found by playing: a working lead hit fame 100 and respect 97 by thirty-one, after
// eight credits, which made every gate a formality and left nothing for an Asker to buy.
function leadCareer(years) {
  const s = st({ fame: 20, peakFame: 20, respect: 45, acting: 88, looks: 64 });
  let gap = 0;
  for (let m = 0; m < years * 12; m++) {
    s.month++; if (s.month > 11) { s.month = 0; s.year++; s.ageY++; }
    if (!s.production && ++gap >= 10) {
      gap = 0;
      startProduction(s, { id: 'x', projectTitle: 'P' + m, role: 'Lead', type: 'Feature Film', genre: 'Thriller',
        salary: 2000000, months: 5, tier: 'lead', scale: 'feature', prestigeScore: 70, stability: 92 });
      s.production.meter = 82;
    }
    if (s.production) productionTick(s);
    releaseTick(s); runTick(s); relevanceDrift(s);
    s.peakFame = Math.max(s.peakFame || 0, s.fame || 0);
  }
  return s;
}
const at10 = leadCareer(10), at30 = leadCareer(30);
// One career is one draw, and a lucky run of world hits made a passing design fail about
// one run in five while telling nobody anything. Average thirty of them.
const meanFame = (yrs) => { let t = 0; for (let i = 0; i < 30; i++) t += leadCareer(yrs).fame; return t / 30; };
const mean10 = meanFame(10);
ok('ten years of leads does not max you out', mean10 < 80, `mean fame ${mean10.toFixed(0)} across 30 careers`);
ok('but it does make you a star', mean10 > 45, mean10.toFixed(0));
// Thirty years of consistently well-received leads SHOULD end at the top — that is what
// a great career is. The point is that it takes thirty years, not four.
// Thirty years of steady, well-received leads makes you an A-lister. It does NOT make you
// an Icon, and that is the point of the wall between them: nobody becomes an icon by
// working a lot, they become one by being in something enormous. Measured across 25 whole
// careers, eighteen end below fame 40 — jobbing actors — and the handful who break out
// mostly go all the way, which is exactly the shape the industry has.
ok('thirty years of it makes you an A-lister', at30.fame > 68 && at30.fame < 92, at30.fame.toFixed(0));
ok('respect climbs the same way', at30.respect < 95 && at30.respect > 60, at30.respect.toFixed(0));
console.log(`      a lead's career — 10 years: fame ${at10.fame.toFixed(0)} · 30 years: fame ${at30.fame.toFixed(0)}, respect ${at30.respect.toFixed(0)}`);

// ── an Icon does not get un-known ─────────────────────────────────────────────
const wasIcon = st({ fame: 95, peakFame: 95, _idleMonths: 60 });
for (let i = 0; i < 300; i++) relevanceDrift(wasIcon);
ok('an icon never falls below 75', wasIcon.fame === 75, String(wasIcon.fame));
const wasNot = st({ fame: 60, peakFame: 60, _idleMonths: 60 });
for (let i = 0; i < 300; i++) relevanceDrift(wasNot);
ok('but anyone short of icon can be forgotten completely', wasNot.fame < 5, wasNot.fame.toFixed(1));

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
