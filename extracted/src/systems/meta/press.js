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
import { slotNorm } from '../career/franchise.js';
import { budgetFor } from '../career/release.js';

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
    } else if ((m = t.match(/^(.+) is telling people you were difficult/))) {
      add('gossip', `"Difficult": what ${m[1]} is saying about ${name}`, `A director, a dinner, and a word that travels faster than a review. The piece has it third-hand and prints it anyway. Every casting office in town has read it by Friday.`, { react: true });
    } else if (/^Pulled over at two in the morning/.test(t)) {
      add('gossip', `${name} arrested`, `The photograph from the station, the charge sheet, and a paragraph on the last time. The publicist's statement is quoted in full and believed by nobody.`, { react: true });
    } else if (/^A recording from the party/.test(t)) {
      add('gossip', `The tape: what ${name} said at the party`, `Forty seconds, badly lit, and the sentence in the middle of it is the headline. The piece transcribes it. Twice.`, { react: true });
    } else if (/^A lawsuit —/.test(t)) {
      add('news', `${name} sued`, `An old contract, a producer, and a number with a lot of zeros. The piece is careful, which is how you know the lawyers read it first.`, { react: true });
    } else if (/^A co-star, an interview/.test(t)) {
      add('gossip', `"Difficult": a co-star on ${name}`, `One sentence in a long interview, and the headline is built from it. The co-star's people say it was taken out of context. The context is printed underneath, and it does not help.`, { react: true });
    } else if (/^A photograph you did not pose for/.test(t)) {
      add('gossip', `${name}, photographed`, `Taken from a car, printed at full width, captioned by somebody who has never met you. The comments are the story.`, { react: true });
    } else if ((m = t.match(/^The year's list is out: you were #(d+), you are #(d+).(?: (.+) has your old chair.)?/))) {
      add('news', m[3] ? `${m[3]} takes ${fn}'s chair` : `${name} slips to #${m[2]}`, `Down from #${m[1]} to #${m[2]} on the year's list. The piece is about who went up, and it is not about you, which is the point of it.`, {});
    } else if ((m = t.match(/^(.+): it is what you are to them now./))) {
      add('news', `${name}, ${m[1].toLowerCase()}`, `The piece is a list of the parts, and the parts are all one part. It is meant kindly, in the way a box is kindly. Play to it and the offers keep coming; the day you want out of it, this is the piece they will quote.`, {});
    } else if (/box office poison/.test(t)) {
      add('pan', `${name}: box office poison?`, `Two leads, two pictures that lost money, and a phrase the trades have been waiting to use. The piece counts the grosses, quotes an insurer who "cannot comment on individual cases", and does not need to.`, { react: true });
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

// ── the run, while it runs ────────────────────────────────────────────────────
// Maxi: "your film came out — and in the News you can find how it was received, what the
// critics say, what people want, what the producers think; for a series, whether there is
// a continuation, whether they are looking for money, whether there are problems; a
// blockbuster where they praise the other actor and not you." Written off the credit while
// it is in front of people: the first reviews the month it opens, the numbers a month in,
// the network's mood for television, and at the close who the piece decides the film
// belonged to.
function runPieces(s) {
  const out = [];
  const name = s.name || 'you', fn = first(s);
  const add = (tone, head, body, extra = {}) => out.push({ tone, head, body, ...extra });
  const now = stamp(s);
  for (const c of s.filmography || []) {
    if (!c.running) continue;
    c._press = c._press || {};
    const weeks = c.weeks || 0, r = c.rating || 0, film = !c.tv;
    // the month it opened: the first reviews, and what the crowd is in the mood for
    if (!c._press.open) {
      c._press.open = now;
      if (film && (s.fame || 0) >= 12) {
        const crit = r >= 80 ? `The first reviews of "${c.title}" are raves — the word "career-best" appears twice before the second paragraph, and both times it is about ${fn}.`
          : r >= 65 ? `The first reviews of "${c.title}" are warm. Solid, well made, "a film that knows what it is" — and a paragraph on ${name} that the studio will be quoting on the poster by Friday.`
          : r >= 50 ? `The first reviews of "${c.title}" are mixed: respectable in one paper, forgettable in the next. ${name} is "fine", which is the word critics use when they have nothing to say.`
          : `The first reviews of "${c.title}" are unkind. One of them uses the phrase "what were they thinking", and the industry reads the reviews too.`;
        const want = c.genre === hotGenreOf(s) ? `The Friday crowd wants ${String(c.genre).toLowerCase()} this month, which is the wind at its back.` : `The Friday crowd wants ${hotGenreOf(s).toLowerCase()} this month; a ${String(c.genre || 'drama').toLowerCase()} has a fight on its hands.`;
        add(r >= 65 ? 'praise' : r >= 50 ? 'news' : 'pan', r >= 65 ? `First reviews: "${c.title}" lands` : r >= 50 ? `First reviews: "${c.title}" divides` : `First reviews: "${c.title}" gets a kicking`, `${crit} ${want}`, { about: c.title, kind: 'you', react: r < 50 });
      } else if (!film && (s.fame || 0) >= 12 && c.scale !== 'episode') {
        add('news', `"${c.title}": the first night's numbers`, `${c.viewers || 0}m watched the first episode against the ${slotNormOf(c.type)}m the slot wants. ${(c.viewers || 0) >= slotNormOf(c.type) ? 'The network is pleased, in the way a network is pleased: quietly, and with a memo.' : (c.viewers || 0) >= slotNormOf(c.type) * 0.7 ? 'Soft. Not a disaster — the kind of number that makes a network wait a week before saying anything.' : 'Well under. Somebody at the network has already started a conversation about the slot.'}`, { about: c.title, kind: 'you' });
      }
    }
    // a month in: the producers' number, or the network's mood
    else if (!c._press.mid && weeks >= 4 && weeks < (c.weeksTotal || 8)) {
      c._press.mid = now;
      if (film && (s.fame || 0) >= 15 && c.scale !== 'small') {
        const bud = budgetFor({ scale: c.scale }) || 1;
        const share = Math.min(1, weeks / Math.max(1, c.weeksTotal || 8));
        const pace = (c.boxOffice || 0) / (bud * 2.2 * Math.max(0.2, Math.pow(share, 0.55)));
        add(pace >= 1.4 ? 'praise' : pace >= 0.8 ? 'news' : 'pan', pace >= 1.4 ? `"${c.title}" is ahead of the studio's numbers` : pace >= 0.8 ? `"${c.title}": on track, the studio says` : `"${c.title}" is soft, and the studio knows it`,
          pace >= 1.4 ? `€${(c.boxOffice / 1e6).toFixed(1)}m so far on a €${(bud / 1e6).toFixed(0)}m picture, and a producer quoted "thrilled" without being asked. The word sequel is not in the piece, and it is in the piece.`
          : pace >= 0.8 ? `€${(c.boxOffice / 1e6).toFixed(1)}m so far against a €${(bud / 1e6).toFixed(0)}m budget. Nobody is thrilled and nobody is worried, which is where most films live.`
          : `€${(c.boxOffice / 1e6).toFixed(1)}m so far on a €${(bud / 1e6).toFixed(0)}m picture. A producer says "we are proud of the film", which is what producers say about films that are losing money.`, { about: c.title, kind: 'you' });
      } else if (!film && c.scale !== 'episode' && (s.fame || 0) >= 12) {
        const pull = (c.viewers || 0) / slotNormOf(c.type);
        const soap = c.type === 'Soap Opera';
        add(pull >= 1 ? 'news' : 'pan', pull >= 1.2 ? `Renewal talk around "${c.title}"` : pull >= 0.8 ? `"${c.title}": holding` : `Is "${c.title}" in trouble?`,
          pull >= 1.2 ? `${c.viewers}m an episode and climbing. Insiders say the network is already talking about ${c.season ? `season ${(c.season || 1) + 1}` : 'another season'} — and about the cast's money, which is the other half of that conversation.`
          : pull >= 0.8 ? `${c.viewers}m an episode against a ${slotNormOf(c.type)}m slot. ${soap ? 'A soap is a habit, and this one is holding its habit.' : 'Enough to come back, not enough to be sure of it. The network will decide on the finale.'}`
          : `${c.viewers}m against a ${slotNormOf(c.type)}m slot, and the piece has a source at the network who "would not rule anything out" — which rules something in. ${soap ? 'The writers are being asked about exits.' : 'A move to a later slot, a shorter order, or the end.'}`, { about: c.title, kind: 'you', react: pull < 0.8 });
      }
    }
  }
  // At the close: whose film it was. A name on the poster next to yours can take the piece.
  for (const c of s.filmography || []) {
    if (c.running || c._press?.close || c.closedAt !== now) continue;
    c._press = c._press || {}; c._press.close = now;
    if (c.with && (c.rating || 0) >= 55 && (c.withFame || 0) > (s.fame || 0) + 10 && chance(60)) {
      const carried = (c.meterAtClose || 0) >= 85;
      add(carried ? 'praise' : 'news', carried ? `${name} steals "${c.title}" from ${c.with}` : `${c.with} carries "${c.title}". ${name} is fine.`,
        carried ? `The bigger name is on the poster and the piece is about the smaller one: "the only reason to see it", it says, and it means you.` : `Two paragraphs on ${c.with}, a photograph of ${c.with}, and one line on ${name}: "fine". You were in the same film. The piece did not notice.`, { about: c.title, kind: 'you', react: !carried });
    }
  }
  return out;
}
// ── the set, while you are on it ─────────────────────────────────────────────
// Money that wobbles and sets that go cold get written about before the film exists.
function setPieces(s) {
  const out = [];
  const name = s.name || 'you';
  for (const p of (s.productions && s.productions.length ? s.productions : (s.production ? [s.production] : []))) {
    p._press = p._press || {};
    if (!p._press.money && (p.stability ?? 80) < 55 && (p.monthsLeft || 0) >= 1 && chance(30) && (s.fame || 0) >= 10) {
      p._press.money = true;
      out.push({ tone: 'news', head: `Money trouble on "${p.title}"?`, body: `A financier is "reviewing their position", the piece says, which is what financiers say the week before they leave. The production says everything is fine. ${name} is on the call sheet Monday either way.`, about: p.title, kind: 'you' });
    }
    const lead = (p.crew || [])[0];
    if (!p._press.cold && lead && (lead.bond || 0) < 30 && (p.meter || 0) < 35 && (p.months || 0) - (p.monthsLeft || 0) >= 2 && chance(35) && (s.fame || 0) >= 20) {
      p._press.cold = true;
      out.push({ tone: 'gossip', head: `A difficult set: "${p.title}"`, body: `Somebody on the crew is talking. The director "has concerns", the schedule is "tight", and the piece manages to put ${name}'s name next to the word "tension" three times without saying anything at all.`, about: p.title, kind: 'you', react: true });
    }
  }
  return out;
}
// ── the business ──────────────────────────────────────────────────────────────
// Maxi: "and about your rivals — you can find out how they are doing." One a month, at most:
// somebody near your rank and what they just did, a retirement, a death, the year's lists.
function worldPieces(s) {
  const out = [];
  const w = s.world; if (!w || !w.actors) return out;
  const year = s.year || 0;
  s._pressWorld = s._pressWorld || { retired: [], died: [], credits: [] };
  const seen = s._pressWorld;
  for (const a of w.actors) {
    if (a.died && !a.alive && !seen.died.includes(a.id)) { seen.died.push(a.id); if ((a.fame || 0) >= 40 || a.icon) out.push({ tone: 'news', head: `${a.name}, ${year - a.born}`, body: `${a.icon ? 'An icon' : 'A name'} of the business, ${(a.credits || []).length} films, ${a.askers ? `${a.askers} Asker${a.askers > 1 ? 's' : ''}` : 'never an Asker'}. The obituaries use the word "generation". Half of them get the films wrong.`, kind: 'biz' }); }
    else if (a.retired && a.alive && !seen.retired.includes(a.id)) { seen.retired.push(a.id); if ((a.fame || 0) >= 45 || a.icon) out.push({ tone: 'news', head: `${a.name} steps away at ${year - a.born}`, body: `"For now", the statement says. ${a.icon ? 'An icon, and a chair that is now empty.' : `Rank #${a.rank || '—'} when the phone stopped ringing.`} The piece is kind, and it is written in the past tense.`, kind: 'biz' }); }
  }
  if (seen.retired.length > 80) seen.retired = seen.retired.slice(-40);
  if (seen.died.length > 80) seen.died = seen.died.slice(-40);
  if (out.length) return out.slice(0, 1);
  // Somebody near you and what they made. The world's films are credited in January for the
  // year before, so this is a piece about last year's picture — the trades are always late.
  const you = (w.rank && w.rank.you) || 999;
  const near = w.actors.filter((a) => a.alive && !a.retired && Math.abs((a.rank || 999) - you) <= 6 && (a.credits || []).some((c) => c.year >= year - 1 && !seen.credits.includes(a.id + '|' + c.title)));
  if (near.length && chance(55)) {
    const a = pick(near);
    const c = (a.credits || []).filter((x) => x.year >= year - 1 && !seen.credits.includes(a.id + '|' + x.title)).sort((p, q) => (q.gross || 0) - (p.gross || 0))[0];
    seen.credits.push(a.id + '|' + c.title); if (seen.credits.length > 120) seen.credits = seen.credits.slice(-60);
    const g = (c.gross || 0) / 1e6;
    const above = (a.rank || 999) < you;
    const head = g >= 150 ? `${a.name}'s "${c.title}" takes €${g.toFixed(0)}m` : (c.rating || 0) >= 82 ? `${a.name}: the best reviews of the year for "${c.title}"` : (c.rating || 0) < 45 ? `${a.name} stumbles with "${c.title}"` : `${a.name} in "${c.title}": what the business made of it`;
    const body = g >= 150 ? `${above ? 'The name above yours on the list' : 'A name a few places below you'} just had the year. The piece is about the money and it uses the word "bankable", which is the word you want said about you.`
      : (c.rating || 0) >= 82 ? `${above ? 'Rank #' + a.rank + ', and climbing' : 'Rank #' + a.rank + ', and coming up behind you'}: the critics' darling this season. Your name is in the piece once, in a list of "the others".`
      : (c.rating || 0) < 45 ? `€${g.toFixed(1)}m and reviews to match. ${above ? 'A chair above yours just got a little less certain.' : 'The piece wonders, politely, whether the moment has passed.'}`
      : `€${g.toFixed(1)}m, ${((c.rating || 0) / 10).toFixed(1)}/10, and a paragraph on who is next for the studio. ${above ? 'They are ahead of you on the list, and this did not move them.' : 'They are behind you on the list, and this did not move them either.'}`;
    out.push({ tone: 'news', head, body, kind: 'biz', rival: a.id });
  }
  return out.slice(0, 1);
}
// hotGenre and slotNorm without importing the world into the papers twice.
function hotGenreOf(s) { const G = ['Drama', 'Thriller', 'Comedy', 'Sci-Fi', 'Romance', 'Horror', 'Musical', 'Crime']; return G[((s.year || 2026) * 12 + (s.month || 0)) % G.length]; }
function slotNormOf(type) { return slotNorm(type); }

// Monthly, at the end of the tick, after everything that writes to the timeline.
export function pressTick(s) {
  // The month just lived and the one before it: what you did is stamped with the old month
  // (you walked off in June), what the tick did with the new one (the picture opened in
  // July). Every line is written about once — the ones done are remembered.
  const now = stamp(s), prev = now - 1;
  const keys = new Set([`${MON[now % 12]} ${Math.floor(now / 12)}`, `${MON[((prev % 12) + 12) % 12]} ${Math.floor(prev / 12)}`]);
  const done = new Set(s._pressDone || []);
  const lines = (s.timeline || []).filter((e) => keys.has(e.when) && !done.has(e.when + '|' + e.text)).map((e) => e.text);
  // What happened (three at most), the run and the set (two), and the business (one).
  const raw = [...piecesFor(s, lines).map((p) => ({ kind: 'you', ...p })), ...runPieces(s).slice(0, 2), ...setPieces(s).slice(0, 1), ...worldPieces(s)];
  const pieces = raw.map((p, i) => ({ id: `pr${now}_${i}`, at: now, outlet: outletFor(p.tone), acted: false, ...p }));
  s._pressDone = [...(s.timeline || []).filter((e) => keys.has(e.when)).map((e) => e.when + '|' + e.text), ...(s._pressDone || [])].slice(0, 60);
  s._pressScandal = s.scandal || 0;
  if (pieces.length) s.press = [...pieces, ...(s.press || [])].slice(0, 30);
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
