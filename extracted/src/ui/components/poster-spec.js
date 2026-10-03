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
export function palette(genre, r) {
  const [h0, spread] = HUE[genre] || HUE.Drama;
  const h = Math.round(h0 + (r() - 0.5) * spread * 2);
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
// For anybody counting: how many one-sheets a genre can actually produce, before the hue and the
// dozen seeded positions inside each layer are counted at all. The scheme belongs in the count —
// it is the layer that decides whether a picture is bright or dark, which is the first thing
// anybody sees and the thing that used to be the same on all of them.
export function posterCount(genre) {
  const g = G[genre] || G.Drama;
  const schemes = new Set(SCHEME_OF[genre] || SCHEME_OF.Drama).size;
  return g.back.length * g.subj.length * g.lit.length * g.wx.length * schemes;
}

// What a given picture is actually coloured, without drawing it. The probe measures brightness
// and spread through this rather than re-deriving the seed, which would be a second source of
// truth and would be wrong the first time anybody touched the hash.
export function posterPalette(title, genre) {
  const r = rng(hash(String(title || '') + (genre || '')));
  return palette(genre, r);
}

// How many one-sheets a genre can produce, before the hue and the dozen seeded positions
// inside each layer are counted at all. G lives with the drawing, so it is passed in.
