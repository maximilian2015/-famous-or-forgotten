// What a month of energy is, for this person, this month. Kept apart from energy.js so
// that file stays import-free; this one may read state shapes but still imports nothing.
import { ENERGY, ENERGY_CAP, REFILL } from './energy.js';
export function monthEnergy(s, { home = 0, staff = 0, jobSlots = 0, lostSlots = 0 } = {}) {
  let e = ENERGY + home + staff;
  e -= jobSlots * REFILL.jobSlot;
  e -= lostSlots * REFILL.depressionSlot;
  if (s.illness) e -= REFILL.illness;
  if ((s.strain || 0) > 60) e -= REFILL.wornOut;
  if (s.burnout && s.burnout.left > 0) e = Math.min(e, 30);   // signed off: enough to live, not to work
  return Math.max(10, Math.min(ENERGY_CAP, Math.round(e)));
}
