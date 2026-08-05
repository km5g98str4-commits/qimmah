# PlanEngine v1 characterization contract

This is a characterization record of the observable `generatePlan()` contract. It is not a product-policy specification and does not authorize a behavior change.

## Evidence identity

| Item | Value |
| --- | --- |
| Repository | `km5g98str4-commits/qimmah` |
| Execution branch at audit | `codex/qimmah-execution` |
| Execution HEAD at audit start | `17e6c442ce8e10c4e0d07d4cef7f9ba566ef647a` |
| Official source baseline | `origin/main@dd79a60f193b1163ab1ec549a35458e0d2aab1de` |
| Fixture source commit | `dd79a60f193b1163ab1ec549a35458e0d2aab1de` |
| Fixture schema | `qimmah-plan-engine-golden/v1` |

Evidence: `src/lib/planGenerator.ts:38-49,1110-1169`, `src/types/profile.ts:3-96,99-118`, `scripts/run-plan-golden-proof.mjs:14-15,138-157,181-192,256-346,349-507`, and `tests/fixtures/plan-engine/v1/manifest.json`.

## Boundary

The observed boundary is:

```text
Profile input -> generatePlan(profile) -> GeneratedPlan output
```

`generatePlan()` first derives an effective structured goal from `goalType` and age, then computes targets, workout plan, weekly schedule, nutrition plan, commitments, measurements, Arabic explanation and label, and Arabic warnings. It must not be treated as a promise about uncharacterized input. The golden runner refuses to validate if the current core source differs from the official baseline in `planGenerator.ts`, `calculators.ts`, `equipmentAccess.ts`, or `types/profile.ts`.

## Input contract observed by v1 fixtures

`Profile` has these required fields: `name`, `gender`, `age`, `heightCm`, `weightKg`, `targetWeightKg`, `activityLevel`, `trainingLevel`, `goal`, `goalType`, `trainingDays`, `workoutDuration`, `workoutEnvironment`, `injuries`, `healthNotes`, `trackNutrition`, `mealsPerDay`, `nutritionStyle`, and `dislikedFoods`.

The type also declares optional Plan Builder and nutrition-context fields: `nutritionDisplayStyle`, `mealDistribution`, `appetiteTiming`, `dietPattern`, `muscleFocus`, `consistency`, `splitMode`, `splitChoice`, `experienceBand`, `experienceLevel`, `gymAccess`, `gymType`, `equipment`, `schedulingStyle`, `preferredDays`, and `remindersOptIn`.

All 12 v1 cases intentionally provide all 35 of those observed input keys. This is stricter than TypeScript's optional-property surface: no fixture depends on runtime `defaultProfile` values or an omitted-field default.

The structured goal values are `cutting`, `bulking`, `maintenance`, `returning`, `health`, and `recomposition`; the legacy calorie direction is separately represented as `cut`, `maintain`, or `bulk`. The known conflict case confirms that `goalType` is the structured source of truth for this version.

## Output contract observed by v1 fixtures

Every expected v1 output has these root keys:

```text
targets
suggestedWorkoutTemplateId
weeklySchedule
workoutPlan
nutritionPlan
commitmentPlan
measurementPlan
explanationAr
planLabelAr
warningsAr
```

`targets` contains BMI, BMR, TDEE, maintenance/cutting/bulking/target calories, macro grams, water, projected weekly weight change and weeks, a suggested split label, and notes. `workoutPlan` contains `templateId` and ordered days; `nutritionPlan` contains enablement, ordered meals, meal count/style, and target calories/macros/water; `commitmentPlan` contains enablement and ordered items; and `measurementPlan` contains enablement and selected type IDs.

The strict expected output is the exact canonical content of each corresponding case file, not a subset comparison. Array order is semantic for schedules, plan days, exercises, meals, and commitments.

## Difference classes

The golden runner classifies the first strict difference with explicit normalized-path matching (`scripts/run-plan-golden-proof.mjs:267-333`). These are comparison classes, not permission to disregard a difference.

| Class | Exact paths |
| --- | --- |
| `safetyCopy` | `warningsAr`, `warningsEn`, `targets.notes`, `workoutPlan.days.exercises.notes`, `nutritionPlan.meals.notes`, `commitmentPlan.items.notes` |
| `localizedCopy` | `explanationAr`, `explanationEn`, `planLabelAr`, `planLabelEn`, `targets.bmiLabel`, `targets.suggestedTrainingSplit`, schedule day/title fields, workout day names, exercise custom names, nutrition meal names, and commitment custom names |
| `coreLogic` | Every other differing path, including `targets.targetCalories`, numerical targets, selected templates, ordered exercise content, optional-field presence, and structural output fields |

The classifier regression proof explicitly protects `$.targets.targetCalories -> coreLogic`, `$.warningsAr` and `$.warningsEn -> safetyCopy`, and `$.planLabelAr -> localizedCopy`. Mutation proof requires both detection and the expected classification for calories, exercise ordering, warning text, and an optional exercise field.

## Derived invariants

The runner separately enforces these derived invariants for every fixture (`scripts/run-plan-golden-proof.mjs:341-346`):

1. `weeklySchedule` has exactly seven rows.
2. For an input age below 18, `weeklyWeightChangeKg` and `estimatedWeeksToGoal` are both zero.
3. `workoutPlan.days.length` is within 1 through 7 inclusive.

An invariant failure is reported as `derivedInvariants`, rather than being reclassified as copy or core output drift.

## Canonical JSON and hash semantics

Canonicalization recursively sorts object keys, preserves array order, rejects `NaN` and both infinities, normalizes `-0` to `0`, serializes JSON, and appends one final newline. SHA-256 is computed over that canonical UTF-8 JSON string.

Each `.cases[]` entry in `tests/fixtures/plan-engine/v1/manifest.json` records:

- `inputSha256`: canonical fixture input only.
- `expectedSha256`: canonical `generatePlan()` output only.
- `canonicalFixtureSha256`: full canonical case payload: schema version, fixture ID, source commit, description, classification, input, expected output, and known-characterization notes.

`--check` is the default and performs a strict manifest/hash and expected-output comparison. Writing is rejected unless the command has both `--update` and `--confirm-write`; no update mode is used by this characterization work.

## Reproducibility boundary

The recorded manifest environment is `TZ=unset`, `LANG=C.UTF-8`, `LC_ALL=C.UTF-8`, locale `en-US`, time zone `Asia/Riyadh`, Node `v25.9.0`, npm `11.12.1`, and package-lock SHA-256 `f057fe1db234e9fe95251f47ec74addf295275e0d2d86eb0e58f0e6d9f1f8216`.

For each case, the runner compares canonical output across two frozen times (`0` and `4102444800000`) and two process environments (`UTC`/`C` and `Asia/Riyadh`/`ar_SA.UTF-8`). It also runs each case twice and requires byte-identical output. A nondeterminism failure stops the proof; it cannot update the fixtures.

## Approved v1 fixture set

The approved set is exactly the 12 manifest cases below. The manifest is the authoritative record of their three SHA-256 values; `known-characterizations.md` records the captured boundary and legacy behavior.

| Fixture ID | Manifest classification | Characterized dimension |
| --- | --- | --- |
| `adult-beginner-cutting` | `normal` | Adult beginner cutting |
| `adult-advanced-bulking` | `normal` | Adult advanced bulking |
| `adult-intermediate-maintain` | `normal` | Adult intermediate maintenance with small-gym access |
| `adult-beginner-health-home` | `normal` | Adult beginner health goal at home |
| `adult-advanced-recomp-bodyweight` | `normal` | Adult advanced recomposition with bodyweight access |
| `minor-17-cutting` | `normal` | Minor cutting request and safety restriction |
| `minor-17-bulking` | `normal` | Minor bulking request and safety restriction |
| `adult-boundary-age-18` | `boundaryCharacterization` | Exactly age 18 |
| `equipment-access-precedence` | `normal` | Conflicting access authorities |
| `advanced-ppl-valid` | `normal` | Valid six-day advanced PPL |
| `advanced-ppl-invalid-fallback` | `boundaryCharacterization` | Insufficient-day PPL fallback |
| `legacy-goal-conflict` | `legacyInvalidInput` | Legacy `goal` conflicting with structured `goalType` |

No contract entry above proposes a fix, changes a fixture, or declares an observed anomaly to be a valid product requirement.
