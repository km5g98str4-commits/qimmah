# QAE AthleteProfile Contract (Phase 4.5 freeze)

**Authorized by [CTO-QAE-006].** Schema version **1.0.0** (`Domain/Profile/model.ts`).
Machine-readable field registry: **`Contracts/profile/athlete-profile-fields.json`** — that file is the
source of truth for per-field metadata; the table below is its human-readable rendering. Proof suite:
`Tests/profile/qae-profile-proof.ts` (runner `Tools/run-qae-profile-proof.mjs`).

## 1. The boundary

```
Question Bank → Evidence (facts) → buildAthleteProfile() → AthleteProfile → downstream engines
                                   (the ONLY crossing)
```

- `buildAthleteProfile(facts, conflicts, resolvedConflictIds)` in `Domain/Profile/build.ts` is the
  **single normalization boundary**. It is a pure function: same facts ⇒ byte-identical canonical profile
  (proved fact-order-invariant and float-free).
- **Hard separation law:** Training, Nutrition, Steps, Recovery, Trends, and Adaptation **never read
  question IDs** — they read AthleteProfile (and the other normalized outputs: CapabilityProfile facts,
  experience bands, safety evidence) only. Enforced structurally by the §6 scan in the proof suite:
  `Domain/Decisions`, `Domain/Safety`, `Domain/Profile`, and `Contracts/schemas` contain **zero** of the
  193 legacy question IDs; registry `sources` are evidence keys, never question ids; registry `consumers`
  never include the question engine.
- The question-id → evidence-key mapping lives in `Contracts/content/question-bank.qae.json` and is
  audit metadata, not an engine surface.
- **Provenance:** the builder emits `{field → {sources, rule}}` alongside the profile. Engines never read
  it; Explainability and audits do.

## 2. Contract-level rules (frozen)

1. **Unknown age is BLOCKING (U1).** `identity.ageYears = null` ⇒ profile `incomplete`,
   `effectiveGoal = null` (minor folding cannot be evaluated, so no goal is released). The legacy
   "age 0 = adult" behavior stays dead.
2. **`status: 'incomplete'` ⇒ no downstream engine may consume the profile for a plan.** Completeness =
   all 12 mandatory evidence keys present (`PROFILE-EVIDENCE-MAP.md`).
3. **L-QST-7 contract fix:** target weight presence is a **status**, never an assumption —
   `weightTargetStatus ∈ {collected, notCollected, notApplicableMinor}`. `notCollected` is the current
   production reality (the provider question is dead on the impossible `answers.primaryGoal` path).
   Nothing downstream may infer a target from goal or body weight. Reviving the provider question is a
   routing change and remains a REVIEW item (see `QAE-PHASE4.5-REPORT.md` §3).
4. **Minors:** `effectiveGoal` folds to `maintain`, `targetWeightGrams` forced null
   (`notApplicableMinor`), `minorGoalRestrictions = true`. SafetyPolicy re-enforces at CRITICAL.
5. **Reported vs observed are carried side by side** (`adherence`, steps baseline): reported evidence gets
   `confidence: 'low'`, observed slots exist structurally now with `'none'` and are populated from real
   logs post-launch. Conflicts are **recorded, never silently reconciled**
   (`dataQuality.contradictions`).
6. **Unknown ≠ default:** missing steps bucket is `null` with confidence `none` (unknown ≠ sedentary);
   unasked pregnancy is `unknown` (never a silent `none`); movement competency `null` means *no
   evidence*, not *cleared*.
7. **All quantities integer-canonical** (`heightMm`, `currentWeightGrams`, `targetWeightGrams`,
   `confidenceCenti`) per `NUMERIC-CONTRACT.md`.
8. **Select constraints are enforced by name** (`too_few` / `too_many`) at normalization — legacy
   `select.min/max` semantics carried over with **no silent widening** of accepted ranges.

## 3. Field table

Rendering of `Contracts/profile/athlete-profile-fields.json` (R = required on a complete profile;
sources are **evidence keys**). Consumers abbreviated: TR=Training, NU=Nutrition, ST=Steps, RE=Recovery,
TD=Trends, AD=Adaptation, SP=SafetyPolicy, EX=Explainability.

| Field | Type | R | Sources | Rule (abridged) | Default | Confidence | Consumers |
|---|---|---|---|---|---|---|---|
| `schemaVersion` | semver | – | — | structural constant | `1.0.0` | n/a | all |
| `status` | complete·incomplete | – | — | complete iff `missingEvidence` empty | incomplete | binary | all |
| `identity.ageYears` | int\|null | ✓ | age | years; null = unknown = **BLOCKING**, never adult | null (blocks) | declared | SP NU TR |
| `identity.sex` | enum\|null | ✓ | sex | option verbatim | null (mandatory) | declared | NU SP |
| `body.heightMm` | int\|null | ✓ | heightCm | cm×10 | null (mandatory) | measured | NU TD |
| `body.currentWeightGrams` | int\|null | ✓ | weightKg | kg×1000 | null (mandatory) | measured | NU TD AD |
| `body.targetWeightGrams` | int\|null | – | targetWeightKg | kg×1000; minors null; non-int never enters | null | declared aspiration | NU TD |
| `body.weightTargetStatus` | enum | ✓ | targetWeightKg, age | **L-QST-7**: presence is a status | notCollected | n/a | NU TD EX |
| `goal.primaryGoal` | cut·bulk·maintain\|null | ✓ | primaryGoalDisplay | GOAL_FROM_DISPLAY map | null | declared | EX TD |
| `goal.secondaryGoal` | string\|null | – | secondaryGoal | verbatim | null | declared | TR |
| `goal.effectiveGoal` | enum\|null | ✓ | primaryGoalDisplay, age | minors→maintain; unknown age→null | null | derived | TR NU ST AD |
| `goal.minorGoalRestrictions` | bool | ✓ | age | 13≤age<18 | false | derived | SP NU EX |
| `training.experienceLevel` | PlanningClass | ✓ | consistency, lastTrained, totalMonths, trainedBefore | planning classification | complete_beginner | inferred | TR AD |
| `training.experienceBand` | 4-axis | ✓ | 11 keys | four-axis, integer-canonical; never collapsed | conservative floor | inferred | TR AD RE |
| `training.returningStatus` | enum | ✓ | lastTrained, totalMonths, trainedBefore | layoff ∧ history | unknown | inferred | TR AD EX |
| `training.consistency` | string\|null | – | consistency | bucket verbatim | null | reported | AD TD |
| `training.availableDaysPerWeek` | int\|null | ✓ | daysPerWeek | 1–7 range-validated | null (mandatory) | declared constraint | TR ST RE |
| `training.sessionDurationMinutes` | int\|null | ✓ | sessionMinutes | range-validated | null (mandatory) | declared constraint | TR |
| `training.environment` | string\|null | ✓ | place | verbatim | null (mandatory) | declared | TR |
| `training.equipmentCapabilities` | map | ✓ | equipmentList, place | full gym ⇒ ALL (U3) | `{}` | derived, additive | TR |
| `training.movementCompetency` | 5×string\|null | – | 5 tolerance keys | buckets verbatim; null = unknown ≠ cleared | nulls | reported | TR SP |
| `training.trainingHistory` | struct | – | lastTrained, totalMonths, trainedBefore | buckets + tenureMonths | nulls/0 | reported | AD TD |
| `training.preferredTrainingStyle` | string\|null | ✓ | trainingStyle | preference, never a capability restriction (U3) | null (mandatory) | declared | TR |
| `safety.injuryAreas` | string[] | – | currentInjuryAreas | sorted tags | `[]` | reported, not diagnosis | SP TR |
| `safety.pastInjuryAreas` | string[] | – | pastInjuryAreas | sorted tags | `[]` | reported | SP TR |
| `safety.painOnMovement` | string[] | – | painOnMovement | sorted tags | `[]` | reported | SP TR |
| `safety.reportedPainLevel` | 0–10\|null | – | painLevel | approved scale, reported | null | reported; ≥6 ⇒ flag | SP RE |
| `safety.contraindications` | string[] | ✓ | currentInjuryAreas, painOnMovement | sorted union, metadata filtering only | `[]` | reported | SP TR |
| `safety.safetyFlags` | string[] | ✓ | 6 screen keys | verbatim; highPain iff ≥6 | `[]` | honored, never argued down | SP RE EX |
| `safety.needsClearance` | bool | ✓ | 7 keys | any flag ∨ pregnant/postpartum; one-way | false | derived gate | SP TR |
| `safety.pregnancyContext` | enum | ✓ | pregnancyStatus, sex | male→notApplicable; unasked→unknown | unknown | reported | SP NU |
| `lifestyle.baselineStepsBucket` | string\|null | – | dailySteps | bucket verbatim | null (≠ sedentary) | low/none | ST |
| `lifestyle.baselineStepsPerDay` | int\|null | – | — | observed-only post-launch | null | none | ST TD |
| `lifestyle.baselineStepsConfidence` | Confidence | – | dailySteps | low iff reported | none | is the carrier | ST |
| `lifestyle.activityContext` | struct | – | sittingHours | bucket verbatim | null | reported estimate | ST NU |
| `lifestyle.sleepBand` | string\|null | – | sleepHours | bucket verbatim | null | reported | RE |
| `lifestyle.stressLevel` | string\|null | – | stressLevel | bucket verbatim | null | reported | RE |
| `lifestyle.fastingContext` | struct | – | — | host-provided only, never inferred | `{provided:false}` | n/a | NU ST |
| `adherence.reported` | struct | – | planAdherenceStyle | verbatim, confidence low | null/none | always low | AD |
| `adherence.observed` | struct | – | — | from real logs post-launch; outranks reported | null/none | none until logs | AD TD |
| `dataQuality.missingEvidence` | string[] | ✓ | 12 mandatory keys | absent mandatory keys ⇒ incomplete | all 12 | is the signal | SP EX AD |
| `dataQuality.contradictions` | string[] | ✓ | * | unresolved conflicts + cross-checks; recorded, never reconciled | `[]` | lowers trust, keeps data | SP AD EX |
| `dataQuality.confidenceCenti` | 0–10000 | ✓ | 12 mandatory keys | answered share ×10000 | 0 | aggregate only | EX AD |

## 4. Change policy

The contract is **frozen at 1.0.0**. Changes go through the Architecture-Lock migration process
(`Contracts/README.md`): a numbered authorization, a registry + model + builder + proof update in the
same migration, and a schema-version bump. Additive nullable fields are minor; any change to a required
field, a normalization rule, or blocking semantics is major and needs founder sign-off.
