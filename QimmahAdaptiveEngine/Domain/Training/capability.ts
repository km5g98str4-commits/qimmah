// TrainingCapabilityProfile — derived from AthleteProfile ONLY ([CTO-QAE-007] §D).
// The Training Engine's entire view of the athlete. Contains ZERO question ids;
// its inputs are the normalized AthleteProfile fields, nothing else.
//
// Policy stances baked in ([CTO-QAE-007] §E):
//   beginner  = machine-DOMINANT policy (ranking preference), NOT machine-only.
//   advanced  = broader free-weight capability, NOT mandatory barbell.
//   safety and suitability outrank preference (filter stages precede ranking).

import type { AthleteProfile } from '../Profile/model'
import { ordinalCompare } from '../Shared/numeric'
import type { ContraindicationTag, ExperienceBand, ProgressionKind } from '../Catalog/model'

export const TRAINING_CAPABILITY_SCHEMA_VERSION = '1.0.0'

export interface TrainingCapabilityProfile {
  schemaVersion: string
  /** collapsed suitability band (exercise-facing); the 4-axis band stays authoritative for programming */
  experienceBand: ExperienceBand
  planningClass: AthleteProfile['training']['experienceLevel']
  returningStatus: AthleteProfile['training']['returningStatus']
  trainingDaysPerWeek: number | null
  sessionDurationMinutes: number | null
  environment: string | null
  equipmentCapabilities: Record<string, boolean>
  /** contraindication tags derived from reported evidence — filtering input, never diagnosis */
  injuryConstraints: ContraindicationTag[]
  /** reported areas with no exclusion-tag vocabulary — carried visibly, never dropped */
  unmappedConstraintAreas: string[]
  /** ceiling on metadata.stabilityDemand */
  stabilityCeiling: 1 | 2 | 3
  /** ceiling on metadata.technicalDifficulty (legacy levelOk characterization) */
  exerciseComplexityCeiling: 1 | 2 | 3
  /** ceiling on metadata.fatigueCost (conservative for returning users) */
  fatigueCeiling: 1 | 2 | 3
  preferredTrainingStyle: string | null
  /** beginner policy: machines ranked first — a preference, NOT a filter */
  machineDominantPolicy: boolean
  progressionCapability: ProgressionKind[]
  /** only when already evidenced (sleep/stress); never guessed */
  recoveryCapacityClass: 'normal' | 'limited' | 'unknown'
  needsClearance: boolean
}

const AREA_TAGS: ReadonlySet<string> = new Set(['knee', 'shoulder', 'lower_back', 'wrist', 'elbow', 'ankle'])

/** experienceBand collapse: knowledge governs, capacity conservatism can only lower it. */
function collapseBand(p: AthleteProfile): ExperienceBand {
  const k = p.training.experienceBand.trainingKnowledge
  const capacity = p.training.experienceBand.currentWorkCapacity
  if (k === 'advanced' && capacity.band === 'advanced' && !capacity.conservative) return 'advanced'
  if (k === 'beginner') return 'beginner'
  return 'intermediate'
}

export function deriveTrainingCapabilityProfile(p: AthleteProfile): TrainingCapabilityProfile {
  if (p.status !== 'complete') {
    throw new Error('QAE-TRAINING-INCOMPLETE-PROFILE: an incomplete AthleteProfile must never reach the Training Engine')
  }

  const band = collapseBand(p)
  const conservative = p.training.experienceBand.currentWorkCapacity.conservative || p.training.returningStatus === 'returning'

  // ── Injury constraints: reported areas + movement competency + pain map ────
  const tags = new Set<ContraindicationTag>()
  const unmapped = new Set<string>()
  for (const area of [...p.safety.injuryAreas]) {
    if (AREA_TAGS.has(area)) tags.add(area as ContraindicationTag)
    else unmapped.add(area)
  }
  const mc = p.training.movementCompetency
  if (mc.overhead === 'cannot') tags.add('overhead')
  if (mc.hinge === 'avoid') tags.add('lower_back')
  if (mc.impact === 'none') tags.add('impact')
  if (mc.squatDepth === 'minimal') tags.add('knee')
  if (mc.standing === 'seated_only') unmapped.add('competency:standing_seated_only')
  for (const pain of p.safety.painOnMovement) {
    if (pain === 'overhead') tags.add('overhead')
    else if (pain === 'squat') tags.add('knee')
    else if (pain === 'hinge') tags.add('lower_back')
    else if (pain === 'impact') tags.add('impact')
    else if (pain !== 'none') unmapped.add(`pain:${pain}`)
  }

  // ── Progression capability from evidence (knowledge band), conservative floor ─
  const progression: ProgressionKind[] =
    band === 'advanced' ? ['double', 'linear', 'rep', 'timed']
    : band === 'intermediate' ? ['double', 'linear', 'rep', 'timed']
    : ['double', 'rep', 'timed']

  // ── Recovery class only where evidenced ────────────────────────────────────
  const sleep = p.lifestyle.sleepBand
  const stress = p.lifestyle.stressLevel
  const recoveryCapacityClass: TrainingCapabilityProfile['recoveryCapacityClass'] =
    sleep === null && stress === null ? 'unknown'
    : sleep === 'lt5' || sleep === 'h5_6' || stress === 'high'
      ? 'limited'
      : 'normal'

  return {
    schemaVersion: TRAINING_CAPABILITY_SCHEMA_VERSION,
    experienceBand: band,
    planningClass: p.training.experienceLevel,
    returningStatus: p.training.returningStatus,
    trainingDaysPerWeek: p.training.availableDaysPerWeek,
    sessionDurationMinutes: p.training.sessionDurationMinutes,
    environment: p.training.environment,
    equipmentCapabilities: { ...p.training.equipmentCapabilities },
    injuryConstraints: [...tags].sort(ordinalCompare),
    unmappedConstraintAreas: [...unmapped].sort(ordinalCompare),
    stabilityCeiling: band === 'beginner' || conservative ? 2 : 3,
    exerciseComplexityCeiling: band === 'beginner' ? 2 : 3,
    fatigueCeiling: conservative ? 2 : 3,
    preferredTrainingStyle: p.training.preferredTrainingStyle,
    machineDominantPolicy: band === 'beginner',
    progressionCapability: progression,
    recoveryCapacityClass,
    needsClearance: p.safety.needsClearance,
  }
}
