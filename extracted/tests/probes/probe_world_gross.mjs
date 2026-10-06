// Every blockbuster the game makes, not only the player's.
//
// The careers probe answers "what does a star's tentpole take", which is the top slice of the
// market and always will be. The number that can be held against the real world — about one
// tentpole in fifteen passes a billion dollars — is the share across EVERY blockbuster released,
// and the game makes most of those itself: world.js builds the rest of the industry's year and
// prices it through the same grossFor the player's films go through.
//
// Measurement only.
const P = new URL('../../src/', import.meta.url).href;
const R = await import(P + 'systems/career/release.js');

const GENRES = ['Drama', 'Crime', 'Romance', 'Musical', 'Thriller', 'Sci-Fi', 'Comedy', 'Horror'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const chance = (p) => Math.random() * 100 < p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// world.js makeWorldFilm, as it really is: a tentpole belongs to a name, its score comes off
// their craft with the same luck the player's does, and nothing about the actor is uniform.
const MATERIAL = { small: -6, festival: 2, indie: 2, feature: 4, blockbuster: 2 };
const worldRating = (craft, scale) =>
  clamp(18 + craft * 0.52 + (MATERIAL[scale] || 0) + rint(-16, 14) + (chance(8) ? rint(8, 16) : 0) + (chance(10) ? rint(-22, -10) : 0), 10, 96);

const N = Number(process.argv[2] || 60000);
const rows = [];
for (let i = 0; i < N; i++) {
  // Whoever is making tentpoles is famous — that is what a tentpole is — but not all equally,
  // and their craft varies the way the world's actors do.
  const fame = 55 + Math.random() * 45;
  const craft = 45 + Math.random() * 50;
  const genre = pick(GENRES);
  const rating = worldRating(craft, 'blockbuster');
  const gross = R.grossFor({ scale: 'blockbuster', rating, genre, fame, trend: 0.85 + Math.random() * 0.3 });
  rows.push({ gross, rating });
}
const g = rows.map((r) => r.gross).sort((a, b) => a - b);
// Past a thousand million, say it in billions. "€1299m" is a number you have to stop and
// count the digits of, which is the opposite of what a table is for.
const q = (p) => { const v = g[Math.floor(g.length * p)]; return v >= 1e9 ? (v / 1e9).toFixed(3) + 'bn' : Math.round(v / 1e6) + 'm'; };
const over = (x) => (rows.filter((r) => r.gross >= x).length / rows.length * 100);
console.log(`EVERY BLOCKBUSTER THE GAME MAKES  ·  ${N} of them, the world's as well as yours`);
console.log(`  median €${q(0.5)}   P75 €${q(0.75)}   P90 €${q(0.9)}   P95 €${q(0.95)}   P99 €${q(0.99)}`);
console.log(`  over €700m ${over(700e6).toFixed(1)}%   ·   over €1bn ${over(1e9).toFixed(1)}%   (the business: about 5-7% of tentpoles)`);
console.log();
console.log('  by what the crowd and the column made of it:');
for (const [name, lo, hi] of [['poor      <6.0', 0, 59], ['average 6.0-7.4', 60, 74], ['strong  7.5-8.4', 75, 84], ['exceptional 8.5+', 85, 100]]) {
  const sub = rows.filter((r) => r.rating >= lo && r.rating <= hi);
  if (!sub.length) continue;
  const sg = sub.map((r) => r.gross).sort((a, b) => a - b);
  console.log(`    ${name}  n=${String(sub.length).padStart(6)}  median €${Math.round(sg[Math.floor(sg.length / 2)] / 1e6)}m` +
    `  P90 €${Math.round(sg[Math.floor(sg.length * 0.9)] / 1e6)}m  over €1bn ${(sub.filter((r) => r.gross >= 1e9).length / sub.length * 100).toFixed(1)}%`);
}

// ── and the picture this whole argument started from ─────────────────────────
// Midnight Talker: a blockbuster on an event campaign, 7.7 from the column and 8.0 from the
// room, fronted by a name. It took €1.163bn and the card said SMASH and nothing else.
console.log();
console.log('MIDNIGHT TALKER  ·  blockbuster, event campaign, 7.7 reviews, 8.0 audience');
for (const fame of [60, 75, 88, 97]) {
  const out = [];
  for (let i = 0; i < 12000; i++) {
    const s = { fame, media: 25 + Math.random() * 20, hypeSource: null, year: 2066,
      month: Math.floor(Math.random() * 12), typecast: { scores: {}, active: [] }, acting: 75 };
    const rel = { scale: 'blockbuster', genre: 'Sci-Fi', campaignTier: 'event', part: 1,
      appealMod: 1, withFame: Math.random() < 0.4 ? 30 + Math.random() * 50 : 0, rating: 77, reception: 80 };
    const d = R.demandFor(s, rel);
    out.push(R.openingFor(s, rel, d) * R.legsFor(rel) * R.expansionFor(rel) * 1e6);
  }
  out.sort((a, b) => a - b);
  const m = (p) => Math.round(out[Math.floor(out.length * p)] / 1e6);
  console.log(`  fame ${String(fame).padStart(2)}   median €${String(m(0.5)).padStart(4)}m   P90 €${String(m(0.9)).padStart(4)}m   P95 €${String(m(0.95)).padStart(4)}m` +
    `   past €1bn ${(out.filter((x) => x >= 1e9).length / out.length * 100).toFixed(1)}%` +
    `   ·  where €1.163bn sits: top ${(100 - out.filter((x) => x < 1163e6).length / out.length * 100).toFixed(1)}%`);
}
