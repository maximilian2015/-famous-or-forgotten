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
import { walkOffSet } from './production.js';
import { noteSequelLoss } from '../meta/stories.js';
import { sendMail } from '../meta/email.js';
import { STUDIOS } from '../world/names.js';
// The studio on the letterhead — the same hash ContractRoom draws the stamp from.
function studioOf(o) { let h = 0; for (const ch of String(o.id || o.projectTitle || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return STUDIOS[h % STUDIOS.length]; }
// How long a production will hold a part for somebody who is on another set. A month or
// two, usually; half a year, rarely; and a nobody asking is a nobody asking.
const SCALE_RANK = { oneoff: 0, small: 1, episode: 1, indie: 2, recurring: 3, prestige: 4, feature: 4, blockbuster: 5 };
// Whether they will hold a part until you are free. For a nobody it is the wait that decides;
// a studio waits for a name — a star's odds are half again, and an A-lister is waited for,
// full stop, because the picture is being made around them.
function holdOdds(wait, s) {
  const base = wait <= 2 ? 70 : wait <= 4 ? 45 : wait <= 6 ? 25 : 12;
  const t = s ? tierIdx(s) : 0;
  if (t >= 4) return 100;
  if (t === 3) return Math.min(95, Math.round(base * 1.5));
  return base;
}

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
// The dates. If you are on a set, the only thing to ask is that it waits for you.
// If you are on a set: alongside it, if they will have you split the week — a second
// set needs a name they trust — or after it wraps. Maxi: "castings while shooting, and
// with respect the option to start; the contract says how they are counted."
function scheduleClause(s, o, big, ex) {
  const now = (s.year || 0) * 12 + (s.month || 0);
  const fit = canTakeSet(s, { ...o, exclusive: ex });
  const wait = fit.ok ? 0 : monthsUntilFree(s, { ...o, exclusive: ex });
  // A sequel comes with the studio's date on it, months out (franchise.js SEQUEL_LEAD). If
  // you are on a set that wraps before then, there is nothing to ask — you will be free.
  // The date on the paper is the first month of shooting — this month if you are free,
  // the month you wrap if you are not, the studio's month if they set one. It used to be
  // written one month later than the shoot actually started, and the calendar disagreed
  // with the contract (Maxi: "the paper says March, the calendar says October").
  const planned = (o.startAt || 0) > now ? o.startAt : 0;
  const soonest = now + (big ? wait : 0);
  const clear = planned && (fit.ok || soonest <= planned);
  const start = Math.max(soonest, planned);
  const sched = { id: 'schedule', label: 'Schedule', value: { months: o.months || 1, start },
    text: `${o.months || 1} month${(o.months || 1) === 1 ? '' : 's'} of shooting, from ${MON[start % 12]} ${Math.floor(start / 12)}`
      + (planned ? ` — the studio's date${s.production && !fit.ok && clear ? `; you wrap "${(fit.until || s.production).title}" before then` : ''}` : '')
      + (s.production && big && !planned ? (fit.ok ? ` — alongside "${s.production.title}"` : ` — after "${(fit.until || s.production).title}" wraps; ${fit.respect ? `a set alongside needs respect ${fit.respect}` : fit.why.replace(/\.$/, '')}`) : ''),
    options: s.production && big && fit.ok && !planned ? [{ id: 'afterWrap', label: `Start after "${s.production.title}" wraps instead (${(s.production.prepLeft || 0) + (s.production.monthsLeft || 0)} mo)`, value: { months: o.months || 1, start: now + (s.production.prepLeft || 0) + (s.production.monthsLeft || 0), after: s.production.title }, odds: 70 }] : [] };
  // A paper you already signed for later (a sequel with the studio's date, a held part) is
  // on the calendar; a shoot that runs past its date is a shoot you cannot be on for both.
  // Said here, before you sign — Maxi's case was two signatures and a recast nobody warned of.
  const later = (s.offers || []).filter((x) => x.signed && x.waitsForWrap && x.id !== o.id && (x.startAt || 0) > now);
  const runsTo = start + (o.prep || 0) + (o.months || 1);
  const clash = later.find((x) => (x.startAt || 0) < runsTo);
  if (clash) sched.text += ` ⚠ You are signed for "${String(clash.projectTitle || '').replace('⭐ ', '')}" from ${MON[clash.startAt % 12]} ${Math.floor(clash.startAt / 12)} — this shoot runs to ${MON[runsTo % 12]}, and they will not hold it past ${MON[(clash.startAt + 2) % 12]}`;
  // No set for it now. They will not simply wait — Maxi: "without the respect you cannot
  // take it and cannot ask to move it, so you choose very carefully; though when you are
  // starting you take everything." So the choice is the paper: ask them to hold it (a
  // roll on how long; they can say no, and then it is gone), or walk off what you are on
  // for it, if it is the bigger picture — and everybody hears you did.
  if (s.production && big && !fit.ok && !clear) {
    const until = fit.until || s.production;
    const need = planned || now;
    // Say WHY there is no room — the exclusive set, the third slot, the standing — not only until when.
    // Maxi: "my second slot is open and the paper still says they wait" — his set was exclusive.
    const why = fit.respect ? ` — a set alongside needs respect ${fit.respect}` : /exclusive/i.test(fit.why || '') ? ` — "${until.title}" is exclusive: nothing alongside it, whatever your standing` : /most anyone/.test(fit.why || '') ? ' — three sets at once is the most anyone can do' : '';
    sched.text = `They need you from ${MON[need % 12]} ${Math.floor(need / 12)}. You are on "${until.title}" until ${MON[(now + wait) % 12]}${why}. It does not start until they say how.`;
    sched.value = { months: o.months || 1, start: need };
    sched.must = true;
    // Your own show's next season is written around you: the network schedules, it does not ask.
    const own = o.kind === 'renewal';
    sched.options = [{ id: 'hold', label: own ? `They schedule the season around you — it starts when you wrap (${wait} mo)` : `Ask them to hold the part until you wrap (${wait} mo)`, value: { months: o.months || 1, start: now + wait, after: until.title }, odds: own ? 100 : holdOdds(wait, s), walkOnNo: !own, sure: own || holdOdds(wait, s) >= 100 }];
    const bigger = (SCALE_RANK[o.scale] || 0) > (SCALE_RANK[until.scale] || 0);
    if (bigger) sched.options.push({ id: 'walk', label: `Walk off "${until.title}" for this — they recast in a week, and everybody hears`, value: { months: o.months || 1, start: now, walkOff: until.id }, odds: 100, sure: true });
  }
  sched.stance = 'ok'; sched.ask = null; sched.result = null;
  return sched;
}
export function draftContract(s, o) {
  if (o.contract) {
    // The paper was drafted once and kept, and the dates on it went stale: a contract
    // opened before you took a set still said "from July" after the set had pushed the
    // start to December — Maxi: "the second shoot is in July on the paper and it is not
    // on the calendar until the premiere?" The schedule stays live until something on it
    // is asked or agreed — even while the rest of the paper is with them, because the
    // rule it enforces (a nobody shoots one thing at a time; hold it or walk) is the deal.
    const k = o.contract;
    const i = k.clauses.findIndex((c) => c.id === 'schedule');
    if (!o.signed && i >= 0 && k.clauses[i].result !== 'agreed' && k.clauses[i].stance !== 'talk') {
      const big = o.tier !== 'supporting' || (o.months || 0) >= 2;
      const exc = k.clauses.find((c) => c.id === 'exclusive');
      k.clauses[i] = scheduleClause(s, o, big, exc ? !!exc.value : false);
    }
    // Signed and waiting: the paper says where it stands NOW — the month it will start given
    // what you are on, and how long they will hold it. It used to keep the sentence it was
    // drafted with ("you wrap X before then") long after X had wrapped and Y had taken its place.
    if (o.signed && i >= 0) {
      const now = (s.year || 0) * 12 + (s.month || 0);
      const fit = canTakeSet(s, o);
      const start = Math.max(o.startAt || now, now + (fit.ok ? 0 : monthsUntilFree(s, o)));
      const until = fit.ok ? null : (fit.until || s.production);
      const late = (o.startAt || 0) < start;
      k.clauses[i].value = { ...(k.clauses[i].value || {}), start };
      k.clauses[i].text = `${o.months || 1} month${(o.months || 1) === 1 ? '' : 's'} of shooting, from ${MON[start % 12]} ${Math.floor(start / 12)}`
        + (until ? ` — after "${until.title}" wraps` : '')
        + (late ? `. They expected you in ${MON[(o.startAt || 0) % 12]} and will not hold it past ${MON[((o.startAt || 0) + 2) % 12]}` : '');
    }
    return k;
  }
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
  // A season under the network's option: the fee is the option's fee, and the only ask is
  // the one the whole cast makes at season three — to the market rate, together.
  if (o.kind === 'renewal' && o.optioned) {
    fee.text += ` — the option's fee: what you signed for, plus five per cent a season`;
    fee.options = (o.marketFee || 0) > unit ? [{ id: 'market', label: `Renegotiate to the market rate — ${money(o.marketFee)} an episode${(o.season || 0) === 3 ? ' (the whole cast is asking)' : ''}`, value: o.marketFee, odds: (o.season || 0) === 3 ? 48 : 18 }] : [];
  }
  clauses.push(fee);
  // The dates — scheduleClause above. The exclusivity is rolled here because the dates depend on it.
  const ex = big && exclusiveFor(o);
  const sched = scheduleClause(s, o, big, ex);
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
  // ── the kinds of paper. Maxi: "what kinds of contracts — analyse what makes the game." ──
  // Television. Your first season on a show comes with the network's options on the next
  // ones: they decide whether there is a season, and you are in it, at a fee that barely
  // moves. Strike it and every season is negotiated fresh; an exit after season three is
  // the way to leave without the fans and the lawyers.
  const firstSeason = !!o.perEpisode && o.scale !== 'episode' && !o.joined && (o.season || 1) <= 1 && o.kind !== 'renewal';
  if (big && firstSeason) {
    const n = o.scale === 'prestige' ? rint(2, 4) : rint(3, 6);
    clauses.push({ id: 'seasons', label: 'Season options', value: n,
      text: `The network holds options on ${n} more season${n === 1 ? '' : 's'} at this fee, plus five per cent a season. Whatever the show becomes, you are in it`,
      options: [{ id: 'two', label: 'Cut it to two seasons', value: Math.min(2, n), odds: 45 },
        { id: 'strike', label: 'Strike it — a season at a time, negotiated fresh', value: 0, odds: tierIdx(s) >= 3 ? 30 : 12 }] });
    clauses.push({ id: 'exit', label: 'Exit', value: 0,
      text: 'No exit: you leave when they write you out, or when the options run out',
      options: [{ id: 'three', label: 'An exit after season three — six months’ notice, no hard feelings', value: 3, odds: 35 }] });
  }
  // Film. Pay-or-play: the whole fee whether or not the picture happens — the one clause
  // that makes a shaky production somebody else's problem. Merchandise on a tentpole: your
  // face on the toys is theirs unless the paper says otherwise. Points instead of pay on a
  // small picture: sixty per cent now and five of the gross, which is a bet on the film.
  if (big && (o.scale === 'blockbuster' || o.scale === 'feature') && tierIdx(s) >= 3) {
    clauses.push({ id: 'payOrPlay', label: 'Pay-or-play', value: false,
      text: 'If the picture stalls you are paid for the days you shot, and nothing else',
      options: [{ id: 'ask', label: 'Pay-or-play — the whole fee, whether or not the picture happens', value: true, odds: tierIdx(s) >= 4 ? 50 : 25 }] });
  }
  if (big && o.scale === 'blockbuster') {
    clauses.push({ id: 'merch', label: 'Merchandise', value: 0,
      text: 'Your face on the toys, the lunchboxes and the game is theirs',
      options: [{ id: 'two', label: 'Ask for two per cent of the merchandise', value: 2, odds: o.kind === 'sequel' ? 40 : 25 }] });
  }
  if (big && (o.scale === 'indie' || o.scale === 'festival') && !o.perEpisode && tierIdx(s) >= 1) {
    clauses.push({ id: 'points', label: 'Points', value: 0,
      text: 'The fee, and no share of what it makes',
      options: [{ id: 'five', label: `Points instead of pay — ${money(Math.round(o.salary * 0.6))} now and five per cent of the gross`, value: 5, odds: 70 }] });
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
// Your own month. Maxi: "if the set is exclusive you should be able to propose your month by
// clicking the calendar, send it, and they decide." Any month from the first you could
// start; the further past the date they wanted, the longer the odds, and a name is waited
// for (holdOdds). On a set with no room a no means they cast somebody else — the same
// deal as asking them to hold it; when you are free and simply want a later start, a no
// means the date stands.
export function earliestStart(s, o) {
  const now = (s.year || 0) * 12 + (s.month || 0);
  const fit = canTakeSet(s, o);
  return now + (fit.ok ? 1 : monthsUntilFree(s, o));
}
export function proposeStart(s, id, month) {
  const o = (s.offers || []).find((x) => x.id === id); if (!o) return s;
  const k = draftContract(s, o);
  if (k.sent || o.signed) return s;
  const c = k.clauses.find((x) => x.id === 'schedule'); if (!c) return s;
  const now = (s.year || 0) * 12 + (s.month || 0);
  const first = earliestStart(s, o);
  if (month < first) { s.lastEvent = `You are not free until ${MON[first % 12]} ${Math.floor(first / 12)}. Pick a month from there.`; return s; }
  const want = (o.startAt || 0) > now ? o.startAt : now;   // when they wanted you
  const delay = Math.max(0, month - want);
  const fit = canTakeSet(s, o);
  const until = fit.ok ? null : (fit.until || s.production);
  const odds = delay === 0 ? 100 : holdOdds(delay, s);
  const op = { id: 'propose', label: `Start in ${MON[month % 12]} ${Math.floor(month / 12)} — your month${delay ? ` (${delay} past their date)` : ''}`, value: { months: o.months || 1, start: month, after: until ? until.title : (delay ? 'your own date' : undefined) }, odds, sure: odds >= 100, walkOnNo: !!c.must };
  c.options = [...c.options.filter((x) => x.id !== 'propose'), op];
  c.stance = 'talk'; c.ask = 'propose';
  s.lastEvent = `You proposed ${MON[month % 12]} ${Math.floor(month / 12)}. Send the paper back and they answer next month.`;
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
  // A held part is held until the date on the paper, and a little past it. If the set you
  // were on ran over — a shutdown, a freeze, a month you could not get up — and you are
  // still not free two months after they expected you, they stop waiting and recast. The
  // shaky picture you stayed on is what cost you the one they were holding.
  for (const o of [...(s.offers || [])]) {
    // One month before they give up: the phone call you get in real life.
    if (o.signed && !canTakeSet(s, o).ok && (o.startAt || 0) + 1 === now && o._warned !== now) {
      o._warned = now;
      const t0 = String(o.projectTitle || 'it').replace('⭐ ', '');
      const until = (canTakeSet(s, o).until || s.production || {}).title || 'the set you are on';
      addTimeline(s, `${studioOf(o)} asked when you will be free for "${t0}". They will not hold it past ${MON[(o.startAt + 2) % 12]} — you are still on "${until}".`, true);
      s.lastEvent = `Business affairs rang about "${t0}". They have held it since ${MON[(o.startAt || now) % 12]} and they will hold it one more month. After that they cast somebody else, and you are still on "${until}".`;
      sendMail(s, { from: `${studioOf(o)} · business affairs`, subj: `"${t0}" — one more month`, tag: 'contract', kind: 'contract',
        body: `We have held ${t0} since ${MON[(o.startAt || now) % 12]}. We can hold it through ${MON[(o.startAt + 2) % 12]} and no longer. If you are not free by then we will have to cast elsewhere, which none of us wants.`,
        cta: [{ label: 'Understood', fx: {}, reply: 'Understood. It does not make you free.' }] });
    }
    if (!o.signed || (o.startAt || 0) + 2 > now || canTakeSet(s, o).ok) continue;
    const title = String(o.projectTitle || 'it').replace('⭐ ', '');
    s.offers = s.offers.filter((x) => x.id !== o.id);
    s.inbox = (s.inbox || []).filter((m) => m.offerId !== o.id);
    addTimeline(s, `${title}: they held it as long as they could. You were still on another set, and they recast.`, true);
    sendMail(s, { from: `${studioOf(o)} · business affairs`, subj: `Re: "${title}"`, tag: 'contract', kind: 'contract',
      body: `We held ${title} for you until ${MON[(o.startAt || now) % 12]} and two months beyond. With no release date from your current production we have had to cast elsewhere. We regret it.`,
      cta: [{ label: 'Delete', fx: {}, reply: 'They waited. Not forever.' }] });
    (s.moments = s.moments || []).push({ id: 'contract', kind: 'bad', title, lines: ['Schedule — they could not wait any longer'], body: `They held the part past the date on the paper. Your other set ran over, and a production cannot wait for a release date nobody will give. It went to somebody who was free.`, walked: true });
  }
  for (const o of (s.offers || [])) {
    const k = o.contract; if (!k || !k.sent || k.sent >= now) continue;
    k.sent = null;
    const lev = leverage(s, o) * Math.pow(0.7, k.round - 1);
    const lines = []; let refused = 0;
    for (const c of k.clauses) {
      if (c.stance !== 'talk') continue;
      const op = c.options.find((x) => x.id === c.ask); if (!op) { c.stance = 'ok'; continue; }
      const roll = Math.random() * 100;
      // Walking off your own set needs nobody's permission; holding a part is about their
      // schedule more than your name, so a nobody is not quite as hopeless there.
      const odds = op.sure ? 100 : op.walkOnNo ? op.odds * Math.max(0.6, lev) : op.odds * lev;
      if (roll < odds) { c.value = op.value; c.text = textFor(c, o); c.result = 'agreed'; c.stance = 'ok'; c.ask = null; lines.push(`${c.label} — agreed`); }
      else if (c.id === 'fee' && roll < odds * 1.8) {
        // Halfway, which is what "no" usually means about money.
        c.value = Math.round((c.value + op.value) / 2); c.text = textFor(c, o); c.result = 'counter'; c.stance = 'ok'; c.ask = null; lines.push(`${c.label} — they came halfway: ${money(c.value)}`);
      } else {
        c.result = 'refused'; c.stance = 'ok'; c.ask = null; refused++; lines.push(`${c.label} — no`);
        if (op.walkOnNo) { k.walked = true; lines[lines.length - 1] = `${c.label} — they could not hold it`; }
      }
    }
    const title = String(o.projectTitle || 'it').replace('⭐ ', '');
    // A part they could not hold went to somebody who was free.
    if (k.walked) {
      s.offers = s.offers.filter((x) => x.id !== o.id);
      s.inbox = (s.inbox || []).filter((m) => m.offerId !== o.id);
      addTimeline(s, `${title}: they could not hold the part. It went to somebody who was free.`, true);
      (s.moments = s.moments || []).push({ id: 'contract', kind: 'bad', title, lines, body: 'They needed somebody in the chair on the first day, and you were on another set. The part went to somebody who was free.', walked: true });
      continue;
    }
    // Push three times and they may decide you are more trouble than you are worth.
    if (refused && k.round >= 3 && chance(35)) {
      k.walked = true;
      s.offers = s.offers.filter((x) => x.id !== o.id);
      s.inbox = (s.inbox || []).filter((m) => m.offerId !== o.id);
      addTimeline(s, `${title}: they stopped answering. Somebody else signed it as written.`, true);
      if (o.kind === 'sequel' || o.kind === 'renewal') noteSequelLoss(s, o, o.story === 'recast' ? 'meeting' : 'talks');
      (s.moments = s.moments || []).push({ id: 'contract', kind: 'bad', title, lines, body: 'Three times back and forth, and on the third they simply stopped replying. Somebody else signed it as written.', walked: true });
      sendMail(s, { from: `${studioOf(o)} · business affairs`, subj: `Re: "${title}" — withdrawn`, tag: 'contract', kind: 'contract', body: `Further to your revisions: the role has been cast elsewhere. We thank you for your interest and wish you well.\n\n${lines.join(' · ')}`, cta: [{ label: 'Delete', fx: {}, reply: 'Gone.' }] });
      continue;
    }
    (s.moments = s.moments || []).push({ id: 'contract', kind: refused ? 'bad' : 'good', title, offerId: o.id, lines,
      body: refused ? (lines.length === refused ? 'They held on everything. The paper is back on your desk as it was — sign it, push again, or walk.' : 'Some of it, not all of it. The paper is back on your desk.')
        : 'They agreed to all of it. The paper is back on your desk, ready to sign.' });
    // And the answer in writing, from business affairs, with the paper attached. Maxi: "when I
    // send it back they reply by email that they agree, and then the offer appears."
    s.inbox = (s.inbox || []).filter((m) => !(m.tag === 'contract' && m.offerId === o.id));
    sendMail(s, { from: `${studioOf(o)} · business affairs`, subj: `Re: "${title}" — your points`, tag: 'contract', kind: 'contract', offerId: o.id,
      body: `${refused ? (lines.length === refused ? 'We are unable to move on the points raised.' : 'We can accommodate some, though not all, of the points raised.') : 'We are pleased to confirm the points raised.'} The revised agreement is attached for signature.\n\n${lines.join('\n')}`,
      cta: [{ label: 'Open the contract', offer: 'open' }] });
  }
  return s;
}
function textFor(c, o) {
  if (c.id === 'fee') return c.perEpisode ? `${money(c.value)} an episode, ${c.episodes} episodes — ${money(c.value * c.episodes)}` : `${money(c.value)} for the picture, paid across the shoot`;
  if (c.id === 'schedule') return `${c.value.months} month${c.value.months === 1 ? '' : 's'} of shooting, from ${MON[c.value.start % 12]} ${Math.floor(c.value.start / 12)}${c.value.after === 'your own date' ? ' — the month you asked for' : c.value.after ? ` — after "${c.value.after}" wraps` : ''}`;
  if (c.id === 'exclusive') return c.value ? 'Nothing else while you shoot — not a day, not a voice session' : 'A day’s work alongside is fine with them';
  if (c.id === 'prep') return `${c.value} month${c.value === 1 ? '' : 's'} before the first day — the body, the accent, the stunts`;
  if (c.id === 'backend') return `${c.value}% of the gross past break-even`;
  if (c.id === 'option') return c.value ? 'They hold an option on two more pictures at this fee' : 'No option — every sequel gets negotiated fresh';
  if (c.id === 'seasons') return c.value ? `The network holds options on ${c.value} more season${c.value === 1 ? '' : 's'} at this fee, plus five per cent a season` : 'No options — a season at a time, negotiated fresh';
  if (c.id === 'exit') return c.value ? `An exit after season ${c.value} — six months’ notice, no hard feelings` : 'No exit: you leave when they write you out';
  if (c.id === 'payOrPlay') return c.value ? 'Pay-or-play: the whole fee, whether or not the picture happens' : 'If the picture stalls you are paid for the days you shot';
  if (c.id === 'merch') return c.value ? `${c.value}% of the merchandise` : 'Your face on the toys is theirs';
  if (c.id === 'points') return c.value ? `Points instead of pay — sixty per cent of the fee now and ${c.value}% of the gross` : 'The fee, and no share of what it makes';
  return c.text;
}

// ── signing ───────────────────────────────────────────────────────────────────
export function signContract(s, id) {
  const o = (s.offers || []).find((x) => x.id === id); if (!o) return s;
  const k = draftContract(s, o);
  if (k.sent) { s.lastEvent = 'It is with them. Wait for the answer.'; return s; }
  const sched = k.clauses.find((c) => c.id === 'schedule');
  if (sched && sched.must && sched.result !== 'agreed') { s.lastEvent = 'They need to know when you can start. Ask them to hold it, or walk off what you are on — and send it.'; return s; }
  // The deal, and there is no way round it: a nobody shoots one thing at a time, and a
  // part won while you are on a set is held — because they agreed to hold it, on a roll
  // they could have lost — or it is taken by walking off. A signed paper never simply
  // waits for a set on its own. Maxi: "a newcomer cannot take a second part; the quest is
  // that he negotiates to hold the shoot, or turns it down." The paper drafted before the
  // set was taken used to slip through here and wait quietly until the wrap.
  const held = !!(sched && sched.value && (sched.value.after || sched.value.walkOff));
  // A sequel with the studio's date months out: you are on a set now, and free before then.
  const nowM = (s.year || 0) * 12 + (s.month || 0);
  const planned = !!(sched && sched.value && sched.value.start > nowM && monthsUntilFree(s, o) <= sched.value.start - nowM);
  if (!held && !planned && !canTakeSet(s, o).ok) {
    const big = o.tier !== 'supporting' || (o.months || 0) >= 2;
    const exc = k.clauses.find((c) => c.id === 'exclusive');
    const i = k.clauses.findIndex((c) => c.id === 'schedule');
    if (i >= 0) k.clauses[i] = scheduleClause(s, o, big, exc ? !!exc.value : false);
    s.lastEvent = 'They need to know when you can start — you are on a set. Ask them to hold it, or walk off what you are on, and send it.';
    return s;
  }
  if (sched && sched.value && sched.value.walkOff) walkOffSet(s, sched.value.walkOff, String(o.projectTitle || '').replace('⭐ ', ''));
  // What was agreed goes onto the offer, and then it is an offer accepted like any other.
  for (const c of k.clauses) {
    if (c.id === 'fee') { if (c.perEpisode) { o.episodeFee = c.value; o.salary = c.value * c.episodes; } else o.salary = c.value; }
    if (c.id === 'schedule') { o.months = c.value.months; o.startAt = c.value.start; }
    if (c.id === 'exclusive') o.exclusive = !!c.value;
    if (c.id === 'prep') o.prep = c.value;
    if (c.id === 'backend') o.backend = c.value;
    if (c.id === 'option') { o.optioned = !!c.value; o.optionParts = c.value ? 3 : 0; }
    if (c.id === 'seasons') o.optionSeasons = c.value || 0;
    if (c.id === 'exit') o.exitAfter = c.value || 0;
    if (c.id === 'payOrPlay') o.payOrPlay = !!c.value;
    if (c.id === 'merch') o.merch = c.value || 0;
    if (c.id === 'points' && c.value) { o.salary = Math.round((o.salary || 0) * 0.6); o.backend = Math.max(o.backend || 0, c.value); o.points = true; }
  }
  o.signed = true;
  const now = (s.year || 0) * 12 + (s.month || 0);
  const title = String(o.projectTitle || 'it').replace('⭐ ', '');
  // Held for you, by agreement — after your current shoot. It waits in Messages, signed,
  // and starts itself the month the set is free. Only a held part ever waits (see above).
  if ((held || planned) && ((o.startAt || 0) > now || !canTakeSet(s, o).ok)) {
    o.waitsForWrap = true; o.deadline = 99;
    s.lastEvent = planned && !held ? `Signed. "${title}" shoots from ${MON[(o.startAt || now) % 12]} ${Math.floor((o.startAt || now) / 12)} — the studio's date. It is on the calendar.` : `Signed. "${title}" is held for you — it starts ${(o.startAt || 0) > now ? `in ${MON[(o.startAt || now) % 12]}` : 'the month you wrap'}.`;
    addTimeline(s, planned && !held ? `Signed for ${title}. Cameras in ${MON[(o.startAt || now) % 12]}.` : `Signed for ${title}. They are holding it until you wrap.`);
    return s;
  }
  addTimeline(s, `Signed for ${title}.`);
  acceptOffer(s, id);
  // Refused — burnt out, in a clinic, a face still healing. It waits like any held part
  // and starts itself the month you can work again (startSigned, below).
  if ((s.offers || []).some((x) => x.id === id)) {
    o.waitsForWrap = true; o.deadline = 99;
    if (!o.startAt) o.startAt = now;
    addTimeline(s, `${title} waits: nobody can put you on a set this month.`);
    return s;
  }
  const started = sets(s).find((p) => p.offerId === id);
  if (started && started.prepLeft > 0) s.lastEvent = `Signed. ${started.prep} month${started.prep === 1 ? '' : 's'} of preparation before the first day of "${title}".`;
  return s;
}
export function passContract(s, id) { return declineOffer(s, id); }

// Signed papers waiting for a free set start themselves. Called from productionTick's
// slot in the month, after a wrap — see engine/time.js.
export function startSigned(s) {
  const now = (s.year || 0) * 12 + (s.month || 0);
  // Earliest date first, and every one that fits — a second paper used to wait behind a first
  // that could not start, and start a month before the studio's date besides.
  const due = (s.offers || []).filter((x) => x.signed && (x.startAt || 0) <= now).sort((a, b) => (a.startAt || 0) - (b.startAt || 0));
  for (const o of due) {
    if (!canTakeSet(s, o).ok) continue;
    acceptOffer(s, o.id);
    // It only stops waiting when it actually started. acceptOffer refuses a month you
    // cannot be insured on a set, and clearing the flag first stranded the paper for good.
    if (!(s.offers || []).some((x) => x.id === o.id)) continue;
    o.waitsForWrap = true;
  }
  return s;
}
