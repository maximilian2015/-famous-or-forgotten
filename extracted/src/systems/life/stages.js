import { addTimeline } from '../../engine/timeline.js';
export const STAGE_LABEL = { child: 'Childhood', teen: 'Teenager', moving_out: 'Leaving home', career: 'Building a career' };
export function stageForAge(ageY, hasApartment) {
  if (ageY < 13) return 'child';
  if (ageY < 18) return 'teen';
  if (!hasApartment) return 'moving_out';
  return 'career';
}
export function advanceStage(s) {
  const next = stageForAge(s.ageY, s.hasApartment);
  if (next === s.stage) return null;
  s.stage = next;
  if (next === 'teen') { addTimeline(s, 'You became a teenager. School, hormones, and the first daydreams of being someone.'); return 'You are a teenager now.'; }
  if (next === 'moving_out') { addTimeline(s, `You turned 18. Time to leave your parents' place and rent somewhere of your own — that is where the real path starts.`); return 'Time to move out and rent your own place.'; }
  if (next === 'career') { addTimeline(s, 'You have your own apartment. No safety net now — just you and the climb.'); return 'You moved out. The climb begins.'; }
  return null;
}
export function rentApartment(s, monthlyRent = 800) {
  if (s.hasApartment) { s.lastEvent = 'You already have your own place.'; return s; }
  if (s.ageY < 18) { s.lastEvent = 'You are too young to move out yet.'; return s; }
  s.hasApartment = true; s.livingWith = 'own_place'; s.rent = monthlyRent; s.stage = 'career';
  addTimeline(s, `You signed a lease on a tiny studio at ${monthlyRent}/month. Your parents helped you carry two boxes and left.`);
  s.lastEvent = 'You rented your first apartment. Welcome to adulthood.';
  return s;
}
