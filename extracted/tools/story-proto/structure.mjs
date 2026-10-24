// node tools/story-proto/structure.mjs [genre]
// What check.mjs cannot see, because it reads sentences and these are about the STORY:
//
//   reference — every "the X" in what sets it off, what stands in the way and the twist must be
//               somebody or something the story has already brought in: the hero, the place, the
//               incident, or one of the shape's own people (its roles). "The voice knows things"
//               in a story nobody phoned; "turning on your partner" for an officer with none.
//   part      — when the player is not the lead, the part is another person: no role shares its
//               head word with a hero ("the juror who wants it over by lunch" beside "a juror who
//               wants to go home"), and a role whose wording has a gender says so (g), so a man is
//               never handed "the dancer who keeps a gun in her shoe".
//   twice     — the hero is not described doing what the template then has them do ("a daughter
//               who came home" who "comes back"), compared by the root of the word, not the word.
//   genre     — no part is shared by two genres, so a comedy cannot be told with a thriller's half.
//   sequel    — for every part one a shape can make, its part twos: the same hero by name, part one's
//               twist said out loud, a new incident, nothing part one's place could not have, every
//               "the X" known from part one or the shape, and the sentence rules of check.mjs.
// Prints every distinct problem once, with the shape it is in.
import { SHAPES, traitsOf, fits, compose, sequelFor } from './stories.js';
import { lemma, words } from './words.mjs';

const only = process.argv[2];
const text = (o) => (typeof o === 'string' ? o : o.t);
// Things any story may say "the" about without bringing them in first.
const GIVEN = new Set(['truth', 'end', 'morning', 'night', 'day', 'week', 'year', 'time', 'money', 'police', 'world', 'rest', 'others',
  'way', 'answer', 'question', 'moment', 'thing', 'person', 'people', 'one', 'country', 'capital', 'news', 'first', 'last', 'law', 'same', 'whole',
  'past', 'future', 'beginning', 'middle', 'evening', 'spring', 'summer', 'autumn', 'winter', 'weekend', 'sea', 'sun', 'stars', 'dark', 'reason',
  'decision', 'deadline', 'job', 'post', 'radio', 'rain', 'phone', 'news', 'paper', 'papers', 'press', 'crime', 'blame', 'meantime', 'inside', 'order', 'opening', 'hour', 'questions', 'family', 'families', 'place', 'side', 'second', 'month', 'moment', 'safest', 'worst', 'best', 'only', 'other', 'smallest', 'biggest']);
const ADJ = new Set(['old', 'same', 'first', 'last', 'one', 'only', 'whole', 'other', 'real', 'new', 'next', 'wrong', 'little', 'young', 'youngest', 'eldest',
  'oldest', 'final', 'local', 'main', 'key', 'missing', 'whole', 'entire', 'rival', 'dead', 'late', 'night', 'family', 'very', 'right', 'best', 'two', 'three']);
const FUNC = new Set(['who', 'of', 'they', 'is', 'it', 'as', 'to', 'and', 'with', 'before', 'after', 'turns', 'most', 'least', 'back', 'he', 'she', 'that', 'thing', 'ones', 'in', 'on', 'at', 'for', 'was', 'are', 'signed', 'shorter', 'worked', 'were', 'wants', 'likes', 'ever', 'about', 'set', 'four', 'the', 'high', 'split', 'hunting', 'stayed', 'plans', 'already',
  'harder', 'somebody', 'still', 'could', 'lived', 'nobody', 'stop', 'honest', 'has', 'bravest']);
// A noun followed by one of these is being brought in by the phrase itself.
const SELF = new Set(['who', 'whose', 'that', 'which', 'of', 'from', 'across', 'nobody', 'everybody', 'they', 'he', 'she', 'you', 'everyone', 'nobody', 'somebody', 'written', 'sent', 'left', 'booked', 'taken', 'meant', 'kept', 'found', 'made', 'he', 'his', 'her', 'their']);
// What a place brings with it without saying so: a hotel has rooms, a town has streets.
const IMPLIED = { town: ['town', 'street', 'village', 'square', 'pub', 'church', 'shop'], city: ['city', 'street', 'building', 'office', 'station'],
  ward: ['building', 'ward', 'room', 'corridor', 'hospital', 'staff', 'patient', 'record'], studio: ['building', 'studio', 'room', 'microphone', 'audience'],
  hotel: ['building', 'hotel', 'room', 'lobby', 'guest', 'staff'], house: ['house', 'room', 'door', 'kitchen', 'stair', 'attic', 'cellar', 'garden'],
  stage: ['building', 'stage', 'audience', 'hall', 'room', 'seat', 'curtain'], court: ['court', 'room', 'building', 'judge', 'jury', 'trial', 'evidence', 'verdict', 'witness'],
  school: ['building', 'school', 'classroom', 'staff'], block: ['building', 'street', 'stair', 'lift', 'flat'], field: ['field', 'farm', 'road'],
  sea: ['water', 'sea', 'shore', 'tide', 'boat', 'harbour'], road: ['road', 'car', 'driver'], snow: ['snow', 'cold'], space: ['ship', 'station', 'crew'] };
const heads = (t) => {
  const out = []; const w = String(t).toLowerCase().replace(/’s\b|'s\b/g, '').match(/[a-z-]+/g) || [];
  for (let i = 0; i < w.length; i++) if (w[i] === 'the') {
    let j = i + 1; while (j < w.length && ADJ.has(w[j]) && j < i + 3) j++;
    if (w[i + 1] === 'same') continue;                                   // "the same room": shared, not presupposed
    if (SELF.has(w[j + 1]) || /^{/.test(w[j + 1] || '')) continue;       // "the man who…", "the man {they} sent…" bring themselves in
    if (w[j] && !FUNC.has(w[j])) out.push(w[j]);
  }
  return out;
};
// The person a phrase names: the last word before what describes them, the owner of a possessive
// left out — "a miner’s wife who…" is a wife, "the union leader" a leader.
const headOf = (t) => { const np = String(t).toLowerCase().replace(/\{\w+\}/g, ' ').split(/\s(?:who|whose|that|with|on|in|at|from|for|of|and)\s|,/)[0].replace(/\b[a-z-]+[’']s\b/g, ' '); const w = np.match(/[a-z-]+/g) || []; return w.length ? lemma(w[w.length - 1]) : null; };
const knows = (ctx, n) => ctx.has(lemma(n));
const declared = (o) => typeof o === 'object' && !!o.needs;
const GENDERED = /\b(he|she|his|her|him|himself|herself|man|woman|mother|father|son|daughter|brother|sister|widow|widower|wife|husband|girl|boy|king|queen|aunt|uncle|grandmother|grandfather)\b/i;

const found = new Map();      // problem -> shape, so each is printed once
const say = (shape, kind, what) => { const k = `${kind}: ${what}`; if (!found.has(k)) found.set(k, shape.id); };
for (const s of SHAPES.filter((x) => !only || x.genre === only)) {
  const cast = new Set([...s.roles.flatMap((r) => words(text(r)).map(lemma)), ...(s.world || []).map(lemma)]);
  const frame = s.tpl.replace(/\{\w+\}/g, ' ') + ' ' + s.log.replace(/\{\w+\}/g, ' ');
  // reference
  for (const who of s.who) for (const where of s.where) {
    const tr = traitsOf(who, where);
    if (!fits(who, tr) || !fits(where, tr)) continue;
    const base = new Set([...words(who.t + ' ' + where.t + ' ' + frame).map(lemma), ...cast, ...(IMPLIED[where.place] || [])]);
    for (const spark of s.spark.filter((o) => fits(o, tr))) {
      if (!declared(spark)) for (const n of heads(spark.t)) if (!GIVEN.has(n) && !knows(base, n)) say(s, 'reference', `"the ${n}" in "${spark.t}" — nothing brought it in (with "${where.t}")`);
      const after = new Set([...base, ...words(spark.t).map(lemma)]);
      for (const b of s.block.filter((o) => fits(o, tr) && !declared(o))) for (const n of heads(text(b))) if (!GIVEN.has(n) && !knows(after, n)) say(s, 'reference', `"the ${n}" in "${text(b)}" — nothing brought it in (with "${where.t}")`);
      for (const tw of spark.twists.filter((o) => fits(o, tr) && !declared(o) && !declared(spark))) for (const n of heads(text(tw))) if (!GIVEN.has(n) && !knows(after, n)) say(s, 'reference', `"the ${n}" in the twist "${text(tw)}" — nothing brought it in`);
    }
  }
  // part
  for (const r of s.roles) {
    const rt = text(r);
    for (const who of s.who) {
      const shared = words(rt).map(lemma).filter((w) => words(who.t).map(lemma).includes(w) && !['who', 'one', 'person', 'year'].includes(w));
      const head = headOf(rt);
      if (head && head === headOf(who.t)) say(s, 'part', `role "${rt}" could be the hero "${who.t}" (${shared.join(', ')})`);
    }
    if (GENDERED.test(rt.replace(/\{\w+\}/g, '')) && !(typeof r === 'object' && r.g)) say(s, 'part', `role "${rt}" has a gender in its wording and no g`);
  }
  // twice
  for (const who of s.who) for (const where of s.where) {
    const a = new Set(words(who.t).map(lemma)); const b = words(where.t + ' ' + frame).map(lemma).filter((w) => a.has(w));
    if (b.length) say(s, 'twice', `"${who.t}" + "${where.t}" — ${[...new Set(b)].join(', ')}`);
  }
}
// sequel
let seqChecked = 0;
const SENTENCE = [[/[{}]/, 'unfilled token'], [/\b(\w+) \1\b/i, 'word twice'], [/(^|[.!?] )[a-z]/, 'lower-case sentence start'],
  [/\b(he|she) ((never|most|least|really|still|always|just|only|once|ever) )?(have|are|were|do|remember|know|want|need|make|work|talk|love|stay|run|show|stop)\b/i, 'he or she with a plural verb']];
for (const s of SHAPES.filter((x) => !only || x.genre === only)) {
  const cast = new Set([...s.roles.flatMap((r) => words(text(r)).map(lemma)), ...(s.world || []).map(lemma)]);
  for (const who of s.who) for (const where of s.where) for (const spark of s.spark) for (const tw of spark.twists) for (const g of ['m', 'f']) {
    if (who.g && who.g !== g) continue;
    const tr = traitsOf(who, where);
    if (![who, where, spark, tw].every((o) => fits(o, tr))) continue;
    const c = compose(s, who, where, spark, s.block.find((o) => fits(o, tr)), tw, g);
    const first = { shape: s.id, hero: c.hero, twist: c.twist, traits: [...tr], place: where.place, g, used: { spark: spark.t } };
    for (const [title, years, opening] of [['II', 2, null], ['III', 4, 0], ['IV', 1, 1], ['V', 3, 2], ['VI', 6, 3]]) {
      const q = sequelFor(first, { title: s.id + title, years, recent: opening == null ? [] : [{ opening }] });
      const sp = s.spark.find((o) => q.used.spark === o.t); seqChecked++;
      if (sp.t === spark.t && s.spark.filter((o) => fits(o, tr)).length > 1) say(s, 'sequel', `part two repeats the incident "${sp.t}"`);
      if (!fits(sp, tr)) say(s, 'sequel', `"${sp.t}" cannot happen in "${where.t}"`);
      if (!q.synopsis.toLowerCase().includes(c.hero.toLowerCase())) say(s, 'sequel', `the hero is lost: ${q.synopsis}`);
      if (!q.synopsis.toLowerCase().includes(c.twist.replace(/\.$/, '').toLowerCase())) say(s, 'sequel', `part one's twist is not said: ${q.synopsis}`);
      for (const [re, why] of SENTENCE) if (re.test(q.synopsis + ' ' + q.twist)) say(s, 'sequel', `${why}: ${q.synopsis}`);
      const ctx = new Set([...words(who.t + ' ' + where.t + ' ' + spark.t + ' ' + c.twist + ' ' + s.tpl.replace(/\{\w+\}/g, ' ')).map(lemma), ...cast, ...(IMPLIED[where.place] || []), ...words(sp.t).map(lemma)]);
      if (!declared(sp)) for (const n of heads(sp.t)) if (!GIVEN.has(n) && !knows(ctx, n)) say(s, 'sequel', `"the ${n}" in part two's "${sp.t}" — part one never had it (${where.t})`);
    }
  }
}
// genre
const owner = new Map();
for (const s of SHAPES) for (const o of [...s.who, ...s.where, ...s.spark, ...s.block]) {
  const t = text(o); const prev = owner.get(t);
  if (prev && prev.genre !== s.genre && (!only || s.genre === only || prev.genre === only)) say(s, 'genre', `"${t}" is in ${prev.genre} (${prev.id}) and ${s.genre}`);
  owner.set(t, s);
}
if (process.env.NOUNS) { const per = {}; for (const [k, id] of found) { const m = k.match(/^reference: "the ([a-z-]+)"[^—]*— nothing brought it in(?: (with "(.*)"))?/); if (!m) continue; const e = ((per[id] = per[id] || {})[m[1]] = per[id][m[1]] || new Set()); e.add(m[2] ? m[2].slice(0, 40) : 'twist'); }
  for (const [id, ns] of Object.entries(per)) console.log(id + ': ' + Object.entries(ns).map(([n, w]) => n + '(' + w.size + ')').join(' ')); process.exit(0); }
const byKind = {};
for (const [k, id] of found) { const kind = k.split(':')[0]; (byKind[kind] = byKind[kind] || []).push(`  [${id}] ${k.slice(kind.length + 2)}`); }
console.log(`(${seqChecked} part twos written out and read)`);
for (const kind of ['reference', 'part', 'twice', 'genre', 'sequel']) {
  const list = byKind[kind] || [];
  console.log(`\n${kind}: ${list.length}`);
  for (const l of list) console.log(l);
}
