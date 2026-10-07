// What the business is starting to think, and when that is worth saying at all.
//
// Maxi, on a screen showing "Television actor 57%" for a man with two billion-euro theatrical
// pictures: this is not what the game thinks of him. It was not — `tendency` returned the
// highest INACTIVE typecast score whatever it was, and the Passport drew it above the label he
// actually carried, under a heading that said "Public image". Three separate mistakes making
// one wrong sentence.
import { tendency, typecastBump, activeLabels, ACTIVE_AT } from '../src/systems/meta/typecast.js';
import fs from 'fs';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = () => ({ year: 2066, month: 4, fame: 85, respect: 55, timeline: [], filmography: [] });

// A career of blockbusters with an old television score behind it: the exact case.
{
  const s = st();
  typecastBump(s, 'commercial', 6);     // two tentpoles and then some — a settled label
  typecastBump(s, 'tv', 1.7);           // a series, a while ago, fading half a point a year
  ok('the label he has is the commercial one', activeLabels(s).includes('commercial'));
  ok('and nothing claims he is becoming a television actor', tendency(s) === null,
    tendency(s) ? tendency(s).label + ' ' + tendency(s).score : '');
}
// But a career that genuinely is turning is still told so.
{
  const s = st();
  typecastBump(s, 'commercial', 3.5);
  typecastBump(s, 'tv', 2.5);
  const t = tendency(s);
  ok('a real turn is reported', !!t && t.id === 'tv', t ? t.id : 'nothing');
  ok('and it is reported as not having happened yet', !!t && /way to being called/.test(t.line), t ? t.line : '');
  ok('and one more part would do it', !!t && t.need - t.score <= 1, t ? String(t.need - t.score) : '');
}
// One point out of three is a guest spot, not a trend.
{
  const s = st();
  typecastBump(s, 'villain', 1);
  ok('one of three says nothing', tendency(s) === null);
  typecastBump(s, 'villain', 1);
  ok('two of three does', (tendency(s) || {}).id === 'villain', String(ACTIVE_AT));
}
// A nobody with one kind of part is still shown the meter — it is the warning that matters most
// to somebody who could still choose otherwise.
{
  const s = st();
  typecastBump(s, 'romantic', 2);
  ok('with no label at all the meter still shows', (tendency(s) || {}).id === 'romantic');
}

// ── and the screen ──────────────────────────────────────────────────────────
// The heading was the loudest part of the error: a casting box called an image.
{
  const ui = fs.readFileSync(new URL('../src/ui/components/Passport.jsx', import.meta.url), 'utf8');
  ok('the section is named for what it is', /head\('Industry typecast'\)/.test(ui));
  ok('and no longer calls itself an image', !/head\('Public image'\)/.test(ui));
  // Order on the page: what you ARE, then what may stick.
  const sec = ui.slice(ui.indexOf("head('Industry typecast')"), ui.indexOf("head('Money')"));
  ok('what you are is drawn before what may stick', sec.indexOf('activeLabels(g).map') < sec.indexOf('tendency(g)'),
    `${sec.indexOf('activeLabels(g).map')} vs ${sec.indexOf('tendency(g)')}`);
  ok('and the footnote says it is only that', /What may stick next/.test(sec));
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
