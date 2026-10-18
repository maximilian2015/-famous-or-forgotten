// The colour half of a one-sheet, kept apart from the drawing of it for one reason: node will
// not import a .jsx file, so nothing in Poster.jsx could ever be measured. The posters were all
// the same shade of black for months and no test could have said so. This half is plain .js and
// test_posters.mjs reads it.
//
// Poster.jsx draws the shapes and imports everything here. Nothing else should need it, except
// a probe.
export function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
export function rng(seed) { let x = seed || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return (x % 10000) / 10000; }; }
export const one = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];

// ── colour ────────────────────────────────────────────────────────────────────
// A genre is a hue and a mood, not a fixed pair of hex codes — two horror films used to be
// exactly the same red. The seed moves the hue within the genre's range and decides how dark it
// sits, so a genre still reads as itself and no two pictures in it are the same colour.
const HUE = {
  Drama: [262, 26], Crime: [212, 22], Romance: [336, 24], Musical: [28, 26],
  Thriller: [188, 24], 'Sci-Fi': [206, 30], Comedy: [44, 22], Horror: [356, 20],
};
// Spread properly now. These used to sit inside ten degrees of each other for half the genres.
const LIGHT_HUE = { Drama: 36, Crime: 196, Romance: 342, Musical: 318, Thriller: 172, 'Sci-Fi': 190, Comedy: 50, Horror: 4 };
// How bright the picture itself is, which is the thing that was identical everywhere. A
// comedy is a bright poster and a horror film is nearly a black one; a drama is somewhere in
// between and should be allowed to be either.
const TONE = {
  Comedy: [46, 26], Musical: [42, 24], Romance: [34, 24], 'Sci-Fi': [22, 20],
  Drama: [24, 24], Thriller: [16, 16], Crime: [15, 15], Horror: [9, 12],
};
// How bright a genre sits inside whichever scheme it drew. A flat comedy one-sheet and a flat
// horror one are the same construction and nowhere near the same brightness.
const BRIGHT = { Comedy: 9, Musical: 7, Romance: 5, 'Sci-Fi': -1, Drama: 0, Thriller: -6, Crime: -7, Horror: -13 };

// ── the scheme ────────────────────────────────────────────────────────────────
// Maxi, looking at a filmography: "постеры ужасные, все темные, все какие-то одинаковые, на
// комедию такое не делают". He was right and the cause was not the number of shapes. Every
// poster, whatever its genre and whatever it drew, ended at 5% lightness and drew every shape
// at 7%. Black on black. The genre moved the TOP of the gradient, which in a 44-pixel thumbnail
// is behind the subject. Two thousand combinations of layers, one colour.
//
// So the colour is a SCHEME now, chosen with everything else: how the ground, the shapes and
// the light stand to one another. A flat two-colour poster has a bright ground and coloured
// shapes. A high-key one is nearly white with a saturated figure on it. Only `night` is the old
// construction, and only the genres that have earned it get much of it.
//
// Every scheme returns the same four things: ground (two stops), ink (the big shapes), light
// (highlights and the thumbnail's band) and type (what the title is legible in).
const SCHEMES = {
  // the one it used to be, everywhere: bright above, black below, black shapes
  night: (h, sat, L, lh, r) => ({
    sky: [`hsl(${h} ${sat}% ${Math.max(12, L + 6)}%)`, `hsl(${h} ${Math.round(sat * 0.8)}% 5%)`],
    ink: `hsl(${h} ${Math.round(sat * 0.7)}% 7%)`,
    light: `hsl(${lh} ${55 + Math.round(r() * 30)}% ${66 + Math.round(r() * 20)}%)`,
    type: '#f6f1e6', fade: `hsl(${h} ${Math.round(sat * 0.7)}% 7%)`,
  }),
  // two colours and nothing else — the oldest idea in the business
  flat: (h, sat, L, lh, r) => { const ih = (h + 150 + r() * 70) % 360; return {
    sky: [`hsl(${h} ${Math.min(82, sat + 34)}% ${Math.round(L * 0.55 + 42)}%)`, `hsl(${h} ${Math.min(76, sat + 26)}% ${Math.round(L * 0.5 + 33)}%)`],
    ink: `hsl(${ih} ${56 + Math.round(r() * 26)}% ${13 + Math.round(r() * 10)}%)`,
    light: `hsl(${(ih + 180) % 360} ${30 + Math.round(r() * 30)}% ${88 + Math.round(r() * 8)}%)`,
    type: '#fffaf0', fade: `hsl(${ih} 50% 11%)`,
  }; },
  // nearly white, one saturated figure on it. This is what a comedy looks like.
  high: (h, sat, L, lh, r) => { const ih = (h + 10 + r() * 50) % 360; return {
    sky: [`hsl(${(h + 30) % 360} ${18 + Math.round(r() * 22)}% ${Math.round(L * 0.25 + 86)}%)`, `hsl(${h} ${22 + Math.round(r() * 20)}% ${Math.round(L * 0.3 + 72)}%)`],
    ink: `hsl(${ih} ${58 + Math.round(r() * 26)}% ${26 + Math.round(r() * 14)}%)`,
    light: `hsl(${(ih + 165) % 360} ${62 + Math.round(r() * 26)}% ${46 + Math.round(r() * 14)}%)`,
    type: '#1b1414', fade: `hsl(${h} 24% ${Math.round(L * 0.3 + 74)}%)`,
  }; },
  // pale, soft, a watercolour of a poster
  wash: (h, sat, L, lh, r) => { const ih = (h + 200 + r() * 60) % 360; return {
    sky: [`hsl(${h} ${26 + Math.round(r() * 20)}% ${Math.round(L * 0.3 + 74)}%)`, `hsl(${(h + 36) % 360} ${30 + Math.round(r() * 20)}% ${Math.round(L * 0.35 + 58)}%)`],
    ink: `hsl(${ih} ${34 + Math.round(r() * 22)}% ${28 + Math.round(r() * 12)}%)`,
    light: `hsl(${(h + 200) % 360} ${54 + Math.round(r() * 24)}% ${56 + Math.round(r() * 16)}%)`,
    type: '#1d1720', fade: `hsl(${(h + 36) % 360} 32% ${Math.round(L * 0.35 + 56)}%)`,
  }; },
  // two hues across the whole sheet, both of them doing work
  duotone: (h, sat, L, lh, r) => { const ih = (h + 155 + r() * 60) % 360; return {
    sky: [`hsl(${h} ${48 + Math.round(r() * 28)}% ${Math.round(L * 0.6 + 32)}%)`, `hsl(${ih} ${52 + Math.round(r() * 26)}% ${Math.round(L * 0.45 + 16)}%)`],
    ink: `hsl(${ih} ${56 + Math.round(r() * 24)}% ${11 + Math.round(r() * 8)}%)`,
    light: `hsl(${(h + 20) % 360} ${62 + Math.round(r() * 28)}% ${72 + Math.round(r() * 16)}%)`,
    type: '#fdf6ec', fade: `hsl(${ih} 52% 10%)`,
  }; },
  // warm above, warmer below, the sun going down behind whatever it is
  sunset: (h, sat, L, lh, r) => { const wh = 18 + r() * 34; return {
    sky: [`hsl(${Math.round(wh + 18)} ${72 + Math.round(r() * 20)}% ${Math.round(L * 0.45 + 56)}%)`, `hsl(${Math.round(wh - 14 + 360) % 360} ${62 + Math.round(r() * 24)}% ${Math.round(L * 0.4 + 26)}%)`],
    ink: `hsl(${(h + 200) % 360} ${34 + Math.round(r() * 22)}% ${9 + Math.round(r() * 7)}%)`,
    light: `hsl(${Math.round(wh + 26)} ${86 + Math.round(r() * 12)}% ${80 + Math.round(r() * 12)}%)`,
    type: '#fff6e8', fade: `hsl(${Math.round(wh - 10 + 360) % 360} 50% 10%)`,
  }; },
  // dark, but the light in it is doing something nobody can look away from
  neon: (h, sat, L, lh, r) => { const nh = (lh + r() * 60 - 30 + 360) % 360; return {
    sky: [`hsl(${h} ${44 + Math.round(r() * 24)}% ${Math.max(7, Math.round(L * 0.3 + 8))}%)`, `hsl(${(h + 40) % 360} ${48 + Math.round(r() * 22)}% 6%)`],
    ink: `hsl(${h} ${40 + Math.round(r() * 20)}% 5%)`,
    light: `hsl(${nh} ${92 + Math.round(r() * 8)}% ${58 + Math.round(r() * 14)}%)`,
    type: '#f2ecff', fade: `hsl(${h} 44% 5%)`,
  }; },
};
// Which colour a genre is allowed to be. Comedy never gets `night` and horror never gets `high`.
const SCHEME_OF = {
  Comedy: ['flat', 'high', 'sunset', 'wash', 'duotone', 'flat', 'high'],
  Musical: ['flat', 'sunset', 'neon', 'high', 'duotone', 'flat'],
  Romance: ['high', 'wash', 'sunset', 'duotone', 'flat'],
  Drama: ['duotone', 'wash', 'flat', 'night', 'high', 'sunset'],
  'Sci-Fi': ['neon', 'duotone', 'flat', 'night', 'sunset'],
  Thriller: ['night', 'duotone', 'neon', 'flat'],
  Crime: ['night', 'duotone', 'flat', 'neon', 'sunset'],
  Horror: ['night', 'neon', 'duotone', 'flat', 'night'],
};
// `shift` turns the whole scheme round the wheel together — how a part two keeps its family's
// colour and is still not the same sheet (posterPlan).
export function palette(genre, r, shift = 0) {
  const [h0, spread] = HUE[genre] || HUE.Drama;
  const h = (Math.round(h0 + (r() - 0.5) * spread * 2) + shift + 360) % 360;
  const sat = 26 + Math.round(r() * 24);
  const [lo, span] = TONE[genre] || TONE.Drama;
  const L = lo + Math.round(r() * span) + (BRIGHT[genre] || 0);
  const lh = LIGHT_HUE[genre] ?? 40;
  const name = one(SCHEME_OF[genre] || SCHEME_OF.Drama, r);
  return { ...SCHEMES[name](h, sat, L, lh, r), scheme: name };
}

// ── which of them a genre is allowed ──────────────────────────────────────────
// The gate is the whole point. A musical does not get rain on a motorway and a horror film does
// not get three people in a sunbeam. Inside the gate the seed does as it likes.
export const G = {
  Drama: { back: ['room', 'horizon', 'hills', 'plain', 'stairs', 'bridge', 'arch', 'blocks', 'wires'], subj: ['figure', 'pair', 'chair', 'window', 'back', 'apart', 'profile'], lit: ['shaft', 'halo', 'pool', 'rim'], wx: ['none', 'fog', 'rain'] },
  Crime: { back: ['skyline', 'road', 'corridor', 'horizon', 'bridge', 'stairs', 'wires', 'blocks'], subj: ['figure', 'car', 'pair', 'looming', 'back', 'apart', 'profile'], lit: ['cone', 'pool', 'rim', 'none'], wx: ['rain', 'fog', 'none'] },
  Romance: { back: ['room', 'sea', 'hills', 'plain', 'bridge', 'moonrise', 'arch', 'sunburst'], subj: ['pair', 'window', 'figure', 'chair', 'apart', 'back', 'profile'], lit: ['sun', 'halo', 'shaft'], wx: ['snow', 'none', 'rain'] },
  Musical: { back: ['room', 'plain', 'skyline', 'horizon', 'stairs', 'crowd', 'sunburst', 'blocks', 'arch'], subj: ['three', 'figure', 'pair', 'chair', 'back', 'group'], lit: ['cone', 'pool', 'halo', 'sun'], wx: ['none', 'stars', 'snow'] },
  Thriller: { back: ['corridor', 'road', 'room', 'skyline', 'stairs', 'bridge', 'wires', 'blocks'], subj: ['figure', 'door', 'looming', 'car', 'back', 'hand', 'fall', 'profile'], lit: ['shaft', 'rim', 'none', 'cone'], wx: ['rain', 'fog', 'none'] },
  'Sci-Fi': { back: ['grid', 'horizon', 'hills', 'plain', 'moonrise', 'crowd', 'arch', 'blocks'], subj: ['orb', 'figure', 'looming', 'none', 'back', 'fall', 'profile'], lit: ['halo', 'rim', 'sun'], wx: ['stars', 'scan', 'none'] },
  Comedy: { back: ['room', 'hills', 'plain', 'skyline', 'sea', 'crowd', 'stairs', 'sunburst', 'blocks', 'arch'], subj: ['three', 'pair', 'figure', 'car', 'apart', 'group'], lit: ['sun', 'halo', 'pool', 'shaft'], wx: ['none', 'snow', 'rain'] },
  Horror: { back: ['trees', 'room', 'corridor', 'plain', 'moonrise', 'stairs', 'wires', 'arch'], subj: ['door', 'looming', 'figure', 'window', 'back', 'hand', 'fall', 'profile'], lit: ['none', 'shaft', 'pool'], wx: ['fog', 'rain', 'none'] },
};
// For anybody counting: how many different STRUCTURES a genre can produce — composition, motif
// and colour scheme. The old count multiplied every layer and reached thousands, and every one of
// them was the same layout; a count of layers is not a count of posters. (G.subj is the old
// subject list and is no longer drawn; it stays because old probes read it.)
export function posterCount(genre) {
  const comps = Object.keys(GENRE_T[genre] || GENRE_T.Drama).length;
  const motifs = new Set(MOTIF[genre] || MOTIF.Drama).size;
  const schemes = new Set(SCHEME_OF[genre] || SCHEME_OF.Drama).size;
  return comps * motifs * schemes;
}

// What a given picture is actually coloured, without drawing it. The probe measures brightness
// and spread through this rather than re-deriving the seed, which would be a second source of
// truth and would be wrong the first time anybody touched the hash.
export function posterPalette(title, genre) {
  return posterPlan({ title, genre }).c;
}

// ── Posters V2: what the one-sheet is OF, before anything is drawn ─────────────
// Maxi's filmography, measured (docs: the poster audit, 14 Oct 2026): every sheet was the same
// LAYOUT — a field, a backdrop across the bottom, a figure in the middle, the title at the foot —
// so the tens of thousands of layer combinations all read as one thing at forty-four pixels. Five
// of six comedy subjects were the same round-headed body. The generator knew a title and a genre
// and nothing else, so a tentpole looked like an indie, and a part two was seeded off its own
// title and had nothing in common with part one.
//
// So a poster is planned first, from everything the credit knows: the franchise it belongs to,
// which part, what format (film, series, soap, an advert, a festival picture), how big it is, and
// the genre. The plan picks a COMPOSITION — fourteen of them, each a different structure with its
// own place for the title — and a motif. Poster.jsx draws the plan. Everything here is plain .js
// so the tests can read it.
const ROMAN_N = { II: 2, III: 3, IV: 4, V: 5, VI: 6 };
export function titleParts(title) {
  let t = String(title || '').replace(/^⭐\s*/, '').trim();
  const sm = t.match(/season\s+(\d+)\s*$/i);
  const season = sm ? Number(sm[1]) : 0;
  t = t.replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();
  let part = 1;
  const rm = t.match(/\s+(II|III|IV|V|VI)$/);
  if (rm) { part = ROMAN_N[rm[1]]; t = t.replace(/\s+(II|III|IV|V|VI)$/, '').trim(); } else {
    const pm = t.match(/\s*(?:·|:)?\s*part\s+(\d+)\s*$/i);
    if (pm) { part = Number(pm[1]); t = t.replace(/\s*(?:·|:)?\s*part\s+(\d+)\s*$/i, '').trim(); }
  }
  return { root: t, part, season };
}
// What kind of thing it is. Read off the type the game writes, with the scale as a fallback.
export function formatOf(type, scale) {
  const ty = String(type || '');
  if (/Brand|Commercial|Jingle|Campaign|Music Video|Session|Voice/.test(ty)) return 'ad';
  if (/Soap/.test(ty)) return 'soap';
  if (/Series|Show|Network Drama|Drama Series|Talent/.test(ty) || ['episode', 'recurring', 'prestige'].includes(scale)) return 'series';
  if (scale === 'festival' || /Festival/.test(ty)) return 'festival';
  return 'film';
}
// How big. The scale when the credit has one; old credits and offers fall back on the type.
export function tierOf(type, scale) {
  const ty = String(type || '');
  if (scale === 'blockbuster' || /Blockbuster/.test(ty)) return 'event';
  if (scale === 'feature') return 'studio';
  if (['indie', 'small', 'festival'].includes(scale) || /Indie|Short|Festival|Horror Movie/.test(ty)) return 'small';
  return 'studio';
}
export const COMPOSITIONS = ['hero', 'faceoff', 'ensemble', 'symbol', 'vista', 'closeup', 'corridor', 'split', 'stage', 'skyline', 'action', 'type', 'panels', 'product'];
// Which structures a genre reaches for, and how often. Not colour: a horror sheet is an object in
// the dark or a corridor, a romance is two people or a horizon, a musical is a stage.
export const GENRE_T = {
  Comedy: { ensemble: 4, hero: 2, stage: 2, type: 2, faceoff: 2, split: 2, vista: 1 },
  Musical: { stage: 5, ensemble: 3, hero: 2, symbol: 2, type: 1, action: 1 },
  Romance: { faceoff: 4, split: 3, vista: 3, symbol: 2, closeup: 2, hero: 1 },
  Drama: { closeup: 3, vista: 3, symbol: 2, hero: 2, type: 2, split: 2, corridor: 1 },
  Thriller: { corridor: 3, closeup: 3, symbol: 2, split: 2, action: 2, skyline: 1, hero: 1 },
  Crime: { skyline: 3, faceoff: 2, corridor: 2, symbol: 2, closeup: 2, split: 2, hero: 1 },
  Horror: { symbol: 4, corridor: 3, closeup: 2, vista: 2, type: 1, hero: 1 },
  'Sci-Fi': { action: 3, vista: 3, symbol: 2, skyline: 2, closeup: 2, hero: 2 },
};
// Size changes the structure, not only the polish: a small picture is sold on a mood or an
// object, a tentpole on spectacle and a face.
export const TIER_T = {
  small: { symbol: 1.8, type: 2, vista: 1.5, closeup: 1.3, action: 0, skyline: 0.4, ensemble: 0.6, stage: 0.8, hero: 0.7 },
  studio: { type: 0.5 },
  event: { action: 2.5, hero: 1.8, skyline: 1.6, faceoff: 1.3, ensemble: 1.2, type: 0, symbol: 0.4, vista: 0.7, corridor: 0.6 },
};
// What a format adds or takes away. Television is people more than objects; a soap is the
// cast in panels; an advert is the product and nothing else.
export const FORMAT_T = {
  series: { add: { panels: 3 }, mul: { ensemble: 2, skyline: 1.3, type: 0.5, action: 0.6 } },
  soap: { add: { panels: 6, ensemble: 2 }, mul: { ensemble: 1.5, faceoff: 1.2, symbol: 0.3, vista: 0.3, corridor: 0.3, type: 0.3, closeup: 0.5, split: 0.6, hero: 0.6 } },
  ad: { only: 'product' },
};
// The object a sheet can be built around, by genre. One bold shape each, so it reads at 44px.
export const MOTIF = {
  Comedy: ['balloon', 'umbrella', 'car', 'cake'],
  Musical: ['mic', 'star', 'note', 'mic'],
  Romance: ['ring', 'flowers', 'heart', 'letter'],
  Drama: ['chair', 'window', 'house', 'letter'],
  Thriller: ['knife', 'eye', 'key', 'phone'],
  Crime: ['car', 'badge', 'key', 'knife'],
  Horror: ['moon', 'house', 'hand', 'mask'],
  'Sci-Fi': ['planet', 'ring', 'helmet', 'planet'],
};
const PRODUCTS = ['bottle', 'box', 'phone', 'watch'];
// A part three escalates — the composition moves to the next thing up, the way a franchise's
// third sheet is a bigger gesture than its first.
const ESCALATE = { hero: 'action', faceoff: 'closeup', ensemble: 'hero', symbol: 'closeup', vista: 'hero', closeup: 'symbol',
  corridor: 'closeup', split: 'faceoff', stage: 'ensemble', skyline: 'action', action: 'closeup', type: 'symbol', panels: 'ensemble', product: 'product' };
// How wide an uppercase display title is, per character at size 1, with the .04em spacing the
// sheet sets it in. Used to fit a title to the sheet instead of guessing from its length.
export const GLYPH = 0.74;
export function fitTitle(words, base, width = 88) {
  const all = words.join(' ');
  if (all.length * GLYPH * base <= width || words.length < 2) return { lines: [all], size: Math.max(5, Math.min(base, width / (Math.max(1, all.length) * GLYPH))) };
  let best = null;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
    const m = Math.max(a.length, b.length);
    if (!best || m < best.m) best = { a, b, m };
  }
  return { lines: [best.a, best.b], size: Math.max(5, Math.min(base * 0.88, width / (best.m * GLYPH))) };
}
// The title stacked a word to a line, as large as the sheet allows — the typographic poster.
// `height` is the room the stack has; a festival sheet keeps the foot for its laurels.
export function stackTitle(words, maxLines = 5, height = 80) {
  const lines = words.length <= maxLines ? [...words] : [...words.slice(0, maxLines - 1), words.slice(maxLines - 1).join(' ')];
  const longest = Math.max(1, ...lines.map((l) => l.length));
  return { lines, size: Math.min(20, 76 / (longest * GLYPH), height / (lines.length * 1.02)) };
}
export function pickWeighted(weights, r) {
  const ks = Object.keys(weights).filter((k) => weights[k] > 0);
  const total = ks.reduce((n, k) => n + weights[k], 0);
  let x = r() * total;
  for (const k of ks) { x -= weights[k]; if (x < 0) return k; }
  return ks[ks.length - 1];
}
export function compositionWeights(genre, tier, format) {
  if (FORMAT_T[format] && FORMAT_T[format].only) return { [FORMAT_T[format].only]: 1 };
  const base = { ...(GENRE_T[genre] || GENRE_T.Drama) };
  const f = FORMAT_T[format] || {};
  for (const [k, v] of Object.entries(f.add || {})) base[k] = (base[k] || 0) + v;
  const tierMul = TIER_T[tier] || {};
  const out = {};
  for (const [k, v] of Object.entries(base)) out[k] = v * (tierMul[k] ?? 1) * ((f.mul || {})[k] ?? 1);
  return out;
}
// The plan. Seeded by the FRANCHISE (its root title and genre), so every part draws the same
// family — palette, composition, motif — and the part number turns it: a part two is mirrored and
// its colour moved round the wheel a little, a part three escalates to a bigger composition.
export function posterPlan({ title, genre, type, scale } = {}) {
  const { root, part, season } = titleParts(title);
  const format = formatOf(type, scale);
  const tier = format === 'festival' ? 'small' : tierOf(type, scale);
  const r = rng(hash(root + (genre || '')));
  const shift = part <= 1 ? 0 : part === 2 ? 40 : part === 3 ? -36 : (part * 37) % 90;
  const c = palette(genre, r, shift);
  // On a dark sheet the hue of the ground barely shows; the light is what the eye finds (the eyes,
  // the open door). A part two takes its light from another turn of the same family, so Hive of
  // Sisters II is not Hive of Sisters with a numeral on it.
  if (part === 2) c.light = palette(genre, rng(hash(root + (genre || '') + '·II')), shift + 150).light;
  let composition = pickWeighted(compositionWeights(genre, tier, format), r);
  const motif = format === 'ad' ? one(PRODUCTS, r) : one(MOTIF[genre] || MOTIF.Drama, r);
  const base = composition;
  if (part >= 3 && part % 2 === 1) composition = ESCALATE[composition] || composition;
  const mirror = part % 2 === 0 && composition !== 'type' && composition !== 'product';
  return { root, part, season, format, tier, genre: genre || 'Drama', composition, base, motif, mirror, c, r };
}

// How many one-sheets a genre can produce, before the hue and the dozen seeded positions
// inside each layer are counted at all. G lives with the drawing, so it is passed in.
