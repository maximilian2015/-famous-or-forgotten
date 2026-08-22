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
import { drinkingCoversSlots, level as drinkLevel, dependent, rehabMonthsFor, rehabCostFor } from './drink.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

export const CHECKPOINTS = 3;
export const EVERY_MONTHS = 5;
export const MIN_MONTHS = 8;          // nothing is asked of you in the first two seasons

export function has(s) { return !!s.depression; }
export function monthsIn(s) {
  if (!s.depression) return 0;
  return Math.max(0, ((s.year || 0) * 12 + (s.month || 0)) - (s.depression.since || 0));
}
// How many of your three actions a month this is currently taking — unless you drank
// tonight, in which case none of them, which is exactly why that road is worth taking
// and exactly why it ends where it does. See systems/life/drink.js.
export function slotsLost(s) {
  const owed = s.depression ? Math.max(0, 2 - (s.depression.passed || 0)) : (s.scarred || 0);
  return drinkingCoversSlots(s) ? 0 : owed;
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
  let score = parts.reduce((a, p) => a + (p.on ? p.weight : 0), 0);
  // Drinking through it gives you the months back and takes the recovery away. You cannot
  // do both at once, and this is the line where that becomes obvious.
  const dl = drinkLevel(s);
  if (dl > 0) {
    const cost = dependent(s) ? 42 : 20;
    score = Math.max(0, score - cost);
    parts.push({ id: 'dry', on: false, weight: -cost,
      label: dependent(s) ? 'Drinking through it — nothing here works while you are' : 'Drinking through it (−' + cost + ')' });
  }
  return { score, parts, closest };
}

// ── the checkpoints themselves ────────────────────────────────────────────────
// Three scenes, in order. The choice matters, but it is worth less than the five months
// behind it — which is the point.
// Three DIFFERENT trials, in a random order, because three fixed scenes with one obviously
// right answer is a puzzle you solve once and never think about again. One is a
// conversation whose best answer depends on where you actually are; one is a week you have
// to lay out without stacking the hard days together; one is a thing you have to hold in
// your head, which is the first thing this takes off you.
export const TRIALS = ['talk', 'week', 'hold'];
export function trialsFor(seed) {
  const t = [...TRIALS];
  for (let i = t.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [t[i], t[j]] = [t[j], t[i]]; }
  return t;
}

// ── trial one: the conversation ───────────────────────────────────────────────
// Two versions of the same scene, and which one you get depends on whether there is
// anybody in your life. The right answer is not the same in both, so it cannot be learnt.
export const TALK = {
  alone: {
    id: 'talk', title: 'Somebody wrote',
    body: 'Somebody from an old crew has messaged. Not about work. They want to know how you are, and they have '
      + 'asked twice now. There is nobody else asking.',
    choices: [
      { id: 'honest', label: 'Tell them the truth', bonus: 18, note: 'You typed it out before you could stop yourself. They rang within the minute.' },
      { id: 'fine', label: 'Say you are fine', bonus: 0, note: 'You said you were fine. They said good, and that was that.' },
      { id: 'nothing', label: 'Leave it', bonus: -10, note: 'You left it. You will read it again tonight and leave it again.' },
    ],
  },
  held: {
    id: 'talk', title: 'They have heard it before',
    body: 'The person who has been carrying you through this asks how you are, again. They have been asking every '
      + 'week for a year, and lately you can hear how tired they are of the answer.',
    choices: [
      { id: 'honest', label: 'Tell them the truth, again', bonus: 2, note: 'You told them the truth again. They listened again. Something in the room was heavier afterwards.' },
      { id: 'fine', label: 'Ask how THEY are', bonus: 18, note: 'You asked about them instead, and meant it. They talked for an hour. So did you, afterwards.' },
      { id: 'nothing', label: 'Say nothing at all', bonus: -8, note: 'You said nothing. They filled the silence, the way they always do.' },
    ],
  },
};
export function talkVariant(s) { return standingOf(s).closest >= 55 ? 'held' : 'alone'; }

// ── trial two: laying out a week ──────────────────────────────────────────────
// Seven days, three things that have to go in them, and they cannot be stacked — which is
// the actual difficulty of a week like this rather than a test of anybody's reflexes.
export const WEEK_TASKS = [
  { id: 'sleep', label: 'A proper night', hint: 'not two in a row' },
  { id: 'out', label: 'Outside, an hour', hint: 'not the day after a bad one' },
  { id: 'people', label: 'See somebody', hint: 'not on the same day as anything else' },
];
export function scoreWeek(plan) {
  // plan is an array of 7 entries: null or a task id.
  const used = WEEK_TASKS.map((t) => plan.filter((p) => p === t.id).length);
  if (used.some((n) => n < 1)) return { ok: false, bonus: -6, note: 'You left a week with nothing in it. It went the way those go.' };
  let clashes = 0;
  for (let i = 1; i < plan.length; i++) if (plan[i] && plan[i] === plan[i - 1]) clashes++;
  const spread = plan.filter(Boolean).length;
  if (clashes === 0 && spread >= 3) {
    return { ok: true, bonus: 16, note: 'You laid the week out and then actually lived it. Seven days you can account for.' };
  }
  if (clashes <= 1) return { ok: true, bonus: 6, note: 'Most of the week held together. Two days ran into each other.' };
  return { ok: false, bonus: -4, note: 'You put it all on top of itself and then did none of it.' };
}

// ── trial three: holding something in your head ───────────────────────────────
// Concentration is the first thing it takes, so this is the one thing here that asks for
// it back. Not speed — attention.
export function makeHold(s) {
  const pool = [...(s.family || []), ...(s.people || [])]
    .filter((p) => p.alive !== false && p.name)
    .map((p) => p.name);
  const filler = ['Rin Blythe', 'Sol Vane', 'Mira Croft', 'Theo Marsh', 'Ada Rune', 'Nils Brandt', 'Petra Okonjo'];
  const names = [];
  for (const n of [...pool, ...filler]) { if (!names.includes(n)) names.push(n); if (names.length >= 5) break; }
  const order = names.slice(0, 4);
  return { order, missing: order[rint(0, order.length - 1)] };
}
export function scoreHold(hold, answer) {
  if (answer === hold.missing) {
    return { ok: true, bonus: 15, note: 'You held it. A small thing, and it is the first small thing in months that stayed put.' };
  }
  return { ok: false, bonus: -5, note: 'It slid straight out of your head, the way everything has been doing.' };
}

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

  if (!d.order) d.order = trialsFor();
  const kind = d.order[Math.min(d.order.length - 1, d.checks || 0)];
  d.pending = { kind, standing: standingOf(s) };
  if (kind === 'talk') d.pending.variant = talkVariant(s);
  if (kind === 'hold') d.pending.hold = makeHold(s);
  return s;
}

// The player answers whichever trial is on screen. `answer` is a choice id, a week plan,
// or a name, depending. This is where a checkpoint passes or fails.
export function answerCheckpoint(s, answer) {
  const d = s.depression;
  if (!d || !d.pending) return s;
  const p = d.pending;
  let choice;
  if (p.kind === 'week') choice = scoreWeek(Array.isArray(answer) ? answer : []);
  else if (p.kind === 'hold') choice = scoreHold(p.hold, answer);
  else {
    const scene = TALK[p.variant || 'alone'];
    // An id that is not on this scene is a bug, not a decision the player made — fall back
    // to the middle option rather than silently scoring them the worst one.
    choice = scene.choices.find((c) => c.id === answer) || scene.choices[1] || scene.choices[0];
  }
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
  const what = { talk: 'A conversation', week: 'A week you laid out', hold: 'Something you tried to hold on to' }[p.kind] || 'A month';
  addTimeline(s, `${what}: ${passed ? 'a good month, for once' : 'it did not move'}.`, !passed);

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
      : `${choice.note} You came out the other side without ever really fighting it, and it kept two of your three Energy every `
        + 'month as the price. A year in a clinic will get them back. So will a very long time in therapy. Nothing else will.',
  };
  return s;
}

// ── getting the slots back ────────────────────────────────────────────────────
export const REHAB_MONTHS = 12;
// One clinic, and what it has to undo decides how long you are in it. Drink on top of a
// depression and it is both, which takes half again as long.
export function needsRehab(s) { return (s.scarred || 0) > 0 || drinkLevel(s) > 0 || !!s.depression; }
export function rehabMonths(s) {
  const drinkPart = drinkLevel(s) > 0 ? rehabMonthsFor(s) : 0;
  const scarPart = (s.scarred || 0) > 0 || s.depression ? REHAB_MONTHS : 0;
  return Math.max(6, Math.min(24, Math.max(drinkPart, scarPart) + (drinkPart && scarPart ? 4 : 0)));
}
// Priced the same way the medication is, and for the same reason — a place that takes
// somebody with your face, keeps it quiet for a year and never has a leak is not billing
// off a rate card. See systems/life/health.js.
export function rehabCost(s) {
  const flat = drinkLevel(s) > 0 ? Math.max(90000, rehabCostFor(s)) : 90000;
  return Math.max(flat, Math.min(3500000, Math.round((Math.max(0, s.cash || 0) * 0.30) / 1000) * 1000));
}
export function inRehab(s) { return !!(s.rehab && s.rehab.left > 0); }
export function enterRehab(s) {
  if (!needsRehab(s)) { s.lastEvent = 'There is nothing a clinic could do for you right now.'; return s; }
  if (inRehab(s)) return s;
  const cost = rehabCost(s), months = rehabMonths(s);
  if ((s.cash || 0) < cost) { s.lastEvent = `That place costs €${cost.toLocaleString()}. You cannot cover it.`; return s; }
  s.cash -= cost;
  const both = drinkLevel(s) > 0 && ((s.scarred || 0) > 0 || !!s.depression);
  s.rehab = { left: months, months, since: (s.year || 0) * 12 + (s.month || 0), both };
  addTimeline(s, `Checked into a clinic for ${months} months. €${cost.toLocaleString()}, and nobody is going to hear from you.`, true);
  s.lastEvent = both
    ? `You checked in. ${months} months — there are two things to undo, and they will not do one without the other.`
    : `You checked in. ${months} months of your life and €${cost.toLocaleString()}.`;
  return s;
}
export function rehabTick(s) {
  if (!inRehab(s)) return s;
  s.rehab.left -= 1;
  s.mental = clamp((s.mental || 0) + 2.5);
  s.health = clamp((s.health || 0) + 1);
  if (s.rehab.left <= 0) {
    const months = s.rehab.months || REHAB_MONTHS;
    const both = s.rehab.both;
    s.rehab = null;
    s.scarred = 0;
    s.depression = null;
    s.drink = null;
    addTimeline(s, `${months} months in that place, and you have your Energy back.`);
    s.lastEvent = 'You came out with your Energy back. It cost the time and everything you had put aside.';
    s.bigMoment = { id: 'rehab', kind: 'good', title: `${months} months later`, months,
      body: both
        ? `${months} months, no cameras, nobody watching, and two things to put down rather than one. You have your `
          + 'Energy back and your craft is where you left it — several years lower than it was. The next thing you do '
          + 'will be written about as a comeback, which is a generous word for it.'
        : `${months} months, no cameras, nobody watching. You have back the Energy it took, and you know exactly `
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
      ? 'Twenty months of sessions and you have one of your two back. One left to go.'
      : 'Twenty months of sessions, and you have yourself back. All of it.');
    s.lastEvent = 'Something you have been working at for nearly two years finally gave.';
  }
  return s;
}
