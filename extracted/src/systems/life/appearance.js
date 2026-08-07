// The little figure standing next to your name. This module decides WHAT it wears
// and how old it looks. The drawing itself lives in ui/components/Avatar.jsx —
// swap a hair id here and exactly one <path> changes over there.
import { pick } from '../../engine/rng.js';

export const HAIRSTYLES = {
  short:  { label: 'Cropped',        cost: 45,  blurb: 'Short, tidy, forgettable in a good way.' },
  long:   { label: 'Long',           cost: 80,  blurb: 'Past the shoulders. Takes work, reads expensive.' },
  bob:    { label: 'Bob',            cost: 65,  blurb: 'Sharp line at the jaw. A decision, not an accident.' },
  mohawk: { label: 'Mohawk',         cost: 95,  blurb: 'Pink crest, shaved sides. People will have opinions.' },
  bald:   { label: 'Shaved + beard', cost: 30,  blurb: 'Clippers and a good beard. Cheapest thing here.' },
};
export const HAIR_ORDER = ['short', 'long', 'bob', 'mohawk', 'bald'];

export const OUTFITS = {
  tee:       { label: 'T-shirt and jeans', cost: 0,    blurb: 'What is already in your wardrobe.' },
  hoodie:    { label: 'Hoodie',            cost: 140,  blurb: 'Comfortable. Nobody looks twice.' },
  tracksuit: { label: 'Tracksuit',         cost: 220,  blurb: 'Off duty and not hiding it.' },
  leather:   { label: 'Leather jacket',    cost: 680,  blurb: 'Reads like you might be somebody.' },
  tux:       { label: 'Black tie',         cost: 1900, blurb: 'The uniform of the invited.' },
  dress:     { label: 'Red carpet dress',  cost: 2400, blurb: 'Made to be photographed.' },
};
export const OUTFIT_ORDER = ['tee', 'hoodie', 'tracksuit', 'leather', 'tux', 'dress'];

export const SKINS = ['#f6d3ae', '#e3b48a', '#c98f63', '#9c6238', '#6f4423'];
export const HAIR_COLORS = ['#241a2e', '#3a2c22', '#5b3a22', '#7a5232', '#12101a', '#a8763c'];

// Kids do not get to pick. Everything before this age wears what it is given.
export const DRESS_UP_AGE = 13;

export function ageBand(age) {
  const a = Number(age) || 0;
  if (a < 3) return 'baby';
  if (a < 13) return 'child';
  if (a < 18) return 'teen';
  if (a < 35) return 'young';
  if (a < 55) return 'adult';
  if (a < 70) return 'older';
  return 'elder';
}

export function ensureAppearance(s) {
  if (s.look && s.look.hair) return s;
  s.look = {
    hair: s.gender === 'male' ? 'short' : 'long',
    hairColor: pick(HAIR_COLORS),
    skin: pick(SKINS),
    outfit: 'tee',
    owned: ['tee'],
  };
  return s;
}

// What the player's figure should look like right now. Never mutates.
export function lookOf(s) {
  const l = s.look || {};
  const band = ageBand(s.ageY);
  return {
    hair: band === 'baby' ? 'short' : (l.hair || 'short'),
    hairColor: l.hairColor || HAIR_COLORS[0],
    skin: l.skin || SKINS[1],
    // A toddler in black tie is a bug, not a joke. Kids wear kid clothes.
    outfit: band === 'baby' || band === 'child' ? 'tee' : (l.outfit || 'tee'),
    age: s.ageY || 0,
    gender: s.gender || 'female',
    sick: !!s.illness,
  };
}

// Partners, spouses and family need a face too, and it has to be the SAME face
// every render — so it is derived from their id rather than rolled fresh.
function hashOf(str) {
  let h = 0;
  for (let i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) | 0;
  return Math.abs(h);
}
export function lookOfPerson(p) {
  const h = hashOf(p?.id || p?.name || 'someone');
  const female = p?.gender === 'f' || p?.gender === 'female';
  const hairs = female ? ['long', 'bob', 'short'] : ['short', 'bald', 'mohawk'];
  const fits = ['tee', 'hoodie', 'leather', 'tracksuit'];
  return {
    hair: hairs[h % hairs.length],
    hairColor: HAIR_COLORS[(h >> 2) % HAIR_COLORS.length],
    skin: SKINS[(h >> 5) % SKINS.length],
    outfit: fits[(h >> 8) % fits.length],
    age: p?.age ?? 30,
    gender: female ? 'female' : 'male',
    sick: !!p?.ill,
  };
}

// The person standing next to you in the header: partner if dating, spouse if married.
export function companionOf(s) {
  const spouse = (s.family || []).find((p) => p.relation === 'Spouse' && p.alive);
  if (spouse) return { person: spouse, married: true };
  if (s.partner) return { person: s.partner, married: false };
  return null;
}

export function buyHair(s, id) {
  const h = HAIRSTYLES[id];
  if (!h) return s;
  ensureAppearance(s);
  if (s.look.hair === id) return s;
  if ((s.cash || 0) < h.cost) { s.lastEvent = `The salon wants €${h.cost} and you do not have it.`; return s; }
  s.cash -= h.cost;
  s.look = { ...s.look, hair: id };
  s.lastEvent = `New hair: ${h.label.toLowerCase()}. €${h.cost} at the salon.`;
  return s;
}

export function setHairColour(s, colour) {
  ensureAppearance(s);
  if (s.look.hairColor === colour) return s;
  const cost = 60;
  if ((s.cash || 0) < cost) { s.lastEvent = `Colour costs €${cost} and your account disagrees.`; return s; }
  s.cash -= cost;
  s.look = { ...s.look, hairColor: colour };
  s.lastEvent = `You had your hair coloured. €${cost}.`;
  return s;
}

export function wearOutfit(s, id) {
  const o = OUTFITS[id];
  if (!o) return s;
  ensureAppearance(s);
  const owned = s.look.owned || ['tee'];
  if (s.look.outfit === id) return s;
  if (owned.includes(id)) {
    s.look = { ...s.look, outfit: id };
    s.lastEvent = `You changed into your ${o.label.toLowerCase()}.`;
    return s;
  }
  if ((s.cash || 0) < o.cost) { s.lastEvent = `${o.label} costs €${o.cost.toLocaleString()}. Not today.`; return s; }
  s.cash -= o.cost;
  s.look = { ...s.look, outfit: id, owned: [...owned, id] };
  s.lastEvent = `You bought the ${o.label.toLowerCase()} — €${o.cost.toLocaleString()}. It is yours now.`;
  return s;
}

export function ownsOutfit(s, id) {
  return (s.look?.owned || ['tee']).includes(id);
}
