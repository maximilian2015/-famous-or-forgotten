import { setFame } from '../meta/status.js';
import { uid } from '../../engine/id.js';
// Somebody was a number that went up when you pressed a button and down when you did not.
// There was one way to meet them, one way to see them, one question to ask, and no way for
// it to ever end except an eight per cent annual coin flip.
//
// What this wants instead: a person who is looking for something specific, who can tell
// whether your life has room in it for them, and who is capable of leaving. The whole arc
// is meeting → seeing each other → living together → married → and, if you earn it, out
// the other side with half your money gone and children who have opinions about you.
//
// Everything that moves closeness goes through applyBond, so the same evening cannot be
// farmed four times and being high already makes it harder. See systems/life/bonds.js.
import { rint, chance, pick } from '../../engine/rng.js';
import { onCooldown, markUsed } from '../../engine/cooldown.js';
import { addTimeline } from '../../engine/timeline.js';
import { canRaiseChild, HOUSING } from '../../engine/economy.js';
import { applyBond, clampRel } from './bonds.js';
import { level as drinkLevel, dependent } from './drink.js';

const clamp = (v) => Math.max(0, Math.min(100, v));
const MFIRST = ['Jonas','Marco','Idris','Felix','Ren','Cole','Adrian','Nico','Sami','Leo'];
const FFIRST = ['Sasha','Iris','Noor','Elin','Priya','Wren','Yara','Freya','Talia','Mira'];
const LAST = ['Vale','Kade','Roy','Mercer','Onyx','Frost','Dune','Salt','Wren','Bright','Hale'];
const JOBS = ['barista','architect','nurse','photographer','teacher','chef','personal trainer','graphic designer','musician','accountant'];

// ── what they are actually looking for ────────────────────────────────────────
// This is the whole personality. It decides which evenings land, whether your name is an
// attraction or a problem, and what finally makes them go.
export const WANTS = {
  quiet: {
    label: 'Wants a quiet life', blurb: 'Reads the room, hates the room. Your name is something they put up with.',
    fame: -0.35, likes: ['home', 'dinner'], hates: ['public'], patience: [55, 80],
  },
  thelife: {
    label: 'Wants the life', blurb: 'Loves the photographs, loves being seen with you. Ask what they love about you.',
    fame: 0.5, likes: ['public', 'away'], hates: ['home'], patience: [25, 50],
  },
  family: {
    label: 'Wants a family', blurb: 'Is not really asking about tonight. They are asking about the next thirty years.',
    fame: -0.1, likes: ['home', 'away'], hates: [], patience: [40, 70],
  },
  ambitious: {
    label: 'Has their own thing', blurb: 'Busy, good at it, and not remotely impressed. Needs you least, and knows it.',
    fame: 0.1, likes: ['dinner', 'public'], hates: [], patience: [65, 90],
  },
};
export const WANT_KEYS = Object.keys(WANTS);

// ── and what they have ────────────────────────────────────────────────────────
// Every evening came out of your pocket, which made the whole screen unusable at nineteen
// with forty euros to your name. Some of the people in it have money. When they have more
// of it than you do, they pick up the bill — and when you are broke and twenty, somebody
// who comes from money is not a footnote, it is a way to live.
export const MEANS = {
  broke:    { id: 'broke',    weight: 26, label: 'Has nothing behind them', covers: 0,      jobs: ['barista','shop assistant','bike courier','waiter','care worker'] },
  ordinary: { id: 'ordinary', weight: 40, label: 'Gets by',                 covers: 350,    jobs: ['nurse','teacher','chef','photographer','graphic designer'] },
  money:    { id: 'money',    weight: 24, label: 'Comes from money',        covers: 22000,  jobs: ['architect','surgeon','lawyer','gallery director','economist'] },
  serious:  { id: 'serious',  weight: 10, label: 'Serious family money',    covers: 500000, jobs: ['does not have to work','runs the family office','collects things','sits on boards'] },
};
export const MEANS_ORDER = ['broke', 'ordinary', 'money', 'serious'];
export function meansOf(p) { return MEANS[p && p.means] || MEANS.ordinary; }
function rollMeans() {
  const total = MEANS_ORDER.reduce((n, k) => n + MEANS[k].weight, 0);
  let roll = Math.random() * total;
  for (const k of MEANS_ORDER) { roll -= MEANS[k].weight; if (roll <= 0) return k; }
  return 'ordinary';
}
// Who actually pays. They do when they can cover it and they are better off than you are —
// which is true early and stops being true the year you become somebody.
export function whoPays(s, p, key) {
  const cost = dateCost(s, key);
  const covers = meansOf(p).covers;
  return covers >= cost && covers > (s.cash || 0) ? 'them' : 'you';
}

export function prospect(s) {
  const gender = chance(50) ? 'm' : 'f';
  const name = `${pick(gender === 'm' ? MFIRST : FFIRST)} ${pick(LAST)}`;
  const age = Math.max(18, Math.min(90, (s.ageY || 18) + rint(-4, 4)));
  const wants = pick(WANT_KEYS);
  const means = rollMeans();
  const w = WANTS[wants];
  return { id: uid(s, 'date'), name, gender, age,
    job: pick(MEANS[means].jobs), charm: rint(30, 85), relationship: 0, dates: 0, means,
    wants, patience: rint(w.patience[0], w.patience[1]), livingTogether: false, married: false };
}
export function refreshDatingPool(s, force) {
  s.datingPool = s.datingPool || [];
  if (!force && s.datingPool.length >= 4) return s;
  if (force) s.datingPool = [];
  while (s.datingPool.length < 4) s.datingPool.push(prospect(s));
  return s;
}
export function wantsOf(p) { return WANTS[p && p.wants] || WANTS.quiet; }

// ── the evenings ──────────────────────────────────────────────────────────────
// Four of them, and which one lands depends entirely on who you are with. Booking the same
// expensive weekend every month is not a strategy — it is how you find out they wanted to
// stay in.
export const DATES = {
  home:   { id: 'home',   label: 'A night in',        blurb: 'Cooking, badly, and nowhere to be.',            base: 9,  cost: 40,    energy: 0 },
  dinner: { id: 'dinner', label: 'Dinner somewhere',  blurb: 'A table at the back. Quiet enough to talk.',    base: 10, cost: 260,   energy: 0 },
  public: { id: 'public', label: 'Be seen together',  blurb: 'A premiere, an opening, a photograph or forty.', base: 9, cost: 900,   energy: 1 },
  away:   { id: 'away',   label: 'Go away for a week', blurb: 'Somewhere with no signal and nobody watching.', base: 18, cost: 14000, energy: 1 },
};
export const DATE_ORDER = ['home', 'dinner', 'public', 'away'];

// What an evening costs somebody at your level. A star's dinner is not a barista's dinner,
// and pretending otherwise made every one of these free by thirty.
export function dateCost(s, key) {
  const d = DATES[key]; if (!d) return 0;
  return Math.round(d.cost * (1 + Math.min(3, (s.fame || 0) / 45)));
}

// The number an evening actually moves, before applyBond takes its cut.
export function dateValue(s, p, key) {
  const d = DATES[key]; if (!d) return 0;
  const w = wantsOf(p);
  let v = d.base;
  if (w.likes.includes(key)) v += 7;
  if (w.hates.includes(key)) v -= 11;
  // Being with somebody famous is the point for one of them and the problem for another.
  v += (s.fame || 0) / 100 * 8 * w.fame;
  // And a month you spent drinking is a month they were sitting opposite somebody else.
  if (dependent(s)) v -= 6; else if (drinkLevel(s) > 0) v -= 2;
  return Math.round(v);
}

export function goOnDate(s, key, id) {
  const d = DATES[key];
  if (!d) return s;
  const p = s.partner || (s.datingPool || []).find((x) => x.id === id);
  if (!p) { s.lastEvent = 'There is nobody to ask.'; return s; }
  const tag = s.partner ? 'partner' : 'date:' + p.id;
  if (onCooldown(s, tag)) { s.lastEvent = `You have already had your evening with ${p.name.split(' ')[0]} this month.`; return s; }
  if (d.energy && (s.ap || 0) < d.energy) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  const cost = dateCost(s, key);
  const paying = whoPays(s, p, key) === 'you';
  if (paying && (s.cash || 0) < cost) { s.lastEvent = `That costs €${cost.toLocaleString()} and you're short.`; return s; }
  markUsed(s, tag);
  if (paying) s.cash -= cost;
  if (d.energy) s.ap = Math.max(0, (s.ap || 0) - d.energy);

  // Getting somebody to say yes in the first place is a different question from how the
  // evening goes, and only applies before there is an "us".
  if (!s.partner) {
    const odds = clamp(30 + (s.charisma || 0) * 0.3 + (s.looks || 0) * 0.2 + p.charm * 0.2);
    if (!chance(odds)) {
      applyBond(s, p, -rint(4, 9));
      s.mental = clamp((s.mental || 50) - 2);
      s.lastEvent = `The evening with ${p.name} never got going. No spark.`;
      addTimeline(s, `An evening with ${p.name} went nowhere.`);
      return s;
    }
    p.dates = (p.dates || 0) + 1;
  }

  const moved = applyBond(s, p, Math.max(1, dateValue(s, p, key)));
  s.mental = clamp((s.mental || 50) + rint(2, 5));
  const w = wantsOf(p);
  const note = w.hates.includes(key) ? ` ${p.name.split(' ')[0]} smiled through it. They did not want to be there.`
    : w.likes.includes(key) ? ` It is exactly what ${p.name.split(' ')[0]} wanted.` : '';

  // Being photographed together is the whole point of one of these, and it cuts both ways.
  if (key === 'public') {
    setFame(s, (s.fame || 0) + rint(1, 3));
    if (chance(22)) {
      s.scandal = clamp((s.scandal || 0) + rint(3, 9));
      addTimeline(s, `You and ${p.name} are on the front of something neither of you agreed to.`, true);
    }
  }

  if (!s.partner && p.dates >= 2 && (p.relationship || 0) >= 40) {
    s.partner = { ...p, since: (s.year || 0) * 12 + (s.month || 0) };
    s.datingPool = (s.datingPool || []).filter((x) => x.id !== p.id);
    s.lastEvent = `You and ${p.name} are seeing each other properly now.`;
    addTimeline(s, `Started seeing ${p.name}.`);
    return s;
  }
  s.lastEvent = `${d.label} with ${p.name.split(' ')[0]}. Closeness +${moved}.${note}`
    + (paying ? '' : ` ${p.name.split(' ')[0]} would not hear of you paying.`);
  return s;
}
// Kept so old saves and old call sites still work: the plain, cheap version.
export function askOut(s, id) { return goOnDate(s, 'dinner', id); }
export function spendWithPartner(s) { return goOnDate(s, 'home'); }

// ── moving in ─────────────────────────────────────────────────────────────────
// The step the game did not have. It is the first thing either of you actually risks.
export const MOVE_IN_AT = 60;
export function canMoveIn(s) {
  if (!s.partner || s.partner.livingTogether) return { ok: false, why: '' };
  if (!s.hasApartment) return { ok: false, why: 'You would need a place of your own first.' };
  if ((s.partner.relationship || 0) < MOVE_IN_AT) return { ok: false, why: `Not yet. ${s.partner.name.split(' ')[0]} would say no, and you would both remember it.` };
  return { ok: true, why: '' };
}
export function moveInTogether(s) {
  const fit = canMoveIn(s);
  if (!fit.ok) { s.lastEvent = fit.why || 'Not now.'; return s; }
  s.partner.livingTogether = true;
  s.partner.movedIn = (s.year || 0) * 12 + (s.month || 0);
  applyBond(s, s.partner, 12);
  s.mental = clamp((s.mental || 50) + 6);
  s.lastEvent = `${s.partner.name} moved in. Two van loads and an argument about a lamp.`;
  addTimeline(s, `${s.partner.name} moved in.`);
  return s;
}

// ── the wedding ───────────────────────────────────────────────────────────────
export const WEDDINGS = {
  registry: { id: 'registry', label: 'A registry office', blurb: 'Two witnesses off the street and lunch afterwards.', cost: 400, fame: 0, bond: 4 },
  proper:   { id: 'proper',   label: 'A proper wedding',  blurb: 'Everyone you have, in one room, for one day.',      cost: 60000, fame: 3, bond: 14 },
  sold:     { id: 'sold',     label: 'Sell the pictures', blurb: 'A magazine pays for all of it and owns every frame.', cost: 0, fame: 14, bond: -6, pays: true },
};
export const WEDDING_ORDER = ['registry', 'proper', 'sold'];
export function weddingCost(s, key) {
  const w = WEDDINGS[key]; if (!w) return 0;
  if (w.pays) return -Math.round(120000 * (1 + Math.min(4, (s.fame || 0) / 30)));
  return Math.round(w.cost * (1 + Math.min(3, (s.fame || 0) / 50)));
}
export const PROPOSE_AT = 65;

// A prenup is the least romantic conversation two people can have and it is worth every
// euro it later saves. Asking for one costs you something on the day, which is the trade.
export function proposeMarriage(s, style = 'proper', prenup = false) {
  if (!s.partner || s.partner.married) return s;
  if ((s.partner.relationship || 0) < PROPOSE_AT) { s.lastEvent = `Too soon. ${s.partner.name.split(' ')[0]} isn't ready for that yet.`; return s; }
  if (onCooldown(s, 'propose')) { s.lastEvent = 'Asking twice in one month would not help your case.'; return s; }
  markUsed(s, 'propose');
  const w = WEDDINGS[style] || WEDDINGS.proper;
  const cost = weddingCost(s, style);
  if (cost > 0 && (s.cash || 0) < cost) { s.lastEvent = `That wedding costs €${cost.toLocaleString()} and you cannot cover it.`; return s; }
  // Somebody who wants the life says yes to being photographed. Somebody who wants quiet
  // does not, and asking is itself the answer to a question they had about you.
  const wants = wantsOf(s.partner);
  let odds = clamp(50 + ((s.partner.relationship || 0) - PROPOSE_AT) * 1.4);
  if (style === 'sold') odds += wants.hates.includes('public') ? -28 : 12;
  if (prenup) odds -= 14;
  if (!chance(odds)) {
    applyBond(s, s.partner, -rint(6, 12));
    s.mental = clamp((s.mental || 50) - 6);
    s.lastEvent = `${s.partner.name.split(' ')[0]} needs more time to think.${prenup ? ' The paperwork did not help.' : ''}`;
    addTimeline(s, `Proposed to ${s.partner.name} — they asked for time.`);
    return s;
  }
  s.cash = (s.cash || 0) - cost;
  setFame(s, (s.fame || 0) + w.fame);
  const partner = s.partner;
  applyBond(s, partner, w.bond + (prenup ? -8 : 0));
  (s.family = s.family || []).push({
    id: 'fam' + Math.random().toString(36).slice(2, 8), name: partner.name, relation: 'Spouse',
    gender: partner.gender, age: partner.age, alive: true, health: partner.health || rint(70, 95),
    relationship: partner.relationship, job: partner.job, retired: false,
    wants: partner.wants, patience: partner.patience, livingTogether: true, means: partner.means,
    marriedOn: (s.year || 0) * 12 + (s.month || 0), prenup: !!prenup,
  });
  // Marrying somebody who has it changes what the household has. It is not a payout, it is
  // that two lives become one account — and it is the thing that makes a rich match matter
  // at twenty-two, when it is the only way anybody gets a flat.
  const covers = meansOf(partner).covers;
  if (covers > (s.cash || 0)) {
    const brought = Math.round(covers * (prenup ? 0.15 : 0.6));
    s.cash = (s.cash || 0) + brought;
    addTimeline(s, `${partner.name.split(' ')[0]} did not come empty-handed. €${brought.toLocaleString()}.`);
  }
  s.partner = null;
  s.lastEvent = cost < 0
    ? `${partner.name} said yes, and a magazine paid for the whole thing. €${Math.abs(cost).toLocaleString()} and every photograph is theirs.`
    : `${partner.name} said yes. ${w.label}, €${cost.toLocaleString()}.`;
  addTimeline(s, `Married ${partner.name}.${prenup ? ' Signed beforehand.' : ''}`);
  s.bigMoment = { id: 'wedding', kind: 'good', title: `You married ${partner.name}`, body: s.lastEvent };
  return s;
}

export { spouseOf, tryForBaby, childhoodTick } from './children.js';
import { spouseOf } from './children.js';

// ── it ending ─────────────────────────────────────────────────────────────────
export const WALKS_AT = -10;
// What they take with them. A prenup is the difference between half of everything and a
// number you can live with.
export function settlement(s, spouse) {
  const married = Math.max(0, ((s.year || 0) * 12 + (s.month || 0)) - (spouse.marriedOn || 0));
  const years = married / 12;
  // Somebody who came in with more than you is not leaving with your money. Their lawyers
  // were only ever there to protect theirs, which is the honest shape of that marriage.
  const theirs = meansOf(spouse).covers;
  const rich = theirs > (s.cash || 0);
  if (spouse.prenup || rich) return Math.round(Math.min((s.cash || 0) * (rich ? 0.08 : 0.18), 250000 + years * 45000));
  return Math.round((s.cash || 0) * 0.5);
}
export function divorce(s, filedByThem = false) {
  const spouse = spouseOf(s);
  if (!spouse) { s.lastEvent = 'There is nobody to divorce.'; return s; }
  const take = settlement(s, spouse);
  s.cash = Math.max(0, (s.cash || 0) - take);
  spouse.alive = true; spouse.relation = 'Ex-spouse';
  spouse.relationship = clampRel((spouse.relationship || 0) - 30);
  s.mental = clamp((s.mental || 50) - 18);
  // The children stay where the stability is, and that is rarely the person on location.
  const kids = (s.family || []).filter((p) => p.relation === 'Child' && p.alive && p.age < 18);
  const theyKeep = kids.length > 0 && (filedByThem || (spouse.relationship || 0) > (0));
  for (const k of kids) { if (theyKeep) { k.raisedBy = 'them'; applyBond(s, k, -12); } }
  const line = filedByThem
    ? `${spouse.name} filed. €${take.toLocaleString()} and the good furniture.`
    : `You filed. €${take.toLocaleString()} of it went with ${spouse.name.split(' ')[0]}.`;
  s.lastEvent = line;
  addTimeline(s, `Divorced ${spouse.name}. €${take.toLocaleString()}${theyKeep && kids.length ? `, and the children went with them` : ''}.`, true);
  s.bigMoment = { id: 'divorce', kind: 'bad', title: `${spouse.name} is your ex-wife`.replace('wife', spouse.gender === 'm' ? 'husband' : 'wife'),
    body: `${line}${spouse.prenup ? ' The paperwork you both hated signing did exactly what it was for.' : ' There was no paperwork, so it was half.'}`
      + (theyKeep && kids.length ? ` ${kids.length === 1 ? 'Your child lives' : 'Your children live'} with them now. You see them when the schedule allows, which is the problem in one sentence.` : '') };
  return s;
}

// ── the year ──────────────────────────────────────────────────────────────────
// Nobody leaves out of nowhere any more. They leave because of something you did, or
// because of a year of you not being there.
export function datingYear(s) {
  if (s.partner && !s.partner.married) {
    s.partner.age += 1;
    const rel = s.partner.relationship || 0;
    const w = wantsOf(s.partner);
    // Patience is how much of your absence they will take before it stops being worth it.
    const bar = 12 + (100 - (s.partner.patience || 60)) * 0.35;
    if (rel < bar && chance(55)) {
      addTimeline(s, `${s.partner.name} ended it. ${w.label.toLowerCase()}, and this was never going to be it.`, true);
      s.mental = clamp((s.mental || 50) - 10);
      s.lastFamilyEvent = `${s.partner.name} ended things.`;
      s.partner = null;
    }
  }
  const spouse = spouseOf(s);
  if (spouse) {
    // A marriage does not end on a coin flip. It ends when there has been nothing in it for
    // a long time, and drinking through it is the fastest way there is to get to that point.
    const rel = spouse.relationship || 0;
    let risk = 0;
    if (rel < WALKS_AT) risk = 40;
    else if (rel < 12) risk = 18;
    else if (rel < 30) risk = 6;
    if (dependent(s)) risk += 18;
    if (risk > 0 && chance(risk)) divorce(s, true);
  }
  if (s.datingPool && s.datingPool.length) s.datingPool = s.datingPool.filter(() => chance(70));
}
