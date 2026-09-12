// Which of the six Fame × Respect combinations a life is in. Lives in engine/ with no
// imports of its own because engine/economy.js needs it, and economy.js is what
// systems/meta/status.js imports — the same reason inCareer() lives in engine/stage.js.
// The labels, copy and effects are in systems/meta/standing.js.
export function comboOf(s) {
  const f = s.fame || 0, r = s.respect || 0;
  const forgotten = (s.peakFame || 0) >= 35 && f < 15;
  if (forgotten && r < 0) return 'tale';
  if (f >= 55 && r >= 60) return 'real';
  if (f >= 55 && r < 30) return 'face';
  if (f < 35 && r >= 40) return 'craft';
  if (f >= 55) return 'star';
  return 'beginning';
}
