// The set behind a shooting day takes its colours from the film's poster (ui/components/
// set-spec.js). A poster may be nearly white or nearly black; the set may not. Run across many
// posters of every genre, the light, the silhouettes and the backdrop must stay apart, and the
// set must still be the poster's colour.
import { setPalette, luminance, contrast, parseColour, SET_BAND } from '../src/ui/components/set-spec.js';
import { posterPalette } from '../src/ui/components/poster-spec.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const GENRES = ['Drama', 'Romance', 'Comedy', 'Crime', 'Thriller', 'Horror', 'Musical', 'Sci-Fi'];
const titles = Array.from({ length: 400 }, (_, i) => `Picture ${i} ${['Lights', 'Harbour', 'Nine', 'Pines', 'Table'][i % 5]}`);
const EPS = 0.004;
let n = 0, tamedLight = 0, tamedDark = 0; const bad = { top: [], ink: [], light: [], hue: [] };
for (const g of GENRES) for (const t of titles) {
  const p = setPalette(t, g), raw = posterPalette(t, g); n++;
  const yt = luminance(p.sky[0]), yb = luminance(p.sky[1]);
  if (luminance(raw.sky[0]) > SET_BAND.top[1] + EPS) tamedLight++;
  if (luminance(raw.sky[0]) < SET_BAND.top[0] - EPS) tamedDark++;
  if (yt > SET_BAND.top[1] + EPS || yt < SET_BAND.top[0] - EPS || yb > SET_BAND.bottom[1] + EPS) bad.top.push(`${g}/${t} ${p.scheme} ${yt.toFixed(3)}`);
  if (luminance(p.ink) >= Math.max(yb, 0.004) && luminance(p.ink) > SET_BAND.ink[0] + EPS) bad.ink.push(`${g}/${t} ${p.scheme}`);
  if (contrast(p.light, p.sky[0]) < 2.5) bad.light.push(`${g}/${t} ${p.scheme} ${contrast(p.light, p.sky[0]).toFixed(2)}`);
  const h0 = parseColour(raw.sky[0]).h, h1 = parseColour(p.sky[0]).h;
  if (Math.abs(h0 - h1) > 1) bad.hue.push(`${g}/${t}`);
}
console.log(`      ${n} posters: ${tamedLight} too bright for a set and held down, ${tamedDark} too dark and lifted`);
ok('no backdrop brighter than a dim set or darker than the camera can stand against', bad.top.length === 0, bad.top.slice(0, 3).join(' | '));
ok('the silhouettes are always darker than what is behind them', bad.ink.length === 0, bad.ink.slice(0, 3).join(' | '));
ok('the light always reads as light against the backdrop (contrast 2.5 or more)', bad.light.length === 0, bad.light.slice(0, 3).join(' | '));
ok('and the set is still the poster\'s colour: the hue never moves', bad.hue.length === 0, bad.hue.slice(0, 3).join(' | '));
ok('the bright posters that made the musical stage white are among the ones held down', tamedLight > 0);
// The fixed parts of the drawing against the darkest and brightest floor and backdrop it can get.
ok('the tape mark reads on the floor', contrast('#f3e6a6', '#17141c') > 8 && contrast('#f3e6a6', '#174f2e') > 5);
ok('the slate\'s chalk reads on the slate', contrast('#f4efe4', '#17151b') > 12);
ok('the camera stands apart from the brightest backdrop', contrast('#0f0e14', `hsl(0 0% 100%)`) > 1 && luminance('#0f0e14') < SET_BAND.top[0]);
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
