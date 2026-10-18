// The family, read for the screen (Family V1, 18 Oct 2026). Nothing here changes a person: it
// says who is in the household, who the children are, who else is living, who was family once,
// and who has died — with what is actually known about each of them and nothing guessed.
//
// What is known, from the audit: a name, a relation, an age that grows while they live, a job
// that changes over a life, and the age they died at. The year they died, the job a parent had
// before retiring, the date of a divorce and a child's other parent were never kept; they are
// written from Family V1 on (family.js, dating.js, children.js). For an old save the year of a
// death is read back from the timeline when the line is still there, and otherwise it is left
// out — the tree says "died at 79" rather than inventing 1938–2017.
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const yearOfWhen = (when) => { const m = String(when || '').match(/(\d{4})$/); return m ? Number(m[1]) : null; };

// How old they are now: the age they carry, or — on records written before the age was kept —
// from the year they were born. Nothing when neither is there.
export function ageNow(s, p) {
  if (!p) return null;
  if (Number.isFinite(p.age)) return p.age;
  return Number.isFinite(p.born) ? (s.year || 0) - p.born : null;
}
const withAge = (s, p, word) => (ageNow(s, p) != null ? `${word}, ${ageNow(s, p)}` : word);
export { withAge };
export const isSpouse = (p) => p.relation === 'Spouse';
export const isChild = (p) => p.relation === 'Child';
export const isEx = (p) => p.relation === 'Ex-spouse';
export const isParent = (p) => p.relation === 'Mother' || p.relation === 'Father';
export const isGrand = (p) => /^Grand/.test(p.relation || '');
export const isSibling = (p) => p.relation === 'Brother' || p.relation === 'Sister';

// The year they died: stored from Family V1, or found in the timeline line the death wrote
// ("💔 Name, your mother, has passed away at 79.") while that line is still in it.
export function diedYear(s, p) {
  if (!p || p.alive !== false) return null;
  if (p.diedOn != null) return Math.floor(p.diedOn / 12);
  const line = (s.timeline || []).find((t) => t && typeof t.text === 'string' && t.text.includes(`${p.name}, your`) && /passed away/.test(t.text));
  return line ? yearOfWhen(line.when) : null;
}
// The year they were born, where the arithmetic has something to stand on.
export function bornYear(s, p) {
  if (!p) return null;
  if (p.alive !== false) return Number.isFinite(p.age) ? (s.year || 0) - p.age : null;
  const d = diedYear(s, p);
  return d != null && p.deathAge > 0 ? d - p.deathAge : null;
}
// "1938–2017 · died at 79", "died at 79", or nothing, for somebody who has died.
export function lifeLine(s, p) {
  if (!p || p.alive !== false) return '';
  const d = diedYear(s, p), b = bornYear(s, p);
  const age = p.deathAge > 0 ? `died at ${p.deathAge}` : '';
  if (b != null && d != null) return `${b}–${d}${age ? ' · ' + age : ''}`;
  if (d != null) return `died ${d}${age ? ' · at ' + p.deathAge : ''}`;
  return age;
}
// What they do, or did. A retired teacher is a teacher, and a dead one is too.
export function workOf(p) {
  if (!p) return '';
  if (p.wasFamous) return p.job === 'singer' ? 'singer' : 'actor';
  const job = p.job || '';
  if (p.alive === false) return p.formerJob || (/^(retired|infant|in school|student|unemployed)$/.test(job) ? '' : job);
  if (job === 'retired') return p.formerJob ? `retired ${p.formerJob}` : 'retired';
  return job;
}
const since = (stamp) => (stamp != null ? `${MON[stamp % 12]} ${Math.floor(stamp / 12)}` : null);
// The household: the person you live your life with. A spouse, or a partner if there is no spouse.
export function household(s) {
  const sp = (s.family || []).find((p) => isSpouse(p) && p.alive !== false);
  if (sp) return { p: sp, kind: 'spouse', since: since(sp.marriedOn), sinceWord: 'married since' };
  if (s.partner) return { p: s.partner, kind: 'partner', since: since(s.partner.since), sinceWord: 'together since' };
  return null;
}
// Children, oldest first, with where they are in life and who raises them.
export function children(s) {
  return (s.family || []).filter((p) => isChild(p) && p.alive !== false).sort((a, b) => (b.age || 0) - (a.age || 0));
}
export function childLine(p) {
  const bits = [];
  if (p.path === 'industry') bits.push((p.ownFame || 0) >= 40 ? 'in the business, and known' : 'in the business');
  else if (p.job) bits.push(p.job);
  if (p.adopted) bits.push('adopted');
  if (p.raisedBy === 'them') bits.push(p.otherParent ? `lives with ${p.otherParent.name.split(' ')[0]}` : 'lives with their other parent');
  return bits.join(' · ');
}
// Everybody else living: parents, grandparents, brothers and sisters — older generation first.
const ORDER = (p) => (isGrand(p) ? 0 : isParent(p) ? 1 : isSibling(p) ? 2 : 3);
export function kin(s) {
  return (s.family || []).filter((p) => p.alive !== false && (isParent(p) || isGrand(p) || isSibling(p)))
    .sort((a, b) => ORDER(a) - ORDER(b) || (b.age || 0) - (a.age || 0));
}
// Family once: an ex-spouse, with when it ended if that was kept.
export function formers(s) {
  return (s.family || []).filter((p) => isEx(p) && p.alive !== false);
}
export function exLine(p) { return p.divorcedOn != null ? `divorced ${Math.floor(p.divorcedOn / 12)}` : 'divorced'; }
// The dead — for the family tree only. The Family tab does not list them.
export function deceased(s) { return (s.family || []).filter((p) => p.alive === false); }
