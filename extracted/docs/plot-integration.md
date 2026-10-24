# Film stories in the game — stages

Branch `story-v1` (from `story-audit`). Nothing on main until Maxi says so.

## Stage 1 — the story is kept on the film and shown on the offer (done on the branch)

- `career/plot/` is the generator (moved from `tools/story-proto`, which keeps only the checkers).
- `career/script.js dressOffers` gives a **new first film** in one of the eight genres its story once:
  - the offer's premise is the synopsis (two sentences, no twist);
  - the part is the hero for a lead, one of the story's other people for a supporting role, of the
    player's gender when the wording has one.
- The story (`plot`, twist included) rides with the project: shoot → freeze/thaw → release → credit.
  It is never shown, and nothing re-tells it.
- **Not touched:**
  - offers already dressed in an old save, and films already made — they keep what they said;
  - sequels, seasons, renewals and series;
  - genres without stories (Commercial etc.).
- Tests: `tests/test_plot.mjs`. Story checks: `tools/story-proto` (check, structure, titles, memory).

## Stage 1b — a new film's title from its story

Today the title is made first (systems/world/titles.js) and the story reads it, so about one title
in five has a head word the story cannot answer. `tools/story-proto/titlefor.mjs` makes the title
from the story instead, in the game's own manner: head word in the story 100%, no repeats.

Before switching, an audit is needed: who else reads an offer's title (the board, franchises,
rumours, the world's films, "titles used in this life").

## Stage 2 — the character, after the part is accepted

The offer shows two or three sentences. After signing:
- who you play;
- what they want;
- what happens to them;
- who they are to the others.

This needs a little more data per hero and per role (a want, a relation), and then the on-set
scenes and the production's asks (`career/demands.js`) can speak about this film instead of a
genre.

## Stage 3 — posters and reviews

- Posters read the place, the incident's object (motif) and the tagline — never the twist.
- Reviews may speak of the premise and the hero, and never of the twist.

## Stage 4 — sequels and series

- Part two from part one's stored story (`sequelFor`): the same hero, the same place, part one's
  twist now common knowledge, a new incident, four openings that do not repeat.
- Checked by `structure.mjs` for every part one a shape can make.
- Series need their own shapes or a season form. Not started.

## Still open from the critique

- **Tension before the reveal.** A twist should be foreshadowed in the synopsis by a hint that does
  not give it away ("the voice on it sounds familiar"). That is a hint per twist, about 250 lines
  of writing.
- **Old titles.** For films already made, the title chooses the story and memory comes second.
  The head word is answered about 80% of the time; the rest have no part in their genre that fits.
  More parts would fix it, and no new shapes are being added now.
