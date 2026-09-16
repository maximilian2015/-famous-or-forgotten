import { COST, canAfford, spend, tooTired } from '../../engine/energy.js';
import { inCareer } from '../../engine/stage.js';
import { uid } from '../../engine/id.js';
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { startNight } from './night.js';
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
  if (!canAfford(s, COST.askHelp)) { s.lastEvent = tooTired(s, COST.askHelp); return s; }
  spend(s, COST.askHelp);
  (ev.asked = ev.asked || []).push(personId);
  const t = tierById(ev.tier);
  if (chance(helperOdds(p))) {
    ev.invited = true;
    s.lastEvent = `${p.name} put your name on the list for ${t.label.toLowerCase()} at ${ev.venue}.`;
    addTimeline(s, `${p.name} got you into ${t.label.toLowerCase()} at ${ev.venue}.`);
  } else {
    p.relationship = clamp((p.relationship || 0) - rint(2, 6));
    s.lastEvent = `${p.name} couldn't swing it. "It's not my room either," they say. Asking cost you a little.`;
  }
  return s;
}
export function sneakIntoEvent(s, eventId, quality = 0) {
  const ev = (s.events || []).find((x) => x.id === eventId); if (!ev) return s;
  if (!canAfford(s, COST.askHelp)) { s.lastEvent = tooTired(s, COST.askHelp); return s; }
  spend(s, COST.askHelp);
  const t = tierById(ev.tier);
  // Steep bar: bluffing your way past a real door should mostly fail.
  if (quality >= 75) {
    ev.invited = true;
    s.lastEvent = `You walk in like you belong there. Nobody stops you. You're inside ${ev.venue}.`;
    addTimeline(s, `Talked your way into ${t.label.toLowerCase()} at ${ev.venue}.`);
  } else {
    s.mental = clamp((s.mental || 50) - rint(2, 5));
    s.scandal = clamp((s.scandal || 0) + (quality < 30 ? 3 : 0));
    s.lastEvent = quality < 30
      ? `Security walks you out in front of everyone. Someone films it.`
      : `The door staff aren't buying it. You don't get in.`;
  }
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
  if (!canAfford(s, COST.event)) { s.lastEvent = tooTired(s, COST.event); return s; }
  spend(s, COST.event);
  s._wentOut = stamp;
  ev.attended = true;
  s.events = (s.events || []).filter((x) => x.id !== eventId);
  return startNight(s, ev, tierById(ev.tier));
}
