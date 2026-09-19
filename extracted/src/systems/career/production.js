import { rint, chance, pick } from '../../engine/rng.js';
import { COST, canAfford, spend, tooTired } from '../../engine/energy.js';
import { uid } from '../../engine/id.js';
import { setQuote, setRespect } from '../meta/status.js';
import { addTimeline, showMoment } from '../../engine/timeline.js';
import { inCareer } from '../../engine/stage.js';
import { paid } from './agent.js';
import { hotGenre } from '../meta/news.js';
import { addGenreXP, genreBonus } from './genres.js';
import { scheduleRelease } from './release.js';
import { rollStability, productionTrouble, volatileSwing, roughness } from './stability.js';
import { makePremise, prestigeShift, ratingShift, swingShift, apartShift, appealShift } from './story.js';
import { skillCap } from './actions.js';
import { coldStart } from '../meta/standing.js';
import { activeActors, actorById } from '../world/world.js';
import { fameTier } from '../meta/status.js';
import { personName, namesInUse } from '../world/names.js';
import { sets, addSet, removeSet, setById, canTakeSet, slotsFree, MAX_SETS, SET_RESPECT } from '../../engine/sets.js';
export { sets, canTakeSet, slotsFree, MAX_SETS, SET_RESPECT };
const clamp = (v) => Math.max(0, Math.min(100, v));
// A shoot opens on 20 and 20 used to be labelled "Disaster", so the very first thing the
// game said about every film you ever made was that it was already a catastrophe — on day
// one, before a frame was shot. Twenty is not a disaster, it is a set where nobody has
// found it yet. Neutral in the rating maths is 40, and the labels now say so.
const TIERS = [
  { min: 0, label: 'Falling apart' }, { min: 14, label: 'Finding it' }, { min: 34, label: 'Coming together' },
  { min: 55, label: 'Solid' }, { min: 72, label: 'Great' }, { min: 88, label: 'Legendary' },
];
export function meterTier(meter) {
  let cur = TIERS[0];
  for (const t of TIERS) if ((meter || 0) >= t.min) cur = t;
  return cur;
}
const CREW_ROLES = { actor: ['Director', 'Co-star', 'Camera Operator'], singer: ['Producer', 'Vocal Coach', 'Sound Engineer'] };
const TRAITS = ['diva', 'perfectionist', 'chill', 'difficult'];
// A crew has heard about you before you arrive. Below zero, they start colder — the
// Avoided rung promised "crews ask not to be put on your call sheet" and nothing did it.
function makeCrew(s, scale) {
  const dream = s.dream, cold = coldStart(s);
  // bond0 is where they started, so the verdict at wrap can ask whether you made it worse.
  const used = namesInUse(s);
  const crew = CREW_ROLES[dream === 'singer' ? 'singer' : 'actor'].map((role) => makeOne(role));
  // On the bigger pictures the other name on the poster is somebody — a person from the
  // world, with a career you can look up, who is on the year's lists with you. An icon
  // opposite you sells your film like theirs and puts your name next to theirs in print.
  const star = costarFor(s, scale);
  if (star && dream !== 'singer') {
    crew[1] = { ...crew[1], name: star.name, worldId: star.id, bond: rint(20, 45) - cold + (star.icon ? -8 : 0) };
    crew[1].trait = star.icon ? pick(['diva', 'perfectionist', 'chill']) : crew[1].trait;
  }
  // A director you already know. Maxi: "people vanish" — a director you spent six months
  // with was gone at wrap, and the next shoot was three strangers again. Now a director in
  // your phone comes back to direct you, one shoot in three, and starts where you left
  // them: a warm one warm, a cold one cold. The business is small; that is the point of it.
  const known = (s.people || []).filter((p) => /Director|Producer/.test(p.role || '') && !p.cold && (p.relationship || 0) > 15 && p.fromSet);
  if (known.length && chance(33)) {
    const k = pick(known);
    crew[0] = { ...crew[0], name: k.name, bond: Math.max(10, Math.min(90, k.relationship || 40)), knownId: k.id };
  }
  return crew.map((c) => ({ ...c, bond0: c.bond }));
  function makeOne(role) {
    const gender = chance(50) ? 'female' : 'male';
    const name = personName(gender, used);
    return { id: 'crew' + Math.random().toString(36).slice(2, 8), name, gender, role, trait: pick(TRAITS), bond: rint(30, 55) - cold };
  }
}
// Who would be cast opposite you. The size of the picture decides how often it is a name at
// all, and which names: nobody puts an icon in a short, and nobody puts a nobody in a tentpole.
const COSTAR_ODDS = { blockbuster: 70, feature: 42, prestige: 38, indie: 18, recurring: 10 };
const COSTAR_TIERS = { blockbuster: ['icon', 'alist', 'star'], feature: ['alist', 'star', 'known'], prestige: ['star', 'known', 'alist'], indie: ['known', 'rising', 'star'], recurring: ['known', 'rising'] };
function costarFor(s, scale) {
  const odds = COSTAR_ODDS[scale] || 0;
  if (!odds || !chance(odds)) return null;
  const tiers = COSTAR_TIERS[scale] || [];
  const pool = activeActors(s).filter((a) => tiers.includes(a.icon ? 'icon' : fameTier(a.fame).id));
  if (!pool.length) return null;
  // The first tier named is the one they would want; it is not always available.
  const first = pool.filter((a) => (a.icon ? 'icon' : fameTier(a.fame).id) === tiers[0]);
  return pick(first.length && chance(55) ? first : pool);
}
// The people you spent the shoot with do not vanish at wrap. A director or a co-star who
// warmed to you is in your phone now — a contact like any other, who fades if you never
// ring, and who can come back to direct you. Their weight is the size of the picture.
const DIRECTOR_WEIGHT = { oneoff: [45, 60], small: [50, 65], episode: [55, 70], indie: [60, 76], festival: [58, 76], recurring: [62, 78], feature: [74, 88], prestige: [80, 92], blockbuster: [85, 96] };
function keepTheCrew(s, p) {
  const kept = [];
  for (const c of (p.crew || []).slice(0, 2)) {
    const isDirector = c.role === 'Director' || c.role === 'Producer';
    const existing = c.knownId ? (s.people || []).find((x) => x.id === c.knownId) : (s.people || []).find((x) => x.name === c.name);
    // Somebody you already knew: the shoot IS the relationship now, warmer or colder.
    if (existing) { existing.relationship = c.bond; existing.lastSeen = (s.year || 0) * 12 + (s.month || 0); if (c.bond > 10) existing.cold = false; continue; }
    if ((c.bond || 0) < 60) continue;
    const span = DIRECTOR_WEIGHT[p.scale] || [55, 70];
    const star = c.worldId ? actorById(s, c.worldId) : null;
    (s.people = s.people || []).push({ id: uid(s, 'p'), name: c.name, worldId: c.worldId || null,
      gender: star ? star.gender : (c.gender || null), born: star ? star.born : (s.year || 2040) - Math.max(22, (s.ageY || 30) + rint(-6, 18)),
      role: isDirector ? (s.dream === 'singer' ? 'Music Producer' : 'Film Director') : star ? (star.icon ? 'Icon' : 'Star') : (s.dream === 'singer' ? 'Fellow Musician' : 'Fellow Actor'),
      industryWeight: isDirector ? rint(span[0], span[1]) : star ? Math.round(Math.max(40, star.fame)) : rint(Math.max(15, Math.round((s.fame || 0) * 0.5)), Math.min(90, Math.round((s.fame || 0) * 0.5) + 30)),
      relationship: c.bond, unlocks: isDirector ? 'aaa' : null, met: `${s.year}`, fromSet: p.title, lastSeen: (s.year || 0) * 12 + (s.month || 0) });
    kept.push(`${c.name} (${isDirector ? 'director' : 'co-star'})`);
  }
  if (kept.length) addTimeline(s, `${kept.join(' and ')} ${kept.length > 1 ? 'are' : 'is'} in your phone now. That is what a good set leaves you.`);
}
// Older offers were written before releases existed and carry no scale of their own.
function scaleOfOffer(offer) {
  return offer.scale || (offer.episodes ? (offer.tier === 'lead' ? 'recurring' : 'episode')
    : offer.tier === 'tentpole' ? 'blockbuster' : offer.tier === 'lead' ? 'feature' : 'indie');
}
export function startProduction(s, offer) {
  const p = {
    id: uid(s, 'set'), offerId: offer.id, title: offer.projectTitle.replace('⭐ ', ''), role: offer.role, type: offer.type,
    genre: offer.genre, salary: offer.salary, months: offer.months, monthsLeft: offer.months,
    prestigeScore: offer.prestigeScore, tier: offer.tier, campaign: !!offer.campaign,
    // What part one was paid. Every sequel raise is measured against THIS, not against
    // whatever the last one happened to earn. See systems/career/franchise.js.
    baseSalary: offer.baseSalary || offer.salary, arc: offer.arc || null,
    scale: scaleOfOffer(offer),
    // Carried so the thing can continue: which season, which part of the franchise,
    // and whether you signed away the right to say no.
    episodes: offer.episodes || 0, episodeFee: offer.episodeFee || 0,
    // The name of the show, kept apart from this season's project title so that season
    // four is not built by appending to the title of season three.
    seriesTitle: offer.seriesTitle || (offer.episodes ? offer.projectTitle.replace('⭐ ', '') : ''),
    season: offer.season || (offer.episodes ? 1 : 0), part: offer.part || 1,
    // A show you joined mid-run already has an audience; it is on the listing and the
    // night it goes out inherits it (release.js viewersFor) instead of rolling a fresh one.
    joined: !!offer.joined, audience: offer.audience || 0,
    optioned: !!offer.optioned, optionParts: offer.optionParts || 0,
    // The contract. Preparation is months on the calendar before the first day; an
    // exclusive shoot takes your Saturdays too; points pay out when the run closes.
    prepLeft: offer.prep || 0, prep: offer.prep || 0, exclusive: !!offer.exclusive, backend: offer.backend || 0,
    // How solid the money is. Decides whether this shoot ever reaches its last day, and
    // how wildly the finished thing can turn out. See systems/career/stability.js.
    stability: offer.stability ?? rollStability(offer.scale || 'feature'),
    crew: makeCrew(s, scaleOfOffer(offer)), meter: 20,
    // What it is about, and which version of it you end up shooting. See story.js — the
    // argument happens on day one and the room decides whether you are listened to.
    premise: makePremise(), take: null, takeWon: false,
  };
  // One more set. Three at most, and the second and third only for somebody they trust
  // to turn up — see engine/sets.js. The callers check first; this is the last door.
  addSet(s, p);
  const star = p.crew.find((c) => c.worldId);
  if (star) {
    const a = actorById(s, star.worldId);
    if (a) { Object.assign(p, { with: a.name, withId: a.id, withFame: a.fame, withIcon: !!a.icon });
      addTimeline(s, a.icon ? `${a.name} is in it. You will be on a poster with an icon.` : `${a.name} is your co-star.`); }
  }
  // Your quote is the biggest fee you have ever commanded for a picture, and it is set
  // by taking the job — not only by winning an argument about it. Television is priced
  // per episode and is a different currency, so it does not move this number.
  if (!p.episodes) setQuote(s, Math.max(s.quote || 0, p.salary || 0));
  // Every job costs something before a single day is shot: the prep, the travel, the
  // press, the moving of your whole life onto somebody's schedule. Charging only by the
  // month meant ten two-month films were cheaper than four five-month ones, and an actor
  // could take short work forever — two hundred careers still averaged a hundred and
  // forty-four credits. And walking onto a call sheet while you are already tired costs
  // more again: that is the decision the whole system is about.
  // A part you got through somebody's dinner table. The crew knows, and the director starts
  // ten points colder than they would for anyone else — you have a shoot to prove it wrong.
  if (offer.viaPartner) {
    const lead = p.crew[0];
    lead.bond = clamp(lead.bond - 10); lead.bond0 = lead.bond;
    p.viaPartner = offer.viaPartner;
    // Maxi: "and if you got into A-list pictures through a lover, your reputation can be bad."
    // The business has a word for it, and the trades have a column. Five points now; the
    // film decides the rest — see release.js closeRun.
    setRespect(s, (s.respect || 0) - 5);
    s.scandal = clamp((s.scandal || 0) + 4);
    s.media = clamp((s.media || 0) + 6);
    addTimeline(s, `Everybody on ${p.title} knows how you got the part. ${lead.name} has not said anything, which is how you know. The trades have said plenty.`, true);
  }
  // Walking onto a second call sheet while the first is running costs more again.
  const others = sets(s).length - 1;
  s.strain = Math.min(100, (s.strain || 0) + 6 + ((s.strain || 0) > 48 ? 9 : 0) + others * 5);
  const dir = p.crew[0];
  s.lastEvent = dir.knownId ? `Cameras roll on "${p.title}". ${dir.name} is directing — you two have done this before.` : `Cameras roll on "${p.title}". First day on set.`;
  if (others) s.lastEvent += ` That is ${others + 1} sets at once — the month is shorter for it.`;
  addTimeline(s, `Production began: ${p.title}.`);
  return s;
}
// Walking off a set for a bigger picture. They recast in a week, the money stops where it
// stopped, and the business hears — the same price depression.js charges for walking off.
export function walkOffSet(s, setId, forTitle) {
  const p = sets(s).find((x) => x.id === setId); if (!p) return s;
  removeSet(s, p);
  setRespect(s, (s.respect || 0) - ((p.episodes || 0) > 0 ? 7 : 9));
  addTimeline(s, `Walked off "${p.title}"${forTitle ? ` for "${forTitle}"` : ''}. They recast within the week. Everybody heard.`, true);
  return s;
}
// A month's rehearsal is worth a lot the first time and less each time after. Six goes at
// fifteen energy each took any shoot to a hundred inside a month — Maxi: "that's easy,
// don't you find?" The third pass finds a little; after that you are running it into the ground.
const REHEARSAL_GAIN = [[4, 9], [3, 6], [1, 3]];
function monthKey(s) { return (s.year || 0) * 12 + (s.month || 0); }
export function rehearsalsThisMonth(s, id) { const p = setById(s, id); return p && p._rehearsedMonth === monthKey(s) ? (p._rehearsals || 0) : 0; }
export function rehearse(s, id) {
  const p = setById(s, id); if (!p) return s;
  const n = rehearsalsThisMonth(s, id);
  if (n >= REHEARSAL_GAIN.length) { s.lastEvent = 'You have run it into the ground. It will not get better before the cameras do — come back next month.'; return s; }
  if (!canAfford(s, COST.rehearse)) { s.lastEvent = tooTired(s, COST.rehearse); return s; }
  spend(s, COST.rehearse);
  const span = REHEARSAL_GAIN[n];
  const gain = rint(span[0], span[1]);
  p.meter = clamp(p.meter + gain);
  p._workedMonth = monthKey(s); p._rehearsedMonth = monthKey(s); p._rehearsals = n + 1;
  s.lastEvent = n === 0 ? `Solid rehearsal. Shoot quality +${gain}.` : n === 1 ? `Another pass. Shoot quality +${gain}.` : `You found a little more. Shoot quality +${gain} — and that is all this month has in it.`;
  return s;
}
export function takesThisMonth(s, id) { const p = setById(s, id); return p && p._takenMonth === monthKey(s) ? (p._takes || 0) : 0; }
export function riskyTake(s, quality = 0, id) {
  const p = setById(s, id); if (!p) return s;
  if (takesThisMonth(s, id) >= 2) { s.lastEvent = 'The crew has given you two of those this month. Nobody is resetting the lights a third time.'; return s; }
  if (!canAfford(s, COST.take)) { s.lastEvent = tooTired(s, COST.take); return s; }
  spend(s, COST.take);
  p._workedMonth = monthKey(s); p._takenMonth = monthKey(s); p._takes = takesThisMonth(s, id) + 1;
  if (quality >= 80) {
    const gain = rint(16, 22);
    p.meter = clamp(p.meter + gain);
    s.lastEvent = `Perfect take! Shoot quality +${gain}.`;
  } else if (quality >= 45) {
    const gain = rint(8, 14);
    p.meter = clamp(p.meter + gain);
    s.lastEvent = `Good take. Shoot quality +${gain}.`;
  } else {
    const loss = rint(5, 12);
    p.meter = clamp(p.meter - loss);
    s.mental = clamp((s.mental || 50) - 3);
    s.lastEvent = `The take falls flat in front of everyone. Shoot quality −${loss}.`;
  }
  return s;
}
export function bondWithCrew(s, crewId) {
  // The crew member says which set: ids are unique across sets.
  const p = sets(s).find((x) => (x.crew || []).some((c) => c.id === crewId)); if (!p) return s;
  const c = (p.crew || []).find((x) => x.id === crewId); if (!c) return s;
  if (!canAfford(s, COST.bond)) { s.lastEvent = tooTired(s, COST.bond); return s; }
  spend(s, COST.bond);
  p._workedMonth = (s.year || 0) * 12 + (s.month || 0);
  const gain = rint(6, 14);
  c.bond = clamp(c.bond + gain);
  s.mental = clamp((s.mental || 50) + 1);
  s.lastEvent = `You and ${c.name} (${c.role}) got closer. Bond +${gain}.`;
  return s;
}
// How many sets they will let you be on at once, by standing — engine/sets.js SET_RESPECT.
export function setsAllowed(s) {
  const r = s.respect || 0;
  return 1 + (r >= SET_RESPECT[1] ? 1 : 0) + (r >= SET_RESPECT[2] ? 1 : 0);
}
// The month a second set, and a third, opens to you — said out loud, once, when it
// happens. Maxi: "when the sets appear there must be a pop-up." Standing crosses 25 and
// a studio will let you split the week; 50 and three. And when standing falls back
// through the line, a quiet note that they will not any more.
export function setsTick(s) {
  if (!inCareer(s)) return s;
  const allowed = setsAllowed(s);
  const known = s.setsKnown || 1;
  if (allowed > known) {
    const second = allowed === 2;
    showMoment(s, {
      id: 'sets', kind: 'good', sets: allowed, title: second ? 'A second set' : 'A third set',
      body: second
        ? `Standing ${SET_RESPECT[1]}. A studio will now let you split the week — two sets at once, a contract that says "alongside" instead of "after". It costs twenty energy a month and every director gets a little less of you, and it is how a working actor makes three pictures a year.`
        : `Standing ${SET_RESPECT[2]}. Three sets at once — the most anyone can do. Sixty energy a month to live on, three directors who each think they are the only one, and the calendar of somebody the business cannot get enough of.`,
    });
    addTimeline(s, second ? 'They will let you work two sets at once now.' : 'Three sets at once — they trust you to turn up.');
  } else if (allowed < known) {
    addTimeline(s, allowed === 1 ? 'Below standing 25 again. One set at a time, like anybody.' : 'Below standing 50. Two sets at most until it comes back.', true);
    s.lastEvent = allowed === 1 ? 'Your standing fell under 25. Nobody will let you split the week any more — one set at a time.' : 'Your standing fell under 50. Two sets at once, not three, until it comes back.';
  }
  s.setsKnown = allowed;
  return s;
}
export function productionTick(s) {
  // Every set gets its month. The list is copied because a wrap removes from it.
  for (const p of [...sets(s)]) tickSet(s, p);
}
function tickSet(s, p) {
  // Preparation: the body, the accent, the stunts. Unpaid, and the set opens better for it.
  if ((p.prepLeft || 0) > 0) {
    p.prepLeft -= 1;
    p.meter = clamp((p.meter || 20) + rint(5, 9));
    if (p.prepLeft === (p.prep || 1) - 1) addTimeline(s, `Preparation for "${p.title}" — ${p.prep} month${p.prep === 1 ? '' : 's'} before the first day.`);
    if (p.prepLeft === 0) { s.lastEvent = `Cameras roll on "${p.title}". You arrive ready.`; addTimeline(s, `Cameras roll on ${p.title}.`); }
    return;
  }
  // A serious illness stops the shoot dead — the schedule waits for you.
  if ((s.illness && s.illness.freezes) || (s.burnout && s.burnout.rest && s.burnout.left > 0)) {
    p.paused = (p.paused || 0) + 1;
    if (p.paused === 1) addTimeline(s, `${p.title} is on hold while you recover.`, true);
    return;
  }
  p.paused = 0;
  // A month you drank your way through is a month you were not really there for, and the
  // footage knows — but the counting happens in drinkTick, which runs first and is the last
  // place the flag is still true. See systems/life/drink.js.
  // Turning up not knowing the pages. Maxi: standing should fall for arriving unprepared —
  // and there was no mechanism for it, because the director's opinion only ever moved on
  // events. A month on set where you did not rehearse, run a take or spend an evening with
  // the crew is a month the director watched you wing it. It cools them, and a cold
  // director is what costs you standing at wrap — the mechanism was already there, it was
  // just never fed. Said out loud the first time.
  // The tick closes the month that just happened, and advanceMonth has already moved the
  // calendar on by the time it runs — so the month to check is the one BEFORE the stamp.
  // Checking the stamp itself cooled the director on everybody, including the actor who
  // rehearsed every single month; the probe caught it at 45 → 29.
  const stamp = (s.year || 0) * 12 + (s.month || 0);
  const lead = (p.crew || [])[0];
  // And only if it SHOWS. A director does not care how you got there if the takes are
  // good — unpreparedness is something they see in the work, not in your diary. Below 55
  // the set is not going well and they start to wonder why; above it, nobody is asking.
  if (lead && p._workedMonth !== stamp - 1 && (p.months - p.monthsLeft) >= 1 && (p.meter || 0) < 55) {
    p._winged = (p._winged || 0) + 1;
    // A pattern, not a bad week. The first month everybody gets; the second they notice; from
    // the third it is who you are on this set. A flat penalty from month one put an
    // A-lister who rehearsed every OTHER month at −8 standing by sixty, which is nonsense.
    const cool = p._winged === 1 ? 0 : p._winged === 2 ? rint(3, 5) : rint(5, 8);
    lead.bond = clamp(lead.bond - cool);
    if (p._winged === 2) addTimeline(s, `${lead.name} has noticed you turn up not knowing the pages.`, true);
  }
  // And the reverse, which was missing. The director's opinion only ever moved DOWN on its
  // own — up took an evening with them, one energy at a time — so a player who rehearsed
  // every month of forty years wrapped seventy films and never once heard a good word:
  // measured, the +3 at wrap fired zero times across fifteen perfect careers, and standing
  // sat at 4 after twenty years of doing everything right. They see the work. A month you
  // turned up for on a set that is going well warms them, and a set that is going very
  // well warms them faster.
  // The line is the same 55 the cooling reads: below it they wonder, above it they notice.
  if (lead && p._workedMonth === stamp - 1 && (p.meter || 0) >= 55) {
    lead.bond = clamp(lead.bond + ((p.meter || 0) >= 80 ? rint(3, 5) : rint(2, 3)));
  }
  // And a month you drank your way through, the whole set noticed. drunkMonths was counted
  // and hit the rating, silently — the director never reacted and nobody said anything.
  if (lead && p.drunkMonths && p._drunkSeen !== p.drunkMonths) {
    p._drunkSeen = p.drunkMonths;
    lead.bond = clamp(lead.bond - rint(6, 10));
    if (p.drunkMonths === 1) addTimeline(s, `Forty people waited two hours for you this month. ${lead.name} did not say anything, which was worse.`, true);
  }
  p.monthsLeft -= 1;
  // You are paid while you work. A fourteen-month blockbuster that only paid on wrap
  // would starve you out of your flat long before the premiere.
  const perMonth = Math.round((p.salary || 0) / Math.max(1, p.months || 1));
  p.paid = (p.paid || 0) + perMonth;
  if (perMonth > 0) paid(s, perMonth, `"${p.title}" — month ${(p.months - p.monthsLeft)}`);
  if (p.monthsLeft > 0) {
    // The money can walk at any point up to the last day, but you are paid for the days
    // you actually worked — so this is rolled AFTER the month is paid. Rolling it first
    // meant a shoot that stopped in month one left you with literally nothing.
    productionTrouble(s, p);
    return;
  }
  wrapProduction(s, p);
}
// Nobody in this game got better at their job by doing their job. Acting rose from paid
// classes, one school play and two youth events — and from nothing else, ever. Measured
// across 120 careers that shot a median of 85 films: every one of them finished as good as
// they were at twenty, which is why the median film scored 2.5/10.
//
// So a shoot teaches you something. Steeply diminishing — you learn an enormous amount on
// your third film and almost nothing on your fortieth — and still bounded by skillCap, so
// working a lot cannot substitute for the training and the hits it asks for.
function learnOnSet(s, p) {
  const key = s.dream === 'singer' ? 'singing' : 'acting';
  const now = s[key] || 0;
  const cap = skillCap(s);
  if (now >= cap) return 0;
  const room = 1 - now / 104;                        // 0.83 at twenty, 0.14 at ninety
  const months = Math.min(2, 0.5 + (p.monthsTotal || p.months || 4) / 7);
  const shoot = 0.55 + (p.meter || 20) / 130;        // a set that worked teaches more
  const lead = p.tier === 'supporting' ? 0.6 : 1;    // you learn most carrying it
  const gain = Math.max(0, room * 2.6 * months * shoot * lead);
  const next = Math.min(cap, now + gain);
  const real = next - now;
  s[key] = next;
  return real;
}

// ── the two ends of the ten-point scale ───────────────────────────────────────────────
//
// Everything that decides a rating is a SUM, and a sum against a hard 0–100 clamp piles up
// at both ends. Measured over a well-played forty-year career: films opened on 0.9/10 at
// the bottom, and 9.5% of everything made came out at exactly 10.0/10 at the top — a normal
// hump in the fifties with a spike stuck on the end of it.
//
// Neither number exists. The worst-reviewed pictures ever made sit around 1.5 to 2.5,
// because the people scoring them are an audience and some of them turned up for the
// disaster on purpose. And nothing has ever scored ten.
//
// So both ends are compressed instead of cut. There is no step anywhere in the curve: the
// middle of the scale — where every threshold in the game is calibrated — is untouched.
function bottomOut(r) { return r >= 28 ? r : 15 + (Math.max(0, r) / 28) * 13; }
// Above 86 the scale gets tight and approaches 98 without arriving. A raw 100 comes out at
// 91.6, a raw 130 at 95.4. The only thing that reaches higher is a world hit, which sets
// its own number, because that is what "a world hit" means.
function topOut(r) { return r <= 86 ? r : 86 + 12 * (1 - Math.exp(-(r - 86) / 22)); }

function wrapProduction(s, p) {
  const skill = s.dream === 'singer' ? s.singing : s.acting;
  // Skill is a FLOOR, not a ceiling: a master never embarrasses themselves, but a hit has to
  // be earned on set. Before this, skill 100 alone cleared the 85 hit line on every project.
  // The script decides most of it. That is the thing the game had backwards: skill and a
  // month of rehearsal were the two biggest terms, both fully under the player's control,
  // so an actor at 88 who rehearsed every month made a Hit 36 times in 60 and the WORST
  // film they could physically produce was a 7.5. No actor alive has that record. You take
  // a part expecting a hit and it comes out as nothing, and the reason is almost never you.
  const floor = 20 + skill * 0.30;                // you never embarrass yourself — that is all
  const craft = (p.meter - 40) * 0.45;            // how the shoot actually went — can go negative
  // The swing. A locked studio picture comes out roughly as good as it was always going
  // to be; a project held together with tape can be the film of the year or nothing at
  // all. This is why an indie is worth the gamble.
  // No money also means no days and no post, so a broke production is rougher — but the
  // part it gave you was better, and those two roughly cancel. What is left is the swing.
  const material = clamp((p.prestigeScore || 50) + prestigeShift(p));
  // NOT clamped here. Every term above is a sum, and clamping the sum at 100 turned the
  // top of the scale into a pile: 9.5% of a well-played career's films came out at exactly
  // 10.0/10, and the distribution had a normal hump in the fifties and then a spike at the
  // ceiling. No film has ever scored ten. Everything past 86 is compressed instead —
  // see topOut below — so a great film and a masterpiece stop being the same number.
  let rating = floor + craft - roughness(p.stability) - (p.drunkMonths || 0) * 1.6 + material * 0.18
    + (s.looks - 40) * 0.08 + genreBonus(s, p.genre) + rint(-16, 12) + volatileSwing(p.stability)
    + ratingShift(p) + (swingShift(p) ? rint(-swingShift(p), swingShift(p)) : 0);
  // And then the material has the last word. Nobody has ever acted a bad script into a good
  // film — an actor at 88 who rehearsed every month used to make a Hit 36 times in 60 and
  // the WORST thing they could physically produce was a 7.5, whatever they were handed.
  // Rebalancing the weights instead just moved the whole scale and broke every threshold
  // downstream of it: the awards floor, renewals, the risk bands. This is the one honest
  // sentence — you cannot come out much above what you were given.
  // And sometimes it simply does not come together, and none of it is your fault. The edit,
  // the director's cut, a score that fights the film, a release nobody wanted — you did the
  // work, you walked off that set thinking it was the one, and then you sat in a screening
  // and watched something else. Every actor alive has two or three of these.
  //
  // This is the honest version of "a great actor can still make garbage". Capping the rating
  // against the script was the other attempt and it was wrong twice over: it flattened every
  // mediocre film to exactly the same number, and prestigeScore is how prestigious the JOB
  // is, not how good the writing is — a small film can be a masterpiece and that table
  // cannot tell the difference.
  // And a production nobody could pay for is likelier to lose it in the edit than one that
  // could afford the days. A flat chance made a locked studio picture and a film with no
  // money behind it flop at exactly the same rate — 22.4% against 22.5% — which erased the
  // whole point of the backing you were shown before signing.
  if (chance(Math.max(2, 11 + Math.max(0, 88 - (p.stability ?? 88)) * 0.22 + apartShift(p)))) {
    rating = rating - rint(16, 32);
    p.fellApart = true;
  }
  // Both ends of the scale, compressed rather than cut off, so neither one piles up.
  rating = clamp(topOut(bottomOut(rating)));
  // A genuine cultural moment should be a career highlight, not a monthly occurrence.
  let worldHit = false;
  if (rating >= 90 && p.tier !== 'supporting') {
    let odds = 1.5 + (rating - 90) * 0.4;
    if (p.genre === hotGenre(s)) odds += 7;
    if (p.campaign) odds += 5;
    worldHit = chance(Math.min(18, odds));
  }
  if (worldHit) rating = Math.max(rating, 96);
  const status = worldHit ? 'World Hit' : rating >= 85 ? 'Hit' : rating >= 70 ? 'Well-received' : rating >= 50 ? 'Released' : 'Flop';
  const credit = { title: p.title, role: p.role, type: p.type, genre: p.genre, salary: p.salary, rating, status, year: s.year,
    season: p.season || 0, part: p.part > 1 ? p.part : 0, episodes: p.episodes || 0,
    // Who directed it, and how long it ran. The crew is thrown away at wrap, and the
    // filmography had no director on it — every real one lists them under the title.
    director: ((p.crew || [])[0] || {}).name || null, months: p.months || 0,
    wrappedAt: (s.year || 0) * 12 + (s.month || 0) };   // so the phone knows somebody wants to celebrate
  // The credit does NOT land here. It goes into post and opens months from now —
  // fame, box office and the score all arrive on premiere night, not on the last
  // day of shooting. See systems/career/release.js.
  credit.premise = p.premise; credit.take = p.takeWon ? p.take : null;
  scheduleRelease(s, credit, p);
  addGenreXP(s, p.genre, rating);
  // Whatever the monthly instalments did not cover — rounding, and the offers that were
  // written before instalments existed.
  const owed = Math.max(0, (p.salary || 0) - (p.paid || 0));
  // Rounding alone left "final payment: +€1" on the timeline. Pennies go in quietly.
  if (owed >= 50) paid(s, owed, `"${credit.title}" — final payment`);
  else if (owed > 0) s.cash = (s.cash || 0) + owed;
  s.confidence = clamp((s.confidence || 0) + 2);
  // What the crew says about you travels immediately — long before anyone sees the film.
  const lead = p.crew[0];
  let verdictNote = '';
  // A director who liked you says so. So does one who was never your friend but watched you
  // carry a set that went that well — the work is what they talk about afterwards. This is
  // the one source of standing that answers preparation directly, so it is the one that has
  // to be reachable: on a shoot of three months or more, an actor who turns up every month
  // gets the set there; on a two-month short, nobody earns a director's loyalty. Slower
  // at the top, like every other way up — the tenth good word is worth less than the first.
  const spoke = lead.bond >= 70 || ((p.meter || 0) >= 85 && lead.bond >= 40);
  const room = Math.max(0.16, 1 - (s.respect || 0) / 112);
  if (spoke) { setRespect(s, (s.respect || 0) + 3 * room); verdictNote = ` ${lead.name} tells anyone who'll listen how good you were.`; }
  // A cold verdict needs you to have made it worse. A crew that arrived having heard about
  // you and left thinking the same has nothing new to tell anyone — without this, one bad
  // set below zero became forty years at the floor: measured, the ordinary player went
  // from lowest −14 to lowest −40 the moment crews started cold, because a cold start
  // alone was enough to trip the verdict on every film.
  // And "made it worse" has to mean it: a crew that started at 30 and ended at 25 was cold
  // and stayed cold. Measured again with the point-by-point drop: an ordinary player — half
  // the months rehearsed, nothing walked off — still ended thirty years at −27 and spent
  // most of a life as the liability, three points a wrap, because every set below the
  // line tripped this. Twelve points colder than they started, on a set that went badly.
  else if (lead.bond <= 25 && lead.bond <= (lead.bond0 ?? 100) - 12 && (p.meter || 0) < 45) { setRespect(s, (s.respect || 0) - 3); verdictNote = ` ${lead.name} has quietly started telling a different story about you.`; }
  if (worldHit) s.worldHits = (s.worldHits || 0) + 1;
  keepTheCrew(s, p);
  // What the months on set left in you. Computed AFTER the rating, so this shoot is judged
  // on the actor you were when you walked on — not the one you walked off as.
  const learnt = learnOnSet(s, p);
  const craftNote = learnt >= 0.8
    ? ` You are better than you were when you started it.`
    : learnt >= 0.25 ? ` A few things clicked that never had before.` : '';
  if (learnt >= 0.8) addTimeline(s, `Months on ${credit.title} taught you something. ${s.dream === 'singer' ? 'Singing' : 'Acting'} is up.`);
  s.lastEvent = `"${credit.title}" is in the can. Now you wait for it to open.${verdictNote}${craftNote}`;
  // Whether it carries on is decided on the numbers, so that question waits for the
  // premiere too — release.js asks it once the thing has actually been seen.
  removeSet(s, p);
}
