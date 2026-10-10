// The colours a set is drawn in (OnSet.jsx SetVignette), taken from the picture's poster and then
// made fit to stand on. A poster is allowed to be nearly white — a comedy or a musical often is
// (poster-spec.js schemes `high` and `wash`) — or nearly black (`neon`, `night`). Drawn literally,
// the first made a musical's stage almost white behind the light, the tape mark and the camera;
// the second would lose the camera in the dark. So every set keeps its poster's hue and is held
// inside one band of brightness, the same band for every genre and every film. Nothing here knows
// a title.
//
// Plain .js so node can measure it: tests/test_sets.mjs runs it across hundreds of posters.
import { posterPalette } from './poster-spec.js';

// Relative luminance (WCAG), 0 black .. 1 white: what the eye reads as bright. HSL lightness is
// not it — a yellow and a blue at the same L are nowhere near each other.
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
export function hslToRgb(h, s, l) {
  s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}
export function parseColour(c) {
  const s = String(c || '').trim();
  let m = /^hsl\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/.exec(s);
  if (m) return { h: +m[1], s: +m[2], l: +m[3] };
  m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (!m) return null;
  const x = m[1].length === 3 ? m[1].split('').map((d) => d + d).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const h = d === 0 ? 0 : mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return { h: (h + 360) % 360, s: sat * 100, l: l * 100 };
}
export function luminance(c) {
  const p = typeof c === 'string' ? parseColour(c) : c; if (!p) return 0;
  const [r, g, b] = hslToRgb(p.h, p.s, p.l);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// The band. The backdrop never brighter than a dim set and never so dark the camera vanishes
// into it; the silhouettes always darker than what stands behind them; the light always bright
// enough to read as light.
export const SET_BAND = { top: [0.03, 0.11], bottom: [0.012, 0.05], ink: [0.002, 0.02], light: 0.4 };
const fmt = (p) => `hsl(${Math.round(p.h)} ${Math.round(p.s)}% ${Math.round(p.l)}%)`;
// Same hue; lightness walked until the luminance is inside [lo, hi]. A pale colour taken down
// that way goes to mud — a pastel at a third of its lightness is brown-grey — so as it darkens
// it is given back some of the colour it had (a grey stays grey).
function hold(c, lo, hi) {
  const p = parseColour(c); if (!p) return c;
  const q = { ...p };
  for (let i = 0; i < 101 && luminance(q) > hi && q.l > 0; i++) {
    q.l = Math.max(0, q.l - 1);
    if (p.s > 8 && p.s < 82) q.s = Math.min(82, p.s + (p.l - q.l) * 0.6);
  }
  for (let i = 0; i < 101 && luminance(q) < lo && q.l < 100; i++) q.l = Math.min(100, q.l + 1);
  return q.l === p.l ? c : fmt(q);
}
const memo = new Map();
export function setPalette(title, genre) {
  const key = String(title || '') + '|' + (genre || '');
  if (memo.has(key)) return memo.get(key);
  const pal = posterPalette(title, genre);
  const top = hold(pal.sky[0], ...SET_BAND.top);
  const bottom = hold(pal.sky[1], ...SET_BAND.bottom);
  const ink = hold(pal.ink, SET_BAND.ink[0], Math.min(SET_BAND.ink[1], luminance(bottom) * 0.7));
  const light = hold(pal.light, SET_BAND.light, 1);
  const out = { sky: [top, bottom], ink, light, scheme: pal.scheme, poster: pal };
  if (memo.size > 200) memo.clear();
  memo.set(key, out);
  return out;
}
