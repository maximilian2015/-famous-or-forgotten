// The argument on the first day, and what it does to the finished film.
const P = new URL('../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const PR = await import(P + 'systems/career/production.js');
const S = await import(P + 'systems/career/story.js');
const R = await import(P + 'systems/career/release.js');

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

function actor(over = {}) {
  const s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 34, year: 2060, month: 0, hasApartment: true,
    housing: 'flat', cash: 2000000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, acting: 82,
    fame: 60, peakFame: 60, respect: 60, looks: 60, mental: 70, health: 80,
    offers: [], castingPool: [], submissions: [], running: [], releases: [], laterOffers: [] });
  s.family = []; s.people = [];
  Object.assign(s, over);
  return s;
}
function shoot(s, over = {}) {
  PR.startProduction(s, { id: 'x', projectTitle: 'The Long Winter', role: 'Lead', type: 'Feature Film',
    genre: 'Drama', salary: 3000000, months: 5, tier: 'lead', scale: 'feature',
    prestigeScore: 62, stability: 90, ...over });
  return s.production;
}

// ── the premise ───────────────────────────────────────────────────────────────
{
  const s = actor(); const p = shoot(s);
  ok('every film is about something', !!p.premise && p.premise.length > 30, p.premise);
  const lines = new Set();
  for (let i = 0; i < 200; i++) lines.add(S.makePremise());
  ok('and it is not the same something every time', lines.size > 150, `${lines.size} distinct in 200`);
  ok('and it reads like a sentence', /^[A-Z].*\.$/.test(S.makePremise()));
  console.log('      "' + p.premise + '"');
}

// ── which arguments are even available ────────────────────────────────────────
{
  ok('a blockbuster will not become a chamber piece',
    !S.takesFor({ scale: 'blockbuster', stability: 95 }).includes('strange'));
  ok('and there is no money to make an indie bigger',
    !S.takesFor({ scale: 'indie', stability: 40 }).includes('bigger'));
  ok('a day of work has nothing to argue about',
    S.takesFor({ scale: 'oneoff', stability: 95 }).length <= 2, JSON.stringify(S.takesFor({ scale: 'oneoff', stability: 95 })));
  ok('and a studio picture has all of it',
    S.takesFor({ scale: 'feature', stability: 88 }).length === 4);
}

// ── who gets listened to ──────────────────────────────────────────────────────
{
  const nobody = actor({ respect: 8, fame: 5 }); const np = shoot(nobody);
  (np.crew || [])[0].bond = 40;
  const star = actor({ respect: 88, fame: 92 }); const sp = shoot(star);
  (sp.crew || [])[0].bond = 40;
  const a = S.pushOdds(nobody, 'about', np), b = S.pushOdds(star, 'about', sp);
  ok('a nobody does not get to reshape a picture', a < 20, a + '%');
  ok('and somebody the money is there because of, does', b > 55, b + '%');
  ok('standing is the whole difference', b > a * 3, `${a}% vs ${b}%`);
  // and the director in the room
  const liked = actor({ respect: 60, fame: 60 }); const lp = shoot(liked);
  (lp.crew || [])[0].bond = 92;
  const cold = actor({ respect: 60, fame: 60 }); const cp = shoot(cold);
  (cp.crew || [])[0].bond = 12;
  ok('a director who likes you backs your version',
    S.pushOdds(liked, 'about', lp) > S.pushOdds(cold, 'about', cp) + 15,
    `${S.pushOdds(cold, 'about', cp)}% cold vs ${S.pushOdds(liked, 'about', lp)}% warm`);
  ok('and the strange one is the hardest sell of all',
    S.pushOdds(star, 'strange', sp) < S.pushOdds(star, 'bigger', sp),
    `strange ${S.pushOdds(star, 'strange', sp)}% vs bigger ${S.pushOdds(star, 'bigger', sp)}%`);
  console.log(`      the same argument — a nobody ${a}%, an A-lister ${b}%`);
}

// ── making the argument ───────────────────────────────────────────────────────
{
  const s = actor(); const p = shoot(s);
  const before = s.ap;
  S.pushTake(s, 'straight');
  ok('saying nothing costs nothing', s.ap === before && p.take === 'straight' && p.takeWon);
}
{
  const s = actor({ respect: 95, fame: 95 }); const p = shoot(s);
  (p.crew || [])[0].bond = 95;
  const before = s.ap;
  S.pushTake(s, 'about');
  ok('arguing costs the energy either way', s.ap === before - 10, String(before - s.ap));
  ok('and it settles the question once', (S.pushTake(s, 'bigger'), p.take !== 'bigger'), p.take);
}
{
  // losing the argument is a real outcome, not a retry
  let lost = null;
  for (let i = 0; i < 60 && !lost; i++) {
    const s = actor({ respect: 10, fame: 8 }); const p = shoot(s);
    (p.crew || [])[0].bond = 20;
    S.pushTake(s, 'strange');
    if (!p.takeWon) lost = { s, p };
  }
  ok('you can lose the argument', !!lost, 'always won');
  if (lost) {
    ok('and then the film is what it always was', lost.p.take === 'straight' && !lost.p.takeWon);
    ok('and the room remembers you tried', /heard you out/.test(lost.s.lastEvent), lost.s.lastEvent);
  }
}

// ── what the version actually does ────────────────────────────────────────────
function batch(takeId, n = 500) {   // 200 failed one run in fifteen on the money margin; medians of 500 hold
  const ratings = [], grosses = [];
  for (let i = 0; i < n; i++) {
    const s = actor({ respect: 100, fame: 95 });
    const p = shoot(s);
    (p.crew || [])[0].bond = 99;
    // force the argument so we measure the TAKE, not the odds of winning it
    p.take = takeId; p.takeWon = takeId !== null;
    if (takeId && S.TAKES[takeId] && S.TAKES[takeId].aim) p.genre = S.TAKES[takeId].aim;
    p.meter = 82;
    let t = s;
    for (let m = 0; m < 7 && t.production; m++) { t.bigMoment = null; t = advanceMonth(t); }
    const rel = (t.releases || [])[0];
    if (!rel) continue;
    ratings.push(rel.rating);
    grosses.push(R.boxOfficeFor(t, rel));
  }
  ratings.sort((a, b) => a - b); grosses.sort((a, b) => a - b);
  const mid = (a) => a[Math.floor(a.length / 2)];
  const pc = (a, q) => a[Math.floor((a.length - 1) * q)];
  const mean = ratings.reduce((x, y) => x + y, 0) / ratings.length;
  const sd = Math.sqrt(ratings.reduce((x, y) => x + (y - mean) * (y - mean), 0) / ratings.length);
  return { rating: mid(ratings), lo: pc(ratings, 0.08), hi: pc(ratings, 0.92),
    worst: ratings[0], best: ratings[ratings.length - 1], sd,
    gross: mid(grosses), hits: ratings.filter((r) => r >= 85).length, n: ratings.length };
}
const straight = batch('straight'), bigger = batch('bigger'), about = batch('about'), strange = batch('strange');
const M = (n) => '€' + (n / 1e6).toFixed(0) + 'm';
console.log('\n      the same film, four ways (500 each):');
for (const [l, b] of [['as written', straight], ['made bigger', bigger], ['about something', about], ['the strange one', strange]]) {
  console.log(`        ${l.padEnd(16)} ${(b.rating / 10).toFixed(1)}/10 (${(b.worst / 10).toFixed(1)}–${(b.best / 10).toFixed(1)}) · ${M(b.gross).padStart(6)} · hits ${b.hits}/${b.n}`);
}
// A quarter more, not the full multiplier — because the version that sells is also the
// worse film, and the money follows the rating too. That cancellation IS the trade.
ok('making it bigger sells more', bigger.gross > straight.gross * 1.15, `${M(bigger.gross)} vs ${M(straight.gross)}`);
// The median barely moves because the luck term is +/-16 either way. Where a thinner
// version actually shows is the top end — how often it clears the line that makes a Hit.
ok('and costs you the film', bigger.hits < straight.hits * 0.7, `${bigger.hits} hits vs ${straight.hits}`);
ok('making it about something is the better film', about.hits > straight.hits * 1.4, `${about.hits} hits vs ${straight.hits}`);
ok('and nobody pays to see it', about.gross < straight.gross * 0.85, `${M(about.gross)} vs ${M(straight.gross)}`);
// Standard deviation, not the gap between two order statistics: the edges of 200 draws are
// the noisiest number available, and they made a real, consistent widening look marginal.
ok('the strange one swings widest', strange.sd > straight.sd * 1.15,
  `spread ${strange.sd.toFixed(1)} vs ${straight.sd.toFixed(1)}`);
ok('and it can reach further up than playing safe', strange.best > straight.best, `${strange.best.toFixed(0)} vs ${straight.best.toFixed(0)}`);

// ── it survives the whole pipeline ────────────────────────────────────────────
{
  // Even at ninety-three per cent the argument is still an argument, and this test is about
  // what happens AFTER you win it — so keep asking until you do.
  let s, p;
  for (let attempt = 0; attempt < 20; attempt++) {
    s = actor({ respect: 99, fame: 90 });
    p = shoot(s);
    (p.crew || [])[0].bond = 99;
    S.pushTake(s, 'about');
    if (p.takeWon) break;
  }
  const aimed = p.genre;
  let t = s;
  for (let m = 0; m < 40 && !(t.filmography || []).length; m++) { t.bigMoment = null; t = advanceMonth(t); }
  const c = (t.filmography || [])[0];
  ok('the premise ends up on the credit', !!c && !!c.premise, c && c.premise);
  ok('and so does the version you shot', !!c && c.take === 'about', c && String(c.take));
  ok('and re-aiming it re-aims the credit', !!c && c.genre === 'Drama', `${aimed} / ${c && c.genre}`);
  // and a save round-trip does not lose it
  const reloaded = JSON.parse(JSON.stringify(t));
  ok('and it survives a reload', reloaded.filmography[0].premise === c.premise);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
