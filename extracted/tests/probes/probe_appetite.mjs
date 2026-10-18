// Where the genre market settles with nobody playing: the world's own pictures only. Run on two
// trees to compare (Budget V2 was checked this way: fed each picture's own budget, the market
// pinned the cheap genres at the top).
//   node tests/probes/probe_appetite.mjs <path to extracted/src/> [lives] [label]
import { pathToFileURL } from 'node:url';
const P = pathToFileURL(process.argv[2]).href;
const LIVES = Number(process.argv[3] || 16), LABEL = process.argv[4] || '';
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const MK = await import(P + 'systems/meta/market.js');
const G = ['Horror', 'Comedy', 'Thriller', 'Crime', 'Sci-Fi', 'Drama', 'Romance', 'Musical'];
const seen = Object.fromEntries(G.map((g) => [g, []]));
const top = Object.fromEntries(G.map((g) => [g, 0]));
for (let k = 0; k < LIVES; k++) {
  let s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true, housing: 'flat', cash: 5e6, alive: true });
  for (let m = 0; m < 32 * 12; m++) {
    s.bigMoment = null; s.pendingArc = null;
    s = advanceMonth(s); if (!s.alive) break;
    if (m % 12 === 11 && m > 36) { let b = null, v = 0; for (const g of G) { const a = MK.appetiteFor(s, g); seen[g].push(a); if (a > v) { v = a; b = g; } } top[b]++; }
  }
}
const med = (a) => { const v = a.slice().sort((x, y) => x - y); return v[Math.floor(v.length / 2)] || 0; };
const n = Object.values(top).reduce((a, b) => a + b, 0);
console.log(`APPETITE ${LABEL} · ${LIVES} lives, yearly`);
for (const g of G) console.log(`  ${g.padEnd(9)} median ${med(seen[g]).toFixed(2)} · the hottest genre ${Math.round(top[g] / n * 100)}% of years`);
