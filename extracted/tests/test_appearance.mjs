import { ensureAppearance, lookOf, lookOfPerson, companionOf, buyHair, wearOutfit, setHairColour, ownsOutfit, ageBand, HAIRSTYLES, HAIR_ORDER, hairChoices, OUTFITS, EYE_COLOURS, LIPS } from '../src/systems/life/appearance.js';

let fails = 0;
const ok = (name, cond, extra = '') => { if (!cond) { fails++; console.log('FAIL  ' + name + (extra ? ' :: ' + extra : '')); } else console.log('ok    ' + name); };

const base = () => ensureAppearance({ gender: 'female', ageY: 25, cash: 5000, family: [], version: 'x' });

// bands
ok('band 0 = baby', ageBand(0) === 'baby');
ok('band 8 = child', ageBand(8) === 'child');
ok('band 15 = teen', ageBand(15) === 'teen');
ok('band 30 = young', ageBand(30) === 'young');
ok('band 60 = older', ageBand(60) === 'older');
ok('band 80 = elder', ageBand(80) === 'elder');

// ensure is idempotent and does not reroll a face
const a = base(); const hair1 = a.look.hair, skin1 = a.look.skin;
ensureAppearance(a);
ok('ensureAppearance does not reroll', a.look.hair === hair1 && a.look.skin === skin1);

// kids wear kid clothes no matter what is stored
const kid = base(); kid.ageY = 6; kid.look.outfit = 'tux';
ok('child forced into kid clothes', lookOf(kid).outfit === 'tee', lookOf(kid).outfit);
const grown = base(); grown.ageY = 25; grown.look.outfit = 'tux';
ok('adult keeps chosen outfit', lookOf(grown).outfit === 'tux');

// illness reaches the figure
const ill = base(); ill.illness = { name: 'A bad flu' };
ok('illness sets sick flag', lookOf(ill).sick === true);
ok('healthy is not sick', lookOf(base()).sick === false);

// hair purchase
const h = base(); h.cash = 100; const target = h.look.hair === 'bob' ? 'mohawk' : 'bob';
buyHair(h, target);
ok('hair charged', h.cash === 100 - HAIRSTYLES[target].cost, 'cash=' + h.cash);
ok('hair applied', h.look.hair === target);
const poor = base(); poor.cash = 5; const before = poor.look.hair;
buyHair(poor, 'mohawk');
ok('broke cannot buy hair', poor.cash === 5 && poor.look.hair === before);
const same = base(); same.cash = 500; const keep = same.look.hair;
buyHair(same, keep);
ok('re-picking current hair is free', same.cash === 500);

// outfits
const o = base(); o.cash = 5000;
wearOutfit(o, 'tux');
ok('outfit charged', o.cash === 5000 - OUTFITS.tux.cost, 'cash=' + o.cash);
ok('outfit worn', o.look.outfit === 'tux');
ok('outfit now owned', ownsOutfit(o, 'tux'));
wearOutfit(o, 'tee');
wearOutfit(o, 'tux');
ok('re-wearing owned outfit is free', o.cash === 5000 - OUTFITS.tux.cost, 'cash=' + o.cash);
const broke = base(); broke.cash = 10;
wearOutfit(broke, 'dress');
ok('broke cannot buy outfit', broke.cash === 10 && broke.look.outfit === 'tee' && !ownsOutfit(broke, 'dress'));
ok('unknown outfit is ignored', wearOutfit(base(), 'spacesuit').look.outfit === 'tee');

// colour
const c = base(); c.cash = 200; c.look.hairColor = '#241a2e';   // pin it, ensureAppearance rolls this
setHairColour(c, '#a8763c');
ok('colour charged', c.cash === 140 && c.look.hairColor === '#a8763c', 'cash=' + c.cash);
setHairColour(c, '#a8763c');
ok('re-picking the same colour is free', c.cash === 140, 'cash=' + c.cash);

// ten-plus cuts, and the beard is not on offer to everyone
ok('at least ten cuts', HAIR_ORDER.length >= 10, HAIR_ORDER.length + '');
ok('every cut has a label and a price', HAIR_ORDER.every((k) => HAIRSTYLES[k] && HAIRSTYLES[k].label && HAIRSTYLES[k].cost >= 0));
ok('no duplicate labels', new Set(HAIR_ORDER.map((k) => HAIRSTYLES[k].label)).size === HAIR_ORDER.length);
ok('a girl is offered no beard', !hairChoices('female').includes('beard'));
ok('a boy is offered the beard', hairChoices('male').includes('beard'));
ok('girls still get ten cuts', hairChoices('female').length >= 10, hairChoices('female').length + '');

// eyes and lips
const face = base();
ok('a face is given eyes', EYE_COLOURS.includes(face.look.eyes), face.look.eyes);
ok('lips default to natural', face.look.lips === 'natural');
ok('lookOf carries eyes and lips', lookOf(face).eyes === face.look.eyes && lookOf(face).lips === 'natural');
ok('natural is an option', LIPS[0] === 'natural');

// saves made before the hair list grew
const oldSave = { gender: 'male', ageY: 30, look: { hair: 'short', hairColor: '#241a2e', skin: '#e5bb9a', outfit: 'tee', owned: ['tee'] } };
ensureAppearance(oldSave);
ok('old "short" becomes cropped', oldSave.look.hair === 'cropped');
ok('old save gets eyes', !!oldSave.look.eyes);

// other people get a stable face
const p = { id: 'fam_x1', name: 'Iris Vale', gender: 'f', age: 30 };
const l1 = lookOfPerson(p), l2 = lookOfPerson(p);
ok('person face is stable', JSON.stringify(l1) === JSON.stringify(l2));
ok('different people differ', JSON.stringify(lookOfPerson({ id: 'fam_x2', gender: 'm', age: 40 })) !== JSON.stringify(l1));
ok('person age carried through', lookOfPerson({ id: 'q', age: 71 }).age === 71);
ok('missing person does not crash', !!lookOfPerson(undefined).hair);

// companion: spouse wins over partner, none when alone
const s1 = base(); s1.partner = { id: 'd1', name: 'Jonas' };
ok('partner shows', companionOf(s1)?.person.name === 'Jonas' && companionOf(s1).married === false);
s1.family = [{ id: 'f1', relation: 'Spouse', name: 'Iris', alive: true }];
ok('spouse beats partner', companionOf(s1)?.person.name === 'Iris' && companionOf(s1).married === true);
s1.family = [{ id: 'f1', relation: 'Spouse', name: 'Iris', alive: false }];
ok('dead spouse does not show', companionOf(s1)?.person.name === 'Jonas');
ok('alone shows nobody', companionOf(base()) === null);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
