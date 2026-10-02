// What a shoot is like in the months when nothing is decided.
//
// Maxi, six months into a picture with a card that said "that was today, the next one is not
// this month": "оно ж скучно." It was. The month is a stance chosen once, the big days are one
// to three scenes across the whole shoot, and everything between them was a progress bar with
// a tick next to it. A six-month film was two interesting months and four blank ones.
//
// The answer is not more buttons — that is the calculator the stance was built to kill, and a
// relayed note put the rule well: "не каждый фильм должен быть драмой на площадке. Иногда
// должно быть: smooth shoot, everybody competent, wrapped three days early." The answer is that
// the blank months should be a SHOOT rather than a blank. Things happen on a set every week and
// almost none of them are decisions: the schedule slips, a location falls through, somebody is
// late every morning for a fortnight, the director gets the shot at two in the morning and the
// whole unit goes home happy. Nobody asks the actor about any of it. It is still what the film
// was like, and at wrap it is what you remember.
//
// So: one small thing, some months, reported and not decided. It nudges a number, it goes in the
// log, and career/production.js onSetStory reads the log at wrap. No clicks are added anywhere.
import { rint, chance } from '../../engine/rng.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const dir = (p) => ((p && p.crew) || [])[0] || null;
// Eight ways to say that nothing happened, because hearing the same sentence six months
// running is its own kind of nothing.
const QUIET = [
  (p) => `A quiet month on "${p.title}". The work got done and nobody will remember a day of it.`,
  (p) => 'Five days a week, the pages that were on the call sheet, and home. Some months are the job.',
  (p) => `Nothing on "${p.title}" that anybody will tell a story about. The schedule held.`,
  (p) => 'A competent month. Everybody knew their lines and the van left on time.',
  (p) => `${dir(p) ? dir(p).name : 'The director'} got what they came for, four weeks running, without raising their voice once.`,
  (p) => 'Coverage, inserts, and a day in a car park that is meant to be a different car park. This is most of it.',
  (p) => 'Rain cover twice and neither time was it needed. A month of the ordinary kind.',
  (p) => `Four weeks of "${p.title}" that will be eleven minutes of it.`,
];
// Not the same one twice running: hearing the identical sentence two months in a row is how a
// quiet month goes back to being a blank one.
const pickQuiet = (p) => {
  const i = Math.floor(Math.random() * QUIET.length);
  const j = i === p._lastQuiet ? (i + 1) % QUIET.length : i;
  p._lastQuiet = j;
  return QUIET[j](p);
};
const co = (p) => ((p && p.crew) || [])[1] || null;

// Each one: a line, and what it costs or gives. `keep` is what the wrap remembers.
const DAYS = [
  // ── the ordinary friction ───────────────────────────────────────────────────
  { id: 'weather', w: 5, line: (p) => `Four days of rain they did not have. "${p.title}" is behind and everybody knows whose fault it is not.`,
    fx: (s, p) => { p.stability = clamp((p.stability ?? 70) - rint(3, 7)); p.lostDays = (p.lostDays || 0) + rint(2, 5); },
    keep: 'The weather took four days nobody had.' },
  { id: 'location', w: 4, line: () => 'The location fell through on Thursday. They have rewritten it into a corridor and nobody is pretending that is better.',
    fx: (s, p) => { p.stability = clamp((p.stability ?? 70) - rint(2, 6)); p.meter = clamp((p.meter || 20) - rint(1, 3)); },
    keep: 'A location fell through and the scene happened in a corridor instead.' },
  { id: 'pages', w: 5, line: (p) => `New pages arrived on Tuesday for a scene you shot on Monday. ${dir(p) ? dir(p).name : 'The director'} says they are better. They are not worse.`,
    fx: (s, p) => { p.meter = clamp((p.meter || 20) + rint(-2, 4)); } },
  { id: 'late', w: 4, line: (p) => `${co(p) ? co(p).name : 'Your co-star'} has been forty minutes late every morning for a fortnight, and the unit has stopped mentioning it.`,
    fx: (s, p) => { const c = co(p); if (c) c.bond = clamp((c.bond || 40) - rint(2, 5)); p.stability = clamp((p.stability ?? 70) - rint(1, 4)); },
    keep: (p) => `${co(p) ? co(p).name : 'Your co-star'} was late every morning for a fortnight.`, needs: (p) => !!co(p) },
  { id: 'money', w: 3, line: () => 'Somebody from the money came down for two days and watched the monitor with their arms folded. Nothing was said and the schedule tightened on Monday.',
    fx: (s, p) => { p.stability = clamp((p.stability ?? 70) - rint(2, 5)); } },
  { id: 'fired', w: 2, line: () => 'The first AD was replaced between a Friday and a Monday and nobody has explained why. The new one is faster and the set is quieter.',
    fx: (s, p) => { p.stability = clamp((p.stability ?? 70) + rint(1, 5)); } },

  // ── the good weeks ──────────────────────────────────────────────────────────
  { id: 'twoam', w: 4, line: (p) => `${dir(p) ? dir(p).name : 'The director'} got the shot at two in the morning and the whole unit went home knowing it. Those nights are why people do this.`,
    fx: (s, p) => { p.meter = clamp((p.meter || 20) + rint(2, 5)); const d = dir(p); if (d) d.bond = clamp((d.bond || 40) + rint(2, 5)); },
    keep: 'There was a night at two in the morning that the whole unit went home talking about.' },
  { id: 'ahead', w: 3, line: (p) => `A clean week. "${p.title}" is a day and a half ahead and the producers have stopped ringing.`,
    fx: (s, p) => { p.stability = clamp((p.stability ?? 70) + rint(3, 7)); } },
  { id: 'drink', w: 4, line: () => 'Somebody had a birthday and the whole unit ended up in the same bar until two. It is a different set afterwards.',
    fx: (s, p) => { for (const c of p.crew || []) c.bond = clamp((c.bond || 40) + rint(1, 4)); },
    keep: 'There was a night in a bar that made it a different set afterwards.' },
  { id: 'chemistry', w: 3, line: (p) => `You and ${co(p) ? co(p).name : 'your co-star'} found something in a scene nobody expected much from, and they shot it twice more just to have it.`,
    fx: (s, p) => { const c = co(p); if (c) c.bond = clamp((c.bond || 40) + rint(3, 7)); p.meter = clamp((p.meter || 20) + rint(1, 4)); },
    keep: (p) => `You and ${co(p) ? co(p).name : 'your co-star'} found something nobody expected.`, needs: (p) => !!co(p) },

  // ── the ones that are about you ─────────────────────────────────────────────
  { id: 'watching', w: 3, line: (p) => `${dir(p) ? dir(p).name : 'The director'} has started watching your takes twice. It is not clear yet whether that is good.`,
    fx: (s, p) => { const d = dir(p); if (d) d.bond = clamp((d.bond || 40) + rint(-3, 6)); } },
  { id: 'cut', w: 3, line: () => 'The scene you were looking forward to has gone. Schedule, they say, and it is probably true.',
    fx: (s, p) => { p.meter = clamp((p.meter || 20) - rint(1, 4)); s.mental = clamp((s.mental || 50) - rint(1, 3)); } },
  { id: 'tired', w: 3, line: () => 'Six-day weeks, and the second unit is behind so the sixth day is a long one. You are sleeping badly.',
    fx: (s, p) => { s.strain = clamp((s.strain || 0) + rint(3, 7)); } },
  // The fallback, and most months are this one. It is not an absence of an event: it is what
  // most of a shoot is, and saying so is what makes the other ones land.
  { id: 'quiet', w: 0, line: (p) => pickQuiet(p), fx: () => {} },
];

// Not every month, and never two months running — a shoot that has something every month is a
// disaster movie, and the rare catastrophe only reads as one when the ordinary weeks are quiet.
export function setLife(s, p) {
  if (!p || (p.prepLeft || 0) > 0 || p.paused) return null;
  const now = (s.year || 0) * 12 + (s.month || 0);
  // A month ALWAYS says what it was like, and most of the time what it was like is nothing
  // much. Returning null for the quiet ones left the card saying the same four lines of
  // mechanics every month — Maxi, looking at the new build: "так всё осталось". A shoot that
  // reports two months in five is not a shoot that reports.
  const quiet = DAYS.find((d) => d.id === 'quiet');
  // Never two notable months running: the rare catastrophe only reads as one against quiet weeks.
  if (p._lifeMonth === now - 1) { p._lastLife = 'quiet'; return quiet.line(p); }
  // A longer shoot has more weeks in it for something to happen in.
  if (!chance((p.months || 4) >= 5 ? 62 : 48)) { p._lastLife = 'quiet'; return quiet.line(p); }
  const pool = DAYS.filter((d) => d.id !== 'quiet' && (!d.needs || d.needs(p)) && d.id !== p._lastLife);
  if (!pool.length) { p._lastLife = 'quiet'; return quiet.line(p); }
  const total = pool.reduce((n, d) => n + d.w, 0);
  let r = Math.random() * total, got = pool[0];
  for (const d of pool) { r -= d.w; if (r <= 0) { got = d; break; } }
  p._lifeMonth = now; p._lastLife = got.id;
  got.fx(s, p);
  const line = got.line(p);
  if (got.keep) (p._setLog = p._setLog || []).push(typeof got.keep === 'function' ? got.keep(p) : got.keep);
  return line;
}
