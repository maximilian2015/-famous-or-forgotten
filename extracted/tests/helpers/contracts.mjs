import { createInitialState } from '../../src/state/initialState.js';
import { draftContract } from '../../src/systems/career/contract.js';
import { callTheRoom, standoffTick } from '../../src/systems/career/standoff.js';

export const roundTrip = s => JSON.parse(JSON.stringify(s));
export function withSeed(seed, fn) {
  const random = Math.random;
  try {
    Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    return fn();
  } finally { Math.random = random; }
}
export function career(over = {}) {
  return { ...createInitialState({ created: true }), name: 'Audit Actor', ageY: 35, stage: 'career',
    hasApartment: true, livingWith: 'alone', fame: 80, peakFame: 80, respect: 60,
    acting: 80, cash: 1e7, year: 2058, month: 0, productions: [], inbox: [], people: [],
    filmography: [{ id: 'season-2', title: 'Black Harbor · season 2', type: 'Drama Series', season: 2,
      year: 2057, rating: 80, openViewers: 4, endViewers: 4.5, viewers: 4.3, running: false, renewal: 'renewed' }],
    ap: 100, apMax: 100, apMaxEff: 100, talent: 95, genreXP: {}, ...over };
}
export function renewal(over = {}) {
  return { id: 'renewal', projectTitle: 'Black Harbor · season 3', seriesTitle: 'Black Harbor',
    kind: 'renewal', role: 'Lead', tier: 'lead', type: 'Drama Series', genre: 'Drama',
    scale: 'recurring', season: 3, episodes: 10, episodeFee: 100000, salary: 1000000,
    perEpisode: true, months: 5, prestigeScore: 80, stability: 95, deadline: 3,
    character: { name: 'Ethan Cole', what: 'the son who stayed', tier: 'lead' },
    premise: 'The son who stayed.', potential: 'open', ...over };
}
export function nextMonth(s) { s.month++; if (s.month > 11) { s.month = 0; s.year++; } }
export function openRoom(s, o) {
  s.offers = [o]; draftContract(s, o); callTheRoom(s, o);
  if (!s.standoff) throw new Error('fixture: no meeting was booked');
  s.year = Math.floor(s.standoff.due / 12); s.month = s.standoff.due % 12;
  standoffTick(s);
  if (!s.standoff.open) throw new Error('fixture: the meeting did not open');
}
