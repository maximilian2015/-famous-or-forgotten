// The day you actually shoot. Maxi: "the set is very boring and it wears you out — and
// minigames, different every time, so they do not repeat; and does it change the turn?"
//
// The stance (production.js) handles the routine months, so nothing here is a monthly
// chore. A shoot throws one to three SCENES across its length — never two months running —
// and a scene is a real day's work with a game in it: the mark, the monologue, the stunt,
// the crying, the one-take, the line they changed on you. What comes out of it moves the
// picture: the shoot quality, the director, and at the top end a MOMENT — the thing a
// critic names in the review and the thing people remember the film for.
//
// Six mechanics, each with its own feel, each skinned by the genre and the part, and
// gated so a horror shoot throws stunts and night work while a drama throws the monologue
// and the tears. The pool is filtered per shoot, so two pictures in a row are not the same
// two days.
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { sets } from './production.js';
import { setById } from '../../engine/sets.js';
import { skillCap } from './actions.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const lead = (p) => ((p.crew || [])[0] || {});
const dark = (g) => /Horror|Thriller|Crime/.test(g || '');
const soft = (g) => /Romance|Drama|Musical/.test(g || '');

// game: which mechanic. prompt/detail are written per genre where it matters.
export const SCENES = {
  mark: {
    game: 'timing', label: 'Hit your mark',
    line: (p) => `Two pages, one move, and a chalk cross on the floor you cannot look at. ${lead(p).name} wants it in one.`,
    hint: 'Tap when the light is dead centre.',
    when: () => true, weight: 3,
  },
  takes: {
    game: 'grid', label: 'Take after take',
    line: (p) => `The scene is not working and everybody knows it. You can keep pushing — every take finds something, until one of them does not.`,
    hint: 'Push while it works. Stop before it does not.',
    when: () => true, weight: 3,
  },
  monologue: {
    game: 'rhythm', label: 'The monologue',
    line: (p) => `Four hundred words, no cuts, and the whole crew has stopped moving. It lives or dies on the rhythm.`,
    hint: 'Tap each line as it lands. Rushing is worse than late.',
    when: (s, p) => soft(p.genre) || p.scale === 'prestige' || /lead|matriarch|character/i.test(p.role || ''), weight: 4,
  },
  tears: {
    game: 'hold', label: 'Crying on cue',
    line: (p) => `They need it on the word, not before it, and then they need it again from the other side.`,
    hint: 'Hold it in the light. Do not let it slip.',
    when: (s, p) => soft(p.genre) || p.scale === 'prestige', weight: 4,
  },
  stunt: {
    game: 'keys', label: 'Doing it yourself',
    line: (p) => `The stunt coordinator walks you through it twice. ${lead(p).name} would rather have your face in the shot than a double's back.`,
    hint: 'Follow the sequence. Get it wrong and you land badly.',
    when: (s, p) => dark(p.genre) || p.scale === 'blockbuster' || p.genre === 'Sci-Fi', weight: 4,
    risky: true,
  },
  improv: {
    game: 'quick', label: 'They changed the line',
    line: (p) => `Your co-star says something that is not in the script and the camera is still rolling. ${lead(p).name} has not called cut.`,
    hint: 'Three seconds. Pick one.',
    when: (s, p) => /Comedy|Drama|Romance/.test(p.genre || '') || (p.crew || []).length > 1, weight: 3,
  },
  oner: {
    game: 'keys', label: 'The one-take',
    line: (p) => `Six minutes, eleven marks, forty people moving around you, and one mistake sends it back to the top.`,
    hint: 'The whole sequence, in order, first time.',
    when: (s, p) => p.scale === 'prestige' || p.scale === 'blockbuster' || p.scale === 'feature', weight: 2,
    hard: true,
  },
  night: {
    game: 'timing', label: 'The night shoot',
    line: (p) => `Third night in a row. It is four in the morning, the rain machine is on, and nobody has said a kind word since Tuesday.`,
    hint: 'The window is small and it is getting smaller.',
    when: (s, p) => dark(p.genre) || p.scale === 'blockbuster', weight: 2,
    hard: true, draining: true,
  },
};
export const SCENE_IDS = Object.keys(SCENES);

// Which scenes this shoot can throw at all — rolled once, so a picture has a character.
export function poolFor(s, p) {
  const live = SCENE_IDS.filter((id) => { try { return SCENES[id].when(s, p); } catch (e) { return false; } });
  return live.length ? live : ['mark', 'takes'];
}
// How hard the day is: the size of the picture, the scene, and how tired you are.
export function difficulty(s, p, id) {
  const sc = SCENES[id];
  let d = 1;
  if (sc.hard) d += 0.45;
  if (p.scale === 'blockbuster' || p.scale === 'prestige') d += 0.2;
  if ((s.strain || 0) >= 60) d += 0.25;
  if ((s.drink && s.drink.thisMonth)) d += 0.3;
  // What you can actually do. A trained actor gets a wider window, not a free pass.
  d -= Math.min(0.45, ((s.acting || 0) - 45) / 120);
  return Math.max(0.55, Math.min(2, d));
}

// Monthly, from the production tick. One to three a shoot, never two months running, never
// in the preparation months and never on the last day.
export function maybeScene(s) {
  if (s.scene || s.pendingArc || s.bigMoment) return s;
  for (const p of sets(s)) {
    if ((p.prepLeft || 0) > 0 || p.paused) continue;
    const done = (p._scenes || []).length;
    const cap = (p.months || 4) >= 6 ? 3 : (p.months || 4) >= 3 ? 2 : 1;
    if (done >= cap) continue;
    if (p._sceneMonth === stamp(s) - 1) continue;          // not two months running
    const left = Math.max(1, p.monthsLeft || 1);
    // Spread them: the fewer months left, the likelier the next one is now.
    if (!chance(Math.min(70, 22 + (cap - done) * 14 + (left <= 2 ? 25 : 0)))) continue;
    const pool = poolFor(s, p).filter((id) => !(p._scenes || []).includes(id));
    if (!pool.length) continue;
    const id = pick(pool);
    p._sceneMonth = stamp(s);
    (p._scenes = p._scenes || []).push(id);
    const sc = SCENES[id];
    s.scene = { setId: p.id, id, game: sc.game, label: sc.label, hint: sc.hint,
      title: p.title, role: p.role, genre: p.genre, director: lead(p).name || 'the director',
      line: sc.line(p), difficulty: difficulty(s, p, id) };
    return s;
  }
  return s;
}
// The day is done. quality is 0..100 — what the game gave back.
export function resolveScene(s, quality) {
  const sc0 = s.scene; if (!sc0) return s;
  s.scene = null;
  const p = setById(s, sc0.setId);
  const sc = SCENES[sc0.id] || SCENES.mark;
  const q = clamp(quality);
  if (!p) return s;
  const d = lead(p);
  // The picture. A good day is worth more than a month of turning up; a bad one costs.
  const swing = q >= 88 ? rint(12, 18) : q >= 70 ? rint(7, 11) : q >= 45 ? rint(2, 5) : q >= 25 ? -rint(2, 5) : -rint(6, 11);
  p.meter = clamp((p.meter || 20) + swing);
  p._workedMonth = stamp(s);
  if (d && d.name) d.bond = clamp((d.bond || 50) + (q >= 80 ? rint(4, 8) : q >= 50 ? rint(1, 3) : -rint(3, 7)));
  // A day that everybody on set will talk about. This is the thing the critics name.
  let moment = null;
  if (q >= 88) {
    moment = MOMENT[sc0.id] ? MOMENT[sc0.id](sc0) : `the ${sc.label.toLowerCase()}`;
    (p.moments = p.moments || []).push(moment);
    addTimeline(s, `${sc.label}: you got it in one, and the set went quiet. ${d.name || 'The director'} watched it twice on the monitor.`);
  } else if (q < 25) {
    addTimeline(s, `${sc.label}: eleven takes and they moved on without it. ${d.name || 'The director'} did not say anything.`, true);
  }
  // What the day costs you, beyond the work.
  if (sc.draining) s.strain = clamp((s.strain || 0) + (q >= 70 ? 3 : 6));
  if (sc.risky && q < 30) {
    // You landed badly. Not the end of anything, but you feel it for a while.
    s.health = clamp((s.health || 100) - rint(4, 9));
    s.strain = clamp((s.strain || 0) + rint(4, 8));
    addTimeline(s, 'You landed badly. Ice, a doctor on set, and the rest of the week hurts.', true);
  }
  // And what you learned. A hard day done well is the only thing that moves the craft here.
  if (q >= 80) { const cap = skillCap(s); if ((s.acting || 0) < cap) s.acting = Math.min(cap, (s.acting || 0) + (sc.hard ? 1 : 0.5)); }
  s.lastEvent = `${sc0.title} — ${sc.label.toLowerCase()}.\n\n${
    q >= 88 ? `They printed the first one. ${d.name || 'The director'} came over afterwards, which they do not do.`
    : q >= 70 ? 'Three takes and it was there. A good day, and everybody knew it.'
    : q >= 45 ? 'You got it in the end. Nobody will remember the day either way.'
    : q >= 25 ? 'It never quite landed. They have enough to cut around it.'
    : 'It did not work. They moved on, and the schedule moved with them.'}${
    moment ? `\n\nThat take is going in the trailer.` : ''}`;
  return s;
}
// The sentence a critic gets to use, if the day was good enough to earn one.
const MOMENT = {
  mark: () => 'a single unbroken move through the whole scene',
  takes: () => 'a performance that clearly found itself in the room',
  monologue: () => 'a four-minute monologue played in one',
  tears: () => 'a breakdown that arrives on the word and not a beat before',
  stunt: () => 'a stunt the actor plainly did themselves',
  improv: () => 'a line that was obviously not in the script',
  oner: () => 'a six-minute take with no cut in it',
  night: () => 'a night sequence shot for real, in the rain',
};
