// Both scales, played and audited. Every month of sixty lives: is fame ever above its
// ceiling, is standing ever outside its floor and cap, does anything go NaN, do the tiers
// agree with the numbers, does Forgotten fire and does anybody ever come back from it, and
// do the two new set penalties — unprepared and a party mid-shoot — actually cool a director.
const P = new URL('../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const K = await import(P + 'systems/career/castings.js');
const PR = await import(P + 'systems/career/production.js');
const ST = await import(P + 'systems/career/story.js');
const S = await import(P + 'systems/meta/status.js');
const PA = await import(P + 'systems/life/party.js');
const H = await import(P + 'systems/life/health.js');

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

// ── invariants, every month ──
function audit(s) {
  const bad = [];
  if (!Number.isFinite(s.fame)) bad.push('fame is ' + s.fame);
  if (!Number.isFinite(s.respect)) bad.push('respect is ' + s.respect);
  if ((s.fame || 0) < 0 || (s.fame || 0) > 100) bad.push('fame ' + s.fame);
  if ((s.respect || 0) < S.RESPECT_FLOOR || (s.respect || 0) > 100) bad.push('respect ' + s.respect);
  const ceil = S.fameCeiling(s);
  if ((s.fame || 0) > ceil + 0.01 && (s.peakFame || 0) <= ceil + 0.01) bad.push(`fame ${s.fame.toFixed(1)} over ceiling ${ceil}`);
  if ((s.peakFame || 0) < (s.fame || 0) - 0.01) bad.push('peak below current');
  // the tiers must agree with the numbers
  const ft = S.fameTier(s.fame);
  if ((s.fame || 0) < ft.min) bad.push('fame tier disagrees');
  const rt = S.respectTier(s.respect);
  if ((s.respect || 0) < rt.min) bad.push('respect tier disagrees');
  // forgotten is a state, and it must be consistent with its own definition
  if (S.isForgotten(s) && !((s.peakFame || 0) >= 35 && (s.fame || 0) < 15)) bad.push('forgotten without having fallen');
  const d = S.forgottenDepth(s);
  if (d < 0 || d > 1) bad.push('forgotten depth ' + d);
  return bad;
}

const problems = [];
let forgottenLives = 0, cameBack = 0, everForgotten = 0, lowestR = 0, sunkR = 0, minR = 100, maxR = -100;
const N = 60;
for (let i = 0; i < N; i++) {
  const s = createInitialState({ name: 'X' + i, dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 20, year: 2050, month: 0, hasApartment: true, livingWith: 'own_place',
    housing: 'room', cash: 12000, alive: true, ap: 100, apMax: 100, apMaxEff: 100 });
  let t = s, wasForgotten = false, backFrom = false;
  // three kinds of life, so the scales are pushed in every direction
  const kind = i % 3;   // 0 climbs, 1 climbs then stops working, 2 drifts
  for (let m = 0; m < 55 * 12; m++) {
    const r = Math.random();
    try {
      t.bigMoment = null; t.pendingArc = null;
      if (t.production && !t.production.take) ST.pushTake(t, kind === 0 ? 'about' : 'straight');
      if (t.illness && (t.cash || 0) > H.treatmentCost(t, t.illness)) H.seeDoctor(t);
      const stopWorking = kind === 1 && t.ageY >= 40 && t.ageY < 52;   // a decade off, then back
      if (!stopWorking) {
        K.refreshCastingPool(t);
        if (!t.production && (t.ap || 0) > 0 && (t.castingPool || []).length) {
          const c = t.castingPool[Math.floor(Math.random() * t.castingPool.length)];
          if (kind === 0) K.prepareFor(t, c.id);
          K.auditionFor(t, c.id, kind === 0 ? 85 : kind === 1 ? 65 : 25 + Math.random() * 30);
        }
        if ((t.offers || []).length && !t.production) { const o = t.offers[0]; PR.startProduction(t, o); t.offers = t.offers.filter((x) => x.id !== o.id); }
        if (kind === 0 && t.production && (t.ap || 0) > 0) PR.rehearse(t);
      }
      // the drifter throws parties during shoots
      if (kind === 2 && t.production && (t.ap || 0) > 0 && r > 0.8 && (t.cash || 0) > 3000) PA.throwParty(t, PA.PARTY_ORDER[0]);
      t = advanceMonth(t);
    } catch (e) { problems.push(`THREW life ${i} month ${m}: ${e.message}`); break; }
    const bad = audit(t);
    if (bad.length) { problems.push(`life ${i} month ${m} (age ${t.ageY}): ${bad[0]}`); break; }
    if (S.isForgotten(t)) { wasForgotten = true; }
    else if (wasForgotten && (t.fame || 0) >= 35) backFrom = true;
    minR = Math.min(minR, t.respect || 0); maxR = Math.max(maxR, t.respect || 0);
    if (!t.alive) break;
  }
  if (wasForgotten) everForgotten++;
  if (backFrom) cameBack++;
  if ((t.respect || 0) < 0) sunkR++;
}
console.log(`${N} lives of fifty-five years, three kinds of player:`);
console.log(`  were Forgotten at some point ${everForgotten}/${N} · came back to Known Face from it ${cameBack} · standing ranged ${Math.round(minR)}…${Math.round(maxR)} · ended below zero ${sunkR}`);
ok('no month put either scale in an impossible state', problems.length === 0, problems.slice(0, 4).join(' | '));
ok('somebody was actually Forgotten — the title is reachable', everForgotten > 0, String(everForgotten));
ok('and somebody came back from it', cameBack > 0, String(cameBack));
ok('standing went below zero for somebody', minR < 0, String(minR));
ok('and nobody went through the floor', minR >= S.RESPECT_FLOOR, String(minR));

// ── the set: unprepared, and the morning after ──
{
  function shoot(over) {
    const s = createInitialState({ name: 'D', dream: 'actor', created: true }); beginLife(s);
    Object.assign(s, { stage: 'career', ageY: 30, year: 2060, month: 0, hasApartment: true, livingWith: 'own_place',
      housing: 'flat', cash: 200000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, fame: 40, respect: 30, acting: 60,
      filmography: [{ title: 'x', rating: 70, tier: 'lead', role: 'Lead', year: 2058 }] }, over);
    PR.startProduction(s, { id: 'o', projectTitle: 'Test Picture', role: 'Lead', type: 'Feature Film', genre: 'Drama',
      salary: 500000, months: 5, prestigeScore: 55, tier: 'lead', scale: 'feature', stability: 85 });
    return s;
  }
  // rehearse every month vs never — b coasts (production.js STANCES); the default stance rehearses for you
  let a = shoot(), b = shoot();
  b.production.stance = 'coast';
  const bondA0 = a.production.crew[0].bond, bondB0 = b.production.crew[0].bond;
  a.production.crew[0].bond = 45; b.production.crew[0].bond = 45;
  for (let m = 0; m < 4; m++) {
    a.ap = 100; PR.rehearse(a); a = advanceMonth(a);
    b.ap = 100; b = advanceMonth(b);
  }
  const bondA = a.production ? a.production.crew[0].bond : -1, bondB = b.production ? b.production.crew[0].bond : -1;
  ok('a director you rehearse for stays where they were', bondA >= 44, String(bondA));
  // Three skipped months of four: nothing, then −3..−5, then −5..−8 — about −10 from 45.
  ok('and one you turn up unprepared for cools', bondB <= 37, String(bondB));
  ok('and says so', (b.timeline || []).some((x) => /not knowing the pages/.test(x.text)), (b.timeline || []).slice(0, 3).map((x) => x.text).join(' | '));

  // a party mid-shoot
  let c = shoot({ cash: 50000 });
  c.production.crew[0].bond = 45;
  const meter0 = c.production.meter;
  PA.throwParty(c, PA.PARTY_ORDER[0]);
  ok('a party during a shoot costs the shoot', c.production.meter < meter0, `${meter0} → ${c.production.meter}`);
  ok('and cools the director', c.production.crew[0].bond < 45, String(c.production.crew[0].bond));
  ok('and the game says what happened on set', /call was at six|call sheet/.test(c.lastEvent || ''), c.lastEvent);
  // and it is worse if you drink
  let d = shoot({ cash: 50000, drink: { level: 60, worstLevel: 60 } });
  d.production.crew[0].bond = 45;
  PA.throwParty(d, PA.PARTY_ORDER[0]);
  ok('and worse still when you drink', d.production.crew[0].bond < c.production.crew[0].bond + 3, `${d.production.crew[0].bond} vs ${c.production.crew[0].bond}`);
}

// ── Forgotten does something ──
{
  const fresh = createInitialState({ name: 'F', dream: 'actor', created: true }); beginLife(fresh);
  Object.assign(fresh, { stage: 'career', ageY: 22, fame: 8, peakFame: 8, alive: true, hasApartment: true, cash: 9000 });
  const fallen = createInitialState({ name: 'G', dream: 'actor', created: true }); beginLife(fallen);
  Object.assign(fallen, { stage: 'career', ageY: 50, fame: 8, peakFame: 70, alive: true, hasApartment: true, cash: 9000 });
  ok('a newcomer at 8 is Unknown', !S.isForgotten(fresh));
  ok('a fallen star at 8 is Forgotten', S.isForgotten(fallen));
  ok('and is sent fewer scripts than the newcomer', K.boardSize(fallen) < K.boardSize(fresh), `${K.boardSize(fallen)} vs ${K.boardSize(fresh)}`);
  ok('and the depth is how far they fell', S.forgottenDepth(fallen) > 0.8, S.forgottenDepth(fallen).toFixed(2));
}
// ── the way out: which rung a comeback lands you on ──
{
  const R = await import(P + 'systems/career/release.js');
  function fallen() {
    const s = createInitialState({ name: 'C', dream: 'actor', created: true }); beginLife(s);
    return Object.assign(s, { stage: 'career', ageY: 50, year: 2080, month: 0, fame: 9, peakFame: 70, respect: 20, alive: true, hasApartment: true, cash: 90000, media: 0,
      filmography: [{ title: 'old', rating: 80, tier: 'lead', role: 'Lead', year: 2066, score: 8 }] });
  }
  const credit = (rating) => ({ title: 'Back', role: 'Lead', tier: 'lead', type: 'Feature Film', genre: 'Drama', scale: 'indie', rating, status: rating >= 70 ? 'Well-received' : 'Released', year: 2080, salary: 200000, weeks: 6, weeksTotal: 6, boxOffice: 4000000, running: true, id: 'r1' });
  // a good film: straight back to Known Face
  let s = fallen(); let c = credit(76); s.filmography.unshift(c); s.running = ['r1'];
  c._rel = { rating: 76, tier: 'lead', scale: 'indie', salary: 200000, finalGross: 4000000, film: true, job: {} };
  R.runTick(s);
  ok('one good film brings a Forgotten name straight back to Known Face', (s.fame || 0) >= 35 && S.fameTier(s.fame).id !== 'rising', String(Math.round(s.fame)));
  ok('and the trades call it a comeback', (s.timeline || []).some((x) => /comeback/.test(x.text)));
  ok('and it is no longer Forgotten', !S.isForgotten(s));
  // a mediocre film: no word, no jump
  let m = fallen(); let d = credit(52); m.filmography.unshift(d); m.running = ['r1'];
  d._rel = { rating: 52, tier: 'lead', scale: 'indie', salary: 200000, finalGross: 2000000, film: true, job: {} };
  R.runTick(m);
  ok('mediocre work after a fall does not get the word', (m.fame || 0) < 20 && !(m.timeline || []).some((x) => /comeback/.test(x.text)), String(Math.round(m.fame)));
  // and only once
  s._cameBack = true; const f2 = s.fame; s.fame = 9; let e = credit(80); s.filmography.unshift(e); s.running = ['r1'];
  e._rel = { rating: 80, tier: 'lead', scale: 'indie', salary: 200000, finalGross: 4000000, film: true, job: {} };
  R.runTick(s);
  ok('the second comeback is just a career', (s.fame || 0) < 35, String(Math.round(s.fame)));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
