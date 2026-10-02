// The account. Maxi: "yes, let us do social media — what role will it play?"
//
// This is the answer, and it is one sentence: followers are the only reach in this game you
// own. Everything else that makes a casting office look at you has to be given to you by
// somebody — a film has to come out, a journalist has to write it, an Academy has to vote.
// Followers are yours. Nobody can take them off you and nobody has to approve them.
//
// And you buy them with the two things you cannot get back. Your privacy, because reading
// about yourself every day does something to a person that nothing else in this game does.
// And how seriously the serious rooms take you, because there is a kind of actor who posts
// and a kind of actor who does not, and the second kind gets sent the scripts.
//
// So the trade is real in both directions:
//   · more followers than your fame justifies  →  the agent brings you more, the brands pay
//     more, and a campaign to save your show actually reaches a buyer
//   · the posting that got them there          →  standing down, mental down, and one bad
//     night is a news cycle you cannot delete
//
// The one rule underneath it: you cannot out-post your own fame. Followers drift back toward
// what your career actually justifies every single month, so a viral week is a loan and the
// only way to keep the number is to keep being worth it. That is the honest version, and it
// is the version everybody who has tried it will recognise.
//
// This is the same account from school — systems/social/spotlight.js. The friends grew up and
// left, and strangers filled the space, which is also what happened to everybody.
import { rint, chance, pick } from '../../engine/rng.js';
import { onCooldown, markUsed } from '../../engine/cooldown.js';
import { addTimeline } from '../../engine/timeline.js';
import { inCareer } from '../../engine/stage.js';
import { canAfford, spend, tooTired } from '../../engine/energy.js';
import { addHype, hype } from '../meta/hype.js';
import { setRespect } from '../meta/status.js';
import { strongLabels, typecastBump, labelInfo } from '../meta/typecast.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);

// Stored in thousands, because the number people say out loud is "four million" and nobody
// has ever cared about the last three digits.
export function social(s) {
  s.social = s.social || { followers: 0, posts: 0, vanity: 0, lastKind: null, lastLine: '', quietSince: 0 };
  // An A-lister who has never opened the app does not have nought followers; they have the
  // following an A-lister has, and always did. The account catches up the first time anything
  // touches it rather than on the next tick, because otherwise a star opens this screen and
  // is told they are almost nobody, which is a funny joke exactly once.
  if (!s.social.seeded) { s.social.seeded = true; if (!s.social.followers) s.social.followers = natural(s); }
  return s.social;
}
export function followers(s) { return Math.max(0, Math.round(social(s).followers || 0)); }

// Where fame alone would put you. An unknown has a few hundred people; a name people say in
// other countries has tens of millions, and the curve between them is not a line.
export function natural(s) {
  const f = s.fame || 0;
  if (f < 6) return Math.round(Math.pow(10, 0.6 + f / 20));
  return Math.round(Math.pow(10, 1.2 + f / 30) * (1 + hype(s) / 220));
}
// The whole balance of the feature in one number: how far above your career your following
// is. Everything social gives you is priced off this, not off the raw count, because a
// million followers means something completely different to a nobody and to a star.
export function overIndex(s) {
  const n = natural(s);
  return n <= 0 ? 0 : followers(s) / n;
}
export function fmtFollowers(k) {
  if (k >= 1000) return (k / 1000).toFixed(k >= 10000 ? 0 : 1).replace('.0', '') + 'M';
  if (k >= 1) return Math.round(k) + 'k';
  return Math.max(0, Math.round(k * 1000)) + '';
}

// ── what the number is worth ──────────────────────────────────────────────────
// Only the part above your fame counts, and it is capped, because an audience you assembled
// yourself gets you read for things — it does not make you a film star. Into reach() in
// career/castings.js.
export function socialReach(s) {
  if (!inCareer(s) || followers(s) < 40) return 0;
  return clamp((overIndex(s) - 1) * 7, 0, 9);
}
// Brands are priced on followers. This is not a game mechanic, it is how the contracts are
// actually written. career/offers.js maybeBrandOffer.
export function socialBrandLift(s) {
  if (followers(s) < 40) return 1;
  const over = overIndex(s);
  return over >= 1 ? 1 + Math.min(1.6, over - 1) * 0.5 : 0.9 + over * 0.1;
}
// A campaign to save a show reaches buyers in proportion to how loud you can be on your own.
// career/bubble.js backTheCampaign.
export function socialShopLift(s) {
  if (followers(s) < 100) return 1;
  return 1 + Math.min(0.8, Math.max(0, overIndex(s) - 0.8) * 0.5);
}

// ── the posts ─────────────────────────────────────────────────────────────────
// One a month. Not because an actor posts once a month, but because one a month is the unit
// at which it is a decision rather than a habit, and this game is made of decisions.
export const POSTS = {
  work: {
    label: 'Something from the set', cost: 5,
    hint: 'Safe. Fans like being let in, and nobody has ever lost a job to it.',
    when: (s) => true,
  },
  self: {
    label: 'A photograph of you', cost: 5,
    hint: 'The fastest followers there are, and the serious rooms keep a tally.',
    when: (s) => true,
  },
  joke: {
    label: 'Say something funny', cost: 5,
    hint: 'It is a meme or it is a mistake, and you find out at the same time as everybody else.',
    when: (s) => true,
  },
  opinion: {
    label: 'Say something you mean', cost: 10,
    hint: 'Some people will respect you for it. Some will leave. A brand may read it.',
    when: (s) => true,
  },
  different: {
    label: 'Show them the other person', cost: 10,
    hint: 'The box is built out of what people have seen. This is the cheapest crowbar there is.',
    when: (s) => strongLabels(s).length > 0,
  },
  answer: {
    label: 'Answer the story', cost: 10,
    hint: 'It kills it or it doubles it. Nobody has ever known which in advance.',
    when: (s) => hype(s) >= 30 || (s.scandal || 0) >= 20,
  },
};
export function postsFor(s) {
  return Object.entries(POSTS).filter(([, p]) => p.when(s)).map(([id, p]) => ({ id, ...p }));
}
export function postedThisMonth(s) { return onCooldown(s, 'post'); }
export function canPost(s, kind) {
  const p = POSTS[kind];
  if (!p) return { ok: false, why: '' };
  if (!inCareer(s)) return { ok: false, why: 'Nobody is reading yet.' };
  if (postedThisMonth(s)) return { ok: false, why: 'You have posted this month. More than that and it is not a decision any more, it is a habit, and the habit is the thing that gets people.' };
  if (!p.when(s)) return { ok: false, why: 'There is nothing to answer.' };
  if (!canAfford(s, p.cost)) return { ok: false, why: tooTired(s, p.cost) };
  return { ok: true, why: '' };
}

const grow = (s, pct) => { const so = social(s); so.followers = Math.max(0, (so.followers || 0) * (1 + pct / 100)) + (pct > 0 ? 0.4 : 0); };

const WORK = ['a photograph of the monitor with your own face on it', 'the call sheet with the date circled', 'you and the crew at four in the morning, all of you grey', 'the chair with your name spelled wrong', 'the last slate of the shoot'];
const MEME = ['It is a meme by lunchtime and a T-shirt by Friday.', 'Somebody sets it to music and that version is the one that travels.', 'It gets quoted back at you for the rest of your life, including by people who have never seen anything you made.'];
const MISS = ['It reads completely differently in writing, which everybody explains to you at length.', 'The joke needs the room it was told in, and the room is not in the post.', 'You delete it in nine minutes, which is eight minutes too late.'];
const ABOUT = ['something that is actually happening', 'a thing in the industry that everybody says privately', 'somebody who cannot say it themselves'];

export function post(s, kind) {
  const p = POSTS[kind];
  const fit = canPost(s, kind);
  if (!fit.ok) { if (fit.why) s.lastEvent = fit.why; return s; }
  spend(s, p.cost);
  markUsed(s, 'post');
  const so = social(s);
  so.posts = (so.posts || 0) + 1;
  so.lastKind = kind;
  so.quietSince = 0;
  const over = overIndex(s);
  // The higher you already are above your own fame, the less another post does. The people
  // who were going to follow you have followed you.
  const room = clamp(1.4 - over * 0.4, 0.25, 1.2);

  if (kind === 'work') {
    grow(s, rint(1, 3) * room);
    addHype(s, rint(2, 5), 'hit');
    so.lastLine = `You posted ${pick(WORK)}. The people who like you liked it.`;
  } else if (kind === 'self') {
    grow(s, (rint(3, 7) + Math.round((s.looks || 50) / 25)) * room);
    so.vanity = (so.vanity || 0) + 1;
    addHype(s, rint(1, 3), 'hit');
    // Nobody loses standing for one photograph. It is the tally that does it, which is also
    // how it works in life — the fourth one is a different sentence about you than the first.
    if ((so.vanity || 0) >= 4 && chance(45)) { setRespect(s, (s.respect || 0) - 1); so.vanity = 0; so.lastLine = `The photograph did what photographs do. Somewhere a producer described you to somebody else as a personality, and did not mean it kindly.`; }
    else so.lastLine = `The photograph did what photographs do. The number went up while you were still looking at it.`;
  } else if (kind === 'joke') {
    if (chance(58)) {
      grow(s, rint(9, 26) * room);
      addHype(s, rint(8, 16), 'hit');
      so.lastLine = `It landed. ${pick(MEME)}`;
    } else {
      grow(s, -rint(2, 7));
      s.scandal = clamp((s.scandal || 0) + rint(4, 11));
      s.mental = clamp((s.mental || 50) - rint(3, 7));
      so.lastLine = `It did not land. ${pick(MISS)}`;
      addTimeline(s, `A post of yours went wrong and spent a day being explained back to you.`, true);
    }
  } else if (kind === 'opinion') {
    // This is the honest one: it is good for you and bad for you at the same time, and which
    // one is bigger depends on nothing you control.
    setRespect(s, (s.respect || 0) + rint(1, 3));
    const left = rint(1, 5), came = rint(2, 8);
    grow(s, (came - left) * room);
    addHype(s, rint(4, 10), 'hit');
    if (chance(26)) {
      s.scandal = clamp((s.scandal || 0) + rint(5, 13));
      // A brand does not argue. A brand goes quiet.
      const brand = (s.offers || []).find((o) => o.kind === 'brand');
      if (brand) {
        s.offers = (s.offers || []).filter((o) => o !== brand);
        s.inbox = (s.inbox || []).filter((m) => m.offerId !== brand.id);
        so.lastLine = `You said ${pick(ABOUT)}. A great many people agreed with you, and ${brand.from || 'the brand'} stopped answering the same afternoon. Nobody will ever put that in writing.`;
        addTimeline(s, `You said what you thought, and a campaign quietly went away.`, true);
      } else {
        so.lastLine = `You said ${pick(ABOUT)}. A great many people agreed with you and a great many did not, and by the evening the argument was about you rather than about it.`;
        addTimeline(s, `You said what you thought and it became a day of coverage.`);
      }
    } else {
      so.lastLine = `You said ${pick(ABOUT)}. It did not become a story, which is the best outcome available and the one nobody posts hoping for. A few people who matter noted that you have a spine.`;
    }
  } else if (kind === 'different') {
    // The box is made of what people have seen you do. This does not break it — nothing
    // breaks it in one move — but it is the cheapest thing that touches it.
    const id = strongLabels(s)[0];
    const info = id ? labelInfo(id) : null;
    typecastBump(s, id, -1);
    grow(s, rint(1, 4) * room);
    addHype(s, rint(2, 6), 'hit');
    so.lastLine = info
      ? `You put up something with nothing to do with the work — and specifically nothing to do with ${String(info.label || 'the part').toLowerCase()}. A few thousand people replied that they had no idea. Two of those thousand cast things.`
      : `You put up something with nothing to do with the work at all, and people liked seeing it.`;
  } else if (kind === 'answer') {
    const scandal = (s.scandal || 0) >= 20;
    if (chance(scandal ? 42 : 62)) {
      s.media = clamp((s.media || 0) - rint(8, 16));
      if (scandal) s.scandal = clamp((s.scandal || 0) - rint(5, 12));
      grow(s, rint(2, 6) * room);
      setRespect(s, (s.respect || 0) + 1);
      so.lastLine = `You answered it once, plainly, and did not answer it again. It died within the week. The people who wanted a war did not get one and have moved on to somebody who will give them one.`;
      addTimeline(s, `You answered the story about you, and it stopped.`);
    } else {
      s.media = clamp((s.media || 0) + rint(10, 20));
      s.scandal = clamp((s.scandal || 0) + rint(3, 9));
      s.mental = clamp((s.mental || 50) - rint(4, 9));
      grow(s, rint(4, 12) * room);
      so.lastLine = `You answered it, and the answer is now the story. It is a bigger story than the one you were answering. Every person who advised you not to has now said so.`;
      addTimeline(s, `You answered the story and made it twice the size.`, true);
    }
  }
  s.lastEvent = so.lastLine;
  return s;
}

// ── going quiet ───────────────────────────────────────────────────────────────
// Not posting is a move. It costs you the number and it buys back the thing the number takes.
export function quietMonths(s) { return social(s).quietSince ? Math.max(0, stamp(s) - social(s).quietSince) : 0; }

// ── the scroll ────────────────────────────────────────────────────────────────
// Free, available always, and the only action in the game whose entire effect is on you. It
// tells you what people actually think, which is worth knowing and costs what it costs.
export function canScroll(s) {
  if (!inCareer(s)) return { ok: false, why: '' };
  if (onCooldown(s, 'scroll')) return { ok: false, why: 'You have done this already this month. You know what is down there.' };
  return { ok: true, why: '' };
}
const NICE = ['somebody has written four hundred words about a look you did in one scene, and they are right about it',
  'a person says your work got them through a year, and gives the year',
  'somebody is arguing with strangers on your behalf and doing a better job than you would',
  'a drawing of you, done properly, by somebody who is clearly fifteen'];
const NASTY = ['somebody has counted your films and ranked them and you are worse than you thought',
  'a reply with more likes than your post saying you have not been good since the second one',
  'a person explaining to thousands of people what you are like, having met you never',
  'the same three words about your face, from different accounts, all afternoon'];
export function theScroll(s) {
  const fit = canScroll(s);
  if (!fit.ok) { if (fit.why) s.lastEvent = fit.why; return s; }
  markUsed(s, 'scroll');
  const kind = (s.scandal || 0) >= 25 ? 'bad' : (s.respect || 0) >= 60 && chance(55) ? 'good' : chance(45) ? 'good' : 'bad';
  const cost = kind === 'bad' ? rint(3, 8) : rint(0, 2);
  s.mental = clamp((s.mental || 50) - cost);
  social(s).lastScroll = kind;
  s.lastEvent = kind === 'good'
    ? `An hour of it. Mostly: ${pick(NICE)}. You put the phone down somewhere you will not pick it up again tonight, and you will.`
    : `An hour of it. Mostly: ${pick(NASTY)}. None of it is true and all of it is now in your head, and there is no version of this where you did not read it.`;
  return s;
}

// ── the month ─────────────────────────────────────────────────────────────────
// The drift, which is the whole balance. You cannot out-post your own fame: every month the
// number walks back toward what your career actually justifies. A viral week is a loan.
export function socialTick(s) {
  if (!inCareer(s)) return s;
  const so = social(s);
  const n = natural(s);
  if (!so.followers && n > 0) { so.followers = n; return s; }   // an account with nothing in it
  const gap = n - so.followers;
  // Down faster than up. Nobody has ever been surprised by that.
  so.followers = Math.max(0, so.followers + gap * (gap > 0 ? 0.14 : 0.2));
  if (!onCooldown(s, 'post')) { so.quietSince = so.quietSince || stamp(s); } else so.quietSince = 0;
  // A year of saying nothing, and the rooms notice the right way round.
  if (quietMonths(s) === 12 && (s.fame || 0) >= 45) {
    setRespect(s, (s.respect || 0) + 2);
    addTimeline(s, `A year without posting anything. Somebody wrote a piece about how you do not, which is the joke.`);
  }
  if ((so.vanity || 0) > 0 && chance(30)) so.vanity -= 1;
  return s;
}

// For the screen.
export function followerLine(s) {
  const over = overIndex(s);
  if (followers(s) < 40) return 'Almost nobody, which is almost everybody.';
  if (over >= 1.8) return 'Far more people follow you than have seen anything you made. That is worth money and it is worth being read for parts, and it is not worth what you think it is worth.';
  if (over >= 1.25) return 'More people follow you than your work accounts for. The agent has noticed; so have the brands.';
  if (over >= 0.85) return 'About what somebody at your level has. It goes up when the work goes up.';
  return 'Fewer than somebody at your level usually has. You are not in this part of the business, and there is a kind of respect in that.';
}
