// The person who notices, the promise, and what a clinic does to a contract.
const P = new URL('../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const K = await import(P + 'systems/life/drink.js');
const D = await import(P + 'systems/life/depression.js');
const { startProduction } = await import(P + 'systems/career/production.js');
const { insurability } = await import(P + 'systems/life/strain.js');

// The newest moment: on screen, or last in the queue behind one still up. Moments queue now.
const lastMoment = (s) => ((s.moments || []).length ? s.moments[s.moments.length - 1] : s.bigMoment);

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

function life(over = {}) {
  const s = createInitialState({ name: 'Test', dream: 'actor' });
  Object.assign(s, { stage: 'career', ageY: 38, year: 2060, month: 0, cash: 4000000, acting: 88,
    fame: 70, respect: 65, mental: 50, health: 78, apMax: 100, hasApartment: true, housing: 'flat',
    burnouts: 1, strain: 30, alive: true, bottles: { cheap: 9999 }, meds: {}, depression: null });
  s.people = []; s.family = [];
  s.partner = { id: 'pp', name: 'Ada Rune', gender: 'f', age: 37, job: 'architect', relationship: 78, married: false, health: 85 };
  Object.assign(s, over);
  return s;
}
// Drink until somebody says something.
function untilAsked(s, cap = 30) {
  for (let m = 0; m < cap; m++) {
    K.drinkThrough(s); s = advanceMonth(s);
    if (s.drink && s.drink.pending) return s;
  }
  return s;
}

// ── somebody notices, once, at the line ───────────────────────────────────────
{
  let s = untilAsked(life());
  ok('the person closest to you says something', !!(s.drink && s.drink.pending), 'never asked');
  ok('and only once you actually need it', K.level(s) >= K.ULTIMATUM_AT, String(K.level(s)));
  ok('and it is a named person, not the game', /Ada Rune/.test(s.drink.pending.title), s.drink.pending.title);
  // and never again
  K.answerUltimatum(s, 'refuse');
  let asked = 0;
  for (let m = 0; m < 24; m++) { K.drinkThrough(s); s = advanceMonth(s); if (s.drink?.pending) { asked++; s.drink.pending = null; } }
  ok('and it is never raised a second time', asked === 0, `${asked} more times`);
}

// ── if there is nobody, nobody says it ────────────────────────────────────────
{
  let s = untilAsked(life({ partner: null, people: [], family: [] }));
  ok('with nobody close, nobody sits you down', !(s.drink && s.drink.pending));
  ok('but the drinking still got there', K.level(s) >= K.ULTIMATUM_AT, String(K.level(s)));
  ok('and the work is what dries up instead', insurability(s) < insurability(life()) * 0.8,
    `${insurability(s).toFixed(2)} vs ${insurability(life()).toFixed(2)}`);
  const worse = life({ partner: null, drink: { level: 85, months: 40, worstLevel: 85 } });
  ok('and it gets much worse once everyone can see it', insurability(worse) <= 0.5, insurability(worse).toFixed(2));
}

// ── a distant acquaintance is not "somebody close" ────────────────────────────
{
  const s = life({ partner: null });
  s.people = [{ id: 'a', name: 'Someone', relationship: 40, alive: true }];
  ok('forty out of a hundred is not somebody close', K.closestPerson(s) === null);
  s.people[0].relationship = 60;
  ok('sixty is', (K.closestPerson(s) || {}).name === 'Someone');
  // But somebody in the house notices whatever the number says.
  const cold = life();
  cold.partner.relationship = 22;
  ok('and the person you live with always notices', (K.closestPerson(cold) || {}).name === 'Ada Rune');
}

// ── the promise, kept and broken ──────────────────────────────────────────────
{
  let s = untilAsked(life());
  K.answerUltimatum(s, 'promise');
  ok('a promise sets a date', !!s.drink.promised, String(s.drink.promised));
  // break it next month
  K.drinkThrough(s); s = advanceMonth(s);
  ok('breaking it costs you the person', !s.partner, s.partner ? s.partner.name : 'gone');
  // Among the month's moments, not the last of them: the same month can hold the September
  // lists or anything else the world does, and which one is drawn last is not the claim.
  const monthMoments = [s.bigMoment, ...(s.moments || [])].filter(Boolean);
  ok('and the game stops to say so', monthMoments.some((m) => m.id === 'theyleft'), monthMoments.map((m) => m.id).join(', '));
}
{
  let s = untilAsked(life());
  K.answerUltimatum(s, 'promise');
  // A bond you never spend an evening on drifts −3 a month, so the whole six months trend
  // DOWN and the credit lands on one of them. Find the month it comes good.
  let jumped = false, said = false;
  const headBefore = s.mental;
  for (let m = 0; m < K.GRACE_MONTHS + 2 && s.partner; m++) {
    const before = s.partner.relationship;
    s = advanceMonth(s);
    if (s.partner && s.partner.relationship > before) jumped = true;
    // The screen line can be overwritten by anything else that lands the same month (a
    // brand calling, an offer); the timeline is where a month's news actually keeps.
    if (/stopped checking the recycling/.test(s.lastEvent || '')) said = true;
    if ((s.timeline || []).some((x) => /Six months dry/.test(x.text))) said = true;
  }
  ok('keeping it keeps them', !!s.partner, 'they left anyway');
  ok('and one month of it goes the other way', jumped, 'the bond only ever fell');
  ok('and the game says so out loud', said, s.lastEvent);
  // Keeping the promise keeps the person. It does not make you well — the level barely
  // moves and the flag does not lift, because dropping under 45 for a month was never what
  // "getting clean" means. The clinic is still the only door.
  ok('but keeping it does not make you well', K.hooked(s), 'the hold lifted by itself');
  ok('and every dry month costs you your head', (s.mental || 0) < headBefore - 30,
    `${headBefore.toFixed(0)} → ${(s.mental || 0).toFixed(0)}`);
}

// ── saying yes goes to the clinic in one action ───────────────────────────────
{
  let s = untilAsked(life({ cash: 6000000 }));
  const cost = D.rehabCost(s); const purse = s.cash;
  D.takeTheUltimatum(s);
  ok('saying yes actually gets you there', D.inRehab(s), JSON.stringify(s.rehab));
  ok('and it is paid for', s.cash === purse - cost, '€' + s.cash.toLocaleString());
  ok('and they are not going anywhere', !!s.partner, String(s.partner?.relationship));
  const stay = s.rehab.months;
  for (let m = 0; m < stay + 1; m++) s = advanceMonth(s);
  ok('and it works', !s.drink && !D.inRehab(s));
}

// ── a clinic does not wait for your film ──────────────────────────────────────
{
  const s = life({ cash: 6000000, drink: { level: 80, months: 30, worstLevel: 80 } });
  startProduction(s, { id: 'x', projectTitle: 'The Long One', role: 'Lead', type: 'Feature Film',
    genre: 'Drama', salary: 6000000, months: 8, tier: 'lead', scale: 'feature', prestigeScore: 70, stability: 95 });
  s.production.paid = 1000000;
  const respectBefore = s.respect;
  D.enterRehab(s);
  ok('checking in walks you off the picture', !s.production);
  ok('and the industry remembers it', s.respect < respectBefore, `${respectBefore} → ${s.respect}`);
  ok('and it is named in the timeline', /recast/.test(s.timeline.map((t) => t.text || t).join(' ')));
  ok('and you never see the rest of the money', s.rehab.walked.owed === 5000000, String(s.rehab.walked.owed));
}
{
  // a season of television is written out rather than recast
  const s = life({ cash: 6000000, drink: { level: 80, months: 30, worstLevel: 80 } });
  startProduction(s, { id: 'y', projectTitle: 'Lost Signal', role: 'Lead', type: 'TV Series', genre: 'Drama',
    salary: 2400000, months: 8, tier: 'lead', scale: 'recurring', episodes: 10, episodeFee: 240000,
    prestigeScore: 60, stability: 90 });
  D.enterRehab(s);
  ok('a season is written out, not recast', !s.production && s.rehab.walked.series);
  ok('and the timeline says which', /wrote the character out/.test(s.timeline.map((t) => t.text || t).join(' ')));
}
{
  // nothing running, nothing broken
  const s = life({ cash: 6000000, drink: { level: 80, months: 30, worstLevel: 80 } });
  D.enterRehab(s);
  ok('and going between projects costs you nothing extra', s.rehab.walked === null);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
