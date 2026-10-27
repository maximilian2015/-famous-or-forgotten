// The event screen (App.jsx ArcModal) prints under each choice what it does. Every life event,
// on-set problem, childhood moment and story beat comes through it, and the player chooses by
// those words, so they have to be what the game does:
//   - an event (arcs.js) and a childhood moment (youth.js) carry numbers that resolveArc applies;
//     the words are read off those numbers (arcCard / effectTags), and a roll shows checkOdds;
//   - a story beat (stories.js) does it in a function and says it in `shows`. Here every one of
//     those functions is RUN, on a fresh life, both ways for a roll, and what it did is held to
//     what the screen said — in both directions: nothing said that is not done, nothing done of
//     any weight that is not said.
import { ARCS, arcCard, effectTags, checkOdds, resolveArc } from '../src/systems/life/arcs.js';
import { YOUTH_EVENTS } from '../src/systems/life/youth.js';
import { CHAINS } from '../src/systems/meta/stories.js';
import { ensureWorld, activeActors } from '../src/systems/world/world.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ name: 'Mira Vale', ageY: 32, stage: 'career', fame: 45, respect: 20, charisma: 50, confidence: 40, mental: 60, scandal: 0, media: 0, cash: 1000, timeline: [], year: 2058, month: 2,
  production: { id: 'p1', title: 'Glass Harbor', genre: 'Thriller', salary: 400000, meter: 50, monthsLeft: 2, months: 6, crew: [{ name: 'Rosalind Varga', bond: 60 }, { name: 'Theo Lark', bond: 40 }] },
  productions: [], ...over });
const open = (s, id) => { const a = ARCS.find((x) => x.id === id); const b = a.build(s); s.pendingArc = { id, speaker: b.speaker, text: b.text, choices: b.choices }; return s.pendingArc; };
const words = (tags) => tags.map((x) => x.t).join('|');

// ── events: the words are read off the numbers ──────────────────────────────
{
  const s = st(); const card = arcCard(s, open(s, 'scriptLeak'));
  ok('a leak on set is on set', card.onSet && card.kicker === 'On set · Glass Harbor');
  const [quiet, publicly, blame] = card.choices;
  ok('saying nothing: the performance and your head both take it', words(quiet.tags) === 'Your performance ↓|Mental ↓', words(quiet.tags));
  ok('pointing at someone: the whole set turns on you, standing and scandal', /the whole set turns on you/.test(words(blame.tags)) && /Scandal ↑/.test(words(blame.tags)) && /Standing ↓/.test(words(blame.tags)));
  ok('scandal up is bad, standing up is good, hype is neither', blame.tags.find((x) => x.t === 'Scandal ↑').good === false
    && publicly.outcomes[0].tags.find((x) => x.t === 'Standing ↑').good === true && publicly.outcomes[0].tags.find((x) => x.t === 'Hype ↑').good === null);
  ok('going public shows the chance this actor has now, the one resolveArc rolls', publicly.odds === Math.round(checkOdds(s, { stat: 'charisma' })) && publicly.odds === 60);
  ok('and it moves with the actor', arcCard(st({ charisma: 90 }), open(st({ charisma: 90 }), 'scriptLeak')).choices[1].odds === 84);
  ok('and both ways it can go are listed', publicly.outcomes.length === 2 && /Scandal ↑/.test(words(publicly.outcomes[1].tags)) && !/Scandal/.test(words(publicly.outcomes[0].tags)));
}
{
  const s = st(); const card = arcCard(s, open(s, 'directorCracks'));
  ok('covering for the director: Rosalind trusts you much more', /Rosalind trusts you much more/.test(words(card.choices[0].tags)));
  ok('telling the studio: much less, and the performance up a lot', /Rosalind trusts you much less/.test(words(card.choices[1].tags)) && /Your performance ↑↑/.test(words(card.choices[1].tags)));
}
{
  const s = st({ production: { ...st().production, meter: 20 } }); const card = arcCard(s, open(s, 'replacementThreat'));
  const walk = card.choices[2];
  ok('walking away says so, and the kill fee is the 30% resolveArc pays', walk.quit && /you leave Glass Harbor · €120,000 kill fee/.test(words(walk.tags)), words(walk.tags));
}
{
  const s = st({ production: null, fame: 60, respect: 40 }); const card = arcCard(s, open(s, 'sellOut'));
  ok('a brand deal is not on a set', !card.onSet && card.kicker === 'Age 32');
  ok('the money is the money', /\+€80,000/.test(words(card.choices[0].tags)));
  const b = st({ production: null, mental: 10 }); const burn = arcCard(b, open(b, 'burnout'));
  ok('resting says two months off, and Mental up a lot', /two months off/.test(words(burn.choices[0].tags)) && /Mental ↑↑/.test(words(burn.choices[0].tags)));
  ok('getting help says what it costs', /−€3,000/.test(words(burn.choices[2].tags)));
}
{
  // Every event and childhood moment: a choice that does something says something, and a roll
  // shows a chance and two sides.
  const quiet = [];
  for (const a of ARCS) {
    const s = st({ people: [{ name: 'Old Hand', industryWeight: 80 }], filmography: [{ title: 'x' }] });
    const b = a.build(s); const card = arcCard(s, { id: a.id, speaker: b.speaker, text: b.text, choices: b.choices });
    card.choices.forEach((c, i) => { if (c.odds == null && !(c.tags || []).length) quiet.push(`${a.id}/${i}`); if (c.odds != null && (c.outcomes || []).length !== 2) quiet.push(`${a.id}/${i} roll`); });
  }
  for (const e of YOUTH_EVENTS) {
    const s = st({ production: null, ageY: e.age }); const b = e.build(s);
    const card = arcCard(s, { id: e.id, youth: true, speaker: b.speaker, text: b.text, choices: b.choices });
    card.choices.forEach((c, i) => { if (c.odds == null && !(c.tags || []).length && !c.hint) quiet.push(`${e.id}/${i}`); });
  }
  ok(`all ${ARCS.length} events and ${YOUTH_EVENTS.length} childhood moments say what every choice does`, quiet.length === 0, quiet.join(', '));
  const s = st(); open(s, 'scriptLeak'); const before = s.production.meter, bond = s.production.crew[1].bond;
  resolveArc(s, 2);
  ok('and the words are the numbers: pointing at someone lifts the performance and turns the set', s.production.meter > before && s.production.crew[1].bond < bond);
}

// ── story beats: every function run, held to what it says ──────────────────
// What a choice can do beyond the six numbers, how to see that it did it, and the words that
// promise it. A choice must say it exactly when it does it.
const NOW = (s) => (s.year || 0) * 12 + (s.month || 0);
const SIGNS = [
  { id: 'out of sight', said: /no offers and no castings/, did: (b, a, s) => (a.hiding || 0) >= NOW(s) && !(b.hiding >= NOW(s)) },
  { id: 'agent works for you', said: /more offers from your agent/, did: (b, a, s) => (a.agentBoost || 0) > NOW(s) },
  { id: 'agent slacks', said: /fewer offers from your agent/, did: (b, a, s) => (a.agentSlack || 0) > NOW(s) },
  { id: 'no agent', said: /no agent for/, did: (b, a) => !!b.agent && !a.agent },
  { id: 'an offer', said: /an offer|their paper again/, did: (b, a) => (a.offers || []).length > (b.offers || []).length },
  { id: 'a later offer', said: /a studio offer/, did: (b, a) => (a.laterOffers || []).length > (b.laterOffers || []).length },
  { id: 'fighting for leads', said: /better odds at the leads/, did: (b, a, s) => (a.ageFight || 0) > NOW(s) && !b.ageFight },
  { id: 'character actor', said: /worse odds at leads/, did: (b, a) => !!a.characterActor && !b.characterActor },
  { id: 'scandal typecast', said: /know you for the scandal/, did: (b, a) => ((a.typecast || {}).scores || {}).scandal > (((b.typecast || {}).scores || {}).scandal || 0) },
  { id: 'television typecast', said: /see you as television/, did: (b, a) => ((a.typecast || {}).scores || {}).tv > (((b.typecast || {}).scores || {}).tv || 0) },
  { id: 'bridge burned', said: /never works with you again/, did: (b, a) => (a.grudges || []).length > (b.grudges || []).length },
  { id: 'grudge lifted', said: /the grudge is over/, did: (b, a) => (a.grudges || []).length < (b.grudges || []).length },
];
const NEXT = [{ said: /brand calls next month/, beat: 'brand' }, { said: /tape comes out next month/, beat: 'caught' }, { said: /Standing ↑ again in two months/, beat: 'after' }];
const TRACK = ['fame', 'respect', 'scandal', 'media', 'mental', 'cash'];
const sign = (x) => (x > 0.0001 ? 1 : x < -0.0001 ? -1 : 0);
const life = (over = {}) => {
  const s = { version: 'x', name: 'Mira Vale', gender: 'female', ageY: 46, stage: 'career', dream: 'actor', fame: 50, peakFame: 60, respect: 30, scandal: 30, media: 40, mental: 50,
    charisma: 50, acting: 60, looks: 55, luck: 50, cash: 200000, year: 2060, month: 3, timeline: [], filmography: [], offers: [], laterOffers: [], productions: [], production: null,
    people: [{ name: 'Dana Reyes', role: 'Director', relationship: 20, cold: true }], grudges: [], staff: {}, agent: { name: 'Ava Stone', since: 0, level: 1, tier: 'novice' }, ...over };
  ensureWorld(s); return s;
};
const CASES = [];
const add = (chain, beat, why, mkS, data) => CASES.push({ chain, beat, why, mkS, data });
add('scandal', 'break', 'a photo, no publicist', () => life(), { kind: 'photo' });
add('scandal', 'break', 'a photo, a publicist', () => life({ staff: { publicist: true } }), { kind: 'photo' });
add('scandal', 'break', 'no tape', () => life(), { kind: 'party' });
add('scandal', 'caught', '', () => life(), { kind: 'photo' });
add('scandal', 'after', '', () => life(), { kind: 'photo' });
add('scandal', 'back', '', () => life(), { kind: 'photo' });
add('scandal', 'brand', '', () => life(), { kind: 'photo' });
add('rival', 'named', '', () => life(), null);
add('rival', 'year', '', () => life(), null);
add('rival', 'settled', '', () => life(), null);
add('agent', 'slip', '', () => life(), { name: 'Ava Stone' });
add('agent', 'books', 'still their client', () => life(), { name: 'Ava Stone' });
add('agent', 'books', 'not any more', () => life({ agent: null }), { name: 'Ava Stone' });
add('ageing', 'call', '', () => life(), { fame0: 50 });
for (const path of ['fight', 'character', 'tv']) for (const fame0 of [50, 70]) add('ageing', 'verdict', `${path}, fame0 ${fame0}`, () => life(), { fame0, path });
add('comeback', 'call', '', () => life(), { who: 'Dana Reyes' });
add('comeback', 'wait', '', () => life(), { who: 'Dana Reyes' });
for (const hit of [true, false]) add('refused', 'opened', hit ? 'it was a hit' : 'it sank', () => life({ grudges: [{ who: 'Dana Reyes', title: 'The Glass', scale: 'feature', since: 0, due: 0, until: 99999, hit, gross: 2e8, opened: true }] }), { who: 'Dana Reyes', title: 'The Glass', scale: 'feature' });
const RECAST = { title: 'Light and Rain II', root: 'Light and Rain', director: 'Dana Reyes', kind: 'sequel', part: 2, season: 0, scale: 'feature', offer: { projectTitle: 'Light and Rain II', salary: 1000000, months: 4, kind: 'sequel', part: 2 } };
add('recast', 'meeting', '', () => life(), RECAST);
add('recast', 'answer', 'they went back', () => life({ production: { title: 'Light and Rain II', crew: [] } }), RECAST);
add('recast', 'answer', 'recast', () => life(), RECAST);
add('recast', 'answer', 'recast, already burned', () => life(), { ...RECAST, burned: true });
for (const hit of [true, false]) add('recast', 'without', hit ? 'it did fine' : 'it sank', () => life(), { ...RECAST, hit, other: 'Someone Else', gross: 1e8 });
add('recast', 'again', '', () => life(), RECAST);
// The cover (career/cover.js): every beat, every kind of director, the second time, and the way back.
const COVERD = (trait, times = 1) => ({ setId: 'p1', title: 'Vanished Margo', scale: 'feature', dir: { key: 'p:dir1', name: 'Ulrich Beaumont', trait, g: 'm' }, co: { key: 'p:co1', name: 'Mara Vance' }, times });
const withDir = (over = {}) => life({ people: [{ id: 'dir1', name: 'Ulrich Beaumont', role: 'Film Director', relationship: 40, industryWeight: 70 }, { id: 'co1', name: 'Mara Vance', role: 'Fellow Actor', relationship: 50 }], ...over });
add('cover', 'straight', '', () => withDir(), COVERD('chill'));
add('cover', 'again', '', () => withDir(), COVERD('perfectionist'));
for (const t of ['perfectionist', 'difficult', 'diva', 'chill']) add('cover', 'found', t, () => withDir(), COVERD(t));
add('cover', 'found', 'perfectionist, the second time', () => withDir(), COVERD('perfectionist', 2));
add('cover', 'quiet', '', () => withDir(), COVERD('chill'));
add('cover', 'amends', 'nobody to vouch', () => withDir({ grudges: [{ who: 'Ulrich Beaumont', title: 'Vanished Margo', since: 0, until: 99999, opened: true, why: 'x' }] }), COVERD('perfectionist', 2));
add('cover', 'amends', 'a heavyweight to vouch', () => withDir({ grudges: [{ who: 'Ulrich Beaumont', title: 'Vanished Margo', since: 0, until: 99999, opened: true, why: 'x' }],
  people: [{ id: 'dir1', name: 'Ulrich Beaumont', role: 'Film Director', relationship: 20 }, { id: 'big', name: 'Hedda Morn', role: 'Film Director', relationship: 80, industryWeight: 92 }] }), COVERD('perfectionist', 2));

const realRandom = Math.random;
let ran = 0, rolls = 0; const bad = [];
const tryOne = (cs, i, rnd, expect, label) => {
  const s = cs.mkS();
  const data = cs.data ? JSON.parse(JSON.stringify(cs.data)) : (() => { const a = activeActors(s)[0]; return { who: a.id, name: a.name, rank0: 50 }; })();
  const stry = { id: cs.chain, beat: cs.beat, due: NOW(s), since: NOW(s), data };
  s.stories = [stry];
  Math.random = () => rnd;
  let out;
  try {
    const built = CHAINS[cs.chain].beats[cs.beat].build(s, stry);
    if (!built) { Math.random = realRandom; return; }
    const c = built.choices[i]; if (!c) { Math.random = realRandom; return 'none'; }
    if (c.shows === undefined) { bad.push(`${label}: no shows`); Math.random = realRandom; return; }
    const sh = c.shows; const want = expect === 'good' ? sh.good : expect === 'bad' ? sh.bad : sh;
    const before = JSON.parse(JSON.stringify(s));
    out = c.apply() || {};
    Math.random = realRandom;
    ran++;
    const fx = (want && want.fx) || {}; const more = ((want && want.more) || []).map((m) => m.t).join(' | ');
    for (const k of TRACK) { const d = (s[k] || 0) - (before[k] || 0); if (sign(d) !== sign(fx[k] || 0)) bad.push(`${label}: ${k} moved ${Math.round(d)}, the screen says ${fx[k] || 0}`); }
    for (const g of SIGNS) { const did = !!g.did(before, s, s), said = g.said.test(more); if (did !== said) bad.push(`${label}: ${g.id} — ${did ? 'done but not said' : 'said but not done'}`); }
    for (const n of NEXT) if (n.said.test(more) && !(out.next && out.next.beat === n.beat)) bad.push(`${label}: promises "${n.beat}" and does not lead there`);
    return sh;
  } catch (e) { Math.random = realRandom; bad.push(`${label}: threw ${e.message}`); }
};
let choices = 0;
for (const cs of CASES) {
  for (let i = 0; i < 5; i++) {
    const label = `${cs.chain}.${cs.beat}${cs.why ? ` (${cs.why})` : ''} #${i}`;
    const sh = tryOne(cs, i, 0.5, 'plain', label);
    if (sh === 'none') break;
    if (sh === undefined) continue;
    choices++;
    if (sh && sh.odds != null) {
      rolls++;
      // A roll: drop what the plain run said, run it as a success and as a failure.
      for (let j = bad.length - 1; j >= 0; j--) if (bad[j].startsWith(label + ':')) bad.splice(j, 1);
      tryOne(cs, i, 0, 'good', label + ' (works)');
      tryOne(cs, i, 0.99999, 'bad', label + ' (fails)');
    }
  }
}
console.log(`      ${choices} story choices across ${CASES.length} situations, ${rolls} of them rolls, each run and compared`);
ok('every story choice says what it does, and does what it says', bad.length === 0, bad.slice(0, 6).join(' || '));
ok('every chain was reached', new Set(CASES.map((c) => c.chain)).size === Object.keys(CHAINS).length);
// What the screen makes of a story beat: the roll's chance and its two sides, or the list.
{
  const s = life(); const stry = { id: 'agent', beat: 'slip', data: { name: 'Ava Stone' } };
  const built = CHAINS.agent.beats.slip.build(s, stry);
  const card = arcCard(s, { story: 'agent', beat: 'slip', speaker: built.speaker, text: built.text, choices: built.choices.map((c) => ({ label: c.label, hint: c.hint, shows: c.shows })) });
  ok('confronting the agent shows the chance this actor has now', card.choices[0].odds === 60 && card.choices[0].outcomes.length === 2, JSON.stringify(card.choices[0]).slice(0, 160));
  ok('and the kicker is the chain', card.kicker === 'The agent');
  ok('letting it go says what it costs', /fewer offers from your agent for a year/.test(words(card.choices[2].tags)) && /Mental ↓/.test(words(card.choices[2].tags)));
  // An old save's beat, written before `shows` existed, still opens: its hint and nothing invented.
  const old = arcCard(s, { story: 'agent', beat: 'slip', speaker: 'x', text: 'y', choices: [{ label: 'Stay', hint: 'They keep 10%.' }] });
  ok('an old save\'s beat shows its own hint and invents nothing', old.choices[0].hint === 'They keep 10%.' && old.choices[0].tags.length === 0);
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
