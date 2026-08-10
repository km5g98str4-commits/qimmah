// First-plan prescription ([CTO-QAE-018] §2, §4-§12).
//
// Answers ONLY "what should the user start with?" — sets, rep range, target
// RIR, rest. It never answers "what changes next week": no progression,
// overload, double progression, plateau detection, deload, weekly volume
// adaptation, adaptive RIR, or load/kg selection.
//
// Pure · deterministic · integer-only · locale-independent. No question ids, no
// raw onboarding answers, no UI strings. Every number resolves through a
// PolicyKey; the only literals here are structural (0, 1, array indices).
//
// Metadata is read ONLY through readPrescriptionMetadata(). Below CHARACTERIZED
// there is NO silent derived fallback — the slot is prescribed by the documented
// conservative policy and says so with a reason code.

import type { ExerciseCatalog, ExerciseMetadata } from '../Catalog/model'
import type { TrainingCapabilityProfile } from './capability'
import type { AssembledDay } from './assembly'
import type { ExpTier } from './assembly'
import { readPrescriptionMetadata, type CurationSet } from './prescriptionMetadata'
import { policy, PRESCRIPTION_POLICY_VERSION, type PrescriptionPolicyKey } from './prescriptionPolicy'

export type PrescriptionReasonCode =
  | 'prescription.beginnerConservativeVolume'
  | 'prescription.intermediateVolume'
  | 'prescription.advancedFirstPlanConservative'
  | 'prescription.returningVolumeReduced'
  | 'prescription.compoundRepRange'
  | 'prescription.isolationRepRange'
  | 'prescription.machineRepRange'
  | 'prescription.bodyweightRepRange'
  | 'prescription.conservativeRirTarget'
  | 'prescription.returningRirIncreased'
  | 'prescription.compoundRestInterval'
  | 'prescription.isolationRestInterval'
  | 'prescription.machineRestInterval'
  | 'prescription.metadataInsufficient'
  | 'prescription.perExerciseCeilingApplied'
  | 'prescription.sessionHardMaxReached'
  | 'prescription.slotUnprescribableAtHardMax'
  | 'prescription.sessionBelowMinimumWork'
  | 'prescription.minorPolicyConservative'

export interface RepRange {
  min: number
  max: number
}

export interface PrescribedSlot {
  exerciseId: string
  order: number
  optional: boolean
  sets: number
  repRange: RepRange
  targetRir: number
  restSeconds: number
  prescriptionReasonCodes: readonly PrescriptionReasonCode[]
  prescriptionPolicyVersion: string
}

export interface PrescribedDay {
  dayId: string
  kind: string
  slots: readonly PrescribedSlot[]
  totalWorkingSets: number
  /** [CTO-QAE-019] §2: true when the HARD_MAX left a slot unprescribable. */
  constrained: boolean
  reasonCodes: readonly PrescriptionReasonCode[]
}

export interface PrescriptionResult {
  days: readonly PrescribedDay[]
  policyVersion: string
  reasonCodes: readonly PrescriptionReasonCode[]
}

/** Exercise class used for rep/rest policy — role and pattern, not per-id overfit. */
type ExerciseClass = 'compound' | 'isolation' | 'machine' | 'bodyweight'

function classify(ex: ExerciseMetadata): ExerciseClass {
  if (ex.loadMedium === 'machine' || ex.equipmentRequired.includes('machine')) return 'machine'
  if (ex.loadMedium === 'bodyweight') return 'bodyweight'
  return ex.mechanics === 'compound' ? 'compound' : 'isolation'
}

const SETS_KEY: Readonly<Record<ExpTier, { compound: PrescriptionPolicyKey; isolation: PrescriptionPolicyKey }>> = {
  beginner: { compound: 'sets.beginner.compound', isolation: 'sets.beginner.isolation' },
  novice: { compound: 'sets.novice.compound', isolation: 'sets.novice.isolation' },
  intermediate: { compound: 'sets.intermediate.compound', isolation: 'sets.intermediate.isolation' },
  advanced: { compound: 'sets.advanced.compound', isolation: 'sets.advanced.isolation' },
}

const RIR_KEY: Readonly<Record<ExpTier, PrescriptionPolicyKey>> = {
  beginner: 'rir.beginner',
  novice: 'rir.novice',
  intermediate: 'rir.intermediate',
  advanced: 'rir.advanced',
}

const REPS_KEY: Readonly<Record<ExerciseClass, { min: PrescriptionPolicyKey; max: PrescriptionPolicyKey; code: PrescriptionReasonCode }>> = {
  compound: { min: 'reps.compound.min', max: 'reps.compound.max', code: 'prescription.compoundRepRange' },
  isolation: { min: 'reps.isolation.min', max: 'reps.isolation.max', code: 'prescription.isolationRepRange' },
  machine: { min: 'reps.machine.min', max: 'reps.machine.max', code: 'prescription.machineRepRange' },
  bodyweight: { min: 'reps.bodyweight.min', max: 'reps.bodyweight.max', code: 'prescription.bodyweightRepRange' },
}

const REST_KEY: Readonly<Record<ExerciseClass, { key: PrescriptionPolicyKey; code: PrescriptionReasonCode }>> = {
  compound: { key: 'rest.compound.seconds', code: 'prescription.compoundRestInterval' },
  isolation: { key: 'rest.isolation.seconds', code: 'prescription.isolationRestInterval' },
  machine: { key: 'rest.machine.seconds', code: 'prescription.machineRestInterval' },
  bodyweight: { key: 'rest.isolation.seconds', code: 'prescription.isolationRestInterval' },
}

const VOLUME_CODE: Readonly<Record<ExpTier, PrescriptionReasonCode>> = {
  beginner: 'prescription.beginnerConservativeVolume',
  novice: 'prescription.beginnerConservativeVolume',
  intermediate: 'prescription.intermediateVolume',
  advanced: 'prescription.advancedFirstPlanConservative',
}

export interface PrescribeInput {
  catalog: ExerciseCatalog
  capability: TrainingCapabilityProfile
  tier: ExpTier
  curation: CurationSet
  days: readonly AssembledDay[]
  /** minors are prescribed conservatively; safety policy is enforced upstream */
  isMinor: boolean
}

/**
 * Prescribe the first plan over an already-assembled set of days.
 * Exercise choice, order and optional flags are NOT touched — assembly owns
 * those, and this function must never reorder or add a slot.
 */
export function prescribeInitialPlan(input: PrescribeInput): PrescriptionResult {
  const byId = new Map(input.catalog.exercises.map((e) => [e.exerciseId, e]))
  const planCodes = new Set<PrescriptionReasonCode>()

  const days: PrescribedDay[] = input.days.map((day) => {
    const dayCodes = new Set<PrescriptionReasonCode>()
    let running = 0
    const hardMax = policy('sets.sessionWorkingSetHardMax')
    let constrained = false

    const slots: PrescribedSlot[] = day.exercises.map((slot) => {
      const codes = new Set<PrescriptionReasonCode>()
      const ex = byId.get(slot.exerciseId)
      const klass: ExerciseClass = ex === undefined ? 'isolation' : classify(ex)

      // ── metadata gate: no silent derived fallback ────────────────────────
      // fatigueCost is what a volume decision would lean on. Below
      // CHARACTERIZED we do NOT guess — we take the documented conservative
      // path (the beginner allocation) and say so.
      const fatigue = readPrescriptionMetadata(input.curation, slot.exerciseId, 'fatigueCost', 'CHARACTERIZED')
      const metadataOk = fatigue.ok
      if (!metadataOk) codes.add('prescription.metadataInsufficient')

      // ── sets ─────────────────────────────────────────────────────────────
      const effectiveTier: ExpTier = metadataOk ? input.tier : 'beginner'
      const mech: 'compound' | 'isolation' = ex?.mechanics === 'compound' ? 'compound' : 'isolation'
      let sets = policy(SETS_KEY[effectiveTier][mech])
      codes.add(VOLUME_CODE[effectiveTier])

      if (input.capability.returningStatus === 'returning') {
        sets = sets - policy('sets.returningReduction')
        codes.add('prescription.returningVolumeReduced')
      }
      if (input.isMinor) codes.add('prescription.minorPolicyConservative')

      const perExerciseCeiling = policy('sets.perExerciseCeiling')
      if (sets > perExerciseCeiling) {
        sets = perExerciseCeiling
        codes.add('prescription.perExerciseCeilingApplied')
      }
      if (sets < 1) sets = 1
      // [CTO-QAE-019] §2 — HARD_MAX (option A). totalWorkingSets may NEVER
      // exceed the configured maximum. Wave 8 called 24 a "ceiling" while
      // permitting exceedance via a one-set floor; that name was a lie about the
      // contract. The clamp is now absolute: a slot that cannot receive even one
      // set within the budget is prescribed ZERO sets and the day is returned as
      // an explicit CONSTRAINED result. Nothing is padded and nothing overflows.
      const remaining = hardMax - running
      if (sets > remaining) {
        sets = remaining > 0 ? remaining : 0
        codes.add('prescription.sessionHardMaxReached')
        dayCodes.add('prescription.sessionHardMaxReached')
      }
      if (sets === 0) {
        constrained = true
        codes.add('prescription.slotUnprescribableAtHardMax')
        dayCodes.add('prescription.slotUnprescribableAtHardMax')
      }
      running += sets

      // ── rep range ────────────────────────────────────────────────────────
      const rk = REPS_KEY[klass]
      const repRange: RepRange = { min: policy(rk.min), max: policy(rk.max) }
      codes.add(rk.code)

      // ── RIR ──────────────────────────────────────────────────────────────
      let targetRir = policy(RIR_KEY[effectiveTier])
      codes.add('prescription.conservativeRirTarget')
      if (input.capability.returningStatus === 'returning') {
        targetRir = targetRir + policy('rir.returningAdditional')
        codes.add('prescription.returningRirIncreased')
      }
      const rirFloor = policy('rir.minimumAllowed')
      if (targetRir < rirFloor) targetRir = rirFloor

      // ── rest ─────────────────────────────────────────────────────────────
      const restSpec = REST_KEY[klass]
      let restSeconds = policy(restSpec.key)
      codes.add(restSpec.code)
      const restMin = policy('rest.minSeconds')
      const restMax = policy('rest.maxSeconds')
      if (restSeconds < restMin) restSeconds = restMin
      if (restSeconds > restMax) restSeconds = restMax

      for (const c of codes) {
        dayCodes.add(c)
        planCodes.add(c)
      }
      return {
        exerciseId: slot.exerciseId,
        order: slot.order,
        optional: slot.optional,
        sets,
        repRange,
        targetRir,
        restSeconds,
        prescriptionReasonCodes: [...codes].sort(),
        prescriptionPolicyVersion: PRESCRIPTION_POLICY_VERSION,
      }
    })

    const totalWorkingSets = slots.reduce((n, s) => n + s.sets, 0)
    if (totalWorkingSets < policy('sets.sessionMinimumWorkingSets')) {
      // Reported, never padded: a constrained session stays honest.
      dayCodes.add('prescription.sessionBelowMinimumWork')
      planCodes.add('prescription.sessionBelowMinimumWork')
    }

    return { dayId: day.dayId, kind: day.kind, slots, totalWorkingSets, constrained, reasonCodes: [...dayCodes].sort() }
  })

  return { days, policyVersion: PRESCRIPTION_POLICY_VERSION, reasonCodes: [...planCodes].sort() }
}
