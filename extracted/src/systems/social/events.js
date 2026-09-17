import { COST, canAfford, spend, tooTired } from '../../engine/energy.js';
import { inCareer } from '../../engine/stage.js';
import { uid } from '../../engine/id.js';
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { startNight, expectedAt, energyFor, canHost, hostNight } from './night.js';
export { expectedAt, energyFor, canHost, hostNight };
const clamp = (v) => Math.max(0, Math.min(100, v));

// Tiers gate who shows up and whether you're on the guest list at all.
export const EVENT_TIERS = [
  { id: 'local', label: 'House party', minFame: 0, roles: ['Fellow Actor', 'Journalist'], fameGain: 0 },
  { id: 'mixer', label: 'Industry mixer', minFame: 25, roles: ['Fellow Actor', 'Casting Director', 'Manager', 'Journalist'], fameGain: 1 },
  { id: 'premiere', label: 'Film premiere', minFame: 50, roles: ['Casting Director', 'Manager', 'Music Producer', 'Film Director'], fameGain: 2 },
  { id: 'gala', label: 'Awards gala', minFame: 75, roles: ['Film Director', 'Studio Producer', 'A-list Star', 'Music Producer'], fameGain: 3 },
];
export function tierById(id) { return EVENT_TIERS.find((t) => t.id === id) || EVENT_TIERS[0]; }

const VENUE = ['The Loft', 'Rooftop 12', 'Villa Nord', 'The Atrium', 'Hotel Meridian', 'Studio 9', 'The Old Bank', 'Pier House'];
const HOST = ['Vega Pictures', 'Nord Media', 'the Aurora Fund', 'Lyra Studios', 'a producer everyone knows', 'the festival board'];

// A house party is somebody's house. The bigger rooms are thrown by money; a house party is
// thrown by a person — one of the working actors in the world, which is how you end up at
// a rival's place at two in the morning.
function hostFor(s, tier) {
  if (tier.id !== 'local') return { host: pick(HOST), hostId: null };
  const people = ((s.world && s.world.actors) || []).filter((a) => a.alive && !a.retired && (a.fame || 0) < 60);
  if (!people.length) return { host: pick(HOST), hostId: null };
  const h = pick(people); return { host: h.name, hostId: h.id };
}
function makeEvent(s, tier) {
  return {
    id: uid(s, 'ev'),
    tier: tier.id, venue: tier.id === 'local' ? pick(['a flat in the east end', 'a house up the hill', 'a roof somewhere', 'a warehouse that is not a warehouse']) : pick(VENUE), ...hostFor(s, tier),
    monthsLeft: rint(1, 3), attended: false,
  };
}
// Which tiers can realistically appear on your radar: your own level, plus one rung above
// (the one you'd have to sneak into) — nothing absurdly out of reach.
function reachableTiers(s) {
  const fame = s.fame || 0;
  const idx = EVENT_TIERS.reduce((acc, t, i) => (fame >= t.minFame ? i : acc), 0);
  return EVENT_TIERS.slice(0, Math.min(idx + 2, EVENT_TIERS.length));
}
export function maybeGenerateEvent(s) {
  if (!inCareer(s)) return;
  s.events = s.events || [];
  if (s.events.length >= 3) return;
  if (!chance(35)) return;
  s.events.push(makeEvent(s, pick(reachableTiers(s))));
}
export function eventsTick(s) {
  if (!s.events || !s.events.length) return;
  s.events = s.events.filter((e) => { e.monthsLeft -= 1; return e.monthsLeft > 0 && !e.attended; });
}
export function isInvited(s, ev) { return (s.fame || 0) >= tierById(ev.tier).minFame; }

// Anyone who could get you in. School friends who made it are already promoted into
// s.people by spotlightYear(), so this one list covers both.
export function inviteHelpers(s) { return s.people || []; }
// Deliberately steep: a favour like this is a real ask, not a button you spam.
export function helperOdds(p) { return clamp(4 + (p.relationship || 0) * 0.42 + (p.industryWeight || 30) * 0.18); }
export function hasAsked(ev, personId) { return (ev.asked || []).includes(personId); }
export function askForInvite(s, eventId, personId) {
  const ev = (s.events || []).find((x) => x.id === eventId); if (!ev) return s;
  const p = inviteHelpers(s).find((x) => x.id === personId); if (!p) return s;
  if (hasAsked(ev, personId)) { s.lastEvent = `You already asked ${p.name} about that one. Asking twice would be pushing it.`; return s; }
  // Two favours a night is a favour. Five is a person everybody has started avoiding.
  if ((ev.asked || []).length >= 2) { s.lastEvent = ev.note = 'You have asked around enough for this one. People talk.'; return s; }
  if (!canAfford(s, COST.askHelp)) { s.lastEvent = tooTired(s, COST.askHelp); return s; }
  spend(s, COST.askHelp);
  (ev.asked = ev.asked || []).push(personId);
  const t = tierById(ev.tier);
  if (chance(helperOdds(p))) {
    ev.invited = true;
    s.lastEvent = ev.note = `${p.name} put your name on the list for ${t.label.toLowerCase()} at ${ev.venue}.`;
    addTimeline(s, `${p.name} got you into ${t.label.toLowerCase()} at ${ev.venue}.`);
  } else {
    p.relationship = clamp((p.relationship || 0) - rint(2, 6));
    s.lastEvent = ev.note = `${p.name} couldn't swing it. "It's not my room either," they say. Asking cost you a little.`;
  }
  return s;
}
// ── the three doors ───────────────────────────────────────────────────────────
// Without a name on the list there are three doors, and every one of them can close on
// you. Maxi: "the first minigame at seventy-five, then a quiz — questions from the world
// itself, so somebody who reads the lists gets through — then a new hard one." The quiz
// asks what a person who belongs would know: who is hosting, what took the money last
// year, who is at the top of the business. The answers are all on the wall in Legacy.
export function doorState(ev) { return ev.door || { stage: 0 }; }
export function sneakIntoEvent(s, eventId, quality = 0) {
  const ev = (s.events || []).find((x) => x.id === eventId); if (!ev) return s;
  if (ev.doorTried) { s.lastEvent = ev.note = 'The door remembers you from last time. Not tonight.'; return s; }
  if (!canAfford(s, COST.askHelp)) { s.lastEvent = tooTired(s, COST.askHelp); return s; }
  spend(s, COST.askHelp);
  // The first door: a face that looks like it belongs. Steep on purpose.
  if (quality >= 75) {
    ev.door = { stage: 1, quiz: quizFor(s, ev), asked: 0, right: 0 };
    s.lastEvent = ev.note = 'You walk up like you belong. The door looks at you a moment too long. "And you are here for…?"';
  } else bounced(s, ev, quality < 30);
  return s;
}
function bounced(s, ev, filmed) {
  ev.doorTried = true; ev.door = null;
  s.mental = clamp((s.mental || 50) - rint(2, 5));
  if (filmed) s.scandal = clamp((s.scandal || 0) + 3);
  s.lastEvent = ev.note = filmed
    ? 'Security walks you out in front of everyone. Someone films it. That door is closed to you now.'
    : "The door staff aren't buying it. You don't get in, and they will remember the face.";
}
// Two questions with an answer somewhere in the game. Wrong once and you are outside.
function quizFor(s, ev) {
  const w = s.world || {}; const yrs = w.years || {}; const last = yrs[(s.year || 0) - 1];
  const actors = ((w.actors || []).filter((a) => a.alive && !a.retired));
  const names = (n, not) => { const out = []; const pool = actors.map((a) => a.name).filter((x) => x !== not); while (out.length < n && pool.length) { const i = Math.floor(Math.random() * pool.length); out.push(pool.splice(i, 1)[0]); } return out; };
  const shuffle = (arr) => arr.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
  const qs = [];
  // Who is hosting tonight — it is on the card.
  const hosts = ['Vega Pictures', 'Nord Media', 'the Aurora Fund', 'Lyra Studios', 'the festival board', ...names(2)].filter((h) => h !== ev.host);
  qs.push({ q: 'Whose night is this?', options: shuffle([ev.host, ...shuffle(hosts).slice(0, 3)]), answer: ev.host });
  // What took the money last year — the year's list in Legacy.
  if (last && last.films && last.films.length >= 4) {
    const top = last.films[0].title;
    qs.push({ q: `What took the most money last year?`, options: shuffle([top, ...shuffle(last.films.slice(1).map((f) => f.title)).slice(0, 3)]), answer: top });
  } else {
    const one = actors.slice().sort((x, y) => (x.rank || 999) - (y.rank || 999))[0];
    if (one) qs.push({ q: 'Who is #1 in the business right now?', options: shuffle([one.name, ...names(3, one.name)]), answer: one.name });
  }
  return qs;
}
export function answerDoor(s, eventId, answer) {
  const ev = (s.events || []).find((x) => x.id === eventId); if (!ev) return s;
  const d = ev.door; if (!d || d.stage !== 1) return s;
  const q = d.quiz[d.asked]; if (!q) return s;
  if (answer !== q.answer) { bounced(s, ev, false); s.lastEvent = ev.note = `"${answer}?" The door does not even smile. You are outside, and they will remember the face.`; return s; }
  d.asked += 1; d.right += 1;
  if (d.asked >= d.quiz.length) { d.stage = 2; s.lastEvent = ev.note = 'The door steps aside — to the back stairs. "Follow the lights, and do not get it wrong."'; }
  else s.lastEvent = ev.note = 'A nod. One more.';
  return s;
}
// The third door: the back stairs, in the dark. The UI plays the lights; this hears the result.
export function stairsResult(s, eventId, ok) {
  const ev = (s.events || []).find((x) => x.id === eventId); if (!ev) return s;
  const d = ev.door; if (!d || d.stage !== 2) return s;
  const t = tierById(ev.tier);
  if (ok) {
    ev.invited = true; ev.door = null;
    s.lastEvent = ev.note = `Up the back stairs and into the room. Nobody stops you. You are inside ${ev.venue} — press Go.`;
    addTimeline(s, `Talked your way into ${t.label.toLowerCase()} at ${ev.venue}.`);
  } else bounced(s, ev, true);
  return s;
}
// A party is an evening, not a working day — charging a full action for it meant events
// always lost to auditions and shooting, and in a 30-life simulation none were ever attended.
// So: showing up is one evening of energy, and only one night out a month. What happens
// inside is night.js — the Go button used to resolve the whole thing in a sentence.
export function attendEvent(s, eventId) {
  const ev = (s.events || []).find((x) => x.id === eventId); if (!ev) return s;
  if (!isInvited(s, ev) && !ev.invited) { s.lastEvent = "You're not on the list for that one."; return s; }
  const stamp = (s.year || 0) * 12 + (s.month || 0);
  if (s._wentOut === stamp) { s.lastEvent = "You've already been out this month. Two nights in a row is how people start talking."; return s; }
  const need = energyFor(ev.tier);
  if (!canAfford(s, need)) { s.lastEvent = tooTired(s, need); return s; }
  spend(s, need);
  s._wentOut = stamp;
  ev.attended = true;
  s.events = (s.events || []).filter((x) => x.id !== eventId);
  return startNight(s, ev, tierById(ev.tier));
}
