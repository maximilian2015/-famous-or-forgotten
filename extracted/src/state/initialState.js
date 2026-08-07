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
    cash: 3500, fame: 0, media: 0, respect: 0, scandal: 0,
    mental: 80, health: 90, looks: 50, charisma: 40, confidence: 40,
    discipline: 40, luck: 50, acting: 0, singing: 0,
    filmography: [], discography: [], offers: [], people: [],
    family: [], parentsMarried: true, spotlight: [],
    inbox: [], timeline: [], flags: {},
    look: null,   // filled in by ensureAppearance — see systems/life/appearance.js
    ap: 3, apMax: 3,
    alive: true,
  };
}
