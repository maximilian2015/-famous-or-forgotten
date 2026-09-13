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
import { canMoveInWithThem, moveInWithThem, connected, anniversaryMonth, anniversaryYears } from '../life/dating.js';
import { roomOffer } from '../career/offers.js';
import { HOUSING } from '../../engine/economy.js';

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
const LUNCH = ['Sunday lunch? Your grandmother is asking.', 'Are you coming Sunday. Not a question.', 'Roast. One o’clock. Bring nothing, you always bring the wrong thing.'];
const SAW_YOU = ['Saw you on the sofa last night. You were very good at pretending to laugh.', 'You are in the paper. The good page.', 'Everyone at work saw the carpet thing. You looked expensive.'];
const WRAP = ['Wrapped? Come out. Tonight.', 'You are done! Drinks. I am not asking.', 'Heard you wrapped. Sleep first, then me.'];
const GIFT = ['Left something in your account. {n}. Don’t.', 'Sent you {n}. Buy something you do not need.', '{n}. It is nothing, and I do not want to hear about it.'];
const RENT = ['I paid the landlord. We are not discussing it.', 'The rent is done. Don’t make a thing of it.', 'Sorted the flat. Come over instead of worrying.'];
const MOVE_IN = ['Move in with me. I have the room, and you have a landlord.', 'Come and live here. It is stupid that you do not.', 'There is a whole floor nobody uses. Bring your things.'];
const ROOM = ['Dinner Thursday. Someone will be there who is casting.', 'Come to the thing on Friday. Bring the face. There is a part going.', 'A producer I know is casting something big and I mentioned you. Dinner, Saturday. Do not be late.'];
const ANNIV_YES = ['Last night. Thank you. {n} years.', '{n} years and you remembered. I was not sure you would.', 'That was a good night. Same time next year.'];
const ANNIV_NO = ['It was {n} years last month. I did not say anything. I am saying it now.', 'You forgot. {n} years. I am not angry, which is worse.', 'Did you know what last month was? Do not answer that.'];
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
  if (s.partner && (s.partner.relationship || 0) >= 45 && !pending(s, 'over') && !cooling(s, 'over') && chance(s.production ? 48 : 36)) {
    push(s, { from: s.partner.name, pid: s.partner.id, tag: 'over', text: pick(s.partner.livingTogether ? COME_HOME : COME_OVER),
      replies: [{ label: 'On my way', ap: 1, rel: 5, mental: 3, reply: `You go. It is a good night, and ${first(s.partner)} does not ask about work once.` },
        { label: s.production ? 'Can’t. Shooting.' : 'Can’t tonight', rel: -3, reply: `${first(s.partner)}: "Ok." Two letters.` }] });
    coolDown(s, 'over', 1);
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
  if (friends.length && !pending(s, 'drinks') && !cooling(s, 'drinks') && chance(32)) {
    const t = pick(friends);
    push(s, { from: t.p.name, pid: t.p.id, tag: 'drinks', text: pick(DRINKS),
      replies: [{ label: 'Go', ap: 1, rel: 5, mental: 2, reply: `A night that is not about you. You had forgotten what those were like.` }, { label: 'Rain check', rel: -1, reply: `${first(t.p)}: "Sure." You both know.` }] });
    coolDown(s, 'drinks', 1);
  }
  // 7. Family, now and then. Sunday.
  const fam = who.filter((t) => t.rel === 'parent' || t.rel === 'grandparent' || t.rel === 'sibling');
  if (fam.length && !pending(s, 'lunch') && !cooling(s, 'lunch') && chance(24)) {
    const t = pick(fam);
    push(s, { from: t.p.name, pid: t.p.id, tag: 'lunch', text: pick(LUNCH),
      replies: [{ label: 'Go', ap: 1, rel: 4, mental: 2, reply: `Three hours, too much food, and nobody asked about the film. That was the point.` }, { label: 'Next time', rel: -1, reply: `${first(t.p)}: "Next time, then." They have said that before.` }] });
    coolDown(s, 'lunch', 2);
  }
  // 8. You were on television, or in the galleries, and somebody saw.
  if ((s.media || 0) - (s._smsMedia || 0) >= 4 && who.length && !pending(s, 'sawyou') && !cooling(s, 'sawyou')) {
    const t = pick(who);
    push(s, { from: t.p.name, pid: t.p.id, tag: 'sawyou', text: pick(SAW_YOU), replies: [{ label: 'Reply', rel: 2, mental: 1, reply: `${first(t.p)} sends a screenshot. You look tired in it.` }] });
    coolDown(s, 'sawyou', 4);
  }
  s._smsMedia = s.media || 0;
  // 9. A wrap, and somebody wants to celebrate it.
  const wrapped = (s.filmography || []).find((c) => c.wrappedAt === now);
  if (wrapped && who.length && !pending(s, 'wrap') && !cooling(s, 'wrap')) {
    const t = s.partner && (s.partner.relationship || 0) >= 40 ? { p: s.partner, rel: 'partner' } : pick(who);
    push(s, { from: t.p.name, pid: t.p.id, tag: 'wrap', text: pick(WRAP), replies: [{ label: 'Yes', ap: 1, rel: 4, mental: 3, reply: 'The first night in months that ends when it ends.' }, { label: 'Too tired', rel: -1, mental: 1, reply: 'You sleep for eleven hours instead. Also fine.' }] });
    coolDown(s, 'wrap', 2);
  }
  // 10. Last month was the anniversary. Either you remembered, or you did not.
  if (s.partner && anniversaryMonth(s, now - 1) && !pending(s, 'anniv')) {
    const yrs = anniversaryYears(s, now - 1);
    const remembered = s.partner.lastEvening === now - 1;
    if (remembered) { applyBond(s, s.partner, 6); s.mental = clamp((s.mental || 50) + 2); }
    else applyBond(s, s.partner, -9);
    push(s, { from: s.partner.name, pid: s.partner.id, tag: 'anniv',
      text: remembered ? pick(ANNIV_YES).replace('{n}', String(yrs)) : pick(ANNIV_NO).replace('{n}', String(yrs)),
      replies: remembered ? [{ label: 'Reply', rel: 2, reply: `${first(s.partner)} sends the photograph from that night.` }]
        : [{ label: 'Make it up to them', ap: 1, rel: 7, mental: 1, reply: 'You cancel a thing and turn up with the right flowers for once. It helps. It does not fix it.' }, { label: 'Say sorry', rel: 1, reply: `${first(s.partner)}: "Ok." You have seen that one before.` }] });
  }
  // ── somebody with money ──────────────────────────────────────────────────────
  const rich = s.partner && ['money', 'serious'].includes(s.partner.means) ? s.partner : null;
  if (rich && (rich.relationship || 0) >= 55 && !pending(s, 'gift') && !cooling(s, 'gift') && chance(rich.means === 'serious' ? 16 : 9)) {
    // A gift lands when it lands; the text is the notice. Scaled to what they have.
    const amount = rich.means === 'serious' ? rint(40, 160) * 1000 : rint(3, 12) * 1000;
    s.cash = (s.cash || 0) + amount;
    addTimeline(s, `${rich.name.split(' ')[0]} transferred €${amount.toLocaleString()}. "Don't."`);
    push(s, { from: rich.name, pid: rich.id, tag: 'gift', text: pick(GIFT).replace('{n}', '€' + amount.toLocaleString()),
      replies: [{ label: 'Thank them', rel: 3, reply: `${first(rich)}: "It is only money." Which is a thing people with money say.` }] });
    coolDown(s, 'gift', 4);
  }
  // The rent you could not make. They can.
  if (rich && (rich.relationship || 0) >= 45 && (s.rentMissed || 0) > 0 && !pending(s, 'rentpaid')) {
    const owed = (HOUSING[s.housing || 'room'] || {}).cost || 0;
    s.cash = (s.cash || 0) + owed; s.rentMissed = 0;
    s.inbox = (s.inbox || []).filter((m) => m.tag !== 'rent');
    push(s, { from: rich.name, pid: rich.id, tag: 'rentpaid', text: pick(RENT), replies: [{ label: 'Thank them', rel: 2, reply: 'They change the subject. It is the kindest thing they could do with it.' }, { label: 'Say you will pay it back', rel: 4, mental: 2, reply: `${first(rich)}: "I know you will." Neither of you mentions it again.` }] });
  }
  // Move in with me. Asked once, when it would actually help.
  if (rich && canMoveInWithThem(s).ok && !s.hostedBy && !pending(s, 'movein') && !cooling(s, 'movein')
    && ((s.cash || 0) < 3 * ((HOUSING[s.housing || 'room'] || {}).cost || 0) || (s.rentMissed || 0) > 0 || s.homeless || !s.hasApartment)) {
    push(s, { from: rich.name, pid: rich.id, tag: 'movein', text: pick(MOVE_IN),
      replies: [{ label: 'Yes', act: 'movein', reply: 'You say yes. The lease was never in your name.' }, { label: 'Not yet', rel: -2, reply: `${first(rich)}: "The offer stands." It does, for a while.` }] });
    coolDown(s, 'movein', 8);
  }
  // ── the room ─────────────────────────────────────────────────────────────────
  // One in forty prospects is in the business (dating.js). Close enough to them, and once
  // in a while there is a dinner, and somebody at it is casting a studio picture.
  const inside = [s.partner, ...(s.family || []).filter((f) => f.alive && f.relation === 'Spouse')].filter((p) => p && connected(p) && (p.relationship || 0) >= 60)[0];
  if (inside && !pending(s, 'room') && !cooling(s, 'room') && (s.offers || []).length < 2 && chance(4)) {
    push(s, { from: inside.name, pid: inside.id, tag: 'room', text: pick(ROOM),
      replies: [{ label: 'Go', ap: 1, act: 'room', reply: 'You go. By dessert you have a part in a studio picture, and everybody at the table knows why.' }, { label: 'Not like this', rel: -2, mental: 2, reply: `${first(inside)}: "Suit yourself." They mean it kindly. Probably.` }] });
    coolDown(s, 'room', 9);
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
  if (r.act === 'movein') moveInWithThem(s);
  if (r.act === 'room' && found) { const o = roomOffer(s, found.p); (s.offers = s.offers || []).push(o); addTimeline(s, `${found.p.name.split(' ')[0]} got you in the room. "${o.projectTitle.replace('⭐ ', '')}" — a studio picture, and the offer is in Messages.`); }
  s.lastEvent = `💬 ${m.from}: "${m.text}"\n\n${r.reply}${moved ? ` (${moved > 0 ? '+' : ''}${moved})` : ''}`;
  if (r.rel && r.rel < 0) addTimeline(s, `${m.from} texted. You did not really answer.`, true);
  s.sms = (s.sms || []).filter((x) => x.id !== id);
  return s;
}
export function smsRead(s, id) { const m = (s.sms || []).find((x) => x.id === id); if (m) m.read = true; return s; }
export function smsReadAll(s) { for (const m of s.sms || []) m.read = true; return s; }
