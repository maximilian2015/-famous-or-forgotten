// Three sets at once: the month's energy shrinks, strain climbs, every set ticks and
// wraps on its own, and the calendar/first-set alias stays honest through a reload.
import fs from 'fs';
import { advanceMonth } from '../../src/engine/time.js';
import { startProduction, productionTick, rehearse } from '../../src/systems/career/production.js';
import { sets, canTakeSet, slotsFree } from '../../src/engine/sets.js';
import { ensureWorld } from '../../src/systems/world/world.js';

const base = JSON.parse(fs.readFileSync(new URL('../../dist/_save.json', import.meta.url), 'utf8'));
const s = JSON.parse(JSON.stringify(base)); ensureWorld(s);
s.production = null; s.productions = []; s.respect = 60; s.illness = null; s.burnout = null; s.strain = 10;
const offer = (t, months, scale) => ({ id: 'o' + t, projectTitle: t, role: 'Lead', type: 'Feature Film', genre: 'Drama', salary: 300000, months, tier: 'lead', scale, prestigeScore: 55, stability: 90 });
console.log('free before', slotsFree(s), canTakeSet(s, offer('x', 3, 'feature')));
startProduction(s, offer('Alpha', 3, 'feature'));
console.log('after 1:', sets(s).length, canTakeSet(s, offer('x', 3, 'feature')));
startProduction(s, offer('Beta', 5, 'feature'));
startProduction(s, offer('Gamma', 2, 'indie'));
console.log('after 3:', sets(s).map((p) => p.title), 'free', slotsFree(s), canTakeSet(s, offer('x', 3, 'feature')).why);
console.log('production alias =', s.production && s.production.title, '| strain', s.strain);
for (const p of sets(s)) p.take = 'straight';
// a reload
let r = JSON.parse(JSON.stringify(s));
console.log('after reload alias ok:', sets(r)[0] === r.production, 'count', sets(r).length);
// live months
const log = [];
for (let i = 0; i < 7; i++) {
  rehearse(r, sets(r)[1] && sets(r)[1].id);
  r = advanceMonth(r);
  log.push({ m: i + 1, sets: sets(r).map((p) => `${p.title}:${p.monthsLeft}`).join(' '), energy: r.apMaxEff, strain: Math.round(r.strain), alias: r.production && r.production.title, releases: (r.releases || []).length });
}
console.table(log);
if (sets(r).length !== 0) throw new Error('sets did not all wrap: ' + sets(r).map((p) => p.title));
if (r.production) throw new Error('alias not cleared');
console.log('all three wrapped, releases scheduled:', (r.releases || []).map((x) => x.title).join(', '));
