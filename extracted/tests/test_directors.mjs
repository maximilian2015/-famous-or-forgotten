// The directors you have history with (meta/yourDirectors.js): read off the phone, the grudges
// and the work, never stored — and every door a row reports is the rule that door uses.
import { yourDirectors, directorCounts, monthName, grudgeKind, coldCause } from '../src/systems/meta/yourDirectors.js';
import { FACTIONS } from '../src/systems/meta/factions.js';
import { noteRefusal } from '../src/systems/meta/stories.js';
import { walkOffSet, directsYouAgain } from '../src/systems/career/production.js';
import { sendsOffers } from '../src/systems/career/offers.js';
import { onTheBoard } from '../src/systems/career/tentpoles.js';
import { ensureWorld } from '../src/systems/world/world.js';
import { interactionsFor, interact } from '../src/systems/life/interactions.js';
import { bondsTick } from '../src/systems/life/bonds.js';
import { canPropose, collabTick } from '../src/systems/career/collab.js';
import { nightTick } from '../src/systems/social/night.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const NOW = 2066 * 12 + 3;
const dir = (over) => ({ id: 'd1', name: 'Rosalind Varga', role: 'Film Director', industryWeight: 80, relationship: 72, fromSet: 'Buried Hunger', ...over });
const credit = (title, director, year) => ({ title, director, year, role: 'Lead', type: 'Feature Film', scale: 'feature', rating: 70 });
const st = (over) => { const s = { version: 'x', name: 'Alex Moon', ageY: 44, stage: 'career', dream: 'actor', fame: 62, respect: 58, charisma: 58,
  year: 2066, month: 3, timeline: [], filmography: [], productions: [], releases: [], offers: [], inbox: [], people: [], grudges: [],
  awards: { wins: [], nominations: [] }, ...over }; ensureWorld(s); return s; };
const row = (s, name) => yourDirectors(s).find((r) => r.name === name);

// ── who is on the list ─────────────────────────────────────────────────────────
{
  const s = st({
    people: [dir(), { id: 'f1', name: 'Juno Vance', role: 'friend', relationship: 62 }],
    filmography: [credit('Buried Hunger', 'Rosalind Varga', 2064), credit('Salt Line', 'Rosalind Varga', 2061), credit('WellPlanned', 'Kaspar Hartigan', 2063)],
    grudges: [{ who: 'Ines Okafor', title: 'Glass Harbour', scale: 'feature', since: NOW - 4, due: NOW + 12, until: NOW + 20, hit: false, gross: 0, opened: false }],
  });
  const rows = yourDirectors(s);
  ok('every director with a history is listed once: the phone, a grudge, a credit', rows.map((r) => r.name).join('|') === 'Rosalind Varga|Ines Okafor|Kaspar Hartigan', rows.map((r) => r.name).join('|'));
  ok('a friend in the phone is not a director', !row(s, 'Juno Vance'));
  ok('films together is counted off the credits, by name', row(s, 'Rosalind Varga').films === 2 && row(s, 'Kaspar Hartigan').films === 1);
  ok('and the last one is the latest year', row(s, 'Rosalind Varga').last.when === '2064' && row(s, 'Rosalind Varga').last.title === 'Buried Hunger');
  ok('somebody you only refused has no films and no last', row(s, 'Ines Okafor').films === 0 && row(s, 'Ines Okafor').last === null);
  ok('a director who is not in the phone says so, and has no warmth to show', !row(s, 'Kaspar Hartigan').inPhone && row(s, 'Kaspar Hartigan').state === null && /Not in your phone/.test(row(s, 'Kaspar Hartigan').line));
  ok('nothing on the save was written to', !('directors' in s) && s.people.length === 2 && s.grudges.length === 1);
}
// ── a film in post and a set running now count as work together ────────────────
{
  const s = st({ people: [dir()], filmography: [credit('Buried Hunger', 'Rosalind Varga', 2064)],
    releases: [{ id: 'r1', title: 'Low Tide', director: 'Rosalind Varga', due: NOW + 3 }] });
  ok('a film in post is a film together', row(s, 'Rosalind Varga').films === 2);
  ok('and it is the last thing you made together', row(s, 'Rosalind Varga').last.when === 'In post' && row(s, 'Rosalind Varga').last.title === 'Low Tide');
  s.productions = [{ id: 'p1', title: 'North Window', crew: [{ name: 'Rosalind Varga', role: 'Director', bond: 60 }] }];
  ok('a set running now beats both', row(s, 'Rosalind Varga').last.when === 'On set now' && row(s, 'Rosalind Varga').last.title === 'North Window');
}
// ── warm, neutral and cold are the bar's own split, and the counts explain the bar ─
{
  const people = [dir(), dir({ id: 'd2', name: 'Kaspar Hartigan', relationship: 30, fromSet: null }),
    dir({ id: 'd3', name: 'Mira Croft', relationship: 8, cold: true }), dir({ id: 'd4', name: 'Odile Brandt', relationship: 50 }),
    { id: 'c1', name: 'Pia Lund', role: 'Casting Director', relationship: 20 }];
  const s = st({ people, grudges: [{ who: 'Mira Croft', title: 'Salt Line', since: NOW - 10, due: NOW + 9989, until: NOW + 50, opened: true }] });
  ok('fifty and up is warm', row(s, 'Odile Brandt').state === 'warm' && row(s, 'Rosalind Varga').state === 'warm');
  ok('below fifty is neutral', row(s, 'Kaspar Hartigan').state === 'neutral');
  ok('cold is cold whatever the number', row(s, 'Mira Croft').state === 'cold');
  ok('a casting director is counted, because the bar counts them', row(s, 'Pia Lund') && row(s, 'Pia Lund').state === 'neutral');
  ok('warm first, then neutral, then cold', yourDirectors(s).map((r) => r.state).join(',') === 'warm,warm,neutral,neutral,cold');
  const c = directorCounts(s);
  const n = c.warm + c.neutral + c.cold;
  const rebuilt = Math.max(0, Math.min(100, Math.round(50 + ((c.warm - c.cold) / Math.max(1, n)) * 45 - c.grudges * 12)));
  ok('the counts on the screen rebuild the number on the bar', rebuilt === FACTIONS.directors.read(s).score, `${rebuilt} vs ${FACTIONS.directors.read(s).score}`);
}
// ── each line is the rule the door uses ────────────────────────────────────────
{
  const s = st({ people: [dir(), dir({ id: 'd2', name: 'Kaspar Hartigan', relationship: 30 }), dir({ id: 'd3', name: 'Mira Croft', relationship: 8, cold: true }),
    { id: 'c1', name: 'Pia Lund', role: 'Casting Director', relationship: 20 }] });
  const warm = row(s, 'Rosalind Varga').line, mid = row(s, 'Kaspar Hartigan').line, cold = row(s, 'Mira Croft').line;
  ok('a warm director from a set can bring you a set that starts where you left them', /a set that starts at 72/.test(warm), warm);
  ok('and their card is where you pitch or ask a favour', /From their card: pitch a project, or ask them to put in a word\./.test(warm), warm);
  ok('below fifty, the line says where pitching and favours open', /Pitching and favours open at fifty — you are at 30\./.test(mid), mid);
  ok('a cold one: nothing comes from them, and reach out', /no work comes from them/.test(cold) && /Reach out to rebuild it/.test(cold) && !/an offer/.test(cold), cold);
  ok('the button says Contact, or Reach out for somebody cold', row(s, 'Rosalind Varga').contact === 'Contact' && row(s, 'Mira Croft').contact === 'Reach out');
  ok('a casting director does not make films, in collab.js’s words', /does not make films/.test(row({ ...s, people: [{ id: 'c1', name: 'Pia Lund', role: 'Casting Director', relationship: 60 }] }, 'Pia Lund').line));
  // The doors against the predicates themselves, across a spread of states.
  let agree = 0, total = 0;
  for (const rel of [0, 10, 16, 30, 36, 49, 50, 80]) for (const cold of [false, true]) for (const fromSet of [null, 'A Set']) for (const g of [false, true]) {
    const p = dir({ relationship: rel, cold, fromSet });
    const t = st({ people: [p], grudges: g ? [{ who: p.name, title: 'X', since: NOW - 1, due: NOW + 10, until: NOW + 20, opened: false }] : [] });
    const line = row(t, p.name).line;
    total++;
    if (/\ban offer\b/.test(line) === sendsOffers(t, p) && /a set that starts/.test(line) === directsYouAgain(t, p)) agree++;
  }
  ok('the offer and set doors appear exactly when offers.js and production.js say they open', agree === total, `${agree}/${total}`);
  const board = st({ people: [dir()], filmography: [{ ...credit('Hit', 'Someone Else', 2065), rating: 90, status: 'Hit' }] });
  ok('the tentpole door appears when tentpoles.js would pick them and the board is open', onTheBoard(board, board.people[0]) && /a tentpole/.test(row(board, 'Rosalind Varga').line), row(board, 'Rosalind Varga').line);
  // Weight under eighty, no hit: access.js keeps the board shut, so nobody is on it.
  const shut = st({ people: [dir({ industryWeight: 70 })] });
  ok('and not while the board is shut to you', onTheBoard(shut, shut.people[0]) && !/tentpole/.test(row(shut, 'Rosalind Varga').line), row(shut, 'Rosalind Varga').line);
}
// ── grudges, from the writers that file them ───────────────────────────────────
{
  ok('a month stamp reads as a month', monthName(2067 * 12 + 2) === 'Mar 2067' && monthName(2066 * 12) === 'Jan 2066');
  // Passing on a lead from a named director (stories.js noteRefusal).
  const s = st({ people: [dir()] });
  noteRefusal(s, { director: 'Rosalind Varga', projectTitle: '⭐ Glass Harbour', scale: 'feature', tier: 'lead' });
  const g = row(s, 'Rosalind Varga').grudge;
  ok('a refusal is a grudge on the row, with its reason', g && g.kind === 'passed' && g.reason === 'Turned down a part in "Glass Harbour".', JSON.stringify(g));
  ok('before the film opens the two-year date is given, with time left', g.expires === `Until ${monthName(NOW + 24)} · 24 months left`, g.expires);
  ok('and the five-year one beside it, so the hit is not given away', g.ifHit === `Until ${monthName(NOW + 60)} if "Glass Harbour" is a hit · 60 months left`, g.ifHit);
  s.grudges[0].opened = true;
  ok('once it has opened the date is the real one', row(s, 'Rosalind Varga').grudge.expires === `Until ${monthName(s.grudges[0].until)} · ${s.grudges[0].until - NOW} months left` && row(s, 'Rosalind Varga').grudge.ifHit === null, row(s, 'Rosalind Varga').grudge.expires);
  // The story can open late (another chain was running). Past two years a live one is a hit,
  // and a two-year date would be in the past.
  const late = st({ grudges: [{ who: 'Ines Okafor', title: 'Late', since: NOW - 30, due: NOW - 10, until: NOW + 30, hit: true, opened: false }] });
  ok('a refusal still unopened past two years shows its real date, not a past one', row(late, 'Ines Okafor').grudge.expires === `Until ${monthName(NOW + 30)} · 30 months left`, row(late, 'Ines Okafor').grudge.expires);
  // Walking off their set (production.js walkOffSet).
  const w = st({ people: [dir({ id: 'd2', name: 'Kaspar Hartigan', relationship: 40 })] });
  const set = { id: 'p9', title: 'North Window', scale: 'feature', episodes: 0, crew: [{ name: 'Kaspar Hartigan', role: 'Director', bond: 40 }] };
  w.productions = [set]; w.production = set;
  walkOffSet(w, 'p9');
  const kw = row(w, 'Kaspar Hartigan');
  ok('walking off is a five-year grudge, and they are cold', kw.grudge && kw.grudge.kind === 'walked' && kw.state === 'cold' && kw.grudge.expires === `Until ${monthName(NOW + 60)} · 60 months left` && kw.grudge.reason === 'Walked off the set of "North Window".', JSON.stringify(kw.grudge));
  // The door shut on the record (stories.js burnTheBridge) — written here the way it writes it.
  const b = { who: 'Mira Croft', title: 'Night Shift', since: NOW, due: NOW + 9999, until: NOW + 9999, opened: true };
  ok('a door shut on the record is for good', grudgeKind(b) === 'shut' && row(st({ grudges: [b] }), 'Mira Croft').grudge.expires === 'For good');
  // Expired: holdsAGrudge stops at until, and so does the screen.
  const old = st({ people: [dir()], grudges: [{ who: 'Rosalind Varga', title: 'Old', since: NOW - 30, due: NOW - 10, until: NOW - 6, opened: true }] });
  ok('a grudge that has run out is not shown', row(old, 'Rosalind Varga').grudge === null);
}
// ── the bar's sentence says when a grudge ends, and "again" only when it does not ─
{
  const line = (grudges, people = []) => FACTIONS.directors.read(st({ grudges, people })).line;
  const walk = { who: 'Jocasta Radovan', title: 'Fools and Names', since: NOW - 37, due: NOW - 37 + 9999, until: NOW + 23, opened: true };
  const shut = { who: 'Mira Croft', title: 'Night Shift', since: NOW - 2, due: NOW + 9997, until: NOW + 9997, opened: true };
  const refused = { who: 'Ines Okafor', title: 'Glass Harbour', since: NOW - 10, due: NOW + 6, until: NOW + 50, hit: true, opened: false };
  ok('a walk-off grudge is a date, not "again"', line([walk]) === `Jocasta Radovan holds a grudge until ${monthName(NOW + 23)}. The business is small.`, line([walk]));
  ok('a door shut on the record is the only "again"', line([shut]) === 'Mira Croft will not work with you again. The business is small.', line([shut]));
  ok('an unopened refusal gives the two-year date and does not give the hit away', line([refused]) === `Ines Okafor holds a grudge until ${monthName(NOW + 14)}, or longer if the film is a hit. The business is small.`, line([refused]));
  ok('several: the last date, and "or later" while one could still be a hit', line([walk, refused]) === `2 directors hold a grudge, the last of them until ${monthName(NOW + 23)} or later. The business is small.`, line([walk, refused]));
  ok('several with one for good says so', line([walk, shut]) === '2 directors hold a grudge — 1 of them for good. The business is small.', line([walk, shut]));
  ok('nowhere does a timed grudge say "again"', ![[walk], [refused], [walk, refused]].some((g) => /again/.test(line(g))));
}
// ── a cold director without a grudge gets what the state can say, and no more ──
{
  const s = st({ people: [
    dir({ id: 'z1', name: 'Zora Whitlock', relationship: 0, cold: true, lastSeen: NOW - 30 }),
    dir({ id: 'z2', name: 'Ruben Rune', relationship: 0, cold: true, lastSeen: NOW - 40 }),
    dir({ id: 'z3', name: 'Esme Brandt', relationship: 6, cold: true, lastSeen: NOW - 3 }),
    dir({ id: 'z4', name: 'Kaspar Hartigan', relationship: 4, cold: true, lastSeen: NOW - 50 }),
    dir({ id: 'z5', name: 'Odile Brandt', relationship: 0, cold: false, lastSeen: NOW - 50 })],
    _seen: { z2: NOW - 14 },
    grudges: [{ who: 'Kaspar Hartigan', title: 'North Window', since: NOW - 20, due: NOW - 20 + 9999, until: NOW + 40, opened: true }] });
  const z = row(s, 'Zora Whitlock').why;
  ok('nothing at all and ten months unseen is the drift, said with its date', z && z.label === 'Faded' && z.text.startsWith(`No word between you since ${monthName(NOW - 30)} — 2 years.`), z && z.text);
  ok('and the rule that lifts it', /Cold lifts once closeness is back above ten/.test(z.text));
  ok('an interaction counts as a word, whichever store it is in', row(s, 'Ruben Rune').why.text.startsWith(`No word between you since ${monthName(NOW - 14)} — 14 months.`), row(s, 'Ruben Rune').why.text);
  ok('cold that is not the drift is not given a made-up cause', row(s, 'Esme Brandt').why.label === 'Cold' && /not on record/.test(row(s, 'Esme Brandt').why.text), row(s, 'Esme Brandt').why.text);
  ok('a grudge is its own reason, so no second one', row(s, 'Kaspar Hartigan').why === null && row(s, 'Kaspar Hartigan').grudge);
  ok('somebody who is not cold has no reason to be given', row(s, 'Odile Brandt').why === null);
  // People's "Drifted away" reads the same cause (it used to say "you stopped calling" of everybody).
  const cause = (n) => coldCause(s, s.people.find((p) => p.name === n));
  ok('the shared reading: a grudge, the drift, or not on record', cause('Kaspar Hartigan') === 'grudge' && cause('Zora Whitlock') === 'faded' && cause('Esme Brandt') === 'unknown',
    `${cause('Kaspar Hartigan')} ${cause('Zora Whitlock')} ${cause('Esme Brandt')}`);
}
// ── a grudge shuts every door to work, whatever the closeness ──────────────────
// Cold and a grudge are different: a chat or a present can lift cold (bonds.js), and you can be
// on speaking terms again — but while the grudge stands nothing professional comes from them.
{
  const fresh = () => st({ ap: 100, apMax: 100, apMaxEff: 100, cash: 5e6, fame: 70, respect: 70,
    people: [dir({ id: 'j1', name: 'Jocasta Radovan', relationship: 0, cold: true, lastSeen: NOW - 30, industryWeight: 85 })],
    grudges: [{ who: 'Jocasta Radovan', title: 'Fools and Names', since: NOW - 37, due: NOW - 37 + 9999, until: NOW + 23, opened: true }] });
  const s = fresh(); const j = s.people[0];
  const chat = interactionsFor(s, 'j1').find((a) => a.id === 'chat');
  ok('a faded director can still be contacted: Chat is open', chat && chat.open && !chat.why, JSON.stringify(chat));
  ok('the row says so, and the button says Contact', row(s, 'Jocasta Radovan').contact === 'Contact' && /You can still contact Jocasta, but work together is blocked until the grudge ends\./.test(row(s, 'Jocasta Radovan').line), row(s, 'Jocasta Radovan').line);
  interact(s, 'j1', 'gift');
  const afterGift = j.relationship;
  ok('a present raises closeness through the existing interaction', afterGift > 10, String(afterGift));
  bondsTick(s);
  ok('and above ten the cold lifts, the way bonds.js always lifted it', j.cold === false, String(j.cold));
  // Well past every threshold, so a closed door can only be the grudge closing it.
  j.relationship = 70;
  ok('but the grudge still blocks an agent offer', !sendsOffers(s, j));
  ok('and the tentpole board', !onTheBoard(s, j));
  ok('and directing you again', !directsYouAgain(s, { ...j, fromSet: 'A Set', relationship: 60 }));
  ok('and a pitch, even at seventy', !canPropose(s, j).ok);
  const favour = interactionsFor(s, 'j1').find((a) => a.id === 'favour');
  ok('and putting in a word, with the reason on the button', favour && !favour.open && /grudge/.test(favour.why), JSON.stringify(favour));
  // A lead from a night out: every one ends in nightTick, and that is where it is stopped.
  const offersBefore = (s.offers || []).length;
  s.leads = [{ due: NOW, from: 'Jocasta Radovan', role: 'Film Director', weight: 96, sure: true, alist: true }];
  nightTick(s);
  ok('a lead from a party does not come through', (s.offers || []).length === offersBefore && !(s.leads || []).length);
  // Something already in development with them dies, rather than arriving with their name on it.
  s.collabs = [{ id: 'k1', who: 'j1', name: 'Jocasta Radovan', role: 'Film Director', title: 'Our Thing', genre: 'Drama', due: NOW }];
  collabTick(s);
  ok('a project in development with them is dropped', !(s.collabs || []).length && (s.offers || []).length === offersBefore && /will not make it with you while the grudge stands/.test(s.timeline.map((x) => x.text).join(' ')));
  // Without the grudge — the same person, the same closeness — every door is what it was before.
  const t = fresh(); t.grudges = []; const k = t.people[0]; k.cold = false; k.relationship = 70; k.fromSet = 'A Set';
  ok('without a grudge the doors open exactly as before', sendsOffers(t, k) && onTheBoard(t, k) && directsYouAgain(t, k) && canPropose(t, k).ok);
  let same = 0, n = 0;
  for (const rel of [0, 10, 16, 30, 36, 49, 50, 80]) for (const cold of [false, true]) {
    const p = dir({ relationship: rel, cold });
    const u = st({ people: [p] });
    n++; if (sendsOffers(u, p) === (!cold && rel > 15)) same++;
  }
  ok('and the offer door with no grudge is the old rule, state for state', same === n, `${same}/${n}`);
}
// ── an old save with none of it ────────────────────────────────────────────────
{
  const bare = { year: 2040, month: 0 };
  let rows = null, threw = null;
  try { rows = yourDirectors(bare); } catch (e) { threw = e.message; }
  ok('a save with no phone, no grudges and no work has an empty list and does not throw', !threw && Array.isArray(rows) && rows.length === 0, threw || '');
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
