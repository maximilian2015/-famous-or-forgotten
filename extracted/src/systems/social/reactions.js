// What ordinary people say about it while it is on.
//
// Maxi: "in the news there should be memes and the critics' reviews, and in the social feed
// what people say about, for example, a series while it is running — what the reactions are,
// and about the main character too. Is there activity at the premiere, during the run, and
// at the end?"
//
// The three beats existed and two of the three voices did not. meta/aftermath.js already
// feeds the News app with the post-mortems, the memes and the trades — that is the business
// talking about itself. Nothing anywhere was the public talking. And the account had no idea
// you had made anything: social/posting.js knew your follower count and not one thing about
// your work.
//
// So this is the other voice, and it is a different one. The News app reports. This is people
// in their kitchens, in their own words, while it is on:
//
//   · OPENING — the first weekend, or the first episode. Nobody has decided anything yet.
//   · MID-RUN — only television gets this, and it is the best part: a week between episodes
//     is when people build theories, and theorising is free marketing.
//   · THE END — the finale, the last weekend, the thing nobody can unsee.
//
// And it is split in two, because those are two different conversations and Maxi named both:
// what they think of the THING, and what they think of YOU in it. Those come apart constantly
// — the most common sentence in this business is that somebody was the best thing in
// something bad, and the second most common is the reverse.
import { rint, chance, pick } from '../../engine/rng.js';

const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const HANDLES = ['@nightbus', '@kestrel_', '@four_walls', '@oleander', '@mtn_time', '@spare_room',
  '@harriet_j', '@wet_pavement', '@lowlight', '@tuesday_again', '@ninecats', '@paper_kites',
  '@bramble', '@the_quiet_car', '@salt_and_iron', '@doorframe', '@half_moon_st'];

// ── what they say about the thing ─────────────────────────────────────────────
const THING = {
  open: {
    love: ['saw it twice. going again friday.', 'first ten minutes and i knew.', 'nobody warned me. i am not ok.',
      'this is the one. this is the one everybody is going to be talking about.'],
    mixed: ['good? i think? ask me tomorrow.', 'the middle hour is doing a lot of work.',
      'wanted to love it. liked it.', 'it is fine and i am annoyed that it is fine.'],
    cruel: ['two hours i will not get back.', 'who was this for.', 'walked out at the hour mark and i never walk out.',
      'the trailer had all of it.'],
  },
  mid: {
    love: ['four is the best episode of anything this year.', 'nobody speak to me until sunday.',
      'the theory holds. i have a diagram.', 'i have not been this early for a week since i was a child.'],
    mixed: ['it is treading water for an episode. it will be fine.', 'three was filler and they know it.',
      'i will finish it. i am not enjoying it.'],
    cruel: ['gave up at five.', 'this is the one where it stops being about anything.',
      'i am only still watching out of spite.'],
  },
  end: {
    love: ['that ending. THAT ending.', 'the last five minutes justify all of it.',
      'perfect. nothing else to say. perfect.', 'i am going to be thinking about this for a year.'],
    mixed: ['the ending is not what i wanted and might be what it needed.',
      'landed it. mostly.', 'good show. wrong last ten minutes.'],
    cruel: ['all that, for that.', 'they had no idea how to finish it and it shows.',
      'the ending retroactively ruins it and i am not being dramatic.'],
  },
};
// ── and what they say about you in it ─────────────────────────────────────────
// These take a name, because what people argue about is the person, not the credit.
// What the one person who liked it says. Every flop has them and they never sound like
// this — they sound like somebody who has already had the argument twice today.
const DEFENDERS = {
  open: ['everybody is wrong about this and i will not be taking questions.',
    'it is not for you. that is allowed.', 'in five years this gets reappraised. remember i said it.'],
  mid: ['i am the last person watching this and i am fine with that.',
    'you all gave up too early. it is doing something.', 'no notes. genuinely. no notes.'],
  end: ['i liked it. there. somebody had to say it.',
    'it is a mess and i would watch it again tomorrow.', 'the reviews for this are a crime.'],
};

const YOU = {
  love: [(n) => `${n} is doing something i have not seen them do before.`,
    (n) => `whatever ${n} is paid it is not enough.`,
    (n) => `the thing ${n} does with their face in the car scene. that is the whole film.`,
    (n) => `i did not know ${n} had this in them, and i say that with love.`],
  mixed: [(n) => `${n} is good. the film is not sure what to do with them.`,
    (n) => `${n} is fine but i keep seeing ${n}, not the character.`,
    (n) => `unpopular: ${n} is the least interesting thing in it and it is not their fault.`],
  cruel: [(n) => `${n} is sleepwalking through this.`,
    (n) => `casting ${n} in this was a decision somebody made in a room.`,
    (n) => `i am so tired of ${n} playing the same person.`],
  carried: [(n) => `${n} is the only good thing in it and everybody knows it.`,
    (n) => `${n} deserved a better film than the one around them.`,
    (n) => `watch it for ${n}. do not watch it for anything else.`],
};

// How the room is split. The reception is the crowd's number, out of a hundred, and the
// rating is the column's — they disagree, which is the interesting part.
function temperOf(score) { return score >= 72 ? 'love' : score >= 52 ? 'mixed' : 'cruel'; }
function mixFor(score) {
  // Nothing is unanimous. Even a masterpiece has somebody who hated it, which is the single
  // truest thing about putting work in front of people.
  if (score >= 78) return ['love', 'love', 'love', 'mixed', 'cruel'];
  if (score >= 62) return ['love', 'love', 'mixed', 'mixed', 'cruel'];
  if (score >= 46) return ['mixed', 'mixed', 'cruel', 'love', 'mixed'];
  // Nothing at the bottom gets gushed over. It gets DEFENDED, which is a different noise.
  return ['cruel', 'cruel', 'cruel', 'mixed', 'defend'];
}

// ── the pieces ────────────────────────────────────────────────────────────────
// Everything of yours that people could be talking about this month.
export function liveWork(s) {
  const now = stamp(s);
  const out = [];
  for (const c of (s.filmography || [])) {
    if (c.minor) continue;
    if (c.running) {
      const w = c.weeks || 0, total = c.weeksTotal || 1;
      out.push({ credit: c, beat: w <= 1 ? 'open' : w >= total - 1 ? 'end' : 'mid', live: true });
    } else if (c.closedAt != null && now - c.closedAt <= 2) {
      out.push({ credit: c, beat: 'end', live: false });
    }
  }
  return out;
}

// The feed. Deterministic per credit and beat, so it does not reshuffle every time the
// screen redraws — people do not write new posts because you looked again.
export function reactionsFor(s, limit = 5) {
  const me = String(s.name || 'they').split(' ')[0];
  const out = [];
  for (const { credit: c, beat, live } of liveWork(s)) {
    // Television gets the middle of its run; a film opens and then it is over.
    const tv = !!(c.episodes || c.season);
    if (beat === 'mid' && !tv) continue;
    const thing = Math.round(c.audience != null ? c.audience : (c.rating || 50));
    // What you were like in it is not what it was like. A set you carried shows here.
    const yours = Math.round(Math.max(0, Math.min(100, (c.rating || 50) * 0.45 + (c.meterAtClose || 45) * 0.55)));
    const carried = (c.meterAtClose || 0) >= 78 && (c.rating || 50) < 58;
    const mix = mixFor(thing);
    const seed = String(c.id || c.title) + beat;
    // A deterministic draw per credit and beat, so the feed does not reshuffle every time
    // the screen redraws — people do not write new posts because you looked again.
    //
    // The first version of this added n*7 INSIDE the character loop, which multiplied the
    // offset by 31 at every step and left a constant difference between draws. Against a
    // list of five that difference was a multiple of five, so all three draws landed on the
    // same entry: a series rated 8.1 with a happy audience had three people saying they gave
    // up on it, twice in the same words. Mix n in afterwards, and mix it properly.
    let base = 2166136261;
    for (let i = 0; i < seed.length; i++) { base ^= seed.charCodeAt(i); base = Math.imul(base, 16777619); }
    const roll = (n) => {
      let h = base ^ Math.imul(n + 1, 2654435761);
      h ^= h >>> 15; h = Math.imul(h, 2246822507);
      h ^= h >>> 13; h = Math.imul(h, 3266489909);
      return (h ^ (h >>> 16)) >>> 0;
    };
    const pool = THING[beat] || THING.open;
    const said = new Set();
    for (let i = 0; i < 3; i++) {
      const t = mix[roll(i) % mix.length];
      const lines = t === 'defend' ? (DEFENDERS[beat] || DEFENDERS.end) : (pool[t] || pool.mixed);
      // Two people can agree. They do not agree in identical words.
      let text = lines[roll(i + 80) % lines.length];
      for (let k = 1; k < lines.length && said.has(text); k++) text = lines[(roll(i + 80) + k) % lines.length];
      said.add(text);
      out.push({ handle: HANDLES[roll(i + 40) % HANDLES.length], tone: t === 'defend' ? 'love' : t, about: 'it',
        title: c.title, beat, live, text });
    }
    // And two about you, which is the conversation people actually have.
    const saidYou = new Set();
    for (let i = 0; i < 2; i++) {
      const t = carried && i === 0 ? 'carried' : temperOf(yours + (roll(i + 500) % 17) - 8);
      const lines = YOU[t] || YOU.mixed;
      let text = lines[roll(i + 300) % lines.length](me);
      for (let k = 1; k < lines.length && saidYou.has(text); k++) text = lines[(roll(i + 300) + k) % lines.length](me);
      saidYou.add(text);
      out.push({ handle: HANDLES[roll(i + 200) % HANDLES.length], tone: t === 'carried' ? 'love' : t,
        about: 'you', title: c.title, beat, live, text });
    }
  }
  // Newest first: whatever is still on, before whatever has finished.
  out.sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0));
  return out.slice(0, limit);
}

// One line for the top of the feed, so the player knows why it is busy.
export function feedMood(s) {
  const work = liveWork(s);
  if (!work.length) return null;
  const c = work[0].credit;
  const beat = work[0].beat;
  const tv = !!(c.episodes || c.season);
  const name = String(c.title).replace('⭐ ', '');
  if (beat === 'open') return tv ? `"${name}" went out. People are watching it right now.` : `"${name}" opened. Everybody has an opinion by Sunday.`;
  if (beat === 'mid') return `"${name}" is on, and the week between episodes is where it lives.`;
  return work[0].live ? `"${name}" is finishing.` : `"${name}" has finished, and people are still arguing about it.`;
}
