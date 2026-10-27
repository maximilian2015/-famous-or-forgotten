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

## Stage 1b — a new film's title from its story (audited, not switched on)

The story is already kept on the film, not derived from its title. Renaming a film (`career/naming.js`
lets the player rename anything that has not opened) does not change its story. So the three
things are already separate: the film itself (its id, its place in a franchise through
`seriesRoot` of the title at signing), the title on the poster, and the story.

Titles are born in 14 places. Story-first titles are only safe where nobody has seen the title yet:

| Where | Safe for story-first? |
|---|---|
| `offers.js` (direct offers), `youngblood.js`, `theatrical.js` comeback offer, `collab.js` | yes — make the story first, then the title |
| `castings.js` (OpenCall) | at the listing, not at the offer — the player reads the title before auditioning |
| `tentpoles.js` (the board) | at the board entry — same reason |
| `night.js` pitches | at the pitch; and never when the player typed the title themselves |
| `decline.js` scripted offers, `stories.js` chain offers | yes, at creation |
| sequels, seasons, renewals, thaws, `bubble.js` revivals | **never** — they continue a title |
| `world.js` films of other actors | not ours; untouched |

So it is a change at each birthplace, not in `dressOffers`, which runs after the title has been shown.

## Stage 2 — the character, after the part is accepted (first version on the branch)

Done: the script on the set card (who you are, what the hero wants, who else is in it, what happens,
the twist marked "in the script, never in the trailer", and when your character learns it); scene
days know which page of the story they are; "Out of order" is shot around the film's own secret
from the side of your part; a remembered day names its scene for the critics, never the twist.
Examples: docs/story-stage2-examples.md.

Original plan:

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
