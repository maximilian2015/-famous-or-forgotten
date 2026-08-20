import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { earn } from '../../engine/economy.js';
import { hotGenre } from '../meta/news.js';
import { addGenreXP, genreBonus } from './genres.js';
import { scheduleRelease } from './release.js';
import { rollStability, productionTrouble, volatileSwing } from './stability.js';
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
    // Older offers were written before releases existed and carry no scale of their own.
    scale: offer.scale || (offer.episodes ? (offer.tier === 'lead' ? 'recurring' : 'episode')
      : offer.tier === 'tentpole' ? 'blockbuster' : offer.tier === 'lead' ? 'feature' : 'indie'),
    // Carried so the thing can continue: which season, which part of the franchise,
    // and whether you signed away the right to say no.
    episodes: offer.episodes || 0, episodeFee: offer.episodeFee || 0,
    season: offer.season || (offer.episodes ? 1 : 0), part: offer.part || 1,
    optioned: !!offer.optioned, optionParts: offer.optionParts || 0,
    // How solid the money is. Decides whether this shoot ever reaches its last day, and
    // how wildly the finished thing can turn out. See systems/career/stability.js.
    stability: offer.stability ?? rollStability(offer.scale || 'feature'),
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
  // A serious illness stops the shoot dead — the schedule waits for you.
  if (s.illness && s.illness.freezes) {
    p.paused = (p.paused || 0) + 1;
    if (p.paused === 1) addTimeline(s, `${p.title} is on hold while you recover.`, true);
    return;
  }
  p.paused = 0;
  // The money can walk at any point during the shoot. It either freezes or dies, and
  // either way there is no production left to tick.
  if (productionTrouble(s, p)) return;
  p.monthsLeft -= 1;
  // You are paid while you work. A fourteen-month blockbuster that only paid on wrap
  // would starve you out of your flat long before the premiere.
  const perMonth = Math.round((p.salary || 0) / Math.max(1, p.months || 1));
  p.paid = (p.paid || 0) + perMonth;
  if (perMonth > 0) earn(s, perMonth, `"${p.title}" — month ${(p.months - p.monthsLeft)}`);
  if (p.monthsLeft > 0) return;
  wrapProduction(s);
}
function wrapProduction(s) {
  const p = s.production;
  const skill = s.dream === 'singer' ? s.singing : s.acting;
  // Skill is a FLOOR, not a ceiling: a master never embarrasses themselves, but a hit has to
  // be earned on set. Before this, skill 100 alone cleared the 85 hit line on every project.
  const floor = 20 + skill * 0.30;
  const craft = (p.meter - 40) * 0.45;            // how the shoot actually went — can go negative
  // The swing. A locked studio picture comes out roughly as good as it was always going
  // to be; a project held together with tape can be the film of the year or nothing at
  // all. This is why an indie is worth the gamble.
  let rating = clamp(floor + craft + p.prestigeScore * 0.18 + (s.looks - 40) * 0.08 + genreBonus(s, p.genre)
    + rint(-10, 12) + volatileSwing(p.stability));
  // A genuine cultural moment should be a career highlight, not a monthly occurrence.
  let worldHit = false;
  if (rating >= 90 && p.tier !== 'supporting') {
    let odds = 1.5 + (rating - 90) * 0.4;
    if (p.genre === hotGenre(s)) odds += 7;
    if (p.campaign) odds += 5;
    worldHit = chance(Math.min(18, odds));
  }
  if (worldHit) rating = Math.max(rating, 96);
  const status = worldHit ? 'World Hit' : rating >= 85 ? 'Hit' : rating >= 70 ? 'Well-received' : rating >= 50 ? 'Released' : 'Flop';
  const credit = { title: p.title, role: p.role, type: p.type, genre: p.genre, salary: p.salary, rating, status, year: s.year,
    season: p.season || 0, part: p.part > 1 ? p.part : 0, episodes: p.episodes || 0 };
  // The credit does NOT land here. It goes into post and opens months from now —
  // fame, box office and the score all arrive on premiere night, not on the last
  // day of shooting. See systems/career/release.js.
  scheduleRelease(s, credit, p);
  addGenreXP(s, p.genre, rating);
  // Whatever the monthly instalments did not cover — rounding, and the offers that were
  // written before instalments existed.
  const owed = Math.max(0, (p.salary || 0) - (p.paid || 0));
  if (owed > 0) earn(s, owed, `"${credit.title}" — final payment`);
  s.confidence = clamp((s.confidence || 0) + 2);
  // What the crew says about you travels immediately — long before anyone sees the film.
  const lead = p.crew[0];
  let verdictNote = '';
  if (lead.bond >= 70) { s.respect = clamp((s.respect || 0) + 3); verdictNote = ` ${lead.name} tells anyone who'll listen how good you were.`; }
  else if (lead.bond <= 25) { s.respect = clamp((s.respect || 0) - 3); verdictNote = ` ${lead.name} has quietly started telling a different story about you.`; }
  if (worldHit) s.worldHits = (s.worldHits || 0) + 1;
  s.lastEvent = `"${credit.title}" is in the can. Now you wait for it to open.${verdictNote}`;
  // Whether it carries on is decided on the numbers, so that question waits for the
  // premiere too — release.js asks it once the thing has actually been seen.
  s.production = null;
}
