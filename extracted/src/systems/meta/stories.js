// Career stories. Maxi: "there are no stories about the career — nothing happens TO you
// over time, only rolls." So: chains. A chain starts from something that happened (a
// story in the papers, a name paired with yours, an agent who took somebody else into
// the meeting, the year the leads went to people ten years younger, the phone that
// stopped ringing, the part you passed on), asks you something, and comes back for you
// months later with what your answer turned into. Two or three beats each, a status
// line on the main screen while it runs, a verdict at the end.
//
// A beat is shown through the same modal as a life dilemma (arcs.js) — s.pendingArc with
// `story` set — and resolveArc hands it back here. Choices are rebuilt from the state
// at the moment of the click, so nothing that cannot be saved is ever stored.
import { rint, chance, pick } from '../../engine/rng.js';
import { uid } from '../../engine/id.js';
import { addTimeline } from '../../engine/timeline.js';
import { inCareer } from '../../engine/stage.js';
import { comboOf } from '../../engine/combo.js';
import { setFame, setRespect, quoteFor } from './status.js';
import { typecastScandal, typecastBump } from './typecast.js';
import { hasAgent, fireAgent } from '../career/agent.js';
import { actorById, activeActors, ageOf, yourRank } from '../world/world.js';
import { personName, namesInUse } from '../world/names.js';
import { newTitle } from '../world/titles.js';
import { GENRES } from './news.js';
import { rollStability } from '../career/stability.js';
import { ambitionOf } from './ambition.js';
import { notePassedOutcome } from './passed.js';
import { loseContinuation, recordForTitle, ensureResult, withoutYouLine } from '../career/continuation.js';
import { slotNorm } from '../career/franchise.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const money = (n) => (n >= 1e6 ? `€${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}m` : `€${Math.round(n).toLocaleString()}`);
const first = (name) => String(name || '').split(' ')[0];
// The chance a story's roll has for this actor now: shown on the choice (shows.odds) and rolled
// by check(), one formula.
const oddsOf = (s, stat, diff) => 30 + (s[stat] || 0) * 0.6 - (diff - 50);
const check = (s, stat, diff) => chance(oddsOf(s, stat, diff));
// Every choice in a chain says what its apply() does, in `shows` — { fx, more } for what happens,
// { odds, stat, good, bad } for a roll — because the function itself cannot be read off the
// screen (systems/life/choiceWords.js puts it into words). fx are the numbers apply() moves;
// `more` is what it does beyond them. tests/test_arcs.mjs runs every apply() and holds the two
// together: change one, change the other. The phrases that test can check are kept here.
const SAY = {
  hiding: { t: 'a month with no offers and no castings', good: false },
  known: { t: 'the business starts to know you for the scandal', good: false },
  boost: { t: 'more offers from your agent for six months', good: true },
  slack: { t: 'fewer offers from your agent for a year', good: false },
  noAgent: { t: 'no agent for at least three months', good: false },
  rooms: { t: 'the big castings go a little worse while the rivalry lasts', good: false },
};

export function stories(s) { return s.stories || (s.stories = []); }
export function storyOf(s, id) { return stories(s).find((x) => x.id === id) || null; }
function onCooldown(s, id, months) { const last = ((s._storyLog || {})[id] || []).slice(-1)[0]; return last != null && stamp(s) - last < months; }
function end(s, st) {
  s.stories = stories(s).filter((x) => x !== st);
  ((s._storyLog = s._storyLog || {})[st.id] = (s._storyLog[st.id] || [])).push(stamp(s));
}

// ── the chains ───────────────────────────────────────────────────────────────────
export const CHAINS = {
  // 1. The story in the papers. What you do in the first hour decides what it becomes.
  scandal: {
    title: 'The story', cooldown: 6,
    start: (s) => (s._lastStory === stamp(s) && s._lastStoryId && (s.fame || 0) >= 20 ? { kind: s._lastStoryId, beat: 'break', due: stamp(s) } : null),
    status: (s, st) => (st.beat === 'caught' ? 'You said it never happened. It is about to be proved that it did.' : st.data.path === 'hiding' ? 'Out of sight. The story is finding somebody else.' : 'The story is out. They are waiting to hear what you say.'),
    beats: {
      break: {
        build: (s, st) => {
          const evidence = /dui|recording|photo/.test(st.data.kind);
          const publicist = !!(s.staff && s.staff.publicist);
          return { speaker: publicist ? 'Your publicist' : 'Your phone', text: `The story is out. Forty messages by nine, and one of them is ${publicist ? 'your publicist asking what you want to say' : 'a journalist who already has the piece written and wants a line for it'}. What it becomes is decided in the next hour.`,
            choices: [
              // Without a tape a denial simply holds; it used to say "it will hold, or it will
              // not" either way. With one, it holds 40% of the time, 60 with a publicist — the
              // same odds as before, rolled as the chance it holds so the roll reads the right way up.
              { label: 'Deny it', hint: evidence ? `There is a tape. There is always a tape. ${publicist ? 'Your publicist makes the denial likelier to hold.' : 'A publicist would make it likelier to hold.'}` : 'There is no tape. Nobody can prove it.',
                shows: evidence ? { odds: publicist ? 60 : 40, good: { fx: { media: 2, scandal: -3 } }, bad: { fx: { media: 2 }, more: [{ t: 'the tape comes out next month', good: false }] } } : { fx: { media: 2, scandal: -3 } },
                apply: () => { s.media = clamp((s.media || 0) + 2);
                  if (evidence && !chance(publicist ? 60 : 40)) { st.data.path = 'denied'; return { reply: 'Denied, flatly. It holds for now. Somebody somewhere is looking for the tape.', next: { beat: 'caught', inMonths: 1 } }; }
                  s.scandal = clamp((s.scandal || 0) - 3); return { reply: 'Denied. Some believe you; the rest have moved on to somebody else. It holds.', end: true }; } },
              { label: 'Apologise', hint: 'Costs a little face. Buys a lot of quiet.',
                shows: { fx: { scandal: -5, respect: 2, fame: -1, media: 3 }, more: [{ t: 'Standing ↑ again in two months, when it is over', good: true }] },
                apply:() => { s.scandal = clamp((s.scandal || 0) - 5); setRespect(s, (s.respect || 0) + 2); setFame(s, (s.fame || 0) - 1); s.media = clamp((s.media || 0) + 3); st.data.path = 'sorry';
                  return { reply: 'You say the plain thing: it happened, you are sorry, you are dealing with it. It is not a good day. It is a short one.', next: { beat: 'after', inMonths: 2 } }; } },
              { label: 'Disappear for a month', hint: 'No board, no parties, no cameras. The story finds somebody else.',
                shows: { fx: { media: -25, scandal: -6, fame: -2, mental: 6 }, more: [SAY.hiding] },
                apply:() => { s.hiding = stamp(s) + 1; s.media = Math.max(0, (s.media || 0) - 25); s.scandal = clamp((s.scandal || 0) - 6); setFame(s, (s.fame || 0) - 2); s.mental = clamp((s.mental || 50) + 6); st.data.path = 'hiding';
                  return { reply: 'Phone off. A house nobody knows the address of. The story runs for a week without you in it and starves.', next: { beat: 'back', inMonths: 2 } }; } },
              { label: 'Use it', hint: 'Lean in. The brands do not mind a story; they like one.',
                shows: { fx: { media: 12, scandal: 5, respect: -5, fame: 3 }, more: [SAY.known, { t: 'a brand calls next month', good: true }] },
                apply:() => { s.media = clamp((s.media || 0) + 12); s.scandal = clamp((s.scandal || 0) + 5); setRespect(s, (s.respect || 0) - 5); setFame(s, (s.fame || 0) + 3); typecastScandal(s, 1); st.data.path = 'used';
                  return { reply: 'You give them a better quote than the story. It runs twice as long and twice as loud, and every word of it has your name in it.', next: { beat: 'brand', inMonths: 1 } }; } },
            ] };
        } },
      caught: {
        build: (s, st) => ({ speaker: 'The tape', text: `The ${st.data.kind === 'photo' ? 'photograph' : 'recording'} is out, and so is your denial, side by side. You said it never happened.`,
          choices: [
            { label: 'Apologise, late', hint: 'Worse than doing it first. Better than not.', shows: { fx: { respect: -6, scandal: 4 } }, apply: () => { setRespect(s, (s.respect || 0) - 6); s.scandal = clamp((s.scandal || 0) + 4); return { reply: 'The second statement is the one people remember, and it starts with the word sorry. The word before it is finally.', end: true }; } },
            { label: 'Double down', hint: 'Some careers run on this.', shows: { fx: { scandal: 10, respect: -3, media: 6 }, more: [SAY.known] }, apply: () => { s.scandal = clamp((s.scandal || 0) + 10); setRespect(s, (s.respect || 0) - 3); s.media = clamp((s.media || 0) + 6); typecastScandal(s, 1); return { reply: 'You call it a fake. Nobody believes you and everybody watches. The tabloids have a face for the month, and it is yours.', end: true }; } },
          ] }) },
      after: {
        build: (s, st) => ({ speaker: 'Two months on', text: chance(70) ? 'A columnist called the apology graceful, which is the word you wanted. The story has a last paragraph now.' : 'Nobody quite believed the apology, but nobody has said so in print. It is over the way these things are over: replaced.',
          choices: [{ label: 'Move on', shows: { fx: { respect: 1 } }, apply: () => { setRespect(s, (s.respect || 0) + 1); return { reply: 'Over.', end: true }; } }] }) },
      back: {
        build: (s, st) => ({ speaker: 'Back', text: 'You came back and the story was somebody else’s. A month is a long time in a business that cannot remember last week.',
          choices: [{ label: 'Good', shows: {}, apply: () => ({ reply: 'Nobody asks where you were. That is what a month is for.', end: true }) }] }) },
      brand: {
        build: (s, st) => { const fee = Math.round(Math.max(60000, (quoteFor(s, 'film_indie') || 60000) * 1.4)); return { speaker: 'A brand', text: 'A brand called. They have seen the story. They do not mind it; they like it. A day’s work, a lot of money, and your face on something with the story still attached.',
          choices: [
            { label: 'Take it', shows: { more: [{ t: `an offer: a day as the face of a brand, ${money(fee)}`, good: true }] }, apply: () => { (s.offers = s.offers || []).push({ id: uid(s, 'off'), via: 'brand', kind: 'brand', projectTitle: 'The campaign', role: 'The face', type: 'Brand Campaign', genre: 'Commercial', salary: fee, months: 1, fame: 3, prestigeScore: rint(20, 40), tier: 'supporting', scale: 'oneoff', stability: 90, deadline: 3, note: 'They saw the story. They liked it.' }); return { reply: 'The paper is in Messages. Nobody on it is pretending.', end: true }; } },
            { label: 'No', shows: { fx: { respect: 1 } }, apply: () => { setRespect(s, (s.respect || 0) + 1); return { reply: 'You say no to the easy money. Somebody notices; not many.', end: true }; } },
          ] }; } },
    },
  },

  // 2. The rival. Same age, same parts, one chair between you. Two years to settle it.
  rival: {
    title: 'The rival', cooldown: 60,
    start: (s) => {
      if (!inCareer(s) || (s.fame || 0) < 35 || !chance(2)) return null;
      const you = yourRank(s); if (you > 80) return null;
      const near = activeActors(s).filter((a) => !a.icon && Math.abs(ageOf(s, a) - (s.ageY || 30)) <= 6 && Math.abs((a.rank || 999) - you) <= 10 && (a.rank || 999) <= 80);
      if (!near.length) return null;
      const a = pick(near);
      return { who: a.id, name: a.name, rank0: you, beat: 'named', due: stamp(s) };
    },
    status: (s, st) => { const a = actorById(s, st.data.who); const you = yourRank(s); return `${st.data.name}: #${a ? a.rank : '?'} to your #${you}. ${st.data.tone === 'warm' ? 'Civil, in print.' : st.data.tone === 'hot' ? 'The rooms have noticed. So has the board.' : 'The trades are keeping score.'}`; },
    beats: {
      named: {
        build: (s, st) => ({ speaker: 'The trades', text: `A piece has paired you: ${st.data.name} and you, the same age, the same parts, and one chair on the list between you. A journalist wants a line about them.`,
          choices: [
            // Until the tone is warm, the rooms have taken sides: storyCastFactor takes 12% off
            // the big castings for as long as the rivalry runs. Generous is the one that lifts it.
            { label: 'Something generous', hint: 'Costs nothing. Ends nothing.', shows: { fx: { respect: 2 }, more: [{ t: 'the rooms stay out of it: no rivalry in the castings', good: true }] }, apply: () => { st.data.tone = 'warm'; setRespect(s, (s.respect || 0) + 2); return { reply: `You say they are very good, because they are. It reads well. It does not stop anybody counting.`, next: { beat: 'year', inMonths: 12 } }; } },
            { label: 'Nothing', hint: 'Let the work talk.', shows: { more: [SAY.rooms] }, apply: () => { st.data.tone = 'cool'; return { reply: 'No comment. The piece runs with a photograph of each of you and a question mark.', next: { beat: 'year', inMonths: 12 } }; } },
            { label: 'Something sharp', hint: 'Everybody reads it. The rooms take sides.', shows: { fx: { media: 6, scandal: 2, respect: -1 }, more: [SAY.rooms] }, apply: () => { st.data.tone = 'hot'; s.media = clamp((s.media || 0) + 6); s.scandal = clamp((s.scandal || 0) + 2); setRespect(s, (s.respect || 0) - 1); return { reply: 'You say the thing. It is quoted for a month, and every room you read in this year has read it too.', next: { beat: 'year', inMonths: 12 } }; } },
          ] }) },
      year: {
        build: (s, st) => {
          const a = actorById(s, st.data.who); const you = yourRank(s);
          const theirs = a ? (a.credits || []).filter((c) => c.year >= (s.year || 0) - 1).sort((x, y) => (y.gross || 0) - (x.gross || 0))[0] : null;
          const yours = (s.filmography || []).filter((c) => !c.minor && (c.year || 0) >= (s.year || 0) - 1).sort((x, y) => (y.gross || 0) - (x.gross || 0))[0];
          return { speaker: 'A year in', text: `${st.data.name} is #${a ? a.rank : '?'}; you are #${you}. ${theirs ? `Their "${theirs.title}" took ${money(theirs.gross || 0)}.` : 'They have not opened anything this year.'} ${yours ? `Your "${yours.title}" ${yours.gross ? `took ${money(yours.gross)}` : `rated ${Math.round(yours.rating || 0)}`}.` : 'You have not opened anything this year.'} A producer wants you both in the same picture — a two-hander, one poster, two names.`,
            choices: [
              { label: 'Take the two-hander', hint: 'A set with them on it. One of you comes out of it ahead.', shows: { more: [{ t: `an offer: a lead opposite ${st.data.name}`, good: null }] }, apply: () => {
                  const genre = pick(GENRES); const quote = quoteFor(s, 'film_studio') || 200000;
                  (s.offers = s.offers || []).push({ id: uid(s, 'off'), via: 'studio', kind: 'twohander', story: 'rival', costarId: st.data.who, projectTitle: newTitle(s, genre), role: 'Lead', type: 'Feature Film', genre, salary: Math.round(quote * (0.85 + Math.random() * 0.3)), months: rint(3, 5), fame: 5, prestigeScore: rint(50, 75), tier: 'lead', scale: 'feature', stability: rollStability('feature'), deadline: 3, note: `${st.data.name} has already said yes. That is why they sent it to you.` });
                  return { reply: 'The paper is in Messages. Their name is already on it.', next: { beat: 'settled', inMonths: 12 } }; } },
              { label: 'Keep going alone', shows: {}, apply: () => ({ reply: 'You pass. They make it with somebody else, and the somebody else is not on the list.', next: { beat: 'settled', inMonths: 12 } }) },
            ] };
        } },
      settled: {
        build: (s, st) => {
          const a = actorById(s, st.data.who); const you = yourRank(s); const ahead = a ? you < (a.rank || 999) : true;
          return { speaker: 'Settled', text: ahead ? `Two years and the trades have stopped pairing you. You are #${you}; ${st.data.name} is #${a ? a.rank : '?'}. The piece this time is about you, and they are a paragraph in it.` : `Two years and the trades have stopped pairing you. ${st.data.name} is #${a ? a.rank : '?'}; you are #${you}. The piece this time is about them, and you are the paragraph.`,
            choices: [{ label: ahead ? 'Good' : 'Noted', shows: { fx: ahead ? { respect: 3, fame: 2 } : { fame: -3 } }, apply: () => { if (ahead) { setRespect(s, (s.respect || 0) + 3); setFame(s, (s.fame || 0) + 2); addTimeline(s, `The trades call it settled: you, not ${st.data.name}.`); } else { setFame(s, (s.fame || 0) - 3); addTimeline(s, `The trades call it settled: ${st.data.name}, not you.`, true); } return { reply: ahead ? 'It was never a race. It was, and you won it.' : 'It was never a race. It was, and they won it. There will be another list next year.', end: true }; } }] };
        } },
    },
  },

  // 3. The agent who took somebody else into the meeting.
  agent: {
    title: 'The agent', cooldown: 48,
    start: (s) => (inCareer(s) && hasAgent(s) && (s.fame || 0) >= 25 && stamp(s) - (s.agent.since || 0) >= 12 && chance(1.5) ? { name: s.agent.name, beat: 'slip', due: stamp(s) } : null),
    status: (s, st) => (st.data.path === 'sharp' ? `${st.data.name} is working for you again. For now.` : st.data.path === 'slack' ? `${st.data.name} sends what is left after the bigger clients.` : `${st.data.name}: a casting director told you something.`),
    beats: {
      slip: {
        build: (s, st) => ({ speaker: 'A casting director, off the record', text: `${st.data.name} sent your name for the part, then took a bigger client into the meeting instead and left yours on the table. It is not the first time, they say. It is the first time you have heard.`,
          choices: [
            { label: 'Confront them', hint: 'Charisma. They straighten up, or they go cold.', shows: { odds: oddsOf(s, 'charisma', 50), stat: 'charisma', good: { more: [SAY.boost] }, bad: { more: [SAY.slack] } }, apply: () => { if (check(s, 'charisma', 50)) { st.data.path = 'sharp'; s.agentBoost = stamp(s) + 6; return { reply: 'They do not deny it. They do not do it again for a while, either, and the next six months of calls are the best you have had from them.', next: { beat: 'books', inMonths: 6 } }; } st.data.path = 'sour'; s.agentSlack = stamp(s) + 12; return { reply: 'It comes out as an accusation and lands as one. They are polite from now on, which from an agent is the worst thing they can be.', next: { beat: 'books', inMonths: 6 } }; } },
            { label: 'Fire them', hint: 'No agent for a while. Somebody else will ask.', shows: { more: [SAY.noAgent] }, apply: () => { fireAgent(s); return { reply: 'Done in a phone call. The next call is the one you make yourself, for a while.', end: true }; } },
            { label: 'Let it go', hint: 'Agents do this. You knew that.', shows: { fx: { mental: -2 }, more: [SAY.slack] }, apply: () => { st.data.path = 'slack'; s.agentSlack = stamp(s) + 12; s.mental = clamp((s.mental || 50) - 2); return { reply: 'You say nothing. You get what is left after the bigger clients, and you knew that before today.', next: { beat: 'books', inMonths: 6 } }; } },
          ] }) },
      books: {
        build: (s, st) => {
          if (!hasAgent(s) || s.agent.name !== st.data.name) return { speaker: 'Later', text: `${st.data.name} is not your agent any more. The rest of that story does not happen to you.`, choices: [{ label: 'Good', shows: {}, apply: () => ({ reply: 'Good.', end: true }) }] };
          const skim = Math.round((s.cash || 0) * 0.04);
          return { speaker: 'A friend who reads accounts', text: `They went through your statements as a favour. There is a gap: four per cent off everything for two years, on top of the commission. ${money(skim)} of it, roughly, that ${st.data.name} never mentioned.`,
            choices: [
              { label: 'Sue', hint: 'You get some of it back. You get a new agent, eventually.', shows: { fx: { cash: Math.round(skim * 0.6), respect: 2 }, more: [SAY.noAgent] }, apply: () => { s.cash = (s.cash || 0) + Math.round(skim * 0.6); setRespect(s, (s.respect || 0) + 2); fireAgent(s); return { reply: `Your lawyer writes one letter and ${st.data.name} settles for most of it rather than see it in the trades. You are between agents. The trades hear anyway, and the word they use is "careful", which is a good word to have used about you.`, end: true }; } },
              { label: 'Settle quietly', hint: 'Some of it back. Keep the agent, know what they are.', shows: { fx: { cash: Math.round(skim * 0.4) }, more: [SAY.slack] }, apply: () => { s.cash = (s.cash || 0) + Math.round(skim * 0.4); s.agentSlack = stamp(s) + 12; return { reply: 'A conversation, a transfer, no paper. You keep them because the alternative is nobody, and you both know it.', end: true }; } },
              { label: 'Say nothing', shows: { fx: { mental: -3 } }, apply: () => { s.mental = clamp((s.mental || 50) - 3); return { reply: 'You put the statements in a drawer. It is not the money. It is that you know.', end: true }; } },
            ] };
        } },
    },
  },

  // 4. The years. The leads go to people ten years younger; there are three ways this goes.
  ageing: {
    title: 'The years', cooldown: 9999,
    start: (s) => (inCareer(s) && (s.fame || 0) >= 30 && (s.ageY || 0) >= (s.gender === 'female' ? 38 : 45) && !((s._storyLog || {}).ageing || []).length && chance(4) ? { fame0: s.fame || 0, beat: 'call', due: stamp(s) } : null),
    status: (s, st) => ({ fight: 'Holding the leads. It costs.', character: 'The character parts. Smaller, and the reviews are not.', tv: 'Television. A face people see every week.' }[st.data.path] || 'Your agent wants a conversation about the parts.'),
    beats: {
      call: {
        build: (s, st) => ({ speaker: hasAgent(s) ? s.agent.name : 'Your agent, if you had one', text: `Carefully, over lunch: the leads are going to people ten years younger. It is not about the work. It is about the year on the poster. There are three ways this goes, and the actors who do not choose one get chosen for.`,
          choices: [
            // What each road does now (storyCastFactor reads ageFight and characterActor), and the
            // verdict eighteen months on, which is the same for everybody on that road.
            { label: 'Fight it', hint: 'Hold the leads two more years. The face pays for it.', shows: { more: [{ t: 'better odds at the leads for two years', good: true }, { t: 'in 18 months: Standing ↑ if your fame held, Fame ↓ if it did not', good: null }] }, apply: () => { st.data.path = 'fight'; s.ageFight = stamp(s) + 24; return { reply: 'The gym, the diet, the people who do things to faces. You hold the parts. Nobody says how long for.', next: { beat: 'verdict', inMonths: 18 } }; } },
            { label: 'Take the character parts', hint: 'Supporting, the parents, the villains. The good ones.', shows: { fx: { respect: 3 }, more: [{ t: 'from now on: worse odds at leads, better at every other part', good: null }, { t: 'Standing ↑ again in 18 months', good: true }] }, apply: () => { st.data.path = 'character'; s.characterActor = true; setRespect(s, (s.respect || 0) + 3); return { reply: 'You stop reading for the lead and start reading for the part that steals the film. The rooms are warmer. The fees are not.', next: { beat: 'verdict', inMonths: 18 } }; } },
            { label: 'Television', hint: ambitionOf(s) === 'tv' ? 'A season a year. A face people see every week — the thing you wanted at ten.' : 'A season a year. A face people see every week.', shows: { more: [{ t: 'the business starts to see you as television', good: null }, { t: 'Fame ↑ in 18 months', good: true }] }, apply: () => { st.data.path = 'tv'; typecastBump(s, 'tv', 2); return { reply: 'The networks were waiting. A season a year, and a face people see every week is a face people remember.', next: { beat: 'verdict', inMonths: 18 } }; } },
          ] }) },
      verdict: {
        build: (s, st) => {
          const since = (s.filmography || []).filter((c) => !c.minor && (c.year || 0) >= (s.year || 0) - 1);
          const held = (s.fame || 0) >= st.data.fame0 - 4;
          const text = st.data.path === 'fight' ? (held ? 'Eighteen months and you are still on the posters. It cost what it cost, and the year on them is still yours.' : 'Eighteen months of fighting it and the posters have somebody else on them anyway. The face is not the problem. The year is.')
            : st.data.path === 'character' ? (since.some((c) => (c.rating || 0) >= 70) ? 'The parts are smaller and the reviews are not. Somebody wrote that you were the best thing in the film, and the film was not about you.' : 'The parts are smaller. Nobody has written the sentence yet. They will, when the film is good enough to be in.')
            : (since.some((c) => c.episodes) ? 'A season a year. People stop you in shops to tell you what your character should do. That is what television is.' : 'The networks are slower than they said. The season has not started yet.');
          const fx = st.data.path === 'fight' ? (held ? { respect: 2 } : { fame: -3 }) : st.data.path === 'character' ? { respect: 3 } : st.data.path === 'tv' ? { fame: 3 } : {};
          return { speaker: 'Eighteen months on', text, choices: [{ label: 'On', shows: { fx }, apply: () => { if (st.data.path === 'fight') { if (held) setRespect(s, (s.respect || 0) + 2); else setFame(s, (s.fame || 0) - 3); } if (st.data.path === 'character') setRespect(s, (s.respect || 0) + 3); if (st.data.path === 'tv') setFame(s, (s.fame || 0) + 3); return { reply: 'On.', end: true }; } }] };
        } },
    },
  },

  // 5. The comeback. Forgotten a year and more, and then one call.
  comeback: {
    title: 'The comeback', cooldown: 120,
    start: (s) => {
      const c = comboOf(s); const forgotten = c === 'faded' || c === 'asked' || c === 'tale';
      if (!forgotten) { s._fadedSince = null; return null; }
      if (!s._fadedSince) s._fadedSince = stamp(s);
      if (stamp(s) - s._fadedSince < 12 || s._cameBack || !chance(6)) return null;
      const known = (s.people || []).filter((p) => /Director/.test(p.role || '') && !p.cold && !holdsAGrudge(s, p.name));
      const who = known.length ? pick(known).name : personName(chance(50) ? 'female' : 'male', namesInUse(s));
      return { who, beat: 'call', due: stamp(s) };
    },
    status: (s, st) => (st.data.path === 'film' ? `${first(st.data.who)}’s film. If it is good, the word is comeback.` : `${st.data.who} called.`),
    beats: {
      call: {
        build: (s, st) => { const fee = Math.round(150000 + (s.peakFame || 0) * 4000); const face = ambitionOf(s) === 'face'; return { speaker: st.data.who, text: `${st.data.who} is making a small film for the festivals. No money to speak of, a good part, and your name — the old one — would help them find the rest. "Nobody else is going to call," they say, kindly.`,
          choices: [
            { label: 'Take it', hint: 'A festival film. The one road back that is a road.', shows: { more: [{ t: 'an offer: the lead in a festival film, for very little money', good: null }] }, apply: () => { st.data.path = 'film'; const genre = pick(['Drama', 'Drama', 'Thriller', 'Romance']);
                (s.offers = s.offers || []).push({ id: uid(s, 'off'), via: 'director', kind: 'comeback', story: 'comeback', projectTitle: newTitle(s, genre), role: 'Lead', type: 'Festival Film', genre, salary: rint(12000, 24000), months: 2, fame: 2, prestigeScore: rint(58, 78), tier: 'lead', scale: 'festival', stability: rint(72, 90), deadline: 3, director: st.data.who, note: `${first(st.data.who)} asked for you by name. Nobody else did.` });
                return { reply: 'The paper is in Messages. It is not much paper.', next: { beat: 'wait', inMonths: 30 } }; } },
            { label: 'The reality show instead', hint: face ? 'A lot of money, and famous again — which is what you wanted, in a way.' : 'A lot of money. The wrong kind of famous.', shows: { fx: { cash: fee, fame: face ? 9 : 6, respect: -8 }, more: [SAY.known] }, apply: () => { s.cash = (s.cash || 0) + fee; setFame(s, (s.fame || 0) + (face ? 9 : 6)); setRespect(s, (s.respect || 0) - 8); typecastScandal(s, 1); return { reply: `Twelve weeks in a house with cameras. ${money(fee)}, six points of fame, and the business now knows exactly what you would do for it.`, end: true }; } },
            { label: 'Wait for a real offer', hint: 'It may not come.', shows: { odds: 25, good: { more: [{ t: 'a studio offer in four to eight months', good: true }] }, bad: { fx: { mental: -3 } } }, apply: () => { if (chance(25)) { const genre = pick(GENRES); (s.laterOffers = s.laterOffers || []).push({ due: stamp(s) + rint(4, 8), line: 'A studio remembered your name.', event: 'A studio remembered your name. The paper is in Messages.', offer: { id: uid(s, 'off'), via: 'studio', projectTitle: newTitle(s, genre), role: 'Lead', type: 'Feature Film', genre, salary: Math.round((quoteFor(s, 'film_studio') || 150000) * 0.7), months: rint(3, 5), fame: 5, prestigeScore: rint(45, 65), tier: 'lead', scale: 'feature', stability: rollStability('feature'), deadline: 3 } }); return { reply: 'You say no, politely. Months later, somebody at a studio says your name in a meeting, and it goes quiet, and then it does not.', end: true }; } s.mental = clamp((s.mental || 50) - 3); return { reply: 'You say no, politely. The phone does what it has been doing.', end: true }; } },
          ] }; } },
      wait: {
        build: (s, st) => ({ speaker: 'Later', text: `${first(st.data.who)}’s film never got to the end of the road, or you never got to the start of it. The call does not come twice.`, choices: [{ label: 'On', shows: {}, apply: () => ({ reply: 'On.', end: true }) }] }) },
    },
  },

  // 6. The one you passed on. A director remembers a no for a long time; the film opens
  //    without you, and either you dodged it or you watch somebody else take the part.
  refused: {
    title: 'The one you passed on', cooldown: 0,
    start: (s) => { const g = (s.grudges || []).find((x) => x.due <= stamp(s) && !x.opened); if (!g) return null; g.opened = true; return { who: g.who, title: g.title, scale: g.scale, beat: 'opened', due: stamp(s) }; },
    status: (s, st) => `${st.data.who}’s "${st.data.title}" opened without you.`,
    beats: {
      opened: {
        build: (s, st) => {
          const g = (s.grudges || []).find((x) => x.title === st.data.title) || {};
          const hit = !!g.hit;
          const a = activeActors(s).filter((x) => Math.abs(ageOf(s, x) - (s.ageY || 30)) <= 8)[0];
          const other = a ? a.name : 'somebody younger';
          // What this beat decides is kept on the part you passed on (meta/passed.js).
          notePassedOutcome(s, st.data.title, { replacedBy: a ? a.name : null, outcome: { hit, gross: hit ? (g.gross || 0) : 0 } });
          if (!hit) return { speaker: 'The trades', text: `${st.data.who}’s "${st.data.title}" — the one you passed on — opened and sank. The part went to ${other}, and the reviews mention them the way reviews mention a weather forecast.`,
            choices: [{ label: 'You dodged it', shows: { fx: { mental: 3 } }, apply: () => { s.mental = clamp((s.mental || 50) + 3); return { reply: 'You dodged it. Nobody will ever know you were nearly in it, which is the point.', end: true }; } }] };
          return { speaker: 'The trades', text: `${st.data.who}’s "${st.data.title}" — the one you passed on — opened at ${money(g.gross || 0)}. The part went to ${other}, and the reviews use their name in the first line. ${st.data.who} has not sent you anything since, and will not.`,
            choices: [
              { label: 'Write to them', hint: 'Charisma. A door, or a closed one.', shows: { odds: oddsOf(s, 'charisma', 55), stat: 'charisma', good: { more: [{ t: `the grudge is over, and ${first(st.data.who)} warms to you`, good: true }] }, bad: { more: [{ t: 'no reply: the grudge stays', good: false }] } }, apply: () => { if (check(s, 'charisma', 55)) { s.grudges = (s.grudges || []).filter((x) => x.title !== st.data.title); const p = (s.people || []).find((x) => x.name === st.data.who); if (p) { p.cold = false; p.relationship = clamp((p.relationship || 30) + 10); } return { reply: 'Two lines back, a week later. Congratulations meant, no hard feelings not quite meant. The door is not closed.', end: true }; } return { reply: 'No reply. Some people keep a list, and you are on theirs.', end: true }; } },
              { label: 'Let it lie', shows: { more: [{ t: `the grudge stays: ${first(st.data.who)} will not call`, good: null }] }, apply: () => ({ reply: 'You let it lie. They will not call; you will not ask. It is a small business and it will be a long time.', end: true }) },
            ] };
        } },
    },
  },

  // 7. The sequel without you. Maxi: you were the lead, they came back for you, and you
  //    said no — or the paper never got agreed. The fans are furious, the director writes
  //    two months later to ask what it would take, and if the answer is still no the film
  //    is made with somebody else in your part and the trades tell you how it opened.
  //    Series too: your own show, a season without you.
  recast: {
    title: 'Without you', cooldown: 0,
    // Started by noteSequelLoss, not by a roll — and, when one was already running, from the queue
    // it left (nextQueuedRecast), so a second loss waits its turn instead of never being told.
    start: (s) => nextQueuedRecast(s),
    // Said from what has happened, not only which beat is next. Maxi, at "Small Wedding · season 5
    // goes on without you" sitting on Home for a year: "it never changes?" It waited twelve months
    // for the next piece of news and said the same half-sentence the whole time.
    status: (s, st) => recastStatus(s, st),
    beats: {
      meeting: {
        build: (s, st) => ({ speaker: `${st.data.director} · a letter`, text: `"${st.data.title}" is going ahead. They would rather go ahead with you. ${first(st.data.director)} wants an hour — not business affairs, just the two of you — to hear what it was that did not work, and see what can be moved.`,
          choices: [
            { label: 'Go to the meeting', hint: 'They can move on the money, the months and the exclusivity. Not on making the film.', shows: { more: [{ t: 'their paper again: 20% more, a month shorter, no exclusivity, and points — once', good: true }] }, apply: () => {
                const o = st.data.offer; const salary = Math.round((o.salary || 0) * 1.2);
                (s.offers = s.offers || []).push({ ...o, id: uid(s, 'off'), story: 'recast', meeting: true, salary, episodeFee: o.episodeFee ? Math.round(o.episodeFee * 1.2) : undefined, months: Math.max(2, (o.months || 3) - 1), exclusive: false, backend: Math.max(o.backend || 0, 0.02), deadline: 4, expires: undefined, contract: undefined, signed: false, sent: false,
                  note: `After the meeting: ${Math.round(((salary / Math.max(1, o.salary || 1)) - 1) * 100)}% more, a month shorter, no exclusivity, and points. ${first(st.data.director)} said it was the most they could do, and it is.` });
                st.data.path = 'met';
                return { reply: `An hour that is mostly listening. The paper comes back the same evening with the numbers moved and a note on the front in their handwriting. It is in Messages. It will not come again.`, next: { beat: 'answer', inMonths: 5 } }; } },
            { label: 'Decline the meeting', hint: 'They shoot without you. The director does not forget.', shows: burnShows(st), apply: () => { burnTheBridge(s, st); return { reply: `You do not go. ${first(st.data.director)} does not write again. The trades have the recast by the end of the month, and the fans have it an hour later.`, next: { beat: 'without', inMonths: monthsToIt(s, st) } }; } },
          ] }) },
      answer: {
        build: (s, st) => {
          const back = wentBack(s, st);
          if (back) { const f = recordForTitle(s, st.data.title); if (f) f.rec.you = 'returned'; }
          if (back) return { speaker: 'Back', text: `You went back to "${st.data.title}". The piece about it uses the word "reunited", and the fans use a lot of exclamation marks.`, choices: [{ label: 'Good', shows: { fx: { respect: 2 } }, apply: () => { setRespect(s, (s.respect || 0) + 2); return { reply: 'Good.', end: true }; } }] };
          if ((s.offers || []).some((o) => o.story === 'recast' && String(o.projectTitle || '').replace('⭐ ', '') === st.data.title)) { st.due = stamp(s) + 2; return null; }
          return { speaker: 'The trades', text: `"${st.data.title}" has been recast. ${first(st.data.director)} said, on the record, that the door had been open and that it is now shut. The fans have a hashtag.`, choices: [{ label: 'On', shows: st.data.burned ? {} : burnShows(st), apply: () => { if (!st.data.burned) burnTheBridge(s, st); return { reply: 'On.', next: { beat: 'without', inMonths: monthsToIt(s, st) } }; } }] };
        } },
      without: {
        build: (s, st) => {
          const tv = st.data.kind === 'renewal';
          // What it really did: the season or the part worked out off-screen by the same arithmetic
          // as your own (career/continuation.js), with whoever really has your part. It used to be a
          // coin here and a random gross, and the first name off the actors' list.
          const found = recordFor(s, st);
          if (!found) return null;
          const { src, rec } = found;
          if (rec.due != null && rec.due > stamp(s)) { st.due = rec.due; return null; }
          const x = ensureResult(s, src, rec);
          if (!x) { end(s, st); return null; }
          rec.told = true;
          const hit = tv ? (x.renewed || x.verdict === 'watched' || x.verdict === 'hit' || x.verdict === 'breakout') : (x.verdict === 'smash' || x.verdict === 'profitable');
          st.data.hit = hit; st.data.other = rec.by ? rec.by.name : null; st.data.gross = x.gross || 0; st.data.renewed = !!x.renewed;
          const fans = hit ? (tv ? ' The piece says the show was always bigger than any one name. That is the sentence.' : ' The fans were furious for a week and then they went to see it.')
            : (tv ? ' The fans blame the recast, loudly, and the piece agrees with them.' : ' The fans have decided, loudly, that this is why.');
          const text = withoutYouLine(rec, src) + fans;
          return { speaker: 'The trades', text, choices: [{ label: hit ? 'Noted' : 'Told you', shows: { fx: hit ? { fame: -3 } : { respect: 1, mental: 2 } }, apply: () => {
            if (hit) { setFame(s, (s.fame || 0) - 3); addTimeline(s, `"${st.data.title}" ${tv ? 'went out' : 'opened'} without you and did fine. The fans moved on.`, true); }
            else { setRespect(s, (s.respect || 0) + 1); s.mental = clamp((s.mental || 50) + 2); addTimeline(s, `"${st.data.title}" ${tv ? 'went out' : 'opened'} without you and sank. The fans blame the recast.`); }
            // Another season without you only if the network really ordered one.
            // The seasons after this one are the trades' to tell, as each one comes out (career/continuation.js).
            return { reply: hit ? 'They went to see it.' : 'They did not.', end: true }; } }] };
        } },
      again: {
        build: (s, st) => { const tv = st.data.kind === 'renewal'; const n = tv ? (st.data.season || 2) + 1 : (st.data.part || 2) + 1;
          // A thread from before the record existed rolled this on a coin; the record says whether
          // there really is another one (career/continuation.js). If not, there is nothing to tell.
          const f = recordForTitle(s, st.data.title);
          if (f && f.rec.result && !f.rec.result.renewed) { end(s, st); return null; }
          return { speaker: 'The trades', text: tv ? `Season ${n} of "${st.data.title}". Without you, again. Nobody writes the word "originally" any more.` : `"${st.data.title.replace(/\s+(II|III|IV|V|VI)$/, '')}", part ${n}. Without you, again. The piece does not mention you, which is the piece.`,
            choices: [{ label: 'On', shows: { fx: { fame: -1 } }, apply: () => { setFame(s, (s.fame || 0) - 1); addTimeline(s, `${tv ? `Season ${n}` : `Part ${n}`} of "${st.data.title.replace(/\s+(II|III|IV|V|VI)$/, '')}" — without you, again.`, true); return { reply: 'On.', end: true }; } }] }; } },
    },
  },
};
export const CHAIN_ORDER = ['scandal', 'refused', 'recast', 'comeback', 'ageing', 'agent', 'rival'];

// What the recast thread has come to, in words: which season or part, who has your part, and
// how it went — each of those is on st.data by the time the line can be shown.
function recastStatus(s, st) {
  const d = st.data, tv = d.kind === 'renewal';
  const root = d.root || String(d.title || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').replace(/\s+(II|III|IV|V|VI)$/, '');
  const which = tv ? `Season ${d.season || 2} of "${root}"` : `"${d.title}"`;
  if (st.beat === 'meeting') return `${which}: they will make it anyway. ${first(d.director)} has asked to meet.`;
  if (st.beat === 'answer') return `${which}: the paper came back changed. They are waiting.`;
  if (st.beat === 'again') {
    const f = recordForTitle(s, d.title);
    const who = f && f.rec.by ? `${f.rec.by.name} has your part` : d.other ? `${d.other} has your part` : 'Somebody else has your part';
    // What the record knows beats what an old thread rolled.
    const x = f && f.rec.result;
    if (x && tv) return `${which} went out without you. ${who}, and ${x.renewed ? 'the network has ordered another' : 'it was not renewed'}.`;
    return tv ? `${which} went out without you. ${who}, and the numbers held.`
      : `${which} opened without you${d.gross ? ` at ${money(d.gross)}` : ''}. ${who}, and it did fine.`;
  }
  return `${which} is being made with somebody else in your part.`;
}
// How long until it comes out, from the record: that is when the trades can say how it did.
function monthsToIt(s, st) {
  const f = recordForTitle(s, st.data.title);
  return f && f.rec.due != null ? Math.max(1, f.rec.due - stamp(s)) : rint(12, 18);
}
function wentBack(s, st) {
  const t = st.data.title;
  const sets = (s.productions || []).concat(s.production ? [s.production] : []);
  return sets.some((p) => p && p.title === t) || (s.filmography || []).some((c) => c.title === t && (c.year || 0) >= (s.year || 0) - 2) || (s.offers || []).some((o) => o.story === 'recast' && o.signed);
}
// The second no. Very expensive, and the director is gone for good.
function burnShows(st) { return { fx: { respect: -8, scandal: 4 }, more: [{ t: `${first(st.data.director)} never works with you again`, good: false }] }; }
function burnTheBridge(s, st) {
  st.data.burned = true;
  setRespect(s, (s.respect || 0) - 8);
  s.scandal = clamp((s.scandal || 0) + 4);
  (s.grudges = s.grudges || []).push({ who: st.data.director, title: st.data.title, scale: st.data.scale, since: stamp(s), due: stamp(s) + 9999, until: stamp(s) + 9999, hit: false, gross: 0, opened: true });
  const p = (s.people || []).find((x) => x.name === st.data.director); if (p) { p.cold = true; p.relationship = Math.min(p.relationship || 0, 5); }
  addTimeline(s, `${st.data.director} will not work with you again. Not a rumour: they said it to the trades.`, true);
}
// A lead who was asked back and did not come: passed, let the paper lapse, or pushed the
// talks until they stopped answering (offers.js, contract.js). The fans are furious now;
// the director writes in two months.
// Called by career/continuation.js loseContinuation, which has already written the fact down — on the
// credit and in the ledger — whatever happens here. This is only what people make of it.
export function noteSequelLoss(s, o, how, rec = null, src = null) {
  if (!o || (o.kind !== 'sequel' && o.kind !== 'renewal') || o.tier === 'supporting') return;
  const title = String(o.projectTitle || '').replace('⭐ ', '');
  const root = o.kind === 'renewal' ? (o.seriesTitle || title) : title.replace(/\s+(II|III|IV|V|VI)$/, '');
  const st = storyOf(s, 'recast');
  // The second no, after the meeting: it goes ahead without you, and the trades tell you how the
  // month it comes out.
  if (o.story === 'recast' && st) { burnTheBridge(s, st); st.beat = 'without'; st.due = Math.max(stamp(s) + 1, (rec && rec.due) || stamp(s) + rint(12, 18)); return; }
  // The fans. Not every recast is a scandal (Maxi/ChatGPT, 22 Oct): it depends on how much the show
  // meant to people, how long they have lived with it, and whose doing it looks like. A show nobody
  // watched recasts in a paragraph. And nobody's standing moves because a negotiation did not close —
  // walking out of an option (offers.js) and walking out of the room (standoff.js) cost what they cost there.
  const mood = fansOf(o, how, src);
  const onYou = how !== 'writtenOut' && how !== 'network' && how !== 'exit';
  if (mood === 'furious' && onYou) {
    s.scandal = clamp((s.scandal || 0) + 3);
    addTimeline(s, how === 'schedule'
      ? (o.kind === 'renewal' ? `Fans are furious: you could not free yourself for season ${o.season} of "${root}", and they are recasting.` : `Fans are furious: you were on another set and "${title}" is going ahead without you.`)
      : how === 'notMade' ? `Fans are furious: there will be no ${o.kind === 'renewal' ? `season ${o.season} of "${root}"` : `"${title}"`}, and they have decided whose fault that is.`
      : (o.kind === 'renewal' ? `Fans are furious: you are not coming back for season ${o.season} of "${root}".` : `Fans are furious: "${title}" is going ahead without you.`), true);
  } else if (mood === 'furious') addTimeline(s, `Fans are furious with the network: your character is gone from "${root}". Some of the anger is on your side.`);
  else if (mood === 'sorry') addTimeline(s, o.kind === 'renewal' ? `"${root}" goes on without you. The fans are sorry to see you go; the trades give it a paragraph.` : `"${title}" goes ahead without you. A paragraph in the trades, and some disappointed fans.`);
  // The director's letter is for a part you could still go back to.
  if (how === 'writtenOut' || how === 'network' || how === 'notMade' || how === 'exit' || how === 'option') return;
  const source = src || (s.filmography || []).find((c) => !c.minor && (c.title === root || c.title === title)) || {};
  const director = source.director || personName(chance(50) ? 'female' : 'male', namesInUse(s));
  const data = { title, root, kind: o.kind, part: o.part || 0, season: o.season || 0, scale: o.scale, director, how, offer: { ...o, contract: undefined, signed: false, sent: false, waitsForWrap: false, startAt: 0, _warned: 0, deadline: 4 } };
  // One "Without you" at a time — the next one waits its turn instead of never happening.
  if (st) {
    const q = (s.recastQueue = s.recastQueue || []);
    if (!q.some((x) => x.title === title) && st.data.title !== title) q.push({ ...data, queued: stamp(s) });
    return;
  }
  stories(s).push({ id: 'recast', beat: 'meeting', due: stamp(s) + 2, since: stamp(s), data });
}
// How much the show or the film meant to the people watching it, and whose doing the loss looks like.
function fansOf(o, how, src) {
  if (!src) return 'quiet';
  let pull;
  if (o.kind === 'sequel') pull = src.worldHit || src.status === 'World Hit' ? 2.5 : ({ smash: 2, profitable: 1.3, 'broke even': 0.8, bomb: 0.4, breakout: 2, hit: 1.4, solid: 0.9, miss: 0.4 }[src.verdict] ?? 0.8);
  else if (src.streaming) pull = (src.views28 || 0) / 30;
  else pull = (src.endViewers || src.viewers || 0) / slotNorm(src.type);
  const lived = o.kind === 'renewal' ? Math.min(0.6, Math.max(0, ((o.season || 2) - 2) * 0.15)) : 0;
  // How strongly they feel. Whose doing it looks like decides only who they are angry with (onYou in
  // noteSequelLoss): a hit show that writes out its lead has furious fans, furious with the network.
  const strength = { passed: 1.2, option: 1.2, meeting: 1.1, schedule: 0.9, exit: 0.4 }[how] ?? 1;
  const v = (Math.min(3, pull) + lived) * strength;
  return v >= 1.6 ? 'furious' : v >= 0.9 ? 'sorry' : 'quiet';
}
// The next "Without you" in the queue (the chain's start). A part you could still go back to gets the
// director's letter; one already being made without you gets the news the month it comes out; one
// the trades have already told is done.
function nextQueuedRecast(s) {
  const q = s.recastQueue || [];
  while (q.length) {
    const d = q.shift();
    const found = recordForTitle(s, d.title);
    if (!found || found.rec.told || found.rec.you === 'returned') continue;
    const late = found.rec.due != null && found.rec.due - ((d.offer && d.offer.months) || 4) - 2 <= stamp(s);
    return { ...d, beat: late ? 'without' : 'meeting', due: late ? Math.max(stamp(s), found.rec.due) : stamp(s) + 1 };
  }
  return null;
}
// A "Without you" already running from before the record existed: its record is written now, from
// the offer it carries, so what it tells is the same arithmetic as everybody else's.
function recordFor(s, st) {
  let found = recordForTitle(s, st.data.title);
  if (!found && st.data.offer) {
    loseContinuation(s, { ...st.data.offer, story: undefined }, st.data.how || 'talks', { quiet: true, at: st.since });
    found = recordForTitle(s, st.data.title);
  }
  return found;
}

// ── the engine ───────────────────────────────────────────────────────────────────
function present(s, st) {
  const chain = CHAINS[st.id]; const beat = chain.beats[st.beat]; if (!beat) { end(s, st); return; }
  const built = beat.build(s, st); if (!built) return;
  s.pendingArc = { story: st.id, beat: st.beat, speaker: built.speaker, text: built.text, choices: built.choices.map((c) => ({ label: c.label, hint: c.hint || null, shows: c.shows || null })) };
  st.shown = stamp(s);
}
export function storiesTick(s) {
  if (!inCareer(s)) return s;
  const now = stamp(s);
  // beats that are due, one a month, and only when nothing else is on the screen
  for (const st of stories(s)) {
    if (st.due != null && st.due <= now && !s.pendingArc) { present(s, st); break; }
  }
  // a new chain: one a month, two at a time, never the same one twice in its cooldown
  if (stories(s).length < 2) {
    for (const id of CHAIN_ORDER) {
      const chain = CHAINS[id];
      if (storyOf(s, id) || (chain.cooldown && onCooldown(s, id, chain.cooldown))) continue;
      let data = null; try { data = chain.start(s); } catch (e) { data = null; }
      if (!data) continue;
      const { beat, due, ...rest } = data;
      const st = { id, beat, due, since: now, data: rest };
      stories(s).push(st);
      addTimeline(s, `${chain.title}: it has started.`);
      if (due <= now && !s.pendingArc) present(s, st);
      break;
    }
  }
  return s;
}
// resolveArc (arcs.js) hands a story beat back here.
export function resolveStory(s, arc, i) {
  const st = storyOf(s, arc.story); if (!st) { s.pendingArc = null; return s; }
  const chain = CHAINS[st.id]; const beat = chain.beats[arc.beat];
  const built = beat.build(s, st); if (!built) { s.pendingArc = null; return s; }
  const c = built.choices[i]; if (!c) return s;
  const out = c.apply() || {};
  s.pendingArc = null;
  s.lastEvent = `${built.speaker}\n\n${out.reply || c.label}`;
  addTimeline(s, `${chain.title} — ${c.label}.`);
  if (out.end) end(s, st);
  else if (out.next) { st.beat = out.next.beat; st.due = stamp(s) + (out.next.inMonths || 1); }
  else st.due = null;
  return s;
}
// For the main screen: what is running, and where it stands.
// `next` is the month the thread's next beat is due (the beat decides what it is), and a thread
// with nothing coming for a while is `quiet`: the Home card folds those into one small line, so a
// story waiting a year for its postscript does not sit at the top of the screen saying nothing.
export const QUIET_AFTER = 3;
export function activeStories(s) {
  const now = stamp(s);
  return stories(s).map((st) => {
    const chain = CHAINS[st.id]; let line = '';
    try { line = chain.status(s, st); } catch (e) { line = ''; }
    const next = st.due != null ? Math.max(now, st.due) : null;
    return { id: st.id, title: chain.title, line, since: st.since, next, quiet: next != null && next - now > QUIET_AFTER };
  });
}

// ── what the chains reach into ──────────────────────────────────────────────────
// Out of sight for a month (the scandal chain): no board, no parties, no offers.
export function hiding(s) { return (s.hiding || 0) >= stamp(s); }
// A rival the rooms have taken sides over; the character actor; the one still fighting
// for the leads. Read by castings.js castingChance.
export function storyCastFactor(s, c) {
  if (!c) return 1;
  let f = 1;
  const r = storyOf(s, 'rival');
  if (r && r.data.tone !== 'warm' && /feature|blockbuster|prestige/.test(c.scale || '')) f *= 0.88;
  const lead = /Lead/.test(c.role || '') && !/Character lead/.test(c.role || '');
  if (s.characterActor) f *= lead ? 0.8 : 1.25;
  if ((s.ageFight || 0) >= stamp(s) && lead) f *= 1.12;
  return f;
}
// The agent who is working for you again, or sending what is left. Read by offers.js.
export function storyOfferFactor(s) {
  if (hiding(s)) return 0;
  if ((s.agentBoost || 0) >= stamp(s)) return 1.5;
  if ((s.agentSlack || 0) >= stamp(s)) return 0.8;
  return 1;
}
// Passing on a lead from a named director (offers.js declineOffer). The film opens
// without you in a year or two, and until then — and for years after if it was a hit —
// that director does not come back for you (production.js makeCrew).
export function noteRefusal(s, o) {
  if (!o || o.tier === 'supporting' || !/feature|blockbuster|prestige/.test(o.scale || '')) return;
  const who = o.director || personName(chance(50) ? 'female' : 'male', namesInUse(s));
  const hit = chance(o.scale === 'blockbuster' ? 45 : 38);
  const gross = hit ? (o.scale === 'blockbuster' ? rint(300, 900) : rint(90, 260)) * 1e6 : 0;
  (s.grudges = s.grudges || []).push({ who, title: String(o.projectTitle || '').replace('⭐ ', ''), scale: o.scale, since: stamp(s), due: stamp(s) + rint(14, 22), until: stamp(s) + (hit ? 60 : 24), hit, gross, opened: false });
  const p = (s.people || []).find((x) => x.name === who); if (p) p.cold = true;
}
export function holdsAGrudge(s, name) { return (s.grudges || []).some((g) => g.who === name && g.until > stamp(s)); }
export function grudgesTick(s) { if (s.grudges) s.grudges = s.grudges.filter((g) => g.until > stamp(s) || !g.opened); }
// The two-hander closes, the comeback film closes (release.js closeRun).
export function storyAfterCredit(s, credit) {
  if (!credit || !credit.story) return;
  const st = storyOf(s, credit.story); if (!st) return;
  if (credit.story === 'comeback') {
    if ((credit.rating || 0) >= 68) addTimeline(s, `${first(st.data.who)}’s film did what it was for.`);
    else addTimeline(s, `${first(st.data.who)}’s film came and went. The word was not used.`, true);
    end(s, st);
  }
}
