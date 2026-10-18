// Budget Model V2. The size of a picture belongs to the project, its budget to its size, genre
// and what it needs, and the size of your part decides neither.
import { generateOffer, scaleForOffer } from '../src/systems/career/offers.js';
import { planBudget, ensureBudget, sequelBudget } from '../src/systems/career/budget.js';
import { breakEvenFor } from '../src/systems/career/release.js';

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
// ── 2. what a picture costs ───────────────────────────────────────────────────
{
  const many = (genre, scale, n = 2000) => Array.from({ length: n }, (_, i) => planBudget({ seed: 'p' + i, genre, scale }).budget).sort((a, b) => a - b);
  const med = (l) => l[Math.floor(l.length / 2)];
  const com = many('Comedy', 'feature'), hor = many('Horror', 'feature'), sci = many('Sci-Fi', 'feature'), mus = many('Musical', 'feature');
  ok('a studio comedy costs tens of millions, not ninety', med(com) >= 22 && med(com) <= 45, String(med(com)));
  ok('and is not one number: under €20m, €38m, now and then €90m when it needs it', com[0] < 21 && com[1900] > 45 && com.some((x) => x >= 90), `${com[0]} / ${com[1900]} / max ${com.at(-1)}`);
  ok('horror is cheap to make, a musical builds its stage, science fiction its world', med(hor) < med(com) && med(com) < med(mus) && med(mus) < med(sci), `${med(hor)} ${med(com)} ${med(mus)} ${med(sci)}`);
  const all = ['Comedy', 'Drama', 'Romance', 'Horror', 'Thriller', 'Crime', 'Musical', 'Sci-Fi'].flatMap((g) => many(g, 'blockbuster', 300)).sort((a, b) => a - b);
  ok('a tentpole still costs about what it did', med(all) >= 200 && med(all) <= 240, String(med(all)));
  ok('an indie is an indie', med(many('Drama', 'indie')) < 8 && many('Sci-Fi', 'indie').at(-1) <= 22);
  ok('the same project always costs the same', planBudget({ seed: 'x1', genre: 'Crime', scale: 'feature' }).budget === planBudget({ seed: 'x1', genre: 'Crime', scale: 'feature' }).budget);
  // The part does not move it: the same offer as a lead and as a supporting part.
  const a = ensureBudget({ id: 'o7', genre: 'Comedy', scale: 'feature', tier: 'lead' }), b = ensureBudget({ id: 'o7', genre: 'Comedy', scale: 'feature', tier: 'supporting' });
  ok('the size of your part does not change what the picture costs', a.budget === b.budget && a.budget > 0);
  const kept = ensureBudget({ id: 'o8', genre: 'Comedy', scale: 'feature', budget: 61, needs: ['stunts'] });
  ok('a budget once given is kept', kept.budget === 61 && kept.needs.join() === 'stunts');
  ok('television has no budget here', ensureBudget({ id: 'tv', genre: 'Drama', scale: 'recurring' }).budget === undefined);
  ok('a sequel costs more than the film before it, inside its range', sequelBudget(40, 'feature', 2) > 40 && sequelBudget(125, 'feature', 3) <= 143);
  // The verdict is measured against it.
  ok('what a film has to take reads its own budget', breakEvenFor({ scale: 'feature', campaignTier: 'major', budget: 30 }) === Math.round((30 + 30 * 0.55) * 1.5 * 1e6)
    && breakEvenFor({ scale: 'feature', campaignTier: 'major' }) === 209250000, String(breakEvenFor({ scale: 'feature', campaignTier: 'major', budget: 30 })));
  ok('an offer from an agent arrives priced', (() => { const o = generateOffer(st({ fame: 50 })); return o.budget > 0 && Array.isArray(o.needs); })());
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
