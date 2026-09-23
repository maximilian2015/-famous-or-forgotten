// Who thinks what. Maxi's list asked for factions — the critics, the audience, the studios,
// the press, the directors, the fans — each with a standing of its own, so you can be the
// public's favourite and the critics' punchline at once. Nothing new is kept for it: every
// one of these is read off what the game already knows (the ratings, the grosses, the
// insurers, the stories, the phone, the hit), so it cannot drift from the life it describes.
import { insurability } from '../life/strain.js';
import { hype, hypeSource } from './hype.js';

const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const recent = (s, n = 5) => (s.filmography || []).filter((c) => !c.minor && !c.running).slice(0, n);

export const FACTIONS = {
  critics: { label: 'The critics', read: (s) => {
    const r = recent(s); if (!r.length) return { score: 50, line: 'No opinion yet. They have not seen anything.' };
    const avg = r.reduce((n, c) => n + (c.rating || 0), 0) / r.length;
    const noms = ((s.awards && s.awards.nominations) || []).filter((x) => (x.year || 0) >= (s.year || 0) - 3).length;
    const score = clamp(avg * 0.9 + noms * 4);
    return { score, line: score >= 75 ? 'They write about the work, not the name. That is the good version.' : score >= 55 ? 'Respectful. Nobody is calling it a masterpiece; nobody is calling it a waste.' : score >= 35 ? 'The reviews mention the film before they mention you, which is a kindness.' : 'The word is "wooden", and it has been used twice.' };
  } },
  audience: { label: 'The audience', read: (s) => {
    const r = recent(s); if (!r.length) return { score: 50, line: 'Nobody has paid to see you yet.' };
    const v = r.map((c) => (c.verdict === 'smash' ? 95 : c.verdict === 'profitable' ? 72 : c.verdict === 'broke even' ? 50 : c.verdict === 'bomb' ? 22 : c.reviews && c.reviews.audience != null ? c.reviews.audience * 10 : 50));
    const score = clamp(v.reduce((n, x) => n + x, 0) / v.length);
    return { score, line: score >= 80 ? 'They turn up for your name. That is the whole business.' : score >= 60 ? 'They turn up when the film is good. Which is fair.' : score >= 40 ? 'They are not sure yet. Neither is the studio.' : 'The last few did not open. The audience has a memory the critics do not.' };
  } },
  studios: { label: 'The studios', read: (s) => {
    const now = stamp(s);
    let score = 50 + (s.respect || 0) * 0.4 + ((s.fame || 0) - 40) * 0.3;
    score *= insurability(s);
    if ((s.poisonUntil || 0) > now) score -= 30;
    if ((s.walkedOff || []).some((t) => now - t < 36)) score -= 15;
    score = clamp(score);
    return { score, line: (s.poisonUntil || 0) > now ? 'Nobody will insure you on a picture this year. The phrase is box office poison.' : score >= 75 ? 'A safe name to build a picture on. The kind they call first.' : score >= 55 ? 'Bankable enough. They will take the meeting.' : score >= 35 ? 'A risk on paper. They will want a bigger name next to yours.' : 'The business affairs desk has a file on you, and it is not thin.' };
  } },
  press: { label: 'The press', read: (s) => {
    const src = hypeSource(s);
    let score = 50 - (s.scandal || 0) * 0.6 + (src && src !== 'scandal' ? hype(s) * 0.3 : 0) - (src === 'scandal' ? 20 : 0);
    if (s.staff && s.staff.publicist) score += 8;
    score = clamp(score);
    return { score, line: src === 'scandal' ? 'You are a story to them, not an actor. Every piece has a photograph and none of them has a film in it.' : score >= 70 ? 'The pieces are about the work, and they are kind. Somebody is answering their calls.' : score >= 45 ? 'Coverage when there is something to cover. Nothing when there is not.' : 'They have decided what you are, and the word is "difficult". It is in every third paragraph.' };
  } },
  directors: { label: 'The directors', read: (s) => {
    const ds = (s.people || []).filter((p) => /Director/.test(p.role || ''));
    const now = stamp(s);
    const grudges = (s.grudges || []).filter((g) => g.until > now).length;
    if (!ds.length && !grudges) return { score: 50, line: 'Nobody in your phone directs. Yet.' };
    const warm = ds.filter((p) => !p.cold && (p.relationship || 0) >= 50).length, cold = ds.filter((p) => p.cold).length;
    const score = clamp(50 + ((warm - cold) / Math.max(1, ds.length)) * 45 - grudges * 12 + (s.rumour && s.rumour.until > now ? -20 : 0));
    return { score, line: grudges ? `${grudges} director${grudges === 1 ? '' : 's'} will not call you again. The business is small.` : score >= 75 ? 'They come back for you. A director in your phone is a set that starts warm.' : score >= 50 ? 'Some of them would work with you again. Some of them would need asking.' : 'The word between them is not a kind one. Sets start cold.' };
  } },
  fans: { label: 'The fans', read: (s) => {
    const now = stamp(s);
    const hit = (s.filmography || []).find((c) => !c.minor && (c.verdict === 'smash' || (c.rating || 0) >= 85) && (c.year || 0) >= (s.year || 0) - 3);
    const furious = (s.timeline || []).slice(0, 60).some((x) => /Fans are furious/.test(x.text));
    const forgotten = (s.peakFame || 0) >= 35 && (s.fame || 0) < 15;
    let score = 35 + (s.fame || 0) * 0.4 + (hit ? 20 : 0) + (hypeSource(s) === 'hit' ? 10 : 0) - (furious ? 25 : 0) - (forgotten ? 20 : 0);
    score = clamp(score);
    return { score, line: furious ? 'They have a hashtag, and it is not a kind one. They will forgive you, in a year, if the film is good.' : forgotten ? 'They remember. They do not go looking.' : score >= 75 ? 'Yours. They queue, they quote, they defend you in the comments.' : score >= 50 ? 'Some. Enough to notice a premiere.' : 'Not yet a fandom. A few people who liked a thing you were in.' };
  } },
};
export const FACTION_ORDER = ['critics', 'audience', 'studios', 'press', 'directors', 'fans'];
export function factions(s) {
  return FACTION_ORDER.map((id) => { const r = FACTIONS[id].read(s); return { id, label: FACTIONS[id].label, score: r.score, line: r.line }; });
}
