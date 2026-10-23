// Story generator V2 — PROTOTYPE, not imported by the game (Maxi/ChatGPT, 23 Oct: "do not change
// the code yet; audit, then show twenty stories beside the old ones").
//
// The premise the game writes today (career/story.js makePremise) is three phrases drawn from
// three tables, independently: a place, an incident, a twist. Nothing connects them — the twist
// may be about a dead man nobody mentioned — and nobody in them wants anything. A film is a person
// who wants something, a thing that happens to them, what stands in the way, and what the
// audience is not told until the end.
//
// So a story here is drawn from a SHAPE: one of a few plots each genre actually has (the last
// broadcast, the lie that has to hold for a weekend, the band that has not spoken since the last
// tour). Inside a shape every option is written to fit every other, so the surface varies freely
// and the sense does not: who the hero is, where it happens, what sets it off, what stands in the
// way. The twist belongs to the incident that sets it off, so it is always about something the
// story introduced. The player sees the logline and the synopsis; the twist is kept apart and is
// never printed on a poster or an offer.
//
// A film that already has a TITLE (every film in an old save) is read the other way round: the
// words of the title choose the shape and the options that share them — "Midnight Talker" finds
// the radio host. Everything is seeded by the title, so a film always tells the same story.
import { hash, rng } from '../../src/engine/hash.js';

const pickR = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const low = (s) => s[0].toLowerCase() + s.slice(1);

// ── the shapes ────────────────────────────────────────────────────────────────
// who:   the hero, with keywords a title can match (k) and a gender when the wording has one (g)
// where: the place and the pressure of it; `place` is what a poster draws
// spark: what sets it off; `motif` is the object a poster can be about; its twists are about it
// block: what stands in the way
// roles: the other parts in it, for a player who is not the lead
// Any option (a who, where, spark, block or twist; a block or twist can be { t, needs }) may say
// `needs: [...]`: it is only used when every one of those is true of the hero and the place — the
// where's `place`, or a word in the who's or where's `is`. That is how a coach party only arrives
// at a hotel, and a dead father's ashes are only driven by his children.
// Templates use {who} {where} {spark} {block}; {they}/{them}/{their} follow the hero.
export const SHAPES = [
  // ── Comedy ──
  { id: 'lastShow', genre: 'Comedy', k: ['night', 'radio', 'talk', 'talker', 'voice', 'midnight', 'signal'],
    who: [{ t: 'the host of a midnight phone-in', k: ['radio', 'talker', 'talk', 'midnight', 'night', 'voice'] }, { t: 'a hospital radio volunteer who believes {they} {is} famous', needs: ['ward'], k: ['radio', 'hospital'] },
      { t: 'a phone-in agony aunt who has never been on a date', g: 'f', k: ['talk', 'talker', 'voice', 'heart'] }, { t: 'a bingo host with a voice like warm toast', k: ['voice', 'lucky'] }],
    where: [{ t: 'the hospital it broadcasts from closes at dawn', place: 'ward', k: ['hospital', 'ward', 'unit'] }, { t: 'the pier is being demolished on Monday', place: 'sea', k: ['pier', 'sea', 'harbour'] },
      { t: 'the station has been sold to a chain that only plays adverts', place: 'studio', k: ['station', 'signal'] }],
    spark: [{ t: 'a photograph nobody can explain is taped to the studio door', motif: 'photo', k: ['photograph', 'picture'],
        twists: ['The photograph was taken the night {they} {was} born, in the same building.', { t: 'The photograph is of the new owner, aged nine, winning the station’s talent contest.', needs: ['studio'] }] },
      { t: 'a caller rings in claiming to be {their} long-lost father', motif: 'phone', k: ['caller', 'father', 'talker'],
        twists: ['Three callers claim it before midnight, and one of them is telling the truth.', { t: 'The caller is the new owner, checking whether anybody still listens.', needs: ['studio'] }] },
      { t: 'a rival broadcast starts up on the same frequency', motif: 'signal', k: ['signal', 'rival'],
        twists: ['The rival is {their} own producer, who wanted to be on air just once.', 'The rival is broadcasting from the next room.'] }],
    block: ['everybody still in the building decides to help, live on air', 'every attempt to hide it goes out on air', 'the only engineer who can keep them broadcasting is {their} ex'],
    roles: ['the producer who has already taken a job elsewhere', 'the night porter running a book on how it ends', 'the engineer who used to be married to the host'],
    tpl: '{Who} has one night left on air, and {where}. Then {spark} — and {block}.',
    log: '{Who} has one night left on air when {spark}.', tags: ['One last show. One small problem.', 'Stay tuned.'] },
  { id: 'theLie', genre: 'Comedy', k: ['roommate', 'honeymoon', 'weekend', 'cousin', 'cousins', 'fools', 'idiots', 'wedding', 'perfect'],
    who: [{ t: 'a junior accountant who has told {their} family {they} {run} the company', k: ['ordinary', 'perfect'] }, { t: 'a woman who has invented a fiancé to make her grandmother happy', g: 'f', k: ['wedding', 'honeymoon'] },
      { t: 'a tour guide who tells everybody {they} {is} a world traveller and has never once left town', k: ['weekend'] }, { t: 'a lodger who has been pretending to be the landlord', is: ['lodger'], k: ['roommate', 'apartment', 'flat'] }],
    where: [{ t: 'over one wedding weekend', place: 'town', k: ['wedding'] }, { t: 'across Christmas in a cottage with eleven relatives and one bathroom', place: 'house', k: ['cousin', 'cousins', 'family'] },
      { t: 'for the four days of a school reunion', place: 'school', k: ['reunion', 'fools', 'idiots'] }, { t: 'for the week the real owner comes to stay', needs: ['lodger'], place: 'house', k: ['roommate', 'apartment'] }],
    spark: [{ t: 'the one person who knows the truth arrives a day early', motif: 'key', k: [],
        twists: ['Everybody at the table is lying about something; {their} lie is just the smallest.', 'The family worked it out years ago and has been playing along.'] },
      { t: 'the lie gets a toast of its own at dinner', motif: 'ring', k: ['wedding'],
        twists: ['The person proposing the toast is in on it, and wants something for keeping quiet.', 'The toast was written by the one person the lie was meant to protect.'] },
      { t: 'somebody starts filming everything for the family group chat', motif: 'phone', k: [],
        twists: ['The video goes out to the wrong group, and it is the best thing that ever happened to {them}.', 'The person filming has been lying for longer.'] }],
    block: ['every person brought in to help adds a lie of their own', 'the lie keeps getting promoted', 'a seven-year-old has started asking reasonable questions'],
    roles: ['the cousin who is only helping for the money', 'the grandmother who misses nothing', 'the best friend who is a terrible liar'],
    tpl: '{Who} has to keep it up {where}. Then {spark}, and {block}.',
    log: '{Who} has to keep up one lie {where}.', tags: ['It was only meant to be for one weekend.', 'Nobody panic.'] },
  { id: 'doubleBooked', genre: 'Comedy', k: ['wedding', 'funeral', 'booking', 'saturday', 'cousins', 'neighbours'],
    who: [{ t: 'a bridal planner on {their} final warning', k: ['wedding'] }, { t: 'an undertaker’s child running the business for one week', k: ['funeral', 'grave'] },
      { t: 'the new manager of a seaside hotel', k: ['hotel', 'sea'] }, { t: 'a vicar who cannot say no to anybody', k: ['angels', 'church'] }],
    where: [{ t: 'a Saturday that has to go perfectly', place: 'town', k: ['saturday', 'perfect'] }, { t: 'the busiest weekend of the year', place: 'hotel', k: ['weekend'] }, { t: 'one afternoon, one hall and one kitchen', place: 'house', k: [] }],
    spark: [{ t: 'a wedding and a funeral turn out to be booked into the same room', motif: 'ring', k: ['wedding', 'funeral'],
        twists: ['The two families have not spoken in forty years, over a wedding.', 'The deceased is not quite as dead as the family were told.'] },
      { t: 'two families arrive for what each believes is its own reunion', motif: 'photo', k: ['cousins', 'reunion'],
        twists: ['They are the same family, split by a will nobody read to the end.'] },
      { t: 'a famous guest books the whole place under a false name', motif: 'key', k: ['stranger'],
        twists: ['The famous guest is hiding from one of the families.'] }],
    block: ['neither party will be the first to leave', 'the only plan anybody agrees on is a lie', 'the caterer has taken a side'],
    roles: ['the groom’s mother, who has opinions', 'the caterer who has seen everything', 'the organist who will not stop playing'],
    tpl: '{Who} has one job: {where}. Then {spark}, and {block}.',
    log: '{Who} has one job — until {spark}.', tags: ['Something old. Something borrowed. Something dead.', 'Everybody stay calm.'] },
  { id: 'seriousPerson', genre: 'Comedy', k: ['ordinary', 'perfect', 'serious', 'fools', 'idiots', 'accidental', 'mostly', 'slightly'],
    who: [{ t: 'a high-court judge', is: ['judge'], k: ['verdict', 'serious'] }, { t: 'a tax inspector who has never once been late', is: ['taxman'], k: ['ledger', 'perfect'] },
      { t: 'the strictest headmistress in the county', g: 'f', is: ['school'], k: ['ordinary'] }, { t: 'a funeral director who has never laughed at work', is: ['undertaker'], k: ['funeral'] }],
    where: [{ t: 'has to spend a week as the entertainer at a children’s holiday camp', place: 'field', k: ['weekend', 'summer'] },
      { t: 'is sentenced to coach the worst amateur football team in the north', place: 'town', k: ['fools', 'idiots'] },
      { t: 'loses a bet and has to host the village talent show', place: 'stage', k: ['accidental'] }],
    spark: [{ t: 'a video of {their} first day goes round the whole country', motif: 'phone', k: [],
        twists: ['The person who filmed it is the only one who knew {they} would be good at it.', 'The video made {them} more famous than anything {they} ever did properly.'] },
      { t: 'the man {they} once sent to prison turns up to watch', needs: ['judge'], motif: 'list', k: ['verdict'],
        twists: ['He is not there for revenge. He is there because {they} changed his life, and wants to say so.'] },
      { t: 'the family {they} once audited into ruin turns up to watch', needs: ['taxman'], motif: 'list', k: ['ledger'],
        twists: ['They are not there for revenge. The audit was the best thing that ever happened to them, and they want to say so.'] },
      { t: 'the pupil {they} once expelled turns up to watch', needs: ['school'], motif: 'list', k: [],
        twists: ['The pupil is not there for revenge, but to say {they} {was} the only teacher who ever took any notice.'] },
      { t: 'the man whose funeral {they} arranged last spring turns up to watch, alive', needs: ['undertaker'], motif: 'list', k: ['funeral'],
        twists: ['He faked it to get away from his family, and they are sitting three rows behind him.'] },
      { t: 'it turns out {they} {is} very, very good at it', motif: 'song', k: ['perfect'],
        twists: ['{They} {was} good at it once before, as a child, and gave it up on purpose.'] }],
    block: ['nobody back at the office can ever find out', { t: 'the children have unionised', needs: ['field'] }, { t: 'the rival camp cheats openly and wins everything', needs: ['field'] },
      'the whole town has started placing bets', 'the local paper has sent a reporter who will not leave'],
    roles: ['the camp leader who thinks this is all beneath them', 'the ten-year-old who runs the place really', 'the colleague trying to get the video taken down'],
    tpl: '{Who} {where}. Then {spark}, and {block}.', log: '{Who} {where}.', tags: ['Dignity not included.', 'Court is now in session. Bring snacks.'] },
  { id: 'roadTrip', genre: 'Comedy', k: ['honeymoon', 'weekend', 'cousin', 'cousins', 'roommate', 'crust', 'highway'],
    who: [{ t: 'a man who has never driven further than the supermarket, and his teenage daughter', is: ['kin'], k: ['ordinary'] }, { t: 'two sisters who have not shared a car since 1998', is: ['kin'], k: ['cousins', 'sisters'] },
      { t: 'a photographer and the groom’s furious ex', k: ['honeymoon', 'wedding'] }, { t: 'a pensioner and the delivery driver who crashed into her garden', k: ['roommate'] }],
    where: [{ t: 'have three days to drive their father’s ashes to a beach in Portugal', needs: ['kin'], place: 'road', k: ['highway'] },
      { t: 'have to get a prize-winning cake across the country before Sunday', place: 'road', k: ['crust', 'cake'] },
      { t: 'are stuck in one hire car on the way to a wedding nobody wants to attend', place: 'road', k: ['wedding'] }],
    spark: [{ t: 'the satnav only speaks Finnish and nobody knows how to change it', motif: 'phone', k: [],
        twists: ['The Finnish was set on purpose, years ago, by the person they are driving to see.'] },
      { t: 'they find a letter in the glovebox that was never meant for either of them', motif: 'letter', k: ['letter'],
        twists: ['The letter explains why the trip was arranged at all, and who arranged it.'] },
      { t: 'the car is stolen at the first service station, with everything in it', motif: 'key', k: [],
        twists: ['The thief is the one person who knows the way.'] }],
    block: ['every shortcut makes it longer', 'neither of them will admit they are lost', 'the police are now very slightly involved'],
    roles: ['the hitchhiker with opinions', 'the mechanic who has seen this before', 'the ex who keeps texting directions'],
    tpl: '{Who} {where}. Then {spark}, and {block}.', log: '{Who} {where}.', tags: ['Are we there yet?', 'It is not about the destination. It is about the shouting.'] },
  { id: 'smallHeist', genre: 'Comedy', k: ['thieves', 'lottery', 'accidental', 'fools', 'idiots', 'debts', 'attempt'],
    who: [{ t: 'a retired bank clerk and her bridge club', k: ['debts', 'ledger'] }, { t: 'six pensioners from the church choir', k: ['fools'] }, { t: 'a dinner lady and the school caretaker', k: ['crust'] },
      { t: 'the two most law-abiding men in the parish', k: ['ordinary'] }],
    where: [{ t: 'decide to rob back the pension fund their old boss emptied', place: 'city', is: ['pension'], k: ['debts', 'debts'] },
      { t: 'plan to steal the trophy the next village cheated them out of', place: 'town', k: ['lottery'] },
      { t: 'have one weekend to rob their own branch before it is sold', place: 'city', k: ['attempt'] }],
    spark: [{ t: 'a real gang turns up the same night with the same idea', motif: 'money', k: ['thieves'],
        twists: [{ t: 'The real gang is the old boss, robbing his own company before the auditors arrive.', needs: ['pension'] }, 'The real gang are their own grandchildren, who thought of it first.'] },
      { t: 'the only person who can open the safe is a nine-year-old', needs: ['city'], motif: 'key', k: [],
        twists: ['She has been opening it for months, to put money back.'] },
      { t: 'the plan is accidentally posted on the parish noticeboard', motif: 'list', k: ['accidental'],
        twists: ['Half the village has signed up to help.'] }],
    block: ['nobody in the gang can run, climb or whisper', 'the getaway car is a mobility scooter', 'the policeman who lives next door keeps popping round'],
    roles: ['the ex-convict who is far too nervous', 'the vicar who drives the van', 'the old boss who suspects nothing'],
    tpl: '{Who} {where}. Then {spark}, and {block}.', log: '{Who} {where}.', tags: ['Old enough to know better. Too old to care.', 'The plan is perfect. The people are not.'] },
  { id: 'impostor', genre: 'Comedy', k: ['stranger', 'cousin', 'perfect', 'ordinary', 'kismet', 'whoops', 'question', "who's"],
    who: [{ t: 'a hotel night porter', k: ['hotel'] }, { t: 'an out-of-work actor', k: ['ordinary'] }, { t: 'a shy librarian', k: ['letter'] }, { t: 'a cab driver with a very familiar face', k: ['stranger'] }],
    where: [{ t: 'is mistaken for a famous surgeon at a medical conference', place: 'hotel', k: ['conference'] },
      { t: 'is taken for the long-lost heir of an enormously rich family', place: 'house', k: ['cousin', 'inheritance'] },
      { t: 'is mistaken for a royal on a cruise ship with no way off', place: 'sea', k: ['cruise'] }],
    spark: [{ t: '{they} {is} asked to give the keynote speech in an hour', needs: ['hotel'], motif: 'song', k: [],
        twists: ['The real one is in the audience, and enjoying every minute.'] },
      { t: 'the real one turns up', motif: 'key', k: ['stranger'],
        twists: ['The real one is a fraud too, and much worse at it.'] },
      { t: 'someone falls in love with the person {they} {is} pretending to be', motif: 'ring', k: ['kismet'],
        twists: ['They knew all along, and fell in love with who {they} really {is}.'] }],
    block: ['every lie needs two more to hold it up', 'a journalist is writing everything down', { t: 'the family wants a DNA test by Friday', needs: ['house'] }],
    roles: ['the assistant who works it out first', 'the real heir', 'the journalist who smells a story'],
    tpl: '{Who} {where}. Then {spark}, and {block}.', log: '{Who} {where}.', tags: ['Fake it till you make it out alive.', 'Nobody asked who they were. Big mistake.'] },
  { id: 'theWill', genre: 'Comedy', k: ['cousins', 'inheritance', 'family', 'neighbours', 'idiots', 'fools', 'crust', 'orchard'],
    who: [{ t: 'four siblings who have not been in one room since the divorce', is: ['siblings'], k: ['cousins', 'family'] }, { t: 'a widow and her husband’s secret second family', g: 'f', k: ['inheritance'] },
      { t: 'two neighbours at war over a hedge', k: ['neighbours'] }],
    where: [{ t: 'must run the terrible seaside hotel they have been left, together, for one summer, to inherit it', place: 'hotel', k: ['hotel', 'summer'] },
      { t: 'have to win the village baking contest as a team, or the money goes to the cat', place: 'town', is: ['cat'], k: ['crust', 'cake'] },
      { t: 'must share the old farmhouse for a month before anyone can sell', place: 'field', k: ['orchard', 'farm'] }],
    spark: [{ t: 'a lawyer reveals the will has a second page', motif: 'list', k: ['inheritance'],
        twists: ['There is no money. There never was. The will was the only way to get them all back in one room.'] },
      { t: 'a coach party of forty arrives with a booking nobody remembers taking', needs: ['hotel'], motif: 'key', k: ['hotel'],
        twists: ['The person who left it to them booked it, a year ago, for the week they would have to be there.'] },
      { t: 'the cat turns out to have a lawyer of its own', needs: ['cat'], motif: 'money', k: [],
        twists: [{ t: 'The cat’s lawyer is the sibling nobody invited.', needs: ['siblings'] }, 'The cat’s lawyer is the person who wrote the will, and is not dead.'] },
      { t: 'the buyer each of them secretly called turns up on the same morning', motif: 'key', k: [],
        twists: ['The buyer was sent by the lawyer, to find out which of them would sell first.'] }],
    block: ['nobody agrees on anything, including what day it is', { t: 'the hotel has one star and it is falling off', needs: ['hotel'] }, 'each of them is secretly trying to sabotage the others'],
    roles: ['the sibling who stayed and did all the work', 'the lawyer who is enjoying it far too much', 'the cat'],
    tpl: '{Who} {where}. Then {spark}, and {block}.', log: '{Who} {where}.', tags: ['Family is forever. Unfortunately.', 'Some inheritances come with conditions.'] },
  // ── Romance ──
  { id: 'theOneWhoLeft', genre: 'Romance', k: ['letter', 'promise', 'postcard', 'honest', 'summer', 'wedding', 'small', 'kiss', 'orchard'],
    who: [{ t: 'a woman who left her hometown at nineteen', g: 'f', k: ['small', 'summer'] }, { t: 'a widower whose children keep setting him up', g: 'm', k: ['honest', 'sunday'] },
      { t: 'a chef three weeks from losing {their} star', k: ['kitchen'] }, { t: 'a teacher who wrote letters {they} never posted', k: ['letter', 'honest', 'promise', 'postcard'] }],
    where: [{ t: 'comes home for a small wedding {they} cannot get out of', place: 'town', k: ['wedding', 'small'] }, { t: 'inherits an orchard in a town {they} swore never to go back to', place: 'field', k: ['orchard', 'garden'] },
      { t: 'takes a summer job on an island with one hotel', place: 'sea', k: ['summer', 'island'] }],
    spark: [{ t: 'the one person {they} never got over turns out to be the best man', motif: 'ring', k: ['wedding'],
        twists: ['The bride arranged the whole wedding to put them in one room.', 'The best man kept every letter, and answered every one, and never posted them either.'] },
      { t: 'a letter arrives forty years late, addressed to the house across the street', motif: 'letter', k: ['letter', 'postcard', 'honest'],
        twists: ['The letter was written by {their} mother, to the father of the person across the street.', 'They both wrote it, decades apart, to the same person.'] },
      { t: 'a photograph turns up of the two of them at a party neither of them remembers', motif: 'photo', k: ['photograph'],
        twists: ['The party was the night they were both meant to leave, and only one of them did.'] }],
    block: ['neither of them is free to say so', 'everybody around them worked it out years ago', 'one of them has already decided to leave again'],
    roles: ['the friend who has known all along', 'the fiancé who is very nice about everything', 'the sister who runs the guest house'],
    tpl: '{Who} {where}. Then {spark}, and {block}.', log: '{Who} {where} — and {spark}.', tags: ['Some people you never finish.', 'It was always going to be you.'] },
  { id: 'sameShift', genre: 'Romance', k: ['orbit', 'station', 'night', 'light', 'stars', 'rain', 'sandra'],
    who: [{ t: 'a night-shift nurse', k: ['night'] }, { t: 'an air-traffic controller who has not taken a holiday in six years', k: ['orbit', 'sky'] },
      { t: 'the keeper of a planetarium that is about to close', k: ['orbit', 'stars', 'light'] }, { t: 'a court stenographer', k: ['court', 'sentence'] }],
    where: [{ t: 'is paired for the last month of the season with the one colleague {they} cannot stand', place: 'city', k: [] },
      { t: 'is given sixty-five nights to train {their} replacement', place: 'space', k: ['orbit', 'sixty'] }, { t: 'spends every night of a long winter on the same shift', place: 'snow', k: ['winter', 'night'] }],
    spark: [{ t: 'a letter written to the building in 1979 is finally delivered', motif: 'letter', k: ['letter'],
        twists: ['The letter was written by the colleague’s mother, to {their} father.'] },
      { t: 'they start finishing each other’s sentences over the radio', motif: 'signal', k: ['signal', 'radio'],
        twists: ['One of them asked to be put on this shift.'] },
      { t: 'a power cut leaves them alone in the building until morning', motif: 'key', k: ['light', 'rain'],
        twists: ['The power cut was arranged by everybody else on the staff.'] }],
    block: ['one of them is engaged', 'the job is the only thing either of them has ever been good at', 'the building closes for good in the spring'],
    roles: ['the colleague who is engaged to somebody else', 'the supervisor who runs a book on them', 'the patient who sees everything'],
    tpl: '{Who} {where}. Then {spark}, and {block}.', log: '{Who} {where}.', tags: ['Same time tomorrow.', 'Nobody falls in love at work.'] },
  // ── Musical ──
  { id: 'saveTheHall', genre: 'Musical', k: ['unit', 'light', 'rain', 'ballroom', 'encore', 'chorus', 'cabaret', 'golden', 'music', 'heart'],
    who: [{ t: 'a singer three years past the good years', k: ['golden', 'encore'] }, { t: 'a bandleader holding a works band together', k: ['unit', 'band'] },
      { t: 'a cleaner who sings when the building is empty', k: ['light', 'heart'] }, { t: 'a retired dance teacher', k: ['ballroom'] }],
    where: [{ t: 'the factory’s brass band has one month before Unit 99 shuts', place: 'stage', k: ['unit', 'factory', 'works'] },
      { t: 'the town’s only theatre is sold unless one show fills it', place: 'stage', k: ['light', 'theatre', 'encore'] },
      { t: 'a ballroom has one dance left before the demolition', place: 'stage', k: ['ballroom', 'rain'] }],
    spark: [{ t: 'a national competition offers the prize money they need', motif: 'song', k: ['competition'],
        twists: ['The competition is being judged by the man who closed the factory.'] },
      { t: 'a child who will not speak turns out to sing like nobody they have ever heard', motif: 'song', k: ['light', 'voice'],
        twists: ['The child is the grandchild of the singer who walked out on them in 1986.'] },
      { t: 'an old recording turns up of the band at its best', motif: 'tape', k: ['music', 'record'],
        twists: ['The recording was made on the night the band split up.'] }],
    block: ['the people they need have not spoken to each other in years', 'the finale needs eleven performers and they have seven', 'the only one who can sing it will not'],
    roles: ['the trumpet player who quit to drive a bus', 'the owner who wants the money more than the hall', 'the understudy who is better'],
    tpl: '{Who} has one chance: {where}. Then {spark}, but {block}.', log: '{Who} has one chance: {where}.', tags: ['One more night. One more song.', 'The last show is the only one that counts.'] },
  { id: 'understudy', genre: 'Musical', k: ['understudy', 'encore', 'overture', 'serenade', 'stars', 'kings', 'angels', 'velvet'],
    who: [{ t: 'an understudy everybody has forgotten is in the building', k: ['understudy'] }, { t: 'a stage manager who knows every part', k: ['overture'] },
      { t: 'a backing singer on {their} ninth tour', k: ['serenade', 'velvet'] }],
    where: [{ t: 'on a touring show’s ninth town', place: 'stage', k: ['tour'] }, { t: 'on the opening night of a show that cost too much', place: 'stage', k: ['kings', 'angels'] }],
    spark: [{ t: 'the star loses {their} voice an hour before curtain', motif: 'song', k: ['voice'],
        twists: ['The star lost it on purpose, to give {them} the night.'] },
      { t: 'the composer walks out and leaves the finale unfinished', motif: 'list', k: ['finale'],
        twists: ['The composer wrote the finale years ago — for {them}.'] }],
    block: ['the star’s fans have bought every seat', 'the producer would rather cancel than risk it', 'nobody has rehearsed the second act with {them}'],
    roles: ['the star with the lost voice', 'the producer who is about to cancel', 'the conductor who has seen it all before'],
    tpl: '{Who} is {where} when {spark}. {Block}.', log: '{Who} gets one night when {spark}.', tags: ['Tonight, it’s you.', 'The show must.'] },
  // ── Drama ──
  { id: 'homecoming', genre: 'Drama', k: ['house', 'daughter', 'inheritance', 'apartment', 'quiet', 'mothers', 'names', 'door', 'voice', 'above'],
    who: [{ t: 'a daughter who came home when it was too late', g: 'f', k: ['daughter', 'mothers'] }, { t: 'a son who has been away for eleven years', g: 'm', k: ['inheritance'] },
      { t: 'a nurse who has not been home in eleven years', k: ['quiet', 'patient'] }],
    where: [{ t: 'to a house four people grew up in and none of them can keep', place: 'house', k: ['house', 'door'] },
      { t: 'to a flat above the shop where {their} mother sang every night', place: 'house', k: ['apartment', 'voice', 'above', 'door'] },
      { t: 'to a terrace due for clearance', place: 'block', k: ['apartment'] }],
    spark: [{ t: 'a will leaves everything to one of them', motif: 'list', k: ['inheritance', 'names'],
        twists: ['The will was written by the sibling it favours, and signed by a mother who could no longer read.'] },
      { t: 'a voice on an old cassette says something nobody was meant to hear', motif: 'tape', k: ['voice', 'echo'],
        twists: ['The voice on the tape is {their} own, aged six, repeating what {they} heard through the floor.'] },
      { t: 'a photograph shows their mother with a man none of them knows', motif: 'photo', k: ['photograph'],
        twists: ['The man is the father of only one of them.'] }],
    block: ['nobody in the room will say the thing out loud', 'the one who stayed is the one who is blamed', 'it is too late to be fair about it'],
    roles: ['the sibling who stayed', 'the neighbour who knew everything', 'the solicitor who is enjoying it'],
    tpl: '{Who} comes back {where}. {Spark}, and {block}.', log: '{Who} comes back {where}, and {spark}.', tags: ['Every family has one room nobody goes in.', 'Home is where it waited.'] },
  { id: 'holdingOn', genre: 'Drama', k: ['machine', 'honest', 'field', 'country', 'winter', 'harbour', 'fallow', 'orchard'],
    who: [{ t: 'a headteacher holding a school together with nothing', k: ['honest', 'patient'] }, { t: 'the last engineer who understands the machine', k: ['machine', 'engine'] },
      { t: 'a farmer’s widow', g: 'f', k: ['field', 'fallow', 'orchard'] }],
    where: [{ t: 'a boarding school in the fog with one inspection left', place: 'school', k: ['school', 'fog'] }, { t: 'a family firm with one bad year left in it', place: 'city', k: ['machine', 'firm'] },
      { t: 'a farm being sold out from under three generations', place: 'field', k: ['field', 'country', 'fallow', 'orchard'] }],
    spark: [{ t: 'somebody who left forty years ago comes back with an offer that would save it', motif: 'letter', k: ['honest'],
        twists: ['The offer is the reason it failed in the first place.'] },
      { t: 'the machine breaks the week the buyers come', motif: 'key', k: ['machine'],
        twists: ['It was broken on purpose, by somebody who wanted it saved.'] },
      { t: 'a woman who left forty years ago comes back to buy it', motif: 'photo', k: ['woman', 'came'],
        twists: ['She is the reason the family stayed.'] }],
    block: ['everybody else has already given up', 'saving it will cost {them} the one person {they} {love}', 'the town has already decided'],
    roles: ['the one who came back with money', 'the deputy who wants the job', 'the accountant who has seen the books'],
    tpl: '{Who} is all that stands between {where} and the end. Then {spark}, and {block}.', log: '{Who} has one year to save {where}.', tags: ['Some things are worth one more year.', 'It is not over until somebody says so.'] },
  // ── Horror ──
  { id: 'theHouse', genre: 'Horror', k: ['house', 'hive', 'sisters', 'cellar', 'hush', 'widow', 'door', 'children'],
    who: [{ t: 'a mother who knows exactly what is in the house', g: 'f', k: ['widow', 'mothers'] }, { t: 'the one who does not believe any of it', k: ['hush'] },
      { t: 'the eldest of three sisters', g: 'f', k: ['sisters', 'hive'] }],
    where: [{ t: 'a farmhouse eleven miles from the next one', place: 'field', k: ['harvest', 'hunger', 'hungers'] }, { t: 'a house the family inherited and nobody would buy', place: 'house', k: ['house', 'door', 'cellar'] },
      { t: 'a house whose walls are full of bees', place: 'house', k: ['hive'] }],
    spark: [{ t: 'something in the house starts using the children’s voices', motif: 'song', k: ['voice', 'children', 'sisters'],
        twists: ['It has been using {their} voice too, for years, and nobody noticed.'] },
      { t: 'a door is open in the morning that nobody opened', motif: 'key', k: ['door'],
        twists: ['The door was opened from inside — by one of them, asleep.'] },
      { t: 'a photograph turns up in which somebody is always one step closer', motif: 'photo', k: ['photograph'],
        twists: ['The somebody in the photograph is the youngest of them, as she will look in forty years.'] }],
    block: ['leaving is not the same as getting out', 'nobody believes the one who saw it', 'every one of them agreed to it once'],
    roles: ['the sister who stopped being frightened', 'the neighbour who left a long time ago', 'the priest who will not come'],
    tpl: '{Who} moves into {where}. Then {spark}, and {block}.', log: '{Who} moves into {where}, and {spark}.', tags: ['It was patient.', 'Do not answer.'] },
  { id: 'theStudy', genre: 'Horror', k: ['protocol', 'clinic', 'study', 'bone', 'skinless', 'stab', 'marrow', 'rictus'],
    who: [{ t: 'a medical student who needs the money', k: ['protocol', 'clinic'] }, { t: 'a woman just out of hospital herself', g: 'f', k: ['bone', 'skinless'] },
      { t: 'a man who cannot sleep anyway', g: 'm', k: ['hush'] }],
    where: [{ t: 'a sleep clinic running Protocol 79 with one patient left', place: 'ward', k: ['protocol', 'clinic', 'sleep'] },
      { t: 'a care home with a corridor nobody uses', place: 'ward', k: ['bone', 'care'] }, { t: 'a research station on a dead island', place: 'sea', k: ['marrow', 'island'] }],
    spark: [{ t: 'the patient starts describing the staff’s dreams', motif: 'list', k: ['protocol'],
        twists: ['The dreams are not the staff’s. They are the last patient’s, before this one.'] },
      { t: 'a tape from the first trial in 1979 plays something else each time', motif: 'tape', k: ['protocol', 'seventy'],
        twists: ['{Their} own voice is on the 1979 tape.'] },
      { t: 'the records list a patient nobody remembers admitting', motif: 'list', k: ['names'],
        twists: ['The patient nobody admitted is {them}.'] }],
    block: ['the study pays only if {they} {stay} to the end', 'nobody outside will believe a word of it', 'the doors lock at ten'],
    roles: ['the doctor who runs the protocol', 'the other volunteer who has done this before', 'the night guard who never goes on the third floor'],
    tpl: '{Who} takes a night job at {where}. Then {spark}, and {block}.', log: '{Who} takes a night job at {where}.', tags: ['Do not fall asleep.', 'Lights out at ten.'] },
  { id: 'theVillage', genre: 'Horror', k: ['hunger', 'hungers', 'harvest', 'village', 'graves', 'death', 'crosses', 'pale', 'starving'],
    who: [{ t: 'a schoolteacher new to the village', k: ['pale'] }, { t: 'a woman who came back for her father’s funeral', g: 'f', k: ['graves', 'crosses', 'death'] }, { t: 'a census taker', k: ['names'] }],
    where: [{ t: 'a village that goes hungry every year in the same week of July', place: 'field', k: ['hunger', 'hungers', 'starving', 'harvest'] },
      { t: 'a village that empties every winter and fills again in spring', place: 'snow', k: ['winter', 'pale'] }],
    spark: [{ t: 'nobody in the village remembers last July', motif: 'list', k: ['hunger', 'hungers'],
        twists: ['They remember perfectly. They agreed to forget, and {they} {was} part of the agreement.'] },
      { t: 'a name is carved in the church where nobody could reach', motif: 'key', k: ['crosses', 'graves'],
        twists: ['The name is {their} own, and the carving is two hundred years old.'] }],
    block: ['leaving is not the same as getting out', 'the village has already decided who will be next', 'the only road out floods at the same time every year'],
    roles: ['the vicar who keeps the register', 'the child who is not afraid', 'the landlady who has seen this before'],
    tpl: '{Who} arrives at {where}. {Spark}, and {block}.', log: '{Who} arrives at {where}.', tags: ['Nobody leaves in July.', 'They remember you.'] },
  // ── Thriller ──
  { id: 'theCrossing', genre: 'Thriller', k: ['signal', 'radiant', 'border', 'passenger', 'undertow', 'ferry', 'sudden', 'crossing'],
    who: [{ t: 'a ship’s radio officer', k: ['signal', 'radiant'] }, { t: 'a passenger who saw the wrong thing on the wrong night', k: ['passenger', 'witness'] },
      { t: 'a coastguard on {their} last shift', k: ['undertow'] }],
    where: [{ t: 'a ferry that cannot turn back', place: 'sea', k: ['ferry', 'undertow', 'crossing'] }, { t: 'an island with one ferry a day', place: 'sea', k: ['island', 'signal'] },
      { t: 'a border crossing kept open an extra night', place: 'road', k: ['border'] }],
    spark: [{ t: 'a distress signal comes in from a boat that sank twenty years ago', motif: 'signal', k: ['signal', 'radiant'],
        twists: ['The signal is coming from the ferry itself, on a channel nobody aboard should know.'] },
      { t: 'a woman everyone agreed had disappeared is on the passenger list', motif: 'list', k: ['passenger', 'disappeared', 'woman'],
        twists: ['She never left the island; the woman who did was somebody else.'] },
      { t: 'forty minutes of the night’s footage are missing', motif: 'tape', k: ['footage', 'echo'],
        twists: ['{They} erased it {themselves}, and does not remember why.'] }],
    block: ['the person asking already knows', 'there are two hours before they reach land', 'the safest thing to do is also the worst'],
    roles: ['the captain who is lying', 'the passenger who will not give a name', 'the officer who warned them and went quiet'],
    tpl: '{Who} is on {where} when {spark}. {Block}.', log: '{Who} is on {where} when {spark}.', tags: ['No way back.', 'Somebody on board knows.'] },
  { id: 'theDeadline', genre: 'Thriller', k: ['echo', 'hollow', 'wire', 'deadline', 'countdown', 'silent', 'shadows', 'lies', 'tasmakorono'],
    who: [{ t: 'a night editor', k: ['deadline', 'wire'] }, { t: 'a translator who starts changing what is said', k: ['lies', 'silent'] }, { t: 'a sound engineer', k: ['echo', 'hollow'] }],
    where: [{ t: 'twelve hours from publishing the story of the decade', place: 'city', k: ['deadline', 'countdown'] },
      { t: 'in a courthouse in a town of nine hundred people', place: 'court', k: ['hollow', 'small'] }, { t: 'on the last night of a hearing that was meant to be a formality', place: 'court', k: ['silent'] }],
    spark: [{ t: 'the only source goes quiet', motif: 'phone', k: ['silent', 'shadows'],
        twists: ['The source was {their} own father, and he went quiet to protect {them}.'] },
      { t: 'a recording of the key witness has an echo that should not be there', motif: 'tape', k: ['echo', 'hollow'],
        twists: ['The echo places the recording in a room that was demolished before the crime.'] },
      { t: 'a photograph turns up that should not exist', motif: 'photo', k: ['photograph'],
        twists: ['The photograph was taken by the witness, of the person asking the questions.'] }],
    block: ['somebody has been one step ahead the whole way', 'the deadline is not the real deadline', 'the one who warned them has gone quiet'],
    roles: ['the source who stops answering', 'the editor who wants it killed', 'the witness who changes the story every time'],
    tpl: '{Who} is {where} when {spark}. {Block}.', log: '{Who} is {where} when {spark}.', tags: ['Trust nobody before midnight.', 'The truth has a deadline.'] },
  // ── Crime ──
  { id: 'theFamily', genre: 'Crime', k: ['sirens', 'debt', 'debts', 'ledger', 'thieves', 'harbour', 'loaded', 'racket', 'dirty'],
    who: [{ t: 'a son who wants out of the family business', g: 'm', k: ['debt', 'debts'] }, { t: 'the daughter who keeps the books', g: 'f', k: ['ledger'] }, { t: 'a fisherman’s widow', g: 'f', k: ['sirens', 'harbour'] }],
    where: [{ t: 'a port where everything goes through two families', place: 'sea', k: ['sirens', 'harbour', 'port'] }, { t: 'a haulage firm with too many lorries for its contracts', place: 'road', k: ['loaded'] },
      { t: 'a fishing fleet down to four boats', place: 'sea', k: ['sirens', 'fleet'] }],
    spark: [{ t: 'a debt inherited with the business finally comes due', motif: 'money', k: ['debt', 'debts', 'ledger'],
        twists: ['The debt was never real; it was the price of somebody’s silence.'] },
      { t: 'a strike on the docks goes into its ninth week', motif: 'list', k: ['sirens', 'harbour', 'strike'],
        twists: ['The strike is being paid for by the other family.'] },
      { t: 'a van comes back lighter than it went', motif: 'money', k: ['loaded', 'thieves'],
        twists: ['The missing load was taken by {their} own father.'] }],
    block: ['loyalty here has a price list', 'the family will decide before the court does', 'the police are the smallest problem in it'],
    roles: ['the father who cannot let go', 'the rival family’s youngest', 'the detective who grew up on the same street'],
    tpl: 'In {where}, {who} runs out of time when {spark}. {Block}.', log: 'In {where}, {who} runs out of time when {spark}.', tags: ['Family first. Family last.', 'Everybody pays.'] },
  { id: 'theRelease', genre: 'Crime', k: ['sentence', 'double', 'alibi', 'verdict', 'warrant', 'witness', 'precinct', 'fair', 'marked'],
    who: [{ t: 'a detective two years off the pension', k: ['precinct', 'warrant'] }, { t: 'a lawyer defending somebody {they} {believe} did it', k: ['alibi', 'verdict', 'fair', 'sentence'] },
      { t: 'the brother who drove the car', g: 'm', k: ['double', 'marked'] }],
    where: [{ t: 'a town where a man has just been released nine years early', place: 'town', k: ['sentence', 'double'] }, { t: 'a courtroom where everybody is related', place: 'court', k: ['alibi', 'verdict', 'fair'] }],
    spark: [{ t: 'the only alibi is the one person who will not talk', motif: 'key', k: ['alibi'],
        twists: ['The alibi is true, and it is worse than the crime.'] },
      { t: 'a confession turns up on tape, traded for somebody else’s name', motif: 'tape', k: ['sentence', 'confession', 'double'],
        twists: ['The name traded for the confession is {their} own.'] }],
    block: ['the one who talks will be the one who had least to gain', 'everybody is waiting for somebody else to move first', 'the town has already decided'],
    roles: ['the man released early', 'the prosecutor who wants a career', 'the witness who will be paid either way'],
    tpl: '{Who} is pulled into {where}. {Spark}, and {block}.', log: '{Who} is pulled into {where}.', tags: ['Everybody did something.', 'Nine years is a long time to think.'] },
  // ── Sci-Fi ──
  { id: 'theStation', genre: 'Sci-Fi', k: ['station', 'orbit', 'signal', 'wonders', 'stars', 'colony', 'last', 'woman', 'outer', 'horizon'],
    who: [{ t: 'the engineer who reads the numbers first', k: ['engine', 'protocol'] }, { t: 'the last woman left on the station', g: 'f', k: ['last', 'woman'] },
      { t: 'a translator for something that does not want to talk', k: ['signal', 'wonders'] }],
    where: [{ t: 'a research station eight months from resupply', place: 'space', k: ['station', 'colony'] }, { t: 'a station that has stopped hearing from anybody', place: 'space', k: ['last', 'signal', 'silence'] },
      { t: 'a hotel in orbit kept open for one guest', place: 'space', k: ['orbit', 'hotel', 'stars'] }],
    spark: [{ t: 'a signal arrives in the wrong order — the answer first', motif: 'signal', k: ['signal', 'wonders'],
        twists: ['The answer is from the station itself, nine years from now.'] },
      { t: 'a copy of {them} walks out of the medical bay', motif: 'pill', k: ['woman', 'copy'],
        twists: ['{They} {is} the copy, and has been for three years.'] },
      { t: 'the guest stops answering the door', motif: 'key', k: ['hotel', 'guest'],
        twists: ['There has never been a guest; the hotel is keeping {them}.'] }],
    block: ['nobody can agree what counts as a person', 'the decision has to be made by people who will not live with it', 'it has already happened once'],
    roles: ['the commander who knows more', 'the copy', 'the voice on the radio from Earth'],
    tpl: '{Who} is alone on {where} when {spark}. {Block}.', log: '{Who} is alone on {where} when {spark}.', tags: ['Somebody is still listening.', 'You are not the first.'] },
  { id: 'theMessage', genre: 'Sci-Fi', k: ['stars', 'light', 'signal', 'machine', 'transparent', 'terminal', 'machines', 'glass'],
    who: [{ t: 'a radio astronomer', k: ['stars', 'signal'] }, { t: 'a machine that is right more often than the people', k: ['machine', 'machines', 'terminal'] }, { t: 'a child born where there is no law for it', k: ['transparent', 'glass'] }],
    where: [{ t: 'in a city where water is rationed by lottery', place: 'city', k: ['glass', 'transparent'] }, { t: 'on a ship whose crew wake in shifts of two', place: 'space', k: ['stars', 'light'] }],
    spark: [{ t: 'a message arrives that takes nine years to answer', motif: 'signal', k: ['stars', 'light', 'signal'],
        twists: ['The message is the reply to something sent from here that nobody remembers sending.'] },
      { t: 'the vote is called on whether {they} {is} alive', motif: 'list', k: ['machine', 'machines'],
        twists: ['The vote was decided before it was called; the count is a courtesy.'] }],
    block: ['the answer costs more than the question was worth', 'the law was written for a world that has gone', 'the one who understands it is not permitted to say'],
    roles: ['the commander who wants it kept quiet', 'the crewmate on the other shift', 'the lawyer for the machine'],
    tpl: '{Who} lives {where}. Then {spark}, and {block}.', log: '{Who} lives {where} — until {spark}.', tags: ['Some questions take a lifetime.', 'Is anyone there?'] },
];

// The words of a title, as the shapes speak about them.
const TITLE_WORDS = { talker: ['talker', 'talk', 'radio', 'voice'], midnight: ['midnight', 'night'], unit: ['unit', 'factory', 'works'], orbit: ['orbit', 'stars'], protocol: ['protocol', 'clinic'],
  sirens: ['sirens', 'harbour', 'sea'], debt: ['debt', 'debts'], hungers: ['hungers', 'hunger'], signal: ['signal', 'radio'], radiant: ['radiant', 'signal'], sentence: ['sentence', 'court'],
  echo: ['echo', 'hollow'], hollow: ['hollow', 'echo'], letter: ['letter'], honest: ['honest', 'letter'], wedding: ['wedding', 'small'], light: ['light', 'theatre'], rain: ['rain'],
  machine: ['machine'], apartment: ['apartment', 'flat'], roommate: ['roommate', 'apartment'], voice: ['voice'], door: ['door'], hive: ['hive', 'sisters'], sisters: ['sisters'],
  woman: ['woman'], last: ['last'], stars: ['stars', 'signal'], wonders: ['wonders', 'signal'], idiots: ['idiots', 'fools'], fair: ['fair', 'alibi'], alibi: ['alibi'], double: ['double', 'sentence'] };
function titleWords(title) {
  const out = new Set();
  for (const w of String(title || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)) { out.add(w); for (const x of TITLE_WORDS[w] || []) out.add(x); }
  return out;
}
const score = (opt, words) => (opt.k || []).reduce((n, k) => n + (words.has(k) ? 1 : 0), 0);
// The best-matching option, the seed breaking ties — so a title with nothing to say gets a fair draw.
// `filter` is what is wanted, `must` what is required: when nothing passes the first, the second.
function choose(opts, words, r, filter = () => true, must = filter) {
  const ok = opts.filter(filter), need = opts.filter(must);
  const list = ok.length ? ok : need.length ? need : opts;
  const best = Math.max(...list.map((o) => score(o, words)));
  return pickR(list.filter((o) => score(o, words) === best), r);
}
// he / she / they, for the hero
const VERB = { is: 'is', was: 'was', run: 'runs', show: 'shows', stay: 'stays', believe: 'believes', love: 'loves' };
const PRON = { m: { they: 'he', them: 'him', their: 'his', themselves: 'himself', ...VERB }, f: { they: 'she', them: 'her', their: 'her', themselves: 'herself', ...VERB } };
function fill(text, g) {
  const p = PRON[g] || PRON.m;
  return text.replace(/\{(They|they|Them|them|Their|their|themselves|is|was|run|show|stay|believe|love)\}/g, (m, w) => { const v = p[w.toLowerCase()]; return w[0] === w[0].toUpperCase() && !VERB[w] ? cap(v) : v; });
}

// One combination, written out — what storyFor does once it has chosen, and what the checker reads
// for every combination a shape can make.
export function compose(shape, who, where, spark, block, twist, g) {
  const f = (t) => fill(t, g);
  const W = f(who.t), S = f(spark.t), P = f(where.t), B = f(text(block));
  const put = (tpl) => tpl.replace('{Who}', cap(W)).replace('{who}', W).replace('{where}', P).replace('{Spark}', cap(S)).replace('{spark}', S).replace('{Block}', cap(B)).replace('{block}', B);
  return { logline: put(shape.log), synopsis: put(shape.tpl), twist: f(text(twist)), hero: W };
}
const text = (o) => (typeof o === 'string' ? o : o.t);
// what is true of this hero in this place, for `needs`
export const traitsOf = (who, where) => new Set([where.place, ...(who.is || []), ...(where.is || [])]);
export const fits = (o, traits) => typeof o === 'string' || !o.needs || o.needs.every((n) => traits.has(n));

// ── a film's story ────────────────────────────────────────────────────────────
// { title, genre, gender (the hero's, when the player is the lead), lead (is the player the hero) }
// `recent` is the stories of the player's last films, newest last: the last three shapes are not
// told again, and no hero, place or incident from any of them is used twice while another will do.
export function storyFor({ title, genre, gender = 'm', lead = true, recent = [] }) {
  const r = rng(hash('story|' + title + '|' + genre));
  for (let i = 0; i < 3; i++) r();
  const words = titleWords(title);
  const all = SHAPES.filter((s) => s.genre === genre);
  if (!all.length) return null;
  const lately = new Set(recent.slice(-3).map((x) => x.shape));
  const shapes = all.filter((s) => !lately.has(s.id)).length ? all.filter((s) => !lately.has(s.id)) : all;
  const used = new Set(recent.flatMap((x) => x.parts || []));
  const unused = (o) => !used.has(o.t);
  // the shape the title speaks to most: its own words, and the best option in each slot
  const fit = (s) => score(s, words) + Math.max(0, ...s.who.map((o) => score(o, words))) + Math.max(0, ...s.where.map((o) => score(o, words))) + Math.max(0, ...s.spark.map((o) => score(o, words)));
  const best = Math.max(...shapes.map(fit));
  const shape = pickR(shapes.filter((s) => fit(s) === best), r);
  const g = lead ? gender : (r() < 0.5 ? 'm' : 'f');
  const who = choose(shape.who, words, r, (o) => (!o.g || o.g === g) && unused(o), (o) => !o.g || o.g === g);
  const where = choose(shape.where, words, r, (o) => fits(who, traitsOf(who, o)) && fits(o, traitsOf(who, o)) && unused(o), (o) => fits(who, traitsOf(who, o)) && fits(o, traitsOf(who, o)));
  const tr = traitsOf(who, where);
  const spark = choose(shape.spark, words, r, (o) => fits(o, tr) && unused(o), (o) => fits(o, tr));
  const block = pickR(shape.block.filter((o) => fits(o, tr)), r);
  const twist = pickR(spark.twists.filter((o) => fits(o, tr)), r);
  const c = compose(shape, who, where, spark, block, twist, g);
  const matched = [...new Set([...(shape.k || []), ...(who.k || []), ...(where.k || []), ...(spark.k || [])].filter((k) => words.has(k)))];
  return {
    v: 1, shape: shape.id, genre, g,
    hero: c.hero, place: where.place, traits: [...tr], motif: spark.motif || null,
    logline: c.logline, synopsis: c.synopsis,
    twist: c.twist,                                    // hidden: never on a poster, an offer or a review
    tagline: pickR(shape.tags, r),
    // the player's part: the hero when it is the lead, one of the shape's other people when not
    part: lead ? c.hero : pickR(shape.roles, r),
    matched,
    // for a sequel: what is now common knowledge, and what the next one can be set off by
    used: { spark: spark.t, twist: c.twist },
    // what the next films should not repeat
    parts: [who.t, where.t, spark.t],
  };
}
// A part two remembers part one: the twist is now what everybody knows, the hero is the same
// person some years on, and the next thing that happens comes from the same shape — never the
// same incident twice.
export function sequelFor(first, { title, years = 3, fate = null }) {
  const shape = SHAPES.find((s) => s.id === first.shape);
  if (!shape) return null;
  const r = rng(hash('sequel|' + title + '|' + first.shape));
  const tr = new Set(first.traits || [first.place]);
  const ok = shape.spark.filter((x) => fits(x, tr));
  const fresh = ok.filter((x) => x.t !== first.used.spark);
  const spark = pickR(fresh.length ? fresh : ok, r);
  const block = text(pickR(shape.block.filter((o) => fits(o, tr)), r));
  const after = years <= 1 ? 'A year after' : `${years} years after`;
  const known = first.twist.replace(/\.$/, '');
  const S = fill(spark.t, first.g);
  return { logline: `${after} the first film, ${low(first.hero)} is living with what everybody now knows. Then ${S}.`,
    synopsis: `Everybody knows now: ${low(known)}. ${after} it, ${low(first.hero)} is still there${fate ? ', ' + fate : ''} — and then ${S}, and ${fill(block, first.g)}.`,
    twist: fill(text(pickR(spark.twists.filter((o) => fits(o, tr)), r)), first.g) };
}
