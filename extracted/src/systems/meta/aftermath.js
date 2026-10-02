// What they say afterwards.
//
// Maxi: "when a company decides to close a series there should just be news so the player
// understands it was cancelled. And every year there should be updates — what they are
// saying, will it come back or not, is it pushed to next year. Same with sequels. And with
// every film that came out: if it flopped they keep talking about it, they write about
// you. Reactions in the feed depending on the result. Memes about the bad horror, why did
// he take this."
//
// The feed had the first night and the first month and then silence. A picture opened, a
// number appeared, and the business forgot it the same week — which is the opposite of
// what actually happens to a flop. Four things live here:
//
//   the post-mortem   a month or two after a bad one closes, somebody writes the autopsy
//   the meme          and if it was bad in the funny way, it stops being a film
//   the wait          every year a thing that is coming back is asked when, and answered
//   the ending        and when a show is cancelled, that is a piece, not a silence
//
// Nothing here changes a number. It is the business talking, which is most of what the
// business does.
import { chance, pick } from '../../engine/rng.js';
import { slotNorm } from '../career/franchise.js';

const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const last = (n) => String(n || '').split(' ').pop();
const clean = (t) => String(t || '').replace('⭐ ', '');

// ── the post-mortem ───────────────────────────────────────────────────────────
// A flop is not an event, it is a season. The piece that explains it comes weeks later,
// when somebody has had time to ring three people who were there.
const BLAME = [
  { who: 'the script', line: (t) => `Four writers on ${t}, and the piece has all four of them saying the same thing in different words: it was somebody else's draft by the end.` },
  { who: 'the edit', line: (t) => `Two hours and eleven minutes, cut from three and a half. The piece quotes an editor who will not be named and a producer who says the film is exactly what it was always going to be.` },
  { who: 'the release', line: (t) => `Opened against two things it should never have opened against, on a weekend the studio had already written off. Somebody made that call in a room, and the piece is about finding out who.` },
  { who: 'the marketing', line: (t) => `The trailer sold a film nobody made. The piece runs both — what was advertised, what arrived — side by side, and it is not kind.` },
  { who: 'you', line: (t) => `The piece is mostly about the casting. It is polite about it for six paragraphs and then it is not.` },
];
// And the other kind of bad, which is worse and better at once: the kind people enjoy.
const MEMES = [
  (t, n) => `A nine-second clip from ${t} has been watched more times than the film has been. It is the bit with the face. You know the bit.`,
  (t, n) => `Somebody has cut every line ${n} says in ${t} into one video, in order, with no context. It is four minutes long and it is everywhere.`,
  (t, n) => `${t} is a format now. People are putting the poster over photographs of their own lives. The studio's account has posted one, which is the moment it stops being funny and starts being marketing.`,
  (t, n) => `A university society is screening ${t} with a drinking game. The piece interviews them. They are extremely fond of it, in the way people are fond of a thing they are laughing at.`,
];
const WHY = [
  (t, n) => `A piece with the headline "What was ${n} thinking?" It is not a hatchet job; it is worse, it is sympathetic. It walks through the last four choices and asks, gently, what the plan is.`,
  (t, n) => `An actor of about ${n}'s standing is asked about ${t} on a sofa and pulls a face before answering. The face is the clip.`,
  (t, n) => `A column about the money: what ${t} paid, what it cost, and whether anybody takes a part like that for any other reason. Your fee is in the second paragraph and it is wrong by about a third.`,
];
function postMortem(s, out) {
  const now = stamp(s);
  const me = s.name || 'you';
  for (const c of (s.filmography || [])) {
    if (c.minor || c.running || !c.closedAt) continue;
    const age = now - c.closedAt;
    if (age < 1 || age > 4) continue;
    c._after = c._after || {};
    const bad = c.verdict === 'bomb' || (c.rating || 0) < 42;
    const big = c.scale === 'blockbuster' || c.scale === 'feature' || c.tier === 'tentpole';
    // the autopsy, once, on anything that failed and was big enough to be worth one
    if (bad && big && !c._after.post && (s.fame || 0) >= 20 && chance(70)) {
      c._after.post = now;
      const b = pick(BLAME);
      out.push({ tone: 'pan', kind: 'you', about: c.title, react: b.who === 'you',
        head: `What happened to "${clean(c.title)}"`, body: b.line(`"${clean(c.title)}"`) });
      continue;
    }
    // the meme, which only happens to the ones that are bad in the entertaining way
    const funny = bad && /Horror|Comedy|Sci-Fi|Musical/.test(c.genre || '');
    if (funny && !c._after.meme && (s.fame || 0) >= 25 && chance(55)) {
      c._after.meme = now;
      out.push({ tone: 'gossip', kind: 'you', about: c.title,
        head: `"${clean(c.title)}" has escaped the cinema`, body: pick(MEMES)(`"${clean(c.title)}"`, last(me)) });
      continue;
    }
    // and the question, once your name is worth asking it about
    if (bad && !c._after.why && (s.fame || 0) >= 45 && chance(40)) {
      c._after.why = now;
      out.push({ tone: 'pan', kind: 'you', about: c.title, react: true,
        head: `Why did ${last(me)} make "${clean(c.title)}"?`, body: pick(WHY)(`"${clean(c.title)}"`, last(me)) });
      continue;
    }
    // the good version: a picture people liked is still being written about months later
    if (!bad && (c.rating || 0) >= 82 && !c._after.hold && age >= 2 && (s.fame || 0) >= 20 && chance(45)) {
      c._after.hold = now;
      out.push({ tone: 'praise', kind: 'you', about: c.title,
        head: `People are still talking about "${clean(c.title)}"`,
        body: `It opened months ago and it is still in the pieces — a list, a rewatch column, an argument on a podcast about the ending. That is the difference between a film that worked and a film people keep.` });
    }
  }
}

// ── the wait ──────────────────────────────────────────────────────────────────
// Maxi: "if Sandra's first season came out in 2075, every year there should be news —
// what they say, will it come back, is it pushed to next year." A thing that is coming
// back and has not come back yet is a story every single year until it does.
function theWait(s, out) {
  const now = stamp(s);
  s._waitTalk = s._waitTalk || {};
  const said = (key, months) => {
    const at = s._waitTalk[key];
    if (at != null && now - at < months) return true;
    s._waitTalk[key] = now;
    return false;
  };
  // signed and on the calendar, months out
  for (const o of (s.offers || [])) {
    if (!o.signed || !(o.kind === 'renewal' || o.kind === 'sequel')) continue;
    const away = Math.max(0, (o.startAt || now) - now);
    if (away < 4) continue;
    if (said('signed:' + o.id, 12)) continue;
    const what = o.kind === 'renewal' ? `season ${o.season}` : `part ${o.part}`;
    out.push({ tone: 'news', kind: 'you', about: o.projectTitle,
      head: `"${clean(o.projectTitle)}": ${away} months out`,
      body: away >= 10
        ? `The ${what} is real, it is paid for, and it does not start for the better part of a year. The piece is four paragraphs of people saying they cannot wait and one line at the end noting the date has already moved once.`
        : `Cameras in ${away} months on the ${what}. The piece has a set photograph that is a photograph of an empty car park, and a source who says everything is on schedule.` });
  }
  // announced, years out, and not yet a paper — the ones that quietly die
  for (const x of (s.laterOffers || [])) {
    const o = x.offer; if (!o) continue;
    const away = Math.max(0, (x.due || now) - now);
    if (away < 10) continue;
    if (said('later:' + (o.id || o.projectTitle), 14)) continue;
    const waited = now - (x.since || now);
    out.push({ tone: waited >= 40 ? 'gossip' : 'news', kind: 'you', about: o.projectTitle,
      head: waited >= 40 ? `Is "${clean(o.projectTitle)}" ever happening?` : `"${clean(o.projectTitle)}" is still on the schedule`,
      body: waited >= 40
        ? `Announced ${Math.round(waited / 12)} years ago. A director has left, a writer has arrived, and the studio's answer this week is the same sentence it was last year, which is how these things end without anybody saying so.`
        : `Still listed, still years out. Nobody involved will say anything on the record and one person says something off it, which is that the script is not finished.` });
  }
}

// ── the ending ────────────────────────────────────────────────────────────────
// A show that is not coming back should be a piece. It used to be a line on the record
// and nothing else, so a player lost a series and did not know it had happened.
function theEnding(s, out) {
  const now = stamp(s);
  for (const c of (s.filmography || [])) {
    if (c.minor || !c.renewal || c.running) continue;
    if (c.renewal !== 'cancelled' && c.renewal !== 'capped' && c.renewal !== 'writtenOut') continue;
    c._after = c._after || {};
    if (c._after.end) continue;
    c._after.end = now;
    const root = String(c.title || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '');
    const n = c.season || 1;
    if (c.renewal === 'writtenOut') {
      out.push({ tone: 'pan', kind: 'you', about: c.title, react: true,
        head: `"${root}" is coming back. You are not.`,
        body: `Season ${n + 1} was ordered on Tuesday and the cast list went out on Wednesday without your name on it. The network's line is that the story took your character somewhere. The piece prints that line and then prints the numbers.` });
    } else if (c.renewal === 'capped') {
      out.push({ tone: 'news', kind: 'you', about: c.title,
        head: `"${root}" ends after ${n} season${n === 1 ? '' : 's'}`,
        body: `Not cancelled — finished, which is a different thing and the only one anybody wants. Everybody involved gets to say it was always the plan, and this time it might even be true.` });
    } else {
      const drew = c.endViewers || c.viewers || 0;
      out.push({ tone: 'pan', kind: 'you', about: c.title, react: true,
        head: `"${root}" is not coming back`,
        body: n === 1
          ? `One season and gone. ${drew ? `It finished on ${drew}m against the ${slotNorm(c.type)}m the slot wanted. ` : ''}The network said nothing for three weeks and then said it in a paragraph on a Friday afternoon, which is where they put the ones they are not proud of.`
          : `${n} seasons and that is the end of it. ${drew ? `The last one finished on ${drew}m. ` : ''}There is a paragraph about the cast being told on a group call, and a producer saying they are talking to other people about continuing it somewhere, which never happens.` });
    }
  }
}

// Everything the business says about what you already made. Called from pressTick.
export function aftermathPieces(s) {
  const out = [];
  theEnding(s, out);
  postMortem(s, out);
  theWait(s, out);
  return out;
}
