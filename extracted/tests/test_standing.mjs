// Fame × Respect. Eleven combinations, and each one has to DO something somewhere else in
// the game, not only be named. Each effect is measured against the same state with the
// combination switched off, so the number is the combination's and nothing else's.
const P = new URL('../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const ST = await import(P + 'systems/meta/standing.js');
const K = await import(P + 'systems/career/castings.js');
const A = await import(P + 'systems/career/access.js');
const E = await import(P + 'engine/economy.js');
const R = await import(P + 'systems/career/release.js');
const S = await import(P + 'systems/meta/status.js');

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

function actor(over) {
  const s = createInitialState({ name: 'X', dream: 'actor', created: true }); beginLife(s);
  return Object.assign(s, { stage: 'career', ageY: 32, year: 2062, month: 3, alive: true, hasApartment: true, cash: 50000,
    fame: 0, peakFame: 0, respect: 0, scandal: 0, media: 0, acting: 60, charisma: 50, looks: 50, luck: 50,
    filmography: [{ title: 'one', rating: 60, tier: 'lead', role: 'Lead', year: 2060, score: 6 }] }, over);
}

// ── the eleven, each reachable, and the borders where they say they are ──
{
  const at = (fame, respect, peak) => ST.comboOf(actor({ fame, respect, peakFame: peak || fame }));
  ok('beginning: nothing decided yet', at(10, 10) === 'beginning' && at(50, 10) === 'beginning' && at(34, 39) === 'beginning');
  ok('difficult: Avoided (below −15), not famous', at(10, -16) === 'difficult' && at(54, -40) === 'difficult');
  ok('the actor’s actor: standing 40, fame under 35', at(34, 40) === 'craft' && at(0, 100) === 'craft');
  ok('the working actor: fame 35–54 with standing 30+', at(35, 30) === 'working' && at(54, 100) === 'working');
  ok('the face: fame 55, standing 0–29', at(55, 29) === 'face' && at(100, 0) === 'face');
  ok('the liability: fame 55 and Avoided', at(55, -16) === 'liability' && at(100, -40) === 'liability');
  ok('a star: fame 55, standing 30–59', at(55, 30) === 'star' && at(90, 59) === 'star');
  ok('the real thing: fame 55 and standing 60', at(55, 60) === 'real' && at(100, 100) === 'real');
  ok('faded: Forgotten, nobody angry', at(9, 10, 70) === 'faded' && at(14, 39, 35) === 'faded');
  ok('the cautionary tale: Forgotten and Avoided', at(9, -16, 70) === 'tale' && at(9, -40, 70) === 'tale' && at(9, -10, 70) === 'faded');
  ok('still asked about: Forgotten with standing 40+', at(9, 40, 70) === 'asked' && at(0, 90, 100) === 'asked');
  ok('Forgotten is decided before anything else', at(9, -20, 70) !== 'difficult' && at(9, 50, 70) !== 'craft');
  const ids = Object.keys(ST.COMBOS);
  ok('eleven of them', ids.length === 11, ids.join(','));
  ok('five of them bad', ids.filter((id) => ST.COMBOS[id].tone === 'bad').length === 5, ids.filter((id) => ST.COMBOS[id].tone === 'bad').join(','));
  for (const id of ids) {
    const c = ST.COMBOS[id];
    ok(id + ' has label, line, long, tone and an fx list', c.label && c.line && c.long && ['bad', 'good', 'plain'].includes(c.tone) && Array.isArray(c.fx));
  }
  // every point on the grid lands somewhere
  let holes = 0;
  for (let f = 0; f <= 100; f += 5) for (let r = -40; r <= 100; r += 5) for (const peak of [f, 70]) if (!ST.COMBOS[ST.comboOf(actor({ fame: f, respect: r, peakFame: Math.max(f, peak) }))]) holes++;
  ok('no hole anywhere on the fame × standing grid', holes === 0, String(holes));
}

// ── the craft: the board reaches further, and the agent comes early ──
{
  const craft = actor({ fame: 20, respect: 60 });
  const plain = actor({ fame: 20, respect: 20 });
  ok('standing above forty extends reach: +12 at 60', K.reach(craft) - K.reach(plain) === 12, `${K.reach(craft)} vs ${K.reach(plain)}`);
  ok('capped at twenty: a respected nobody does not reach for blockbusters', ST.reachFromStanding(actor({ fame: 20, respect: 100 })) === 20);
  ok('nothing at all below forty', ST.reachFromStanding(actor({ fame: 20, respect: 39 })) === 0);
  ok('and nothing once fame catches up — the star reaches by fame', ST.reachFromStanding(actor({ fame: 60, respect: 70 })) === 0);
  const withAgent = (o) => actor({ agent: { level: 1, name: 'A' }, ...o });
  ok('an agent takes the actor’s actor at standing 50', A.computeAccess(withAgent({ fame: 20, respect: 50 })).agentReach === true);
  ok('not at standing 45', A.computeAccess(withAgent({ fame: 20, respect: 45 })).agentReach === false);
  ok('and never without an agent', A.computeAccess(actor({ fame: 20, respect: 70 })).agentReach === false);
  ok('everybody else still waits for fame 40', A.computeAccess(withAgent({ fame: 39, respect: 20 })).agentReach === false && A.computeAccess(withAgent({ fame: 40, respect: 20 })).agentReach === true);
}

// ── the face: the prestige shelf shuts ──
{
  const isPrestige = (c) => c.scale === 'prestige' || /^Prestige/.test(c.type);
  let seenFace = 0, seenStar = 0;
  for (let i = 0; i < 40; i++) {
    const face = actor({ fame: 62, respect: 10, ageY: 48 });
    K.refreshCastingPool(face, true);
    seenFace += face.castingPool.filter(isPrestige).length;
    const star = actor({ fame: 62, respect: 45, ageY: 48 });
    K.refreshCastingPool(star, true);
    seenStar += star.castingPool.filter(isPrestige).length;
  }
  ok('the face never sees a prestige listing, over forty boards', seenFace === 0, String(seenFace));
  ok('a star with the same fame does', seenStar > 0, String(seenStar));
  ok('the shelf reopens at standing 30', !ST.prestigeShut(actor({ fame: 62, respect: 30 })));
}

// ── the face: scandal sticks. the real thing: forgotten slower ──
{
  const drift = (o) => { const s = actor({ scandal: 20, _idleMonths: 10, ...o }); E.relevanceDrift(s); return s; };
  const face = drift({ fame: 62, respect: 10 }), star = drift({ fame: 62, respect: 45 });
  ok('a scandal fades 0.4 a month on the star', Math.abs((20 - star.scandal) - 0.4) < 1e-9, String(20 - star.scandal));
  ok('and 0.24 on the face — sixty percent of the speed', Math.abs((20 - face.scandal) - 0.24) < 1e-9, String(20 - face.scandal));
  const real = drift({ fame: 70, respect: 70, scandal: 0 }), plainStar = drift({ fame: 70, respect: 45, scandal: 0 });
  const lostReal = 70 - real.fame, lostStar = 70 - plainStar.fame;
  ok('the star is forgotten at the ordinary rate', lostStar > 0, String(lostStar));
  ok('the real thing at eighty percent of it', Math.abs(lostReal / lostStar - 0.8) < 1e-6, `${lostReal.toFixed(3)} vs ${lostStar.toFixed(3)}`);
}

// ── the tale: a comeback has to be better than good ──
{
  function fallen(respect) {
    return actor({ ageY: 50, year: 2080, month: 0, fame: 9, peakFame: 70, respect, cash: 90000,
      filmography: [{ title: 'old', rating: 80, tier: 'lead', role: 'Lead', year: 2066, score: 8 }] });
  }
  const credit = (rating) => ({ title: 'Back', role: 'Lead', tier: 'lead', type: 'Feature Film', genre: 'Drama', scale: 'indie', rating, status: 'Well-received', year: 2080, salary: 200000, weeks: 6, weeksTotal: 6, boxOffice: 4000000, running: true, id: 'r1',
    _rel: { rating, tier: 'lead', scale: 'indie', salary: 200000, finalGross: 4000000, film: true, job: {} } });
  const back = (s) => (s.timeline || []).some((x) => /comeback/.test(x.text));
  ok('the floor is 70 for the merely fallen and 80 for the tale', ST.comebackFloor(fallen(10)) === 70 && ST.comebackFloor(fallen(-20)) === 80);
  let a = fallen(10); a.filmography.unshift(credit(75)); a.running = ['r1']; R.runTick(a);
  ok('a 75 brings the fallen-but-not-avoided back', back(a) && a.fame >= 35, String(Math.round(a.fame)));
  let b = fallen(-20); b.filmography.unshift(credit(75)); b.running = ['r1']; R.runTick(b);
  ok('the same 75 does nothing for the cautionary tale', !back(b) && b.fame < 35, String(Math.round(b.fame)));
  let c = fallen(-20); c.filmography.unshift(credit(82)); c.running = ['r1']; R.runTick(c);
  ok('an 82 does', back(c) && c.fame >= 35, String(Math.round(c.fame)));
  ok('and the board is thinner than a newcomer’s', K.boardSize(fallen(-20)) < K.boardSize(actor({ fame: 0, respect: 0 })), `${K.boardSize(fallen(-20))} vs ${K.boardSize(actor({ fame: 0 }))}`);
}

// ── the strip on the home screen: the combination reads the live numbers ──
{
  const s = actor({ fame: 60, respect: 20 });
  ok('combo(s) is the entry for comboOf(s)', ST.combo(s) === ST.COMBOS.face);
  S.setRespect(s, 35);
  ok('and it moves the moment the numbers do', ST.combo(s) === ST.COMBOS.star);
}
// ── below zero: the room has heard, and crews start cold (difficult, liability, tale) ──
{
  const PR = await import(P + 'systems/career/production.js');
  const part = { role: 'Lead', scale: 'indie' };
  const chance = (o) => K.castingChance(actor({ acting: 60, charisma: 50, looks: 50, luck: 50, ...o }), part);
  ok('auditions are 15% harder for the difficult', Math.abs(chance({ fame: 20, respect: -20 }) / chance({ fame: 20, respect: 5 }) - 0.85) < 0.03, `${chance({ fame: 20, respect: -20 })} vs ${chance({ fame: 20, respect: 5 })}`);
  ok('and for the liability', Math.abs(chance({ fame: 60, respect: -20 }) / chance({ fame: 60, respect: 5 }) - 0.85) < 0.03);
  ok('and for the tale', Math.abs(chance({ fame: 9, peakFame: 70, respect: -20 }) / chance({ fame: 9, peakFame: 70, respect: 5 }) - 0.85) < 0.03);
  ok('not on the Careful rung', ST.roomHasHeard(actor({ fame: 20, respect: -15 })) === 1 && ST.roomHasHeard(actor({ fame: 20, respect: -5 })) === 1);
  // crews start colder
  const startBond = (o) => { const s = actor({ ap: 100, cash: 100000, ...o }); PR.startProduction(s, { id: 'o', projectTitle: 'T', role: 'Lead', type: 'Indie Film', genre: 'Drama', salary: 100000, months: 3, prestigeScore: 50, tier: 'lead', scale: 'indie', stability: 80 }); return s.production.crew[0].bond; };
  const warmStarts = [], coldStarts = [];
  for (let i = 0; i < 60; i++) { warmStarts.push(startBond({ fame: 20, respect: -10 })); coldStarts.push(startBond({ fame: 20, respect: -20 })); }
  ok('an ordinary crew starts at 30–55', Math.min(...warmStarts) >= 30 && Math.max(...warmStarts) <= 55, `${Math.min(...warmStarts)}..${Math.max(...warmStarts)}`);
  ok('a crew that has heard about you starts at 18–43', Math.min(...coldStarts) >= 18 && Math.max(...coldStarts) <= 43, `${Math.min(...coldStarts)}..${Math.max(...coldStarts)}`);
  ok('the liability’s crew too', ST.coldStart(actor({ fame: 70, respect: -20 })) === 12 && ST.coldStart(actor({ fame: 70, respect: -15 })) === 0);
}

// ── the liability: the studio shelf shuts too, and the agent goes quiet ──
{
  const studio = (c) => c.scale === 'feature' || c.scale === 'blockbuster';
  const prestige = (c) => c.scale === 'prestige' || /^Prestige/.test(c.type);
  let seenL = 0, seenP = 0, seenFace = 0;
  for (let i = 0; i < 40; i++) {
    const l = actor({ fame: 80, respect: -20, ageY: 40 }); K.refreshCastingPool(l, true);
    seenL += l.castingPool.filter(studio).length; seenP += l.castingPool.filter(prestige).length;
    const f = actor({ fame: 80, respect: 10, ageY: 40 }); K.refreshCastingPool(f, true);
    seenFace += f.castingPool.filter(studio).length;
  }
  ok('the liability never sees a studio feature or blockbuster, over forty boards', seenL === 0, String(seenL));
  ok('nor prestige', seenP === 0, String(seenP));
  ok('the face, same fame, still sees the studio shelf', seenFace > 0, String(seenFace));
  ok('the difficult (same standing, less fame) is not shut out of features', !ST.insuranceShut(actor({ fame: 45, respect: -20 })));
  ok('the shelf reopens at −15', !ST.insuranceShut(actor({ fame: 80, respect: -15 })));
  const withAgent = (o) => actor({ agent: { level: 1, name: 'A' }, ...o });
  ok('the agent brings the liability nothing, whatever the fame', A.computeAccess(withAgent({ fame: 80, respect: -20 })).agentReach === false);
  ok('and brings the face things as before', A.computeAccess(withAgent({ fame: 80, respect: 10 })).agentReach === true);
  const drift = (o) => { const s = actor({ scandal: 20, _idleMonths: 10, ...o }); E.relevanceDrift(s); return 20 - s.scandal; };
  ok('scandal sticks to the liability like it sticks to the face', Math.abs(drift({ fame: 62, respect: -20 }) - 0.24) < 1e-9, String(drift({ fame: 62, respect: -20 })));
}

// ── Forgotten three ways: faded, the tale, and still asked about ──
{
  const fallen = (respect) => actor({ ageY: 50, year: 2080, month: 0, fame: 9, peakFame: 70, respect, cash: 90000,
    filmography: [{ title: 'old', rating: 80, tier: 'lead', role: 'Lead', year: 2066, score: 8 }] });
  ok('the floors: faded 70, tale 80, asked 60', ST.comebackFloor(fallen(10)) === 70 && ST.comebackFloor(fallen(-10)) === 70 && ST.comebackFloor(fallen(-20)) === 80 && ST.comebackFloor(fallen(50)) === 60);
  const credit = (rating) => ({ title: 'Back', role: 'Lead', tier: 'lead', type: 'Feature Film', genre: 'Drama', scale: 'indie', rating, status: 'Released', year: 2080, salary: 200000, weeks: 6, weeksTotal: 6, boxOffice: 4000000, running: true, id: 'r1',
    _rel: { rating, tier: 'lead', scale: 'indie', salary: 200000, finalGross: 4000000, film: true, job: {} } });
  const back = (s) => (s.timeline || []).some((x) => /comeback/.test(x.text));
  let a = fallen(50); a.filmography.unshift(credit(64)); a.running = ['r1']; R.runTick(a);
  ok('a 64 brings back a name the business still says', back(a) && a.fame >= 35, String(Math.round(a.fame)));
  let f = fallen(10); f.filmography.unshift(credit(64)); f.running = ['r1']; R.runTick(f);
  ok('the same 64 does nothing for the merely faded', !back(f) && f.fame < 35, String(Math.round(f.fame)));
  ok('the board is thinned for the faded and the tale', K.boardSize(fallen(10)) <= 5 && K.boardSize(fallen(-20)) <= 5 && K.boardSize(fallen(10)) < K.boardSize(fallen(50)), `${K.boardSize(fallen(10))} / ${K.boardSize(fallen(-20))}`);
  ok('and not for the one still asked about', K.boardSize(fallen(50)) >= 7, String(K.boardSize(fallen(50))));
  ok('who is still Forgotten on the fame ladder all the same', S.isForgotten(fallen(50)));
}

// ── what the matrix exposed: standing was not earnable by preparing ──
// The director's good word at wrap (+3) fired ZERO times across fifteen perfect careers,
// because a director's opinion only ever moved down on its own. Now a set that is going
// well warms them month by month, and a set you carried gets the word even from a
// director who was never your friend.
{
  const PR = await import(P + 'systems/career/production.js');
  function shoot(over) {
    const s = actor({ ageY: 30, year: 2060, month: 0, ap: 100, apMax: 100, apMaxEff: 100, fame: 40, respect: 30, cash: 200000, ...over });
    PR.startProduction(s, { id: 'o', projectTitle: 'Test Picture', role: 'Lead', type: 'Feature Film', genre: 'Drama',
      salary: 500000, months: 6, prestigeScore: 55, tier: 'lead', scale: 'feature', stability: 85 });
    s.production.stability = 100;   // pinned: a random collapse at 85 nulled the production once in ~120 ticks
    s.production.crew[0].bond = 45;
    return s;
  }
  // a month you turned up for, on a set at three different temperatures
  function monthAt(meter) {
    const s = shoot(); s.production.meter = meter;
    s.year = 2060; s.month = 3; PR.rehearse(s); s.production.meter = meter;   // rehearse stamps the month; pin the meter after
    s.month = 4; PR.productionTick(s);
    return s.production.crew[0].bond - 45;
  }
  const cold = [], warm = [], hot = [];
  for (let i = 0; i < 40; i++) { cold.push(monthAt(40)); warm.push(monthAt(60)); hot.push(monthAt(90)); }
  ok('a set that is not going well does not warm them, and (since you turned up) does not cool them', cold.every((d) => d === 0), cold.join(','));
  ok('a set going well warms them +2..3 a month', warm.every((d) => d >= 2 && d <= 3), [...new Set(warm)].join(','));
  ok('a set going very well warms them +3..5', hot.every((d) => d >= 3 && d <= 5), [...new Set(hot)].join(','));
  // and a month you did NOT turn up for still cools, as before
  const skip = shoot(); skip.production.meter = 40; skip.production._workedMonth = null; skip.production.monthsLeft = 4; skip.production._winged = 1;
  skip.month = 4; PR.productionTick(skip);
  ok('a month you skipped still cools them', skip.production.crew[0].bond < 45, String(skip.production.crew[0].bond));

  // at wrap: who gets the good word
  function wrap(meter, bond) {
    const s = shoot(); s.production.meter = meter; s.production.crew[0].bond = bond; s.production.monthsLeft = 1;
    s.production._workedMonth = null;   // nothing to warm or cool on the last tick; we are testing the verdict
    const r0 = s.respect; PR.productionTick(s);
    return { d: s.respect - r0, said: /how good you were/.test((s.timeline || []).map((x) => x.text).join(' ') + (s.lastEvent || '')) };
  }
  ok('a director who liked you says so (bond 72, ordinary set)', wrap(50, 72).d > 2 && wrap(50, 72).said);
  ok('a director who did not much like you but watched you carry the set says so too (bond 45, meter 90)', wrap(90, 45).d > 2);
  ok('an ordinary set and an ordinary bond: nothing', wrap(60, 45).d === 0);
  ok('a carried set does not rescue a director who disliked you (bond 30)', wrap(90, 30).d === 0);
  ok('and it is slower at the top', wrap(90, 72).d > 2 && (() => { const s = shoot({ respect: 80 }); s.production.meter = 90; s.production.crew[0].bond = 72; s.production.monthsLeft = 1; s.production._workedMonth = null; PR.productionTick(s); return s.respect - 80 < 1.2 && s.respect > 80; })());

  // the release: the business reads the performance, not only the film
  const rel = (rating, meter, respect) => {
    const s = actor({ ageY: 40, year: 2070, month: 0, fame: 40, respect, cash: 90000 });
    const c = { title: 'Small One', role: 'Lead', tier: 'lead', type: 'Indie Film', genre: 'Drama', scale: 'indie', rating, status: 'Released', year: 2070, salary: 100000, weeks: 6, weeksTotal: 6, boxOffice: 1000000, running: true, id: 'r1',
      _rel: { rating, tier: 'lead', scale: 'indie', salary: 100000, finalGross: 1000000, film: true, job: {}, meter } };
    s.filmography.unshift(c); s.running = ['r1'];
    R.runTick(s);
    return { d: s.respect - respect, line: s.lastEvent || '' };
  };
  ok('a bad film on an ordinary set costs standing', rel(40, 50, 30).d < -2, String(rel(40, 50, 30).d));
  ok('the same bad film on a set you carried costs nothing', rel(40, 88, 30).d === 0, String(rel(40, 88, 30).d));
  ok('and the reviews say why', /only good thing in it/.test(rel(40, 88, 30).line), rel(40, 88, 30).line);
  ok('a middling film on a set you carried still gets your name mentioned: +1', rel(60, 88, 30).d > 0.5 && rel(60, 88, 30).d <= 1, String(rel(60, 88, 30).d));
  ok('a middling film on an ordinary set: nothing, as before', rel(60, 50, 30).d === 0);
  ok('a good film is a good film either way', rel(75, 50, 30).d > 1 && rel(75, 88, 30).d > 1);
  ok('the meter travels with the release', (() => { const s = shoot(); s.production.meter = 77; s.production.monthsLeft = 1; PR.productionTick(s); return s.releases && s.releases[0] && s.releases[0].meter === 77; })());
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
