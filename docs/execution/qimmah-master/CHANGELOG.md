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
