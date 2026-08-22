import { rint, chance, pick } from '../../engine/rng.js';
import { onCooldown, markUsed } from '../../engine/cooldown.js';
import { addTimeline } from '../../engine/timeline.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
const FIRST = ['Mia','Leo','Zoe','Kai','Ivy','Max','Luna','Finn','Ava','Noah','Ruby','Eli','Nadia','Sam','Vera'];
const LAST = ['Park','Vance','Cole','Reed','Frost','Kade','Wren','Dune','Salt','Onyx','Bell','Hart'];
const FUTURES = [
  { becomes: 'Film Director', weight: [70, 92], p: 8 }, { becomes: 'Producer', weight: [72, 90], p: 7 },
  { becomes: 'Famous Actor', weight: [78, 95], p: 6 }, { becomes: 'Music Producer', weight: [66, 88], p: 6 },
  { becomes: 'Casting Director', weight: [55, 75], p: 9 }, { becomes: 'Journalist', weight: [40, 60], p: 10 },
  { becomes: 'Ordinary life', weight: [10, 30], p: 54 },
];
function pickFuture() { const total = FUTURES.reduce((a, f) => a + f.p, 0); let r = Math.random() * total; for (const f of FUTURES) { if ((r -= f.p) <= 0) return f; } return FUTURES[FUTURES.length - 1]; }
export function makeClassmate(s) {
  const fut = pickFuture();
  const first = pick(FIRST), last = pick(LAST);
  // The handle has to come from THIS person's name. It used to draw a fresh name of its
  // own, so "Mia Salt" would be posting as @nadia55.
  const handle = '@' + (chance(50) ? `${first}${last}` : `${first}${rint(1, 99)}`).toLowerCase();
  return { id: 'sp' + Math.random().toString(36).slice(2, 8), name: `${first} ${last}`, handle,
    since: s.ageY, closeness: rint(25, 55), future: fut.becomes, futureWeight: rint(fut.weight[0], fut.weight[1]), grownUp: false, industryWeight: 0 };
}
export function findClassmates(s, n = 1) {
  if (onCooldown(s, 'find')) { s.lastEvent = "You've already reached out to someone new this month."; return s; }
  markUsed(s, 'find');
  s.spotlight = s.spotlight || [];
  for (let i = 0; i < n; i++) { if (s.spotlight.length >= 30) break; s.spotlight.push(makeClassmate(s)); }
  s.lastEvent = `You connected with someone new on Spotlight.`;
  return s;
}
export function pokeFriend(s, id) {
  const f = (s.spotlight || []).find((x) => x.id === id); if (!f) return s;
  if (onCooldown(s, 'poke:' + id)) { s.lastEvent = `You already messaged ${f.name} this month. Any more and it's a bit much.`; return s; }
  markUsed(s, 'poke:' + id);
  f.closeness = clamp(f.closeness + rint(5, 12)); s.mental = clamp((s.mental || 50) + rint(1, 3));
  s.lastEvent = `You caught up with ${f.name} on Spotlight. ${f.closeness > 70 ? "You're really close now." : 'Good to stay in touch.'}`;
  return s;
}
export function spotlightYear(s) {
  if (!s.spotlight) return;
  s.spotlight.forEach((f) => {
    if (f.grownUp) return;
    if ((s.ageY || 0) >= 22 && !f.grownUp) {
      f.grownUp = true;
      if (f.future !== 'Ordinary life') {
        f.industryWeight = f.futureWeight;
        if (f.closeness >= 50) {
          (s.people = s.people || []).push({ id: 'p' + f.id, name: f.name, role: f.future, industryWeight: f.futureWeight, relationship: Math.round(f.closeness), unlocks: /Director|Producer|Actor/.test(f.future) ? 'aaa' : 'castingBoost', fromSchool: true });
          addTimeline(s, `${f.name} from school made it — they're a ${f.future} now, and you two stayed close. That connection could matter.`);
          s.lastEvent = `${f.name}, who you knew from school, is now a ${f.future}. Staying in touch paid off.`;
        }
      }
    }
  });
}
export function spotlightFeed(s) {
  const friends = (s.spotlight || []).filter((f) => !f.grownUp).slice(0, 6);
  return friends.map((f) => ({ handle: f.handle, name: f.name, id: f.id, closeness: f.closeness,
    post: pick(['just posted a mirror selfie 📸', 'checked in at the mall', 'shared: "school is so boring rn"', 'posted about the weekend', 'tagged you in a throwback']) }));
}
