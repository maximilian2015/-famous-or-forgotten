// Streaming V1 on careers (plan §Test and probe plan): outcomes by platform — is there still a cliff
// between Solid and Hit? — seasons per show, renewals and why, how often a career takes streaming work,
// fees against network television, fame and hype, and the supporting race at the series award.
// Two bots: "stream" reads for the streaming shelf and takes a platform's work first; "any" is the
// ordinary bot (best-paid offer), to see how often streaming turns up in a career nobody steered.
//   node tests/probes/probe_streaming.mjs <path to extracted/src/> [careers] [stream|any] [label]
import { pathToFileURL } from 'node:url';
const P = pathToFileURL(process.argv[2]).href;
const CAREERS = Number(process.argv[3] || 40), BOT = process.argv[4] || 'stream', LABEL = process.argv[5] || '';
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const PR = await import(P + 'systems/career/production.js');
const K = await import(P + 'systems/career/castings.js');
const T = await import(P + 'systems/career/training.js');
const W = await import(P + 'systems/life/work.js');
const ST = await import(P + 'systems/career/streaming.js');
// STREAM_TRY='{"global":{"target":0.3}}' tries other starting values without editing the table.
if (process.env.STREAM_TRY) for (const [k, v] of Object.entries(JSON.parse(process.env.STREAM_TRY))) Object.assign(ST.ARCHETYPES[k], v);
const isStream = (x) => !!x.platformId || /^stream_/.test(x.payMarket || '');
const credits = [], careers = [];
for (let k = 0; k < CAREERS; k++) {
  let s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true, housing: 'flat', cash: 20000, alive: true, ap: 100, apMax: 100, apMaxEff: 100,
    acting: 40, fame: 0, peakFame: 0, respect: 20, offers: [], castingPool: [], submissions: [], running: [], releases: [], laterOffers: [], frozen: [] });
  for (let m = 0; m < 34 * 12; m++) {
    s.bigMoment = null; s.pendingArc = null;
    if (!s.job && (s.fame || 0) < 22) { const j = W.availableJobs(s).filter((x) => x.slots === 1).slice(-1)[0]; if (j) W.takeJob(s, j.id); }
    if (s.job && (s.fame || 0) > 35) W.quitJob(s);
    const best = [...T.SCHOOLS].reverse().find((sc) => (s.cash || 0) > sc.cost * 4);
    if (best && (s.ap || 0) > 1) T.train(s, best.id);
    K.refreshCastingPool(s);
    if (!s.production && !(s.offers || []).length && !(s.submissions || []).length) {
      const pool = (s.castingPool || []).map((c) => ({ c, o: K.castingChance(s, c) + (BOT === 'stream' && isStream(c) && K.reach(s) >= (c.minFame || 0) ? 1000 : 0) })).sort((a, b) => b.o - a.o);
      if (pool[0] && (s.ap || 0) > 0) K.auditionFor(s, pool[0].c.id, 78);
    }
    if ((s.offers || []).length && !s.production) {
      const o = [...s.offers].sort((a, b) => (BOT === 'stream' ? isStream(b) - isStream(a) : 0) || (b.salary || 0) - (a.salary || 0))[0];
      PR.startProduction(s, o); s.offers = s.offers.filter((x) => x.id !== o.id);
    }
    let g = 0; while ((s.ap || 0) > 0 && g++ < 5) { if (s.production) PR.rehearse(s); else break; }
    s = advanceMonth(s);
    if (!s.alive) break;
  }
  const mine = (s.filmography || []).filter((c) => c.streaming && !c.running);
  for (const c of mine) credits.push({ ...c, platform: (ST.platformById(s, c.platformId) || {}).archetype || '?' });
  const z = s.seriesAwards || {};
  careers.push({ streams: mine.length, work: (s.filmography || []).filter((c) => !c.minor).length,
    network: (s.filmography || []).filter((c) => !c.minor && !c.streaming && c.scale === 'recurring' && c.type !== 'Soap Opera'),
    supNoms: (z.nominations || []).filter((n) => n.category === 'supporting').length, supWins: (z.wins || []).filter((n) => n.category === 'supporting').length,
    seriesNoms: (z.nominations || []).length, fame: s.fame || 0 });
}
const pct = (n, d) => d ? Math.round(n / d * 100) + '%' : '—';
const avg = (l, f) => l.length ? l.reduce((n, x) => n + f(x), 0) / l.length : 0;
const med = (l) => { const a = [...l].sort((x, y) => x - y); return a.length ? a[a.length >> 1] : 0; };
console.log(`STREAMING ${LABEL} · ${CAREERS} careers × 34 years · bot: ${BOT}`);
console.log(`  careers with streaming work ${careers.filter((c) => c.streams).length}/${CAREERS} · streaming seasons ${credits.length} · median per career ${med(careers.map((c) => c.streams))} · share of all work ${pct(credits.length, careers.reduce((n, c) => n + c.work, 0))}`);
for (const kind of ['global', 'prestige', 'library', 'niche', 'all']) {
  const l = credits.filter((c) => kind === 'all' || c.platform === kind);
  if (!l.length) continue;
  const n = (v) => l.filter((c) => c.verdict === v).length;
  console.log(`  ${kind.padEnd(8)} ${String(l.length).padStart(4)} seasons · miss ${pct(n('miss'), l.length)} solid ${pct(n('solid'), l.length)} hit ${pct(n('hit'), l.length)} breakout ${pct(n('breakout'), l.length)} · views28 median ${med(l.map((c) => c.views28)).toFixed(1)}m · completion median ${Math.round(med(l.map((c) => c.completion)) * 100)}% · cost median €${Math.round(med(l.map((c) => c.seasonCost)))}m`);
}
// The cliff: how the score spreads around the Solid/Hit line.
const bands = [[0, 0.35], [0.35, 0.7], [0.7, 1.05], [1.05, 1.4], [1.4, 2.1], [2.1, 3], [3, 5], [5, 99]];
console.log('  score spread: ' + bands.map(([a, b]) => `${a}–${b === 99 ? '…' : b} ${credits.filter((c) => c.platformScore >= a && c.platformScore < b).length}`).join(' · '));
const ren = (v) => credits.filter((c) => c.renewal === v).length;
console.log(`  renewal: renewed ${ren('renewed')} · cancelled ${ren('cancelled')} (too dear ${credits.filter((c) => c.renewal === 'cancelled' && c.nextCost && c.views28 >= ST.numbersOf({ archetype: c.platform }).breakout * 0.4).length}) · moved ${ren('moved')} · ended (limited) ${ren('ended')} · capped ${ren('capped')} · undecided/bubble ${credits.filter((c) => !c.renewal).length}`);
const shows = new Map();
for (const c of credits) { const root = String(c.title).replace(/(\s*·\s*season\s+\d+)+\s*$/i, ''); shows.set(root, Math.max(shows.get(root) || 0, c.season || 1)); }
const lens = [...shows.values()];
console.log(`  shows ${lens.length} · seasons per show: 1 ${lens.filter((x) => x === 1).length} · 2 ${lens.filter((x) => x === 2).length} · 3 ${lens.filter((x) => x === 3).length} · 4+ ${lens.filter((x) => x >= 4).length}`);
for (const v of ['miss', 'solid', 'hit', 'breakout']) {
  const l = credits.filter((c) => c.verdict === v);
  if (l.length) console.log(`  ${v.padEnd(8)} career fame ${avg(l, (c) => c.careerFame || 0).toFixed(1)} · standing ${avg(l, (c) => c.careerRespect || 0).toFixed(1)}`);
}
// First seasons by platform: the score's middle and the views' top tenth — what targets and bars are set from.
const q = (l, p) => { const a = [...l].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0; };
for (const kind of ['global', 'prestige', 'library', 'niche']) {
  const l = credits.filter((c) => c.platform === kind && (c.season || 1) === 1);
  if (!l.length) continue;
  const n = (v) => l.filter((c) => c.verdict === v).length;
  console.log(`  s1 ${kind.padEnd(8)} ${String(l.length).padStart(4)} · miss ${pct(n('miss'), l.length)} solid ${pct(n('solid'), l.length)} hit ${pct(n('hit'), l.length)} breakout ${pct(n('breakout'), l.length)} · score p25 ${q(l.map((c) => c.platformScore), 0.25).toFixed(2)} p50 ${q(l.map((c) => c.platformScore), 0.5).toFixed(2)} p75 ${q(l.map((c) => c.platformScore), 0.75).toFixed(2)} · views28 p50 ${q(l.map((c) => c.views28), 0.5).toFixed(1)} p90 ${q(l.map((c) => c.views28), 0.9).toFixed(1)} · renewed ${pct(l.filter((c) => c.renewal === 'renewed').length, l.length)}`);
}
// First seasons against the ones after: a hit is pushed hard next time and its finishers come back.
for (const [name, l] of [['season 1', credits.filter((c) => (c.season || 1) === 1)], ['season 2+', credits.filter((c) => (c.season || 1) > 1)]]) {
  if (!l.length) continue;
  const n = (v) => l.filter((c) => c.verdict === v).length;
  console.log(`  ${name.padEnd(9)} ${String(l.length).padStart(4)} · miss ${pct(n('miss'), l.length)} solid ${pct(n('solid'), l.length)} hit ${pct(n('hit'), l.length)} breakout ${pct(n('breakout'), l.length)} · renewed ${pct(l.filter((c) => c.renewal === 'renewed').length, l.length)}`);
}
console.log(`  supporting parts ${credits.filter((c) => c.tier === 'supporting').length} (rated 70+ ${credits.filter((c) => c.tier === 'supporting' && (c.rating || 0) >= 70).length}) · series award: nominations ${careers.reduce((n, c) => n + c.seriesNoms, 0)}, supporting ${careers.reduce((n, c) => n + c.supNoms, 0)} (won ${careers.reduce((n, c) => n + c.supWins, 0)})`);
