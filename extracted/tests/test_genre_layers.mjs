// The genre is counted once (the genre audit, 18 Oct 2026). It was counted three times: in the
// demand (APPEAL), again in the crowd (a table that liked horror and disliked drama), and a third
// time in the market, which judged every genre against the others and so held the most popular
// ones hot for decades. For the same film, horror took five times what a drama took.
//
// APPEAL is the one place left. The crowd judges the picture, and the market judges a genre
// against its own kind. Tentpoles keep the old crowd table and the old market track, on purpose
// and for now: the Billion Club was calibrated on them (tests/probes/probe_tentpoles.mjs). The
// last block here holds that exception so nobody forgets it is one.
import { audienceFor, legsFor, grossFor, genreResidual, TENTPOLE_CROWD } from '../src/systems/career/release.js';
import { marketOf, marketAfterRelease, marketYear, appetiteFor, GENRES, JUDGE } from '../src/systems/meta/market.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const fixed = (fn) => { const r = Math.random; Math.random = () => 0.5; try { return fn(); } finally { Math.random = r; } };
const G = ['Horror', 'Comedy', 'Thriller', 'Sci-Fi', 'Crime', 'Romance', 'Musical', 'Drama'];
const st = () => ({ fame: 50, acting: 60, typecast: { scores: {}, active: [] } });

// ── the crowd judges the picture ─────────────────────────────────────────────
{
  const score = (genre, scale = 'feature') => fixed(() => audienceFor(st(), { scale, genre, rating: 60 }));
  const feature = G.map((g) => score(g));
  ok('a feature people liked is liked the same whatever its genre', new Set(feature).size === 1, feature.join(' '));
  const indie = G.map((g) => score(g, 'indie'));
  ok('and an indie', new Set(indie).size === 1, indie.join(' '));
  // A drama the critics call a 6.0 is not scored as a picture nobody wanted.
  ok('a rating-6 drama is not scored under the line where a run collapses', score('Drama') >= 60, String(score('Drama')));
}
// ── no cliff in the run ──────────────────────────────────────────────────────
{
  const legs = (w) => fixed(() => legsFor({ scale: 'feature', rating: w, reception: w }));
  const a = legs(59.9), b = legs(60);
  ok('a point under sixty runs about as long as sixty', a / b > 0.98, `${a.toFixed(3)} / ${b.toFixed(3)}`);
  let up = true, prev = 0;
  for (let w = 30; w <= 95; w += 1) { const l = legs(w); if (l < prev - 1e-9) up = false; prev = l; }
  ok('and the run only ever grows with how the crowd took it', up);
  ok('a picture nobody wanted still burns out fast', legs(38) < legs(60) * 0.75, `${legs(38).toFixed(2)} vs ${legs(60).toFixed(2)}`);
}
// ── the market judges a genre against its own kind ───────────────────────────
{
  // An ordinary picture of every genre, priced by the world's arithmetic with every die in the
  // middle: whatever it took, it did exactly what its kind does.
  const res = G.map((genre) => fixed(() => {
    const gross = grossFor({ scale: 'feature', rating: 65, genre, fame: 40, trend: 1, budget: 40, campaignTier: 'standard' });
    return genreResidual({ scale: 'feature', genre, gross, budget: 40, appetite: 1, campaignTier: 'standard' });
  }));
  const lo = Math.min(...res), hi = Math.max(...res);
  ok('an ordinary picture is an ordinary picture in every genre, though horror took more', hi / lo < 1.06, res.map((x) => x.toFixed(2)).join(' '));
  const hot = fixed(() => genreResidual({ scale: 'feature', genre: 'Drama', gross: 2e8, budget: 40, appetite: 1.4 }));
  const cold = fixed(() => genreResidual({ scale: 'feature', genre: 'Drama', gross: 2e8, budget: 40, appetite: 0.7 }));
  ok('the same gross is less of a surprise in a market that already wanted it', hot < cold, `${hot.toFixed(2)} < ${cold.toFixed(2)}`);
}
{
  // A year in which the dramas beat what dramas do and the horror pictures fell short of what
  // horror does — though every horror picture still took more than any drama.
  const s = { market: null };
  fixed(() => {
    const m = marketOf(s);
    for (const g of GENRES) { m.trend[g] = 1; m.legacy[g] = 1; m.glut[g] = 1; }
    for (let i = 0; i < 4; i++) {
      marketAfterRelease(s, 'Drama', 'feature', 0.7, 0.35, 1, 1.3);
      marketAfterRelease(s, 'Horror', 'feature', 1.5, 0.35, 1, 0.8);
    }
    for (const g of GENRES) if (g !== 'Drama' && g !== 'Horror') for (let i = 0; i < 4; i++) marketAfterRelease(s, g, 'feature', 1, 0.35, 1, 1);
    marketYear(s);
  });
  const m = s.market;
  ok('drama heats by outdrawing dramas, though it took less than horror', m.trend.Drama > m.trend.Horror && m.trend.Drama > 1, `drama ${m.trend.Drama.toFixed(3)} · horror ${m.trend.Horror.toFixed(3)}`);
  ok('horror cools by falling short of horror', m.trend.Horror < 1, m.trend.Horror.toFixed(3));
}
{
  // Nothing stays hot on old history: a genre left alone goes back towards ordinary.
  const s = { market: null };
  fixed(() => {
    const m = marketOf(s);
    for (const g of GENRES) { m.trend[g] = 1; m.legacy[g] = 1; m.glut[g] = 0; }
    m.trend.Horror = 1.5;
    for (let y = 0; y < 10; y++) marketYear(s);
  });
  ok('ten quiet years take most of the heat away', s.market.trend.Horror < 1.25, s.market.trend.Horror.toFixed(3));
  ok('a tenth of the way a year', JUDGE.back >= 0.08 && JUDGE.back <= 0.15, String(JUDGE.back));
}
{
  // A save from before this has one trend and no tentpole track: the track starts where it stood.
  const s = { market: { trend: Object.fromEntries(GENRES.map((g) => [g, g === 'Horror' ? 1.5 : 0.93])), glut: {}, tally: {}, total: 1 } };
  const m = marketOf(s);
  ok('an old save loads, and its tentpole track is the trend it had', m.legacy && m.legacy.Horror === 1.5 && m.trend.Horror === 1.5);
}
// ── the exception, held on purpose ───────────────────────────────────────────
// TEMPORARY. Tentpoles keep the old crowd table and the old market track until tentpoles are
// tuned on their own; without them a star's tentpoles past a billion fell from 19.7% to 3.3% on
// the controlled probe. When that pass happens, this block is deleted with them, not "fixed".
{
  const tp = (genre) => fixed(() => audienceFor(st(), { scale: 'blockbuster', genre, rating: 60 }));
  ok('TEMPORARY: a tentpole still has the old crowd table', tp('Horror') - tp('Drama') === TENTPOLE_CROWD.Horror - TENTPOLE_CROWD.Drama, `${tp('Horror')} vs ${tp('Drama')}`);
  const s = { market: null };
  const m = marketOf(s);
  for (const g of GENRES) { m.trend[g] = 1; m.legacy[g] = 1; m.glut[g] = 0; }
  m.legacy.Horror = 1.5;
  ok('TEMPORARY: a tentpole reads the old market track, everything else the new one',
    appetiteFor(s, 'Horror', 'blockbuster') > appetiteFor(s, 'Horror', 'feature') && appetiteFor(s, 'Horror', 'feature') === appetiteFor(s, 'Horror', 'indie'));
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
