// What a franchise and a show actually look like from the inside, printed job by job.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const PR = await import(P + 'systems/career/production.js');

const M = (n) => n >= 1e6 ? '€' + (n / 1e6).toFixed(1) + 'm' : '€' + Math.round(n / 1000) + 'k';

function star(fame = 78) {
  const s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 30, year: 2056, month: 0, hasApartment: true,
    housing: 'flat', cash: 3000000, alive: true, fame, peakFame: fame, acting: 88, respect: 70,
    ap: 3, apMax: 3, apMaxEff: 3, offers: [], castingPool: [], submissions: [], running: [], releases: [] });
  return s;
}

// Take the first part, then keep saying yes to whatever the franchise offers next.
function chain(first, label, cap = 40) {
  let s = star();
  PR.startProduction(s, first);
  const log = [];
  for (let y = 0; y < cap * 12; y++) {
    s.bigMoment = null; s.pendingArc = null;
    if (s.production) for (let a = 0; a < (s.ap || 0); a++) PR.rehearse(s);
    // Say yes to anything from the same family, and nothing else.
    if (!s.production && (s.offers || []).length) {
      const nxt = (s.offers || []).find((o) => o.kind === 'sequel' || o.kind === 'renewal');
      if (nxt) { PR.startProduction(s, nxt); s.offers = s.offers.filter((x) => x.id !== nxt.id); }
      else s.offers = [];
    }
    const before = (s.filmography || []).length;
    s = advanceMonth(s);
    if (!s.alive) { log.push('  (died)'); break; }
    const c = (s.filmography || [])[0];
    if (c && !c.running && !c._logged && (s.filmography || []).length >= 1) {
      const already = log.some((l) => l.includes(`"${c.title}"`));
      if (!already && c.score != null) {
        c._logged = true;
        log.push(`  year ${s.year - 2056}: "${c.title}" — paid ${M(c.salary)} · ${c.score}/10 · `
          + (c.boxOffice ? `${M(c.boxOffice)} box office · ${c.verdict}` : `${c.viewers}m watching · ${c.verdict}`));
      }
    }
    // Nothing left in the pipeline and nothing on offer: the family is over.
    if (!s.production && !(s.offers || []).length && !(s.releases || []).length
      && !(s.running || []).length && !(s.laterOffers || []).length) break;
  }
  console.log(`\n${label}`);
  log.forEach((l) => console.log(l));
  return s;
}

console.log('════ A FILM FRANCHISE ════');
chain({
  id: 'f1', projectTitle: 'Creepy Man', role: 'Lead', type: 'Feature Film', genre: 'Sci-Fi',
  salary: 6000000, months: 9, tier: 'tentpole', scale: 'blockbuster', prestigeScore: 82, stability: 96,
}, 'Creepy Man — a blockbuster, first outing paid €6.0m:');

console.log('\n════ A TELEVISION SHOW ════');
chain({
  id: 't1', projectTitle: 'Lost Signal', role: 'Series regular', type: 'Drama Series', genre: 'Crime',
  salary: 1400000, months: 5, tier: 'lead', scale: 'recurring', episodes: 14, episodeFee: 100000,
  season: 1, prestigeScore: 58, stability: 90,
}, 'Lost Signal — a network drama, first season €100k an episode:');

// ── how far franchises actually get, over many lives ─────────────────────────
console.log('\n════ HOW FAR THEY GET (60 runs each) ════');
function depth(first, isSeries) {
  let parts = 0;
  let s = star();
  PR.startProduction(s, { ...first, id: 'x' + Math.random() });
  for (let m = 0; m < 40 * 12; m++) {
    s.bigMoment = null; s.pendingArc = null;
    if (s.production) for (let a = 0; a < (s.ap || 0); a++) PR.rehearse(s);
    if (!s.production && (s.offers || []).length) {
      const nxt = (s.offers || []).find((o) => o.kind === 'sequel' || o.kind === 'renewal');
      if (nxt) { parts++; PR.startProduction(s, nxt); s.offers = s.offers.filter((x) => x.id !== nxt.id); }
      else s.offers = [];
    }
    s = advanceMonth(s);
    if (!s.alive) break;
    if (!s.production && !(s.offers || []).length && !(s.releases || []).length
      && !(s.running || []).length && !(s.laterOffers || []).length) break;
  }
  return parts + 1;
}
const filmDepths = [], tvDepths = [];
for (let i = 0; i < 60; i++) {
  filmDepths.push(depth({ id: 'f', projectTitle: 'Creepy Man', role: 'Lead', type: 'Feature Film',
    genre: 'Sci-Fi', salary: 6000000, months: 9, tier: 'tentpole', scale: 'blockbuster', prestigeScore: 82, stability: 96 }));
  tvDepths.push(depth({ id: 't', projectTitle: 'Lost Signal', role: 'Series regular', type: 'Drama Series',
    genre: 'Crime', salary: 1400000, months: 5, tier: 'lead', scale: 'recurring', episodes: 14,
    episodeFee: 100000, season: 1, prestigeScore: 58, stability: 90 }, true));
}
const tally = (a) => { const t = {}; for (const n of a) t[n] = (t[n] || 0) + 1; return t; };
const avg = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
console.log('  films  — parts reached: ' + JSON.stringify(tally(filmDepths)) + '  average ' + avg(filmDepths));
console.log('  shows  — seasons run:   ' + JSON.stringify(tally(tvDepths)) + '  average ' + avg(tvDepths));
