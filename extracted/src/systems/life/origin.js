// Where you come from. A newborn owning €3,500 was nonsense — money belongs to the
// family, and which family you land in is the first roll of the whole game.
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { makeFamily } from './family.js';

// Weights are roughly how the world actually looks, not how a player would like it to.
export const CLASSES = {
  struggling: {
    weight: 18, label: 'Struggling',
    money: 'Money was the thing your parents argued about after you went to bed.',
    jobs: ['cleaner', 'warehouse packer', 'care worker', 'kitchen porter', 'bus driver', 'shelf stacker'],
    allowance: [30, 90], ask: 0.35, unemployedOdds: 30, estate: [0, 1800], leavesHome: false,
  },
  getting_by: {
    weight: 34, label: 'Getting by',
    money: 'There was always food on the table and never quite enough for the rest.',
    jobs: ['nurse', 'mechanic', 'shop manager', 'office clerk', 'postal worker', 'hairdresser'],
    allowance: [120, 280], ask: 0.7, unemployedOdds: 14, estate: [1500, 11000], leavesHome: false,
  },
  comfortable: {
    weight: 28, label: 'Comfortable',
    money: 'Nothing extravagant, but nobody checked the price of things.',
    jobs: ['teacher', 'accountant', 'engineer', 'physiotherapist', 'chef', 'architect'],
    allowance: [320, 700], ask: 1.4, unemployedOdds: 7, estate: [14000, 55000], leavesHome: false,
  },
  well_off: {
    weight: 15, label: 'Well off',
    money: 'Two cars, a house with a garden, and holidays that involved aeroplanes.',
    jobs: ['surgeon', 'lawyer', 'company director', 'dentist', 'university lecturer', 'notary'],
    allowance: [800, 1700], ask: 3, unemployedOdds: 3, estate: [70000, 240000], leavesHome: true,
  },
  rich: {
    weight: 5, label: 'Rich',
    money: 'You did not learn what things cost until you were old enough to be embarrassed by it.',
    jobs: ['shipping magnate', 'private banker', 'property developer', 'gallery owner', 'surgeon'],
    allowance: [1900, 3400], ask: 7, unemployedOdds: 1, estate: [280000, 900000], leavesHome: true,
  },
};
export const CLASS_ORDER = ['struggling', 'getting_by', 'comfortable', 'well_off', 'rich'];
export function classOf(s) { return CLASSES[s.familyClass] || CLASSES.getting_by; }

function rollClass() {
  const total = CLASS_ORDER.reduce((n, k) => n + CLASSES[k].weight, 0);
  let roll = Math.random() * total;
  for (const k of CLASS_ORDER) { roll -= CLASSES[k].weight; if (roll <= 0) return k; }
  return 'getting_by';
}

// One thing you got from them that has nothing to do with money. Each nudges a stat,
// so two lives that look the same on paper do not start the same.
const GIFTS = [
  { id: 'choir',   from: 'mother',      text: 'sang in a church choir every Sunday and made you stand next to her', stat: 'singing', amount: 6 },
  { id: 'stage',   from: 'father',      text: 'ran lights at the local theatre and let you sit in the empty stalls', stat: 'acting', amount: 6 },
  { id: 'mirror',  from: 'mother',      text: 'never left the house without her face on, and taught you the same', stat: 'looks', amount: 6 },
  { id: 'talker',  from: 'father',      text: 'could talk his way into anywhere, and you watched him do it', stat: 'charisma', amount: 7 },
  { id: 'stubborn',from: 'grandmother', text: 'raised four children alone and had no patience for giving up', stat: 'discipline', amount: 8 },
  { id: 'reader',  from: 'grandfather', text: 'read to you every week from books far too old for you', stat: 'confidence', amount: 6 },
];

function ordinal(n) { return ['first', 'second', 'third', 'fourth', 'fifth'][n] || `${n + 1}th`; }
// "an university" is wrong — it is the sound that decides, not the letter.
const an = (word) => (/^(uni|eu|use|one)/i.test(word) ? 'a ' : /^[aeiou]/i.test(word) ? 'an ' : 'a ') + word;
const YEARS = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'fourteen'];

// Called once, at birth. Rolls the circumstances, builds the family around them, then
// writes the story FROM the family that actually exists — so it can never contradict
// what the People screen shows.
export function beginLife(s) {
  // Born to somebody the game already played. Nothing here is rolled: the class, the money
  // and the name all come from a life that actually happened. See systems/meta/legacy.js.
  if (s.heir) return beginAsHeir(s);
  s.familyClass = rollClass();
  const c = classOf(s);
  // family.js reads these off state instead of importing back into here — this module
  // already imports makeFamily from there, and the cycle is not worth the tidiness.
  s.familyAsk = c.ask;
  s.familyEstate = c.estate;
  s.familyLeavesHome = c.leavesHome;

  // Not every child gets two married parents.
  const setup = chance(76) ? 'married' : chance(58) ? 'together' : 'single';
  s.parentsMarried = setup === 'married';
  s.singleParent = setup === 'single';

  makeFamily(s, { jobs: c.jobs, unemployedOdds: c.unemployedOdds, singleParent: s.singleParent });

  const mum = s.family.find((p) => p.relation === 'Mother');
  const dad = s.family.find((p) => p.relation === 'Father');
  const sibs = s.family.filter((p) => p.relation === 'Brother' || p.relation === 'Sister');
  const gran = s.family.find((p) => p.relation.startsWith('Grand'));

  // Only offer a gift from someone who actually exists in this life.
  const present = GIFTS.filter((g) =>
    (g.from === 'mother' && mum) || (g.from === 'father' && dad) ||
    (g.from === 'grandmother' && s.family.some((p) => p.relation.startsWith('Grandm'))) ||
    (g.from === 'grandfather' && s.family.some((p) => p.relation === 'Grandfather')));
  const gift = pick(present.length ? present : [GIFTS[3]]);
  const giver = gift.from === 'mother' ? mum : gift.from === 'father' ? dad
    : s.family.find((p) => p.relation.toLowerCase().startsWith('grand' + gift.from.slice(5, 6))) || gran;
  s[gift.stat] = Math.max(0, Math.min(100, (s[gift.stat] || 0) + gift.amount));
  s.origin = { gift: gift.id, giver: giver ? giver.name : 'someone in the family' };

  const lines = [];
  // However long they had been together, it has to fit inside their own lifetimes.
  const married = YEARS[Math.min(YEARS.length - 1, Math.max(0, rint(0, Math.max(1, mum.age - 24))))];
  const parentsLine = dad
    ? `You were born to ${mum.name} and ${dad.name}` + (setup === 'married'
        // `married` is a WORD out of the YEARS table — "four", "eleven" — not a number, so
        // it must not go through count(), which reads it as NaN and says "married 0 years".
        ? `, married ${married} year${married === 'one' ? '' : 's'} by the time you arrived.`
        : `, who never married but never left each other either.`)
    : `You were born to ${mum.name}, who raised you on her own from the first day.`;
  lines.push(parentsLine);

  const work = dad
    ? `She ${mum.job === 'unemployed' ? 'was out of work' : 'was ' + an(mum.job)}, he ${dad.job === 'unemployed' ? 'was between jobs' : 'was ' + an(dad.job)}.`
    : `She ${mum.job === 'unemployed' ? 'was out of work that year' : 'was ' + an(mum.job)}.`;
  lines.push(work + ' ' + c.money);

  if (!sibs.length) lines.push('No brothers, no sisters — the whole of their attention landed on you.');
  else if (sibs.length === 1) lines.push(`You were the ${ordinal(1)} child. ${sibs[0].name.split(' ')[0]} came first and never let you forget it.`);
  else lines.push(`You were the youngest of ${sibs.length + 1}: ${sibs.map((p) => p.name.split(' ')[0]).join(' and ')} were already running the house.`);

  if (giver) lines.push(`Your ${gift.from} ${giver.name.split(' ')[0]} ${gift.text}.`);
  lines.push(`In ${s.city}, in ${s.year}. Nobody there had any idea what you would become.`);

  s.originStory = lines.join(' ');
  addTimeline(s, `Born in ${s.city} to ${dad ? `${mum.name} and ${dad.name}` : mum.name} — a ${c.label.toLowerCase()} household.`);
  return s;
}

// ── the second generation ─────────────────────────────────────────────────────
// The door is already open. That is the entire inheritance, and it is worth an enormous
// amount — but the room on the other side has decided in advance that you did not earn
// being in it, and it will keep deciding that until you make something nobody can argue
// with. Which is exactly what it is like.
const HEIR_CLASS = (estate) => estate >= 900000 ? 'rich' : estate >= 240000 ? 'well_off'
  : estate >= 55000 ? 'comfortable' : estate >= 11000 ? 'getting_by' : 'struggling';

function beginAsHeir(s) {
  const h = s.heir;
  s.familyClass = HEIR_CLASS(h.estate || 0);
  const c = classOf(s);
  s.familyAsk = c.ask; s.familyEstate = c.estate; s.familyLeavesHome = c.leavesHome;
  s.parentsMarried = true; s.singleParent = false;
  // A normal two-parent household, and then the famous one REPLACES whichever of them they
  // actually were. Generating a single mother and relabelling her "Father" produced a woman
  // called Sofia listed as the father, which is exactly the kind of thing a player screenshots.
  makeFamily(s, { jobs: c.jobs, unemployedOdds: c.unemployedOdds, singleParent: false });
  const famousWas = h.parentGender === 'f' ? 'Mother' : 'Father';
  const slot = s.family.findIndex((p) => p.relation === famousWas);
  const dead = { id: 'famheir', name: h.parent, relation: famousWas, gender: h.parentGender || 'f',
    age: 0, alive: false, health: 0, relationship: h.close || 0, job: s.dream === 'singer' ? 'singer' : 'actor',
    retired: false, deathAge: 0, wasFamous: true, tier: h.tier };
  if (slot >= 0) s.family[slot] = dead; else s.family.unshift(dead);

  s.fame = Math.max(0, h.fame || 0);
  s.peakFame = s.fame;
  s.respect = Math.max(-40, h.respect || 0);
  const craftKey = s.dream === 'singer' ? 'singing' : 'acting';
  s[craftKey] = Math.min(100, (s[craftKey] || 0) + (h.craft || 0));
  s.cash = 0;                                   // the estate is the family's until you are grown
  s.origin = { gift: 'heir', giver: h.parent };
  s.heirOf = { parent: h.parent, tier: h.tier, peak: h.parentPeak, knewThem: !!h.knewThem };

  const knew = h.knewThem
    ? `You knew them. Properly — they were there for the school runs as well as the premieres, and half of what you know about the work you learned in a kitchen.`
    : h.close >= 25
      ? `You knew them the way everybody knew them: from a distance, and mostly from screens.`
      : `You barely knew them. They were working, and then they were gone, and the obituaries told you things about your own parent that you had not known.`;
  s.originStory = [
    `You are ${h.parent}'s child.`,
    `They were ${h.tier === 'Forgotten' ? 'in the business for years and never quite got there' : an(h.tier.toLowerCase())}, and they are dead.`,
    knew,
    `Every casting director in ${s.city} will take your call and not one of them thinks you deserve it.`,
    `In ${s.city}, in ${s.year}. Everybody there has already decided what you will become.`,
  ].join(' ');
  addTimeline(s, `Born to ${h.parent} — ${h.tier}.`);
  return s;
}

// Pocket money, birthdays, a note slipped into your hand at the door. It is the only
// income a child has, and how much of it there is depends entirely on the family.
export function allowanceTick(s) {
  const age = s.ageY || 0;
  if (age < 6 || age >= 18) return s;
  const c = classOf(s);
  const parents = (s.family || []).filter((p) => (p.relation === 'Mother' || p.relation === 'Father') && p.alive);
  if (!parents.length) return s;
  const working = parents.filter((p) => p.job !== 'unemployed').length;
  const scale = working ? 1 : 0.4;
  const amount = Math.round(rint(c.allowance[0], c.allowance[1]) * scale);
  s.cash = (s.cash || 0) + amount;
  return s;
}
