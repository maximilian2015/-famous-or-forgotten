// Ads and voice sessions are not a legacy. They paid for a room; they do not go on the
// stone. Kept in step with the Other work split in the filmography.
const MINOR_TYPES = /^(Brand Campaign|Commercial|Jingle|Brand Song|TV Extra|Voice Session|Open Mic|Festival Slot|Session Work|Music Video)$/;
const isMinor = (c) => c.minor === true || (c.minor === undefined && MINOR_TYPES.test(c.type || ''));
export function computeLegacy(s) {
  const all = [...(s.filmography || []), ...(s.discography || [])].filter((c) => !isMinor(c));
  const credits = all.length;
  const hits = all.filter((x) => (x.rating || 0) >= 85).length;
  const worldHits = s.worldHits || 0;
  const peakFame = s.peakFame || s.fame || 0;
  // Weighted for QUALITY over volume: grinding out credits barely moves the needle, while a
  // genuine cultural moment defines a career. The old weights let any life clear Legend.
  const points = Math.round(peakFame * 2.5 + hits * 25 + worldHits * 400 + credits * 1 + (s.respect || 0) * 1.5 + Math.max(0, (s.cash || 0) / 150000));
  let tier = 'Forgotten';
  if (points >= 2300) tier = 'Legend'; else if (points >= 1500) tier = 'A-list Icon'; else if (points >= 800) tier = 'Established Star'; else if (points >= 350) tier = 'Working Actor'; else if (points >= 120) tier = 'Had a Moment';
  return { points, tier, credits, hits, worldHits, peakFame };
}
export function enshrine(s) {
  const L = computeLegacy(s); let hall = [];
  try { hall = JSON.parse(localStorage.getItem('fof_hall') || '[]'); } catch (e) {}
  hall.push({ name: s.name, tier: L.tier, points: L.points, peakFame: L.peakFame, hits: L.hits, worldHits: L.worldHits, credits: L.credits, year: s.year });
  hall.sort((a, b) => b.points - a.points); hall = hall.slice(0, 50);
  try { localStorage.setItem('fof_hall', JSON.stringify(hall)); } catch (e) {}
  return hall;
}
export function getHall() { try { return JSON.parse(localStorage.getItem('fof_hall') || '[]'); } catch (e) { return []; } }
