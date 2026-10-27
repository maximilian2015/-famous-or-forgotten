// What the actor gets once the paper is signed: the script, as far as their part goes. The offer
// told the public's two sentences; the actor reads the whole thing — what the hero wants, who is
// around them, what happens, and the twist, which is in the script and never in the trailer.
//
// And what the shoot does with it: which page of the story a scene day is (the start, the middle,
// the scene where it comes out), and the "Out of order" day, which is the story's own secret —
// the scenes before the hero knows and after — rather than a letter or a diagnosis from a list.
import { fill, SHAPES } from './plot.js';

// What the hero of each shape wants, in a few words after "wants". {they} is the hero.
export const WANTS = {
  lastShow: 'to get through one last night on air without anybody seeing how much it matters',
  theLie: 'to make one lie last until everybody goes home',
  doubleBooked: 'to keep the job, and keep one day from turning into a disaster',
  seriousPerson: 'to get through it with {their} dignity, and nobody back home ever finding out',
  roadTrip: 'to get there in time, in one piece, and still speaking',
  smallHeist: 'to take back what was theirs, just once, without getting caught',
  impostor: 'to stay somebody else exactly as long as it takes to get out',
  theWill: 'the money — and, without admitting it, each other',
  theOneWhoLeft: 'to get in and out again without having to feel anything',
  sameShift: 'to get through the season with work still the one safe place',
  fakeDate: 'to keep up the act until Monday and then go back to {their} own life',
  lettersToAStranger: 'to keep the one honest conversation going, whoever is on the other end',
  lastSummer: 'one summer that belongs to nobody else',
  acrossTheRoad: 'to win, and never to have to say why it matters so much',
  forbidden: 'to love who {they} {love} without losing everybody else',
  fiveYears: 'to find the stranger again, and for once get the timing right',
  saveTheHall: 'to save the place, and get one more night on that stage',
  understudy: 'one night, to prove {they} {was} never only the cover',
  theBand: 'to get them all on one stage again before it is too late',
  bigBreak: 'to be heard, once, by the people who matter',
  theDance: 'to make it onto the floor, and keep a promise',
  theCabaret: 'to keep the doors open and everybody inside alive',
  ourStreet: 'to keep the street standing and the people on it together',
  theComposer: 'to finish the piece before it finishes {them}',
  homecoming: 'to settle it and leave before anybody says the thing out loud',
  holdingOn: 'to keep it going for one more year',
  oneYear: 'to put things right in the time that is left',
  theJury: 'to go home with a clear conscience, if that is still possible',
  newCountry: 'to make a life here before the papers run out',
  theStrike: 'to hold the town together until the other side gives',
  thePast: 'to keep the past where it has been for forty years',
  theCarer: 'to be there while the parent is still there',
  theHouse: 'to make the house a home, and keep everybody in it safe',
  theStudy: 'the money, and to get out before the study gets {them}',
  theVillage: 'to do the job and leave before July',
  theCabin: 'a weekend away from everything, and then to get home',
  theChild: 'to keep the child safe, even from what the child knows',
  theHunger: 'to find what is killing the animals before it starts on people',
  theTape: 'to finish the recording and get paid',
  theDrowned: 'to find out what the water took, and not be taken with it',
  theCrossing: 'to get everybody across, and to know what {they} really saw',
  theDeadline: 'to get the truth out before somebody stops it',
  theWitness: 'to stay alive until {they} can say what {they} saw',
  theHour: 'to get everybody out alive within the hour',
  theAccident: 'to make it as if that night never happened',
  theFavour: 'to do one small thing and get {their} life back',
  theSystem: 'to find out what is really happening in the building, and live',
  theCountdown: 'to find it before it goes off',
  theFamily: 'to get out of the family business without being buried by it',
  theRelease: 'to find out what really happened nine years ago',
  theJob: 'one clean job and their share',
  thePartner: 'to stay honest in a station that is not',
  theStreets: 'to get out of the life before it gets {them}',
  theColdCase: 'to close the case nobody else could',
  theDefence: 'to win — and to know whether {they} should',
  theMoney: 'to pay the debt off and get out clean',
  theStation: 'to keep the station alive until somebody comes',
  theMessage: 'to understand the message before anybody else decides what it means',
  theLoop: 'to get to Wednesday',
  firstContact: 'to understand them before somebody starts a war',
  theMachine: 'to decide what the machine is, and do right by it',
  theVoyage: 'to learn the truth about the ship',
  theMemory: 'to know which memories are really {their} own',
  theLastWorld: 'to get the last people off, and decide whether to go',
};
// The parts who know the secret before the hero does — the wording says so.
const KNOWING = /\b(has known all along|knew everything|keeps the secret|always knew|knows more|who is lying|has seen (it|this) before|has done this before|last person who did this job|who wrote some of them|who hired|has seen the books|has seen the file)\b/i;
export const knowsFromTheStart = (part) => KNOWING.test(String(part || ''));

// What the actor learns when the paper is signed. `plot` is the film's story, `character` the
// offer's { name, what }, `tier` lead / supporting.
export function sheetOf(plot, character, tier) {
  if (!plot) return null;
  const lead = tier === 'lead' || tier === 'tentpole' || plot.lead;
  const shape = SHAPES.find((x) => x.id === plot.shape);
  const want = WANTS[plot.shape] ? fill(WANTS[plot.shape], plot.g) : null;
  const yours = character && character.what ? character.what : plot.part;
  const people = ((shape && shape.roles) || []).map((r) => fill(typeof r === 'string' ? r : r.t, plot.g))
    .filter((r) => r.toLowerCase() !== String(yours).toLowerCase()).slice(0, 3);
  const knows = !lead && knowsFromTheStart(yours);
  return {
    lead, name: character ? character.name : null, you: yours,
    hero: plot.hero, heroName: plot.heroName || null,
    wants: want,                                            // the hero's want
    people,                                                 // who else is in it
    happens: plot.synopsis,
    secret: plot.twist,                                     // in the script; never in the trailer
    // When the person you play finds out. The hero learns it where the story turns, in the
    // last third of the shoot; some parts have known all along.
    learns: lead ? 'You find out in the last third of the shoot, in the scene where it comes out.'
      : knows ? 'Your character has known it from the start. The hero has not.'
        : 'Your character finds out when the hero does.',
    knows,
  };
}

// Which page of the story a scene day is, by how far through the shoot it falls.
export function pageAt(plot, progress) {
  if (!plot) return null;
  const spark = plot.spark || (plot.used && plot.used.spark ? fill(plot.used.spark, plot.g) : null);
  // `text` is for the actor and may hold the twist; `moment` is what a critic may say about the
  // scene if the day is good enough to be remembered, and never does.
  if (progress < 0.34 && spark) return { phase: 'start', text: `Today's pages: the scene where ${spark}.`, moment: `the scene where ${spark}` };
  if (progress < 0.67 && plot.block) return { phase: 'middle', text: `Today's pages: the middle of it — ${plot.block}.`, moment: 'the scene where it all starts to go wrong' };
  return { phase: 'turn', text: `Today's pages: the scene where it comes out. ${plot.twist}`, moment: 'the scene where it all comes out' };
}

// ── "Out of order", from the story ───────────────────────────────────────────
// What the hero finds out, by the thing the story turns on, and three things they do before
// they know it and three after. {name} is whoever the scenes are about.
const ABOUT = {
  tape: 'whose voice is on the tape', photo: 'what the photograph means', letter: 'what the letter really says',
  signal: 'where the signal is coming from', phone: 'who is really calling', key: 'what the key opens',
  ring: 'who it was really for', song: 'whose song it is', money: 'where the money came from',
  list: 'whose name is on the list', pill: 'what the treatment really does', truth: 'the truth',
};
// The object only counts if the story says it: a poster's motif is not always in the sentence
// ("the best man" is filed under ring), and a day about a list in a story with no list is worse
// than a day about the truth.
const NAMED = { tape: /tape|recording|cassette|demo/, photo: /photograph|photo|video|film|drawing/, letter: /letter|postcard|note|confession|page|reply|message|will/,
  signal: /signal|radio|channel|broadcast|frequency/, phone: /phone|call|caller/, key: /key|door|lock|safe/, ring: /ring|engaged|engagement/,
  song: /song|sing|music|recording/, money: /money|debt|loan|cash|cheque|payout|fortune/, list: /list|records|file|register|name/, pill: /dose|pill|treatment|clinic/ };
const BEATS = {
  tape: [['plays the tape for the others and laughs at it', 'labels the tape and puts it on the shelf', 'tells everybody it is only noise'],
    ['will not let anybody near the machine', 'turns it down when somebody walks in', 'stops calling it noise']],
  photo: [['pins the photograph up where everybody can see it', 'asks round the room who took it', 'jokes about the haircuts in it'],
    ['takes the photograph down', 'stops asking who took it', 'cannot look at the faces in it']],
  letter: [['reads the letter out loud as a joke', 'leaves the letter on the table', 'asks who it was meant for'],
    ['keeps the letter in an inside pocket', 'burns the envelope and keeps the letter', 'stops asking who it was meant for']],
  signal: [['logs the signal as interference', 'turns it down to sleep', 'bets somebody it is a satellite'],
    ['sits up all night with the headphones on', 'stops logging it', 'pays the bet without a word']],
  phone: [['lets it ring out', 'answers with a full name, like at work', 'hands the phone to somebody else'],
    ['picks up before the second ring', 'answers and says nothing', 'takes the phone into the next room']],
  key: [['tries the key in every door for fun', 'hangs the key on a nail by the door', 'asks who the key belongs to'],
    ['wears the key on a string', 'locks the door from the inside', 'stops asking who it belongs to']],
  ring: [['tries the ring on and laughs', 'leaves the ring in a saucer', 'asks whose it was'],
    ['puts the ring away without a word', 'cannot look at the saucer', 'stops asking whose it was']],
  song: [['hums the song without noticing', 'asks who wrote it', 'sings it badly on purpose'],
    ['stops humming when the others come in', 'never asks who wrote it again', 'sings it properly, once, alone']],
  money: [['counts the money twice and grins', 'talks about what it will buy', 'leaves the money in a drawer'],
    ['counts it a third time', 'stops talking about what it will buy', 'moves the money where nobody would look']],
  list: [['reads the list out to the room', 'looks for a familiar name and laughs', 'pins the list to the wall'],
    ['folds the list very small', 'does not read it out', 'takes it down at night']],
  pill: [['takes the dose without reading the label', 'jokes about the side effects', 'sleeps through the night'],
    ['reads the label twice', 'palms the dose', 'sits up waiting for the morning']],
  truth: [['laughs it off in front of everybody', 'tells the others there is nothing to worry about', 'sleeps through the night'],
    ['stops laughing about it', 'stops telling anybody not to worry', 'sits up waiting for the morning']],
};
const shuffle = (a) => { const o = [...a]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };
// For a lead the scenes are about you; for a supporting part they are about the hero you play
// opposite — and if your part has known all along, the question is when the hero catches up.
export function chronologyFromPlot(plot, character, tier) {
  const said = String(plot.spark || '').toLowerCase();
  const motif = BEATS[plot.motif] && NAMED[plot.motif] && NAMED[plot.motif].test(said) ? plot.motif : 'truth';
  const sheet = sheetOf(plot, character, tier);
  const name = sheet.lead ? (sheet.name || 'You').split(' ')[0] : (sheet.heroName || 'The hero').split(' ')[0];
  const [early, late] = BEATS[motif];
  const say = (t) => `${name} ${t}.`;
  const e = shuffle(early).map((t, i) => ({ text: say(t), pos: i + 1 }));
  const l = shuffle(late).map((t, i) => ({ text: say(t), pos: i + 5 }));
  const what = ABOUT[motif];
  const ask = sheet.lead
    ? `They are shooting out of order today. You are ${name}. Tick every scene where ${name} already knows ${what}.`
    : sheet.knows
      ? `They are shooting out of order today. Your character has known ${what} from the start — ${name} has not. Tick every scene where ${name} knows too.`
      : `They are shooting out of order today, and you play opposite ${name}. Tick every scene where ${name} already knows ${what}.`;
  return { beats: shuffle([...e, ...l]), reveal: 4, what, ask };
}
