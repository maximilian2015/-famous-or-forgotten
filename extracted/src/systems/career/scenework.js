// What the three thinking days are actually made of. The games live in
// ui/components/SceneLogic.jsx; this is the writing they play.
//
// Everything here is generated per shoot from the picture's own premise and character, so
// two films never throw the same day — Maxi's rule for the whole set system: "minigames,
// different every time, so they do not repeat."
import { pick } from '../../engine/rng.js';

const her = (p) => ((p && p.character && p.character.name) ? p.character.name.split(' ')[0] : 'she');
const shuffle = (a) => { const o = [...a]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };

// ── the thing she finds out ───────────────────────────────────────────────────
const REVEALS = [
  { what: 'the letter', early: ['she asks whether the post has come', 'she is still asking after him', 'she tells the neighbour he writes every week'],
    late: ['she has read it twice and put it in a drawer', 'she stops asking after him', 'she is short with the neighbour and does not say why'] },
  { what: 'the diagnosis', early: ['she books the holiday', 'she argues about the kitchen', 'she laughs at something on the radio'],
    late: ['she cancels the holiday without a reason', 'she lets him have the kitchen', 'she leaves the radio on and does not hear a word of it'] },
  { what: 'who he is', early: ['she shakes his hand at the door', 'she offers him the good chair', 'she asks where he grew up'],
    late: ['she does not sit down while he is in the room', 'she counts the money twice', 'she asks nothing and waits'] },
  { what: 'the money is gone', early: ['she orders the second bottle', 'she promises the boy a bicycle', 'she is generous with the tip'],
    late: ['she says she is not hungry', 'she changes the subject when the boy asks', 'she pays in coins and apologises'] },
];
// Six scenes, in the order the location was free. Three sit before she knows and three
// after, and the player has to say which is which.
export function chronologyFor(s, p, difficulty = 1) {
  const r = pick(REVEALS);
  const name = her(p);
  // Half the lines are written with "she" and half without, because they read better that
  // way in the table above; the name goes on the front here, so the pronoun comes off.
  const say = (t) => `${name} ${String(t).replace(/^she /, '')}.`;
  const early = shuffle(r.early).slice(0, 3).map((t, i) => ({ text: say(t), pos: i + 1 }));
  const late = shuffle(r.late).slice(0, 3).map((t, i) => ({ text: say(t), pos: i + 5 }));
  return { beats: shuffle([...early, ...late]), reveal: 4, what: r.what };
}

// ── the reading ───────────────────────────────────────────────────────────────
// Three gaps, two readings of the same person. The point is that both columns are
// perfectly good lines — the failure is mixing them.
const PAGES = [
  { cue0: 'He says he came as soon as he heard.', cue1: 'He asks whether she is going to say anything.', cue2: 'He stands up to leave.',
    cold: ['"You heard on Tuesday."', '"I have said it. You were not listening."', '"Shut the gate on your way."'],
    warm: ['"I know. Sit down."', '"I am trying to. Give me a minute."', '"Ring me when you get in."'] },
  { cue0: 'She finds him in the kitchen at two in the morning.', cue1: 'He starts to explain.', cue2: 'The light comes on in the hall.',
    cold: ['"Do not make a thing of it."', '"I do not need the version you have worked out."', '"Go back to bed."'],
    warm: ['"You could not sleep either."', '"Start at the beginning. I have got all night."', '"Leave it on. I like it on."'] },
  { cue0: 'The lawyer puts the paper in front of her.', cue1: 'Her brother says it is what their mother wanted.', cue2: 'They wait for her to sign.',
    cold: ['"Whose handwriting is that."', '"Our mother wanted a great many things."', '"I will read it properly first."'],
    warm: ['"Give me a moment with it."', '"I know she did. That is the hard part."', '"All right. For her."'] },
];
export function linesFor(s, p, difficulty = 1) {
  const page = pick(PAGES);
  const cues = [page.cue0, page.cue1, page.cue2];
  return {
    gaps: cues.map((cue, i) => {
      const opts = [{ text: page.cold[i], tone: 'cold' }, { text: page.warm[i], tone: 'warm' }];
      return { cue, options: Math.random() < 0.5 ? opts : [opts[1], opts[0]] };
    }),
  };
}

// ── the motive ────────────────────────────────────────────────────────────────
// Four readings of the same act, all defensible, and then the day asks twice whether you
// meant it. Nobody is marking the choice; they are marking whether you held it.
const MOTIVES = [
  { id: 'love', text: 'Because she still loves him, and she has not told anybody that in years.' },
  { id: 'fear', text: 'Because she is frightened, and this is the only thing that makes it quieter.' },
  { id: 'pride', text: 'Because she will not be the one who asked. Not once.' },
  { id: 'duty', text: 'Because somebody has to, and everybody else has found a reason not to.' },
];
const BEATS = [
  { cue: 'He is late, and she is waiting in the car.', opts: {
    love: 'She keeps the engine running so it is warm when he gets in.',
    fear: 'She watches the door in the mirror and does not turn round.',
    pride: 'She gives him four minutes and then indicates.',
    duty: 'She goes in and asks the man behind the bar to fetch him.' } },
  { cue: 'Somebody asks her, in front of everybody, why she puts up with it.', opts: {
    love: 'She says something small and true and looks at the table.',
    fear: 'She laughs a beat too late and refills their glass.',
    pride: 'She asks them how their own year has been.',
    duty: 'She says it is nobody’s business and passes the bread.' } },
  { cue: 'The last scene of the day: he says he is sorry.', opts: {
    love: 'She lets it land and does not say anything back.',
    fear: 'She says it is fine, twice, before he has finished.',
    pride: 'She says he is not, and that they both know it.',
    duty: 'She nods and asks what time they are leaving in the morning.' } },
];
export function motiveFor(s, p, difficulty = 1) {
  const four = shuffle(MOTIVES);
  const ids = four.map((m) => m.id);
  const rows = shuffle(BEATS).slice(0, 2).map((b) => ({
    cue: b.cue,
    options: shuffle(ids).map((id) => ({ text: b.opts[id], fits: id })),
  }));
  return {
    question: `${((p && p.crew && p.crew[0] && p.crew[0].name) || 'The director')} wants to know before the first take: why does ${her(p)} do it?`,
    motives: four, beats: rows,
  };
}

// ── the assembly, and the table read ──────────────────────────────────────────
// Two of the five puzzles need writing; the other three are a grid and a number. Both are
// generated from the picture so the same shoot never hands you the same day twice.
const SHOTS = [
  ['She comes through the door and stops.', 'He does not look up.', 'She says his name.',
   'He puts the glass down.', 'Neither of them says anything.', 'She leaves the key on the table.'],
  ['The car pulls in.', 'She checks the mirror and does not get out.', 'A light goes on upstairs.',
   'She gets out.', 'The door is already open.', 'He is standing in the hall.'],
  ['The phone rings.', 'She lets it.', 'It rings again.', 'She answers it and says nothing.',
   'She writes something down.', 'She puts her coat on.'],
  ['He is asleep in the chair.', 'She turns the television off.', 'He wakes and says he was watching it.',
   'She says she knows.', 'He asks what time it is.', 'She does not tell him.'],
];
export function assemblyFor(s, p, difficulty = 1) {
  return { shots: pick(SHOTS) };
}

// The trap is the pair of lines that are almost the same. That is the one that goes wrong
// on the day, every time, and it is the one this is about.
const READS = [
  { who: ['Iris', 'The brother', 'The lawyer'], lines: [
    ['Iris', '"I am not asking you again."'],
    ['The brother', '"I am not going to ask you again."'],
    ['The lawyer', '"Then we are finished here."'],
  ] },
  { who: ['The mother', 'The son', 'The neighbour'], lines: [
    ['The mother', '"You could have told me."'],
    ['The son', '"You could have asked me."'],
    ['The neighbour', '"Everyone on this street knew."'],
  ] },
  { who: ['The detective', 'The witness', 'The brother'], lines: [
    ['The detective', '"Say it again, slowly."'],
    ['The witness', '"I have said it. Slowly."'],
    ['The brother', '"She was with me all night."'],
  ] },
];
export function readFor(s, p, difficulty = 1) {
  const r = pick(READS);
  const rows = r.lines.map(([who, line]) => ({ who, line }));
  // a fourth pair at the harder end, so the sheet is not always three
  if (difficulty > 1.2) rows.push({ who: 'The stranger', line: '"Nobody asked you."' });
  return { pairs: rows };
}
