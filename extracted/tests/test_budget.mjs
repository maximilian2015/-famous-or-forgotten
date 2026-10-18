// Budget Model V2. The size of a picture belongs to the project, its budget to its size, genre
// and what it needs, and the size of your part decides neither.
import { generateOffer, scaleForOffer } from '../src/systems/career/offers.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (o = {}) => ({ version: 'x', name: 'Mira Vale', dream: 'actor', stage: 'career', ageY: 32, year: 2060, month: 3, fame: 50, respect: 40, acting: 60,
  people: [], offers: [], filmography: [], timeline: [], ...o });

// ── 1. the part does not decide the picture ───────────────────────────────────
{
  const spread = (tier, fame) => { const c = {}; for (let i = 0; i < 2000; i++) { const sc = scaleForOffer(tier, fame); c[sc] = (c[sc] || 0) + 1; } return c; };
  const lead = spread('lead', 50), sup = spread('supporting', 30), tent = spread('tentpole', 70);
  ok('a lead can be in a small film', lead.indie > 400 && lead.feature > 1000, JSON.stringify(lead));
  ok('a supporting part can be in a studio picture, and now and then a tentpole', sup.feature > 500 && sup.blockbuster > 100, JSON.stringify(sup));
  ok('a tentpole part is a tentpole', Object.keys(tent).join() === 'blockbuster');
  ok('an unknown is rarely in a tentpole', (spread('supporting', 5).blockbuster || 0) < 140);
  // Through the real offer: the part and the picture come out independent.
  const seen = new Set();
  for (let i = 0; i < 400; i++) { const o = generateOffer(st({ fame: 50 })); seen.add(`${o.tier}:${o.scale}`); }
  ok('an agent brings a lead in a feature and a lead in an indie', seen.has('lead:feature') && seen.has('lead:indie'), [...seen].join(' '));
  const small = []; for (let i = 0; i < 600; i++) small.push(generateOffer(st({ fame: 25 })));
  ok('and a supporting part in a feature', small.some((o) => o.tier === 'supporting' && o.scale === 'feature'), [...new Set(small.map((o) => o.tier + ':' + o.scale))].join(' '));
  ok('the type says the size of the picture', small.every((o) => ({ blockbuster: 'Blockbuster', feature: 'Feature Film', indie: 'Indie Film' })[o.scale] === o.type));
  const supBig = small.filter((o) => o.tier === 'supporting' && o.scale === 'feature'), supSmall = small.filter((o) => o.tier === 'supporting' && o.scale === 'indie');
  const avg = (l) => l.reduce((a, o) => a + o.salary, 0) / Math.max(1, l.length);
  ok('a supporting part in a studio picture pays more than one in an indie', avg(supBig) > avg(supSmall), `${Math.round(avg(supBig))} vs ${Math.round(avg(supSmall))}`);
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
