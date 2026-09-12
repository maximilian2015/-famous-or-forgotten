import { rint, chance, pick } from '../../engine/rng.js';
import { setQuote, setRespect } from '../meta/status.js';
import { addTimeline } from '../../engine/timeline.js';
import { earn } from '../../engine/economy.js';
import { hotGenre } from '../meta/news.js';
import { addGenreXP, genreBonus } from './genres.js';
import { scheduleRelease } from './release.js';
import { rollStability, productionTrouble, volatileSwing, roughness } from './stability.js';
import { makePremise, prestigeShift, ratingShift, swingShift, apartShift, appealShift } from './story.js';
import { skillCap } from './actions.js';
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
const FIRST = ['Jonas', 'Mira', 'Theo', 'Nadia', 'Rin', 'Col', 'Ivy', 'Beau', 'Sasha', 'Omar'];
const LAST = ['Vane', 'Croft', 'Reyes', 'Marsh', 'Onyx', 'Blythe', 'Cole', 'Ferro'];
function makeCrew(dream) {
  const used = new Set();
  return CREW_ROLES[dream === 'singer' ? 'singer' : 'actor'].map((role) => {
    let name; do { name = `${pick(FIRST)} ${pick(LAST)}`; } while (used.has(name));
    used.add(name);
    return { id: 'crew' + Math.random().toString(36).slice(2, 8), name, role, trait: pick(TRAITS), bond: rint(30, 55) };
  });
}
export function startProduction(s, offer) {
  s.production = {
    offerId: offer.id, title: offer.projectTitle.replace('⭐ ', ''), role: offer.role, type: offer.type,
    genre: offer.genre, salary: offer.salary, months: offer.months, monthsLeft: offer.months,
    prestigeScore: offer.prestigeScore, tier: offer.tier, campaign: !!offer.campaign,
    // What part one was paid. Every sequel raise is measured against THIS, not against
    // whatever the last one happened to earn. See systems/career/franchise.js.
    baseSalary: offer.baseSalary || offer.salary, arc: offer.arc || null,
    // Older offers were written before releases existed and carry no scale of their own.
    scale: offer.scale || (offer.episodes ? (offer.tier === 'lead' ? 'recurring' : 'episode')
      : offer.tier === 'tentpole' ? 'blockbuster' : offer.tier === 'lead' ? 'feature' : 'indie'),
    // Carried so the thing can continue: which season, which part of the franchise,
    // and whether you signed away the right to say no.
    episodes: offer.episodes || 0, episodeFee: offer.episodeFee || 0,
    // The name of the show, kept apart from this season's project title so that season
    // four is not built by appending to the title of season three.
    seriesTitle: offer.seriesTitle || (offer.episodes ? offer.projectTitle.replace('⭐ ', '') : ''),
    season: offer.season || (offer.episodes ? 1 : 0), part: offer.part || 1,
    optioned: !!offer.optioned, optionParts: offer.optionParts || 0,
    // How solid the money is. Decides whether this shoot ever reaches its last day, and
    // how wildly the finished thing can turn out. See systems/career/stability.js.
    stability: offer.stability ?? rollStability(offer.scale || 'feature'),
    crew: makeCrew(s.dream), meter: 20,
    // What it is about, and which version of it you end up shooting. See story.js — the
    // argument happens on day one and the room decides whether you are listened to.
    premise: makePremise(), take: null, takeWon: false,
  };
  // Your quote is the biggest fee you have ever commanded for a picture, and it is set
  // by taking the job — not only by winning an argument about it. Television is priced
  // per episode and is a different currency, so it does not move this number.
  if (!s.production.episodes) setQuote(s, Math.max(s.quote || 0, s.production.salary || 0));
  // Every job costs something before a single day is shot: the prep, the travel, the
  // press, the moving of your whole life onto somebody's schedule. Charging only by the
  // month meant ten two-month films were cheaper than four five-month ones, and an actor
  // could take short work forever — two hundred careers still averaged a hundred and
  // forty-four credits. And walking onto a call sheet while you are already tired costs
  // more again: that is the decision the whole system is about.
  s.strain = Math.min(100, (s.strain || 0) + 6 + ((s.strain || 0) > 48 ? 9 : 0));
  s.lastEvent = `Cameras roll on "${s.production.title}". First day on set.`;
  addTimeline(s, `Production began: ${s.production.title}.`);
  return s;
}
export function rehearse(s) {
  const p = s.production; if (!p) return s;
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  s.ap = (s.ap || 0) - 1;
  const gain = rint(4, 9);
  p.meter = clamp(p.meter + gain);
  p._workedMonth = (s.year || 0) * 12 + (s.month || 0);
  s.lastEvent = `Solid rehearsal. Shoot quality +${gain}.`;
  return s;
}
export function riskyTake(s, quality = 0) {
  const p = s.production; if (!p) return s;
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  s.ap = (s.ap || 0) - 1;
  p._workedMonth = (s.year || 0) * 12 + (s.month || 0);
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
  const p = s.production; if (!p) return s;
  const c = (p.crew || []).find((x) => x.id === crewId); if (!c) return s;
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  s.ap = (s.ap || 0) - 1;
  p._workedMonth = (s.year || 0) * 12 + (s.month || 0);
  const gain = rint(6, 14);
  c.bond = clamp(c.bond + gain);
  s.mental = clamp((s.mental || 50) + 1);
  s.lastEvent = `You and ${c.name} (${c.role}) got closer. Bond +${gain}.`;
  return s;
}
export function productionTick(s) {
  const p = s.production; if (!p) return;
  // A serious illness stops the shoot dead — the schedule waits for you.
  if (s.illness && s.illness.freezes) {
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
  if (perMonth > 0) earn(s, perMonth, `"${p.title}" — month ${(p.months - p.monthsLeft)}`);
  if (p.monthsLeft > 0) {
    // The money can walk at any point up to the last day, but you are paid for the days
    // you actually worked — so this is rolled AFTER the month is paid. Rolling it first
    // meant a shoot that stopped in month one left you with literally nothing.
    productionTrouble(s, p);
    return;
  }
  wrapProduction(s);
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

function wrapProduction(s) {
  const p = s.production;
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
    director: ((p.crew || [])[0] || {}).name || null, months: p.months || 0 };
  // The credit does NOT land here. It goes into post and opens months from now —
  // fame, box office and the score all arrive on premiere night, not on the last
  // day of shooting. See systems/career/release.js.
  credit.premise = p.premise; credit.take = p.takeWon ? p.take : null;
  scheduleRelease(s, credit, p);
  addGenreXP(s, p.genre, rating);
  // Whatever the monthly instalments did not cover — rounding, and the offers that were
  // written before instalments existed.
  const owed = Math.max(0, (p.salary || 0) - (p.paid || 0));
  if (owed > 0) earn(s, owed, `"${credit.title}" — final payment`);
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
  else if (lead.bond <= 25) { setRespect(s, (s.respect || 0) - 3); verdictNote = ` ${lead.name} has quietly started telling a different story about you.`; }
  if (worldHit) s.worldHits = (s.worldHits || 0) + 1;
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
  s.production = null;
}
