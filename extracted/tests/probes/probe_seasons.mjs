// Six hundred lives, forty years each, a bot that takes television when it is offered and
// says yes to every renewal — what is the longest a show ran, in seasons? Maxi asked. And
// while we are counting: does any show run past its cap, skip a season, or change its name.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth, advanceYear } = await import(P + 'engine/time.js');
const K = await import(P + 'systems/career/castings.js');
const PR = await import(P + 'systems/career/production.js');
const ST = await import(P + 'systems/career/story.js');
const W = await import(P + 'systems/life/work.js');
const H = await import(P + 'systems/life/health.js');
const O = await import(P + 'systems/career/offers.js');
const { seasonCap, seriesRoot } = await import(P + 'systems/career/franchise.js');

const N = +(process.argv[2] || 600), YEARS = 40;
const shows = [];              // every show every life ever had: { title, type, seasons, ratings, life }
const bugs = [];
let lives = 0, deaths = 0;
for (let i = 0; i < N; i++) {
  let s = createInitialState({ name: 'S' + i, dream: 'actor', created: true, gender: i % 2 ? 'female' : 'male' }); beginLife(s);
  for (let y = 0; y < 18; y++) { s.bigMoment = null; s.moments = []; s = advanceYear(s); }
  Object.assign(s, { stage: 'career', hasApartment: true, housing: 'room', cash: 9000, alive: true, ap: 100, apMax: 100, apMaxEff: 100 });
  for (const p of s.family || []) p.age += 0;
  const tvFirst = i % 2 === 0;   // half the bots chase television, half take whatever is best
  try {
    for (let m = 0; m < YEARS * 12; m++) {
      s.bigMoment = null; s.pendingArc = null; s.moments = []; s.night = null; s.tour = null; s.openContract = null;
      for (const p of PR.sets(s)) if (!p.take) ST.pushTake(s, 'straight');
      if (s.illness && (s.cash || 0) > H.treatmentCost(s, s.illness)) H.seeDoctor(s);
      if (!s.job && (s.fame || 0) < 20) { const j = W.availableJobs(s)[0]; if (j) W.takeJob(s, j.id); }
      if (s.job && (s.fame || 0) > 35) W.quitJob(s);
      K.refreshCastingPool(s);
      // renewals first, always
      const ren = (s.offers || []).find((o) => o.kind === 'renewal');
      if (ren) { O.acceptOffer(s, ren.id); }
      if (!PR.sets(s).length && (s.ap || 0) >= 30 && (s.castingPool || []).length) {
        const pool = s.castingPool;
        const tv = pool.filter((x) => x.shelf === 'tv');
        const c = (tvFirst && tv.length ? tv : pool)[0];
        K.prepareFor(s, c.id); K.auditionFor(s, c.id, 85);
      }
      if ((s.offers || []).length && !PR.sets(s).length) { const o = s.offers.find((x) => x.kind !== 'renewal') || s.offers[0]; O.acceptOffer(s, o.id); }
      for (let k = 0; k < 3 && s.production && (s.ap || 0) >= 15; k++) PR.rehearse(s);
      s = advanceMonth(s);
      if (!s.alive) { deaths++; break; }
    }
  } catch (e) { bugs.push(`life ${i} THREW: ${e.message}`); continue; }
  lives++;
  // what television did this life make?
  const byRoot = {};
  for (const c of s.filmography || []) {
    const isTv = !!(c.episodes || c.season || (c.job && (c.job.episodes || c.job.season)));
    if (!isTv) continue;
    const root = seriesRoot((c.job && c.job.seriesTitle) || c.title);
    const season = c.season || (c.job && c.job.season) || 1;
    (byRoot[root] = byRoot[root] || { title: root, type: c.type, scale: c.scale, role: c.role, seasons: [], ratings: [], life: i }).seasons.push(season);
    byRoot[root].ratings.push(Math.round((c.rating || 0) / 10 * 10) / 10);
  }
  for (const show of Object.values(byRoot)) {
    show.seasons.sort((a, b) => a - b);
    show.max = show.seasons[show.seasons.length - 1];
    // The board now casts you INTO running shows (season 8 of a soap), so the show's season
    // number and how many seasons were yours are two different numbers.
    show.tenure = show.seasons.length; show.joinedAt = show.seasons[0];
    const cap = seasonCap(show.type);
    if (show.max > cap) bugs.push(`life ${i}: "${show.title}" (${show.type}) ran ${show.max} seasons, cap ${cap}`);
    for (let k = 1; k < show.seasons.length; k++) if (show.seasons[k] !== show.seasons[k - 1] + 1) { bugs.push(`life ${i}: "${show.title}" seasons ${show.seasons.join(',')} — a gap or a repeat`); break; }
    shows.push(show);
  }
}
shows.sort((a, b) => b.max - a.max);
const dist = {};
for (const sh of shows) dist[sh.max] = (dist[sh.max] || 0) + 1;
console.log(`${lives} lives lived (${deaths} died on the way) · ${shows.length} shows made`);
console.log('seasons → shows:', Object.keys(dist).sort((a, b) => a - b).map((k) => `${k}: ${dist[k]}`).join(' · '));
console.log('\nthe longest runs:');
for (const sh of shows.slice(0, 8)) console.log(`  ${sh.max} seasons · "${sh.title}" · ${sh.type} · ratings ${sh.ratings.join(' ')} · life ${sh.life}`);
const byType = {};
for (const sh of shows) { const t = byType[sh.type] = byType[sh.type] || { n: 0, max: 0, sum: 0 }; t.n++; t.sum += sh.max; t.max = Math.max(t.max, sh.max); }
console.log('\nby type:'); for (const [t, v] of Object.entries(byType)) console.log(`  ${t.padEnd(16)} ${v.n} shows · longest ${v.max} · mean ${(v.sum / v.n).toFixed(1)} · cap ${seasonCap(t)}`);
// Your own shows only (a guest spot is somebody else's), and how often season one led to two.
const own = shows.filter((sh) => sh.scale !== 'episode');
const dist2 = {}; for (const sh of own) dist2[sh.tenure] = (dist2[sh.tenure] || 0) + 1;
console.log('\nyour own shows · seasons YOU were in → shows:', Object.keys(dist2).sort((a, b) => a - b).map((k) => `${k}: ${dist2[k]}`).join(' · '));
const joined = own.filter((sh) => sh.joinedAt > 1);
console.log(`joined a running show: ${joined.length} of ${own.length} (${Math.round(100 * joined.length / Math.max(1, own.length))}%) · kept on for a second season ${Math.round(100 * joined.filter((sh) => sh.tenure >= 2).length / Math.max(1, joined.length))}% · new shows renewed ${Math.round(100 * own.filter((sh) => sh.joinedAt === 1 && sh.tenure >= 2).length / Math.max(1, own.length - joined.length))}%`);
const bands = [[0, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 11]];
console.log('season one rated → got a season two:');
for (const [lo, hi] of bands) { const b = own.filter((sh) => sh.ratings[0] >= lo && sh.ratings[0] < hi); const two = b.filter((sh) => sh.tenure >= 2).length; if (b.length) console.log(`  ${lo}–${hi}: ${b.length} shows · renewed ${Math.round(100 * two / b.length)}%`); }
for (const type of ['Soap Opera', 'Network Drama', 'Prestige Series']) { const b = own.filter((sh) => sh.type === type); const two = b.filter((sh) => sh.tenure >= 2).length; console.log(`  ${type}: ${b.length} · season two ${Math.round(100 * two / Math.max(1, b.length))}% · mean rating S1 ${(b.reduce((n, sh) => n + sh.ratings[0], 0) / Math.max(1, b.length)).toFixed(1)}`); }
const guests = shows.filter((sh) => sh.scale === 'episode' && sh.tenure > 1);
console.log(`
guest spots (scale episode) that came back as "your" season two or more: ${guests.length}` + (guests.length ? ` — e.g. "${guests[0].title}" ${guests[0].role} ${guests[0].max} seasons` : ''));
console.log(bugs.length ? `\nBUGS (${bugs.length}):\n` + bugs.slice(0, 15).join('\n') : '\nno show ran past its cap, skipped a season or repeated one');
