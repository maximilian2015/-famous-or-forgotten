// How many sets you are on. There used to be one — `s.production`, a single object that
// every screen and every system read — and Maxi: "in life actors shoot three pictures at
// once; take a fourth and the problems start: the energy goes, then the illnesses. Three,
// like before." So `s.productions` is all of them, three at most, and `s.production` is
// still the FIRST one, kept in step here, so forty places that ask "am I shooting?" and
// "what is the title?" go on working. Anything that adds or removes a set goes through
// these, never through the fields.
//
// Import-free, like everything in engine/: it reads state shapes and nothing else.
export const MAX_SETS = 3;
// What a second and a third set ask of your standing. A studio lets a name they trust
// split the week; a nobody shoots one thing at a time.
export const SET_RESPECT = [0, 25, 50];

export function sets(s) {
  if (!s.productions) s.productions = s.production ? [s.production] : [];
  else if (!s.production) { if (s.productions.length) s.productions = []; }       // somebody cleared it the old way
  else if (!s.productions.length || (s.productions[0].id || null) !== (s.production.id || null)) {
    s.productions = [s.production, ...s.productions.filter((p) => p !== s.production && (p.id || null) !== (s.production.id || null))];
  } else if (s.productions[0] !== s.production) s.production = s.productions[0];   // a reload split the two copies
  return s.productions;
}
export function syncSets(s) { s.production = (s.productions || [])[0] || null; return s; }
export function addSet(s, p) { sets(s).push(p); return syncSets(s); }
export function removeSet(s, p) {
  s.productions = sets(s).filter((x) => x !== p && (x.id == null || x.id !== p.id));
  return syncSets(s);
}
export function clearSets(s) { s.productions = []; return syncSets(s); }
export function setById(s, id) { const all = sets(s); return (id && all.find((p) => p.id === id)) || all[0] || null; }

// A short job — a guest spot, a short, a two-month horror — fits around a set. Maxi: "a
// guest role or a one- or two-month shoot can be taken alongside one set, can't it?" It
// can: standing gates the long shoots, not the week's work. Three at once is still the
// most, an exclusive contract still shuts everything, and a short set costs half the
// energy of a long one (setLoad below).
export const SHORT_MONTHS = 2;
export const isShort = (p) => (((p && p.months) || 1) <= SHORT_MONTHS);
// The slots. An exclusive contract takes all three; everything else takes one.
export function slotsUsed(s) { return sets(s).reduce((n, p) => n + (p.exclusive ? MAX_SETS : 1), 0); }
export function slotsFree(s) { return Math.max(0, MAX_SETS - slotsUsed(s)); }
// Whether another set fits — the room, the contract, and whether they would let you.
export function canTakeSet(s, offer) {
  const all = sets(s);
  if (!all.length) return { ok: true };
  const ex = all.find((p) => p.exclusive);
  if (ex) return { ok: false, why: `"${ex.title}" is exclusive — nothing else until you wrap.`, until: ex };
  if (offer && offer.exclusive) return { ok: false, why: `It is an exclusive contract. It waits until you are free.`, until: longest(all) };
  if (all.length >= MAX_SETS) return { ok: false, why: `Three sets at once is the most anyone can do.`, until: shortest(all) };
  if (offer && isShort(offer)) return { ok: true };
  // Only the long shoots count against your standing: a short on the side is nobody's business.
  const long = all.filter((p) => !isShort(p)).length;
  const need = SET_RESPECT[long] || 0;
  if ((s.respect || 0) < need) return { ok: false, why: `A ${long === 1 ? 'second' : 'third'} set at once needs respect ${need} — you are at ${Math.round(s.respect || 0)}. They will wait until you wrap.`, until: shortest(all), respect: need };
  return { ok: true };
}
// What the sets beyond the first cost you in energy, in whole-set units: a long set is
// one, a short one half. Two guest spots at once is a busy month, not a double life.
export function setLoad(s) {
  const total = sets(s).reduce((n, p) => n + (isShort(p) ? 0.5 : 1), 0);
  return Math.max(0, total - 1);
}
const left = (p) => (p.prepLeft || 0) + (p.monthsLeft || 0);
function shortest(all) { return all.slice().sort((a, b) => left(a) - left(b))[0]; }
function longest(all) { return all.slice().sort((a, b) => left(b) - left(a))[0]; }
// Months until a set frees up for `offer` — for the calendar and the contract.
export function monthsUntilFree(s, offer) {
  const r = canTakeSet(s, offer);
  return r.ok ? 0 : left(r.until || sets(s)[0] || {});
}
