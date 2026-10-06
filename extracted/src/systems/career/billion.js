// A thousand million euros.
//
// The commercial verdict answers one question — how well did this do against what it cost — and
// it answers it correctly: a €220m tentpole on an event campaign needs €578m to break even and
// €1.155bn to be a smash, which is 5.3× its negative, and that is roughly what the business
// means by the word. So a billion-euro picture can legitimately come back as PROFITABLE, and
// Maxi, looking at exactly that: "€1.163bn кассы не должно заканчиваться просто надписью SMASH."
//
// He is right, and the answer is not a fifth verdict or a lower bar. Those would be a worse
// answer to a different question. A billion is not a statement about return on investment. It is
// an absolute size: very few pictures reach it, and everybody hears about the ones that do
// whether or not the studio made money on them. No number goes in the copy — this project has
// spent a week learning how easily a measured frequency turns out to be wrong, and a balance
// change would make a sentence on a player's screen quietly false.
//
// So it sits ALONGSIDE the verdict and never replaces it. A film is allowed to read
//
//     PROFITABLE  ·  🌍 WORLD HIT  ·  💰 BILLION CLUB
//
// all at once, and that is not a contradiction — it is three true things about one film.
//
// What it is NOT: it grants no Respect and no critical standing. Transformers: Age of
// Extinction took $1.1bn at 5.6 out of ten. Money at this scale is a commercial fact and the
// column is entitled to its own opinion, which the game already models separately.
//
// Measured under the committed balance (tests/probes/probe_billion.mjs, 30 careers each):
//   an ordinary career    0.23 of them, 87% of careers never see one
//   a maximised A-list    4.90 across thirty-two years — about one every six and a half years
// So the first one is a career event, and this file is mostly about making sure it feels like
// one exactly once.
import { uid } from '../../engine/id.js';
import { addTimeline, showMoment } from '../../engine/timeline.js';
import { sendMail } from '../meta/email.js';
import { addEvent } from '../social/events.js';
import { STUDIOS } from '../world/names.js';

export const BILLION = 1e9;

function studioOf(credit) {
  let h = 0;
  for (const ch of String(credit.title || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return STUDIOS[h % STUDIOS.length];
}
const money = (n) => `€${(n / 1e9).toFixed(3)}bn`;

// Called from release.js closeRun, after the run has ended and the final worldwide gross is on
// the credit. Never before: a film that has not finished playing has not reached anything.
// Returns 'first', 'again', or null.
export function markBillion(s, credit) {
  if (!credit || (credit.boxOffice || 0) < BILLION) return null;
  // Once per picture. A credit that has already been counted cannot be counted again, whatever
  // calls this and however often.
  if (credit.billion) return null;
  credit.billion = true;
  s.billions = (s.billions || 0) + 1;
  const first = s.billions === 1;
  const studio = studioOf(credit);
  const gross = credit.boxOffice || 0;

  // The screen. The first one in a life is the thing people remember about the life; the fourth
  // is a Tuesday, and saying the same words over it would make the first one retroactively
  // smaller. engine/timeline.js showMoment queues it behind anything already up.
  showMoment(s, first
    ? { id: 'billion-first', kind: 'good', title: 'Welcome to the billion club',
      lines: ['Very few pictures ever cross this line.',
        `"${credit.title}" just did — ${money(gross)} worldwide.`,
        'Whatever else happens from here, you were in one of them.'] }
    : { id: 'billion-again', kind: 'good', title: s.billions === 2 ? 'Billion club · number two' : 'Another billion',
      lines: s.billions === 2
        ? [`"${credit.title}" went past ${money(gross)}.`,
          'Once can be luck. Twice changes how the business looks at you.']
        : [`"${credit.title}" went past ${money(gross)}.`,
          'This has stopped being a career highlight.',
          'It is becoming part of what your name means.'] });

  addTimeline(s, `"${credit.title}" passed ${money(gross)} worldwide.${first ? ' Your first.' : ''}`);

  // The studio's letter, and what it opens. Both invitations are offers, not events that happen
  // to you: declining either leaves the milestone exactly where it is.
  const cta = [];
  cta.push({ label: 'Say yes to the show', billion: 'talkshow',
    reply: 'A car on Thursday, and eleven minutes with somebody who has read your file.' });
  cta.push({ label: 'Say yes to the party', billion: 'party',
    reply: 'The whole picture is going, and so is everybody who wants something from it.' });
  cta.push({ label: 'Neither, thank you', billion: 'no',
    reply: 'You said no to both. The film still made a billion euros.' });
  sendMail(s, {
    from: `${studio} · the office of the chairman`, kind: 'contract', tag: 'billion',
    subj: first ? `"${credit.title}" — a billion` : `"${credit.title}" — ${money(gross)}`,
    body: first
      ? `${money(gross)}. There are people who have worked forty years in this business and never been in one of these, and they will all be at the party. There is also a show that wants you on Thursday. Both, either, or neither — the picture is doing what it is doing with or without you now.`
      : `${money(gross)}. You know how this goes by now. The show would like you back and the chairman would like a photograph. Say if you would rather not.`,
    billionFor: credit.title, cta,
  });
  return first ? 'first' : 'again';
}

// Answered from the inbox. Dispatched straight from Email.jsx, the way the tour and festival
// letters are, so meta/email.js does not have to import this file and create a cycle with
// sendMail.
export function answerBillionMail(s, mailId, i) {
  const m = (s.inbox || []).find((x) => x.id === mailId); if (!m) return s;
  const c = (m.cta || [])[i] || (m.cta || [])[0] || {};
  s.inbox = (s.inbox || []).filter((x) => x.id !== mailId);
  if (c.billion === 'party') {
    // The celebration is an ordinary gala, with a reason. social/night.js already knows how to
    // walk a room, approach one person at a time, talk, pitch a picture and run out of evening;
    // there was never anything here to build except the excuse to hold one.
    // The room a studio fills for its own picture: the director, the money, and somebody whose
    // job is your career. social/night.js reads ev.roles where it would otherwise read the
    // tier's — the same guest pool, the same evening, a different invitation list. The actors
    // in the room are chosen by rank as they always were, so the other name on the poster and
    // the people you already know turn up the way they do at any gala.
    const ev = addEvent(s, 'gala', { host: `${studioOf({ title: m.billionFor || '' })} · the chairman`,
      why: `for "${m.billionFor}"`, billion: true, at: (s.year || 0) * 12 + (s.month || 0),
      roles: ['Film Director', 'Studio Producer', 'Manager'] });
    s.lastEvent = `The studio is throwing it, and it is for "${m.billionFor}". ${ev ? 'It is on your calendar.' : ''}`;
  } else if (c.billion === 'talkshow') {
    // The one-off appearance shelf already exists — a brand campaign, a magazine cover,
    // presenting at an awards show. This is that shelf, with the chair kept for you rather than
    // drawn at random, which is why it carries openedByName.
    (s.castingPool = s.castingPool || []).push({
      id: uid(s, 'cast'), title: 'Late Night', type: 'Talk Show', role: 'The guest',
      shelf: 'day', scale: 'oneoff', medium: 'ad', share: 1, stability: 100, feeFactor: 1,
      months: 1, episodes: 0, perEpisode: false, episodeFee: 0, salary: 40000, season: 0,
      audience: 0, director: null, directorId: null, directorBand: null, directorTop: false,
      genre: null, minFame: 0, openedByName: true,
      _expires: (s.year || 0) * 12 + (s.month || 0) + 2,
    });
    s.lastEvent = `They want you on Thursday to talk about "${m.billionFor}". It is in OpenCall.`;
  } else {
    s.lastEvent = `You said no to both. "${m.billionFor}" still made a billion euros, and it will have done next year as well.`;
  }
  return s;
}
