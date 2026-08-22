// Nothing in this game used to care how old you were. A seventy-five-year-old saw the
// same board as a twenty-two-year-old, at the same fees, with the same odds — and since
// craft and fame only ever climb, the oldest version of you was always the strongest.
// Measured over a hundred careers, the median Asker was won at fifty-seven. In life the
// peak is the late thirties.
//
// So parts have ages now. Most of them close as you get older, and a different shelf
// opens instead — work that pays in standing rather than in noise. Middle age becomes a
// decision: chase what is leaving, or become something else.

// The window a part is actually cast in. Outside it you are simply not seen for it.
// [start of the window, last comfortable year, the age nobody is cast at all]
const BANDS = {
  // young, and gone quickly
  'Victim': [17, 30, 38],
  'Background': [17, 55, 75],
  'Stage': [18, 60, 80],
  'Voice': [18, 70, 90],
  'Face': [17, 42, 58],           // brand campaigns want a young face
  'Actor': [18, 50, 68],
  'Star': [17, 38, 50],
  'Artist': [17, 45, 62],
  'Performer': [17, 45, 62],
  'Act': [17, 45, 62],
  'Session': [18, 65, 85],
  'Headliner': [20, 52, 68],
  'Judge': [34, 72, 88],          // this one opens LATE — you have to have been somebody
  'Guest': [18, 62, 80],
  'Guest role': [18, 62, 80],
  'Episode': [18, 62, 80],
  // the parts a career is built on
  'Lead': [21, 44, 60],
  'Series regular': [22, 50, 66],
  'Recurring': [20, 54, 70],
  'Season lead': [26, 52, 68],
  'Supporting': [21, 60, 78],
  // and the parts that only exist later
  'Character lead': [44, 78, 95],
  'The matriarch': [48, 82, 96],
  'Elder statesman': [50, 82, 96],
  'Grandparent': [52, 84, 96],
};
const DEFAULT_BAND = [20, 55, 72];
export function bandFor(role) { return BANDS[role] || DEFAULT_BAND; }

// Lead roles for women close earlier and faster than they do for men. That is a real and
// ugly fact about this industry, and a game about fame that smooths it away is telling a
// comfortable lie. It is modelled here, it is modest, and the game says out loud when it
// starts happening to you rather than quietly lowering your odds.
const LEADING = new Set(['Lead', 'Star', 'Face', 'Headliner', 'Series regular', 'Season lead', 'Artist']);
export function womensPenalty(s, role) {
  return (s.gender === 'female' && LEADING.has(role)) ? 6 : 0;
}

// 1 inside the window, tapering to 0 at the hard edge. Below the window it is sharper:
// they will read a thirty-year-old for a forty-year-old part, not for a schoolgirl.
export function ageFit(s, role) {
  const age = s.ageY || 0;
  const shift = womensPenalty(s, role);
  const [from, easy, hard] = bandFor(role);
  const comfy = easy - shift, edge = hard - shift;
  if (age < from) return age >= from - 3 ? 0.45 : 0;
  if (age <= comfy) return 1;
  if (age >= edge) return 0;
  return Math.max(0, 1 - (age - comfy) / Math.max(1, edge - comfy));
}

// Below this a casting office is looking at somebody else, so the listing never appears.
export const SEEN_AT = 0.28;
export function seenForIt(s, role) { return ageFit(s, role) >= SEEN_AT; }

// What the player is told, once, when the board starts changing under them.
export function agingNote(s) {
  const age = s.ageY || 0;
  const female = s.gender === 'female';
  const turn = female ? 39 : 45;
  if (age === turn) {
    return female
      ? 'The scripts coming in have started to change. Fewer of them are about someone your age falling in love, and more of them are about someone your age holding a family together. It happens earlier to women and everybody in this business knows it.'
      : 'The scripts coming in have started to change. Fewer leading men, more fathers and bosses and men with a history. It is not over — it is a different shelf.';
  }
  if (age === turn + 12) {
    return 'Something has turned. The parts you are offered now are the ones that win things — they are just not the ones that sell tickets.';
  }
  return null;
}
