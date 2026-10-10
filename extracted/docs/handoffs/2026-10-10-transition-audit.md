# State-transition audit — 10 Oct 2026

Base `ada26b3` (main = origin/main). Audit only: nothing under `src/` changed. Done here instead
of by Codex (its usage window ran out); the brief is `2026-10-08-codex-gaps-audit-brief.md`.

## Коротко по-русски

1. **Загрузка сейва другой версии стирает жизнь.** Игра пишет «Loaded. Carry on.», а на деле
   начинает новую жизнь с рождения и записывает её поверх текущей. Сейчас версия не менялась с
   30 июля, поэтому пока не срабатывает — но первое же повышение версии или старый файл сотрёт всё.
2. **Второй сезон снимает чужой человек.** Продление знает шоураннера, а съёмки следующего сезона
   берут случайного режиссёра: в 13 из 16 продлений. Близость с шоураннером на площадке начинается
   с нуля, в фильмографии у каждого сезона свой «режиссёр».
3. **«Regard» на карточке человека врёт.** People пишет «Would cast you tomorrow» / «Would not have
   you on it», но ни одна дверь к работе этого не читает — всё решает близость. Экран режиссёров и
   карточка People говорят про одного человека разное.
4. **«Drifted away · you stopped calling»** — так подписан каждый остывший, даже если он остыл,
   потому что ты ушёл с его съёмок.
5. **Пресса хранит только 30 последних статей** (примерно два года). Старое удаляется насовсем, и
   к фильмам статьи не привязаны, хотя название фильма в статье записано.
6. **Старые фильмы без оценки критиков и без «needed»** — а оба можно честно посчитать при загрузке.
7. **Гарантия серий переходит в следующий сезон сама** — сейчас условие скрыто, но починить до
   Contract Perks V1.

## Findings, ranked

| # | severity | where | what the player sees | measured / reproduced | smallest fix |
|---|---|---|---|---|---|
| 1 | **data corruption** (latent) | `state/store.js` `normalize` (`version !== CURRENT_VERSION → freshLife()`), `importSave` | Loading a save file of another version says "Loaded. Carry on." and starts a new life at age 0; `setState` persists it over the current life. Same on startup with a stored save of another version. | Reproduced with `playtest/directors-4.json` re-labelled `r0.8a`: importSave returned null, state became a fresh child. Version unchanged since 2026-07-30, so not firing today. | Refuse instead of replacing: importSave returns "That save is from another version of the game" and keeps the current life; on startup keep the raw save under a backup key before starting fresh. |
| 2 | **broken mechanic** | `career/production.js` `startProduction` reads `offer.directorId` / `offer.director`; renewals carry `showrunner` / `showrunnerId` (`franchise.js`) | The next season of your own show is run by a stranger; the bond with the showrunner restarts; each season lists a different director; the Directors screen counts each as a new person. | `tests/probes/probe_transition_tv.mjs`: 16 renewals, the season 2 set run by the same showrunner in **3 / 16**. | In `startProduction`, use `offer.showrunnerId`/`offer.showrunner` when there is no `director`. |
| 3 | **misleading UI / dead mechanic** | `life/regard.js` (`opensDoors`, `whyClosed`, `OPENS_AT` — called nowhere); shown by `App.jsx` PersonSheet (`regardBand`, `regardNote`) | A person's card says "Would cast you tomorrow", "Would not have you on it", "Cannot stand you and would still cast you". No work route reads regard; every door (offers, tentpoles, sets, pitches, favours) is on closeness. The file's own comment says the doors are on regard. | `grep`: `opensDoors`, `whyClosed`, `regardTarget` have no callers outside `regard.js`. | A design decision, not a one-liner: either put the work doors on regard (as the comment says, and the Directors screen with it), or stop the card from promising casting. |
| 4 | **false text** | `App.jsx` PeopleScreen, "Drifted away" rows: `sub={`${p.role} · you stopped calling`}` | Every cold contact reads "you stopped calling", including a director cold because you walked off their set or passed on their film. | Read off the handler; the Directors screen already tells the causes apart (`yourDirectors.js`). | Use the same reading: a live grudge says why; only the drift case says "you stopped calling". |
| 5 | **lost history** | `meta/press.js:295` `s.press = [...pieces, ...s.press].slice(0, 30)` | Only the last 30 pieces exist — about two game years (Alex Moon: 2077–2079 of a career from 2048). Older press about a film is gone for good; no piece is connected to its film, though `about` holds the title. | Alex Moon save: 30 pieces, oldest 2077. | Keep a small per-credit record (headline + tone) when a piece is about a film, keyed by the credit; the News feed can stay at 30. |
| 6 | **old-save gap, derivable** | `career/release.js` `criticalOf(rating)`, `breakEvenFor({scale, campaignTier})` | Old films have no "poorly reviewed / acclaimed" and no "needed", so the new "why it made money" line and the critics' label are missing on most of a long career. | Alex Moon: `critical` on 2 of 52 credits, `needed` on 2; `rating` on 52, `scale` on 44. | Settle at load the way billions are (`settleBillions`): `critical` from the rating, `needed` from scale and campaign, only where missing. |
| 7 | **latent (perks hidden)** | `career/franchise.js` renewal `...tvTermsOf(p)` | A guarantee, points, billing or a producer credit agreed for one season is copied into the next season's offer without being negotiated. | Read off the code; not reachable while `NOT_YET` hides the perks. | Decide per perk before Contract Perks V1: a producer credit may continue; a guarantee and billing should not. |
| 8 | **harmless dead data** | `release.js` `scheduleRelease` / `open` | The shoot's length (`months`) and the paper link (`offerId`) are dropped after the wrap. Nothing reads them later. | `tests/probes/probe_transition_audit.mjs`: `months` 100% on the shoot, 0% from post on; `offerId` 100% → 0%. | None needed. |

Confirmed again, already known and parked: `wrappedAt` never reaches the filmography (0% at
every stage), the best set `moments` are discarded at close, `runStory` is shown once and dropped.
The day-one `take` reaches the credit in 36% of runs — by design: only an argument you won is kept.

## Healthy, verified

- **Film:** offer → contract → shoot → post → opening → close keeps the title, the character and
  its description, the premise, the director, the potential, the material, the scale and tier,
  the `onSet` story, and the meter (as `meterAtClose`) — 11 of 11 seeded careers
  (`probe_transition_audit.mjs`).
- **TV renewal:** the season 2 offer names season 2 and keeps the character, the premise, the show
  name and the showrunner, points at the season 1 credit by id, and season 1 reads "renewed" — 16
  of 16; the signed renewal shoots with the same character and premise, season 2 — 16 of 16
  (`probe_transition_tv.mjs`). Only the person on set is lost (finding 2).
- **Awards:** a nomination and a win are put on the credit by id, by title as a fallback; on Alex
  Moon's save the one nomination sits on its film.
- **Written out / cancelled:** the source credit is updated (fixed in the contract-continuity patch).

## Status — all fixed the same day

| # | commit | what changed |
|---|---|---|
| 1 | `eb4d045` | importSave refuses another version and changes nothing; on startup such a save is kept aside under `fof_react_save_<version>`; another tab's other version is ignored. `tests/test_save_version.mjs`. |
| 2 | `2ccd7f3` | `startProduction` reads `showrunner`/`showrunnerId` when there is no director: probe 16 / 16. |
| 3 | `1a75a76` | Decision: honest text, no balance change. Regard bands and notes describe the opinion of your work and promise no part; `opensDoors`, `whyClosed`, `OPENS_AT` deleted; the studio-door line follows the door's own rule. Putting the doors on regard remains a separate design decision. |
| 4 | `f25e815` | `yourDirectors.js coldCause` is the one reading for People and Directors: holds a grudge / you stopped calling / gone cold. |
| 5 | `a2e954e` | A piece about a film keeps its headline on the credit (three newest), shown under "In the press"; the feed stays at 30. |
| 6 | `a694d08` | `critical` settled at load from the rating (Alex Moon 2 → 44). `needed` deliberately not: re-deriving it contradicted 3 of 27 stored verdicts. |
| 7 | `6873765` | The renewal carries only the share and the producing credit (`terms.js carriedToNextSeason`). |
| 8 | — | Nothing reads `months` or `offerId` after the wrap; no change. |

## Reproduce

From `extracted/`: `node tests/probes/probe_transition_audit.mjs 40` and
`node tests/probes/probe_transition_tv.mjs 30` (both read `playtest/directors-4.json`, seeded).
