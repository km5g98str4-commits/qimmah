# Qimmah — Proposed Fixes (companion to the audit)

**Revision 2 · 2026-08-03 · baseline `e6476f7`**

**Status: nothing implemented, nothing decided, no approval requested.** This document records *directions*
so the audit's findings have a landing place. It deliberately asks no questions — the inspection phase owns
this session.

No application source file was modified during either audit pass. The only files written are this document
and `QIMMAH-FULL-AUDIT-2026-08-03.md`.

---

## Decisions that must be made before any code moves

Recorded for later, **not** put to you now. Each blocks work beneath it.

### D-1 — Which workout screen ships

Governs F-P0-01, F-P0-03, F-P1-04, F-NOTIF-02 and 17 gate entries.

| | Option A — promote `WorkoutV2` | Option B — port safety into the live `WorkoutView`/`WorkoutMode` |
|---|---|---|
| Router change | 2 lines | none |
| Effort | Small | Medium (~150-200 lines across 3 files) |
| Fixes F-P0-01 (finish data loss) | already correct there | by porting `commitFinishedSession` + reordering the clear |
| Fixes F-P0-03 (rest timer) | already correct there (`rest.endsAt` + visibility re-sync) | by porting the wall-clock timer |
| Fixes F-P0-04 (weight logging) | only if `ProgressV2` is promoted too | needs new UI on `ProgressView` |
| Unlocks F-P1-04 (substitution), RPE, rest tips, one-handed mode | yes, free | no |
| Makes 17 gate entries meaningful | yes | no — they stay pointed at dead code |
| Risk | **UI users have never seen.** 1,386 lines never rendered in production; no device test | **Low** — visible UI unchanged |
| Honest caveat | I have not run either screen in a browser. "Complete" = code-complete + proof-covered, not *seen working* | — |

**Recorded recommendation:** Option A, gated behind a preview deployment and a device pass before `main`. It
converts ~2,600 lines of dead-but-tested work into product and makes the existing gate honest. Option B is
legitimate if UI stability for launch outweighs that — in which case `WorkoutV2`, `ProgressV2`, `NutritionV2`
and their 17 proofs should be deleted rather than left as a false gate.

### D-2 — Cloud sync: activate or retire

13 tables, LWW, tombstones, consent gates, sanitisation — complete, tested, and switched off. It correctly
costs almost nothing in the bundle (tree-shaken). It is either the next feature or dead weight; leaving it
indefinite keeps four dead DB tables and ~1,500 lines in limbo.

### D-3 — English content: author or scope out

0 of 181 exercises have English guidance. Either the content gets written (181 × 4 blocks) or the English
build should stop presenting four "guidance unavailable" panels as if content were merely missing.

### D-4 — Charter §1

`main` is 258 commits ahead of the branch the charter names as trunk. Until §1 and §11 are corrected, every
agent that follows the charter branches from a stale base. Documentation change only — out of scope for this
session by your instruction, recorded here.

---

## Batch 1 — Critical (proposed scope, not scheduled)

Ordered so that the independent, low-risk item lands first.

### Fix 1 — Reachability guard in the gate
**Closes F-TEST-01.** *Independent of D-1 — the one Batch-1 item that can proceed without any decision.*

- New `scripts/run-reachability-proof.mjs`: build the module graph from `src/main.tsx` (or read the build
  metafile, as this audit did) and fail if any file named by a proof script is not in it.
- One `package.json` entry + one link into `test:gate`. **Note:** charter §1.4 reserves `package.json` for
  the coordinator — flagged, not assumed.
- **It will turn the gate red on landing** — 6 entries test only dead code. That is the point, but it means
  it needs either a short *declared* allowlist that Fix 2 empties, or it lands after Fix 2. A silent
  allowlist would recreate the exact problem (charter §4.2 requires the exception be declared in output).
- Ship it with a deliberate bypass attempt that fails by a **named** check, not a `TypeError`.

### Fix 2 — Workout completion never lies
**Closes F-P0-01.** *Blocked on D-1.*
Files under Option A: `src/App.tsx` (lazy target), `src/views/WorkoutView.tsx` (becomes a thin adapter, as
`ProfileView`/`DashboardView`/`StartView` already are).
Files under Option B: `src/views/WorkoutView.tsx:106-125`, `src/components/WorkoutMode.tsx:343-344` (stop
clearing before a confirmed write), plus honest failure UI reusing `StateBlock`.
`src/lib/finishWorkout.ts` is **not** modified either way — `persistFinishedSession` keeps its contract for
existing callers.
Acceptance: a simulated `QuotaExceededError` at finish leaves the session on disk, shows an honest error, and
never renders the congratulations screen.

### Fix 3 — In-progress workout saves honestly
**Closes F-P0-02.** *Independent of D-1 in its library half.*
`src/lib/activeWorkout.ts:68-75` → `safeStorage.writeJson` returning a `WriteResult`; delete the
"ليست بيانات حرجة" comment, which is the root cause. Then a persistent degraded-mode banner in whichever
screen D-1 selects, shown at session start rather than at loss.

### Fix 4 — Rest timer becomes wall-clock
**Closes F-P0-03.** *Blocked on D-1; already solved in `WorkoutV2`.*
Replace the `setTimeout` decrement with an absolute `endsAt`, re-sync on `visibilitychange` + `focus`, and
include it in the persisted active-session shape so a reload restores the running rest.

### Fix 5 — Restore measurement logging
**Closes F-P0-04.** *Blocked on D-1.*
Option A: free if `ProgressV2` is promoted (entry form already at `ProgressV2.tsx:235`).
Option B: new entry sheet on `ProgressView` calling `measurementLog.addLog`, using the `ProgressV2`
implementation as the reference.

---

## Explicitly NOT proposed yet

- **No deletion of the ~14,400 dead lines.** Static analysis is not a death certificate (charter §9); each
  file needs a documented dynamic-reference check, and D-1 changes which files are orphaned.
- **No i18n migration.** 406 call sites is a programme, not a batch — one screen at a time.
- **No test rewrites.** 34 text-scanning proofs should become behavioural over time, not in one wave.
- **No dependency upgrades.** `npm audit` is clean; upgrading now is risk without benefit.
- **No design changes.** The visual identity is not in question, and RTL discipline is already excellent.
- **No router changes, no feature flags, no V2 merges, no doc edits outside `docs/audit/`.**
- **No new libraries, no AI features.**
- **No touching `main` directly, no merges, no deploys.**

---

## Blocked work, recorded

The single highest-value thing I cannot do alone is **runtime verification of the database layer**
(U-01, U-02 in the audit): whether RLS is actually enforced and whether `delete_own_account()` is deployed.
`npm run db:verify` and `test:e2e:auth` exist and are wired; they need a staging project. Until then the two
Medium security findings stay *unverified* rather than *safe* — and App Store 5.1.1(v) compliance rests on an
unverified server function.

Second: **a browser walkthrough** of the 26 journeys and **a device pass**, which would convert most
"verified by code path" entries into "verified by observation" and settle U-03 through U-09.

---

## Housekeeping

A detached inspection worktree remains registered at
`…/scratchpad/clean-head` (baseline `e6476f7`) with four throwaway `__audit-*.mjs` analysis scripts inside
it. It is outside the repository working tree and contains no repository changes. Removal was declined
earlier in the session, so it is left in place; it can be cleared with `git worktree remove --force` on that
path whenever convenient.
