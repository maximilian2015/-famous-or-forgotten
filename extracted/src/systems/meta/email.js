import { inCareer } from '../../engine/stage.js';
import { acceptOffer, declineOffer } from '../career/offers.js';
import { rint, chance } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { HOUSING } from '../../engine/economy.js';
import { setFame, setRespect } from './status.js';
import { agentWantsYou, offerAgent, signAgent, declineAgent, AGENT_TIERS } from '../career/agent.js';
import { toursFor } from '../career/tour.js';
import { STUDIOS } from '../world/names.js';
import { COST } from '../../engine/energy.js';
import { hype, hypeSource, showBump } from './hype.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
export function emUnread(s) { return (s.inbox || []).filter((m) => !m.read).length; }
function has(s, tag) { return (s.inbox || []).some((m) => m.tag === tag); }
export function sendMail(s, m) { push(s, m); return s; }
function push(s, m) {
  m.id = 'em' + (s._emSeq = (s._emSeq || 0) + 1); m.read = false;
  m.when = (s.year || 0) * 12 + (s.month || 0);
  s.inbox = (s.inbox || []).filter((x) => !(x.tag === 'reply' && x.subj === m.subj));
  (s.inbox = s.inbox || []).unshift(m);
  // Post you never answered stops being post. Bills you ignored pile up for a while and
  // then the pile stops growing — an inbox of fifteen unanswered rent notices is not a
  // game telling you anything, it is a list.
  if (s.inbox.length > 8) s.inbox = s.inbox.slice(0, 8);
}

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
const FANS = ['a fan', 'Someone in Osaka', 'A school in Leeds', 'Marta, 14', 'The night shift at a hospital'];
const FAN_SUBJ = ['You will not read this but', 'Thank you', 'I have seen it nine times', 'From all of us'];
const FAN_BODY = [
  'Handwritten, four pages, and it is about a scene you barely remember shooting. It meant something to somebody on a bad night.',
  'A whole class wrote to you. The teacher apologises for the spelling. One of them has drawn you with enormous hands.',
  'Nine times. They have the ticket stubs. They wanted you to know that it got them through something.',
  'A photo of a ward, everybody in scrubs, holding a poster of your film. "Every Tuesday. It is the only thing we agree on."',
];
const SPAM = [
  ['Studio Payments Dept', 'Your fee is being held', 'Your fee cannot be released until you confirm your account details. Click the link within 24 hours.', 'Confirm details', 'The link was not the studio. The card was yours. The number is now somebody else’s.'],
  ['Prince Adebayo Okonkwo', 'CONFIDENTIAL — A Proposal', 'A sum of eleven million requires a partner of your standing to leave the country. A small administrative fee unlocks it.', 'Pay the fee', 'The fee left. The eleven million did not arrive. Your assistant does not say anything, which is worse.'],
  ['Verified Fan Club', 'Congratulations — a prize', 'You have been selected for a luxury retreat. To secure the booking, a refundable deposit is required today.', 'Secure the booking', 'The retreat does not exist. The deposit was not refundable. It was not a deposit.'],
  ['Crypto Talent Fund', 'Tokenise your career', 'Fans invest directly in your next film via CelebCoin. Early investors get a private dinner with you. Minimum buy-in applies.', 'Buy in', 'CelebCoin is down ninety-four per cent by Thursday. The dinner is with a man named Dennis.'],
];
const pickOne = (list) => list[Math.floor(Math.random() * list.length)];
export function emailTick(s) {
  if (!s.alive || !inCareer(s)) return;
  const key = (s.year || 0) * 12 + (s.month || 0);
  if (s._emTick === key) return; s._emTick = key;
  // Post you never answered stops being post. A casting reply is news for a month or two;
  // played from twenty to twenty-one, six of them sat there and pushed everything else out.
  s.inbox = (s.inbox || []).filter((m) => !((m.kind === 'reply' && key - (m.when ?? key) >= 2) || (m.kind === 'spam' && key - (m.when ?? key) >= 3) || (m.kind === 'fan' && key - (m.when ?? key) >= 4)));
  const fame = s.fame || 0;
  // Rent is taken automatically every month by engine/economy.js applyMonthly. This letter
  // used to arrive every quarter regardless, quoting €800 off a field that does not exist
  // (`s.rent`), with a Pay button that took the money a SECOND time — Maxi paid it after
  // moving to a €2,900 flat and it still said €800. A landlord writes when a payment
  // bounced, and only then. If you own the place, there is no landlord.
  if ((s.rentMissed || 0) > 0 && s.hasApartment && !s.inheritedHome && !(s.owns && s.owns === s.housing) && !has(s, 'rent')) {
    const rent = (HOUSING[s.housing || 'room'] || HOUSING.room).cost;
    push(s, { from: 'Landlord', subj: 'Payment failed', tag: 'rent', kind: 'bill',
      body: `This month's €${rent.toLocaleString()} did not go through. ${s.rentMissed >= 2 ? 'This is the second notice. The locks change next month.' : 'One more and the lease is at risk.'}`,
      cta: [{ label: `Settle €${rent.toLocaleString()}`, pay: -rent, clear: 'rent', reply: 'Settled. The letters stop.' },
            { label: 'Ignore it', fx: { mental: -3 }, reply: 'A notice goes under the door.' }] });
  }
  // And the moment it is settled the letter is gone — not sitting there for a decade.
  if (!(s.rentMissed > 0)) s.inbox = (s.inbox || []).filter((m) => m.tag !== 'rent');
  // ── the studio wants an option ──
  // "Contracts — the options are not thought through." franchise.js has carried `optioned`
  // for a year and nothing ever set it. Now the studio asks, while you are shooting a
  // picture of theirs: an option on two more at THIS fee. Money now for the option; if
  // it is a hit they make the sequels and you are the one person on set not renegotiating
  // (sequelRaise is 1.6× to 2.6×, and you get none of it); if it is not, nothing happens.
  const p = s.production;
  if (p && ['feature', 'blockbuster'].includes(p.scale) && (p.tier === 'lead' || p.tier === 'tentpole') && (p.part || 1) === 1
    && !p.optioned && !p._optionAsked && (p.months - p.monthsLeft) >= 1 && chance(45)) {
    p._optionAsked = true;
    const bonus = Math.round((p.salary || 0) * 0.15);
    push(s, { from: 'Business affairs', subj: `Option agreement — ${p.title}`, tag: 'option', kind: 'contract', title: p.title,
      body: `The studio would like an option on two further ${p.title} pictures at your current fee of €${(p.salary || 0).toLocaleString()}. €${bonus.toLocaleString()} on signature, now. If the picture performs, the sequels are made and your fee is the fee in this letter while everybody else's goes up. If it does not, nothing happens and you keep the money. It lapses at wrap.`,
      cta: [{ label: `Sign · €${bonus.toLocaleString()} now`, option: 'sign', pay: bonus, reply: `Signed. €${bonus.toLocaleString()} clears the same afternoon. Two more, at this fee, if they want them.` },
        { label: 'Refuse — keep the raise', option: 'refuse', reply: 'You pass. If there is a sequel you will be negotiating it like everybody else — which is the point.' }] });
  }
  // A letter about a picture you are no longer shooting is not a letter.
  if (has(s, 'option') && !(p && (s.inbox || []).some((m) => m.tag === 'option' && m.title === p.title))) s.inbox = (s.inbox || []).filter((m) => m.tag !== 'option');
  // ── the press tour ──
  // The month before a studio picture opens, publicity wants two weeks of you. Only the
  // pictures the studio paid for, and only the name on the poster — see career/tour.js.
  for (const r of (s.releases || [])) {
    if (r.tourAsked || !toursFor(r) || r.due - key !== 1) continue;
    r.tourAsked = true;
    let h = 0; for (const ch of String(r.title || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const big = r.scale === 'blockbuster';
    push(s, { from: `${STUDIOS[h % STUDIOS.length]} · publicity`, subj: `Press tour — "${r.title}"`, tag: 'tour', kind: 'tour', releaseId: r.id, title: r.title,
      body: `"${r.title}" opens next month. ${big ? 'Three cities, two weeks' : 'Two weeks'}: the junket, ${big ? 'the late show' : 'a talk show'}, a cover. It is in the contract, more or less. ${COST.tour} energy, and a fortnight you do not get back.`,
      cta: [{ label: `Do the tour · ${COST.tour} energy`, tour: 'go' }, { label: 'Skip it', tour: 'skip' }] });
  }
  // A letter about a picture that has opened is not a letter.
  s.inbox = (s.inbox || []).filter((m) => m.tag !== 'tour' || (s.releases || []).some((r) => r.id === m.releaseId));
  // ── fan mail, hate mail, spam ──
  const flopped = (s.filmography || []).some((c) => (c.rating || 0) < 45 && c.closedAt && key - c.closedAt <= 3);
  if (fame >= 15 && offer(s, 'fan', 0, flopped ? 22 : fame >= 35 ? 10 : 5)) {
    if (flopped) push(s, { from: 'anon', subj: 'saw your film', tag: 'fan', kind: 'hate', body: 'It is three paragraphs long and they have opinions about your face, your voice and your parents. It has been forwarded to you by someone who thought you should see it.',
      cta: [{ label: 'Read it', fx: { mental: -3 }, reply: 'You read it twice. That was the mistake.' }, { label: 'Delete unread', fx: {}, reply: 'Gone. It was never about you anyway.' }] });
    else push(s, { from: pickOne(FANS), subj: pickOne(FAN_SUBJ), tag: 'fan', kind: 'fan', body: pickOne(FAN_BODY),
      cta: [{ label: 'Read it', fx: { mental: 2 }, reply: 'You read it to the end. It helps more than it should.' }, { label: 'Have someone reply', fx: { mental: 1 }, reply: 'A signed photo goes out. Somebody, somewhere, is very happy.' }] });
    coolDown(s, 'fan', rint(4, 9));
  }
  if (offer(s, 'spam', 0, 7)) {
    const sp = pickOne(SPAM);
    push(s, { from: sp[0], subj: sp[1], tag: 'spam', kind: 'spam', body: sp[2],
      cta: [{ label: 'Delete', fx: {}, reply: 'Deleted.' }, { label: sp[3], pay: -rint(1800, 9000), fx: { mental: -2 }, reply: sp[4] }] });
    coolDown(s, 'spam', rint(6, 12));
  }
  // Somebody wants to represent you. Once per approach; a 'not now' goes quiet for six months.
  if (agentWantsYou(s) && !has(s, 'agent')) {
    const o = offerAgent(s); const t = AGENT_TIERS[o.tier];
    push(s, { from: o.name, subj: 'I would like to represent you', tag: 'agent', kind: 'agent', agentOffer: o,
      body: `${t.label}. ${t.blurb} They take ${Math.round(t.cut * 100)}% of every fee, bring you offers, and reach further than you can at the table.`,
      cta: [{ label: 'Sign', sign: 'agent', reply: `${o.name} is your agent now.` }, { label: 'Not now', decline: 'agent', reply: 'They say to call when you change your mind. They will not call you.' }] });
  }
  // The sofa books whoever is being talked about — a hit, the season, a night that went
  // everywhere — and rarely anybody else. Each one is worth less than the last (meta/hype.js).
  const booked = hype(s) >= 30 && hypeSource(s) !== 'scandal' ? offer(s, 'show', 0, 60) : fame >= 40 && fame < 75 && offer(s, 'show', 0, 12);
  if (booked) { const sh = pickOne(SHOWS); push(s, { from: sh[0], subj: "We'd love to have you on", tag: 'show', kind: 'invite', body: sh[1], cta: [{ label: 'Go on the show', check: { stat: 'charisma', diff: 48 }, good: { fx: { fame: 1, media: 1, mental: 1 }, reply: 'You kill it. "So likeable" trends with your name.' }, bad: { fx: { scandal: 3, mental: -3 }, reply: 'You freeze. The awkward clip loops.' } }, { label: 'Politely decline', fx: {}, reply: 'Safe, forgettable, no clip.' }] }); }
  if (fame >= 55 && offer(s, 'event', 0, 40)) { const cp = pickOne(CARPETS); push(s, { from: cp[0], subj: 'Red carpet invitation', tag: 'event', kind: 'invite', body: cp[1], cta: [{ label: 'Walk the carpet', check: { stat: 'looks', diff: 46 }, good: { fx: { fame: 2, media: 4, respect: 1 }, reply: 'Best dressed. Your look leads the galleries.' }, bad: { fx: { media: 2, scandal: 2 }, reply: '"Worst dressed" lists are also lists.' } }, { label: 'Send regrets', fx: { mental: 1 }, reply: 'The night happens without you.' }] }); }
  if (fame >= 75 && offer(s, 'vip', 0, 34)) { const rm = pickOne(ROOMS); push(s, { from: rm[0], subj: "You're on the list", tag: 'vip', kind: 'invite', body: rm[1], cta: [{ label: 'Go — work the room', check: { stat: 'charisma', diff: 52 }, good: { fx: { fame: 2, respect: 4, media: 2 }, reply: "You leave with a director's promise." }, bad: { fx: { scandal: 4, mental: -3 }, reply: 'You say the wrong thing to the wrong legend.' } }, { label: 'Too risky — skip', fx: {}, reply: 'That room does not send twice.' }] }); }
}
export function emailAct(s, id, i) {
  const m = (s.inbox || []).find((x) => x.id === id); if (!m) return s;
  const c = m.cta && m.cta[i]; if (!c) return s;
  let out = c, head = '';
  if (c.check) { const odds = 30 + (s[c.check.stat] || 0) * 0.5; const ok = chance(odds); out = ok ? (c.good || {}) : (c.bad || {}); head = ok ? '✅ ' : '❌ '; }
  if (typeof out.pay === 'number' || typeof c.pay === 'number') s.cash = (s.cash || 0) + (out.pay || c.pay || 0);
  if (c.clear === 'rent') s.rentMissed = 0;
  if (c.sign === 'agent') signAgent(s, m.agentOffer);
  const optioned = (s.productions && s.productions.length ? s.productions : (s.production ? [s.production] : [])).find((p) => p.title === m.title);
  if (c.option === 'sign' && optioned) { optioned.optioned = true; optioned.optionParts = 3; addTimeline(s, `Signed an option on two more ${m.title} pictures at €${(optioned.salary || 0).toLocaleString()}.`); }
  if (c.option === 'refuse') addTimeline(s, `Refused the option on ${m.title}. Any sequel gets negotiated fresh.`);
  if (c.decline === 'agent') declineAgent(s);
  // The casting email IS the offer. Answering it here answers it in Messages too.
  if (c.offer && m.offerId) {
    const o = (s.offers || []).find((x) => x.id === m.offerId);
    if (!o) { s.lastEvent = 'That offer is gone — they cast somebody else while you thought about it.'; s.inbox = (s.inbox || []).filter((x) => x.id !== id); return s; }
    if (c.offer === 'open') { s.openContract = o.id; return s; }   // the paper comes up; the letter stays until it is answered
    if (c.offer === 'accept') { acceptOffer(s, o.id); if ((s.offers || []).some((x) => x.id === o.id)) return s; }   // refused (signed off, shooting): the mail stays, the reason is on screen
    else declineOffer(s, o.id);
    s.inbox = (s.inbox || []).filter((x) => x.id !== id);
    return s;
  }
  const fx = out.fx || {};
  // Fame and standing have single write points (status.js). Writing them here bypassed the
  // fame ceiling and — worse — clamped standing at zero, so walking a carpet at −9 put you
  // on 0: an email was the one thing in the game that could not go below zero.
  // A show's attention goes through hype.js: worth less each time in a year.
  ['media','mental','scandal','looks'].forEach((k) => { if (typeof fx[k] === 'number') { if (k === 'media' && m.tag === 'show' && fx[k] > 0) showBump(s); else s[k] = clamp((s[k] || 0) + fx[k]); } });
  if (typeof fx.fame === 'number') setFame(s, (s.fame || 0) + fx.fame);
  if (typeof fx.respect === 'number') setRespect(s, (s.respect || 0) + fx.respect);
  s.lastEvent = `✉️ ${m.subj}\n\n${head}${out.reply || c.reply || c.label}`;
  addTimeline(s, `${m.subj}: ${c.label}.`, head === '❌ ');
  // Answered. That kind of night goes quiet for a while rather than arriving again next
  // month with the same eleven words.
  if (m.kind === 'invite') coolDown(s, m.tag, rint(3, 9));
  s.inbox = (s.inbox || []).filter((x) => x.id !== id);
  return s;
}
export function markRead(s, id) { const m = (s.inbox || []).find((x) => x.id === id); if (m) m.read = true; return s; }
