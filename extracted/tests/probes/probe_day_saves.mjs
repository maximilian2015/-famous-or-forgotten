// Writes one save per day on set, for playing any of the sixteen by hand without waiting for a
// shoot to throw it: playtest/days/<id>.json. Same shoot as tests/test_minigames.mjs. Run it again
// after CURRENT_VERSION changes, or the game will refuse them.
//   node tests/probes/probe_day_saves.mjs
import '../helpers/seeded.mjs';
import fs from 'fs';
import { shoot } from '../helpers/shoot.mjs';
import { SCENE_IDS } from '../../src/systems/career/scenes.js';

const out = new URL('../../../playtest/days/', import.meta.url);
fs.mkdirSync(out, { recursive: true });
for (const id of SCENE_IDS) fs.writeFileSync(new URL(`${id}.json`, out), JSON.stringify(shoot(id)));
console.log(`${SCENE_IDS.length} days in playtest/days/`);
