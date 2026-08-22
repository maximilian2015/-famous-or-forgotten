// The fourth collapse does not end when a counter does. It takes months of your life a
// month at a time — literally, in the currency the game is actually made of, which is
// what you can do with the days you have.
//
// The shape is Maxi's: medication first, then a checkpoint every five months, three of
// them; pass one and you get part of yourself back, fail and you sit in it. Come out the
// far side having failed them all and it keeps two of your actions for good, and the only
// way back from that is a year in a clinic or years of therapy.
//
// The one change from his sketch: the checkpoints are not the audition minigames. Staying
// unwell because you mistimed a tap would be the wrong thing to say and the wrong thing
// to play. Each one is a scene with a choice, and it resolves on what you have actually
// been doing for those five months — the pills, the sessions, the resting, and whether
// there is anybody left who is close to you.
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

export const CHECKPOINTS = 3;
export const EVERY_MONTHS = 5;
export const MIN_MONTHS = 8;          // nothing is asked of you in the first two seasons

export function has(s) { return !!s.depression; }
export function monthsIn(s) {
  if (!s.depression) return 0;
  return Math.max(0, ((s.year || 0) * 12 + (s.month || 0)) - (s.depression.since || 0));
}
// How many of your three actions a month this is currently taking.
export function slotsLost(s) {
  if (s.depression) return Math.max(0, 2 - (s.depression.passed || 0));
  return s.scarred || 0;
}

// ── the pills ─────────────────────────────────────────────────────────────────
// They do not make you well. Nothing here does on its own. But nothing else works while
// you are not on them, which is the honest version and also the useful one.
export function onMeds(s) { return (s.depression?.medMonths || 0) >= 2; }
export function medsNote(s) {
  if (!s.depression) return '';
  const m = s.depression.medMonths || 0;
  if (m === 0) return 'Nothing has been started yet.';
  if (m < 2) return 'You started them this month. They take weeks to do anything.';
  return `On them ${m} months.`;
}

// ── what the five months are judged on ────────────────────────────────────────
export function standingOf(s) {
  const d = s.depression;
  if (!d) return { score: 0, parts: [] };
  const window = Math.max(1, d.windowMonths || 1);
  const closest = Math.max(0, ...[...(s.family || []), ...(s.people || [])]
    .map((p) => (p.alive === false ? 0 : p.relationship || 0)), s.partner ? (s.partner.relationship || 0) : 0);
  const parts = [
    { id: 'meds', on: onMeds(s), weight: 34, label: 'On the medication' },
    { id: 'therapy', on: (d.windowSessions || 0) >= 2, weight: 26,
      label: `Went to therapy (${d.windowSessions || 0} of 2 needed)` },
    { id: 'rest', on: (d.windowRests || 0) >= 2, weight: 18,
      label: `Actually rested (${d.windowRests || 0} of 2 needed)` },
    { id: 'close', on: closest >= 55, weight: 22,
      label: closest >= 55 ? 'Somebody close to you' : `Nobody close to you (best is ${Math.round(closest)})` },
  ];
  return { score: parts.reduce((a, p) => a + (p.on ? p.weight : 0), 0), parts, closest };
}

// ── the checkpoints themselves ────────────────────────────────────────────────
// Three scenes, in order. The choice matters, but it is worth less than the five months
// behind it — which is the point.
export const SCENES = [
  {
    id: 'message',
    title: 'Somebody wrote',
    body: 'Somebody from an old crew has messaged. Not about work. They just want to know how you are, '
      + 'and they have asked twice now.',
    choices: [
      { id: 'honest', label: 'Tell them the truth', bonus: 18, note: 'You typed it out before you could stop yourself. They rang within the minute.' },
      { id: 'fine', label: 'Say you are fine', bonus: 2, note: 'You said you were fine. They said good, and that was that.' },
      { id: 'nothing', label: 'Leave it', bonus: -8, note: 'You left it. You will read it again tonight and leave it again.' },
    ],
  },
  {
    id: 'morning',
    title: 'A morning like any other',
    body: 'It is eleven and you are still in the same room. Nothing has happened, which is exactly the problem — '
      + 'nothing has happened for a while now.',
    choices: [
      { id: 'out', label: 'Get dressed and go outside', bonus: 15, note: 'You walked for an hour with no destination. It is not nothing.' },
      { id: 'work', label: 'Open a script instead', bonus: 4, note: 'You read four pages and understood none of them, but you read them.' },
      { id: 'stay', label: 'Stay where you are', bonus: -10, note: 'You stayed. It got dark early.' },
    ],
  },
  {
    id: 'room',
    title: 'They asked you to come',
    body: 'There is a thing on — a wrap party, a birthday, something with people in it. You have been invited '
      + 'and everyone knows you probably will not come.',
    choices: [
      { id: 'go', label: 'Go, and stay an hour', bonus: 16, note: 'You stayed an hour. Somebody was glad to see you and said so.' },
      { id: 'brief', label: 'Look in and leave', bonus: 7, note: 'You looked in, said the right things, and left before anyone could ask.' },
      { id: 'skip', label: 'Do not go', bonus: -9, note: 'You did not go. Somebody noticed, and did not say anything.' },
    ],
  },
];

// Called monthly. Raises a checkpoint when one is due; the UI answers it.
export function depressionTick(s) {
  const d = s.depression;
  if (!d) return s;
  d.windowMonths = (d.windowMonths || 0) + 1;
  if (s._rested) d.windowRests = (d.windowRests || 0) + 1;
  if (d.medsThisMonth) d.medMonths = (d.medMonths || 0) + 1;
  else d.medMonths = 0;                       // stop taking them and you start again
  d.medsThisMonth = false;

  const close = standingOf(s).closest >= 55;
  s.mental = clamp((s.mental || 0) - (close ? 1.2 : 2.2) + (onMeds(s) ? 1.2 : 0));

  if (d.pending) return s;                    // a checkpoint is on screen, waiting
  if (monthsIn(s) < MIN_MONTHS) return s;
  if (d.windowMonths < EVERY_MONTHS) return s;

  const scene = SCENES[Math.min(SCENES.length - 1, d.checks || 0)];
  d.pending = { scene: scene.id, standing: standingOf(s) };
  return s;
}

// The player answers the scene. This is where a checkpoint passes or fails.
export function answerCheckpoint(s, choiceId) {
  const d = s.depression;
  if (!d || !d.pending) return s;
  const scene = SCENES.find((x) => x.id === d.pending.scene) || SCENES[0];
  // An id that is not on this scene is a bug, not a decision the player made — fall back
  // to the middle option rather than silently scoring them the worst one.
  const choice = scene.choices.find((c) => c.id === choiceId) || scene.choices[1] || scene.choices[0];
  const standing = standingOf(s);
  // Medication is not optional. Nothing you choose in a scene substitutes for it.
  const odds = onMeds(s) ? clamp(standing.score + choice.bonus, 4, 94) : clamp(8 + choice.bonus, 0, 22);
  const passed = chance(odds);

  d.checks = (d.checks || 0) + 1;
  d.windowMonths = 0; d.windowSessions = 0; d.windowRests = 0;
  d.pending = null;

  if (passed) {
    d.passed = (d.passed || 0) + 1;
    s.mental = clamp((s.mental || 0) + 10);
  } else {
    s.mental = clamp((s.mental || 0) - 4);
  }

  const back = passed ? 'You got a piece of yourself back.' : 'Nothing shifted.';
  addTimeline(s, `${scene.title}: ${passed ? 'a good month, for once' : 'it did not move'}.`, !passed);

  if (d.checks >= CHECKPOINTS) return finish(s, choice, passed);

  s.bigMoment = {
    id: 'checkpoint', kind: passed ? 'good' : 'bad', title: passed ? 'Something moved' : 'It did not move',
    body: `${choice.note} ${back} ${CHECKPOINTS - d.checks} more of these to go.`,
    slots: slotsLost(s),
  };
  s.lastEvent = choice.note;
  return s;
}

function finish(s, choice, passed) {
  const d = s.depression;
  const won = d.passed || 0;
  // Fail all three and it keeps two of your actions for good. Pass some and it keeps one.
  // Pass all three and you get out clean.
  const scar = won >= CHECKPOINTS ? 0 : won === 0 ? 2 : 1;
  s.scarred = Math.max(s.scarred || 0, scar);
  s.depression = null;
  s.mental = clamp((s.mental || 0) + (scar ? 6 : 16));
  const months = monthsIn(s);
  if (scar === 0) {
    addTimeline(s, 'It lifted. Properly, and on its own terms.');
    s.lastEvent = 'It lifted. You are not who you were before it, but you are yourself again.';
  } else {
    addTimeline(s, `The worst of it is over, but it took something with it — ${scar} action${scar === 1 ? '' : 's'} a month, for good.`, true);
    s.lastEvent = `The worst of it has passed. You have ${scar} fewer hour${scar === 1 ? '' : 's'} in you than you used to, and that is not coming back on its own.`;
  }
  s.bigMoment = {
    id: 'lifted', kind: scar ? 'bad' : 'good', title: scar ? 'What it left behind' : 'It lifted',
    months, slots: scar,
    body: scar === 0
      ? `${choice.note} It did not happen on a particular day. You found yourself in the middle of something ordinary, `
        + 'realising you had been there a while — and that you wanted to be.'
      : scar === 1
      ? `${choice.note} The worst of it is behind you. But you have one hour a month less than you had, every month, `
        + 'and it is not the kind of thing that comes back by itself. A clinic would do it. So would years of talking.'
      : `${choice.note} You came out the other side without ever really fighting it, and it kept two hours of every `
        + 'month as the price. A year in a clinic will get them back. So will a very long time in therapy. Nothing else will.',
  };
  return s;
}

// ── getting the slots back ────────────────────────────────────────────────────
export const REHAB_MONTHS = 12;
export function rehabCost(s) { return 90000; }
export function inRehab(s) { return !!(s.rehab && s.rehab.left > 0); }
export function enterRehab(s) {
  if (!(s.scarred > 0)) { s.lastEvent = 'There is nothing a clinic could do for you right now.'; return s; }
  if (inRehab(s)) return s;
  const cost = rehabCost(s);
  if ((s.cash || 0) < cost) { s.lastEvent = `A year in that place costs €${cost.toLocaleString()}. You cannot cover it.`; return s; }
  s.cash -= cost;
  s.rehab = { left: REHAB_MONTHS, since: (s.year || 0) * 12 + (s.month || 0) };
  if (s.production) {
    // Same rule as a collapse: the shoot goes into the freezer, not the bin.
    s._rehabDroppedShoot = s.production.title;
  }
  addTimeline(s, `Checked into a clinic for a year. €${cost.toLocaleString()}, and nobody is going to hear from you.`, true);
  s.lastEvent = `You checked in. A year of your life and €${cost.toLocaleString()} — and the two hours a month you lost.`;
  return s;
}
export function rehabTick(s) {
  if (!inRehab(s)) return s;
  s.rehab.left -= 1;
  s.mental = clamp((s.mental || 0) + 2.5);
  s.health = clamp((s.health || 0) + 1);
  if (s.rehab.left <= 0) {
    s.rehab = null;
    s.scarred = 0;
    addTimeline(s, 'A year in that place, and you have your hours back.');
    s.lastEvent = 'You came out with your hours back. It cost a year and everything you had put aside.';
    s.bigMoment = { id: 'rehab', kind: 'good', title: 'A year later', months: REHAB_MONTHS,
      body: 'Twelve months, no cameras, nobody watching. You have the hours back that it took, and you know exactly '
        + 'what they cost — which is the part you will remember next time somebody offers you four films in a row.' };
  }
  return s;
}

// The slow road: therapy, month after month, for years. Cheaper per month than a clinic
// and far longer, and it is the only other thing that works.
export const THERAPY_FOR_A_SLOT = 20;
export function therapyProgress(s) { return s.scarTherapy || 0; }
export function creditTherapy(s) {
  if (!(s.scarred > 0)) return s;
  s.scarTherapy = (s.scarTherapy || 0) + 1;
  if (s.scarTherapy >= THERAPY_FOR_A_SLOT) {
    s.scarTherapy = 0;
    s.scarred = Math.max(0, (s.scarred || 0) - 1);
    addTimeline(s, s.scarred > 0
      ? 'Twenty months of sessions and you have one of your hours back. One left to go.'
      : 'Twenty months of sessions, and you have yourself back. All of it.');
    s.lastEvent = 'Something you have been working at for nearly two years finally gave.';
  }
  return s;
}
