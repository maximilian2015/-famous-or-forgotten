// Streaming Movies V1 on careers (plan docs/handoffs/2026-10-21-streaming-movies-v1-plan.md §11): a
// platform's films by platform — outcomes, the first week against the four, completion, the score —
// how they arrived, what they did for a name against a cinema film of the same size, what they paid
// against a cinema film with its points, the festival's endings and choices, the later sales, the
// sequels, the Asker. And the cinema side, to hold against main: gross by scale, smashes, billions.
// Bots as probe_streaming.mjs: "stream" reads for the streaming shelf and takes a platform's work first,
// and answers two buyers with the platform; "any" takes the best-paid offer and answers two buyers at
// random. Runs on a tree without Streaming Movies too (the cinema lines are the comparison).
//   node tests/probes/probe_streaming_movies.mjs <path to extracted/src/> [careers] [stream|any] [label]
//   FILM_TRY='{"global":{"target":0.2}}' tries other starting values without editing the table.
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
const A = await import(P + 'systems/career/agent.js');
const PJ = await import(P + 'systems/career/project.js');
const RL = await import(P + 'systems/career/release.js');
if (process.env.FILM_TRY && ST.FILM) for (const [k, v] of Object.entries(JSON.parse(process.env.FILM_TRY))) Object.assign(ST.FILM[k], v);
const FILM_SCALES = new Set(['small', 'festival', 'indie', 'feature', 'blockbuster']);
const isPF = ST.isPlatformFilm || (() => false);
const isStream = (x) => !!x.platformId || /^stream_/.test(x.payMarket || '');
const pf = [], cinema = [], careers = [], fest = { prize: 0, sold: 0, unsold: 0, letters: 0, platform: 0, cinema: 0, laterSales: 0 };
const asker = { platform: 0, cinema: 0 };
for (let k = 0; k < CAREERS; k++) {
  let s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true, housing: 'flat', cash: 20000, alive: true, ap: 100, apMax: 100, apMaxEff: 100,
    acting: 40, fame: 0, peakFame: 0, respect: 20, offers: [], castingPool: [], submissions: [], running: [], releases: [], laterOffers: [], frozen: [] });
  const seenLetters = new Set();
  for (let m = 0; m < 34 * 12; m++) {
    s.bigMoment = null; s.pendingArc = null;
    if (!s.job && (s.fame || 0) < 22) { const j = W.availableJobs(s).filter((x) => x.slots === 1).slice(-1)[0]; if (j) W.takeJob(s, j.id); }
    if (s.job && (s.fame || 0) > 35) W.quitJob(s);
    if (A.agentWantsYou && A.agentWantsYou(s)) A.signAgent(s, A.offerAgent(s));
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
    // Two buyers want a festival picture: the letter is answered as the bot would.
    for (const mail of (s.inbox || []).filter((x) => x.tag === 'fest' && (x.cta || []).some((c) => c.fest === 'platform'))) {
      if (seenLetters.has(mail.id)) continue;
      seenLetters.add(mail.id); fest.letters++;
      const pick = BOT === 'stream' || Math.random() < 0.5 ? 1 : 0;
      fest[pick ? 'platform' : 'cinema']++;
      RL.answerFestMail(s, mail.id, pick);
    }
    let g = 0; while ((s.ap || 0) > 0 && g++ < 5) { if (s.production) PR.rehearse(s); else break; }
    s = advanceMonth(s);
    if (!s.alive) break;
  }
  const done = (s.filmography || []).filter((c) => !c.running && !c.minor);
  for (const c of done) {
    if (c.festival && c.festival.result) fest[c.festival.result] = (fest[c.festival.result] || 0) + 1;
    if (c.verdict === 'unsold' && (c.rating || 0) >= 55) fest.unsold55 = (fest.unsold55 || 0) + 1;
    if (isPF(c)) pf.push({ ...c, platform: ST.archetypeOfId ? ST.archetypeOfId(c.platformId) : '?', route: (PJ.projectOf(s, c) || {}).route || '?', later: !!(c.festival && c.festival.result === 'unsold') });
    else if (FILM_SCALES.has(c.scale) && !c.streaming) cinema.push(c);
  }
  const noms = (s.awards && s.awards.nominations) || [];
  for (const n of noms) { const c = done.find((x) => x.title === n.title); if (c) asker[isPF(c) ? 'platform' : 'cinema']++; }
  careers.push({ pf: done.filter(isPF).length, films: done.filter((c) => FILM_SCALES.has(c.scale)).length, work: done.length, later: pf.filter((c) => c.later).length });
}
const pct = (n, d) => d ? Math.round(n / d * 100) + '%' : '—';
const avg = (l, f) => l.length ? l.reduce((n, x) => n + f(x), 0) / l.length : 0;
const q = (l, p) => { const a = [...l].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0; };
const M = (n) => n >= 1e6 ? `€${(n / 1e6).toFixed(1)}m` : `€${Math.round(n / 1000)}k`;
console.log(`STREAMING MOVIES ${LABEL} · ${CAREERS} careers × 34 years · bot: ${BOT}`);
const films = careers.reduce((n, c) => n + c.films, 0);
console.log(`  careers with a platform film ${careers.filter((c) => c.pf).length}/${CAREERS} · platform films ${pf.length} · cinema films ${cinema.length} · platform share of all films ${pct(pf.length, films)} · of all work ${pct(pf.length, careers.reduce((n, c) => n + c.work, 0))}`);
for (const kind of ['global', 'prestige', 'library', 'niche', 'all']) {
  const l = pf.filter((c) => kind === 'all' || c.platform === kind);
  if (!l.length) continue;
  const n = (v) => l.filter((c) => c.verdict === v).length;
  console.log(`  ${kind.padEnd(8)} ${String(l.length).padStart(4)} films · miss ${pct(n('miss'), l.length)} solid ${pct(n('solid'), l.length)} hit ${pct(n('hit'), l.length)} breakout ${pct(n('breakout'), l.length)} · score p25 ${q(l.map((c) => c.platformScore), 0.25).toFixed(2)} p50 ${q(l.map((c) => c.platformScore), 0.5).toFixed(2)} p75 ${q(l.map((c) => c.platformScore), 0.75).toFixed(2)} · starts28 p50 ${q(l.map((c) => c.views28), 0.5).toFixed(1)}m p90 ${q(l.map((c) => c.views28), 0.9).toFixed(1)}m · week one ${Math.round(q(l.map((c) => (c.views7 || 0) / Math.max(0.1, c.views28)), 0.5) * 100)}% · completion ${Math.round(q(l.map((c) => c.completion), 0.5) * 100)}% · cost p50 €${Math.round(q(l.map((c) => c.filmCost || 0), 0.5))}m`);
}
const routes = {}; for (const c of pf) routes[c.route] = (routes[c.route] || 0) + 1;
console.log('  how it arrived: ' + Object.entries(routes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
// A name and a purse, against a cinema film of the same size and the same billing.
for (const scale of ['indie', 'feature', 'blockbuster']) for (const tier of ['lead', 'supporting']) {
  const a = pf.filter((c) => c.scale === scale && (tier === 'lead' ? c.tier !== 'supporting' : c.tier === 'supporting'));
  const b = cinema.filter((c) => c.scale === scale && (tier === 'lead' ? c.tier !== 'supporting' : c.tier === 'supporting'));
  if (!a.length && !b.length) continue;
  const purse = (c) => (c.salary || 0) + (c.backendPaid || 0) + (c.merchPaid || 0);
  console.log(`  ${scale.padEnd(11)} ${tier.padEnd(10)} platform ${String(a.length).padStart(3)} · fame ${avg(a, (c) => c.careerFame || 0).toFixed(2)} · paid ${M(avg(a, purse))}   |   cinema ${String(b.length).padStart(3)} · fame ${avg(b, (c) => c.careerFame || 0).toFixed(2)} · paid ${M(avg(b, purse))} (points ${M(avg(b, (c) => (c.backendPaid || 0) + (c.merchPaid || 0)))})`);
}
// The ×1.25 buyout against points. This bot signs without the contract room, so it never holds points;
// what three points would have paid on its own cinema leads (past 2.2× the budget, as pictureMoney
// pays them) is set against the quarter a platform adds to the fee.
for (const scale of ['indie', 'feature', 'blockbuster']) {
  const leads = cinema.filter((c) => c.scale === scale && c.tier !== 'supporting' && Number.isFinite(c.budget));
  const plat = pf.filter((c) => c.scale === scale && c.tier !== 'supporting');
  if (!leads.length && !plat.length) continue;
  const three = (c) => Math.max(0, (c.boxOffice || 0) - c.budget * 1e6 * 2.2) * 0.03;
  console.log(`  economics ${scale.padEnd(11)} cinema leads ${leads.length}: 3 points would have paid ${M(avg(leads, three))} avg (${pct(leads.filter((c) => three(c) > 0).length, leads.length)} paid anything) · platform leads ${plat.length}: the buyout's quarter ${M(avg(plat, (c) => (c.salary || 0) * 0.2))} avg`);
}
const seq = pf.filter((c) => (c.part || 0) > 1).length;
console.log(`  sequels: platform films that were a second or third part ${seq} · Asker nominations: platform films ${asker.platform}, cinema films ${asker.cinema}`);
const picked = pf.filter((c) => c.scale === 'festival');
console.log(`  festival pictures a platform bought: ${picked.length} · score p50 ${q(picked.map((c) => c.platformScore), 0.5).toFixed(2)} · ${['miss', 'solid', 'hit', 'breakout'].map((v) => `${v} ${picked.filter((c) => c.verdict === v).length}`).join(' ')} · unsold pictures rated 55+: ${fest.unsold55}`);
console.log(`  festival: prize ${fest.prize} · sold ${fest.sold} · unsold ${fest.unsold} · two-buyer letters ${fest.letters} (platform ${fest.platform}, cinema ${fest.cinema}) · sold to a platform later ${pf.filter((c) => c.later).length}`);
// The cinema side, to hold against main: gross by scale, the verdicts, the billions.
for (const scale of ['festival', 'indie', 'feature', 'blockbuster']) {
  const l = cinema.filter((c) => c.scale === scale && c.verdict !== 'unsold');
  if (!l.length) continue;
  const n = (v) => l.filter((c) => c.verdict === v).length;
  console.log(`  cinema ${scale.padEnd(11)} ${String(l.length).padStart(4)} · gross p50 ${M(q(l.map((c) => c.boxOffice || 0), 0.5))} p90 ${M(q(l.map((c) => c.boxOffice || 0), 0.9))} · smash ${pct(n('smash'), l.length)} profitable ${pct(n('profitable'), l.length)} bomb ${pct(n('bomb'), l.length)} · billion ${l.filter((c) => (c.boxOffice || 0) >= 1e9).length}`);
}
