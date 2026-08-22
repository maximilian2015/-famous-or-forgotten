export function createInitialState(opts = {}) {
  return {
    version: 'r0.8b',
    name: opts.name || 'Alex Moon',
    city: opts.city || 'Amsterdam',
    dream: opts.dream || 'actor',
    gender: opts.gender || 'male',
    // false until the player has actually made a character — the creator screen gates on this
    created: !!opts.created,
    year: opts.startYear || 2026, month: 0, ageY: 0,
    stage: 'child', livingWith: 'parents', hasApartment: false,
    housing: 'room', diet: 'cook', gym: false, genreXP: {},
    // A newborn owns nothing. Money comes from the family — see systems/life/origin.js.
    // What you were paid last time. From Star upwards it is what you negotiate against.
    quote: 0,
    cash: 0, familyClass: 'getting_by', familyAsk: 1, singleParent: false,
    familyEstate: null, familyLeavesHome: false, inheritedHome: false,
    homeless: false, rentMissed: 0, monthsOnStreet: 0, bigMoment: null,
    originStory: '', origin: null,
    fame: 0, media: 0, respect: 0, scandal: 0,
    mental: 80, health: 90, looks: 50, charisma: 40, confidence: 40,
    discipline: 40, luck: 50, acting: 0, singing: 0,
    filmography: [], discography: [], offers: [], people: [],
    releases: [],   // shot, in post, not out yet — see systems/career/release.js
    frozen: [],     // started, stopped, waiting for money — see systems/career/stability.js
    awards: { losses: 0, wins: [], nominations: [], pending: null, history: [] },
    strain: 0, burnout: null,   // what the work costs you — see systems/life/strain.js
    family: [], parentsMarried: true, spotlight: [],
    inbox: [], timeline: [], flags: {},
    look: opts.look || null,   // the creator can hand one in; otherwise ensureAppearance rolls it
    ap: 3, apMax: 3,
    alive: true,
  };
}
