import { advanceStage } from '../systems/life/stages.js';
import { applyMonthly, applyYearly, relevanceDrift, homeEnergy } from './economy.js';
import { maybeGenerateOffer } from '../systems/career/offers.js';
import { emailTick } from '../systems/meta/email.js';
import { maybeStartArc } from '../systems/life/arcs.js';
import { maybeYouthEvent } from '../systems/life/youth.js';
import { familyYear } from '../systems/life/family.js';
import { allowanceTick } from '../systems/life/origin.js';
import { datingYear } from '../systems/life/dating.js';
import { spotlightYear } from '../systems/social/spotlight.js';
import { productionTick } from '../systems/career/production.js';
import { maybeGenerateEvent, eventsTick } from '../systems/social/events.js';
import { agingTick, mortalityCheck } from '../systems/life/mortality.js';
import { healthTick } from '../systems/life/health.js';
import { pruneCooldowns } from './cooldown.js';
import { workTick, jobSlots } from '../systems/life/work.js';

export function stepIsYear(state) { return state.stage === 'child' || state.stage === 'teen'; }
export function advanceTime(state) { return stepIsYear(state) ? advanceYear(state) : advanceMonth(state); }

export function advanceMonth(state) {
  const s = { ...state, timeline: [...(state.timeline || [])] };
  s.month += 1;
  if (s.month > 11) {
    s.month = 0; s.year += 1; s.ageY += 1;
    applyYearly(s); familyYear(s); allowanceTick(s); datingYear(s); spotlightYear(s);
    agingTick(s);
    if (mortalityCheck(s)) return s;   // life is over — nothing else runs this tick
  }
  applyMonthly(s);
  healthTick(s);
  if (!s.alive) return s;   // sudden collapse ends the month right here
  relevanceDrift(s);
  workTick(s);
  productionTick(s);
  eventsTick(s);
  maybeGenerateEvent(s);
  maybeGenerateOffer(s);
  emailTick(s);
  maybeStartArc(s);
  s.peakFame = Math.max(s.peakFame || 0, s.fame || 0);
  advanceStage(s);
  pruneCooldowns(s);
  s.apMaxEff = Math.max(1, (s.apMax || 3) + homeEnergy(s) - jobSlots(s));
  s.ap = s.apMaxEff;
  return s;
}

export function advanceYear(state) {
  const s = { ...state, timeline: [...(state.timeline || [])] };
  s.year += 1; s.ageY += 1; s.month = 0;
  applyYearly(s);
  familyYear(s);
  allowanceTick(s);
  datingYear(s);
  spotlightYear(s);
  agingTick(s);
  if (mortalityCheck(s)) return s;   // life is over — nothing else runs this tick
  for (let m = 0; m < 12 && s.job; m++) workTick(s);   // youth moves a year at a time, but wages are monthly
  s.peakFame = Math.max(s.peakFame || 0, s.fame || 0);
  advanceStage(s);
  maybeYouthEvent(s);
  pruneCooldowns(s);
  s.apMaxEff = Math.max(1, (s.apMax || 3) + homeEnergy(s) - jobSlots(s));
  s.ap = s.apMaxEff;
  return s;
}
