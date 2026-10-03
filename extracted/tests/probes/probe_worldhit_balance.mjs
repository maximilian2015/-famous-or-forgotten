// How often a world hit happens to a PERSON, which is the only number that matters here.
//
// Maxi: "игрок не ощущает 15.8% блокбастеров. Он ощущает: за мою карьеру я уже получил восьмой
// World Hit, мне уже всё равно." Quite right — a reward built for a once-in-a-career event is
// measured in careers, not in percentages of films.
//
// So this plays whole lives rather than generating films: thirty-two years a month at a time
// through the real casting board, the real auditions, the real productions and the real
// releases, on the loop probe_ladder already drives lives with. A synthetic film mix would be
// me inventing the answer, and it did: measured over films with fame spread evenly from 10 to
// 95, a world hit looked like 15.8% of blockbusters. Measured over careers, where the person
// making blockbusters is by definition famous, it is nothing like that.
//
// Two players, because one was not enough either. The first version ran only the competent one
// and every single career came out A-list, so "an ordinary career" could not be reported at all.
//
// One process per threshold from the shell — WORLD_GROSS is a module constant and ESM caches
// modules. Measurement only; nothing here changes anything.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const PR = await import(P + 'systems/career/production.js');
const K = await import(P + 'systems/career/castings.js');
const T = await import(P + 'systems/career/training.js');
const W = await import(P + 'systems/life/work.js');

const CAREERS = Number(process.argv[2] || 30);
const LABEL = process.argv[3] || '';
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

// `driven` is probe_ladder's player: trains every month it can afford, reads for the best odds
// on the board, takes the best-paid offer, works the set. `ordinary` is somebody with a life:
// trains when it is cheap, reads for about half of what comes up, takes whatever is in front of
// them, and puts no extra mornings into the picture.
function career(kind) {
  const driven = kind === 'driven';
  let s = actor();
  for (let m = 0; m < YEARS * 12; m++) {
    s.bigMoment = null; s.pendingArc = null;
    if (!s.job && (s.fame || 0) < 22) { const j = W.availableJobs(s).filter((x) => x.slots === 1).slice(-1)[0]; if (j) W.takeJob(s, j.id); }
    if (s.job && (s.fame || 0) > 35) W.quitJob(s);
    const schools = driven ? [...T.SCHOOLS].reverse() : [...T.SCHOOLS];
    const best = schools.find((sc) => (s.cash || 0) > sc.cost * (driven ? 4 : 12));
    if (best && (s.ap || 0) > 1 && (driven || Math.random() < 0.45)) T.train(s, best.id);
    K.refreshCastingPool(s);
    if (!s.production && !(s.offers || []).length && !(s.submissions || []).length) {
      const pool = (s.castingPool || []).map((c) => ({ c, o: K.castingChance(s, c) }));
      if (driven) pool.sort((a, b) => b.o - a.o);
      const want = driven || Math.random() < 0.55;
      if (pool[0] && want && (s.ap || 0) > 0) K.auditionFor(s, pool[0].c.id, driven ? 78 : 55);
    }
    if ((s.offers || []).length && !s.production) {
      const o = driven ? [...s.offers].sort((a, b) => (b.salary || 0) - (a.salary || 0))[0] : s.offers[0];
      PR.startProduction(s, o); s.offers = s.offers.filter((x) => x.id !== o.id);
    }
    if (driven) { let g = 0; while ((s.ap || 0) > 0 && g++ < 5) { if (s.production) PR.rehearse(s); else break; } }
    s = advanceMonth(s);
    if (!s.alive) break;
  }
  return s;
}

const FILM = new Set(['small', 'indie', 'festival', 'feature', 'blockbuster']);
const rows = [];
for (let i = 0; i < CAREERS; i++) { rows.push({ kind: 'driven', s: career('driven') }); rows.push({ kind: 'ordinary', s: career('ordinary') }); }

let films = 0, hits = 0, tent = 0, tentHits = 0, exc = 0, excHits = 0, plain = 0, plainHits = 0;
const careers = [];
for (const { kind, s } of rows) {
  const credits = (s.filmography || []).filter((c) => !c.minor && FILM.has(c.scale));
  let n = 0;
  for (const c of credits) {
    films++;
    const w = c.status === 'World Hit';
    if (w) { hits++; n++; }
    if (c.scale === 'blockbuster') { tent++; if (w) tentHits++; }
    // The shoot where everything landed forces the rating to 96, and the rating feeds the legs,
    // so an exceptional performance should reach the world more often. Nothing designs that in;
    // it falls out of the chain, and this is how much of it there is.
    if (c.exceptional) { exc++; if (w) excHits++; } else { plain++; if (w) plainHits++; }
  }
  careers.push({ kind, hits: n, peak: Math.round(s.peakFame || 0), credits: credits.length, counter: s.worldHits || 0 });
}

const pc = (a, b) => (b ? (a / b * 100).toFixed(1) + '%' : '—');
const band = (l) => { const b = [0, 0, 0, 0, 0]; for (const x of l) b[Math.min(4, x)]++; return b; };
const show = (l) => band(l.map((c) => c.hits)).map((n, i) => `${i === 4 ? '4+' : i}:${String(Math.round(n / l.length * 100)).padStart(3)}%`).join(' ');
const avg = (l) => (l.length ? (l.reduce((n, c) => n + c.hits, 0) / l.length).toFixed(2) : '—');

const alist = careers.filter((c) => c.peak >= 70);
const rest = careers.filter((c) => c.peak < 70);
console.log(`${LABEL.padEnd(7)} films ${String(films).padStart(5)} · world hits ${pc(hits, films)} of films · ${pc(tentHits, tent)} of ${tent} blockbusters`);
console.log(`        every career   avg ${avg(careers)}   [${show(careers)}]   n=${careers.length}`);
console.log(`        A-list, peak 70+  avg ${avg(alist)}   [${alist.length ? show(alist) : '—'}]   n=${alist.length}`);
console.log(`        everyone else     avg ${avg(rest)}   [${rest.length ? show(rest) : '—'}]   n=${rest.length}`);
console.log(`        exceptional shoots ${exc} → ${excHits} world hits (${pc(excHits, exc)})  ·  ordinary ${plain} → ${plainHits} (${pc(plainHits, plain)})`);
const mismatch = careers.filter((c) => c.counter !== c.hits).length;
if (mismatch) console.log(`        ⚠ s.worldHits disagrees with the filmography in ${mismatch} of ${careers.length}`);
