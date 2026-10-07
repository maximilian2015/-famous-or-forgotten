// The directors you have history with, in one list. The Directors bar on the Passport said a
// number and one sentence, and everything behind it — who is cold, who holds a grudge and until
// when, who would come back to direct you — happened without a word on any screen.
//
// Nothing here is kept. It is read off the phone (s.people), the grudges (s.grudges) and the
// work (filmography, releases in post, the sets running now), the way meta/factions.js reads the
// bar. And every door a row reports is the predicate that door itself uses, imported from the
// file that uses it, so the screen cannot say a thing the game does not do.
import { inCareer } from '../../engine/stage.js';
import { sendsOffers } from '../career/offers.js';
import { onTheBoard, boardOpen } from '../career/tentpoles.js';
import { directsYouAgain } from '../career/production.js';
import { canPropose } from '../career/collab.js';
import { rumourOn } from './trouble.js';

const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const first = (n) => String(n || '').split(' ')[0];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthName = (t) => `${MON[((t % 12) + 12) % 12]} ${Math.floor(t / 12)}`;

// Who the bar counts (meta/factions.js): anybody in the phone whose role says Director.
const counted = (p) => /Director/.test(p.role || '');
export const STATE_LABEL = { warm: 'Warm', neutral: 'Neutral', cold: 'Cold' };
// The bar's own split: warm is fifty and up and not cold, cold is cold, the rest is neither.
export function stateOf(p) { return p.cold ? 'cold' : (p.relationship || 0) >= 50 ? 'warm' : 'neutral'; }

// Why a grudge was filed. It is not stored, so it is read off the shape each writer leaves:
//   stories.js burnTheBridge — until +9999: the door shut on the record, for good;
//   production.js walkOffSet — due +9999, until +60: you walked off their set;
//   stories.js noteRefusal   — due in 14–22 months, until +24, or +60 if the film is a hit.
export function grudgeKind(g) {
  if ((g.until || 0) - (g.since || 0) >= 9999) return 'shut';
  if ((g.due || 0) - (g.since || 0) >= 9999) return 'walked';
  return 'passed';
}
const left = (t, now) => { const m = t - now; return `${m} month${m === 1 ? '' : 's'} left`; };
function grudgeView(g, now) {
  const kind = grudgeKind(g);
  const title = g.title || 'their film';
  // The cause in plain words. "A part", not "the lead": a tentpole's supporting part files the
  // same grudge (tentpoles.js gives it tier 'lead'), and the grudge does not keep the role.
  const reason = kind === 'shut' ? `Would not come back for "${title}" — and they said so to the trades.`
    : kind === 'walked' ? `Walked off the set of "${title}".`
    : `Turned down a part in "${title}".`;
  // A refusal lasts two years, or five if the film turns out a hit — and nobody knows which
  // until it opens (stories.js, "The one you passed on"). Before then the two-year date is
  // shown with the five-year one beside it; printing the one in the save would give it away.
  const unknown = kind === 'passed' && !g.opened && g.since + 24 > now;
  const ends = unknown ? g.since + 24 : g.until;
  const expires = kind === 'shut' ? 'For good' : `Until ${monthName(ends)} · ${left(ends, now)}`;
  const ifHit = unknown ? `Until ${monthName(g.since + 60)} if "${title}" is a hit · ${left(g.since + 60, now)}` : null;
  return { kind, title, since: g.since, until: g.until, forGood: kind === 'shut', monthsLeft: kind === 'shut' ? null : ends - now, reason, expires, ifHit };
}

// What a director in your phone will and will not do, in their own rules' words.
function lineFor(s, p, grudge) {
  const n = first(p.name);
  if (p.cold) {
    // collab.js: a cold partner takes thirty points off a project ever being made.
    const project = (s.collabs || []).some((c) => c.who === p.id);
    return `${n} is not taking your calls: no offers, no tentpole, no set together, no pitch.${project ? ' The thing you have in development with them is thirty points less likely to get made.' : ''}`;
  }
  const doors = [];
  if (sendsOffers(s, p)) doors.push('can be behind an offer');
  if (onTheBoard(s, p) && boardOpen(s)) doors.push('can be the director of a tentpole on the board');
  // production.js makeCrew: the set's bond starts at the relationship, between 10 and 90.
  if (directsYouAgain(s, p)) doors.push(`can direct you again (the set starts at ${Math.max(10, Math.min(90, Math.round(p.relationship || 40)))})`);
  const pitch = inCareer(s) ? canPropose(s, p) : null;
  if (pitch && pitch.ok) doors.push('will hear a pitch');
  const said = doors.length ? `${n} ${doors.length > 1 ? doors.slice(0, -1).join(', ') + ' and ' + doors[doors.length - 1] : doors[0]}.` : '';
  const no = pitch && !pitch.ok ? pitch.why : '';
  if (said || no) return [said, no].filter(Boolean).join(' ');
  return grudge ? `${n} will not come back to you while the grudge runs.` : `Nothing brings ${n} back to you yet.`;
}

export function yourDirectors(s) {
  const now = stamp(s);
  const live = (s.grudges || []).filter((g) => g.until > now);
  const credits = (s.filmography || []).filter((c) => c && c.director);
  const inPost = (s.releases || []).filter((r) => r && r.director);
  const onSet = (s.productions || []).filter((p) => p && p.crew && p.crew[0] && p.crew[0].name);
  // Everybody with a history: the phone first, then a grudge, then a credit.
  const names = [];
  const add = (n) => { if (n && n !== 'the director' && !names.includes(n)) names.push(n); };
  for (const p of s.people || []) if (counted(p)) add(p.name);
  for (const g of live) add(g.who);
  for (const c of credits) add(c.director);
  for (const r of inPost) add(r.director);
  return names.map((name) => {
    const p = (s.people || []).find((x) => x.name === name && counted(x)) || null;
    // The one that binds is the one that lasts longest.
    const g = live.filter((x) => x.who === name).sort((a, b) => b.until - a.until)[0] || null;
    const mine = credits.filter((c) => c.director === name);
    const post = inPost.filter((r) => r.director === name);
    const shooting = onSet.find((x) => x.crew[0].name === name) || null;
    const latest = mine.slice().sort((a, b) => (b.year || 0) - (a.year || 0))[0] || null;
    const last = shooting ? { when: 'On set now', title: shooting.title }
      : post.length ? { when: 'In post', title: post[post.length - 1].title }
      : latest ? { when: String(latest.year || ''), title: latest.title } : null;
    const grudge = g ? grudgeView(g, now) : null;
    return {
      name, id: p ? p.id : null, inPhone: !!p, role: p ? p.role : 'Director',
      state: p ? stateOf(p) : null, relationship: p ? Math.round(p.relationship || 0) || 0 : null,   // drift leaves -0.001, which prints "-0"
      fromSet: p ? p.fromSet || null : null, weight: p ? p.industryWeight || null : null,
      films: mine.length + post.length, last, grudge,
      line: p ? lineFor(s, p, grudge) : `Not in your phone. Offers, tentpoles and sets only bring back people who are.`,
    };
  }).sort((a, b) => rank(a) - rank(b) || (b.relationship || 0) - (a.relationship || 0) || b.films - a.films);
}
// The phone, warm to cold; then a grudge from somebody who is not in it; then the rest of the work.
const ORDER = { warm: 0, neutral: 1, cold: 2 };
const rank = (r) => (r.inPhone ? ORDER[r.state] : r.grudge ? 3 : 4);

// What the bar is made of, read off the same rows. Grudges are counted the way the bar counts
// them — every live one, so two from the same director are two — and the rumour is the one a
// director who went cold is spreading (meta/trouble.js), which the bar also takes off.
export function directorCounts(s) {
  const rows = yourDirectors(s);
  const phone = rows.filter((r) => r.inPhone);
  return { warm: phone.filter((r) => r.state === 'warm').length, neutral: phone.filter((r) => r.state === 'neutral').length,
    cold: phone.filter((r) => r.state === 'cold').length, grudges: (s.grudges || []).filter((g) => g.until > stamp(s)).length,
    rumour: rumourOn(s) ? { who: s.rumour.who || 'A director', until: s.rumour.until } : null, rows };
}
