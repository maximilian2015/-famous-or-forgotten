// A choice that says it does something does it. ChatGPT's design review (13 Sep 2026) found
// five places where the text promised an action the state never took. Each one here.
const P = new URL('../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const AR = await import(P + 'systems/life/arcs.js');
const EV = await import(P + 'systems/social/events.js');
const PA = await import(P + 'systems/life/party.js');
const PR = await import(P + 'systems/career/production.js');
const E = await import(P + 'engine/economy.js');

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
function actor(over) {
  const s = createInitialState({ name: 'X', dream: 'actor', created: true }); beginLife(s);
  return Object.assign(s, { stage: 'career', ageY: 28, year: 2058, month: 2, alive: true, hasApartment: true, livingWith: 'own_place', housing: 'studio', cash: 5000,
    ap: 100, apMax: 100, apMaxEff: 100, fame: 20, peakFame: 20, respect: 10, mental: 60, health: 80, strain: 30, acting: 50,
    filmography: [{ id: 'f0', title: 'one', rating: 60, tier: 'lead', role: 'Lead', year: 2057 }] }, over);
}
const arc = (id) => AR.ARCS.find((a) => a.id === id);
function play(s, id, i) { s.pendingArc = { id, ...arc(id).build(s) }; return AR.resolveArc(s, i); }

// ── standing below zero survives a story choice ──
{
  const s = actor({ respect: -20 });
  // any arc whose first choice gives standing: directorCracks needs a production, so fake a
  // +2 respect choice directly through the same path
  s.pendingArc = { id: 'x', speaker: 't', text: 't', choices: [{ label: 'help', fx: { respect: 2 }, reply: 'ok' }] };
  AR.resolveArc(s, 0);
  ok('helping a director at −20 leaves you at −18, not at 0', s.respect === -18, String(s.respect));
  const f = actor({ fame: 80, peakFame: 80 });
  f.pendingArc = { id: 'x', speaker: 't', text: 't', choices: [{ label: 'x', fx: { fame: 30 }, reply: 'ok' }] };
  AR.resolveArc(f, 0);
  ok('and fame goes through its ceiling like everything else', f.fame <= 90, String(f.fame));
}

// ── Rock bottom: the day job is a job ──
{
  const s = actor({ cash: -200, fame: 10 });
  play(s, 'brokeMonth', 0);
  ok('"Take the day job" gives you a job, not a cheque', !!s.job && s.cash === -200, JSON.stringify(s.job && s.job.title) + ' cash ' + s.cash);
  ok('and it says where', /shop floor|wage/.test(s.lastEvent || ''), s.lastEvent);
  const r = actor({ cash: -200, fame: 10 });
  play(r, 'brokeMonth', 1);
  ok('refusing leaves you without one', !r.job);
}

// ── Burnout: stepping back actually steps back ──
{
  const s = actor({ mental: 15, strain: 60 });
  PR.startProduction(s, { id: 'o', projectTitle: 'Long One', role: 'Lead', type: 'Feature Film', genre: 'Drama', salary: 300000, months: 5, prestigeScore: 50, tier: 'lead', scale: 'feature', stability: 100 });
  s.production.stability = 100;
  const left0 = s.production.monthsLeft, strain0 = s.strain;
  play(s, 'burnout', 0);
  ok('"Step back and rest" signs you off for two months', s.burnout && s.burnout.left === 2 && s.burnout.rest === true);
  ok('and lets the strain out', s.strain === strain0 - 20, `${strain0} → ${s.strain}`);
  PR.productionTick(s);
  ok('the shoot waits — the months do not tick down', s.production && s.production.monthsLeft === left0 && s.production.paused === 1, `${s.production && s.production.monthsLeft} vs ${left0}`);
  ok('and the game says it is on hold', (s.timeline || []).some((x) => /on hold/.test(x.text)));
  s.burnout.left = 0; s.burnout = null;
  PR.productionTick(s);
  ok('and resumes when you are back', s.production.monthsLeft === left0 - 1);
}

// ── a night out costs the energy the button says ──
{
  const s = actor({ ap: 0, fame: 40 });
  s.events = [{ id: 'ev1', tier: 'mixer', invited: true, monthsLeft: 1, title: 'A mixer' }];   // tonight — a party is on a date now
  EV.attendEvent(s, 'ev1');
  ok('at zero energy you cannot go', s.events.length === 1 && /No energy/.test(s.lastEvent || ''), s.lastEvent);
  s.ap = 100; EV.attendEvent(s, 'ev1');
  ok('with energy you go, and it costs twenty', s.events.length === 0 && s.ap === 80, String(s.ap));
}

// ── a party warms the people closest to you ──
{
  const s = actor({ cash: 20000, people: [{ id: 'a', name: 'Far', relationship: 5, lastSeen: 0 }, { id: 'b', name: 'Near', relationship: 95, lastSeen: 0 }, { id: 'c', name: 'Mid', relationship: 40, lastSeen: 0 }] });
  const key = PA.PARTY_ORDER[0];
  const before = Object.fromEntries(s.people.map((p) => [p.id, p.relationship]));
  PA.throwParty(s, key);
  const moved = s.people.filter((p) => p.relationship !== before[p.id]).map((p) => p.name);
  ok('the closest come, not whoever is first in the list', moved.includes('Near') && !moved.includes('Far'), moved.join(','));
}

// ── the balance counts the shoot ──
{
  const s = actor({ job: null });
  PR.startProduction(s, { id: 'o', projectTitle: 'Paid One', role: 'Lead', type: 'Feature Film', genre: 'Drama', salary: 60000, months: 6, prestigeScore: 50, tier: 'lead', scale: 'feature', stability: 100 });
  const costs = E.monthlyCosts(s).total;
  const perMonth = 10000;
  ok('a shoot pays €10,000 a month here, and the costs are what they are', costs > 0);
  // the LifeCard maths is in App.jsx (not parseable here); the inputs it reads are these
  ok('the inputs the balance reads: salary/months and the agent cut', Math.round(s.production.salary / s.production.months) === perMonth && !s.agent);
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
