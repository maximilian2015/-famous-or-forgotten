// Nothing stopped you shooting one film straight into the next for sixty years. Measured
// over two hundred careers the average actor finished with two hundred and sixteen
// credits; a real one manages thirty to sixty. There was no cost to never stopping, so
// never stopping was simply correct — which is a bad thing for a game to teach and a
// worse thing for it to be silent about.
//
// So the work accumulates in you. Strain is not a difficulty knob: a normal career of one
// project a year never comes near it. It exists to make the grind end somewhere.
import { rint, chance } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { patienceFor } from '../career/stability.js';
import { depressionTick, creditTherapy, therapyProgress, THERAPY_FOR_A_SLOT, inRehab } from './depression.js';

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
  const n = Math.max(0, (s.burnouts || 0) - 1);
  return Math.max(0.45, 1 - n * 0.14);
}
export function unreliable(s) { return (s.burnouts || 0) >= 3; }
export function reputationNote(s) {
  const n = s.burnouts || 0;
  if (n === 3) return 'Three shoots have stopped because of you now. It is the kind of thing that gets said about people, and it has started being said about you.';
  if (n === 5) return 'Nobody says it to your face, but the insurance on you costs more than the crew. The parts that come now are the ones nobody else wanted.';
  return null;
}

// ── the fourth time ─── the state itself lives in systems/life/depression.js ──
// Ignore it four times and it stops being about the work. This does not lock you out of
// the game — a state you cannot act on is not a consequence, it is a wall — but it is
// long, it is slow, and it does not go away because a counter ran out. What moves it is
// resting, seeing somebody about it, and having somebody left who is close to you.
export const DEPRESSION_AT = 4;
export function depressed(s) { return !!s.depression; }

// One hour a month, every month, for as long as it lasts. Therapy is the same act whether
// you are in it or working the scar off years later, so it lives in one place.
export function seeSomebody(s) {
  const inIt = !!s.depression, scarred = (s.scarred || 0) > 0;
  if (!inIt && !scarred) { s.lastEvent = 'There is nothing to talk about right now.'; return s; }
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  if (inIt && s.depression.sessionThisMonth) { s.lastEvent = 'You have already been this month.'; return s; }
  if (!inIt && s._therapyThisMonth) { s.lastEvent = 'You have already been this month.'; return s; }
  const cost = 260;
  if ((s.cash || 0) < cost) { s.lastEvent = `An hour costs €${cost}. You do not have it this month.`; return s; }
  s.cash -= cost; s.ap -= 1;
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
  if (burnedOut(s)) {
    return { ok: false, why: `You are signed off. ${s.burnout.left} more month${s.burnout.left === 1 ? '' : 's'} before anyone will insure you on a set.` };
  }
  return { ok: true, why: '' };
}

// Runs every month.
export function strainTick(s) {
  if (s.stage !== 'career' && s.stage !== 'moving_out') return s;
  if (s.depression) { depressionTick(s); s.depression.sessionThisMonth = false; }
  s._therapyThisMonth = false;

  if (burnedOut(s)) {
    s.burnout.left -= 1;
    s.strain = Math.max(0, (s.strain || 0) - 14);
    s.mental = clamp((s.mental || 0) + 3);
    if (s.burnout.left <= 0) {
      s.burnout = null;
      s.strain = Math.min(s.strain || 0, 30);
      s.lastEvent = 'You are cleared to work again. Whatever that was, it has passed — mostly.';
      addTimeline(s, 'Cleared to work again after time off.');
    }
    return s;
  }

  const before = s.strain || 0;
  if (s.production && !(s.illness && s.illness.freezes)) {
    let up = monthlyStrain(s.production, before);
    if ((s.mental || 50) < 35) up += 1.5;            // running down makes everything cost more
    if ((s.health || 50) < 40) up += 1.5;
    s.strain = clamp(before + up);
  } else {
    // A month with no shoot gives it back; resting properly gives more, and the Rest
    // action sets this flag. But each time you have gone over the edge you come back a
    // little less able to recover — burnout is not a save point you reload from, and
    // without this the whole thing was a speed bump: two hundred careers averaged thirty
    // collapses each and still finished with a hundred and seventy-five credits.
    const worn = 1 + Math.min(2.0, (s.burnouts || 0) * 0.4);
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
  const shielded = ((s.year || 0) * 12 + (s.month || 0)) < (s._burntUntil || 0);
  if ((s.strain || 0) >= 82) {
    s._redMonths = (s._redMonths || 0) + 1;
    if (s._redMonths >= 6 && !shielded) {
      const risk = 0.4 + Math.max(0, (s.strain || 0) - 88) * 0.09;
      if (chance(risk)) collapse(s);
    }
  } else if ((s.strain || 0) < 70) {
    s._redMonths = 0;
  }
  return s;
}

// The Rest action tells the tick that this month was spent properly.
export function markRested(s) { s._rested = true; s.strain = clamp((s.strain || 0) - 3); return s; }

function collapse(s) {
  s.burnouts = (s.burnouts || 0) + 1;
  // Each one takes longer to come back from than the last.
  const months = rint(2, 5) + Math.min(4, s.burnouts - 1);
  const wasShooting = !!s.production;
  const title = s.production ? s.production.title : '';
  s.burnout = { left: months, since: (s.year || 0) * 12 + (s.month || 0) };
  s._redMonths = 0;
  // You do not do this to yourself twice in a row. People who go through it restructure
  // something, and a game where it recurs every other year is not modelling burnout, it
  // is modelling a chronic illness.
  s._burntUntil = (s.year || 0) * 12 + (s.month || 0) + months + 24;
  // What this costs is TIME and your head — not your body. Stacking a compounding health
  // hit on top of the months lost and the mental hit killed the simulated population at
  // twenty-eight: everyone was dead before their career started, which is not a limit on
  // the grind, it is a bug wearing one as a hat.
  s.mental = clamp((s.mental || 0) - 16);
  s.health = clamp((s.health || 0) - 4);
  // A shoot you walk off does not wait for you. It goes into the freezer with everything
  // else that stopped — see systems/career/stability.js.
  if (wasShooting) {
    const p = s.production;
    (s.frozen = s.frozen || []).push({
      id: 'frz' + Date.now() + Math.floor(Math.random() * 1000),
      title: p.title, role: p.role, type: p.type, genre: p.genre, scale: p.scale, tier: p.tier,
      prestigeScore: p.prestigeScore, monthsLeft: Math.max(1, p.monthsLeft || 1),
      episodes: p.episodes || 0, episodeFee: p.episodeFee || 0, season: p.season || 0, part: p.part || 1,
      optioned: !!p.optioned, optionParts: p.optionParts || 0, stability: p.stability,
      since: (s.year || 0) * 12 + (s.month || 0),
      // They will hold it for a name and recast an unknown — and this one stopped because
      // of you, which costs more if it never gets made.
      patience: patienceFor(s.fame || 0), byYou: true,
      owed: Math.max(0, (p.salary || 0) - (p.paid || 0)), paid: p.paid || 0, salary: p.salary || 0,
      why: 'you could not carry on and the production shut down around you',
    });
    s.production = null;
  }
  addTimeline(s, wasShooting
    ? `You stopped. "${title}" shut down around you and the doctor signed you off for ${months} months.`
    : `You stopped. The doctor signed you off for ${months} months.`, true);
  const rep = reputationNote(s);
  if (rep) addTimeline(s, rep, true);

  // The fourth time it stops being about the work.
  if (s.burnouts >= DEPRESSION_AT && !s.depression) {
    s.depression = { since: (s.year || 0) * 12 + (s.month || 0), sessions: 0, checks: 0, passed: 0,
      windowMonths: 0, windowSessions: 0, windowRests: 0, medMonths: 0, medsThisMonth: false, pending: null };
    s.mental = clamp((s.mental || 0) - 10);
    addTimeline(s, 'This one did not lift when the months were up. It has stopped being about the work.', true);
    s.bigMoment = {
      id: 'depression', kind: 'bad', title: 'It did not lift',
      body: 'The four months came and went and you are still not up. It is not the schedule any more and it is not '
        + 'a part you can put down — it followed you home and it has stayed. This is going to take a long time. '
        + 'It starts with medication, and then it is one hard month at a time. Nothing else works until you are on them.',
      slots: 2,
    };
    s.lastEvent = 'The months were up and you did not get up with them.';
    return;
  }
  s.lastEvent = wasShooting
    ? `You could not do it any more. "${title}" has been shut down and you are signed off for ${months} months.`
    : `You could not do it any more. Signed off for ${months} months.`;
  s.bigMoment = {
    id: 'burnout', kind: 'bad', title: 'You stopped', months, work: title,
    body: wasShooting
      ? `It was not a decision. You did not get up, and by the afternoon "${title}" had been shut down around you. `
        + `${months} months before anyone will insure you on a set again — and the film is sitting in a freezer waiting for you.`
      : `It was not a decision. You did not get up, and you have not really got up since. `
        + `${months} months before you are cleared to work, and the phone will not remember you the whole time.`,
  };
}
