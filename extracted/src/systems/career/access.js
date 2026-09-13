import { inCareer } from '../../engine/stage.js';
import { agentTakesYou, agentDropped } from '../meta/standing.js';
export function hasHit(s) {
  const all = [...(s.filmography || []), ...(s.discography || [])];
  return all.some((x) => /hit|smash|classic|acclaim/i.test(x.status || '') || (x.rating || 0) >= 85);
}
// A contact — or the person you are seeing, or married to. One in forty prospects is in the
// business (dating.js), and being close to them is the same door as being close to anyone.
export function knowsPowerBroker(s) {
  const spouse = (s.family || []).filter((f) => f.alive && f.relation === 'Spouse');
  return [...(s.people || []), s.partner, ...spouse].filter(Boolean).some((p) => (p.industryWeight || 0) >= 80 && (p.relationship || 0) >= 60);
}
export function computeAccess(s) {
  const fame = s.fame || 0;
  const agent = !!(s.agent && s.agent.level > 0);
  const aaa = hasHit(s) || knowsPowerBroker(s);
  // An agent takes the actor's actor before the public has heard of them.
  return { openCall: inCareer(s), agentReach: agent && (fame >= 40 || agentTakesYou(s)) && !agentDropped(s), aaa,
    elite: aaa && (fame >= 75 || (s.respect || 0) >= 60),
    aaaReason: hasHit(s) ? 'hit' : knowsPowerBroker(s) ? 'connection' : null };
}
