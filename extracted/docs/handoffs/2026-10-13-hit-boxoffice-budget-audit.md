# Audit: ★ HIT next to BROKE EVEN, what a mediocre €90m feature takes, and where budgets come from

13 Oct 2026. Measurement only; nothing in the game was changed. Numbers come from
`tests/probes/probe_feature_money.mjs 40`: 40 played careers × 32 years, 674 player features
captured the month they opened, 7,263 features made by the rest of the industry, 2,107 finished
film credits. The probe proves first that it has the real numbers: opening × legs matches every
captured gross exactly, and demand rebuilt from the captured inputs matches the real one within
±3 for 98% of films.

The case: "This Lantern Doesn't Work". €90m feature, €216m gross, needed €209m, 5.9, audience 6.7,
BROKE EVEN, and ★ HIT on the filmography row.

## 1. Why it says HIT

`★ HIT` is `Filmography.jsx` drawing `isHit(c)` from `meta/knownFor.js` `hitWeight(c) > 0`.
hitWeight was written to answer "what is this actor known for", and it reads money in absolute
euros:

| weight | rule |
|---|---|
| 5 | world hit |
| 4 | won an Asker |
| 3.5 | Asker nomination |
| 3 | verdict smash, **or gross ≥ €300m** |
| 2 | score ≥ 8.5, the year's top ten, **or gross ≥ €200m** |
| 1 | score ≥ 7.5, or a blockbuster that was profitable |

This Lantern: €216m ≥ €200m → weight 2. Nothing compares the gross with what the film had to take.

What it affects: **display only.** The ★ HIT stamp and gold frame on the filmography row, the
"Known for" line under your name on Home, and the Known For wall (weight ≥ 2 = "the cream", so
This Lantern qualifies for the wall as "A real hit"). Nothing else reads hitWeight or isHit — not
Fame, Standing, sequels (`franchise.js sequelOdds` reads the rating and the verdict), typecasting,
offers or heat. Fame and hype at the close of a run read the verdict and the world-hit flag.

How often it contradicts the verdict, over 2,107 finished film credits:

| verdict | films | shown ★ HIT |
|---|---|---|
| smash | 747 | 100% |
| profitable | 326 | 68% |
| broke even | 394 | **42%** (48% of features) |
| bomb | 391 | 7%, and **23 of 25 bombed blockbusters** |

A blockbuster needs €511–577m. One that takes €300m has bombed and is shown ★ HIT, on the wall
as "The one that printed money". The label is misleading: it means "a big number", and the
player reads it as "a success".

## 2. Is €216m plausible or frequent for a mediocre €90m feature?

**This Lantern's inputs.** The demand stages live on the release and are deleted when the run
closes (`closeRun`: `delete credit._rel`), so the exact month's hype and opening cannot be
recovered, not even from a save. The card does pin them down. €209m needed = (90 + 49.5) × 1.5,
which is only possible with the *major* campaign. Rating 59 and audience 67 give word 63.8 and
legs of ×2.93–3.33 (median 3.13). So the opening was €65–74m and the demand index was about 46–50
(about 40–44 on a summer date). For a Comedy feature with a major campaign in a steady market,
that is a lead at **about fame 50 with no hype**. The real functions give that film a median of
€214m. **€216m is the middle result, not a lucky one.** The same film with nobody famous in it
takes €131m, with a fame-30 lead €184m, with a fame-70 lead €241m.

Of those 34 demand points with nobody on the poster, 26 come from the campaign (14.8) and the
studio's distribution muscle (11.4).

**The rating sweep.** These are the same 674 captured features with their real demand, the
rating forced, the audience moved by audienceFor's own slope, and each one re-rolled 25 times:

| rating | median | p10 | p90 | >€100m | >€200m | >€300m | ≥ needed | ≥ broke even (0.7×) | profitable | smash |
|---|---|---|---|---|---|---|---|---|---|---|
| 5.0 | €195m | €98m | €510m | 89% | 48% | 27% | 50% | 71% | 37% | 17% |
| 6.0 | €272m | €127m | €667m | 96% | 68% | 45% | 70% | 86% | 56% | 30% |
| 7.0 | €331m | €172m | €778m | 99% | 83% | 56% | 84% | 96% | 70% | 40% |
| 8.0 | €386m | €201m | €893m | 100% | 90% | 66% | 91% | 99% | 79% | 49% |

As played, with no forcing: player features rated 5.0–5.9 (n=98) took a median of €193m. 48% took
over €200m, 76% were at least "broke even", 30% profitable, 13% a smash.

**The rest of the industry, same code** (world.js → grossFor): features rated 5.0–5.9 (n=1,502)
take a median of €120m, and 27% take over €200m. A mediocre feature *in general* is not over-paid.

**Why the player's take about twice the world's.** These are the captured features at 5.9/6.7,
with inputs removed one at a time:

| | median | >€200m |
|---|---|---|
| as captured | €286m | 76% |
| without the month's hype | €235m | 63% |
| without the co-star | €256m | 69% |
| without hype, co-star or casting question | €209m | 53% |
| … and the lead at fame 50 | €184m | 44% |
| … and the lead at fame 30 | €158m | 32% |

The lead's fame at a feature's opening has a median of 75.6, and hype a median of 25. Those
inputs, which a world film does not have, are the gap.

**Verdict.** This Lantern is an ordinary result, not an outlier. "Mediocre features make too much"
is true **for the player's own features**: at 5.9 the typical one takes €286m. It is not true for
the industry's. The extra comes from fame, hype and the co-star, which are deliberate mechanics,
plus a high floor (campaign + studio muscle). Two words add to the impression:

- "broke even" covers 0.7–1.25 of the sum, so a film that recovered 70% of its costs is called
  broke even;
- ★ HIT fires at €200m regardless of cost.

## 3. Budgets

- `release.js BUDGET` is **one number per scale**: small €1m, festival €1.5m, indie €12m,
  feature €90m, blockbuster €220m. Genre is never read, and cast salaries are not in it (the
  player's fee is paid and never added to the budget or the break-even).
- Scale comes from the **size of your part**, not the film: `offers.js` and `production.js
  scaleOfOffer` map lead → feature, supporting → indie, tentpole → blockbuster. The world maps
  an actor's fame tier → scale. So every lead in any studio film is a €90m picture.
- Sequels copy the scale (`franchise.js`), so the budget is unchanged. The familiarity bonus is in
  demand only.
- The game has no Action genre. Genre shares by budget are almost flat (player + world, 25.7k
  films): about 30% of every genre is made at €90m and 13–21% at €220m. That includes 18% of
  comedies, 14% of romances and dramas, and 21% of horror. 49% of comedies cost €70m or more.
- A second inconsistency: the tentpole board (`tentpoles.js`) rolls `budget: rint(120, 320)`
  and the AAA phone app shows it. The verdict and the new break-even line use €220m whatever was
  shown.
- Clearly implausible combinations: Horror, Drama and Romance at €90m (real: about €5–40m);
  any of them, or Comedy, at €220m; Comedy at €90m as the default rather than the exception.
  Sci-Fi and Musical at €90m are fine, and Sci-Fi at €220m is fine.

## A side finding on the same card: SCORE 5.9 and CRITICS 3.5

Maxi's card showed SCORE 5.9, KINOMARK C+, AUDIENCE 6.7 and CRITICS 3.5. SCORE and KINOMARK are
the film's rating (`gradeOf`: 54–59 is C+). CRITICS is a separate number from `critics.js`
`reviewsFor`: the average stars of the 3–5 named critics, × 2. `starsFor` buckets the rating
coarsely: 48–61 → 2 stars, which is 4.0/10. Harsh critics (or ones who hate the genre) take one
more star off. So any film rated 4.8–6.1 shows critics of about 3–4.5 next to a score of 4.8–6.1,
and a 6.1 → 6.2 step jumps the critics' figure from 4.0 to 6.0. The two numbers are on different
scales and the card puts them side by side. Not changed.

## Options (not done; for Maxi to choose)

1. **HIT** (small, display only): judge the money part against `needed` instead of absolute euros.
   For example, ★ HIT for money only at profitable or better, and keep score, rank, Asker and
   world hit as they are. Known For would follow automatically.
2. **Budget** (balance — needs agreement): `genre base × scale × special demands`. This moves
   the break-even and therefore every verdict, and the box-office model is calibrated against
   €90m and €220m, so it needs its own measurement pass.
3. **"broke even" band** (balance): 0.7 is generous. Options are 0.85, or a fifth word for
   0.7–0.9 ("lost money"). verdictOf's comment warns that call sites switch on the four strings.
4. **Player-feature generosity** (balance): if wanted, the place is the floor (campaign + muscle)
   or hype's weight, not the legs. The industry's features are fine as they are.
5. **CRITICS figure** (display): put the critics' average on the score's own scale, or label it
   as stars ("critics ★★ of 5"), so it cannot read as a second, lower score.
