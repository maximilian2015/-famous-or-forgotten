import { rint, chance } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
export function emUnread(s) { return (s.inbox || []).filter((m) => !m.read).length; }
function has(s, tag) { return (s.inbox || []).some((m) => m.tag === tag); }
function push(s, m) { m.id = 'em' + (s._emSeq = (s._emSeq || 0) + 1); m.read = false; (s.inbox = s.inbox || []).unshift(m); }

// An invitation that arrives at fifty per cent a month, in exactly the same words, for
// twenty years, stops reading as an invitation and starts reading as a bug. Once you have
// answered one it goes quiet for a while, and when it comes back it is a different night.
function cooling(s, tag) {
  const until = (s._emCool || {})[tag] || 0;
  return ((s.year || 0) * 12 + (s.month || 0)) < until;
}
export function coolDown(s, tag, months) {
  (s._emCool = s._emCool || {})[tag] = (s.year || 0) * 12 + (s.month || 0) + months;
}
function offer(s, tag, months, odds) {
  return !has(s, tag) && !cooling(s, tag) && chance(odds);
}
// Where the night actually is, so the same invitation is not the same invitation.
const SHOWS = [
  ['Late Night Booking', 'A national talk show wants you next week. Great exposure — if you are charming.'],
  ['The Sunday Sofa', 'Daytime, live, and the host has read exactly one page about you. Eleven minutes.'],
  ['A podcast, apparently', 'Two hours, no edit, and their last guest said something they are still apologising for.'],
  ['Breakfast Television', 'Seven in the morning, a sofa, and a segment about a dog straight after you.'],
];
const CARPETS = [
  ['Studio Events', 'A high-profile premiere. Photographers, other stars, a paparazzi wall.'],
  ['A charity gala', 'Black tie, a silent auction, and eleven people who all want a photograph with you.'],
  ['A festival opening', 'Somebody else’s film, but the carpet does not know that and neither do the cameras.'],
  ['A brand launch', 'They are paying for the night and they would like you standing near the logo.'],
];
const ROOMS = [
  ['[undisclosed]', "An invite to THE party — where the industry's real power gathers."],
  ['A private address', 'No press, no phones at the door, and everyone in that room can greenlight something.'],
  ['A producer’s house', 'Forty people, one long table, and the reason you are on the list is not stated.'],
];
const pickOne = (list) => list[Math.floor(Math.random() * list.length)];
export function emailTick(s) {
  if (!s.alive || s.stage !== 'career') return;
  const key = (s.year || 0) * 12 + (s.month || 0);
  if (s._emTick === key) return; s._emTick = key;
  const fame = s.fame || 0;
  if (((s.month || 0) % 3) === 0) { const rent = s.rent || 800; push(s, { from: 'Landlord', subj: 'Rent due', tag: 'rent', kind: 'bill', body: `Your rent of €${rent.toLocaleString()} is due. Late payment risks your lease.`, cta: [{ label: `Pay €${rent.toLocaleString()}`, pay: -rent, reply: 'Paid. The roof stays another quarter.' }, { label: 'Skip it', fx: { mental: -3, scandal: 1 }, reply: 'A notice goes under the door.' }] }); }
  if (fame >= 40 && fame < 75 && offer(s, 'show', 0, 45)) { const sh = pickOne(SHOWS); push(s, { from: sh[0], subj: "We'd love to have you on", tag: 'show', kind: 'invite', body: sh[1], cta: [{ label: 'Go on the show', check: { stat: 'charisma', diff: 48 }, good: { fx: { fame: 3, media: 5, mental: 1 }, reply: 'You kill it. "So likeable" trends with your name.' }, bad: { fx: { scandal: 3, media: 2, mental: -3 }, reply: 'You freeze. The awkward clip loops.' } }, { label: 'Politely decline', fx: {}, reply: 'Safe, forgettable, no clip.' }] }); }
  if (fame >= 55 && offer(s, 'event', 0, 40)) { const cp = pickOne(CARPETS); push(s, { from: cp[0], subj: 'Red carpet invitation', tag: 'event', kind: 'invite', body: cp[1], cta: [{ label: 'Walk the carpet', check: { stat: 'looks', diff: 46 }, good: { fx: { fame: 2, media: 4, respect: 1 }, reply: 'Best dressed. Your look leads the galleries.' }, bad: { fx: { media: 2, scandal: 2 }, reply: '"Worst dressed" lists are also lists.' } }, { label: 'Send regrets', fx: { mental: 1 }, reply: 'The night happens without you.' }] }); }
  if (fame >= 75 && offer(s, 'vip', 0, 34)) { const rm = pickOne(ROOMS); push(s, { from: rm[0], subj: "You're on the list", tag: 'vip', kind: 'invite', body: rm[1], cta: [{ label: 'Go — work the room', check: { stat: 'charisma', diff: 52 }, good: { fx: { fame: 2, respect: 4, media: 2 }, reply: "You leave with a director's promise." }, bad: { fx: { scandal: 4, mental: -3 }, reply: 'You say the wrong thing to the wrong legend.' } }, { label: 'Too risky — skip', fx: {}, reply: 'That room does not send twice.' }] }); }
}
export function emailAct(s, id, i) {
  const m = (s.inbox || []).find((x) => x.id === id); if (!m) return s;
  const c = m.cta && m.cta[i]; if (!c) return s;
  let out = c, head = '';
  if (c.check) { const odds = 30 + (s[c.check.stat] || 0) * 0.5; const ok = chance(odds); out = ok ? (c.good || {}) : (c.bad || {}); head = ok ? '✅ ' : '❌ '; }
  if (typeof out.pay === 'number' || typeof c.pay === 'number') s.cash = (s.cash || 0) + (out.pay || c.pay || 0);
  const fx = out.fx || {};
  ['fame','media','mental','scandal','respect','looks'].forEach((k) => { if (typeof fx[k] === 'number') s[k] = clamp((s[k] || 0) + fx[k]); });
  s.lastEvent = `✉️ ${m.subj}\n\n${head}${out.reply || c.reply || c.label}`;
  addTimeline(s, `${m.subj}: ${c.label}.`, head === '❌ ');
  // Answered. That kind of night goes quiet for a while rather than arriving again next
  // month with the same eleven words.
  if (m.kind === 'invite') coolDown(s, m.tag, rint(3, 9));
  s.inbox = (s.inbox || []).filter((x) => x.id !== id);
  return s;
}
export function markRead(s, id) { const m = (s.inbox || []).find((x) => x.id === id); if (m) m.read = true; return s; }
