// Meeting somebody, living with them, marrying them, and losing half of it.
const P = new URL('../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const L = await import(P + 'systems/life/dating.js');
const { startProduction } = await import(P + 'systems/career/production.js');

// The newest moment: on screen, or last in the queue behind one still up. Moments queue now.
const lastMoment = (s) => ((s.moments || []).length ? s.moments[s.moments.length - 1] : s.bigMoment);

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

function life(over = {}) {
  const s = createInitialState({ name: 'Vera Sol', dream: 'actor' });
  Object.assign(s, { stage: 'career', ageY: 30, year: 2060, month: 0, cash: 3000000, acting: 80,
    fame: 60, respect: 60, mental: 60, health: 80, apMax: 100, ap: 100, apMaxEff: 100, charisma: 70, looks: 65,
    hasApartment: true, housing: 'flat', alive: true, bottles: {}, meds: {}, depression: null,
    drink: null, partner: null, datingPool: [] });
  s.family = []; s.people = [];
  // Fame above 74 now needs a film you carried (systems/meta/status.js). A fixture at fame
  // 60-70 with an empty filmography is not a state the game can actually be in, and without
  // this the ceiling — not the wedding — was what the wedding test measured.
  s.filmography = [{ title: 'The Long Winter', role: 'Lead', tier: 'lead', type: 'Feature Film',
    genre: 'Drama', scale: 'feature', rating: 88, score: 8.8, salary: 900000, year: 2057 }];
  Object.assign(s, over);
  return s;
}
function suitor(s, wants, rel = 0) {
  const p = L.prospect(s);
  p.wants = wants; p.charm = 90; p.relationship = rel; p.id = 'suit';
  s.datingPool = [p];
  return p;
}
// Force the yes-roll by making them a certainty, then take them out enough times.
function getTogether(s, wants = 'family') {
  suitor(s, wants, 38);
  s.charisma = 100; s.looks = 100;
  // Asking is itself a roll, so a run of bad luck must not read as a broken system.
  for (let i = 0; i < 14 && !s.partner; i++) {
    const inPool = (s.datingPool || [])[0];
    if (inPool && (inPool.relationship || 0) < 38) inPool.relationship = 38;
    L.goOnDate(s, 'home', 'suit'); s._cool = {};
  }
  return s.partner;
}

// A proposal is a roll and can be turned down. Tests about what happens AFTER a wedding
// should not fail seven per cent of the time because of the wedding.
function marry(s, style = 'registry', prenup = false) {
  for (let a = 0; a < 12 && !L.spouseOf(s); a++) {
    s._cool = {}; if (s.partner) s.partner.relationship = 99;
    L.proposeMarriage(s, style, prenup);
  }
  return L.spouseOf(s);
}

// ── they are looking for something specific ───────────────────────────────────
{
  const s = life();
  const quiet = { wants: 'quiet', name: 'Q' }, showy = { wants: 'thelife', name: 'T' };
  ok('a quiet one prefers a night in to a premiere',
    L.dateValue(s, quiet, 'home') > L.dateValue(s, quiet, 'public'),
    `home ${L.dateValue(s, quiet, 'home')} vs public ${L.dateValue(s, quiet, 'public')}`);
  ok('and the other one is the exact opposite',
    L.dateValue(s, showy, 'public') > L.dateValue(s, showy, 'home'),
    `public ${L.dateValue(s, showy, 'public')} vs home ${L.dateValue(s, showy, 'home')}`);
  const nobody = life({ fame: 5 }), star = life({ fame: 95 });
  ok('your name is a problem for one of them',
    L.dateValue(star, quiet, 'dinner') < L.dateValue(nobody, quiet, 'dinner'),
    `star ${L.dateValue(star, quiet, 'dinner')} vs nobody ${L.dateValue(nobody, quiet, 'dinner')}`);
  ok('and the whole attraction for another',
    L.dateValue(star, showy, 'dinner') > L.dateValue(nobody, showy, 'dinner'),
    `star ${L.dateValue(star, showy, 'dinner')} vs nobody ${L.dateValue(nobody, showy, 'dinner')}`);
  ok('and a star pays star prices for dinner', L.dateCost(star, 'dinner') > L.dateCost(nobody, 'dinner') * 2,
    `€${L.dateCost(star, 'dinner')} vs €${L.dateCost(nobody, 'dinner')}`);
}

// ── two evenings that go well and it is a thing ───────────────────────────────
{
  const s = life();
  const p = getTogether(s);
  ok('two good evenings make it official', !!p, 'never got there');
  ok('and they leave the pool', !(s.datingPool || []).some((x) => x.id === 'suit'));
  L.goOnDate(s, 'home');
  ok('and you cannot take the same evening twice in a month',
    (L.goOnDate(s, 'home'), /already had your evening/.test(s.lastEvent)), s.lastEvent);
}

// ── an evening costs money you have to actually have ──────────────────────────
{
  const s = life();
  getTogether(s);
  // Somebody with money would simply pay, which is the point of the means system — so to
  // test that YOU cannot afford it, they have to have nothing either.
  s.partner.means = 'broke';
  s._cool = {}; s.cash = 100;
  L.goOnDate(s, 'away');
  ok('you cannot take somebody away on nothing', /short/.test(s.lastEvent), s.lastEvent);
}

// ── moving in ─────────────────────────────────────────────────────────────────
{
  const s = life();
  getTogether(s);
  s.partner.relationship = 40;
  L.moveInTogether(s);
  ok('you cannot move somebody in too early', !s.partner.livingTogether, s.lastEvent);
  s.partner.relationship = 70;
  L.moveInTogether(s);
  ok('and you can once they would say yes', s.partner.livingTogether);
  const homeless = life(); getTogether(homeless);
  homeless.partner.relationship = 80; homeless.hasApartment = false;
  L.moveInTogether(homeless);
  ok('and never with nowhere to put them', !homeless.partner.livingTogether, homeless.lastEvent);
}

// ── the wedding ───────────────────────────────────────────────────────────────
{
  const s = life({ cash: 3000000, fame: 70 });
  getTogether(s);
  s.partner.relationship = 40;
  L.proposeMarriage(s, 'proper', false);
  ok('you cannot propose to somebody who is not there yet', !L.spouseOf(s), s.lastEvent);
  s.partner.relationship = 96; s._cool = {};
  const purse = s.cash;
  const sp = marry(s, 'proper', false);
  ok('and you can when they are', !!sp, s.lastEvent);
  ok('the wedding is paid for', s.cash < purse, `€${purse.toLocaleString()} → €${s.cash.toLocaleString()}`);
  ok('they become family', sp.relation === 'Spouse' && sp.livingTogether);
  ok('and the partner slot is empty', !s.partner);
  ok('and it stops the game', (s.bigMoment || {}).id === 'wedding');
}
{
  // selling the pictures pays for itself and puts your name everywhere
  const s = life({ cash: 200000, fame: 70 });
  getTogether(s, 'thelife');
  s.partner.relationship = 98; s._cool = {};
  const purse = s.cash, fame = s.fame;
  L.proposeMarriage(s, 'sold', false);
  ok('a magazine wedding pays YOU', s.cash > purse, `€${purse.toLocaleString()} → €${s.cash.toLocaleString()}`);
  ok('and it is worth real fame', s.fame > fame + 8, `${fame} → ${s.fame}`);
}

// ── children ──────────────────────────────────────────────────────────────────
{
  const s = life({ cash: 3000000 });
  getTogether(s); s.partner.relationship = 96; s._cool = {};
  marry(s, 'registry', false);
  let born = 0;
  for (let i = 0; i < 40 && born < 1; i++) { s._cool = {}; L.tryForBaby(s); born = (s.family || []).filter((p) => p.relation === 'Child').length; }
  ok('you can have a child', born === 1, String(born));
  const kid = (s.family || []).find((p) => p.relation === 'Child');
  ok('and they start close to you', (kid.relationship || 0) >= 70, String(kid.relationship));
  // and a childhood spent watching you leave
  const before = kid.relationship;
  startProduction(s, { id: 'x', projectTitle: 'Away', role: 'Lead', type: 'Feature Film', genre: 'Drama',
    salary: 2000000, months: 30, tier: 'lead', scale: 'feature', prestigeScore: 70, stability: 99 });
  let t = s;
  for (let m = 0; m < 24; m++) t = advanceMonth(t);
  const after = (t.family || []).find((p) => p.relation === 'Child');
  ok('two years on a set costs you your child', (after.relationship || 0) < before - 20,
    `${before} → ${after.relationship}`);
}

// ── divorce ───────────────────────────────────────────────────────────────────
{
  const s = life({ cash: 4000000 });
  getTogether(s); s.partner.relationship = 96; s._cool = {};
  marry(s, 'registry', false);
  const sp = L.spouseOf(s);
  sp.marriedOn = (s.year || 0) * 12 + (s.month || 0) - 60;
  const purse = s.cash;
  const take = L.settlement(s, sp);
  ok('with no paperwork they take half', take === Math.round(purse * 0.5), '€' + take.toLocaleString());
  L.divorce(s, false);
  ok('and they actually take it', s.cash === purse - take, '€' + s.cash.toLocaleString());
  ok('they become an ex, not a ghost', (s.family || []).some((p) => p.relation === 'Ex-spouse'));
  ok('and there is no spouse any more', !L.spouseOf(s));
  ok('and the game stops to say so', (lastMoment(s) || {}).id === 'divorce', (lastMoment(s) || {}).title);
}
{
  const s = life({ cash: 4000000 });
  getTogether(s); s.partner.relationship = 98; s._cool = {};
  marry(s, 'registry', true);
  const sp = L.spouseOf(s);
  ok('a prenup gets recorded', !!sp && sp.prenup === true, JSON.stringify(sp && sp.prenup));
  sp.marriedOn = (s.year || 0) * 12 + (s.month || 0) - 24;
  const take = L.settlement(s, sp);
  ok('and it is the difference between half and a number you can live with',
    take < 4000000 * 0.5 * 0.5, '€' + take.toLocaleString());
}
{
  // the children go where the stability is
  const s = life({ cash: 2000000 });
  getTogether(s); s.partner.relationship = 96; s._cool = {};
  marry(s, 'registry', false);
  (s.family || []).push({ id: 'k1', name: 'Nico Sol', relation: 'Child', gender: 'm', age: 6,
    alive: true, health: 90, relationship: 75, job: 'in school', raisedBy: 'you' });
  L.divorce(s, true);
  const kid = (s.family || []).find((p) => p.relation === 'Child');
  ok('the children go with them', kid.raisedBy === 'them', kid.raisedBy);
  ok('and it costs you the closeness', kid.relationship < 75, String(kid.relationship));
}

// ── nobody leaves out of nowhere ──────────────────────────────────────────────
{
  let left = 0;
  for (let i = 0; i < 60; i++) {
    const s = life();
    getTogether(s);
    s.partner.relationship = 85;
    for (let y = 0; y < 6; y++) L.datingYear(s);
    if (!s.partner) left++;
  }
  ok('somebody you are close to does not randomly walk out', left <= 2, `${left} of 60 left anyway`);
}
{
  let left = 0;
  for (let i = 0; i < 60; i++) {
    const s = life();
    getTogether(s);
    s.partner.relationship = 4;
    L.datingYear(s);
    if (!s.partner) left++;
  }
  ok('and somebody you have neglected for a year does', left >= 25, `${left} of 60`);
}
{
  // drinking through a marriage is the fastest way to end one
  const count = (drunk) => {
    let gone = 0;
    // Three hundred, because at a 6%-vs-24% base the noise on eighty is wider than the gap.
    for (let i = 0; i < 300; i++) {
      const s = life({ cash: 2000000, drink: drunk ? { level: 80, months: 30, worstLevel: 80, hooked: true } : null });
      if (!getTogether(s)) continue;
      s.partner.relationship = 96; s._cool = {};
      marry(s);
      const sp = L.spouseOf(s); if (!sp) continue; sp.relationship = 20;
      L.datingYear(s);
      if (!L.spouseOf(s)) gone++;
    }
    return gone;
  };
  const sober = count(false), drunk = count(true);
  ok('drinking through a marriage is what ends it', drunk > sober * 2, `${drunk} drunk vs ${sober} sober, of 300`);
  console.log(`      a shaky marriage, per year — sober ${sober}/300 end it, dependent ${drunk}/300`);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
