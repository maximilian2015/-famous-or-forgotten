// Titles for everything that gets made — yours and everybody else's. Two words from two
// lists gave three hundred titles, which is fine for one board and hopeless for a world
// that makes a hundred films a year for fifty years. Seven shapes, words that lean toward
// the genre, and a list of everything already used in this life, so nothing comes twice.
import { pick, rint, chance } from '../../engine/rng.js';

const COMMON = {
  adj: ['Late', 'Golden', 'Silent', 'Broken', 'Bright', 'Lost', 'Quiet', 'Last', 'Paper', 'Neon', 'Bitter', 'Hollow',
    'Certain', 'Northern', 'Second', 'Patient', 'Crooked', 'Tender', 'Small', 'Fair', 'Blue', 'Wild', 'Distant', 'Sudden',
    'Ordinary', 'Borrowed', 'Empty', 'Perfect', 'Honest', 'Foreign', 'Nameless', 'Careless', 'Vanishing', 'Radiant'],
  noun: ['River', 'Avenue', 'Season', 'Signal', 'Harbour', 'Echo', 'Hour', 'Room', 'Line', 'City', 'Winter', 'Weather',
    'Machine', 'Country', 'Animal', 'Kingdom', 'Daughter', 'Distance', 'Garden', 'Window', 'Letter', 'Bridge', 'Orchard',
    'Station', 'Cauldron', 'Crust', 'Attempt', 'Crossing', 'Debt', 'Promise', 'Mirror', 'Border', 'Ledger', 'Coat', 'Lantern'],
  abstract: ['Crosses', 'Mercies', 'Water', 'Light', 'Hours', 'Distances', 'Names', 'Strangers', 'Salt', 'Smoke', 'Glass',
    'Ashes', 'Rain', 'Silence', 'Thieves', 'Kings', 'Sisters', 'Mothers', 'Debts', 'Promises', 'Fools', 'Angels', 'Dust'],
  body: ['Head', 'Hands', 'Shoulder', 'Door', 'Bed', 'Window', 'Name', 'Town', 'House', 'Heart', 'Feet', 'Eyes'],
  thing: ['Smoke', 'Rain', 'Snow', 'Light', 'A Stranger', 'Nothing', 'Water', 'Fire', 'The Sea', 'A Voice', 'Dust', 'Music'],
  prep: ['Above', 'Beneath', 'Behind', 'After', 'Without', 'Inside', 'Beyond', 'Before'],
  participle: ['Resurrected', 'Coming to Dinner', 'Talking', 'Back', 'Sorry Now', 'Lying', 'Leaving', 'Counting', 'Watching', 'Laughing'],
  question: ["Guess Who's", "Look Who's", "Ask Who's", "Nobody's", "Everybody's"],
  single: ['Stab', 'Undertow', 'Vertigo', 'Fallow', 'Ember', 'Marrow', 'Tabula Rasa', 'Terra Nova', 'Mea Culpa', 'Deus Ex',
    'Persona', 'Nocturne', 'Aurora', 'Vesper', 'Lacuna', 'Halcyon', 'Meridian', 'Solace', 'Kismet', 'Zenith', 'Ballast',
    'Tinder', 'Kindling', 'Lantern', 'Anchor', 'Corridor', 'Interval', 'Sundown', 'Wake', 'Hush'],
  ordinal: ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Ninth', 'Eleventh', 'Thirteenth', 'Last'],
};
// A genre pulls its own words in beside the common ones, so a horror is not called
// "Tender Garden" and a romance is not called "Rotten Cellar" — most of the time.
const GENRE = {
  Horror: { adj: ['Pale', 'Buried', 'Rotten', 'Sleepless', 'Hungry', 'Starving', 'Skinless'], noun: ['Knife', 'Cellar', 'Harvest', 'Widow', 'Bone', 'Hunger', 'Coffin', 'Hive', 'Cauldron'],
    abstract: ['Death', 'Teeth', 'Worms', 'Blood', 'Crosses', 'Graves'], single: ['Stab', 'Marrow', 'Undertow', 'Hush', 'Rictus', 'Bile'] },
  Crime: { adj: ['Dirty', 'Loaded', 'Crooked', 'Double', 'Cold', 'Marked'], noun: ['Ledger', 'Alibi', 'Witness', 'Debt', 'Sentence', 'Precinct', 'Confession', 'Warrant'],
    abstract: ['Thieves', 'Debts', 'Liars', 'Sirens', 'Ashes'], single: ['Stab', 'Ballast', 'Alibi', 'Verdict', 'Racket'] },
  Thriller: { adj: ['Sudden', 'Hidden', 'Cornered', 'Marked', 'Silent', 'Wired'], noun: ['Signal', 'Deadline', 'Passenger', 'Border', 'Countdown', 'Witness', 'Wire'],
    abstract: ['Strangers', 'Lies', 'Smoke', 'Shadows'], single: ['Vertigo', 'Undertow', 'Ballast', 'Interval', 'Tripwire'] },
  Romance: { adj: ['Tender', 'Honest', 'Borrowed', 'Sunday', 'Summer', 'Careless'], noun: ['Letter', 'Garden', 'Promise', 'Kiss', 'Wedding', 'Orchard', 'Postcard'],
    abstract: ['Mercies', 'Light', 'Sisters', 'Promises', 'Roses', 'Rain'], single: ['Solace', 'Aurora', 'Halcyon', 'Kismet', 'Vesper'] },
  Comedy: { adj: ['Crispy', 'Ordinary', 'Accidental', 'Perfect', 'Slightly', 'Mostly'], noun: ['Crust', 'Attempt', 'Wedding', 'Cousin', 'Lottery', 'Roommate', 'Honeymoon', 'Weekend'],
    abstract: ['Fools', 'Cousins', 'Idiots', 'Neighbours'], single: ['Whoops', 'Tinder', 'Splat', 'Kismet'] },
  Drama: { adj: ['Quiet', 'Patient', 'Ordinary', 'Distant', 'Nameless', 'Small'], noun: ['Daughter', 'Field', 'Harbour', 'Winter', 'Country', 'House', 'Orchard', 'Inheritance'],
    abstract: ['Crosses', 'Water', 'Mothers', 'Names', 'Hours', 'Silence'], single: ['Tabula Rasa', 'Fallow', 'Lacuna', 'Solace', 'Meridian'] },
  'Sci-Fi': { adj: ['Transparent', 'Hollow', 'Binary', 'Silent', 'Outer', 'Terminal'], noun: ['Cauldron', 'Machine', 'Signal', 'Orbit', 'Colony', 'Engine', 'Protocol', 'Horizon'],
    abstract: ['Wonders', 'Stars', 'Glass', 'Light', 'Machines'], single: ['Terra Nova', 'Zenith', 'Meridian', 'Aurora', 'Deus Ex', 'Lacuna'] },
  Musical: { adj: ['Golden', 'Bright', 'Radiant', 'Sunday', 'Velvet'], noun: ['Cabaret', 'Chorus', 'Encore', 'Ballroom', 'Overture', 'Serenade'],
    abstract: ['Angels', 'Kings', 'Light', 'Music'], single: ['Nocturne', 'Encore', 'Aurora', 'Vesper', 'Cadence'] },
};
function words(genre, key) {
  const g = (GENRE[genre] || {})[key] || [];
  const c = COMMON[key] || [];
  // Two in three from the genre's own list when it has one.
  return g.length && chance(66) ? g : c;
}
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);

function shape(genre) {
  const r = Math.random();
  if (r < 0.34) return `${pick(words(genre, 'adj'))} ${pick(words(genre, 'noun'))}`;
  if (r < 0.50) { const n = pick(words(genre, 'noun')); const art = chance(25) ? (/^[AEIOU]/.test(n) ? 'An' : 'A') : 'The'; return `${art} ${n} of ${pick(words(genre, 'abstract'))}`; }
  if (r < 0.62) return pick(words(genre, 'single'));
  if (r < 0.72) return `The ${pick(COMMON.ordinal)} ${pick(words(genre, 'noun'))}`;
  if (r < 0.82) return `${pick(COMMON.thing)} ${pick(COMMON.prep)} Your ${pick(COMMON.body)}`;
  if (r < 0.90) return `${pick(COMMON.question)} ${pick(COMMON.participle)}`;
  if (r < 0.95) return `${cap(pick(words(genre, 'noun')))} ${rint(2, 99)}`.replace(/ (\d)$/, ' $1');
  return `${pick(words(genre, 'abstract'))} and ${pick(words(genre, 'abstract'))}`;
}

// A title nobody in this life has used — not on the board, not in your filmography, not by
// anybody in the world. `also` is an extra Set the caller is already tracking.
export function newTitle(s, genre, also) {
  const used = (s._titlesUsed = s._titlesUsed || {});
  for (let i = 0; i < 80; i++) {
    const t = shape(genre);
    if (used[t] || (also && also.has(t))) continue;
    used[t] = 1;
    if (also) also.add(t);
    return t;
  }
  const t = `${shape(genre)} ${rint(100, 999)}`;
  used[t] = 1;
  return t;
}
