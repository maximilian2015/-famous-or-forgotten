import { canPropose, propose, odds, why, collabTick, liveCollabs, kindFor, KINDS } from '../src/systems/career/collab.js';
import { interactionsFor, interact } from '../src/systems/life/interactions.js';
import { ensureWorld } from '../src/systems/world/world.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const person = (over) => ({ id: 'c1', name: 'Nadia Frost', role: 'Film Director', industryWeight: 70, relationship: 70, ...over });
const st = (over) => { const s = { version: 'x', name: 'Mira Vale', ageY: 35, stage: 'career', dream: 'actor', fame: 70, respect: 45, acting: 75, charisma: 60, looks: 60, luck: 50, scandal: 0, media: 0, mental: 70, year: 2060, month: 2, timeline: [], filmography: [], productions: [], offers: [], inbox: [], releases: [], peakFame: 70, hasApartment: true, housing: 'room', ap: 100, apMax: 100, apMaxEff: 100, cash: 2e6, genreXP: {}, people: [person()], quote: 4e6, awards: { wins: [], nominations: [] }, ...over }; ensureWorld(s); return s; };
const stamp = (s) => s.year * 12 + s.month;

// ── who you can even ask ───────────────────────────────────────────────────────
{
  const s = st();
  ok('a director is somebody you can make something with', canPropose(s, s.people[0]).ok);
  ok('and the card says what it would be', /directs/.test(KINDS['Film Director'].what(s.people[0])));
  const journo = st({ people: [person({ role: 'Journalist' })] });
  const no = canPropose(journo, journo.people[0]);
  ok('a journalist does not make films', !no.ok && /does not make films/.test(no.why));
  const far = st({ people: [person({ relationship: 20 })] });
  ok('and you cannot ask a stranger', !canPropose(far, far.people[0]).ok && /well enough/.test(canPropose(far, far.people[0]).why));
  // a night out calls the same people something else
  for (const r of ['Star', 'Icon', 'Fellow Actor', 'Studio Producer', 'Music Producer']) {
    ok(`a ${r} makes films too`, !!kindFor({ role: r }), r);
  }
}
// ── the odds are read off your standing, and the reasons are shown ─────────────
{
  const big = st({ respect: 75, fame: 90 }), small = st({ respect: 5, fame: 30, people: [person({ relationship: 52, industryWeight: 90 })] });
  ok('a name people want is more likely to get a yes', odds(big, big.people[0]) > odds(small, small.people[0]) + 15,
    `${odds(big, big.people[0])}% vs ${odds(small, small.people[0])}%`);
  ok('and the card gives the reasons', why(big, big.people[0]).length > 0 && why(small, small.people[0]).some((w) => /against you|further up/.test(w)),
    JSON.stringify(why(small, small.people[0])));
  const poisoned = st({ poisonUntil: 2060 * 12 + 40 });
  ok('nobody develops anything with an uninsurable actor', odds(poisoned, poisoned.people[0]) < odds(st(), st().people[0]));
}
// ── asking costs goodwill, and a yes is a project, not a film ──────────────────
{
  let got = null;
  for (let i = 0; i < 60 && !got; i++) { const s = st({ respect: 90, fame: 95 }); propose(s, 'c1'); if ((s.collabs || []).length) got = s; }
  ok('a yes puts something into development', !!got);
  if (got) {
    const c = got.collabs[0];
    ok('with a title, a genre and their name on it', !!c.title && !!c.genre && c.name === 'Nadia Frost', JSON.stringify(c));
    ok('and it is years out, not months', c.due - stamp(got) >= 8);
    ok('and no offer exists yet', got.offers.length === 0);
    ok('the screen can show it', liveCollabs(got)[0].monthsOut >= 8);
    ok('and you cannot ask the same person twice', !canPropose(got, got.people[0]).ok && /already have something/.test(canPropose(got, got.people[0]).why));
  }
  // a no costs goodwill just the same
  let no = null;
  for (let i = 0; i < 60 && !no; i++) { const s = st({ respect: 0, fame: 20, people: [person({ relationship: 50, industryWeight: 95 })] }); propose(s, 'c1'); if (!(s.collabs || []).length) no = s; }
  ok('asking costs goodwill even when they pass', !!no && no.people[0].relationship < 50, no ? String(no.people[0].relationship) : 'never passed');
  ok('and you cannot ask again this year', !!no && !canPropose(no, no.people[0]).ok && /this year/.test(canPropose(no, no.people[0]).why));
}
// ── development: financed, or quietly dead ─────────────────────────────────────
{
  const run = (over) => {
    const s = st(over);
    s.collabs = [{ id: 'col1', who: 'c1', name: 'Nadia Frost', role: 'Film Director', kind: 'direct', what: 'Nadia directs, you carry it', title: 'The Long Field', genre: 'Drama', scale: 'feature', since: stamp(s) - 12, due: stamp(s) }];
    collabTick(s);
    return s;
  };
  let made = 0, died = 0, offer = null;
  for (let i = 0; i < 200; i++) { const s = run({ respect: 70, fame: 85 }); if (s.offers.length) { made++; offer = offer || s.offers[0]; } else died++; }
  ok('some get made', made > 0, String(made));
  ok('and some just die', died > 0, String(died));
  ok('and either way the project leaves development', run({}).collabs.length === 0);
  if (offer) {
    ok('the one that got made is a real paper', offer.salary > 0 && offer.months >= 3 && offer.prestigeScore >= 62 && offer.role === 'Lead', JSON.stringify({ s: offer.salary, m: offer.months, p: offer.prestigeScore }));
    ok('with their name attached as the director', offer.director === 'Nadia Frost' && offer.directorId === 'c1');
    ok('and it says it is the one you two decided to make', /decided to make/.test(offer.note));
  }
  let weak = 0;
  for (let i = 0; i < 200; i++) { if (run({ respect: 2, fame: 25 }).offers.length) weak++; }
  let strong = 0;
  for (let i = 0; i < 200; i++) { if (run({ respect: 95, fame: 95 }).offers.length) strong++; }
  ok('a name that is worth something now is what gets one made', strong > weak + 40, `${strong} vs ${weak} of 200`);
  // the producer's version takes points instead of money
  const pr = st({ people: [person({ role: 'Studio Producer' })] });
  pr.collabs = [{ id: 'col1', who: 'c1', name: 'Nadia Frost', role: 'Studio Producer', kind: 'produce', what: 'x', title: 'Small Hours', genre: 'Drama', scale: 'indie', since: stamp(pr) - 12, due: stamp(pr) }];
  let pts = null;
  for (let i = 0; i < 80 && !pts; i++) { const s = JSON.parse(JSON.stringify(pr)); collabTick(s); if (s.offers.length) pts = s.offers[0]; }
  ok('the producer version pays in points', !!pts && pts.points === true && pts.backend > 0, pts ? JSON.stringify({ p: pts.points, b: pts.backend }) : 'never made');
}
// ── and it is on the person, where you would go looking for it ─────────────────
{
  const s = st();
  const list = interactionsFor(s, 'c1');
  const a = list.find((x) => x.id === 'collab');
  ok('the action is on the contact', !!a && a.open, a ? a.why : 'missing');
  interact(s, 'c1', 'collab');
  ok('and it does something', !!s.lastEvent && ((s.collabs || []).length > 0 || /passed|listened/.test(s.lastEvent)), String(s.lastEvent));
  const mum = st();
  mum.family = [{ id: 'f1', name: 'Rose Vale', relation: 'Mother', alive: true, relationship: 80 }];
  ok('and not on your mother', !interactionsFor(mum, 'f1').some((x) => x.id === 'collab'));
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
