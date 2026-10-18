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
import { posterPalette, posterCount, posterPlan, fitTitle, stackTitle, GLYPH } from '../src/ui/components/poster-spec.js';

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

// ── Posters V2: structure, not layers ─────────────────────────────────────────
// The old count multiplied layers into the thousands and every one of them was the same layout.
// What Maxi asked for is checked instead: ten in a row look different in STRUCTURE, the genre
// reads in more than colour, a tentpole is not an indie, a sequel is family and not a clone, an
// advert and a soap are their own kind of sheet, and the title fits.
{
  const counts = GENRES.map((g) => posterCount(g));
  console.log('      structures per genre (composition × motif × scheme): ' + GENRES.map((g, i) => `${g} ${counts[i]}`).join(' · '));
  // A filmography as it really comes: mixed genres and sizes, in order.
  const KINDS = [['Feature Film', 'feature'], ['Feature Film', 'indie'], ['Blockbuster', 'blockbuster'], ['Drama Series', 'recurring']];
  const run = titles(200).map((t, i) => posterPlan({ title: t, genre: GENRES[(i * 3) % GENRES.length], type: KINDS[i % 4][0], scale: KINDS[i % 4][1] }).composition);
  let worst = 99;
  for (let i = 0; i + 10 <= run.length; i++) worst = Math.min(worst, new Set(run.slice(i, i + 10)).size);
  ok('any ten in a row use at least five different compositions', worst >= 5, `worst window: ${worst}`);
  for (const g of GENRES) {
    const used = new Set(titles(300).map((t) => posterPlan({ title: t, genre: g, type: 'Feature Film', scale: 'feature' }).composition));
    ok(`${g} reaches at least five compositions`, used.size >= 5, [...used].join(','));
  }
  // The genre is in the structure: a horror sheet is mostly an object or a corridor, a romance mostly two people.
  const share = (g, set, scale = 'feature') => titles(400).filter((t) => set.includes(posterPlan({ title: t, genre: g, type: 'Feature Film', scale }).composition)).length / 400;
  ok('horror is an object, a corridor or a face in the dark', share('Horror', ['symbol', 'corridor', 'closeup']) > 0.6, share('Horror', ['symbol', 'corridor', 'closeup']).toFixed(2));
  ok('romance is two people or a horizon', share('Romance', ['faceoff', 'split', 'vista']) > 0.6, share('Romance', ['faceoff', 'split', 'vista']).toFixed(2));
  ok('a musical is mostly a stage or a company', share('Musical', ['stage', 'ensemble']) > 0.5, share('Musical', ['stage', 'ensemble']).toFixed(2));
  ok('a comedy is no longer five little people in six', share('Comedy', ['ensemble']) < 0.4, share('Comedy', ['ensemble']).toFixed(2));
  // Size changes the structure.
  const tent = titles(400).map((t) => posterPlan({ title: t, genre: 'Thriller', type: 'Blockbuster', scale: 'blockbuster' }));
  const small = titles(400).map((t) => posterPlan({ title: t, genre: 'Thriller', type: 'Feature Film', scale: 'indie' }));
  const pc = (list, set) => list.filter((p) => set.includes(p.composition)).length / list.length;
  ok('a tentpole is sold on spectacle', pc(tent, ['action', 'hero', 'skyline', 'faceoff']) > pc(small, ['action', 'hero', 'skyline', 'faceoff']) + 0.25,
    `${pc(tent, ['action', 'hero', 'skyline', 'faceoff']).toFixed(2)} vs ${pc(small, ['action', 'hero', 'skyline', 'faceoff']).toFixed(2)}`);
  ok('an indie on a mood or an object', pc(small, ['symbol', 'type', 'vista', 'closeup']) > pc(tent, ['symbol', 'type', 'vista', 'closeup']) + 0.25);
  ok('and a tentpole is never a typographic sheet', !tent.some((p) => p.composition === 'type'));
  // A franchise is a family.
  const one = posterPlan({ title: 'Light and Rain', genre: 'Musical', type: 'Blockbuster', scale: 'blockbuster' });
  const two = posterPlan({ title: 'Light and Rain II', genre: 'Musical', type: 'Blockbuster', scale: 'blockbuster' });
  const three = posterPlan({ title: 'Light and Rain III', genre: 'Musical', type: 'Blockbuster', scale: 'blockbuster' });
  ok('a part two is the same family: composition, motif and colour scheme', two.root === 'Light and Rain' && two.part === 2 && two.composition === one.composition && two.motif === one.motif && two.c.scheme === one.c.scheme);
  ok('and turned, not cloned: mirrored, closer, its colour moved', two.mirror && !one.mirror && two.c.sky[0] !== one.c.sky[0]);
  ok('a part three escalates', three.base === one.composition && three.part === 3, `${one.composition} -> ${three.composition}`);
  ok('"· Part 2" and a season suffix are read the same way', posterPlan({ title: 'Iron Harbour · Part 2', genre: 'Sci-Fi' }).part === 2
    && posterPlan({ title: 'Lost Signal · season 2 · season 3', genre: 'Drama', type: 'Drama Series' }).root === 'Lost Signal');
  // Formats.
  ok('an advert is the product', titles(50).every((t) => posterPlan({ title: t, genre: 'Comedy', type: 'Brand Campaign' }).composition === 'product'));
  const soaps = titles(200).map((t) => posterPlan({ title: t, genre: 'Drama', type: 'Soap Opera', scale: 'recurring' }).composition);
  ok('a soap is mostly its cast', soaps.filter((x) => x === 'panels' || x === 'ensemble').length / soaps.length > 0.5);
  ok('a festival picture is small', posterPlan({ title: 'Salt Season', genre: 'Drama', type: 'Festival Film', scale: 'festival' }).tier === 'small');
  // The title fits the sheet.
  for (const t of ['Light and Rain', 'A Voice Above Your Door', 'Nordhavn — a soft drink', 'Blue Roommate', 'Midnight Talker']) {
    const words = t.split(' ');
    for (const base of [13, 11.5, 10]) {
      const f = fitTitle(words, base);
      ok(`"${t}" fits at ${base}`, f.lines.every((l) => l.length * GLYPH * f.size <= 88.5), JSON.stringify(f));
    }
  }
  const st = stackTitle('A Voice Above Your Door'.split(' '));
  ok('a typographic sheet keeps every word', st.lines.join(' ') === 'A Voice Above Your Door', st.lines.join('|'));
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
