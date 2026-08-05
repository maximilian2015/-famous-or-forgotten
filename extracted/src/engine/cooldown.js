// Light social actions cost no energy — texting a friend is two minutes, not a working day.
// What keeps them from being spammed is the other person: you can only lean on someone so often.
export function monthStamp(s) { return (s.year || 0) * 12 + (s.month || 0); }
export function onCooldown(s, key) { return (s._cool || {})[key] === monthStamp(s); }
export function markUsed(s, key) { (s._cool = s._cool || {})[key] = monthStamp(s); }
// Keeps the save from growing a stale entry per person per month, forever.
export function pruneCooldowns(s) {
  if (!s._cool) return;
  const now = monthStamp(s);
  for (const k of Object.keys(s._cool)) if (s._cool[k] !== now) delete s._cool[k];
}
