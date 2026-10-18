// Family V1 (life/kin.js): the household, the children, the living family, the family once, and
// the dead — read off what each person carries and nothing guessed. And the four facts that were
// never kept and are kept from now on: the year a person died, the job before retirement, the
// date of a divorce, a child's other parent.
import { household, children, kin, formers, deceased, diedYear, bornYear, lifeLine, workOf, childLine, exLine, ageNow } from '../src/systems/life/kin.js';
import { familyYear } from '../src/systems/life/family.js';
import { divorce } from '../src/systems/life/dating.js';
import { tryForBaby } from '../src/systems/life/children.js';
import { findPerson } from '../src/systems/life/interactions.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const fam = (o) => ({ id: 'k' + Math.random().toString(36).slice(2, 7), gender: 'f', alive: true, health: 80, relationship: 50, job: 'teacher', retired: false, ...o });
const st = (o = {}) => ({ version: 'x', name: 'Alex Moon', ageY: 40, year: 2080, month: 4, cash: 50000, mental: 60, health: 80, timeline: [], family: [], housing: 'house', hasApartment: true, ...o });

// ── the dead: what is known, and nothing else ─────────────────────────────────
{
  const s = st();
  const mum = fam({ name: 'Maria Moon', relation: 'Mother', alive: false, age: 79, deathAge: 79, diedOn: 2071 * 12 + 3, formerJob: 'teacher', job: 'retired' });
  ok('a death recorded from Family V1 has its years', lifeLine(s, mum) === '1992–2071 · died at 79' && diedYear(s, mum) === 2071 && bornYear(s, mum) === 1992, lifeLine(s, mum));
  ok('and the work they did, not "retired"', workOf(mum) === 'teacher');
  const old = fam({ name: 'Olga Moon', relation: 'Grandmother', alive: false, age: 84, deathAge: 84, job: 'retired', formerJob: 'nurse' });
  s.timeline = [{ text: '💔 Olga Moon, your grandmother, has passed away at 84.', when: 'Jan 2079' }];
  ok('an old save\'s death still in the timeline gets its year back', lifeLine(s, old) === '1995–2079 · died at 84', lifeLine(s, old));
  const lost = fam({ name: 'Viktor Moon', relation: 'Grandfather', alive: false, age: 77, deathAge: 77, job: 'retired' });
  ok('one whose line has gone says only the age', lifeLine(s, lost) === 'died at 77' && workOf(lost) === '', lifeLine(s, lost));
  const heirParent = fam({ name: 'Rita Vale', relation: 'Mother', alive: false, age: 0, deathAge: 0, wasFamous: true, job: 'actor' });
  ok('a famous parent from an old heir save is not "died at 0"', lifeLine(s, heirParent) === '' && workOf(heirParent) === 'actor');
}
// ── the living ────────────────────────────────────────────────────────────────
{
  const s = st({ family: [
    fam({ name: 'Ivo Kessler', relation: 'Spouse', gender: 'm', age: 52, job: 'retired', formerJob: 'architect', wants: 'quiet', marriedOn: 2061 * 12 + 5 }),
    fam({ name: 'Ines Moon', relation: 'Child', age: 9, job: 'in school', otherParent: { id: 'x', name: 'Ivo Kessler' } }),
    fam({ name: 'Ola Moon', relation: 'Child', age: 16, job: 'in school', path: 'industry', ownFame: 12, raisedBy: 'them', otherParent: { id: 'y', name: 'Petra Lind' } }),
    fam({ name: 'Petra Lind', relation: 'Ex-spouse', age: 44, divorcedOn: 2070 * 12 }),
    fam({ name: 'Anna Moon', relation: 'Mother', age: 68, job: 'retired', formerJob: 'nurse' }),
    fam({ name: 'Pelle Moon', relation: 'Brother', gender: 'm', age: 37, job: 'chef' }),
    fam({ name: 'Mary Moon', relation: 'Grandmother', age: 91, job: 'retired', formerJob: 'cleaner' }),
    fam({ name: 'Dead Moon', relation: 'Father', alive: false, age: 70, deathAge: 70 }),
  ] });
  const h = household(s);
  ok('the household is the spouse, with when it began', h && h.kind === 'spouse' && h.p.name === 'Ivo Kessler' && h.since === 'Jun 2061' && h.sinceWord === 'married since');
  ok('and what they do', workOf(h.p) === 'retired architect');
  ok('children oldest first, with where they are', children(s).map((k) => k.name).join() === 'Ola Moon,Ines Moon' && childLine(children(s)[0]) === 'in the business · lives with Petra');
  ok('the rest of the family, the older generation first, the dead not among them', kin(s).map((p) => p.relation).join() === 'Grandmother,Mother,Brother', kin(s).map((p) => p.relation).join());
  ok('family once: the ex, and when it ended', formers(s).length === 1 && exLine(formers(s)[0]) === 'divorced 2070');
  ok('the dead are in the tree list and nowhere else', deceased(s).map((p) => p.name).join() === 'Dead Moon');
  ok('a partner is the household when there is no spouse', household(st({ partner: { id: 'pa', name: 'Juno Vale', since: 2078 * 12 + 1, relationship: 40 } })).sinceWord === 'together since');
  ok('an old record with only a birth year still has an age', ageNow(st(), { born: 2040 }) === 40 && ageNow(st(), {}) === null);
  ok('an ex-spouse is somebody you used to be married to, not a grandparent', findPerson(s, formers(s)[0].id).rel === 'ex');
}
// ── kept from now on ──────────────────────────────────────────────────────────
{
  // Dying and retiring happen at the turn of the year.
  let died = null, retired = null;
  for (let i = 0; i < 400 && !(died && retired); i++) {
    const s = st({ family: [fam({ name: 'Old Moon', relation: 'Grandfather', age: 95, health: 5, job: 'retired', retired: true, formerJob: 'driver' }), fam({ name: 'Anna Moon', relation: 'Mother', age: 64, job: 'nurse' })] });
    familyYear(s);
    if (!died && s.family[0].alive === false) died = { p: s.family[0], s };
    if (!retired && s.family[1].retired) retired = s.family[1];
  }
  ok('a death keeps the year it happened', died && died.p.diedOn === died.s.year * 12 + died.s.month && lifeLine(died.s, died.p) === `${died.s.year - 96}–${died.s.year} · died at 96`, died && lifeLine(died.s, died.p));
  ok('retiring keeps the job they did', retired && retired.job === 'retired' && retired.formerJob === 'nurse' && workOf(retired) === 'retired nurse');
  const d = st({ family: [fam({ name: 'Ivo Kessler', relation: 'Spouse', gender: 'm', age: 40, marriedOn: 2070 * 12, relationship: 30 })] });
  divorce(d);
  ok('a divorce keeps its date', d.family[0].relation === 'Ex-spouse' && d.family[0].divorcedOn === 2080 * 12 + 4);
  let kid = null;
  for (let i = 0; i < 300 && !kid; i++) {
    const b = st({ ageY: 30, gender: 'female', family: [fam({ id: 'sp1', name: 'Tomas Berg', relation: 'Spouse', gender: 'm', age: 31 })], _cool: {} });
    tryForBaby(b); kid = b.family.find((p) => p.relation === 'Child');
  }
  ok('a child is born to two people, and both are kept', kid && kid.otherParent && kid.otherParent.name === 'Tomas Berg', JSON.stringify(kid && kid.otherParent));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
