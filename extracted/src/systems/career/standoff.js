// The room where it actually gets decided.
//
// Maxi, A-list, five seasons into his own show: "five times they sent the fee, five times I
// asked for more, five times they refused, and then the show went on without me. Let us do
// it properly — if you play the lead they cannot make it without you, so either they raise
// it or they close it. And there should be new clauses at A-list to protect the show and to
// protect you. And if you cannot come to an agreement, there is a MEETING: you are invited,
// and you decide, finally, what happens and on what terms. But again — how does it go in
// real life? Do it the way real life does it."
//
// The way real life does it, and none of it was here:
//
//   · The leverage arrives at the third season, not the first. The original paper was signed
//     when nobody knew, the escalators in it are now insulting, and the studio needs the show
//     more than it needs the principle.
//   · Nobody wins this on the raw fee. A studio will not set the per-episode number the whole
//     town will read about — it pays around it. Back end, a producing credit, a shorter order
//     at a better rate, an episode to direct, a development deal for your own thing. Those are
//     what the huge television paydays are actually made of.
//   · The cast go in together when they can. It is the strongest move there is, because
//     nobody can recast all of you, and every famous version of this was done that way.
//   · When it drags, somebody calls a meeting. It is not another letter — it is a room, with
//     the studio on one side, and it ends that day.
//   · And it can end with no show. A network decides the economics no longer work, and the
//     thing that was renewed simply is not made. That happens, and it is the real ending to
//     this argument rather than a recast.
import { rint, chance } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { canAfford, spend, tooTired } from '../../engine/energy.js';
import { setRespect } from '../meta/status.js';
import { applyBond } from '../life/bonds.js';
import { fameTier } from '../meta/status.js';
import { slotNorm } from './franchise.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const tierIdx = (s) => ['unknown', 'rising', 'known', 'star', 'alist', 'icon'].indexOf(fameTier(s.fame).id);
const clean = (t) => String(t || 'it').replace('⭐ ', '');

// Two rules, and Maxi drew the line between them exactly where it is:
//
//   "the show continues without you — only if I am not the lead."
//
// Quite. If the show is ABOUT you there are two endings and no third: they pay, or it does
// not get made. Nobody is written out of the middle of their own programme and nobody is
// recast into it either.
//
// Anybody else is a different conversation. A series regular who is not the centre gets
// WRITTEN OUT — a death, a transfer, a letter from somewhere else — and the show carries
// on perfectly well, which is the part that stings. It happens constantly and almost
// nobody outside the cast notices.
// ── how much of the show is you ───────────────────────────────────────────────
// An outside reading of the first version of this called the rule "main lead cannot be
// removed" too hard, and it was right. Shows survive losing the person they were about,
// and the examples are not obscure: The Office ran two more seasons after Steve Carell,
// Shameless went to eleven after Emmy Rossum, House of Cards made a final season with
// Robin Wright alone, Two and a Half Men replaced Charlie Sheen outright and kept going.
//
// So it is not a rule, it is a PRICE. The more the show depends on you, the more expensive
// and dangerous removing you is — and at the top of the scale a network will genuinely
// rather pay, or rather stop, than try. That is a much better shape than a prohibition.
// Two numbers, not one. A second reading separated them and it is right: how much the
// STORY is about you, and how expensive and dangerous replacing you would be, are
// different facts and they come apart constantly.
//
//   a huge star in an ensemble     dependency 60, difficulty 90
//   a nobody whose show it is      dependency 93, difficulty 85
//
// The first can be written out and the programme survives; losing him is expensive
// because of who he is. The second cannot be written out at all, and nobody outside would
// notice him in a restaurant.
export function dependency(s, o) {
  if (!o) return 0;
  const centre = o.tier === 'lead' || o.tier === 'tentpole' ? 48 : 14;
  // Years of being the face of it. A show is about whoever has been in it longest — but that
  // has to be YOUR years, not the show’s. The first version read the season number, so
  // somebody who turned up in season seven counted as more essential than a lead who had
  // carried it since the pilot.
  const years = Math.min(22, (o.joined ? 4 : (o.season || 1) * 4.5));
  // And your own draw, which is the part the show did not give you.
  // Your own draw counts for less here than it used to: this is about the story, not about
  // you. It is the other number that carries your fame.
  const own = clamp((s.fame || 0) * 0.10, 0, 10);
  // Somebody they wrote around already: joining an existing show makes you replaceable.
  const joined = o.joined ? -6 : 0;
  return clamp(Math.round(centre + years + own + joined), 4, 97);
}
// What it would actually cost them to do it: your own name, what the audience is attached
// to, and how much of the story would have to be rebuilt.
export function replacementCost(s, o) {
  if (!o) return 0;
  const yours = clamp((s.fame || 0) * 0.55, 0, 55);
  const story = dependency(s, o) * 0.35;
  const awards = clamp(((s.awards || {}).wins || []).length * 6, 0, 12);
  return clamp(Math.round(yours + story + awards), 4, 98);
}
export function replacementWord(d) {
  return d >= 85 ? 'extreme' : d >= 65 ? 'very hard' : d >= 45 ? 'hard' : d >= 25 ? 'awkward' : 'routine';
}

// ── under contract, or out of it ──────────────────────────────────────────────
// The single most important correction from the outside reading, and it was right: the
// game gave the impression that every season is a fresh negotiation. It is not. A series
// regular signs with the studio holding OPTIONS on future seasons at escalators written
// into the first paper — five per cent a year, typically — and the studio simply exercises
// them. There is nothing to meet about, because you already agreed to this.
//
// The fight happens in the window: when the options run out, or at the season where the
// whole cast reopens together and the studio decides it would rather deal than lose
// everybody. That is where the leverage lives, and it should be on the screen in those
// words so the player knows which of the two they are in.
export const REOPEN_SEASON = 3;
export function contractStatus(s, o) {
  if (!o || o.kind !== 'renewal') return null;
  const locked = !!o.optioned;
  const reopen = locked && (o.season || 1) >= REOPEN_SEASON && (o.marketFee || 0) > 0;
  if (locked && !reopen) {
    return {
      status: 'Studio option', open: false, leverage: 'low',
      line: `They hold an option on this season at the fee you signed for, plus five per cent. You agreed to this before anybody knew what the show would become, and that is what an option is for.`,
    };
  }
  if (reopen) {
    return {
      status: 'The cast reopen together', open: true, leverage: 'strong',
      line: `Season ${o.season}: the whole cast renegotiates at once and the studio knows it. This is the one door inside an option, and it is open because nobody can replace all of you.`,
    };
  }
  return {
    status: 'Renegotiation window', open: true, leverage: 'very strong',
    line: `Your contract is up. They need a new deal and you do not, which is the whole of it.`,
  };
}
// A meeting is for a negotiation. There is no meeting about an option — they exercise it.
export function canMeet(s, o) {
  const c = contractStatus(s, o);
  return !c || c.open;
}

export function yoursToLose(o) {
  return !!o && o.kind === 'renewal' && (o.tier === 'lead' || o.tier === 'tentpole');
}
// The other half of the same rule: your part can be written out, and the show cannot.
export function canBeWrittenOut(o) {
  return !!o && o.kind === 'renewal' && !yoursToLose(o);
}

// How they do it. None of these is about you and all of them are about you.
export const EXITS = [
  { how: 'a transfer', line: 'Your character is offered something in another city in episode three and takes it. Two lines about it in four, and then nothing.' },
  { how: 'a death', line: 'They kill you in the back half. It is a good episode and people will say so, and they will be right, and that is the last of it.' },
  { how: 'quietly', line: 'Nothing happens to your character at all. They are simply not in it, and by episode six nobody in the story mentions them, and by season seven the show behaves as though they were never there.' },
  { how: 'a wedding', line: 'They marry your character off and move them somewhere happy, which is how a show says goodbye when it wants to stay friendly about it.' },
];

// Written out over money. The show does not stop, and that is the whole of it.
export function writeOut(s, o) {
  const e = EXITS[Math.floor(Math.random() * EXITS.length)];
  const title = clean(o.seriesTitle || o.projectTitle);
  s.offers = (s.offers || []).filter((x) => x.id !== o.id);
  s.inbox = (s.inbox || []).filter((m) => m.offerId !== o.id);
  addTimeline(s, `Written out of "${title}". The show is coming back; you are not in it.`, true);
  s.lastEvent = `Nobody argued for long. You are not the reason anybody watches ${title}, and the room worked that out faster than your agent did. ${e.line} Season ${(o.season || 1)} goes ahead exactly as planned, and you will find out how it does the way everybody else does.`;
  return s;
}

// ── what they will actually put on the table ──────────────────────────────────
// Never the whole ask in cash. A studio will not set the per-episode number the entire town
// is going to read about — it pays around it, and everything it pays around it with is worth
// more than the headline anyway.
export const EXTRAS = {
  points: { label: 'A piece of the show', line: 'Back end. If it runs and it sells, this is the number that matters and nobody will be able to tell you what it will be.' },
  producer: { label: 'A producing credit', line: 'Your name in the front titles and a fee attached to it. You will also be in the room where the scripts are argued about, which is the part you will actually notice.' },
  shortOrder: { label: 'Fewer episodes', line: 'A shorter season at a better rate per episode. The months you get back are the months you could make a film in.' },
  directOne: { label: 'An episode to direct', line: 'One, in the back half, with a proper prep. Everybody says yes to this and half of them mean it.' },
};
export const EXTRA_IDS = Object.keys(EXTRAS);

// What the LAST season actually did, which is the thing everybody in the room has in front
// of them. Maxi: "and then look at how the season played out — if it paid off, continue,
// offer a share, a producing credit." That is exactly the mechanism and it was missing:
// the package was priced off who you are and how many seasons had gone by, and not off the
// only number anybody in that building cares about.
export function lastSeason(s, o) {
  const root = String(o.seriesTitle || o.projectTitle || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();
  const runs = (s.filmography || []).filter((c) => {
    const t = String(c.title || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();
    return t === root && !c.running;
  }).sort((x, y) => (y.season || 0) - (x.season || 0));
  const c = runs[0];
  if (!c) return null;
  const norm = slotNorm(c.type) || 2.6;
  const drew = c.endViewers || c.viewers || 0;
  const open = c.openViewers || drew;
  return {
    season: c.season || 1, rating: c.rating || 0, drew, open, norm,
    pull: norm > 0 ? drew / norm : 1,
    // Held its people, or bled them. A season that grew is the strongest thing you can
    // put on the table, and it is not your argument — it is theirs, about their own show.
    held: open > 0 ? drew / open : 1,
  };
}

// How much room the studio has. A show they need is a show they will pay for; a show that is
// limping is one they will let go rather than be held up by.
export function theirRoom(s, o) {
  const seasons = o.season || 1;
  const tier = tierIdx(s);
  // The third season is the classic one: the paper is old, the show has proved itself, and
  // everybody in the building knows what the original deal looks like now.
  const proven = seasons >= 3 ? 1 : 0.6;
  let room = (28 + tier * 11 + (o.prestigeScore || 50) * 0.18) * proven;
  // And then the only thing that really decides it: what the last season did. A show
  // pulling well above its slot is one they cannot afford to lose; one that slipped is one
  // they are already half out of.
  const last = lastSeason(s, o);
  if (last) {
    room *= last.pull >= 1.6 ? 1.35 : last.pull >= 1.1 ? 1.15 : last.pull >= 0.75 ? 0.95 : 0.7;
    room *= last.held >= 1.02 ? 1.12 : last.held >= 0.9 ? 1 : 0.86;
  }
  return clamp(Math.round(room), 10, 92);
}

export function packageFor(s, o) {
  const room = theirRoom(s, o);
  const last = lastSeason(s, o);
  const tier = tierIdx(s);
  const fee = o.episodeFee || Math.round((o.salary || 0) / Math.max(1, o.episodes || 1));
  // Part of the ask in cash, and never all of it.
  const raise = Math.round(fee * (1 + (room / 100) * 0.45));
  const extras = [];
  if (tier >= 4 && room >= 45) extras.push('points');
  if (tier >= 4 && room >= 30 && (o.season || 1) >= 3) extras.push('producer');
  if (room >= 55) extras.push('shortOrder');
  if (tier >= 3 && room >= 38 && chance(60)) extras.push('directOne');
  const episodes = extras.includes('shortOrder')
    ? Math.max(4, Math.round((o.episodes || 10) * 0.7)) : (o.episodes || 10);
  return {
    fee: raise, was: fee, episodes, wasEpisodes: o.episodes || 10,
    points: extras.includes('points') ? rint(2, 5) : 0,
    producer: extras.includes('producer'),
    directOne: extras.includes('directOne'),
    extras, room, last,
    // The sentence everybody in the room already knows, said out loud for the player.
    // Two facts, and a room reads them together: how big it is, and which way it is going.
    // A show doing well above its slot while shedding a third of its audience is not the
    // same conversation as one doing well above its slot and climbing, and saying "they
    // cannot afford to lose it" about the first one is how you get laughed at.
    because: last ? (() => {
      const size = last.pull >= 1.6
        ? `${last.drew}m against the ${last.norm}m the slot wants`
        : `${last.drew}m against a ${last.norm}m slot`;
      const way = last.held >= 1.05 ? `and it grew through the run, from ${last.open}m`
        : last.held >= 0.95 ? `and it held what it opened with`
        : `and it shed ${Math.round((1 - last.held) * 100)}% of them between the first episode and the last`;
      const read = last.pull >= 1.6 && last.held >= 0.95
        ? `They cannot afford to lose it, and every person at that table knows the number.`
        : last.pull >= 1.6
        ? `Still the biggest thing they have, and somebody in that room has already said the word "tired" about it.`
        : last.pull >= 1.1
        ? `Comfortable. Not untouchable.`
        : last.pull >= 0.75
        ? `They are not frightened of losing it.`
        : `They are already half out of this, and you are asking them for money.`;
      return `Season ${last.season} did ${size}, ${way}. ${read}`;
    })() : null,
    grew: last ? last.held >= 1.02 : false,
    // What they are really saying, which is never what the letter says.
    mood: room >= 70 ? 'They need this show and everybody in the room knows it.'
      : room >= 45 ? 'They will pay something. They will not pay it in a way anybody can read about.'
      : 'They are not frightened of losing it, and they want you to know that.',
  };
}

// ── what happens when it fails ────────────────────────────────────────────────
// Five real endings, not two, and never a flat percentage. The outside reading was right
// that "one meeting in seven is cancelled" was a game number I had dressed up as a fact;
// there is no such industry figure and I should not have said there was. It is computed
// from the show and from you, which is the honest version and a better one.
export const FAILURES = {
  pay: { label: 'They pay' },
  around: { label: 'Written around' },
  killed: { label: 'Killed off' },
  newLead: { label: 'A new lead' },
  cancel: { label: 'No season' },
};
// These are GAME WEIGHTS. There is no industry table of what a studio does when a
// negotiation fails, and the first version of this quoted its own tuning back as though
// there were. What is real is the shape: a healthy show is worth saving and a sinking one
// is not, and nobody ends a programme over somebody who is not in most of it.
export function failureOdds(s, o) {
  const d = dependency(s, o);
  const last = lastSeason(s, o);
  // A show doing well is worth keeping whatever it costs; one that is slipping is one they
  // are looking for a reason to end anyway. The second reading was right that this was far
  // too weak: paying was 52% for a show that was sinking, which is a studio asking itself
  // why it should spend ten million saving something the audience is already leaving.
  const health = last ? clamp(Math.round(last.pull * 45 + (last.held - 1) * 120), 5, 95) : 50;
  const w = {
    // They pay. Two conditions, and it needs BOTH: the show has to be worth saving, and you
    // have to be the reason it needs saving. Added rather than multiplied, a healthy show
    // paid handsomely to keep a supporting player nobody would miss, which is not a thing
    // that happens.
    // And a show that is ENTIRELY one person, while it is still working, is the case where a
    // studio simply writes the cheque. That last term only exists above seventy, and it is
    // scaled by health too — nobody writes it for a programme people have stopped watching.
    pay: (4 + d * 0.55) * (0.35 + health / 100) + Math.max(0, d - 70) * (health / 100) * 1.6,
    // The show goes on with somebody else carrying it. The commonest answer of all when you
    // are not the centre of it.
    around: 52 - d * 0.38 + health * 0.10,
    // A death, which is what a show does when it wants the leaving to be an event.
    killed: 24 - d * 0.14 + health * 0.04,
    // Somebody new above the title. Needs a show healthy enough to carry the change.
    newLead: 12 - d * 0.04 + health * 0.14,
    // And stopping. Only ever a real answer when the thing is you AND it is not worth it.
    //
    // Read this as: a contract dispute with THIS actor will not itself end the programme.
    // It is not a claim that the show is safe — a show can be cancelled the same month for
    // its ratings, its budget or a change of strategy somewhere above everybody in that
    // room. Those are elsewhere (career/franchise.js, career/bubble.js). This number is
    // only ever about whether YOU were the reason.
    cancel: Math.max(0, (d - 45) * 0.55) + Math.max(0, (55 - health) * 0.85),
  };
  for (const k of Object.keys(w)) w[k] = Math.max(0, w[k]);
  const total = Object.values(w).reduce((x, y) => x + y, 0) || 1;
  const out = {};
  for (const k of Object.keys(w)) out[k] = Math.round((w[k] / total) * 100);
  return out;
}

// ── the meeting ───────────────────────────────────────────────────────────────
// Called from contract.js when the fee has been refused twice on a show that is yours. It is
// not another letter. It is a room, and it ends that day.
// Who is actually in the room. Nobody sends one person to a meeting like this.
export const CHAIRS = [
  { who: 'The studio head', line: 'has not looked at the papers once and knows every number on them' },
  { who: 'Business affairs', line: 'brought the file and will do the talking about money' },
  { who: 'The showrunner', line: 'wants you back and is not allowed to say so in this room' },
  { who: 'Your agent', line: 'on your side of the table, and has done this two hundred times' },
];

// Not an abstract push. You name the one thing you came for, which is what people do in
// these rooms — nobody says "more, generally". Money is the hardest of the four, because
// money is the one that gets printed and then every other agent in town quotes it.
export const ASKS = {
  money: { label: 'The number', ask: 'More an episode. Say it plainly and let it sit.', hard: 26,
    got: 'They went out of the room for eleven minutes and came back with it.' },
  points: { label: 'A piece of it', ask: 'Back end. If it runs, that is where the money actually is.', hard: 8,
    got: 'Nobody argued. It costs them nothing today and a great deal in four years, which is exactly why they say yes.' },
  producer: { label: 'A producing credit', ask: 'Your name in the front titles, and the room where the scripts are argued about.', hard: 12,
    got: 'Agreed before your agent finished the sentence. The cheapest thing on the table and the one you will notice most.' },
  fewer: { label: 'Fewer episodes', ask: 'A shorter season at the same rate. The months back are the point.', hard: 16,
    got: 'The showrunner looked relieved, which tells you what the writing room has been like.' },
  // Guaranteed money, which is a different thing from a bigger number. A hundred and fifty
  // thousand across ten guaranteed episodes beats a hundred and eighty across five they
  // might not use, and the paper says how many they have to make.
  guarantee: { label: 'A guaranteed number of episodes', ask: 'Not a rate. A floor. However the season goes, that is what they owe.', hard: 14,
    need: () => true,
    got: 'Written in as a guarantee. Whatever happens to the season now, that is money that exists.' },
  // The biggest one in this game, because it decides whether you have a film career at all
  // while the series runs. A full exclusivity means the show owns your year.
  exclusivity: { label: 'The right to work between seasons', ask: 'A conflict-free window after principal photography. You are not asking to leave — you are asking for the summer, and it will cost you a little of the rise.', hard: 20,
    need: () => true,
    got: 'A conflict-free window, in writing. What you do with the months between is now your own business.' },
  // A shorter span is not fewer episodes — it is the same season shot faster, and the
  // months it hands back are the months a film happens in.
  span: { label: 'A shorter shoot', ask: 'The same season, gathered into blocks, in fewer months. Holding a crew around one person is expensive and they will take it out of the money.', hard: 22,
    need: () => true,
    got: 'Condensed, and twelve per cent off the rise for the privilege. The unit will hate it and the first assistant director will make it work, because they always do.' },
  // Cheap for them, and it is the thing actors actually go to war about.
  billing: { label: 'First billing', ask: 'Your name first. It costs them almost no money, which is why it is worth having — and a fight with somebody else’s agent, which is why they hesitate.', hard: 10,
    need: () => true,
    got: 'Agreed in about four seconds. It costs them nothing at all, and somebody else in that cast is going to hear about it from an assistant before Friday.' },
};
// Not everything is on the table for everybody, and showing an unknown in their second
// season a back-end point would be silly. What you can even ASK for comes off what you are
// and how much of the show is you.
export function asksFor(s, o) {
  const tier = tierIdx(s);
  const d = dependency(s, o);
  const season = (o && o.season) || 1;
  const out = [];
  out.push('money');
  out.push('billing');
  if (season >= 2) out.push('guarantee');
  if (tier >= 3 || d >= 55) out.push('fewer');
  if (tier >= 3 && season >= 3) out.push('exclusivity');
  if (tier >= 4 && (d >= 60 || season >= 4)) out.push('points');
  if (tier >= 4 && season >= 3) out.push('producer');
  if (tier >= 4 && d >= 65) out.push('span');
  return out;
}
export const ASK_IDS = Object.keys(ASKS);

// A meeting is a DATE, not something that happens the moment somebody is annoyed. Maxi: "a
// letter comes inviting you to a meeting with the producers, with a date on the calendar —
// what day, what month." That is how it goes: business affairs stop replying, an invitation
// arrives, and there is a month in the diary with everything held until it. The waiting is
// most of the pressure and it was the part I had left out.
export const ROOM_LEAD = 2;
export function callTheRoom(s, o) {
  if (!yoursToLose(o) || s.standoff) return s;
  // Nobody clears an afternoon to discuss a paper you already signed.
  if (!canMeet(s, o)) {
    s.lastEvent = `Business affairs answered in one line: they hold an option on this season and they are exercising it. There is nothing to meet about, because you agreed to this before anybody knew what the show would be.`;
    return s;
  }
  const due = stamp(s) + ROOM_LEAD;
  s.standoff = {
    offerId: o.id, title: clean(o.projectTitle), season: o.season || 1,
    since: stamp(s), due, open: false, asked: null, gave: null, rounds: 0, pack: packageFor(s, o),
  };
  addTimeline(s, `A date for "${clean(o.projectTitle)}". Everybody who can say yes will be in one room.`);
  s.lastEvent = `Business affairs have stopped replying about "${clean(o.projectTitle)}". Instead there is an invitation and a date ${ROOM_LEAD} months out — the studio head, business affairs, the showrunner, your agent and you. Nothing about season ${(o.season || 1) + 1} moves until that afternoon.`;
  return s;
}

// Monthly. The date comes round and it stops being a calendar entry.
export function standoffTick(s) {
  const k = s.standoff;
  if (!k || k.open) return s;
  if (stamp(s) < (k.due || 0)) return s;
  const o = (s.offers || []).find((x) => x.id === k.offerId);
  if (!o) { s.standoff = null; return s; }
  k.open = true;
  // Two months have passed and the numbers have moved with the show.
  k.pack = packageFor(s, o);
  addTimeline(s, `The meeting about "${k.title}".`);
  s.lastEvent = `The afternoon for "${k.title}". Four people, a file, and a room that has been booked for two hours.`;
  return s;
}
// For the calendar, before the day comes.
export function roomDue(s) {
  const k = s.standoff;
  if (!k || k.open) return null;
  return { title: k.title, season: k.season, due: k.due, months: Math.max(0, (k.due || 0) - stamp(s)) };
}
export function standoff(s) { return s.standoff || null; }
export function standoffOffer(s) {
  const k = standoff(s);
  return k ? (s.offers || []).find((o) => o.id === k.offerId) || null : null;
}

// ── what you can do in the room ───────────────────────────────────────────────
export const PUSH_COST = 15;
export function canPush(s) {
  const k = standoff(s);
  if (!k) return { ok: false, why: '' };
  if (k.asked) return { ok: false, why: 'You have asked, and they have answered. Asking twice in the same afternoon is not a negotiation, it is a position, and they will read it as one.' };
  if (!canAfford(s, PUSH_COST)) return { ok: false, why: tooTired(s, PUSH_COST) };
  return { ok: true, why: '' };
}

// Name it. One thing, once, in the room.
export function askFor(s, id) {
  const k = standoff(s), o = standoffOffer(s);
  const spec = ASKS[id];
  const fit = canPush(s);
  if (!fit.ok) { if (fit.why) s.lastEvent = fit.why; return s; }
  if (!k || !spec) return s;
  if (!o) {
    // Should not happen now that a booked part cannot lapse, but a button that does nothing
    // teaches the player that the screen is broken, and they are right.
    s.standoff = null;
    s.lastEvent = `Somewhere between the invitation and the afternoon, ${k.title} stopped being a thing anybody was offering. Nobody in that room was going to say so first.`;
    return s;
  }
  spend(s, PUSH_COST);
  k.asked = id;
  k.rounds += 1;
  const odds = clamp(k.pack.room - spec.hard + (tierIdx(s) >= 5 ? 12 : 0));
  if (chance(odds)) {
    const p = k.pack;
    if (id === 'money') p.fee = Math.round(p.fee * 1.18);
    if (id === 'points') p.points = (p.points || 0) + rint(2, 3);
    if (id === 'producer') p.producer = true;
    if (id === 'fewer') p.episodes = Math.max(4, Math.round(p.episodes * 0.75));
    if (id === 'guarantee') p.guarantee = p.episodes;
    if (id === 'exclusivity') p.conflictFree = true;
    // A season shot around one person means holding locations, a crew and everybody else
    // in the cast to somebody else’s film. Studios do it, and they take it out of the
    // money — which is the decision worth having: two million more, or four months in
    // which a film can happen.
    if (id === 'span') {
      p.span = Math.max(2, Math.round((o.months || 6) * 0.6));
      p.fee = Math.round(p.fee * 0.88);
      p.paidFor = true;
    }
    // And the same bargain, smaller: a window they cannot block is a window they cannot
    // sell to anybody else either.
    if (id === 'exclusivity') p.fee = Math.round(p.fee * 0.95);
    if (id === 'billing') {
      p.billing = true;
      // It costs the studio nothing, which is why it is worth having — and it costs you
      // something with whoever has just been moved down a line. They find out on a Friday
      // from somebody who works for them, which is the worst way to find out anything.
      const costar = (s.people || []).filter((x) => /Actor|Star/i.test(x.role || '') && (x.relationship || 0) > 0)
        .sort((x, y) => (y.relationship || 0) - (x.relationship || 0))[0];
      if (costar) {
        applyBond(s, costar, -rint(9, 16));
        p.billingCost = costar.name;
      }
    }
    k.gave = id;
    s.lastEvent = `${spec.got} It is on the table with the rest of it.`;
    return s;
  }
  k.gave = null;
  // A no in a room is a no. And if the afternoon has gone badly enough, the people who can
  // end the whole thing are already sitting at the table.
  // And if the afternoon has gone badly enough, the people who can end it are already at
  // the table. What they choose is not a flat die roll any more — it comes off how much of
  // the show is you and how the show is doing. career/standoff.js failureOdds
  if (chance(26)) { itFails(s, o); return s; }
  s.lastEvent = `No. Not angrily, and not negotiably. ${k.pack.mood} What was on the table is still on the table, and the showrunner has not looked up.`;
  return s;
}

// Take what is on the table. The commonest ending, and usually the right one.
export function takeTheRoom(s) {
  const k = standoff(s), o = standoffOffer(s);
  if (!k) { s.standoff = null; return s; }
  if (!o) {
    s.standoff = null;
    s.lastEvent = `You put your hand out and there was nothing on the table to shake on. ${k.title} had gone before the afternoon did.`;
    return s;
  }
  const p = k.pack;
  o.episodeFee = p.fee;
  o.episodes = p.episodes;
  o.salary = p.fee * p.episodes;
  if (p.points) o.tvPoints = p.points;
  if (p.producer) o.producing = true;
  if (p.directOne) o.directOne = true;
  if (p.guarantee) o.guaranteed = p.guarantee;
  // The one that changes your year: the show stops owning the months between seasons, so
  // a film can happen in them. career/castings.js reads production.exclusive.
  if (p.conflictFree) { o.conflictFree = true; o.exclusive = false; }
  if (p.span) o.months = p.span;
  if (p.billing) o.billing = true;
  o._settled = true;
  // A paper settled in a room is a paper. The clauses stop being arguable.
  if (o.contract) { for (const c of o.contract.clauses || []) { c.stance = 'ok'; c.ask = null; } o.contract.sent = null; }
  s.standoff = null;
  addTimeline(s, `Settled "${k.title}" in the room. ${Math.round((p.fee / p.was - 1) * 100)}% more an episode${p.points ? `, and ${p.points}% of the show` : ''}.`);
  s.lastEvent = `Hands shaken at twenty past four. ${Math.round((p.fee / p.was - 1) * 100)}% more an episode${p.points ? `, ${p.points} per cent of the back end` : ''}${p.producer ? ', your name in the front titles' : ''}${p.episodes < p.wasEpisodes ? `, and ${p.episodes} episodes instead of ${p.wasEpisodes}` : ''}. Nobody got what they came in for, which is how everybody knows it was a deal.`;
  return s;
}

// Go back once more. It works, or it costs you the room, or it costs the show.
export function pushTheRoom(s) {
  const k = standoff(s), o = standoffOffer(s);
  const fit = canPush(s);
  if (!fit.ok) { if (fit.why) s.lastEvent = fit.why; return s; }
  if (!k || !o) { s.standoff = null; return s; }
  spend(s, PUSH_COST);
  k.rounds += 1;
  const odds = clamp(k.pack.room - k.rounds * 14 + (tierIdx(s) >= 5 ? 12 : 0));
  if (chance(odds)) {
    k.pack = { ...k.pack, fee: Math.round(k.pack.fee * 1.16),
      points: k.pack.points ? k.pack.points + rint(1, 2) : (tierIdx(s) >= 4 && chance(45) ? rint(2, 3) : 0) };
    s.lastEvent = `They went out of the room for eleven minutes and came back with more. ${Math.round((k.pack.fee / k.pack.was - 1) * 100)}% an episode now${k.pack.points ? `, and ${k.pack.points}% of it` : ''}. Your agent has stopped writing things down, which is the tell.`;
    return s;
  }
  // No. And on the second no, the people who can end it are already in the building.
  if (k.rounds >= 2 && chance(42)) return closeTheShow(s, 'them');
  s.lastEvent = `Nothing moved. ${k.pack.mood} The offer on the table is the offer on the table, and somebody has started looking at their phone.`;
  return s;
}

// You end it. Nobody takes a show like this away from you — you leave it.
export function walkTheRoom(s) {
  const k = standoff(s), o = standoffOffer(s);
  if (!k) return s;
  // You leaving does not automatically end the programme. What happens next is the same
  // five things, minus the one where they pay — because you are the one who left.
  if (o) {
    const odds = failureOdds(s, o);
    delete odds.pay;
    let r = Math.random() * Object.values(odds).reduce((x, y) => x + y, 0);
    let pick = null;
    for (const kk of Object.keys(odds)) { if ((r -= odds[kk]) <= 0) { pick = kk; break; } }
    // The call, not its answer: itFails writes what became of the show into the state.
    itFails(s, { ...o, _forced: pick });
    setRespect(s, (s.respect || 0) + 2);   // leaving on your own terms reads as a spine
    return s;
  }
  return closeTheShow(s, 'you');
}

// Roll the five. Everything except paying means you are not in it, and they are all
// different kinds of not being in it.
export function itFails(s, o) {
  const odds = failureOdds(s, o);
  let r = Math.random() * 100;
  let pick = null;
  for (const k of Object.keys(odds)) { if ((r -= odds[k]) <= 0) { pick = k; break; } }
  pick = pick || 'around';
  const k = standoff(s);
  const title = k ? k.title : clean(o.seriesTitle || o.projectTitle);
  const next = (o.season || 1) + 1;
  if (pick === 'pay') {
    // They blink. It happens, and it happens most when the show is you.
    const p = k ? k.pack : packageFor(s, o);
    p.fee = Math.round(p.fee * 1.12);
    if (k) k.pack = p;
    s.lastEvent = `Somebody senior said a short word, and then they paid. ${Math.round((p.fee / p.was - 1) * 100)}% an episode. Nobody in that room will ever refer to this afternoon again.`;
    addTimeline(s, `They paid, in the end, for "${title}".`);
    return { how: pick, kept: true };
  }
  s.standoff = null;
  s.offers = (s.offers || []).filter((x) => x.id !== o.id);
  s.inbox = (s.inbox || []).filter((m) => m.offerId !== o.id);
  if (pick === 'cancel') {
    setRespect(s, (s.respect || 0) - 1);
    addTimeline(s, `"${title}" is not coming back. The money could not be agreed and nobody will say so.`, true);
    s.lastEvent = `They closed the file at ten to five. There is no season ${next} — not recast, not delayed, not made. Too much of it was you to carry on without you, and not enough of it was worth what you were asking.`;
  } else {
    const line = pick === 'killed'
      ? `They are killing your character. It will be a good episode and people will say so, and they will be right, and that is the last of it.`
      : pick === 'newLead'
      ? `They are bringing somebody in above the title. A name, on a deal signed in a fortnight, and a first episode built entirely around explaining where you went.`
      : `They are writing the show around somebody else. One of the people who has been standing behind you for five years moves forward a step, and by episode four it looks deliberate.`;
    addTimeline(s, `Out of "${title}". Season ${next} is going ahead without you.`, true);
    s.lastEvent = `${line} Season ${next} goes ahead exactly as planned, and you will find out how it does the way everybody else does.`;
  }
  return { how: pick, kept: false };
}

function closeTheShow(s, who) {
  const k = standoff(s), o = standoffOffer(s);
  const title = k ? k.title : 'it';
  s.standoff = null;
  if (o) {
    s.offers = (s.offers || []).filter((x) => x.id !== o.id);
    s.inbox = (s.inbox || []).filter((m) => m.offerId !== o.id);
  }
  // Walking out of your own show is read as a spine or as trouble, depending who is asked.
  setRespect(s, (s.respect || 0) + (who === 'you' ? 1 : -1));
  addTimeline(s, `"${title}" is not coming back. The money could not be agreed and nobody will say so.`, true);
  s.lastEvent = who === 'you'
    ? `You said no, put your coat on, and left. There is no season ${(k ? k.season : 1) + 1}. The cast will hear this afternoon, the crew will read it tomorrow, and for about a year everybody will tell you it was the right call.`
    : `They closed the file at ten to five. There is no season ${(k ? k.season : 1) + 1} — not recast, not delayed, not made. A network would rather lose a show than set a number the whole town can read, and that is the part nobody tells you before your first one.`;
  return s;
}

// What your agent would tell you before you walk in. Every line of it is a real thing
// agents actually weigh, and seeing them is most of what makes the room a decision rather
// than a menu.
export function leverageLines(s, o) {
  const d = dependency(s, o);
  const last = lastSeason(s, o);
  const bar = (n) => n >= 2.5 ? '+++' : n >= 1.5 ? '++' : n >= 0.5 ? '+' : n <= -1.5 ? '--' : n <= -0.5 ? '-' : '·';
  const out = [];
  out.push({ what: 'How the show is doing', mark: bar(last ? (last.pull >= 1.6 ? 3 : last.pull >= 1.1 ? 2 : last.pull >= 0.75 ? 0 : -2) : 1) });
  out.push({ what: 'How much of it is you', mark: bar(d >= 85 ? 3 : d >= 65 ? 2.5 : d >= 45 ? 1.5 : 0) });
  out.push({ what: 'Hard to replace', mark: bar(d >= 75 ? 3 : d >= 50 ? 2 : d >= 30 ? 0.5 : -1) });
  out.push({ what: 'Your own name outside it', mark: bar((s.fame || 0) >= 80 ? 2.5 : (s.fame || 0) >= 60 ? 1.5 : (s.fame || 0) >= 40 ? 0.5 : -0.5) });
  if (((s.awards || {}).wins || []).length) out.push({ what: 'What is on your shelf', mark: bar(1) });
  if (last && last.held < 0.9) out.push({ what: 'It is shedding people', mark: '--' });
  if ((s.scandal || 0) >= 30) out.push({ what: 'The press you have had', mark: '--' });
  return out;
}

// ── for the screen ────────────────────────────────────────────────────────────
export function liveStandoff(s) {
  const k = standoff(s);
  if (!k || !k.open) return null;
  const o = standoffOffer(s);
  const p = k.pack;
  return {
    title: k.title, season: k.season, rounds: k.rounds, mood: p.mood,
    asked: k.asked || null, gave: k.gave || null, chairs: CHAIRS,
    // What your agent would tell you before you walk in.
    leverage: o ? leverageLines(s, o) : [],
    dependency: o ? dependency(s, o) : 0,
    replacement: o ? replacementWord(dependency(s, o)) : null,
    asks: (o ? asksFor(s, o) : ASK_IDS).map((id) => ({ id, ...ASKS[id] })),
    rise: Math.round((p.fee / p.was - 1) * 100),
    fee: p.fee, was: p.was, episodes: p.episodes, wasEpisodes: p.wasEpisodes,
    because: p.because, grew: p.grew, last: p.last,
    points: p.points, producer: p.producer, directOne: p.directOne,
    terms: [
      `${Math.round((p.fee / p.was - 1) * 100)}% more an episode`,
      p.points ? `${p.points}% of the show` : null,
      p.producer ? EXTRAS.producer.label : null,
      p.episodes < p.wasEpisodes ? `${p.episodes} episodes instead of ${p.wasEpisodes}` : null,
      p.directOne ? EXTRAS.directOne.label : null,
    ].filter(Boolean),
    pushCost: PUSH_COST,
    can: canPush(s),
  };
}
