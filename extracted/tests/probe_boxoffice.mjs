// Not a test — a measuring stick. What the four stages actually do to the pictures this GAME
// makes, as opposed to the ones the prototype invented. The prototype gave every film a co-star
// and thirty to eighty points of hype; most films here have neither, so the demand scale needed
// to be read off the real thing before any constant could be trusted.
//
//   node tests/probe_boxoffice.mjs
import { demandFor, openingFor, legsFor, expansionFor, breakEvenFor, boxOfficeFor, verdictOf,
  campaignOf, studioCampaign } from '../src/systems/career/release.js';
import { audienceFor } from '../src/systems/career/release.js';
import { marketOf, appetiteFor, GENRES } from '../src/systems/meta/market.js';

const m = (n) => (n >= 1e9 ? '€' + (n / 1e9).toFixed(2) + 'bn' : '€' + Math.round(n / 1e6) + 'm');
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const med = (xs) => { const v = xs.slice().sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };

// The market is PINNED to ordinary here, and that matters. An aged market gives each genre an
// appetite somewhere between 0.6 and 1.3, redrawn every run - so the same profile swung from 0.47
// to 1.28 across three readings while I was changing constants by a few per cent. Most of that was
// the market lottery, not the model. Calibrate against a neutral market; measure the market on its
// own, below.
function state(over = {}, appetite = 1) {
  const s = { year: 2030, month: 5, fame: 40, respect: 40, media: 0, cash: 100000,
    filmography: [], labels: {}, ...over };
  const m = marketOf(s);
  for (const g of GENRES) { m.trend[g] = appetite; m.glut[g] = 0; }
  return s;
}

// The profiles a real career actually passes through.
const CASES = [
  ['unknown · small indie, great script', { fame: 8, media: 0 }, { scale: 'indie', rating: 86, genre: 'Drama' }],
  ['unknown · indie, ordinary', { fame: 8, media: 0 }, { scale: 'indie', rating: 58, genre: 'Drama' }],
  ['rising · feature, good', { fame: 42, media: 14 }, { scale: 'feature', rating: 74, genre: 'Thriller' }],
  ['known · feature, very good', { fame: 70, media: 20 }, { scale: 'feature', rating: 88, genre: 'Drama' }],
  ['known · horror feature, ordinary', { fame: 70, media: 20 }, { scale: 'feature', rating: 62, genre: 'Horror' }],
  ['star · blockbuster, good', { fame: 88, media: 45 }, { scale: 'blockbuster', rating: 76, genre: 'Sci-Fi' }],
  ['star · blockbuster, bad', { fame: 88, media: 45 }, { scale: 'blockbuster', rating: 38, genre: 'Sci-Fi' }],
  ['icon · blockbuster w/ co-star', { fame: 95, media: 60 }, { scale: 'blockbuster', rating: 72, genre: 'Sci-Fi', withFame: 80 }],
  ['star · prestige drama', { fame: 80, media: 30 }, { scale: 'indie', rating: 92, genre: 'Drama' }],
];

console.log('WHAT THE GAME ACTUALLY MAKES — 2,000 runs each, through the real functions.\n');
console.log('  profile                            demand  opening   crowd  run   final     needs    ratio  verdict');
for (const [label, over, base] of CASES) {
  const D = [], O = [], L = [], G = [], C = [], RT = [];
  const t = {};
  let need = 0;
  const s = state(over);                       // one aged market per profile, not two thousand
  for (let i = 0; i < 2000; i++) {
    // Quality VARIES, the way production.js varies it. Holding the rating fixed was the probe
    // lying to me: a profile pinned at 92 is a smash every single time, and reading that 100% as
    // a property of the model rather than of the measuring stick sent me tuning the wrong knob.
    const rating = Math.max(8, Math.min(96, Math.round(base.rating + (Math.random() + Math.random() - 1) * 16)));
    const rel = { ...base, rating, part: 1, campaignTier: studioCampaign(base.scale) };
    rel.reception = audienceFor(s, rel);
    const box = boxOfficeFor(s, rel);
    D.push(rel._demand); O.push(rel._opening); L.push(rel._legs); C.push(rel.reception);
    G.push(box); RT.push(rel.ratio = box / (rel._breakEven || 1)); need = rel._breakEven;
    const v = verdictOf({ ...rel, boxOffice: box });
    t[v] = (t[v] || 0) + 1;
  }
  const top = Object.entries(t).sort((a, b) => b[1] - a[1]);
  console.log('  ' + label.padEnd(34)
    + String(med(D)).padStart(5)
    + m(med(O) * 1e6).padStart(9)
    + String(Math.round(avg(C))).padStart(7)
    + med(L).toFixed(1).padStart(6) + 'x'
    + m(med(G)).padStart(9)
    + m(need).padStart(9) + ('  x' + med(RT).toFixed(2)).padStart(8) + '  '
    + top.map(([k, v]) => k + ' ' + Math.round(v / 20) + '%').join(', '));
}


// ── and now the market on its own ─────────────────────────────────────────────
// The same picture into a dead genre, an ordinary one and a genre everybody wants. This is the
// swing the old calendar could not express at all: it handed out a flat 1.25 and took it away
// again a month later, with no memory and nothing anybody did able to move it.
console.log('');
console.log('THE SAME FILM INTO A DEAD GENRE, AN ORDINARY ONE, AND A FASHIONABLE ONE');
console.log('  (a €90m thriller rated 7.6, by an actor at 60 points of fame)');
for (const [word, ap] of [['dead       ', 0.62], ['gone quiet ', 0.82], ['ordinary   ', 1.0], ['on the rise', 1.2], ['everybody  ', 1.4]]) {
  const s = state({ fame: 60, media: 18 }, ap);
  const G = [], D = [], t = {};
  for (let i = 0; i < 3000; i++) {
    const rel = { scale: 'feature', rating: 76, genre: 'Thriller', part: 1, campaignTier: 'major' };
    rel.reception = audienceFor(s, rel);
    const box = boxOfficeFor(s, rel);
    D.push(rel._demand); G.push(box);
    const v = verdictOf({ ...rel, boxOffice: box }); t[v] = (t[v] || 0) + 1;
  }
  console.log('  ' + word + '  appetite ' + appetiteFor(s, 'Thriller').toFixed(2)
    + '  demand ' + String(med(D)).padStart(3)
    + '  final ' + m(med(G)).padStart(8)
    + '   ' + Object.entries(t).sort((x, y) => y[1] - x[1]).map(([k, v]) => k + ' ' + Math.round(v / 30) + '%').join(', '));
}
