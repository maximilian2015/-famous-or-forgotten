// The press tour. Maxi: "so a promo tour always gives fame? It is a game, after all" — and
// "a tour on a low-budget picture? I don't think so." So: the studio runs one on the
// pictures it paid for — a feature, a blockbuster, a prestige season — and only for the
// name on the poster. It arrives as a letter the month before the picture opens: two weeks
// of junkets, a talk show, a cover. Nothing in it is a button that gives fame. Each stop is
// a roll — charisma, looks, the state of your head, what the papers already think of you —
// and every stop can land, pass, or go wrong. What lands is buzz, and buzz is worth money
// at the opening (the studio's marketing, working) and a little of the noise around your
// name. What goes wrong is a misquote, a clip, a story about the director. Skip it and the
// studio remembers: the opening is quieter, and the trades have a word for actors who do
// not turn up for their own pictures.
import { rint, chance } from '../../engine/rng.js';
import { COST, canAfford, spend, tooTired } from '../../engine/energy.js';
import { addTimeline } from '../../engine/timeline.js';
import { setFame, setRespect } from '../meta/status.js';
import { STUDIOS } from '../world/names.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);

// Who gets one. The studio's money, the studio's tour; nobody tours a short.
export const TOURED = ['feature', 'blockbuster', 'prestige'];
export function toursFor(rel) { return TOURED.includes(rel.scale) && (rel.tier === 'lead' || rel.tier === 'tentpole'); }
function studioOf(rel) { let h = 0; for (const ch of String(rel.title || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return STUDIOS[h % STUDIOS.length]; }

// The letter itself is written by emailTick (meta/email.js) — the tour is a picture's
// business, the post is the post's. This answers it.
export function answerTour(s, m, what) {
  const r = (s.releases || []).find((x) => x.id === m.releaseId);
  if (!r) { s.lastEvent = 'The picture is already out.'; return true; }
  if (what === 'skip') {
    r.tourSkipped = true;
    setRespect(s, (s.respect || 0) - 2);
    s.lastEvent = `You skipped the tour for "${r.title}". The studio noticed. The trades will, too.`;
    addTimeline(s, `Did not do the press for "${r.title}".`, true);
    return true;
  }
  if (!canAfford(s, COST.tour)) { s.lastEvent = tooTired(s, COST.tour); return false; }
  spend(s, COST.tour);
  s.strain = clamp((s.strain || 0) + 3);
  startTour(s, r);
  return true;
}

// ── the stops ─────────────────────────────────────────────────────────────────
// Every stop has a safe way through and a real one. Safe costs nothing and mostly gives
// nothing; real is a roll, and the roll is you.
const STOPS = [
  { id: 'junket', label: 'The junket', text: 'A hotel room, a chair, and the same four questions forty times. A journalist asks what the film is really about.',
    safe: { label: 'Say the lines', blurb: 'The studio wrote them. Nobody quotes them.' },
    real: { label: 'Say something true', blurb: 'A sentence they will print. Which sentence is the question.' } },
  { id: 'show', label: 'The talk show', text: 'Lights, a band, a host who has not seen the film. They ask about the set.',
    safe: { label: 'Be charming', blurb: 'Smile, a story about the weather, out.' },
    real: { label: 'Tell the story about the director', blurb: 'It is a good story. The director is watching.' } },
  { id: 'cover', label: 'The cover', text: 'A studio, a photographer who does not speak, and a wardrobe rail.',
    safe: { label: 'Ask to approve the pictures', blurb: 'Names get to. Everybody else gets laughed at.' },
    real: { label: 'Do the shoot', blurb: 'It is your face. It is their lighting.' } },
];
export function startTour(s, r) {
  s.tour = { releaseId: r.id, title: r.title, stop: 0, buzz: 0, log: [{ text: `The tour for "${r.title}" starts Monday.`, tone: 'note' }], done: false, went: null };
  return s;
}
function say(s, text, tone = 'note') { s.tour.log.push({ text, tone }); }
export function tourChoice(s, choice) {
  const t = s.tour; if (!t || t.done) return s;
  const stop = STOPS[t.stop]; if (!stop) return s;
  const head = 20 + ((s.mental || 50) - 50) * 0.2 - (s.scandal || 0) * 0.15;   // the state of you, and what they already think
  if (stop.id === 'junket') {
    if (choice === 'safe') { if ((s.charisma || 0) >= 60 && chance(25)) { t.buzz += 1; say(s, 'You said the lines so well one of them got printed.', 'good'); } else say(s, 'Forty interviews. Nobody printed a word.', 'note'); }
    else if (chance(head + (s.charisma || 0) * 0.55)) { t.buzz += 2; say(s, 'You said something true. It is the headline on Monday, and it is about the film.', 'good'); }
    else { const sc = rint(2, 4); s.scandal = clamp((s.scandal || 0) + sc); say(s, 'You said something true. They printed half of it. The half travels.', 'bad'); }
  } else if (stop.id === 'show') {
    if (choice === 'safe') { if (chance(15 + (s.looks || 0) * 0.3 + (s.charisma || 0) * 0.3)) { t.buzz += 1; say(s, 'Charming. A clip of you laughing does the rounds.', 'good'); } else say(s, 'Pleasant. Forgotten by the next guest.', 'note'); }
    else if (chance(head + (s.charisma || 0) * 0.5)) { t.buzz += 2; s.media = clamp((s.media || 0) + 4); say(s, 'The story about the director kills. The director laughs, on camera, from the green room.', 'good'); }
    else { setRespect(s, (s.respect || 0) - 2); say(s, 'The story about the director does not land. The director hears about it before you are off the stage.', 'bad'); }
  } else if (stop.id === 'cover') {
    if (choice === 'safe') { if ((s.fame || 0) >= 50) { t.buzz += 1; say(s, 'You approve the pictures. They use the one you chose.', 'good'); } else { s.mental = clamp((s.mental || 50) - 2); say(s, 'You ask for approval. The photographer laughs, once, and shoots what he wants.', 'bad'); } }
    else if (chance(10 + (s.looks || 0) * 0.65)) { t.buzz += 1; setFame(s, (s.fame || 0) + 1); say(s, 'A cover. A good one. It is on the stands the week the picture opens.', 'good'); }
    else { s.mental = clamp((s.mental || 50) - 2); say(s, 'A cover. Not a good one. Your mother rings to ask if you are well.', 'bad'); }
  }
  t.stop += 1;
  if (t.stop >= STOPS.length) endTour(s);
  return s;
}
export function stopNow(s) { const t = s.tour; return t && !t.done ? STOPS[t.stop] : null; }
export function stopsTotal() { return STOPS.length; }
function endTour(s) {
  const t = s.tour; t.done = true;
  t.went = t.buzz >= 4 ? 'good' : t.buzz >= 2 ? 'flat' : 'bad';
  const r = (s.releases || []).find((x) => x.id === t.releaseId);
  if (r) r.tour = { buzz: t.buzz, went: t.went };
  s.media = clamp((s.media || 0) + t.buzz);
  say(s, t.went === 'good' ? `Two weeks, and the picture is a thing people have heard of. Buzz ${t.buzz}.` : t.went === 'flat' ? `Two weeks. It was a tour. Buzz ${t.buzz}.` : `Two weeks, and the only thing anyone remembers is the bit that went wrong. Buzz ${t.buzz}.`, t.went === 'bad' ? 'bad' : 'note');
  s.lastEvent = `The tour for "${t.title}" is done — buzz ${t.buzz}.`;
  addTimeline(s, `Did the press for "${t.title}"${t.went === 'good' ? ' — it landed' : t.went === 'bad' ? ' — it went wrong' : ''}.`);
}
export function closeTour(s) { s.tour = null; return s; }

// What the tour is worth on the night. Read by release.js when the picture opens.
export function tourMultiplier(rel) {
  if (rel.tourSkipped) return 0.92;
  if (rel.tour) return 1 + Math.min(4, rel.tour.buzz) * 0.035;
  return 1;
}
export function tourFame(rel) { return rel.tour && rel.tour.buzz >= 4 ? 1 : 0; }

// The letter, answered from the Email app: the tour starts or is skipped, and the letter
// goes. An answer you could not afford leaves the letter where it was.
export function answerTourMail(s, id, i) {
  const m = (s.inbox || []).find((x) => x.id === id); if (!m) return s;
  const c = m.cta && m.cta[i]; if (!c || !c.tour) return s;
  if (answerTour(s, m, c.tour)) s.inbox = (s.inbox || []).filter((x) => x.id !== id);
  return s;
}
