// Does specialising in a genre still mean anything after thirty years?
//
// Maxi: "если после долгой карьеры можно получить Drama +10, Thriller +10, Comedy +10,
// Romance +10, специализация перестаёт что-либо значить. Но сначала измерить."
//
// The model, read off career/genres.js rather than remembered: a credit is worth 1, 2 or 3 XP
// by its rating, XP caps at 20 per genre, the rating bonus is min(10, xp/2) — and **nothing
// ever fades**. So the ceiling of +10 arrives at 20 XP, which is seven good films or twenty
// bad ones in one lane, and once reached it can never be lost. Whether that makes four maxed
// lanes a normal career or an impossible one is a question about the CALENDAR, not the table,
// and the calendar is what this measures. Nobody here is told which genres to take: the three
// players are the ones from probe_career_flow.
//
// MEASURED, 14 careers each, 32 years (7 Oct):
//   normal       67 credits   1.1 lanes at +10   best +10, fourth +6   specialist gap 4
//   deliberate   64 credits   1.0 lanes at +10   best +10, fourth +4   specialist gap 6
//   struggling   49 credits   0.0 lanes at +10   best  +6, fourth +3   specialist gap 3
//   maximiser   133 credits   4.9 lanes at +10   every lane +10         specialist gap 0
// So specialisation still means something for everybody except the player who takes every part
// the rules allow: at 133 credits the whole table saturates and a lane is worth nothing, because
// XP never fades. The lever, if one is ever wanted, is a yearly fade like the one typecast
// already has — not a lower cap. Nothing is changed here; this is the measurement.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const PR = await import(P + 'systems/career/production.js');
const K = await import(P + 'systems/career/castings.js');
const T = await import(P + 'systems/career/training.js');
const W = await import(P + 'systems/life/work.js');
const G = await import(P + 'systems/career/genres.js');
const TC = await import(P + 'systems/meta/typecast.js');
const SETS = await import(P + 'engine/sets.js');

const N = Number(process.argv[2] || 12);
const YEARS = 32;

function actor() {
  const s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true,
    housing: 'flat', cash: 20000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, acting: 40,
    fame: 0, peakFame: 0, respect: 20, offers: [], castingPool: [], submissions: [],
    running: [], releases: [], laterOffers: [], frozen: [] });
  return s;
}
// `lane` is the fourth player and the only one who is told anything: it reads for the genre it
// has most of, which is what a person who wants to be the horror name would actually do.
function career(kind) {
  let s = actor();
  for (let m = 0; m < YEARS * 12; m++) {
    s.bigMoment = null; s.pendingArc = null;
    if (!s.job && (s.fame || 0) < 22) { const j = W.availableJobs(s).filter((x) => x.slots === 1).slice(-1)[0]; if (j) W.takeJob(s, j.id); }
    if (s.job && (s.fame || 0) > 35) W.quitJob(s);
    if (kind !== 'struggling') {
      const best = [...T.SCHOOLS].reverse().find((sc) => (s.cash || 0) > sc.cost * (kind === 'aggressive' ? 4 : 8));
      if (best && (s.ap || 0) > 1) T.train(s, best.id);
    }
    K.refreshCastingPool(s);
    const canRead = kind === 'aggressive' ? true : !s.production;
    if (canRead && !(s.submissions || []).length) {
      const pool = (s.castingPool || []).map((c) => ({ c, o: K.castingChance(s, c) }));
      if (kind === 'struggling') pool.sort((a, b) => a.o - b.o);
      else if (kind === 'lane') {
        // The genre it already has the most of, and it stays in it when the board allows.
        const xp = s.genreXP || {};
        const mine = Object.keys(xp).sort((a, b) => (xp[b] || 0) - (xp[a] || 0))[0];
        pool.sort((a, b) => ((b.c.genre === mine ? 1 : 0) - (a.c.genre === mine ? 1 : 0)) || b.o - a.o);
      } else pool.sort((a, b) => b.o - a.o);
      if (pool[0] && (s.ap || 0) > 0) K.auditionFor(s, pool[0].c.id, kind === 'struggling' ? 44 : kind === 'normal' ? 62 : 78);
    }
    for (const o of [...(s.offers || [])].sort((a, b) => (b.salary || 0) - (a.salary || 0))) {
      if (kind === 'struggling' && Math.random() < 0.35) continue;
      if (kind !== 'aggressive' && SETS.sets(s).length >= 1) break;
      if (!SETS.canTakeSet(s, o).ok) continue;
      PR.startProduction(s, o); s.offers = s.offers.filter((x) => x.id !== o.id);
      if (kind !== 'aggressive') break;
    }
    if (kind === 'aggressive') { let g = 0; while ((s.ap || 0) > 0 && g++ < 5) { if (s.production) PR.rehearse(s); else break; } }
    s = advanceMonth(s);
    if (!s.alive) break;
  }
  const xp = s.genreXP || {};
  const lanes = Object.entries(xp).map(([g, v]) => ({ g, xp: v, bonus: G.genreBonus(s, g) }))
    .sort((a, b) => b.xp - a.xp);
  return { s, lanes,
    maxed: lanes.filter((l) => l.bonus >= 10).length,
    strong: lanes.filter((l) => l.bonus >= 8).length,
    touched: lanes.length,
    label: (TC.boxedInto(s) || '—'),
    credits: (s.filmography || []).filter((c) => !c.minor).length };
}

const KINDS = ['aggressive', 'normal', 'struggling', 'lane'];
const out = {};
for (const k of KINDS) { out[k] = []; for (let i = 0; i < N; i++) out[k].push(career(k)); }
const med = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);
const mean = (a) => (a.length ? a.reduce((n, x) => n + x, 0) / a.length : 0);

console.log(`GENRE MASTERY  ·  ${N} careers each, ${YEARS} years, the lanes chosen by the player`);
console.log(`XP caps at 20 per genre, bonus = xp/2 up to +10, and nothing fades.`);
console.log();
console.log('                 credits   genres tried   at +10   at +8 or more   best lane   the box they are in');
for (const k of KINDS) {
  const r = out[k];
  const best = med(r.map((x) => (x.lanes[0] || {}).bonus || 0));
  const boxes = {};
  for (const x of r) boxes[x.label] = (boxes[x.label] || 0) + 1;
  const top = Object.entries(boxes).sort((a, b) => b[1] - a[1])[0];
  console.log(`  ${k.padEnd(11)} ${String(med(r.map((x) => x.credits))).padStart(7)} ${String(med(r.map((x) => x.touched))).padStart(13)} ` +
    `${mean(r.map((x) => x.maxed)).toFixed(1).padStart(8)} ${mean(r.map((x) => x.strong)).toFixed(1).padStart(15)} ${('+' + best).padStart(11)}   ${top[0]} (${Math.round(top[1] / N * 100)}%)`);
}
console.log();
console.log('WHERE THE XP ACTUALLY SITS  (median bonus by lane rank, best lane first)');
for (const k of KINDS) {
  const cols = [];
  for (let i = 0; i < 6; i++) cols.push(med(out[k].map((x) => (x.lanes[i] || {}).bonus || 0)));
  const nth = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
  console.log(`  ${k.padEnd(11)} ` + cols.map((v, i) => `${nth[i]}:+${v}`).join('  '));
}
console.log();
console.log('A SPECIALIST AGAINST A GENERALIST  (how much the best lane beats the fourth)');
for (const k of KINDS) {
  const gaps = out[k].map((x) => ((x.lanes[0] || {}).bonus || 0) - ((x.lanes[3] || {}).bonus || 0));
  console.log(`  ${k.padEnd(11)} median gap ${med(gaps)} points of rating`);
}
