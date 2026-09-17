// The deal. An offer used to be a card with Accept on it; now it is a contract with
// clauses, and each clause is something you can tick, or send back. You send the paper,
// they answer a month later — agreed, a counter, or no — and you sign or push again, and
// after the third push they can walk. Maxi: "a pop-up window where you tick if you agree,
// cross if not, or discuss; you send it like in life; the answer comes back."
//
// What is in it depends on who you are and what the picture is. Money and dates always.
// Exclusivity on the bigger pictures — no other work while you shoot, which is the
// dilemma: the promising indie or the fee. Preparation on a blockbuster or an action
// picture — mandatory months before the first day, on the calendar. A back end and a
// sequel option only once you are a name; nobody gives a nobody points.
import { rint, chance } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { fameTier } from '../meta/status.js';
import { negotiationFor, reachOf } from './negotiate.js';
import { acceptOffer, declineOffer } from './offers.js';
import { canTakeSet, monthsUntilFree, sets } from '../../engine/sets.js';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const money = (n) => `€${Math.round(n).toLocaleString()}`;
const tierIdx = (s) => ['unknown', 'rising', 'known', 'star', 'alist', 'icon'].indexOf(fameTier(s.fame).id);

// How much of your pushing they take. A name at the table, an agent behind it, and a
// production that needs you — all of it moves the odds; every round after the first
// costs a third.
function leverage(s, o) {
  let l = 0.55 + tierIdx(s) * 0.09 + ((reachOf(s) - 1) * 0.4);
  if ((o.stability ?? 80) < 60) l += 0.1;            // they need somebody, and cheap
  if (o.via === 'casting') l -= 0.05;                 // you read for it; they have a list
  return Math.max(0.35, Math.min(1.25, l));
}

// ── drafting ──────────────────────────────────────────────────────────────────
function exclusiveFor(o) {
  const odds = o.scale === 'blockbuster' ? 80 : o.scale === 'feature' || o.scale === 'prestige' ? 45 : o.scale === 'recurring' ? 30 : 15;
  return chance(odds);
}
function prepFor(o) {
  if (o.scale === 'blockbuster') return /Thriller|Sci-Fi|Horror|Crime/.test(o.genre || '') ? 2 : 1;
  if ((o.scale === 'feature' || o.scale === 'prestige') && /Thriller|Sci-Fi|Horror/.test(o.genre || '')) return chance(40) ? 1 : 0;
  return 0;
}
export function draftContract(s, o) {
  if (o.contract) return o.contract;
  const big = o.tier !== 'supporting' || (o.months || 0) >= 2;
  const clauses = [];
  const neg = negotiationFor(s, { medium: o.medium || (o.scale === 'blockbuster' ? 'film_tentpole' : o.scale === 'feature' ? 'film_studio' : o.scale === 'prestige' ? 'tv_prestige' : o.episodes ? 'tv_network' : 'film_indie'),
    salary: o.salary, perEpisode: !!o.perEpisode, episodeFee: o.episodeFee, share: o.share || 1, feeFactor: o.feeFactor || 1 });
  const unit = o.perEpisode ? o.episodeFee : o.salary;
  // The fee. Below Star you are told the number; you can still ask, and mostly be told again.
  const fee = { id: 'fee', label: 'Fee', value: unit, perEpisode: !!o.perEpisode, episodes: o.episodes || 0,
    text: o.perEpisode ? `${money(unit)} an episode, ${o.episodes} episodes — ${money(o.salary)}` : `${money(unit)} for the picture, paid across the shoot`,
    // The asks are the negotiation's three positions, capped against the offer itself: a
    // "little more" that doubled the fee because the band was wide is not a little more.
    options: neg ? neg.asks.map((a) => ({ id: a.id, label: a.label, odds: a.id === 'fair' ? 62 : a.id === 'push' ? 34 : 12,
        value: Math.round(Math.min(a.amount, unit * (a.id === 'fair' ? 1.2 : a.id === 'push' ? 1.5 : 2.2))) })).filter((a) => a.value > unit)
      : [{ id: 'fair', label: 'Ask for ten per cent more', value: Math.round(unit * 1.1), odds: 28 }] };
  clauses.push(fee);
  // The dates. If you are on a set, the only thing to ask is that it waits for you.
  // If you are on a set: alongside it, if they will have you split the week — a second
  // set needs a name they trust — or after it wraps. Maxi: "castings while shooting, and
  // with respect the option to start; the contract says how they are counted."
  const now = (s.year || 0) * 12 + (s.month || 0);
  const ex = big && exclusiveFor(o);   // decided here because the dates depend on it
  const fit = canTakeSet(s, { ...o, exclusive: ex });
  const wait = fit.ok ? 0 : monthsUntilFree(s, { ...o, exclusive: ex });
  const start = now + 1 + (big ? wait : 0);
  const sched = { id: 'schedule', label: 'Schedule', value: { months: o.months || 1, start },
    text: `${o.months || 1} month${(o.months || 1) === 1 ? '' : 's'} of shooting, from ${MON[start % 12]} ${Math.floor(start / 12)}`
      + (s.production && big ? (fit.ok ? ` — alongside "${s.production.title}"` : ` — after "${(fit.until || s.production).title}" wraps; ${fit.respect ? `a set alongside needs respect ${fit.respect}` : fit.why.replace(/\.$/, '')}`) : ''),
    options: s.production && big && fit.ok ? [{ id: 'afterWrap', label: `Start after "${s.production.title}" wraps instead (${(s.production.prepLeft || 0) + (s.production.monthsLeft || 0)} mo)`, value: { months: o.months || 1, start: now + 1 + (s.production.prepLeft || 0) + (s.production.monthsLeft || 0) }, odds: 70 }] : [] };
  clauses.push(sched);
  if (big) {
    // Exclusivity. The dilemma in one line.
    clauses.push({ id: 'exclusive', label: 'Exclusivity', value: ex,
      text: ex ? 'Nothing else while you shoot — not a day, not a voice session' : 'A day’s work alongside is fine with them',
      options: ex ? [{ id: 'strike', label: 'Strike it — you keep your Saturdays', value: false, odds: o.scale === 'blockbuster' ? 22 : 45 }] : [] });
    // Preparation. Mandatory where it is mandatory; it sits on the calendar before day one.
    const prep = prepFor(o);
    if (prep > 0) clauses.push({ id: 'prep', label: 'Preparation', value: prep,
      text: `${prep} month${prep === 1 ? '' : 's'} before the first day — the body, the accent, the stunts. Unpaid, on the calendar, and the set starts better for it`,
      options: prep > 1 ? [{ id: 'cut', label: 'Cut it to one month', value: 1, odds: 50 }] : [] });
  }
  // Points and options: only once you are somebody.
  if (big && tierIdx(s) >= 4 && (o.scale === 'blockbuster' || o.scale === 'feature')) {
    const pts = rint(1, 3);
    clauses.push({ id: 'backend', label: 'Back end', value: pts, text: `${pts}% of the gross past break-even`,
      options: [{ id: 'more', label: `Ask for ${pts + 3}%`, value: pts + 3, odds: 30 }] });
  }
  if (big && o.scale === 'blockbuster' && tierIdx(s) >= 3 && !o.kind) {
    clauses.push({ id: 'option', label: 'Sequel option', value: true, text: 'They hold an option on two more pictures at this fee, whatever you are worth by then',
      options: [{ id: 'strike', label: 'Strike it — every sequel gets negotiated fresh', value: false, odds: 40 }] });
  }
  for (const c of clauses) { c.stance = 'ok'; c.ask = null; c.result = null; }
  o.contract = { round: 0, sent: null, clauses, walked: false };
  return o.contract;
}
export function openContract(s, id) { const o = (s.offers || []).find((x) => x.id === id); if (!o) return s; draftContract(s, o); s.openContract = id; return s; }
export function contractFor(s, id) { const o = (s.offers || []).find((x) => x.id === id); return o ? draftContract(s, o) : null; }

// ── your marks on the paper ───────────────────────────────────────────────────
export function markClause(s, id, clauseId, askId) {
  const o = (s.offers || []).find((x) => x.id === id); if (!o) return s;
  const c = draftContract(s, o).clauses.find((x) => x.id === clauseId); if (!c) return s;
  if (o.contract.sent) return s;                  // it is with them; wait for the answer
  if (!askId) { c.stance = 'ok'; c.ask = null; return s; }
  if (!c.options.some((op) => op.id === askId)) return s;
  c.stance = 'talk'; c.ask = askId;
  return s;
}
export function openTalks(o) { return ((o.contract && o.contract.clauses) || []).filter((c) => c.stance === 'talk'); }

// ── sending it ────────────────────────────────────────────────────────────────
export function sendContract(s, id) {
  const o = (s.offers || []).find((x) => x.id === id); if (!o) return s;
  const k = draftContract(s, o);
  if (k.sent) { s.lastEvent = 'It is with them. They answer within the month.'; return s; }
  if (!openTalks(o).length) { s.lastEvent = 'Nothing to send back — you agreed to all of it. Sign it.'; return s; }
  k.sent = (s.year || 0) * 12 + (s.month || 0);
  k.round += 1;
  // The clock on the offer stops while the paper is with them.
  o.deadline = Math.max(o.deadline || 0, 2);
  s.lastEvent = `You sent "${String(o.projectTitle || '').replace('⭐ ', '')}" back with ${openTalks(o).length} thing${openTalks(o).length === 1 ? '' : 's'} on it. They answer next month.`;
  addTimeline(s, `Sent the contract for ${String(o.projectTitle || '').replace('⭐ ', '')} back.`);
  return s;
}

// Monthly, from offersTick. Every paper out with them comes back with an answer.
export function contractsTick(s) {
  const now = (s.year || 0) * 12 + (s.month || 0);
  for (const o of (s.offers || [])) {
    const k = o.contract; if (!k || !k.sent || k.sent >= now) continue;
    k.sent = null;
    const lev = leverage(s, o) * Math.pow(0.7, k.round - 1);
    const lines = []; let refused = 0;
    for (const c of k.clauses) {
      if (c.stance !== 'talk') continue;
      const op = c.options.find((x) => x.id === c.ask); if (!op) { c.stance = 'ok'; continue; }
      const roll = Math.random() * 100;
      const odds = op.odds * lev;
      if (roll < odds) { c.value = op.value; c.text = textFor(c, o); c.result = 'agreed'; c.stance = 'ok'; c.ask = null; lines.push(`${c.label} — agreed`); }
      else if (c.id === 'fee' && roll < odds * 1.8) {
        // Halfway, which is what "no" usually means about money.
        c.value = Math.round((c.value + op.value) / 2); c.text = textFor(c, o); c.result = 'counter'; c.stance = 'ok'; c.ask = null; lines.push(`${c.label} — they came halfway: ${money(c.value)}`);
      } else { c.result = 'refused'; c.stance = 'ok'; c.ask = null; refused++; lines.push(`${c.label} — no`); }
    }
    const title = String(o.projectTitle || 'it').replace('⭐ ', '');
    // Push three times and they may decide you are more trouble than you are worth.
    if (refused && k.round >= 3 && chance(35)) {
      k.walked = true;
      s.offers = s.offers.filter((x) => x.id !== o.id);
      s.inbox = (s.inbox || []).filter((m) => m.offerId !== o.id);
      addTimeline(s, `${title}: they stopped answering. Somebody else signed it as written.`, true);
      (s.moments = s.moments || []).push({ id: 'contract', kind: 'bad', title, lines, body: 'Three times back and forth, and on the third they simply stopped replying. Somebody else signed it as written.', walked: true });
      continue;
    }
    (s.moments = s.moments || []).push({ id: 'contract', kind: refused ? 'bad' : 'good', title, offerId: o.id, lines,
      body: refused ? (lines.length === refused ? 'They held on everything. The paper is back on your desk as it was — sign it, push again, or walk.' : 'Some of it, not all of it. The paper is back on your desk.')
        : 'They agreed to all of it. The paper is back on your desk, ready to sign.' });
  }
  return s;
}
function textFor(c, o) {
  if (c.id === 'fee') return c.perEpisode ? `${money(c.value)} an episode, ${c.episodes} episodes — ${money(c.value * c.episodes)}` : `${money(c.value)} for the picture, paid across the shoot`;
  if (c.id === 'schedule') return `${c.value.months} month${c.value.months === 1 ? '' : 's'} of shooting, from ${MON[c.value.start % 12]} ${Math.floor(c.value.start / 12)}`;
  if (c.id === 'exclusive') return c.value ? 'Nothing else while you shoot — not a day, not a voice session' : 'A day’s work alongside is fine with them';
  if (c.id === 'prep') return `${c.value} month${c.value === 1 ? '' : 's'} before the first day — the body, the accent, the stunts`;
  if (c.id === 'backend') return `${c.value}% of the gross past break-even`;
  if (c.id === 'option') return c.value ? 'They hold an option on two more pictures at this fee' : 'No option — every sequel gets negotiated fresh';
  return c.text;
}

// ── signing ───────────────────────────────────────────────────────────────────
export function signContract(s, id) {
  const o = (s.offers || []).find((x) => x.id === id); if (!o) return s;
  const k = draftContract(s, o);
  if (k.sent) { s.lastEvent = 'It is with them. Wait for the answer.'; return s; }
  // What was agreed goes onto the offer, and then it is an offer accepted like any other.
  for (const c of k.clauses) {
    if (c.id === 'fee') { if (c.perEpisode) { o.episodeFee = c.value; o.salary = c.value * c.episodes; } else o.salary = c.value; }
    if (c.id === 'schedule') { o.months = c.value.months; o.startAt = c.value.start; }
    if (c.id === 'exclusive') o.exclusive = !!c.value;
    if (c.id === 'prep') o.prep = c.value;
    if (c.id === 'backend') o.backend = c.value;
    if (c.id === 'option') { o.optioned = !!c.value; o.optionParts = c.value ? 3 : 0; }
  }
  o.signed = true;
  const now = (s.year || 0) * 12 + (s.month || 0);
  const title = String(o.projectTitle || 'it').replace('⭐ ', '');
  // Signed to start later — after your current shoot. It waits in Messages, signed, and
  // starts itself the month the set is free.
  if ((o.startAt || 0) > now + 1 || !canTakeSet(s, o).ok) {
    o.waitsForWrap = true; o.deadline = 99;
    s.lastEvent = `Signed. "${title}" starts ${(o.startAt || 0) > now + 1 ? `in ${MON[(o.startAt || now) % 12]}` : 'when a set frees up'}.`;
    addTimeline(s, `Signed for ${title}.`);
    return s;
  }
  addTimeline(s, `Signed for ${title}.`);
  acceptOffer(s, id);
  const started = sets(s).find((p) => p.offerId === id);
  if (started && started.prepLeft > 0) s.lastEvent = `Signed. ${started.prep} month${started.prep === 1 ? '' : 's'} of preparation before the first day of "${title}".`;
  return s;
}
export function passContract(s, id) { return declineOffer(s, id); }

// Signed papers waiting for a free set start themselves. Called from productionTick's
// slot in the month, after a wrap — see engine/time.js.
export function startSigned(s) {
  const now = (s.year || 0) * 12 + (s.month || 0);
  const o = (s.offers || []).find((x) => x.signed && (x.startAt || 0) <= now + 1 && canTakeSet(s, x).ok);
  if (!o) return s;
  o.waitsForWrap = false;
  return acceptOffer(s, o.id);
}
