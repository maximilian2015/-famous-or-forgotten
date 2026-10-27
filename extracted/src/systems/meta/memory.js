// What people remember you did. Maxi, after the relationships audit: a director keeps a number,
// "42", and nothing else — "he remembers you covered for a co-star on Vanished Margo" could not be
// written, so nothing you did on a set could come back years later. This keeps the deed.
//
// One ledger, `s.memory`, created lazily so old saves keep loading:
//   people — who they are by a key that does not change: `p:<id>` for somebody in your phone,
//            `w:<id>` for an actor of the world. Never a name: names repeat. And their trait,
//            which before this was rolled again every time a director came back.
//   events — one per thing that happened: what (`act`), on which film and when, who was there,
//            and how EACH of them took it (`felt`, −3..+3, with the reason in words). The same
//            cover is a kindness to the co-star and a lie to the director; one event, two readings.
//
// What it may not do, from the rules this game has learned:
//   · It never touches Standing, insurability or the stability. A director taking something
//     personally is a personal thing (Maxi/ChatGPT, 24 Oct: "личная обида режиссёра не равна
//     объективной профессиональной репутации"). Doors close through the existing grudge.
//   · Nothing fades by itself into forgiveness. What changes a reading is something you do: a
//     shoot together that ends warm, a letter, somebody vouching (career/cover.js).
import { uid } from '../../engine/id.js';
import { rint } from '../../engine/rng.js';

const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const clampFelt = (v) => Math.max(-3, Math.min(3, v));
export function memoryOf(s) {
  if (!s.memory) s.memory = { people: {}, events: [] };
  return s.memory;
}
// For reading — a screen asks what somebody remembers on every render, and must not create the
// ledger by asking.
const EMPTY = { people: {}, events: [] };
const readOf = (s) => (s && s.memory) || EMPTY;

// The key for somebody on a set. An actor of the world is that actor. Anybody else becomes
// somebody you know — a person in your phone — the moment there is something to remember about
// them, so that the next time they direct you it is the same person and not a stranger with
// the same name.
export function keyFor(s, c, p) {
  if (!c) return null;
  const mem = memoryOf(s);
  let key;
  if (c.worldId) key = 'w:' + c.worldId;
  else {
    let id = c.knownId;
    if (!id) {
      const director = /Director|Producer/.test(c.role || '');
      const person = { id: uid(s, 'p'), name: c.name, gender: c.gender || null, role: director ? 'Film Director' : 'Fellow Actor',
        industryWeight: director ? rint(55, 80) : rint(30, 60), relationship: Math.round(c.bond ?? 40), unlocks: director ? 'aaa' : null,
        met: `${s.year}`, fromSet: p ? p.title : null, lastSeen: stamp(s), trait: c.trait || null };
      (s.people = s.people || []).push(person);
      id = person.id; c.knownId = id;
    }
    key = 'p:' + id;
  }
  const rec = (mem.people[key] = mem.people[key] || { name: c.name });
  if (c.trait && !rec.trait) rec.trait = c.trait;
  return key;
}
export const traitOf = (s, key) => ((readOf(s).people[key] || {}).trait) || null;

// Something happened. `felt` maps each key to { felt, why } — how that person took it.
export function remember(s, { act, p, about = null, witnesses = [], felt = {}, public: isPublic = false }) {
  const mem = memoryOf(s);
  const ev = { id: uid(s, 'ev'), act, at: stamp(s), year: s.year || 0, film: p ? { id: p.id || null, title: p.title } : null,
    about, witnesses, public: !!isPublic, felt: {} };
  for (const [k, v] of Object.entries(felt)) if (k && k !== 'null') ev.felt[k] = { felt: clampFelt(v.felt), why: v.why };
  mem.events.push(ev);
  if (mem.events.length > 200) mem.events = mem.events.slice(-200);
  return ev;
}

// How somebody feels about you, all told, and the thing they remember most.
export function feltBy(s, key) {
  if (!key) return 0;
  return clampFelt(readOf(s).events.reduce((n, e) => n + ((e.felt[key] || {}).felt || 0), 0));
}
export function rememberedBy(s, key) {
  if (!key) return null;
  const evs = readOf(s).events.filter((e) => e.felt[key] && e.felt[key].felt !== 0);
  if (!evs.length) return null;
  // The thing they remember most — and, if something came after it that turned it, that too:
  // a lie and the letter that answered it are one memory, not two.
  const top = evs.reduce((a, b) => (Math.abs(b.felt[key].felt) >= Math.abs(a.felt[key].felt) ? b : a));
  const last = evs[evs.length - 1];
  const turned = last !== top && Math.sign(last.felt[key].felt) !== Math.sign(top.felt[key].felt) ? last.felt[key].why : null;
  const rec = readOf(s).people[key] || {};
  return { name: rec.name || 'They', felt: feltBy(s, key), why: top.felt[key].why, turned, film: top.film ? top.film.title : null, year: top.year };
}
// The line a screen prints: "Ulrich Beaumont remembers Vanished Margo (2074): that you lied to
// him for Mara Vance, and owned it when it came out — and that you wrote to him after."
export function memoryLine(s, key) {
  const r = rememberedBy(s, key);
  if (!r) return null;
  const then = r.turned ? ` — and ${r.turned}` : '';
  return r.film ? `${r.name} remembers ${r.film} (${r.year}): ${r.why}${then}.` : `${r.name} remembers ${r.why}${then}.`;
}
// The key of the person behind an offer (a director you know) or a crew member, if there is one.
export function keyOfPerson(s, id) { return id ? 'p:' + id : null; }
export function keyOfCrew(c) { return c ? (c.worldId ? 'w:' + c.worldId : c.knownId ? 'p:' + c.knownId : null) : null; }

// A new shoot with somebody who remembers: they arrive where your history left them, and the set
// card says why. Called once, when the cameras roll (production.js startProduction).
export function arriveRemembering(s, p) {
  for (const c of (p.crew || [])) {
    const key = keyOfCrew(c);
    if (!key || !readOf(s).people[key]) continue;
    const t = traitOf(s, key); if (t) c.trait = t;                   // a person keeps their character
    // Somebody in your phone arrives at the relationship you left them at, which already carries
    // what happened — adding the memory on top would count the same deed twice. An actor of the
    // world starts a shoot from nothing, so for them the memory IS the start.
    const f = feltBy(s, key);
    if (f && key.startsWith('w:')) { c.bond = Math.max(5, Math.min(95, (c.bond ?? 40) + f * 5)); c.bond0 = c.bond; }
    c.remembers = memoryLine(s, key);
  }
}
