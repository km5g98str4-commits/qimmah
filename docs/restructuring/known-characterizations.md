# PlanEngine v1 known characterizations

This record preserves observed behavior in the approved PlanEngine Golden Fixtures v1 set. It is evidence for later review, not a backlog authorization or a product-policy decision.

## Evidence identity

| Item | Value |
| --- | --- |
| Repository | `km5g98str4-commits/qimmah` |
| Execution branch at audit | `codex/qimmah-execution` |
| Execution HEAD at audit start | `17e6c442ce8e10c4e0d07d4cef7f9ba566ef647a` |
| Official baseline / fixture source | `origin/main@dd79a60f193b1163ab1ec549a35458e0d2aab1de` |
| Fixture schema | `qimmah-plan-engine-golden/v1` |
| Fixture source of record | `tests/fixtures/plan-engine/v1/manifest.json` under `.cases` |

Evidence: `scripts/run-plan-golden-proof.mjs:55-132,349-369,454-507` and the named JSON files under `tests/fixtures/plan-engine/v1/cases/`.

## Approved cases and captured behavior

| Case | Classification | What it captures | Status of observation |
| --- | --- | --- | --- |
| `adult-beginner-cutting` | `normal` | Adult, beginner, cutting, three training days, full gym. | Baseline coverage. |
| `adult-advanced-bulking` | `normal` | Adult, advanced, bulking, six training days, full gym. | Baseline coverage. |
| `adult-intermediate-maintain` | `normal` | Adult, intermediate, maintenance, limited small-gym equipment. | Baseline coverage. |
| `adult-beginner-health-home` | `normal` | Adult beginner health goal at home. | Baseline coverage. |
| `adult-advanced-recomp-bodyweight` | `normal` | Adult advanced recomposition with bodyweight-only access. | Baseline coverage. |
| `minor-17-cutting` | `normal` | A 17-year-old requesting cutting. The fixture records the existing minor-goal restriction. | Captured safety behavior; not a new policy. |
| `minor-17-bulking` | `normal` | A 17-year-old requesting bulking. The fixture records the existing minor-goal restriction. | Captured safety behavior; not a new policy. |
| `adult-boundary-age-18` | `boundaryCharacterization` | At age 18, cutting generates non-zero projected weight-change fields. | Boundary observation, not an independent policy decision. |
| `equipment-access-precedence` | `normal` | Input conflicts: `gymAccess=home`, `gymType=commercial`, and `workoutEnvironment=gym`; output characterizes `gymAccess` as the access authority. | Existing precedence behavior. |
| `advanced-ppl-valid` | `normal` | Advanced, six-day, explicitly selected push/pull/legs generates `gen-adv-ppl`. | Baseline coverage. |
| `advanced-ppl-invalid-fallback` | `boundaryCharacterization` | Advanced PPL requested with two days falls back to `gen-fullbody`. | Explicitly captured current fallback; not a product correction. |
| `legacy-goal-conflict` | `legacyInvalidInput` | Legacy calorie direction `goal=bulk` conflicts with `goalType=cutting`; output follows structured `goalType`. | Intentionally invalid legacy-shaped input; not a valid product requirement. |

## Captured anomalies and boundary behavior

### Minor restricted goals

For both age-17 cases, the output contains the existing Arabic minor-goal warning, and the projected weekly weight change and estimated weeks are both zero. The fixture notes explicitly say the behavior is captured and does not define new policy. Any future adjustment to minor safety, warning wording, or eligibility must receive its own reviewed work package.

### Age 18 boundary

At exactly age 18, the cutting fixture produces `weeklyWeightChangeKg=-0.4` and `estimatedWeeksToGoal=17`. This fixture marks the observed eligibility boundary. It does not determine whether that boundary is medically, legally, or product-wise correct.

### Conflicting equipment authorities

The equipment-precedence case intentionally conflicts three fields. Its current output is recorded as evidence that `gymAccess` governs access filtering in this fixture. This is a compatibility characterization, not permission to change route, form, validation, or import behavior.

### Invalid advanced PPL request

With `splitMode=advanced`, `splitChoice=push_pull_legs`, and only two training days, the engine currently emits `gen-fullbody` with two workout days. The case's own note requires treating this as captured fallback behavior rather than silently correcting it.

### Legacy goal conflict

The legacy-invalid case passes `goal=bulk` and `goalType=cutting`. The engine computes its observed plan from the structured `goalType`; `generatePlan()` derives a normalized goal from that value before it computes targets (`src/lib/planGenerator.ts:1110-1121`). The case exists only to protect compatibility analysis for malformed legacy-shaped input.

## Comparison and hash record

The manifest’s `.cases` array contains, for each approved case, the input hash, expected-output hash, and full canonical-fixture hash. Canonicalization sorts object keys, preserves semantic array order, rejects non-finite numbers, normalizes negative zero, and adds one final newline before SHA-256.

The strict proof treats every structural or numerical difference as `coreLogic` unless its exact normalized path is listed as `localizedCopy` or `safetyCopy`. The runner additionally enforces seven schedule rows, zero minor projections, and a one-to-seven workout-day bound as `derivedInvariants`.

The full contract, exact path classifications, and reproducibility checks are in `plan-engine-contract.md`. Neither document updates fixtures, hashes, manifest entries, or PlanEngine behavior.
