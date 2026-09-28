// Four things that have to survive the gap between one picture and the next one.
//
// All four were found by an outside audit of contracts and sequels, and all four were the
// same shape of mistake: a value that exists on the first job and does not make it onto the
// second. Two of them were introduced the week this was written, which is the argument for
// the file existing.
import { ensureWorld } from '../src/systems/world/world.js';
import { DIRECTIONS, chooseDirection } from '../src/systems/career/chapter.js';
import { tvMonths, TV_PACE } from '../src/systems/career/franchise.js';
import { hangIt, bubbleTick } from '../src/systems/career/bubble.js';
import { draftContract } from '../src/systems/career/contract.js';

let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.log('  FAIL: ' + msg); fails++; } };

const st = () => {
  const s = { version: 'x', name: 'M', gender: 'female', ageY: 36, stage: 'career', dream: 'actor',
    fame: 68, respect: 52, acting: 72, charisma: 60, looks: 65, luck: 50, scandal: 0, media: 0,
    mental: 80, health: 92, strain: 10, year: 2070, month: 0, timeline: [], filmography: [],
    productions: [], offers: [], releases: [], inbox: [], peakFame: 68, hasApartment: true,
    housing: 'flat', ap: 100, apMax: 100, apMaxEff: 100, cash: 5e6, genreXP: {}, people: [],
    quote: 3e6, awards: { wins: [], nominations: [] }, alive: true, cooldowns: {}, bubbles: [] };
  ensureWorld(s); return s;
};

// ── 1. An option fixes the fee, on film as well as on television ──────────────
// The renewal case was guarded from the day it was written. The sequel carried the same
// optioned flag and nothing read it, so the one deal whose entire point is that the price
// was agreed in advance could be renegotiated upward, twice.
{
  const s = st();
  const feeOf = (o) => (((draftContract(s, o) || {}).clauses) || []).find((c) => c.id === 'fee') || { options: [] };
  const sequel = (extra) => ({ id: 'o1', kind: 'sequel', part: 2, optionParts: 3,
    projectTitle: 'The Picture II', role: 'Lead', type: 'Feature Film', genre: 'Drama',
    scale: 'blockbuster', tier: 'tentpole', salary: 6e6, baseSalary: 6e6, months: 5,
    prestigeScore: 70, stability: 85, deadline: 3, ...extra });

  const locked = feeOf(sequel({ optioned: true }));
  ok((locked.options || []).length === 0, 'an optioned sequel has no fee to ask for: ' + JSON.stringify((locked.options || []).map((x) => x.id)));
  ok(/option/i.test(locked.text || ''), 'and the paper says why: ' + (locked.text || '').slice(-70));

  const free = feeOf(sequel({ optioned: false }));
  ok((free.options || []).length > 0, 'a sequel you did NOT option is still negotiable');

  // Past the end of the option it is a new deal again, which is the other half of the rule.
  const past = feeOf(sequel({ optioned: true, part: 4 }));
  ok((past.options || []).length > 0, 'and a fourth part on a three-part option is negotiable again');
}

// ── 2. What kind of thing it is, carried onto the next one ────────────────────
// production.js rolls a fresh `potential` whenever the offer does not carry one, so a show
// built to run for years could come back as one that was always going to close. The offer
// builders have to pass it through. This checks the source rather than the dice, because
// the dice are the reason it went unnoticed for so long.
{
  const src = await import('node:fs').then((fs) => fs.readFileSync(new URL('../src/systems/career/franchise.js', import.meta.url), 'utf8'));
  const renewal = src.slice(src.indexOf("kind: 'renewal'"), src.indexOf("kind: 'renewal'") + 1400);
  const sequel = src.slice(src.indexOf("kind: 'sequel'"), src.indexOf("kind: 'sequel'") + 1400);
  ok(/potential:/.test(renewal), 'a renewal carries what kind of show it is');
  ok(/potential:/.test(sequel), 'a sequel carries what kind of picture it is');
}

// ── 3. Changing your mind changes it all the way back ─────────────────────────
// Every direction is applied to what the thing was BEFORE you started choosing. The prestige
// did that from the first day. The arc did not: `if (d.arc)` left the previous one in place
// whenever the new choice had none.
{
  const withArc = Object.entries(DIRECTIONS).find(([, d]) => d.arc);
  const noArc = Object.entries(DIRECTIONS).find(([, d]) => !d.arc && !d.yours);
  ok(!!withArc && !!noArc, 'there is a direction that sets an arc and one that does not');
  if (withArc && noArc) {
    const s = st();
    const o = { id: 'c1', kind: 'renewal', seriesTitle: 'The Show', season: 2, arc: 'slides',
      projectTitle: 'The Show · season 2', role: 'Lead', type: 'Drama Series', genre: 'Drama',
      scale: 'recurring', tier: 'lead', prestigeScore: 60, perEpisode: true, episodes: 10,
      episodeFee: 2e5, salary: 2e6, stability: 80, deadline: 3 };
    s.offers = [o];
    chooseDirection(s, 'c1', withArc[0]);
    ok(o.arc === withArc[1].arc, 'choosing a direction with an arc sets it: ' + o.arc);
    chooseDirection(s, 'c1', noArc[0]);
    ok(o.arc === 'slides', 'and switching to one without an arc puts the original back: ' + o.arc);
    // And twice over, because the whole point is that it does not stack.
    chooseDirection(s, 'c1', withArc[0]);
    chooseDirection(s, 'c1', withArc[0]);
    const base = 60 + withArc[1].prestige;
    ok(Math.abs(o.prestigeScore - base) <= 1, 'and choosing the same one twice does not stack: ' + o.prestigeScore + ' vs ' + base);
  }
}

// ── 4. A show that moved house shoots at the same speed it always did ─────────
// bubble.js repeats the pace table rather than importing it, because franchise.js imports
// bubble.js. The repeat was written from memory and was wrong by a factor of two on soaps.
{
  const shot = (type, episodes) => {
    const c = { title: 'The Show', type, season: 1, rating: 80, endViewers: 9, viewers: 9 };
    const t = st(); t.filmography = [c];
    hangIt(t, c, { role: 'Lead', type, genre: 'Drama', scale: 'recurring', tier: 'lead',
      episodes, episodeFee: 2e5, salary: episodes * 2e5, prestigeScore: 58, stability: 78 }, 5);
    t.bubbles[0].shopped = 100; t.bubbles[0].due = 0;
    for (let i = 0; i < 40 && !((t.offers || []).some((o) => o.kind === 'rescue')); i++) {
      t.month++; if (t.month > 11) { t.month = 0; t.year++; }
      if (!t.bubbles.length) { t.filmography = [c]; hangIt(t, c, { role: 'Lead', type, genre: 'Drama', scale: 'recurring', tier: 'lead', episodes, episodeFee: 2e5, salary: episodes * 2e5, prestigeScore: 58, stability: 78 }, 5); t.bubbles[0].shopped = 100; t.bubbles[0].due = 0; }
      bubbleTick(t);
    }
    const o = (t.offers || []).find((x) => x.kind === 'rescue');
    return o ? { months: o.months, episodes: o.episodes } : null;
  };
  for (const type of Object.keys(TV_PACE)) {
    const r = shot(type, 14);
    if (!r) { ok(false, 'could not get a rescue for ' + type); continue; }
    ok(r.months === tvMonths(type, 'recurring', r.episodes),
      `a rescued ${type} shoots at the same pace as any other: ${r.months} vs ${tvMonths(type, 'recurring', r.episodes)} months for ${r.episodes} episodes`);
  }
}

if (fails) { console.log('test_carryover: ' + fails + ' failed'); process.exit(1); }
console.log('test_carryover: all passed');
