// Confidence and discipline are not Passport bars (docs/handoffs/2026-10-11-confidence-
// discipline-audit.md): each is shown where it is used, and only as what it really does.
//   - an event that rolls on confidence prints the confidence the roll is worked out from;
//   - a choice that would raise a stat already at the top does not say it raises it;
//   - the training screen's discipline bonus is there exactly when training applies it.
import { ARCS, arcCard, checkOdds, resolveArc } from '../src/systems/life/arcs.js';
import { realDelta } from '../src/systems/life/choiceWords.js';
import { ACTIONS, playOdds } from '../src/systems/career/actions.js';
import { SCHOOLS, train, disciplineBonus, gainRange, sessionGain, DISCIPLINE_LINE } from '../src/systems/career/training.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ name: 'Mira Vale', ageY: 32, stage: 'career', dream: 'actor', fame: 45, respect: 20, charisma: 50, confidence: 47, discipline: 40, mental: 60, scandal: 10, media: 0,
  cash: 100000, acting: 20, ap: 100, apMax: 100, timeline: [], year: 2058, month: 2,
  production: { id: 'p1', title: 'Glass Harbor', genre: 'Thriller', salary: 400000, meter: 50, monthsLeft: 2, months: 6, crew: [{ name: 'Rosalind Varga', bond: 60 }, { name: 'Theo Lark', bond: 40 }] },
  productions: [], ...over });
const open = (s, id) => { const a = ARCS.find((x) => x.id === id); const b = a.build(s); s.pendingArc = { id, speaker: b.speaker, text: b.text, choices: b.choices }; return s.pendingArc; };
const words = (tags) => (tags || []).map((x) => x.t).join('|');

// ── confidence, beside the chance it makes ──────────────────────────────────
{
  const s = st({ confidence: 47 }); const call = arcCard(s, open(s, 'costarWrecked')).choices[1];
  ok('the roll on confidence prints the confidence it is worked out from', call.stat === 'Confidence' && call.statValue === 47, `${call.stat} ${call.statValue}`);
  ok('and the chance beside it is that confidence, through the roll\'s own formula', call.odds === Math.round(checkOdds(s, { stat: 'confidence' })) && call.odds === 58, String(call.odds));
  const t = st({ confidence: 90 }); const call2 = arcCard(t, open(t, 'costarWrecked')).choices[1];
  ok('another actor, another confidence, another chance', call2.statValue === 90 && call2.odds === 84);
  const play = ACTIONS.find((a) => a.id === 'schoolplay');
  const teen = { confidence: 47, charisma: 50, stage: 'teen' };
  ok('the school play says its chance and what it is made of', play.desc(teen).includes(`${Math.round(playOdds(teen))}% you get the part (confidence 47, charisma 50)`), play.desc(teen));
}
// ── nothing claims a rise that cannot happen ────────────────────────────────
{
  const full = st({ confidence: 100 });
  const useIt = arcCard(full, open(full, 'costarWrecked')).choices[2];
  ok('at confidence 100, taking the scene does not say Confidence ↑', !/Confidence/.test(words(useIt.tags)), words(useIt.tags));
  const some = st({ confidence: 98 });
  ok('at 98 it does, because it really goes up', /Confidence ↑/.test(words(arcCard(some, open(some, 'costarWrecked')).choices[2].tags)));
  // And the game agrees: resolve it at 100 and confidence does not move.
  const r = st({ confidence: 100 }); open(r, 'costarWrecked'); resolveArc(r, 2);
  ok('and resolving it at 100 leaves confidence where it was', r.confidence === 100);
  const clean = st({ scandal: 0, fame: 50, respect: 30 }); const pub = arcCard(clean, open(clean, 'firstScandal')).choices[0];
  ok('the same rule for every stat: no "Scandal ↓" when there is no scandal', !/Scandal/.test(words(pub.outcomes[0].tags)), words(pub.outcomes[0].tags));
  ok('the size of the arrow is what would really happen', realDelta(st({ mental: 95 }), 'mental', 20) === 5);
  ok('standing goes through its own write point, which has no ceiling below 100', realDelta(st({ respect: 99 }), 'respect', 5) === 1);
  // A story beat's words go through the same rule.
  const story = arcCard(st({ mental: 100 }), { story: 'agent', beat: 'slip', speaker: 'x', text: 'y', choices: [{ label: 'Rest', shows: { fx: { mental: 4 } } }] });
  ok('and so does a story beat\'s', story.choices[0].tags.length === 0);
}
// ── discipline, on the training screen, exactly when training uses it ───────
{
  const below = st({ discipline: DISCIPLINE_LINE }), above = st({ discipline: DISCIPLINE_LINE + 1 });
  ok('at 65 there is no bonus', disciplineBonus(below) === 0);
  ok('above 65 there is', disciplineBonus(above) === 1);
  const coach = SCHOOLS.find((x) => x.id === 'coach');
  const [lo0, hi0] = gainRange(below, coach), [lo1, hi1] = gainRange(above, coach);
  ok('the range on the screen grows by the bonus, and only above the line', lo1 === lo0 + 1 && hi1 === hi0 + 1, `${lo0}–${hi0} → ${lo1}–${hi1}`);
  // The session itself: with the roll pinned, the point appears exactly when the screen says so.
  const realRandom = Math.random; Math.random = () => 0;
  try {
    const a = st({ discipline: 65 }); train(a, 'coach');
    const b = st({ discipline: 66 }); train(b, 'coach');
    ok('a session above the line teaches the point the screen promised', b.acting - 20 === a.acting - 20 + 1 && b.acting - 20 === gainRange(st({ discipline: 66 }), coach)[0], `${a.acting} vs ${b.acting}`);
  } finally { Math.random = realRandom; }
  // Lessons stop at 40 (actions.js LESSON_CAP); near it the range is what is left to learn.
  const near = st({ discipline: 80, acting: 38 });
  ok('near the end of lessons the range is what is left, bonus or not', gainRange(near, coach)[1] === 2 && sessionGain(near, coach.gain[1]) === 2, JSON.stringify(gainRange(near, coach)));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
