// Small English fixes that a game which writes its own sentences needs and nothing else
// was doing. "Sofia started working as a accountant" appeared in a real playthrough.

const VOWEL = /^[aeiou]/i;
// The exceptions that matter for the words this game actually uses: a one-off, a united
// front, an hour, an honest answer.
const SOUNDS_CONSONANT = /^(u(ni|se|ni|ro|k)|eu|one|once)/i;
const SOUNDS_VOWEL = /^(hour|honest|honou?r|heir)/i;

export function article(word) {
  const w = String(word || '').trim();
  if (!w) return 'a';
  if (SOUNDS_VOWEL.test(w)) return 'an';
  if (SOUNDS_CONSONANT.test(w)) return 'a';
  return VOWEL.test(w) ? 'an' : 'a';
}
// "a accountant" → "an accountant". Use anywhere an article is glued to a word that comes
// out of a table.
export function an(word) { return `${article(word)} ${word}`; }
