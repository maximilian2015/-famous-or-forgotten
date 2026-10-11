// The small package after the 11 Oct sweep (docs/handoffs/2026-10-11-bug-sweep.md):
//   1. the car's "you arrive differently" was never read by anything; it counts at a door now;
//   2. "forgotten" had two definitions; career/decline.js reads the one in meta/status.js;
//   3. two later offers of one kind in a year were two credits with one name;
//   4. the ambition at ten was meant to lean what comes your way (33dc9c5) and never did.
import { sneakIntoEvent } from '../src/systems/social/events.js';
import { arrivalBonus, THINGS } from '../src/systems/life/money.js';
import { stateOf, declineTick, LATER } from '../src/systems/career/decline.js';
import { isForgotten } from '../src/systems/meta/status.js';
import { tentpoleOdds } from '../src/systems/career/tentpoles.js';
import { refreshCastingPool, leaningPick } from '../src/systems/career/castings.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const realRandom = Math.random;

// ── 1. the car at the door ───────────────────────────────────────────────────
{
  const st = (car) => ({ ap: 100, apMax: 100, mental: 60, scandal: 0, year: 2060, month: 3, timeline: [], things: car ? { car: { paid: 1 } } : {}, events: [{ id: 'e1', name: 'A gala' }] });
  const walk = st(false); sneakIntoEvent(walk, 'e1', 72);
  ok('on foot, 72 on the walk is not enough for the first door', !walk.events[0].door && walk.events[0].doorTried);
  const drive = st(true); sneakIntoEvent(drive, 'e1', 72);
  ok('in the car, the same 72 gets you to the question at the door', drive.events[0].door && drive.events[0].door.stage === 1);
  const crash = st(true); sneakIntoEvent(crash, 'e1', 20);
  ok('the car does not save a walk that fell apart: still filmed on the way out', crash.scandal > 0 && !crash.events[0].door);
  ok('the bonus is the car\'s own number, and the shop says what it is for', arrivalBonus(st(true)) === THINGS.car.night && /first door/.test(THINGS.car.perk || ''));
}
// ── 2. one "forgotten" ───────────────────────────────────────────────────────
{
  // Peak 40, fame 16, nothing good in nine years: the old rule in decline.js called this
  // forgotten (under 18), the rest of the game did not (under 15). Now they agree.
  const s = { stage: 'career', fame: 16, peakFame: 40, year: 2060, filmography: [{ title: 'x', rating: 70, year: 2051 }], _idleMonths: 30 };
  ok('a name at 16 is not forgotten anywhere', !isForgotten(s) && stateOf(s) === 'former', stateOf(s));
  const t = { ...s, fame: 12 };
  ok('at 12 it is forgotten everywhere', isForgotten(t) && stateOf(t) === 'forgotten', stateOf(t));
}
// ── 3. later offers have their own names ─────────────────────────────────────
{
  const titles = [];
  for (let i = 0; i < 40; i++) {
    const s = { stage: 'career', fame: 12, peakFame: 60, respect: 0, year: 2072, month: i % 12, _idleMonths: 40, offers: [], timeline: [], filmography: [{ title: 'Old', rating: 70, year: 2060 }], _titlesUsed: {} };
    Math.random = () => 0.2; try { declineTick(s); } finally { Math.random = realRandom; }
    const o = (s.offers || [])[0]; if (o) titles.push([o.later, o.projectTitle, o.role]);
  }
  ok('a later offer arrived to look at', titles.length > 0, String(titles.length));
  ok('none of them is called only by its kind', titles.every(([id, title]) => title !== LATER[id].label), titles.slice(0, 3).map((x) => x[1]).join(' | '));
  ok('and the kind still reads as the part', titles.every(([id, , role]) => role === LATER[id].label));
  const s = { year: 2072, month: 2, _titlesUsed: {} };
  ok('two theatre runs in a year are two different plays', LATER.stage.title(s) !== LATER.stage.title(s));
}
// ── 4. the ambition at ten leans what comes your way ─────────────────────────
{
  const p = { hard: 1, genre: 'Drama', role: 'Lead' };
  const base = { stage: 'career', fame: 70, peakFame: 70, respect: 50, scandal: 0, year: 2060, month: 0, filmography: [], people: [], acting: 70, looks: 60, charisma: 60 };
  const none = tentpoleOdds({ ...base }, p), star = tentpoleOdds({ ...base, ambition: 'star' }, p), tv = tentpoleOdds({ ...base, ambition: 'tv' }, p);
  ok('the one who wanted the poster is a little likelier on the board', star > none && star <= Math.round(none * 1.2) + 1 && tv === none, `${none} → ${star} (tv ${tv})`);
  // The TV shelf: what is left after the floors leans toward television.
  // The weight itself, exactly: the pick's roll swept across [0, 1), TV at 1.4 against 1 for each
  // of three others is 1.4 in 4.4.
  { let tvHits = 0; const N = 1000; for (let i = 0; i < N; i++) { Math.random = () => (i + 0.5) / N; try { if (leaningPick(['tv', 'film', 'indie', 'day'], (id) => (id === 'tv' ? 1.4 : 1)) === 'tv') tvHits++; } finally { Math.random = realRandom; } }
    ok('the TV shelf weighs 1.4 against 1 among the four', Math.abs(tvHits / N - 1.4 / 4.4) < 0.002, (tvHits / N).toFixed(3)); }
  // And it is wired: most slots are filled to the shelves' floors first, so the lean shows only
  // in what is left — two points or so, measured over enough boards that chance cannot fake it.
  const share = (ambition) => { let tvN = 0, all = 0; for (let i = 0; i < 2000; i++) { const s = { version: 'x', ageY: 28, stage: 'career', dream: 'actor', hasApartment: true, housing: 'room', cash: 5000, mental: 60, health: 80, acting: 60, singing: 0, charisma: 50, looks: 50, luck: 50, scandal: 0, fame: 70, ap: 100, year: 2030, month: 0, filmography: [], discography: [], genreXP: {}, timeline: [], ambition }; refreshCastingPool(s, true); all += s.castingPool.length; tvN += s.castingPool.filter((c) => c.shelf === 'tv').length; } return tvN / all; };
  const a = share(undefined), b = share('tv');
  ok('the one who wanted television sees more of it on the board', b > a, `${(a * 100).toFixed(1)}% → ${(b * 100).toFixed(1)}%`);
  // The reality format, among the later offers. Not sampled — the first version was, at a
  // threshold close to the true ratio, and failed one run in twenty. The pick's own roll is swept
  // across [0, 1) instead (the roll before it, "does an offer come at all", is pinned to yes), so
  // the share is exact: one in six for anybody, 1.5 in 6.5 for the one who wanted to be famous.
  const share2 = (ambition) => {
    let hit = 0; const N = 1000;
    for (let i = 0; i < N; i++) {
      const s = { stage: 'career', fame: 12, peakFame: 60, respect: 0, year: 2072, month: 0, _idleMonths: 40, offers: [], timeline: [], filmography: [{ title: 'Old', rating: 70, year: 2060 }], ambition };
      let call = 0; Math.random = () => (++call === 1 ? 0 : call === 2 ? (i + 0.5) / N : 0.5);
      try { declineTick(s); } finally { Math.random = realRandom; }
      const o = (s.offers || [])[0]; if (o && o.later === 'reality') hit++;
    }
    return hit / N;
  };
  const r0 = share2(undefined), r1 = share2('face');
  ok('anybody is offered the format one time in six', Math.abs(r0 - 1 / 6) < 0.002, r0.toFixed(3));
  ok('the one who wanted to be famous, 1.5 in 6.5', Math.abs(r1 - 1.5 / 6.5) < 0.002, r1.toFixed(3));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
