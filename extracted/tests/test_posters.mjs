// Are the posters still all the same dark rectangle.
//
// Maxi, looking at a filmography: "постеры ужасные, все темные, все какие-то одинаковые, на
// комедию такое не делают". He was right, and the count was never the problem — there were
// nearly three thousand combinations of backdrop, subject, light and weather, and every one of
// them ended at 5% lightness with its shapes drawn at 7%. Black on black, in every genre. The
// genre moved the TOP of the gradient, which in a 44-pixel thumbnail is behind the figure.
//
// So this measures the thing he was complaining about rather than the thing that was easy to
// count: how BRIGHT a genre's posters are, and how far apart two of them are from each other.
// It reads the real palette through posterPalette, not a copy of the seeding — a copy would be
// a second source of truth and would be wrong the first time anybody touched the hash.
import { posterPalette, posterCount } from '../src/ui/components/poster-spec.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

const GENRES = ['Comedy', 'Musical', 'Romance', 'Drama', 'Sci-Fi', 'Thriller', 'Crime', 'Horror'];
const WORDS = ['Buried', 'Hunger', 'Midnight', 'Small', 'Weddings', 'Signal', 'Winter', 'Sisters',
  'Liars', 'Glass', 'House', 'Long', 'Way', 'Down', 'Paper', 'Moon', 'Last', 'Train', 'Home',
  'Quiet', 'Year', 'Salt', 'Water', 'Eleven', 'Letters', 'Red', 'Room', 'Other', 'People'];
const titles = (n) => Array.from({ length: n }, (_, i) => {
  const a = WORDS[(i * 7) % WORDS.length], b = WORDS[(i * 13 + 3) % WORDS.length], c = WORDS[(i * 5 + 11) % WORDS.length];
  return i % 3 === 0 ? `${a} ${b}` : i % 3 === 1 ? `The ${b} ${c}` : `${c} ${a} ${b}`;
});

// hsl(h s% l%) -> l
const L = (css) => Number((String(css).match(/([\d.]+)%\)$/) || [])[1] || 0);
const H = (css) => Number((String(css).match(/hsl\((-?[\d.]+)/) || [])[1] || 0);

const sample = {};
for (const g of GENRES) {
  const rows = titles(400).map((t) => posterPalette(t, g));
  sample[g] = {
    ground: rows.map((p) => L(p.sky[0])),
    foot: rows.map((p) => L(p.sky[1])),
    ink: rows.map((p) => L(p.ink)),
    schemes: new Set(rows.map((p) => p.scheme)),
    hues: new Set(rows.map((p) => Math.round(H(p.sky[0]) / 12))),
  };
}
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// ── the complaint itself: they are not all dark ───────────────────────────────
for (const g of ['Comedy', 'Musical', 'Romance']) {
  ok(`${g} posters are bright`, avg(sample[g].ground) > 50, `ground averages ${avg(sample[g].ground).toFixed(0)}%`);
}
ok('a horror poster is still nearly black', avg(sample.Horror.ground) < 40, `${avg(sample.Horror.ground).toFixed(0)}%`);
ok('and a comedy is nothing like a horror film', avg(sample.Comedy.ground) - avg(sample.Horror.ground) > 25,
  `${avg(sample.Comedy.ground).toFixed(0)}% vs ${avg(sample.Horror.ground).toFixed(0)}%`);

// ── the foot of the sheet is where it used to go black on every one of them ───
for (const g of ['Comedy', 'Musical', 'Romance', 'Drama']) {
  ok(`${g} does not fade to black at the bottom`, avg(sample[g].foot) > 28, `foot averages ${avg(sample[g].foot).toFixed(0)}%`);
}

// ── and the shapes in them are not all the same black ─────────────────────────
{
  const inks = GENRES.flatMap((g) => sample[g].ink);
  const coloured = inks.filter((l) => l > 12).length / inks.length;
  ok('most shapes are drawn in a colour rather than in black', coloured > 0.4, `${Math.round(coloured * 100)}% above 12% lightness`);
}

// ── two films in the same genre look different from each other ────────────────
for (const g of GENRES) {
  ok(`${g} draws on more than one colour scheme`, sample[g].schemes.size >= 3,
    [...sample[g].schemes].join(', '));
}
{
  const spread = GENRES.map((g) => {
    const v = sample[g].ground;
    const m = avg(v);
    return Math.sqrt(avg(v.map((x) => (x - m) ** 2)));
  });
  ok('two pictures in one genre are not the same brightness', Math.min(...spread) > 5,
    `tightest genre varies by ${Math.min(...spread).toFixed(1)} points`);
}

// ── and there are a lot of them ───────────────────────────────────────────────
{
  const counts = GENRES.map((g) => posterCount(g));
  ok('every genre can draw at least a thousand different one-sheets', Math.min(...counts) >= 1000,
    `smallest is ${Math.min(...counts)}`);
  console.log('      one-sheets per genre: ' + GENRES.map((g, i) => `${g} ${counts[i]}`).join(' · '));
  console.log('      total: ' + counts.reduce((a, b) => a + b, 0));
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
