// Training initial-plan wiring ([CTO-QAE-014] §4–§5).
//
//   AthleteProfile
//     → TrainingCapabilityProfile        (capability.ts, Wave 1)
//     → eligible exercise pool           (buildEligiblePool, here)
//     → split / day requirements         (split.ts, Wave 4)
//     → assembly                         (assembly.ts, Wave 3)
//     → TrainingPlanSection              (here)
//
// Pure · deterministic · integer-only · locale-independent · timezone-independent.
// No UI strings, no question ids, no raw questionnaire answers, no proof
// fixtures, no runtime import of shipping code.
//
// SCOPE: no sets, reps, load, RIR, progression, volume, deload, or cardio.
// TrainingPlanSection deliberately carries exercise IDENTITY and ORDER only —
// prescription is a later wave, and leaving the fields absent is what keeps this
// wave honest rather than half-filling them with derived-metadata guesses.

import { ordinalCompare } from '../Shared/numeric'
import type { AthleteProfile } from '../Profile/model'
import type { ContraindicationTag, ExerciseCatalog, ExerciseMetadata } from '../Catalog/model'
import { deriveTrainingCapabilityProfile, type TrainingCapabilityProfile } from './capability'
import { assembleDays, deriveTargetCount, type AccessoryCategory, type AssembledDay, type ExpTier } from './assembly'
import { generateSplit, type MuscleFocus, type SplitId } from './split'

export const TRAINING_PLAN_POLICY_VERSION = '1.0.0'

// ── Result contract (smallest versioned shape for this wave) ───────────────

export interface TrainingPlanSection {
  schemaVersion: string
  splitId: SplitId
  frequencyPerWeek: number
  targetPerDay: number
  days: readonly AssembledDay[]
  policyVersion: string
  splitPolicyVersion: string
  assemblyPolicyVersion: string
  catalogManifestHash: string
  /** eligible pool size — the honest denominator behind every pick */
  eligiblePoolSize: number
  trace: readonly string[]
}

export type TrainingPlanFailureReason =
  | 'incompleteProfile'
  | 'noEligibleExercises'
  | 'invalidTrainingDays'
  | 'unknownEnvironment'

export type TrainingPlanResult =
  | { ok: true; training: TrainingPlanSection }
  | { ok: false; reason: TrainingPlanFailureReason; detail: string }

// ── Environment ────────────────────────────────────────────────────────────

/** Characterized legacy access vocabulary (equipmentAccess.ts:10-22). */
export type GymAccess = 'full' | 'small' | 'home' | 'bodyweight'
const KNOWN_ACCESS: ReadonlySet<string> = new Set<GymAccess>(['full', 'small', 'home', 'bodyweight'])

/** equipmentAccess.ts:30-46 — makeEquipmentGate, as data. */
function equipmentAllowed(access: GymAccess, equipmentRequired: readonly string[]): boolean {
  if (access === 'full') return true
  if (access === 'small') {
    const banned = new Set(['smith', 'rope'])
    return equipmentRequired.every((e) => !banned.has(e))
  }
  if (access === 'home') {
    const allowed = new Set(['dumbbell', 'barbell', 'bodyweight', 'band', 'bench'])
    return equipmentRequired.every((e) => allowed.has(e))
  }
  const allowed = new Set(['bodyweight'])
  return equipmentRequired.every((e) => allowed.has(e))
}

/** planGenerator.ts:712-713 — machines-only environments. */
export const isMachinesOnly = (access: GymAccess): boolean => access === 'full' || access === 'small'

// ── Eligible pool ──────────────────────────────────────────────────────────

export interface EligibilityInput {
  access: GymAccess
  tier: ExpTier
  /** contraindication tags the athlete must avoid (capability.injuryConstraints) */
  injuryConstraints: readonly ContraindicationTag[]
  /** characterized legacy id blocklists, supplied as data (never scraped at runtime) */
  blocklists: {
    injuryByTag: Readonly<Record<string, readonly string[]>>
    levelCapped: readonly string[]
    freeCable: readonly string[]
  }
}

export interface EligiblePool {
  ids: readonly string[]
  machinesOnly: boolean
  preferMachines: boolean
  excluded: ReadonlyArray<{ exerciseId: string; reason: string }>
}

/**
 * The real bridge: capability + catalog metadata → eligible ids.
 * Mirrors planGenerator.ts:714-727 exactly; every filter is a characterized
 * legacy rule, and every exclusion is reported rather than silently dropped.
 */
export function buildEligiblePool(catalog: ExerciseCatalog, input: EligibilityInput): EligiblePool {
  const machinesOnly = isMachinesOnly(input.access)
  const preferMachines = input.tier === 'beginner' || input.tier === 'novice'
  const machineIds = new Set(catalog.primaryMachineIds)

  const injured = new Set<string>()
  for (const tag of input.injuryConstraints) {
    for (const id of input.blocklists.injuryByTag[tag] ?? []) injured.add(id)
  }
  const levelCapped = new Set(input.blocklists.levelCapped)
  const freeCable = new Set(input.blocklists.freeCable)

  const levelOk = (ex: ExerciseMetadata): boolean =>
    preferMachines ? !levelCapped.has(ex.exerciseId) : true
  const cableOk = (ex: ExerciseMetadata): boolean =>
    input.tier === 'advanced' || !freeCable.has(ex.exerciseId)

  const ids: string[] = []
  const excluded: Array<{ exerciseId: string; reason: string }> = []

  for (const ex of catalog.exercises) {
    if (injured.has(ex.exerciseId)) {
      excluded.push({ exerciseId: ex.exerciseId, reason: 'injuryConstraint' })
      continue
    }
    if (!levelOk(ex)) {
      excluded.push({ exerciseId: ex.exerciseId, reason: 'levelCap' })
      continue
    }
    if (machinesOnly) {
      if (!machineIds.has(ex.exerciseId)) {
        excluded.push({ exerciseId: ex.exerciseId, reason: 'notApprovedMachine' })
        continue
      }
    } else {
      if (!equipmentAllowed(input.access, ex.equipmentRequired)) {
        excluded.push({ exerciseId: ex.exerciseId, reason: 'equipmentUnavailable' })
        continue
      }
      if (!cableOk(ex)) {
        excluded.push({ exerciseId: ex.exerciseId, reason: 'freeCableRestricted' })
        continue
      }
      if (ex.movementPattern === 'mobility') {
        excluded.push({ exerciseId: ex.exerciseId, reason: 'mobilityExcluded' })
        continue
      }
      if (ex.primaryMuscleCoarse === 'cardio') {
        excluded.push({ exerciseId: ex.exerciseId, reason: 'cardioExcluded' })
        continue
      }
    }
    ids.push(ex.exerciseId)
  }

  return {
    ids: ids.sort(ordinalCompare),
    machinesOnly,
    preferMachines,
    excluded: excluded.sort((a, b) => ordinalCompare(a.exerciseId, b.exerciseId)),
  }
}

// ── Accessory pool ─────────────────────────────────────────────────────────

/** planGenerator.ts:366-370 — ACCESSORY_POOL, characterized as data. */
export const ACCESSORY_POOL: Readonly<Record<AccessoryCategory, readonly string[]>> = {
  triceps: ['triceps-extension-machine', 'cable-triceps-pushdown'],
  biceps: ['preacher-curl-machine', 'cable-biceps-curl'],
  abs: ['ab-crunch-machine'],
}

function accessoryPoolFor(tier: ExpTier, freeCable: readonly string[]): Record<AccessoryCategory, readonly string[]> {
  const blocked = new Set(freeCable)
  const filt = (list: readonly string[]): string[] =>
    list.filter((id) => tier === 'advanced' || !blocked.has(id))
  return { triceps: filt(ACCESSORY_POOL.triceps), biceps: filt(ACCESSORY_POOL.biceps), abs: filt(ACCESSORY_POOL.abs) }
}

// ── Tier ───────────────────────────────────────────────────────────────────

/**
 * capability.experienceBand → the legacy 4-tier volume/preference vocabulary.
 * `returning` conservatism can only lower the tier, never raise it.
 */
export function tierFromCapability(cap: TrainingCapabilityProfile): ExpTier {
  if (cap.experienceBand === 'advanced') return 'advanced'
  if (cap.experienceBand === 'intermediate') return 'intermediate'
  return cap.machineDominantPolicy ? 'beginner' : 'novice'
}

// ── The wired path ─────────────────────────────────────────────────────────

export interface BuildTrainingInput {
  catalog: ExerciseCatalog
  access: GymAccess
  muscleFocus?: MuscleFocus
  blocklists: EligibilityInput['blocklists']
}

/**
 * AthleteProfile → TrainingPlanSection. Fails closed: an incomplete profile,
 * an unknown environment, invalid days, or an empty eligible pool returns a
 * typed failure. It never fabricates a plan.
 */
export function buildTrainingPlan(profile: AthleteProfile, input: BuildTrainingInput): TrainingPlanResult {
  if (profile.status !== 'complete') {
    return { ok: false, reason: 'incompleteProfile', detail: 'QAE-TRAINING-INCOMPLETE-PROFILE' }
  }
  if (!KNOWN_ACCESS.has(input.access)) {
    return { ok: false, reason: 'unknownEnvironment', detail: String(input.access) }
  }

  const cap = deriveTrainingCapabilityProfile(profile)
  const days = cap.trainingDaysPerWeek
  if (days === null || !Number.isFinite(days) || days < 1) {
    return { ok: false, reason: 'invalidTrainingDays', detail: String(days) }
  }

  const tier = tierFromCapability(cap)
  const pool = buildEligiblePool(input.catalog, {
    access: input.access,
    tier,
    injuryConstraints: cap.injuryConstraints,
    blocklists: input.blocklists,
  })
  if (pool.ids.length === 0) {
    return { ok: false, reason: 'noEligibleExercises', detail: `access=${input.access} tier=${tier}` }
  }

  const split = generateSplit(days, input.muscleFocus)
  const targetPerDay = deriveTargetCount(tier, cap.sessionDurationMinutes ?? 0)

  const assembled = assembleDays(input.catalog, {
    daySpecs: split.daySpecs,
    poolIds: pool.ids,
    targetPerDay,
    machinesOnly: pool.machinesOnly,
    preferMachines: pool.preferMachines,
    accessoryPool: accessoryPoolFor(tier, input.blocklists.freeCable),
  })

  return {
    ok: true,
    training: {
      schemaVersion: '1.0.0',
      splitId: split.splitId,
      frequencyPerWeek: split.effectiveDays,
      targetPerDay,
      days: assembled.days,
      policyVersion: TRAINING_PLAN_POLICY_VERSION,
      splitPolicyVersion: split.policyVersion,
      assemblyPolicyVersion: assembled.policyVersion,
      catalogManifestHash: assembled.catalogManifestHash,
      eligiblePoolSize: pool.ids.length,
      trace: assembled.trace,
    },
  }
}
