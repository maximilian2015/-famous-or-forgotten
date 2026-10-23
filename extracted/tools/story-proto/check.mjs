// node tools/story-proto/check.mjs [genre]
// Every combination every shape of a genre can make, written out for both a he and a she, and
// read for the ways a sentence built from parts goes wrong: a token left unfilled, a word twice in
// a row, a plural hero (a shape or hero marked pl) with a singular verb (or the other way), the same content word twice in the
// logline, a sentence that starts in lower case. Combinations a part's `needs` rules out are not
// counted: storyFor never makes them. Prints the count per shape and the first examples.
import { SHAPES, compose, traitsOf, fits } from './stories.js';

const genre = process.argv[2] || 'Comedy';
const SING_VERB = /^(has|is|loses|gets|takes|comes|moves|arrives|lives|inherits|agrees|wants)\b/;
const PLUR_VERB = /^(have|are|decide|plan|need)\b/;
const STOP = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'has', 'his', 'her', 'their', 'that', 'who', 'one', 'it', 'at', 'by', 'from', 'when', 'then', 'nobody', 'they', 'he', 'she', 'him', 'them', 'was', 'are', 'have', 'been', 'not', 'into', 'what', 'never', 'where', 'none', 'there', 'every', 'only', 'before', 'after', 'about', 'than', 'were', 'which', 'this', 'over']);
let total = 0, bad = 0;
for (const s of SHAPES.filter((x) => x.genre === genre)) {
  let n = 0; const problems = [];
  for (const who of s.who) for (const where of s.where) for (const spark of s.spark) for (const block of s.block) for (const tw of spark.twists) for (const g of ['m', 'f']) {
    if (who.g && who.g !== g) continue;
    const tr = traitsOf(who, where);
    if (![who, where, spark, block, tw].every((o) => fits(o, tr))) continue;
    n++;
    const c = compose(s, who, where, spark, block, tw, g);
    const plural = !!(s.pl || who.pl);
    const all = [c.logline, c.synopsis, c.twist].join(' ');
    const why = [];
    if (/[{}]/.test(all)) why.push('unfilled token');
    if (/\b(he|she) ((never|most|least|really|actually|still|always|just|only|once|ever) )?(have|are|were|do|don’t|remember|know|want|need|make|work|talk|love|believe|stay|run|show|stop|say|think|go|come|see|take)\b/i.test(all)) why.push('he or she with a plural verb');
    if (/\b(\w+) \1\b/i.test(all)) why.push('word twice');
    if (plural && SING_VERB.test(where.t)) why.push('plural hero, singular verb');
    if (!plural && PLUR_VERB.test(where.t)) why.push('singular hero, plural verb');
    if (plural && /\{(Who|who)\} (has|is|moves|comes|takes|arrives|lives|gets|runs)\b/.test(s.tpl + s.log)) why.push('plural hero, singular verb in the template');
    if (plural && /\{(they|them|their|themselves|They|Them|Their)\}/.test([who.t, where.t, spark.t, typeof block === 'string' ? block : block.t, typeof tw === 'string' ? tw : tw.t].join(' '))) why.push('plural hero called he or she');
    const words = c.logline.toLowerCase().match(/[a-z']{4,}/g) || [];
    const seen = new Set(); for (const w of words) { if (STOP.has(w)) continue; if (seen.has(w)) { why.push(`"${w}" twice in the logline`); break; } seen.add(w); }
    if (/(^|[.!?] )[a-z]/.test(c.synopsis)) why.push('lower-case sentence start');
    if (why.length) problems.push({ why: why.join(', '), text: c.synopsis });
  }
  total += n; bad += problems.length;
  console.log(`${s.id.padEnd(14)} ${String(n).padStart(4)} combinations, ${problems.length} with a problem`);
  for (const p of problems.slice(0, 3)) console.log(`     · ${p.why}: ${p.text}`);
}
console.log(`\n${genre}: ${total} combinations, ${bad} flagged`);
