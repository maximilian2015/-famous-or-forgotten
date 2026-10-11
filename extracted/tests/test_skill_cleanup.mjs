// Two loose ends from the 11 Oct skill audit (docs/handoffs/2026-10-11-skill-progression-audit.md):
//   - training had a "half the gain past 70" rule it could never reach, because lessons stop at
//     40. It is gone; what a session teaches is the roll, the discipline point, and the cap.
//   - the theatre run in a declining career was the one way past the talent ceiling the
//     Training screen draws in gold. It stops there now, like every other way of getting better,
//     and the offer no longer promises "better" to somebody who cannot be.
import { train, sessionGain, gainRange, SCHOOLS } from '../src/systems/career/training.js';
import { skillCap, LESSON_CAP } from '../src/systems/career/actions.js';
import { laterOutcome, LATER } from '../src/systems/career/decline.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ name: 'Mira Vale', ageY: 50, stage: 'career', dream: 'actor', fame: 30, respect: 20, acting: 20, talent: 72, discipline: 40, mental: 60, cash: 100000,
  ap: 100, apMax: 100, timeline: [], year: 2070, month: 2, offers: [], ...over });
const realRandom = Math.random;
const pinned = (v, fn) => { Math.random = () => v; try { return fn(); } finally { Math.random = realRandom; } };

// ── training: the roll, the discipline point, the cap — nothing else ─────────
{
  const coach = SCHOOLS.find((x) => x.id === 'coach');
  for (const acting of [0, 10, 25, 35, 38, 39.5]) {
    const room = Math.ceil(LESSON_CAP - acting);
    const [lo, hi] = gainRange(st({ acting }), coach);
    ok(`at ${acting}: a session teaches the school's range, up to what is left below 40`, lo === Math.max(1, Math.min(coach.gain[0], room)) && hi === Math.max(1, Math.min(coach.gain[1], room)), `${lo}–${hi}`);
  }
  const s = st({ acting: 30 }); pinned(0.999, () => train(s, 'coach'));
  ok('a real session at the top of the roll teaches the top of the range', s.acting === 30 + coach.gain[1], String(s.acting));
  const at40 = st({ acting: 40 }); const cash = at40.cash; train(at40, 'academy');
  // Why the rule could go without changing a single session: no lesson is ever given at 70.
  ok('at 40 lessons refuse, before charging anything — so no lesson is ever given past 70', at40.acting === 40 && at40.cash === cash);
  ok('below 40 a session is the roll and the discipline point, nothing taken off', sessionGain(st({ acting: 20 }), 6) === 6 && sessionGain(st({ acting: 20, discipline: 70 }), 6) === 7);
}
// ── the theatre run stops at the talent ceiling ──────────────────────────────
{
  const cap = skillCap(st());
  const below = st({ acting: cap - 10 }); pinned(0.999, () => laterOutcome(below, 'stage'));
  ok('well below the ceiling, a theatre run still makes you better', below.acting > cap - 10 && below.acting <= cap, `${cap - 10} → ${below.acting}`);
  const near = st({ acting: cap - 1 }); pinned(0.999, () => laterOutcome(near, 'stage'));
  ok('one point below it, it takes you to the ceiling and no further', near.acting === cap, `${cap - 1} → ${near.acting} (cap ${cap})`);
  const at = st({ acting: cap }); pinned(0.999, () => laterOutcome(at, 'stage'));
  ok('at the ceiling it does not move', at.acting === cap);
  ok('and the standing it buys is still bought', at.respect > 20);
  ok('the offer promises "better" only to somebody with room to grow', /better afterwards/.test(LATER.stage.note(st({ acting: cap - 10 }))) && !/better afterwards/.test(LATER.stage.note(st({ acting: cap }))));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
