// The night. A party used to be a button: press Go, the card vanished, a name landed in
// your contacts and a sentence in the log that the Career tab never even showed. Maxi: "I
// press attend and nothing happens. They should be properly thought through."
//
// So a party is a room now: a bar, a floor, the booths, a terrace, a door. Three hours,
// and every hour you do one thing — go over to somebody, the floor, the terrace, or leave.
// Going over to somebody at the bar or in a booth starts with a glass in your hand (turn
// it down and you have started cold), and the glass is the whole dilemma: two or three
// open the room up, the fourth loses the thread, and past ninety the night ends without
// you — Maxi: "the player must understand they need to drink, and risk getting drunk."
//
// A talk is three turns, not a button. They say something; you pick a line; every line
// has a tone (flattery, a joke, honest, business, flirting, bragging) and every person
// likes two tones and hates one — you cannot see which, you read it off their answer:
// leaning in, checking the room, finishing the drink. Maxi: "when the player presses a
// button the person must answer, and you cannot press everything at once." What you can
// leave with: a contact (world actors by id, so the same person keeps growing), a lead
// that turns into a real offer next month or does not, a number, a photograph, a rumour,
// a rival's dig, a night with somebody, and a part offered from a car outside.
import { uid } from '../../engine/id.js';
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { setFame, setRespect, quoteFor } from '../meta/status.js';
import { makePerson } from '../life/relationships.js';
import { prospect } from '../life/dating.js';
import { applyBond } from '../life/bonds.js';
import { level as drinkLevel, hooked } from '../life/drink.js';
import { weightKg } from '../life/face.js';
import { activeActors, actorById, iconNow, yourRank } from '../world/world.js';
import { generateOffer } from '../career/offers.js';
import { rollStability } from '../career/stability.js';
import { newTitle } from '../world/titles.js';
import { GENRES, hotGenre } from '../meta/news.js';
import { addSentListing } from '../career/castings.js';
import { sendSms } from './sms.js';
import { priceFactor } from '../life/face.js';
import { HOUSING } from '../../engine/economy.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
const first = (n) => String(n || '').split(' ')[0];
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);

export const HOURS = ['Arriving', 'Eleven', 'Midnight', 'Late'];
export const ZONES = {
  bar: { label: 'The bar', toast: true },
  booth: { label: 'The booths', toast: true },
  floor: { label: 'The floor', toast: false },
  terrace: { label: 'The terrace', toast: false },
};
// What a glass costs. A house party is somebody's fridge; a club is a club; the studio's
// nights have an open bar, which is why people drink at them.
const DRINK_PRICE = { local: 0, mixer: 24, premiere: 0, gala: 0, yours: 0 };
export const TONES = ['flatter', 'joke', 'honest', 'business', 'flirt', 'brag'];
export const TONE_LABEL = { flatter: 'flattery', joke: 'a joke', honest: 'honest', business: 'business', flirt: 'flirting', brag: 'bragging' };

// ── who is in the room ────────────────────────────────────────────────────────
function actorLine(s, a) {
  if (iconNow(a)) return 'An icon. Everybody in the room is not looking at them on purpose';
  if ((a.rank || 999) <= 12) return `A-list, #${a.rank} in the business`;
  if ((a.rank || 999) < yourRank(s)) return `#${a.rank} — a few places above you`;
  if ((a.fame || 0) < 20) return 'Just starting. Knows everybody anyway';
  return 'A working actor, about where you are';
}
// What each kind of person tends to like hearing. Two are drawn from the front of the
// list, the hate from the back — so a casting director mostly wants business and honesty
// and mostly hates flirting, but not every one of them.
const TASTES = {
  'Casting Director': ['business', 'honest', 'joke', 'flatter', 'brag', 'flirt'],
  'Film Director': ['honest', 'joke', 'business', 'flirt', 'brag', 'flatter'],
  'Studio Producer': ['flatter', 'business', 'brag', 'joke', 'flirt', 'honest'],
  'Manager': ['business', 'flatter', 'brag', 'honest', 'joke', 'flirt'],
  'Music Producer': ['joke', 'honest', 'flatter', 'business', 'flirt', 'brag'],
  'Journalist': ['joke', 'honest', 'flatter', 'flirt', 'brag', 'business'],
  actor: ['flatter', 'joke', 'flirt', 'honest', 'business', 'brag'],
  icon: ['honest', 'joke', 'business', 'flirt', 'brag', 'flatter'],
  prospect: ['joke', 'flirt', 'honest', 'flatter', 'business', 'brag'],
  contact: ['honest', 'joke', 'business', 'flatter', 'flirt', 'brag'],
};
function tasteFor(key) {
  const order = TASTES[key] || TASTES.actor;
  const likes = [order[0], chance(65) ? order[1] : order[2]];
  const hates = chance(70) ? order[5] : order[4];
  return { likes, hates };
}
function place(kind, role, tier) {
  if (kind === 'prospect') return chance(60) ? 'floor' : 'bar';
  if (kind === 'press') return chance(60) ? 'terrace' : 'bar';
  if (kind === 'actor') return tier === 'gala' ? 'booth' : pick(['bar', 'floor', 'booth']);
  if (/Producer|Director/.test(role || '')) return chance(65) ? 'booth' : 'bar';
  return pick(['bar', 'booth', 'terrace']);
}
function guest(s, fields) {
  return { id: uid(s, 'g'), done: false, came: false, drunk: rint(0, 55), taste: tasteFor(fields.tasteKey || fields.kind), ...fields };
}
function actorGuest(s, a, tier, extra) {
  return guest(s, { kind: 'actor', worldId: a.id, name: a.name, standing: a.fame || 0, icon: iconNow(a), rank: a.rank || 999,
    line: actorLine(s, a), zone: place('actor', null, tier), tasteKey: iconNow(a) ? 'icon' : 'actor', ...(extra || {}) });
}
const INDUSTRY_LINE = {
  'Casting Director': 'Casts for two studios. A name they remember is a room you get into',
  'Film Director': 'Shooting something next spring. Has not cast it',
  'Studio Producer': 'Decides what gets made. Bored, and looking for someone to talk to',
  'Music Producer': 'Has a studio and a gap in the calendar',
  'Journalist': 'Writes the column people read on Monday. Off the record, allegedly',
  'Manager': 'Manages three people you have heard of',
};
function industryGuest(s, role, tier) {
  const p = makePerson(s, role);
  return guest(s, { kind: role === 'Journalist' ? 'press' : 'industry', person: p, name: p.name, role, standing: p.industryWeight || 40, line: INDUSTRY_LINE[role] || 'Somebody', zone: place(role === 'Journalist' ? 'press' : 'industry', role, tier), tasteKey: role });
}
// The names. Maxi: "at premieres you can meet people from the top ten, directors from the
// lists, people with Askers — with them it is very hard; after the talk a test opens; win
// their trust and, very rarely, they fall for you and it is an A-list offer on the spot."
// One of them at a premiere, one or two at a gala: an actor from the top of the list or
// with an Asker, or a director whose picture everybody saw last year.
function heavyGuest(s, tier) {
  const w = s.world || {}; const yrs = w.years || {}; const last = yrs[(s.year || 0) - 1];
  const actors = (w.actors || []).filter((a) => a.alive && !a.retired && ((a.rank || 999) <= 10 || (a.askers || 0) > 0));
  if (actors.length && chance(tier === 'gala' ? 50 : 60)) {
    const a = pick(actors);
    const why = (a.rank || 999) <= 3 ? `#${a.rank} in the business` : (a.askers || 0) > 0 ? `${a.askers} Asker${a.askers === 1 ? '' : 's'}` : `#${a.rank} in the business`;
    return guest(s, { kind: 'actor', heavy: true, why, worldId: a.id, name: a.name, standing: Math.max(88, a.fame || 0), icon: iconNow(a), rank: a.rank || 999, line: `${why}. Everybody here wants a minute; you get three`, zone: 'booth', tasteKey: 'icon' });
  }
  const p = makePerson(s, 'Film Director'); p.industryWeight = rint(86, 97);
  const film = last && last.films && last.films.length ? pick(last.films.slice(0, 5)).title : null;
  const why = film ? `directed "${film}"` : 'directs the pictures on the lists';
  return guest(s, { kind: 'industry', heavy: true, why, person: p, name: p.name, role: 'Film Director', standing: 92, line: `${why.charAt(0).toUpperCase() + why.slice(1)}. Does not do small talk`, zone: 'booth', tasteKey: 'Film Director' });
}
function prospectGuest(s) {
  const p = prospect(s);
  return guest(s, { kind: 'prospect', person: p, name: p.name, role: p.job, standing: 0, line: `Not in the business — ${p.job}`, zone: place('prospect'), tasteKey: 'prospect' });
}
// The crowd. Maxi: "a lot of extra people, and you have to find the one you need — know
// the list in advance, who is who, and find them; that is a quiz too." So the room has
// eight to twelve people who are nobody in particular — an assistant, somebody's plus
// one, a man who says he produces — and the names are not on the figures. Going over to
// find out who somebody is costs a look, and three looks is an hour.
const EXTRA_LINES = ['Somebody\'s assistant. Very polite about it.', 'A plus one. Their date is in the toilets.', '"I produce," they say. They do not say what.', 'A model, between agencies.', 'Somebody from the finance side who wanted to see a party.', 'A cousin of the host.', 'A DJ who is not the DJ tonight.', 'A man who knows everybody\'s name and nobody\'s number.', 'Somebody who was on television once.', 'A journalist\'s friend, which is not the same thing.'];
const EXTRA_NAMES = ['Kai', 'Noa', 'Remy', 'Jules', 'Sasha', 'Ari', 'Lou', 'Dana', 'Nico', 'Sam', 'Robin', 'Alex', 'Mika', 'Toni', 'Eli', 'Jo'];
function extraGuest(s, tier) {
  const dressed = chance(30);
  // One in seven is somebody's assistant and can get a page to their boss.
  const useful = chance(14);
  return guest(s, { kind: 'extra', name: pick(EXTRA_NAMES) + ' ' + pick(['K.', 'M.', 'R.', 'S.', 'T.', 'V.']), line: useful ? 'Assistant to somebody who decides things. Very polite about it' : pick(EXTRA_LINES), standing: 0, zone: pick(Object.keys(ZONES)), tasteKey: 'prospect', mask: dressed ? pick(['industry', 'actor']) : null, useful });
}
export function LOOKS_AN_HOUR() { return 3; }
function guestsFor(s, ev, tier) {
  const out = [];
  const pool = activeActors(s);
  const byTier = {
    local: pool.filter((a) => (a.fame || 0) < 50),
    mixer: pool.filter((a) => (a.fame || 0) >= 15 && (a.fame || 0) < 72),
    premiere: pool.filter((a) => (a.fame || 0) >= 35),
    gala: pool.filter((a) => (a.rank || 999) <= 12 || (a.fame || 0) >= 70),
  }[tier.id] || pool;
  if (ev.hostId) { const h = actorById(s, ev.hostId); if (h && h.alive) out.push(actorGuest(s, h, tier.id, { host: true, zone: 'bar', line: 'It is their flat. On their third drink and pleased you came' })); }
  if (tier.id === 'premiere' || tier.id === 'gala') { out.push(heavyGuest(s, tier.id)); if (tier.id === 'gala' && chance(50)) out.push(heavyGuest(s, tier.id)); }
  if (tier.id === 'yours') return hostGuests(s, out);
  const nActors = tier.id === 'gala' ? 2 : 1;
  const taken = new Set(out.map((g) => g.worldId && !g.heavy ? g.worldId : g.worldId));
  for (let i = 0; i < nActors && byTier.length; i++) {
    const top = tier.id === 'gala' && i === 0 ? byTier.filter((x) => (x.rank || 999) <= 12 && !taken.has(x.id)) : [];
    const a = pick(top.length ? top : byTier.filter((x) => !taken.has(x.id))); if (!a) break; taken.add(a.id); out.push(actorGuest(s, a, tier.id));
  }
  const roles = tier.roles.filter((r) => r !== 'Fellow Actor' && r !== 'A-list Star');
  const nInd = tier.id === 'local' ? (chance(40) ? 1 : 0) : 2;
  for (let i = 0; i < nInd && roles.length; i++) out.push(industryGuest(s, pick(roles), tier.id));
  const known = (s.people || []).filter((p) => (p.industryWeight || 0) >= 45 && (p.relationship || 0) >= 10 && !p.agent && !p.drifted);
  if (known.length && chance(35)) { const p = pick(known); out.push(guest(s, { kind: 'contact', personId: p.id, name: p.name, role: p.role, standing: p.industryWeight || 40, line: `You know them. Closeness ${Math.round(p.relationship || 0)}`, zone: pick(['bar', 'booth', 'terrace']), tasteKey: 'contact' })); }
  if (tier.id !== 'gala' && chance(tier.id === 'local' ? 70 : 45)) out.push(prospectGuest(s));
  const named = out.slice(0, 6);
  const n = tier.id === 'local' ? rint(5, 8) : rint(8, 12);
  for (let i = 0; i < n; i++) named.push(extraGuest(s, tier.id));
  return named;
}
// Who is expected — on the card, before the night, so the room can be read in advance.
export function expectedAt(s, ev, tier) {
  if (!ev.guestsPre) ev.guestsPre = guestsFor(s, ev, tier);
  // Names, and a role only where you would know it already: the names you know, and the
  // names everybody knows. What a stranger does you find out by asking.
  return ev.guestsPre.filter((g) => g.kind !== 'extra').map((g) => ({ name: g.name, heavy: !!g.heavy, why: g.why || null, role: g.kind === 'contact' ? 'someone you know' : g.kind === 'actor' && (g.icon || (g.rank || 999) <= 12) ? 'a name' : '' }));
}
// What a night costs in energy. A house party is an evening; a gala is a day of getting
// ready and a night of standing up.
export function energyFor(tierId) { return { local: 15, mixer: 20, premiere: 25, gala: 30, yours: 25 }[tierId] || 20; }

// ── your own night ────────────────────────────────────────────────────────────
// Maxi: "when you are a star you can throw your own parties, invite people, and agree
// pictures you would like to make — a director, you propose the genre, the budget, when,
// the title; some time later an SMS: an offer, or another time." A star with a home to
// fill can host: the people in your phone who decide things, the actors you know from the
// world, two names who come because it is your house, and a crowd.
export function canHost(s) {
  if ((s.fame || 0) < 60) return { ok: false, why: 'Nobody comes to a nobody\'s party. Star, at least.' };
  if (!s.hasApartment || !['flat', 'house', 'penthouse'].includes(s.housing)) return { ok: false, why: 'A rented room is not a place people come to. A flat, at least.' };
  return { ok: true, cost: hostCost(s) };
}
export function hostCost(s) { return Math.round(({ flat: 6000, house: 14000, penthouse: 30000 }[s.housing] || 8000) * priceFactor(s)); }
function hostGuests(s, out) {
  const known = (s.people || []).filter((p) => !p.agent && !p.drifted && (p.relationship || 0) >= 20);
  const decide = known.filter((p) => /Director|Producer|Casting|Manager/.test(p.role || '')).sort((a, b) => (b.industryWeight || 0) - (a.industryWeight || 0)).slice(0, 3);
  for (const p of decide) out.push(guest(s, { kind: 'contact', personId: p.id, name: p.name, role: p.role, standing: p.industryWeight || 40, line: `You know them. Closeness ${Math.round(p.relationship || 0)}`, zone: 'booth', tasteKey: 'contact', decides: /Director|Producer/.test(p.role || '') }));
  const stars = known.filter((p) => p.worldId).slice(0, 2);
  for (const p of stars) { const a = actorById(s, p.worldId); if (a && a.alive) out.push(guest(s, { kind: 'contact', personId: p.id, worldId: a.id, name: a.name, role: p.role, standing: a.fame || 40, line: `You know them. Closeness ${Math.round(p.relationship || 0)}`, zone: pick(['bar', 'floor']), tasteKey: 'contact' })); }
  // Two who came because it is your house: a director and a producer you have not met.
  for (const role of ['Film Director', 'Studio Producer']) { const p = makePerson(s, role); p.industryWeight = rint(70, 92); out.push(guest(s, { kind: 'industry', person: p, name: p.name, role, standing: p.industryWeight, line: INDUSTRY_LINE[role], zone: 'booth', tasteKey: role, decides: true })); }
  if (chance(60)) out.push(prospectGuest(s));
  const n = rint(6, 9);
  for (let i = 0; i < n; i++) out.push(extraGuest(s, 'local'));
  return out;
}
export function hostNight(s) {
  const fit = canHost(s); if (!fit.ok) { s.lastEvent = fit.why; return s; }
  const st = stamp(s);
  if (s._wentOut === st) { s.lastEvent = 'You have been out this month already. Next month.'; return s; }
  if ((s.cash || 0) < fit.cost) { s.lastEvent = `A night like that costs €${fit.cost.toLocaleString()}. Not this month.`; return s; }
  s.cash -= fit.cost; s._wentOut = st;
  const ev = { id: uid(s, 'ev'), tier: 'yours', venue: (HOUSING[s.housing] || {}).label || 'your place', host: s.name, hostId: null };
  addTimeline(s, `Threw a night at home — €${fit.cost.toLocaleString()}.`);
  return startNight(s, ev, { id: 'yours', label: 'Your night', roles: ['Film Director', 'Studio Producer'] });
}

// ── the door ──────────────────────────────────────────────────────────────────
export function startNight(s, ev, tier) {
  s.night = { eventId: ev.id, tier: tier.id, label: tier.label, venue: ev.venue, host: ev.host, hour: 0, buzz: 0, spent: 0, price: DRINK_PRICE[tier.id] || 0,
    you: 'door', pos: null, looks: 0, guests: (ev.guestsPre && ev.guestsPre.length ? ev.guestsPre : guestsFor(s, ev, tier)).map((g) => ({ ...g, done: false, seen: false, came: false })), talk: null, done: false, blackout: false,
    log: [{ text: `${tier.label} at ${ev.venue}. ${ev.host ? `Hosted by ${ev.host}. ` : ''}You are in.`, tone: 'note' }],
    gains: { contacts: [], leads: 0, numbers: 0, fame: 0, respect: 0, scandal: 0 }, pending: null, cameras: tier.id === 'premiere' || tier.id === 'gala' };
  approach(s);
  return s;
}
// Somebody comes over. A face people know, or one they want to look at, does not work the
// room — the room works them. Maxi: "with looks at a hundred, people come up to you." A
// guest who came over is an easier talk and does not cost an hour.
function approach(s) {
  const n = s.night;
  const odds = Math.max(0, Math.min(75, ((s.looks || 0) - 45) * 0.9 + (s.fame || 0) * 0.35 + (n.buzz >= 20 && n.buzz <= 50 ? 8 : 0)));
  if (!chance(odds)) return;
  const g = pick(n.guests.filter((x) => !x.done && !x.came && !x.host && x.kind !== 'extra'));
  if (!g) return;
  g.came = true; g.seen = true; g.zone = n.you === 'door' ? g.zone : n.you;
  say(s, `${first(g.name)} came over to you.`, 'good');
}
function say(s, text, tone = 'note') { s.night.log.push({ text, tone }); }
// Walking anywhere in the room. Free — the hours are what you do when you get there.
export function moveTo(s, zone, x, y) {
  const n = s.night; if (!n || n.done || n.pending || n.talk) return s;
  n.you = ZONES[zone] || zone === 'door' ? zone : n.you; n.pos = { x, y };
  return s;
}
// Going over to a stranger to find out who they are. A look; three looks is an hour.
export function lookAt(s, guestId) {
  const n = s.night; if (!n || n.done || n.pending || n.talk) return s;
  const g = n.guests.find((x) => x.id === guestId); if (!g || g.done) return s;
  n.you = g.zone; n.pos = null;
  g.seen = true;
  if (g.kind !== 'extra') return goOver(s, guestId);
  g.done = true;
  say(s, `${g.name}. ${g.line}`, 'note');
  n.looks += 1;
  if (n.looks >= LOOKS_AN_HOUR()) { n.looks = 0; say(s, 'An hour of that, and the room has moved on.', 'note'); hourPasses(s); }
  return s;
}
function hourPasses(s) {
  const n = s.night; n.hour += 1; n.looks = 0;
  // The room moves: people drift, and drink.
  for (const g of n.guests) { if (!g.done && chance(g.kind === 'extra' ? 45 : 30)) g.zone = pick(Object.keys(ZONES)); g.drunk = clamp(g.drunk + rint(5, 18)); }
  if (n.hour === 1 && chance(30)) incident(s);
  if (n.hour < HOURS.length) approach(s);
  if (n.hour >= HOURS.length && !n.pending && !n.talk) endNight(s);
}

// ── the glass ─────────────────────────────────────────────────────────────────
// What one does to you: the body you have, and the tolerance you have built.
export function drinkDose(s) {
  const kg = weightKg(s) || 70;
  const tol = hooked(s) ? 0.6 : 1 - drinkLevel(s) / 250;
  return Math.max(6, Math.round(15 * Math.sqrt(70 / kg) * tol));
}
export function buzzBand(buzz) {
  if (buzz >= 90) return { id: 'gone', label: 'Gone' };
  if (buzz >= 80) return { id: 'wrecked', label: 'Saying things' };
  if (buzz >= 60) return { id: 'sloppy', label: 'Losing the thread' };
  if (buzz >= 20) return { id: 'warm', label: 'Warmed up' };
  return { id: 'sober', label: 'Sober' };
}
function drink(s, why) {
  const n = s.night;
  n.buzz = clamp(n.buzz + drinkDose(s));
  if (n.price) { s.cash = (s.cash || 0) - n.price; n.spent += n.price; }
  if (n.buzz < 60) s.mental = clamp((s.mental || 50) + 1);
  if (n.buzz >= 90) { blackout(s); return true; }
  return false;
}
export function nightDrink(s) {
  const n = s.night; if (!n || n.done || n.pending) return s;
  if (n.you === 'terrace' || n.you === 'floor') { say(s, 'The bar is over there.', 'note'); return s; }
  const b = n.buzz;
  if (drink(s)) return s;
  say(s, n.buzz < 20 ? 'A drink. The room gets easier.' : n.buzz < 60 ? 'Another. You are funnier than you were.' : n.buzz < 80 ? 'A third. The room tilts a little.' : 'You have lost count. So has everybody watching.', n.buzz >= 60 ? 'bad' : 'note');
  if (b < 20 && n.buzz >= 20) approach(s);
  return s;
}
// Past ninety the night ends without you.
function blackout(s) {
  const n = s.night; n.blackout = true;
  const lost = n.price ? rint(4, 12) * n.price : rint(80, 400);
  s.cash = (s.cash || 0) - lost; n.spent += lost;
  s.scandal = clamp((s.scandal || 0) + rint(4, 8)); n.gains.scandal += 6;
  s.mental = clamp((s.mental || 50) - 6);
  if ((s.fame || 0) >= 35 && chance(60)) { setFame(s, (s.fame || 0) + 1); n.gains.fame += 1; }
  // The phone is gone. A new one next month, and not every number comes back.
  s.phoneLost = stamp(s) + 1;
  s.datingPool = (s.datingPool || []).filter(() => chance(60));
  say(s, 'The rest of the night is not yours to remember. You wake up at home, somehow, without your phone and with a bar tab you did not sign for. By lunchtime there are pictures.', 'bad');
  addTimeline(s, `A night at ${n.venue} you do not remember. The phone is gone; the pictures are not.`, true);
  n.talk = null; n.pending = null;
  endNight(s);
}

// ── going over to somebody ────────────────────────────────────────────────────
// The lines. Each has a tone; three or four are drawn a turn so the pool stays a pool.
const OPENERS = {
  anyone: ['"Do you know anybody here? I have been talking to a lamp."', '"Is it always like this, or is tonight special?"', '"I am not going to ask what you do. Everybody asks what you do."', '"You look like you would rather be somewhere else. Same."'],
  actor: ['"You are in the thing with the snow, aren\'t you? I could not finish it."', '"Do you know anybody here? I have been talking to a lamp."', '"They keep putting me next to producers. Please be an actor."'],
  icon: ['"Don\'t tell me who you are yet. Let me guess wrong first."', '"Everybody here wants a photograph. What do you want?"'],
  industry: ['"I have seen you somewhere. Was it something I passed on?"', '"I am not working tonight. What are you in?"', '"My assistant says I should know you."'],
  press: ['"Off the record: how bad is it, really?"', '"I am not writing anything down. I never write anything down."'],
  prospect: ['"Everyone here is pretending they are not famous. Are you pretending?"', '"I came with a friend who left with a producer. So."'],
  contact: ['"There you are. I was hoping you would be here."', '"Come and stand here, I need somebody normal."'],
};
const REPLIES = [
  { tone: 'flatter', text: 'I saw your last thing twice. The second time on purpose.' },
  { tone: 'flatter', text: 'Everybody in this room has been talking about you. I am just the one who came over.' },
  { tone: 'flatter', text: 'You are exactly the person I hoped would be here.' },
  { tone: 'joke', text: 'I am here for the free drinks and the chance to be mistaken for somebody.' },
  { tone: 'joke', text: 'I was told this was a wake. I dressed accordingly.' },
  { tone: 'joke', text: 'I have talked to a lamp too. The lamp had better stories.' },
  { tone: 'honest', text: 'Honestly? I am nervous, and I am working. Same as you, probably.' },
  { tone: 'honest', text: 'I did not like my last film either. I liked making it.' },
  { tone: 'honest', text: 'I do not know anybody here. I am hoping that changes.' },
  { tone: 'business', text: 'I have a gap in the spring. I am looking for the right thing to put in it.' },
  { tone: 'business', text: 'Who is casting the thing everybody keeps mentioning?' },
  { tone: 'business', text: 'Give me your office number and I will not waste it.' },
  { tone: 'flirt', text: 'You have the only interesting face in the room.' },
  { tone: 'flirt', text: 'Stay. The rest of the room can wait.' },
  { tone: 'brag', text: 'They are calling my last one the film of the year. I do not read reviews, obviously.' },
  { tone: 'brag', text: 'I turned down two things this month. Three, if you count the one my agent hid.' },
];
const REACT = {
  warm: ['They laugh, properly, and lean in.', 'They put the glass down. That is a good sign.', 'They tell you something they should not have.', '"Finally somebody," they say.'],
  flat: ['They nod. Their eyes go to the door and come back.', '"Mm," they say, and look at their drink.', 'A polite smile, the kind with nothing behind it.'],
  cold: ['They look past you for somebody else.', 'They finish the drink in one go.', '"Right," they say, the way people say it before they leave.', 'A small step back. You saw it.'],
};
// Going over: you see a face and hear a name, and that is all. Who they are — a casting
// director, a plus one — you find out by asking, and asking is a turn. Maxi: "you never
// know who you are talking to; that is the quest; you ask what they do and only then
// understand — and you do not have many turns, so the wrong person is time lost."
export function goOver(s, guestId) {
  const n = s.night; if (!n || n.done || n.pending || n.talk) return s;
  const g = n.guests.find((x) => x.id === guestId); if (!g || g.done) return s;
  n.you = g.zone; n.pos = null; g.seen = true;
  n.talk = { guestId: g.id, stage: 'meet', turn: 0, turns: g.came ? 4 : 3, rapport: g.kind === 'contact' ? 30 : 10, said: [], options: [], toast: null };
  return s;
}
// Not this one. A look — three of them is an hour.
export function moveOn(s) {
  const n = s.night; const t = n && n.talk; if (!t || t.stage !== 'meet') return s;
  const g = n.guests.find((x) => x.id === t.guestId);
  n.talk = null;
  if (g && g.kind === 'extra') g.done = true;
  say(s, `${g ? first(g.name) : 'Somebody'}. Not tonight.`, 'note');
  n.looks += 1;
  if (n.looks >= LOOKS_AN_HOUR()) { n.looks = 0; say(s, 'An hour of that, and the room has moved on.', 'note'); hourPasses(s); }
  return s;
}
export function startTalk(s) {
  const n = s.night; const t = n && n.talk; if (!t || t.stage !== 'meet') return s;
  const g = n.guests.find((x) => x.id === t.guestId); if (!g) return s;
  t.stage = 'talk';
  t.toast = ZONES[g.zone] && ZONES[g.zone].toast ? 'ask' : null;
  const opener = pick(g.kind === 'contact' ? OPENERS.contact : g.revealed && g.kind !== 'extra' ? (OPENERS[g.icon ? 'icon' : g.kind] || OPENERS.actor) : OPENERS.anyone);
  t.said.push({ who: g.name, text: opener });
  drawOptions(s);
  return s;
}
// The glass in your hand, before a word.
export function answerToast(s, yes) {
  const n = s.night; const t = n && n.talk; if (!t || t.toast !== 'ask' || t.stage === 'meet') return s;
  const g = n.guests.find((x) => x.id === t.guestId);
  if (yes) {
    t.toast = 'yes'; t.rapport += 10;
    if (drink(s)) return s;
    say(s, `A glass with ${first(g.name)}.${n.price ? ` €${n.price}.` : ''}`, 'note');
  } else { t.toast = 'no'; t.rapport -= 12; say(s, `${first(g.name)} raised a glass. You did not. It starts cold.`, 'bad'); }
  return s;
}
function drawOptions(s) {
  const n = s.night; const t = n.talk;
  const used = new Set(t.said.filter((x) => x.mine).map((x) => x.text));
  const pool = REPLIES.filter((r) => !used.has(r.text));
  const picked = [];
  // One of each of four tones, so a turn is a choice of tone and not of wording.
  for (const tone of pick([['flatter', 'joke', 'honest', 'business'], ['joke', 'honest', 'business', 'flirt'], ['flatter', 'honest', 'business', 'brag'], ['flatter', 'joke', 'flirt', 'business']])) {
    const c = pool.filter((r) => r.tone === tone && !picked.includes(r)); if (c.length) picked.push(pick(c));
  }
  // Drunk, the lines come out wrong: one of them is not what you meant, and you cannot tell which.
  t.options = picked.map((r) => ({ id: uid(s, 'ln'), text: r.text, tone: r.tone }));
  // And the question. It costs the turn, and it is the only way to know who you are with.
  const g = n.guests.find((x) => x.id === t.guestId);
  if (g && !g.revealed && g.kind !== 'contact') t.options.push({ id: uid(s, 'ln'), text: 'So what do you do?', tone: 'ask', ask: true });
  if (n.buzz >= 60) { const o = pick(t.options); o.text = pick(['Something about their last… you lose the thread halfway.', 'You start a sentence with "no offence".', 'A story about your agent that goes nowhere.']); o.tone = pick(TONES); o.slurred = true; }
}
export function reply(s, optionId) {
  const n = s.night; const t = n && n.talk; if (!t || t.toast === 'ask' || t.stage === 'meet') return s;
  const g = n.guests.find((x) => x.id === t.guestId); if (!g) return s;
  let o = t.options.find((x) => x.id === optionId); if (!o) return s;
  if (o.ask) {
    g.revealed = true;
    t.said.push({ who: 'you', mine: true, text: 'So what do you do?', tone: 'ask' });
    const what = g.kind === 'extra' ? g.line : g.kind === 'actor' ? (g.icon ? 'They look at you. You know exactly who they are.' : `"I act." ${g.line}.`) : g.kind === 'press' ? `"I write." ${g.line}.` : g.kind === 'prospect' ? `"${g.role}." ${g.line}.` : `"${g.role}." ${g.line}.`;
    t.said.push({ who: g.name, text: what, warm: 'flat' });
    t.rapport = clamp(t.rapport + 4);
    t.turn += 1;
    if (t.turn >= t.turns) endTalk(s, g); else drawOptions(s);
    return s;
  }
  // Past eighty you sometimes say something else entirely.
  if (n.buzz >= 80 && chance(35)) o = { ...o, text: pick(['You tell them what you really think of their last film.', 'You tell them what you earn.', 'You tell them about your mother.']), tone: pick(['honest', 'brag', 'flirt']) };
  t.said.push({ who: 'you', mine: true, text: o.text, tone: o.tone });
  // What they make of it: their tastes, moved by their own glass — the drunk like a joke
  // and a flirt and cannot hear business; the sober want the opposite.
  const likes = new Set(g.taste.likes); let hates = g.taste.hates;
  if (g.drunk >= 50) { likes.add('joke'); likes.add('flirt'); hates = 'business'; }
  let d = likes.has(o.tone) ? rint(20, 28) : o.tone === hates ? -rint(18, 26) : rint(4, 10);
  d += ((s.charisma || 0) - 50) * 0.16;
  if (o.tone === 'flirt') d += ((s.looks || 0) - 50) * 0.2;
  if (n.buzz >= 20 && n.buzz <= 50) d += 5;
  if (n.buzz >= 60) d -= 8;
  if (g.kind !== 'contact') d -= Math.max(0, (g.standing || 0) - (s.fame || 0)) * 0.12;
  t.rapport = clamp(t.rapport + d);
  const warm = d >= 14 ? 'warm' : d >= 0 ? 'flat' : 'cold';
  t.said.push({ who: g.name, text: pick(REACT[warm]), warm });
  t.turn += 1;
  if (t.turn >= t.turns) endTalk(s, g); else drawOptions(s);
  return s;
}
// One more, together — an extra turn's worth of warmth for a glass each.
export function drinkTogether(s) {
  const n = s.night; const t = n && n.talk; if (!t || t.toast === 'ask' || t.stage === 'meet') return s;
  const g = n.guests.find((x) => x.id === t.guestId); if (!g) return s;
  if (!ZONES[g.zone].toast) { say(s, 'No bar here.', 'note'); return s; }
  t.rapport = clamp(t.rapport + 8); g.drunk = clamp(g.drunk + 12);
  if (drink(s)) return s;
  t.said.push({ who: g.name, text: pick(['"One more, then I am going home." They are not going home.', '"Same again?" It is the same again.']) });
  return s;
}
function endTalk(s, g) {
  const n = s.night; const t = n.talk; n.talk = null; g.done = true;
  const r = t.rapport; g.went = r >= 65 ? 'good' : r >= 40 ? 'flat' : 'bad';
  // A name who liked the talk gives you a test on the spot — see heavyTest.
  if (g.heavy && r >= 55) {
    n.pending = { id: 'test', guestId: g.id, who: g.name, rapport: r, kind: g.kind === 'industry' ? 'scene' : 'story',
      text: g.kind === 'industry' ? `${first(g.name)} puts the glass down. "Do the monologue from my last one. Now. Here."` : `${first(g.name)} leans in. "Tell me the worst thing that happened to you on a set. Make it good."` };
    return;
  }
  // At your own night, somebody who decides things and liked you will hear a picture.
  if (n.tier === 'yours' && g.decides && r >= 55) {
    n.pending = { id: 'pitch', guestId: g.id, who: g.name, weight: g.standing || 60, rapport: r, text: `${first(g.name)} is on your sofa with a drink and nowhere to be. "So what do you want to make?"` };
    return;
  }
  if (g.kind === 'actor') talkActor(s, g, r);
  else if (g.kind === 'industry') talkIndustry(s, g, r);
  else if (g.kind === 'contact') talkContact(s, g, r);
  else if (g.kind === 'press') talkPress(s, g, r);
  else if (g.kind === 'prospect') talkProspect(s, g, r);
  else if (g.kind === 'extra') talkExtra(s, g, r);
  g.revealed = true;
  if (g.came) { if (n.hour >= HOURS.length && !n.pending) endNight(s); return; }
  hourPasses(s);
}
function addContact(s, fields) {
  const p = { id: uid(s, 'p'), relationship: rint(22, 38), met: `${s.year}`, ...fields };
  (s.people = s.people || []).push(p);
  s.night.gains.contacts.push(p.name);
  return p;
}
function talkActor(s, g, r) {
  const n = s.night;
  const known = (s.people || []).find((p) => p.worldId === g.worldId);
  if (r >= 65) {
    if (known) { const d = applyBond(s, known, rint(6, 12)); say(s, `${g.name} again. An hour by the window; closeness +${d}.`, 'good'); }
    else {
      addContact(s, { name: g.name, worldId: g.worldId, role: g.icon ? 'Icon' : g.rank <= 12 ? 'Star' : 'Fellow Actor', industryWeight: Math.round(g.standing), unlocks: g.rank <= 12 ? 'aaa' : null });
      say(s, g.icon ? `${g.name} talked to you for twenty minutes, and the room saw it.` : `You and ${g.name} closed the kitchen. They are in your contacts now.`, 'good');
      if (g.icon) { setRespect(s, (s.respect || 0) + 2); n.gains.respect += 2; }
    }
    if (!g.host && !known && chance(r >= 85 ? 30 : 15)) n.pending = { id: 'leaveWith', who: g.name, famous: true, text: `${first(g.name)} asks if you want to get out of here.` };
  } else if (r >= 40) say(s, `${g.name} was pleasant, and will not remember your name.`, 'note');
  else {
    say(s, g.icon ? `${g.name} said "lovely to meet you" the way people say it to waiters.` : `${g.name} nodded, and looked past you for somebody else.`, 'bad');
    s.mental = clamp((s.mental || 50) - 2);
    if (n.buzz >= 60 && chance(40)) { s.scandal = clamp((s.scandal || 0) + rint(3, 6)); n.gains.scandal += 4; say(s, 'You said something about their last picture. Somebody filmed it.', 'bad'); }
  }
}
function talkIndustry(s, g, r) {
  const n = s.night; const p = g.person;
  if (r < 40) { say(s, `${g.name} (${g.role}) gave you a card that turned out to be somebody else's.`, 'bad'); s.mental = clamp((s.mental || 50) - 2); return; }
  if (r < 65) { say(s, `${g.name} (${g.role}) was polite. Nobody exchanged anything.`, 'note'); return; }
  addContact(s, { name: p.name, role: p.role, industryWeight: p.industryWeight, unlocks: p.unlocks });
  say(s, `${g.name} — ${g.role}. You talked for an hour. They are in your contacts.`, 'good');
  // Each of them helps the way their job lets them: a casting director sends a read for
  // something good; a manager or a producer's office calls; a director wants you in a room.
  if (g.role === 'Casting Director' && chance(r >= 85 ? 70 : 45)) {
    const c = addSentListing(s, p.name);
    if (c) { n.gains.leads += 1; say(s, `"There is something I am casting," ${first(g.name)} says. "Come and read. I will tell them you are coming." It is on the board — ${c.title}.`, 'good'); return; }
  }
  const leadOdds = { 'Casting Director': 20, 'Manager': 40, 'Film Director': 35, 'Studio Producer': 35, 'Music Producer': s.dream === 'singer' ? 40 : 10 }[g.role] || 0;
  const decides = g.role === 'Film Director' || g.role === 'Studio Producer';
  if (decides && (p.industryWeight || 0) >= 70 && n.tier !== 'local' && chance(22)) {
    n.pending = { id: 'couch', who: g.name, role: g.role, weight: p.industryWeight, text: `${first(g.name)} has a part, and a car outside, and says the two things are the same conversation.` };
    return;
  }
  if (chance(leadOdds + (r >= 85 ? 15 : 0))) {
    (s.leads = s.leads || []).push({ due: stamp(s) + 1, from: p.name, role: p.role, weight: p.industryWeight || 50 });
    n.gains.leads += 1;
    say(s, `"Call the office on Monday," ${first(g.name)} says. It sounds like they mean it.`, 'good');
  }
}
// A stranger. Mostly an hour gone; once in a while an assistant who can get a page to
// somebody. Maxi: "you can get to know the extras too — you never know who it is."
function talkExtra(s, g, r) {
  const n = s.night;
  if (g.useful && r >= 60) {
    if (chance(35)) { (s.leads = s.leads || []).push({ due: stamp(s) + 1, from: g.name, role: 'Manager', weight: rint(55, 70) }); n.gains.leads += 1; say(s, `${first(g.name)} is somebody's assistant, and liked you. "Send me a page, I will put it on the desk."`, 'good'); }
    else say(s, `${first(g.name)} is somebody's assistant. They will mention you, they say. They will not.`, 'note');
    return;
  }
  if (r >= 65 && chance(40)) { (s.datingPool = s.datingPool || []).push({ ...prospect(s), name: g.name }); n.gains.numbers += 1; say(s, `${first(g.name)} — ${g.line.charAt(0).toLowerCase() + g.line.slice(1)} You got their number, for what it is worth.`, 'note'); return; }
  say(s, r >= 40 ? `${first(g.name)} — ${g.line.charAt(0).toLowerCase() + g.line.slice(1)} An hour, and nothing came of it.` : `${first(g.name)} — ${g.line.charAt(0).toLowerCase() + g.line.slice(1)} They drifted off mid-sentence.`, r >= 40 ? 'note' : 'bad');
}
function talkContact(s, g, r) {
  const p = (s.people || []).find((x) => x.id === g.personId); if (!p) return;
  if (r >= 55) { const d = applyBond(s, p, rint(7, 13)); say(s, `${g.name}, on the stairs, for most of an hour. Closeness +${d}.`, 'good'); }
  else { const d = applyBond(s, p, -rint(1, 3)); say(s, `${g.name} was with people. You got a wave. Closeness ${d}.`, 'bad'); }
}
function talkPress(s, g, r) {
  const n = s.night;
  if (r >= 65) { const gain = (s.fame || 0) < 100 ? 1 : 0; setFame(s, (s.fame || 0) + gain); n.gains.fame += gain; say(s, `${g.name} liked you. Two lines on Monday, and they are kind.`, 'good'); }
  else if (r < 40 && chance(60)) { s.scandal = clamp((s.scandal || 0) + 2); n.gains.scandal += 2; say(s, `${g.name} quoted you. Not the sentence you meant.`, 'bad'); }
  else say(s, `${g.name} wrote nothing down, which is worse.`, 'note');
}
function talkProspect(s, g, r) {
  const n = s.night;
  if (r < 45) { say(s, `${g.name} laughed at the wrong bit and went to find their friends.`, 'bad'); return; }
  n.pending = { id: 'prospect', guestId: g.id, who: g.name, text: `${first(g.name)} is still next to you at one in the morning.` };
}

// The test. A minigame the UI plays; this hears how it went. Their trust is a contact
// that starts warm and opens doors; once in a long while they fall for you and the next
// picture is yours — Maxi: "very hard and very rare."
export function heavyTest(s, quality) {
  const n = s.night; const q = n && n.pending; if (!q || q.id !== 'test') return s;
  n.pending = null;
  const g = n.guests.find((x) => x.id === q.guestId); if (!g) return s;
  const known = (s.people || []).find((p) => (g.worldId && p.worldId === g.worldId) || p.name === g.name);
  if (quality >= 75) {
    if (known) applyBond(s, known, rint(12, 20));
    else addContact(s, { name: g.name, worldId: g.worldId || null, role: g.kind === 'industry' ? 'Film Director' : g.icon ? 'Icon' : 'Star', industryWeight: Math.round(g.standing), relationship: rint(58, 68), unlocks: 'aaa' });
    say(s, `You did it, and the booth went quiet, and then ${first(g.name)} laughed. "Call me." They mean it.`, 'good');
    setRespect(s, (s.respect || 0) + 3); n.gains.respect += 3;
    if (q.rapport >= 80 && quality >= 88 && chance(35)) {
      (s.leads = s.leads || []).push({ due: stamp(s) + 1, from: g.name, role: g.kind === 'industry' ? 'Film Director' : 'A-list Star', weight: 96, sure: true, alist: true });
      n.gains.leads += 1;
      say(s, `"I want you in the next one," ${first(g.name)} says, and says it to the producer, who was listening.`, 'good');
      addTimeline(s, `${g.name} wants you in their next picture.`);
    }
  } else if (quality >= 45) {
    if (!known) addContact(s, { name: g.name, worldId: g.worldId || null, role: g.kind === 'industry' ? 'Film Director' : g.icon ? 'Icon' : 'Star', industryWeight: Math.round(g.standing), relationship: rint(36, 44), unlocks: 'aaa' });
    say(s, `Fine. Not what they wanted, but ${first(g.name)} nods and says "not bad", which from them is a review.`, 'note');
  } else {
    s.mental = clamp((s.mental || 50) - 4);
    say(s, `It falls flat in front of the one person you wanted it to land for. ${first(g.name)} is kind about it, which is worse.`, 'bad');
  }
  if (n.hour >= HOURS.length && !n.talk) endNight(s);
  return s;
}
// The pitch. What you want to make, said to somebody who could make it. The answer
// comes by text a month or two later — see pitchTick.
export const PITCH_SCALES = { indie: { label: 'A small picture', fame: 0 }, feature: { label: 'A studio picture', fame: 35 }, blockbuster: { label: 'The big one', fame: 60 } };
export function pitchOdds(s, who, weight, scale, genre) {
  let o = 20 + (weight || 60) * 0.35;
  const need = (PITCH_SCALES[scale] || PITCH_SCALES.indie).fame;
  o -= Math.max(0, need - (s.fame || 0)) * 1.2;
  if (genre === hotGenre(s)) o += 10;
  o -= (s.scandal || 0) * 0.25;
  o += Math.max(0, (s.respect || 0) - 20) * 0.2;
  return Math.max(4, Math.min(80, Math.round(o)));
}
export function sendPitch(s, form) {
  const n = s.night; const q = n && n.pending; if (!q || q.id !== 'pitch') return s;
  n.pending = null;
  const scale = PITCH_SCALES[form.scale] ? form.scale : 'indie';
  const genre = GENRES.includes(form.genre) ? form.genre : pick(GENRES);
  const months = Math.max(2, Math.min(12, Number(form.months) || 4));
  const title = String(form.title || '').trim().slice(0, 40) || newTitle(s, genre);
  const odds = pitchOdds(s, q.who, q.weight, scale, genre);
  (s.pitches = s.pitches || []).push({ due: stamp(s) + rint(1, 2), from: q.who, weight: q.weight, genre, scale, months, title, odds });
  say(s, `You pitched "${title}" — ${genre.toLowerCase()}, ${PITCH_SCALES[scale].label.toLowerCase()}, ${months} months. ${first(q.who)} says nothing for a while, and then: "Send me a page." They will text.`, 'good');
  addTimeline(s, `Pitched "${title}" to ${q.who}.`);
  if (n.hour >= HOURS.length && !n.talk) endNight(s);
  return s;
}
export function skipPitch(s) {
  const n = s.night; const q = n && n.pending; if (!q || q.id !== 'pitch') return s;
  n.pending = null; say(s, `You talked about other things. ${first(q.who)} will not ask twice.`, 'note');
  if (n.hour >= HOURS.length && !n.talk) endNight(s);
  return s;
}
function pitchTick(s) {
  const now = stamp(s);
  const due = (s.pitches || []).filter((p) => p.due <= now);
  if (!due.length) return;
  s.pitches = (s.pitches || []).filter((p) => p.due > now);
  for (const p of due) {
    if (!chance(p.odds)) { sendSms(s, { from: p.from, tag: 'pitch', text: pick([`Not "${p.title}". Not now. Another time — I mean it.`, `Read the page. It is not the one. Send me the next one.`, `The money said no before I finished the sentence. Another time.`]) }); addTimeline(s, `${p.from} passed on "${p.title}".`); continue; }
    const o = generateOffer(s);
    const big = p.scale === 'blockbuster', feat = p.scale === 'feature';
    Object.assign(o, { via: 'pitch', from: p.from, director: p.from, projectTitle: (big ? '⭐ ' : '') + p.title, genre: p.genre, months: p.months, role: 'Lead',
      tier: big ? 'tentpole' : feat ? 'lead' : 'lead', scale: p.scale, type: big ? 'Blockbuster' : 'Feature Film',
      salary: Math.round((quoteFor(s, big ? 'film_tentpole' : feat ? 'film_studio' : 'film_indie') || quoteFor(s, 'film_indie') || 40000) * (0.9 + Math.random() * 0.3)),
      fame: big ? 9 : feat ? 5 : 3, prestigeScore: big ? rint(60, 88) : feat ? rint(45, 70) : rint(35, 65), stability: rollStability(p.scale), deadline: 3,
      note: `Your picture. You pitched it to ${p.from} on your own sofa.` });
    (s.offers = s.offers || []).push(o);
    sendSms(s, { from: p.from, tag: 'pitch', text: pick([`"${p.title}". Yes. My office is sending the paper — it is in Messages.`, `I read the page twice. Let's make "${p.title}". Paper is on its way.`]) });
    addTimeline(s, `${p.from} said yes to "${p.title}".`);
    s.lastEvent = `${p.from} texted. "${p.title}" is happening — the paper is in Messages.`;
  }
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
      say(s, 'You went. The part is yours; you will be told so on Monday. You do not feel like somebody who got a part.', 'bad');
      addTimeline(s, `A part, from ${q.who}, that was not offered in a room.`, true);
    } else { setRespect(s, (s.respect || 0) + 2); n.gains.respect += 2; say(s, `You said goodnight. ${first(q.who)} said "your loss" like it was a line from something.`, 'good'); }
  } else if (q.id === 'dig') {
    if (choiceId === 'bite') {
      if (chance(45 + (s.charisma || 0) * 0.25 - (n.buzz >= 60 ? 20 : 0))) { setRespect(s, (s.respect || 0) + 3); n.gains.respect += 3; say(s, `You answered. The room laughed with you, not with ${first(q.who)}.`, 'good'); }
      else { s.scandal = clamp((s.scandal || 0) + rint(2, 5)); n.gains.scandal += 3; s.mental = clamp((s.mental || 50) - 3); say(s, 'You answered. The room went quiet. Somebody posted it.', 'bad'); }
    } else { s.mental = clamp((s.mental || 50) - 2); setRespect(s, (s.respect || 0) + 1); n.gains.respect += 1; say(s, 'You laughed. It cost you something and looked like it cost nothing.', 'note'); }
  }
  if (n.hour >= HOURS.length && !n.talk) endNight(s);
  return s;
}
// One night. Cheap to have, expensive to be seen having — and, if there is somebody at
// home, expensive whether or not you are seen. Nothing about it is a promise.
function oneNight(s, who, famous) {
  const n = s.night;
  n.hour = HOURS.length;
  s.mental = clamp((s.mental || 50) + rint(4, 8));
  say(s, `You left with ${first(who)}.`, 'note');
  if (famous || (s.fame || 0) >= 40) {
    if (chance(famous ? 55 : 25)) { const f = famous ? rint(1, 3) : 1; setFame(s, (s.fame || 0) + f); n.gains.fame += f; s.scandal = clamp((s.scandal || 0) + rint(2, 5)); n.gains.scandal += 3; say(s, 'Photographed leaving together. It is everywhere by lunchtime.', 'bad'); }
  }
  if (s.partner && chance(45)) {
    const d = applyBond(s, s.partner, -rint(20, 35));
    say(s, `${first(s.partner.name)} heard. Closeness ${d}.`, 'bad');
    addTimeline(s, `${first(s.partner.name)} found out about the night at ${n.venue}.`, true);
  }
}
function incident(s) {
  const n = s.night;
  const rival = n.guests.find((g) => g.kind === 'actor' && !g.host && g.rank < yourRank(s) && !g.done);
  if (!rival) return;
  n.pending = { id: 'dig', who: rival.name, text: `${first(rival.name)} says, loudly enough, that they thought you had retired. People turn around.` };
}

// ── the rest of the room ──────────────────────────────────────────────────────
export function nightAct(s, actId) {
  const n = s.night; if (!n || n.done || n.pending || n.talk) return s;
  if (actId === 'floor') {
    n.you = 'floor';
    s.mental = clamp((s.mental || 50) + rint(2, 4));
    if (n.tier !== 'gala' && chance(35) && n.guests.filter((x) => x.kind !== 'extra').length < 7) { const g = prospectGuest(s); g.zone = 'floor'; g.line = 'Danced next to you for an hour. Still here'; g.came = true; g.seen = true; n.guests.push(g); say(s, `An hour on the floor. ${first(g.name)} kept ending up next to you.`, 'good'); }
    else say(s, 'An hour on the floor. Nothing happened, which was the point.', 'note');
  } else if (actId === 'terrace') {
    n.you = 'terrace';
    n.buzz = Math.max(0, n.buzz - 12);
    say(s, n.buzz > 0 ? 'An hour on the terrace. The air does what water would.' : 'An hour on the terrace, talking to nobody.', 'note');
  } else if (actId === 'cameras') {
    if (!n.cameras) return s;
    n.cameras = false;
    if (chance(35 + (s.looks || 0) * 0.5)) { const f = n.tier === 'gala' ? rint(1, 2) : 1; setFame(s, (s.fame || 0) + f); n.gains.fame += f; say(s, 'The cameras outside. You gave them the good side, and they used it.', 'good'); }
    else { s.scandal = clamp((s.scandal || 0) + 1); s.mental = clamp((s.mental || 50) - 2); say(s, 'The cameras outside. One angle, and they picked it.', 'bad'); }
    return s;
  } else if (actId === 'leave') { endNight(s); return s; }
  hourPasses(s);
  return s;
}

// ── the morning after ─────────────────────────────────────────────────────────
function endNight(s) {
  const n = s.night; if (!n || n.done) return;
  n.done = true; n.talk = null;
  const gain = n.blackout ? 0 : ({ local: 0, mixer: 1, premiere: 1, gala: 2 }[n.tier] || 0);
  if (gain) { setFame(s, (s.fame || 0) + gain); n.gains.fame += gain; }
  if (!n.blackout) s.mental = clamp((s.mental || 50) + rint(1, 3));
  if (n.buzz >= 60) {
    s.ap = Math.max(0, (s.ap || 0) - 10); s.mental = clamp((s.mental || 50) - 3);
    s.drink = s.drink || { level: 0, months: 0, dryMonths: 0, worstLevel: 0 };
    s.drink.level = clamp((s.drink.level || 0) + (n.blackout ? rint(3, 6) : rint(1, 3)));
    s.looks = clamp((s.looks || 0) - 0.3);
    say(s, 'The next day is gone. Energy −10.', 'bad');
  }
  // A night out in the middle of a shoot is a call you are late for. Maxi: "if you have
  // work, it affects the shoot, the energy, the face — and that is how the drinking starts."
  const sets = (s.productions && s.productions.length ? s.productions : (s.production ? [s.production] : []));
  if (sets.length && n.buzz >= 40) {
    for (const p of sets) { p.meter = clamp((p.meter || 20) - rint(2, 6)); const lead = (p.crew || [])[0]; if (lead) lead.bond = clamp((lead.bond || 40) - 2); }
    say(s, `Late to the call on "${sets[0].title}". The set noticed.`, 'bad');
  }
  const g = n.gains; const bits = [];
  if (g.contacts.length) bits.push(`met ${g.contacts.join(' and ')}`);
  if (g.leads) bits.push(`${g.leads} lead${g.leads === 1 ? '' : 's'}`);
  if (g.numbers) bits.push(`${g.numbers} number${g.numbers === 1 ? '' : 's'}`);
  if (n.spent) bits.push(`€${Math.round(n.spent).toLocaleString()} on the bar`);
  s.lastEvent = n.blackout ? `${n.label} at ${n.venue} — you do not remember it, and the phone is gone.` : `${n.label} at ${n.venue}${bits.length ? ` — ${bits.join(', ')}` : ' — nothing much, and a good night'}.`;
  if (!n.blackout) addTimeline(s, `${n.label} at ${n.venue}${g.contacts.length ? ` — met ${g.contacts.join(', ')}` : ''}.`);
}
export function leaveNight(s) { if (s.night && !s.night.done) endNight(s); s.night = null; return s; }
export function phoneGone(s) { return (s.phoneLost || 0) > stamp(s); }

// ── Monday ────────────────────────────────────────────────────────────────────
// A lead is a phone call that comes, or does not. From offersTick's slot in the month.
export function nightTick(s) {
  pitchTick(s);
  const now = stamp(s);
  const due = (s.leads || []).filter((l) => l.due <= now);
  if (!due.length) return s;
  s.leads = (s.leads || []).filter((l) => l.due > now);
  for (const l of due) {
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
  if ((l.weight || 0) >= 80 && (l.sure || (s.fame || 0) >= 35)) {
    const big = l.sure || (s.fame || 0) >= 50;
    o.tier = big ? 'tentpole' : 'lead'; o.scale = big ? 'blockbuster' : 'feature'; o.role = 'Lead';
    o.type = s.dream === 'singer' ? (big ? 'World Tour' : 'Album') : (big ? 'Blockbuster' : 'Feature Film');
    o.projectTitle = (big ? '⭐ ' : '') + newTitle(s, o.genre || pick(GENRES));
    o.salary = Math.round((quoteFor(s, big ? 'film_tentpole' : 'film_studio') || quoteFor(s, 'film_indie') || 50000) * (0.85 + Math.random() * 0.4));
    o.fame = big ? 9 : 5; o.prestigeScore = big ? rint(60, 90) : rint(45, 70); o.months = rint(4, 9); o.stability = rollStability(o.scale);
  }
  if (l.couch) o.note = `${first(l.from)} gave you this. The set will know it.`;
  if (l.alist) { o.note = `${first(l.from)} asked for you by name. The whole set knows it.`; o.director = l.from; }
  o.deadline = rint(2, 3);
  return o;
}
