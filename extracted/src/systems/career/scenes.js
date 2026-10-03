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
// Six lines on a day print this name. A set without a crew — an old save, a fixture, a
// picture rebuilt by a migration — printed "undefined came over afterwards", which is the
// kind of thing a player screenshots.
const lead = (p) => { const c = ((p && p.crew) || [])[0]; return c && c.name ? c : { ...(c || {}), name: 'The director' }; };
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
  // The three thinking days. Everything above is reaction and precision; these are the
  // work. Written per shoot from the picture itself — career/scenework.js.
  order: {
    game: 'chrono', label: 'Out of order',
    line: (p) => `Nothing is being shot in the order it happens. Six scenes today, and only you have to hold which of them she already knows.`,
    hint: 'Tick the scenes that come after she finds out.',
    when: () => true, weight: 3,
  },
  reading: {
    game: 'lines', label: 'Three lines are yours',
    line: (p) => `The writer is on a plane and three lines are missing off the page. ${lead(p).name} says do what you think.`,
    hint: 'There is no right line. There is one person saying all three.',
    when: (s, p) => soft(p.genre) || p.scale === 'prestige' || p.scale === 'indie' || p.scale === 'festival', weight: 3,
  },
  why: {
    game: 'motive', label: 'Why does she do it',
    line: (p) => `${lead(p).name} will not roll until you answer one question, and then they will spend the day checking whether you meant it.`,
    hint: 'Any answer is defensible. Only one of them is yours.',
    when: (s, p) => p.tier !== 'supporting' || p.scale === 'prestige', weight: 3,
    hard: true,
  },
  // The five that are a puzzle. Maxi asked for game-shaped ones on top of the thinking
  // days — "like minesweeper or battleship" — and the rule is the same: the mechanic has
  // to BE the job. See ui/components/ScenePuzzles.jsx.
  boom: {
    game: 'frame', label: 'Something in the shot',
    line: (p) => `The operator has been through the setups and there is a boom, or a cable, or somebody's reflection in more of them than anybody wants to admit.`,
    hint: 'A clean setup says how many around it are spoiled. Flag the spoiled ones.',
    when: () => true, weight: 3,
  },
  key: {
    game: 'light', label: 'Find your light',
    line: (p) => `${lead(p).name} has lit it and will not tell you where to stand. From in here you cannot see it at all.`,
    hint: 'Stand somewhere. They will say how far off you are.',
    when: () => true, weight: 3,
  },
  assembly: {
    game: 'cut', label: 'In the cutting room',
    line: (p) => `They have let you see the assembly. It is nearly right and two of the shots are the wrong way round, and everybody can feel it and nobody can say which.`,
    hint: 'Swap two at a time. You do not get many.',
    when: (s, p) => p.scale === 'prestige' || p.scale === 'indie' || p.scale === 'festival' || p.tier !== 'supporting', weight: 2,
  },
  read: {
    game: 'pairs', label: 'The table read',
    line: (p) => `Everybody round one table for the first time. Two of the lines on the page are almost the same sentence.`,
    hint: 'Match every line to whoever says it.',
    when: () => true, weight: 3,
  },
  sheet: {
    game: 'nono', label: 'The take sheet',
    line: (p) => `Twenty-five takes and a script supervisor's notes that say how many good ones ran together, and nothing else.`,
    hint: 'The numbers are runs of good takes, by row and by column.',
    when: (s, p) => p.scale !== 'episode' && p.scale !== 'oneoff', weight: 2,
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

// ── how each of them is actually played ───────────────────────────────────────
// Maxi, looking at a nonogram: "вот как играть это, каждую игру надо объяснять?" Yes, and it
// was not being done. Every scene had a `hint`, and the hints are mood — "the numbers are runs
// of good takes" tells you what you are looking at and nothing about what to DO. For a timing
// bar that is fine, because a bar moving across a green band explains itself. For a nonogram
// it is not: the rule that makes it solvable is that "1 1" means two separate runs with at
// least one bad take between them, and nobody who has not met one before will guess that.
//
// Rules belong to the MECHANIC, not the scene — sixteen scenes share twelve games, and the
// take sheet and the crossword are the same puzzle wearing different clothes.
// Written from the components, not from memory. The first pass of this had a long-press in
// FrameCheck, a probe in FindTheLight, training widening the timing band, "one bad take ends
// the scene" for a game that scores it zero, and a motive puzzle described as one question with
// four answers when it is a consistency test across three. Every one of those was invented, and
// a rule that is wrong is worse than no rule: the player trusts it and loses the scene by it.
// If one of these games changes, this changes with it.
export const RULES = {
  timing: ['A marker runs back and forth across the bar. Tap the bar to stop it.',
    'Anywhere in the green is a take, and dead centre is the best one.',
    'The harder the day, the narrower the green.'],
  grid: ['Twelve takes. Most of them work, some fall flat, and you cannot tell which until you tap it.',
    'The more that work, the better the scene — but one that falls flat and the whole thing is a zero.',
    'The first is always safe. After that you can stop and keep what you have at any point.'],
  rhythm: ['A line appears and you press Say it. Then the next one.',
    'The sooner after it appears, the better it lands. A line you never press is a line you dropped.'],
  hold: ['Holding lifts the mark. Letting go lets it fall, and it drifts on its own besides.',
    'Keep it in the gold band. You are scored on how much of the take it spent in there, not on where it ends up.'],
  keys: ['The sequence plays once. Watch it, then tap it back in order.',
    'There is a clock, and one wrong move ends the take where it stands.'],
  quick: ['Three ways to play it and a few seconds to choose. None of them is wrong on the page.',
    'Letting the clock run out is worse than any of them.'],
  chrono: ['Six scenes in the order they are being SHOT, which is not the order they happen.',
    'Tick every one that takes place AFTER she finds out, and leave the rest alone.',
    'All six right is a different take from five.'],
  lines: ['Three lines are missing and you choose them on the day.',
    'No option is wrong. What is wrong is three that sound like three different people. Pick a reading and hold it for all three.'],
  motive: ['First: why she does it. Every answer is defensible, so pick the one you believe.',
    'Then the day asks you twice more. You are not scored on which motive you chose, only on whether the beats after it were played by the person who chose it.'],
  frame: ['A grid of camera setups. Some have a boom or a cable in shot and are spoiled.',
    'The ones the operator has cleared show a number: how many of the eight touching them are spoiled.',
    'The rest show a ?. Flag the spoiled ones among those, and leave the clean ones alone: a wrong flag costs exactly what a miss costs.'],
  light: ['The key is on one square and you cannot see it from in here.',
    'Stand somewhere and they tell you how close: warm is one square off, cool is two, dark is further.',
    'They never tell you which direction. A few goes, then they shoot it where you are standing.'],
  cut: ['The assembly, shot by shot, in the wrong order. Tap two shots to swap them.',
    'Three or four swaps, and fewer is better — lock it as soon as it reads right.'],
  pairs: ['Every line on the page and everybody at the table, face down.',
    'Turn over a line and then whoever says it. Wrong and they both turn back, and every wrong pair costs you.'],
  nono: ['Twenty-five takes in a grid, and the numbers are RUNS of good ones.',
    'A 3 on a row means three good takes together somewhere in it.',
    '1 1 means two runs of one, with at least one bad take between them.',
    'Tap a square to mark it good. Any answer that fits every number counts.'],
};
export function rulesFor(game) { return RULES[game] || null; }

// Which scenes this shoot can throw at all — rolled once, so a picture has a character.
// ── and what you decide to DO with the day ────────────────────────────────────
// A relayed note, and it is the right criticism: a scene was a test of whether you could play
// it, and never a question about how. The minigames are good and there are sixteen of them, but
// skill alone is a calculator - the interesting part of a shooting day is that somebody has to
// decide what the scene IS, and the director, the studio and you all want different things.
//
// So every day now asks first. The choice changes the size of the window you are playing for,
// what a good day is worth, what a bad one costs, and whether the thing can become a MOMENT at
// all. Going bigger is how a scene ends up in the trailer and how you lose a director.
export const APPROACHES = {
  written: { id: 'written', label: 'Play it as written',
    blurb: 'What is on the page, the way they blocked it. Nobody will be surprised and nobody will be angry.',
    window: 1, up: 1, down: 1, moment: 1, trust: 1, crowd: 0, prestige: 0 },
  bigger: { id: 'bigger', label: 'Make it bigger',
    blurb: 'Take it further than anybody asked. It is how a scene ends up in the trailer, and how you lose a director.',
    window: 1.3, up: 1.5, down: 1.4, moment: 2.2, trust: -1.4, crowd: 4, prestige: -2 },
  back: { id: 'back', label: 'Strip it back',
    blurb: 'Do almost nothing and trust the camera. The people who care will see it. The Friday crowd may not.',
    window: 1.15, up: 1.15, down: 1.1, moment: 1.4, trust: 0.6, crowd: -4, prestige: 3 },
  change: { id: 'change', label: 'Ask to change the scene',
    blurb: 'You have an idea and enough standing to say it out loud. If they go for it the day is yours.',
    needsBond: 62, window: 0.88, up: 1.35, down: 1.2, moment: 1.8, trust: 0.4, crowd: 1, prestige: 2 },
};
export const APPROACH_ORDER = ['written', 'bigger', 'back', 'change'];
// The fourth one is the relationship paying for itself: you cannot ask a director you barely
// know to rewrite the day. Everything else is always open.
export function approachesFor(s, p) {
  const bond = (lead(p) || {}).bond || 0;
  return APPROACH_ORDER.filter((id) => !APPROACHES[id].needsBond || bond >= APPROACHES[id].needsBond)
    .map((id) => ({ ...APPROACHES[id], open: true }))
    .concat(APPROACH_ORDER.filter((id) => APPROACHES[id].needsBond && bond < APPROACHES[id].needsBond)
      .map((id) => ({ ...APPROACHES[id], open: false,
        why: `${(lead(p) || {}).name || 'The director'} does not know you well enough for that yet.` })));
}
export function chooseApproach(s, id) {
  if (!s.scene || s.scene.approach) return s;
  if (!APPROACHES[id]) return s;
  const p = setById(s, s.scene.setId);
  // The gate is only enforceable when the set is in hand. It always is in the game; a probe with
  // a malformed state found that a missing one made this a silent no-op, and a button the player
  // pressed that does nothing at all is worse than a gate that did not check.
  if (p && APPROACHES[id].needsBond && ((lead(p) || {}).bond || 0) < APPROACHES[id].needsBond) return s;
  s.scene.approach = id;
  // The window the minigame gives you moves with the decision, which is the whole point:
  // going bigger is harder to land, and a day you talked through first is easier.
  s.scene.difficulty = Math.max(0.5, Math.min(2.2, (s.scene.difficulty || 1) * APPROACHES[id].window));
  return s;
}

// ── and for anybody who does not want to play the day by hand ─────────────────
// The rule a relayed note put well and which this has to obey: the CHARACTER acts, not the
// person holding the phone. An actor at ninety who is played badly must not become a bad actor,
// and an actor at thirty must not be carried by good reflexes. So auto-resolve reads the craft,
// the preparation, the director and the day, and returns what that person would have got.
// Playing it by hand can beat this - that is the reward for playing it - and can also do worse.
export function autoQuality(s) {
  const sc = s.scene; if (!sc) return 50;
  const p = setById(s, sc.setId);
  const skill = s.dream === "singer" ? (s.singing || 0) : (s.acting || 0);
  const stance = p && p.stance === "allin" ? 7 : p && p.stance === "coast" ? -8 : 0;
  const bond = ((lead(p) || {}).bond || 40) - 40;
  let q = 26 + skill * 0.52 + stance + bond * 0.14;
  q /= Math.max(0.55, sc.difficulty || 1);
  q -= Math.max(0, (s.strain || 0) - 55) * 0.25;
  // A hand played well beats this and a hand played badly loses to it. The ceiling is a little
  // under the top on purpose: the rarest days should belong to somebody who was there for them.
  return clamp(Math.round(q + rint(-7, 7)), 4, 86);
}

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
  if (s.scene) return s;   // one day at a time; everything else queues behind it (App.jsx)
  for (const p of sets(s)) {
    if ((p.prepLeft || 0) > 0 || p.paused) continue;
    const done = (p._scenes || []).length;
    const cap = (p.months || 4) >= 6 ? 3 : (p.months || 4) >= 3 ? 2 : 1;
    if (done >= cap) continue;
    if (p._sceneMonth === stamp(s) - 1) continue;          // not two months running
    const left = Math.max(1, p.monthsLeft || 1);
    // Spread them: the fewer months left, the likelier the next one is now.
    if (!chance(Math.min(70, 22 + (cap - done) * 14 + (left <= 2 ? 25 : 0)))) continue;
    let pool = poolFor(s, p).filter((id) => !(p._scenes || []).includes(id));
    if (!pool.length) continue;
    if (!(p._scenes || []).length) {
      const fresh = pool.filter((id) => SCENES[id].game !== 'timing' && SCENES[id].game !== 'grid');
      if (fresh.length) pool = fresh;
    }
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
// For the on-set card: how many days this shoot has thrown, how many it has left in it,
// and what the good ones left on the film.
export function sceneState(s, p) {
  if (!p) return null;
  const done = (p._scenes || []).length;
  const cap = (p.months || 4) >= 6 ? 3 : (p.months || 4) >= 3 ? 2 : 1;
  const justHad = p._sceneMonth === stamp(s);
  return {
    done, cap, left: Math.max(0, cap - done),
    moments: p.moments || [],
    days: (p._sceneLog || []).map((x) => ({ label: x.label, q: x.q,
      word: x.q >= 88 ? 'printed the first one' : x.q >= 70 ? 'got it in three' : x.q >= 45 ? 'got there in the end' : x.q >= 25 ? 'never quite landed' : 'they moved on without it' })),
    line: done >= cap ? 'The big days on this one are shot.'
      : justHad ? 'That was today. The next one is not this month.'
      : done === 0 ? `${cap} day${cap === 1 ? '' : 's'} on this shoot will be a scene, not a month. They come when they come.`
      : `${cap - done} more day${cap - done === 1 ? '' : 's'} like that to come.`,
  };
}
export function resolveScene(s, quality) {
  const sc0 = s.scene; if (!sc0) return s;
  s.scene = null;
  const p = setById(s, sc0.setId);
  const sc = SCENES[sc0.id] || SCENES.mark;
  const q = clamp(quality);
  if (!p) return s;
  (p._sceneLog = p._sceneLog || []).push({ id: sc0.id, label: sc.label, q: Math.round(q) });
  const d = lead(p);
  // The picture. A good day is worth more than a month of turning up; a bad one costs.
  const ap = APPROACHES[sc0.approach] || APPROACHES.written;
  let swing = q >= 88 ? rint(12, 18) : q >= 70 ? rint(7, 11) : q >= 45 ? rint(2, 5) : q >= 25 ? -rint(2, 5) : -rint(6, 11);
  // The decision pays and charges on different scales, which is what makes it a decision: going
  // bigger is worth half again when it lands and costs nearly half again when it does not.
  swing = swing > 0 ? swing * ap.up : swing * ap.down;
  // Maxi: "once players get good at these, will every film be great?" He was right to ask.
  // Measured: a master with the best script, nailing every day, was hitting 76 per cent of
  // the time — and the same actor playing the days badly hit 15. Sixty-one points of hit
  // rate on three minigames is too much of the film.
  //
  // So a good day is worth most on a picture that needs one. The third time you get it in
  // one, the film is already as good as it is going to be — you cannot keep making it
  // better, and everybody who has been on a set that was working knows that. A bad day
  // always costs full price, because that is also true.
  const room = clamp(1 - Math.max(0, (p.meter || 20) - 55) / 60, 0.3, 1);
  if (swing > 0) swing = Math.max(1, Math.round(swing * room));
  p.meter = clamp((p.meter || 20) + swing);
  p._workedMonth = stamp(s);
  // The director. A day done as written buys trust whatever happens; a day you took somewhere
  // they did not ask for buys a great deal of it if it works and burns it if it does not.
  if (d && d.name) {
    const base = q >= 80 ? rint(4, 8) : q >= 50 ? rint(1, 3) : -rint(3, 7);
    const shift = ap.trust >= 0 ? base * ap.trust : (q >= 80 ? base * 1.5 : base * Math.abs(ap.trust));
    d.bond = clamp((d.bond || 50) + Math.round(shift));
  }
  // A day that everybody on set will talk about. This is the thing the critics name.
  // What the day leaves on the finished picture beyond the number: whether the room liked it,
  // and whether it is the kind of thing that wins anything. Both are read at release.
  if (ap.crowd) p.sceneCrowd = (p.sceneCrowd || 0) + ap.crowd * (q >= 70 ? 1 : 0.4);
  if (ap.prestige) p.prestigeScore = clamp((p.prestigeScore || 50) + ap.prestige * (q >= 70 ? 1 : 0.3));
  let moment = null;
  // Going bigger is how a take ends up in a trailer, and it is the only way the bar comes down.
  const momentAt = Math.max(72, 88 - (ap.moment - 1) * 13);
  if (q >= momentAt) {
    moment = MOMENT[sc0.id] ? MOMENT[sc0.id](sc0) : `the ${sc.label.toLowerCase()}`;
    (p.moments = p.moments || []).push(moment);
    addTimeline(s, `${sc.label}: you got it in one, and the set went quiet. ${d.name || 'The director'} watched it twice on the monitor.`);
  } else if (q < 25) {
    addTimeline(s, `${sc.label}: eleven takes and they moved on without it. ${d.name || 'The director'} did not say anything.`, true);
  }
  // What the day costs you, beyond the work.
  if (sc.draining) s.strain = clamp((s.strain || 0) + (q >= 70 ? 3 : 6));
  if (sc.risky && q < 30) {
    // You landed badly. Not the end of anything, but you feel it for a while — and the unit
    // stands around for a fortnight waiting for you, which is a thing other people remember.
    s.health = clamp((s.health || 100) - rint(4, 9));
    s.strain = clamp((s.strain || 0) + rint(4, 8));
    const days = rint(5, 16);
    p.lostDays = (p.lostDays || 0) + days;
    p.stability = clamp((p.stability ?? 70) - rint(6, 14));
    // Past about a fortnight it is not a delay any more, it is another month of shooting.
    if (days >= 11) p.monthsLeft = (p.monthsLeft || 1) + 1;
    addTimeline(s, `You landed badly. Ice, a doctor on set, and ${days} days the production will not get back.`, true);
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
