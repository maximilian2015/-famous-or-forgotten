// The three things a relayed note asked to be verified rather than asserted, plus the long-lived
// market run reported as distributions and not as hand-picked examples.
//
//   node tests/probe_market.mjs
import { marketOf, marketYear, marketAfterRelease, appetiteFor, genreShare, totalDemand,
  totalWord, fatigueOf, exposureOf, ageMarket, GENRES } from '../src/systems/meta/market.js';
import { boxOfficeFor, audienceFor, verdictOf, studioCampaign }
  from '../src/systems/career/release.js';
import { castingExpectation, roleAcceptance } from '../src/systems/meta/typecast.js';

const m = (n) => (n >= 1e9 ? '€' + (n / 1e9).toFixed(2) + 'bn' : '€' + Math.round(n / 1e6) + 'm');
const q = (a, p) => { const v = a.slice().sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(v.length * p))]; };
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// ── 1. does a save made before any of this existed still work ────────────────
console.log('1. A SAVE FROM BEFORE THE MARKET EXISTED');
const old = { year: 2034, month: 7, fame: 62, respect: 48, media: 25, acting: 71,
  filmography: [{ title: 'Small Wedding', rating: 74, year: 2032, scale: 'feature', genre: 'Drama' }],
  labels: {}, releases: [], offers: [] };          // no `market` key at all, like every save until today
let threw = null;
try {
  const rel = { scale: 'feature', rating: 79, genre: 'Drama', part: 1 };
  rel.reception = audienceFor(old, rel);
  const box = boxOfficeFor(old, rel);
  console.log('   market built on demand: ' + !!old.market
    + ' · total ' + totalDemand(old).toFixed(2)
    + ' · ' + m(box) + ' against ' + m(rel._breakEven) + ' → ' + verdictOf({ ...rel, boxOffice: box }));
} catch (e) { threw = e; console.log('   THREW: ' + e.message); }
console.log('   ' + (threw ? 'BROKEN' : 'loads and plays') + '\n');

// ── 2. the two fits, which used to be one number ─────────────────────────────
console.log('2. THE CASTING THEY QUESTIONED, AND WHAT THEY MADE OF IT AFTERWARDS');
console.log('   A comic actor (labelled comedy) taking a Crime picture. Same label, same part,');
console.log('   different outcomes — because the second question is settled by whether it landed.\n');
// The labels live in s.typecast.scores and a genre one is 'g:Comedy' - passing `labels` gave an
// empty active list, so typeFit returned 0 for every row and the whole table read as 'no effect'.
const comic = (over) => ({ year: 2034, month: 5, fame: 58, media: 20, acting: 70,
  typecast: { scores: { 'g:Comedy': 8 }, active: ['g:Comedy'], primary: 'g:Comedy' },
  filmography: [], ...over });
console.log('   before release                                       after it');
for (const [label, rating, acting] of [['he was extraordinary ', 90, 84], ['competent            ', 68, 68],
  ['they never believed it', 42, 52]]) {
  const s = comic({ acting });
  const c = { genre: 'Crime', scale: 'feature', type: 'Feature Film', rating };
  console.log('   ' + label + '  casting expectation ' + castingExpectation(s, c).toFixed(2).padStart(5)
    + '     role acceptance ' + roleAcceptance(s, c).toFixed(2).padStart(5)
    + '  (' + (roleAcceptance(s, c) * 7).toFixed(0) + ' pts of crowd)');
}
const unknown = comic({ fame: 6, media: 0 });
const famous = comic({ fame: 92, media: 70 });
const cc = { genre: 'Crime', scale: 'feature', type: 'Feature Film', rating: 70 };
console.log('\n   the same odd casting, unknown vs famous — the question itself sells tickets:');
console.log('     unknown  expectation ' + castingExpectation(unknown, cc).toFixed(2)
  + '     famous  expectation ' + castingExpectation(famous, cc).toFixed(2) + '\n');

// ── 3. saturation is exposure, not a count of films ──────────────────────────
console.log('3. SATURATION IS WHAT PEOPLE SAW, NOT HOW MANY FILMS THERE WERE');
const tiny = 7 * exposureOf('indie', 0.15, 1);
const huge = 4 * exposureOf('blockbuster', 0.75, 4);
console.log('   seven tiny independent pictures, barely sold:        ' + tiny.toFixed(1));
console.log('   four enormous fourth instalments, sold as events:    ' + huge.toFixed(1));
console.log('   ratio ' + (huge / tiny).toFixed(1) + 'x — counted as releases they were 0.6x\n');

// ── 4. twenty-five years, reported as distributions ──────────────────────────
console.log('4. TWENTY-FIVE YEARS x 40 WORLDS. Distributions, not examples.');
const apps = [], totals = [], fats = [];
const glutChange = [], leanChange = [];
for (let w = 0; w < 40; w++) {
  const s = { year: 2030, month: 0 };
  marketOf(s);
  const hist = [];
  for (let y = 0; y < 25; y++) {
    const wts = GENRES.map((g) => Math.pow(appetiteFor(s, g), 3.5));
    const tot = wts.reduce((a, b) => a + b, 0) || 1;
    const made = {}; for (const g of GENRES) made[g] = 0;
    // BEFORE this year's pictures land on it, or the reading is of the recovery and not the slump.
    const appBefore = Object.fromEntries(GENRES.map((g) => [g, appetiteFor(s, g)]));
    for (let i = 0; i < 22; i++) {
      let r = Math.random() * tot, g = GENRES[0];
      for (let j = 0; j < GENRES.length; j++) { r -= wts[j]; if (r <= 0) { g = GENRES[j]; break; } }
      made[g]++;
      const scale = Math.random() < 0.25 ? 'blockbuster' : Math.random() < 0.45 ? 'feature' : 'indie';
      const share = scale === 'blockbuster' ? 0.75 : scale === 'feature' ? 0.55 : 0.35;
      marketAfterRelease(s, g, scale, appetiteFor(s, g) * (0.6 + Math.random() * 0.9), share, 1);
    }

    hist.push({ made, app: appBefore });
    for (const g of GENRES) { apps.push(appetiteFor(s, g)); fats.push(fatigueOf(s, g)); }
    totals.push(totalDemand(s));
    marketYear(s);
  }
  const AVG = 22 / GENRES.length;
  for (const g of GENRES) {
    for (let i = 0; i < hist.length - 2; i++) {
      const now = hist[i].app[g];
      const then = Math.min(hist[i + 1].app[g], hist[i + 2].app[g]);
      const ch = (then - now) / now;
      if (hist[i].made[g] >= AVG * 1.8) glutChange.push(ch);
      else if (hist[i].made[g] <= AVG * 0.4) leanChange.push(ch);
    }
  }
}
console.log('   genre appetite   5% ' + q(apps, 0.05).toFixed(2) + '  median ' + q(apps, 0.5).toFixed(2)
  + '  95% ' + q(apps, 0.95).toFixed(2) + '  max ' + q(apps, 0.999).toFixed(2));
console.log('   total cinema     5% ' + q(totals, 0.05).toFixed(2) + '  median ' + q(totals, 0.5).toFixed(2)
  + '  95% ' + q(totals, 0.95).toFixed(2) + '   (its own number now, not pinned to 1.00)');
console.log('   fatigue          median ' + q(fats, 0.5).toFixed(2) + '  95% ' + q(fats, 0.95).toFixed(2));
console.log('   after a GLUT year (' + glutChange.length + ' cases): appetite moved '
  + (mean(glutChange) * 100).toFixed(1) + '% over two years, fell in '
  + Math.round(glutChange.filter((x) => x < -0.05).length / glutChange.length * 100) + '%');
console.log('   after a LEAN year (' + leanChange.length + ' cases): appetite moved '
  + (mean(leanChange) * 100).toFixed(1) + '% over two years, fell in '
  + Math.round(leanChange.filter((x) => x < -0.05).length / leanChange.length * 100) + '%');
console.log('   the gap: ' + ((mean(leanChange) - mean(glutChange)) * 100).toFixed(1) + ' points of appetite\n');

// ── 5. can an exceptional film still break out of a dead, glutted genre ──────
console.log('5. CAN AN EXCEPTIONAL PICTURE STILL BREAK OUT OF A GENRE NOBODY WANTS?');
console.log('   Horror driven into the ground: appetite floored, saturation at its ceiling.');
const dead = { year: 2034, month: 9, fame: 30, media: 10, acting: 70, labels: {}, filmography: [] };
marketOf(dead);
for (const g of GENRES) dead.market.trend[g] = 1;
dead.market.trend.Horror = 0.55;
for (let i = 0; i < 26; i++) marketAfterRelease(dead, 'Horror', 'feature', 0.5, 0.55, 1);
dead.market.total = 0.9;
console.log('   Horror appetite ' + appetiteFor(dead, 'Horror').toFixed(2)
  + ' · share ' + genreShare(dead, 'Horror').toFixed(2)
  + ' · fatigue ' + fatigueOf(dead, 'Horror').toFixed(2)
  + ' · ' + totalWord(dead) + '\n');
for (const [label, rating] of [['an ordinary horror film  ', 58], ['a good one               ', 76],
  ['an exceptional one       ', 93]]) {
  const G = [], t = {};
  for (let i = 0; i < 4000; i++) {
    const rel = { scale: 'indie', rating, genre: 'Horror', part: 1, campaignTier: studioCampaign('indie') };
    rel.reception = audienceFor(dead, rel);
    const box = boxOfficeFor(dead, rel);
    G.push(box);
    const v = verdictOf({ ...rel, boxOffice: box }); t[v] = (t[v] || 0) + 1;
  }
  console.log('   ' + label + ' median ' + m(q(G, 0.5)).padStart(7) + '  best 1% ' + m(q(G, 0.99)).padStart(7)
    + '   ' + Object.entries(t).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + Math.round(v / 40) + '%').join(', '));
}
console.log('\n   A dead genre is a headwind, not a verdict: quality and word of mouth can still');
console.log('   beat the trend, which is the whole point of keeping them separate.');
