import { CHAINS, CHAIN_ORDER, storiesTick, resolveStory, activeStories, storyOf, noteSequelLoss, noteRefusal, holdsAGrudge, hiding, storyCastFactor, storyOfferFactor } from '../src/systems/meta/stories.js';
import { resolveArc } from '../src/systems/life/arcs.js';
import { storyTick } from '../src/systems/meta/trouble.js';
import { riskTick } from '../src/systems/meta/risk.js';
import { declineOffer } from '../src/systems/career/offers.js';
import { ensureWorld } from '../src/systems/world/world.js';
import { castingChance } from '../src/systems/career/castings.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => { const s = { version: 'x', name: 'Mira Vale', gender: 'female', ageY: 30, stage: 'career', dream: 'actor', fame: 40, respect: 20, acting: 60, charisma: 60, looks: 50, luck: 50, scandal: 0, media: 10, mental: 60, year: 2050, month: 2, timeline: [], filmography: [], productions: [], people: [], offers: [], peakFame: 40, hasApartment: true, housing: 'room', ap: 100, cash: 500000, genreXP: {}, alive: true, ...over }; ensureWorld(s); return s; };
const stamp = (s) => s.year * 12 + s.month;
const month = (s, n = 1) => { for (let i = 0; i < n; i++) { s.month++; if (s.month > 11) { s.month = 0; s.year++; } } };
const pick = (s, label) => { const i = s.pendingArc.choices.findIndex((c) => new RegExp(label).test(c.label)); if (i < 0) throw new Error('no choice ' + label + ' in ' + s.pendingArc.choices.map((c) => c.label).join('|')); return resolveArc(s, i); };

// ── the modal and the router ───────────────────────────────────────────────────
{
  ok('every chain has a title, a start, a status and beats', CHAIN_ORDER.every((id) => CHAINS[id].title && CHAINS[id].start && CHAINS[id].status && Object.keys(CHAINS[id].beats).length));
}
// ── 1. the story in the papers: deny, and the tape comes out ────────────────────
{
  const s = st({ drink: { level: 60 } });
  riskTick(s); month(s); riskTick(s);
  let t = null;
  for (let i = 0; i < 400 && !t; i++) { const x = JSON.parse(JSON.stringify(s)); storyTick(x); if (x._lastStory === stamp(x)) t = x; }
  ok('a story in the papers happened', !!t);
  storiesTick(t);
  ok('the scandal chain starts the same month and asks', storyOf(t, 'scandal') && t.pendingArc && t.pendingArc.story === 'scandal', JSON.stringify(t.pendingArc && t.pendingArc.speaker));
  ok('four ways to answer', t.pendingArc.choices.length === 4 && t.pendingArc.choices.every((c) => c.hint));
  const r0 = t.respect;
  pick(t, 'Apologise');
  ok('an apology costs a point of fame and buys standing', t.respect > r0 && !t.pendingArc && storyOf(t, 'scandal').beat === 'after');
  month(t, 2); storiesTick(t);
  ok('two months on, the last paragraph', t.pendingArc && t.pendingArc.beat === 'after');
  pick(t, 'Move on');
  ok('and the chain ends', !storyOf(t, 'scandal') && t._storyLog.scandal.length === 1);
  // hiding
  const h = JSON.parse(JSON.stringify(s)); storyTick(h); h._lastStory = stamp(h); h._lastStoryId = 'dui'; storiesTick(h);
  pick(h, 'Disappear');
  ok('out of sight: no offers, no board', hiding(h) && storyOfferFactor(h) === 0);
  month(h, 2);
  ok('and back after a month', !hiding(h));
}
// ── 7. the sequel without you ──────────────────────────────────────────────────
{
  const s = st({ filmography: [{ title: 'Skinless Bone', role: 'Lead', type: 'Feature Film', genre: 'Horror', rating: 80, year: 2049, director: 'Ivo Kessler', gross: 4.7e8 }] });
  const o = { id: 'seq1', kind: 'sequel', part: 2, projectTitle: 'Skinless Bone II', role: 'Lead', type: 'Feature Film', genre: 'Horror', salary: 2000000, months: 5, tier: 'lead', scale: 'feature', prestigeScore: 60, deadline: 3 };
  s.offers = [o];
  const r0 = s.respect;
  declineOffer(s, 'seq1');
  ok('passing on your own sequel: standing down, the fans furious', s.respect < r0 && s.scandal > 0 && s.timeline.some((x) => /Fans are furious/.test(x.text)));
  const rc = storyOf(s, 'recast');
  ok('the chain has the director from the credit', rc && rc.data.director === 'Ivo Kessler' && rc.beat === 'meeting');
  ok('it says so on the main screen', activeStories(s).some((x) => x.title === 'Without you' && /Kessler|Ivo/.test(x.line)));
  month(s, 2); storiesTick(s);
  ok('two months later the director writes', s.pendingArc && s.pendingArc.beat === 'meeting' && /Kessler/.test(s.pendingArc.speaker));
  pick(s, 'Go to the meeting');
  const back = s.offers.find((x) => x.story === 'recast');
  ok('the paper comes back moved: more money, shorter, not exclusive', back && back.salary > o.salary && back.months < o.months && back.exclusive === false && back.deadline === 4);
  // the second no
  const r1 = s.respect;
  declineOffer(s, back.id);
  ok('the second no is very expensive', s.respect <= r1 - 8 && holdsAGrudge(s, 'Ivo Kessler') && s.timeline.some((x) => /will not work with you again/.test(x.text)));
  ok('and the film will open without you', storyOf(s, 'recast').beat === 'without' && storyOf(s, 'recast').due > stamp(s) + 11);
  month(s, 18); storiesTick(s);
  ok('the trades say how it opened', s.pendingArc && s.pendingArc.beat === 'without' && /opened at €\d+m without you/.test(s.pendingArc.text) && /has your part/.test(s.pendingArc.text));
  resolveArc(s, 0);
  ok('the chain ends or goes on to part three', !storyOf(s, 'recast') || storyOf(s, 'recast').beat === 'again');
  ok('the timeline has the opening', s.timeline.some((x) => /opened without you and (did fine|sank)/.test(x.text)));
  // a season of your own show
  const t = st({ filmography: [{ title: 'Careless Border', role: 'Lead', type: 'Drama Series', genre: 'Drama', rating: 70, year: 2049, director: 'Anouk Vey', episodes: 10, season: 2 }] });
  t.offers = [{ id: 'ren1', kind: 'renewal', season: 3, seriesTitle: 'Careless Border', projectTitle: 'Careless Border · season 3', role: 'Lead', type: 'Drama Series', genre: 'Drama', salary: 800000, episodeFee: 80000, episodes: 10, months: 5, tier: 'lead', scale: 'recurring', deadline: 3 }];
  declineOffer(t, 'ren1');
  ok('a season of your own show, same road', storyOf(t, 'recast') && storyOf(t, 'recast').data.kind === 'renewal' && t.timeline.some((x) => /not coming back for season 3/.test(x.text)));
  // a supporting part is nobody's story
  const u = st(); u.offers = [{ id: 'x', kind: 'sequel', part: 2, projectTitle: 'Small II', role: 'Supporting', tier: 'supporting', scale: 'indie', salary: 20000, months: 2, deadline: 2 }];
  declineOffer(u, 'x');
  ok('a supporting part passed on is nobody’s story', !storyOf(u, 'recast'));
}
// ── 6. the one you passed on ───────────────────────────────────────────────────
{
  const s = st({ people: [{ id: 'p1', name: 'Nils Arden', role: 'Film Director', relationship: 60, industryWeight: 70, fromSet: true }] });
  s.offers = [{ id: 'o1', via: 'agent', director: 'Nils Arden', directorId: 'p1', projectTitle: 'Glass Winter', role: 'Lead', type: 'Feature Film', genre: 'Drama', salary: 400000, months: 4, tier: 'lead', scale: 'feature', deadline: 3 }];
  declineOffer(s, 'o1');
  ok('a director you passed on holds it', holdsAGrudge(s, 'Nils Arden') && s.people[0].cold === true);
  const g = s.grudges[0];
  month(s, g.due - stamp(s)); storiesTick(s);
  ok('the film opens without you, a year or two on', storyOf(s, 'refused') && s.pendingArc && /Glass Winter/.test(s.pendingArc.text));
  if (g.hit) { pick(s, 'Write'); ok('you can write to them', !s.pendingArc); } else { pick(s, 'dodged'); ok('or you dodged it', !s.pendingArc && !storyOf(s, 'refused')); }
}
// ── 2. the rival moves the board ────────────────────────────────────────────────
{
  const s = st({ fame: 60 });
  s.stories = [{ id: 'rival', beat: 'year', due: stamp(s) + 12, since: stamp(s), data: { who: s.world.actors[5].id, name: s.world.actors[5].name, tone: 'hot' } }];
  ok('a hot rivalry makes the big rooms harder', storyCastFactor(s, { scale: 'feature', role: 'Lead' }) < 1 && storyCastFactor(s, { scale: 'small', role: 'Lead' }) === 1);
  const c = { genre: 'Drama', scale: 'feature', type: 'Feature Film', role: 'Lead', room: { want: 'craft', readers: 2, field: 50 } };
  const t = st({ fame: 60 });
  ok('and the odds show it', castingChance(s, c) < castingChance(t, c));
  month(s, 12); storiesTick(s);
  ok('a year in: the two-hander', s.pendingArc && s.pendingArc.beat === 'year' && /#\d+/.test(s.pendingArc.text));
  pick(s, 'two-hander');
  ok('the two-hander is an offer with them on it', s.offers.some((o) => o.kind === 'twohander' && o.costarId === s.world.actors[5].id));
}
// ── 3. the agent, 4. the years, 5. the comeback ─────────────────────────────────
{
  const s = st({ agent: { name: 'Anouk Halloran', tier: 'novice', level: 1, since: 2050 * 12 - 20 } });
  s.stories = [{ id: 'agent', beat: 'slip', due: stamp(s), since: stamp(s), data: { name: 'Anouk Halloran' } }];
  storiesTick(s);
  ok('the agent chain asks', s.pendingArc && /Halloran/.test(s.pendingArc.text));
  pick(s, 'Let it go');
  ok('letting it go: what is left after the bigger clients', storyOfferFactor(s) === 0.8);
  month(s, 6); storiesTick(s);
  ok('six months on, the books', s.pendingArc && s.pendingArc.beat === 'books');
  pick(s, 'Sue');
  ok('sue: the agent is gone and you are between agents', !s.agent && !storyOf(s, 'agent'));
  const y = st({ ageY: 47, gender: 'male', fame: 50 });
  let started = false; for (let i = 0; i < 300 && !started; i++) { storiesTick(y); if (storyOf(y, 'ageing')) started = true; }
  ok('the years come for a man at forty-five', started && y.pendingArc && y.pendingArc.beat === 'call');
  pick(y, 'character');
  ok('the character actor: leads harder, the rest easier', y.characterActor && storyCastFactor(y, { scale: 'feature', role: 'Lead' }) < 1 && storyCastFactor(y, { scale: 'feature', role: 'Supporting' }) > 1);
  const c = st({ fame: 8, peakFame: 60, respect: 20, people: [{ id: 'd', name: 'Rosa Lind', role: 'Film Director', relationship: 50 }] });
  c._fadedSince = stamp(c) - 14;
  let cb = false; for (let i = 0; i < 300 && !cb; i++) { storiesTick(c); if (storyOf(c, 'comeback')) cb = true; }
  ok('forgotten a year and the call comes', cb && c.pendingArc && /festivals/.test(c.pendingArc.text));
  pick(c, 'Take it');
  ok('the festival film is on the paper', c.offers.some((o) => o.story === 'comeback' && o.scale === 'festival'));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
