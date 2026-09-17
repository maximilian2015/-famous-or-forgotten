// What a month of energy is, for this person, this month. Kept apart from energy.js so
// that file stays import-free; this one may read state shapes but still imports nothing.
import { ENERGY, ENERGY_CAP, REFILL } from './energy.js';
// The same sum, said out loud — Maxi: "I did not drink and the energy is still fifty."
export function energyWhy(s, { home = 0, staff = 0, jobSlots = 0, lostSlots = 0, extraSets = 0 } = {}) {
  const out = [];
  if (home) out.push(`home +${home}`);
  if (staff) out.push(`staff +${staff}`);
  if (jobSlots) out.push(`the day job −${jobSlots * REFILL.jobSlot}`);
  if (lostSlots) out.push(`not getting up −${lostSlots * REFILL.depressionSlot}`);
  if (extraSets) out.push(`${extraSets + 1} sets at once −${extraSets * REFILL.set}`);
  if (s.illness) out.push(`ill −${REFILL.illness}`);
  if ((s.strain || 0) > 60) out.push(`worn out −${REFILL.wornOut}`);
  if (s.burnout && s.burnout.left > 0) out.push('signed off: 30 at most');
  return out;
}
export function monthEnergy(s, { home = 0, staff = 0, jobSlots = 0, lostSlots = 0, extraSets = 0 } = {}) {
  let e = ENERGY + home + staff;
  e -= jobSlots * REFILL.jobSlot;
  e -= extraSets * REFILL.set;   // three sets at once: sixty to live the month on
  e -= lostSlots * REFILL.depressionSlot;
  if (s.illness) e -= REFILL.illness;
  if ((s.strain || 0) > 60) e -= REFILL.wornOut;
  if (s.burnout && s.burnout.left > 0) e = Math.min(e, 30);   // signed off: enough to live, not to work
  return Math.max(10, Math.min(ENERGY_CAP, Math.round(e)));
}
