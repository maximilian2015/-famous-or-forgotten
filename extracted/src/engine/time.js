import { advanceStage } from '../systems/life/stages.js';
import { applyMonthly, applyYearly, relevanceDrift, homeEnergy } from './economy.js';
import { maybeGenerateOffer } from '../systems/career/offers.js';
import { emailTick } from '../systems/meta/email.js';
import { maybeStartArc } from '../systems/life/arcs.js';
import { maybeYouthEvent } from '../systems/life/youth.js';
import { familyYear } from '../systems/life/family.js';
import { allowanceTick } from '../systems/life/origin.js';
import { bondsTick } from '../systems/life/bonds.js';
import { datingYear } from '../systems/life/dating.js';
import { spotlightYear } from '../systems/social/spotlight.js';
import { productionTick } from '../systems/career/production.js';
import { releaseTick } from '../systems/career/release.js';
import { frozenTick } from '../systems/career/stability.js';
import { runNominations, ceremonyTick } from '../systems/career/awards.js';
import { agingNote } from '../systems/career/age.js';
import { strainTick } from '../systems/life/strain.js';
import { slotsLost, rehabTick, inRehab } from '../systems/life/depression.js';
import { addTimeline } from './timeline.js';
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
    if (s.stage === 'career') {
      runNominations(s);   // the season judges last year's work
      // The board quietly changes shape as you age. Say so once, out loud, rather than
      // letting the player wonder why the offers dried up.
      const note = agingNote(s);
      if (note) { addTimeline(s, note, true); s.lastEvent = note; }
    }
  }
  applyMonthly(s);
  bondsTick(s);      // people you did not call drift away
  healthTick(s);
  if (!s.alive) return s;   // sudden collapse ends the month right here
  relevanceDrift(s);
  workTick(s);
  rehabTick(s);      // a year away, and the hours come back
  strainTick(s);     // the work accumulates in you, and eventually it stops you
  productionTick(s);
  releaseTick(s);    // anything that finished shooting months ago opens today
  frozenTick(s);     // and anything that stopped might find its money again
  ceremonyTick(s);   // and the Askers land a couple of months after the nominations
  eventsTick(s);
  maybeGenerateEvent(s);
  maybeGenerateOffer(s);
  emailTick(s);
  maybeStartArc(s);
  s.peakFame = Math.max(s.peakFame || 0, s.fame || 0);
  advanceStage(s);
  pruneCooldowns(s);
  // What the illness is actually taking: hours out of your month.
  s.apMaxEff = Math.max(1, (s.apMax || 3) + homeEnergy(s) - jobSlots(s) - slotsLost(s));
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
  bondsTick(s);
  s.peakFame = Math.max(s.peakFame || 0, s.fame || 0);
  advanceStage(s);
  maybeYouthEvent(s);
  pruneCooldowns(s);
  s.apMaxEff = Math.max(1, (s.apMax || 3) + homeEnergy(s) - jobSlots(s));
  s.ap = s.apMaxEff;
  return s;
}
