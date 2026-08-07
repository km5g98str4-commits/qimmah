# QAE Domain Model

**Status:** Draft for founder review · Phase 0.5 · Authorized by [CTO-QAE-001]
Canonical machine-readable definitions live in `Contracts/schemas/`; this document is the narrative + rationale. Units per NUMERIC-CONTRACT.md. All enums are **closed**; extending one is a versioned rule-set change.

---

## 1. Identity & core enums

```
Sex               = male | female | unspecified
GoalType          = cut | bulk | maintain            # legacy-compatible; recomp/strength map per legacy migration
GoalPhase         = active | deloadWeek | dietBreak | transitionPending | completed | aborted
ExperienceBand    = beginner | intermediate | advanced
Environment       = gym | home | machinesOnly
Confidence        = none | low | moderate | high
PriorityClass     = safety | minorRestriction | injuryRestriction | dataIntegrity
                  | recovery | adherence | goalProgress | optimization | preference
ChangeClass       = major | minor | compositeSafetyRecovery
ObservationSource = manual | healthKit | derived | imported
TrendDirection    = falling | stable | rising | indeterminate
SafetyVerdictKind = pass | clamp | block
InjuryFlag        = knee | shoulder | lowerBack | wrist | elbow | ankle   # legacy set; extensible by version
MovementPattern   = squat | hinge | lungeSplit | horizontalPush | verticalPush
                  | horizontalPull | verticalPull | carry | core | isolation
Ordering and exact string values are normative in Contracts/schemas/core.schema.json.
```

## 2. AthleteProfile (finalized) and PartialAthleteState

`AthleteProfile` is produced **only** when `AssessmentCompleteness` gates pass ([CTO-QAE-001] §9). Until then everything operates on `PartialAthleteState`.

```
PartialAthleteState {
  knowns:      { fieldPath → { value, source, confidence, observedAt } }
  derived:     { experienceModel?, bmrEstimate?, startingComplexity?, … each with confidence }
  gaps:        EvidenceGap[]          # what is unknown and what it blocks
  completeness: AssessmentCompleteness
}

AssessmentCompleteness {
  perDomain:  { training | nutrition | steps | safety | recovery → none|low|moderate|high }
  mandatoryMissing: FieldPath[]       # empty ⇒ finalization allowed
  safetyHolds: ReasonCode[]           # open safety follow-ups block finalization
}

EvidenceGap { fieldPath, blocks: Domain[], materiality: 0–100 int, candidateQuestionIds[] }
```

`AthleteProfile` sections (aligned with legacy `OnboardingProfile`'s 12 sections so characterization maps cleanly):
`identity` (sex, ageYears) · `body` (heightMm, massGrams, targetMassGrams?) · `goal` (GoalType + GoalLifecycle ref) · `experience` (**ExperienceModel**, §3) · `logistics` (daysPerWeek, sessionMinutes, environment, equipment[]) · `activity` (neatBand, baselineStepsPerDay + confidence) · `nutritionPrefs` (dietPattern, mealsPerDay, exclusions[]) · `limitations` (InjuryFlag[], medicalFlags[] → safety routing only, never diagnosis) · `recoveryBaseline` (sleepBand, …) · `preferences` (equipmentPreference, dislikedExercises[]) · `consents` (healthData …; consumed as booleans, semantics owned by host) · `meta` (schemaVersion, assessedAt, manifest).

## 3. ExperienceModel ([CTO-QAE-001] §12 — three axes, never collapsed)

```
ExperienceModel {
  trainingKnowledge:      ExperienceBand   # what they know (technique literacy, RIR fluency)
  recentTrainingExposure: { band: none | sporadic | consistent, monthsSinceConsistent: int }
  currentWorkCapacity:    band + confidence  # what they can DO today (estimated, conservative)
}
```

An advanced user returning after 10 months keeps `trainingKnowledge = advanced` (question depth, terminology, exercise pool) while `currentWorkCapacity` starts reduced and ramps per RETURNING-USER-POLICY.md. Rules must name which axis they read; a rule reading "experience" without an axis fails the rule linter.

## 4. Observations & data quality (types owned by DataQuality)

```
RawObservation {
  id, kind: bodyMass | steps | sleep | soreness | fatigue | hunger | sessionCompletion
          | performanceMarker | calorieIntake,
  value: int (canonical unit per kind), epochMs, tzOffsetMinutes, source, meta?
}
QualityAssessedSeries {
  kind, points: [{localDate, value, weightGrams?…, sourceConfidence, flags: QualityFlag[]}],
  validCount, spanDays, coverageBp, seriesConfidence: Confidence
}
QualityFlag = outlier | duplicate | stale | impossible | sourceConflict | gapAdjacent
DataQualityReport { perKind: {…}, exclusions: [{observationId, flag, reasonCode}] }  # exclusions are visible, never silent
```

**Only** `QualityAssessedSeries` crosses into trends/rules; raw types are unexportable outside DataQuality.

## 5. Trends & check-in

```
TrendReport {
  period: ReviewPeriod,
  weight?:   { avgGrams, deltaGramsPerWeek, direction, validCount, confidence }
  steps?:    { avgPerDay, targetAdherenceBp, confidence }
  calories?: { adherenceBp, confidence }              # vs plan target
  training?: { completionBp, performanceTrend: TrendDirection, confidence }
  recovery?: { sleepScoreTrend, sorenessTrend, fatigueTrend, hungerTrend, confidence }
  comparisons: previousPeriods[≤4]
  adherenceConfidence: Confidence                     # is the data itself trustworthy
}
```

## 6. Plan aggregate & versioning

```
Plan {
  planVersionId, basedOnVersionId?, createdByManifest, appliedProposalId?,
  training:  { frequencyPerWeek, split, days: [{slots: ExerciseSlot[]}],
               progressionMethod, volumeIndex: int (bp vs reference) }
  nutrition: { calorieTargetKcal, macros: {proteinG, carbG, fatG}, mealDistributionRef? }
  steps:     { dailyTarget, minimumExposureDaysBeforeNextIncrease }
  goalRef:   { goalType, phase }
}
ExerciseSlot { slotId, movementPattern, primaryMuscles[], selectedExerciseId,
               sets, repRange: {min,max}, restSeconds, rirTarget?, alternatives: rankedExerciseIds[] }
```

Slots are selected via **ExerciseMetadata + policy**, never hard-coded exercise-name branches ([CTO-QAE-001] §8).

## 7. ExerciseMetadata (canonical schema, [CTO-QAE-001] §8 — schema only; no library population)

```
ExerciseMetadata {
  stableExerciseId, movementPattern, primaryMuscles[], secondaryMuscles[],
  equipment[], stabilityDemand: 1–5, technicalDifficulty: 1–5, fatigueCost: 1–5,
  experienceSuitability: { minBand, preferredBands[] },
  contraindications: InjuryFlag[], laterality: unilateral | bilateral,
  progressionCompatibility: [loadIncrement | repProgression | tempoProgression | densityProgression],
  substitutionGroup, setupComplexity: 1–5
}
```

## 8. Adaptation & decisions

```
AdaptationAction (closed ADT) =
  keepPlan | requestMoreData(gaps)
  | changeCalories(deltaKcal) | changeStepTarget(delta) | changeTrainingVolume(deltaBp)
  | changeTrainingFrequency(delta) | scheduleDeload | replaceExercise(slotId, toExerciseId)
  | changeProgressionMethod(method) | changeMacroDistribution(newMacros)
  | proposeGoalTransition(toGoal)          # GoalLifecycle; always requiresApproval

CandidateProposal { ruleId, action, targetVariable, changeClass, priorityClass,
                    priorityScore, reasonCodes[], evidence: EvidenceRef[],
                    confidence, safetyImpact: none|protective|restrictive, cooldownKey }
AdaptationProposal = CandidateProposal + { proposalId, requiresApproval: bool,
                    safetyScreen: SafetyVerdict, manifest }
EvidenceRef { metric, window, observedValue, threshold?, registerId? }   # points at real inputs, auditable
```

## 9. Safety types (sealed — see SAFETY-POLICY.md)

```
SafetyVerdict = Pass | Clamp{original, adjusted, reasonCodes[]} | Block{reasonCodes[], safeFallback}
ValidDecisionSpace { perVariable bounds: {min?, max?, maxDeltaPerCycle?}, blockedActions[] , reasonCodes[] }
IssuablePlan / IssuableProposal / AppliableChange   # constructible only inside SafetyPolicy
```

## 10. Contexts

```
RamadanContext { fasting: bool, periodDates?, dailyEatingWindow?: {startMin, endMin} }  # host-supplied facts only
GoalLifecycleState { goalType, phase, phaseStartDate, progressMarkers, transitionPending? }
ReturningUserState { detected: bool, monthsSinceConsistent, rampPlanRef?, rampWeekIndex? }
ReviewPeriod { startDate, endDate }        # host-computed, NUMERIC-CONTRACT §4
Now { epochMs, tzOffsetMinutes }
```

## 11. Explainability & versioning

```
ReasonCode: registered string (Contracts/reason-codes.json): { code, domain, severity, description }
ReasonTrace { firedRules[], notFired: [{ruleId, reasonCodes}], insufficientEvidence: [{ruleId, gaps}] }
RuleSetManifest { perDomainVersions: {domain → semver}, contentHash }
```

Reason codes are never UI strings; hosts map them to Arabic/English copy in the app's i18n layer.
