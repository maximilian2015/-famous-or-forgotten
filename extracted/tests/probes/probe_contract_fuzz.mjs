// The paper, fuzzed. Sixty lives, thirty years, every offer taken through the contract
// room the way a player does — open it, tick or send back at random, sign when they let
// you — with the invariants the deal promises: nothing shoots without a free set, no set
// beyond three, a nobody never on two long shoots, a held part carries a date, salaries
// are numbers, and the month's energy stays on its scale.
import fs from 'fs';
import { ensureWorld } from '../../src/systems/world/world.js';
import { advanceMonth } from '../../src/engine/time.js';
import { refreshCastingPool, auditionFor } from '../../src/systems/career/castings.js';
import { openContract, markClause, sendContract, signContract, passContract, draftContract } from '../../src/systems/career/contract.js';
import { sets, isShort, SET_RESPECT, MAX_SETS } from '../../src/engine/sets.js';
import { pushTake } from '../../src/systems/career/story.js';

const base = JSON.parse(fs.readFileSync(new URL('../../dist/_save.json', import.meta.url), 'utf8'));
const problems = [];
const counts = { drafted: 0, sent: 0, signed: 0, held: 0, walked: 0, passed: 0, started: 0, refused: 0, recast: 0 };
const num = (v) => typeof v === 'number' && Number.isFinite(v);
for (let i = 0; i < 60; i++) {
  let s = JSON.parse(JSON.stringify(base)); ensureWorld(s);
  Object.assign(s, { production: null, productions: [], offers: [], bigMoment: null, moments: [], cash: 200000, fame: 5 + (i % 6) * 14, respect: (i % 4) * 18 - 5 });
  let prevLong = 0;
  for (let m = 0; m < 360; m++) {
    s.bigMoment = null; s.moments = []; s.night = null; s.pendingArc = null; s.openContract = null;
    try {
      for (const p of sets(s)) if (!p.take) pushTake(s, 'straight');
      refreshCastingPool(s);
      if ((s.castingPool || []).length && Math.random() < 0.7) { const c = s.castingPool[Math.floor(Math.random() * s.castingPool.length)]; auditionFor(s, c.id, 40 + Math.random() * 60); }
      for (const o of [...(s.offers || [])]) {
        if (o.kind === 'renewal' && Math.random() < 0.3) continue;
        const k = draftContract(s, o); counts.drafted++;
        if (k.sent) continue;
        const r = Math.random();
        if (r < 0.15) { passContract(s, o.id); counts.passed++; continue; }
        const sched = k.clauses.find((c) => c.id === 'schedule');
        // the deal: on a set with no room, ask them to hold it or walk; otherwise tick at random
        if (sched && sched.must && sched.result !== 'agreed') {
          const op = sched.options[Math.floor(Math.random() * sched.options.length)];
          if (op) { markClause(s, o.id, 'schedule', op.id); sendContract(s, o.id); counts.sent++; if (op.id === 'walk') counts.walked++; }
          continue;
        }
        if (r < 0.45) { const c = k.clauses.filter((x) => x.options && x.options.length && x.stance !== 'talk')[0]; if (c) { markClause(s, o.id, c.id, c.options[0].id); sendContract(s, o.id); counts.sent++; continue; } }
        const wasSets = sets(s).length, wasSigned = !!o.signed;
        signContract(s, o.id);
        if (o.signed && !wasSigned) { counts.signed++; if (o.waitsForWrap) counts.held++; }
        else if (!o.signed && (s.offers || []).some((x) => x.id === o.id)) counts.refused++;
        if (sets(s).length > wasSets) counts.started++;
      }
      s = advanceMonth(s);
    } catch (e) { problems.push(`life ${i} month ${m} THREW: ${e.stack.split('\n').slice(0, 2).join(' / ')}`); break; }
    // invariants
    const all = sets(s);
    if (all.length > MAX_SETS) { problems.push(`life ${i} month ${m}: ${all.length} sets`); break; }
    const long = all.filter((p) => !isShort(p)).length;
    const need = SET_RESPECT[Math.max(0, long - 1)] || 0;
    // a set already on stays on when standing slips; the rule bites when a long set STARTS
    if (long > prevLong && long > 1 && (s.respect || 0) < need - 6 && !all.some((p) => p.exclusive)) { problems.push(`life ${i} month ${m}: a ${long}th long set started at respect ${Math.round(s.respect)} (needs ${need})`); break; }
    prevLong = long;
    if (all.some((p) => p.exclusive) && all.length > 1) { problems.push(`life ${i} month ${m}: an exclusive set with company`); break; }
    for (const o of s.offers || []) {
      if (o.signed && o.waitsForWrap && !num(o.startAt)) { problems.push(`life ${i}: held part with no date`); break; }
      if (!num(o.salary)) { problems.push(`life ${i}: salary ${o.salary} on ${o.projectTitle}`); break; }
      if (o.contract && o.contract.sent && o.contract.sent < (s.year * 12 + s.month) - 1) { problems.push(`life ${i}: a paper with them for two months`); break; }
    }
    for (const p of all) if (!num(p.salary) || !num(p.monthsLeft)) { problems.push(`life ${i}: set ${p.title} salary ${p.salary} left ${p.monthsLeft}`); break; }
    if (!num(s.apMaxEff) || s.apMaxEff < 10 || s.apMaxEff > 100) { problems.push(`life ${i}: energy ${s.apMaxEff}`); break; }
    if ((s.timeline || []).slice(-3).some((t) => /they recast/.test(t.text))) counts.recast++;
    if (problems.length) break;
    if (!s.alive) break;
  }
  if (problems.length > 12) break;
}
console.log(JSON.stringify(counts));
if (problems.length) { console.log('PROBLEMS:\n' + problems.slice(0, 12).join('\n')); process.exit(1); }
console.log('contract fuzz clean');
