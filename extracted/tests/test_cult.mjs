import { cultTick } from '../src/systems/career/release.js';
import { offersTick } from '../src/systems/career/offers.js';
import { auditionFor, refreshCastingPool } from '../src/systems/career/castings.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', name: 'Mira Vale', ageY: 40, stage: 'career', dream: 'actor', fame: 40, respect: 20, acting: 60, charisma: 50, looks: 50, luck: 50, scandal: 0, media: 0, mental: 60, year: 2060, month: 0, timeline: [], filmography: [], offers: [], inbox: [], peakFame: 40, hasApartment: true, housing: 'room', ap: 100, apMax: 100, cash: 50000, genreXP: {}, confidence: 50, ...over });

// ── the cult classic ───────────────────────────────────────────────────────────
{
  const flop = { title: 'Skinless Bone', role: 'Lead', type: 'Indie Film', genre: 'Horror', rating: 38, status: 'Flop', verdict: 'bomb', year: 2050, scale: 'indie' };
  let hit = 0, wrong = 0;
  for (let i = 0; i < 400; i++) { const s = st({ filmography: [{ ...flop }, { title: 'Fresh', genre: 'Horror', rating: 40, verdict: 'bomb', year: 2058, scale: 'indie' }, { title: 'Good', genre: 'Drama', rating: 80, verdict: 'smash', year: 2050, scale: 'feature' }] }); cultTick(s); if (s.filmography[0].cult) hit++; if (s.filmography[1].cult || s.filmography[2].cult) wrong++; }
  ok('a horror flop from ten years ago comes back sometimes', hit > 15 && hit < 80, `${hit}/400`);
  ok('never a fresh flop, never a hit', wrong === 0);
  const s = st({ filmography: [{ ...flop }] }); let n = 0; while (!s.filmography[0].cult && n++ < 500) cultTick(s);
  ok('and it is worth standing, hype and a line', s.filmography[0].cult === 2060 && s.respect === 24 && s.media === 35 && s.timeline.some((x) => /cult classic/.test(x.text)));
  cultTick(s);
  ok('only once', s.respect === 24);
}
// ── the brand goes quiet when you do ───────────────────────────────────────────
{
  const s = st({ media: 50, hypeSource: 'scandal' });
  s.offers = [{ id: 'b', kind: 'brand', projectTitle: 'The campaign', deadline: 3, salary: 90000, months: 1, tier: 'supporting', scale: 'oneoff' }];
  offersTick(s);
  ok('with the hype up, the brand waits', s.offers.length === 1);
  s.media = 20; offersTick(s);
  ok('with the hype gone, so is the brand', s.offers.length === 0 && s.timeline.some((x) => /brand went quiet/.test(x.text)));
}
// ── overexposure: after a campaign the brands wait ───────────────────────────
{
  const s = st({ fame: 70, peakFame: 70, respect: 30 });
  s.castingPool = [{ id: 'b1', title: 'Glow', type: 'Brand Campaign', role: 'Face', genre: 'Commercial', salary: 900000, months: 1, scale: 'oneoff', medium: 'ad', shelf: 'day', minFame: 0, room: { want: 'looks', readers: 1, field: 40 } }];
  let took = null; for (let i = 0; i < 60 && !took; i++) { const t = JSON.parse(JSON.stringify(s)); auditionFor(t, 'b1', 95); if (t.filmography.length) took = t; }
  ok('a campaign taken', !!took && (took._brandUntil || 0) > took.year * 12 + took.month + 3);
  let ads = 0; for (let i = 0; i < 30; i++) { refreshCastingPool(took, true); ads += took.castingPool.filter((c) => c.medium === 'ad').length; }
  ok('and for months the brands do not call', ads === 0, String(ads));
  took._brandUntil = 0; ads = 0; for (let i = 0; i < 30; i++) { refreshCastingPool(took, true); ads += took.castingPool.filter((c) => c.medium === 'ad').length; }
  ok('then they do', ads > 0);
}
// ── the shampoo ────────────────────────────────────────────────────────────────
{
  const s = st({ respect: 50, typecast: { scores: { serious: 6 }, active: ['serious'], primary: 'serious', strong: ['serious'] } });
  s.castingPool = [{ id: 'c1', title: 'Glow', type: 'Brand Campaign', role: 'The face', genre: 'Commercial', salary: 40000, months: 1, scale: 'oneoff', shelf: 'day', minFame: 0, room: { want: 'looks', readers: 1, field: 40 } }];
  let took = false; for (let i = 0; i < 40 && !took; i++) { const t = JSON.parse(JSON.stringify(s)); auditionFor(t, 'c1', 95); if (t.filmography.length) { took = true; ok('a serious actor selling shampoo pays two points of standing', t.respect === 48 && /serious rooms noticed/.test(t.lastEvent), String(t.respect)); } }
  ok('the read was taken at least once', took);
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
