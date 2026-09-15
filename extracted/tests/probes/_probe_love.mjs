import { createInitialState } from '../../src/state/initialState.js';
import { beginLife } from '../../src/systems/life/origin.js';
import { advanceMonth } from '../../src/engine/time.js';
import * as L from '../../src/systems/life/dating.js';
import * as C from '../../src/systems/life/children.js';
let s = createInitialState({ name: 'P', dream: 'actor', created: true, gender: 'female' }); beginLife(s);
Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true, housing: 'flat', cash: 900000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, fame: 30 });
const log = [];
for (let m = 0; m < 48; m++) {
  s.bigMoment = null; s.moments = []; s.ap = 100;
  if (!s.partner && !C.spouseOf(s)) { L.refreshDatingPool(s); const who = (s.datingPool || [])[0]; if (who) { L.goOnDate(s, 'dinner', who.id); log.push(`m${m} date ${who.name}: ${s.lastEvent}`); } else log.push(`m${m} nobody in pool`); }
  else if (s.partner) { const p = s.partner; L.goOnDate(s, 'dinner', p.id); log.push(`m${m} partner ${p.name} rel ${Math.round(p.relationship)}: ${s.lastEvent}`);
    if (L.canMoveIn(s) && !p.livingTogether) { L.moveInTogether(s); log.push('  movein: ' + s.lastEvent); }
    if ((p.relationship || 0) >= L.PROPOSE_AT) { L.proposeMarriage(s, 'proper', false); log.push('  propose: ' + s.lastEvent); } }
  else { const sp = C.spouseOf(s); log.push(`m${m} married to ${sp.name} rel ${Math.round(sp.relationship)}`); C.tryForBaby(s); log.push('  baby: ' + s.lastEvent); if (s.family.some((f) => f.relation === 'Child')) break; }
  s = advanceMonth(s);
}
console.log(log.join('\n'));
console.log('END: partner', !!s.partner, 'spouse', !!C.spouseOf(s), 'kids', s.family.filter((f) => f.relation === 'Child').length);
