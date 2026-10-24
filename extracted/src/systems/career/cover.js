// Covering for a co-star, as a story with a middle and an end. Maxi/ChatGPT, 24 Oct: one decision on
// a set should be able to change a relationship, come back months later, and change a casting years
// later — and the first proof of that is the cover. Before this, "Cover for them" moved two numbers
// once (career/demands.js) and was never heard of again.
//
// What happens after you cover is decided by the people, not announced:
//   · they straighten out, and owe you;
//   · they miss the call again, and ask again;
//   · it comes out, and the director knows you lied for them;
//   · nothing — the shoot wraps and nobody ever says a word.
// The director's TRAIT decides how a lie lands, and the choice says so before it is made.
//
// What this may not touch (the line ChatGPT drew, and it is right): covering is a lie to one
// person, which is personal. It never moves Standing, insurability or the stability. A door
// closes, when it does, through the existing grudge — with its reason written on it — and it
// opens again through something you do: a letter, or somebody vouching.
//
// A chain in the career stories' sense (meta/stories.js runs it). The odds formula and the
// stories list are repeated here rather than imported: stories.js imports this file to list the
// chain, and importing back would be a cycle.
import { chance } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { setRespect } from '../meta/status.js';
import { keyFor, remember, feltBy } from '../meta/memory.js';

const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const first = (n) => String(n || '').split(' ')[0];
const oddsOf = (s, stat, diff) => 30 + (s[stat] || 0) * 0.6 - (diff - 50);   // = stories.js oddsOf
const setOf = (s, st) => (s.productions || []).find((p) => p.id === st.data.setId) || null;

// How each kind of director takes finding out that an actor lied to them for somebody else.
// Negative is how far they turn; `grudge` is whether it closes their door.
const LIE = {
  perfectionist: { owned: -2, blamed: -1, word: (h) => `is a perfectionist: a lie about the schedule is the one thing ${h.he} takes personally`, grudgeAt: -3 },
  difficult:     { owned: -2, blamed: -2, word: (h) => `is difficult: what you admit, ${h.he} will use`, grudgeAt: -3 },
  diva:          { owned: -1, blamed: -1, word: () => 'minds being lied to more than the lost days', grudgeAt: -4 },
  chill:         { owned: 0,  blamed: -1, word: (h) => `is easy-going: ${h.he} would rather know than not, and will shrug`, grudgeAt: -9 },
};
// he / she, for the director
const pro = (g) => (g === 'f' ? { he: 'she', him: 'her', his: 'her' } : { he: 'he', him: 'him', his: 'his' });
const lieOf = (t) => LIE[t] || LIE.chill;
// The words a choice shows before it is made: what this director is like, from the crew card.
export function coverRisk(dirName, trait, g = 'm') { return `${first(dirName)} ${lieOf(trait).word(pro(g))}.`; }

// What happens next is rolled when the step before it closes, and kept, so the beat that shows
// it reads the same when it is built and when it is answered.
function nextAfterCover(trait, times) {
  const found = 20 + (trait === 'perfectionist' ? 15 : trait === 'difficult' ? 10 : trait === 'chill' ? -10 : 0) + (times - 1) * 25;
  const r = Math.random() * 100;
  if (r < found) return 'found';
  if (times > 1) return r < found + 40 ? 'quiet' : 'straight';
  return r < found + 30 ? 'again' : r < found + 65 ? 'straight' : 'quiet';
}

// From career/demands.js, when you choose to cover.
export function startCover(s, p) {
  const dir = (p.crew || [])[0], co = (p.crew || [])[1];
  if (!dir || !co) return;
  const dk = keyFor(s, dir, p), ck = keyFor(s, co, p);
  remember(s, { act: 'covered', p, about: ck, witnesses: [ck], felt: { [ck]: { felt: 2, why: `that you covered for them when nobody else would` } } });
  if ((s.stories || []).some((x) => x.id === 'cover')) return;      // one at a time; this one is only remembered
  const data = { setId: p.id, title: p.title, scale: p.scale, dir: { key: dk, name: dir.name, trait: dir.trait || 'chill', g: dir.gender === 'female' ? 'f' : 'm' },
    co: { key: ck, name: co.name }, times: 1 };
  data.next = nextAfterCover(data.dir.trait, 1);
  (s.stories = s.stories || []).push({ id: 'cover', beat: data.next, due: stamp(s) + 1, since: stamp(s), data });
}

// The director and the co-star, on the set if it is still shooting and in your phone either way.
function shift(s, st, who, felt) {
  const p = setOf(s, st); const c = p && (p.crew || []).find((x) => x.name === st.data[who].name);
  if (c) c.bond = clamp((c.bond ?? 40) + felt * 6);
  const id = String(st.data[who].key || '').startsWith('p:') ? st.data[who].key.slice(2) : null;
  const person = id && (s.people || []).find((x) => x.id === id);
  // the phone says what the set says — a director who just learned you lied is not 'warm' anywhere
  if (person) person.relationship = c ? c.bond : clamp((person.relationship ?? 40) + felt * 6);
}
function grudge(s, st, why) {
  (s.grudges = s.grudges || []).push({ who: st.data.dir.name, title: st.data.title, scale: st.data.scale, since: stamp(s), until: stamp(s) + 120, opened: true, why });
}
const say = (t, good) => ({ t, good });

export const COVER = {
  title: 'The cover', cooldown: 0,
  start: () => null,                                     // started by startCover, never by a roll
  status: (s, st) => (st.beat === 'amends' ? `${first(st.data.dir.name)} has not forgotten ${st.data.title}.` : `You covered for ${first(st.data.co.name)} on ${st.data.title}.`),
  beats: {
    straight: {
      build: (s, st) => ({ speaker: st.data.co.name, text: `${first(st.data.co.name)} found you after the wrap on Friday. On time every day since, and sober. "I owe you one," they said, and meant it.`,
        choices: [{ label: 'Keep it between you', shows: { more: [say(`${first(st.data.co.name)} owes you one`, true)] },
          apply: () => { remember(s, { act: 'straightened out', p: setOf(s, st) || { title: st.data.title }, about: st.data.co.key, felt: { [st.data.co.key]: { felt: 1, why: 'that you covered for them, and that it worked' } } });
            shift(s, st, 'co', 1);
            return { reply: 'Nobody else ever knows. That is the point of it.', end: true }; } }] }) },
    again: {
      build: (s, st) => {
        const d = st.data.dir;
        return { speaker: st.data.co.name, text: `${first(st.data.co.name)} missed the call again this morning and is asking you to cover one more time. ${first(d.name)} has started asking where they are.`,
          choices: [
            { label: 'Cover again', hint: coverRisk(d.name, d.trait, d.g), shows: { more: [say(`${first(st.data.co.name)} trusts you more`, true), say(`the more you cover, the likelier ${first(d.name)} finds out`, false)] },
              apply: () => { st.data.times = 2; remember(s, { act: 'covered again', p: setOf(s, st) || { title: st.data.title }, about: st.data.co.key, felt: { [st.data.co.key]: { felt: 1, why: 'that you covered for them twice' } } });
                shift(s, st, 'co', 1); st.data.next = nextAfterCover(d.trait, 2);
                return { reply: 'You run the lines alone again. It is a long week.', next: { beat: st.data.next, inMonths: 1 } }; } },
            { label: 'Tell the first AD now', hint: `${first(d.name)} hears it from you. ${first(st.data.co.name)} will know who.`,
              shows: { more: [say(`${first(st.data.co.name)} will not forgive it`, false), say(`${first(d.name)} trusts you more for saying it`, true)] },
              apply: () => { remember(s, { act: 'told', p: setOf(s, st) || { title: st.data.title }, about: st.data.co.key, witnesses: [d.key],
                felt: { [st.data.co.key]: { felt: -3, why: 'that you told the first AD about them' }, [d.key]: { felt: 1, why: `that you told ${pro(d.g).him} the truth, late but yourself` } } });
                shift(s, st, 'co', -3); shift(s, st, 'dir', 1);
                return { reply: 'It is handled by Thursday. The set runs again, and one person on it has stopped saying good morning.', end: true }; } },
            { label: 'Stay out of it', hint: 'It is not your set to run — and the first week is still a lie.',
              shows: { more: [say('it may still come out that you covered the first time', false)] },
              apply: () => { st.data.next = chance(50) ? 'found' : 'quiet'; return { reply: 'You say you have not seen them. Which is true this time.', next: { beat: st.data.next, inMonths: 1 } }; } },
          ] };
      } },
    found: {
      build: (s, st) => {
        const d = st.data.dir, L = lieOf(d.trait), twice = (st.data.times || 1) > 1, h = pro(d.g);
        const owned = L.owned - (twice ? 1 : 0), blamed = L.blamed - (twice ? 1 : 0);
        const before = feltBy(s, d.key);
        const grudges = (n) => before + n <= L.grudgeAt;
        const closes = (n) => (grudges(n) ? [say(`${first(d.name)} never works with you again — until you put it right`, false)] : []);
        return { speaker: d.name, text: `${first(d.name)} knows. Somebody on the crew told it straight: the ${twice ? 'two weeks' : 'fortnight'} you ran the lines alone, the mornings you said ${first(st.data.co.name)} was ill. ${coverRisk(d.name, d.trait, d.g)}`,
          choices: [
            { label: 'Own it', hint: `The truth, all of it, before ${h.he} has to ask.`,
              shows: { more: [owned < 0 ? say(`${first(d.name)} trusts you less, and remembers why`, false) : say(`${first(d.name)} shrugs it off`, true), ...closes(owned)] },
              apply: () => { remember(s, { act: 'the cover came out', p: setOf(s, st) || { title: st.data.title }, about: st.data.co.key, witnesses: [d.key],
                felt: { [d.key]: { felt: owned, why: `that you lied to ${h.him} for ${st.data.co.name}, and owned it when it came out` } } });
                shift(s, st, 'dir', owned);
                const shut = grudges(owned); if (shut) grudge(s, st, `you lied to ${h.him} for ${st.data.co.name} on ${st.data.title}`);
                return { reply: owned < 0 ? `You tell it straight. ${first(d.name)} listens to all of it and says thank you for the truth, which is not the same as forgiving it.` : `${first(d.name)} hears you out and laughs. "Next time just tell me."`,
                  ...(shut ? { next: { beat: 'amends', inMonths: 18 } } : { end: true }) }; } },
            { label: `Say it was ${first(st.data.co.name)}'s idea`, hint: `${first(d.name)} hears less about you. ${first(st.data.co.name)} hears all of it.`,
              shows: { more: [say(`${first(st.data.co.name)} will not forgive it`, false), blamed < 0 ? say(`${first(d.name)} trusts you less`, false) : say(`${first(d.name)} lets it go`, true), ...closes(blamed)] },
              apply: () => { remember(s, { act: 'blamed the co-star', p: setOf(s, st) || { title: st.data.title }, about: st.data.co.key, witnesses: [d.key],
                felt: { [d.key]: { felt: blamed, why: `that you lied to ${h.him} for ${st.data.co.name}` }, [st.data.co.key]: { felt: -3, why: 'that you put it all on them when it came out' } } });
                shift(s, st, 'dir', blamed); shift(s, st, 'co', -3);
                const shut = grudges(blamed); if (shut) grudge(s, st, `you lied to ${h.him} for ${st.data.co.name} on ${st.data.title}`);
                return { reply: `${first(st.data.co.name)} hears it from the first AD by lunch.`, ...(shut ? { next: { beat: 'amends', inMonths: 18 } } : { end: true }) }; } },
          ] };
      } },
    quiet: {
      build: (s, st) => ({ speaker: st.data.title, text: `The shoot moved on. Nobody ever said a word about those mornings, and ${first(st.data.co.name)} never mentioned it either.`,
        choices: [{ label: 'Let it go', shows: {}, apply: () => ({ reply: 'It is the kind of thing that only two people know, and one of them has forgotten.', end: true }) }] }) },
    // The way back. A year and a half later, the director's name comes up again.
    amends: {
      build: (s, st) => {
        const d = st.data.dir, h = pro(d.g);
        const voice = (s.people || []).find((x) => (x.industryWeight || 0) >= 80 && (x.relationship || 0) >= 60 && x.name !== d.name && !x.cold);
        const odds = Math.round(Math.max(5, Math.min(95, oddsOf(s, 'charisma', 60))));
        const choices = [
          { label: `Write to ${h.him}`, hint: 'Charisma. A door, or a closed one.',
            shows: { odds, stat: 'charisma', good: { more: [say('the grudge is over', true)] }, bad: { more: [say(`${first(d.name)} does not answer`, false)] } },
            apply: () => {
              if (chance(odds)) { lift(s, st); return { reply: `${first(d.name)} writes back in a week. Two lines. The second one is "come in and read for it".`, end: true }; }
              return { reply: 'You write it twice and send the shorter one. Nothing comes back.', end: true };
            } },
        ];
        if (voice) choices.push({ label: `Ask ${first(voice.name)} to put in a word`, hint: `Somebody ${first(d.name)} listens to. It costs you a favour.`,
          shows: { fx: { respect: -2 }, more: [say('the grudge is over', true)] },
          apply: () => { setRespect(s, (s.respect || 0) - 2); lift(s, st, voice.name); return { reply: `${first(voice.name)} makes one phone call. ${first(d.name)} says ${h.he} will think about it, which from ${h.him} is yes.`, end: true }; } });
        choices.push({ label: 'Let it lie', shows: { more: [say(`the grudge stays: ${first(d.name)} will not call`, false)] }, apply: () => ({ reply: 'You let it lie.', end: true }) });
        return { speaker: 'Your agent', text: `${d.name} is casting again. Your name came up in the room, and the room went quiet: "${st.data.title}". ${h.he === 'she' ? 'She' : 'He'} has not forgotten.`, choices };
      } },
  },
};
function lift(s, st, voice) {
  const d = st.data.dir;
  s.grudges = (s.grudges || []).filter((g) => !(g.who === d.name && g.title === st.data.title));
  remember(s, { act: voice ? 'somebody vouched' : 'put it right', p: { title: st.data.title }, about: d.key,
    felt: { [d.key]: { felt: 2, why: voice ? `that ${voice} vouched for you afterwards` : `that you wrote to ${pro(d.g).him} afterwards` } } });
  shift(s, st, 'dir', 2);
  addTimeline(s, `${d.name} and you are speaking again, after ${st.data.title}.`);
}
