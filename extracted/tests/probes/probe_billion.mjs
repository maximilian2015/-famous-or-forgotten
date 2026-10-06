// Did making overload cost something take the billions down.
//
// Before the fix an aggressive player made 84 screen credits to an ordinary player's 41, at the
// same quality, and so got three times the chances at an enormous hit for twenty energy a set.
// The fix puts the price on the work (production.js shootTick). This measures whether that
// reaches the only number anybody cares about: how many billion-euro films a career produces.
//
// Run twice from the shell, once with the penalty and once with it zeroed, so "before" and
// "after" are the same code on the same profiles. Measurement only; nothing here changes
// anything and nothing is committed from it.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const PR = await import(P + 'systems/career/production.js');
const K = await import(P + 'systems/career/castings.js');
const T = await import(P + 'systems/career/training.js');
const W = await import(P + 'systems/life/work.js');
const SETS = await import(P + 'engine/sets.js');

const N = Number(process.argv[2] || 25);
const LABEL = process.argv[3] || '';
const YEARS = 32;
// A sweep over one constant wants one profile and many runs, not both profiles and few:
// pass 'aggressive' or 'normal' as the fourth argument.
const ONLY = process.argv[4] || '';
const SCREEN = new Set(['small', 'indie', 'festival', 'feature', 'blockbuster']);

function actor() {
  const s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true,
    housing: 'flat', cash: 20000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, acting: 40,
    fame: 0, peakFame: 0, respect: 20, offers: [], castingPool: [], submissions: [],
    running: [], releases: [], laterOffers: [], frozen: [] });
  return s;
}

// A film is linked to the load it was SHOT under by consuming a pending record when the credit
// appears. Films open in the order they wrapped, so the oldest unconsumed record of that title
// is the right one. Matching on title alone was what made the last probe lie — it found
// unreleased entries with placeholder scores — so a record is consumed exactly once.
function career(kind) {
  const aggressive = kind === 'aggressive';
  let s = actor();
  let seen = 0;
  const pending = [];                 // { title, load, meter } waiting for their credit
  const byLoad = new Map();           // production id -> loads seen
  const made = [];                    // { load, rating, gross, scale, world }
  for (let m = 0; m < YEARS * 12; m++) {
    s.bigMoment = null; s.pendingArc = null;
    if (!s.job && (s.fame || 0) < 22) { const j = W.availableJobs(s).filter((x) => x.slots === 1).slice(-1)[0]; if (j) W.takeJob(s, j.id); }
    if (s.job && (s.fame || 0) > 35) W.quitJob(s);
    const best = [...T.SCHOOLS].reverse().find((sc) => (s.cash || 0) > sc.cost * (aggressive ? 4 : 8));
    if (best && (s.ap || 0) > 1) T.train(s, best.id);
    K.refreshCastingPool(s);
    const canRead = aggressive ? true : !s.production;
    if (canRead && !(s.submissions || []).length) {
      const pool = (s.castingPool || []).map((c) => ({ c, o: K.castingChance(s, c) })).sort((a, b) => b.o - a.o);
      if (pool[0] && (s.ap || 0) > 0) K.auditionFor(s, pool[0].c.id, aggressive ? 78 : 62);
    }
    for (const o of [...(s.offers || [])].sort((a, b) => (b.salary || 0) - (a.salary || 0))) {
      if (!aggressive && SETS.sets(s).length >= 1) break;          // one picture at a time
      if (!SETS.canTakeSet(s, o).ok) continue;
      PR.startProduction(s, o); s.offers = s.offers.filter((x) => x.id !== o.id);
      if (!aggressive) break;
    }
    const running = SETS.sets(s).filter((q) => !SETS.isShort(q) && (q.prepLeft || 0) <= 0 && !q.paused).length;
    for (const p of SETS.sets(s)) {
      if ((p.prepLeft || 0) > 0 || p.paused) continue;
      if (!byLoad.has(p.id)) byLoad.set(p.id, { loads: [], title: p.title, meter: p.meter });
      const r = byLoad.get(p.id); r.loads.push(running); r.meter = p.meter;
    }
    if (aggressive) { let g = 0; while ((s.ap || 0) > 0 && g++ < 5) { if (s.production) PR.rehearse(s); else break; } }
    s = advanceMonth(s);
    if (!s.alive) break;
    for (const [id, r] of byLoad) {
      if (SETS.sets(s).some((p) => p.id === id)) continue;
      pending.push({ title: r.title, load: Math.round(r.loads.reduce((x, y) => x + y, 0) / Math.max(1, r.loads.length)), meter: r.meter });
      byLoad.delete(id);
    }
    const film = s.filmography || [];
    for (let i = 0; i < film.length - seen; i++) {
      const c = film[i];
      if (!c || c.minor || !SCREEN.has(c.scale)) continue;
      const k = pending.findIndex((x) => x.title === c.title);
      made.push({ credit: c, load: k >= 0 ? pending[k].load : null, meter: k >= 0 ? pending[k].meter : null });
      if (k >= 0) pending.splice(k, 1);
    }
    seen = film.length;
  }
  // The money is only on a credit once its run has closed, which is why this is read at the end.
  for (const r of made) { r.gross = r.credit.boxOffice || 0; r.rating = r.credit.rating || 0; r.scale = r.credit.scale; r.world = r.credit.status === 'World Hit'; }
  return { s, made };
}

const q = (a, p) => (a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : 0);
// Past a thousand million, say it in billions. "€1299m" is a number you have to stop and
// count the digits of, which is the opposite of what a table is for.
const M = (n) => (n >= 1e9 ? '€' + (n / 1e9).toFixed(3) + 'bn' : '€' + Math.round(n / 1e6) + 'm');
const pc = (a, over) => (a.length ? Math.round(a.filter((x) => x >= over).length / a.length * 100) : 0);
const avg = (a) => (a.length ? a.reduce((n, x) => n + x, 0) / a.length : 0);
const band = (l) => { const b = [0, 0, 0, 0, 0]; for (const x of l) b[Math.min(4, x)]++; return b.map((n) => Math.round(n / l.length * 100)); };

console.log(`${LABEL}  ·  ${N} careers each, ${YEARS} years`);
for (const kind of (ONLY ? [ONLY] : ['aggressive', 'normal'])) {
  const runs = [];
  for (let i = 0; i < N; i++) runs.push(career(kind));
  const all = runs.flatMap((r) => r.made);
  const bb = all.filter((x) => x.scale === 'blockbuster' && x.gross > 0);
  const g = bb.map((x) => x.gross);
  const perCareer = runs.map((r) => ({
    films: r.made.length,
    world: r.made.filter((x) => x.world).length,
    bn: r.made.filter((x) => x.gross >= 1e9).length,
  }));
  console.log();
  console.log(`  ${kind.toUpperCase()}`);
  console.log(`    screen films/career ${avg(perCareer.map((x) => x.films)).toFixed(1)}   ·   avg rating ${avg(all.map((x) => x.rating)).toFixed(1)}   ·   avg blockbuster rating ${avg(bb.map((x) => x.rating)).toFixed(1)}`);
  console.log(`    blockbuster gross  median ${M(q(g, 0.5))}  P75 ${M(q(g, 0.75))}  P90 ${M(q(g, 0.9))}  P95 ${M(q(g, 0.95))}   (n=${g.length})`);
  console.log(`    over €700m ${pc(g, 700e6)}%   ·   over €1bn ${pc(g, 1e9)}%`);
  console.log(`    per career:  world hits ${avg(perCareer.map((x) => x.world)).toFixed(2)}   ·   billion-euro films ${avg(perCareer.map((x) => x.bn)).toFixed(2)}`);
  console.log(`    careers by billion-euro films:  ` + band(perCareer.map((x) => x.bn)).map((n, i) => `${i === 4 ? '4+' : i}: ${n}%`).join('  '));
  if (kind === 'aggressive') {
    console.log('    films by the load they were shot under:');
    for (const L of [1, 2, 3]) {
      const sub = all.filter((x) => x.load === L);
      const sg = sub.filter((x) => x.scale === 'blockbuster' && x.gross > 0).map((x) => x.gross);
      console.log(`      ${L} set${L > 1 ? 's' : ''}:  ${String(sub.length).padStart(4)} films  ·  avg rating ${avg(sub.map((x) => x.rating)).toFixed(1)}` +
        `  ·  blockbuster median ${sg.length ? M(q(sg, 0.5)) : '—'}  ·  over €1bn ${sg.length ? pc(sg, 1e9) + '%' : '—'}  (n=${sg.length})`);
    }
  }
}
