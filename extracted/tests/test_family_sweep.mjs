// A bug hunt rather than a spec. Plays hundreds of long lives through the real loop, doing
// romantic and family things at random, and after every single month asks whether the save
// has got into a state that could not happen to a person.
const P = new URL('../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const L = await import(P + 'systems/life/dating.js');
const C = await import(P + 'systems/life/children.js');
const G = await import(P + 'systems/meta/legacy.js');
const F = await import(P + 'systems/life/family.js');
const { startProduction } = await import(P + 'systems/career/production.js');

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

// Everything that must be true of a save, every month, forever.
function audit(s) {
  const bad = [];
  const fam = s.family || [];
  if (s.partner && C.spouseOf(s)) bad.push('married AND seeing somebody else');
  if (fam.filter((p) => p.relation === 'Spouse' && p.alive).length > 1) bad.push('two living spouses');
  // A negative balance is deliberate — it is the SIGNAL that you could not make rent, and
  // losing the flat settles it. What must never happen is a date, a wedding or an adoption
  // spending money you do not have, so those are guarded at the call and checked below.
  if (!Number.isFinite(s.cash)) bad.push('cash is not a number: ' + s.cash);
  if ((s.cash || 0) < -400000) bad.push('debt ran away: ' + s.cash);
  for (const p of fam) {
    if (!p.name || /undefined|NaN/.test(p.name)) bad.push('broken name: ' + p.name);
    if (!Number.isFinite(p.age) || p.age < 0) bad.push(`${p.name} age ${p.age}`);
    if (!Number.isFinite(p.relationship)) bad.push(`${p.name} closeness ${p.relationship}`);
    if (p.relationship > 100 || p.relationship < -100) bad.push(`${p.name} closeness out of range ${p.relationship}`);
    if (p.relation === 'Child' && p.age > (s.ageY || 0) - 10) bad.push(`${p.name} is ${p.age} and you are ${s.ageY}`);
    if (p.relation === 'Father' && p.gender === 'f') bad.push(`${p.name} is a female father`);
    if (p.relation === 'Mother' && p.gender === 'm') bad.push(`${p.name} is a male mother`);
  }
  if (s.partner) {
    if (!Number.isFinite(s.partner.relationship)) bad.push('partner closeness ' + s.partner.relationship);
    if (!s.partner.wants || !L.WANTS[s.partner.wants]) bad.push('partner wants nothing: ' + s.partner.wants);
  }
  if (s.adoption && (s.adoption.left < 0)) bad.push('adoption ran past its end');
  if ((s.apMaxEff || 0) < 0) bad.push('negative Energy');
  return bad;
}

// One life, lived badly and at random.
function liveOne(seedAge = 20, years = 55) {
  const s = createInitialState({ name: 'Test Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: seedAge, year: 2050, month: 0, cash: 40000,
    acting: 60, fame: 30, peakFame: 30, respect: 50, mental: 70, health: 85,
    hasApartment: true, housing: 'flat', charisma: 70, looks: 65 });
  const problems = [];
  let t = s;
  for (let m = 0; m < years * 12; m++) {
    const r = Math.random();
    try {
      if (!t.partner && !C.spouseOf(t)) {
        L.refreshDatingPool(t);
        const who = (t.datingPool || [])[Math.floor(Math.random() * (t.datingPool || []).length)];
        if (who) L.goOnDate(t, L.DATE_ORDER[Math.floor(Math.random() * 4)], who.id);
      } else if (t.partner) {
        if (r < 0.3) L.goOnDate(t, L.DATE_ORDER[Math.floor(Math.random() * 4)]);
        else if (r < 0.4) L.moveInTogether(t);
        else if (r < 0.5) L.proposeMarriage(t, ['registry', 'proper', 'sold'][Math.floor(Math.random() * 3)], Math.random() < 0.5);
      } else {
        if (r < 0.25) C.tryForBaby(t);
        else if (r < 0.3) C.applyToAdopt(t);
        else if (r < 0.33) L.divorce(t, false);
        else if (r < 0.45) L.goOnDate(t, L.DATE_ORDER[Math.floor(Math.random() * 4)]);
      }
      if (r > 0.93 && !t.production) {
        startProduction(t, { id: 'p' + m, projectTitle: 'Job ' + m, role: 'Lead', type: 'Feature Film',
          genre: 'Drama', salary: 400000, months: 4, tier: 'lead', scale: 'feature', prestigeScore: 60, stability: 90 });
      }
      t = advanceMonth(t);
    } catch (e) {
      problems.push('THREW: ' + e.message);
      break;
    }
    const bad = audit(t);
    if (bad.length) { problems.push(`month ${m} (age ${t.ageY}): ${bad[0]}`); break; }
    if (!t.alive) break;
  }
  return { s: t, problems };
}

// ── the sweep ─────────────────────────────────────────────────────────────────
{
  const all = [];
  let married = 0, kids = 0, adopted = 0, divorced = 0, widowed = 0, heirs = 0, paidByThem = 0;
  for (let i = 0; i < 120; i++) {
    const { s, problems } = liveOne();
    all.push(...problems);
    // Divorce renames them, so counting only 'Spouse' missed every marriage that ended.
    if ((s.family || []).some((p) => p.relation === 'Spouse' || p.relation === 'Ex-spouse')) married++;
    if (C.livingChildren(s).length) kids++;
    if ((s.family || []).some((p) => p.adopted)) adopted++;
    if ((s.family || []).some((p) => p.relation === 'Ex-spouse')) divorced++;
    if ((s.family || []).some((p) => p.relation === 'Spouse' && p.alive === false)) widowed++;
    if (G.heirsOf(s).length) heirs++;
  }
  console.log(`\n      120 lives, 55 years each, doing everything at random:`);
  console.log(`        married ${married} · had children ${kids} · adopted ${adopted} · divorced ${divorced} · widowed ${widowed} · left an heir ${heirs}`);
  ok('no life gets into an impossible state', all.length === 0, all.slice(0, 4).join(' | '));
  ok('and the systems actually get exercised', married > 30 && kids > 15, `${married} married, ${kids} with children`);
}

// ── what a marriage leaves behind ─────────────────────────────────────────────
{
  const widow = (means, prenup, rel = 70) => {
    const s = createInitialState({ name: 'V Sol', dream: 'actor' });
    Object.assign(s, { ageY: 60, year: 2090, month: 0, cash: 100000, familyEstate: [1500, 11000], alive: true });
    const sp = { id: 'sp', name: 'Ada Rune', relation: 'Spouse', gender: 'f', age: 62, alive: true,
      health: 50, relationship: rel, job: 'architect', means, prenup, marriedOn: (2090 - 30) * 12 };
    s.family = [sp];
    const got = F.inheritFrom(s, sp);
    return { cash: got ? got.cash : null, note: got ? got.note : 'NOTHING AT ALL' };
  };
  // What they were still holding carries a random multiplier, so a single draw against a
  // single draw compares noise. Average it.
  const avg = (...args) => { let t = 0; for (let i = 0; i < 300; i++) t += widow(...args).cash; return Math.round(t / 300); };
  const ordinary = { cash: avg('ordinary', false), note: widow('ordinary', false).note };
  const rich = { cash: avg('serious', false), note: widow('serious', false).note };
  const richPrenup = { cash: avg('serious', true), note: '' };
  const estranged = widow('serious', false, -40);
  ok('a wife or husband leaves you something', ordinary.cash > 0, ordinary.note);
  ok('and a rich one leaves you a great deal more', rich.cash > ordinary.cash * 5,
    `€${ordinary.cash.toLocaleString()} vs €${rich.cash.toLocaleString()}`);
  ok('a prenup cuts what comes to you too', richPrenup.cash < rich.cash * 0.7,
    `€${richPrenup.cash.toLocaleString()} vs €${rich.cash.toLocaleString()}`);
  ok('and somebody who ended up hating you changes the will', estranged.cash === 0, estranged.note);
  ok('an ex-spouse leaves you nothing', F.inheritFrom(
    Object.assign(createInitialState({}), { ageY: 60, cash: 0 }),
    { relation: 'Ex-spouse', name: 'X', relationship: 60 }) === null);
  console.log(`\n      what a marriage leaves — ordinary €${ordinary.cash.toLocaleString()} · `
    + `rich €${rich.cash.toLocaleString()} · rich with a prenup €${richPrenup.cash.toLocaleString()}`);
  console.log(`      "${rich.note}"`);
}

// ── and it actually happens in a played life ──────────────────────────────────
{
  let landed = 0, mentalDrops = [];
  for (let i = 0; i < 40; i++) {
    const s = createInitialState({ name: 'V Sol', dream: 'actor' });
    beginLife(s);
    Object.assign(s, { stage: 'career', ageY: 70, year: 2090, month: 0, cash: 50000, alive: true,
      mental: 80, health: 70, hasApartment: true, housing: 'flat' });
    s.family = [{ id: 'sp', name: 'Ada Rune', relation: 'Spouse', gender: 'f', age: 89, alive: true,
      health: 12, relationship: 75, job: 'retired', means: 'money', marriedOn: (2090 - 40) * 12 }];
    const before = s.cash, mBefore = s.mental;
    let t = s;
    for (let y = 0; y < 12 && (t.family || []).some((p) => p.relation === 'Spouse' && p.alive); y++) {
      for (let m = 0; m < 12; m++) t = advanceMonth(t);
      if (!t.alive) break;
    }
    const gone = (t.family || []).find((p) => p.relation === 'Spouse' && p.alive === false);
    if (gone && t.alive) { if ((t.cash || 0) > before) landed++; mentalDrops.push(mBefore - t.mental); }
  }
  // Whether it happens at all inside twelve years is two mortality rolls racing each other,
  // so this asks whether the payout lands WHEN they go, not how often they go.
  ok('losing them in a real life actually pays out', landed >= 10, `${landed} of 40`);
  ok('and it costs you more than a distant cousin would',
    mentalDrops.length === 0 || mentalDrops.reduce((a, b) => a + b, 0) / mentalDrops.length > 5,
    'avg mental drop ' + (mentalDrops.reduce((a, b) => a + b, 0) / Math.max(1, mentalDrops.length)).toFixed(0));
}

// ── and you can marry again afterwards ────────────────────────────────────────
{
  const s = createInitialState({ name: 'V Sol', dream: 'actor' });
  Object.assign(s, { stage: 'career', ageY: 62, year: 2090, cash: 900000, charisma: 100, looks: 100,
    hasApartment: true, housing: 'flat', alive: true, partner: null, datingPool: [] });
  s.family = [{ id: 'sp', name: 'Ada Rune', relation: 'Spouse', gender: 'f', age: 64, alive: false,
    health: 0, relationship: 70, job: 'architect', means: 'money', marriedOn: 0 }];
  ok('a widow is not still married', C.spouseOf(s) === null);
  const p = L.prospect(s); p.id = 'new'; p.charm = 95; p.relationship = 38; s.datingPool = [p];
  for (let i = 0; i < 14 && !s.partner; i++) {
    const q = (s.datingPool || [])[0]; if (q && (q.relationship || 0) < 38) q.relationship = 38;
    L.goOnDate(s, 'home', 'new'); s._cool = {};
  }
  ok('and can start again', !!s.partner, 'never got there');
  for (let a = 0; a < 12 && !C.spouseOf(s); a++) { s._cool = {}; s.partner.relationship = 99; L.proposeMarriage(s, 'registry', false); }
  ok('and marry again', !!C.spouseOf(s));
  ok('without the first one vanishing', (s.family || []).filter((p2) => p2.relation === 'Spouse').length === 2);
  ok('and only one of them living', (s.family || []).filter((p2) => p2.relation === 'Spouse' && p2.alive).length === 1);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
