// Training-specific completeness contract ([CTO-QAE-021] §5).
//
// Global AthleteProfile completeness is NOT weakened. This is a narrower,
// Training-only question: "does this profile carry the evidence the Training
// path actually consumes?" Assessment/Nutrition keep their own, stricter bar.
//
// Pure · deterministic · no I/O · no UI strings.
//
// WHY THIS EXISTS: capability.ts refuses any profile whose global status is not
// 'complete'. Under the live app no profile can reach that bar, because
// OnboardingV2 does not collect movementCompetency — a field the Training path
// reads but, as proven below, never requires.

/**
 * PROVEN OPTIONAL FOR TRAINING (capability.ts:71-76).
 *
 * `movementCompetency` is consumed only to ADD contraindication tags on
 * specific restrictive values:
 *     overhead === 'cannot'      -> tag 'overhead'
 *     hinge === 'avoid'          -> tag 'lower_back'
 *     impact === 'none'          -> tag 'impact'
 *     squatDepth === 'minimal'   -> tag 'knee'
 *     standing === 'seated_only' -> unmapped marker
 *
 * Every sub-field null therefore adds NOTHING and blocks NOTHING: the athlete
 * simply carries no competency-derived restriction. Absence is a smaller,
 * safer plan input than a fabricated value, so Training treats it as
 * OPTIONAL_FOR_FUTURE_ASSESSMENT rather than a blocker.
 */
export const MOVEMENT_COMPETENCY_IS_TRAINING_OPTIONAL = true

export type TrainingRequiredField =
  | 'identity.ageYears'
  | 'body.currentWeightGrams'
  | 'training.availableDaysPerWeek'
  | 'training.sessionDurationMinutes'
  | 'training.environment'
  | 'training.experienceBand.trainingKnowledge'
  | 'training.experienceBand.currentWorkCapacity'
  | 'training.returningStatus'
  | 'safety.injuryAreas'

/** Consumed by Training only when present; never blocking. */
export type TrainingOptionalField =
  | 'training.movementCompetency'
  | 'safety.painOnMovement'
  | 'training.preferredTrainingStyle'
  | 'training.equipmentCapabilities'
  | 'training.consistency'
  | 'training.experienceBand.recentTrainingExposure'
  | 'training.experienceBand.consistencyHistory'
  | 'training.trainingHistory.trainedBefore'
  | 'training.trainingHistory.totalMonthsBucket'
  | 'training.trainingHistory.lastTrainedBucket'

export const TRAINING_REQUIRED_FIELDS: readonly TrainingRequiredField[] = [
  'identity.ageYears',
  'body.currentWeightGrams',
  'training.availableDaysPerWeek',
  'training.sessionDurationMinutes',
  'training.environment',
  'training.experienceBand.trainingKnowledge',
  'training.experienceBand.currentWorkCapacity',
  'training.returningStatus',
  'safety.injuryAreas',
]

export const TRAINING_OPTIONAL_FIELDS: readonly TrainingOptionalField[] = [
  'training.movementCompetency',
  'safety.painOnMovement',
  'training.preferredTrainingStyle',
  'training.equipmentCapabilities',
  'training.consistency',
  'training.experienceBand.recentTrainingExposure',
  'training.experienceBand.consistencyHistory',
  'training.trainingHistory.trainedBefore',
  'training.trainingHistory.totalMonthsBucket',
  'training.trainingHistory.lastTrainedBucket',
]

export interface TrainingCompletenessResult {
  completeForTraining: boolean
  missingRequired: readonly TrainingRequiredField[]
  /** present-but-optional fields, reported so absence is visible not silent */
  absentOptional: readonly TrainingOptionalField[]
}

/**
 * `present` is supplied by the host adapter — the set of fields it mapped from
 * EXPLICIT evidence. This function makes no judgement about how a field was
 * obtained; it only answers whether Training's required set is covered.
 */
export function evaluateTrainingCompleteness(
  present: ReadonlySet<string>,
): TrainingCompletenessResult {
  const missingRequired = TRAINING_REQUIRED_FIELDS.filter((f) => !present.has(f))
  const absentOptional = TRAINING_OPTIONAL_FIELDS.filter((f) => !present.has(f))
  return {
    completeForTraining: missingRequired.length === 0,
    missingRequired,
    absentOptional,
  }
}
