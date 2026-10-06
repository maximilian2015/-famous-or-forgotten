// Legs that know what kind of picture they belong to.
//
// One global range forced a choice nobody should have to make: compressing it until a billion
// was rare also made a feature rated 8.8 a smash zero times in twenty thousand. Those are not
// the same question. A tentpole opens enormous and saturates — everybody who was going to see it
// went in the first fortnight. A feature opens small and can be carried a very long way by
// people telling each other. Two stories, one number.
//
// This sweeps separate ranges per scale. Nothing is committed and no constant in the game is
// touched: the probe computes legs itself, which is a copy of logic that lives in release.js —
// so the first thing it does is prove the copy is exact against the real function. If that
// check ever fails, every number below it is fiction.
const P = new URL('../../src/', import.meta.url).href;
const R = await import(P + 'systems/career/release.js');

// legsFor, as it stands, with the range opened up as arguments.
const SCREENS = { small: 0.012, festival: 0.02, indie: 0.09, prestige: 0.12, feature: 0.55, blockbuster: 0.78 };
const isPlatform = (scale) => (SCREENS[scale] ?? 0.09) < 0.2;
function legsWith(rel, lo, span, frontload = 0.78) {
  const w = R.wordFor(rel);
  let m = lo + Math.pow(Math.max(0, w - 35) / 60, 1.5) * span;
  if (!isPlatform(rel.scale) && w < 60) m *= frontload;
  return Math.max(1.35, m * (0.92 + Math.random() * 0.16));
}

// ── the copy is exact ─────────────────────────────────────────────────────────
// Averaged over enough rolls that the noise cancels; the dice are the same shape in both.
{
  let worst = 0, where = '';
  for (const scale of ['small', 'indie', 'prestige', 'feature', 'blockbuster']) {
    for (const rating of [35, 48, 62, 77, 88, 95]) {
      const rel = { scale, rating, reception: rating };
      let a = 0, b = 0;
      for (let i = 0; i < 20000; i++) { a += R.legsFor(rel); b += legsWith(rel, 1.75, 3.5); }
      const d = Math.abs(a - b) / a;
      if (d > worst) { worst = d; where = `${scale} at ${rating}`; }
    }
  }
  const ok = worst < 0.01;
  console.log(`${ok ? 'ok   ' : 'FAIL '} the probe reproduces the real legsFor (worst drift ${(worst * 100).toFixed(2)}% at ${where})`);
  if (!ok) process.exit(1);
}

// ── who makes what ────────────────────────────────────────────────────────────
// A small film is made by somebody nobody has heard of and a tentpole is not. Pricing every
// scale with the same fame would be the mistake this project has already made twice.
// 'prestige' is NOT a film scale in this game — it is the television tier, two to fourteen
// million viewers an episode, with no budget and no box office at all. The prestige PICTURE
// Maxi means is 'festival' or 'indie' here. Including it priced a thing that cannot be priced
// and reported 0% profitable for every candidate.
const FAME = { small: [0, 35], festival: [5, 50], indie: [5, 55], feature: [35, 90], blockbuster: [60, 100] };
const CAMPAIGN = { small: 'minimal', festival: 'minimal', indie: 'standard', feature: 'major', blockbuster: 'event' };
const GENRES = ['Drama', 'Crime', 'Romance', 'Musical', 'Thriller', 'Sci-Fi', 'Comedy', 'Horror'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function sample(scale, lo, span, n = 20000, fixed = null) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const rating = fixed ? fixed.rating : 25 + Math.random() * 70;
    const reception = fixed ? fixed.reception : Math.max(0, Math.min(100, rating + (Math.random() * 24 - 12)));
    const fame = fixed ? fixed.fame : FAME[scale][0] + Math.random() * (FAME[scale][1] - FAME[scale][0]);
    const rel = { scale, genre: fixed ? fixed.genre : pick(GENRES), rating, reception, part: 1, appealMod: 1,
      campaignTier: fixed ? fixed.campaignTier : CAMPAIGN[scale], withFame: Math.random() < 0.35 ? 20 + Math.random() * 60 : 0 };
    const s = { fame, media: Math.random() * 35, hypeSource: null, year: 2066,
      month: Math.floor(Math.random() * 12), typecast: { scores: {}, active: [] }, acting: 60 };
    const d = R.demandFor(s, rel);
    const gross = R.openingFor(s, rel, d) * legsWith(rel, lo, span) * R.expansionFor(rel) * 1e6;
    out.push({ gross, rating, verdict: R.verdictOf({ scale, rating, boxOffice: gross, campaignTier: rel.campaignTier, type: 'Feature Film' }) });
  }
  return out;
}
// Past a thousand million, say it in billions. "€1299m" is a number you have to stop and
// count the digits of, which is the opposite of what a table is for.
const q = (a, p) => { const v = a[Math.floor(a.length * p)]; return v >= 1e9 ? (v / 1e9).toFixed(3) + 'bn' : Math.round(v / 1e6) + 'm'; };
const share = (rows, f) => (rows.filter(f).length / rows.length * 100);

// ── the candidates ────────────────────────────────────────────────────────────
// A tentpole saturates; a small picture can be carried. The shape inside each scale is the same
// curve — only where it starts and how far it reaches changes.
const SETS = {
  'current (one range)': { small: [1.75, 3.5], festival: [1.75, 3.5], indie: [1.75, 3.5], feature: [1.75, 3.5], blockbuster: [1.75, 3.5] },
  'I  gentle split':     { small: [1.85, 4.6], festival: [1.85, 4.6], indie: [1.85, 4.6], feature: [1.80, 4.0], blockbuster: [1.65, 2.35] },
  'II strong split':     { small: [1.90, 5.2], festival: [1.90, 5.2], indie: [1.90, 5.2], feature: [1.85, 4.4], blockbuster: [1.60, 2.00] },
  'III tentpole hardest':{ small: [1.90, 5.2], festival: [1.90, 5.2], indie: [1.90, 5.2], feature: [1.90, 4.8], blockbuster: [1.55, 1.70] },
};

for (const [name, table] of Object.entries(SETS)) {
  console.log();
  console.log('═══ ' + name + ' ═══');
  console.log('  scale         range      median     P75     P90     P95     P99   profitable+  smash');
  for (const scale of ['small', 'festival', 'indie', 'feature', 'blockbuster']) {
    const [lo, span] = table[scale];
    const rows = sample(scale, lo, span);
    const g = rows.map((r) => r.gross).sort((a, b) => a - b);
    const hit = share(rows, (r) => r.verdict === 'smash' || r.verdict === 'profitable');
    const smash = share(rows, (r) => r.verdict === 'smash');
    let tail = '';
    if (scale === 'blockbuster') tail = `   >700m ${share(rows, (r) => r.gross >= 700e6).toFixed(1)}%  >1bn ${share(rows, (r) => r.gross >= 1e9).toFixed(1)}%`;
    console.log(`  ${scale.padEnd(12)} ${(lo.toFixed(2) + '-' + (lo + span).toFixed(2)).padStart(9)}` +
      `  ${('€' + q(g, 0.5)).padStart(8)} ${('€' + q(g, 0.75)).padStart(7)} ${('€' + q(g, 0.9)).padStart(7)} ${('€' + q(g, 0.95)).padStart(7)} ${('€' + q(g, 0.99)).padStart(7)}` +
      `   ${(hit.toFixed(1) + '%').padStart(9)} ${(smash.toFixed(1) + '%').padStart(6)}${tail}`);
  }
  // Word of mouth must stay worth something, and most of all for the smaller pictures.
  console.log('  legs by what the crowd made of it:');
  for (const scale of ['festival', 'indie', 'feature', 'blockbuster']) {
    const [lo, span] = table[scale];
    const band = (l, h) => { let t = 0; for (let i = 0; i < 6000; i++) { const r = l + Math.random() * (h - l); t += legsWith({ scale, rating: r, reception: r }, lo, span); } return (t / 6000).toFixed(2); };
    console.log(`    ${scale.padEnd(12)} <6.0 x${band(30, 59)}   6.0-7.4 x${band(60, 74)}   7.5-8.4 x${band(75, 84)}   8.5+ x${band(85, 97)}`);
  }
  // ── the two cases this has to satisfy at the same time ─────────────────────
  {
    const [flo, fspan] = table.feature;
    const f = sample('feature', flo, fspan, 20000, { rating: 88, reception: 88, fame: 70, genre: 'Drama', campaignTier: 'standard' });
    const bar = R.breakEvenFor({ scale: 'feature', campaignTier: 'standard' }) * 2;
    const fg = f.map((r) => r.gross).sort((a, b) => a - b);
    console.log(`  CASE A  feature 8.8, fame 70, smash at €${Math.round(bar / 1e6)}m:  median €${q(fg, 0.5)}  P90 €${q(fg, 0.9)}  P99 €${q(fg, 0.99)}  ·  smash ${share(f, (r) => r.gross >= bar).toFixed(1)}%`);
    const [blo, bspan] = table.blockbuster;
    const b = sample('blockbuster', blo, bspan, 20000, { rating: 77, reception: 80, fame: 92, genre: 'Sci-Fi', campaignTier: 'event' });
    const bg = b.map((r) => r.gross).sort((a, b2) => a - b2);
    const above = share(b, (r) => r.gross >= 1163e6);
    console.log(`  CASE B  Midnight Talker 7.7/8.0, fame 92, event:  median €${q(bg, 0.5)}  P90 €${q(bg, 0.9)}  P95 €${q(bg, 0.95)}  P99 €${q(bg, 0.99)}` +
      `  ·  >€1bn ${share(b, (r) => r.gross >= 1e9).toFixed(1)}%  ·  €1.163bn is the top ${above.toFixed(2)}%`);
  }
}
