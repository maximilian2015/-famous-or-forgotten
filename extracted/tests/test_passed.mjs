// The parts you did not take, kept (meta/passed.js) — the first step of Industry Watch.
// Maxi: "сначала маленький шаг: записывать значимые отказы". Nothing reads the ledger on screen
// yet; what is checked here is that the right refusals go in, the small ones do not, nothing
// that was recorded is lost, and the stories that find out what happened write it back.
import { declineOffer, offersTick } from '../src/systems/career/offers.js';
import { storiesTick, storyOf } from '../src/systems/meta/stories.js';
import { resolveArc } from '../src/systems/life/arcs.js';
import { ensureWorld } from '../src/systems/world/world.js';
import { recordPassed, passedOn, passedWhy, PASSED_KEEP } from '../src/systems/meta/passed.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => { const s = { version: 'x', name: 'Mira Vale', gender: 'female', ageY: 30, stage: 'career', dream: 'actor', fame: 40, respect: 20, acting: 60, charisma: 60, looks: 50, luck: 50, scandal: 0, media: 10, mental: 60, year: 2050, month: 2, timeline: [], filmography: [], productions: [], people: [], offers: [], peakFame: 40, hasApartment: true, housing: 'room', ap: 100, cash: 500000, genreXP: {}, alive: true, ...over }; ensureWorld(s); return s; };
const stamp = (s) => s.year * 12 + s.month;
const month = (s, n = 1) => { for (let i = 0; i < n; i++) { s.month++; if (s.month > 11) { s.month = 0; s.year++; } } };

// ── what goes in ──────────────────────────────────────────────────────────────
{
  const s = st({ people: [{ id: 'p1', name: 'Nils Arden', role: 'Film Director', relationship: 60, industryWeight: 70, fromSet: true }] });
  s.offers = [{ id: 'o1', via: 'agent', director: 'Nils Arden', directorId: 'p1', projectTitle: 'Glass Winter', role: 'Lead', type: 'Feature Film', genre: 'Drama', salary: 400000, months: 4, tier: 'lead', scale: 'feature', deadline: 3 }];
  ok('an old save has no ledger and loses nothing by it', passedOn(s).length === 0 && s.passedOn === undefined);
  declineOffer(s, 'o1');
  const e = passedOn(s)[0];
  ok('a lead from a director you know is kept', !!e && e.title === 'Glass Winter' && e.how === 'passed' && e.why.includes('lead') && e.why.includes('director'), JSON.stringify(e));
  ok('with the facts known on the day', e.director === 'Nils Arden' && e.genre === 'Drama' && e.scale === 'feature' && e.salary === 400000 && e.at === stamp(s));
  ok('and nothing it does not know yet', e.replacedBy === null && e.outcome === null);
  // The story that tells what happened writes it back.
  const g = s.grudges[0];
  month(s, g.due - stamp(s)); storiesTick(s);
  ok('the film opens without you (stories.js refused)', storyOf(s, 'refused') && s.pendingArc && /Glass Winter/.test(s.pendingArc.text));
  ok('and the ledger now knows how it went', !!e.outcome && e.outcome.hit === !!g.hit && (g.hit ? e.outcome.gross === g.gross : e.outcome.gross === 0), JSON.stringify(e.outcome));
  ok('and who took the part, by name, as the story said it', e.replacedBy ? s.pendingArc.text.includes(e.replacedBy) : /somebody younger/.test(s.pendingArc.text), e.replacedBy);
  resolveArc(s, 0);
  // A grudge is deleted years later; the ledger is not.
  month(s, 70); s.grudges = (s.grudges || []).filter(() => false);
  ok('the record outlives the grudge', passedOn(s).some((x) => x.title === 'Glass Winter' && x.outcome));
}
// ── what does not ─────────────────────────────────────────────────────────────
{
  const s = st();
  s.offers = [
    { id: 'a', via: 'casting', projectTitle: 'Small Hours', role: 'Supporting', type: 'Feature Film', genre: 'Drama', salary: 30000, months: 2, tier: 'supporting', scale: 'indie', deadline: 2 },
    { id: 'b', kind: 'brand', projectTitle: 'Nordhavn — a soft drink', type: 'Brand Campaign', salary: 90000, deadline: 2 },
  ];
  declineOffer(s, 'a'); declineOffer(s, 'b');
  ok('a small supporting part and a brand are not worth remembering', passedOn(s).length === 0, JSON.stringify(passedOn(s)));
  ok('but a supporting part in a tentpole is', passedWhy(s, { tier: 'supporting', scale: 'blockbuster', role: 'Supporting' }).includes('blockbuster'));
  ok('and so is one you sent back across the table', passedWhy(s, { tier: 'supporting', scale: 'indie', role: 'Supporting', contract: { round: 1 } }).includes('nearly'));
}
// ── a sequel, and the season without you ──────────────────────────────────────
{
  const s = st({ filmography: [{ title: 'Skinless Bone', role: 'Lead', type: 'Feature Film', genre: 'Horror', rating: 80, year: 2049, director: 'Ivo Kessler' }] });
  s.offers = [{ id: 'seq1', kind: 'sequel', part: 2, projectTitle: 'Skinless Bone II', role: 'Lead', type: 'Feature Film', genre: 'Horror', salary: 2000000, months: 5, tier: 'lead', scale: 'feature', prestigeScore: 60, deadline: 3 }];
  declineOffer(s, 'seq1');
  const e = passedOn(s).find((x) => x.title === 'Skinless Bone II');
  ok('your own sequel is kept, as a franchise you walked out of', !!e && e.why.includes('franchise') && e.root === 'Skinless Bone' && e.part === 2);
  // Straight to the trades: the recast thread's opening beat writes the outcome back.
  const rc = storyOf(s, 'recast'); rc.beat = 'without'; rc.due = stamp(s);
  storiesTick(s);
  ok('the trades say how it opened (stories.js recast)', s.pendingArc && s.pendingArc.beat === 'without');
  ok('and the ledger keeps who has the part and what it took', !!e.outcome && typeof e.outcome.hit === 'boolean' && e.outcome.gross > 0
    && (e.replacedBy === null || s.pendingArc.text.includes(e.replacedBy)), JSON.stringify({ r: e.replacedBy, o: e.outcome }));
}
// ── never answered ───────────────────────────────────────────────────────────
{
  const s = st();
  s.offers = [{ id: 'x1', via: 'agent', projectTitle: 'Iron Harbour', role: 'Lead', type: 'Blockbuster', genre: 'Sci-Fi', salary: 3000000, months: 6, tier: 'tentpole', scale: 'blockbuster', deadline: 1 }];
  offersTick(s);
  const e = passedOn(s)[0];
  ok('a tentpole you let expire is kept, as never answered', !!e && e.how === 'expired' && e.why.includes('blockbuster'), JSON.stringify(e));
}
// ── kept, not hoarded ──────────────────────────────────────────────────────────
{
  const s = st();
  for (let i = 0; i < PASSED_KEEP + 7; i++) { recordPassed(s, { id: 'f' + i, projectTitle: 'Film ' + i, role: 'Lead', tier: 'lead', scale: 'feature' }, 'passed'); month(s, 7); }
  ok(`the ledger keeps the last ${PASSED_KEEP}`, passedOn(s).length === PASSED_KEEP && passedOn(s)[0].title === 'Film 7');
  const before = passedOn(s).length;
  recordPassed(s, { id: 'f46', projectTitle: 'Film 46', role: 'Lead', tier: 'lead', scale: 'feature', meeting: true }, 'meeting');
  ok('the same part lost twice is one entry, updated', passedOn(s).length === before && passedOn(s).at(-1).how === 'meeting' && passedOn(s).at(-1).why.includes('nearly'));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
