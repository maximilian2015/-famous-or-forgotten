// Money on the other side of the table, a child with a life of their own, and the game
// carrying on after you are dead.
const P = new URL('../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const L = await import(P + 'systems/life/dating.js');
const C = await import(P + 'systems/life/children.js');
const G = await import(P + 'systems/meta/legacy.js');
const { familyYear } = await import(P + 'systems/life/family.js');

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

function life(over = {}) {
  const s = createInitialState({ name: 'Vera Sol', dream: 'actor' });
  Object.assign(s, { stage: 'career', ageY: 30, year: 2060, month: 0, cash: 3000000, acting: 80,
    fame: 60, peakFame: 60, respect: 60, mental: 60, health: 80, apMax: 3, ap: 3, apMaxEff: 3,
    charisma: 100, looks: 100, hasApartment: true, housing: 'flat', alive: true, gender: 'female',
    depression: null, drink: null, partner: null, datingPool: [], adoption: null });
  s.family = []; s.people = [];
  Object.assign(s, over);
  return s;
}
function pair(s, opts = {}) {
  const p = L.prospect(s);
  Object.assign(p, { id: 'suit', charm: 90, relationship: 38, wants: 'family', means: 'ordinary', ...opts });
  s.datingPool = [p];
  for (let i = 0; i < 14 && !s.partner; i++) {
    const q = (s.datingPool || [])[0]; if (q && (q.relationship || 0) < 38) q.relationship = 38;
    L.goOnDate(s, 'home', 'suit'); s._cool = {};
  }
  return s.partner;
}
function marry(s, style = 'registry', prenup = false) {
  for (let a = 0; a < 12 && !C.spouseOf(s); a++) {
    s._cool = {}; if (s.partner) s.partner.relationship = 99;
    L.proposeMarriage(s, style, prenup);
  }
  return C.spouseOf(s);
}

// ── you are not always the one paying ─────────────────────────────────────────
{
  const young = life({ ageY: 20, cash: 300, fame: 8, peakFame: 8 });
  const rich = { means: 'serious', name: 'R' }, poor = { means: 'broke', name: 'B' };
  ok('somebody with real money picks up the bill', L.whoPays(young, rich, 'away') === 'them');
  ok('and somebody with nothing does not', L.whoPays(young, poor, 'dinner') === 'you');
  const star = life({ cash: 5000000, fame: 90 });
  ok('and once you are the rich one, you pay', L.whoPays(star, rich, 'dinner') === 'you');
  // and being broke does not lock you out of the screen
  const s = life({ ageY: 21, cash: 120, fame: 6, peakFame: 6 });
  const p = pair(s, { means: 'serious' });
  ok('you can date above you on nothing at all', !!p, 'never got there');
  ok('and it cost you nothing', s.cash === 120, '€' + s.cash);
  const broke = life({ ageY: 21, cash: 120, fame: 6 });
  const q = L.prospect(broke); q.id = 'q'; q.means = 'broke'; broke.datingPool = [q];
  L.goOnDate(broke, 'away', 'q');
  ok('but you cannot take a broke one anywhere expensive', /short/.test(broke.lastEvent), broke.lastEvent);
}

// ── marrying money is a real move ─────────────────────────────────────────────
{
  const s = life({ ageY: 24, cash: 5000, fame: 20, peakFame: 20 });
  pair(s, { means: 'serious' });
  const purse = s.cash;
  marry(s, 'registry', false);
  ok('marrying money changes what the household has', s.cash > purse + 100000,
    `€${purse.toLocaleString()} → €${s.cash.toLocaleString()}`);
  const sp = C.spouseOf(s);
  sp.marriedOn = (s.year || 0) * 12 + (s.month || 0) - 60;
  ok('and they are not leaving with yours', L.settlement(s, sp) < (s.cash || 0) * 0.2,
    '€' + L.settlement(s, sp).toLocaleString());
}

// ── you cannot have a first child at fifty-four ───────────────────────────────
{
  const at = (age) => C.fertility(life({ ageY: age, gender: 'female' }), { age });
  ok('thirty is a real chance', at(30) >= 28, String(at(30)));
  ok('forty is much less of one', at(40) < at(30) / 2, `${at(40)} vs ${at(30)}`);
  ok('forty-four is nearly nothing', at(44) <= 5, String(at(44)));
  ok('and fifty-four is zero', at(54) === 0, String(at(54)));
  console.log(`      naturally, per month — 30: ${at(30)}%  ·  38: ${at(38)}%  ·  41: ${at(41)}%  ·  44: ${at(44)}%  ·  48+: ${at(48)}%`);
  // and it is the one carrying it whose age counts
  const dad = life({ ageY: 58, gender: 'male' });
  ok('and it is the one carrying it whose age counts', C.fertility(dad, { age: 31 }) > 20,
    String(C.fertility(dad, { age: 31 })));
  const s = life({ ageY: 54, cash: 3000000 });
  pair(s); marry(s);
  C.spouseOf(s).age = 54;
  C.tryForBaby(s);
  ok('the game says why, rather than just failing', /other ways/.test(s.lastEvent), s.lastEvent);
}

// ── adoption ──────────────────────────────────────────────────────────────────
{
  const s = life({ cash: 3000000, ageY: 52 });
  pair(s); marry(s);
  const purse = s.cash;
  C.applyToAdopt(s);
  ok('the application costs money up front', s.cash < purse, '€' + s.cash.toLocaleString());
  ok('and it is not instant', !!s.adoption && s.adoption.left === C.ADOPT_MONTHS, JSON.stringify(s.adoption));
  let t = s, got = 0;
  for (let i = 0; i < 40; i++) {
    const st = life({ cash: 3000000, ageY: 52 }); pair(st); marry(st);
    C.applyToAdopt(st);
    let u = st;
    for (let m = 0; m < C.ADOPT_MONTHS + 2; m++) u = advanceMonth(u);
    if (C.livingChildren(u).length) got++;
  }
  ok('and most of the time it comes good', got >= 24 && got <= 38, `${got} of 40`);
  // a child who arrives at seven does not know you
  // Roughly one in five applications is turned down, so keep applying rather than reporting
  // a working system as broken.
  let kid = null;
  for (let attempt = 0; attempt < 8 && !kid; attempt++) {
    const one = life({ cash: 3000000 }); pair(one); marry(one);
    C.applyToAdopt(one);
    let u = one;
    for (let m = 0; m < C.ADOPT_MONTHS + 2 && !C.livingChildren(u).length; m++) u = advanceMonth(u);
    kid = C.livingChildren(u)[0] || null;
  }
  if (kid) {
    ok('they arrive already a person', kid.age >= 2, String(kid.age));
    ok('and they do not know you yet', (kid.relationship || 0) < 50, String(kid.relationship));
  } else ok('an adopted child arrives at all', false, 'declined every time');
  // and the office is watching
  const drunk = life({ cash: 3000000, drink: { level: 85, months: 40, worstLevel: 85, hooked: true } });
  pair(drunk); marry(drunk);
  ok('drinking wrecks your chances with them', C.adoptionOdds(drunk) < C.adoptionOdds(life()),
    `${C.adoptionOdds(drunk)}% vs ${C.adoptionOdds(life())}%`);
}

// ── a child gets a life ───────────────────────────────────────────────────────
{
  const s = life({ cash: 3000000, fame: 90, peakFame: 90 });
  const kid = { id: 'k', name: 'Nico Sol', relation: 'Child', gender: 'm', age: 4, alive: true,
    health: 95, relationship: 80, job: 'infant', talent: 70, raisedBy: 'you' };
  s.family = [kid];
  const notes = [];
  for (let y = 0; y < 24; y++) { kid.age += 1; const n = C.childYear(s, kid); if (n) notes.push(`${kid.age}: ${n}`); }
  ok('they go to school', notes.some((n) => /started school/.test(n)));
  ok('and to university if you paid for it', notes.some((n) => /university/.test(n)), notes.join(' | ').slice(0, 120));
  ok('and end up doing something', !!kid.job && kid.job !== 'infant', kid.job);
  console.log('\n      a close child of a famous parent, year by year:');
  notes.slice(0, 6).forEach((n) => console.log('        ' + n));
}
{
  // your name is most of why the door opens
  const run = (fame, close) => {
    let went = 0;
    for (let i = 0; i < 200; i++) {
      const s = life({ fame, peakFame: fame, cash: 3000000 });
      const k = { id: 'k', name: 'N S', relation: 'Child', gender: 'm', age: 19, alive: true,
        health: 95, relationship: close, job: 'at university', talent: 55, raisedBy: 'you' };
      s.family = [k];
      for (let y = 0; y < 8; y++) { k.age += 1; C.childYear(s, k); }
      if (k.path === 'industry') went++;
    }
    return went;
  };
  const ofAStar = run(95, 70), ofANobody = run(10, 70);
  ok('a star\'s child goes into the business far more often', ofAStar > ofANobody * 1.8,
    `${ofAStar} of 200 vs ${ofANobody}`);
  console.log(`      children who try acting — a star's child ${ofAStar}/200, a nobody's ${ofANobody}/200`);
}

// ── and the game carries on after you ─────────────────────────────────────────
{
  const s = life({ cash: 4000000, fame: 92, peakFame: 92, respect: 80 });
  s.filmography = Array.from({ length: 12 }, (_, i) => ({ title: 'F' + i, rating: 88, type: 'Feature Film', year: 2050 + i }));
  s.worldHits = 2;
  s.family = [
    { id: 'k1', name: 'Nico Sol', relation: 'Child', gender: 'm', age: 24, alive: true, health: 95, relationship: 78, job: 'actor' },
    { id: 'k2', name: 'Mira Sol', relation: 'Child', gender: 'f', age: 20, alive: true, health: 95, relationship: 12, job: 'barista' },
  ];
  const heirs = G.heirsOf(s);
  ok('every living child can be the next one', heirs.length === 2);
  ok('and the closest is offered first', heirs[0].id === 'k1', heirs[0].name);
  const close = G.heirOpts(s, 'k1'), distant = G.heirOpts(s, 'k2');
  ok('they start with your name already worth something', close.heir.fame > 20, String(close.heir.fame));
  ok('and with the industry sure they did not earn it', close.heir.respect < 0, String(close.heir.respect));
  ok('a child who knew you starts with more of the craft', close.heir.craft > distant.heir.craft,
    `${close.heir.craft} vs ${distant.heir.craft}`);
  ok('and the estate is split between them', close.heir.estate === 2000000, '€' + close.heir.estate.toLocaleString());

  // and it actually builds a playable life
  const next = createInitialState(close);
  beginLife(next);
  ok('the next life starts', next.created && next.alive);
  ok('already carrying the fame', (next.fame || 0) === close.heir.fame, String(next.fame));
  ok('and the debt of it', (next.respect || 0) === close.heir.respect, String(next.respect));
  ok('and the money is in the family, not in a newborn\'s pocket', (next.cash || 0) === 0, String(next.cash));
  ok('with the famous parent in the family, and dead', (next.family || []).some((p) => p.name === 'Vera Sol' && p.alive === false));
  ok('and somebody alive who actually raised them', (next.family || []).some((p) => p.alive && (p.relation === 'Mother' || p.relation === 'Father')));
  // The famous one replaces the parent they actually were, rather than being bolted on and
  // the survivor relabelled — which produced a woman listed as the father.
  const dead = (next.family || []).find((p) => p.name === 'Vera Sol');
  ok('the famous parent is the one they actually were', dead.relation === 'Mother' && dead.gender === 'f',
    `${dead.relation} / ${dead.gender}`);
  ok('and nobody is filed under the wrong one', (next.family || [])
    .every((p) => !(p.relation === 'Father' && p.gender === 'f') && !(p.relation === 'Mother' && p.gender === 'm')),
    (next.family || []).map((p) => `${p.name} ${p.relation} ${p.gender}`).join(' | '));
  ok('and there is exactly one of each', (next.family || []).filter((p) => p.relation === 'Mother').length === 1
    && (next.family || []).filter((p) => p.relation === 'Father').length === 1);
  ok('and the story says whose child they are', /Vera Sol/.test(next.originStory || ''), (next.originStory || '').slice(0, 90));
  console.log('\n      "' + (next.originStory || '').slice(0, 210) + '…"');
  // a rich parent means a rich childhood
  ok('a rich parent means a rich childhood', next.familyClass === 'rich' || next.familyClass === 'well_off', next.familyClass);
  // and it survives a year of play
  let t = next;
  for (let m = 0; m < 26; m++) t = advanceMonth(t);
  ok('and it survives being played', t.alive && t.ageY >= 2, `age ${t.ageY}`);
}
{
  // no children, no offer
  const s = life();
  ok('with no children there is nobody to hand it to', G.heirsOf(s).length === 0);
  ok('and asking for one returns nothing', G.heirOpts(s, 'nope') === null);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
