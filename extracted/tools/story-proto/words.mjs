// The root of an English word, near enough for telling "came home" and "comes back" are the same
// action, and the content words of a phrase. Used by the checkers, never by the game.
const IRREGULAR = { came: 'come', went: 'go', gone: 'go', left: 'leave', saw: 'see', seen: 'see', told: 'tell', got: 'get', took: 'take', taken: 'take',
  found: 'find', wrote: 'write', written: 'write', lost: 'lose', kept: 'keep', made: 'make', ran: 'run', sold: 'sell', brought: 'bring', thought: 'think',
  knew: 'know', known: 'know', began: 'begin', died: 'die', dead: 'die', death: 'die', children: 'child', men: 'man', women: 'woman', lives: 'life',
  slept: 'sleep', sang: 'sing', sung: 'sing', stood: 'stand', heard: 'hear', paid: 'pay', said: 'say', woke: 'wake', fell: 'fall', meant: 'mean',
  grew: 'grow', grown: 'grow', drove: 'drive', driven: 'drive', broke: 'break', broken: 'break', felt: 'feel', held: 'hold', met: 'meet', sent: 'send',
  spent: 'spend', built: 'build', forgot: 'forget', forgotten: 'forget', hid: 'hide', hidden: 'hide', shot: 'shoot', stole: 'steal', stolen: 'steal',
  married: 'marry', confession: 'confess', killer: 'kill', murderer: 'murder', buried: 'bury', nights: 'night', night: 'night', home: 'home', back: 'back' };
export function lemma(w) {
  w = String(w).toLowerCase().replace(/[’']s$/, '');
  if (IRREGULAR[w]) return IRREGULAR[w];
  if (w.length > 5 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3).replace(/(.)\1$/, '$1');
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2).replace(/(.)\1$/, '$1').replace(/i$/, 'y');
  if (w.length > 4 && w.endsWith('es') && /(ss|sh|ch|x|z)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had',
  'his', 'her', 'their', 'them', 'they', 'he', 'she', 'him', 'it', 'its', 'that', 'who', 'whom', 'whose', 'which', 'what', 'when', 'then', 'than', 'this',
  'at', 'by', 'from', 'into', 'onto', 'over', 'under', 'up', 'down', 'out', 'off', 'about', 'before', 'after', 'not', 'no', 'nobody', 'anybody', 'somebody',
  'everybody', 'one', 'only', 'every', 'all', 'each', 'any', 'some', 'never', 'ever', 'once', 'still', 'just', 'so', 'as', 'if', 'there', 'where', 'none',
  'can', 'could', 'would', 'will', 'must', 'should', 'may', 'own', 'very', 'more', 'most', 'less', 'least', 'too', 'also', 'themselves', 'himself', 'herself',
  'does', 'do', 'did', 'like', 'two', 'three', 'four', 'five', 'first', 'last', 'same', 'other', 'others', 'new', 'old', 'long', 'year', 'years', 'day', 'days',
  'month', 'week', 'way', 'thing', 'things', 'time', 'get', 'gets', 'make', 'going', 'goes', 'knows', 'know', 'anyone', 'someone', 'something', 'nothing']);
export const words = (t) => (String(t).toLowerCase().replace(/\{\w+\}/g, ' ').replace(/[’']s\b/g, '').match(/[a-z-]+/g) || []).filter((w) => w.length > 2 && !STOP.has(w));
