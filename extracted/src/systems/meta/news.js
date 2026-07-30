import { rint, chance } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
export const GENRES = ['Drama','Thriller','Comedy','Sci-Fi','Romance','Horror','Musical','Crime'];
export function hotGenre(s) { return GENRES[((s.year || 2026) * 12 + (s.month || 0)) % GENRES.length]; }
export function hasHit(s) { const all = [...(s.filmography || []), ...(s.discography || [])]; return all.some((x) => /hit|smash|classic|acclaim/i.test(x.status || '') || (x.rating || 0) >= 70); }
function monthKey(s) { return (s.year || 0) * 12 + (s.month || 0); }
export function pressUnread(s) { return hasHit(s) && s._newsActed !== monthKey(s) ? 1 : 0; }
export function respondToPress(s, choice) {
  if (s._newsActed === monthKey(s)) return s;
  s._newsActed = monthKey(s);
  const clamp = (v) => Math.max(0, Math.min(100, v));
  if (choice === 'reply') {
    const odds = 30 + (s.charisma || 0) * 0.5;
    if (chance(odds)) { s.media = clamp((s.media || 0) + 5); s.fame = clamp((s.fame || 0) + 1); s.respect = clamp((s.respect || 0) + 1); s.lastEvent = 'You answered the piece. Your reply gets quoted more than the article did.'; addTimeline(s, 'Answered a press story — it landed well.'); }
    else { s.scandal = clamp((s.scandal || 0) + 3); s.media = clamp((s.media || 0) + 3); s.mental = clamp((s.mental || 0) - 2); s.lastEvent = 'You answered — and fed it. Your reply becomes the new headline.'; addTimeline(s, 'Answered a press story — it backfired.', true); }
  } else { s.media = clamp((s.media || 0) + 1); s.scandal = clamp((s.scandal || 0) - 1); s.mental = clamp((s.mental || 0) + 1); s.lastEvent = 'You said nothing. Without your oxygen the story burns out in a week.'; addTimeline(s, 'Ignored a press story — it faded.'); }
  return s;
}
