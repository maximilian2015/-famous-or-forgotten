# Streaming Movies V1 — design plan (no code), revision 1

21 Oct 2026. Media Ecosystem stage 3, second half. For Maxi's review before anything is built.

Maxi's brief: a streaming movie must not be the series formula with the renewal taken out. It needs
its own platform expectations, its own cost, its own life, and perhaps a harder dependence on the
first 28 days. §0 is that comparison; the rest is how it would be built.

Ground rules, inherited from the series plan (revision 4):
- genre enters a streaming audience once, through the platform's taste;
- the common grade is an adapter beside the native result;
- fame is awareness;
- a project is one identity from offer to credit;
- no Streaming Value before stage 4, so fame gates access;
- old saves and credits are untouched;
- **the theatrical baseline does not move**: with `STREAMING=off` a seeded life is identical to
  main to the last digit.

Every number below is a **starting value for the probe to calibrate**, as with the series. The
examples in §3 come from a script beside this file (`2026-10-21-streaming-movies-examples.mjs`).
It computes the film side from this plan's formulas, and the series side from the shipped
`dropSeason`.

---

## 0. A platform film is not a platform season

| | streaming season (shipped) | streaming film (this plan) |
|---|---|---|
| **What the platform judges** | `finished28`: who **finished** the season within 28 days, per €1m of the season | `views28`: who **pressed play** within 28 days, per €1m of the **whole film** |
| **Where quality enters** | completion: how many got through eight hours | **hold**: how much of week one comes back in week two (word of mouth) |
| **Shape of the 28 days** | fixed: week one is always ~42% | front-loaded: week one is **48–75%**. A film nobody liked is over in a week |
| **What the names do** | awareness `draw/40` | awareness `draw/25`: a film is sold on a thumbnail with a face on it |
| **Fans** | last season's finishers come back | none, except a sequel's audience |
| **What it costs** | episodes × episode cost + the cast, per season | one bill up front: budget + the platform's own marketing + your fee |
| **Decided after the verdict** | another season, on next season's real cost; the bubble | no renewal and no bubble. A sequel, sometimes. Whether that platform rings you again |
| **Afterlife** (never the verdict) | reach 1.3–3.5 × views28 | 0.4–1.3 × views28: a film's long tail is short |
| **The top word** | **Breakout** = Hit + the views bar + passed around (70% finish, word 82+) | **Number one** = Hit + the views bar + **held** (week two kept 55%+ of week one, word 80+) |
| **Awards** | the Series Award | **the Asker**, as a film. A festival pickup stays on the festival track |
| **Your money** | a fee per episode, raised each season | **one buyout fee**: the film fee table × 1.25, no points, no merchandise |
| **In the trades** | no box office | no box office: no smash, no bomb, no box office poison, no billion |

**The same star, the same genre, the same giant.** A star (fame 70) and a co-star (50), Sci-Fi,
hype 40. A season costs €152m, a film €216m. The figures come from the script.

| | ordinary (word 60) | loved (word 82) |
|---|---|---|
| season: views28 · finished28 · score | 67.7M · 28.4M · 0.89 Solid | **67.7M** · 46.3M · 1.45 Hit |
| film: views28 · week one share · score | 54.9M · 66% · 1.06 Solid | **75.3M** · 48% · 1.45 **Number one** |

The difference in one line:
- A loved season is watched by **the same number** of people, more of whom **finish** it.
- A loved film is watched by **more** people, because they **keep coming** in weeks two to four.

A film the crowd shrugs at gets two-thirds of its whole life in seven days.

---

## 1. What each platform wants from a film

The same four platforms as the series, with the same names and the same genre tastes (one platform
has one audience). Their film side is a second table, beside `ARCHETYPES`.

| platform | what it buys | budget (€m) | target¹ | Number-one bar² | push lines³ big / low | own marketing⁴ | max fee | Asker push | sequel odds |
|---|---|---|---|---|---|---|---|---|---|
| **the giant** | event films | 40–220 | 0.24 | 70M | ≥ 120 / ≤ 30 | 10% | — | campaigns films rated 82+ | Number one 60% · Hit 25% |
| **the premium service** | awards films | 6–45 | 0.40 × acclaim⁵ | 25M | ≥ 35 / ≤ 10 | 6% | — | campaigns 75+ | none |
| **the ad-supported service** | the film you put on: rom-com, thriller, the Christmas one | 3–25 | 0.90 | 35M | ≥ 18 / ≤ 6 | 4% | €3m | never | Hit 20% |
| **the genre service** | horror and science fiction | 1–8 | 0.50 | 10M | ≥ 6 / ≤ 2 | 3% | €1m | never | Hit 30% |

¹ millions who pressed play in 28 days, per €1m of the film's whole cost, that the platform calls par.
² views28 a Hit needs, among other things, to be Number one.
³ on the whole cost.
⁴ a share of the budget. A cinema release spends 50–100% of its budget selling the film; a
platform spends almost nothing, because the home screen is free. That is a real reason a platform
film costs less to call a success.
⁵ exactly as for its series: `1 + max(0, rating − 70) / 50`.

## 2. The audience model

```
cost        budget × (1 + own marketing) + your fee              (a festival pickup: its price, §7)
push        big  if cost ≥ the big line, or draw ≥ 30 (a star on it), or a sequel to a Hit / Number one
            low  if cost ≤ the low line and draw < 12
            multipliers 0.6 · 1.0 · 1.6 (the series' PUSH)
awareness   0.5 + draw/25 + hype/100
weekend     subscribers × 0.016 × awareness × push × genre taste × dice(0.8–1.25)
            the first three days, which nobody has seen yet: no quality in it
week1       weekend × 1.8 (the rest of the week)
hold        clamp(0.25 + (word − 50) × 0.01, 0.15, 0.75)   word = release/theatrical.js wordFor
views28     min(week1 × (1 + hold + hold² + hold³) + sequel fans, 0.6 × subscribers)
            sequel fans = 0.4 × the last part's views28, in week one, counted ONCE (the series lesson)
score       views28 / cost / target × acclaim (premium only)
outcome     Miss < 0.7 · Solid < 1.4 · Hit · Number one = Hit AND views28 ≥ bar AND hold ≥ 0.55
top-10 weeks  weeks whose views clear 1% of subscribers (shown, never judged)
afterlife   views28 × (0.4 + 1.2 × hold)                     (kept, never the verdict)
```

- **Completion is not in it.** A platform counts a film's views as hours watched over its running
  time, so walking out is already inside the number.
- **Quality enters once, through hold**, which is the word of mouth. That is the same `wordFor`
  the cinema run uses to decide a film's legs.

## 3. Examples (computed by the script, dice = 1)

| | platform | cost €m | weekend | views28 | week 1 share | hold | score | outcome | top-10 wks | fame |
|---|---|---|---|---|---|---|---|---|---|---|
| A unknown (8), genre-service horror | genre | 2.1 | 0.4M | 1.1M | 71% | 0.30 | 1.05 | Solid | 1 | +3 |
| B rising (30), ad-supported rom-com | ad-supp. | 10.7 | 3.6M | 10.1M | 64% | 0.37 | 1.05 | Solid | 2 | +5 |
| C star (70+50), giant event, ordinary | giant | 216 | 20.1M | 54.9M | 66% | 0.35 | 1.06 | Solid | 3 | +13 |
| D the same, loved | giant | 216 | 20.1M | 75.3M | 48% | 0.57 | 1.45 | Number one | 5 | +13 |
| E known (45), premium drama rated 8.6 | premium | 24.8 | 2.8M | 9.1M | 56% | 0.47 | 1.21 | Solid | 3 | +4 |
| F festival prize, bought for €4m | premium | 4.0 | 1.3M | 4.4M | 54% | 0.49 | 3.49 | Hit | 2 | +3 |
| G supporting (30) under a 60, giant event | giant | 155 | 15.4M | 44.5M | 62% | 0.39 | 1.20 | Solid | 3 | +5 |

Fame is from §5, and before the headroom that every fame gain passes through. F shows why platforms
buy at festivals: a film bought cheaply is a Hit on a small audience.

## 4. The life of a platform film

1. **The part** reaches you by one of the routes in §6.
2. **The contract.** One fee, bought out. The points and merchandise asks (`contract.js`) are not
   offered. The control says why before it is pressed: *"A platform pays for the film up front and
   keeps whatever it makes. There are no points to ask for."*
3. **The shoot**, as for any film.
4. **Post**, as for a film (`postProduction(scale)`), not the series' four to seven months.
5. **The drop**, on a Friday, with no window and no weekend to open against. No carpet, except for
   the giant's event films, which get a premiere and the opening fame of a cinema lead.
6. **The weekend**, a card the Monday after: views in three days, and "number one on Lumen" or
   where it sits.
7. **Day 28**, the verdict card: views28, weeks in the top ten, the outcome word, and the platform's
   line saying why. A film that cost €216m and was watched by 55M is told, in words, that the money
   wanted more. **The credit closes at four weeks.** A series keeps a fifth-to-eighth week tail; a
   film has none.
8. **After**: fame, hype and standing (§5); the sequel decision; the awards season (§8).

## 5. What it does to your name

- **Fame**:
  - poster share: event lead +5, lead +3, supporting +1;
  - plus the series' rate per view: +1 per 5M views28, up to +8, half for a supporting part.

  A film is sold on a face, so the face gets something even when few watched. Calibration target:
  a streaming film lead, in an unsteered career, moves fame about as much as a cinema lead of the
  same tier (±30%).
- **Hype**: the series' `hypeFor`:
  - Number one 70;
  - Hit 48 (26 for a supporting part);
  - Solid 22 for a lead;
  - Miss 0.
- **Standing**: exactly as for any film. The critics review it as a film, rating sets the gain,
  and the against-type and carried-the-set rules apply.
- **Not**:
  - no quote jump for a smash, because there is no smash;
  - no box office poison, because there is no bomb;
  - no billion and no World Hit;
  - it does not feed the cinema genre market, because that appetite is the cinema audience's.
- **Heat** (world rank) counts the film's rating and no gross. Heat is the film business's rank,
  built on gross and quality. A platform film is quality without gross, and the probe will show
  whether that undersells an A-lister who only streams.

## 6. How the work reaches you: the same volume, a new kind

No new streaming volume. Film rows **share** the streaming shelf (still 2–3 listings), the agent's
streaming share (16%) and the platform's own calls (2.2% / 3.5% a month). The probe shows what
share of a career's films become platform films.

| route | part | platform | fame from |
|---|---|---|---|
| shelf (open call, self-tape) | lead in a genre film | genre | 0 |
| shelf | supporting in a genre / ad-supported film | genre, ad-supported | 0 / 15 |
| shelf | lead in an ad-supported film | ad-supported | 15 |
| agent | lead in an ad-supported or premium film | ad-supported, premium | 35 |
| agent | a name part (supporting) in an event film | giant | 35 |
| the platform's call (Email) | lead in an awards film | premium | 55 |
| the platform's call (Email) | lead in an event film | giant | 70 |
| a festival | §7 | any | — |
| a sequel | the platform's continuation | the same | — |

A nobody can lead a genre-service horror film. That is the real way in, and the cheapest route a
platform has.

## 7. The festival's third ending

**Today** a festival picture ends in one of three ways:
- **prize**: the discovery, then a small cinema release with laurels;
- **sold**: a distributor buys it for a small release;
- **unsold**: it is over that night.

The player can go to the festival, or pay a sales agent, to change the odds.

**The plan** keeps the jury and the odds of being bought exactly as they are, and changes **who
buys it**:
- **A platform bids** when the film suits one:
  - the genre service for horror or science fiction;
  - the premium service for a drama or crime picture rated 70+;
  - the ad-supported service for a comedy or romance;
  - the giant only for a lead of fame 60+.
- **A distributor bids** as today.
- **When both bid, you choose.** The two buttons on the Sunday say what each one does:
  - **"Cinemas"**: a small release, the laurels on the poster. The box office is the verdict, and
    it may find nobody.
  - **"Lumen"**: Friday, everywhere at once, at a known price. The views are the verdict, with no
    box office and no points.
- **Unsold is not always the end.** A film rated 60+ that nobody bought has a chance (starting value
  25%) that a cheap service picks it up 3–9 months later, at a low price: *"it found a home."*
- A **prize** keeps its discovery fame, its standing and the studio's script, whoever buys the film.
- A platform's price is `budget × 1.3` if the film was sold, `× 2.2` if it won a prize. The film is
  judged against that price.

## 8. Awards

- A platform film is a **movie** (`format: 'movie'`), so it is on the **film track** and up for the
  Asker. A festival pickup is on the festival track, decided by format and never by medium (decision
  4, 19 Oct).
- Its strength is computed as any film's is: rating, scale, prestige and genre. There is **no
  streaming penalty**, because inventing one is a balance knob nobody asked for.
- **The platform's campaign.** The premium service campaigns for its films rated 75+, and the giant
  for 82+. On those films you do not have to pay for a campaign yourself. You still can on any
  other film, as today.

## 9. TV movies: recommend not a format of their own

The ad-supported service's cheap films (the Christmas rom-com, the Sunday thriller) are what the TV
movie became. A separate network TV movie would be a fifth film path with no decision of its own in
it. If one is ever wanted, it goes to the Series Award (a TV movie category), later.

## 10. The boundary: a film to the critics, not to the box office

A platform film **reuses the film scales**:
- genre and ad-supported films are `indie`;
- premium films are `indie`, or `feature` from €15m;
- the giant's films are `feature`, or `blockbuster` from €150m.

On those scales the critics, the crowd's reception, Asker strength, typecasting, posters and the
filmography all treat it as a film with no new code.

Everything about **money** asks one classifier, `isTheatrical(x)` = a film scale AND the project's
medium is theatrical. These places must ask it rather than `isFilm(scale)`:

- `release.js` `open`: the box office, the opening fame, the co-star's film record (rating only,
  gross 0), the run's weeks, and the premiere card's campaign / date / opened-against lines.
- `release.js` `closeRun`:
  - `verdictOf`, `feedTheMarket` and `settleWorldHit`;
  - the bomb's fame cut and `boxOfficePoison`;
  - `pictureMoney`, the money line, `markBillion`;
  - `maybeContinue`. Its sequel table is keyed by money words, and a missing key is NaN in somebody's
    money. A platform film goes through its own sequel decision instead, as a season goes through
    `streamingRenewal`.
- `outcome.js`: judged as streaming. It gets two new labels: Number one +2 and Hit +1.
- `world/world.js` `yourHeat`: rating only. `world/yearbook.js`: not on the box-office lists.
- `budget.js`: the platform's own budget range (as `EPISODE_RANGE` is).
- `release/theatrical.js` `festivalAt`: the buyer (§7).
- `Diary.jsx`, `Filmography.jsx`: a 📱 film line with views28 and the outcome word.

**A boundary test** checks that a platform film's credit:
- never carries a box office;
- never enters the genre market or the billion;
- is up for the Asker;
- survives offer → credit → sequel with its platform.

## 11. Measurement, and what must not move

`tests/probes/probe_streaming.mjs` gains a film mode, 40 careers × 34 years, streaming bot and
unsteered (two runs). It measures:

- A first film's median score is about 1 on every platform.
- Outcomes, unsteered, are about Miss 25% · Solid 40% · Hit 30% · Number one ≤ 5%.
- The median week-one share is 55–70%, against 42% for a season.
- A lead's fame is within ±30% of a cinema lead of the same tier.
- The share of a career's films that are platform films.
- The festival endings before and after.
- Asker nominations from platform films, against cinema films.
- How often a sequel happens.

**Must not move**:
- `STREAMING=off`: the same seed gives the same life, to the last digit (`probe_same_life.mjs`).
- Streaming on: box office per cinema film, the Billion Club rate and the genre market stay within
  noise. Only fewer cinema films are taken, and the probe says how many fewer.

## 12. Files, and the debt

| file | change | size after |
|---|---|---|
| `career/streaming.js` | the film table, `dropFilm`, the outcome, fame, the platform's line | 210 → ~320 |
| `career/release/streaming.js` | the film's drop, beside the season's | 32 → ~80 |
| `career/castings.js` | film rows in `STREAM_ROWS` | 858 → ~885 ⚠ |
| `career/franchise.js` | the platform's sequel decision | +~40 |
| `career/release/theatrical.js` | the festival's buyer and the choice | 678 → ~740 |
| `career/project.js` | a streaming `movie` format | +~5 |
| `career/budget.js` | the platforms' film budget ranges | +~10 |
| `career/outcome.js` | Number one | +~3 |
| `release.js` | only `isTheatrical` at the money places, nothing new | 828 → ~830 |
| UI | `BigMoment` (the weekend, day 28), `OpenCall` (film rows), `Filmography`, `Diary`, the contract room's refused asks | — |

Not `App.jsx`.

**Debt** (files over ~1000 lines, functions over ~150):
- `release.js` `closeRun` is ~240 lines and `open` ~180. Both are already past the line. This plan
  adds one-line checks to them, not code.
- `castings.js` (858 → ~885) and `awards.js` (830) are near 1000. The film rows are data and add
  few lines.

None of this is split by this plan, as agreed: no splitting `release.js` for line count.

---

## Decisions for Maxi

1. **The top word for a film**: *Number one* (Hit + the bar + held its second week). The
   alternative is the series' word, *Breakout*. Recommended: Number one. It is the word the business
   really uses for a platform film, and it says what happened.
2. **The festival with two bidders**: you choose (recommended), or it is rolled for you.
3. **Unsold festival films** can be picked up by a cheap service months later. Recommended: yes
   (25%, starting value).
4. **TV movies**: not a format of their own (recommended, §9).
5. **No points on a platform film**: the fee is ×1.25 instead. Recommended: yes. It is a real
   decision for the player, a certain fee against a share of a gross that might come.
6. **The Asker**: every platform film is eligible as a film, and the platform decides whether to
   campaign (recommended). The alternative is a qualifying week in cinemas as a gate.
7. **A platform's memory**: after a lead's Miss, that platform does not ring you for two years.
   This is the film's version of box office poison, kept per platform. In V1, or later?
