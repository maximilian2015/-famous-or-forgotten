export function computeLegacy(s) {
  const credits = (s.filmography || []).length + (s.discography || []).length;
  const hits = [...(s.filmography || []), ...(s.discography || [])].filter((x) => (x.rating || 0) >= 85).length;
  const worldHits = s.worldHits || 0;
  const peakFame = s.peakFame || s.fame || 0;
  const points = Math.round(peakFame * 2.5 + hits * 35 + worldHits * 150 + credits * 5 + (s.respect || 0) * 1.5 + Math.max(0, (s.cash || 0) / 100000));
  let tier = 'Forgotten';
  if (points >= 700) tier = 'Legend'; else if (points >= 350) tier = 'A-list Icon'; else if (points >= 180) tier = 'Established Star'; else if (points >= 80) tier = 'Working Actor'; else if (points >= 30) tier = 'Had a Moment';
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
