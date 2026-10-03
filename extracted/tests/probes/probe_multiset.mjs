// What the second and third set actually cost.
//
// The career audit found that an aggressive player holds two or three sets for 70% of a career
// and comes out with 84 screen credits against an ordinary player's 41. The question is whether
// that is bought or free — so this counts the price, under the rules exactly as they are.
//
// Read from the source first, measured second. Nothing here changes anything.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const PR = await import(P + 'systems/career/production.js');
const K = await import(P + 'systems/career/castings.js');
const T = await import(P + 'systems/career/training.js');
const W = await import(P + 'systems/life/work.js');
const SETS = await import(P + 'engine/sets.js');

const N = Number(process.argv[2] || 12);
const YEARS = 32;
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

// Everything that happens in a month, filed by how many sets were running when it happened.
const byCount = [0, 1, 2, 3].map(() => ({ months: 0, ap: 0, apMax: 0, mental: 0, strain: 0,
  fame: 0, health: 0, films: 0, ratingSum: 0, ratings: 0, broke: 0, ill: 0, burnout: 0 }));
// Every film with the craft and the load it was made under, so the two can be told apart.
const shots = [];

function career() {
  let s = actor();
  let seen = 0;
  let lastFame = 0;
  for (let m = 0; m < YEARS * 12; m++) {
    s.bigMoment = null; s.pendingArc = null;
    if (!s.job && (s.fame || 0) < 22) { const j = W.availableJobs(s).filter((x) => x.slots === 1).slice(-1)[0]; if (j) W.takeJob(s, j.id); }
    if (s.job && (s.fame || 0) > 35) W.quitJob(s);
    const best = [...T.SCHOOLS].reverse().find((sc) => (s.cash || 0) > sc.cost * 4);
    if (best && (s.ap || 0) > 1) T.train(s, best.id);
    K.refreshCastingPool(s);
    if (!(s.submissions || []).length) {
      const pool = (s.castingPool || []).map((c) => ({ c, o: K.castingChance(s, c) })).sort((a, b) => b.o - a.o);
      if (pool[0] && (s.ap || 0) > 0) K.auditionFor(s, pool[0].c.id, 78);
    }
    // Takes every set the rules will let it hold. That is the strategy under audit.
    for (const o of [...(s.offers || [])].sort((a, b) => (b.salary || 0) - (a.salary || 0))) {
      if (!SETS.canTakeSet(s, o).ok) continue;
      PR.startProduction(s, o); s.offers = s.offers.filter((x) => x.id !== o.id);
    }
    const long = SETS.sets(s).filter((p) => !SETS.isShort(p)).length;
    const n = Math.min(3, SETS.sets(s).length);
    const b = byCount[n];
    b.months++; b.ap += s.apMaxEff || 0; b.apMax += s.apMax || 100;
    b.mental += s.mental || 0; b.strain += s.strain || 0; b.health += s.health || 0;
    if ((s.apMaxEff || 100) < 45) b.broke++;
    if (s.illness) b.ill++;
    if (s.burnout && s.burnout.left > 0) b.burnout++;
    let g = 0;
    while ((s.ap || 0) > 0 && g++ < 5) { if (s.production) PR.rehearse(s); else break; }
    lastFame = s.fame || 0;
    s = advanceMonth(s);
    if (!s.alive) break;
    b.fame += Math.max(0, (s.fame || 0) - lastFame);
    // A credit that opened this month was SHOT under whatever load was running then; close
    // enough for the question, which is whether a crowded year makes worse films.
    const film = s.filmography || [];
    for (let i = 0; i < film.length - seen; i++) {
      const c = film[i];
      if (c && !c.minor && SCREEN.has(c.scale)) { b.films++; b.ratingSum += c.rating || 0; b.ratings++;
        shots.push({ load: n, craft: Math.round(s.acting || 0), fame: Math.round(s.fame || 0), rating: c.rating || 0, scale: c.scale, meter: c.meter || 0 }); }
    }
    seen = film.length;
    void long;
  }
  return s;
}
for (let i = 0; i < N; i++) career();

const tot = byCount.reduce((n, b) => n + b.months, 0);
const av = (x, n) => (n ? (x / n) : 0);
console.log(`WHAT A SECOND AND THIRD SET COST  ·  ${N} aggressive careers, ${YEARS} years, rules unchanged`);
console.log();
console.log('  sets   months    share   energy/mo   mental   strain   health   fame/yr   films   avg rating');
for (let n = 0; n <= 3; n++) {
  const b = byCount[n];
  if (!b.months) continue;
  console.log(`  ${n === 3 ? '3+' : ' ' + n}  ${String(b.months).padStart(8)}  ${String(Math.round(b.months / tot * 100) + '%').padStart(6)}` +
    `   ${av(b.ap, b.months).toFixed(0).padStart(7)}   ${av(b.mental, b.months).toFixed(0).padStart(6)}   ${av(b.strain, b.months).toFixed(0).padStart(6)}` +
    `   ${av(b.health, b.months).toFixed(0).padStart(6)}   ${(av(b.fame, b.months) * 12).toFixed(1).padStart(7)}   ${String(b.films).padStart(5)}   ${av(b.ratingSum, b.ratings).toFixed(1).padStart(10)}`);
}
console.log();
console.log('  trouble, as a share of the months spent at that load:');
for (let n = 0; n <= 3; n++) {
  const b = byCount[n];
  if (!b.months) continue;
  console.log(`    ${n === 3 ? '3+' : n} sets   under 45 energy ${String(Math.round(b.broke / b.months * 100) + '%').padStart(4)}   ill ${String(Math.round(b.ill / b.months * 100) + '%').padStart(4)}   signed off ${String(Math.round(b.burnout / b.months * 100) + '%').padStart(4)}`);
}

// ── the same question with the career stage held still ───────────────────────
// Above, a film made under three sets is rated thirteen points higher than one made under none.
// That is not what overload does; it is who gets to run three sets. Nobody holds a third call
// sheet until they are respected, skilled, rich and past the years of taking anything going.
// Split by craft, and ask again.
console.log();
console.log('SAME QUESTION, CRAFT HELD STILL  ·  average rating of a film by how many sets were running');
console.log('  craft        0 sets    1 set    2 sets    3+ sets');
const CRAFT = [[0, 49], [50, 69], [70, 84], [85, 100]];
for (const [lo, hi] of CRAFT) {
  const row = [0, 1, 2, 3].map((L) => {
    const g = shots.filter((x) => x.load === L && x.craft >= lo && x.craft <= hi);
    return g.length ? `${(g.reduce((n, x) => n + x.rating, 0) / g.length).toFixed(1)} (${g.length})` : '—';
  });
  console.log(`  ${String(lo + '-' + hi).padEnd(10)} ${row.map((r) => r.padStart(9)).join(' ')}`);
}
// And the performance itself — the meter is what the actor put into the picture, before the
// script and the director are added. If spreading yourself thin costs anything, it is here.
console.log();
console.log('  and the performance (meter) the actor delivered, by craft and load:');
for (const [lo, hi] of CRAFT) {
  const row = [0, 1, 2, 3].map((L) => {
    const g = shots.filter((x) => x.load === L && x.craft >= lo && x.craft <= hi && x.meter > 0);
    return g.length ? `${(g.reduce((n, x) => n + x.meter, 0) / g.length).toFixed(1)} (${g.length})` : '—';
  });
  console.log(`  ${String(lo + '-' + hi).padEnd(10)} ${row.map((r) => r.padStart(9)).join(' ')}`);
}
