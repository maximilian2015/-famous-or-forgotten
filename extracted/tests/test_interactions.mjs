import { INTERACTIONS, GROUPS, interactionsFor, interact, findPerson } from '../src/systems/life/interactions.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

const mum = () => ({ id: 'f1', name: 'Karen Bon', relation: 'Mother', age: 45, alive: true, relationship: 60, job: 'nurse', health: 80 });
const spouse = () => ({ id: 'f2', name: 'Iris Vale', relation: 'Spouse', age: 32, alive: true, relationship: 70, job: 'photographer', health: 88 });
const date = () => ({ id: 'd1', name: 'Jonas Kade', gender: 'm', age: 29, job: 'chef', relationship: 45 });
const contact = () => ({ id: 'c1', name: 'Rita Vale', role: 'Casting Director', industryWeight: 70, relationship: 55, unlocks: 'castingBoost' });
const st = (over) => ({ version: 'x', ageY: 30, stage: 'career', hasApartment: true, housing: 'flat',
  cash: 20000, mental: 60, health: 80, charisma: 50, discipline: 40, confidence: 40, ap: 100,
  year: 2030, month: 3, family: [mum()], people: [contact()], timeline: [], _cool: {}, ...over });

const ids = (s, id) => interactionsFor(s, id).filter((a) => a.open && !a.why).map((a) => a.id);

// lookup
ok('a mother is found as family', findPerson(st(), 'f1')?.rel === 'parent');
ok('a partner is found', findPerson(st({ partner: date() }), 'd1')?.rel === 'partner');
ok('a spouse beats a plain family member', findPerson(st({ family: [spouse()] }), 'f2')?.rel === 'spouse');
ok('a contact is found', findPerson(st(), 'c1')?.kind === 'contact');
ok('a stranger is not', findPerson(st(), 'nope') === null);

// menus differ by who it is
const onMum = ids(st(), 'f1');
ok('a mother offers more than two things', onMum.length >= 6, onMum.join(','));
ok('a mother can be asked for money', onMum.includes('money'));
ok('no romance with your mother', !interactionsFor(st(), 'f1').some((a) => a.group === 'romantic'), onMum.join(','));
const onContact = ids(st(), 'c1');
ok('a contact can be asked for a word', onContact.includes('favour'));
ok('a contact can be cut off', onContact.includes('cutoff'));
ok('you cannot ask a contact for pocket money', !onContact.includes('money'));
const onDate = ids(st({ partner: date() }), 'd1');
ok('a partner can be flirted with', onDate.includes('flirt'));
ok('a partner can be kissed at 45', onDate.includes('kiss'));
ok('no proposing at 45 closeness', !onDate.includes('propose'));
const keen = ids(st({ partner: { ...date(), relationship: 70 } }), 'd1');
ok('proposing opens at 65', keen.includes('propose'));
const married = ids(st({ family: [spouse()] }), 'f2');
ok('a spouse can try for a baby', married.includes('baby'));
ok('you cannot propose to your spouse', !married.includes('propose'));

// gates say why
const atHome = interactionsFor(st({ partner: { ...date(), relationship: 70 }, hasApartment: false }), 'd1');
const night = atHome.find((a) => a.id === 'night');
ok('no night together under your parents roof', !night.open && /parents/.test(night.why), night.why);
const roomy = interactionsFor(st({ family: [spouse()], housing: 'room' }), 'f2').find((a) => a.id === 'baby');
ok('no baby in a rented room, and it says so', !!roomy.why && /Two-bed/i.test(roomy.why), roomy.why);
const broke = interactionsFor(st({ cash: 10 }), 'f1').find((a) => a.id === 'gift');
ok('no gift without money, and it says so', /need €/.test(broke.why), broke.why);
const tired = interactionsFor(st({ ap: 0 }), 'f1').find((a) => a.id === 'evening');
ok('no evening without energy', /energy/.test(tired.why), tired.why);
const distant = interactionsFor(st({ family: [{ ...mum(), relationship: 5 }] }), 'f1');
ok('deep talk is locked when you are not close', !distant.find((a) => a.id === 'deep').open);

// the actions actually do something
const s1 = st(); interact(s1, 'f1', 'compliment');
ok('a compliment raises closeness', s1.family[0].relationship > 60, String(s1.family[0].relationship));
const s2 = st(); interact(s2, 'f1', 'argue');
ok('a fight lowers it', s2.family[0].relationship < 60 && s2.mental < 60);
const s3 = st(); const before3 = s3.cash; interact(s3, 'f1', 'gift');
ok('a gift costs money and buys goodwill', s3.cash < before3 && s3.family[0].relationship > 60, `€${before3 - s3.cash}`);
const s4 = st(); interact(s4, 'f1', 'evening');
ok('an evening spends energy', s4.ap === 100 - 15, String(s4.ap));
const s5 = st(); interact(s5, 'f1', 'chat');
ok('a chat costs a little', s5.ap === 100 - 5, String(s5.ap));

// once a month, per person, per action
const s6 = st(); interact(s6, 'f1', 'compliment'); const after = s6.family[0].relationship;
interact(s6, 'f1', 'compliment');
ok('you cannot repeat the same thing twice in a month', s6.family[0].relationship === after, s6.lastEvent);
interact(s6, 'f1', 'chat');
ok('but a different thing still works', s6.family[0].relationship > after);
const s7 = st({ family: [mum(), { ...mum(), id: 'f9', name: 'David Bon', relation: 'Father' }] });
interact(s7, 'f1', 'compliment'); interact(s7, 'f9', 'compliment');
ok('the cooldown is per person', s7.family[1].relationship > 60);

// jokes and deep talks can fail
let landed = 0, flopped = 0;
for (let i = 0; i < 400; i++) { const s = st({ charisma: 30, family: [{ ...mum(), relationship: 30 }] }); interact(s, 'f1', 'joke');
  if (s.family[0].relationship > 30) landed++; else flopped++; }
ok('a joke can fall flat', landed > 40 && flopped > 40, `landed ${landed}, flopped ${flopped}`);
let charmLanded = 0;
for (let i = 0; i < 400; i++) { const s = st({ charisma: 95, family: [{ ...mum(), relationship: 30 }] }); interact(s, 'f1', 'joke');
  if (s.family[0].relationship > 30) charmLanded++; }
ok('charisma makes jokes land', charmLanded > landed, `${charmLanded} vs ${landed}`);

// a favour costs goodwill whether it works or not
const s8 = st(); interact(s8, 'c1', 'favour');
ok('asking a favour spends goodwill', s8.people[0].relationship < 55, String(s8.people[0].relationship));
// cutting someone off removes them
const s9 = st(); interact(s9, 'c1', 'cutoff');
ok('cutting someone off removes them', (s9.people || []).length === 0);

// What real money can do for the people you came from. The fixtures were a mother and a
// casting director on twenty thousand euros — neither a child nor a fortune, so neither of
// these was reachable and the menu looked like it had two dead entries in it.
const kid = () => ({ id: 'f3', name: 'Nina Bon', relation: 'Child', age: 12, alive: true, relationship: 60, talent: 40 });
const richKid = st({ cash: 5000000, family: [mum(), kid()] });
const onKid = ids(richKid, 'f3');
const richMum = ids(st({ cash: 5000000 }), 'f1');
ok('a child can be paid for properly', onKid.includes('teach'), onKid.join(','));
ok('and family can be set up for life', richMum.includes('setup'), richMum.join(','));
ok('but not on twenty thousand euros', !ids(st(), 'f1').includes('setup'));
{
  const s = st({ cash: 5000000, family: [mum(), kid()] });
  const before = s.family[1].talent, cash = s.cash;
  interact(s, 'f3', 'teach');
  ok('paying for a child makes them better at it', s.family[1].talent > before, before + ' → ' + s.family[1].talent);
  ok('and it costs real money', s.cash < cash - 50000, '€' + (cash - s.cash).toLocaleString());
}
{
  const s = st({ cash: 5000000 });
  interact(s, 'f1', 'setup');
  ok('setting somebody up is a one-off', s.family[0].supported === true);
  const rel = s.family[0].relationship;
  s._cool = {};
  interact(s, 'f1', 'setup');
  ok('and it cannot be done twice', s.family[0].relationship === rel);
}

// A contact can become something else. Maxi: "Piet, closeness 94, and nothing — no kiss, no
// relationship, no moving in." Single: flirt and kiss open at 60; asking out wants a kiss or 85.
{
  const close = ids(st({ people: [{ ...contact(), name: 'Piet Marchetti', role: 'Film Director', relationship: 94 }] }), 'c1');
  ok('a close contact can be flirted with', close.includes('flirtContact'));
  ok('and kissed', close.includes('kissContact'));
  ok('and asked out at 85 without a kiss', close.includes('askOutContact'));
  const s = st({ people: [{ ...contact(), name: 'Piet Marchetti', role: 'Film Director', relationship: 94 }], charisma: 100, looks: 100 });
  let tries = 0; while (!s.partner && tries++ < 30) { s._cool = {}; s.ap = 100; s.people[0].rebuffedAt = null; interact(s, 'c1', 'askOutContact'); }
  ok('asking out a contact makes them your partner', !!s.partner && s.partner.contactId === 'c1' && s.partner.name === 'Piet Marchetti', JSON.stringify(s.partner));
  ok('the contact stays in your phone as the director', s.people.some((p) => p.id === 'c1'));
  ok('a director on your arm can put you in a room', s.partner && s.partner.industryWeight === 70);
  ok('and the romance moves to the partner: nothing more to ask the contact', !ids(s, 'c1').some((id) => /Contact$/.test(id)));
  const withMum = interactionsFor(st({ family: [mum()], people: [{ ...contact(), relationship: 94 }], partner: { id: 'd9', name: 'Jonas Kade', relationship: 50 } }), 'c1');
  ok('taken: the questions are there, greyed, with the reason', withMum.some((a) => a.id === 'kissContact' && !a.open && /Jonas/.test(a.why)));
  ok('never at your mother', !interactionsFor(st(), 'f1').some((a) => /Contact$/.test(a.id)));
}

// every declared action is reachable by somebody
const reach = new Set([...onMum, ...onContact, ...keen, ...married, ...onKid, ...richMum,
  ...ids(st({ people: [{ ...contact(), relationship: 94 }] }), 'c1'),
  ...ids(st({ family: [{ ...mum(), relationship: 90 }] }), 'f1')]);
const unreachable = INTERACTIONS.map((a) => a.id).filter((id) => !reach.has(id));
ok('no dead entries in the menu', unreachable.length === 0, unreachable.join(','));
ok('every action belongs to a real group', INTERACTIONS.every((a) => GROUPS.some((gr) => gr.id === a.group)));

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
