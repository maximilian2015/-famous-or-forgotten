// The mean of what the world's pictures report to the genre market, by scale: how release.js PAR
// was set. Run "base" on a tree from before Budget V2 and "v2" on this one; the two should match.
//   node tests/probes/probe_market_par.mjs <path to extracted/src/> base|v2
import { pathToFileURL } from 'node:url';
const P = pathToFileURL(process.argv[2]).href, MODE = process.argv[3];
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const WD = await import(P + 'systems/world/world.js');
const MK = await import(P + 'systems/meta/market.js');
const R = await import(P + 'systems/career/release.js');
const B = { small: 1, festival: 1.5, indie: 12, feature: 90, blockbuster: 220 };
const sum = {}, n = {};
for (let life = 0; life < 30; life++) {
  const s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true }); beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0 });
  WD.ensureWorld(s);
  const actors = WD.activeActors(s); const saved = JSON.stringify(s.market || null);
  for (let i = 0; i < 300; i++) {
    const f = WD.makeWorldFilm(s, actors[Math.floor(Math.random() * actors.length)], s.year, new Set()); s.market = JSON.parse(saved);
    const reach = MODE === 'v2' ? R.reachOf({ scale: f.scale, budget: f.budget }) : 1;
    const x = f.gross / (((MODE === 'v2' && R.PAR) ? R.PAR : B)[f.scale] * 1.5e6 * reach);
    sum[f.scale] = (sum[f.scale] || 0) + x; n[f.scale] = (n[f.scale] || 0) + 1;
  }
}
console.log(MODE, Object.keys(sum).map((k) => `${k} ${(sum[k] / n[k]).toFixed(3)} (n ${n[k]})`).join(' · '));
