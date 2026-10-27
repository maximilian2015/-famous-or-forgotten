// Burnout Core (ROADMAP Step 1b, docs/burnout-audit.md §7–13). One scale — `s.strain`, in
// life/strain.js — made to mean something over years, and the ways out of it.
//
// Measured before this (tests/probes/probe_burnout.mjs, 12 careers × 20 years a strategy): the
// actor who signed everything and never rested finished with 45 credits, fame 74 and €43m; the
// one who rested finished with 28, 62 and €14m, and their films were rated the same. Working
// without end was simply correct. What is here makes it a decision:
//
//   · the load record   36 months of work, so four years at the ceiling is not a hard spring
//   · the crisis        months at 95+ bring the doctor; ignoring him is a bet that gets worse
//   · the studio        when you stop, each production decides by what it is — wait, shoot
//                       around you, finish without some of your scenes, or recast
//   · the asks          a lighter schedule, your scenes early, a postponement, a medical pause
//   · the break         3, 6, 12 or 24 months away, lived in one step, and a way back
//
// Illness is never a breach. Nothing here touches Standing or takes money as a penalty: what a
// stop costs is the part, the months and the offers that went by (Maxi/ChatGPT, 27 Oct).
import { rint, chance } from '../../engine/rng.js';
import { addTimeline, showMoment } from '../../engine/timeline.js';
import { inCareer } from '../../engine/stage.js';
import { sets, removeSet, isShort } from '../../engine/sets.js';
import { payOrPlay } from '../career/stability.js';
import { loseContinuation } from '../career/continuation.js';
import { recordPassed } from '../meta/passed.js';
import { addHype } from '../meta/hype.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const now = (s) => (s.year || 0) * 12 + (s.month || 0);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthName = (m) => `${MON[((m % 12) + 12) % 12]} ${Math.floor(m / 12)}`;
const first = (n) => String(n || '').split(' ')[0];

// ── the load record ───────────────────────────────────────────────────────────
// What each month of work weighed, for the last three years. Strain saturates at 100 and
// cannot tell four months there from four years; this can. Old saves have no record, and get
// one read off the strain they arrive with — a save at 100 has plainly been working flat out.
export const LOAD_MONTHS = 36;
const WEIGHT = { blockbuster: 1.2, prestige: 1.1, feature: 1, recurring: 0.9, indie: 0.85, episode: 0.6, small: 0.45, oneoff: 0.25 };
function log(s) {
  if (!Array.isArray(s.loadLog)) s.loadLog = Array(LOAD_MONTHS).fill(Math.round(Math.min(1, (s.strain || 0) / 100) * 10) / 10);
  return s.loadLog;
}
// Reads never create the record (a screen must not write the save).
export function loadOf(s) {
  if (!Array.isArray(s.loadLog)) return LOAD_MONTHS * Math.min(1, (s.strain || 0) / 100);
  return s.loadLog.reduce((a, b) => a + b, 0);
}
// In words, for the Mental screen. 36 is three years of one full-time film set.
export function loadWords(s) {
  const l = loadOf(s);
  if (l >= 34) return 'three years without a real break';
  if (l >= 26) return 'most of the last three years on a set';
  if (l >= 16) return 'about half of the last three years working';
  if (l >= 6) return 'a normal working rhythm';
  return 'almost nothing in the last three years';
}
// The sets that are actually shooting you this month: not prep, not held for you, not finishing
// without you.
export const active = (s) => sets(s).filter((p) => (p.prepLeft || 0) <= 0 && !p.cutShort && !heldNow(s, p));
export const heldNow = (s, p) => (p.heldUntil || 0) > now(s);
function monthWeight(s) {
  return active(s).reduce((n, p, i) => n + (WEIGHT[p.scale] || 1) * (p.light ? 0.6 : 1) * (i ? 0.7 : 1), 0);
}
// Light work: only short jobs, or episodes, or small parts. Strain can come down slowly while
// you keep a hand in (audit §7.5) — before, any month on any set only ever added.
export function lightWork(s) {
  const a = active(s);
  return a.length > 0 && a.every((p) => isShort(p) || p.scale === 'oneoff' || p.scale === 'small' || p.scale === 'episode' || p.light);
}
// How much harder it is to come back the longer you have been at it: 1 for half the time on a
// set, 1.5 after three years flat out.
export const recoveryDrag = (s) => 1 + Math.max(0, loadOf(s) - 18) / 36;

// ── the month ─────────────────────────────────────────────────────────────────
// Called from strainTick once strain itself has moved. Returns nothing; writes the record, the
// months at the top, the body, and the doctor when it is time.
export function loadTick(s) {
  const L = log(s);
  L.push(Math.round((s.onBreak ? 0 : monthWeight(s)) * 100) / 100);
  if (L.length > LOAD_MONTHS) L.splice(0, L.length - LOAD_MONTHS);
  const st = s.strain || 0;
  s._topMonths = st >= 95 ? (s._topMonths || 0) + 1 : st < 88 ? 0 : (s._topMonths || 0);
  // The body keeps the score, mildly: running on empty on a set wears you down a little each
  // month. The illness that follows is the existing one (life/health.js reads health).
  if (active(s).length && st >= 82) s.health = clamp((s.health || 0) - (st >= 95 ? 1 : 0.4));
  maybeDoctor(s);
  maybeFifthTake(s);
}

// The chance your body decides for you this month. It replaces the flat ~1.5% that let an
// actor sit at 100 for decades: it grows with every month at the top, with the three years
// behind it, and doubles for a year after you were told to stop and did not.
export function forcedStopOdds(s) {
  const st = s.strain || 0;
  const red = s._redMonths || 0;
  if (st < 82 || red < 6 || !active(s).length) return 0;   // it is the work that stops you, not the rest after it
  if (now(s) < (s._burntUntil || 0)) return 0;
  let r = 0.3 + Math.max(0, st - 88) * 0.08 + Math.min(1.5, Math.max(0, red - 6) * 0.03);
  const top = s._topMonths || 0;
  if (top >= 3) r += Math.min(3.5, (top - 2) * 0.35);
  r *= 1 + loadOf(s) / 72;
  if (now(s) - (s._doctorIgnored ?? -99) < 12) r *= 1.8;
  return Math.min(6, Math.round(r * 10) / 10);
}

// ── the studio's decision ─────────────────────────────────────────────────────
// When you stop, each production decides by what it is — never by your fame alone, and never
// by waiting for ever. How long they will hold your part, in months:
export function holdFor(s, p) {
  const shot = shotOf(p);
  const lead = isLead(p);
  const star = (s.fame || 0) >= 70;
  const face = lead && ((p.part || 1) > 1 || !!p.optioned || (p.season || 0) > 1);
  const safe = (p.stability ?? 70) >= 60;
  let h = 1 + (lead ? 2 : 0) + (star ? 2 : 0) + (face ? 2 : 0) + (shot >= 0.6 ? 2 : 0) + (shot >= 0.85 ? 1 : 0)
    - (p.scale === 'blockbuster' && shot < 0.3 ? 2 : 0) - (safe ? 0 : 1);
  return clamp(h, 0, 9);
}
export const shotOf = (p) => (p.months ? clamp(1 - (p.monthsLeft || 0) / p.months, 0, 1) : 0);
export const isLead = (p) => p.tier !== 'supporting' && !/Supporting|Guest|Cameo|Featured/i.test(p.role || '');
export function decide(s, p, away) {
  const shot = shotOf(p), hold = holdFor(s, p);
  if (away <= hold) return { how: shot >= 0.6 ? 'wait' : 'around', hold };
  if ((p.episodes || 0) > 0) return { how: shot >= 0.25 ? 'writtenOut' : 'recast', hold };
  if (shot >= 0.75 || (!isLead(p) && shot >= 0.35)) return { how: 'cut', hold };
  // A safely financed studio film is always finished — with somebody else if it must be. An
  // indie with money nobody can name may not survive losing its lead.
  if ((p.stability ?? 70) < 45 && isLead(p) && chance(50)) return { how: 'dies', hold };
  return { how: 'recast', hold };
}
const SAY = {
  wait: (p, d) => `"${p.title}": most of it is shot. They will wait for you — up to ${d.hold} months.`,
  around: (p, d) => `"${p.title}": they shoot around you and hold your part — up to ${d.hold} months.`,
  cut: (p) => `"${p.title}": they finish without your last scenes. The part is smaller; it is still yours.`,
  writtenOut: (p) => `"${p.title}": the season goes on without you. They wrote your character out for the rest of it.`,
  recast: (p) => `"${p.title}": they could not wait. They have recast your part.`,
  dies: (p) => `"${p.title}": the money could not survive losing its lead. It will not be finished — and nobody says it was you.`,
};
function apply(s, p, d, back) {
  if (d.how === 'wait' || d.how === 'around') { p.heldUntil = back; p.heldFor = 'health'; return; }
  if (d.how === 'cut' || d.how === 'writtenOut') {
    // What is shot is the performance. Fewer scenes is less of you in it — the one chain: your
    // contribution, and the film follows from it (audit §12.4).
    p.cutShort = true; p.monthsLeft = 1; p.meter = clamp((p.meter || 0) - rint(3, 6));
    if (d.how === 'writtenOut') { p.writtenOut = true; p.episodes = Math.max(1, Math.round((p.episodes || 1) * Math.max(0.3, shotOf(p)))); }
    return;
  }
  // recast or dies: the part is gone. Pay-or-play still pays what the paper promised.
  payOrPlay(s, p);
  removeSet(s, p);
  const o = { ...p, projectTitle: p.title, id: p.offerId || p.id, signed: true };
  if ((p.part || 1) > 1) loseContinuation(s, { ...o, kind: 'sequel' }, 'health');
  else if ((p.season || 0) > 1) loseContinuation(s, { ...o, kind: 'renewal' }, 'health');
  else recordPassed(s, o, d.how === 'dies' ? 'notMade' : 'health');
  (s.lostToHealth = s.lostToHealth || []).push({ title: p.title, at: now(s), how: d.how, salary: p.salary || 0 });
}
// One decision for every set, said in one place.
function studiosDecide(s, months) {
  const back = now(s) + months;
  const lines = [];
  for (const p of [...sets(s)]) {
    if ((p.prepLeft || 0) > 0 && months <= (p.prepLeft || 0)) { lines.push(`"${p.title}" had not started. It starts a little later.`); p.heldUntil = back; p.heldFor = 'health'; continue; }
    const d = decide(s, p, months);
    lines.push(SAY[d.how](p, d));
    addTimeline(s, SAY[d.how](p, d), d.how === 'recast' || d.how === 'dies');
    apply(s, p, d, back);
  }
  return lines;
}

// ── stopping ──────────────────────────────────────────────────────────────────
// A medical pause you chose: the doctor's call, always possible, shorter for being early. The
// studios decide all the same — but a pause taken in time is a pause they can wait out.
export function medicalPause(s, months = 2) {
  s.burnout = { left: months, since: now(s), rest: true, medical: true };
  (s.medical = s.medical || []).push({ at: now(s), months, forced: false });
  s.strain = clamp((s.strain || 0) - 10);
  s._redMonths = 0; s._topMonths = 0; s._doctorIgnored = null;
  const lines = studiosDecide(s, months);
  addTimeline(s, `Signed off for ${months} months, on the doctor's word.`, true);
  s.lastEvent = `Signed off for ${months} months. ${lines.length ? lines[0] : 'Nothing was shooting.'}`;
  return lines;
}
// The body deciding. Longer, and the decisions are harder because they come without warning.
export function forcedStop(s) {
  s.burnouts = (s.burnouts || 0) + 1;            // health history (recovery, life/health.js), never a reputation count
  const months = rint(2, 4) + Math.min(3, s.burnouts - 1);
  const shooting = sets(s).map((p) => p.title);
  s.burnout = { left: months, since: now(s), rest: true, forced: true };
  (s.medical = s.medical || []).push({ at: now(s), months, forced: true });
  s._redMonths = 0; s._topMonths = 0; s._doctorIgnored = null;
  s._burntUntil = now(s) + months + 12;
  s.mental = clamp((s.mental || 0) - 14);
  s.health = clamp((s.health || 0) - 4);
  const lines = studiosDecide(s, months);
  addTimeline(s, shooting.length
    ? `You stopped. The doctor signed you off for ${months} months, in the middle of "${shooting.join('" and "')}".`
    : `You stopped. The doctor signed you off for ${months} months.`, true);
  // Depression is not burnout (audit §12). A long exhaustion can sometimes meet it — when the
  // head is already at the bottom — and never because a counter reached four.
  const meets = (s.mental || 0) < 20 && !s.depression && chance(35);
  s.lastEvent = `You could not do it any more. Signed off for ${months} months.`;
  showMoment(s, {
    id: 'burnout', kind: 'bad', title: 'You stopped', months, work: shooting.join('" and "'),
    body: (shooting.length
      ? `It was not a decision. You did not get up, and by the afternoon the productions were on the phone to each other. ${months} months before anyone will insure you on a set.\n\n`
      : `It was not a decision. You did not get up. ${months} months before you are cleared to work.\n\n`)
      + (lines.length ? lines.join('\n') + '\n\n' : '')
      + 'Offers will keep coming while you are off. You can sign one that starts after you are cleared.',
  });
  return { months, lines, meetsDepression: meets };
}

// ── the doctor, and the fifth take ────────────────────────────────────────────
// Health events are built fresh each time the screen draws or a choice is pressed (the need
// pattern, life/needs.js), so nothing in the save holds a function.
function maybeDoctor(s) {
  if (s.pendingArc || !active(s).length) return;
  if ((s._topMonths || 0) < 3) return;
  if (now(s) - (s._doctorAt ?? -99) < 8) return;
  s._doctorAt = now(s);
  open(s, { health: 'doctor', kicker: 'Your health', speaker: 'The doctor' });
}
// The words and the labels are written onto the arc when it opens, for the screens that read
// `text` and count `choices`; what a choice DOES is always rebuilt (resolveHealth).
function open(s, arc) {
  const b = healthBeat(s, arc); if (!b) return;
  s.pendingArc = { ...arc, text: b.text, choices: b.choices.map((c) => ({ label: c.label, hint: c.hint || null })) };
}
function maybeFifthTake(s) {
  if (s.pendingArc || (s.strain || 0) < 82) return;
  const p = active(s).find((x) => !x._fifthTake && !isShort(x) && (x.crew || [])[0]);
  if (!p || !chance(7)) return;
  p._fifthTake = true;
  open(s, { health: 'fifthTake', setId: p.id, kicker: `On set · ${p.title}`, speaker: `${(p.crew || [])[0].name}, directing` });
}
const say = (t, good = null) => ({ t, good });
const traitOf = (p) => ((p && (p.crew || [])[0]) || {}).trait || 'chill';
export function healthBeat(s, arc) {
  if (arc.health === 'doctor') {
    const months = 2;
    const heavy = [...active(s)].sort((a, b) => (isLead(b) - isLead(a)) || ((b.monthsLeft || 0) - (a.monthsLeft || 0)))[0];
    const ask = heavy ? askOdds(s, heavy, 'lighter') : null;
    const odds = forcedStopOdds(s);
    return {
      text: `"Three months at the edge. I am not asking you to stop working for ever. I am asking you to stop before your body does it for you, because when it does, it will not ask the productions what suits them."`
        + (heavy ? `\n\nYou are on ${active(s).map((p) => `"${p.title}"`).join(', ')}.` : ''),
      choices: [
        { label: `Take the medical pause — ${months} months`, hint: 'Every production decides whether to wait, shoot around you, or go on without you. Early, more of them wait.',
          shows: { more: [say(`signed off ${months} months`), say('the load comes down fast', true)] },
          apply: () => { const l = medicalPause(s, months); return `Signed off for ${months} months.${l.length ? '\n\n' + l.join('\n') : ''}`; } },
        heavy && { label: `Ask "${heavy.title}" for a lighter schedule`, hint: `${first((heavy.crew || [])[0] && heavy.crew[0].name) || 'The director'} decides. A yes gives up the schedule bonus, if the paper has one.`,
          shows: { odds: ask, good: { more: [say('less wear each month', true), say('the shoot runs longer')] }, bad: { more: [say(`${first((heavy.crew || [])[0] && heavy.crew[0].name) || 'the director'} trusts you less`, false), say('you carry on as you are', false)] } },
          apply: () => askProduction(s, heavy.id, 'lighter').say },
        { label: 'Carry on — finish what you are on', hint: `The chance your body stops you this month is about ${odds}%, and it doubles for a year once you have been told.`,
          shows: { more: [say('nothing changes today'), say('a forced stop gets likelier every month', false)] },
          apply: () => { s._doctorIgnored = now(s); return 'You thank him and go back to work. He writes something down.'; } },
      ].filter(Boolean),
    };
  }
  if (arc.health === 'fifthTake') {
    const p = sets(s).find((x) => x.id === arc.setId);
    if (!p) return null;
    const dir = (p.crew || [])[0] || { name: 'The director', bond: 45 };
    const tr = traitOf(p);
    const honest = tr === 'perfectionist' ? -5 : tr === 'difficult' ? -3 : 5;
    return {
      text: `The fifth take of the scene that matters, eleven hours in. You lost the line twice and found it once. ${first(dir.name)} wants another.`,
      choices: [
        { label: 'Go again', hint: (s.strain || 0) >= 92 ? 'You may not have it. At this load it is a coin toss.' : 'You probably have one more in you.',
          shows: { more: [say('your performance ↑ if it lands', true), say('more wear', false)] },
          apply: () => {
            s.strain = clamp((s.strain || 0) + 4);
            const lands = chance((s.strain || 0) >= 92 ? 50 : 75);
            p.meter = clamp((p.meter || 0) + (lands ? 4 : -4));
            return lands ? 'It lands. The crew is quiet in the right way.' : 'It does not land, and everybody knows it. They print the second take.';
          } },
        { label: 'Ask for twenty minutes', hint: tr === 'perfectionist' ? `${first(dir.name)} hates losing the light.` : 'A short break. The scene waits.',
          shows: { more: [say('less wear', true), tr === 'perfectionist' ? say(`${first(dir.name)} trusts you less`, false) : say('the scene waits')] },
          apply: () => { s.strain = clamp((s.strain || 0) - 3); if (tr === 'perfectionist') dir.bond = clamp((dir.bond || 45) - 3); return 'Twenty minutes, a coffee, a wall to lean on. You get it in two.'; } },
        { label: `Tell ${first(dir.name)} you are exhausted`, hint: honest > 0 ? 'Some directors hear it; this one usually does.' : `${first(dir.name)} is not known for hearing it.`,
          shows: { more: [say(honest > 0 ? `${first(dir.name)} trusts you more` : `${first(dir.name)} trusts you less`, honest > 0), say('a lighter schedule is easier to ask for on this set', true)] },
          apply: () => { dir.bond = clamp((dir.bond || 45) + honest); p._toldDirector = true; s.strain = clamp((s.strain || 0) - 4);
            return honest > 0 ? `${first(dir.name)} nods. "Then we do it tomorrow, properly." It is not weakness to them; it is information.` : `${first(dir.name)} hears "exhausted" as "difficult". You finish the day anyway.`; } },
      ],
    };
  }
  return null;
}
export function resolveHealth(s, arc, i) {
  const b = healthBeat(s, arc);
  s.pendingArc = null;
  if (!b) return s;
  const c = b.choices[i]; if (!c) return s;
  s.lastEvent = `${arc.speaker}\n\n${c.apply()}`;
  addTimeline(s, `${arc.speaker}: ${c.label.toLowerCase()}.`);
  return s;
}

// ── asking the production ─────────────────────────────────────────────────────
// Each ask is a request, never a right: who decides, what was asked before, and what kind of
// part it is all move the odds, and the screen shows them before the button is pressed.
export const ASKS = {
  lighter: { label: 'A lighter schedule', does: 'Less wear each month; the shoot runs longer.' },
  early: { label: 'Finish your scenes early', does: 'Out sooner; more wear for now, fewer takes.' },
  postpone: { label: 'Postpone your scenes two months', does: 'Two months to recover; the release may slip.' },
};
export function askOdds(s, p, id) {
  const tr = traitOf(p);
  const t = tr === 'chill' ? 15 : tr === 'perfectionist' ? -15 : tr === 'difficult' ? -10 : 0;
  const star = (s.fame || 0) >= 70 ? 10 : 0;
  const told = p._toldDirector ? 10 : 0;
  const asked = (p._asks || 0) * 12;
  let o = 0;
  if (id === 'lighter') o = 55 + (isLead(p) ? -10 : 10);
  if (id === 'early') o = (isLead(p) ? 30 : 60) + (tr === 'perfectionist' ? -10 : 0);
  if (id === 'postpone') o = [70, 35, 10][Math.min(2, p._postponed || 0)] + (p.exclusive ? -10 : 0);
  return clamp(Math.round(o + t + star + told - asked), 5, 95);
}
export function asksFor(s, p) {
  if (!p || p.cutShort || heldNow(s, p) || (p.prepLeft || 0) > 0 || (p.monthsLeft || 0) < 2 || isShort(p)) return [];
  if ((s.strain || 0) < 60) return [];
  const out = [];
  for (const id of Object.keys(ASKS)) {
    if (id === 'lighter' && p.light) continue;
    out.push({ id, ...ASKS[id], odds: askOdds(s, p, id), asked: p._askedMonth === now(s) });
  }
  return out;
}
export function askProduction(s, setId, id) {
  const p = sets(s).find((x) => x.id === setId);
  if (!p) return { ok: false, say: 'That set has wrapped.' };
  if (p._askedMonth === now(s)) return { ok: false, say: 'You have already asked them this month.' };
  const odds = askOdds(s, p, id);
  p._askedMonth = now(s); p._asks = (p._asks || 0) + 1;
  const dir = (p.crew || [])[0];
  if (!chance(odds)) {
    if (dir) dir.bond = clamp((dir.bond || 45) - 3);
    const no = { lighter: 'They cannot carry a longer shoot.', early: 'They will not reshuffle the schedule for one actor.', postpone: 'The dates are the dates.' }[id];
    const out = `"${p.title}" said no. ${no}`;
    addTimeline(s, out); s.lastEvent = out; return { ok: false, say: out };
  }
  p.lostBonus = true;   // the schedule bonus is for keeping the agreed dates (contract.js)
  if (id === 'lighter') { p.light = true; p.monthsLeft += Math.ceil((p.monthsLeft || 0) * 0.4); }
  if (id === 'early') { p.monthsLeft = Math.max(1, Math.ceil((p.monthsLeft || 0) / 2)); s.strain = clamp((s.strain || 0) + 6); p.meter = clamp((p.meter || 0) - rint(3, 6)); }
  if (id === 'postpone') { p.heldUntil = now(s) + 2; p.heldFor = 'postponed'; p._postponed = (p._postponed || 0) + 1; }
  const yes = {
    lighter: `"${p.title}" agreed to a lighter schedule. ${p.monthsLeft} months left, fewer hours in each.`,
    early: `"${p.title}" will shoot your scenes first. ${p.monthsLeft} month${p.monthsLeft === 1 ? '' : 's'} and you are out.`,
    postpone: `"${p.title}" moved your scenes to ${monthName(p.heldUntil)}. ${p._postponed > 1 ? 'They will not do it a third time lightly.' : 'They will not like a second time.'}`,
  }[id];
  addTimeline(s, yes); s.lastEvent = yes;
  return { ok: true, say: yes };
}

// ── off work: signing what starts after ───────────────────────────────────────
// The month you are cleared, or the month a break ends.
export function returnAt(s) {
  if (s.burnout && s.burnout.left > 0) return now(s) + s.burnout.left;
  if (s.onBreak) return s.onBreak.until;
  return now(s);
}
export const off = (s) => !!((s.burnout && s.burnout.left > 0) || s.onBreak);
// While you are off, a shoot can still be signed — to start the month you are back. The
// agent asks; the closer that is, the likelier they say yes.
export function signLaterOdds(s, o) {
  const wait = returnAt(s) - Math.max(now(s), o.startAt || 0);
  if (wait <= 2) return 100;
  return clamp(Math.round(80 - (wait - 2) * 12 + ((s.fame || 0) >= 70 ? 15 : 0) - (o.scale === 'blockbuster' ? 10 : 0)), 5, 95);
}
export function signLater(s, o) {
  if (o._askedLater) return { ok: false, say: 'They said they cannot wait that long.' };
  const odds = signLaterOdds(s, o);
  o._askedLater = true;
  if (!chance(odds)) return { ok: false, say: `"${String(o.projectTitle || '').replace('⭐ ', '')}" needs somebody sooner than ${monthName(returnAt(s))}. They will cast elsewhere.` };
  o.signed = true; o.startAt = returnAt(s); o.waitsForWrap = true;
  return { ok: true, say: `Signed. "${String(o.projectTitle || '').replace('⭐ ', '')}" starts in ${monthName(o.startAt)}, when you are back.` };
}

// ── the break ─────────────────────────────────────────────────────────────────
export const BREAKS = [3, 6, 12, 24];
export function canTakeBreak(s) {
  if (!inCareer(s)) return { ok: false, why: '' };
  if (s.onBreak) return { ok: false, why: `You are already away, until ${monthName(s.onBreak.until)}.` };
  if (s.burnout && s.burnout.left > 0) return { ok: false, why: 'You are signed off already. A break can follow it.' };
  const long = sets(s).filter((p) => !isShort(p) && !p.cutShort);
  if (long.length) return { ok: false, why: `You are on "${long[0].title}" until it wraps. A break starts when nothing is shooting.` };
  return { ok: true, why: '' };
}
export function takeBreak(s, months) {
  const can = canTakeBreak(s); if (!can.ok) { s.lastEvent = can.why; return s; }
  // `from`: where you were the day you left, so the summary at the end covers the whole break.
  s.onBreak = { since: now(s), until: now(s) + months, months, seen: [],
    from: { strain: s.strain || 0, mental: s.mental || 0, fame: s.fame || 0, cash: s.cash || 0 } };
  addTimeline(s, `Stepped away for ${months} months. Nobody is getting a call back before ${monthName(s.onBreak.until)}.`, true);
  s.lastEvent = `You are away until ${monthName(s.onBreak.until)}. Films you made still come out; people still call; the bills still come.`;
  return s;
}
export function endBreakEarly(s) {
  if (!s.onBreak) return s;
  s.onBreak.until = now(s);
  return breakTick(s, true);
}
// Each month away: the load and the head come back fast, the body a little, and the business
// goes on without you — at half the speed it forgets somebody who simply stopped being hired.
export function breakTick(s, ending = false) {
  const b = s.onBreak; if (!b) return s;
  if (!ending) {
    s.strain = clamp((s.strain || 0) - 10 / Math.max(1, recoveryDrag(s) * 0.7));
    s.mental = clamp((s.mental || 0) + 2);
    s.health = clamp((s.health || 0) + 0.5);
  }
  if (now(s) < b.until) return s;
  const months = now(s) - b.since;
  s.onBreak = null;
  // A long break is the thing that actually resets a body that has stopped before: a year
  // away and the slower recovery of one past collapse goes (life/strain.js reads `burnouts`).
  if (months >= 12 && (s.burnouts || 0) > 0) s.burnouts -= 1;
  // And a name that steps away and comes back is news. Not for nobody; for somebody.
  const big = (s.fame || 0) >= 40 && months >= 6;
  if (big) addHype(s, months >= 12 ? 14 : 8, 'press');
  s._cameBack = { months, news: big };   // read once by breakSummary
  const line = big ? `Back after ${months} months. The trades noticed: "${s.name} is working again."` : `Back after ${months} months away.`;
  addTimeline(s, line, true);
  s.lastEvent = line;
  return s;
}
// What the break did, said once at the end (time.js stepAway gathers it).
export function breakSummary(s, before, notes) {
  const lines = [];
  for (const n of notes.slice(0, 6)) lines.push(n);
  if (!notes.length) lines.push('Nothing of yours came out. The months were yours.');
  if (s._cameBack && s._cameBack.news) lines.push('The trades noticed you are back: "working again", and the phone with it.');
  s._cameBack = null;
  lines.push(`Workload ${Math.round(before.strain)} → ${Math.round(s.strain || 0)}. Mental ${Math.round(before.mental)} → ${Math.round(s.mental || 0)}.`);
  const fame = Math.round((s.fame || 0) - before.fame);
  lines.push(fame >= 0 ? `Fame ${fame ? '+' + fame : 'held'}.` : `Fame ${fame} — the business kept moving.`);
  const cash = Math.round((s.cash || 0) - before.cash);
  lines.push(`Money ${cash >= 0 ? '+' : '−'}€${Math.abs(cash).toLocaleString('en-US')}.`);
  return lines;
}

// ── who will insure you ───────────────────────────────────────────────────────
// Read off RECENT medical stops, and it comes back (audit §6, §13.2-A7). It was a permanent
// count of collapses — illness charged as unreliability for the rest of a life. A stop in the
// last three years costs the biggest productions some confidence; a forced one more than a
// chosen one; three years later it is gone.
export function medicalDrag(s) {
  const t = now(s);
  let v = 1;
  for (const m of s.medical || []) {
    const age = t - (m.at || 0);
    if (age > 36) continue;
    v *= 1 - (m.forced ? 0.12 : 0.05) * (1 - age / 36);
  }
  return Math.max(0.7, v);
}
export function recentStops(s) { return (s.medical || []).filter((m) => now(s) - (m.at || 0) <= 36).length; }

// ── the forecast on an offer ──────────────────────────────────────────────────
// Approximate, and marked so (audit §12.2): what this would do to you, month by month, with
// what you are already on.
export function forecast(s, o) {
  const months = Math.max(1, Math.min(18, o.months || 1));
  const cur = active(s);
  let st = s.strain || 0, peak = st;
  const COST = { blockbuster: 8, prestige: 7, feature: 6.5, recurring: 6, indie: 5.5, episode: 4.5, small: 4, oneoff: 2.5 };   // life/strain.js COST, duplicated: strain.js imports this file
  const runs = cur.map((p) => ({ scale: p.scale, left: p.monthsLeft || 0, light: p.light }));
  runs.push({ scale: o.scale || 'feature', left: months, light: false, new: true });
  let overlap = 0;
  for (let m = 0; m < months; m++) {
    const on = runs.filter((r) => r.left > m);
    if (on.length > 1 && on.some((r) => !r.new && !['oneoff', 'small'].includes(r.scale)) && !['oneoff', 'small'].includes(o.scale)) overlap++;
    const up = on.reduce((n, r, i) => n + (COST[r.scale] || 6) * (0.55 + st / 68) * (r.light ? 0.6 : 1) * (i ? 0.7 : 1), 0);
    st = clamp(st + up); peak = Math.max(peak, st);
  }
  return { from: Math.round(s.strain || 0), to: Math.round(peak), overlap, danger: peak >= 82 && (peak - (s.strain || 0) >= 15 || overlap >= 3) };
}
