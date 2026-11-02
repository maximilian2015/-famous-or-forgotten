// The day a critic names (career/scenes.js MOMENT). Eight scenes had no line, so the review said
// "There is the something in the shot in the middle of it" and the wrap said "In the film now: the
// something in the shot." (audit, 23 Oct). Every scene has a sentence now, it reads in every line
// a critic can put it in, and an old save that already carries a menu title is mended on load.
import './helpers/seeded.mjs';
import { SCENES, momentFor, settleMoments } from '../src/systems/career/scenes.js';
import { reviewsFor } from '../src/systems/world/critics.js';
import { createInitialState } from '../src/state/initialState.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const titles = Object.values(SCENES).map((sc) => `the ${sc.label.toLowerCase()}`);
const menu = (t) => titles.find((x) => t.toLowerCase().includes(x));

// ── every scene has a sentence of its own ──
{
  const missing = Object.keys(SCENES).filter((id) => momentFor(id) === 'a scene people will remember');
  ok('every scene in the game has its own line for the critics', !missing.length, missing.join(', '));
  const bad = Object.keys(SCENES).filter((id) => menu(momentFor(id)) || !/^(a|an) [a-z][^,]*$/.test(momentFor(id)) || /[.!?]$/.test(momentFor(id)));
  ok('each is one thing (a or an), lower case, no comma, no full stop, and never a menu title', !bad.length, bad.map((id) => `${id}: ${momentFor(id)}`).join(' | '));
}

// ── and it reads where it is put ──
{
  const s = createInitialState({ name: 'Ada Reel', dream: 'actor', created: true });
  let seen = 0, broken = [];
  for (const id of Object.keys(SCENES)) {
    for (const story of [null, 'the night she comes home']) {
      const moment = story ? `${momentFor(id)}, in ${story}` : momentFor(id);
      for (let i = 0; i < 40; i++) {
        for (const rating of [88, 52]) for (const series of [false, true]) {
          const r = reviewsFor(s, { title: 'Light and Rain', rating, genre: 'Drama', verdict: 'hit', actorName: 'Ada Reel', moment, series });
          for (const rv of r.reviews) {
            const at = rv.text.indexOf(moment.split(',')[0].slice(0, 30));
            if (at < 0) continue;
            seen++;
            if (menu(rv.text) || /\{|undefined|  /.test(rv.text) || /\b(a|an|the) (a|an|the)\b/i.test(rv.text) || /\b(\w+) \1\b/i.test(rv.text)) broken.push(rv.text);
          }
        }
      }
    }
  }
  ok('the critics used the lines in real reviews', seen > 200, String(seen));
  ok('and not one of those reviews quotes a menu title, a hole or a doubled word', !broken.length, broken.slice(0, 2).join(' || '));
  const wrap = Object.keys(SCENES).map((id) => `In the film now: ${momentFor(id)}.`);
  ok('the wrap reads "In the film now: …" with a sentence, not a title', !wrap.some(menu), wrap.find(menu) || '');
}

// ── an old save is mended on load, and nothing else is touched ──
{
  const s = {
    productions: [{ moments: ['the something in the shot', 'a stunt the actor plainly did themselves'] }],
    releases: [{ moments: ['the the take sheet'] }],   // "The take sheet" came out with two articles
    filmography: [{ title: 'x', _rel: { moments: ['the the table read'] } }, { title: 'y' }],
  };
  settleMoments(s);
  ok('a set in progress gets the sentence', s.productions[0].moments[0] === momentFor('boom'), s.productions[0].moments[0]);
  ok('a line that was always a sentence is left alone', s.productions[0].moments[1] === 'a stunt the actor plainly did themselves');
  ok('a release waiting for its night is mended', s.releases[0].moments[0] === momentFor('sheet'), s.releases[0].moments[0]);
  ok('so is a credit still in its run', s.filmography[0]._rel.moments[0] === momentFor('read'), s.filmography[0]._rel.moments[0]);
  ok('a save with none of it is not changed', JSON.stringify(settleMoments({ filmography: [{ title: 'z' }] })) === JSON.stringify({ filmography: [{ title: 'z' }] }));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
