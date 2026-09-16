// The night. A party used to be a button: press Go, the card vanished, a name landed in
// your contacts and a sentence in the log that the Career tab never even showed. Maxi: "I
// press attend and nothing happens. They should be properly thought through."
//
// So a party is a room now. Three hours in it — arriving, midnight, late — and every hour
// you do one thing: talk to somebody, have a drink, the floor, the photographers outside,
// or leave. Who is in the room depends on the room: a house party is working actors and
// somebody's flatmate; a gala is the people who decide things, and an icon by the bar.
// Talking to a stranger is a roll — charisma, looks, how far above you they are, and the
// second drink helps where the fourth does not. What you can leave with: a contact, a lead
// that turns into a real offer next month, a number, a photograph, a rumour, a night you
// would rather not have had. And things get offered in rooms like these that are not on
// any contract — Maxi: "sleeping for a part" — and saying yes has a price that is not paid
// that night.
import { uid } from '../../engine/id.js';
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { setFame, setRespect, quoteFor } from '../meta/status.js';
import { makePerson } from '../life/relationships.js';
import { prospect } from '../life/dating.js';
import { applyBond } from '../life/bonds.js';
import { activeActors, actorById, iconNow, yourRank } from '../world/world.js';
import { generateOffer } from '../career/offers.js';
import { rollStability } from '../career/stability.js';
import { newTitle } from '../world/titles.js';
import { GENRES } from '../meta/news.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
const first = (n) => String(n || '').split(' ')[0];
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);

export const HOURS = ['Arriving', 'Midnight', 'Late'];

// ── who is in the room ────────────────────────────────────────────────────────
// A line under a name: what they are to you, before you have said a word.
function actorLine(s, a) {
  if (iconNow(a)) return 'An icon. Everybody in the room is not looking at them on purpose';
  if ((a.rank || 999) <= 12) return `A-list, #${a.rank} in the business`;
  if ((a.rank || 999) < yourRank(s)) return `#${a.rank} — a few places above you`;
  if ((a.fame || 0) < 20) return 'Just starting. Knows everybody anyway';
  return `A working actor, about where you are`;
}
function actorGuest(s, a, extra) {
  return { id: uid(s, 'g'), kind: 'actor', worldId: a.id, name: a.name, standing: a.fame || 0, icon: iconNow(a), rank: a.rank || 999,
    line: actorLine(s, a), done: false, ...(extra || {}) };
}
const INDUSTRY_LINE = {
  'Casting Director': 'Casts for two studios. A name they remember is a room you get into',
  'Film Director': 'Shooting something next spring. Has not cast it',
  'Studio Producer': 'Decides what gets made. Bored, and looking for someone to talk to',
  'A-list Star': 'Came with an entourage and lost it somewhere',
  'Music Producer': 'Has a studio and a gap in the calendar',
  'Journalist': 'Writes the column people read on Monday. Off the record, allegedly',
  'Manager': 'Manages three people you have heard of',
  'Fellow Actor': 'Between things. Same as you',
};
function industryGuest(s, role) {
  const p = makePerson(s, role);
  return { id: uid(s, 'g'), kind: role === 'Journalist' ? 'press' : 'industry', person: p, name: p.name, role, standing: p.industryWeight || 40, line: INDUSTRY_LINE[role] || 'Somebody', done: false };
}
function prospectGuest(s) {
  const p = prospect(s);
  return { id: uid(s, 'g'), kind: 'prospect', person: p, name: p.name, role: p.job, standing: 0, line: `Not in the business — ${p.job}. Keeps ending up next to you`, done: false };
}
function guestsFor(s, ev, tier) {
  const out = [];
  const pool = activeActors(s);
  const byTier = {
    local: pool.filter((a) => (a.fame || 0) < 50),
    mixer: pool.filter((a) => (a.fame || 0) >= 15 && (a.fame || 0) < 72),
    premiere: pool.filter((a) => (a.fame || 0) >= 35),
    gala: pool.filter((a) => (a.rank || 999) <= 12 || (a.fame || 0) >= 70),
  }[tier.id] || pool;
  // The host of a house party is in their own kitchen.
  if (ev.hostId) { const h = actorById(s, ev.hostId); if (h && h.alive) out.push(actorGuest(s, h, { host: true, line: 'It is their flat. They are on their third drink and pleased you came' })); }
  const nActors = tier.id === 'gala' ? 2 : 1;
  const taken = new Set(out.map((g) => g.worldId));
  for (let i = 0; i < nActors && byTier.length; i++) {
    // A gala has somebody from the top of the list in it, or it is not a gala.
    const top = tier.id === 'gala' && i === 0 ? byTier.filter((x) => (x.rank || 999) <= 12 && !taken.has(x.id)) : [];
    const a = pick(top.length ? top : byTier.filter((x) => !taken.has(x.id))); if (!a) break; taken.add(a.id); out.push(actorGuest(s, a));
  }
  // The people who are the point of the bigger rooms.
  const roles = tier.roles.filter((r) => r !== 'Fellow Actor' && r !== 'A-list Star');
  const nInd = tier.id === 'local' ? (chance(40) ? 1 : 0) : tier.id === 'mixer' ? 2 : 2;
  for (let i = 0; i < nInd && roles.length; i++) out.push(industryGuest(s, pick(roles)));
  // Somebody you already know is there — a cheaper hour than a stranger.
  const known = (s.people || []).filter((p) => (p.industryWeight || 0) >= 45 && (p.relationship || 0) >= 10 && !p.agent && !p.drifted);
  if (known.length && chance(35)) { const p = pick(known); out.push({ id: uid(s, 'g'), kind: 'contact', personId: p.id, name: p.name, role: p.role, standing: p.industryWeight || 40, line: `You know them. Closeness ${Math.round(p.relationship || 0)}`, done: false }); }
  // And somebody who is not in the business at all.
  if (tier.id !== 'gala' && chance(tier.id === 'local' ? 70 : 45)) out.push(prospectGuest(s));
  return out.slice(0, 5);
}

// ── the door ──────────────────────────────────────────────────────────────────
export function startNight(s, ev, tier) {
  s.night = { eventId: ev.id, tier: tier.id, label: tier.label, venue: ev.venue, host: ev.host, hour: 0, drinks: 0, done: false,
    guests: guestsFor(s, ev, tier), log: [{ text: `${tier.label} at ${ev.venue}. ${ev.host ? `Hosted by ${ev.host}. ` : ''}You are in.`, tone: 'note' }],
    gains: { contacts: [], leads: 0, numbers: 0, fame: 0, respect: 0, scandal: 0 }, pending: null, cameras: tier.id === 'premiere' || tier.id === 'gala' };
  return s;
}
function say(s, text, tone = 'note') { s.night.log.push({ text, tone }); }
function hourPasses(s) {
  const n = s.night; n.hour += 1;
  if (n.hour === 1 && chance(30)) incident(s);
  if (n.hour >= HOURS.length && !n.pending) endNight(s);
}

// ── talking to somebody ───────────────────────────────────────────────────────
// What a drink does to you: the second one loosens the room, the fourth loses it.
function drinkMod(n) { return n.drinks === 0 ? 0 : n.drinks <= 2 ? 8 : -18; }
export function talkOdds(s, g) {
  const n = s.night; if (!n) return 0;
  if (g.kind === 'prospect') return clamp(35 + (s.charisma || 0) * 0.3 + (s.looks || 0) * 0.35 - ((g.person.charm || 50) - 50) * 0.3 + drinkMod(n));
  if (g.kind === 'contact') return clamp(60 + (s.charisma || 0) * 0.2 + drinkMod(n));
  if (g.kind === 'press') return clamp(40 + (s.charisma || 0) * 0.4 + drinkMod(n));
  const gap = Math.max(0, (g.standing || 0) - (s.fame || 0));
  return Math.max(5, Math.min(92, 30 + (s.charisma || 0) * 0.35 + (s.looks || 0) * 0.1 - gap * 0.5 + (g.host ? 12 : 0) + drinkMod(n)));
}
export function talkTo(s, guestId) {
  const n = s.night; if (!n || n.done || n.pending) return s;
  const g = n.guests.find((x) => x.id === guestId); if (!g || g.done) return s;
  g.done = true;
  const odds = talkOdds(s, g), ok = chance(odds);
  g.went = ok ? 'good' : 'bad';
  if (g.kind === 'actor') talkActor(s, g, ok);
  else if (g.kind === 'industry') talkIndustry(s, g, ok);
  else if (g.kind === 'contact') talkContact(s, g, ok);
  else if (g.kind === 'press') talkPress(s, g, ok);
  else if (g.kind === 'prospect') talkProspect(s, g, ok);
  hourPasses(s);
  return s;
}
function addContact(s, fields) {
  const p = { id: uid(s, 'p'), relationship: rint(22, 38), met: `${s.year}`, ...fields };
  (s.people = s.people || []).push(p);
  s.night.gains.contacts.push(p.name);
  return p;
}
function talkActor(s, g, ok) {
  const n = s.night;
  const known = (s.people || []).find((p) => p.worldId === g.worldId);
  if (ok) {
    if (known) { const d = applyBond(s, known, rint(6, 12)); say(s, `${g.name} again. An hour by the window; closeness +${d}.`, 'good'); }
    else {
      addContact(s, { name: g.name, worldId: g.worldId, role: g.icon ? 'Icon' : g.rank <= 12 ? 'Star' : 'Fellow Actor', industryWeight: Math.round(g.standing), unlocks: g.rank <= 12 ? 'aaa' : null });
      say(s, g.icon ? `${g.name} talked to you for twenty minutes, and the room saw it.` : `You and ${g.name} closed the kitchen. They are in your contacts now.`, 'good');
      if (g.icon) { setRespect(s, (s.respect || 0) + 2); n.gains.respect += 2; }
    }
    // A famous face asking if you want to get out of here. Rare, and it is in the papers.
    if (!g.host && !known && chance(18)) n.pending = { id: 'leaveWith', who: g.name, famous: true, text: `${first(g.name)} asks if you want to get out of here.` };
  } else {
    say(s, g.icon ? `${g.name} said "lovely to meet you" the way people say it to waiters.` : `${g.name} nodded, and looked past you for somebody else.`, 'bad');
    s.mental = clamp((s.mental || 50) - 2);
    if (n.drinks >= 3 && chance(40)) { s.scandal = clamp((s.scandal || 0) + rint(3, 6)); n.gains.scandal += 4; say(s, 'You said something about their last picture. Somebody filmed it.', 'bad'); }
  }
}
// Where the offers come from that are not on any contract.
function talkIndustry(s, g, ok) {
  const n = s.night; const p = g.person;
  if (!ok) { say(s, `${g.name} (${g.role}) gave you a card that turned out to be somebody else's.`, 'bad'); s.mental = clamp((s.mental || 50) - 2); return; }
  addContact(s, { name: p.name, role: p.role, industryWeight: p.industryWeight, unlocks: p.unlocks });
  say(s, `${g.name} — ${g.role}. You talked for an hour. They are in your contacts.`, 'good');
  const leadOdds = { 'Casting Director': 45, 'Manager': 40, 'Film Director': 35, 'Studio Producer': 35, 'Music Producer': s.dream === 'singer' ? 40 : 10 }[g.role] || 0;
  const decides = g.role === 'Film Director' || g.role === 'Studio Producer';
  if (decides && (p.industryWeight || 0) >= 70 && n.tier !== 'local' && chance(22)) {
    n.pending = { id: 'couch', who: g.name, role: g.role, weight: p.industryWeight, text: `${first(g.name)} has a part, and a car outside, and says the two things are the same conversation.` };
    return;
  }
  if (chance(leadOdds)) {
    (s.leads = s.leads || []).push({ due: stamp(s) + 1, from: p.name, role: p.role, weight: p.industryWeight || 50 });
    n.gains.leads += 1;
    say(s, `"Call the office on Monday," ${first(g.name)} says. It sounds like they mean it.`, 'good');
  }
}
function talkContact(s, g, ok) {
  const p = (s.people || []).find((x) => x.id === g.personId); if (!p) return;
  if (ok) { const d = applyBond(s, p, rint(7, 13)); say(s, `${g.name}, on the stairs, for most of an hour. Closeness +${d}.`, 'good'); }
  else { const d = applyBond(s, p, -rint(1, 3)); say(s, `${g.name} was with people. You got a wave. Closeness ${d}.`, 'bad'); }
}
function talkPress(s, g, ok) {
  const n = s.night;
  if (ok) { const gain = (s.fame || 0) < 100 ? 1 : 0; setFame(s, (s.fame || 0) + gain); n.gains.fame += gain; say(s, `${g.name} liked you. Two lines on Monday, and they are kind.`, 'good'); }
  else if (chance(50)) { s.scandal = clamp((s.scandal || 0) + 2); n.gains.scandal += 2; say(s, `${g.name} quoted you. Not the sentence you meant.`, 'bad'); }
  else say(s, `${g.name} wrote nothing down, which is worse.`, 'bad');
}
function talkProspect(s, g, ok) {
  const n = s.night;
  if (!ok) { say(s, `${g.name} laughed at the wrong bit and went to find their friends.`, 'bad'); return; }
  n.pending = { id: 'prospect', guestId: g.id, who: g.name, text: `${first(g.name)} is still next to you at one in the morning.` };
}

// ── the things that get asked ─────────────────────────────────────────────────
export function nightChoice(s, choiceId) {
  const n = s.night; if (!n || !n.pending) return s;
  const q = n.pending; n.pending = null;
  if (q.id === 'prospect') {
    const g = n.guests.find((x) => x.id === q.guestId);
    if (choiceId === 'number') { if (g) (s.datingPool = s.datingPool || []).push(g.person); n.gains.numbers += 1; say(s, `You got ${first(q.who)}'s number.`, 'good'); }
    else if (choiceId === 'home') oneNight(s, q.who, false);
    else say(s, `You said goodnight to ${first(q.who)}.`, 'note');
  } else if (q.id === 'leaveWith') {
    if (choiceId === 'home') oneNight(s, q.who, true);
    else say(s, `You said you had an early call. ${first(q.who)} shrugged.`, 'note');
  } else if (q.id === 'couch') {
    if (choiceId === 'yes') {
      (s.leads = s.leads || []).push({ due: stamp(s) + 1, from: q.who, role: q.role, weight: q.weight, sure: true, couch: true });
      n.gains.leads += 1;
      s.mental = clamp((s.mental || 50) - rint(6, 12));
      say(s, `You went. The part is yours; you will be told so on Monday. You do not feel like somebody who got a part.`, 'bad');
      addTimeline(s, `A part, from ${q.who}, that was not offered in a room.`, true);
    } else { setRespect(s, (s.respect || 0) + 2); n.gains.respect += 2; say(s, `You said goodnight. ${first(q.who)} said "your loss" like it was a line from something.`, 'good'); }
  } else if (q.id === 'dig') {
    if (choiceId === 'bite') {
      if (chance(45 + (s.charisma || 0) * 0.25)) { setRespect(s, (s.respect || 0) + 3); n.gains.respect += 3; say(s, `You answered. The room laughed with you, not with ${first(q.who)}.`, 'good'); }
      else { s.scandal = clamp((s.scandal || 0) + rint(2, 5)); n.gains.scandal += 3; s.mental = clamp((s.mental || 50) - 3); say(s, `You answered. The room went quiet. Somebody posted it.`, 'bad'); }
    } else { s.mental = clamp((s.mental || 50) - 2); setRespect(s, (s.respect || 0) + 1); n.gains.respect += 1; say(s, `You laughed. It cost you something and looked like it cost nothing.`, 'note'); }
  }
  if (n.hour >= HOURS.length) endNight(s);
  return s;
}
// One night. Cheap to have, expensive to be seen having — and, if there is somebody at
// home, expensive whether or not you are seen.
function oneNight(s, who, famous) {
  const n = s.night;
  n.hour = HOURS.length;   // leaving with somebody is leaving
  s.mental = clamp((s.mental || 50) + rint(4, 8));
  say(s, `You left with ${first(who)}.`, 'note');
  if (famous || (s.fame || 0) >= 40) {
    if (chance(famous ? 55 : 25)) { const f = famous ? rint(1, 3) : 1; setFame(s, (s.fame || 0) + f); n.gains.fame += f; s.scandal = clamp((s.scandal || 0) + rint(2, 5)); n.gains.scandal += 3; say(s, `Photographed leaving together. It is everywhere by lunchtime.`, 'bad'); }
  }
  if (s.partner && chance(45)) {
    const d = applyBond(s, s.partner, -rint(20, 35));
    say(s, `${first(s.partner.name)} heard. Closeness ${d}.`, 'bad');
    addTimeline(s, `${first(s.partner.name)} found out about the night at ${n.venue}.`, true);
  }
}
// Midnight: somebody a few places above you says something for the room.
function incident(s) {
  const n = s.night;
  const rival = n.guests.find((g) => g.kind === 'actor' && !g.host && g.rank < yourRank(s) && !g.done);
  if (!rival) return;
  n.pending = { id: 'dig', who: rival.name, text: `${first(rival.name)} says, loudly enough, that they thought you had retired. People turn around.` };
}

// ── the rest of the room ──────────────────────────────────────────────────────
export function nightAct(s, actId) {
  const n = s.night; if (!n || n.done || n.pending) return s;
  if (actId === 'drink') {
    n.drinks += 1;
    if (n.drinks <= 2) { s.mental = clamp((s.mental || 50) + 2); say(s, n.drinks === 1 ? 'A drink. The room gets easier.' : 'Another. You are funnier than you were.', 'note'); }
    else say(s, n.drinks === 3 ? 'A third. The room tilts a little.' : 'You have lost count. So has everybody watching.', 'bad');
    return s;   // a drink is a minute at the bar, not an hour — the hours are what you do after it
  } else if (actId === 'floor') {
    s.mental = clamp((s.mental || 50) + rint(2, 4));
    if (n.tier !== 'gala' && chance(35) && n.guests.length < 6) { const g = prospectGuest(s); g.line = 'Danced next to you for an hour. Still here'; n.guests.push(g); say(s, `An hour on the floor. ${first(g.name)} kept ending up next to you.`, 'good'); }
    else say(s, 'An hour on the floor. Nothing happened, which was the point.', 'note');
  } else if (actId === 'cameras') {
    if (!n.cameras) return s;
    n.cameras = false;
    if (chance(35 + (s.looks || 0) * 0.5)) { const f = n.tier === 'gala' ? rint(1, 2) : 1; setFame(s, (s.fame || 0) + f); n.gains.fame += f; say(s, 'The cameras outside. You gave them the good side, and they used it.', 'good'); }
    else { s.scandal = clamp((s.scandal || 0) + 1); s.mental = clamp((s.mental || 50) - 2); say(s, 'The cameras outside. One angle, and they picked it.', 'bad'); }
    return s;   // the carpet is on the way in; it does not cost an hour
  } else if (actId === 'leave') { endNight(s); return s; }
  hourPasses(s);
  return s;
}

// ── the morning after ─────────────────────────────────────────────────────────
function endNight(s) {
  const n = s.night; if (!n || n.done) return;
  n.done = true;
  const gain = { local: 0, mixer: 1, premiere: 1, gala: 2 }[n.tier] || 0;
  if (gain) { setFame(s, (s.fame || 0) + gain); n.gains.fame += gain; }
  s.mental = clamp((s.mental || 50) + rint(1, 3));
  if (n.drinks >= 3) {
    s.ap = Math.max(0, (s.ap || 0) - 10); s.mental = clamp((s.mental || 50) - 3);
    if (s.drink) s.drink.level = clamp((s.drink.level || 0) + rint(1, 3));
    say(s, 'The next day is gone. Energy −10.', 'bad');
  }
  const g = n.gains; const bits = [];
  if (g.contacts.length) bits.push(`met ${g.contacts.join(' and ')}`);
  if (g.leads) bits.push(`${g.leads} lead${g.leads === 1 ? '' : 's'}`);
  if (g.numbers) bits.push(`${g.numbers} number${g.numbers === 1 ? '' : 's'}`);
  s.lastEvent = `${n.label} at ${n.venue}${bits.length ? ` — ${bits.join(', ')}` : ' — nothing much, and a good night'}.`;
  addTimeline(s, `${n.label} at ${n.venue}${g.contacts.length ? ` — met ${g.contacts.join(', ')}` : ''}.`);
}
export function leaveNight(s) { if (s.night && !s.night.done) endNight(s); s.night = null; return s; }

// ── Monday ────────────────────────────────────────────────────────────────────
// A lead is a phone call that comes, or does not. From offersTick's slot in the month.
export function nightTick(s) {
  const now = stamp(s);
  const due = (s.leads || []).filter((l) => l.due <= now);
  if (!due.length) return s;
  s.leads = (s.leads || []).filter((l) => l.due > now);
  for (const l of due) {
    // Somebody who said "call the office" and meant it about a third of the time.
    if (!l.sure && !chance(35 + (l.weight || 50) * 0.3)) { addTimeline(s, `${l.from} did not take the call.`); continue; }
    const o = leadOffer(s, l);
    (s.offers = s.offers || []).push(o);
    s.lastEvent = `${l.from}'s office called. "${o.projectTitle.replace('⭐ ', '')}" — it is in Messages.`;
    addTimeline(s, `${l.from} came through: ${o.projectTitle.replace('⭐ ', '')}.`);
  }
  return s;
}
function leadOffer(s, l) {
  const o = generateOffer(s);
  o.via = 'party'; o.from = l.from;
  // Somebody who decides things offers you a real part, whatever the board says you are
  // worth this month. The one from the car outside is a lead, and everybody on it knows.
  if ((l.weight || 0) >= 80 && (l.sure || (s.fame || 0) >= 35)) {
    const big = l.sure || (s.fame || 0) >= 50;
    o.tier = big ? 'tentpole' : 'lead'; o.scale = big ? 'blockbuster' : 'feature'; o.role = 'Lead';
    o.type = s.dream === 'singer' ? (big ? 'World Tour' : 'Album') : (big ? 'Blockbuster' : 'Feature Film');
    o.projectTitle = (big ? '⭐ ' : '') + newTitle(s, o.genre || pick(GENRES));
    o.salary = Math.round((quoteFor(s, big ? 'film_tentpole' : 'film_studio') || quoteFor(s, 'film_indie') || 50000) * (0.85 + Math.random() * 0.4));
    o.fame = big ? 9 : 5; o.prestigeScore = big ? rint(60, 90) : rint(45, 70); o.months = rint(4, 9); o.stability = rollStability(o.scale);
  }
  if (l.couch) o.note = `${first(l.from)} gave you this. The set will know it.`;
  o.deadline = rint(2, 3);
  return o;
}
