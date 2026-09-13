// Messages.
//
// The phone rang about offers and about nothing else. Maxi: "Messages is always empty."
// A star's phone is full of people — the partner asking if you are coming home, a mother
// who saw the papers, a friend who saw the film and is being kind about it, a contact
// you have not answered in a year. None of it is invented: every text here is triggered
// by something that actually happened to the state this month, and every reply moves the
// relationship through applyBond like anything else does.
//
// Read by phone/apps/Messages.jsx. Ticks from engine/time.js after the month has moved.

import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { applyBond } from '../life/bonds.js';
import { findPerson } from '../life/interactions.js';

const clamp = (v) => Math.max(0, Math.min(100, v));
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const first = (p) => String(p.name || '').split(' ')[0];

export function smsUnread(s) { return (s.sms || []).filter((m) => !m.read).length; }

function push(s, m) {
  m.id = 'sms' + (s._smsSeq = (s._smsSeq || 0) + 1);
  m.read = false; m.when = stamp(s);
  (s.sms = s.sms || []).unshift(m);
  // A phone with forty unanswered texts is not a game telling you anything.
  if (s.sms.length > 10) s.sms = s.sms.slice(0, 10);
}
function cooling(s, tag) { return ((s._smsCool || {})[tag] || 0) > stamp(s); }
function coolDown(s, tag, months) { (s._smsCool = s._smsCool || {})[tag] = stamp(s) + months; }
function pending(s, tag) { return (s.sms || []).some((m) => m.tag === tag); }

// Who might text. The partner; family who are alive and not estranged; contacts you are
// actually close to. Everyone carries where they live on the state, so a reply can find them.
function texters(s) {
  const out = [];
  if (s.partner && (s.partner.relationship || 0) >= 20) out.push({ p: s.partner, rel: 'partner' });
  for (const f of s.family || []) if (f.alive && (f.relationship || 0) >= 25) out.push({ p: f, rel: relOf(f) });
  for (const c of s.people || []) if ((c.relationship || 0) >= 40 && !c.cold) out.push({ p: c, rel: 'contact' });
  return out;
}
function relOf(f) {
  const r = f.relation || '';
  return r === 'Spouse' ? 'spouse' : (r === 'Mother' || r === 'Father') ? 'parent'
    : (r === 'Brother' || r === 'Sister') ? 'sibling' : r === 'Child' ? 'child' : 'grandparent';
}
const closest = (list) => list.slice().sort((a, b) => (b.p.relationship || 0) - (a.p.relationship || 0))[0];

// ── the texts ──────────────────────────────────────────────────────────────────────────
// {label, ap, rel, mental, reply} — rel goes through applyBond; ap is energy.
const SAW_IT_GOOD = [
  'Saw it last night. You were the best thing in it, and I am not just saying that.',
  'Went with half the office. Everyone shut up when you came on. That is all I will say.',
  'Okay I cried. Do not tell anyone.',
  'Finally saw it. You were properly good. When did that happen?',
];
const SAW_IT_BAD = [
  'Saw it. We do not have to talk about it.',
  'I liked YOU in it. The rest of it, well.',
  'Went to see it. The popcorn was great.',
  'Saw it. Next one, yeah?',
];
const COME_OVER = ['Come over tonight?', 'Mine, tonight? I will cook, badly.', 'Have not seen you in a week. Come over.'];
const COME_HOME = ['Are you coming home at some point this week?', 'Dinner. Ours. Tonight. Please.', 'I have not seen your face in ten days and I live with it.'];
const PAPERS = ['Your mother saw the papers.', 'Your father has the article open on the kitchen table. He has not said anything. Ring him.', 'Is it true? Ring me. Not a text, a call.'];
const PROUD = ['Saw the list. Proud of you.', 'THE LIST. You are ON THE LIST.', 'Nominated. I told everyone at work. Sorry.'];
const DRINKS = ['Drinks Thursday? You owe me about six.', 'Long time. Come out with us Friday.', 'Are you alive? Pub, this week, no excuses.'];
const WHILE = ['It has been a while.', 'Not heard from you in ages. Everything alright?', 'Guess we are the kind of people who drift. Or I could just ask: coffee?'];

export function smsTick(s) {
  if (!s || !s.alive) return;
  const now = stamp(s);
  if (s._smsTick === now) return; s._smsTick = now;
  const who = texters(s);

  // 1. Something of yours finished its run this month, and somebody saw it.
  const closed = (s.filmography || []).find((c) => c.closedAt === now && !c.minor);
  if (closed && who.length && !cooling(s, 'sawit')) {
    const t = closest(who);
    const good = (closed.rating || 0) >= 68, bad = (closed.rating || 0) < 45;
    if (good || bad) {
      push(s, { from: t.p.name, pid: t.p.id, tag: 'sawit', text: pick(good ? SAW_IT_GOOD : SAW_IT_BAD),
        replies: [{ label: good ? 'Thank them' : 'Laugh it off', rel: good ? 4 : 3, mental: good ? 2 : 1, reply: good ? `${first(t.p)} sends back a row of hearts.` : `${first(t.p)}: "Next one." Which is the right thing to say.` }] });
      coolDown(s, 'sawit', 2);
    }
  }
  // 2. Somebody who went cold says so, once.
  for (const c of s.people || []) {
    if (c.cold && !c._smsCold) {
      c._smsCold = true;
      if (!pending(s, 'while')) push(s, { from: c.name, pid: c.id, tag: 'while', text: pick(WHILE),
        replies: [{ label: 'Reply properly', rel: 8, reply: `${first(c)} replies within the minute. It was never that hard.` }, { label: 'Leave it', rel: -4, reply: 'You leave it. They notice.' }] });
    }
    if (!c.cold) c._smsCold = false;
  }
  // 3. The partner asks. Not while you are answering it on a set eleven months away — that
  //    is exactly when they ask.
  if (s.partner && (s.partner.relationship || 0) >= 45 && !pending(s, 'over') && !cooling(s, 'over') && chance(s.production ? 30 : 16)) {
    push(s, { from: s.partner.name, pid: s.partner.id, tag: 'over', text: pick(s.partner.livingTogether ? COME_HOME : COME_OVER),
      replies: [{ label: 'On my way', ap: 1, rel: 5, mental: 3, reply: `You go. It is a good night, and ${first(s.partner)} does not ask about work once.` },
        { label: s.production ? 'Can’t. Shooting.' : 'Can’t tonight', rel: -3, reply: `${first(s.partner)}: "Ok." Two letters.` }] });
    coolDown(s, 'over', 3);
  }
  // 4. The papers. A jump in scandal, and a parent has seen it.
  const sc = s.scandal || 0;
  if (sc - (s._smsScandal || 0) >= 8) {
    const par = who.find((t) => t.rel === 'parent');
    if (par && !pending(s, 'papers')) push(s, { from: par.p.name, pid: par.p.id, tag: 'papers', text: pick(PAPERS),
      replies: [{ label: 'Call them', ap: 1, rel: 5, mental: 2, reply: `An hour on the phone. Most of it was not about the papers.` }, { label: 'Not now', rel: -4, mental: -1, reply: 'You do not ring. It sits there.' }] });
  }
  s._smsScandal = sc;
  // 5. Nominated, and somebody saw the list.
  const noms = ((s.awards && s.awards.nominations) || []).length;
  if (noms > (s._smsNoms || 0) && who.length && !pending(s, 'proud')) {
    const t = closest(who);
    push(s, { from: t.p.name, pid: t.p.id, tag: 'proud', text: pick(PROUD), replies: [{ label: 'Reply', rel: 3, mental: 3, reply: `${first(t.p)} has already told everyone.` }] });
  }
  s._smsNoms = noms;
  // 6. A friend, now and then.
  const friends = who.filter((t) => t.rel === 'contact' || t.rel === 'sibling');
  if (friends.length && !pending(s, 'drinks') && !cooling(s, 'drinks') && chance(9)) {
    const t = pick(friends);
    push(s, { from: t.p.name, pid: t.p.id, tag: 'drinks', text: pick(DRINKS),
      replies: [{ label: 'Go', ap: 1, rel: 5, mental: 2, reply: `A night that is not about you. You had forgotten what those were like.` }, { label: 'Rain check', rel: -1, reply: `${first(t.p)}: "Sure." You both know.` }] });
    coolDown(s, 'drinks', 4);
  }
  // Old texts you never answered stop being texts.
  s.sms = (s.sms || []).filter((m) => now - (m.when || now) < 6);
}

export function smsReply(s, id, i) {
  const m = (s.sms || []).find((x) => x.id === id); if (!m) return s;
  const r = m.replies && m.replies[i]; if (!r) return s;
  if (r.ap && (s.ap || 0) < r.ap) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  if (r.ap) s.ap = (s.ap || 0) - r.ap;
  const found = findPerson(s, m.pid);
  let moved = 0;
  if (found && r.rel) moved = applyBond(s, found.p, r.rel);
  if (r.mental) s.mental = clamp((s.mental || 50) + r.mental);
  s.lastEvent = `💬 ${m.from}: "${m.text}"\n\n${r.reply}${moved ? ` (${moved > 0 ? '+' : ''}${moved})` : ''}`;
  if (r.rel && r.rel < 0) addTimeline(s, `${m.from} texted. You did not really answer.`, true);
  s.sms = (s.sms || []).filter((x) => x.id !== id);
  return s;
}
export function smsRead(s, id) { const m = (s.sms || []).find((x) => x.id === id); if (m) m.read = true; return s; }
export function smsReadAll(s) { for (const m of s.sms || []) m.read = true; return s; }
