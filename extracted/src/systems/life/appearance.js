// The little figure standing next to your name. This module decides WHAT it wears
// and how old it looks. The drawing itself lives in ui/components/Avatar.jsx —
// swap a hair id here and exactly one <path> changes over there.
import { pick } from '../../engine/rng.js';

export const HAIRSTYLES = {
  cropped:  { label: 'Cropped',    cost: 45, blurb: 'Short, tidy, forgettable in a good way.' },
  buzz:     { label: 'Buzz cut',   cost: 25, blurb: 'Clippers, one setting, four minutes.' },
  undercut: { label: 'Undercut',   cost: 70, blurb: 'Long on top, shaved to the skin at the sides.' },
  long:     { label: 'Long',       cost: 80, blurb: 'Past the shoulders. Takes work, reads expensive.' },
  straight: { label: 'Poker straight', cost: 110, blurb: 'Ironed flat to the waist. Two hours, every time.' },
  waves:    { label: 'Waves',      cost: 90, blurb: 'Parted in the middle and left to do as it likes.' },
  volume:   { label: 'Blowout',    cost: 130, blurb: 'Big, lifted at the root, and it cost what it looks like.' },
  bob:      { label: 'Bob',        cost: 65, blurb: 'Sharp line at the jaw. A decision, not an accident.' },
  curly:    { label: 'Curls',      cost: 70, blurb: 'Big, round, and impossible to ignore in a doorway.' },
  braid:    { label: 'Braid',      cost: 55, blurb: 'One thick plait over the shoulder. Nothing to fuss with.' },
  ponytail: { label: 'Ponytail',   cost: 40, blurb: 'Pulled back and out of the way. Ready to work.' },
  bun:      { label: 'Top knot',   cost: 50, blurb: 'Wound up on top. Looks deliberate, takes a minute.' },
  pigtails: { label: 'Pigtails',   cost: 45, blurb: 'Two of them, high. Younger than you are.' },
  mohawk:   { label: 'Mohawk',     cost: 95, blurb: 'Pink crest, shaved sides. People will have opinions.' },
  bald:     { label: 'Shaved',     cost: 20, blurb: 'All of it off. Cheapest thing on the list.' },
  beard:    { label: 'Shaved + beard', cost: 30, gender: 'male', blurb: 'Clippers on top, everything else grown out.' },
};
export const HAIR_ORDER = ['cropped', 'buzz', 'undercut', 'long', 'straight', 'waves', 'volume', 'bob', 'curly', 'braid', 'ponytail', 'bun', 'pigtails', 'mohawk', 'bald', 'beard'];
// A beard is the one thing here that is not on offer to everyone.
export function hairChoices(gender) {
  return HAIR_ORDER.filter((k) => !HAIRSTYLES[k].gender || HAIRSTYLES[k].gender === gender);
}

export const EYES = [
  { id: 'brown', label: 'Brown', colour: '#5b3a22' },
  { id: 'hazel', label: 'Hazel', colour: '#8a6a2f' },
  { id: 'green', label: 'Green', colour: '#3f7a52' },
  { id: 'blue',  label: 'Blue',  colour: '#3a6ea8' },
  { id: 'grey',  label: 'Grey',  colour: '#6b7280' },
  { id: 'amber', label: 'Amber', colour: '#a9781f' },
];
export const EYE_COLOURS = EYES.map((e) => e.colour);
// 'natural' means mixed from the skin tone rather than painted on.
export const LIPS = ['natural', '#c04a63', '#a02840', '#8d3a5e', '#d4737f', '#6e2338'];

export const OUTFITS = {
  tee:       { label: 'T-shirt and jeans', cost: 0,    blurb: 'What is already in your wardrobe.' },
  hoodie:    { label: 'Hoodie',            cost: 140,  blurb: 'Comfortable. Nobody looks twice.' },
  tracksuit: { label: 'Tracksuit',         cost: 220,  blurb: 'Off duty and not hiding it.' },
  skirt:     { label: 'Blouse and skirt',  cost: 320,  blurb: 'Everyday, put together, gets you taken seriously.' },
  leather:   { label: 'Leather jacket',    cost: 680,  blurb: 'Reads like you might be somebody.' },
  coat:      { label: 'Long wool coat',    cost: 1100, blurb: 'Belted, to the knee. Expensive from across a street.' },
  suit:      { label: 'Tailored suit',     cost: 1500, blurb: 'Navy, fitted, no tie. Works everywhere but a wedding.' },
  tux:       { label: 'Black tie',         cost: 1900, blurb: 'The uniform of the invited.' },
  dress:     { label: 'Red carpet dress',  cost: 2400, blurb: 'Made to be photographed.' },
  gown:      { label: 'Floor-length gown', cost: 4200, blurb: 'It moves when you do. This is the one they shoot.' },
};
export const OUTFIT_ORDER = ['tee', 'hoodie', 'tracksuit', 'skirt', 'leather', 'coat', 'suit', 'tux', 'dress', 'gown'];

// Low-chroma on purpose. The first pass used saturated oranges and the darker tones
// came out tomato-red on screen.
export const SKINS = ['#f4d7bd', '#e5bb9a', '#c99a76', '#a37755', '#7d5941', '#57402f'];
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
  if (s.look && s.look.hair) {
    // Saves from before the hair list grew still say 'short'.
    if (s.look.hair === 'short') s.look = { ...s.look, hair: 'cropped' };
    if (!s.look.eyes) s.look = { ...s.look, eyes: pick(EYE_COLOURS) };
    if (!s.look.lips) s.look = { ...s.look, lips: 'natural' };
    return s;
  }
  s.look = {
    hair: s.gender === 'male' ? 'cropped' : 'long',
    hairColor: pick(HAIR_COLORS),
    skin: pick(SKINS),
    eyes: pick(EYE_COLOURS),
    lips: 'natural',
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
    hair: l.hair || 'cropped',
    hairColor: l.hairColor || HAIR_COLORS[0],
    skin: l.skin || SKINS[1],
    eyes: l.eyes || EYE_COLOURS[0],
    lips: l.lips || 'natural',
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
  // No mohawks out here — a pink crest is a choice the player makes, not something a
  // 52-year-old father turns up with by accident.
  const hairs = female ? ['long', 'bob', 'waves', 'bun', 'curly', 'ponytail', 'cropped']
    : ['cropped', 'buzz', 'beard', 'bald', 'curly', 'cropped'];
  const fits = ['tee', 'hoodie', 'leather', 'tracksuit'];
  return {
    hair: hairs[h % hairs.length],
    hairColor: HAIR_COLORS[(h >> 2) % HAIR_COLORS.length],
    skin: SKINS[(h >> 5) % SKINS.length],
    eyes: EYE_COLOURS[(h >> 11) % EYE_COLOURS.length],
    lips: 'natural',
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
