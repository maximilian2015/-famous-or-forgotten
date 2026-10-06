// Two stories that have to be true at the same time.
//
// One range of legs for every scale forced a choice between them. Compressed until a billion was
// rare, a feature rated 8.8 became a smash zero times in twenty thousand. Left where it was, a
// billion was the ordinary result of a tentpole — a star's blockbuster had a median gross of
// €941m and 48% of them passed €1bn, against about one tentpole in fifteen in the business.
//
// They are not the same story and they never were. A tentpole opens enormous and saturates:
// everybody who was ever going to see it went in the first fortnight and there is nobody left to
// tell. A small picture opens on nothing and is carried by people telling each other, which is
// the only way it was ever going to reach anybody.
//
// These two cases are what a candidate curve had to satisfy together, and they are kept here
// because every attempt so far has fixed one by breaking the other.
import { legsFor, wordFor, breakEvenFor, demandFor, openingFor, expansionFor, verdictOf } from '../src/systems/career/release.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

const gross = (s, rel) => openingFor(s, rel, demandFor(s, rel)) * legsFor(rel) * expansionFor(rel) * 1e6;
const q = (a, p) => a[Math.floor(a.length * p)];
const M = (n) => (n >= 1e9 ? '€' + (n / 1e9).toFixed(3) + 'bn' : '€' + Math.round(n / 1e6) + 'm');

// ── a smaller picture is carried further than a tentpole ─────────────────────
{
  const legs = (scale, w) => { let t = 0; for (let i = 0; i < 8000; i++) t += legsFor({ scale, rating: w, reception: w }); return t / 8000; };
  for (const w of [67, 80, 91]) {
    const i = legs('indie', w), f = legs('feature', w), b = legs('blockbuster', w);
    ok(`at word ${w}, an indie runs longer than a feature, and a feature longer than a tentpole`,
      i > f && f > b, `${i.toFixed(2)} / ${f.toFixed(2)} / ${b.toFixed(2)}`);
  }
  // And word of mouth is still worth having, most of all to the small ones. If this ever
  // flattens, the compression went too far and the crowd stopped mattering.
  const lo = legs('indie', 45), hi = legs('indie', 91);
  ok('an indie people love runs more than twice as long as one they do not', hi / lo > 2.3, `${lo.toFixed(2)} → ${hi.toFixed(2)}`);
  const blo = legs('blockbuster', 45), bhi = legs('blockbuster', 91);
  ok('and a tentpole people love still runs meaningfully longer', bhi / blo > 2, `${blo.toFixed(2)} → ${bhi.toFixed(2)}`);
}

// ── CASE A: a feature nobody can stop talking about ──────────────────────────
// Rating 8.8, fame 70, a standard campaign. The smash line is twice its break-even, €365m. This
// is the case a single global range killed outright.
{
  const bar = breakEvenFor({ scale: 'feature', campaignTier: 'standard' }) * 2;
  const out = [];
  for (let i = 0; i < 20000; i++) {
    const s = { fame: 70, media: 15 + Math.random() * 20, hypeSource: null, year: 2066,
      month: Math.floor(Math.random() * 12), typecast: { scores: {}, active: [] }, acting: 70 };
    const rel = { scale: 'feature', genre: 'Drama', campaignTier: 'standard', part: 1, appealMod: 1,
      rating: 88, reception: 88, withFame: 0 };
    out.push(gross(s, rel));
  }
  out.sort((a, b) => a - b);
  const smash = out.filter((x) => x >= bar).length / out.length * 100;
  console.log(`      CASE A  feature 8.8 at fame 70, smash at ${M(bar)}: median ${M(q(out, 0.5))} · P90 ${M(q(out, 0.9))} · smash ${smash.toFixed(1)}%`);
  ok('a feature everybody loves has a real chance of being a smash', smash > 10, `${smash.toFixed(1)}%`);
  ok('and it is still a chance rather than a certainty', smash < 50, `${smash.toFixed(1)}%`);
}

// ── CASE B: Midnight Talker ──────────────────────────────────────────────────
// The picture this entire argument started from: a blockbuster on an event campaign, 7.7 from
// the column and 8.0 from the room, fronted by a name. It took €1.163bn and the card said SMASH
// and nothing else, and the complaint was that it did not feel like anything.
//
// Measured across how loud the month was, because the first version of this picked one hype
// level out of the air and asserted a rate against it. At media 0-35 a billion came out at 6%
// and at 25-45 it came out at 15% — the same film, the same curve, a different arbitrary
// number in the fixture. A threshold on a parameter nobody chose for a reason is not a test of
// anything, so what is asserted is what actually has to hold: it lands in the high hundreds of
// millions, a billion is never the ordinary result, and €1.163bn stays in the far tail.
{
  const run = (lo, hi) => {
    const out = [];
    for (let i = 0; i < 16000; i++) {
      const s = { fame: 92, media: lo + Math.random() * (hi - lo), hypeSource: null, year: 2066,
        month: Math.floor(Math.random() * 12), typecast: { scores: {}, active: [] }, acting: 75 };
      const rel = { scale: 'blockbuster', genre: 'Sci-Fi', campaignTier: 'event', part: 1, appealMod: 1,
        rating: 77, reception: 80, withFame: Math.random() < 0.35 ? 20 + Math.random() * 60 : 0 };
      out.push(gross(s, rel));
    }
    out.sort((a, b) => a - b);
    return { out, bn: out.filter((x) => x >= 1e9).length / out.length * 100,
      above: out.filter((x) => x >= 1163e6).length / out.length * 100 };
  };
  const quiet = run(0, 15), usual = run(0, 35), loud = run(30, 50);
  for (const [name, r] of [['a quiet month', quiet], ['an ordinary one', usual], ['a loud one', loud]]) {
    console.log(`      CASE B  Midnight Talker, ${name.padEnd(16)} median ${M(q(r.out, 0.5))} · P90 ${M(q(r.out, 0.9))} · past €1bn ${r.bn.toFixed(1)}% · €1.163bn is the top ${r.above.toFixed(2)}%`);
  }
  ok('a tentpole like this lands in the high hundreds of millions', q(usual.out, 0.5) > 550e6 && q(usual.out, 0.5) < 950e6, M(q(usual.out, 0.5)));
  ok('a billion is never the ordinary result, however loud the month', loud.bn < 30, `${loud.bn.toFixed(1)}% at full hype`);
  ok('and it is genuinely rare when nobody is talking', quiet.bn < 6, `${quiet.bn.toFixed(1)}%`);
  ok('€1.163bn is an extreme result even at full hype', loud.above < 8, `top ${loud.above.toFixed(2)}%`);
  ok('but it is reachable at all', usual.above > 0, `top ${usual.above.toFixed(2)}%`);
  ok('and being talked about is worth something', loud.bn > quiet.bn * 1.5, `${quiet.bn.toFixed(1)}% → ${loud.bn.toFixed(1)}%`);
}
// ── and the commercial ladder was not touched ────────────────────────────────
// The fix for "a billion is only profitable" is a separate milestone on top, not a fifth verdict
// and not a lower bar. Nothing here may have moved it.
{
  const bar = breakEvenFor({ scale: 'feature', campaignTier: 'standard' });
  const V = (x) => verdictOf({ scale: 'feature', campaignTier: 'standard', rating: 70, boxOffice: x, type: 'Feature Film' });
  ok('under the bar is still a bomb', V(bar * 0.6) === 'bomb');
  ok('around it is still breaking even', V(bar * 0.9) === 'broke even');
  ok('well over is still profitable', V(bar * 1.4) === 'profitable');
  ok('twice over is still a smash', V(bar * 2.2) === 'smash');
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
