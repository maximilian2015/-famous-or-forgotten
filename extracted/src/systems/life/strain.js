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

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

// What a month on set takes out of you, by how big the thing is.
const COST = { blockbuster: 6.5, prestige: 5.5, feature: 5, recurring: 4.5, indie: 4, episode: 3.5, small: 3, oneoff: 2 };
export function monthlyStrain(p) { return COST[p?.scale] || 4.5; }

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

// Whether you are able to take on anything at all.
export function burnedOut(s) { return !!(s.burnout && s.burnout.left > 0); }
export function canWork(s) {
  if (burnedOut(s)) {
    return { ok: false, why: `You are signed off. ${s.burnout.left} more month${s.burnout.left === 1 ? '' : 's'} before anyone will insure you on a set.` };
  }
  return { ok: true, why: '' };
}

// Runs every month.
export function strainTick(s) {
  if (s.stage !== 'career' && s.stage !== 'moving_out') return s;

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
    let up = monthlyStrain(s.production);
    if ((s.mental || 50) < 35) up += 1.5;            // running down makes everything cost more
    if ((s.health || 50) < 40) up += 1.5;
    s.strain = clamp(before + up);
  } else {
    // A month with no shoot gives it back; resting properly gives more, and the Rest
    // action sets this flag.
    s.strain = clamp(before - (s._rested ? REST_GAIN : IDLE_GAIN));
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

  // And above that, it stops being your decision.
  if ((s.strain || 0) >= 82) {
    const risk = 6 + ((s.strain || 0) - 82) * 1.6;
    if (chance(risk)) collapse(s);
  }
  return s;
}

// The Rest action tells the tick that this month was spent properly.
export function markRested(s) { s._rested = true; s.strain = clamp((s.strain || 0) - 3); return s; }

function collapse(s) {
  const months = rint(2, 5);
  const wasShooting = !!s.production;
  const title = s.production ? s.production.title : '';
  s.burnout = { left: months, since: (s.year || 0) * 12 + (s.month || 0) };
  s.mental = clamp((s.mental || 0) - 16);
  s.health = clamp((s.health || 0) - 8);
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
      owed: Math.max(0, (p.salary || 0) - (p.paid || 0)), paid: p.paid || 0, salary: p.salary || 0,
      why: 'you could not carry on and the production shut down around you',
    });
    s.production = null;
  }
  addTimeline(s, wasShooting
    ? `You stopped. "${title}" shut down around you and the doctor signed you off for ${months} months.`
    : `You stopped. The doctor signed you off for ${months} months.`, true);
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
