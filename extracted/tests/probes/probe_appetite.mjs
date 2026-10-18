// Where the genre market settles with nobody playing: the world's own pictures only, read once a
// year. Run on two trees to compare (Budget V2 was checked this way: fed each picture's own
// budget, the market pinned the cheap genres at the top). Also says whether there are CYCLES —
// how many years a genre is hot or cold, how long its longest hot spell lasts — and prints one
// life's market decade by decade, because a median can hide a genre that never moves.
// A fourth argument reads the market a picture of that scale opens into (tentpoles still read the
// old track for now: 'blockbuster').
//   node tests/probes/probe_appetite.mjs <path to extracted/src/> [lives] [label] [scale]
import { pathToFileURL } from 'node:url';
const P = pathToFileURL(process.argv[2]).href;
const LIVES = Number(process.argv[3] || 16), LABEL = process.argv[4] || '', SCALE = process.argv[5] || undefined;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const MK = await import(P + 'systems/meta/market.js');
const G = ['Horror', 'Comedy', 'Thriller', 'Crime', 'Sci-Fi', 'Drama', 'Romance', 'Musical'];
const HOT = 1.2, COLD = 0.8;
const seen = Object.fromEntries(G.map((g) => [g, []]));
const top = Object.fromEntries(G.map((g) => [g, 0]));
const streak = Object.fromEntries(G.map((g) => [g, []]));
const story = [];
for (let k = 0; k < LIVES; k++) {
  let s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true, housing: 'flat', cash: 5e6, alive: true });
  const run = Object.fromEntries(G.map((g) => [g, 0])), best = Object.fromEntries(G.map((g) => [g, 0]));
  for (let m = 0; m < 40 * 12; m++) {
    s.bigMoment = null; s.pendingArc = null;
    s = advanceMonth(s); if (!s.alive) break;
    if (m % 12 === 11 && m > 36) {
      let b = null, v = 0;
      for (const g of G) {
        const a = MK.appetiteFor(s, g, SCALE); seen[g].push(a); if (a > v) { v = a; b = g; }
        run[g] = a >= HOT ? run[g] + 1 : 0; best[g] = Math.max(best[g], run[g]);
      }
      top[b]++;
      if (k === 0 && (m + 1) % 48 === 0) story.push(`${s.year}: ` + G.map((g) => [g, MK.appetiteFor(s, g, SCALE)]).sort((x, y) => y[1] - x[1]).map(([g, a]) => `${g} ${a.toFixed(2)}`).join(' · '));
    }
  }
  for (const g of G) streak[g].push(best[g]);
}
const q = (a, p) => { const v = a.slice().sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(v.length * p))] || 0; };
const n = Object.values(top).reduce((a, b) => a + b, 0);
const pct = (a, f) => Math.round(a.filter(f).length / a.length * 100);
console.log(`APPETITE ${LABEL} · ${LIVES} lives × 40 years, read yearly · hot ≥ ${HOT}, cold ≤ ${COLD}`);
for (const g of G) console.log(`  ${g.padEnd(9)} median ${q(seen[g], 0.5).toFixed(2)} (p10 ${q(seen[g], 0.1).toFixed(2)} · p90 ${q(seen[g], 0.9).toFixed(2)}) · hot ${String(pct(seen[g], (x) => x >= HOT)).padStart(2)}% of years · cold ${String(pct(seen[g], (x) => x <= COLD)).padStart(2)}% · hottest genre ${String(Math.round(top[g] / n * 100)).padStart(2)}% · longest hot spell, median life ${q(streak[g], 0.5)}y (worst ${Math.max(...streak[g])}y)`);
console.log('\n  one life, every four years, hottest first:');
for (const l of story) console.log('   ' + l);
