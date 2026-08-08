// A place of your own is only worth something if you can fill it with people.
// Parties are the one thing the home does that you actively choose — and the bigger
// the night, the more likely somebody calls the police about it.
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { onCooldown, markUsed } from '../../engine/cooldown.js';
import { home, HOUSING } from '../../engine/economy.js';
import { applyBond } from './bonds.js';
import { makePerson } from './relationships.js';

const clamp = (v) => Math.max(0, Math.min(100, v));

// noise: how hard this is to keep quiet. Bigger rooms swallow more of it.
export const PARTIES = {
  drinks: { label: 'A few people over', cost: 180, blurb: 'Six friends, one speaker, nobody on the balcony.', noise: 6, reach: 1, mental: [4, 8] },
  proper: { label: 'A proper party', cost: 900, blurb: 'Word gets out. People you half know turn up.', noise: 30, reach: 2, mental: [7, 13] },
  blowout: { label: 'Throw the doors open', cost: 3200, blurb: 'Someone posts the address. It stops being your party.', noise: 68, reach: 4, mental: [10, 18] },
};
export const PARTY_ORDER = ['drinks', 'proper', 'blowout'];

// A canal house has walls and a garden; a rented room has a landlord downstairs.
const SOUNDPROOF = { room: -18, studio: -10, flat: 4, house: 18, penthouse: 24 };

export function partyRisk(s, key) {
  const p = PARTIES[key]; if (!p) return 0;
  const proof = SOUNDPROOF[s.housing || 'room'] ?? 0;
  const famous = (s.fame || 0) >= 55 ? 10 : 0;    // people film you now
  return Math.max(2, Math.min(92, p.noise - proof + famous));
}

export function canThrowParty(s) {
  if (s.homeless) return 'You have no door to open.';
  if (!s.hasApartment) return 'Not in your parents’ house.';
  return '';
}

export function throwParty(s, key) {
  const p = PARTIES[key]; if (!p) return s;
  const blocked = canThrowParty(s);
  if (blocked) { s.lastEvent = blocked; return s; }
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  if (onCooldown(s, 'party')) { s.lastEvent = 'You had people over this month already. Give the neighbours a rest.'; return s; }
  if ((s.cash || 0) < p.cost) { s.lastEvent = `${p.label} costs €${p.cost.toLocaleString()}. Not tonight.`; return s; }

  markUsed(s, 'party');
  s.ap -= 1;
  s.cash -= p.cost;
  s.mental = clamp((s.mental || 50) + rint(p.mental[0], p.mental[1]));

  // Everyone who turned up gets a little closer — the whole point of having a place.
  const guests = [...(s.people || []), ...(s.family || []).filter((x) => x.alive && x.relation !== 'Mother' && x.relation !== 'Father')];
  const warmed = guests.slice(0, p.reach * 2);
  for (const guest of warmed) applyBond(s, guest, rint(3, 7));
  if (s.partner) applyBond(s, s.partner, rint(2, 6));

  const lines = [];
  // Somebody worth knowing turns up at a big enough night.
  if (s.stage === 'career' && chance(18 * p.reach)) {
    const met = makePerson(s);
    (s.people = s.people || []).push(met);
    lines.push(`${met.name} was there — ${met.role.toLowerCase()}, and they remembered your name.`);
  }
  if (p.reach >= 2) s.fame = clamp((s.fame || 0) + rint(0, p.reach - 1));

  const risk = partyRisk(s, key);
  if (chance(risk)) {
    const fine = Math.round(p.cost * (0.6 + Math.random()));
    s.cash -= fine;
    s.scandal = clamp((s.scandal || 0) + rint(2, 7));
    s.mental = clamp(s.mental - rint(2, 5));
    const how = pick(['A neighbour called it in', 'Someone filmed the street and tagged the address', 'Two officers at the door at 2am']);
    lines.push(`${how}. €${fine.toLocaleString()} fine, and it made the local press.`);
    addTimeline(s, `Police at your ${HOUSING[s.housing || 'room'].label.toLowerCase()} after a party.`, true);
    // A landlord only takes so much.
    if ((s.housing === 'room' || s.housing === 'studio') && !s.inheritedHome && chance(22)) {
      s.rentMissed = Math.max(s.rentMissed || 0, 1);
      lines.push('Your landlord left a letter. One more and you are out.');
    }
  } else {
    lines.push(pick(['Nobody complained. The morning was quiet and the flat was not.',
      'It ended at four with people asleep on the floor and no damage worth naming.',
      'It was, by every measure, a good night.']));
  }

  addTimeline(s, `${p.label} at your place.`);
  s.lastEvent = `${p.label}. ${lines.join(' ')}`;
  return s;
}
