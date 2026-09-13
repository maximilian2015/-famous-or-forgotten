import {refreshCastingPool, auditionFor, castingChance, scaleOf, submissionsTick } from '../src/systems/career/castings.js';
import { productionTick, rehearse, startProduction } from '../src/systems/career/production.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', ageY: 28, stage: 'career', dream: 'actor', hasApartment: true, housing: 'room',
  cash: 5000, mental: 60, health: 80, acting: 60, singing: 0, charisma: 50, looks: 50, luck: 50, scandal: 0,
  fame: 70, ap: 3, year: 2030, month: 0, filmography: [], discography: [], genreXP: {}, timeline: [], ...over });

// pool shape
const pool = st(); refreshCastingPool(pool, true);
ok('the pool fills', pool.castingPool.length >= 6, String(pool.castingPool.length));
// And no shelf is left empty, which is what six listings across four shelves kept doing.
ok('and every shelf has something on it', new Set(pool.castingPool.map((x) => x.shelf)).size >= 3,
  JSON.stringify(pool.castingPool.reduce((m, x) => ((m[x.shelf] = (m[x.shelf] || 0) + 1), m), {})));
ok('every listing has a real span', pool.castingPool.every((c) => c.months >= 1 && c.months <= 14));
ok('television is quoted per episode', pool.castingPool.filter((c) => c.shelf === 'series').every((c) => c.perEpisode && c.episodes >= 1 && c.salary === c.episodeFee * c.episodes));
ok('film is quoted for the picture', pool.castingPool.filter((c) => c.shelf === 'film').every((c) => !c.perEpisode && c.episodes === 0 && c.salary > 0));
ok('every listing knows its scale', pool.castingPool.every((c) => !!scaleOf(c).tier));

// lengths actually vary by scale
const seen = {};
for (let i = 0; i < 300; i++) { const s = st(); refreshCastingPool(s, true); for (const c of s.castingPool) { (seen[c.scale] = seen[c.scale] || []).push(c.months); } }
const range = (k) => seen[k] ? [Math.min(...seen[k]), Math.max(...seen[k])] : null;
ok('one-off work is one month', range('oneoff')[1] === 1, JSON.stringify(range('oneoff')));
ok('an episode is a couple of months', range('episode')[0] >= 2 && range('episode')[1] <= 3, JSON.stringify(range('episode')));
ok('a feature is half a year', range('feature')[0] >= 5 && range('feature')[1] <= 8, JSON.stringify(range('feature')));
ok('a blockbuster can eat a year', range('blockbuster')[1] >= 12, JSON.stringify(range('blockbuster')));
ok('lengths inside one scale vary', new Set(seen.feature).size > 1, [...new Set(seen.feature)].join(','));
console.log('      shoot length by scale — ' + Object.keys(seen).sort().map((k) => `${k} ${range(k)[0]}-${range(k)[1]} mo`).join(', '));

// booking a real shoot starts a production instead of resolving
function bookScale(scale) {
  for (let i = 0; i < 400; i++) {
    const s = st({ luck: 100, acting: 100, charisma: 100, looks: 100 });
    refreshCastingPool(s, true);
    const c = s.castingPool.find((x) => x.scale === scale);
    if (!c) continue;
    s.ap = 3;
    auditionFor(s, c.id, 100);
    // A read for anything with a schedule is answered in one to three months, and a yes
    // arrives as an offer rather than as a summons. See systems/career/castings.js.
    for (let w = 0; w < 5 && !(s.offers || []).length && (s.submissions || []).length; w++) {
      s.month++; if (s.month > 11) { s.month = 0; s.year++; }
      submissionsTick(s);
    }
    if ((s.offers || []).length) { startProduction(s, s.offers[0]); s.offers = []; }
    if (s.production || s.filmography.length) return s;
  }
  return null;
}
const feature = bookScale('feature');
ok('booking a feature starts a shoot', !!feature.production, JSON.stringify({ prod: !!feature.production, credits: feature.filmography.length }));
ok('and does NOT hand you a finished credit', feature.filmography.length === 0);
ok('the shoot has the right length', feature.production.monthsLeft === feature.production.months && feature.production.months >= 5);
ok('the shoot has a crew', (feature.production.crew || []).length >= 3);
ok('and the shoot begins once you accept', /Cameras roll/.test(feature.lastEvent), feature.lastEvent);
const oneoff = bookScale('oneoff');
ok('a one-day booking still resolves at once', !oneoff.production && oneoff.filmography.length === 1, oneoff.lastEvent);
ok('and says it was one day', /One day/.test(oneoff.lastEvent), oneoff.lastEvent);

// you cannot be in two places
const busy = st(); refreshCastingPool(busy, true);
busy.production = { title: 'Late River', months: 4, monthsLeft: 3, salary: 12000, crew: [{ id: 'c', name: 'X', role: 'Director', bond: 50 }], meter: 40, genre: 'Drama', tier: 'lead', prestigeScore: 50 };
// One real job at a time. A voice session or a day as an extra is an afternoon and is
// allowed — see systems/career/castings.js — so this has to read for a scheduled part.
const realPart = busy.castingPool.find((x) => (x.months || 1) >= 2) || busy.castingPool[0];
const beforeAp = busy.ap;
ok('you cannot take a second real job while shooting',
  (auditionFor(busy, realPart.id, 90), busy.ap === beforeAp && /two places/.test(busy.lastEvent)), busy.lastEvent);

// paid every month, not only at the end
const paid = st({ cash: 0 });
paid.production = { title: 'Late River', months: 4, monthsLeft: 4, salary: 12000, paid: 0, crew: [{ id: 'c', name: 'X', role: 'Director', bond: 50 }], meter: 40, genre: 'Drama', tier: 'lead', prestigeScore: 50 };
productionTick(paid);
ok('the first month pays', paid.cash === 3000, '€' + paid.cash);
productionTick(paid); productionTick(paid);
ok('every month pays', paid.cash === 9000, '€' + paid.cash);
ok('the shoot is still running', !!paid.production && paid.production.monthsLeft === 1);
productionTick(paid);
ok('it wraps on the last month', paid.production === null);
ok('and the total is exactly the fee', paid.cash === 12000, '€' + paid.cash);
// The credit no longer lands at the wrap — it goes into post and opens months later.
ok('the wrap sends it into post, not into the filmography', paid.filmography.length === 0 && (paid.releases || []).length === 1, JSON.stringify(paid.releases));
ok('and it carries a rating waiting to be revealed', paid.releases[0].rating > 0 && paid.releases[0].due > 0, JSON.stringify(paid.releases[0]));

// a long shoot keeps you alive
const long = st({ cash: 0 });
long.production = { title: 'Golden Echo', months: 12, monthsLeft: 12, salary: 168000, paid: 0, crew: [{ id: 'c', name: 'X', role: 'Director', bond: 50 }], meter: 40, genre: 'Drama', tier: 'tentpole', prestigeScore: 85 };
productionTick(long);
ok('a year-long shoot pays monthly, not in a year', long.cash === 14000, '€' + long.cash);
ok('which covers a rented room', long.cash > 750);

// illness still freezes it, and freezing does not pay
const ill = st({ cash: 0, illness: { name: 'Pneumonia', freezes: true, drain: 6, months: 0, left: 3 } });
ill.production = { title: 'Late River', months: 4, monthsLeft: 4, salary: 12000, paid: 0, crew: [{ id: 'c', name: 'X', role: 'Director', bond: 50 }], meter: 40, genre: 'Drama', tier: 'lead', prestigeScore: 50 };
productionTick(ill);
ok('illness pauses the shoot', ill.production.monthsLeft === 4);
ok('and a paused shoot does not pay', ill.cash === 0, '€' + ill.cash);

// fame gates the big work
// The ladder: an indie lead is the first rung at 15, the career-defining work sits far above it.
const gates = {};
for (let i = 0; i < 400; i++) { const s = st(); refreshCastingPool(s, true); for (const c of s.castingPool) if (c.minFame > 0) gates[c.type + ' · ' + c.role] = c.minFame; }
ok('big roles carry a fame gate', Object.values(gates).every((v) => v >= 15), JSON.stringify(gates));
ok('the biggest work sits far up the ladder', (gates['Studio Blockbuster · Lead'] || 0) >= 60 && (gates['Feature Film · Lead'] || 0) >= 30, JSON.stringify(gates));
console.log('      fame gates — ' + Object.entries(gates).map(([k, v]) => `${k}: ${v}`).join(', '));
const gated = st({ fame: 5 }); refreshCastingPool(gated, true);
let blocked = null;
for (let i = 0; i < 200 && !blocked; i++) { refreshCastingPool(gated, true); blocked = gated.castingPool.find((c) => c.minFame > 5); }
if (blocked) { gated.ap = 3; auditionFor(gated, blocked.id, 100);
  ok('and a nobody is turned away', !gated.production && /more fame/.test(gated.lastEvent), gated.lastEvent); }
else ok('and a nobody is turned away', false, 'no gated listing generated');

// ── what the money actually looks like ────────────────────────────────────────
import { fameTier, quoteFor, quoteBand, QUOTE, MEDIA, shutOutOf, episodeRate } from '../src/systems/meta/status.js';
const TIER_FAME = { unknown: 0, rising: 15, known: 35, star: 55, alist: 75, icon: 90 };
function listingFor(fame, wanted) {
  for (let i = 0; i < 900; i++) {
    const s = st({ fame }); refreshCastingPool(s, true);
    const c = s.castingPool.find((x) => x.type === wanted);
    if (c) return c;
  }
  return null;
}
// every band is a real band, and every rung clears the one below it
let bandsOk = true, badBands = [];
for (const m of MEDIA) {
  for (const f of Object.values(TIER_FAME)) {
    const b = quoteBand(st({ fame: f }), m);
    if (b && (b.length !== 2 || b[0] <= 0 || b[1] <= b[0])) { bandsOk = false; badBands.push(`${m}/${fameTier(f).id}`); }
  }
}
ok('every band is a real range, not a point', bandsOk, badBands.join(','));
let ladderOk = true, breaks = [];
for (const m of MEDIA) {
  let prevTop = 0;
  for (const f of Object.values(TIER_FAME)) {
    const b = quoteBand(st({ fame: f }), m); if (!b) continue;
    if (b[0] < prevTop) { ladderOk = false; breaks.push(`${m}/${fameTier(f).id}`); }
    prevTop = b[1];
  }
}
ok('each rung starts at or above the last rung’s ceiling', ladderOk, breaks.join(','));
ok('a medium can be shut to you entirely', shutOutOf(st({ fame: 0 }), 'film_studio') && !shutOutOf(st({ fame: 20 }), 'film_studio'));
ok('the tentpole door opens later than the studio door', shutOutOf(st({ fame: 20 }), 'film_tentpole') && !shutOutOf(st({ fame: 40 }), 'film_tentpole'));

// the fee actually varies inside the band
const draws = new Set();
for (let i = 0; i < 60; i++) draws.add(quoteFor(st({ fame: 0 }), 'tv_daytime'));
ok('two unknowns on the same soap are not paid the same', draws.size > 30, draws.size + ' distinct fees in 60 draws');
const lo = Math.min(...draws), hi = Math.max(...draws);
ok('and every draw lands inside the band', lo >= 900 && hi <= 4000, `€${lo}–€${hi}`);

// anchors that survived the recalibration
ok('an unknown on a soap still starts at €900', QUOTE.tv_daytime.unknown[0] === 900);
ok('a rising star still clears €25,000 on network drama', QUOTE.tv_network.rising[1] >= 25000, '€' + QUOTE.tv_network.rising[1].toLocaleString());
ok('a rising star still gets €500,000 for a studio picture', QUOTE.film_studio.rising[0] === 500000);
ok('an icon tentpole starts at €40m', QUOTE.film_tentpole.icon[0] >= 40000000, '€' + QUOTE.film_tentpole.icon[0].toLocaleString());

// A LONGER ORDER PAYS LESS PER EPISODE — the whole point of the recalibration.
const shortOrder = episodeRate(100000, 33, 22), longOrder = episodeRate(100000, 33, 44);
ok('a longer season pays less per episode', longOrder < shortOrder, `22ep €${shortOrder.toLocaleString()} vs 44ep €${longOrder.toLocaleString()}`);
ok('but more in total', longOrder * 44 > shortOrder * 22, `€${(shortOrder * 22).toLocaleString()} vs €${(longOrder * 44).toLocaleString()}`);
ok('a typical order is quoted at the band itself', episodeRate(100000, 33, 33) === 100000);

// FILM MUST STAY THE BIGGEST PRIZE — this is what broke before.
const EPS = { tv_daytime: 33, tv_network: 13, tv_prestige: 9 };
const project = (fame, medium) => { const b = quoteBand(st({ fame }), medium); if (!b) return null;
  const mid = (b[0] + b[1]) / 2; return Math.round(mid * (EPS[medium] || 1)); };
for (const [id, f] of Object.entries(TIER_FAME)) {
  const tent = project(f, 'film_tentpole'); if (!tent) continue;
  const soap = project(f, 'tv_daytime');
  ok(`at ${id}, a blockbuster beats a soap season`, tent > soap,
    `tentpole €${tent.toLocaleString()} vs soap €${soap.toLocaleString()}`);
}

const money = (n) => n >= 1000000 ? '€' + (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + 'm'
  : n >= 1000 ? '€' + Math.round(n / 1000) + 'k' : '€' + n;
console.log('\n      PER EPISODE / PER PICTURE  (the band, rolled per job)');
console.log('      ' + 'tier'.padEnd(12) + ['soap/ep', 'network/ep', 'prestige/ep', 'indie', 'studio', 'tentpole'].map((h) => h.padStart(17)).join(''));
for (const f of Object.values(TIER_FAME)) {
  const cells = ['tv_daytime', 'tv_network', 'tv_prestige', 'film_indie', 'film_studio', 'film_tentpole']
    .map((m) => { const b = quoteBand(st({ fame: f }), m); return (b ? `${money(b[0])}–${money(b[1])}` : '—').padStart(17); });
  console.log('      ' + fameTier(f).label.padEnd(12) + cells.join(''));
}
console.log('\n      WHAT A WHOLE PROJECT PAYS  (midpoint × typical episodes)');
console.log('      ' + 'tier'.padEnd(12) + ['soap 33ep', 'network 13ep', 'prestige 9ep', 'indie', 'studio', 'tentpole'].map((h) => h.padStart(17)).join(''));
for (const f of Object.values(TIER_FAME)) {
  const cells = ['tv_daytime', 'tv_network', 'tv_prestige', 'film_indie', 'film_studio', 'film_tentpole']
    .map((m) => { const t = project(f, m); return (t ? money(t) : '—').padStart(17); });
  console.log('      ' + fameTier(f).label.padEnd(12) + cells.join(''));
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
