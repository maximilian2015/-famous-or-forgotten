// Lost continuations on careers (career/continuation.js): how often a season or a sequel goes on
// without you, why, what the fans made of it, who took the part, how it did without you, and who told
// the player — the "Without you" story or the trades — and whether anything was left untold.
// The ordinary bot (best-paid offer, signs an agent) also turns down a renewal or a sequel now and then
// and lets some papers lapse, as a player who is not steering does.
//   node tests/probes/probe_lost_continuations.mjs <path to extracted/src/> [careers]
import { pathToFileURL } from 'node:url';
const P = pathToFileURL(process.argv[2]).href;
const CAREERS = Number(process.argv[3] || 40);
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const PR = await import(P + 'systems/career/production.js');
const K = await import(P + 'systems/career/castings.js');
const T = await import(P + 'systems/career/training.js');
const W = await import(P + 'systems/life/work.js');
const A = await import(P + 'systems/career/agent.js');
const O = await import(P + 'systems/career/offers.js');
const ARC = await import(P + 'systems/life/arcs.js');
const untold = [];
const recs = [], fans = { furious: 0, network: 0, sorry: 0 }, tally = { stories: 0, queued: 0, mails: 0 };
let standingLost = 0;
for (let k = 0; k < CAREERS; k++) {
  let s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true, housing: 'flat', cash: 20000, alive: true, ap: 100, apMax: 100, apMaxEff: 100,
    acting: 40, fame: 0, peakFame: 0, respect: 20, offers: [], castingPool: [], submissions: [], running: [], releases: [], laterOffers: [], frozen: [] });
  for (let m = 0; m < 34 * 12; m++) {
    s.bigMoment = null;
    // A story beat that wants an answer gets the first one, as somebody clicking through would.
    if (s.pendingArc) { try { ARC.resolveArc(s, 0); } catch (e) { s.pendingArc = null; } }
    if (!s.job && (s.fame || 0) < 22) { const j = W.availableJobs(s).filter((x) => x.slots === 1).slice(-1)[0]; if (j) W.takeJob(s, j.id); }
    if (s.job && (s.fame || 0) > 35) W.quitJob(s);
    if (A.agentWantsYou && A.agentWantsYou(s)) A.signAgent(s, A.offerAgent(s));
    const best = [...T.SCHOOLS].reverse().find((sc) => (s.cash || 0) > sc.cost * 4);
    if (best && (s.ap || 0) > 1) T.train(s, best.id);
    K.refreshCastingPool(s);
    if (!s.production && !(s.offers || []).length && !(s.submissions || []).length) {
      const pool = (s.castingPool || []).map((c) => ({ c, o: K.castingChance(s, c) })).sort((a, b) => b.o - a.o);
      if (pool[0] && (s.ap || 0) > 0) K.auditionFor(s, pool[0].c.id, 78);
    }
    // One continuation in six is turned down, as a player moving on would; the rest are taken or lapse.
    for (const o of [...(s.offers || [])]) if ((o.kind === 'renewal' || o.kind === 'sequel') && !o._probed) { o._probed = true; if (Math.random() < 1 / 6) O.declineOffer(s, o.id); }
    if ((s.offers || []).length && !s.production) {
      const o = [...s.offers].sort((a, b) => (b.salary || 0) - (a.salary || 0))[0];
      PR.startProduction(s, o); s.offers = s.offers.filter((x) => x.id !== o.id);
    }
    let g = 0; while ((s.ap || 0) > 0 && g++ < 5) { if (s.production) PR.rehearse(s); else break; }
    const r0 = s.respect || 0;
    s = advanceMonth(s);
    if (!s.alive) break;
    void r0;
  }
  for (const c of s.filmography || []) if (c && c.next) {
    const rec = c.next;
    // Anything that came out and was never told: where it is stuck, so "99%" has a reason or a fix.
    if (rec.result && !rec.told) {
      const st = (s.stories || []).find((x) => x.id === 'recast' && x.data && String(x.data.title).replace(/^⭐\s*/, '') === rec.title);
      untold.push(`${rec.title} · result ${rec.result.at} · end ${s.year * 12 + s.month} · story ${st ? `${st.beat} due ${st.due}` : 'none'} · queued ${(s.recastQueue || []).some((x) => x.title === rec.title)} · pending arc ${s.pendingArc ? s.pendingArc.story + '/' + s.pendingArc.beat : '—'}`);
    }
    recs.push({ ...rec, src: c.title });
  }
  for (const e of s.timeline || []) {
    const t = typeof e.text === 'string' ? e.text : '';
    if (/^Fans are furious with the network/.test(t)) fans.network++;
    else if (/^Fans are furious/.test(t)) fans.furious++;
    else if (/The fans are sorry to see you go|some disappointed fans/.test(t)) fans.sorry++;
  }
  tally.mails += (s.inbox || []).filter((m) => m.tag === 'trades').length;
  tally.queued += (s.recastQueue || []).length;
  void standingLost;
}
const pct = (n, d) => (d ? Math.round(n / d * 100) + '%' : '—');
const by = (f) => { const o = {}; for (const r of recs) { const k = f(r); o[k] = (o[k] || 0) + 1; } return Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '); };
console.log(`LOST CONTINUATIONS · ${CAREERS} careers × 34 years`);
console.log(`  seasons and sequels gone on without you: ${recs.length} (${(recs.length / CAREERS).toFixed(1)} a career) · seasons ${recs.filter((r) => r.kind === 'season').length} · parts ${recs.filter((r) => r.kind === 'part').length}`);
console.log(`  what happened to you: ${by((r) => r.you)}`);
console.log(`  why: ${by((r) => r.how)}`);
console.log(`  somebody real in your part: ${pct(recs.filter((r) => r.by).length, recs.filter((r) => r.you !== 'writtenOut' && r.you !== 'killed' && r.show === 'on').length)} of those with a part to fill`);
const out = recs.filter((r) => r.result);
console.log(`  came out without you so far: ${out.length} · told ${pct(out.filter((r) => r.told).length, out.length)} · still to come ${recs.filter((r) => r.show === 'on' && !r.result && r.you !== 'returned').length} · not made ${recs.filter((r) => r.show === 'notMade').length} · you went back ${recs.filter((r) => r.you === 'returned').length}`);
console.log(`  how it did without you: ${by((r) => (r.result ? r.result.verdict : '—'))} · renewed again ${pct(out.filter((r) => r.result.renewed).length, out.filter((r) => r.kind === 'season').length)}`);
console.log(`  the fans: furious with you ${fans.furious} · furious with the network ${fans.network} · sorry ${fans.sorry} · nothing ${Math.max(0, recs.filter((r) => r.tier !== 'supporting').length - fans.furious - fans.network - fans.sorry)}`);
console.log(`  told by the trades (mails left in inboxes) ${tally.mails} · "Without you" still queued at the end ${tally.queued}`);
const later = recs.reduce((n, r) => n + (r.later || []).length, 0), laterUntold = recs.reduce((n, r) => n + (r.later || []).filter((x) => !x.told).length, 0);
console.log(`  the show after that: ${later} later seasons worked out (${laterUntold} not yet told) · ended: ${recs.filter((r) => r.ended).length} (cancelled ${recs.filter((r) => r.ended && r.ended.why === 'cancelled').length}, ran its course ${recs.filter((r) => r.ended && r.ended.why === 'capped').length})`);
console.log(`  untold after coming out: ${untold.length}`);
for (const u of untold) console.log('    ' + u);
