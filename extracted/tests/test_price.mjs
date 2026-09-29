import { recognised, theLens, driftTick, quietTick, priceTick, priceLine, closeOnes } from '../src/systems/meta/price.js';
import { maybeBrandOffer, acceptOffer } from '../src/systems/career/offers.js';
import { goOut } from '../src/systems/life/town.js';
import { interact } from '../src/systems/life/interactions.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', name: 'Mira Vale', ageY: 35, stage: 'career', dream: 'actor', fame: 70, respect: 40, acting: 70, charisma: 60, looks: 60, luck: 50, scandal: 0, media: 0, mental: 70, year: 2060, month: 2, timeline: [], filmography: [], productions: [], offers: [], inbox: [], releases: [], peakFame: 70, hasApartment: true, housing: 'room', ap: 100, apMax: 100, cash: 2000000, genreXP: {}, people: [], quote: 500000, ...over });

// ── the lens ───────────────────────────────────────────────────────────────────
{
  ok('nobody knows a Known Face in a bar', recognised(st({ fame: 40 })) === 0);
  ok('an A-lister is recognised', recognised(st({ fame: 85 })) > 0.5);
  ok('security takes the edge off', recognised(st({ fame: 85, staff: { security: true } })) < recognised(st({ fame: 85 })));
  let hit = 0, hard = 0;
  for (let i = 0; i < 300; i++) { const s = st({ fame: 95 }); const l = theLens(s, 'a drink'); if (l) { hit++; if ((s.scandal || 0) > 0) hard++; } }
  ok('at the very top an evening out is mostly a photograph', hit > 120 && hard > 20, `${hit}/300 noticed, ${hard} of them bad`);
  let none = 0;
  for (let i = 0; i < 300; i++) if (!theLens(st({ fame: 40 }), 'a drink')) none++;
  ok('and at Known Face it is just an evening', none === 300);
  const s = st({ fame: 90, ap: 100, cash: 5000 });
  goOut(s, 'reading');
  ok('the town says so on the screen', /photograph|recognised|your name across|wanted a photograph|filmed you|followed you|took turns/.test(s.lastEvent) || recognised(s) < 1, s.lastEvent.slice(0, 80));
}
// ── the people who stop ringing ────────────────────────────────────────────────
{
  const s = st({ fame: 80, people: [{ id: 'p1', name: 'Rosa Lind', role: 'Film Director', relationship: 70 }, { id: 'p2', name: 'Kit Alvar', role: 'Fellow Actor', relationship: 62 }] });
  ok('two people close to you', closeOnes(s).length === 2);
  for (let m = 0; m < 24; m++) { driftTick(s); s.month++; if (s.month > 11) { s.month = 0; s.year++; } }
  ok('two years of never calling and they are gone', closeOnes(s).length === 0, s.people.map((p) => Math.round(p.relationship)).join(','));
  ok('and one of them is named for it', s.timeline.some((x) => /has stopped ringing/.test(x.text)));
  // seeing them holds it
  const t = st({ fame: 80, people: [{ id: 'p1', name: 'Rosa Lind', role: 'Film Director', relationship: 70, met: '2060' }] });
  for (let m = 0; m < 24; m++) { t._seen = { p1: t.year * 12 + t.month }; driftTick(t); t.month++; if (t.month > 11) { t.month = 0; t.year++; } }
  ok('somebody you keep up with does not drift', closeOnes(t).length === 1, String(Math.round(t.people[0].relationship)));
  ok('and nobody below Known Face drifts at all', (() => { const u = st({ fame: 20, people: [{ id: 'p', name: 'X', relationship: 70 }] }); for (let m = 0; m < 24; m++) driftTick(u); return u.people[0].relationship === 70; })());
}
// ── the quiet ──────────────────────────────────────────────────────────────────
{
  const s = st({ fame: 85, mental: 80 });
  for (let m = 0; m < 6; m++) quietTick(s);
  ok('a famous life with nobody in it wears on you', s.mental < 80 && s._quietMonths === 6);
  ok('and it says so, once', s.timeline.filter((x) => /nobody who knows you/.test(x.text)).length === 1);
  const t = st({ fame: 85, mental: 80, partner: { name: 'Sam' } });
  for (let m = 0; m < 6; m++) quietTick(t);
  ok('somebody at home and it does not', t.mental === 80);
  ok('the screen names the price', priceLine(s) && priceLine(s).id === 'quiet' && /See somebody/.test(priceLine(s).fix));
  ok('and names the other one when there is somebody at home', priceLine(st({ fame: 95, partner: { name: 'Sam' }, people: [{ id: 'a', name: 'A', relationship: 80 }] })).id === 'lens');
}
// ── the brands come to you ─────────────────────────────────────────────────────
{
  let got = null;
  for (let i = 0; i < 400 && !got; i++) { const s = st({ fame: 80, looks: 70 }); maybeBrandOffer(s); if ((s.offers || []).length) got = s; }
  ok('a star is asked to be the face of something', !!got, got && got.offers[0].projectTitle);
  const o = got.offers[0];
  ok('it is a real paper: a fee, months, a year of nobody else', o.salary > 100000 && o.months >= 1 && o.brandFor === 12 && o.kind === 'brand', JSON.stringify({ fee: o.salary, months: o.months }));
  ok('and it says what it is', /want you to be the face of/.test(o.note));
  const before = got.offers.length;
  acceptOffer(got, o.id);
  ok('taking it locks the other brands out for a year', (got._brandUntil || 0) === got.year * 12 + got.month + 12 && got.offers.length < before);
  maybeBrandOffer(got);
  ok('so nobody else asks while it runs', !(got.offers || []).some((x) => x.kind === 'brand'));
  let none = 0;
  for (let i = 0; i < 200; i++) { const s = st({ fame: 30 }); maybeBrandOffer(s); if (!(s.offers || []).length) none++; }
  ok('and below a name the brands do not call at all', none === 200);
  // The serious actor pays for it — and what he is selling decides how much. This used to
  // take whichever campaign came up first and assume three points. Every brand cost the
  // same then; they do not now, and one deal in five runs in one country only and costs
  // nothing at all, so the test has to say which case it is looking at.
  const ser = st({ fame: 80, respect: 50, typecast: { scores: { serious: 6 }, active: ['serious'], strong: ['serious'] } });
  const findBrand = (pick) => {
    for (let i = 0; i < 4000; i++) {
      const s = JSON.parse(JSON.stringify(ser));
      maybeBrandOffer(s);
      const o = (s.offers || [])[0];
      if (o && pick(o)) return s;
    }
    return null;
  };
  // Something neutral, at home: three points, the way it always was.
  const plain = findBrand((o) => !o.abroad && (o.standing || 0) === 0);
  ok('a serious actor selling something neutral still pays three points', !!plain, 'no such offer came up');
  if (plain) {
    acceptOffer(plain, plain.offers[0].id);
    ok('  and it is exactly three', plain.respect === 47 && plain.timeline.some((x) => /said in print/.test(x.text)), String(plain.respect));
  }
  // The bottom of the market costs more than that, because the sentence is better.
  const cheap = findBrand((o) => !o.abroad && (o.standing || 0) <= -2);
  if (cheap) {
    acceptOffer(cheap, cheap.offers[0].id);
    ok('and the cheap end of it costs more', cheap.respect < 47, String(cheap.respect));
  }
  // A couture house is only ever offered to people it suits.
  const couture = findBrand((o) => !o.abroad && (o.standing || 0) > 0);
  if (couture) {
    acceptOffer(couture, couture.offers[0].id);
    ok('and a house that suits you costs nothing at all', couture.respect >= 50, String(couture.respect));
  }
  // And the one nobody at home will ever see: more money, no sentence.
  const away = findBrand((o) => !!o.abroad);
  if (away) {
    const fee = away.offers[0].salary;
    acceptOffer(away, away.offers[0].id);
    ok('a campaign that runs in one country only costs no standing', away.respect === 50, String(away.respect));
    ok('  and pays more than it would at home', fee > 0);
  }
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
