import { DIRECTIONS, directionsFor, chooseDirection, briefFor, continues, canPitch, thingName,
  remindersFor, buyReminder, remindCost, gapOf, holdFactor, retentionLine, dirAppeal, dirBump, pitchAftermath } from '../src/systems/career/chapter.js';
import { makeCharacter, dressOffers, partLine, sizeLine } from '../src/systems/career/script.js';
import { renewalOdds } from '../src/systems/career/franchise.js';
import { ensureWorld } from '../src/systems/world/world.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => { const s = { version: 'x', name: 'Mira Vale', gender: 'female', ageY: 38, stage: 'career', dream: 'actor', fame: 60, respect: 40, acting: 75, charisma: 60, looks: 60, luck: 50, scandal: 0, media: 0, mental: 70, year: 2060, month: 2, timeline: [], filmography: [], productions: [], offers: [], inbox: [], releases: [], peakFame: 60, hasApartment: true, housing: 'room', ap: 100, apMax: 100, apMaxEff: 100, cash: 5e6, genreXP: {}, people: [], quote: 4e6, awards: { wins: [], nominations: [] }, spentLife: {}, ...over }; ensureWorld(s); return s; };
const renewal = (over) => ({ id: 'off1', kind: 'renewal', seriesTitle: 'Lost Signal', season: 4, projectTitle: 'Lost Signal · season 4',
  role: 'Lead', type: 'Network Drama', genre: 'Drama', episodes: 10, episodeFee: 90000, salary: 900000, months: 5,
  prestigeScore: 55, tier: 'lead', scale: 'network', deadline: 3, ...over });

// ── who you would be playing, on every offer, before you sign ─────────────────
{
  const s = st({ offers: [{ id: 'o1', projectTitle: 'The Long Field', role: 'Lead', type: 'Feature Film', genre: 'Crime', tier: 'lead', salary: 1e6, months: 4 },
    { id: 'o2', kind: 'brand', projectTitle: 'A watch', from: 'Vellum' }] });
  dressOffers(s);
  const o = s.offers[0];
  ok('every part says who you would be', !!o.character && !!o.character.name && !!o.character.what, JSON.stringify(o.character));
  ok('and what the thing is about', !!o.premise && o.premise.length > 30, String(o.premise));
  ok('the line reads as a person', /—/.test(partLine(o)), partLine(o));
  ok('and how big the part is', /Lead/.test(sizeLine(o)), sizeLine(o));
  ok('a brand is not a part', !s.offers[1].character && !s.offers[1].premise);
  const before = o.character.name;
  dressOffers(s);
  ok('and it is rolled once, not every month', s.offers[0].character.name === before);
  const c = makeCharacter(st({ gender: 'male' }), 'Horror', 'lead');
  ok('a genre gets its own kind of person', !!c.what && c.what.length > 8, c.what);
}
// ── the brief, and where it goes next ────────────────────────────────────────
{
  const s = st({ offers: [renewal()] });
  dressOffers(s);
  const o = s.offers[0];
  ok('a season that continues has a brief', continues(o) && !!briefFor(s, o));
  ok('and it names your character', /—/.test(briefFor(s, o).who), briefFor(s, o).who);
  ok('and it is Season 4', thingName(o) === 'Season 4');
  const list = directionsFor(s, o);
  ok('three of them, and your own', list.length === 4, String(list.length));
  ok('the safe one is always there', list.some((d) => d.id === 'safe'));
  ok('and your own is the last one', list[3].id === 'mine');
  ok('which is shut at this standing', !list[3].open && /A-list/.test(list[3].why), list[3].why);
  const base = o.prestigeScore;
  chooseDirection(s, 'off1', 'deeper');
  ok('choosing moves the material', o.prestigeScore > base, `${base} → ${o.prestigeScore}`);
  ok('and the brief now says what you chose', briefFor(s, o).settled && /stays small/.test(briefFor(s, o).where));
  chooseDirection(s, 'off1', 'raise');
  ok('changing your mind measures from the same place, not from the last choice',
    o.prestigeScore === Math.max(8, Math.min(96, base + DIRECTIONS.raise.prestige)), `${base} → ${o.prestigeScore}`);
  ok('and it sets the shape of the show', o.arc === 'holds', String(o.arc));
  // the paper has gone
  o.signed = true;
  chooseDirection(s, 'off1', 'deeper');
  ok('once the paper has gone it is settled', o.direction === 'raise' && /has gone/.test(s.lastEvent), s.lastEvent);
}
// ── your own idea, and what it costs when it does not work ───────────────────
{
  const big = st({ fame: 80, offers: [renewal()] });
  dressOffers(big);
  ok('an A-lister can pitch', canPitch(big) && directionsFor(big, big.offers[0])[3].open);
  chooseDirection(big, 'off1', 'mine');
  ok('and the game says it is yours now', big.offers[0].direction === 'mine' && /you said/.test(big.lastEvent), big.lastEvent);
  const won = st({ respect: 40 }), lost = st({ respect: 40 });
  pitchAftermath(won, { title: 'X', rating: 80 }, { direction: 'mine' });
  pitchAftermath(lost, { title: 'X', rating: 40 }, { direction: 'mine' });
  ok('a pitch that worked is worth standing', won.respect > 40, String(won.respect));
  ok('and one that did not costs it', lost.respect < 40, String(lost.respect));
  const none = st({ respect: 40 });
  pitchAftermath(none, { title: 'X', rating: 40 }, { direction: 'safe' });
  ok('a direction you were handed costs you nothing', none.respect === 40);
  ok('the directions actually move the finished thing', dirBump({ direction: 'deeper' }) > 0 && dirAppeal({ direction: 'raise' }) > 1.2 && dirAppeal({ direction: 'deeper' }) < 1);
}
// ── coming back after years away ─────────────────────────────────────────────
{
  const s = st({ year: 2066, filmography: [{ title: 'Lost Signal · season 3', rating: 74, year: 2062, running: false }], offers: [renewal()] });
  dressOffers(s);
  const o = s.offers[0];
  const g = gapOf(s, o);
  ok('the game knows how long it has been', g && g.years === 4, JSON.stringify(g));
  const rm = remindersFor(s, o);
  ok('and offers to sell it back to people', !!rm && rm.options.length === 2, rm ? String(rm.options.length) : 'none');
  ok('one costs money, one costs you', rm.options[0].cost === remindCost(o) && rm.options[1].ap > 0, JSON.stringify(rm.options.map((x) => [x.cost, x.ap])));
  const cash = s.cash;
  buyReminder(s, 'off1', 'digital');
  ok('paying for it takes the money', s.cash === cash - remindCost(o), `${cash} → ${s.cash}`);
  ok('and the statement says where it went', (s.spentLife.career || 0) === remindCost(o), JSON.stringify(s.spentLife));
  ok('and you only buy it once', remindersFor(s, o).options.every((x) => !x.open));
  // too soon, or it was not good enough
  const soon = st({ year: 2063, filmography: [{ title: 'Lost Signal · season 3', rating: 74, year: 2062, running: false }], offers: [renewal()] });
  ok('nothing to sell after one year', !remindersFor(soon, soon.offers[0]));
  const bad = st({ year: 2066, filmography: [{ title: 'Lost Signal · season 3', rating: 40, year: 2062, running: false }], offers: [renewal()] });
  ok('and nobody sells back something people did not like', !remindersFor(bad, bad.offers[0]));
}
// ── the season, measured from the first episode to the last ──────────────────
{
  const good = [], bad = [];
  for (let i = 0; i < 200; i++) { good.push(holdFactor(88, {})); bad.push(holdFactor(42, {})); }
  const avg = (a) => a.reduce((n, x) => n + x, 0) / a.length;
  ok('a season people liked keeps its audience', avg(good) > 1, avg(good).toFixed(2));
  ok('and one they did not loses it', avg(bad) < 0.75, avg(bad).toFixed(2));
  ok('going deeper costs you some of them', avg([...Array(200)].map(() => holdFactor(75, { direction: 'deeper' }))) < avg([...Array(200)].map(() => holdFactor(75, {}))));
  ok('and bought attention brings the ones who leave', avg([...Array(200)].map(() => holdFactor(75, { remind: 'digital' }))) < avg([...Array(200)].map(() => holdFactor(75, { remind: 'press' }))));
  ok('the night it ends says both numbers', /4\.1m/.test(retentionLine(6.2, 4.1)) && /6\.2m/.test(retentionLine(6.2, 4.1)), String(retentionLine(6.2, 4.1)));
  ok('and says what happened between them', /did not stay/.test(retentionLine(9, 4)), String(retentionLine(9, 4)));
  ok('a show that grew is called that', /grew/.test(retentionLine(4, 4.6)), String(retentionLine(4, 4.6)));
  // and the network decides on the finale
  ok('the network renews on the number at the end', renewalOdds(70, 2, 'Network Drama', 4.2, 3) > renewalOdds(70, 2, 'Network Drama', 1.1, 3));
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
