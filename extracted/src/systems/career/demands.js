// What the production wants from you this month.
//
// The month on a set used to be a STANCE: coast, turn up prepared, all in. Maxi, on the third
// picture in a row: "я вообще не хочу эту систему, надо убрать всё и предложи что-то другое
// вообще." He was right, and the reason is in the numbers rather than the words. The three
// options differed only in PRICE — 0, 15 and 35 energy — and all three did the same thing:
// meter up, bonds up, more for more. "All in" beat "turn up prepared" beat "coast" at every
// moment you could afford it. So there was never a decision on that card. There was one
// question, "am I tired?", asked eight months running.
//
// A choice where one option is simply better whenever you can afford it is not a choice. That
// is the whole diagnosis, and it is why adding a fourth stance or a better blurb would not have
// helped.
//
// What replaces it, which is what he chose: the production asks you for something, and you
// answer. The price is in a different currency every time — a night's sleep, your health, your
// own money, a week of somebody's goodwill, the size of your own part — so there is nothing to
// optimise and no button that is always right. Saying no is a real answer and sometimes the
// better one.
//
// What this file may NOT touch, all of it learned by breaking something the game had printed:
//   `stability`  — "safe money always delivers a film" is a guarantee somebody paid for by
//                  taking the safe money. Nothing here can cancel a picture. (test_stability)
//   `fame`, `respect`, `quote` — single write points in meta/status.js, never assigned here.
// The meter it may move, because what you agree to on a shoot is exactly what ends up on
// screen — and the baseline work happens whether anybody asks you anything, which is why
// production.js shootTick raises it on its own and these only swing it.
import { rint, chance } from '../../engine/rng.js';
import { addHype } from '../meta/hype.js';
import { setRespect } from '../meta/status.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const dir = (p) => ((p && p.crew) || [])[0] || null;
const co = (p) => ((p && p.crew) || [])[1] || null;
const dirName = (p) => (dir(p) ? dir(p).name : 'The director');
const coName = (p) => (co(p) ? co(p).name : 'your co-star');
const bond = (c, n) => { if (c) c.bond = clamp((c.bond || 40) + n); };
const crewAll = (p, n) => { for (const c of p.crew || []) c.bond = clamp((c.bond || 40) + n); };
const meter = (p, n) => { p.meter = clamp((p.meter || 20) + n); };
const log = (p, line) => { (p._setLog = p._setLog || []).push(line); };

// Each one: what they want, and two or three answers that cost different things. `hint` is the
// price, and it is on the control BEFORE it is pressed — a button whose cost you only learn
// from the result is the same dead end as a button that does nothing.
// `passive` marks the answer the production takes if you never give them one.
export const DEMANDS = {
  nights: {
    w: 5,
    ask: (p) => `Three weeks of nights. ${dirName(p)} wants the whole third act shot between ten and five, and the schedule only works if you say yes.`,
    options: [
      { id: 'yes', label: 'Do the nights', hint: 'It will cost you sleep for a month',
        fx: (s, p) => { meter(p, rint(6, 11)); s.mental = clamp((s.mental || 50) - rint(6, 10)); bond(dir(p), rint(4, 8)); log(p, 'Three weeks of nights, and they are the best thing in it.'); },
        said: (s, p) => `Three weeks of nights. You slept in the afternoons and you look it, and the third act is the best thing in the picture.` },
      { id: 'no', label: 'Tell them you cannot', hint: 'They shoot it day-for-night instead', passive: true,
        fx: (s, p) => { meter(p, -rint(2, 5)); bond(dir(p), -rint(5, 9)); },
        said: (s, p) => `They shot it day-for-night with a filter. It looks like what it is, and ${dirName(p)} has not mentioned it once, which is worse.` },
    ],
  },
  stunt: {
    w: 4,
    ask: (p) => `The stunt coordinator says the double can do it and ${dirName(p)} says the shot is better if it is your face.`,
    options: [
      { id: 'yes', label: 'Do it yourself', hint: 'A real chance of getting hurt',
        fx: (s, p) => { meter(p, rint(5, 9)); crewAll(p, rint(3, 6));
          if (chance(18)) { s.health = clamp((s.health || 80) - rint(8, 16)); log(p, 'You did the stunt yourself and you were not right for a month.'); }
          else log(p, 'You did the stunt yourself and the shot has your face in it.'); },
        said: (s, p) => (s.health < 70 ? 'You did it, and you felt it on the third take. The shot is in the film.' : 'You did it. Two takes, no double, and the whole unit applauded, which they do not.') },
      { id: 'no', label: 'Let the double do it', hint: 'Nothing is lost, nothing is gained', passive: true,
        fx: () => {},
        said: () => 'The double did it in one. It cuts together fine and nobody will ever know.' },
    ],
  },
  cut: {
    w: 5,
    ask: (p) => `The writer has gone, and the new pages lose your scene — the one you took the part for. ${dirName(p)} has not said whether they will fight for it.`,
    options: [
      { id: 'fight', label: 'Fight for the scene', hint: (s, p) => `${dir(p) && dir(p).bond >= 50 ? 'They might back you' : 'They are not warm enough to back you'} — and asking costs goodwill`,
        fx: (s, p) => { const d = dir(p);
          if (d && d.bond >= 50) { meter(p, rint(4, 8)); bond(d, -rint(2, 4)); log(p, 'You fought for the scene and it is in the film.'); }
          else { meter(p, -rint(2, 4)); bond(d, -rint(5, 9)); log(p, 'You fought for the scene and lost it anyway.'); } },
        said: (s, p) => (dir(p) && dir(p).bond >= 46 ? 'It stays. Nobody says thank you for a scene nobody has seen yet.' : 'It goes, and now they know you are somebody who argues. Both things at once.') },
      { id: 'let', label: 'Let it go', hint: 'A smaller part, and a director who remembers', passive: true,
        fx: (s, p) => { meter(p, -rint(2, 5)); bond(dir(p), rint(4, 7)); log(p, 'They cut the scene you took the part for and you said nothing.'); },
        said: () => 'You said it was fine. It was not fine, and saying so would not have put it back.' },
    ],
  },
  junket: {
    w: 4,
    ask: () => 'The studio wants you in three cities over a weekend for something that opens in a fortnight. It is not this picture. It is a picture you made two years ago.',
    options: [
      { id: 'go', label: 'Go and do the press', hint: 'A weekend, and the week after it',
        fx: (s, p) => { addHype(s, rint(8, 14), 'press'); s.ap = Math.max(0, (s.ap || 0) - 20); s.mental = clamp((s.mental || 50) - rint(3, 6)); },
        said: () => 'Nine interviews, two of them in a hotel corridor. People are saying your name again and you have no memory of the weekend.' },
      { id: 'stay', label: 'Stay on the set', hint: 'The studio notices, and so does the floor', passive: true,
        fx: (s, p) => { meter(p, rint(3, 6)); crewAll(p, rint(1, 3)); },
        said: () => 'You worked the weekend instead. The unit noticed, and somebody in a tower noticed that you did not.' },
    ],
  },
  cover: {
    w: 5,
    needs: (p) => !!co(p),
    ask: (p) => `${coName(p)} has not been right for a fortnight. The unit knows, the AD knows, and nobody has said it out loud yet.`,
    options: [
      { id: 'cover', label: 'Cover for them', hint: 'Your days get longer and the film gets worse',
        fx: (s, p) => { bond(co(p), rint(8, 14)); meter(p, -rint(3, 6)); s.strain = clamp((s.strain || 0) + rint(2, 5)); log(p, `You covered for ${coName(p)} for a fortnight and nobody ever knew.`); },
        said: (s, p) => `You ran the lines alone and played to a mark. ${coName(p)} knows exactly what you did and will not forget it.` },
      { id: 'tell', label: 'Tell the first AD', hint: 'The set runs again, and they will know it was you',
        fx: (s, p) => { bond(co(p), -rint(10, 18)); meter(p, rint(4, 8)); crewAll(p, rint(2, 4)); log(p, 'Somebody finally said it out loud, and it was you.'); },
        said: (s, p) => `It was handled by Thursday. The work is better and ${coName(p)} has stopped saying good morning.` },
      { id: 'none', label: 'Say nothing to anybody', hint: 'It is not your set to run', passive: true,
        fx: () => {},
        said: () => 'Somebody else said it a week later. It was handled and you were not in the room.' },
    ],
  },
  shorter: {
    w: 4,
    ask: (p) => `The money came down and wants a week out of the schedule. ${dirName(p)} wants you in the room when they say no.`,
    options: [
      { id: 'dir', label: 'Back the director', hint: 'The week stays in — and you work it',
        fx: (s, p) => { bond(dir(p), rint(6, 10)); meter(p, rint(3, 6)); s.strain = clamp((s.strain || 0) + rint(3, 6)); log(p, 'You sat with the director against the money and the week stayed in.'); },
        said: (s, p) => `The week stays. ${dirName(p)} has not said anything about it and never will, and you will be on their next one.` },
      { id: 'money', label: 'Back the money', hint: 'A week of your life back, out of the middle of the film',
        fx: (s, p) => { bond(dir(p), -rint(6, 10)); meter(p, -rint(4, 7)); s.strain = clamp((s.strain || 0) - rint(3, 7)); log(p, 'You took the money’s side on the schedule.'); },
        said: () => 'They found the week. It comes out of the middle and everybody can feel it, and you slept for some of it.' },
      { id: 'out', label: 'Stay out of it', hint: 'Actors are not asked, usually', passive: true,
        fx: (s, p) => { meter(p, -rint(1, 3)); },
        said: () => 'They lost three days of the week and argued about the rest for a month. Nobody asked you again.' },
    ],
  },
  look: {
    w: 3,
    ask: () => 'They want eight kilos off you before the second block, and the costume department has already cut for it.',
    options: [
      { id: 'yes', label: 'Do what they asked', hint: 'It will take something out of you',
        fx: (s, p) => { meter(p, rint(5, 9)); s.health = clamp((s.health || 80) - rint(6, 12)); setRespect(s, (s.respect || 0) + rint(1, 3)); log(p, 'You changed your body for it and people talked about that instead of the film.'); },
        said: () => 'Eight kilos. People will talk about the eight kilos for longer than they talk about the performance, and that is its own kind of useful.' },
      { id: 'no', label: 'Refuse', hint: 'The costume gets recut and nothing else happens', passive: true,
        fx: (s, p) => { bond(dir(p), -rint(3, 6)); },
        said: () => 'They recut the costume. Nobody made a thing of it and you are not sure anybody ever thought it mattered.' },
    ],
  },
  hard: {
    w: 4,
    ask: (p) => `The scene everybody has been quiet about is on the schedule for Thursday. ${dirName(p)} wants it exactly as written.`,
    options: [
      { id: 'written', label: 'Play it as written', hint: 'It will stay with you for a while',
        fx: (s, p) => { meter(p, rint(6, 10)); s.mental = clamp((s.mental || 50) - rint(8, 14)); log(p, 'The Thursday scene is the one people will write about.'); },
        said: () => 'It took the day and most of the week after it. It is the best four minutes you have ever been in.' },
      { id: 'change', label: 'Ask for it to be changed', hint: 'A smaller scene, and no harm done',
        fx: (s, p) => { meter(p, -rint(1, 3)); bond(dir(p), -rint(2, 5)); },
        said: () => 'They found another way into it. It works, and it is not the scene it was on the page.' },
      { id: 'refuse', label: 'Refuse to shoot it', hint: 'You do not do it, and the film is the thing that pays', passive: true,
        fx: (s, p) => { meter(p, -rint(5, 9)); bond(dir(p), -rint(8, 14)); crewAll(p, rint(2, 5)); s.mental = clamp((s.mental || 50) + rint(1, 4)); log(p, 'There is a scene in it you refused to shoot.'); },
        said: () => 'They shot it over your shoulder with somebody else. It is in the film and you are not in it.' },
    ],
  },
  upstaged: {
    w: 3,
    needs: (p) => !!co(p),
    ask: (p) => `${coName(p)} is doing something in the two-shots that takes the scene every time, and it is not in the script.`,
    options: [
      { id: 'push', label: 'Take it back in the take', hint: 'The scene is yours. So is the atmosphere.',
        fx: (s, p) => { meter(p, rint(4, 8)); bond(co(p), -rint(6, 12)); },
        said: (s, p) => `You played it bigger and the scene came back. ${coName(p)} is extremely polite to you now.` },
      { id: 'let', label: 'Let them have it', hint: 'A friend, and a smaller scene', passive: true,
        fx: (s, p) => { bond(co(p), rint(5, 9)); meter(p, -rint(2, 5)); },
        said: (s, p) => `You gave it to them. ${coName(p)} knows what that was, which is worth more than the scene.` },
      { id: 'dir', label: 'Take it to the director', hint: 'They will fix it, and file it under you',
        fx: (s, p) => { meter(p, rint(2, 5)); bond(dir(p), -rint(3, 7)); bond(co(p), -rint(2, 5)); },
        said: (s, p) => `${dirName(p)} had a word and it stopped. They also now know you are somebody who comes to them with this.` },
    ],
  },
  reshoot: {
    w: 3,
    ask: () => 'The lab lost a day. They want it back on the Saturday that was yours.',
    options: [
      { id: 'yes', label: 'Give them the Saturday', hint: 'A day of your month',
        fx: (s, p) => { meter(p, rint(3, 7)); s.ap = Math.max(0, (s.ap || 0) - 15); crewAll(p, rint(1, 3)); },
        said: () => 'You did it on the Saturday and everybody there was doing it on their Saturday too, which is the whole of it.' },
      { id: 'no', label: 'Keep your Saturday', hint: 'It is your Saturday', passive: true,
        fx: () => {},
        said: () => 'They got it on a Tuesday in the end. Somebody wrote the word "unavailable" in a file with your name on it.' },
    ],
  },
  loyalty: {
    w: 3,
    ask: () => 'They are letting the first AD go between a Friday and a Monday. Everybody likes him and nobody is going to say anything.',
    options: [
      { id: 'speak', label: 'Say something', hint: 'The unit will love you. The fortnight after is poisonous.',
        fx: (s, p) => { crewAll(p, rint(5, 9)); meter(p, -rint(3, 6)); log(p, 'You were the one who said something when they fired the AD.'); },
        said: () => 'It did not save him. Every single person on that unit knows you tried, and that is a thing you carry between pictures.' },
      { id: 'out', label: 'Stay out of it', hint: 'It is not your call and everybody knows that', passive: true,
        fx: (s, p) => { crewAll(p, -rint(1, 3)); },
        said: () => 'He was gone on the Monday. The new one is faster and the set is quieter in a way nobody likes.' },
    ],
  },
  coach: {
    w: 3,
    ask: () => 'The accent is not there and the production will not pay for a dialect coach. One is available. She is not cheap.',
    options: [
      { id: 'pay', label: 'Pay for her yourself', hint: (s) => `€${Math.round(coachCost(s)).toLocaleString()} of your own money`,
        fx: (s, p) => { s.cash = Math.max(0, (s.cash || 0) - Math.round(coachCost(s))); meter(p, rint(6, 10)); log(p, 'You paid for your own dialect coach and nobody ever mentioned the accent.'); },
        said: () => 'Six weeks, three mornings a week, out of your own pocket. Not one review will mention the accent, which is the point.' },
      { id: 'no', label: 'Do without', hint: 'Somebody will mention it', passive: true,
        fx: (s, p) => { meter(p, -rint(1, 4)); },
        said: () => 'You did it off a recording on your phone. It is fine. It is not better than fine.' },
    ],
  },
  offbook: {
    w: 3,
    ask: (p) => `${dirName(p)} wants the whole script off book by Monday, not the week's pages. Nobody else has been asked.`,
    options: [
      { id: 'yes', label: 'Learn the whole thing', hint: 'A weekend you will not get back',
        fx: (s, p) => { meter(p, rint(5, 9)); s.ap = Math.max(0, (s.ap || 0) - 20); bond(dir(p), rint(5, 9)); },
        said: (s, p) => `You had it by Monday. ${dirName(p)} said nothing about it and has shot every scene since with you in the frame.` },
      { id: 'no', label: "Do the week's pages, like everyone", hint: 'Which is what the job actually is', passive: true,
        fx: () => {},
        said: () => 'You did the week like a professional and nobody said anything about that either.' },
    ],
  },
  sixday: {
    w: 4,
    ask: () => 'They have lost four days to weather and want six-day weeks until the end of the block.',
    options: [
      { id: 'yes', label: 'Work the six-day weeks', hint: 'It comes out of you, not the film',
        fx: (s, p) => { meter(p, rint(4, 7)); s.strain = clamp((s.strain || 0) + rint(4, 9)); s.mental = clamp((s.mental || 50) - rint(4, 7)); },
        said: () => 'Six days a week until the block ended. The schedule came back and you did not, quite.' },
      { id: 'no', label: 'Hold them to five', hint: 'Your contract says five. The film loses the days.', passive: true,
        fx: (s, p) => { meter(p, -rint(2, 5)); crewAll(p, -rint(1, 3)); },
        said: () => 'Five days, as it says on the paper. They made the days up by cutting two scenes nobody will miss, except that you would have been in one of them.' },
    ],
  },
};
export const DEMAND_IDS = Object.keys(DEMANDS);
// A fifth of a month's money, floor and ceiling, so it is a real decision at every size of
// career rather than nothing at the top and impossible at the bottom.
export function coachCost(s) { return Math.max(4000, Math.min(60000, Math.round((s.cash || 0) * 0.08))); }

const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
export function demandOf(p) { return p && p.demand && DEMANDS[p.demand.id] ? { ...DEMANDS[p.demand.id], id: p.demand.id, asked: p.demand.at } : null; }
export function optionsFor(s, p) {
  const d = demandOf(p); if (!d) return [];
  return d.options.map((o) => ({ ...o, hint: typeof o.hint === 'function' ? o.hint(s, p) : o.hint }));
}

// Monthly, from production.js shootTick. Not every month and never two running: a shoot that
// wants something of you every month is a disaster film, and the ask only lands against the
// quiet weeks that setlife.js reports.
export function rollDemand(s, p) {
  if (!p || (p.prepLeft || 0) > 0 || p.paused || (p.monthsLeft || 0) <= 0) return null;
  if (p.demand) return null;
  const now = stamp(s);
  if (p._demandMonth === now - 1) return null;
  if (!chance(42)) return null;
  const used = p._demandsAsked || [];
  const pool = DEMAND_IDS.filter((id) => !used.includes(id) && (!DEMANDS[id].needs || DEMANDS[id].needs(p)));
  if (!pool.length) return null;
  const total = pool.reduce((n, id) => n + DEMANDS[id].w, 0);
  let r = Math.random() * total, got = pool[0];
  for (const id of pool) { r -= DEMANDS[id].w; if (r <= 0) { got = id; break; } }
  p.demand = { id: got, at: now };
  p._demandMonth = now;
  (p._demandsAsked = used).push(got);
  return got;
}
// Answering it. The only button the month puts in front of you, and every answer is an answer.
export function answerDemand(s, setId, optId) {
  const p = (s.productions || []).find((x) => x.id === setId) || s.production;
  if (!p || !p.demand) { s.lastEvent = 'Nobody is waiting on an answer from you.'; return s; }
  const d = DEMANDS[p.demand.id]; if (!d) { p.demand = null; return s; }
  const op = d.options.find((o) => o.id === optId); if (!op) return s;
  op.fx(s, p);
  // An answer is a month you put something into the picture, whichever answer it was, and
  // career/production.js reads that as having worked. Since the stance went there is no other
  // way to be the actor who only turns up, and the director is supposed to notice that one.
  p._workedMonth = (s.year || 0) * 12 + (s.month || 0);
  p.demand = null;
  p._lastAnswer = typeof op.said === 'function' ? op.said(s, p) : op.said;
  s.lastEvent = `"${p.title}": ${p._lastAnswer}`;
  return s;
}
// You never answered. They are a production, not a person waiting by a phone — they take the
// answer you gave them by not giving one, which is always the passive option, and it says so on
// the card while there is still time to say otherwise.
export function expireDemands(s) {
  for (const p of s.productions || []) {
    if (!p.demand) continue;
    if (p.demand.at >= stamp(s)) continue;
    const d = DEMANDS[p.demand.id];
    const op = (d && d.options.find((o) => o.passive)) || null;
    p.demand = null;
    if (!op) continue;
    op.fx(s, p);
    p._lastAnswer = `You never gave them an answer. ${typeof op.said === 'function' ? op.said(s, p) : op.said}`;
  }
  return s;
}
