// The card at the end of a film's run says what it had to take to break even — the number the
// verdict is measured against (release.js breakEvenFor) — and what that number is made of.
// Maxi, at "€216m on a €90m film · broke even": "how much does the film itself cost? isn't that
// a success?" The verdict was right; the card kept its reason to itself.
import { scheduleRelease, releaseTick, runTick, breakEvenFor, campaignSpend } from '../src/systems/career/release.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = () => ({ version: 'x', name: 'Mira Vale', ageY: 30, stage: 'career', dream: 'actor', fame: 60, respect: 40, acting: 70, charisma: 50, looks: 50, luck: 50, scandal: 0, media: 0, mental: 60,
  year: 2050, month: 2, timeline: [], filmography: [], productions: [], offers: [], inbox: [], releases: [], peakFame: 60, hasApartment: true, housing: 'room', ap: 100, apMax: 100, cash: 100000,
  genreXP: {}, people: [], family: [], moments: [], events: [], castingPool: [] });
const run = (s, months) => { for (let i = 0; i < months; i++) { s.month += 1; if (s.month > 11) { s.month = 0; s.year += 1; } releaseTick(s); runTick(s); } };
const job = { title: 'This Lantern', role: 'Lead', type: 'Feature Film', genre: 'Drama', scale: 'feature', salary: 900000, months: 4, tier: 'lead', prestigeScore: 55, stability: 90 };

const s = st();
scheduleRelease(s, { title: 'This Lantern', role: 'Lead', type: 'Feature Film', genre: 'Drama', salary: 900000, rating: 59, status: 'Released', year: 2050, season: 0, part: 1, episodes: 0, scale: 'feature' }, job);
run(s, 24);
const credit = s.filmography.find((c) => c.title === 'This Lantern');
const shown = [s.bigMoment, ...(s.moments || [])].filter(Boolean);
const m = shown.find((x) => x.id === 'verdict' && x.title === 'This Lantern');
ok('the film ran and closed', !!credit && credit.boxOffice > 0 && !!credit.verdict, credit ? `${credit.verdict} ${credit.boxOffice}` : 'no credit');
ok('the card for it was put up', !!m, shown.map((x) => x.id).join(','));
if (m) {
  const b = m.breakEven || {};
  ok('the card carries the sum the verdict was measured against', b.need === credit.needed && b.need > 0, `${b.need} vs ${credit.needed}`);
  ok('which is breakEvenFor: the film and its campaign, the cinemas\' half on top', Math.abs(b.need - (b.budget + b.sell) * 1.5) < 2, JSON.stringify(b));
  ok('and the gross and the verdict are the credit\'s own', b.gross === credit.boxOffice && b.verdict === credit.verdict);
}
// The numbers in Maxi's case, said out loud: a €90m feature with a real campaign needs €209m.
const need = breakEvenFor({ scale: 'feature', campaignTier: 'major' });
ok('a €90m feature sold properly needs about €209m to break even', Math.round(need / 1e6) === 209 && Math.round(campaignSpend({ scale: 'feature', campaignTier: 'major' })) === 50, String(need));
ok('so €216m is 1.03 of it: broke even, which runs from 0.7 to 1.25', (216e6 / need).toFixed(2) === '1.03');
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
