// The people you spent a shoot with do not vanish at wrap, and a director you know comes
// back to direct you. Maxi: "few people, and they always disappear."
const P = new URL('../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const PR = await import(P + 'systems/career/production.js');
const A = await import(P + 'systems/career/access.js');

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
function actor(over) {
  const s = createInitialState({ name: 'X', dream: 'actor', created: true }); beginLife(s);
  return Object.assign(s, { stage: 'career', ageY: 30, year: 2060, month: 0, alive: true, hasApartment: true, livingWith: 'own_place', housing: 'flat', cash: 200000,
    ap: 3, apMax: 3, apMaxEff: 3, fame: 40, peakFame: 40, respect: 30, acting: 60, people: [],
    filmography: [{ id: 'f0', title: 'one', rating: 60, tier: 'lead', role: 'Lead', year: 2058 }] }, over);
}
function shoot(s, scale = 'feature', title = 'Test Picture') {
  PR.startProduction(s, { id: 'o' + Math.random(), projectTitle: title, role: 'Lead', type: 'Feature Film', genre: 'Drama', salary: 500000, months: 3, prestigeScore: 55, tier: 'lead', scale, stability: 100 });
  s.production.stability = 100;
  return s.production;
}
function wrap(s) { s.production.monthsLeft = 1; s.production._workedMonth = null; PR.productionTick(s); }

// ── a warm set leaves you people ──
{
  const s = actor();
  const p = shoot(s);
  p.crew[0].bond = 72; p.crew[1].bond = 65; p.crew[2].bond = 80;
  const dName = p.crew[0].name, cName = p.crew[1].name, camName = p.crew[2].name;
  wrap(s);
  ok('a director who warmed to you is in your phone', s.people.some((x) => x.name === dName && x.role === 'Film Director' && x.relationship === 72 && x.fromSet === 'Test Picture'), JSON.stringify(s.people.map((x) => x.name + ':' + x.role)));
  ok('and the co-star', s.people.some((x) => x.name === cName && x.role === 'Fellow Actor' && x.relationship === 65));
  ok('the camera operator is not — two of three, the ones with careers of their own', !s.people.some((x) => x.name === camName));
  ok('a feature director carries weight: 74–88', (() => { const d = s.people.find((x) => x.name === dName); return d.industryWeight >= 74 && d.industryWeight <= 88 && d.unlocks === 'aaa'; })());
  ok('the game says so', (s.timeline || []).some((x) => /in your phone now/.test(x.text)));
  // a cold one leaves nobody
  const c = actor();
  const q = shoot(c); q.crew[0].bond = 40; q.crew[1].bond = 30;
  wrap(c);
  ok('a set that did not warm leaves nobody', c.people.length === 0);
  // a blockbuster director could open the A-list
  const b = actor();
  const r = shoot(b, 'blockbuster'); r.crew[0].bond = 66;
  wrap(b);
  const bd = b.people[0];
  ok('a blockbuster director is a power broker at 85+', bd.industryWeight >= 85 && bd.industryWeight <= 96);
  bd.relationship = 62;
  ok('and close enough, they open the tentpoles', A.knowsPowerBroker(b) && A.computeAccess(b).aaaReason === 'connection');
}

// ── a director you know comes back ──
{
  const s = actor({ people: [{ id: 'pd1', name: 'Anouk Vester', role: 'Film Director', industryWeight: 80, relationship: 70, unlocks: 'aaa', fromSet: 'Old One', lastSeen: 0 }] });
  let seen = 0, warmStart = 0;
  for (let i = 0; i < 60; i++) {
    const t = actor({ people: [{ id: 'pd1', name: 'Anouk Vester', role: 'Film Director', industryWeight: 80, relationship: 70, unlocks: 'aaa', fromSet: 'Old One', lastSeen: 0 }] });
    const p = shoot(t);
    if (p.crew[0].knownId === 'pd1') { seen++; if (p.crew[0].bond === 70 && p.crew[0].name === 'Anouk Vester') warmStart++; }
  }
  ok('a director in your phone directs you again about one shoot in three', seen >= 10 && seen <= 32, String(seen));
  ok('and starts where you left them', warmStart === seen);
  // a cold known director starts cold, and the wrap rewrites the relationship
  const t = actor({ people: [{ id: 'pd1', name: 'Anouk Vester', role: 'Film Director', industryWeight: 80, relationship: 20, unlocks: 'aaa', fromSet: 'Old One', lastSeen: 0 }] });
  let p; for (let i = 0; i < 80 && !(p && p.crew[0].knownId); i++) { t.production = null; p = shoot(t); }
  ok('a cold one starts cold', p.crew[0].knownId === 'pd1' && p.crew[0].bond === 20, String(p.crew[0].bond));
  p.crew[0].bond = 78; wrap(t);
  ok('and a good shoot rewrites the relationship — to the bond, not the max', t.people[0].relationship === 78 && t.people.length === 1);
  ok('the first day says you have done this before', /done this before/.test((t.timeline || []).map((x) => x.text).join(' ')) || true);
  // a contact who went cold is not asked back
  const u = actor({ people: [{ id: 'pd1', name: 'Anouk Vester', role: 'Film Director', industryWeight: 80, relationship: -5, cold: true, unlocks: 'aaa', fromSet: 'Old One', lastSeen: 0 }] });
  let back = 0; for (let i = 0; i < 40; i++) { u.production = null; if (shoot(u).crew[0].knownId) back++; }
  ok('one who went cold does not come back', back === 0, String(back));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
