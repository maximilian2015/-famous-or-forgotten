// Using your name. Standing spends: five asks, each costs the asking whether it works or
// not, each gated on a rung. One number, and it goes down.
const P = new URL('../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const F = await import(P + 'systems/career/favours.js');
const K = await import(P + 'systems/career/castings.js');
const PR = await import(P + 'systems/career/production.js');
const R = await import(P + 'systems/career/release.js');
const ST = await import(P + 'systems/meta/standing.js');

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const realRandom = Math.random;
const pin = (v, fn) => { Math.random = () => v; try { return fn(); } finally { Math.random = realRandom; } };
function actor(over) {
  const s = createInitialState({ name: 'X', dream: 'actor', created: true }); beginLife(s);
  return Object.assign(s, { stage: 'career', ageY: 34, year: 2064, month: 2, alive: true, hasApartment: true, livingWith: 'own_place', housing: 'flat', cash: 300000,
    ap: 3, apMax: 3, apMaxEff: 3, fame: 45, peakFame: 45, respect: 50, acting: 65, charisma: 55, looks: 55, luck: 50, people: [],
    filmography: [{ id: 'f0', title: 'one', rating: 66, tier: 'lead', role: 'Lead', year: 2062 }] }, over);
}

// ── the gates ──
{
  ok('a name under thirty cannot ask for the lead', !F.canUse(actor({ respect: 29 }), 'lead').ok && F.canUse(actor({ respect: 30 }), 'lead').ok);
  ok('a sequel takes forty', !F.canUse(actor({ respect: 39 }), 'sequel').ok && F.canUse(actor({ respect: 40 }), 'sequel').ok);
  ok('a word on set takes twenty, a word for a friend twenty-five, the studio takes you down to the floor', F.canUse(actor({ respect: 20 }), 'smooth').ok && !F.canUse(actor({ respect: 24 }), 'vouch').ok && F.canUse(actor({ respect: -30 }), 'shelf').ok && !F.canUse(actor({ respect: -31 }), 'shelf').ok);
  ok('and you cannot spend past the floor', !F.canUse(actor({ respect: -35 }), 'shelf').ok);
}

// ── ask for the lead ──
{
  const s = actor({ respect: 50 });
  K.refreshCastingPool(s, true);
  let sup = s.castingPool.find((c) => c.shelf === 'film' && c.role !== 'Lead');
  for (let i = 0; i < 20 && !sup; i++) { K.refreshCastingPool(s, true); sup = s.castingPool.find((c) => c.shelf === 'film' && c.role !== 'Lead'); }
  ok('there is a supporting film part on the board', !!sup, JSON.stringify(s.castingPool.map((c) => c.role)));
  const fee0 = sup.salary;
  pin(0.01, () => F.askForLead(s, sup.id));
  ok('asking costs six whether or not', s.respect === 44 && s.nameSpent === 6, String(s.respect));
  ok('and when they say yes the part is the lead, and the fee is a lead fee', sup.role === 'Lead' && sup.askedLead && sup.salary > fee0, `${fee0} → ${sup.salary}`);
  ok('the timeline says you asked', (s.timeline || []).some((x) => /read you for the lead/.test(x.text)));
  const n = actor({ respect: 50 }); K.refreshCastingPool(n, true);
  let sup2 = n.castingPool.find((c) => c.shelf === 'film' && c.role !== 'Lead');
  for (let i = 0; i < 20 && !sup2; i++) { K.refreshCastingPool(n, true); sup2 = n.castingPool.find((c) => c.shelf === 'film' && c.role !== 'Lead'); }
  pin(0.99, () => F.askForLead(n, sup2.id));
  ok('when they say no it still cost you, and the part is still supporting', n.respect === 44 && sup2.role !== 'Lead' && /said no/.test(n.lastEvent || ''), n.lastEvent);
  // odds rise with standing
  ok('the odds are the standing: 30 at 40, 90 at 90', (() => { let yes40 = 0, yes90 = 0; for (let i = 0; i < 200; i++) { const a = actor({ respect: 40 }); K.refreshCastingPool(a, true); const c = a.castingPool.find((x) => x.shelf === 'film' && x.role !== 'Lead'); if (c) { F.askForLead(a, c.id); if (c.role === 'Lead') yes40++; } const b = actor({ respect: 90 }); K.refreshCastingPool(b, true); const d = b.castingPool.find((x) => x.shelf === 'film' && x.role !== 'Lead'); if (d) { F.askForLead(b, d.id); if (d.role === 'Lead') yes90++; } } return yes90 > yes40 * 1.5; })());
}

// ── push for a sequel ──
{
  const s = actor({ respect: 60, fame: 60, peakFame: 60 });
  const job = { title: 'North Water', role: 'Lead', type: 'Feature Film', genre: 'Drama', salary: 900000, baseSalary: 900000, months: 6, tier: 'lead', scale: 'feature', prestigeScore: 55, part: 1, stability: 90 };
  const rel = () => ({ rating: 68, tier: 'lead', scale: 'feature', salary: 900000, finalGross: 150000000, film: true, meter: 60, job });
  const credit = { id: 'c9', title: 'North Water', role: 'Lead', tier: 'lead', type: 'Feature Film', genre: 'Drama', scale: 'feature', rating: 68, status: 'Released', year: 2064, salary: 900000, weeks: 8, weeksTotal: 8, boxOffice: 150000000, running: true, _rel: rel() };
  s.filmography.unshift(credit); s.running = ['c9'];
  pin(0.99, () => R.runTick(s));   // the studio rolls no
  ok('a film the studio passed on can be pushed for', credit.pushable === true && !!credit.job && F.canPushSequel(s, 'c9'), JSON.stringify({ p: credit.pushable, v: credit.verdict }));
  const r0 = s.respect;
  pin(0.01, () => F.pushSequel(s, 'c9'));
  ok('pushing costs eight', s.respect === r0 - 8);
  ok('and when it works the sequel is announced', (s.laterOffers || []).some((l) => /North Water II/.test(l.offer.projectTitle)) && !credit.pushable, JSON.stringify((s.laterOffers || []).map((l) => l.offer.projectTitle)));
  // a bomb cannot be pushed for
  const b = actor({ respect: 60 });
  const bomb = { ...credit, id: 'c10', title: 'Sank', boxOffice: 20000000, running: true, pushable: false, job: null, _rel: { ...rel(), finalGross: 20000000 } };
  b.filmography.unshift(bomb); b.running = ['c10']; pin(0.99, () => R.runTick(b));
  ok('a bomb is not pushable — nobody takes that call', !bomb.pushable, String(bomb.verdict));
  // and only once
  const t = actor({ respect: 60 }); const c2 = { ...credit, id: 'c11', pushable: true, pushed: false, job, running: false }; delete c2._rel; t.filmography.unshift(c2);
  pin(0.99, () => F.pushSequel(t, 'c11'));
  ok('a push that fails still cost you, and you do not get to push twice', t.respect === 52 && c2.pushed && !F.canPushSequel(t, 'c11'));
}

// ── have a word ──
{
  const s = actor({ respect: 30 });
  PR.startProduction(s, { id: 'o', projectTitle: 'T', role: 'Lead', type: 'Feature Film', genre: 'Drama', salary: 300000, months: 5, prestigeScore: 50, tier: 'lead', scale: 'feature', stability: 100 });
  const lead = s.production.crew[0]; lead.bond0 = 50; lead.bond = 50;
  ok('nothing to smooth while they are where they started', !F.canSmooth(s));
  lead.bond = 38; s.production._winged = 2;
  ok('a director who cooled can be talked round', F.canSmooth(s));
  F.smoothOver(s);
  ok('it costs five and puts them back', s.respect === 25 && lead.bond === 50 && s.production._winged === 0);
  ok('once per shoot', !F.canSmooth(s));
}

// ── put in a word ──
{
  const s = actor({ respect: 40, people: [{ id: 'c1', name: 'Tomas Reel', role: 'Fellow Actor', relationship: 40, industryWeight: 30, lastSeen: 0 }] });
  F.vouchFor(s, 'c1');
  ok('three points, and they owe you', s.respect === 37 && s.people[0].owes === true && s.people[0].relationship >= 50, String(s.people[0].relationship));
  const r = s.respect; F.vouchFor(s, 'c1');
  ok('not twice in two years', s.respect === r && /pattern/.test(s.lastEvent || ''));
}

// ── a word with the studio ──
{
  const s = actor({ fame: 62, peakFame: 62, respect: 10, ageY: 40 });
  ok('the face can open the shelf', ST.comboOf(s) === 'face' && F.canOpenShelf(s));
  K.refreshCastingPool(s, true);
  ok('and there is no prestige on the board', !s.castingPool.some((c) => c.scale === 'prestige' || /^Prestige/.test(c.type)));
  const n0 = s.castingPool.length;
  F.openShelf(s, K.addPrestigeListing);
  const opened = s.castingPool.find((c) => c.openedByName);
  ok('ten points, and one prestige listing appears', s.respect === 0 && !!opened && (opened.scale === 'prestige' || /^Prestige/.test(opened.type)) && s.castingPool.length === n0 + 1, JSON.stringify(s.castingPool.map((c) => c.type)));
  ok('once, while it is on the board', !F.canOpenShelf(s));
  ok('a star does not need it', !F.canOpenShelf(actor({ fame: 62, respect: 45 })));
  ok('and the flag never lingers', s._openShelfOnce === undefined);
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
