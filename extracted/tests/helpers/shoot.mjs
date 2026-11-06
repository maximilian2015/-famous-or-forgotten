// A shoot, made the way the game makes one, on a chosen day of it. tests/test_minigames.mjs plays
// these and tests/probes/probe_day_saves.mjs writes them out for Maxi to play.
//
// dressOffers gives the film a story and a part, startProduction makes the set and the crew, and
// sceneDay is the function maybeScene calls. plot: false is an old save or a sequel, which has
// neither a story nor a page.
import { createInitialState } from '../../src/state/initialState.js';
import { beginLife } from '../../src/systems/life/origin.js';
import { dressOffers } from '../../src/systems/career/script.js';
import { startProduction, sets } from '../../src/systems/career/production.js';
import { sceneDay } from '../../src/systems/career/scenes.js';

export function shoot(id, { plot = true, over = {} } = {}) {
  const s = createInitialState({ name: 'Alex Moon', dream: 'actor', created: true, gender: 'female' });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 34, year: 2060, month: 3, hasApartment: true, livingWith: 'own_place', housing: 'room',
    cash: 400000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, acting: 60, fame: 50, respect: 50, health: 80, mental: 60, strain: 10 });
  const o = { id: 'o1', projectTitle: 'Paper Cousin', role: 'Lead', tier: 'lead', type: 'Feature Film', genre: 'Drama', scale: 'feature',
    months: 6, salary: 400000, prestigeScore: 60, stability: 90, deadline: 3, director: 'Rosalind Varga' };
  s.offers = [o];
  if (plot) dressOffers(s);
  else { o.premise = 'A harbour town, a disappearance.'; o.character = { name: 'Nadia Kerr', what: 'a sister', tier: 'lead' }; }
  startProduction(s, o);
  s.offers = [];
  const p = sets(s)[0];
  Object.assign(p, { take: 'straight', takeWon: true, prepLeft: 0, monthsLeft: 3, meter: 40 });
  if (!p.crew || !p.crew.length) p.crew = [{ id: 'c0', name: 'Rosalind Varga', role: 'Director', bond: 50, bond0: 50 }];
  p.crew[0].bond = 50;
  Object.assign(p, over);
  if (id) s.scene = sceneDay(s, p, id);
  return s;
}
