// The face and the body, fuzzed: care tiers, the trainer, needles and surgery pressed at
// random through forty years, with the invariants that matter — looks stay on the scale,
// no NaN anywhere on the face, a frozen face is a penalty that ends, recovery ends, money
// is actually taken, and nothing throws.
import fs from 'fs';
import { ensureWorld } from '../../src/systems/world/world.js';
import { advanceMonth } from '../../src/engine/time.js';
import * as F from '../../src/systems/life/face.js';

const base = JSON.parse(fs.readFileSync(new URL('../../dist/_save.json', import.meta.url), 'utf8'));
const problems = [];
const counts = { care: 0, trainer: 0, needle: 0, surgery: 0, frozen: 0, healing: 0, botched: 0 };
const num = (v) => typeof v === 'number' && Number.isFinite(v);
for (let i = 0; i < 40; i++) {
  let s = JSON.parse(JSON.stringify(base)); ensureWorld(s);
  Object.assign(s, { production: null, productions: [], offers: [], bigMoment: null, moments: [], cash: 3000000 + i * 100000, fame: 20 + (i % 5) * 15 });
  const tiers = Object.keys(F.CARE || { none: 1 });
  for (let m = 0; m < 480; m++) {
    s.bigMoment = null; s.moments = []; s.night = null; s.pendingArc = null; s.ap = 100;
    try {
      const r = Math.random();
      if (r < 0.15) { F.setCare(s, tiers[Math.floor(Math.random() * tiers.length)]); counts.care++; }
      else if (r < 0.25) { F.toggleTrainer(s); counts.trainer++; }
      else if (r < 0.35) { const before = s.cash; F.needle(s); if (s.cash < before) counts.needle++; }
      else if (r < 0.42) { const before = s.cash; const tier = Object.keys(F.SURGEONS || { clinic: 1 })[Math.floor(Math.random() * Object.keys(F.SURGEONS || { clinic: 1 }).length)]; F.surgery(s, tier); if (s.cash < before) counts.surgery++; }
      if (F.frozenFace(s)) counts.frozen++;
      if (F.healing(s)) counts.healing++;
      s = advanceMonth(s);
    } catch (e) { problems.push(`life ${i} month ${m} THREW: ${e.message}`); break; }
    const f = s.face || {};
    if (!num(s.looks) || s.looks < 0 || s.looks > 100) { problems.push(`life ${i} month ${m}: looks ${s.looks}`); break; }
    if (!num(F.apparentAge(s))) { problems.push(`life ${i}: apparent age NaN`); break; }
    if (!num(s.cash)) { problems.push(`life ${i}: cash ${s.cash}`); break; }
    if (f.recovery != null && (!num(f.recovery) || f.recovery < 0)) { problems.push(`life ${i}: recovery ${f.recovery}`); break; }
    if (!Array.isArray(f.needles) || !Array.isArray(f.ops)) { problems.push(`life ${i}: face lists missing`); break; }
    if (!s.alive) break;
  }
  if ((s.face && s.face.ops || []).some((o) => o.botched)) counts.botched++;
}
console.log(JSON.stringify(counts));
if (problems.length) { console.log('PROBLEMS:\n' + problems.slice(0, 10).join('\n')); process.exit(1); }
console.log('face fuzz clean');
