// A wider net than sweep_now: the same per-month state audit, but with rules for the halves
// of the game sweep never checked — people, children, marriage, money, the ladder, the
// awards season and seasons of television — and a player who lives a life alongside a career.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const K = await import(P + 'systems/career/castings.js');
const PR = await import(P + 'systems/career/production.js');
const ST = await import(P + 'systems/career/story.js');
const L = await import(P + 'systems/life/dating.js');
const C = await import(P + 'systems/life/children.js');
const I = await import(P + 'systems/life/interactions.js');
const H = await import(P + 'systems/life/health.js');
const E = await import(P + 'systems/meta/email.js');
const S = await import(P + 'systems/meta/status.js');
const B = await import(P + 'systems/life/bonds.js');

function audit(s) {
  const bad = [];
  if (!s.alive) return bad;
  const now = (s.year || 0) * 12 + (s.month || 0);

  // ── people ──
  const seen = new Set();
  for (const p of [...(s.family || []), ...(s.people || [])]) {
    if (!p.name) bad.push('somebody with no name');
    if (seen.has(p.id)) bad.push('two people share an id: ' + p.id);
    seen.add(p.id);
    const r = p.relationship;
    if (!Number.isFinite(r) || r < B.REL_MIN || r > B.REL_MAX) bad.push(p.name + ' at ' + r);
    if (p.age != null && (p.age < 0 || p.age > 120)) bad.push(p.name + ' is ' + p.age);
  }
  const spouse = (s.family || []).filter((p) => p.relation === 'Spouse' && p.alive !== false);
  if (spouse.length > 1) bad.push('married to ' + spouse.length + ' people');
  if (spouse.length && s.partner) bad.push('married and dating at the same time');

  // ── children ──
  for (const c of (s.family || []).filter((p) => p.relation === 'Child')) {
    if (c.age == null) bad.push(c.name + ' has no age');
    else if (c.age > (s.ageY || 0) - 10) bad.push(c.name + ' is ' + c.age + ' and you are ' + s.ageY);
  }

  // ── money and home ──
  if (!Number.isFinite(s.cash)) bad.push('cash is not a number');
  if (s.hasApartment && s.livingWith === 'parents') bad.push('own place and living with parents at once');
  if (s.homeless && s.hasApartment) bad.push('homeless with a flat');

  // ── the ladder ──
  const ceil = S.fameCeiling(s);
  if ((s.fame || 0) > ceil + 0.01 && (s.peakFame || 0) <= ceil + 0.01) bad.push('fame ' + s.fame.toFixed(1) + ' over its ceiling ' + ceil);
  if (s.quote != null && !Number.isFinite(s.quote)) bad.push('quote is not a number');
  // The quote follows a fall over a few years rather than instantly (quoteTick), so being
  // above today's ceiling is a legal in-between state. What is NOT legal is a number no tier
  // in the game could ever have produced.
  if ((s.quote || 0) > 170000000 || (s.quote || 0) < 0) bad.push('quote ' + s.quote);

  // ── awards ──
  const aw = s.awards;
  if (aw) {
    for (const w of (aw.wins || [])) if (!w.title || !w.category) bad.push('a win with nothing on it');
    for (const p of (aw.pending || [])) {
      if (!p.field || p.field.length !== 5) bad.push('a category with ' + ((p.field || []).length) + ' nominees');
      if (p.due - now > 8) bad.push('a ceremony ' + (p.due - now) + ' months out');
      if (!Number.isFinite(p.yourOdds) || p.yourOdds < 0 || p.yourOdds > 100) bad.push('odds ' + p.yourOdds);
    }
  }

  // ── credits and seasons ──
  const shelf = [...(s.filmography || []), ...(s.discography || [])];
  const bySeries = {};
  for (const c of shelf) {
    if (!c.title) bad.push('a credit with no title');
    if (c.season > 1) {
      const root = String(c.title).replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();
      (bySeries[root] = bySeries[root] || []).push(c.season);
    }
    if (c.year > (s.year || 0)) bad.push(c.title + ' is dated ' + c.year + ' and it is ' + s.year);
    if (c.viewers != null && c.viewers < 0) bad.push(c.title + ' had ' + c.viewers + ' viewers');
  }
  for (const [root, seasons] of Object.entries(bySeries)) {
    if (new Set(seasons).size !== seasons.length) bad.push(root + ' has two of the same season');
  }

  // ── health, depression, drink ──
  if ((s.health || 0) < 0 || (s.health || 0) > 100) bad.push('health ' + s.health);
  if ((s.mental || 0) < 0 || (s.mental || 0) > 100) bad.push('mental ' + s.mental);
  if (s.rehab && s.rehab.left > 0 && s.production) bad.push('shooting from a clinic');
  if ((s.untreated || 0) < 0) bad.push('negative untreated illness');
  return bad;
}

const problems = [];
const stats = { married: 0, kids: 0, divorced: 0, widowed: 0, seasons: 0, askers: 0, died: 0 };
const N = 60;
for (let i = 0; i < N; i++) {
  const s = createInitialState({ name: 'A' + i, dream: Math.random() < 0.25 ? 'singer' : 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 20, year: 2050, month: 0, hasApartment: true,
    housing: 'room', cash: 12000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, livingWith: 'own_place' });
  let t = s;
  for (let m = 0; m < 60 * 12; m++) {
    const r = Math.random();
    try {
      t.bigMoment = null; t.pendingArc = null;
      if (t.production && !t.production.take) { const o = ST.takesFor(t.production); ST.pushTake(t, o[Math.floor(Math.random() * o.length)]); }
      if (t.illness && (t.cash || 0) > H.treatmentCost(t, t.illness) && r < 0.7) H.seeDoctor(t);
      K.refreshCastingPool(t);
      if (!t.production && (t.ap || 0) > 0 && (t.castingPool || []).length && r < 0.75) {
        const c = t.castingPool[Math.floor(Math.random() * t.castingPool.length)];
        if (r < 0.25) K.prepareFor(t, c.id);
        K.auditionFor(t, c.id, Math.round(Math.random() * 100));
      }
      if ((t.offers || []).length && !t.production && r > 0.3) {
        const o = t.offers[Math.floor(Math.random() * t.offers.length)];
        PR.startProduction(t, o); t.offers = t.offers.filter((x) => x.id !== o.id);
      }
      const inv = (t.inbox || [])[0];
      if (inv && r > 0.5) E.emailAct(t, inv.id, Math.random() < 0.5 ? 0 : 1);
      if (!t.partner && !C.spouseOf(t) && r > 0.72) {
        L.refreshDatingPool(t);
        const who = (t.datingPool || [])[0];
        if (who) L.goOnDate(t, L.DATE_ORDER[Math.floor(Math.random() * 4)], who.id);
      }
      if (t.partner && L.canMoveIn(t) && r > 0.9) L.moveInTogether(t);
      if (t.partner && r > 0.93) L.proposeMarriage(t, Math.random() < 0.5 ? 'proper' : 'sold', false);
      if (r > 0.95 && C.tryForBaby) { try { C.tryForBaby(t); } catch (e) {} }
      if (r > 0.985 && C.applyToAdopt) { try { C.applyToAdopt(t); } catch (e) {} }
      if (r > 0.8) {
        const all = [...(t.family || []), ...(t.people || [])];
        const who = all[Math.floor(Math.random() * Math.max(1, all.length))];
        if (who) {
          const acts = I.interactionsFor(t, who.id) || [];
          const a = acts[Math.floor(Math.random() * acts.length)];
          if (a && !a.locked) { try { I.interact(t, who.id, a.id); } catch (e) {} }
        }
      }
      if (t.production && (t.ap || 0) > 0) PR.rehearse(t);
      t = advanceMonth(t);
    } catch (e) {
      problems.push('THREW life ' + i + ' month ' + m + ': ' + e.message);
      break;
    }
    const bad = audit(t);
    if (bad.length) { problems.push('life ' + i + ' month ' + m + ' (age ' + t.ageY + '): ' + bad[0]); break; }
    if (!t.alive) break;
  }
  if (C.spouseOf(t)) stats.married++;
  if ((t.family || []).some((p) => p.relation === 'Child')) stats.kids++;
  if ((t.family || []).some((p) => p.relation === 'Ex-spouse')) stats.divorced++;
  if ((t.family || []).some((p) => p.relation === 'Spouse' && p.alive === false)) stats.widowed++;
  if ([...(t.filmography || []), ...(t.discography || [])].some((c) => (c.season || 0) > 1)) stats.seasons++;
  if (((t.awards && t.awards.wins) || []).length) stats.askers++;
  if (!t.alive) stats.died++;
}
console.log(N + ' lives of sixty years, living as well as working:');
console.log('  married ' + stats.married + ' · children ' + stats.kids + ' · divorced ' + stats.divorced
  + ' · widowed ' + stats.widowed + ' · second seasons ' + stats.seasons + ' · Askers ' + stats.askers + ' · died ' + stats.died);
if (problems.length) { console.log('\n' + problems.length + ' PROBLEMS:'); for (const p of problems.slice(0, 12)) console.log('  ' + p); }
else console.log('\nno life reached a state that could not happen');
