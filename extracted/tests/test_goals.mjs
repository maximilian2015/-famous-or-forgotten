import { goals } from '../src/systems/meta/goals.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', name: 'Mira Vale', ageY: 30, stage: 'career', dream: 'actor', fame: 40, respect: 20, acting: 60, charisma: 50, looks: 50, scandal: 0, media: 0, year: 2050, month: 2, timeline: [], filmography: [], productions: [], offers: [], people: [], peakFame: 40, hasApartment: true, housing: 'room', cash: 200000, ...over });
const ids = (s) => goals(s).map((g) => g.id);

ok('a child is not working toward anything yet', goals(st({ stage: 'child', ageY: 9 })).length === 0);
{
  const s = st();
  const g = goals(s);
  ok('three at a time, each with a next step', g.length === 3 && g.every((x) => x.label && x.next), JSON.stringify(ids(s)));
  ok('the climb is there', ids(s).includes('fame') && goals(s).find((x) => x.id === 'fame').label === 'Star');
  ok('and it says how far', /to go/.test(goals(s).find((x) => x.id === 'fame').now));
}
{
  const s = st({ hasApartment: false, homeless: true });
  ok('sleeping rough is the goal, first', goals(s)[0].id === 'room' && goals(s)[0].urgent);
}
{
  const s = st({ fame: 60, peakFame: 60, poisonUntil: 2050 * 12 + 8 });
  ok('box office poison is urgent and counts down', ids(s)[0] === 'poison' && /months left/.test(goals(s)[0].now));
}
{
  const s = st({ fame: 8, peakFame: 60, respect: 30 });
  ok('forgotten: the comeback', ids(s).includes('comeback') && /rated 70/.test(goals(s).find((x) => x.id === 'comeback').next));
}
{
  // Worth watching owns the risks now, in its own card with the same words — the board
  // only takes one when there is nothing at all to climb toward.
  const s = st({ strain: 90 });
  ok('a risk does not appear twice on one screen', !ids(s).includes('risk:norest'), ids(s).join(','));
  const nothing = st({ strain: 90, fame: 100, peakFame: 100, respect: 100, ambition: undefined, filmography: [{ title: 'H', rating: 95, verdict: 'smash', year: 2049, scale: 'blockbuster', tier: 'tentpole', role: 'Lead' }], awards: { wins: [{ title: 'H' }], nominations: [{ title: 'H' }] }, worldHits: 1, agent: { name: 'A', tier: 'elite', level: 1 } });
  ok('unless there is nothing else, and then it is the whole board', ids(nothing).includes('risk:norest'), ids(nothing).join(','));
}
{
  const s = st({ ambition: 'serious', filmography: [{ title: 'A', rating: 82, year: 2049 }] });
  const a = goals(s).find((x) => x.id === 'ambition');
  ok('the thing you wanted at ten is on the board', a && a.label === 'A serious actor' && /Askers read the lists/.test(a.next), JSON.stringify(ids(s)));
  const met = st({ ambition: 'serious', respect: 70, awards: { wins: [{ title: 'A' }, { title: 'B' }], nominations: [] }, filmography: [] });
  ok('and off it once you got it', !ids(met).includes('ambition'));
}
{
  const s = st({ fame: 70, peakFame: 70, respect: 45 });
  const f = goals(s).find((x) => x.id === 'fame');
  ok('A-list is a wall, not a number', f.label === 'A-lister' && /carry a film|hit you carried/.test(f.next), f.next);
  const withKey = st({ fame: 70, peakFame: 70, respect: 45, awards: { nominations: [{ title: 'A' }], wins: [] } });
  ok('with the key, it is the number again', /Work that opens/.test(goals(withKey).find((x) => x.id === 'fame').next));
}
{
  // below zero but not yet Avoided (which is a risk, and a risk takes the board first)
  const s = st({ fame: 30, respect: -10, agent: { name: 'A', tier: 'novice', level: 1 } });
  const r = goals(s).find((x) => x.id === 'respect');
  ok('below zero, standing says what it means', r && /the room hearing about you first/.test(r.next));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
