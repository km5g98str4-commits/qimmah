# QAE Training Foundation — Capability + Exercise Metadata ([CTO-QAE-007] Wave 1)

**Scope: candidate-exercise foundation only.** No program generation, sets/reps, progression,
volume, splits, deloads, cardio — those are later waves.

## 1. Architecture

```
AthleteProfile ──▶ TrainingCapabilityProfile ──▶ ┐
                                                  ├─▶ Eligibility/Ranking ──▶ CandidateExercises
MovementRequirements ───────────────────────────▶ ┤       (selection.ts)
ExerciseMetadataCatalog ────────────────────────▶ ┘
```

| Piece | Where | Contract |
|---|---|---|
| TrainingCapabilityProfile | `Domain/Training/capability.ts` | `Contracts/training/training-capability.schema.json` |
| MovementRequirements | `Domain/Training/requirements.ts` (characterized legacy DAY_SLOTS) | — |
| ExerciseMetadataCatalog | `Contracts/exercises/exercise-catalog.qae.json` (181 exercises) + `Domain/Catalog/model.ts` | `Contracts/exercises/exercise-metadata.schema.json` |
| Eligibility/Ranking | `Domain/Training/selection.ts` | deviations: `Contracts/training/approved-deviations.json` |
| Blocklist migration | `Contracts/exercises/blocklist-migration.json` | proof asserts legacy ⊆ new |

**Hard separation holds:** `Domain/Training` and `Domain/Catalog` read AthleteProfile /
catalog metadata only — zero question ids (proved by scan). `deriveTrainingCapabilityProfile`
refuses an incomplete profile by name (`QAE-TRAINING-INCOMPLETE-PROFILE`).

## 2. Legacy oracle (characterized, byte-identical goldens)

`Tools/run-training-oracle.mjs` captures both legacy selection surfaces at exported
boundaries into `Fixtures/golden/training/` (17 scenarios: experience × equipment ×
restrictions × days × duration):

- **Shipping path** — `generatePlan(Profile)`: final per-day exercise ids in slot order.
- **Candidate path** — `deriveProfile(answers) → selectExercises`: ranked candidates with
  score parts, exclusions with named reasons, substitutions.

Verify mode is the default (byte-identical or exit 1); `QAE_UPDATE_TRAINING_GOLDENS=1`
regenerates. Internal non-exported filters (`INJURY_RISKY_IDS`, `cableOk`, `levelOk`) are
characterized by guarded source extraction in `Tools/extract-legacy-catalog.ts` — a
shipping-side list edit fails the count guard by name, never drifts silently.

## 3. Selection order (QAE-native mode)

`MovementPattern → RequiredEquipment → Safety/Contraindications → Experience/Difficulty →
Stability → FatigueCost → preference/history scoring → deterministic rank.`

- **Safety and suitability outrank preference** — stages, not weights.
- **Beginner = machine-dominant policy** (a ranking bonus), **never machine-only**: proof
  asserts non-machine candidates survive for beginners.
- **Advanced = broader free-weight capability, no mandatory barbell**: proof asserts an
  advanced athlete without barbell still gets candidates.
- **Missing metadata = fail-safe ineligible** (`missing_metadata`), never a guess.
- Every exclusion carries `{reason, ruleId}`; ruleIds mirror the blocklist-migration rules.

## 4. Determinism (§F)

No registration order, no object-key iteration, no locale, no display names anywhere in the
selection path. Final tie-break: ordinal `exerciseId`. Proof includes permutation tests
(catalog order reversed; capability key order reversed) and a scan that the catalog contains
no name fields and no Arabic codepoints. Same AthleteProfile + `catalogManifestHash` +
`TRAINING_SELECTION_POLICY_VERSION` ⇒ identical ranking (both are embedded in every result).

## 5. Parity modes (§G)

- **PARITY** (`selectCandidatesParity`) — reproduces the characterized legacy 4-stage
  selector over QAE metadata: identical exclusion multisets, identical scores and score
  parts, and (observed) identical candidate sequences across all 17 goldens — **0** D1
  tie-break differences in practice.
- **APPROVED_DEVIATION** (`selectCandidates`) — the QAE-native staged pipeline. Every
  behavioral difference from legacy is a named entry in
  `Contracts/training/approved-deviations.json` (D1 ordinal tie-break · D2 substitution
  ordering · D3 staged pipeline/ceilings · D4 impact tag per-id · D5 machine-dominant
  vs machines-only), each with legacy output, QAE output, reason, approval reference, and
  affected fixtures. **No hidden improvement.**

## 6. Change policy

Catalog and policy are content-addressed: `catalogManifestHash` +
`TRAINING_SELECTION_POLICY_VERSION` appear in every `CandidateResult`. Changes to metadata
rules, ceilings, or scoring are versioned policy changes under the Architecture Lock
(`Contracts/README.md` migration log) — never silent edits.
