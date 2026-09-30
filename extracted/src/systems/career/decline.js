// The other half of the title.
//
// Maxi, a long time ago: "the whole game is on Famous and there is nothing on Forgotten."
// And an outside reading of the career system, arriving at the same place from the other
// direction: a decline should not be a worse version of the same screen. It should open a
// door that was never there when you were working.
//
// The machinery for falling already existed and it was never the problem. relevanceDrift
// takes the top off a name every month, standing slips without recent work, hype decays in
// days, and the board thins as your reach does. What was missing is that going down produced
// NOTHING — fewer of the same offers, and then no offers, and then a player watching a number
// get smaller with nothing to press.
//
// So: the market that only exists on the way down. A convention hall, a reality format, a
// horror sequel shot in nineteen days, the mother of whoever is famous this year, a stage in
// a city nobody covers. None of it is what you were doing, and every one of them is a real
// working life that real people have.
//
// And scattered among them, rarely, the thing that makes the whole half worth playing: a
// first-time director with a script that is better than anything you were sent at your peak,
// offering thirty-two thousand. A player who used to be paid eight million has to decide,
// and there is no correct answer, which is the point.
import { uid } from '../../engine/id.js';
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { inCareer } from '../../engine/stage.js';
import { newTitle } from '../world/titles.js';
import { personName, namesInUse } from '../world/names.js';
import { setFame, setRespect } from '../meta/status.js';
import { addHype } from '../meta/hype.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);

// ── where you actually are ────────────────────────────────────────────────────
// Being a former star and being forgotten are different states and the game only had one of
// them. The difference is whether people still know the name — not whether anybody rings.
//
//   fame 82, nothing for four years   FORMER STAR.  Everybody knows you. Nobody calls.
//   fame 19, nothing for nine years   FORGOTTEN.    They would have to be told who you were.
export const STATES = {
  climbing: { label: 'On the way up', note: 'Nobody has decided about you yet, which is the best thing about it.' },
  hot: { label: 'Wanted', note: 'Everything is being sent to you, and none of it will be next year.' },
  steady: { label: 'Working', note: 'Not the name on the poster and never out of work, which is most careers and none of the films about them.' },
  cooling: { label: 'Cooling', note: 'The calls are the same people saying the same warm things about nothing in particular.' },
  fading: { label: 'Fading', note: 'What arrives now is not what used to arrive, and the difference is not subtle.' },
  former: { label: 'A former star', note: 'Everybody knows the name. Nobody in this business has a use for it this year.' },
  forgotten: { label: 'Forgotten', note: 'They would have to be told who you were, and then they would say ah, of course.' },
};

export function idleMonths(s) { return s._idleMonths || 0; }
export function lastGood(s) {
  const good = (s.filmography || []).filter((c) => !c.minor && !c.running && (c.rating || 0) >= 62);
  if (!good.length) return null;
  return good.reduce((a, b) => ((b.year || 0) > (a.year || 0) ? b : a));
}
export function yearsSinceGood(s) {
  const c = lastGood(s);
  return c ? Math.max(0, (s.year || 0) - (c.year || 0)) : 99;
}
// Two in a row is a wobble; three is a reputation. The business counts.
export function flopStreak(s) {
  const done = (s.filmography || []).filter((c) => !c.minor && !c.running && c.year != null)
    .sort((a, b) => (b.year || 0) - (a.year || 0) || (b.closedAt || 0) - (a.closedAt || 0));
  let n = 0;
  for (const c of done) {
    const bad = c.verdict === 'bomb' || c.verdict === 'ignored' || (c.rating || 0) < 45;
    if (!bad) break;
    n++;
  }
  return n;
}

export function stateOf(s) {
  if (!inCareer(s)) return null;
  const fame = s.fame || 0, peak = s.peakFame || 0;
  const idle = idleMonths(s), quiet = yearsSinceGood(s);
  const fell = peak >= 35 && fame < peak * 0.45;
  // Forgotten is about the NAME. Former is about the phone.
  if (fell && fame < 18 && quiet >= 6) return 'forgotten';
  if (fell && quiet >= 3) return 'former';
  if (peak >= 30 && (fame < peak * 0.7 || quiet >= 3) && idle >= 10) return 'fading';
  if (peak >= 30 && (fame < peak * 0.85 || quiet >= 2)) return 'cooling';
  if (fame >= 70 || (s.media || 0) >= 45) return 'hot';
  if (fame >= 25) return 'steady';
  return 'climbing';
}
export function isDeclining(s) {
  const k = stateOf(s);
  return k === 'cooling' || k === 'fading' || k === 'former' || k === 'forgotten';
}

// ── the market that only exists down here ─────────────────────────────────────
// Every one of these is a real working life. Nobody in them is a failure; they are simply
// not what the person on the way up imagined, which is the whole of it.
export const LATER = {
  convention: {
    label: 'A convention', min: 'former', pay: [4000, 14000], months: 1, scale: 'oneoff',
    line: (s) => `A hall off a motorway, a table, and four hundred people who have waited a very long time to tell you what that film meant to them when they were eleven.`,
    note: 'Two days. The queue is longer than anybody warned you and every single one of them is kind.',
  },
  reality: {
    label: 'A reality format', min: 'fading', pay: [40000, 160000], months: 3, scale: 'oneoff',
    line: (s) => `A format. Twelve people you half recognise, a house, and a production team whose whole job is to make you interesting by Thursday.`,
    note: 'Everybody says it is beneath them and everybody has done one. Fame goes up. What kind of fame is the question.',
  },
  horror: {
    label: 'A horror sequel', min: 'fading', pay: [30000, 120000], months: 2, scale: 'small',
    line: (s) => `The fifth one. Nineteen days, a house in the woods, and a part written as "the older woman who knows what happened here".`,
    note: 'It will be on a streamer by spring and somebody will be genuinely pleased to see you in it.',
  },
  parent: {
    label: 'The parent of the new one', min: 'cooling', pay: [60000, 400000], months: 3, scale: 'feature',
    line: (s) => `Somebody twenty-three is carrying a studio picture and they want you as the mother. Four scenes, one of them very good, and your name below the title for the first time in your life.`,
    note: 'It is a real part in a real film. It is also the sentence that ends one half of a career and starts the other.',
  },
  stage: {
    label: 'A theatre', min: 'cooling', pay: [18000, 60000], months: 4, scale: 'festival',
    line: (s) => `A run somewhere nobody sends a critic from London. Eight shows a week, a dressing room with a window, and an audience that has paid to be there.`,
    note: 'Nobody will see it who can give you a job. You will be better afterwards than you have been in ten years.',
  },
  tellAll: {
    label: 'The interview', min: 'former', pay: [25000, 90000], months: 1, scale: 'oneoff',
    line: (s) => `They want the whole thing: the marriage, the year you do not talk about, the one you fell out with. Two hours, unedited, and they have already written the headline.`,
    note: 'It pays, it puts your name back in the world for a fortnight, and you will not get to decide which fortnight.',
  },
};
export const LATER_IDS = Object.keys(LATER);
const ORDER = ['climbing', 'steady', 'hot', 'cooling', 'fading', 'former', 'forgotten'];
function deepEnough(state, min) { return ORDER.indexOf(state) >= ORDER.indexOf(min); }

// ── and the one that is not like the others ───────────────────────────────────
// The reason this half of the game exists. A first film, no money, and a script better than
// anything you were sent when everybody wanted you.
export function theScript(s) {
  const dir = personName(chance(50) ? 'female' : 'male', namesInUse(s));
  return {
    id: uid(s, 'tiny'), kind: 'tiny', via: 'letter', from: dir, director: dir,
    projectTitle: newTitle(s, 'Drama'), role: 'Supporting', type: 'Feature Film', genre: 'Drama',
    scale: 'festival', tier: 'supporting', months: rint(2, 3), fame: 2,
    salary: rint(24, 48) * 1000,
    prestigeScore: rint(84, 95), stability: rint(40, 70), deadline: rint(2, 3),
    note: `${dir} has not made anything. The script arrived in an envelope with a handwritten letter, and it is better than anything you were sent in the years when everybody wanted you. They can pay you thirty-odd thousand and they have asked for you by name, which nobody has done in a while.`,
  };
}

// ── the month ─────────────────────────────────────────────────────────────────
export const LATER_EVERY = 5;
export function declineTick(s) {
  if (!inCareer(s)) return s;
  const state = stateOf(s);
  if (!isDeclining(s)) return s;
  if ((s.offers || []).length >= 3) return s;
  if ((s._laterAt || 0) > stamp(s) - LATER_EVERY) return s;

  // The rarest thing first, and only once it is genuinely quiet — a letter like that does not
  // arrive while you are still turning things down.
  if ((state === 'fading' || state === 'former') && (s.respect || 0) >= 30 && chance(9)) {
    s._laterAt = stamp(s);
    (s.offers = s.offers || []).push(theScript(s));
    addTimeline(s, `A script arrived in an envelope.`);
    s.lastEvent = `An envelope, with a letter in it written by hand. A first-time director you have never heard of, a part that is not the lead, and thirty-odd thousand pounds — and the script is better than anything anybody sent you in the years when the phone did not stop.`;
    return s;
  }

  const open = LATER_IDS.filter((id) => deepEnough(state, LATER[id].min));
  if (!open.length) return s;
  if (!chance(34)) return s;
  const id = pick(open);
  const k = LATER[id];
  s._laterAt = stamp(s);
  const fee = rint(k.pay[0], k.pay[1]);
  (s.offers = s.offers || []).push({
    id: uid(s, 'late'), kind: 'later', later: id, via: 'agent',
    projectTitle: k.label, role: k.label, type: k.label, genre: 'Commercial',
    scale: k.scale, tier: 'supporting', months: k.months, fame: id === 'reality' ? 6 : 1,
    salary: fee, prestigeScore: id === 'parent' ? rint(45, 65) : rint(8, 24),
    stability: 90, deadline: rint(2, 3),
    note: `${k.line(s)} ${k.note}`,
  });
  addTimeline(s, `${k.label} came in.`);
  return s;
}

// ── and what each of them actually does to you ────────────────────────────────
// An outside reading, after the market went in: "do not add twenty more low-end jobs —
// make the consequences deeper, so that these can lead in different directions." Which is
// the difference between a set of buttons and a second half of a career. So none of them
// pays the same coin, and two of them can turn into something.
export function laterOutcome(s, id) {
  const k = LATER[id];
  if (!k) return s;
  const out = { id };
  if (id === 'convention') {
    // Money, and the discovery that the people who loved you never stopped. It does
    // nothing at all for whether anybody in the business rings, and that is the point of it.
    setRespect(s, (s.respect || 0) + 1);
    addHype(s, 4, 'hit');
    out.line = `Four hundred people, a queue that went round the building, and a woman of forty who cried and apologised for crying. Nobody in this industry will hear about it and every one of them meant it. You are going to think about this for a while.`;
    out.tone = 'warm';
  }
  if (id === 'reality') {
    // The loudest thing available and the most expensive in the other currency.
    setFame(s, (s.fame || 0) + rint(5, 11));
    addHype(s, rint(30, 55), 'hit');
    setRespect(s, (s.respect || 0) - rint(3, 7));
    out.line = `Eleven weeks, and by the fourth everybody who had forgotten you knows your name again. Your face is on a bus. Two people who used to send you scripts have made the same joke about it in print, and your agent says the word "visibility" a great many times without once saying "parts".`;
    out.tone = 'loud';
  }
  if (id === 'horror') {
    // Usually nothing. And once in a while, the thing nobody could have arranged.
    if (chance(14)) {
      setFame(s, (s.fame || 0) + rint(6, 12));
      setRespect(s, (s.respect || 0) + rint(2, 5));
      addHype(s, rint(25, 45), 'hit');
      s._cultHit = stamp(s);
      out.line = `It was nineteen days in a house in the woods and it has become the film of the year for a certain kind of person. Somebody cut your one good scene to music and it has been watched eleven million times. A director you have actually heard of used the word "extraordinary" about a horror sequel, in public, on purpose.`;
      out.tone = 'lucky';
    } else {
      addHype(s, 2, 'hit');
      out.line = `It went out on a streamer in March and did what those do. Somebody was pleased to see you. That is the whole of it, and the money was real.`;
      out.tone = 'flat';
    }
  }
  if (id === 'stage') {
    // Nobody who can give you a job will see it, and you will be better than you have been
    // in ten years — which is the sort of thing that reaches the right person eventually.
    setRespect(s, (s.respect || 0) + rint(4, 8));
    s.acting = clamp((s.acting || 0) + rint(2, 4));
    s._stageRun = stamp(s);
    out.line = `Eight shows a week for four months, and by the third you were doing something you have not done since drama school. Nobody who could hire you came. Two people who can did, quietly, on separate Tuesdays, and neither of them said so.`;
    out.tone = 'earned';
  }
  if (id === 'parent') {
    // The sentence that ends one half of a career and starts the other, and it works.
    setFame(s, (s.fame || 0) + rint(3, 7));
    setRespect(s, (s.respect || 0) + rint(1, 3));
    addHype(s, rint(10, 22), 'hit');
    s._visibleAgain = stamp(s);
    out.line = `Four scenes. The one in the kitchen is the best thing in the picture and three separate reviews said so without using the word "returning". You are below the title now. You are also in a film people went to see.`;
    out.tone = 'earned';
  }
  if (id === 'tellAll') {
    // Two hours, unedited, and they have already written the headline. Which way it goes is
    // not entirely yours to decide.
    if (chance(38)) {
      setFame(s, (s.fame || 0) + rint(4, 9));
      addHype(s, rint(35, 60), 'hit');
      setRespect(s, (s.respect || 0) + rint(1, 4));
      out.line = `You answered the thing everybody had decided about you, once, without a lawyer in the room, and it went round the world in a night. The clip has four million views and the comments are — of all things — kind.`;
      out.tone = 'lucky';
    } else {
      setFame(s, (s.fame || 0) + rint(1, 3));
      addHype(s, rint(18, 34), 'scandal');
      setRespect(s, (s.respect || 0) - rint(2, 5));
      out.line = `They ran it under a headline with the words "whatever happened to" in it, and the photograph is from nine years ago. Everything you said was accurate and none of it was the story.`;
      out.tone = 'cold';
    }
  }
  addTimeline(s, `${k.label}. ${out.tone === 'lucky' ? 'And then something happened.' : ''}`.trim());
  s.lastEvent = out.line;
  return s;
}

// For the screen: where you are, and what it means.
export function declineLine(s) {
  const k = stateOf(s);
  if (!k) return null;
  const spec = STATES[k];
  return {
    id: k, label: spec.label, note: spec.note,
    idle: idleMonths(s), quiet: yearsSinceGood(s), streak: flopStreak(s),
    falling: isDeclining(s),
  };
}
