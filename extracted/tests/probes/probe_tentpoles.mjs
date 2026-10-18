// The Billion Club as a controlled regression: the same tentpoles, run many thousands of times, on
// two trees. Career runs are too coarse for it — about two hundred tentpoles in forty careers,
// clustered in a handful of star careers, and the same code gave 31% to 41% past a billion from
// one run to the next (the genre audit, 18 Oct 2026).
//
// A star's tentpole: fame 85, hype 25, rated 6.5 to 9.0, the campaign the studio would give it,
// a budget of its own, opening into the market as it stands for a tentpole in lives with nobody
// playing (each draw takes one real year's appetite for its genre).
//   node tests/probes/probe_tentpoles.mjs <path to extracted/src/> [lives] [label]
import { pathToFileURL } from 'node:url';
const P = pathToFileURL(process.argv[2]).href;
const LIVES = Number(process.argv[3] || 10), LABEL = process.argv[4] || '';
const R = await import(P + 'systems/career/release.js');
const BG = await import(P + 'systems/career/budget.js').catch(() => null);
const MK = await import(P + 'systems/meta/market.js');
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const G = ['Horror', 'Comedy', 'Thriller', 'Sci-Fi', 'Crime', 'Romance', 'Musical', 'Drama'];
const years = Object.fromEntries(G.map((g) => [g, []]));
for (let k = 0; k < LIVES; k++) {
  let s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true, housing: 'flat', cash: 5e6, alive: true });
  for (let m = 0; m < 32 * 12; m++) {
    s.bigMoment = null; s.pendingArc = null;
    s = advanceMonth(s); if (!s.alive) break;
    if (m % 12 === 11 && m > 36) for (const g of G) years[g].push(MK.appetiteFor(s, g, 'blockbuster'));
  }
}
const N = 6000;
const all = [], by = Object.fromEntries(G.map((g) => [g, []]));
for (const g of G) for (let i = 0; i < N; i++) {
  const rating = 65 + Math.random() * 25;
  const budget = BG ? BG.planBudget({ seed: 'tp' + g + i, genre: g, scale: 'blockbuster' }).budget : 220;
  const appetite = years[g][Math.floor(Math.random() * years[g].length)];
  const s = { fame: 85, month: Math.floor(Math.random() * 12), media: 25, typecast: { scores: {}, active: [] }, acting: 70 };
  const rel = { scale: 'blockbuster', genre: g, rating, budget, campaignTier: R.studioCampaign('blockbuster'), part: 1, appealMod: 1, withFame: 0 };
  const demand = R.demandCore({ scale: 'blockbuster', genre: g, cast: [85, 0], appetite, campaignTier: rel.campaignTier, budget, buzz: 25 });
  rel.reception = R.audienceFor(s, rel);
  const gross = R.openingFor(s, rel, demand) * R.legsFor(rel) * R.expansionFor(rel) * 1e6;
  all.push(gross); by[g].push(gross);
}
const q = (a, p) => { const v = a.slice().sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(v.length * p))]; };
const bn = (a) => Math.round(a.filter((x) => x >= 1e9).length / a.length * 1000) / 10;
const M = (x) => '€' + Math.round(x / 1e6) + 'm';
console.log(`TENTPOLES ${LABEL} · ${G.length * N} draws · market from ${LIVES} lives`);
console.log(`  all: median ${M(q(all, 0.5))} · p90 ${M(q(all, 0.9))} · past €1bn ${bn(all)}%`);
for (const g of G) console.log(`  ${g.padEnd(9)} appetite med ${q(years[g], 0.5).toFixed(2)} · median ${M(q(by[g], 0.5))} · past €1bn ${bn(by[g])}%`);
