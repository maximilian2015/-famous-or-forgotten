// The Fame screen: the whole ladder, and the two numbers behind it that the player could
// never see. Same rule as the Mental panel — what it prints has to be what the code does.
import { createInitialState } from '../src/state/initialState.js';
import { beginLife } from '../src/systems/life/origin.js';
import { advanceMonth } from '../src/engine/time.js';
import { relevanceDrift } from '../src/engine/economy.js';
import * as S from '../src/systems/meta/status.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
function born(over) {
  const s = createInitialState({ name: 'F', dream: 'actor', created: true });
  beginLife(s);
  return Object.assign(s, { stage: 'career', ageY: 36, year: 2066, month: 0, hasApartment: true,
    livingWith: 'own_place', housing: 'flat', cash: 900000, alive: true, ap: 100, apMax: 100, apMaxEff: 100,
    fame: 60, peakFame: 60, _idleMonths: 12,
    filmography: [{ title: 'x', rating: 80, tier: 'lead', role: 'Lead', year: 2064 }] }, over);
}

// ── every rung says what it opens ──
{
  const missing = S.FAME_TIERS.filter((t) => !(S.TIER_OPENS[t.id] || []).length);
  ok('every rung on the ladder says what it opens', missing.length === 0, missing.map((t) => t.id).join(','));
  ok('and the ladder is the same six rungs it has always been', S.FAME_TIERS.length === 6);
}

// ── media was written everywhere and read nowhere ──
{
  const quiet = born({ media: 0 }), loud = born({ media: 60 });
  const a = quiet.fame, b = loud.fame;
  relevanceDrift(quiet); relevanceDrift(loud);
  const lostQuiet = a - quiet.fame, lostLoud = b - loud.fame;
  ok('being talked about slows how fast you are forgotten', lostLoud < lostQuiet,
    `${lostQuiet.toFixed(2)} vs ${lostLoud.toFixed(2)} a month`);
  ok('and it is not a free pass', lostLoud > lostQuiet * 0.4, lostLoud.toFixed(2));
}
{
  // Or one good night on a sofa would keep you relevant for a decade.
  let t = born({ media: 40 });
  const before = t.media;
  for (let m = 0; m < 12; m++) t = advanceMonth(t);
  ok('attention fades on its own', t.media < before - 5, `${before} → ${Math.round(t.media)}`);
}

// ── what a bad name costs, reported off the code that charges it ──
{
  const clean = born({ scandal: 0 });
  ok('a clean name has nothing to report', S.scandalReport(clean).length === 0);
  const s = born({ scandal: 40 });
  const r = S.scandalReport(s);
  const by = Object.fromEntries(r.map((l) => [l.id, l.why]));
  ok('a scandal is reported in the room', /12 points harder/.test(by.casting || ''), by.casting);
  // systems/career/offers.js: p *= max(0.25, 1 - scandal/90) → 40/90 = 44%
  ok('and in what the agent brings', /44% fewer/.test(by.agent || ''), by.agent);
  ok('and at the table, past 25', !!by.money);
  ok('and in front of an adoption board, past 40', !S.scandalReport(born({ scandal: 30 })).some((l) => l.id === 'adopt')
    && S.scandalReport(born({ scandal: 55 })).some((l) => l.id === 'adopt'));
  ok('and it says how fast it will go', /0.4 a month/.test(by.fade || ''), by.fade);
  const withPub = born({ scandal: 40, staff: { publicist: true } });
  const pub = Object.fromEntries(S.scandalReport(withPub).map((l) => [l.id, l.why]));
  ok('a publicist changes that number', /1.0 a month/.test(pub.fade || ''), pub.fade);
}
{
  // The drift line has to match what relevanceDrift actually takes off you.
  const s = born({ scandal: 45, media: 0 });
  const said = Number((S.scandalReport(s).find((l) => l.id === 'drift').why.match(/by ([\d.]+)/) || [])[1]);
  const before = s.fame;
  relevanceDrift(s);
  const lost = before - s.fame;
  const fromScandal = lost - (before / 55);
  ok('and the drift line matches the real slide', Math.abs(fromScandal - said) < 0.05,
    `said ${said}, scandal took ${fromScandal.toFixed(2)}`);
}

// ── the doors are shown as doors, not as a countdown ──
{
  const nobody = born({ fame: 74, filmography: [{ title: 'x', rating: 60, tier: 'lead', role: 'Lead', year: 2064 }] });
  ok('without a hit the A-list door is shut', !S.alistKey(nobody) && S.fameCeiling(nobody) === S.ALIST_WALL);
  const led = born({ fame: 74, filmography: [{ title: 'x', rating: 88, tier: 'lead', role: 'Lead', year: 2064 }] });
  ok('carrying one opens it', S.alistKey(led) === 'led' && S.fameCeiling(led) === S.ICON_WALL);
  const icon = born({ fame: 89, worldHits: 1, filmography: led.filmography });
  ok('and a world hit opens the last one', S.iconKey(icon) === 'hit' && S.fameCeiling(icon) === 100);
}
// ── standing: read by six things, moved by twelve, and it had no screen at all ──
{
  const s = born({ respect: 64, fame: 62 });
  const by = Object.fromEntries(S.respectReport(s).map((l) => [l.id, l.why]));
  // systems/career/story.js pushOdds: standing = respect * 0.46 + fame * 0.34
  ok('standing says what it is worth in the room', /29 points/.test(by.room || ''), by.room);
  ok('and that it beats fame there', /more than your fame is \(21\)/.test(by.room || ''), by.room);
  // systems/career/negotiate.js: accept += (respect - 40) * 0.12
  ok('and what it is worth at the table', /2\.9 points likelier/.test(by.money || ''), by.money);
  const low = Object.fromEntries(S.respectReport(born({ respect: 20 })).map((l) => [l.id, l.why]));
  ok('and that below forty it costs you money', /harder to move/.test(low.money || ''), low.money);
  ok('sixty is its own way into the elite', /its own way in/.test(by.elite || ''), by.elite);
  const mid = Object.fromEntries(S.respectReport(born({ respect: 30 })).map((l) => [l.id, l.why]));
  ok('and under sixty it counts down to it', /to go/.test(mid.elite || ''), mid.elite);
}
{
  const moves = [...S.RESPECT_MOVES.up, ...S.RESPECT_MOVES.down];
  ok('every way it moves says by how much, what, and why', moves.every((m) => m.by && m.what && m.note),
    JSON.stringify(moves.filter((m) => !(m.by && m.what && m.note))));
  ok('and walking off a shoot is the expensive one', S.RESPECT_MOVES.down.some((m) => m.by === '−9'));
}
// ── standing goes below zero, because a blank name and a bad one are not the same ──
{
  const s = born({ respect: 3 });
  S.setRespect(s, s.respect - 9);            // walking off a shoot
  ok('a bad name goes below zero', s.respect === -6, String(s.respect));
  S.setRespect(s, -900);
  ok('and stops at the floor', s.respect === S.RESPECT_FLOOR, String(s.respect));
  ok('the floor is what an heir can already be born with', S.RESPECT_FLOOR === -40);
  ok('below zero is its own rung', S.respectTier(-6).id === 'careful' && S.respectTier(-20).id === 'avoided');
  ok('and zero is still unproven, not bad', S.respectTier(0).id === 'unproven');
  const by = Object.fromEntries(S.respectReport(born({ respect: -22 })).map((l) => [l.id, l.why]));
  ok('a bad name argues against you in the room', /OFF the odds/.test(by.room || ''), by.room);
  ok('and costs you at the table', /harder to move/.test(by.money || ''), by.money);
}
// ── standing has rungs, and three of the four above zero are real thresholds elsewhere ──
{
  ok('standing has its own ladder', S.RESPECT_TIERS.length === 7);
  const missing = S.RESPECT_TIERS.filter((t) => !(S.RESPECT_OPENS[t.id] || []).length);
  ok('and every rung says what it opens', missing.length === 0, missing.map((t) => t.id).join(','));
  // systems/career/negotiate.js: accept += (respect - 40) * 0.12
  ok('forty is the break-even at the table', S.respectTier(40).id === 'serious' && S.respectTier(39).id === 'reliable');
  // systems/career/access.js: elite = aaa && (fame >= 75 || respect >= 60)
  ok('sixty is the elite route', S.respectTier(60).id === 'name' && S.respectTier(59).id === 'serious');
  // systems/life/arcs.js sellOut: fame >= 55 && respect >= 30
  ok('thirty is the brand-deal arc', S.respectTier(30).id === 'reliable' && S.respectTier(29).id === 'unproven');
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
