// What the world's directors become over a lifetime, with nobody in it but them.
// node tests/probes/probe_directors.mjs [worlds] [years]
//
// Asked on 15 Nov for random events no. 1 (the director who remembered): world/directors.js
// creditDirector was never called, so a director's standing moved only by a yearly drift that,
// with `films` always 0, was a point down a year on average. A first-timer could not become a name
// by making good films, because nothing counted their films. This counts: the bands at 0, 20, 40
// and 60 years, how often a first-timer becomes a name (62+) within nine years, and how often one
// of them reaches the five.
import { ensureDirectors, directorsYear, workingDirectors, theFive } from '../../src/systems/world/directors.js';

const worlds = +(process.argv[2] || 40), years = +(process.argv[3] || 60);
const at = [0, 20, 40, 60].filter((y) => y <= years);
const bands = Object.fromEntries(at.map((y) => [y, { great: 0, strong: 0, working: 0, new: 0, alive: 0, top5: 0 }]));
let newcomers = 0, madeIt = 0, fiveOf = 0;
for (let w = 0; w < worlds; w++) {
  const s = { year: 2030, world: {} };
  ensureDirectors(s);
  const firstSeen = {};
  for (let y = 0; y <= years; y++) {
    if (y) { s.year++; directorsYear(s); }
    for (const d of workingDirectors(s)) if (firstSeen[d.id] == null && d.band === 'new') { firstSeen[d.id] = { y, best: d.standing, five: false }; if (y) newcomers++; }
    for (const d of workingDirectors(s)) { const f = firstSeen[d.id]; if (f && y - f.y <= 9) f.best = Math.max(f.best, d.standing); }
    for (const d of theFive(s)) { const f = firstSeen[d.id]; if (f && f.y && !f.five) { f.five = true; fiveOf++; } }
    if (bands[y]) { const b = bands[y]; for (const d of workingDirectors(s)) { b[d.band]++; b.alive++; } b.top5 += theFive(s).reduce((n, d) => n + d.standing, 0) / 5; }
  }
  for (const f of Object.values(firstSeen)) if (f.y && f.best >= 62) madeIt++;
}
console.log(`${worlds} worlds, ${years} years`);
for (const y of at) { const b = bands[y]; console.log(`  year ${String(y).padStart(2)}: working ${(b.alive / worlds).toFixed(1)} · great ${(b.great / worlds).toFixed(1)} strong ${(b.strong / worlds).toFixed(1)} working ${(b.working / worlds).toFixed(1)} new ${(b.new / worlds).toFixed(1)} · the five average ${(b.top5 / worlds).toFixed(0)}`); }
console.log(`  first-timers who became a name within nine years: ${madeIt} of ${newcomers} (${(100 * madeIt / Math.max(1, newcomers)).toFixed(0)}%)`);
console.log(`  first-timers who ever reached the five: ${fiveOf} (${(fiveOf / worlds).toFixed(2)} a world)`);
