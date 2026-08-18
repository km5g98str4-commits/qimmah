# 04 — FEATURE MAP (خريطة القدرات)

> **Canonical owner of one fact only: which capability actually reaches a user, and where its chain breaks.**
> **`Code exists` ≠ `LIVE`.** A feature is LIVE only when the whole path is connected.
> Audited at `139a7b0`. Every row is traceable to a `path:line`.

Status: `LIVE` · `PARTIAL` · `DISCONNECTED` · `DEAD` · `MISSING`

| # | capability | surface | authority | status | the break, named |
|---|---|---|---|---|---|
| F-01 | Onboarding v2 | `#/setup` → `OnboardingV2` | `onboardingV2Flow` + `onboardingV2Adapter` | **PARTIAL** | 18 of 20 questions reach a consumer; 2 do not (below) |
| F-02 | Plan generation | handoff + `#/workout` | `planGenerator.generatePlan` | **PARTIAL** | two conflicting target-weight authorities (F-GAP-02) |
| F-03 | Injury filtering + substitution | onboarding → plan → live swap | `src/lib/injurySafety.ts` | **LIVE** | — (union model, fail-closed, `test:injury-safety` 80/0 over 7920 plans) |
| F-04 | Equipment → exercise pool | onboarding step 5 | `src/lib/equipmentAccess.ts` | **LIVE** | declared `kettlebell` has no profile key (`equipmentAccess.ts:43-45`, declared in-code) |
| F-05 | Food search | `#/nutrition` → `QuickMealLogger` | `src/lib/food/unifiedSearch.ts` | **PARTIAL** | long tail not served (F-GAP-05) |
| F-06 | Workout execution + honest save | `#/workout` | `finishWorkout.commitFinishedSession` | **LIVE** | save-honesty chain verified `WorkoutView.tsx:256-270` |
| F-07 | Exercise library + media | `#/exercises` | `exerciseProductionMedia.ts` | **PARTIAL** | images 144/181, video 159/181 + 22 NEEDS_REVIEW; gaps show an honest empty state |
| F-08 | Auth · trial · Premium | `#/login`, `PremiumGate` | server RPCs; client `access/guard.ts` | **PARTIAL** | RPCs exist, migrations unapplied (DEC-103) |
| F-09 | Admin dashboard | `#/admin` **is wired** (`App.tsx:559-560`) | `adminRole.ts` + SQL `require_founder()` | **PARTIAL** | no in-app link; drill-down unreachable (F-GAP-09); no account carries the role yet |
| F-10 | Progress / health | `#/progress`, `#/measurements`, `#/steps`, `#/recovery`, `#/calc` | `progressV2Model.ts` | **LIVE** | — |
| F-11 | AI Coach | none | `src/lib/coach/` | **DEAD** | zero importers anywhere (F-GAP-11) |
| F-12 | Cloud sync | Settings shows status only | `syncQueue.syncAllowedFor` | **DISCONNECTED** | flag off **and** the consent UI is never mounted (F-GAP-12) |
| F-13 | Data export / delete account | Settings + Profile | `src/lib/portability` | **LIVE** | a dead parallel module exists (`src/lib/dataPortability.ts`, 0 call sites) |
| F-14 | Adaptive personalization engine | none | `src/lib/personalization/*` | **DISCONNECTED** | 2,564 lines; only `experience.ts` + `types.ts` are imported by product code (F-GAP-14) |
| F-15 | "My stats" | `#/stats` route exists and passes the guard | `statsSummary.ts` | **PARTIAL** | no `navigate('stats')` anywhere — reachable only by typing the hash |

---

## Onboarding — every question, and who consumes it

All 20 ids in `ONBOARDING_QUESTION_IDS` (`onboardingV2Flow.ts:329-338`) render, and every field
enters `toAnswersFromV2` (`OnboardingV2.tsx:341-349`). Consumers verified:

`profile.display_name` → `todayV2Model.ts:151` (greeting) · `body.age`/`sex`/`height`/`weight` →
`calculators.ts:355` (BMR + minor gate) · `intent.primary` → `planGenerator.ts:924` ·
`experience.declared` + `history.*` → `planGenerator.ts:70` · `goal.primary` → `planGenerator.ts:1066` ·
`training.days`/`duration` → `planGenerator.ts:646,653` · `training.place` → `equipmentAccess.resolveGymAccess` ·
`equipment.available` → `equipmentAccess.declaredEquipment` · `activity.neat` → TDEE (`onboardingProfile.ts:318`) ·
`nutrition.diet_pattern` → `planGenerator.ts:951` (only for `intent === 'meals'` — **DEC-008**) ·
`limitations.*` → `injurySafety`.

**Two questions asked with no effect — VERIFIED:**

- **`healthDataConsent`** — collected and stored to `consents.healthData`
  (`planBuilderAnswers.ts:146-150`) and then **deliberately not read**
  (`onboardingProfile.ts:135-138`). The only reader of health consent is
  `syncQueue.ts:204` via `hasSensitiveHealthConsent`, which reads a **different** store
  (`syncConsent.ts:90`) — one the user cannot reach (F-GAP-12). So the app asks for consent
  to sensitive health data and that answer gates nothing. → **F-GAP-01**
- **`muscleFocus`** is hard-pinned to `'balanced'` (`onboardingProfile.ts:359`); no question
  feeds `applyMuscleFocus` (`planGenerator.ts:1084`). Already surfaced honestly to the user
  by the plan-rationale "inactive axis" mechanism (`planRationale.ts:159-165`) — so this is
  disclosed, not hidden. **NOT_A_BUG for V1.**

> **The guard's own blind spot:** `test:onboarding-questions` asserts UI binding, copy
> presence and validation (`scripts/onboarding-questions-proof.ts:78-152`) — it does **not**
> assert downstream consumption. Both gaps above pass the gate today. Closing that is `QIM-V1-003`.

---

## The named gaps

**F-GAP-01 — health consent is collected and ignored.** `onboardingProfile.ts:135-138`. Consent
theatre is worse than no question. **BLOCKS_V1** → `QIM-V1-003`.

**F-GAP-02 — two target-weight authorities. ✅ CLOSED (`QIM-V1-002`).**
`planDerive.ts:27-28` (`cutting ×0.92`, `bulking ×1.05`) drove the **delivery screen** the user reads
(`OnboardingV2.tsx:1385,1449`) and the stored profile (`onboardingProfile.ts:316`), while
`onboardingV2Adapter.ts:101-103` (`cut ×0.9`, `bulk ×1.1`) drove the **plan the engine builds** —
an 80 kg cutter was shown 74 kg and given a plan built for 72 kg.
The adapter now calls the single authority. Locked by `test:target-weight-authority` (in the gate):
a 3×9 matrix asserting adapter == authority == stored profile, a direction check (cut falls, bulk
rises, maintain holds), **and a structural check that the adapter contains no weight multiplier of
its own** — so a second derivation that happens to agree today still fails the gate. Red reproduced
for real: restoring the old constants failed 4 named checks with concrete numbers (`cut/70: 63 vs 64`).

**F-GAP-05 — the food long tail is declared but not served.** `public/food/manifest.json` declares
`shard_count: 41` / 59,941 records; `public/food/shards/` **does not exist**
(`ls: No such file or directory`). Worse, `scripts/run-food-longtail-proof.mjs:64-71` is written to
pass on *all-absent* as well as *all-present* — a §4.2 weak gate: **green does not mean shipped**.
Curated + hot-set + barcode + user foods all work, so search is not broken; the tail is simply absent.
→ `QIM-V1-011` (POST_LAUNCH, DEC-102) + tighten the proof.

**F-GAP-09 — the admin drill-down is unreachable.** `AdminShell.tsx:36,273` renders `UserDetailPanel`,
but `AdminRoute.tsx:92` never passes the `detail` prop. Also: no in-app link to `#/admin` exists.
**POST_LAUNCH** (admin is out of V1 scope, `02-SCOPE.md`).

**F-GAP-11 — AI Coach is dead code.** `src/lib/coach/` (746 lines) has **zero** importers across
`src/`, `scripts/` and `e2e/`. No producer of `CoachAnswer` exists — only two validators. There is
no runner and no gate entry, so the "16-check attribution guard" recorded in the previous
`STATE.md §3` **does not execute**. (`src/lib/coaching/` is a *different*, live module — static cues.)
**Not a V1 problem**; recorded so nobody counts it as shipped. → kill-list, `QIM-V1-015`.

**F-GAP-12 — sync cannot be enabled by any user.** Two independent blocks: `VITE_SYNC_ENABLED`
defaults empty and only the literal `'true'` enables it (`syncQueue.ts:11`); **and** the only writer
of sync consent is `SyncConsentGate.tsx:5`, which is **never mounted** — grep across `src/**/*.tsx`
finds only its own definition. So even with the flag flipped, `hasCloudSyncConsent` can never become
true and `syncAllowedFor` returns false for everyone. Sync being off is *intended* for V1 (DEC-007);
**the site claiming it is available is not** → `CLM-005` / `QIM-V1-010`.

**F-GAP-14 — the adaptive personalization engine reaches nobody.** `src/lib/personalization/`
(2,564 lines: `engine`, `session`, `rules`, `bank/`, `exerciseSelection`, `contradictions`,
`migration`, `persistence`, `analytics`) has **exactly one importer each: its own proof script**
(`scripts/personalization-proof.ts:11,23,25-30`). Only `experience.ts` and `types.ts` are used by
product code, as a classification shim. `test:personalization` is green and proves nothing a user
can feel. **POST_LAUNCH** — kill-list decision `QIM-V1-015`.

---

## KILL LIST — duplicate implementations of the same behaviour

Two view generations coexist. Five V1 names are 13–22-line pass-throughs to their V2
implementation (`DashboardView`, `ProgressView`, `ProfileView`, `StartView`, `SetupView` → live).
**But two are the opposite:** `NutritionView.tsx` (539 lines) and `WorkoutView.tsx` (657 lines) are
the *real* implementations, and their V2 twins are orphans.

| surface | verdict | evidence |
|---|---|---|
| `src/views/WorkoutV2.tsx` (~1,100 lines) | **ARCHIVE** — orphan | zero product importers; only `scripts/momentum-shot/`, `scripts/workout-v2-shot/` harnesses |
| `src/views/NutritionV2.tsx` | **ARCHIVE** — orphan | same; `NutritionView.tsx:55` even documents the consequence: "the only listener was in `NutritionV2`, **unmounted**" |
| `src/views/PlanPreviewView.tsx` | **ARCHIVE** — orphan | only `scripts/e-plan-preview-host-proof.ts:11` |
| `src/lib/dataPortability.ts` | **DELETE LATER** | 0 call sites; live path is `src/lib/portability` |
| `src/lib/personalization/*` (minus `experience`,`types`) | **REFERENCE** | proof-script-only (F-GAP-14) |
| `src/lib/coach/*` | **REFERENCE** | zero importers (F-GAP-11) |

> **⚠ This changes a severity, so it is stated explicitly.** A raw unchecked storage write at
> `WorkoutV2.tsx:299` reads like a P1 live-session data-loss bug. It is **not user-facing** — that
> file is an orphan. The live session path (`WorkoutView` → `finishWorkout`) *is* honest. This is
> exactly why "two implementations of the same behaviour" is unacceptable: it makes every
> future audit ambiguous.
>
> **⚠ And it makes a charter clause stale:** `CLAUDE.md §11` requires "the save-honesty chain in
> `WorkoutV2` must not be touched". The chain that matters now lives in `WorkoutView`.
> → `QIM-V1-015`.

**Ownership decision now, deletion later:** nothing is deleted in V1. Each orphan gets an
`ARCHIVE` stamp and a header line naming its live owner, so no future session mistakes it for
the product. Physical deletion is one clustered PR post-launch, after a `grep` for dynamic
references (charter §11 clause 9).

---

## Storage contract — the part that is a real risk

`src/lib/userDataKeys.ts:38-160` is the declared registry (~60 keys). Two problems:

1. **~15 keys are written at runtime but absent from the registry** (`easySession`, `firstWin`,
   `notifyAsk`, `weekSummary`, `entry:pending-trial`, `dataOwner`, `quarantine`, `syncConsent`, …).
   The prefix sweep in `wipeUserData()` (`accountScope.ts:58-79`) still deletes them, so no data
   leaks across accounts — but `unscopedUserKeys()`-driven quarantine cannot see them.
2. **Live-path writes that bypass the checked `safeStorage` wrapper** — charter §5. After removing
   the orphan-file noise, the ones that matter:

| site | key | why it matters |
|---|---|---|
| `src/lib/recovery.ts:108` | `recovery-log:v1` | returns the entry to the UI regardless (`:112`) → the screen shows a check-in that never hit disk |
| `src/lib/recoveryEngine.ts:376` | `recovery-log:v2` | synced store; a dropped write is never retried |
| `src/lib/health/store.ts:45` · `connect.ts:126` | health samples + consent state | a lost anchor makes re-import ambiguous |
| `src/lib/dataOwnership.ts:40` | ownership + migration stamps | **can throw** — no try/catch at all |
| `src/lib/portability/registry.ts:275` · `importer.ts:186` | every import target | **can throw**; restore reports success from `load()`, not from the write |
| `src/lib/workoutFinishUndo.ts:48` | snapshot restore | **the rollback path of the honesty chain is itself unguarded** |
| `src/lib/accountScope.ts:90` | `lastUser:v1` | if this write fails, an account switch is not detected → the previous user's data is not wiped (**privacy**) |

→ `QIM-V1-016` (P1 subset) and `QIM-V1-017` (registry completeness).
