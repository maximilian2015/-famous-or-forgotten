// The face. Looks were a number rolled at birth that a gym could nudge to 78 and nothing
// else touched — no thirty-year-old and no sixty-year-old had ever lost a point of it.
// Maxi: "looks have to be raised too — skincare, the routine, a surgeon, cosmetology; a
// place to spend money on its own, and it does not always help, it can wreck you. When
// you are young the looks are either there or they are not."
//
// So: under twenty-seven you are what you were born with, and only the gym, the drink and
// the state of you move it. From twenty-seven the face starts to go — a little in the
// thirties, more in the forties, a lot after fifty — and money slows it. A routine slows
// it; a clinic slows it and buys a point or two back; the needle buys points for a season
// and then they go, and too often too fast makes a face that does not move, which casting
// rooms notice; the knife is a roll — a good surgeon and luck make a face, a cheap one and
// a bad day take one away, and everybody can tell.
import { rint, chance } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { dependent } from './drink.js';
import { setRespect } from '../meta/status.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);

export const CARE = {
  none: { label: 'Nothing', cost: 0, slow: 1, gain: 0, cap: 0, blurb: 'Soap. It is fine at twenty-two.' },
  routine: { label: 'A routine', cost: 150, slow: 0.7, gain: 0, cap: 0, blurb: 'Serums, sunscreen, sleep. Slows what is coming; buys nothing back.' },
  clinic: { label: 'A clinic', cost: 900, slow: 0.45, gain: 0.08, cap: 78, blurb: 'Facials, peels, a dermatologist who knows your name. Slows it a lot and gives a little back.' },
  derm: { label: 'Aesthetic dermatology', cost: 4500, slow: 0.25, gain: 0.15, cap: 84, blurb: 'The people the names go to. The face stays where it is, and comes up a point a year.' },
};
export const CARE_ORDER = ['none', 'routine', 'clinic', 'derm'];
export const TRAINER_COST = 2500;
export const NEEDLE_MONTHS = 8;
export const FROZEN_AT = 4;      // needles inside two years before the face stops moving
export const SURGEONS = {
  clinic: { label: 'A clinic abroad', cost: 28000, great: 20, fine: 45, blurb: 'Cheap, quick, and half the waiting room looks like the same person.' },
  top: { label: 'The surgeon the names use', cost: 140000, great: 45, fine: 40, blurb: 'A year on the list, a week in the hills, and a face that looks like yours, rested.' },
};
export const SURGERY_AGE = 25;
export const RECOVERY = 2;

export function face(s) { return (s.face = s.face || { care: 'none', trainer: false, needles: [], ops: [], recovery: 0, frozenUntil: 0 }); }
export function faceBill(s) { const f = face(s); return (CARE[f.care] || CARE.none).cost + (f.trainer ? TRAINER_COST : 0); }
export function frozenFace(s) { return (face(s).frozenUntil || 0) > stamp(s); }
export function healing(s) { return (face(s).recovery || 0) > 0; }
export function needlesLately(s) { const now = stamp(s); return face(s).needles.filter((n) => now - n.at <= 24).length; }
// What the face costs a casting room: one that does not move, or one still in bandages.
export function facePenalty(s) { return frozenFace(s) ? 6 : 0; }

// ── monthly ───────────────────────────────────────────────────────────────────
export function faceTick(s) {
  const f = face(s); const age = s.ageY || 0; const now = stamp(s);
  // The bills. Unpaid, the routine stops.
  const bill = faceBill(s);
  if (bill) {
    if ((s.cash || 0) < bill) { f.care = 'none'; f.trainer = false; s.lastEvent = 'The clinic and the trainer stopped coming. You could not pay them.'; addTimeline(s, 'Could not pay for the face. The routine stopped.', true); }
    else s.cash -= bill;
  }
  if (f.recovery > 0) { f.recovery -= 1; if (f.recovery === 0) addTimeline(s, 'The bandages came off.'); }
  // Points bought with a needle go when the needle wears off.
  const kept = [];
  for (const n of f.needles) { if (n.until <= now) { s.looks = clamp((s.looks || 0) - n.pts); addTimeline(s, 'The work wore off. Your face is your own again, and a little older.'); } else kept.push(n); }
  f.needles = kept;
  const care = CARE[f.care] || CARE.none;
  if (f.trainer) { if ((s.looks || 0) < 86) s.looks = Math.min(86, (s.looks || 0) + 0.7); s.health = clamp((s.health || 0) + 0.3); }
  // Under twenty-seven the face is what it is.
  if (age < 27) return s;
  let decline = age < 35 ? 0.06 : age < 45 ? 0.14 : age < 55 ? 0.25 : 0.4;
  if ((s.health || 50) < 40) decline *= 1.5;
  if (dependent(s)) decline += 0.15;
  if ((s.strain || 0) > 70) decline += 0.05;
  s.looks = clamp((s.looks || 0) - decline * care.slow);
  if (care.gain && (s.looks || 0) < care.cap) s.looks = Math.min(care.cap, (s.looks || 0) + care.gain);
  // Somebody else worrying about the vegetables shows, a little, over years.
  if (s.diet === 'fine' && (s.looks || 0) < 75) s.looks = Math.min(75, (s.looks || 0) + 0.04);
  return s;
}

// ── the money ─────────────────────────────────────────────────────────────────
export function setCare(s, tier) {
  if (!CARE[tier]) return s;
  face(s).care = tier;
  s.lastEvent = tier === 'none' ? 'You stopped. Soap and sleep.' : `${CARE[tier].label} — €${CARE[tier].cost.toLocaleString()} a month, from now.`;
  return s;
}
export function toggleTrainer(s) {
  const f = face(s); f.trainer = !f.trainer;
  s.lastEvent = f.trainer ? `A trainer, every morning at six. €${TRAINER_COST.toLocaleString()} a month.` : 'You let the trainer go. The mornings are yours again.';
  return s;
}
export function needleCost(s) { return Math.round(6000 * (1 + (s.fame || 0) / 100)); }
export function needle(s) {
  const f = face(s); const cost = needleCost(s); const now = stamp(s);
  if ((s.ageY || 0) < 22) { s.lastEvent = 'Nobody is putting a needle in a face that young.'; return s; }
  if ((s.cash || 0) < cost) { s.lastEvent = `It is €${cost.toLocaleString()}. Not this month.`; return s; }
  s.cash -= cost;
  const lately = needlesLately(s);
  // Too often and it shows: the face stops doing the thing you are paid for.
  if (lately >= FROZEN_AT - 1 || chance(6 + lately * 6)) {
    f.needles.push({ at: now, until: now + NEEDLE_MONTHS, pts: 0 });
    f.frozenUntil = now + 12;
    s.looks = clamp((s.looks || 0) - 3);
    s.lastEvent = 'Too much, too soon. The face is smooth, and it does not move. A casting room can see that from the door.';
    addTimeline(s, 'The work shows now. The face does not move.', true);
    return s;
  }
  const pts = rint(2, 4);
  f.needles.push({ at: now, until: now + NEEDLE_MONTHS, pts });
  s.looks = clamp((s.looks || 0) + pts);
  s.lastEvent = `A lunch hour and €${cost.toLocaleString()}. Looks +${pts}, for about ${NEEDLE_MONTHS} months.`;
  return s;
}
export function surgeryCost(s, tier) { return Math.round((SURGEONS[tier] || SURGEONS.clinic).cost * (1 + (s.fame || 0) / 80)); }
export function surgeryOdds(s, tier) {
  const sg = SURGEONS[tier] || SURGEONS.clinic; const ops = face(s).ops.length;
  const luck = ((s.luck || 50) - 50) * 0.2;
  const great = Math.max(5, sg.great + luck - ops * 6), fine = Math.max(10, sg.fine - ops * 6);
  return { great: Math.round(great), fine: Math.round(fine), botched: Math.max(0, 100 - Math.round(great) - Math.round(fine)) };
}
export function surgery(s, tier) {
  const f = face(s); const sg = SURGEONS[tier]; if (!sg) return s;
  const cost = surgeryCost(s, tier); const now = stamp(s);
  if ((s.ageY || 0) < SURGERY_AGE) { s.lastEvent = `No surgeon will touch a face that is not finished. Come back at ${SURGERY_AGE}.`; return s; }
  if (healing(s)) { s.lastEvent = 'You are still healing from the last one.'; return s; }
  if (s.production) { s.lastEvent = 'Not while you are on a set — continuity, and two months of bandages.'; return s; }
  if ((s.cash || 0) < cost) { s.lastEvent = `It is €${cost.toLocaleString()}. Not yet.`; return s; }
  s.cash -= cost;
  f.recovery = RECOVERY;
  const o = surgeryOdds(s, tier); const roll = Math.random() * 100;
  let result, pts;
  if (roll < o.great) { result = 'great'; pts = rint(8, 13); }
  else if (roll < o.great + o.fine) { result = 'fine'; pts = rint(3, 6); }
  else { result = 'botched'; pts = -rint(6, 12); }
  f.ops.push({ at: now, tier, result });
  s.looks = clamp((s.looks || 0) + pts);
  s.mental = clamp((s.mental || 50) + (result === 'botched' ? -8 : 2));
  // Every face after the second is a face people talk about, whatever the surgeon did.
  if (f.ops.length >= 3) setRespect(s, (s.respect || 0) - 2);
  if (result === 'botched') {
    s.scandal = clamp((s.scandal || 0) + rint(3, 7));
    s.lastEvent = `Two months in the hills, and it went wrong. Looks ${pts}. Everybody can tell, and the pictures are already out.`;
    addTimeline(s, 'Had work done, and it shows.', true);
  } else {
    s.lastEvent = result === 'great' ? `Two months in the hills. Looks +${pts}. People say you look rested.` : `Two months in the hills. Looks +${pts}. Nobody says anything, which was the idea.`;
    addTimeline(s, result === 'great' ? 'Had work done. It worked.' : 'Had work done.');
  }
  return s;
}
