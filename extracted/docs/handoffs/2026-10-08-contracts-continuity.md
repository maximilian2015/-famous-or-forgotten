# Contract and continuation fixes — Claude handoff

Branch: `fix/contracts-continuity`.
Base: `73edbb9b15f2c2318a7728894e689878b1c21101` on `main`.
The scope is the reproduced contract/continuation bugs from the audit, plus preservation of existing TV terms. This branch is for review before integration.

## Fixed transitions

Locations below refer to the corrected source. All paths start at `extracted/`.

| Finding | Location | Cause and smallest fix | Reproduction / measurement |
| --- | --- | --- | --- |
| A handshake was overwritten by signing | `src/systems/career/standoff.js:561`, `src/systems/career/contract.js:146` | Signing reads contract clauses, while the room previously updated only the offer. Synchronize the fee, episode count, granted exclusivity and span on the paper; reuse the existing formatter for visible text. Mark the changed fee/exclusivity as agreed. Remove old fee asks that are no longer raises and update date-option durations without changing their dates or odds. | `test_contract_continuity.mjs`: handshake, saved-paper, text, fee-ask and held-date cases. In the 300-seed probe: fee/total overwritten **300 → 0**; exclusivity overwritten **63/63 → 0/63**. Seed 1 now signs **€141,400 × 7 = €989,800**, matching the room and displayed paper. The stale "more" option previously cut this to **€120,000 × 7 = €840,000**; it is now unavailable. A held date previously restored **5 months** after a **3-month** agreement; it now keeps **3**. |
| Leaving could put the player back at the table | `src/systems/career/standoff.js:688` | `walkTheRoom` selected a non-pay outcome, but `itFails` ignored it and rolled again. Honor a valid `_forced` outcome; retain the original roll for ordinary failures. | Leaving and forced-outcome tests, with an ordinary-pay control. In 300 seeded walkouts: room/offer left open **116 → 0**. Probability weights are unchanged. |
| Additional TV terms disappeared between systems | `src/systems/career/terms.js:6`, `production.js:149`, `release.js:631`, `release.js:676`, `release.js:882`, `franchise.js:441` under `src/systems/career/` | Each hand-built transition dropped `tvPoints`, `producing`, `directOne`, `guaranteed`, `billing`. Carry defined values through the shared `tvTermsOf` helper, preserving explicit zero and false. | Production/post/credit/renewal tests, including JSON and zero/false. Probe: points lost **300 → 0**, producer term lost **300 → 0**, directing promise lost **178/178 → 0/178**. This fixes stored terms, not new payout mechanics. |
| A rescued shoot received another character/script | `src/systems/career/stability.js:156`, `src/systems/career/stability.js:243` | Freeze/thaw omitted the existing character and premise, so `dressOffers` invented replacements. Preserve them, series identity, potential and existing TV terms on both boundaries. | Freeze/save/thaw tests and a legacy metadata-free rescue control. Probe: character lost **300 → 0**. The rescued Ethan Cole keeps his existing premise. Remaining owed salary stays the resume fee; this does not replay the whole episode fee. |
| A renewal lost its showrunner | `src/systems/career/release.js:679`, `src/systems/career/franchise.js:433` | Renewals receive the release job, which had discarded the crew identity. Store the actual showrunner name/contact ID there; legacy jobs can recover the existing director from the credit and contacts. | Real and legacy showrunner tests. Probe: showrunner lost **300 → 0**. No replacement person is generated. |
| Filmography kept saying renewed after a write-out/cancellation | `src/systems/career/standoff.js:157` | Negotiation exits removed the offer but never updated its source season. Renewals now carry `sourceCreditId`; update that credit's outcome/reason, with a preceding-season/title fallback for legacy saves. | Source-ID, legacy, wrong-show/season, exit-reason and cancellation tests. Probe: stale source-credit outcome **300 → 0**. This is credit history, not a persistent character-death ledger. |
| Meetings named a season too far ahead | `src/ui/components/RoomModal.jsx:25`, `src/systems/career/standoff.js:426`, `standoff.js:696`, `standoff.js:740` | A renewal already names the upcoming season; another `+1` showed season 4 for a season-3 offer. Use the offered season in the meeting, invitation and failure messages. | Invitation/failure tests plus the built DOM probe. Offered season **3** now displays **3**, previously **4**. Existing wording is reused. |

## Reproduce and verify

Run from `extracted/`:

```bash
npm install
node tests/test_contract_continuity.mjs
node tests/run_all.mjs
node build-singlefile.mjs
node tests/probes/probe_contract_continuity_audit.mjs
node tests/probes/probe_room_dom_audit.mjs
```

The regression file contains **37 deterministic cases** using the real systems. Both probes assert the **new** behavior; failures when running against the original base are expected. The simulation probe uses 300 seeded contract/rescue scenarios, rather than claiming to simulate 300 complete careers.

Final verification after all review fixes: **37/37 targeted cases**, **76/76 test files**, **lint**, **autoplay**, both probes and `git diff --check` passed. The build completed: `built: 1321KB | module: false` (with the existing `inlineDynamicImports`/`codeSplitting` warning). A separate read-only review reran the targeted cases/probes and found no remaining issues in this scope. The baseline before adding the regression file passed 75/75.

The built DOM probe loads `dist/game.html`, uses real `store.dispatch`, presses **Shake on it** and **Sign it**, checks visible paper text, then checks the saved shoot. It reports no UI errors. This is **not a real-browser visual check**. The cloud browser could not reach the local HTTP server; its security policy then refused the local-file protocol. No workaround was attempted. Before integration, open the freshly built `dist/game.html` in a normal local browser and check the meeting and contract screens visually.

## Scope and integration

The five TV benefits now survive saves and continuations. Their new earnings, producer-credit effects and directing-episode mechanics remain a separate implementation task. A career-wide character ledger, return offers, preparation quests and persistent people filmographies also remain outside this bugfix branch. Existing probability/balance constants, prose and load-bearing comments were retained. No new guard exports were needed here; the new exported helper is `tvTermsOf`.

Claude: read root `CODEX.md`, then `extracted/DESIGN.md`, then this handoff. Review the diff against the base and the committed regressions. Finish or commit your current work before integrating; do not overwrite an uncommitted working tree. If `main` has moved, review overlapping changes before choosing merge/cherry-pick and rerun the commands above on the combined result. Keep `main` unchanged until Max has reviewed the result.

If the branch is available remotely:

```bash
git fetch origin fix/contracts-continuity
git diff 73edbb9..origin/fix/contracts-continuity
```

If Max supplies the format-patch instead, review its diff, then apply it on a clean task branch based on the base above (or reconcile it with newer work):

```bash
git am /path/to/famous-or-forgotten-contracts-continuity.patch
```

The patch includes this handoff, the source fixes, test helper, regression file and both probes. It does not need the unrelated unfinished feature worktree.
