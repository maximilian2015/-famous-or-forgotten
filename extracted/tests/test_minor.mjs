import { computeLegacy } from '../src/systems/meta/legacy.js';
import { startProduction } from '../src/systems/career/production.js';
import { refreshCastingPool, auditionFor, submissionsTick } from '../src/systems/career/castings.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', ageY: 30, stage: 'career', dream: 'actor', hasApartment: true, housing: 'room',
  cash: 5000, mental: 60, health: 80, acting: 80, singing: 0, charisma: 60, looks: 60, luck: 90, scandal: 0,
  fame: 40, respect: 40, confidence: 40, ap: 100, year: 2060, month: 0, peakFame: 40, worldHits: 0,
  filmography: [], discography: [], releases: [], frozen: [], genreXP: {}, timeline: [], ...over });

// a day's work is flagged the moment it is booked
let booked = null;
for (let i = 0; i < 600 && !booked; i++) {
  const s = st({ luck: 100, acting: 100, charisma: 100, looks: 100 });
  refreshCastingPool(s, true);
  const c = s.castingPool.find((x) => (x.months || 1) < 2);
  if (!c) continue;
  s.ap = 100; auditionFor(s, c.id, 100);
  if (s.filmography.length) booked = s.filmography[0];
}
ok('a day of work is booked as Other work', booked && booked.minor === true, JSON.stringify(booked));

// and a real shoot is not
let shot = null;
for (let i = 0; i < 600 && !shot; i++) {
  const s = st({ luck: 100, acting: 100, charisma: 100, looks: 100 });
  refreshCastingPool(s, true);
  const c = s.castingPool.find((x) => (x.months || 1) >= 2 && (s.fame || 0) >= (x.minFame || 0));
  if (!c) continue;
  // A read is a read now: they answer in one to three months, and a yes is an offer.
  s.ap = 100; auditionFor(s, c.id, 100);
  for (let w = 0; w < 5 && !(s.offers || []).length; w++) { s.month++; if (s.month > 11) { s.month = 0; s.year++; } submissionsTick(s); }
  if ((s.offers || []).length) { startProduction(s, s.offers[0]); s.offers = []; }
  if (s.production) shot = s.production;
}
ok('a real shoot is not Other work', !!shot && !shot.minor, shot && shot.title);

// the legacy ignores ads entirely
const withAds = st({ peakFame: 60, respect: 50, filmography: [
  { title: 'Golden Echo', type: 'Feature Film', rating: 91, salary: 900000, year: 2060 },
  { title: 'Fresh Soap', type: 'Brand Campaign', rating: 88, salary: 40000, year: 2059, minor: true },
  { title: 'Some Advert', type: 'Commercial', rating: 90, salary: 20000, year: 2058, minor: true },
] });
const L = computeLegacy(withAds);
ok('ads do not count as credits', L.credits === 1, String(L.credits));
ok('and an advert is never a hit', L.hits === 1, String(L.hits));

// old saves have no flag — recognised by what the job was called
const oldSave = st({ peakFame: 60, filmography: [
  { title: 'Late Avenue', type: 'Brand Campaign', rating: 38, salary: 42127, year: 2058 },
  { title: 'Broken Avenue', type: 'Voice Session', rating: 42, salary: 702, year: 2057 },
  { title: 'Bright Echo', type: 'TV Extra', rating: 48, salary: 2515, year: 2058 },
  { title: 'Golden Hour', type: 'Feature Film', rating: 89, salary: 166578, year: 2060 },
] });
const O = computeLegacy(oldSave);
ok('a save written before the flag still sorts correctly', O.credits === 1, `${O.credits} credits counted`);
ok('a theatre run is real work, not an advert', computeLegacy(st({ filmography: [
  { title: 'Night Play', type: 'Theatre Run', rating: 80, salary: 30000, year: 2060 }] })).credits === 1);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
