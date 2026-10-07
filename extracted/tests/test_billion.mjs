// A thousand million euros, which is not a verdict.
//
// The commercial ladder answers "how well did this do against what it cost", and it answers it
// correctly: a €220m tentpole on an event campaign needs €578m to break even and €1.155bn to be
// a smash — 5.3× its negative, which is roughly what the trade means by the word. So a
// billion-euro picture can legitimately come back as PROFITABLE. Maxi, looking at exactly that:
// "€1.163bn кассы не должно заканчиваться просто надписью SMASH."
//
// The answer is not a fifth verdict or a lower bar. A billion is an absolute size, not a return
// on investment: four or five pictures a year reach it and everybody hears about all of them,
// whether or not the studio made money on them. So it sits beside the verdict.
import { markBillion, answerBillionMail, BILLION } from '../src/systems/career/billion.js';
import { verdictOf, breakEvenFor } from '../src/systems/career/release.js';
import fs from 'fs';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

const st = () => ({ year: 2066, month: 4, fame: 80, respect: 55, media: 20, cash: 1e6,
  inbox: [], timeline: [], events: [], castingPool: [], people: [], moments: [], stage: 'career' });
const cr = (over = {}) => ({ title: 'Midnight Talker', scale: 'blockbuster', campaignTier: 'event',
  rating: 77, audience: 80, year: 2066, ...over });

// ── the line is where it says it is ──────────────────────────────────────────
{
  const s = st(), c = cr({ boxOffice: 999900000 });
  ok('€999.9m is not a billion', markBillion(s, c) === null && !c.billion && !s.billions, String(c.boxOffice));
  const s2 = st(), c2 = cr({ boxOffice: 1000000000 });
  ok('€1.000bn is', markBillion(s2, c2) === 'first' && c2.billion === true && s2.billions === 1);
  ok('and the line is exactly a thousand million', BILLION === 1e9);
}

// ── only after the run has closed ────────────────────────────────────────────
// A credit exists the night it opens and carries no money until the run ends. Nothing with no
// box office on it can have reached anything.
{
  const s = st();
  ok('a film that has not opened cannot be in it', markBillion(s, cr({})) === null && !s.billions);
  ok('nor one still playing with nothing counted yet', markBillion(s, cr({ boxOffice: 0 })) === null && !s.billions);
}

// ── once per picture, however often anybody asks ─────────────────────────────
{
  const s = st(), c = cr({ boxOffice: 1.2e9 });
  markBillion(s, c);
  const after = s.billions;
  for (let i = 0; i < 5; i++) markBillion(s, c);
  ok('the same picture cannot be counted twice', s.billions === after && after === 1, String(s.billions));
}

// ── the first one is not the fourth ──────────────────────────────────────────
{
  const s = st();
  markBillion(s, cr({ boxOffice: 1.1e9, title: 'One' }));
  const first = s.bigMoment;
  s.bigMoment = null; s.moments = [];
  markBillion(s, cr({ boxOffice: 1.4e9, title: 'Two' }));
  const second = s.bigMoment;
  // One id, because the screen switches its own artwork on it; what tells them apart is the
  // flag, and what matters is that they do not say the same thing.
  ok('the first billion is marked as the first', first && first.id === 'billion' && first.first === true, first ? JSON.stringify({ id: first.id, first: first.first }) : 'nothing');
  ok('and the second knows which number it is', second && second.id === 'billion' && second.nth === 2 && !second.first, second ? JSON.stringify({ nth: second.nth, first: second.first }) : 'nothing');
  ok('they do not say the same thing', first.body !== second.body);
  ok('and both actually have words on them', (first.body || '').length > 40 && (second.body || '').length > 40,
    `${(first.body || '').length} / ${(second.body || '').length}`);
  ok('and the counter knows which one this is', s.billions === 2, String(s.billions));
}

// ── it is not a verdict, and it does not touch what is ───────────────────────
{
  const s = st();
  const bar = breakEvenFor({ scale: 'blockbuster', campaignTier: 'event' });
  const gross = 1.05e9;                       // 1.82x — profitable, not a smash
  const c = cr({ boxOffice: gross });
  const before = { respect: s.respect, fame: s.fame };
  markBillion(s, c);
  const v = verdictOf({ scale: 'blockbuster', campaignTier: 'event', rating: 77, boxOffice: gross, type: 'Blockbuster' });
  ok('a picture can be profitable and in the billion club at once', v === 'profitable' && c.billion === true,
    `${v} at ${(gross / bar).toFixed(2)}x`);
  ok('and it grants no standing', s.respect === before.respect, `${before.respect} → ${s.respect}`);
  ok('and no fame of its own', s.fame === before.fame, `${before.fame} → ${s.fame}`);
}

// ── the invitations are offers, and refusing them costs the milestone nothing ─
{
  const s = st();
  markBillion(s, cr({ boxOffice: 1.3e9 }));
  ok('the studio writes', (s.inbox || []).length === 1, String((s.inbox || []).length));
  const m = s.inbox[0];
  // Four, because the letter says "both, either, or neither" and the controls have to mean it.
  // They offered three, and the playtest is what noticed the copy promising what the buttons
  // refused.
  ok('and offers both, either, or neither — all four', (m.cta || []).length === 4
    && ['both', 'talkshow', 'party', 'no'].every((k) => m.cta.some((c) => c.billion === k)),
    (m.cta || []).map((c) => c.billion).join(', '));
  const i = m.cta.findIndex((c) => c.billion === 'no');
  answerBillionMail(s, m.id, i);
  ok('saying no to both leaves the milestone where it was', s.billions === 1);
  ok('and leaves nothing on the calendar', (s.events || []).length === 0 && (s.castingPool || []).length === 0);
  ok('and the letter is answered rather than sitting there', (s.inbox || []).length === 0);
}

{
  const s = st();
  markBillion(s, cr({ boxOffice: 1.3e9 }));
  answerBillionMail(s, s.inbox[0].id, s.inbox[0].cta.findIndex((c) => c.billion === 'both'));
  ok('and saying both gets both', (s.events || []).length === 1 && (s.castingPool || []).length === 1,
    `${(s.events || []).length} nights, ${(s.castingPool || []).length} appearances`);
  ok('and the card says what the night is, not which tier it was built from',
    /night for/i.test(((s.events || [])[0] || {}).label || ''), ((s.events || [])[0] || {}).label || 'no label');
  ok('and why it is being held', !!((s.events || [])[0] || {}).why);
}

// ── and saying yes reuses what already exists ────────────────────────────────
{
  const s = st();
  markBillion(s, cr({ boxOffice: 1.3e9 }));
  answerBillionMail(s, s.inbox[0].id, s.inbox[0].cta.findIndex((c) => c.billion === 'party'));
  const ev = (s.events || [])[0];
  ok('the party is an ordinary gala with a reason, not a new system', !!ev && ev.tier === 'gala' && ev.billion === true,
    ev ? ev.tier : 'no event');

  const t = st();
  markBillion(t, cr({ boxOffice: 1.3e9 }));
  answerBillionMail(t, t.inbox[0].id, t.inbox[0].cta.findIndex((c) => c.billion === 'talkshow'));
  const job = (t.castingPool || [])[0];
  ok('the show is the one-off appearance shelf, with the chair kept for you', !!job && job.type === 'Talk Show'
    && job.scale === 'oneoff' && job.shelf === 'day' && job.openedByName === true, job ? job.type : 'nothing');
}

// ── the room knows whose party it is ─────────────────────────────────────────
// Not a new social system: social/night.js reads ev.roles where it would otherwise read the
// tier's, so a studio holding a party for its own picture fills it with the director and the
// money rather than whoever a gala happens to generate.
{
  const s = st();
  markBillion(s, cr({ boxOffice: 1.3e9 }));
  answerBillionMail(s, s.inbox[0].id, s.inbox[0].cta.findIndex((c) => c.billion === 'party'));
  const ev = (s.events || [])[0];
  ok('the party has a guest list of its own', Array.isArray(ev.roles) && ev.roles.includes('Film Director') && ev.roles.includes('Studio Producer'), ev.roles ? ev.roles.join(', ') : 'none');
  ok('and a music producer is not on it', !(ev.roles || []).includes('Music Producer'));
}

// ── and no number a balance change could make false ──────────────────────────
// A measured frequency belongs in a probe. This project spent a week finding out how easily
// one turns out to be wrong, and a sentence on a screen cannot be re-measured.
{
  const src = fs.readFileSync(new URL('../src/systems/career/billion.js', import.meta.url), 'utf8');
  const copy = src.slice(src.indexOf('const milestone = first'), src.indexOf('const beat ='));
  // And the words must be in the field the screen reads. BigMoment renders `body` and only looks
  // at `lines` for a contract and an awards night, so three good sentences in `lines` show as
  // nothing at all — which is what the first version did, through a green suite.
  ok('the copy is in the field the screen renders', /body:/.test(copy) && !/lines:/.test(copy));
  // And the same thing asked of the real objects rather than the source, so it holds however
  // the file is rearranged.
  {
    const t = st();
    markBillion(t, cr({ boxOffice: 1.2e9 }));
    const shown = [t.bigMoment, ...(t.moments || [])];
    ok('every screen it puts up has words in the field that gets rendered',
      shown.every((x) => typeof x.body === 'string' && x.body.length > 40 && !x.lines),
      shown.map((x) => (x.body ? x.body.length : 'no body')).join(', '));
  }
  ok('the milestone copy quotes no frequency', !/(four|five|six|seven|ten|[0-9]+)s+(pictures|films|movies)s+as+year/i.test(copy));
}

// ── the beat does not get interrupted ────────────────────────────────────────
// Played by hand, the milestone arrived AFTER a director taking me aside and an agent talking
// about my age. showMoment is a plain queue — push to the back, shift from the front — so the
// billion was simply last in line, and a career event that turns up fourth is not one.
//
// The order asserted here is the order a player sees: the screen, then the letter it is about,
// and only then whatever else was waiting. Nothing general was built for that; billion.js puts
// its own two screens at the front and leaves the rest of the queue in its own order.
{
  const s = st();
  // Two unrelated things already waiting, one of them on screen, exactly as in the playtest.
  s.bigMoment = { id: 'other-a', title: 'A director takes you aside' };
  s.moments = [{ id: 'other-b', title: 'Your agent, over lunch' }];
  markBillion(s, cr({ boxOffice: 1.3e9 }));
  // Drain it the way App.jsx does: whatever is up, then the front of the queue.
  const seen = [];
  for (let k = 0; k < 8 && s.bigMoment; k++) {
    seen.push(s.bigMoment.letter ? `${s.bigMoment.id}:letter` : s.bigMoment.id);
    s.bigMoment = (s.moments && s.moments.length) ? s.moments.shift() : null;
  }
  ok('whatever was already on screen is not snatched away', seen[0] === 'other-a', seen.join(' → '));
  ok('the billion comes next, before anything else that was waiting', seen[1] === 'billion', seen.join(' → '));
  ok('and its letter comes straight after it, with nothing between', seen[2] === 'billion:letter', seen.join(' → '));
  ok('and only then the rest of the queue, in its own order', seen[3] === 'other-b', seen.join(' → '));
  console.log(`      order: ${seen.join(' → ')}`);
}

// And with nothing on screen at all, the billion is simply first.
{
  const s = st();
  s.moments = [{ id: 'other-c', title: 'Something else' }];
  markBillion(s, cr({ boxOffice: 1.3e9 }));
  const seen = [];
  for (let k = 0; k < 6 && s.bigMoment; k++) {
    seen.push(s.bigMoment.letter ? `${s.bigMoment.id}:letter` : s.bigMoment.id);
    s.bigMoment = (s.moments && s.moments.length) ? s.moments.shift() : null;
  }
  ok('on an empty screen the billion goes first', seen.join(' → ') === 'billion → billion:letter → other-c', seen.join(' → '));
}
console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
