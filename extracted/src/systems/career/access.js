export function hasHit(s) {
  const all = [...(s.filmography || []), ...(s.discography || [])];
  return all.some((x) => /hit|smash|classic|acclaim/i.test(x.status || '') || (x.rating || 0) >= 85);
}
export function knowsPowerBroker(s) {
  return (s.people || []).some((p) => (p.industryWeight || 0) >= 80 && (p.relationship || 0) >= 60);
}
export function computeAccess(s) {
  const fame = s.fame || 0;
  const agent = !!(s.agent && s.agent.level > 0);
  const aaa = hasHit(s) || knowsPowerBroker(s);
  return { openCall: s.stage === 'career', agentReach: agent && fame >= 40, aaa,
    elite: aaa && (fame >= 75 || (s.respect || 0) >= 60),
    aaaReason: hasHit(s) ? 'hit' : knowsPowerBroker(s) ? 'connection' : null };
}
