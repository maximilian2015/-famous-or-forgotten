// A nobody on a set gets a bigger part: the paper will not let them sign until they ask
// them to hold it or walk off — and a hold can be refused, and then the part is gone.
import fs from 'fs';
import { draftContract, markClause, sendContract, contractsTick, signContract } from '../../src/systems/career/contract.js';
import { startProduction, sets } from '../../src/systems/career/production.js';
import { ensureWorld } from '../../src/systems/world/world.js';
const base = JSON.parse(fs.readFileSync(new URL('../../dist/_save.json', import.meta.url), 'utf8'));
const tally = { must: 0, held: 0, gone: 0, walked: 0, signedWait: 0 };
for (let i = 0; i < 120; i++) {
  const s = JSON.parse(JSON.stringify(base)); ensureWorld(s);
  s.production = null; s.productions = []; s.respect = 5; s.offers = []; s.moments = []; s.illness = null; s.burnout = null;
  startProduction(s, { id: 'oA', projectTitle: 'Small Hours', role: 'Lead', type: 'Feature Film', genre: 'Drama', salary: 60000, months: 3 + (i % 5), tier: 'lead', scale: 'indie', prestigeScore: 40, stability: 90 });
  const o = { id: 'oB', projectTitle: 'The Big One', role: 'Lead', type: 'Feature Film', genre: 'Thriller', salary: 400000, months: 5, tier: 'lead', scale: 'feature', prestigeScore: 60, stability: 90, deadline: 3, via: 'agent' };
  s.offers.push(o);
  const k = draftContract(s, o);
  const sched = k.clauses.find((c) => c.id === 'schedule');
  if (!sched.must) throw new Error('schedule should be a must');
  tally.must++;
  signContract(s, 'oB'); if (o.signed) throw new Error('signed without asking');
  const walk = i % 3 === 0 && sched.options.some((x) => x.id === 'walk');
  markClause(s, 'oB', 'schedule', walk ? 'walk' : 'hold');
  sendContract(s, 'oB');
  s.month += 1; if (s.month > 11) { s.month = 0; s.year += 1; }
  contractsTick(s);
  if (!s.offers.some((x) => x.id === 'oB')) { tally.gone++; continue; }
  signContract(s, 'oB');
  if (!o.signed) throw new Error('could not sign after an agreed hold: ' + s.lastEvent);
  if (walk) { tally.walked++; if (sets(s).some((p) => p.title === 'Small Hours')) throw new Error('did not walk off'); if (!sets(s).some((p) => p.title === 'The Big One')) throw new Error('walk did not start the new set'); }
  else { tally.held++; if (!o.waitsForWrap) throw new Error('hold should wait for the wrap'); tally.signedWait++; }
}
console.log(JSON.stringify(tally));
