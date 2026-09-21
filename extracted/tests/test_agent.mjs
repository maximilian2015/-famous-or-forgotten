// The agent, which five files read and nobody ever had. And the trades finding a word for
// the combination you are in — announced once, after it has held two months.
const P = new URL('../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const AG = await import(P + 'systems/career/agent.js');
const A = await import(P + 'systems/career/access.js');
const EM = await import(P + 'systems/meta/email.js');
const ST = await import(P + 'systems/meta/standing.js');
const PR = await import(P + 'systems/career/production.js');
const N = await import(P + 'systems/career/negotiate.js');
const S = await import(P + 'systems/meta/status.js');

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
function actor(over) {
  const s = createInitialState({ name: 'X', dream: 'actor', created: true }); beginLife(s);
  return Object.assign(s, { stage: 'career', ageY: 32, year: 2062, month: 3, alive: true, hasApartment: true, livingWith: 'own_place', housing: 'flat', cash: 50000,
    ap: 100, apMax: 100, apMaxEff: 100, fame: 0, peakFame: 0, respect: 0, scandal: 0, media: 0, acting: 60, charisma: 50, looks: 50, luck: 50,
    filmography: [{ title: 'one', rating: 60, tier: 'lead', role: 'Lead', year: 2060, score: 6 }] }, over);
}
const letter = (s) => (s.inbox || []).find((m) => m.tag === 'agent');

// ── who gets asked ──
{
  ok('nobody at fame 30 / standing 20', AG.tierFor(actor({ fame: 30, respect: 20 })) === null);
  ok('a small agency at fame 40', AG.tierFor(actor({ fame: 40, respect: 20 })) === 'novice');
  ok('and at standing 50 for the actor’s actor, fame be damned', AG.tierFor(actor({ fame: 20, respect: 50 })) === 'novice');
  ok('not at standing 50 with fame 40–54 (working actor: it is fame that gets you asked)', AG.tierFor(actor({ fame: 45, respect: 50 })) === 'novice');
  ok('a proper agency at 55, the big one at 75', AG.tierFor(actor({ fame: 55 })) === 'solid' && AG.tierFor(actor({ fame: 75 })) === 'strong');
  ok('the top desk at 90, or at 80 with a hit', AG.tierFor(actor({ fame: 90 })) === 'legend' && AG.tierFor(actor({ fame: 82, filmography: [{ title: 'h', rating: 88, tier: 'lead' }] })) === 'legend' && AG.tierFor(actor({ fame: 82 })) === 'strong');
  ok('the liability is not asked', !AG.agentWantsYou(actor({ fame: 70, respect: -20 })));
}

// ── the letter, and signing ──
{
  const s = actor({ fame: 42, respect: 10 });
  EM.emailTick(s);
  const m = letter(s);
  ok('at fame 42 a letter arrives', !!m, JSON.stringify((s.inbox || []).map((x) => x.tag)));
  ok('it names the agent and the cut', m && /represent/.test(m.subj) && /10%/.test(m.body), m && m.body);
  EM.emailAct(s, m.id, 0);
  ok('Sign gives you an agent', AG.hasAgent(s) && s.agent.tier === 'novice' && s.agent.name === m.agentOffer.name);
  ok('and the game says so', (s.timeline || []).some((x) => /is your agent now/.test(x.text)));
  ok('and only one letter, ever, while you have one', (EM.emailTick(Object.assign(s, { _emTick: null })), !letter(s)));
  // not now
  const d = actor({ fame: 42, respect: 10 });
  EM.emailTick(d); EM.emailAct(d, letter(d).id, 1);
  ok('Not now: no agent, and quiet for six months', !AG.hasAgent(d) && !AG.agentWantsYou(d));
  d.month += 7; d._emTick = null; EM.emailTick(d);
  ok('then somebody asks again', !!letter(d));
}

// ── what the agent does ──
{
  const s = actor({ fame: 45, respect: 10 }); AG.signAgent(s, { name: 'Lena Voss', tier: 'novice' });
  ok('agentReach is finally true for somebody', A.computeAccess(s).agentReach === true);
  ok('the table reaches further', N.reachOf(s) > N.reachOf(actor({ fame: 45 })));
  const before = s.cash;
  AG.paid(s, 100000, 'a job');
  // The taxman takes his after the agent (agent.js taxOn): a third of what is over thirty thousand.
  const net = (gross) => { const afterAgent = Math.round(gross * 0.9); return afterAgent - AG.taxOn(afterAgent); };
  ok('and they take ten percent of a fee, and the taxman his', s.cash - before === net(100000), String(s.cash - before));
  ok('the timeline says after whose cut', /after Lena Voss's 10%/.test(s.timeline[0].text), s.timeline[0].text);
  const w = actor({ fame: 45 }); const b0 = w.cash; AG.paid(w, 100000, 'a job');
  ok('no agent, no cut — only the tax', w.cash - b0 === 100000 - AG.taxOn(100000));
  // a shoot pays net
  const p = actor({ fame: 45, respect: 10 }); AG.signAgent(p, { name: 'Lena Voss', tier: 'novice' });
  PR.startProduction(p, { id: 'o', projectTitle: 'T', role: 'Lead', type: 'Feature Film', genre: 'Drama', salary: 600000, months: 6, prestigeScore: 50, tier: 'lead', scale: 'feature', stability: 100 });
  const c0 = p.cash; PR.productionTick(p);
  ok('a month on set pays net of the cut and the tax', p.cash - c0 === net(100000), String(p.cash - c0));
}

// ── moving up, and leaving ──
{
  const s = actor({ fame: 45, respect: 10 }); AG.signAgent(s, { name: 'Lena Voss', tier: 'novice' });
  s.fame = 60; AG.agentTick(s);
  ok('at 60 they move you up a desk', s.agent.tier === 'solid' && /moved you up/.test(s.timeline[0].text), s.timeline[0].text);
  s.fame = 50; AG.agentTick(s);
  ok('and never down', s.agent.tier === 'solid');
  S.setRespect(s, -20); s.fame = 60; AG.agentTick(s);
  ok('the liability loses the agent', !AG.hasAgent(s) && /stopped returning your calls/.test(s.timeline[0].text), s.timeline[0].text);
  ok('and is not asked again while on the rung', !AG.agentWantsYou(s));
  S.setRespect(s, -10); s.month += 5;
  ok('off the rung, somebody asks again', AG.agentWantsYou(s));
}

// ── the trades find a word for it ──
{
  const s = actor({ fame: 50, respect: 20 });
  ST.standingTick(s);
  ok('the first tick only records where you are', s._combo === 'beginning' && !(s.timeline || []).some((x) => /trades have a word/.test(x.text)));
  s.fame = 60; ST.standingTick(s);
  ok('one month over the line: nothing yet', s._combo === 'beginning' && !s.lastEvent);
  ST.standingTick(s);
  ok('two months: the face, announced once', s._combo === 'face' && /a face/.test(s.lastEvent || '') && (s.timeline || []).filter((x) => /The face\./.test(x.text)).length === 1, s.lastEvent);
  s.lastEvent = null; ST.standingTick(s); ST.standingTick(s);
  ok('and not again while it holds', !s.lastEvent);
  // a flicker across the border is not announced
  s.fame = 54; ST.standingTick(s); s.fame = 60; ST.standingTick(s); s.fame = 54; ST.standingTick(s);
  ok('a name sitting on the line is left alone', s._combo === 'face' && !s.lastEvent);
  // out of a bad one into beginning IS said
  s.fame = 50; ST.standingTick(s); ST.standingTick(s);
  ok('leaving the face for beginning is said', s._combo === 'beginning' && /word on you has faded/.test(s.lastEvent || ''), s.lastEvent);
  // beginning → working is said; beginning from nothing is not
  const w = actor({ fame: 20, respect: 10 }); ST.standingTick(w); w.fame = 40; w.respect = 35; ST.standingTick(w); ST.standingTick(w);
  ok('becoming the working actor is said', /working actor/.test(w.lastEvent || ''), w.lastEvent);
  // and it runs inside advanceMonth
  const m = actor({ fame: 60, respect: 70, _combo: 'star' }); let t = m; for (let i = 0; i < 3; i++) t = advanceMonth(t);
  ok('and it runs from the monthly tick', t._combo === 'real' && (t.timeline || []).some((x) => /The real thing\./.test(x.text)));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
