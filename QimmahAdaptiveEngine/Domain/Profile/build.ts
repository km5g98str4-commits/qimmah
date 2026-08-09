// buildAthleteProfile — the single normalization boundary:
//   Question Bank → Evidence → Normalization → AthleteProfile → downstream engines
// Pure function of (facts, config-conflicts, resolved-conflict ids). Emits the
// profile plus per-field provenance. Deterministic: same facts ⇒ byte-identical
// canonical profile.

import { evaluatePredicate } from '../Decisions/predicates'
import { classifyExperience, deriveCapabilities } from '../ProfileClassification/classify'
import type { FactMap, FactValue } from '../Evidence/model'
import type { ConflictDef } from '../Questions/model'
import { ordinalCompare } from '../Shared/numeric'
import {
  ATHLETE_PROFILE_SCHEMA_VERSION,
  type AthleteProfile,
  type BuiltProfile,
  type Goal,
  type ProfileProvenance,
  type ReturningStatus,
  type Sex,
} from './model'

const ADULT_MIN_AGE = 18

// The characterized mandatory evidence set (profile-evidence-map.json).
const MANDATORY_KEYS = [
  'healthConsent', 'age', 'sex', 'heightCm', 'weightKg', 'trainedBefore',
  'primaryGoalDisplay', 'daysPerWeek', 'sessionMinutes', 'place', 'trainingStyle', 'hasInjury',
] as const

const GOAL_FROM_DISPLAY: Readonly<Record<string, Goal>> = {
  fat_loss: 'cut',
  muscle_gain: 'bulk',
  strength: 'bulk',
  recomp: 'maintain',
  general_health: 'maintain',
  get_fitter: 'maintain',
}

const str = (facts: FactMap, key: string): string | null => (typeof facts[key] === 'string' ? (facts[key] as string) : null)
const int = (facts: FactMap, key: string): number | null =>
  typeof facts[key] === 'number' && Number.isSafeInteger(facts[key] as number) ? (facts[key] as number) : null
const numish = (facts: FactMap, key: string): number | null => {
  const v = facts[key]
  if (typeof v === 'number' && Number.isSafeInteger(v)) return v
  if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v)
  return null
}
const multiSelections = (facts: FactMap, key: string): string[] =>
  Object.keys(facts)
    .filter((p) => p.startsWith(`${key}.`) && p !== `${key}.count` && facts[p] === true)
    .map((p) => p.slice(key.length + 1))
    .sort(ordinalCompare)

export function buildAthleteProfile(
  facts: FactMap,
  conflicts: readonly ConflictDef[],
  resolvedConflictIds: readonly string[],
): BuiltProfile {
  const provenance: ProfileProvenance = {}
  const note = (field: string, sources: string[], rule: string): void => {
    provenance[field] = { sources: [...sources].sort(ordinalCompare), rule }
  }

  // ── Identity / body ─────────────────────────────────────────────────────────
  const ageYears = int(facts, 'age')
  note('identity.ageYears', ['age'], 'integer years, range-validated at normalization; null=unknown=BLOCKING (U1)')
  const sex = (str(facts, 'sex') as Sex | null)
  note('identity.sex', ['sex'], 'declared option verbatim')
  const heightCm = int(facts, 'heightCm')
  const weightKg = int(facts, 'weightKg')
  note('body.heightMm', ['heightCm'], 'cm×10 → mm (canonical)')
  note('body.currentWeightGrams', ['weightKg'], 'kg×1000 → grams (canonical)')
  const isMinor = ageYears !== null && ageYears < ADULT_MIN_AGE
  const targetWeightKg = int(facts, 'targetWeightKg')
  const weightTargetStatus = isMinor ? 'notApplicableMinor' : targetWeightKg !== null ? 'collected' : 'notCollected'
  note('body.weightTargetStatus', ['targetWeightKg', 'age'],
    'L-QST-7 contract fix: presence is a status — notCollected is the current production reality (provider question dead); minors notApplicableMinor')

  // ── Goal ────────────────────────────────────────────────────────────────────
  const display = str(facts, 'primaryGoalDisplay')
  const primaryGoal = display !== null ? (GOAL_FROM_DISPLAY[display] ?? null) : null
  const effectiveGoal = primaryGoal === null || ageYears === null ? null : isMinor ? 'maintain' : primaryGoal
  note('goal.primaryGoal', ['primaryGoalDisplay'], 'characterized GOAL_FROM_DISPLAY mapping')
  note('goal.effectiveGoal', ['primaryGoalDisplay', 'age'],
    'minors fold to maintain (characterized live policy; SafetyPolicy re-enforces at CRITICAL); unknown age ⇒ null — minor folding cannot be evaluated, so no goal is released (U1)')
  const minorGoalRestrictions = isMinor
  note('goal.minorGoalRestrictions', ['age'], 'true iff 13≤age<18; unknown age blocks instead')

  // ── Training ────────────────────────────────────────────────────────────────
  const exp = classifyExperience(facts)
  const trainedBefore = str(facts, 'trainedBefore')
  const returningStatus: ReturningStatus =
    trainedBefore === null ? 'unknown'
    : trainedBefore === 'never' ? 'neverTrained'
    : exp.planningClassification === 'returning' ? 'returning'
    : 'active'
  note('training.experienceBand', ['consistency', 'exerciseFamiliarity', 'gymConfidence', 'knowsProgression', 'lastTrained', 'programExperience', 'selfLevel', 'totalMonths', 'tracksSets', 'trainedBefore', 'trainingAgeHonest'],
    'four-axis classification, integer-canonical (EXPERIENCE-MODEL.md); never a single collapsed level')
  note('training.returningStatus', ['lastTrained', 'totalMonths', 'trainedBefore'], 'returning iff long layoff ∧ real history (characterized)')
  const capabilities = deriveCapabilities(facts)
  note('training.equipmentCapabilities', ['equipmentList', 'place'],
    'capability derivation — full gym ⇒ ALL capabilities (U3: never machines-only); home from inventory facts')
  note('training.experienceLevel', ['consistency', 'lastTrained', 'totalMonths', 'trainedBefore'],
    'planning classification (separate from the four-axis band); returning recognized before banding')
  note('training.availableDaysPerWeek', ['daysPerWeek'], 'integer days 1–7, range-validated at normalization')
  note('training.sessionDurationMinutes', ['sessionMinutes'], 'integer minutes, range-validated at normalization')
  note('training.environment', ['place'], 'declared option verbatim')
  note('training.preferredTrainingStyle', ['trainingStyle'], 'declared option verbatim — a preference signal, never a capability restriction (U3)')

  // ── Safety (evidence only — no diagnosis, no medical inference) ─────────────
  const injuryAreas = multiSelections(facts, 'currentInjuryAreas')
  const pastInjuryAreas = multiSelections(facts, 'pastInjuryAreas')
  const painOnMovement = multiSelections(facts, 'painOnMovement')
  const reportedPainLevel = int(facts, 'painLevel')
  const safetyFlags: string[] = []
  if (facts['chestPain'] === true || str(facts, 'chestPain') === 'yes') safetyFlags.push('chestPain')
  if (facts['fainting'] === true || str(facts, 'fainting') === 'yes') safetyFlags.push('fainting')
  if (facts['doctorRestriction'] === true || str(facts, 'doctorRestriction') === 'yes') safetyFlags.push('doctorRestriction')
  if (facts['dizzinessOnEffort'] === true || str(facts, 'dizzinessOnEffort') === 'yes') safetyFlags.push('dizzinessOnEffort')
  if (facts['recentSurgery'] === true || str(facts, 'recentSurgery') === 'yes') safetyFlags.push('recentSurgery')
  if (reportedPainLevel !== null && reportedPainLevel >= 6) safetyFlags.push('highPain')
  safetyFlags.sort(ordinalCompare)
  note('safety.safetyFlags', ['chestPain', 'dizzinessOnEffort', 'doctorRestriction', 'fainting', 'painLevel', 'recentSurgery'],
    'screen answers verbatim; highPain iff painLevel≥6 (characterized threshold) — reported evidence, never diagnosis')
  const pregnancyRaw = str(facts, 'pregnancyStatus')
  const pregnancyContext =
    sex === 'male' ? 'notApplicable'
    : pregnancyRaw === 'pregnant' || pregnancyRaw === 'postpartum' ? pregnancyRaw
    : pregnancyRaw !== null ? 'none'
    : 'unknown'
  note('safety.pregnancyContext', ['pregnancyStatus', 'sex'], 'reported status; male ⇒ notApplicable; unasked ⇒ unknown')
  const contraindications = [...new Set([...injuryAreas, ...painOnMovement])].sort(ordinalCompare)
  note('safety.contraindications', ['currentInjuryAreas', 'painOnMovement'], 'union of reported areas + reported problem movements — tags for metadata filtering only')
  const needsClearance = safetyFlags.length > 0 || pregnancyContext === 'pregnant' || pregnancyContext === 'postpartum'
  note('safety.needsClearance', ['chestPain', 'dizzinessOnEffort', 'doctorRestriction', 'fainting', 'painLevel', 'pregnancyStatus', 'recentSurgery'],
    'true iff any safety flag or pregnant/postpartum — gates SafetyPolicy, never silently cleared')

  // ── Data quality ────────────────────────────────────────────────────────────
  const missingEvidence = MANDATORY_KEYS.filter((k) => !(k in facts)).sort(ordinalCompare)
  const contradictions = conflicts
    .filter((c) => !resolvedConflictIds.includes(c.id) && evaluatePredicate(c.detect, facts as Record<string, FactValue>))
    .map((c) => c.id)
  if (injuryAreas.length === 0 && str(facts, 'hasInjury') === 'none' && (painOnMovement.length > 0 || reportedPainLevel !== null)) {
    contradictions.push('painEvidenceWithoutInjuryReport')
  }
  contradictions.sort(ordinalCompare)
  note('dataQuality.contradictions', ['*'], 'unresolved bank conflicts + profile-level cross-checks; recorded, never silently reconciled')
  note('dataQuality.missingEvidence', [...MANDATORY_KEYS], 'mandatory evidence keys absent from facts; non-empty ⇒ profile incomplete ⇒ no plan')
  const answeredMandatory = MANDATORY_KEYS.length - missingEvidence.length
  const confidenceCentiInt = Math.round((answeredMandatory * 100 * 100) / MANDATORY_KEYS.length)
  note('dataQuality.confidenceCenti', [...MANDATORY_KEYS], 'answered-mandatory share ×10000, integer-canonical (centi-percent)')

  const profile: AthleteProfile = {
    schemaVersion: ATHLETE_PROFILE_SCHEMA_VERSION,
    status: missingEvidence.length === 0 ? 'complete' : 'incomplete',
    identity: { ageYears, sex },
    body: {
      heightMm: heightCm !== null ? heightCm * 10 : null,
      currentWeightGrams: weightKg !== null ? weightKg * 1000 : null,
      targetWeightGrams: isMinor ? null : targetWeightKg !== null ? targetWeightKg * 1000 : null,
      weightTargetStatus,
    },
    goal: {
      primaryGoal,
      secondaryGoal: str(facts, 'secondaryGoal'),
      effectiveGoal,
      minorGoalRestrictions,
    },
    training: {
      experienceLevel: exp.planningClassification,
      experienceBand: {
        trainingKnowledge: exp.trainingKnowledge,
        recentTrainingExposure: exp.recentTrainingExposure,
        currentWorkCapacity: { band: exp.currentWorkCapacity.band, conservative: exp.currentWorkCapacity.conservative },
        consistencyHistory: exp.consistencyHistory,
      },
      returningStatus,
      consistency: str(facts, 'consistency'),
      availableDaysPerWeek: numish(facts, 'daysPerWeek'),
      sessionDurationMinutes: numish(facts, 'sessionMinutes'),
      environment: str(facts, 'place'),
      equipmentCapabilities: capabilities,
      movementCompetency: {
        overhead: str(facts, 'shoulderOverhead'),
        hinge: str(facts, 'backHinge'),
        squatDepth: str(facts, 'kneeDepth'),
        impact: str(facts, 'impactTolerance'),
        standing: str(facts, 'standingTolerance'),
      },
      trainingHistory: {
        trainedBefore,
        totalMonthsBucket: str(facts, 'totalMonths'),
        lastTrainedBucket: str(facts, 'lastTrained'),
        tenureMonths: exp.consistencyHistory.tenureMonths,
      },
      preferredTrainingStyle: str(facts, 'trainingStyle'),
    },
    safety: {
      injuryAreas,
      pastInjuryAreas,
      painOnMovement,
      reportedPainLevel,
      contraindications,
      safetyFlags,
      needsClearance,
      pregnancyContext,
    },
    lifestyle: {
      baselineStepsBucket: str(facts, 'dailySteps'),
      baselineStepsPerDay: null,
      baselineStepsConfidence: str(facts, 'dailySteps') !== null ? 'low' : 'none',
      activityContext: { sittingBucket: str(facts, 'sittingHours') },
      sleepBand: str(facts, 'sleepHours'),
      stressLevel: str(facts, 'stressLevel'),
      fastingContext: { provided: false },
    },
    adherence: {
      reported: { value: str(facts, 'planAdherenceStyle'), confidence: str(facts, 'planAdherenceStyle') !== null ? 'low' : 'none' },
      observed: { value: null, confidence: 'none' },
    },
    dataQuality: {
      missingEvidence,
      contradictions,
      confidenceCenti: confidenceCentiInt,
    },
  }

  return { profile, provenance }
}
