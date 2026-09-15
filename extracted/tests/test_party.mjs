import { PARTIES, PARTY_ORDER, partyRisk, canThrowParty, throwParty } from '../src/systems/life/party.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', ageY: 28, stage: 'career', hasApartment: true, housing: 'flat', homeless: false,
  cash: 20000, mental: 50, fame: 20, scandal: 0, ap: 100, year: 2030, month: 0,
  family: [{ id: 'b1', name: 'Sam Bon', relation: 'Brother', alive: true, relationship: 50 }],
  people: [{ id: 'c1', name: 'Rita Vale', role: 'Casting Director', industryWeight: 60, relationship: 50 }],
  timeline: [], _cool: {}, ...over });

ok('three sizes, all declared', PARTY_ORDER.length === 3 && PARTY_ORDER.every((k) => PARTIES[k].cost > 0 && PARTIES[k].blurb));
ok('bigger costs more and is louder', PARTIES.drinks.cost < PARTIES.proper.cost && PARTIES.proper.cost < PARTIES.blowout.cost
  && PARTIES.drinks.noise < PARTIES.blowout.noise);

// where you live decides how much you get away with
const byHome = ['room', 'studio', 'flat', 'house', 'penthouse'].map((h) => partyRisk(st({ housing: h }), 'proper'));
ok('thick walls swallow noise', byHome[0] > byHome[2] && byHome[2] > byHome[4], byHome.join(' > '));
console.log('      police odds for a proper party — ' + ['room', 'studio', 'flat', 'house', 'penthouse'].map((h, i) => `${h} ${byHome[i]}%`).join(', '));
ok('a blowout is riskier than drinks anywhere', partyRisk(st(), 'blowout') > partyRisk(st(), 'drinks'));
ok('being famous draws attention', partyRisk(st({ fame: 80 }), 'proper') > partyRisk(st({ fame: 10 }), 'proper'));

// you need a door of your own
ok('no parties at your parents', /parents/.test(canThrowParty(st({ hasApartment: false }))));
ok('no parties on the street', /no door/.test(canThrowParty(st({ homeless: true, hasApartment: false }))));
ok('your own place is fine', canThrowParty(st()) === '');
const atMum = st({ hasApartment: false }); throwParty(atMum, 'proper');
ok('and it is enforced, not just hidden', atMum.cash === 20000 && atMum.ap === 100);

// the cost of a night
const s1 = st(); throwParty(s1, 'proper');
ok('a party costs money and energy', s1.cash <= 20000 - PARTIES.proper.cost && s1.ap === 75, `€${20000 - s1.cash}, ap ${s1.ap}`);
ok('it lifts you', s1.mental > 50, String(s1.mental));
ok('it is written down', /party at your place/i.test(JSON.stringify(s1.timeline)));
const broke = st({ cash: 100 }); throwParty(broke, 'blowout');
ok('you cannot throw one you cannot afford', broke.cash === 100 && broke.ap === 100);
const tired = st({ ap: 0 }); throwParty(tired, 'drinks');
ok('nor without energy', tired.cash === 20000);
const twice = st(); throwParty(twice, 'drinks'); const after = twice.cash; throwParty(twice, 'drinks');
ok('once a month', twice.cash === after, twice.lastEvent);

// guests get closer
let warmed = 0;
for (let i = 0; i < 60; i++) { const s = st(); throwParty(s, 'proper'); if (s.people[0].relationship > 50) warmed++; }
ok('people who came get closer', warmed > 50, warmed + '/60');
// and parents are not "guests" at your party
const noParents = st({ family: [{ id: 'm', name: 'Karen', relation: 'Mother', alive: true, relationship: 50 }] });
throwParty(noParents, 'blowout');
ok('your mother is not at the blowout', noParents.family[0].relationship === 50);

// police
function police(housing, key) { let n = 0; for (let i = 0; i < 400; i++) { const s = st({ housing }); throwParty(s, key); if ((s.scandal || 0) > 0) n++; } return n / 4; }
const roomBlowout = police('room', 'blowout'), penthouseDrinks = police('penthouse', 'drinks');
ok('a blowout in a rented room usually ends badly', roomBlowout > 60, roomBlowout + '%');
ok('quiet drinks in a penthouse almost never do', penthouseDrinks < 15, penthouseDrinks + '%');
const busted = st({ housing: 'room' });
for (let i = 0; i < 40 && !(busted.scandal > 0); i++) { busted._cool = {}; busted.ap = 100; busted.cash = 20000; busted.scandal = 0; throwParty(busted, 'blowout'); }
ok('the police cost money and reputation', busted.scandal > 0 && busted.cash < 20000 - PARTIES.blowout.cost, `scandal ${busted.scandal}, €${20000 - busted.cash}`);
ok('and the message says what happened', /fine|press|officers|neighbour|filmed/i.test(busted.lastEvent), busted.lastEvent);

// meeting someone
let met = 0;
for (let i = 0; i < 300; i++) { const s = st(); throwParty(s, 'blowout'); if (s.people.length > 1) met++; }
ok('a big night can bring someone worth knowing', met > 30, met + '/300');
let metSmall = 0;
for (let i = 0; i < 300; i++) { const s = st(); throwParty(s, 'drinks'); if (s.people.length > 1) metSmall++; }
ok('a small one rarely does', metSmall < met, `${metSmall} vs ${met}`);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
