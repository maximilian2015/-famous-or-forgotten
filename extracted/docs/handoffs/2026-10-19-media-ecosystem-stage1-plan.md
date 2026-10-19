# Media Ecosystem — stage 1 plan: one project identity, and save compatibility

19 Oct 2026. A plan for review, not code. Stage 1 of `2026-10-19-media-ecosystem-audit.md` §8.

**Goal.** Every project the player works on has one identity from the moment it is signed to the last
line of the filmography and into its next season or part, instead of being rebuilt by hand at four to
six boundaries. The pay key `medium` becomes `payMarket`. Nothing the player sees changes — except
one bug fix, on purpose and alone: a daytime soap's next season is priced as daytime television again.

---

## 1. Where a project is born — two choke points

About twenty places create an offer (offers.js ×3, castings.js, tentpoles.js, franchise.js ×2,
bubble.js ×3, collab.js, decline.js ×2, youngblood.js ×2, release.js studio call, stability.js thaw,
stories.js ×2, night.js pitch, endorsements). Changing all of them is the risk, not the cure. All of
them are accepted in one function, offers.js `acceptOffer`, which sends the work down one of two roads —
and those two roads are where a project is born:

- **Anything with a schedule** goes to `startProduction(s, offer)`. It calls `adoptProject(s, offer)`:
  builds the project from the offer (below), registers it in `s.projects[id]`, writes `p.projectId`.
- **A day's work** (a short supporting part, an advert, a cover) is resolved in the same click inside
  `acceptOffer` and writes a `minor` credit straight to the filmography, with no set and no release. It
  calls `adoptProject` too, so "other work" has a project like everything else. (Late-career jobs go
  through `laterOutcome` first and then the same two roads.)
- Before signing, a listing or an offer is not yet a project: it keeps its own fields. (OpenCall's
  tabs in a later stage read a derived view, `projectOf(listing)`, without registering anything.)
- A **continuation** (next season, sequel, rescue, the last episode, the film of a show) is a new
  project that inherits from its parent: `seriesId` (a show) or `franchiseId` (a film series),
  `payMarket`, `medium`, `format`, `style`, `awardsTrack`. The parent's id rides on the offer as
  `parentProjectId` — set in franchise.js and bubble.js, the only two places continuations are made.

## 2. The project, stage 1 fields

```
{ id, parentId, seriesId, franchiseId,
  medium: 'theatrical' | 'television' | 'streaming' | 'other',
  format: 'movie' | 'series' | 'limited_series' | 'soap' | 'commercial' | 'stage' | …,
  scale, style: 'standard' | 'prestige', outlet, distribution, awardsTrack, route,
  genre, budget, needs, payMarket, title, type,
  derived: true when rebuilt from an old save }
```
Not moved in stage 1 (they stay on the set and the credit, and move later with their own tests):
character, director, crew, cast, outcome.

How each field is decided — one table, `career/project.js`, used by new projects and old saves alike:
- **medium**: a film scale → theatrical; a TV scale or a series/soap type → television; ads, covers,
  stage, voice, extras → other. (No streaming project exists until stage 3.)
- **format**: 'Soap Opera' → soap; the other TV types → series; film scales → movie; day jobs by type.
- **style**: 'Prestige Series', 'Prestige Drama' → prestige; else standard.
- **payMarket**: the offer's `payMarket`, else its old `medium` if that is a pay key, else derived —
  and a soap derives **tv_daytime** (today's fallbacks cannot).
- **awardsTrack**: theatrical → film (festival scale → festival); television → television;
  other → none.
- **route** from `via`: casting → open_call · agent → agent_submission · studio/festival/brand →
  direct_offer · director/partner/letter → relationship_offer · rescue and renewals → continuation ·
  pitch → self_created.
- **distribution**: festival scale → festival; theatrical → wide; television → broadcast.

## 3. Carried through every boundary — by id

```
offer ─startProduction─► s.projects[id] ◄─ p.projectId
p ──wrap──► credit draft .projectId
p + credit ──scheduleRelease──► rel.projectId, rel.job.projectId
rel ──opening night──► credit.projectId, credit._rel.projectId
job ──maybeContinue / bubble──► next offer .parentProjectId ──startProduction──► child project
```
Every hand-copy site gets one field (`projectId`), and the next field anybody adds goes on the
project, not into six copies. The legacy fields (type, scale, genre, budget, needs…) stay exactly
where they are in stage 1 — every reader keeps working unchanged.

## 4. `medium` → `payMarket`

- New objects write `payMarket`; the word `medium` is never written on an offer or a listing again.
- Readers go through `payMarketOf(x)`: `x.payMarket`, else `x.medium` if it is one of the eight pay
  keys, else the derived value. That makes an old save, or a container the migration missed, safe.
- Readers to change (~10): castings.js (listing price, the ad shelf guard), contract.js (the
  fallback chain), negotiate.js, franchise.js (`mediumOf` → `payMarketOf`, `ceilingFor`), bubble.js
  rescue, collab.js, offers.js (agent and room offers), billion.js (the ad), OpenCall.jsx (the teen
  filter).
- `medium` on the project means theatrical / television / streaming — no collision, because the project
  is a different object.

## 5. The one intended change — the soap

A continuation inherits its parent's `payMarket`, so a daytime soap's next season is priced against
`tv_daytime` instead of `tv_network`. Daytime has no band for an A-lister (`alist: null`, which today
reads as "no ceiling at all"). Proposed rule: **the season goes on, capped at daytime's top (€30k an
episode); the board still never offers an A-lister a new soap.** Its own commit and its own test.

## 6. Save compatibility

- **A load migration** (store.js already has the block, versioned): walks castingPool, submissions,
  offers, laterOffers, frozen, production, releases (+ job), bubbles (+ job), filmography (+ _rel),
  discography, passedOn, the tentpole board, pitches, the standoff:
  - copies a pay-key `medium` into `payMarket` (the old field is left alone);
  - gives every credit, set, release and bubble a derived project (`derived: true`), with `seriesId` /
    `franchiseId` found by the same title-root rules the game already uses for previous seasons and
    parts — so an old save's season 4 is linked to its season 3;
  - writes `s.projectsVersion = 1`; idempotent.
- **Lazy fallback**: `projectOf(x)` derives on the fly for anything without a `projectId`, so a missed
  container degrades to today's behaviour, never to a crash.
- **Nothing is deleted** in stage 1: an older build can still open a save made by the new one (it
  ignores `s.projects` and `payMarket`, and finds its old fields where it left them).
- **In flight**: a set already shooting, a release waiting to open, a run in cinemas, a show on the
  bubble — each finishes exactly as before, now with a project attached.
- Size: one small object per project, about sixty in a long life.

## 7. How we know nothing moved

1. **Same seed, same life** (new probe `probe_same_life.mjs`): `Math.random` replaced by a seeded
   generator; a handful of 30-year careers played on the old tree and the new one; the filmographies
   (title, year, scale, rating, gross, verdict, fee) must be identical. Run after the plumbing commit
   and after the rename commit — before the soap fix, which is allowed to differ.
2. **The boundary test** (`test_project.mjs`): a project field survives offer → set → wrap → release →
   opening → close → next season → bubble rescue → its season; and a sequel's franchise link.
3. **The old-save test**: a synthetic old save (credits with no project, offers with a pay-key `medium`,
   a soap mid-run, a show on the bubble) loads, migrates, and plays a year; Maxi's own save is run
   through the same migration by a probe (not committed).
4. **The soap test**: season two of a daytime soap is priced in the daytime band, and an A-lister's
   is capped at daytime's top.
5. The full suite, lint, the build, autoplay; the career probes against the Budget V2 baselines.

## 8. Commits

1. `career/project.js`: the derivation table, `adoptProject`, `projectOf`, `payMarketOf`; the registry;
   `projectId` carried through every boundary; the load migration. No reader changes. → same-seed lives
   identical.
2. `payMarket`: readers switch to `payMarketOf`; nothing writes `medium` on an offer again. → identical.
3. Continuations inherit their parent (`parentProjectId`); the soap priced as daytime. → its test.
4. Tests and probes.

No UI change in stage 1. Then stage 2 (the outcome adapter) starts reading the project.

## Open questions for Maxi

1. The A-lister on a soap renewal: capped at daytime's top (proposed), or does the show let you go?
2. Day jobs (ads, covers, theatre, voice): projects with `medium: 'other'` (proposed), so the filmography
   is one list — or kept out of the project registry entirely?
