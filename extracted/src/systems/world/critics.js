// What was written about it. Three to five people with names and papers, each with a
// number of stars and two sentences — built the way Hollywood Animal builds them, from
// parts, out of what the game already knows about the film: how it scored, how the shoot
// went, whether you carried it, whose dinner table got you the part, who was on the
// poster beside you. The critics are the same twelve people every time; the sentences
// are drawn from pools with the least-used ones first, so a career of four hundred
// reviews does not read the same line twice for a long time.
import { rint, chance, pick } from '../../engine/rng.js';
import { critics as rosterOf } from './world.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ── what the stars are ────────────────────────────────────────────────────────
function starsFor(c, ctx) {
  const r = ctx.rating;
  let stars = r >= 88 ? 5 : r >= 76 ? 4 : r >= 62 ? 3 : r >= 48 ? 2 : 1;
  if (c.harsh >= 0.5 && r < 92 && chance(70)) stars -= 1;
  if (c.harsh <= -0.5 && chance(60)) stars += 1;
  if (c.loves === ctx.genre && chance(50)) stars += 1;
  if (c.hates === ctx.genre && chance(70)) stars -= 1;
  if (c.pop && ctx.verdict === 'smash' && chance(60)) stars += 1;
  if (c.pop && ctx.verdict === 'bomb' && chance(60)) stars -= 1;
  // A carried set: the film may be nothing, but the review is about you, and it is kinder.
  if (ctx.carried && stars <= 2 && chance(50)) stars += 1;
  return clamp(stars, 1, 5);
}
const BAND = { 5: 'great', 4: 'good', 3: 'mixed', 2: 'poor', 1: 'bad' };

// ── the sentences ─────────────────────────────────────────────────────────────
// {actor} is your surname, {you} your full name, {title} the film, {director}, {costar}.
const OPEN = {
  great: [
    'A film people will be arguing about in twenty years, and {actor} is the reason.',
    'You might find it difficult to sit through {title}, but the reward is one of the performances of the decade.',
    'Every so often a picture arrives that makes the rest of the year look like homework. This is that picture.',
    'It is rare to see a room go this quiet at a press screening. {title} earned it.',
    'There is not a wasted frame in {title}, and {actor} is in most of them.',
    '{director} has made the film of their life, and {actor} has made the film of theirs.',
    'Forget the trailer. {title} is bigger, stranger and better than anybody was selling it as.',
    'The kind of {genre} that reminds you why the genre exists.',
    'By the second reel you have stopped taking notes. That does not happen.',
    'An honest-to-God masterpiece, and I do not use the word twice a year.',
  ],
  good: [
    'A confident, handsome piece of work that knows exactly what it is.',
    '{title} will not change your life, but it will keep you in your seat, which is more than most of this year managed.',
    'Not perfect — the middle sags — but {actor} holds the whole thing together with both hands.',
    'A movie that will keep you in suspense from the first minute, and {actor} is the best thing in it.',
    'The rare {genre} that trusts its audience. {director} deserves credit for that; so does the cast.',
    'Two very good performances and a third one that gets better on reflection.',
    'It came out well. The reviews in the trades will say "solid", which undersells it.',
    'Sharp, quick, occasionally moving. You could do a great deal worse this month.',
    'Somebody finally made a {genre} for grown-ups.',
    'It plays. Whatever else you say about {title}, it plays.',
  ],
  mixed: [
    'A film that keeps promising to become something and never quite arrives.',
    'Half of {title} is very good, and unfortunately it is the first half.',
    'Competent, tidy, forgettable. {actor} is better than the picture around them.',
    'You can see the film they wanted to make. This is not quite it.',
    'There is a great {genre} buried in here somewhere. {director} did not find it.',
    'Perfectly watchable, which is the faintest praise a critic has.',
    'It came and went for me. Some people in the row behind loved it.',
    'The script lets everybody down, and everybody does their best regardless.',
    '{title} is fine. I expected to be able to say more than that.',
    'A long film that feels longer, rescued in stretches by its lead.',
  ],
  poor: [
    'Brutal and chilling, as the poster promises — mostly to sit through.',
    'A tragedy in the wrong sense. {title} does not work, and it does not know it.',
    'Somebody should have stopped this at the script stage.',
    'The first twenty minutes are dreadful. It does pick up. It does not pick up enough.',
    'Every {genre} cliché, played straight, and not one of them lands.',
    'Loud, long and pleased with itself. The audience at my screening was neither.',
    '{director} has made better films by accident.',
    'It did not land, and you can see the exact moment it stops trying.',
    'The knife scene is the only thing anybody will remember, and not for the right reasons.',
    'I have seen worse this year. Not many.',
  ],
  bad: [
    'A film so bad it becomes a kind of achievement.',
    'Unwatchable. I say that as somebody who is paid to watch things.',
    'I would call {title} a disaster, but a disaster is at least an event.',
    'It should not have been released. It should not have been finished.',
    'The worst {genre} of the year, and it is only {month}.',
    'Ninety minutes I will not get back, and I left after seventy.',
    'Whoever cut this should be asked, gently, what they were thinking.',
    'Not a single line in {title} sounds like something a person would say.',
    'Bleak, cheap and interminable. The audience laughed in the wrong places, then stopped laughing.',
    'A mess. There is no kinder word and I looked for one.',
  ],
};
// About you, specifically. Chosen by how the shoot actually went, not by the film's score.
const YOU = {
  carried: [
    '{actor} is the only good thing in it, and {actor} is very good.',
    'You watch the film for {actor}, and then you watch it again for {actor}.',
    'Whatever is wrong with {title}, none of it is {actor}\'s fault. This is a performance stranded in the wrong film.',
    'It is a tragedy that a performance this fine has this picture built around it.',
    '{actor} does more with a look than the script does with a page.',
    'The film is nothing much; the lead is what the reviews will be about.',
  ],
  strong: [
    '{actor} is superb — unshowy, exact, and impossible to look away from.',
    'A career-best turn from {actor}, who has never been this still or this dangerous.',
    'This is the part {actor} has been circling for years, and they take it.',
    '{actor}\'s triumphant performance rewards every minute of the effort.',
    'Watch what {actor} does in the last ten minutes. That is the whole film.',
    '{actor} has arrived. Somebody tell the studios.',
  ],
  fine: [
    '{actor} is good in it. Not the revelation the poster wants, but good.',
    '{actor} works hard, and it mostly shows in the right way.',
    'A solid, likeable turn from {actor}, who deserves a better script next time.',
    '{actor} is fine, which in this company is enough.',
    'There is a real actor in {actor}, and {title} lets you see about half of them.',
  ],
  weak: [
    '{actor} looks lost, and you cannot entirely blame them.',
    'Miscast, or misdirected — {actor} never finds the part.',
    '{actor} is out of their depth here, and the film sinks with them.',
    'A performance made of gestures. {actor} has done better and will again.',
    'Whatever {actor} was going for, it did not arrive on screen.',
  ],
};
// Something specific happened, and the critics know — they always know.
const SPECIAL = {
  fellApart: ['Something went badly wrong between the set and the screen; you can see the edit fighting the film.',
    'It has the look of a picture that was rescued in the cutting room, and not quite rescued.'],
  nepo: ['One does wonder how {actor} got the part. One stops wondering after the first scene.',
    'Cast, we are told, over dinner. It shows less than you would expect.'],
  nepoBad: ['Cast over a dinner table, and it looks it.', 'Everybody in this town knows how {actor} got this part. Now everybody knows why they should not have.'],
  worldHit: ['Not a film so much as a weather event. Nothing else this year will be talked about as much.',
    'You will see it twice. Everybody will.'],
  costar: ['Sharing a frame with {costar} would flatten most actors. {actor} holds their own, which is the story here.',
    '{costar} is {costar}, of course — but the surprise is {actor}, who does not blink.'],
  costarIcon: ['To stand next to {costar} and not disappear is an achievement in itself. {actor} does not disappear.',
    'A star vehicle for {costar} that quietly becomes somebody else\'s film for stretches.'],
  aboutTake: ['This is the slow, serious version of the story, and it is the right one.',
    'It takes its time and lets the thing underneath breathe. Some will call that indulgent. They are wrong.'],
  biggerTake: ['Bigger and louder than it needed to be, and it sells.', 'More of everything, fewer of the quiet bits. It will do numbers.'],
  strangeTake: ['The strangest thing to open this year, and very possibly the best.', 'Nobody had the nerve to make this. Somebody did.'],
  comeback: ['Call it a comeback if you like. {actor} would probably prefer you called it a performance.',
    'The word in the trades is "comeback". The word on screen is "still here".'],
  sequel: ['Better than the first one, which is not something you get to write often.',
    'A sequel that remembers why people liked the original, and then does something else.'],
  late: ['{actor} has reached the age where the parts get better and the queues get shorter. This is one of the good ones.',
    'Written for somebody who has lived a bit, and played by somebody who has.'],
};
const CLOSE = {
  Horror: ['Anyone who watches this will have dreams about the cellar for a long time.', 'The main villain is so creepy you could faint.', 'Do not see it alone. Do not see it late.'],
  Crime: ['An exciting detective story whose title mirrors its fate.', 'The kind of crime picture where you smell the rain.', 'It ends where it should, which is rarer than it sounds.'],
  Thriller: ['A movie that will constantly keep you in suspense.', 'You will not guess it. I did not.', 'Tight as a drum for ninety minutes.'],
  Romance: ['His death is a tragedy to every woman in the audience, and a few of the men.', 'Bring somebody. Or do not, and think about why.', 'It earns the last kiss.'],
  Comedy: ['I laughed. Out loud. In a press screening. That is a review.', 'Funnier than it has any right to be.', 'The wedding scene alone is worth the ticket.'],
  Drama: ['Quiet, patient, and it stays with you on the walk home.', 'A film about the thing people do not say, and it does not say it either.', 'The last shot is the whole picture.'],
  'Sci-Fi': ['It looks like eleven times its budget.', 'Big ideas, and for once the ideas are the point.', 'You will want to see the machine again.'],
  Musical: ['You will leave humming the second number.', 'The kind of musical that remembers musicals are supposed to move.', 'The ballroom sequence is worth the price alone.'],
  any: ['A film for the people who still go to the pictures.', 'See it in a cinema, with people.', 'It is what it is, and what it is, is enough.',
    'A fascinating farewell to the version of this genre we grew up with.', 'Every frame is a photograph.', 'Somebody in that office made the right list.',
    'I wanted more. That is not a complaint.', 'The title turns out to be prophetic.'],
};

// ── choosing without repeating ────────────────────────────────────────────────
// Every fragment in every pool has a count in the save. The least-used ones are drawn
// first, so a line comes back only when everything else in its pool has been used.
function draw(s, key, pool) {
  const used = (s._reviewLines = s._reviewLines || {});
  let min = Infinity;
  for (let i = 0; i < pool.length; i++) min = Math.min(min, used[`${key}:${i}`] || 0);
  const fresh = []; for (let i = 0; i < pool.length; i++) if ((used[`${key}:${i}`] || 0) === min) fresh.push(i);
  const i = pick(fresh);
  used[`${key}:${i}`] = (used[`${key}:${i}`] || 0) + 1;
  return pool[i];
}
function fill(line, ctx) {
  return line.replace(/\{actor\}/g, ctx.actor).replace(/\{you\}/g, ctx.you).replace(/\{title\}/g, ctx.title)
    .replace(/\{director\}/g, ctx.director || 'the director').replace(/\{genre\}/g, String(ctx.genre || 'film').toLowerCase())
    .replace(/\{costar\}/g, ctx.costar || 'the co-star').replace(/\{month\}/g, ctx.month || 'spring');
}

// ── the review page ───────────────────────────────────────────────────────────
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function gradeOf(rating) {
  return rating >= 90 ? 'A+' : rating >= 84 ? 'A' : rating >= 78 ? 'A−' : rating >= 72 ? 'B+' : rating >= 66 ? 'B' : rating >= 60 ? 'B−'
    : rating >= 54 ? 'C+' : rating >= 48 ? 'C' : rating >= 42 ? 'C−' : rating >= 35 ? 'D' : 'F';
}
// What people who paid thought. Money is the honest vote: a smash is loved whatever the
// papers said, a bomb is not, and the genre nudges it — nobody rates a horror like a drama.
export function audienceScore(rating, verdict, genre) {
  let v = 4 + rating / 25;
  if (verdict === 'smash') v += 1.4; else if (verdict === 'profitable') v += 0.6; else if (verdict === 'bomb') v -= 1.2;
  if (genre === 'Horror' || genre === 'Comedy') v += 0.3;
  return Math.round(clamp(v + (Math.random() - 0.5) * 0.8, 1, 10) * 10) / 10;
}

// ctx: { title, rating, genre, verdict, director, actorName, meter, fellApart, viaPartner, worldHit,
//        take, costar, costarIcon, comeback, sequel, lateShelf, month }
export function reviewsFor(s, ctx) {
  const roster = rosterOf(s);
  const n = ctx.rating >= 80 || ctx.verdict === 'smash' ? 5 : ctx.rating >= 55 ? 4 : 3;
  const who = [...roster].sort(() => Math.random() - 0.5).slice(0, n);
  const parts = String(ctx.actorName || s.name || 'the lead').split(' ');
  const actor = parts[parts.length - 1] || ctx.actorName;
  const full = { ...ctx, actor, you: ctx.actorName || s.name, month: MONTHS[s.month || 0] };
  const carried = (ctx.meter || 0) >= 85;
  const reviews = who.map((c) => {
    const stars = starsFor(c, { ...ctx, carried });
    const band = BAND[stars];
    const youKey = carried ? 'carried' : stars >= 4 ? 'strong' : stars === 3 ? 'fine' : 'weak';
    const bits = [draw(s, 'open:' + band, OPEN[band]), draw(s, 'you:' + youKey, YOU[youKey])];
    // One specific thing, if there is one, from the critic who would notice it.
    const specials = [];
    if (ctx.fellApart) specials.push('fellApart');
    if (ctx.viaPartner) specials.push(stars <= 2 ? 'nepoBad' : 'nepo');
    if (ctx.worldHit) specials.push('worldHit');
    if (ctx.costar) specials.push(ctx.costarIcon ? 'costarIcon' : 'costar');
    if (ctx.take === 'about') specials.push('aboutTake');
    if (ctx.take === 'bigger') specials.push('biggerTake');
    if (ctx.take === 'strange') specials.push('strangeTake');
    if (ctx.comeback) specials.push('comeback');
    if (ctx.sequel) specials.push('sequel');
    if (ctx.lateShelf) specials.push('late');
    if (specials.length && chance(55)) { const k = pick(specials); bits[1] = draw(s, 'sp:' + k, SPECIAL[k]); }
    else if (chance(45)) bits.push(draw(s, 'close:' + (CLOSE[ctx.genre] ? ctx.genre : 'any'), CLOSE[ctx.genre] || CLOSE.any));
    return { critic: c.name, outlet: c.outlet, stars, text: bits.map((b) => fill(b, full)).join(' ') };
  });
  const criticScore = Math.round((reviews.reduce((a, r) => a + r.stars, 0) / reviews.length) * 2 * 10) / 10;
  return { grade: gradeOf(ctx.rating), audience: audienceScore(ctx.rating, ctx.verdict, ctx.genre), critics: criticScore, reviews };
}
