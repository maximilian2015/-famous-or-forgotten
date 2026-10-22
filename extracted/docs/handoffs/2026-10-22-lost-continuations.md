# Lost continuations — built

22 Oct 2026, branch `fix/lost-continuations` (on main, separate from Streaming Movies).

## Why

Maxi, at "The Last Woman" in 2080: the card said "Renewed for season 2", season 2 never came, and
nothing said why. In fact, in Feb 2078 the paper for season 2 lapsed after two rounds of revisions and
a meeting. Three faults:

1. **One field held two facts.** `credit.renewal` held both the network's decision and what happened
   to you, and the desks that wrote you out overwrote it.
2. **The loss was never written down when another story was running.** It lived only in the
   one-at-a-time "Without you" story. With "Small Wedding" already running, The Last Woman was never
   recorded at all.
3. **When the story did run, it invented the result.** It rolled how the season went on a coin, the
   gross as a random number, and the replacement as the first name off the actors' list.

## What it is now

| piece | where |
|---|---|
| the record: which season or part, what happened to you, why, the month, who has the part, when it comes out | `career/continuation.js` `loseContinuation` → `credit.next` |
| every desk that loses you one goes through it | `offers.js` (no; no answer; the exit clause; an option), `contract.js` (the dates; the talks; not made), `standoff.js` (written out, killed off, not made), `franchise.js` (written out at the renewal) |
| what it did without you, the month it comes out, seeded by its title | `career/continuation.js` `simulate`: television's audience and renewal, a platform's drop, a world film's gross (onto the replacement's own record) |
| told once: by the "Without you" story if it is telling this one, otherwise the trades | `continuationTick` (engine/time.js), `meta/stories.js` `without` beat |
| the fans by attachment and circumstance; no standing off for a negotiation | `meta/stories.js` `noteSequelLoss`, `fansOf` |
| a second "Without you" queued, not dropped | `s.recastQueue`, the chain's `start` |
| old saves, on explicit evidence only | `settleLostContinuations` (state/store.js load) |
| the card: show status, your status, what it did; a "Without you" list (lost / turned down); an old season's ignored/seen/watched read off its numbers, display only | `ui/components/Filmography.jsx` |

**Statuses.**
- What happened to you: declined, left, recast, written out, killed off, walked out (of an option),
  not made, went back.
- Why: you said no, the exit clause, you never answered, the deal was never closed, you were on
  another set, no again after the meeting, the network decided, the money and the season was not
  made, an option.

**The fans.**
- How strongly they react comes from how much the show meant:
  - the last season's audience against its slot;
  - a platform's starts;
  - a film's verdict;
  - plus years lived with the show.

  The reasons modulate it: a no or a walked-out option counts for more, another set for less, the
  exit clause for very little.
- Whose doing it looks like decides only who they are angry with. Written out by the network, they are
  furious with the network, not with you, and your scandal does not move.
- Standing:
  - the old −3 / −2 / −1 on every lost continuation is gone;
  - walking out of an option still costs −6, and walking out of the room still costs what it costs.

**Old saves.**
- What counts as evidence:
  - the game's own exact lines ("They stopped waiting on X · season N…", "they recast", "Written out
    of…", "Fans are furious: you are not coming back for season N…", the exit clause, the option);
  - the ledger (`passedOn`);
  - the old `renewal: 'writtenOut'`, which becomes "renewed" plus "written out".
- A season that simply never appeared is left alone.
- The result is worked out quietly (no trades letter) and marked `migrated`.
- A "Without you" story from before, waiting to announce "another season without you" on a coin,
  ends if the record says there was no other season.
- Fame, awards and everything the old result already did are untouched.

## Measured

`tests/test_lost_continuations.mjs` has 17 checks, among them:
- failed negotiations, voluntary departure, recasting;
- written out and not made;
- a renewed show and a sequel without you;
- the continuation's own dice;
- conditional fans;
- two losses at once, and a late queued one;
- the delayed follow-up told once, and duplicates;
- going back;
- The Last Woman from Maxi's save, and a conservative, idempotent migration.

Seven older tests changed what they assert, not what they test:
- the show's renewal is now checked apart from your part;
- no standing off for a no;
- the trades' line is the new wording;
- the "Without you" news waits for the real release month.

Suite 95/95, lint, autoplay, build.

**Same seed, against main** (`probe_same_life.mjs`, 6 careers × 30 years, `LOST=1`): every life is
identical to main until its first lost continuation, and diverges only after it.

| career | first lost continuation | lives identical through |
|---|---|---|
| 0 | 2058-07 | 2068 |
| 1 | 2066-02 | 2066 |
| 2 | 2058-02 | 2058 |
| 3 | 2056-12 | 2065 |
| 4 | 2065-10 | 2067 |
| 5 | 2058-12 | 2058 |

The divergence is the intended change: no standing off, different fans, the result told from the
model.

**On careers** (`probe_lost_continuations.mjs`, 40 careers × 34 years, an ordinary bot that turns
down one continuation in six and lets papers lapse while it shoots):
- 449 lost, 11 a career: 401 seasons, 48 parts.
- What happened: recast 205, declined 37, went back 207. The bot always goes to the director's
  meeting.
- Why: never answered 294, said no 85, again after the meeting 70.
- A real replacement for 100% of the parts that had one to fill.
- Of those that came out, 99% were told; 15 are still to come.
- Renewed again: 66%.
- The fans: furious with you 22, sorry 17, nothing for the rest.

**In the browser**, on a copy of `saves/famous-Alex-Moon-53-2079.json` loaded into the built branch:
- The Last Woman reads:
  - "📺 Renewed for season 2";
  - "👤 Season 2: Recast — the deal was never closed · Feb 2078";
  - "↳ Season 2 went out without you. Hugo Pemberton has your part. 31m watched the first episode and
    20.2m the last — yours finished on 37.2m. It was not renewed.";
  - and WATCHED (was IGNORED).
- "Without you · 4": lost — The Last Woman s2, I saw you yesterday II, Light and Rain III; turned
  down — Small Wedding s5.
- Small Wedding's old thread, which had announced a sixth season on a coin, closed itself; the model
  says season 5 was not renewed.

## Not built, or open

- The "Without you" story still runs one at a time. The others now wait their turn: a part you
  could still go back to gets the director's letter; one already being made gets the news when it
  comes out.
- A director's grudge for a film you passed on (`stories.js` `refused`, the "one you passed on")
  still rolls its outcome when you refuse. It is the same kind of invention, but for a film that is
  not a continuation.
- Between going to the director's meeting and the new paper being signed, the card still reads
  "recast".
- The world's actors carry a film credit for a sequel they took over. They carry no television
  credits: the world has no television yet.
- Platform films (Streaming Movies, other branch) will need their own path when the two meet: their
  sequel decision (`platformFilmSequel`) runs as a world film here.

## Debt

- `continuation.js` is new, 347 lines.
- `stories.js` grew by ~80 lines.
- `Filmography.jsx` grew by ~50 lines for the list.
- No function over the line.
