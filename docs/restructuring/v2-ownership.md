# QIM-005 — V2 ownership and wrapper resolution

This is the final evidence-backed ownership decision for the execution snapshot below. It is documentation only: it does not authorize a route, wrapper, flag, source, storage, test, or deletion change. Any implementation following this decision requires its own REVIEW work package.

## Decision identity and terms

- Repository: `km5g98str4-commits/qimmah`
- Execution branch: `codex/qimmah-execution`
- Evidence commit: `e4f64cbad310d91ff087d2c6b60438f834a9c8e1`
- Official source baseline: `origin/main@dd79a60f193b1163ab1ec549a35458e0d2aab1de`
- Detailed source, proof, and GitHub evidence: [`QIM-005-v2-reference-scan.md`](evidence/QIM-005-v2-reference-scan.md)

Classification meanings:

- **live canonical** — rendered by the current production route chain.
- **live wrapper** — the route target that delegates to the canonical implementation.
- **orphaned but useful reference** — not reached through `main.tsx` → `App.tsx` → route, but retains observed behavior, design, data, or proof value.
- **development-only** — intentionally unavailable in production.
- **superseded** — a live route has replaced the surface for current production ownership.
- **unknown** — neither route ownership nor safe disposition is established.

## Production-chain decision

| Domain | Real chain | Classification | Current owner | Future SwiftUI reference source* |
| --- | --- | --- | --- |
| Today | `main.tsx` → `App` → `#/dashboard` → `DashboardView` → `TodayV2` | `DashboardView`: live wrapper; `TodayV2`: live canonical | `TodayV2`, through the stable route adapter | `TodayV2` and `todayV2Model` |
| Workout | `main.tsx` → `App` → `#/workout` → `WorkoutView` | `WorkoutView`: live canonical; `WorkoutV2`: orphaned but useful reference | `WorkoutView` | `WorkoutView` / `WorkoutMode` for live behavior; `WorkoutV2` and its data seams only as reference subject to the blockers below |
| Nutrition | `main.tsx` → `App` → `#/nutrition` → `NutritionView` | `NutritionView`: live canonical; `NutritionV2`: orphaned but useful reference | `NutritionView` | `NutritionView` for the live user journey plus shared `nutritionV2Model` / history seams; `NutritionV2` is a non-canonical UI reference |
| Progress | `main.tsx` → `App` → `#/progress` → `ProgressView` | `ProgressView`: live canonical; `ProgressV2`: orphaned but useful reference | `ProgressView`, with a deletion blocker in `ProgressV2` | `ProgressView` for live route behavior and `ProgressV2` for the only observed manual-measurement UI behavior |
| Profile | `main.tsx` → `App` → `#/profile` → `ProfileView` → `ProfileV2` | `ProfileView`: live wrapper; `ProfileV2`: live canonical | `ProfileV2`, through the stable route adapter | `ProfileV2` and `profileV2Model` |
| Start | `main.tsx` → `App` → `#/start` → `StartView` → `StartViewV2` | `StartView`: live wrapper; `StartViewV2`: live canonical | `StartViewV2` | `StartViewV2` |
| Setup | `main.tsx` → `App` → `#/setup` → `SetupView` → `OnboardingV2` or `CustomizationCenter` | live wrapper / conditional owner | `SetupView` mode branch | `OnboardingV2` for first-run flow; `CustomizationCenter` for advanced editing |

\* A SwiftUI reference source is evidence to study in a future approved migration. It is not authorization to copy code, promote a V2 surface, or start SwiftUI work.

Evidence for all chains: `src/main.tsx:1-75`; `src/App.tsx:14-43,368-503`; `src/lib/appRoutes.ts:5-67`; the wrapper files listed in the evidence record.

## Domain ownership and preservation gates

| Domain | Useful behavior/design to preserve as evidence | Files not to promote as an owner | Safe deletion prerequisites | Risk of deletion too early |
| --- | --- | --- | --- | --- |
| Workout | V2's explicit finish confirmation, verified persistence and undo composition, recovery/rest state, substitutions, one-hand reach, and hydration presentation are useful reference behaviors. Its shared finished-session contract is already also called by the live route. | Do not promote `src/views/WorkoutV2.tsx` as a route owner, `src/lib/workoutV2Model.ts`, or the V2 active-state key solely because their names say V2. The current live owner is `WorkoutView`. | An approved parity inventory must account for V2 active-session data, all direct V2 harness/proof dependencies, state recovery, and deletion/migration treatment for `qimmah:active-workout:v2:<owner>`. A route-level proof of the selected canonical behavior is required. | The active V2 session key is written by the orphaned screen and is marked exported in `userDataKeys`; deleting without a data disposition can strand existing state or invalidate proofs. |
| Nutrition | Goal-aware daily totals, food search/addition, meal-history copying, barcode lazy-load reference, allergy notice, and water controls. The actual nutrition store is shared with live consumers. | Do not promote `src/views/NutritionV2.tsx` as the route owner, and do not treat the stale `isDesignV2` comment as a selector. | Prove user-journey parity for logging, water, meal history, allergy copy, and barcode reachability; retire or replace direct V2 source/harness assertions; demonstrate the shared `nutritionV2Model` / history-store contract remains intact. | Direct tests and screenshot harnesses would lose their target; semantic parity could be assumed from a shared store while UI behavior diverges. |
| Progress | V2's validated manual measurement form, weight/body detail flow, strength detail, insights, and BodyModel3D lazy-load are useful references. | Do not promote `src/views/ProgressV2.tsx` or its internal `WeightLogScreen` without a separate route/product decision. | Resolve the sole observed manual measurement UI writer, then prove data entry, validation, readback, and relevant direct proof coverage under the chosen owner. Account for the BodyModel3D proof/harness users. | `ProgressV2` is the only observed manual UI to call `measurementLog.addLog`; deleting it first removes manual measurement entry even though live views can still read the stored data. |
| Today | Command-center layout, quick-log handoff, achievement and nutrition model consumption, and current live data presentation. | Do not replace `DashboardView` with a new route name; it is the compatibility wrapper. | Only a future approved migration needs parity evidence; there is no current deletion candidate in this chain. | Removing the wrapper first breaks the current route even though `TodayV2` remains present. |
| Profile | Training profile, account/privacy navigation, and the live portability data screen using parse → preview → apply → readback/rollback/undo. | Do not promote a second data-management surface or bypass `ProfileView`; do not confuse the in-file stale comment with a feature selector. | Any removal requires route-adapter parity and a privacy-sensitive portability review; this task does not decide one. | Removing either adapter or canonical screen removes the live profile route and can sever the hardened import/export UI. |

## Wrappers, aliases, flags, and proof scripts

| Item | Decision | Evidence |
| --- | --- | --- |
| `DashboardView` | Keep classified as a live wrapper; its sole target is live canonical `TodayV2`. | `src/views/DashboardView.tsx:4-14`; `src/App.tsx:468-471`. |
| `ProfileView` | Keep classified as a live wrapper; its sole target is live canonical `ProfileV2`. | `src/views/ProfileView.tsx:3-12`; `src/App.tsx:493-496`. |
| `StartView` | Live wrapper for `StartViewV2`, outside the requested three domain routes but relevant to the wrapper resolution. | `src/views/StartView.tsx:1-13`; `src/App.tsx:372-381`. |
| `SetupView` | Live conditional wrapper: first-run reaches `OnboardingV2`, advanced mode reaches `CustomizationCenter`. | `src/views/SetupView.tsx:50-62`; `src/App.tsx:415-419`. |
| V2 route aliases | None found. Route registration contains only stable names and no V2 aliases. | `src/lib/appRoutes.ts:5-67`. |
| V2 promotion feature flag | None found. `isDesignV2` is stale prose only; the app-shell DEV gate only governs `productReview`. | `src/App.tsx:38-40,433-440`; `src/views/WorkoutV2.tsx:148-156`; `src/views/NutritionV2.tsx:70-76`; `src/views/ProfileV2.tsx:42-48`. |
| Proof scripts | Direct V2 proofs/harnesses are reference coverage, not route-level production coverage. `run-analytics-proof` actively distinguishes the two known orphan views from reachable `TodayV2`; `run-saudi-foods-proof` names its Nutrition V2 check as orphaned. | `scripts/run-analytics-proof.mjs:70-106`; `scripts/run-saudi-foods-proof.mjs:166-175,282-284`; detailed list in evidence record. |
| Development-only surface | `productReview` is DEV-only and resolves to not-found in production. It has no bearing on V2 ownership. | `src/App.tsx:38-40,433-440`. |

## Required explicit verification results

| Check | Result | Evidence-backed conclusion |
| --- | --- | --- |
| No hidden dynamic import promotes orphaned `WorkoutV2`, `NutritionV2`, or `ProgressV2`. | **verified** | `App` lazily imports `WorkoutView`, `NutritionView`, and `ProgressView`, not the V2 files. The only dynamic imports inside V2 surfaces are descendants that run only after that surface is mounted. |
| No feature flag promotes an orphaned V2 screen. | **verified** | No executable `isDesignV2` selector exists. The only app-shell DEV gate is the unrelated internal product-review panel. |
| No test relies on an orphaned screen as though it were a production route. | **verified with warning** | Inspected direct-V2 tests use named harnesses/source assertions or explicitly state orphan status; none uses `App`'s route graph to claim coverage. `xss-matrix-e2e` is a component-harness test despite its E2E name and must not be treated as `#/nutrition` coverage. |
| No storage authority unique to an orphaned V2 screen would be lost. | **failed** | `ProgressV2` is the only observed manual UI calling `measurementLog.addLog`; `WorkoutV2` directly writes the V2 active-session key. No deletion or promotion is safe until their data/behavior disposition is reviewed in a separate REVIEW package. |

## Unresolved items and boundaries

1. The intended disposition of `qimmah:active-workout:v2:<owner>` is unresolved. Its exported declaration conflicts with the currently inspected portability registry, which registers a different `activeSession` key. This is a deletion and portability risk, not authorization to edit either registry.
2. The product owner for manual measurement entry is unresolved: `ProgressView` is the live route owner, while `ProgressV2` is the only observed manual UI writer. This requires an explicit REVIEW work package before any screen is removed, promoted, or altered.
3. Direct V2 proof and screenshot harnesses are not product-route coverage. Their retention, replacement, or reclassification must be decided separately; this document changes none.
4. The eight open GitHub PRs discovered by read-only query target historical `design/v21-promotion` or `e/*` branches. They do not alter this execution-branch decision and were not modified.

No route, wrapper, feature flag, V1/V2 source, test, package file, PlanEngine, importer, auth/sync/Supabase file, branch, worktree, remote, or PR was changed by QIM-005.
