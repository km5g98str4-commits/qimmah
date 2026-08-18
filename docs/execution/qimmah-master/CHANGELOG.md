# CHANGELOG — control plane & plan changes

> **Canonical owner of one fact only: what changed in the plan, and why.**
> Product changes live in git. This file records **plan** changes: the Master Plan is versioned,
> and **agents are forbidden from silently expanding scope**.

Every plan change needs: `PLAN-CHANGE-ID` · reason · tasks added/removed · critical-path impact · scope impact.

---

## 2026-08-18 — MASTER_PLAN_VERSION 1.0 (initial freeze)

Created `docs/execution/qimmah-master/` as the project control plane and froze the plan at **v1.0**
after the red-team pass recorded in `06-MASTER-PLAN.md §5`.

**Established**
- `CANONICAL_GROUND` = `codex/qimmah-sovereign-closure-001` @ `139a7b0`, proven by containment over
  all 80 remote branches — **`main` is 228 commits behind and is the production pointer, not the frontier.**
- 8 branches carry unique commits; all 80 classified. ~121k lines of QAE work preserved as `REFERENCE`.
- Feature map (15 capabilities) and claim ledger (51 claims) built from code with `path:line` evidence.
- 14 decisions LOCKED, 5 PENDING_FOUNDER, 2 SUPERSEDED.
- 12 `BLOCKS_V1` tasks, 8 `POST_LAUNCH`, 4 `NOT_A_BUG`.

**Plan changes made by the red-team pass, before freezing**
- `PLAN-CHANGE-000a` — `QIM-V1-005` resequenced after `QIM-V1-001`. Making a CI step non-gating
  while CI is red would look like — and could become — hiding red.
- `PLAN-CHANGE-000b` — `QIM-V1-016` narrowed from all 34 raw-write sites to the **live-path** subset.
  The rest are in orphan files and belong to `QIM-V1-015`. Fixing a bug in a file no user reaches is
  waste that reads like progress.
- `PLAN-CHANGE-000c` — `QIM-V1-009` narrowed from "add observability" to the smallest truthful
  failure signal, per the mission's own instruction not to block launch on elaborate observability.
- `PLAN-CHANGE-000d` — every guard-touching task now must classify its test change
  **STRONGER / EQUIVALENT / WEAKER**, after three green-but-hollow guards were found in one day.

**Documents superseded** (kept, but no longer authoritative — see `QIM-V1-015`)
`docs/execution/qimmah-sovereign-closure/STATE.md` · `…/qimmah-sovereign-overnight/STATE.md` ·
`…/qimmah-postweb/STATE.md` · `…/qimmah-web-sovereign/STATE.md` ·
`…/qimmah-final-convergence/FINAL-INTEGRATION-STATE.md` · `docs/FOUNDER-QA-HANDOFF.md` (stale commit
stack) · `docs/RELEASE-RUNBOOK.md` (for V1 — describes an `integration/waveN` model that no longer
exists; retained as the iOS reference).

**Executed this session**
- `QIM-V1-001` — six onboarding harnesses made intent-aware. They now share one `answerDietPattern`
  helper that **imports `dietPatternApplies` from the product** rather than restating the rule, and
  asserts the contract in both directions. Test classification: **STRONGER** — the previous code
  could not detect the question disappearing for everyone, and the naive fix ("click it if present")
  would have had the same blind spot.

---

## 2026-08-18 — PLAN-CHANGE-001 · `QIM-V1-004` closed as unnecessary

**MASTER_PLAN_VERSION stays 1.0** — a task was *removed after verification*, not added. No new
scope, no resequencing of anything else, no new founder dependency.

**Reason.** `QIM-V1-004` was to adopt the four unique commits on
`codex/qimmah-final-release-convergence-001` (BR-01). The rule "verify before you build" was
applied to the merge itself, and every value the branch claimed was already on the ground:
the numeral limit at the display boundary (`workoutDayLabel.ts:39` — which **credits BR-01 by
name** for the insight while deliberately leaving its implementation behind), the localisation in
`WorkoutView` and in the Today components, BUG-033..036 in the regression ledger, and REL-001/002
on the live surfaces.

**And the merge would have been a regression, not a no-op.** BR-01 baked Arabic-Indic numerals
into `todayV2Model`; the ground localises at the display boundary, which also repairs plans that
are *already stored* on users' devices. That decision is recorded in
`docs/execution/qimmah-founder-qa/DEFERRED-ITEMS.md`.

**Measured cost of doing it anyway:** 5 content conflicts predicted by `git merge-tree`, and a
`package.json` at **182 scripts / 113 gate steps** against the ground's **214 / 141** — the §4.1
trap, where a careless `--theirs` silently deletes 32 scripts and 28 gate steps.

- tasks removed: `QIM-V1-004`  ·  tasks added: none
- critical-path impact: **shortened** — the RELEASE lane no longer waits on a merge
- scope impact: none
- branch ledger: **BR-01 `ADOPT` → `SUPERSEDED`**

> **The lesson worth keeping:** BR-01's commit messages describe real, valuable fixes — and they
> were true when written. The branch had already been *harvested*: its knowledge taken, its
> implementation left behind on purpose. Trusting the commit message instead of the tree would
> have overwritten better code with older code and called it progress.

## 2026-08-18 — executed after the freeze

- **`QIM-V1-001` DONE.** CI run **423 on `dc031fa` is green — the whole run**, including step 12
  "Onboarding v2 browser E2E" (red since `7eaed49`) and step 13 "Upload dist artifact".
  This also settled the open question in `07-STATE.md`: the `favicon.ico` 404 was specific to the
  agent container, exactly as classified. **The console-error assertion was never relaxed.**
- **`QIM-V1-018` DONE.** Three missing English warning entries — not one — including the
  `unrecognized limitation` case, whose silence reads as reassurance. New guard
  `test:plan-warning-parity` wired into `test:gate` (**141 steps**); its red was reproduced for
  real (19/1, exit 1, failure named by sentence), and the guard was then attacked and tightened
  after its first form was found to **pass undeservedly on a missing entry**.
- **`QIM-V1-005` DONE.** BR-02 merged; verified after merge that exactly two steps are
  non-gating (perf budget, artifact upload) and all eight quality steps still gate.
