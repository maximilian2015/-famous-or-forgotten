// Three ways to live a career, side by side: `node tests/probes/probe_burnout.mjs [careers] [years]`.
//
//   careful    one set at a time, signs only when the load is low, rests whenever it is free
//   ambitious  up to two sets, signs while below "tired", rests between jobs
//   nonstop    every set the rules allow, signs everything, never rests, ignores the doctor
//
// Burnout Core is judged on these (ROADMAP Step 1b): no strategy should be automatically best,
// and nonstop must not sit at 100 for decades for free. Seeded, so a change can be compared run
// to run. What it counts is what the game did, read off the state — not what it was told to do.
import '../helpers/seeded.mjs';
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const K = await import(P + 'systems/career/castings.js');
const PR = await import(P + 'systems/career/production.js');
const ST = await import(P + 'systems/career/story.js');
const W = await import(P + 'systems/life/work.js');
const EM = await import(P + 'systems/meta/email.js');
const D = await import(P + 'systems/career/demands.js');
const SC = await import(P + 'systems/career/scenes.js');
const A = await import(P + 'systems/life/arcs.js');
const AC = await import(P + 'systems/career/actions.js');
const SL = await import(P + 'systems/life/strain.js');
const BO = await import(P + 'systems/life/burnout.js').catch(() => null);   // Burnout Core, once it exists

const CAREERS = +process.argv[2] || 12, YEARS = +process.argv[3] || 20;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const STRATS = {
  careful: { sets: 1, signBelow: 45, rest: true, doctor: 'rest' },
  ambitious: { sets: 2, signBelow: 60, rest: true, doctor: 'mixed' },
  nonstop: { sets: 3, signBelow: 101, rest: false, doctor: 'ignore' },
};

function answer(t, how, r) {
  for (let k = 0; k < 4 && t.pendingArc; k++) {
    const arc = t.pendingArc; const ch = arc.choices || []; const n = ch.length || 1;
    let i = Math.floor(Math.random() * n);
    // The doctor and the studio: each strategy answers them in character.
    if (arc.health === 'doctor') r.doctor++;
    if (arc.health) {
      const idx = (re) => ch.findIndex((c) => re.test(c.id || c.label || ''));
      const rest = idx(/pause|rest|stop|doctor|sign off|break/i), push = idx(/carry|push|keep|ignore|again|finish/i);
      if (how === 'rest' && rest >= 0) i = rest;
      else if (how === 'ignore' && push >= 0) i = push;
      else if (how === 'mixed') i = Math.random() < 0.5 && rest >= 0 ? rest : push >= 0 ? push : i;
    }
    A.resolveArc(t, i);
    if (t.pendingArc === arc) { t.pendingArc = null; break; }
  }
}

function month(t, st, r) {
  t.bigMoment = null;
  answer(t, st.doctor, r);
  if (t.scene) SC.resolveScene(t, 40 + Math.random() * 55);
  for (const p of t.productions || []) {
    if (!p.demand) continue;
    const opts = D.optionsFor(t, p); if (opts.length) D.answerDemand(t, p.id, pick(opts).id);
  }
  for (const p of t.productions || []) if (!p.take) { const opts = ST.takesFor(p); if (opts.length) ST.pushTake(t, pick(opts)); }
  if (!t.job && (t.fame || 0) < 20) { const j = W.availableJobs(t)[0]; if (j) W.takeJob(t, j.id); }
  if (t.job && (t.fame || 0) > 35) W.quitJob(t);
  // A career break, where the game offers one and the strategy wants one.
  if (BO && BO.canTakeBreak && st.rest && (t.strain || 0) >= (st.sets === 1 ? 70 : 88) && BO.canTakeBreak(t).ok) {
    BO.takeBreak(t, st.sets === 1 ? 3 : 6); r.breaks++;
  }
  const load = t.strain || 0;
  const n = (t.productions || []).length;
  K.refreshCastingPool(t);
  if (n < 1 && (t.ap || 0) >= 30 && (t.castingPool || []).length && load < st.signBelow) {
    const c = pick(t.castingPool); if (Math.random() < 0.4) K.prepareFor(t, c.id); K.auditionFor(t, c.id, 45 + Math.random() * 40);
  }
  if ((t.offers || []).length && n < st.sets && load < st.signBelow && SL.canWork(t).ok) {
    const o = t.offers[0]; PR.startProduction(t, o); t.offers = t.offers.filter((x) => x.id !== o.id);
  }
  if (st.rest && !(t.productions || []).length && (t.ap || 0) >= 10) AC.runAction(t, 'rest');
  for (const p of t.productions || []) if ((p.monthsLeft || 0) === 1 && !p.paused) { r.meter += p.meter || 0; r.wraps++; }
  const before = { cash: t.cash, burnouts: t.burnouts || 0, frozen: (t.frozen || []).length };
  t = advanceMonth(t);
  const L = (t.inbox || []).find((x) => x.tag === 'agent'); if (L) EM.emailAct(t, L.id, 0);
  // the reading
  r.months++;
  if ((t.strain || 0) >= 82) r.red++;
  if ((t.strain || 0) >= 95) r.top++;
  if (SL.burnedOut(t)) r.off++;
  if ((t.burnouts || 0) > before.burnouts) r.collapses++;
  r.peakFame = Math.max(r.peakFame, t.fame || 0);
  return t;
}

function career(strat, life) {
  const st = STRATS[strat];
  let t = createInitialState({ name: strat + life, dream: 'actor', created: true, gender: life % 2 ? 'female' : 'male' });
  beginLife(t);
  Object.assign(t, { stage: 'career', ageY: 22, year: 2050, month: 0, hasApartment: true, housing: 'room', cash: 9000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, fame: 0, peakFame: 0 });
  const r = { months: 0, red: 0, top: 0, off: 0, collapses: 0, breaks: 0, peakFame: 0, doctor: 0, meter: 0, wraps: 0 };
  for (let m = 0; m < YEARS * 12 && t.alive !== false; m++) {
    try { t = month(t, st, r); } catch (e) { r.threw = e.message + ' ' + (e.stack || '').split('\n')[1]; break; }
    if (m % 24 === 23) t = JSON.parse(JSON.stringify(t));
  }
  const credits = (t.filmography || []).filter((c) => !c.minor);
  const tl = JSON.stringify(t.timeline || []);
  Object.assign(r, {
    cash: t.cash || 0, fame: t.fame || 0, standing: t.respect || 0, credits: credits.length,
    rating: credits.length ? credits.reduce((a, c) => a + (c.rating || 0), 0) / credits.length : 0,
    pauses: (t.medical || []).filter((m) => !m.forced).length,
    held: (JSON.stringify(t.timeline || []).match(/will wait for you|shoot around you/g) || []).length,
    cut: (JSON.stringify(t.timeline || []).match(/finish without your last scenes|wrote your character out/g) || []).length,
    lost: (t.lostToHealth || []).length + (tl.match(/was recast\. They held it open|formally abandoned\. It stopped when you/g) || []).length,
    depression: t.depression ? 1 : 0, health: t.health || 0, alive: t.alive !== false ? 1 : 0,
  });
  return r;
}

const t0 = Date.now();
const out = {};
for (const strat of Object.keys(STRATS)) {
  const rows = []; for (let i = 0; i < CAREERS; i++) rows.push(career(strat, i));
  out[strat] = rows;
}
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const avg = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
console.log(`${CAREERS} careers × ${YEARS} years per strategy — ${Math.round((Date.now() - t0) / 1000)} s${BO ? '' : ' (no burnout.js yet: baseline)'}\n`);
const cols = [
  ['red 82+ %', (r) => (100 * r.red) / r.months, avg], ['at 95+ %', (r) => (100 * r.top) / r.months, avg],
  ['collapses', (r) => r.collapses, avg], ['signed off mo', (r) => r.off, avg], ['breaks', (r) => r.breaks, avg],
  ['held', (r) => r.held, avg], ['cut', (r) => r.cut, avg], ['films lost', (r) => r.lost, avg], ['doctor', (r) => r.doctor, avg], ['pauses', (r) => r.pauses, avg], ['credits', (r) => r.credits, med], ['meter@wrap', (r) => r.meter / (r.wraps || 1), avg], ['avg rating', (r) => r.rating, avg],
  ['peak fame', (r) => r.peakFame, med], ['Standing', (r) => r.standing, med], ['cash €m', (r) => r.cash / 1e6, med],
  ['health', (r) => r.health, avg], ['depressed', (r) => r.depression, avg],
];
console.log('strategy  ' + cols.map((c) => c[0].padStart(13)).join(''));
for (const [k, rows] of Object.entries(out)) console.log(k.padEnd(10) + cols.map(([, f, agg]) => agg(rows.map(f)).toFixed(1).padStart(13)).join(''));
// Alex Moon (saves/, April 2079, strain 100, 0 burnouts), loaded the way the game loads it and lived
// ten more years by each strategy: the save Maxi looked at and asked why nothing happens.
import fs from 'node:fs';
const SAVE = new URL('../../../saves/famous-Alex-Moon-53-2079.json', import.meta.url);
if (fs.existsSync(SAVE)) {
  const raw = fs.readFileSync(SAVE, 'utf8');
  globalThis.localStorage = { getItem: (k) => (k === 'fof_react_save' ? raw : null), setItem() {}, removeItem() {} };
  const { getState } = await import(P + 'state/store.js');
  console.log('\nAlex Moon, ten more years from strain ' + Math.round(getState().strain || 0) + ':');
  for (const strat of Object.keys(STRATS)) {
    let t = JSON.parse(JSON.stringify(getState()));
    const r = { months: 0, red: 0, top: 0, off: 0, collapses: 0, breaks: 0, peakFame: 0, doctor: 0, meter: 0, wraps: 0 };
    const c0 = (t.filmography || []).length, cash0 = t.cash || 0;
    for (let m = 0; m < 120 && t.alive !== false; m++) { try { t = month(t, STRATS[strat], r); } catch (e) { r.threw = e.message; break; } }
    console.log(`  ${strat.padEnd(10)} at 95+ ${Math.round((100 * r.top) / r.months)}% · doctor ${r.doctor} · forced stops ${r.collapses} · pauses ${(t.medical || []).filter((x) => !x.forced).length} · breaks ${r.breaks} · lost ${(t.lostToHealth || []).length} · credits +${(t.filmography || []).length - c0} · €${Math.round(((t.cash || 0) - cash0) / 1e6)}m · health ${Math.round(t.health)} · fame ${Math.round(t.fame)}${r.threw ? ' · THREW ' + r.threw : ''}`);
  }
}
const threw = Object.values(out).flat().filter((r) => r.threw);
if (threw.length) { console.log('\nTHREW:', threw.length, threw[0].threw); process.exit(1); }
