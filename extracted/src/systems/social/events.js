import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { makePerson } from '../life/relationships.js';
import { prospect } from '../life/dating.js';
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

function makeEvent(s, tier) {
  return {
    id: 'ev' + Date.now() + Math.floor(Math.random() * 10000),
    tier: tier.id, venue: pick(VENUE), host: pick(HOST),
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
  if (s.stage !== 'career') return;
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
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  s.ap = (s.ap || 0) - 1;
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
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  s.ap = (s.ap || 0) - 1;
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
export function attendEvent(s, eventId) {
  const ev = (s.events || []).find((x) => x.id === eventId); if (!ev) return s;
  if (!isInvited(s, ev) && !ev.invited) { s.lastEvent = "You're not on the list for that one."; return s; }
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  s.ap = (s.ap || 0) - 1;
  const t = tierById(ev.tier);
  ev.attended = true;
  s.events = (s.events || []).filter((x) => x.id !== eventId);

  const met = [];
  // One real connection a night is the norm — you don't leave a party with a rolodex.
  const guests = 1 + (chance(18) ? 1 : 0);
  for (let i = 0; i < guests; i++) {
    // Bigger rooms skew to industry people; small ones are mostly just people.
    const industryChance = { local: 25, mixer: 50, premiere: 60, gala: 70 }[t.id];
    if (chance(industryChance)) {
      const p = makePerson(s, pick(t.roles));
      (s.people = s.people || []).push(p);
      met.push(`${p.name} (${p.role})`);
    } else {
      const p = prospect(s);
      (s.datingPool = s.datingPool || []).push(p);
      met.push(`${p.name} — you got their number`);
    }
  }
  if (t.fameGain) s.fame = clamp((s.fame || 0) + t.fameGain);
  s.mental = clamp((s.mental || 50) + rint(1, 4));
  s.lastEvent = `${t.label} at ${ev.venue}, hosted by ${ev.host}. You met ${met.join(' and ')}.`;
  addTimeline(s, `Went to ${t.label.toLowerCase()} at ${ev.venue}.`);
  return s;
}
