import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { earn } from '../../engine/economy.js';
import { hotGenre } from '../meta/news.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
const TIERS = [
  { min: 0, label: 'Disaster' }, { min: 25, label: 'Rocky' }, { min: 50, label: 'Solid' },
  { min: 70, label: 'Great' }, { min: 88, label: 'Legendary' },
];
export function meterTier(meter) {
  let cur = TIERS[0];
  for (const t of TIERS) if ((meter || 0) >= t.min) cur = t;
  return cur;
}
const CREW_ROLES = { actor: ['Director', 'Co-star', 'Camera Operator'], singer: ['Producer', 'Vocal Coach', 'Sound Engineer'] };
const TRAITS = ['diva', 'perfectionist', 'chill', 'difficult'];
const FIRST = ['Jonas', 'Mira', 'Theo', 'Nadia', 'Rin', 'Col', 'Ivy', 'Beau', 'Sasha', 'Omar'];
const LAST = ['Vane', 'Croft', 'Reyes', 'Marsh', 'Onyx', 'Blythe', 'Cole', 'Ferro'];
function makeCrew(dream) {
  const used = new Set();
  return CREW_ROLES[dream === 'singer' ? 'singer' : 'actor'].map((role) => {
    let name; do { name = `${pick(FIRST)} ${pick(LAST)}`; } while (used.has(name));
    used.add(name);
    return { id: 'crew' + Math.random().toString(36).slice(2, 8), name, role, trait: pick(TRAITS), bond: rint(30, 55) };
  });
}
export function startProduction(s, offer) {
  s.production = {
    offerId: offer.id, title: offer.projectTitle.replace('⭐ ', ''), role: offer.role, type: offer.type,
    genre: offer.genre, salary: offer.salary, months: offer.months, monthsLeft: offer.months,
    prestigeScore: offer.prestigeScore, tier: offer.tier, campaign: !!offer.campaign,
    crew: makeCrew(s.dream), meter: 20,
  };
  s.lastEvent = `Cameras roll on "${s.production.title}". First day on set.`;
  addTimeline(s, `Production began: ${s.production.title}.`);
  return s;
}
export function rehearse(s) {
  const p = s.production; if (!p) return s;
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  s.ap = (s.ap || 0) - 1;
  const gain = rint(4, 9);
  p.meter = clamp(p.meter + gain);
  s.lastEvent = `Solid rehearsal. Shoot quality +${gain}.`;
  return s;
}
export function riskyTake(s, quality = 0) {
  const p = s.production; if (!p) return s;
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  s.ap = (s.ap || 0) - 1;
  if (quality >= 80) {
    const gain = rint(16, 22);
    p.meter = clamp(p.meter + gain);
    s.lastEvent = `Perfect take! Shoot quality +${gain}.`;
  } else if (quality >= 45) {
    const gain = rint(8, 14);
    p.meter = clamp(p.meter + gain);
    s.lastEvent = `Good take. Shoot quality +${gain}.`;
  } else {
    const loss = rint(5, 12);
    p.meter = clamp(p.meter - loss);
    s.mental = clamp((s.mental || 50) - 3);
    s.lastEvent = `The take falls flat in front of everyone. Shoot quality −${loss}.`;
  }
  return s;
}
export function bondWithCrew(s, crewId) {
  const p = s.production; if (!p) return s;
  const c = (p.crew || []).find((x) => x.id === crewId); if (!c) return s;
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  s.ap = (s.ap || 0) - 1;
  const gain = rint(6, 14);
  c.bond = clamp(c.bond + gain);
  s.mental = clamp((s.mental || 50) + 1);
  s.lastEvent = `You and ${c.name} (${c.role}) got closer. Bond +${gain}.`;
  return s;
}
export function productionTick(s) {
  const p = s.production; if (!p) return;
  p.monthsLeft -= 1;
  if (p.monthsLeft > 0) return;
  wrapProduction(s);
}
function wrapProduction(s) {
  const p = s.production;
  const skill = s.dream === 'singer' ? s.singing : s.acting;
  const meterBonus = (p.meter - 50) * 0.5;
  let rating = clamp(35 + skill * 0.35 + p.prestigeScore * 0.2 + (s.looks - 40) * 0.1 + meterBonus + rint(-5, 8));
  let worldHit = false;
  if (rating >= 80 && p.tier !== 'supporting') {
    let odds = 6 + Math.max(0, rating - 80) * 0.6;
    if (p.genre === hotGenre(s)) odds += 18;
    if (p.campaign) odds += 12;
    worldHit = chance(Math.min(60, odds));
  }
  if (worldHit) rating = Math.max(rating, 96);
  const status = worldHit ? 'World Hit' : rating >= 85 ? 'Hit' : rating >= 70 ? 'Well-received' : rating >= 50 ? 'Released' : 'Flop';
  const credit = { title: p.title, role: p.role, type: p.type, genre: p.genre, salary: p.salary, rating, status, year: s.year };
  const bucket = s.dream === 'singer' ? 'discography' : 'filmography';
  (s[bucket] = s[bucket] || []).unshift(credit);
  earn(s, p.salary, `"${credit.title}" paid`);
  s.fame = clamp((s.fame || 0) + { tentpole: 9, lead: 5, supporting: 2 }[p.tier] + (rating >= 85 ? 4 : 0) + (worldHit ? 25 : 0));
  s.confidence = clamp((s.confidence || 0) + 2);
  const lead = p.crew[0];
  let verdictNote = '';
  if (lead.bond >= 70) { s.respect = clamp((s.respect || 0) + 3); verdictNote = ` ${lead.name} tells anyone who'll listen how good you were.`; }
  else if (lead.bond <= 25) { s.respect = clamp((s.respect || 0) - 3); verdictNote = ` ${lead.name} has quietly started telling a different story about you.`; }
  if (worldHit) {
    s.worldHits = (s.worldHits || 0) + 1;
    s.lastEvent = `🌍 "${credit.title}" wraps — and becomes a genuine world phenomenon.${verdictNote}`;
    addTimeline(s, `🌍 WORLD HIT: ${credit.title}!`);
  } else {
    s.lastEvent = `"${credit.title}" wraps. It came out ${status.toLowerCase()} — rating ${Math.round(rating)}.${verdictNote}`;
    addTimeline(s, `${credit.title}: ${status} (${Math.round(rating)}/100).`, rating < 50);
  }
  s.production = null;
}
