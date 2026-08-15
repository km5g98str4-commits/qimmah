# QIM-005 — V2 route, reference, and authority evidence

This is a static and read-only evidence record. It does not authorize a route, wrapper, feature-flag, storage, test, or deletion change.

## Snapshot identity

| Field | Value |
| --- | --- |
| Repository | `km5g98str4-commits/qimmah` |
| Execution branch | `codex/qimmah-execution` |
| Evidence commit | `e4f64cbad310d91ff087d2c6b60438f834a9c8e1` |
| Official source baseline | `origin/main@dd79a60f193b1163ab1ec549a35458e0d2aab1de` |
| Audit date | 2026-08-06 |
| Working tree before documentation | clean (`git status --short` returned no paths) |

## Production route graph

`src/main.tsx:1-75` mounts `App` under the language, auth, and customization providers. `src/App.tsx:14-43` declares the lazy route views and `src/App.tsx:368-503` selects the rendered route.

| Registered route | App-shell target | Wrapper / final render | Evidence |
| --- | --- | --- | --- |
| `dashboard` | `V.DashboardView` | `DashboardView` → `TodayV2` | `src/App.tsx:468-471`; `src/views/DashboardView.tsx:1-14` |
| `workout` | `V.WorkoutView` | `WorkoutView` directly | `src/App.tsx:22,473-476`; `src/views/WorkoutView.tsx:1-49` |
| `nutrition` | `V.NutritionView` | `NutritionView` directly | `src/App.tsx:26,483-486`; `src/views/NutritionView.tsx:1-45` |
| `progress` | `V.ProgressView` | `ProgressView` directly | `src/App.tsx:27,488-491`; `src/views/ProgressView.tsx:1-18` |
| `profile` | `V.ProfileView` | `ProfileView` → `ProfileV2` | `src/App.tsx:29,493-496`; `src/views/ProfileView.tsx:1-12` |
| `start` | `StartView` (direct import) | `StartView` → `StartViewV2` | `src/App.tsx:1-3,372-381`; `src/views/StartView.tsx:1-13` |
| `setup` | `V.SetupView` | onboarding mode → `OnboardingV2`; advanced mode → `CustomizationCenter` | `src/App.tsx:415-419`; `src/views/SetupView.tsx:50-62` |

`src/lib/appRoutes.ts:5-67` registers the hash routes and `src/lib/appRoutes.ts:57-58` defines the main tabs. It contains no V2 route alias. In particular, no `workoutV2`, `nutritionV2`, or `progressV2` route exists.

## Import and feature-gate search

The source scan searched static imports, `import(...)` expressions, route declarations, `isDesignV2`, and `import.meta.env` references.

| Claim | Result | Evidence |
| --- | --- | --- |
| `App` has no static or lazy import of `WorkoutV2`, `NutritionV2`, or `ProgressV2`. | verified | `src/App.tsx:14-43`; route branches at `src/App.tsx:473-491`; exact-reference scan returns only their definitions, models, proof scripts, and non-route harnesses. |
| The `dashboard` and `profile` app-shell chains reach V2 screens through their stable wrapper imports: `DashboardView` → `TodayV2` and `ProfileView` → `ProfileV2`. Other live V2 chains are listed in the route graph. | verified | `src/views/DashboardView.tsx:4,14`; `src/views/ProfileView.tsx:3,12`; `src/views/StartView.tsx:1-13`; `src/views/SetupView.tsx:50-62`. The unrelated `V2_QUICK_LOG` copy import in `src/App.tsx:59` is not a screen selector. |
| `ProgressV2` lazily imports `BodyModel3D` and `NutritionV2` lazily imports `ScanFoodPanel`, but neither V2 screen is a production route target. | verified | `src/views/ProgressV2.tsx:29-30`; `src/views/NutritionV2.tsx:23-25`; route graph above. |
| `isDesignV2` appears only in stale comments, not as an executable selector. | verified | `src/views/WorkoutV2.tsx:148-156`; `src/views/NutritionV2.tsx:70-76`; `src/views/ProfileV2.tsx:42-48`; exact identifier search found no definition or executable use. |
| The only app-shell development gate found is `productReview`; it cannot promote a V2 surface. | verified | `src/App.tsx:38-40,433-440`; `src/views/SettingsView.tsx:228-233`. |

## V2 storage and behavior seams

| Domain / authority | Finding | Evidence |
| --- | --- | --- |
| Workout V2 active state | `WorkoutV2` writes and clears `qimmah:active-workout:v2:<owner>` directly. Its data-layer reader and clearer exist in `workoutSessionEngine`, but no live production route starts this V2 session. The key remains marked exported and owned by `WorkoutV2`. | `src/views/WorkoutV2.tsx:281-288,358-364`; `src/lib/workoutSessionEngine.ts:234-239,305-321`; `src/lib/userDataKeys.ts:72-76`; route graph above. |
| Workout V2 finished sessions | On confirm, `WorkoutV2` uses the shared verified `commitFinishedSession` path and then records PRs; `WorkoutView` uses the same shared commit authority. | `src/views/WorkoutV2.tsx:393-426`; `src/views/WorkoutView.tsx:206-245`; `src/lib/finishWorkout.ts`. |
| Nutrition V2 data | `NutritionV2` writes through `nutritionV2Model`; `NutritionView` is an adapter consumer of the same writer functions. Its v2 store is also read by live `TodayV2` and mirrored to history. It is not a V2-screen-only store. | `src/views/NutritionV2.tsx:93-131,200-218`; `src/lib/nutritionV2Model.ts:13-23,55-62,216-230`; `src/lib/nutritionTracking.ts:1-8,188-234`; `src/views/TodayV2.tsx:12,84-85`. |
| Progress V2 manual measurements | `ProgressV2` validates weight, waist, and body-fat input, then calls `addLog`. `ProgressView` reads the same store but exposes reminder writes, not a manual measurement form. Therefore this is a unique *manual UI write path* in an orphaned screen. | `src/views/ProgressV2.tsx:203-237`; `src/views/ProgressView.tsx:1-18,170-179`; `src/lib/measurementLog.ts:5-23`. |
| Profile V2 portability surface | `ProfileV2` is live through `ProfileView`, and owns a live data screen using the portability parser/apply/undo contract. | `src/App.tsx:493-496`; `src/views/ProfileView.tsx:1-12`; `src/views/ProfileV2.tsx:20-31,48-81,394-530`. |
| V2 active-workout portability coverage | The portability registry includes `activeSession` under `ACTIVE_SESSION_KEY_BASE`, not `qimmah:active-workout:v2`; this conflicts with the V2 key's exported status in `userDataKeys`. | `src/lib/portability/registry.ts:40,149-163`; `src/lib/userDataKeys.ts:72-76`. |

## Proof and harness classification

| Category | Result | Evidence |
| --- | --- | --- |
| Route-aware reachability proof | `run-analytics-proof` computes reachability from the entry, asserts that `WorkoutV2` and `NutritionV2` are excluded, and asserts that live `TodayV2` is included. | `scripts/run-analytics-proof.mjs:70-106`. |
| Explicit orphan acknowledgement | `run-saudi-foods-proof` states that its `NutritionV2` UI assertion is against an orphan with no importer. | `scripts/run-saudi-foods-proof.mjs:166-175,282-284`. |
| Direct V2 proof/harnesses | Some proof and screenshot harnesses mount or source-scan V2 surfaces directly: body-model/progress, saved-meals/allergy/food search, workout-rest/RPE, `momentum-shot`, `workout-v2-shot`, and `insights-shot`. They are not app-route coverage. | `scripts/run-body-model-proof.mjs:37-56`; `scripts/run-saved-meals-proof.mjs:1-8`; `scripts/run-workout-rest-state-proof.mjs:1-20`; `scripts/momentum-shot/harness.tsx:11-15,104-113`; `scripts/workout-v2-shot/harness.tsx:1-52`; `scripts/insights-shot/harness.tsx:1-64`. |
| Misrepresented production test | Not found in the inspected tests. The direct V2 cases name a harness/surface or explicitly acknowledge orphan status; they must not be read as route-level production coverage. | Route graph above; the named scripts. |
| Test risk | The `xss-matrix-e2e` label can be misleading: it deliberately opens the `momentum-shot` nutrition harness rather than `#/nutrition`. Its result is a component-surface XSS check, not production-route evidence. | `scripts/xss-matrix-e2e.mjs:7-12,26-29,118-131`; `scripts/momentum-shot/harness.tsx:104-106`. |

## Read-only GitHub evidence

The read-only command `gh pr list --state open --limit 100 --json number,title,headRefName,baseRefName,headRefOid,url` returned eight open PRs on 2026-08-06: #38, #39, #42–#47. Their heads are the historical `e/*` branches and all target `design/v21-promotion` or another `e/*` branch. None is this execution branch and none changes the route owner in this snapshot.

| PR | Head → base | Head commit |
| --- | --- | --- |
| #38 | `e/personalization-guardrail` → `design/v21-promotion` | `87590f0ac19a610605e8fc9e11f01b35e2472d49` |
| #39 | `e/settings-clarity` → `design/v21-promotion` | `c5d977fe8df4e6ba96aacbf13bff02ba601d3864` |
| #42 | `e/plan-rationale` → `e/personalization-guardrail` | `3998506e0f39c89c29190dba2cf313993a5271f1` |
| #43 | `e/plan-preview` → `e/plan-rationale` | `e5546377f0f4c290adea66a376648431752c48f1` |
| #44 | `e/plan-why` → `e/plan-preview` | `c304227e986814bcd95756a9a8c632fb2b34536e` |
| #45 | `e/plan-honest-axes` → `e/plan-why` | `6f0d33fe86b3a3aef58c63be4cd56a52bf523a63` |
| #46 | `e/personalization-guardrail-r2` → `design/v21-promotion` | `dbc6bcdcdb174af7f9daa2ad9ecef42ab89cbc63` |
| #47 | `e/settings-clarity-r2` → `design/v21-promotion` | `9d3cf0a750e891621f52e849fab90c712fb016ae` |

No branch, PR, remote, or worktree was changed by this audit.
