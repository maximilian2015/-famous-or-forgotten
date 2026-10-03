// The months of a shoot in which nothing is decided — which is most of them.
//
// Maxi, six months into a picture: "оно ж скучно." It was: the month is a stance chosen once,
// the big days are one to three scenes across the whole film, and everything between was a
// progress bar with a tick beside it. These are the ordinary weeks, reported and not decided.
import { setLife } from '../src/systems/career/setlife.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

const shoot = (over = {}) => ({
  id: 'p1', title: 'Buried Hunger', months: 6, monthsLeft: 4, prepLeft: 0, meter: 50, stability: 80,
  crew: [{ id: 'c0', name: 'Vera Salazar', role: 'Director', bond: 45, bond0: 45 },
    { id: 'c1', name: 'Zora Sorensen', role: 'Co-star', bond: 40, bond0: 40 }], ...over,
});
const st = () => ({ year: 2060, month: 3, strain: 20, mental: 50 });

// ── it happens, but not every month ───────────────────────────────────────────
// The contract changed while this was being written and the test changed with it, not the
// other way round: a month ALWAYS says what it was like, and most months are quiet. Returning
// null for the quiet ones left the card reading identically four months in five.
let said = 0, notable = 0;
for (let i = 0; i < 400; i++) { const p = shoot(); if (setLife(st(), p)) said++; if (p._lastLife !== 'quiet') notable++; }
ok('every month of a shoot says what it was like', said === 400, `${said}/400`);
ok('something worth telling happens on most of them', notable > 160, `${notable}/400`);
ok('but not on all of them — the quiet weeks are what make the others land', notable < 330, `${notable}/400`);

// ── never two running, so the quiet weeks stay quiet ──────────────────────────
{
  const s = st(), p = shoot();
  p._lifeMonth = s.year * 12 + s.month - 1;   // it fired last month
  let notable = 0;
  for (let i = 0; i < 200; i++) { const q = { ...p, crew: p.crew.map((c) => ({ ...c })) }; setLife(s, q); if (q._lastLife !== 'quiet') notable++; }
  ok('never two NOTABLE months running — the one after is always a quiet one', notable === 0, String(notable));
}

// ── a longer shoot has more weeks for something to go wrong in ────────────────
{
  const count = (months) => { let n = 0; for (let i = 0; i < 600; i++) { const p = shoot({ months }); setLife(st(), p); if (p._lastLife !== 'quiet') n++; } return n; };
  const short = count(3), long = count(7);
  ok('a long shoot has more happen on it than a short one', long > short, `${short} vs ${long} of 600`);
}

// ── it moves the people, and nothing else ────────────────────────────────────
// This asserted that months made the picture better or worse, and it was right to fail when
// that was taken out. An ordinary month must not touch the meter, the stability or the player:
// each of those is a promise the game has printed somewhere — what a month costs you, that
// safe money delivers a film, that the quality is the script and the days you played. What a
// month in which nothing was decided DOES change is how the people on it feel about each other.
{
  let warmer = 0, cooler = 0, meterMoved = 0, stabilityMoved = 0;
  for (let i = 0; i < 800; i++) {
    const p = shoot();
    setLife(st(), p);
    const d = p.crew[0].bond;
    if (d > 45) warmer++; if (d < 45) cooler++;
    if ((p.meter || 50) !== 50) meterMoved++;
    if ((p.stability ?? 80) !== 80) stabilityMoved++;
  }
  ok('the director can warm to you over an ordinary month', warmer > 20, String(warmer));
  // > 3 of 800, not > 10: the only event that can cool the director is w3 of about 44, fires
  // on roughly half of months, and goes down three times in ten — an expected nine. A threshold
  // sitting on its own mean fails one run in two or three and says nothing when it does.
  ok('and can cool', cooler > 3, String(cooler));
  ok('but the picture itself is never touched', meterMoved === 0, String(meterMoved));
  ok('and neither is whether it gets finished', stabilityMoved === 0, String(stabilityMoved));
}

// ── it leaves something for the wrap to remember ──────────────────────────────
{
  let kept = 0;
  for (let i = 0; i < 400; i++) {
    const p = shoot();
    setLife(st(), p);
    if ((p._setLog || []).length) kept++;
  }
  ok('and some of them are still worth saying at wrap', kept > 40, `${kept}/400 left a line`);
}

// ── preparation months are not shooting months ────────────────────────────────
{
  let any = 0;
  for (let i = 0; i < 200; i++) if (setLife(st(), shoot({ prepLeft: 2 }))) any++;
  ok('nothing happens on a set that has not started shooting', any === 0, String(any));
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
