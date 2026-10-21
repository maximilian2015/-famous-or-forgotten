# Streaming Movies V1 — design plan, revision 2

21 Oct 2026. Media Ecosystem stage 3, second half.

**Revision 2** (Maxi/ChatGPT, approving revision 1 with corrections):
1. **No "Number one".** Being number one needs a ranking against the platform's other titles, and
   that ranking belongs to the stage 5 streaming world. The top result stays **Breakout**, decided
   by film rules: a Hit, a big audience, and a strong second week. "#1 on Lumen", "four weeks in the
   top ten" and "most watched film of the year" are future achievements. V1 does not show top-ten
   weeks either.
2. **Week two is discovery, not retention.** A film's second week is new viewers finding it, not the
   same viewers coming back. Three separate quantities replace revision 1's single "hold":
   - **starts**: unique accounts that pressed play;
   - **completion**: how many of them finished it;
   - **week-two momentum**: how many new starts week two found, against week one.

   Momentum is counted **once**, inside the 28-day starts. It is also a condition for the word
   Breakout, but **never a second multiplier on the score**. Completion enters the score once.
   Starts feed fame; finished viewers against the cost feed the platform's verdict.
3. **The festival is the player's choice**, and the two choices really differ: benefits, risks and
   what they do to a career. It is one film and one project, with no second release.
4. **A later sale of an unsold festival film** depends on the film's quality, how well it fits a
   platform, the audience it could find, and how it already failed to sell. There is no flat 25%.
5. No separate TV movies in V1.
6. **The ×1.25 buyout fee is a starting assumption.** The cast is already inside a film's budget
   (`budget.js`: "the budget never reads the role"), so the fee is **never added on top**. Revision 1
   added it. The contract keeps every decision that still means something; the asks that cannot
   happen say why on the paper.
7. **A platform film is up for the Asker**, whatever its distribution. The platform's campaign uses
   the existing campaign gameplay: you start it and turn up, and the platform pays.
8. **No blacklist after a flop.** A platform's memory of you is stage 4 (Streaming Value), and it
   will be kept per platform.

Also before merge: with `STREAMING=off` a seeded life is the same as main, to the last digit. Tests
show that a platform film cannot reach a series renewal, the television rewards or the Emmet.

Ground rules (from the series plan, revision 4):
- genre enters a streaming audience once, through the platform's taste;
- the common grade is an adapter beside the native result;
- fame is awareness;
- one project identity;
- no Streaming Value before stage 4;
- old saves untouched;
- the theatrical baseline does not move.

Every number below is a **starting value for the probe**. The examples come from
`2026-10-21-streaming-movies-examples.mjs`, beside this file. It computes the film side from this
plan's formulas and the series side from the shipped `dropSeason`.

---

## 0. A platform film is not a platform season

| | streaming season (shipped) | streaming film (this plan) |
|---|---|---|
| **The verdict** | finished28 per €1m of **the season** | finished28 per €1m of **the whole film**, paid once, up front |
| **Who starts it, after week one** | a fixed run (×2.4), plus virality for the few that are passed around | **momentum**: each week finds a share of the week before it, from what people tell each other |
| **Shape of the 28 days** | week one is always ~42% | front-loaded: week one is **45–66%** of the starts |
| **Completion** | 0.12–0.90, from the word, minus episodes and seasons (eight hours) | **0.40–0.85**, from what the crowd made of it (two hours; most people finish a film) |
| **What the names do** | awareness `draw/40` | awareness `draw/25`: a film is sold on a thumbnail with a face on it |
| **Fans** | last season's finishers come back | none, except a sequel's audience |
| **What it costs** | (episodes × episode cost) × 1.12 for the cast, plus your fee, per season | the **all-in budget** (your fee inside it) + the platform's own small marketing |
| **After the verdict** | another season, on the next season's real cost; the bubble | no renewal and no bubble. A sequel, sometimes |
| **Breakout** | Hit + the views bar + passed around (70% finish, word 82+) | Hit + the starts bar + **momentum 0.6+** (week two found 60% of week one again: word 80+) |
| **Awards** | the Series Award | **the Asker**, as a film; a festival pickup on the festival track |
| **Your money** | a fee per episode, raised each season | one fee, the film table × 1.25, bought out: no points, no merchandise |
| **In the trades** | no box office | no box office: no smash, no bomb, no box office poison, no billion |

**The same star, the same genre, the same giant.** A star (fame 70) and a co-star (50), Sci-Fi,
hype 40.

| | ordinary (word 60) | loved (word 82) |
|---|---|---|
| season (€152m): starts28 · completion · score | 67.7M · 42% · 0.89 Solid | **67.7M** · 68% · 1.45 Hit |
| film (€198m): starts28 · week one share · completion · score | 61.2M · 62% · 62% · 1.07 Solid | **84.6M** · 45% · 79% · 1.87 **Breakout** |

The difference between the two:
- A loved season is started by the same number of people. More of them finish.
- A loved film is started by **more** people, because each week finds new ones. That is its
  momentum. Of those who start it, more also finish.

Those are two different things, each counted once.

## 1. What each platform wants from a film

Same four platforms, names and genre tastes as the series. Their film side is a second table beside
`ARCHETYPES`.

| platform | buys | all-in budget (€m) | target¹ | Breakout bar² | push lines³ big / low | own marketing⁴ | max fee | backs an Asker campaign | sequel |
|---|---|---|---|---|---|---|---|---|---|
| **the giant** | event films | 40–220 | 0.18 | 70M | ≥ 120 / ≤ 30 | 10% | — | rated 80+ | Breakout 60% · Hit 25% |
| **the premium service** | awards films | 6–45 | 0.32 × acclaim⁵ | 25M | ≥ 35 / ≤ 10 | 6% | — | rated 70+ | none |
| **the ad-supported service** | the film you put on: rom-com, thriller, the Christmas one | 3–25 | 0.65 | 35M | ≥ 18 / ≤ 6 | 4% | €3m | never | Hit 20% |
| **the genre service** | horror and science fiction | 1–8 | 0.33 | 10M | ≥ 6 / ≤ 2 | 3% | €1m | never | Hit 30% |

¹ millions who **finished** it within 28 days, per €1m of its whole cost, that the platform calls par.
² starts28, M.
³ on the whole cost.
⁴ a share of the budget. A cinema release spends 50–100% of its budget selling the film. A platform's
home screen is free.
⁵ as for its series: `1 + max(0, rating − 70) / 50`.

## 2. The audience model

```
cost        all-in budget × (1 + own marketing)         (a festival pickup: its price, §7)
            the budget already pays everybody on the call sheet, you too — your fee is never added
push        big  if cost ≥ the big line, or draw ≥ 30, or a sequel to a Hit / Breakout
            low  if cost ≤ the low line and draw < 12             multipliers 0.6 · 1.0 · 1.6
awareness   0.5 + draw/25 + hype/100
starts7     subscribers × 0.03 × awareness × push × genre taste × dice(0.8–1.25)
            new accounts in week one — nobody has seen it, so no quality here
momentum    clamp(0.30 + (word − 50) × 0.01, 0.15, 0.75)       word = what people tell each other
            (wordFor: the crowd's reception 60%, the critics 40% — the same number that gives a
            cinema run its legs). Week two finds momentum × week one's NEW starts, week three
            momentum × week two's, and so on.
starts28    min(starts7 × (1 + m + m² + m³) + sequel fans, 0.6 × subscribers)
            sequel fans = 0.4 × the last part's starts28, in week one, counted once
completion  clamp(0.55 + (crowd − 50) × 0.007, 0.40, 0.85)    crowd = the room's reception (audienceFor)
finished28  starts28 × completion
score       finished28 / cost / target × acclaim (premium only)
outcome     Miss < 0.7 · Solid < 1.4 · Hit · Breakout = Hit AND starts28 ≥ bar AND momentum ≥ 0.6
```

- **Momentum** enters once, as people (starts28). For Breakout it is a condition, never a
  multiplier.
- **Completion** enters once, as the share who finished (finished28). It lives in a narrower band
  than a season's, because a two-hour film is mostly finished.
- **From the worst film to the best**, momentum moves starts28 about ×2 and completion moves the
  finishers about ×2. In a season, completion alone moves the verdict ×7.5.

## 3. Examples (computed by the script, dice = 1)

| | platform | cost €m | week 1 | momentum | week 1 share | starts28 | completion | score | outcome | fame |
|---|---|---|---|---|---|---|---|---|---|---|
| A unknown (8), genre-service horror | genre | 2.1 | 0.8M | 0.35 | 66% | 1.2M | 59% | 1.07 | Solid | +3 |
| B rising (30), ad-supported rom-com | ad-supp. | 10.4 | 6.7M | 0.42 | 60% | 11.2M | 65% | 1.08 | Solid | +5 |
| C star (70+50), giant event, ordinary | giant | 198 | 37.7M | 0.40 | 62% | 61.2M | 62% | 1.07 | Solid | +13 |
| D the same, loved | giant | 198 | 37.7M | 0.62 | 45% | 84.6M | 79% | 1.87 | Breakout | +13 |
| E known (45), premium drama rated 8.6 | premium | 23.3 | 5.3M | 0.52 | 52% | 10.2M | 65% | 1.17 | Solid | +5 |
| F festival prize, bought for €4m | premium | 4.0 | 2.5M | 0.54 | 50% | 4.9M | 68% | 3.31 | Hit | +3 |
| G supporting (30) under a 60, giant event | giant | 154 | 28.9M | 0.44 | 58% | 49.7M | 66% | 1.19 | Solid | +5 |

Fame is from §5, before headroom.

## 4. The life of a platform film

1. **The part** comes by one of the routes in §6.
2. **The contract.**
   - The fee is the cinema table for the film's size × 1.25, bought out.
   - Fee, dates, exclusivity, preparation, pay-or-play and the sequel option work as they do on any
     film.
   - Back end, merchandise and "points instead of pay" are replaced by one line with no ask on it:
     *"A platform pays for the film up front and keeps whatever it makes. There are no points to ask
     for."*
3. **The shoot** and **post** work as for any film of its size.
4. **The drop.** Everywhere at once, with no window, no weekend to open against and no carpet.
5. **Day 28**, the verdict card:
   - the week-one starts against the 28-day starts, and the share who finished;
   - the outcome word;
   - the platform's line saying why. A €198m film that 61M started is told in words that the money
     wanted more.

   **The credit closes at four weeks.** A season keeps a month's tail; a film has none.
6. **After**: fame, hype and standing (§5), the sequel decision, and the awards season (§8).

## 5. What it does to your name

- **Fame** comes from starts:
  - poster share: lead +3, event lead (the giant, €150m+) +5, supporting +1;
  - plus the series' rate: +1 per 5M starts28, up to +8, half for a supporting part.

  The probe target: a platform-film lead moves fame about as much as a cinema lead of the same tier
  (±30%).
- **Hype** follows the series' `hypeFor`:
  - Breakout 70;
  - Hit 48 (26 for a supporting part);
  - Solid 22 for a lead;
  - Miss 0.
- **Standing** works as for any film (rating, against type, carried the set). The critics review it
  as a film.
- **Not**:
  - no quote jump for a smash;
  - no box office poison;
  - no billion and no World Hit;
  - no feeding the cinema genre market;
  - no "television face" label.
- **Heat** (world rank) counts its rating with no gross, because Heat is built on the film business's
  gross and quality. The probe reports whether this undersells an A-lister who only streams.

## 6. How the work reaches you: the same volume, a new kind

Film rows **share** the streaming shelf (still 2–3 listings), the agent's streaming share (16%) and
the platform's own calls. There is no new volume.

| route | part | platform | fame from |
|---|---|---|---|
| shelf (open call, self-tape) | lead in a genre film | genre | 0 |
| shelf | supporting in a genre / ad-supported film | genre, ad-supported | 0 / 15 |
| shelf | lead in an ad-supported film | ad-supported | 15 |
| agent | lead in an ad-supported or premium film | ad-supported, premium | 35 |
| agent | a supporting name part in an event film | giant | 35 |
| the platform's call (Email) | lead in an awards film | premium | 55 |
| the platform's call (Email) | lead in an event film | giant | 70 |
| a festival | §7 | — | — |
| a sequel | the platform's | the same | — |

## 7. The festival: two buyers, and the choice is yours

**What stays exactly as it is:**
- the jury and the odds of a prize;
- the odds of selling at all;
- going to the festival or paying a sales agent, and what each does to those odds.

**What is new: who is buying.** When a festival picture sells or wins, a distributor wants it, as
today. **A platform also bids when the film suits one:**
- the genre service for horror or science fiction;
- the premium service for a drama, crime picture or thriller rated 70+;
- the ad-supported service for a comedy or romance rated 60+;
- the giant only for a lead of fame 60+.

With two buyers the player chooses, in Messages, on the Sunday. One film and one project: the
choice decides how that release goes out, and there is never a second one.

| | **Cinemas** (the distributor) | **The platform** |
|---|---|---|
| what it is | a small release, a few cities, the laurels on the poster | everywhere on Friday, at a price agreed today |
| the upside | the run can grow: a sleeper (`expansionFor`), a box office of its own; Heat counts its gross | more people see it, with fame from its starts. If you took points, the price pays them now |
| the risk | it may find nobody. A lead's flop counts toward box office poison | no run and no sleeper. Its ceiling is the platform's audience |
| the career | **standing**: a festival picture rated 70+ that sold to cinemas gives the +2 standing it gives today. The rooms that hire for films watch films in cinemas | **reach**: no standing for the sale itself |
| the awards | the festival track | the festival track, the same |

- The two buttons say this before they are pressed. The letter says what happens if you do not
  answer: by the end of the next month the producers take the distributor's offer.
- A **prize** keeps everything a prize gives today, whoever buys the film: the discovery fame, the
  standing, and the studio's script.
- The platform's price is `budget × 1.3`, or `× 2.2` with a prize. The film is judged against it.

**An unsold film can still find a home**, once, 3–9 months later, at a low price (`budget × 0.6`).
The chance is rolled on the festival night, and only for a film rated 55+:

```
quality    rated 55–64: 6% · 65–74: 14% · 75+: 24%
fit        × the best taste a buying platform has for its genre (0.6–1.5); that platform buys it
           (the genre or ad-supported service; the premium one for a picture rated 72+)
audience   × (1 + the lead's fame / 100)          a name is something a home screen can sell
history    × 0.6 if a sales agent already took it to every buyer and they passed
           × 1.15 if you went yourself (they met you)
cap 40%
```

When it is bought, the unsold credit becomes the platform film. It is the same project, there is
one credit, and the festival is kept on it.

## 8. Awards

- **Eligibility.** A platform film is a movie, so it is on the film track and up for the Asker. A
  festival pickup stays on the festival track. Both are decided by format, never by distribution.
  There is no streaming penalty.
- **The campaign** works as it does today (`awards.js`): you start it on the season card and spend
  three months turning up for it. What is new is **who pays**:
  - the premium service for its films rated 70+;
  - the giant for its films rated 80+.

  Those campaigns cost you only the months, as a studio's does, and the card names the platform
  paying. Anything else, including every ad-supported and genre-service film, is a campaign you
  fund yourself, priced as for an indie.

## 9. TV movies

Not in V1. The ad-supported service's cheap films are what the TV movie became.

## 10. The boundary: a film to the critics, not to the box office

A platform film **reuses the film scales**:
- genre and ad-supported films are `indie`;
- premium films are `indie`, or `feature` from €15m;
- the giant's are `feature`, or `blockbuster` from €150m.

On those scales the critics, the crowd's reception, Asker strength, typecasting and posters treat it
as a film.

Everything about **money** is asked of the film's market, not its scale:
- `release.js` `open`: no box office, no carpet, no co-star's film record, a four-week run, and no
  campaign / date / opened-against lines on the card.
- `release.js` `closeRun`:
  - no `feedTheMarket`, `settleWorldHit`, bomb fame cut, `boxOfficePoison`, `pictureMoney`,
    `markBillion` or `maybeContinue`;
  - the platform's own sequel decision instead. `maybeContinue`'s sequel table is keyed by money
    words, and a missing key there is NaN.
- `outcome.js`: judged as streaming (Miss / Solid / Hit / Breakout), the same grades as a season.
- `world.js` `yourHeat`: rating only. `yearbook.js`: not on the box-office lists.
- `budget.js`: the platforms' film budgets (as `EPISODE_RANGE` is).
- `release/theatrical.js`: the festival's buyer and the later sale.

**Tests prove** that a platform film's credit:
- carries no box office and never enters the genre market or the billion;
- is up for the Asker and **not** for the Emmet;
- never goes to `streamingRenewal`, the bubble or a season offer;
- is never a "television face";
- stays one project and one credit through a festival sale or a later sale.

## 11. Measurement, and what must not move

`tests/probes/probe_streaming.mjs` gains films. It runs 40 careers × 34 years, a streaming bot and an
unsteered player (two runs), and measures:
- a first film's median score: about 1 on every platform;
- outcomes, unsteered: about Miss 25% · Solid 40% · Hit 30% · Breakout ≤ 5%;
- the median week-one share: 55–65%;
- a lead's fame, against a cinema lead of the same tier;
- **the economics of ×1.25**: what a platform-film lead earns, against a cinema lead of the same tier
  with the points and bonuses those really paid;
- the share of a career's films that are platform films;
- the festival endings, with how many players choose each;
- Asker nominations from platform films.

**Must not move**:
- `STREAMING=off`: the same seed gives the same life, to the last digit (`probe_same_life.mjs`).
- Streaming on: box office per cinema film, the Billion Club and the genre market stay within noise.

## 12. Files, and the debt

| file | change |
|---|---|
| `career/streaming.js` | the film table, `dropFilm`, the outcome, fame, the platform's lines, the sequel odds, who backs a campaign |
| `career/release/streaming.js` | the film's drop beside the season's |
| `career/budget.js` | `planPlatformFilmBudget` |
| `career/project.js` | a platform film is `medium: streaming, format: movie` |
| `career/castings.js` | film rows on the streaming shelf and the routes |
| `career/franchise.js` | the platform's sequel |
| `career/release/theatrical.js` | the festival's buyers, the choice, the later sale |
| `career/contract.js` | the buyout line in place of points |
| `career/awards.js` | who pays for the campaign |
| `release.js` | which market at the money places; no new logic |
| UI | `BigMoment`, `OpenCall`, `Filmography`, `Diary`, the festival letter |

Not `App.jsx`.

**Debt**: `release.js` `closeRun` (~240 lines) and `open` (~180) are already past the line; this plan
only adds checks to them. `castings.js` (858), `awards.js` (830) and `release/theatrical.js` (678)
grow. Each change is reported with its line count.
