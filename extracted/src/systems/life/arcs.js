import { inCareer } from '../../engine/stage.js';
import { chance, pick, rint } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { setFame, setRespect } from '../meta/status.js';
import { takeJob, JOBS } from './work.js';
import { resolveStory, CHAINS } from '../meta/stories.js';
import { resolveNeed } from './needs.js';
import { resolveHealth, healthBeat, medicalPause, off, active } from './burnout.js';
import { STAT, fxWords, showWords, softenLoss } from './choiceWords.js';
import { actorById } from '../world/world.js';
import { keyFor, remember } from '../meta/memory.js';
import { startCover, coverRisk } from '../career/cover.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
const stampOf = (s) => (s.year || 0) * 12 + (s.month || 0);

// ── what people bring onto a set with them ──────────────────────────────────
// The five cards on a set came round about twenty times a life each (tests/probes/
// probe_random_events.mjs, 8 Nov): the co-star who turned up wrecked was a dice roll on every
// picture, a different stranger every time, and nothing came of it for them. Maxi/ChatGPT: the
// habit belongs to the person and goes with them — an actor of the world who drinks on the job
// drinks on the next one too — and it costs THEM, on their own career, whatever you do about it.
// Read off who they are, never rolled on the day: about one person in seven carries it. Kept on
// the person once it has come out (`habit`, `incidents`), so an old save rolls nothing new.
const HABIT_IN = 7;
const hashOf = (t) => { let h = 7; for (const ch of String(t || '')) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
function whoIs(s, c) { return c ? (c.worldId ? actorById(s, c.worldId) : c.knownId ? (s.people || []).find((x) => x.id === c.knownId) : null) : null; }
export function habitOf(s, c) {
  if (!c) return null;
  const x = whoIs(s, c) || c;
  if (x.habit !== undefined) return x.habit;
  return hashOf(x.id || x.name) % HABIT_IN === 0 ? 'drink' : null;
}
// The last time this person did it on somebody's set, if they have before.
function lastIncident(s, c) { const x = whoIs(s, c) || c; const l = (x && x.incidents) || []; return l.length ? l[l.length - 1] : null; }
// What it does to somebody's own name. An actor of the world loses fame; anybody else is somebody
// you know now (meta/memory.js keyFor makes them a contact the moment there is something to
// remember) and loses weight in the business. Never the player's numbers: those are on the card.
function costsThem(s, c, p, by, what) {
  if (!c || !p) return;
  const rec = { year: s.year || 0, title: p.title, what };
  const a = c.worldId ? actorById(s, c.worldId) : null;
  if (a) { (a.incidents = a.incidents || []).push(rec); a.fame = Math.max(0, (a.fame || 0) - by); if (what === 'drink') a.habit = 'drink'; return; }
  const key = keyFor(s, c, p);
  const person = (s.people || []).find((x) => 'p:' + x.id === key);
  if (person) { (person.incidents = person.incidents || []).push(rec); person.industryWeight = Math.max(5, (person.industryWeight || 40) - by); if (what === 'drink') person.habit = 'drink'; }
  if (what === 'drink') c.habit = 'drink';
}
const crewOf = (p, who) => (p && p.crew ? p.crew[who === 'lead' ? 0 : 1] : null);
// The share of shoots that have one of the on-set cards at all (maybeStartArc).
const INCIDENT_FILMS = 40;
const BIG = (p) => /blockbuster|feature|prestige/.test(p.scale || '') || p.tier === 'tentpole';
export const ARCS = [
  { id: 'firstCredit', once: true, when: (s) => (s.filmography || []).length + (s.discography || []).length === 1 && s.fame < 20,
    build: () => ({ speaker: 'A quiet realization', text: `Your first credit is out in the world. It's small. Almost nobody saw it. But it exists now — proof you're not just dreaming. How do you carry this?`,
      choices: [ { label: 'Let it fuel you', fx: { confidence: 6, discipline: 3 }, reply: 'You pin it to the wall. Next one will be bigger. You believe that now.' },
        { label: 'Already chasing the next', fx: { discipline: 5, mental: -2 }, reply: "No time to celebrate. You're already reading for the next room." },
        { label: "Quietly terrified it's the only one", fx: { mental: -4, confidence: -2 }, reply: "One credit. What if it’s the last? The fear is its own kind of fuel." } ] }) },
  { id: 'brokeMonth', when: (s) => inCareer(s) && (s.cash || 0) < 0 && (s.fame || 0) < 30,
    build: () => ({ speaker: 'Rock bottom', text: `Your account is empty and rent is coming. A friend offers you a stable, boring job with a real salary. Take it and the dream gets quieter. Refuse and you keep gambling on yourself.`,
      choices: [ { label: 'Take the day job (safe)', act: 'job', fx: { mental: 4, discipline: 2, fame: -1 }, reply: "Steady money, steady life — a shop floor, a wage on the first of the month. The dream doesn't die; it waits in the evenings. Quit it under Phone → Work when you can." },
        { label: 'Refuse — all in on the dream', fx: { mental: -3, confidence: 4 }, reply: "You say no. Terrifying. But you didn't come this far to fold now." } ] }) },
  { id: 'firstScandal', once: true, when: (s) => (s.fame || 0) >= 40 && (s.scandal || 0) < 15,
    build: () => ({ speaker: 'Your publicist', text: `A photo is circulating — nothing career-ending, but embarrassing, and it's spreading. The press wants a comment. Your publicist needs a decision in the next hour.`,
      choices: [ { label: 'Get ahead of it — own it', check: { stat: 'charisma', diff: 50 }, good: { fx: { respect: 4, media: 4, scandal: -2 }, reply: 'You address it head-on with humor. The story flips — people respect the honesty.' }, bad: { fx: { scandal: 6, media: 5, mental: -3 }, reply: 'Your statement reads as defensive. It pours fuel on the fire.' } },
        { label: 'Deny everything', fx: { scandal: 4, media: 3 }, reply: 'You deny it. Some believe you. The internet does not forget, though.' },
        { label: 'Say nothing, let it pass', fx: { scandal: 2, mental: -1 }, reply: 'You go quiet. It stings for a week, then a bigger story buries it.' } ] }) },
  { id: 'sellOut', once: true, when: (s) => (s.fame || 0) >= 55 && (s.respect || 0) >= 30,
    build: () => ({ speaker: 'A brand deal', text: `A huge company offers you a fortune to be the face of a product you'd never actually use. Easy money and massive exposure — but the artists you admire would smirk.`,
      choices: [ { label: 'Take the money', fx: { cash: 80000, fame: 3, respect: -5, media: 4 }, reply: 'The check clears. The billboard goes up. You try not to read the comments.' },
        { label: 'Decline — protect your name', fx: { respect: 6, confidence: 2 }, reply: 'You pass. Your team is baffled. But your credibility is worth more than one check.' },
        { label: 'Negotiate creative control', check: { stat: 'confidence', diff: 55 }, good: { fx: { cash: 60000, fame: 3, respect: 2 }, reply: 'You reshape the campaign into something you can stand behind. Best of both worlds.' }, bad: { fx: { cash: 40000, respect: -3 }, reply: 'They smile, nod, and ignore your notes. You took the money and the compromise.' } } ] }) },
  { id: 'mentor', once: true, when: (s) => (s.fame || 0) >= 30 && (s.people || []).some((p) => (p.industryWeight || 0) >= 70),
    build: (s) => { const m = (s.people || []).find((p) => (p.industryWeight || 0) >= 70); return { speaker: m ? m.name : 'A veteran', text: `${m ? m.name : 'Someone established'} takes you aside: "You've got something. But this industry eats people who don't watch themselves. Let me give you one piece of advice — and you decide what to do with it."`,
      choices: [ { label: 'Listen and take it to heart', fx: { discipline: 5, confidence: 3, mental: 2 }, reply: 'You absorb every word. Having someone in your corner changes how the climb feels.' },
        { label: 'Thank them but trust your gut', fx: { confidence: 5, mental: -1 }, reply: "You nod politely and do it your way. Maybe that's brave. Maybe that's a mistake." } ] }; } },
  // Not every month the mood is down: once a year at most (it came 47 times a life in the probe).
  { id: 'burnout', cooldown: 12, when: (s) => inCareer(s) && (s.mental || 0) < 25,
    build: () => ({ speaker: 'Your body, finally', text: `You can't sleep. You dread the work you used to love. Everything is heavy. This is burnout, and it won't fix itself. Something has to give.`,
      choices: [ { label: 'Step back and actually rest', act: 'rest', fx: { mental: 20, health: 10, fame: -3 }, reply: 'You cancel everything and disappear for two months. Whatever you were shooting waits. The industry moves on a little without you — and you come back whole.' },
        { label: 'Push through, ignore it', fx: { mental: -6, health: -8 }, reply: "You keep going. The work suffers, and so do you. This road ends badly if you don't turn off it." },
        { label: 'Get real help', fx: { mental: 15, cash: -3000 }, reply: "You find a professional. It costs money and pride. It's the best decision you've made in months." } ] }) },
  // ─── On set. scope:'production' — repeat across shoots, once per shoot. ───
  // Each of these comes at most once a film, never the same one two films running, and the same
  // card not again for three years (maybeStartArc, `cooldown` in months). Each has a reason to
  // happen on THIS set, and two or three ways of happening, written from this film's people.
  // `happen` is what the incident does whether or not you do anything about it; `mem` on a
  // choice is who remembers what you did (meta/memory.js); `career` is what it costs them.
  { id: 'directorCracks', scope: 'production', cooldown: 36,
    // A shoot that is behind or going badly, or a director who was always going to take it hard.
    when: (s) => { const p = s.production; return !!p && p.monthsLeft < p.months && !!p.crew[0]
      && ((p.meter || 0) < 35 || (p.lostDays || 0) > 0 || (/perfectionist|difficult/.test(p.crew[0].trait || '') && (p.meter || 0) < 50)); },
    happen: (s) => costsThem(s, crewOf(s.production, 'lead'), s.production, rint(1, 3), 'cracked'),
    build: (s) => { const d = s.production.crew[0]; const t = pick([
        `You find ${d.name} behind the set, hands shaking. The studio has been calling every night about the budget. "Don't tell them I'm like this," they say. "I can finish. I can."`,
        `${d.name} has shot the same set-up thirty-one times and is calling for a thirty-second. The studio's man is on the phone outside. "Do not tell them," ${d.name} says to you, quietly. "Give me today."`,
        `You find ${d.name} in a parked car with the engine running and nowhere to go. The money called again last night. "Give me a day," they say. "Do not let them see me like this."`]);
      return { speaker: d.name, text: t,
      choices: [ { label: 'Cover for them, carry the day', fx: { mental: -3, respect: 2 }, prod: { meter: -4, bondLead: 18 }, mem: [{ who: 'lead', felt: 2, why: 'that you covered for them when they cracked' }], reply: `You keep the machine running while they pull themselves together. They will not forget this.` },
        { label: 'Quietly tell the studio', fx: { respect: -2 }, prod: { meter: 10, bondLead: -25 }, mem: [{ who: 'lead', felt: -3, why: 'that you were the one who called the studio' }], career: { who: 'lead', by: 6 }, reply: `The studio steps in and the schedule steadies. ${d.name} knows exactly who made the call.` },
        { label: 'Stay out of it', fx: { mental: -1 }, prod: { meter: -2 }, reply: `Not your circus. The days get sloppier, but your hands stay clean.` } ] }; } },
  { id: 'costarWrecked', scope: 'production', cooldown: 36,
    // Only somebody who drinks on the job, and not on a set that already asked you to cover for them
    // (career/demands.js 'cover' — the same situation told as an ask; one or the other, never both).
    when: (s) => { const p = s.production; return !!p && p.crew.length > 1 && habitOf(s, p.crew[1]) === 'drink' && !(p._demandsAsked || []).includes('cover'); },
    happen: (s) => costsThem(s, crewOf(s.production, 'co'), s.production, rint(2, 4), 'drink'),
    build: (s) => { const p = s.production; const c = p.crew[1]; const before = lastIncident(s, c);
      const t = before && before.title !== p.title
        ? `${c.name} again. On "${before.title}" it was sunglasses indoors; here it is two hours late and the same smell of last night. Forty people are standing around waiting.`
        : pick([`${c.name} turns up two hours late, sunglasses on indoors, clearly wrecked. Forty people are standing around waiting. Someone has to do something.`,
          `${c.name} is asleep in the trailer at call time, and the bottle on the floor is not water. The first AD is looking at you, because you are the one they talk to.`,
          `${c.name} slurs the first line of the night scene, then the second. The director has called a ten-minute break that is now forty.`]);
      const d = p.crew[0];
      return { speaker: 'A problem on set', text: t,
      // Covering is the cover story (career/cover.js): it may straighten out, ask again, come out, or never be mentioned.
      choices: [ { label: 'Cover — run lines until they sober up', act: 'cover', hint: d ? `If it comes out: ${coverRisk(d.name, d.trait, d.gender === 'female' ? 'f' : 'm')}` : null, fx: { mental: -2 }, prod: { meter: -3, bondAll: 8 }, reply: `You stall, improvise, and buy them two hours. The crew clocks what you did.` },
        { label: 'Call it out in front of everyone', check: { stat: 'confidence', diff: 55 },
          good: { fx: { respect: 4 }, prod: { meter: 8, bondAll: -5 }, mem: [{ who: 'co', felt: -2, why: 'that you called them out in front of everyone' }], career: { who: 'co', by: 3 }, reply: `You say the thing nobody wants to say. It lands. They straighten up, and the shoot gets sharper.` },
          bad: { fx: { respect: -3, mental: -3 }, prod: { meter: -6, bondAll: -12 }, mem: [{ who: 'co', felt: -2, why: 'that you called them out in front of everyone' }], reply: `It comes out shrill. Now there are two problems on set, and one of them is you.` } },
        { label: 'Use it — take the scene from them', fx: { confidence: 4, respect: -2 }, prod: { meter: 6, bondAll: -8 }, mem: [{ who: 'co', felt: -2, why: 'that you took the scene off them while they were down' }], reply: `You play off their mess and quietly own every frame. Good for you. Noted by everyone.` } ] }; } },
  // Somebody leaks a script people want to read: a tentpole, or a big picture with a famous name in it.
  { id: 'scriptLeak', scope: 'production', cooldown: 36, when: (s) => s.production && (s.production.tier === 'tentpole' || (BIG(s.production) && (s.fame || 0) >= 50)),
    build: (s) => ({ speaker: 'The script leaked', text: pick([
        `Half the script for "${s.production.title}" is on a forum, ending and all. The studio is hunting for who did it, and a few eyes have drifted toward you.`,
        `Somebody photographed the last forty pages of "${s.production.title}" in a taxi, and the ending is everywhere by lunch. The studio wants a name, and a few people have started looking at you.`,
        `A man with a podcast is reading the ending of "${s.production.title}" out loud to a million people. The studio is hunting for who sent it, and a few eyes have drifted toward you.`]),
      choices: [ { label: 'Say nothing, keep working', fx: { mental: -2 }, prod: { meter: -3 }, reply: `You keep your head down. The suspicion never quite lands, and never quite leaves.` },
        { label: 'Get ahead of it publicly', check: { stat: 'charisma', diff: 55 },
          good: { fx: { media: 6, respect: 3 }, prod: { meter: 5 }, reply: `You turn the leak into anticipation. The studio pretends that was the plan all along.` },
          bad: { fx: { scandal: 7, media: 4, mental: -2 }, prod: { meter: -5 }, reply: `Talking about it keeps it alive for another week. The studio is not grateful.` } },
        { label: 'Point at someone else', fx: { scandal: 4, respect: -5 }, prod: { bondAll: -18, meter: 3 }, reply: `The heat moves off you. The set gets very quiet whenever you walk in.` } ] }) },
  // The photographers come for a name on a picture people are waiting for.
  { id: 'droneOverSet', scope: 'production', cooldown: 36, when: (s) => s.production && (s.fame || 0) >= 45 && BIG(s.production),
    build: () => { const v = pick([
        ['Paparazzi', `A drone hangs over the lot, filming everything. Security can't reach it. The crew is furious; the studio is worried about spoilers.`],
        ['Paparazzi', `A long lens on a crane across the street has been on the set since dawn. Security can't touch it. The crew is furious; the studio is worried about spoilers.`],
        ['A phone on set', `One of the extras has been filming everything on a phone, and it is online before lunch. The crew is furious; the studio is worried about spoilers.`]]);
      return { speaker: v[0], text: v[1],
      choices: [ { label: 'Ignore it and keep shooting', fx: { mental: -1 }, prod: { meter: -2 }, reply: `You work through it. Half the takes have a buzzing in the background.` },
        { label: 'Make a scene about privacy', fx: { media: 5, scandal: 3, respect: 2 }, prod: { meter: -3, bondAll: 6 }, reply: `Your rant gets filmed too, and goes everywhere. The crew loves you for it.` },
        { label: 'Play to the camera', fx: { fame: 3, media: 6, respect: -3 }, prod: { meter: -4 }, reply: `You give them a show. Free publicity, and a director who now trusts you slightly less.` } ] }; } },
  { id: 'replacementThreat', scope: 'production', cooldown: 36, when: (s) => s.production && s.production.meter < 25 && s.production.monthsLeft >= 1,
    build: (s) => ({ speaker: 'The studio', text: pick([
        `They fly someone in from the studio. The dailies are bad, the numbers are worse, and your name is in the middle of it. "We're looking at options for the role," they say. That is not a hypothetical.`,
        `The producer comes down with the numbers. There is an actor in the production office who is not in this film yet, and everybody has seen them. "We're looking at options for the role," the producer says.`,
        `Your agent rings at midnight: the studio has asked another agency who is free next month — for your part. The dailies are bad, and your name is in the middle of it.`]),
      choices: [ { label: 'Promise to turn it around', fx: { mental: -4 }, prod: { meter: 14 }, reply: `You commit to fixing it, on the record. Everyone is watching now — which is its own kind of fuel.` },
        { label: 'Fight for the part', check: { stat: 'confidence', diff: 60 },
          good: { fx: { respect: 6, confidence: 4 }, prod: { meter: 20, bondAll: 10 }, reply: `You make the case for your version of the character, and you win the room. The set changes gear behind you.` },
          bad: { fx: { respect: -5, mental: -6, scandal: 5 }, prod: { meter: -8 }, reply: `You dig in and it reads as ego. The conversation about replacing you gets louder, not quieter.` } },
        { label: 'Walk, take the kill fee', fx: { scandal: 10, mental: -8, fame: -2 }, prod: { quit: true }, reply: `You leave before they can push you. The money is real; so is the story that follows you out.` } ] }) },
];
export function maybeStartArc(s) {
  if (s.pendingArc || s.stage === 'child') return;
  const done = s._arcsDone || [];
  const now = stampOf(s), last = s._arcAt || {};
  const eligible = ARCS.filter((a) => {
    // On-set incidents: one a film at most, never the same one as on the film before, and only
    // when you are actually on it: not signed off, not on a set that is held or finishing without you.
    if (a.scope === 'production') {
      if (!s.production || off(s) || !active(s).some((p) => p === s.production || (p.id != null && p.id === s.production.id))) return false;
      if ((s.production._incidents || []).length) return false;
      if (s._lastSetIncident === a.id) return false;
      // Most shoots have none of these. Whether this one will is decided once, the first time it
      // could, and kept: measured, a card a month at 35% put one on nearly every picture.
      if (s.production._trouble == null) s.production._trouble = chance(INCIDENT_FILMS);
      if (!s.production._trouble) return false;
    }
    else if (a.once && done.includes(a.id)) return false;
    // The same card, not again for a while (months). Only these old cards: two different people
    // can still bring the same kind of trouble, through the stories that are about them.
    if (a.cooldown && last[a.id] != null && now - last[a.id] < a.cooldown) return false;
    try { return a.when(s); } catch (e) { return false; }
  });
  if (!eligible.length) return;
  // Trouble on a shoot going badly finds you more often than ordinary life drama.
  const onSet = eligible.filter((a) => a.scope === 'production');
  const odds = onSet.length && s.production && s.production.meter < 35 ? 55 : 35;
  if (!chance(odds)) return;
  const arc = pick(eligible); const built = arc.build(s);
  s.pendingArc = { id: arc.id, speaker: built.speaker, text: built.text, choices: built.choices };
  if (arc.scope === 'production') { (s.production._incidents = s.production._incidents || []).push(arc.id); s._lastSetIncident = arc.id; }
  else (s._arcsDone = s._arcsDone || []).push(arc.id);
  (s._arcAt = s._arcAt || {})[arc.id] = now;
  // What it does to the people in it, whatever you go on to do about it.
  if (arc.happen) { try { arc.happen(s); } catch (e) { /* a set without the person it needs: nothing to carry */ } }
}
export function resolveArc(s, i) {
  const arc = s.pendingArc; if (!arc) return s;
  if (arc.story) return resolveStory(s, arc, i);   // a career story's beat (stories.js)
  if (arc.need) return resolveNeed(s, arc, i);     // somebody close asking for something (needs.js)
  if (arc.health) return resolveHealth(s, arc, i); // the doctor, the fifth take (burnout.js)
  const c = arc.choices[i]; if (!c) return s;
  let out = c, head = '';
  if (c.check) { const odds = checkOdds(s, c.check); const ok = chance(odds); out = ok ? c.good : c.bad; head = ok ? '✅ ' : '❌ '; }
  const fx = out.fx || {};
  Object.keys(fx).forEach((k) => {
    if (k === 'cash') { s.cash = (s.cash || 0) + fx[k]; return; }
    let d = fx[k];
    // These numbers were written on the assumption of a name that has something to lose. At
    // the bottom of a career they are ruinous: the burnout arc costs 3 fame, and a whole
    // feature film — shot, released, reviewed — is worth about 2. A playtest finished four
    // years and one film in at fame 0, exactly where it started, because one arc took more
    // than the film gave. Nobody can be made less famous than unknown.
    d = softenLoss(s, k, d);   // choiceWords.js — the event screen reads the same formula
    // Fame and standing have single write points. The 0..100 clamp here put a name at −20
    // standing back on 0 for helping a director (+2) — a story choice was the one thing in
    // the game that could not stay below zero. Found by ChatGPT's review.
    if (k === 'fame') { setFame(s, (s.fame || 0) + d); return; }
    if (k === 'respect') { setRespect(s, (s.respect || 0) + d); return; }
    s[k] = clamp((s[k] || 0) + d);
  });
  if (out.set || c.set) { const setter = out.set || c.set; Object.keys(setter).forEach((k) => { s[k] = setter[k]; }); }
  // A choice that says it does something does it. "Take the day job" used to hand over
  // €4,000 and no job; "step back and rest" used to change three numbers while the shoot
  // carried on underneath. Now the job is a job (work.js) and the rest is time off: signed
  // off for two months, the shoot on hold, the strain let out.
  const act = out.act || c.act;
  if (act === 'job' && !s.job) {
    const j = JOBS.find((x) => x.id === 'retail' && (s.ageY || 0) >= x.minAge) || JOBS[0];
    takeJob(s, j.id);
  }
  // The same medical pause the doctor offers (burnout.js): every production decides whether
  // to wait, shoot around you, or go on without you.
  if (act === 'rest') { medicalPause(s, 2); s.strain = clamp((s.strain || 0) - 10); }
  // Who remembers what you did, and what it costs them (the on-set cards). Covering for a co-star
  // is the cover story (career/cover.js), which remembers it itself and decides what comes of it.
  const sp = s.production;
  if (sp) {
    for (const m of out.mem || c.mem || []) { const who = crewOf(sp, m.who); const key = who ? keyFor(s, who, sp) : null; if (key) remember(s, { act: arc.id, p: sp, about: key, felt: { [key]: { felt: m.felt, why: m.why } } }); }
    const hurt = out.career || c.career;
    if (hurt) costsThem(s, crewOf(sp, hurt.who), sp, hurt.by, arc.id);
    if (act === 'cover') startCover(s, sp);
  }
  // Effects that land on the shoot itself rather than on you.
  const prod = out.prod || c.prod;
  if (prod && s.production) {
    const p = s.production;
    if (prod.meter) p.meter = clamp(p.meter + prod.meter);
    if (prod.bondAll) p.crew.forEach((cr) => { cr.bond = clamp(cr.bond + prod.bondAll); });
    if (prod.bondLead && p.crew[0]) p.crew[0].bond = clamp(p.crew[0].bond + prod.bondLead);
    if (prod.quit) {
      const killFee = Math.round((p.salary || 0) * 0.3);
      s.cash = (s.cash || 0) + killFee;
      addTimeline(s, `Walked away from ${p.title}. Kill fee €${killFee.toLocaleString()}.`, true);
      s.productions = (s.productions || []).filter((x) => x !== p && (x.id == null || x.id !== p.id)); s.production = s.productions[0] || null;
    }
  }
  s.lastEvent = `${arc.speaker}\n\n${head}${out.reply || c.label}`;
  addTimeline(s, `${arc.speaker}: ${c.label}.`, (fx.mental || 0) < -3 || (fx.scandal || 0) > 3);
  s.pendingArc = null;
  return s;
}

// ── the words on the event screen (App.jsx ArcModal) ─────────────────────────────
// Read off the numbers resolveArc applies, so a choice never says one thing and does another.
// A check is a roll at checkOdds — the chance this actor has now, not a base — and its two
// outcomes are listed apart. A story beat (stories.js) does what it does in a function and
// says so in `shows`; tests/test_arcs.mjs runs those functions and holds the words to them.
export function checkOdds(s, check) { return 30 + (s[check.stat] || 0) * 0.6; }
const first = (n) => String(n || '').split(' ')[0];
// [{ t, good }] — good true/false colours the line; null is neither (hype, a day job).
export function effectTags(s, out, c = out) {
  const tags = []; const add = (t, good) => tags.push({ t, good });
  const p = s.production; const prod = out.prod || c.prod; const act = out.act || c.act;
  if (prod && p) {
    // Only what would really move: a performance at 100 cannot go up, a set already at the
    // bottom cannot turn further (resolveArc holds them to 0..100).
    const room = (v, d) => Math.max(0, Math.min(100, (v || 0) + d)) - (v || 0);
    if (prod.quit) add(`you leave ${p.title} · €${Math.round((p.salary || 0) * 0.3).toLocaleString('en-US')} kill fee`, null);
    const m = prod.meter ? room(p.meter, prod.meter) : 0;
    if (m) add(`Your performance ${m > 0 ? '↑' : '↓'}${Math.abs(m) >= 10 ? (m > 0 ? '↑' : '↓') : ''}`, m > 0);
    const bl = prod.bondLead && p.crew[0] ? room(p.crew[0].bond, prod.bondLead) : 0;
    if (bl) add(`${first(p.crew[0].name)} trusts you ${Math.abs(bl) >= 15 ? 'much ' : ''}${bl > 0 ? 'more' : 'less'}`, bl > 0);
    if (prod.bondAll && (p.crew || []).some((cr) => room(cr.bond, prod.bondAll))) add(prod.bondAll > 0 ? 'the set warms to you' : `the ${prod.bondAll <= -15 ? 'whole ' : ''}set turns on you`, prod.bondAll > 0);
  }
  // Who will remember it, and whose name pays for it: what resolveArc does with `mem` and `career`.
  if (p && p.crew) {
    for (const m of out.mem || c.mem || []) { const who = p.crew[m.who === 'lead' ? 0 : 1]; if (who) add(`${first(who.name)} will remember it`, m.felt > 0); }
    const hurt = out.career || c.career; const hw = hurt ? p.crew[hurt.who === 'lead' ? 0 : 1] : null;
    if (hw) add(`it costs ${first(hw.name)} in the business`, null);
  }
  if (act === 'cover') add('it may come back later', null);
  if (act === 'job' && !s.job) add('you take a day job', null);
  if (act === 'rest') add(p ? 'two months off · each production decides whether to wait' : 'two months off', null);
  return [...tags, ...fxWords(out.fx, s, true)];
}
const pct = (x) => Math.round(Math.max(0, Math.min(100, x)));
// `statValue` is the number the chance was worked out from, printed beside it: the player can
// see where 58% comes from without the stat becoming a bar anywhere else.
const roll = (label, hint, odds, stat, good, bad, statValue) => ({ label, hint, odds: pct(odds), stat, statValue,
  outcomes: [{ label: 'If it works', tags: good }, { label: 'If it fails', tags: bad }] });
// The whole screen: where it happens, and each choice with what it does.
export function arcCard(s, a) {
  const def = a.story || a.youth ? null : ARCS.find((x) => x.id === a.id);
  const onSet = !!(def && def.scope === 'production' && s.production);
  const kicker = a.kicker || (a.story ? ((CHAINS[a.story] || {}).title || 'A story') : onSet ? `On set · ${s.production.title}` : `Age ${s.ageY}`);
  const built = a.health ? healthBeat(s, a) : null;
  const choices = ((built && built.choices) || a.choices || []).map((c) => {
    // A story beat or a need (needs.js): what its function does, said by the beat itself.
    if (a.story || a.need || a.health) {
      const sh = c.shows;
      if (sh && sh.odds != null) return roll(c.label, c.hint || (sh.stat ? `It comes down to your ${(STAT[sh.stat] || sh.stat).toLowerCase()}.` : null), sh.odds, sh.stat ? STAT[sh.stat] || sh.stat : null, showWords(sh.good, s), showWords(sh.bad, s), sh.stat ? Math.round(s[sh.stat] || 0) : null);
      return { label: c.label, hint: c.hint || null, tags: sh ? showWords(sh, s) : [], locked: c.locked || null, later: !!c.later };
    }
    if (c.check) {
      const stat = STAT[c.check.stat] || c.check.stat;
      return roll(c.label, c.hint || `It comes down to your ${stat.toLowerCase()}.`, checkOdds(s, c.check), stat, effectTags(s, c.good || {}, c), effectTags(s, c.bad || {}, c), Math.round(s[c.check.stat] || 0));
    }
    return { label: c.label, hint: c.hint || null, tags: effectTags(s, c), quit: !!(c.prod && c.prod.quit) };
  });
  return { onSet, kicker, choices };
}
