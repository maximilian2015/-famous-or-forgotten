import { has, monthsIn, slotsLost, onMeds, standingOf, depressionTick, answerCheckpoint,
  TALK, TRIALS, scoreWeek, scoreHold, CHECKPOINTS, EVERY_MONTHS, MIN_MONTHS, inRehab, enterRehab, rehabTick, rehabCost,
  creditTherapy, therapyProgress, THERAPY_FOR_A_SLOT }
  from '../src/systems/life/depression.js';
import { seeSomebody, canWork } from '../src/systems/life/strain.js';
import { usePills } from '../src/systems/life/health.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const base = () => ({ since: 0, sessions: 0, checks: 0, passed: 0, windowMonths: 0, windowSessions: 0,
  windowRests: 0, medMonths: 0, medsThisMonth: false, pending: null });
const st = (over) => ({ version: 'x', ageY: 40, gender: 'male', stage: 'career', dream: 'actor',
  hasApartment: true, housing: 'flat', cash: 300000, mental: 55, health: 70, acting: 85, singing: 0,
  charisma: 60, looks: 58, luck: 50, scandal: 0, fame: 55, respect: 55, ap: 100, apMax: 100, quote: 0,
  year: 0, month: 0, strain: 40, burnout: null, burnouts: 4, scarred: 0, scarTherapy: 0, rehab: null,
  meds: {}, family: [], people: [], filmography: [], releases: [], frozen: [], offers: [], timeline: [],
  genreXP: {}, castingPool: [], alive: true, depression: base(), ...over });

function step(s, n = 1, opts = {}) {
  for (let i = 0; i < n; i++) {
    s.month++; if (s.month > 11) { s.month = 0; s.year++; }
    if (opts.meds) { s.meds.antidep = 1; usePills(s, 'antidep'); }
    if (opts.rest) s._rested = true;
    if (opts.therapy && s.depression && !s.depression.sessionThisMonth) { s.ap = 100; seeSomebody(s); }
    depressionTick(s);
    if (s.depression) s.depression.sessionThisMonth = false;
    s._rested = false;
  }
  return s;
}

// ── it takes your hours, which is the whole point ─────────────────────────────
ok('it starts by taking two Energy of every month', slotsLost(st()) === 2, String(slotsLost(st())));
ok('each checkpoint you pass gives one back', slotsLost(st({ depression: { ...base(), passed: 1 } })) === 1);
// Winning gives ONE back, never both: passing two of three used to leave you at full
// strength and then the illness lifted and took one away again — the month it stopped
// was the month you got worse. Only the far side of it gives the second one back.
ok('but never both while you are still in it', slotsLost(st({ depression: { ...base(), passed: 2 } })) === 1,
  String(slotsLost(st({ depression: { ...base(), passed: 2 } }))));

// ── the pills come first ──────────────────────────────────────────────────────
const pills = st();
step(pills, 1, { meds: true });
ok('one month of them is not being on them', !onMeds(pills), String(pills.depression.medMonths));
step(pills, 1, { meds: true });
ok('two months is', onMeds(pills), String(pills.depression.medMonths));
const stopped = st();
step(stopped, 3, { meds: true });
step(stopped, 1);
ok('and stopping resets it', !onMeds(stopped), String(stopped.depression.medMonths));

// ── nothing is asked of you for eight months ──────────────────────────────────
const early = st();
step(early, MIN_MONTHS - 1, { meds: true });
ok('no checkpoint inside the first eight months', !early.depression.pending, monthsIn(early) + ' months in');
const due = st();
step(due, MIN_MONTHS + EVERY_MONTHS, { meds: true });
ok('then one comes to a head', !!due.depression.pending, monthsIn(due) + ' months in');
ok('and it is one of the three trials', TRIALS.includes(due.depression.pending.kind), due.depression.pending.kind);

// ── it resolves on the five months, not the click ─────────────────────────────
function attempt(opts, choice) {
  let passed = 0, ran = 0;
  for (let i = 0; i < 400; i++) {
    const s = st();
    step(s, MIN_MONTHS + EVERY_MONTHS, opts);
    if (!s.depression || !s.depression.pending) continue;
    ran++;
    answerCheckpoint(s, choice === 'best' ? best(s) : worst(s));
    if (s.depression && (s.depression.passed || 0) > 0) passed++;
  }
  return ran ? (passed / ran) * 100 : 0;
}
const doingNothing = attempt({}, 'best');
const onlyPills = attempt({ meds: true }, 'best');
const everything = attempt({ meds: true, rest: true, therapy: true }, 'best');
const gaveUp = attempt({ meds: true, rest: true, therapy: true }, 'worst');
ok('doing nothing about it almost never passes', doingNothing < 25, doingNothing.toFixed(0) + '%');
ok('the pills alone are not enough', onlyPills < 75 && onlyPills > doingNothing, onlyPills.toFixed(0) + '%');
ok('doing everything usually passes', everything > 65, everything.toFixed(0) + '%');
ok('and the choice still matters', gaveUp < everything - 10,
  `${everything.toFixed(0)}% reaching out vs ${gaveUp.toFixed(0)}% not`);
console.log(`      passing one — nothing ${doingNothing.toFixed(0)}%, pills only ${onlyPills.toFixed(0)}%, everything ${everything.toFixed(0)}%, everything but giving up ${gaveUp.toFixed(0)}%`);

// ── three of them, and then it is over one way or the other ───────────────────
// Each scene has its own three choices; picking the best or worst means picking the right
// id for whichever scene is on screen.
const BEST = { talk: null, week: null, hold: null };
const WORST = { talk: null, week: null, hold: null };

// The trial that comes up is random, so the answer has to be chosen for whichever it is.
function best(s) {
  const p = s.depression.pending;
  if (p.kind === 'week') return ['sleep', 'out', 'people', null, 'sleep', 'out', 'people'];
  if (p.kind === 'hold') return p.hold.missing;
  return TALK[p.variant].choices[p.variant === 'held' ? 1 : 0].id;
}
function worst(s) {
  const p = s.depression.pending;
  if (p.kind === 'week') return [null, null, null, null, null, null, null];
  if (p.kind === 'hold') return p.hold.order.find((n) => n !== p.hold.missing);
  return TALK[p.variant].choices[2].id;
}
function wholeThing(opts, table) {
  const s = st();
  for (let guard = 0; guard < 80 && s.depression; guard++) {
    step(s, 1, opts);
    if (s.depression && s.depression.pending) answerCheckpoint(s, table === BEST ? best(s) : worst(s));
  }
  return s;
}
const bestRun = wholeThing({ meds: true, rest: true, therapy: true }, BEST);
ok('it does end', !has(bestRun));
const worstRun = wholeThing({}, WORST);
ok('doing nothing gets you out too — eventually', !has(worstRun));
ok('but it keeps two hours of every month, for good', worstRun.scarred === 2, String(worstRun.scarred));
ok('and the game says what it took', /two hours of every|kept two|kept sixty/.test((worstRun.bigMoment || {}).body || ''),
  ((worstRun.bigMoment || {}).body || '').slice(-80));

const scars = { 0: 0, 1: 0, 2: 0 };
for (let i = 0; i < 200; i++) scars[wholeThing({ meds: true, rest: true, therapy: true }, BEST).scarred || 0]++;
console.log(`      doing everything, 200 runs — clean ${scars[0]}, one hour lost ${scars[1]}, two ${scars[2]}`);
ok('doing everything usually leaves no scar', scars[0] > 90, `${scars[0]}/200 clean`);
const lazy = { 0: 0, 1: 0, 2: 0 };
for (let i = 0; i < 200; i++) lazy[wholeThing({}, WORST).scarred || 0]++;
console.log(`      doing nothing, 200 runs   — clean ${lazy[0]}, one hour lost ${lazy[1]}, two ${lazy[2]}`);
ok('and doing nothing almost always leaves the worst one', lazy[2] > 150, `${lazy[2]}/200 lost both`);

// ── the two ways back ─────────────────────────────────────────────────────────
const scarred = st({ depression: null, scarred: 2, cash: 200000 });
ok('a scar takes hours even with no illness left', slotsLost(scarred) === 2);
enterRehab(scarred);
ok('a clinic costs a fortune', scarred.cash === 200000 - rehabCost(scarred), 'left €' + scarred.cash.toLocaleString());
ok('and you are in there a year', inRehab(scarred) && scarred.rehab.left === 12);
ok('nobody hires you while you are in it', !canWork(scarred).ok, canWork(scarred).why);
for (let i = 0; i < 12; i++) rehabTick(scarred);
ok('and you come out whole', !inRehab(scarred) && scarred.scarred === 0);
ok('it stops the game to say so', (scarred.bigMoment || {}).id === 'rehab');
const poor = st({ depression: null, scarred: 2, cash: 500 });
enterRehab(poor);
ok('and you cannot go if you cannot pay', !inRehab(poor) && /cannot cover/.test(poor.lastEvent), poor.lastEvent);

const slow = st({ depression: null, scarred: 2, cash: 999999 });
for (let i = 0; i < THERAPY_FOR_A_SLOT - 1; i++) creditTherapy(slow);
ok('therapy is a very long road', slow.scarred === 2, `${therapyProgress(slow)}/${THERAPY_FOR_A_SLOT}`);
creditTherapy(slow);
ok('but it does give an hour back', slow.scarred === 1);
for (let i = 0; i < THERAPY_FOR_A_SLOT; i++) creditTherapy(slow);
ok('and eventually all of them', slow.scarred === 0);
console.log(`      therapy — ${THERAPY_FOR_A_SLOT} sessions an hour, ${THERAPY_FOR_A_SLOT * 2} for both`);

const clean = st({ depression: null, scarred: 0 });
creditTherapy(clean);
ok('there is nothing to work off if it left nothing', therapyProgress(clean) === 0);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
