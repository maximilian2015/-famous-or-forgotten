import { advanceStage } from '../systems/life/stages.js';
import { applyMonthly, applyYearly, relevanceDrift } from './economy.js';
import { maybeGenerateOffer } from '../systems/career/offers.js';
import { emailTick } from '../systems/meta/email.js';
import { maybeStartArc } from '../systems/life/arcs.js';
import { maybeYouthEvent } from '../systems/life/youth.js';
import { familyYear } from '../systems/life/family.js';
import { datingYear } from '../systems/life/dating.js';
import { spotlightYear } from '../systems/social/spotlight.js';
import { productionTick } from '../systems/career/production.js';
import { maybeGenerateEvent, eventsTick } from '../systems/social/events.js';

export function stepIsYear(state) { return state.stage === 'child' || state.stage === 'teen'; }
export function advanceTime(state) { return stepIsYear(state) ? advanceYear(state) : advanceMonth(state); }

export function advanceMonth(state) {
  const s = { ...state, timeline: [...(state.timeline || [])] };
  s.month += 1;
  if (s.month > 11) { s.month = 0; s.year += 1; s.ageY += 1; applyYearly(s); familyYear(s); datingYear(s); spotlightYear(s); }
  applyMonthly(s);
  relevanceDrift(s);
  productionTick(s);
  eventsTick(s);
  maybeGenerateEvent(s);
  maybeGenerateOffer(s);
  emailTick(s);
  maybeStartArc(s);
  s.peakFame = Math.max(s.peakFame || 0, s.fame || 0);
  advanceStage(s);
  s.ap = s.apMax || 3;
  return s;
}

export function advanceYear(state) {
  const s = { ...state, timeline: [...(state.timeline || [])] };
  s.year += 1; s.ageY += 1; s.month = 0;
  applyYearly(s);
  familyYear(s);
  datingYear(s);
  spotlightYear(s);
  s.peakFame = Math.max(s.peakFame || 0, s.fame || 0);
  advanceStage(s);
  maybeYouthEvent(s);
  s.ap = s.apMax || 3;
  return s;
}
