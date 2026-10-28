import { COST as ENERGY_COST, canAfford, spend, tooTired } from '../../engine/energy.js';
import { inCareer } from '../../engine/stage.js';
// Nothing stopped you shooting one film straight into the next for sixty years. Measured
// over two hundred careers the average actor finished with two hundred and sixteen
// credits; a real one manages thirty to sixty. There was no cost to never stopping, so
// never stopping was simply correct — which is a bad thing for a game to teach and a
// worse thing for it to be silent about.
//
// So the work accumulates in you. Strain is not a difficulty knob: a normal career of one
// project a year never comes near it. It exists to make the grind end somewhere.
import { rint, chance } from '../../engine/rng.js';
import { addTimeline, showMoment } from '../../engine/timeline.js';
import { loadTick, forcedStopOdds, forcedStop, lightWork, recoveryDrag, breakTick, medicalDrag, recentStops, active } from './burnout.js';
import { depressionTick, creditTherapy, therapyProgress, THERAPY_FOR_A_SLOT, inRehab } from './depression.js';
import { level as drinkLevel } from './drink.js';
import { healing } from './face.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

// What a month on set takes out of you, by how big the thing is — and by how much you
// had left when you walked on. A month is cheap when you are rested and brutal when you
// are not, which is why one film a year is sustainable forever and four back to back is
// not. A flat cost made the whole thing linear, and linear meant survivable: two hundred
// careers averaged twenty-four collapses each and still finished with a hundred and
// fifty-four credits.
const COST = { blockbuster: 8, prestige: 7, feature: 6.5, recurring: 6, indie: 5.5, episode: 4.5, small: 4, oneoff: 2.5 };
export function monthlyStrain(p, current = 0) {
  return (COST[p?.scale] || 6) * (0.55 + (current || 0) / 68);
}

// What a month off gives back. Doing nothing is not the same as resting properly.
export const REST_GAIN = 5.5;
export const IDLE_GAIN = 3.5;

export const BANDS = [
  { min: 82, id: 'burning', label: 'Running on empty', note: 'You are one bad week from stopping whether you choose to or not.' },
  { min: 60, id: 'tired', label: 'Tired', note: 'The days feel longer than they are. A month off would fix it.' },
  { min: 34, id: 'working', label: 'Working hard', note: 'Busy, and it shows a little.' },
  { min: 0, id: 'rested', label: 'Rested', note: 'You have got your energy back.' },
];
export function strainBand(v) {
  for (const b of BANDS) if ((v || 0) >= b.min) return b;
  return BANDS[BANDS.length - 1];
}

// What walking off a set repeatedly does to you in the eyes of the people who have to
// insure you. Nothing happened after the fourth collapse before — each one was simply
// the same event again, which meant a player could grind forever and just absorb them.
// A production will take a chance on someone who broke down once. Nobody is bonding the
// actor who has done it four times.
export function insurability(s) {
  // Read off RECENT medical stops and it comes back (life/burnout.js medicalDrag): illness is
  // not a breach (burnout-audit §6). It was a permanent count of collapses, ×0.86 each for life.
  let v = medicalDrag(s);
  // The colder wall. If there is nobody close enough to sit you down, nothing personal ever
  // stops you — so what stops you is the phone going quiet. A completion bond on somebody
  // the crew has started talking about is not something a studio wants to buy.
  const lv = drinkLevel(s);
  if (lv >= 78) v *= 0.5;
  else if (lv >= 45) v *= 0.72;
  return v;
}
// A medical stop in the last three years, which the bond companies still have on file. Not
// "unreliable": the old line counted collapses as "shoots stopped because of you".
export function unreliable(s) { return recentStops(s) > 0 && medicalDrag(s) < 0.95; }

// ── depression ─── the state itself lives in systems/life/depression.js ──
// It is not burnout (audit §12). It used to start on the fourth collapse, by count. Now a long
// exhaustion can sometimes meet it, when the head is already at the bottom (burnout.js
// forcedStop) — and it is long, it is slow, and it does not go away because a counter ran out.
export function depressed(s) { return !!s.depression; }

// One hour a month, every month, for as long as it lasts. Therapy is the same act whether
// you are in it or working the scar off years later, so it lives in one place.
export function seeSomebody(s) {
  const inIt = !!s.depression, scarred = (s.scarred || 0) > 0;
  if (!inIt && !scarred) { s.lastEvent = 'There is nothing to talk about right now.'; return s; }
  // The button has said "10 energy" since it was written and this took five, which is the
  // same mistake a night at home had. The label is the design. Outside audit.
  if (!canAfford(s, ENERGY_COST.therapy)) { s.lastEvent = tooTired(s, ENERGY_COST.therapy); return s; }
  if (inIt && s.depression.sessionThisMonth) { s.lastEvent = 'You have already been this month.'; return s; }
  if (!inIt && s._therapyThisMonth) { s.lastEvent = 'You have already been this month.'; return s; }
  const cost = 260;
  if ((s.cash || 0) < cost) { s.lastEvent = `An hour costs €${cost}. You do not have it this month.`; return s; }
  s.cash -= cost; spend(s, ENERGY_COST.therapy);
  s.mental = clamp((s.mental || 0) + rint(3, 7));
  if (inIt) {
    s.depression.sessionThisMonth = true;
    s.depression.windowSessions = (s.depression.windowSessions || 0) + 1;
    s.depression.sessions = (s.depression.sessions || 0) + 1;
    s.lastEvent = s.depression.sessions === 1
      ? 'You went and talked to somebody. It was awkward and it did not fix anything, and you booked another one.'
      : 'Another hour. It is slow, and it is the only thing that has been moving at all.';
  } else {
    s._therapyThisMonth = true;
    creditTherapy(s);
    if (!/finally gave/.test(s.lastEvent || '')) {
      s.lastEvent = `Another hour. ${therapyProgress(s)} of ${THERAPY_FOR_A_SLOT} before it gives you anything back.`;
    }
  }
  return s;
}

// Whether you are able to take on anything at all.
export function burnedOut(s) { return !!(s.burnout && s.burnout.left > 0); }
export function canWork(s) {
  if (inRehab(s)) {
    return { ok: false, why: `You are in a clinic. ${s.rehab.left} more month${s.rehab.left === 1 ? '' : 's'}, and nobody there is going to let you take a job.` };
  }
  if (s.onBreak) {
    return { ok: false, why: `You are away until the break ends. A shoot can be signed to start when you are back.` };
  }
  if (burnedOut(s)) {
    return { ok: false, why: `You are signed off. ${s.burnout.left} more month${s.burnout.left === 1 ? '' : 's'} before anyone will insure you on a set.` };
  }
  if (healing(s)) return { ok: false, why: `You are healing. ${s.face.recovery} more month${s.face.recovery === 1 ? '' : 's'} before anyone films that face.` };
  return { ok: true, why: '' };
}

// Runs every month.
// How far down you are, in words. Mental is read by five different systems — it slows
// recovery from illness, it adds to the yearly decline, it makes every shoot cost more
// strain, and below 22 it gets you fired — and the game never once said so. Across a
// fifty-month playtest it fell from 80 to 10 and not one line of text appeared. A number
// with five consequences and no voice is a number the player learns to ignore.
const MOOD_BANDS = [
  { at: 15, say: 'You are not getting out of bed most days. Everything takes twice as long and people have started to notice.' },
  { at: 28, say: 'You are running on empty. Work is harder than it should be and you are catching everything going round.' },
  { at: 42, say: 'You have been flat for a while. Nothing is wrong, exactly. Nothing is right either.' },
];
export function moodBand(s) {
  const m = s.mental || 0;
  for (const b of MOOD_BANDS) if (m < b.at) return b;
  return null;
}
function moodTick(s) {
  const band = moodBand(s);
  const now = band ? band.at : 0;
  const said = s._moodSaid || 0;
  // How many months in a row. The fourth month at the bottom is a different thing from the
  // first one, and the player could not see the difference.
  s._lowMonths = band ? (s._lowMonths || 0) + 1 : 0;
  // Say it when it gets worse, and once more when it has properly lifted — not every month.
  if (band && (!said || now < said)) {
    s._moodSaid = now;
    addTimeline(s, band.say, true);
    if (!s.lastEvent) s.lastEvent = band.say;
  } else if (!band && said) {
    s._moodSaid = 0;
    addTimeline(s, 'Your head is above water again.');
  }
}

export function strainTick(s) {
  if (!inCareer(s) && s.stage !== 'moving_out') return s;
  moodTick(s);
  if (s.depression) { depressionTick(s); s.depression.sessionThisMonth = false; }
  s._therapyThisMonth = false;

  if (burnedOut(s)) {
    s.burnout.left -= 1;
    s.strain = Math.max(0, (s.strain || 0) - 14 / Math.max(1, recoveryDrag(s) * 0.7));
    loadTick(s);
    s.mental = clamp((s.mental || 0) + 3);
    if (s.burnout.left <= 0) {
      s.burnout = null;
      // No reset to 30 on the day you are cleared: the months off took off what they took, at the
      // pace the 36-month load allows (recoveryDrag). Two months off after three years flat out
      // used to wipe it all, and the doctor's pause was a better rest than a year away.
      s.lastEvent = 'You are cleared to work again. Whatever that was, it has passed — mostly.';
      addTimeline(s, 'Cleared to work again after time off.');
      for (const p of s.productions || []) if (p.heldFor === 'health') p.heldUntil = 0;   // your held parts start again
    }
    return s;
  }
  if (s.onBreak) { breakTick(s); loadTick(s); s._rested = false; return s; }

  const before = s.strain || 0;
  const all = active(s);
  if (all.length && lightWork(s) && before > 35 && !(s.illness && s.illness.freezes)) {
    // Light work: short jobs, episodes, small parts, a lighter schedule. You keep a hand in and
    // the load still comes down, slowly (audit §7.5).
    s.strain = clamp(before - IDLE_GAIN * 0.5 / recoveryDrag(s));
  } else if (all.length && !(s.illness && s.illness.freezes)) {
    // Every set you are on wears you. The second and third at seven-tenths each — the days
    // overlap, the tiredness does not quite — so three features at once is two and a half
    // times the wear of one, and a burnout inside a season. Maxi: "take too many and the
    // energy goes, then the illnesses."
    let up = all.reduce((n, p, i) => n + monthlyStrain(p, before) * (p.light ? 0.6 : 1) * (i ? 0.7 : 1), 0);
    if ((s.mental || 50) < 35) up += 1.5;            // running down makes everything cost more
    if ((s.health || 50) < 40) up += 1.5;
    s.strain = clamp(before + up);
  } else {
    // A month with no shoot gives it back; resting properly gives more, and the Rest
    // action sets this flag. But each time you have gone over the edge you come back a
    // little less able to recover — burnout is not a save point you reload from, and
    // without this the whole thing was a speed bump: two hundred careers averaged thirty
    // collapses each and still finished with a hundred and seventy-five credits.
    // And three years flat out come back slower than a hard spring (burnout.js recoveryDrag).
    const worn = (1 + Math.min(2.0, (s.burnouts || 0) * 0.4)) * recoveryDrag(s);
    s.strain = clamp(before - (s._rested ? REST_GAIN : IDLE_GAIN) / worn);
  }
  s._rested = false;

  // Crossing into the red is worth saying once.
  if (before < 60 && (s.strain || 0) >= 60) {
    addTimeline(s, 'You are tired in a way sleep is not fixing. It has been a lot of work back to back.', true);
  }
  if (before < 82 && (s.strain || 0) >= 82) {
    s.lastEvent = 'Somebody on set asked if you were all right and you did not have an answer.';
    addTimeline(s, 'Running on empty. People have started asking whether you are all right.', true);
  }

  // And above that, it stops being your decision — but not this month, and not next.
  // Burnout is supposed to be the once-or-twice-in-a-life thing it is in life, not a
  // recurring illness: the first version fired at six per cent the moment you crossed
  // the line and rose to thirty-five, which gave a hard-working actor twenty-eight
  // collapses in a career. You now have to sit in the red for months on end, ignoring
  // two warnings, before your body makes the decision for you.
  // The odds now grow with the months at the top and the three years behind them, and double
  // for a year once the doctor has told you (burnout.js forcedStopOdds).
  if ((s.strain || 0) >= 82) {
    s._redMonths = (s._redMonths || 0) + 1;
  } else if ((s.strain || 0) < 70) {
    s._redMonths = 0;
  }
  loadTick(s);
  if (chance(forcedStopOdds(s))) collapse(s);
  return s;
}

// The Rest action tells the tick that this month was spent properly.
export function markRested(s) { s._rested = true; s.strain = clamp((s.strain || 0) - 3); return s; }

function collapse(s) {
  const out = forcedStop(s);
  // Depression is not burnout: only when the head is already at the bottom, sometimes.
  if (out.meetsDepression) {
    s.depression = { since: (s.year || 0) * 12 + (s.month || 0), sessions: 0, checks: 0, passed: 0,
      windowMonths: 0, windowSessions: 0, windowRests: 0, medMonths: 0, medsThisMonth: false, pending: null };
    addTimeline(s, 'This one did not lift with the months. It has stopped being about the work.', true);
    showMoment(s, {
      id: 'depression', kind: 'bad', title: 'It did not lift',
      body: 'You were already low before you stopped, and the stop did not let it up. It is not the schedule any more and it is not '
        + 'a part you can put down — it followed you home and it has stayed. This is going to take a long time. '
        + 'It starts with medication, and then it is one hard month at a time. Nothing else works until you are on them.',
      slots: 2,
    });
  }
}
