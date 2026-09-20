// What they write about you. Maxi: "the News is stuck — Radiant Signal was two years ago and
// it keeps writing the same thing." It did: the app showed your best-ever review and one
// fixed line, forever. Now the trades and the tabloids write when something happens — a
// picture opens or closes, a season is renewed or not, a prize, a nomination, a walk-off,
// a night nobody remembers, somebody moving in — and the pieces pile up newest first, with
// the outlet, the tone, and a right of reply on the ones that ask for one.
//
// Pieces are read off the month's timeline, which every system already writes to, so a
// new kind of event becomes a piece by adding a line here and nowhere else.
import { chance, rint } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { setFame, setRespect } from './status.js';
import { OUTLETS } from '../world/names.js';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const clamp = (v) => Math.max(0, Math.min(100, v));
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const first = (s) => String(s.name || 'you').split(' ')[0];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
// The tabloids and the trades are different papers. The gossip goes to the first list.
const TABLOIDS = ['Southern Night', 'Funtimes', 'Late Edition', 'The Gazette'];
const TRADES = OUTLETS.filter((o) => !TABLOIDS.includes(o));
const outletFor = (tone) => (tone === 'gossip' ? pick(TABLOIDS) : pick(TRADES));

// One month's pieces, from one month's lines. At most three, the loud ones first.
export function piecesFor(s, lines) {
  const out = [];
  const name = s.name || 'you', fn = first(s);
  const add = (tone, head, body, extra = {}) => out.push({ tone, head, body, ...extra });
  for (const t of lines) {
    let m;
    if ((m = t.match(/^"(.+)" finished its run\. ([\d.]+)\/10 ·/))) {
      const title = m[1], score = parseFloat(m[2]);
      const c = (s.filmography || []).find((x) => x.title === title) || {};
      const v = c.verdict || '';
      if (c.worldHit) add('praise', `"${title}" is the film of the year. ${name} is the reason.`, `Nobody expected this. It has stopped being a film and become the thing people talk about at dinner — and the name they say is yours.`, { about: title });
      else if (score >= 8.5) add('praise', `${name}: the performance that changes the conversation`, `"${title}" is the kind of work that gets quoted back at you for a decade. The reviews are the kind people screenshot, and every one of them stops on your name.`, { about: title });
      else if (score >= 7.5 || v === 'smash') add('praise', v === 'smash' ? `"${title}" prints money — and ${fn} sells it` : `"${title}" lands, and ${name} is why`, v === 'smash' ? `The numbers are the story: a picture that has made its money back four times over, and a name on the poster the studio will want again.` : `A good run, well received. Not the one they will remember you for, but the one that gets your name into the next meeting.`, { about: title });
      else if (v === 'bomb' && (s.fame || 0) >= 25) add('pan', `What happened to "${title}"?`, `The reviews are bad and the numbers are worse, and the piece spends two paragraphs on ${name} before it gets to the director. Somebody will be blamed. This is the paper deciding who.`, { about: title, react: true });
      else if (score < 4.5 && (s.fame || 0) >= 15) add('pan', `${name}, in a film nobody asked for`, `"${title}" came and went in a fortnight. The trade's critic saw it on a Tuesday afternoon with eleven other people and says so.`, { about: title, react: true });
      else if ((s.fame || 0) >= 20) add('news', `"${title}" closes its run`, `${score}/10, ${v}. A film that came and went. Some people liked it.`, { about: title });
    } else if ((m = t.match(/^"(.+)" (opened|went out)\.$/))) {
      if ((s.fame || 0) >= 30) add('news', m[2] === 'opened' ? `${name} on the carpet for "${m[1]}"` : `"${m[1]}" goes out tonight`, m[2] === 'opened' ? `Forty photographs, four questions, and the lights going down. Nobody knows anything yet. The paper runs the picture of you laughing at something off-camera.` : `Seven o'clock, the theme, the titles, your face in ${rint(2, 6)} million living rooms. The number the network will not say out loud for a few weeks is the only one that matters.`, { about: m[1] });
    } else if ((m = t.match(/^"(.+)" was renewed for season (\d+)\.$/))) {
      add('news', `"${m[1]}" gets a season ${m[2]}`, `The network renewed on the numbers, which is the only reason a network ever does anything. ${name} returns.`, { about: m[1] });
    } else if ((m = t.match(/^"(.+)" was renewed — without you/))) {
      add('pan', `"${m[1]}" returns. ${name} does not.`, `Written out, the network says, "for story reasons". The paper rings three people who say it was the numbers, and one who says it was you.`, { about: m[1], react: true });
    } else if ((m = t.match(/^"(.+)" was not renewed after (\d+) season/))) {
      add('news', `"${m[1]}" cancelled after ${m[2]} season${m[2] === '1' ? '' : 's'}`, `The slot wanted more than it drew. The cast found out from the trades, the way casts do.`, { about: m[1] });
    } else if ((m = t.match(/^"(.+)" won at (.+)\.$/))) {
      add('praise', `${name}: the discovery of ${m[2]}`, `A cinema at nine in the morning, a jury in the front row, and by Sunday three distributors and a photograph of you in every trade. The word the piece uses is "discovery", and it uses your name.`, { about: m[1] });
    } else if ((m = t.match(/^"(.+)" sold at (.+)\.$/))) {
      add('news', `"${m[1]}" finds a buyer at ${m[2]}`, `A small release, a few cities, laurels on the poster. It exists now.`, { about: m[1] });
    } else if ((m = t.match(/^Asker nominations: (.+) for "(.+)"\.$/))) {
      add('praise', `Asker nominations: ${name} for "${m[2]}"`, `${m[1]}. The morning the list came out your phone did not stop, and the piece runs the photograph of you pretending you had not been waiting up.`, { about: m[2] });
    } else if ((m = t.match(/^🏆 Won the Asker for (.+)\.$/))) {
      add('praise', `${name} wins the Asker — ${m[1]}`, `The room stood up. The speech was too long and nobody minded. This is the paragraph every piece about you will open with for the rest of your life.`, {});
    } else if (/came home empty-handed/.test(t)) {
      add('news', `The Askers: ${name} goes home without one`, `Nominated, photographed, and applauding somebody else. The piece is kind about it, which is worse.`, {});
    } else if ((m = t.match(/^Walked off "(.+)"/))) {
      add('pan', `${name} walks off "${m[1]}"`, `Recast within the week, the production says, "amicably". Nobody on the set uses that word. The piece has three quotes and none of them are yours.`, { about: m[1], react: true });
    } else if ((m = t.match(/^"(.+)" was recast\./))) {
      add('pan', `"${m[1]}" goes on without ${name}`, `They held it open, the piece says, and you never went back. It runs your last photograph from the set next to the new one from the new cast.`, { about: m[1], react: true });
    } else if (/^A night at (.+) you do not remember/.test(t)) {
      add('gossip', `${name}: the night at ${t.match(/^A night at (.+) you do not remember/)[1]}`, `Somebody's phone was working. The pictures are not flattering and the captions are worse, and the piece asks — in the polite way that means the opposite — whether everything is all right.`, { react: true });
    } else if ((m = t.match(/^Started seeing (.+)\.$/))) {
      if ((s.fame || 0) >= 25) add('gossip', `Who is ${name} seeing?`, `${m[1]}, according to two people who would know and one who would not. The piece has a photograph of the back of somebody's head and is very sure about it.`, { react: true });
    } else if ((m = t.match(/^Married (.+)\./))) {
      add('gossip', `${name} marries ${m[1]}`, `Quietly, the paper says, in the tone of a paper that found out anyway. The dress, the guest list, and a paragraph about the last one.`, {});
    } else if ((m = t.match(/^Divorced (.+)\./))) {
      add('gossip', `${name} and ${m[1]}: it's over`, `The settlement is a number the piece has somehow got hold of. The piece has also got hold of a friend, who says you are "doing fine", which is what friends say.`, { react: true });
    } else if ((m = t.match(/^(.+) ended it\./))) {
      if ((s.fame || 0) >= 25) add('gossip', `${m[1]} walks out on ${name}`, `A source close to the couple, which is a phrase, says it had been over for a while. The paper runs the picture of you at the last premiere, alone.`, { react: true });
    } else if (/^Welcomed a new baby/.test(t)) {
      add('gossip', `A baby for ${name}`, `The name, the weight, and a photograph you did not approve. The comments are lovely, apart from the ones that are not.`, {});
    } else if (/calling .* a comeback/.test(t) || /^The trades are calling/.test(t)) {
      add('praise', `${name}: the comeback`, `Every piece uses the word, and every piece uses your name. It is a generous word for it, and it is doing more for you than the film is.`, {});
    } else if (/^Did not do the press for/.test(t)) {
      add('pan', `${name} skips the tour`, `The studio says "scheduling". The piece says the word actors who do not turn up for their own pictures get called, and then says it again.`, { react: true });
    }
  }
  // A month the scandal jumped is a month somebody printed something, whatever it was about.
  const jump = (s.scandal || 0) - (s._pressScandal || 0);
  if (jump >= 6 && !out.some((p) => p.tone === 'gossip') && (s.fame || 0) >= 15) {
    add('gossip', `${name}: "difficult"`, `A feature runs on you and it is not kind. It uses the word "difficult" four times and "sources" nine, and it is being passed around by exactly the people you would not want to read it.`, { react: true });
  }
  const rank = { praise: 0, pan: 1, gossip: 2, news: 3 };
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, 3);
}

// Monthly, at the end of the tick, after everything that writes to the timeline.
export function pressTick(s) {
  // The month just lived and the one before it: what you did is stamped with the old month
  // (you walked off in June), what the tick did with the new one (the picture opened in
  // July). Every line is written about once — the ones done are remembered.
  const now = stamp(s), prev = now - 1;
  const keys = new Set([`${MON[now % 12]} ${Math.floor(now / 12)}`, `${MON[((prev % 12) + 12) % 12]} ${Math.floor(prev / 12)}`]);
  const done = new Set(s._pressDone || []);
  const lines = (s.timeline || []).filter((e) => keys.has(e.when) && !done.has(e.when + '|' + e.text)).map((e) => e.text);
  const pieces = piecesFor(s, lines).map((p, i) => ({ id: `pr${now}_${i}`, at: now, outlet: outletFor(p.tone), acted: false, ...p }));
  s._pressDone = [...(s.timeline || []).filter((e) => keys.has(e.when)).map((e) => e.when + '|' + e.text), ...(s._pressDone || [])].slice(0, 60);
  s._pressScandal = s.scandal || 0;
  if (pieces.length) s.press = [...pieces, ...(s.press || [])].slice(0, 14);
  return s;
}
export function pressThisMonth(s) { const now = stamp(s); return (s.press || []).filter((p) => p.at === now); }
export function pressUnread(s) { return pressThisMonth(s).filter((p) => !p.seen).length; }
export function markPressSeen(s) { for (const p of pressThisMonth(s)) p.seen = true; return s; }
// Piece by piece. One answer a month — the second piece you answer is the story.
export function answerPiece(s, id, choice) {
  const p = (s.press || []).find((x) => x.id === id); if (!p || p.acted) return s;
  if ((s.press || []).some((x) => x.acted && x.at === stamp(s) && x.id !== id)) { s.lastEvent = 'You have answered the papers once this month. Twice is a story of its own.'; return s; }
  p.acted = choice;
  if (choice === 'reply') {
    const odds = 30 + (s.charisma || 0) * 0.5 - (p.tone === 'gossip' ? 10 : 0);
    if (chance(odds)) { s.media = clamp((s.media || 0) + 5); setFame(s, (s.fame || 0) + 1); setRespect(s, (s.respect || 0) + 1); s.lastEvent = 'You answered the piece. Your reply gets quoted more than the article did.'; addTimeline(s, 'Answered a press story — it landed well.'); }
    else { s.scandal = clamp((s.scandal || 0) + 3); s.media = clamp((s.media || 0) + 3); s.mental = clamp((s.mental || 0) - 2); s.lastEvent = 'You answered — and fed it. Your reply becomes the new headline.'; addTimeline(s, 'Answered a press story — it backfired.', true); }
  } else { s.media = clamp((s.media || 0) + 1); s.scandal = clamp((s.scandal || 0) - 1); s.mental = clamp((s.mental || 0) + 1); s.lastEvent = 'You said nothing. Without your oxygen the story burns out in a week.'; addTimeline(s, 'Ignored a press story — it faded.'); }
  return s;
}
export function monthLabel(at) { return `${MON[at % 12]} ${Math.floor(at / 12)}`; }
