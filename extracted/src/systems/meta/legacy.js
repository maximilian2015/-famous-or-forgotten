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
  // An Asker is the heaviest single thing a career can carry — heavier than any one hit,
  // because it is the industry itself saying so.
  const askerWins = (s.awards?.wins || []).length;
  const askerNoms = (s.awards?.nominations || []).length;
  const points = Math.round(peakFame * 2.5 + hits * 25 + worldHits * 400 + credits * 1
    + askerWins * 600 + askerNoms * 150
    + (s.respect || 0) * 1.5 + Math.max(0, (s.cash || 0) / 150000));
  let tier = 'Forgotten';
  if (points >= 2300) tier = 'Legend'; else if (points >= 1500) tier = 'A-list Icon'; else if (points >= 800) tier = 'Established Star'; else if (points >= 350) tier = 'Working Actor'; else if (points >= 120) tier = 'Had a Moment';
  return { points, tier, credits, hits, worldHits, peakFame, askerWins, askerNoms };
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

// ── the next one ──────────────────────────────────────────────────────────────
// A life used to end and the next one started from nothing, which threw away the only thing
// the ending was actually worth: somebody who was there for all of it. Any child of yours
// who is still alive can be the one you play next, and what they start with is exactly what
// you left them — the money, the name, and how well they knew you.
export function heirsOf(s) {
  return (s.family || [])
    .filter((p) => p.relation === 'Child' && p.alive !== false)
    .sort((a, b) => (b.relationship || 0) - (a.relationship || 0));
}

// What being your child is worth. A famous parent opens the door and nothing else: the room
// on the other side of it has already decided you did not earn being in it.
export function heirOpts(s, childId) {
  const kid = heirsOf(s).find((k) => k.id === childId);
  if (!kid) return null;
  const L = computeLegacy(s);
  const estate = Math.max(0, Math.round((s.cash || 0) / Math.max(1, heirsOf(s).length)));
  const close = kid.relationship || 0;
  return {
    name: kid.name, gender: kid.gender === 'm' ? 'male' : 'female',
    city: s.city, dream: s.dream, created: true, startYear: s.year,
    heir: {
      parent: s.name, parentGender: s.gender === 'female' ? 'f' : 'm',
      tier: L.tier, parentPeak: Math.round(L.peakFame), estate,
      // Being close to them is the difference between growing up inside the work and growing
      // up next to somebody who was never in.
      close, knewThem: close >= 55,
      // What the industry hands you before you have done anything.
      fame: Math.round(Math.min(38, L.peakFame * 0.28 + (L.askerWins || 0) * 6)),
      craft: close >= 55 ? 12 : close >= 25 ? 6 : 0,
      // And what it charges for that. Nobody believes you got here on your own, and for a
      // while nobody is wrong.
      respect: -Math.round(Math.min(22, L.peakFame * 0.18)),
    },
  };
}
