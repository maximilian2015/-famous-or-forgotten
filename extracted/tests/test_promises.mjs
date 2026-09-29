// What the button says, the game does.
//
// An outside audit read all 157 `dispatch(...)` calls in the JSX against the system function
// behind each one and found twenty-eight places where the two disagreed. Most were a button
// that was bright when the system would refuse — annoying, and harmless. These are the ones
// that were not harmless: where the screen told the player a price and the game charged a
// different one, where a rule lived in the UI and nowhere else, or where a letter took money
// for something it then did not do.
//
// The UI half of that audit cannot be tested here — the suite never parses .jsx, which is
// how the drift happened in the first place. What can be pinned is the system half, so that
// the number on the label and the number in the code cannot part company again.
import { COST as ENERGY_COST } from '../src/engine/energy.js';
import { ensureWorld } from '../src/systems/world/world.js';
import { seeSomebody } from '../src/systems/life/strain.js';
import { hostNight } from '../src/systems/social/night.js';
import { draftContract, markClause, signContract, openTalks } from '../src/systems/career/contract.js';
import { emailAct } from '../src/systems/meta/email.js';
import { rename } from '../src/systems/career/naming.js';

let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.log('  FAIL: ' + msg); fails++; } };

const st = (more = {}) => {
  const s = { version: 'x', name: 'M', gender: 'female', ageY: 34, stage: 'career', dream: 'actor',
    fame: 60, respect: 45, acting: 70, charisma: 60, looks: 65, luck: 50, scandal: 0, media: 0,
    mental: 60, health: 92, strain: 20, year: 2070, month: 3, timeline: [], filmography: [],
    productions: [], offers: [], releases: [], inbox: [], peakFame: 60, hasApartment: true,
    housing: 'flat', ap: 100, apMax: 100, apMaxEff: 100, cash: 100000, genreXP: {}, people: [],
    family: [], quote: 2e6, awards: { wins: [], nominations: [] }, alive: true, cooldowns: {},
    meds: {}, look: {}, ...more };
  ensureWorld(s); return s;
};

// ── An hour with somebody costs what the button says ──────────────────────────
// The screen has read "10 energy · €260" since it was written. The function spent five,
// because it reached for the gym's number.
{
  const s = st({ depression: { sessionThisMonth: false }, cash: 5000, ap: 100 });
  seeSomebody(s);
  ok(100 - s.ap === ENERGY_COST.therapy, `therapy costs what the button says: took ${100 - s.ap}, says ${ENERGY_COST.therapy}`);

  const broke = st({ depression: { sessionThisMonth: false }, cash: 5000, ap: ENERGY_COST.therapy - 1 });
  const before = broke.cash;
  seeSomebody(broke);
  ok(broke.cash === before, 'and one short of it is a refusal, not a discount');
}

// ── A night at home was the only night out in the game that was free ──────────
{
  const s = st({ fame: 60, housing: 'flat', cash: 50000, ap: 100 });
  hostNight(s);
  ok(s.night, 'you can still host a night');
  ok(s.ap < 100, `and it costs energy now: ${100 - s.ap}`);
  ok(s.cash < 50000, 'and money, as it always did');

  const tired = st({ fame: 60, housing: 'flat', cash: 50000, ap: 0 });
  hostNight(tired);
  ok(!tired.night && tired.cash === 50000, 'and with nothing left in the month it does not happen at all');
}

// ── A paper with a clause still open is not a paper you can sign ──────────────
// ContractRoom has disabled the button on this since it was written. signContract never
// checked, so the rule existed in exactly one place and anything else walked past it.
{
  const s = st();
  const offer = { id: 'o1', tier: 'lead', kind: 'sequel', projectTitle: 'The Picture II',
    role: 'Lead', type: 'Feature Film', genre: 'Drama', months: 2, salary: 10000,
    scale: 'feature', deadline: 3 };
  s.offers = [offer];
  draftContract(s, offer);
  const fee = offer.contract.clauses.find((c) => c.id === 'fee');
  ok(!!(fee && fee.options && fee.options.length), 'there is something to argue about on the fee');
  if (fee && fee.options && fee.options.length) {
    markClause(s, 'o1', 'fee', fee.options[0].id);
    ok(openTalks(offer).length === 1, 'and arguing it leaves the clause open');
    signContract(s, 'o1');
    const gone = !(s.offers || []).some((x) => x.id === 'o1');
    ok(!gone && !offer.signed, 'a paper with an open clause cannot be signed: ' + (s.lastEvent || ''));
    ok(/argued|settle/i.test(s.lastEvent || ''), 'and it says why: ' + (s.lastEvent || ''));
  }
}

// ── The option paper is about a picture, not about a name ─────────────────────
// It found the production by title. Rename the picture between the letter arriving and
// signing it and the money cleared, the letter vanished, and the option was never taken —
// which is the only thing the letter was for.
{
  const set = { id: 'set1', title: 'Test Film', role: 'Lead', type: 'Feature Film', scale: 'feature',
    tier: 'lead', salary: 10000, months: 4, monthsLeft: 2, meter: 40, crew: [] };
  const s = st({ production: set });
  s.productions = [set];
  s.inbox = [{ id: 'eopt', tag: 'option', kind: 'contract', title: 'Test Film', setId: 'set1',
    cta: [{ label: 'Sign', option: 'sign', pay: 1500, reply: 'Signed.' }] }];
  rename(s, 'set', 'set1', 'The Final Cut');
  ok(set.title === 'The Final Cut', 'the picture is renamed');
  const before = s.cash;
  emailAct(s, 'eopt', 0);
  ok(set.optioned === true, 'and the option paper still finds it and takes: optioned=' + set.optioned);
  ok(s.cash === before + 1500, 'and pays the bonus: ' + (s.cash - before));
}
{
  // And when the picture really is gone, it does not pay for nothing.
  const s = st({ productions: [], production: null });
  s.inbox = [{ id: 'eopt', tag: 'option', kind: 'contract', title: 'A Film That Wrapped', setId: 'setX',
    cta: [{ label: 'Sign', option: 'sign', pay: 1500, reply: 'Signed.' }] }];
  const before = s.cash;
  emailAct(s, 'eopt', 0);
  ok(s.cash === before, 'a paper about a picture that is gone pays nothing: ' + (s.cash - before));
  ok((s.inbox || []).length === 1, 'and the letter is still there rather than quietly deleted');
}

if (fails) { console.log('test_promises: ' + fails + ' failed'); process.exit(1); }
console.log('test_promises: all passed');
