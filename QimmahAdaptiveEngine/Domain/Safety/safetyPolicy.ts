// QAE SafetyPolicy foundation ([CTO-QAE-002] Phase 1 scope).
//
// Structural non-bypassability: `IssuablePlan` can only be produced by
// `validatePlanCandidate` in this module. The type brand is compile-time;
// the WeakSet seal registry is the runtime guard — `assertIssuable` throws a
// named error for any plan object that did not pass through this module.
//
// Safety tiers are immutable ([CTO-QAE-002]): conflict resolution always
// begins with CRITICAL, and no host/config input can reorder or disable tiers.

import type { GoalType, ReasonCode, Sex } from '../Shared/core'
import { ADULT_MIN_AGE_YEARS, APP_MIN_AGE_YEARS } from '../Shared/core'
import { assertSafeInt } from '../Shared/numeric'

export type SafetyTier = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW'

export const SAFETY_TIER_ORDER: readonly SafetyTier[] = Object.freeze(['CRITICAL', 'HIGH', 'NORMAL', 'LOW'])

export interface SafetyProfileInput {
  sex: Sex
  /** null = unknown. Unknown age is NOT adult ([CTO-QAE-002] U1): it blocks. */
  ageYears: number | null
  requestedGoalType: GoalType
}

export interface PlanCandidateInput {
  goalType: GoalType
  calorieTargetKcal: number
}

export interface SafetyClamp {
  field: 'goalType' | 'calorieTargetKcal'
  original: string | number
  adjusted: string | number
  reasonCodes: ReasonCode[]
  tier: SafetyTier
  ruleId: string
}

export interface SafetyBlock {
  reasonCodes: ReasonCode[]
  tier: SafetyTier
  ruleId: string
}

declare const issuableSeal: unique symbol
/** Constructible only inside this module — the pipeline's required currency. */
export type IssuablePlan = PlanCandidateInput & { readonly [issuableSeal]: true }

export interface PlanValidationResult {
  verdict: 'pass' | 'clamped' | 'blocked'
  blocks: SafetyBlock[]
  clamps: SafetyClamp[]
  /** Present unless blocked. Sealed: the ONLY way to obtain an IssuablePlan. */
  plan?: IssuablePlan
}

// Runtime seal registry — the reference-identity guard behind the type brand.
const sealedPlans = new WeakSet<object>()

// Floors: characterized legacy values, PRODUCT_POLICY per EVIDENCE-REGISTER EVR-009.
const CALORIE_FLOOR_KCAL: Readonly<Record<Sex, number>> = Object.freeze({
  male: 1500,
  female: 1200,
  unspecified: 1350,
})

/** VLCD line: <800 kcal is never issuable unsupervised (EVR-009, VERIFIED_EVIDENCE). */
export const VLCD_KCAL = 800

/**
 * Checkpoint 1 (and the shared core of checkpoints 2b/3 for these domains).
 * Tier order is structural: CRITICAL rules run first and a CRITICAL block
 * short-circuits everything after it.
 */
export function validatePlanCandidate(profile: SafetyProfileInput, candidate: PlanCandidateInput): PlanValidationResult {
  const blocks: SafetyBlock[] = []
  const clamps: SafetyClamp[] = []
  let goalType = candidate.goalType
  let calorieTargetKcal = candidate.calorieTargetKcal
  assertSafeInt(calorieTargetKcal, 'validatePlanCandidate.calorieTargetKcal')

  // ---- CRITICAL ----
  // QAE-SAF-001: unknown age blocks finalization (supersedes L-SAF-1; [CTO-QAE-002] U1).
  if (profile.ageYears === null || !Number.isSafeInteger(profile.ageYears)) {
    blocks.push({ ruleId: 'QAE-SAF-001', tier: 'CRITICAL', reasonCodes: ['ageUnknownBlocking'] })
    return { verdict: 'blocked', blocks, clamps }
  }
  // QAE-SAF-002: app minimum age.
  if (profile.ageYears < APP_MIN_AGE_YEARS) {
    blocks.push({ ruleId: 'QAE-SAF-002', tier: 'CRITICAL', reasonCodes: ['ageBelowAppMinimum'] })
    return { verdict: 'blocked', blocks, clamps }
  }
  // QAE-SAF-003: minors goal restriction (characterized live policy, adopted).
  if (profile.ageYears < ADULT_MIN_AGE_YEARS && goalType !== 'maintain') {
    clamps.push({
      ruleId: 'QAE-SAF-003',
      tier: 'CRITICAL',
      field: 'goalType',
      original: goalType,
      adjusted: 'maintain',
      reasonCodes: ['minorGoalRestricted'],
    })
    goalType = 'maintain'
  }
  // QAE-SAF-004: VLCD territory is never issuable.
  if (calorieTargetKcal < VLCD_KCAL) {
    blocks.push({ ruleId: 'QAE-SAF-004', tier: 'CRITICAL', reasonCodes: ['vlcdBlocked'] })
    return { verdict: 'blocked', blocks, clamps }
  }

  // ---- HIGH ----
  // QAE-SAF-005: calorie floor by sex — clamps are visible, never silent.
  const floor = CALORIE_FLOOR_KCAL[profile.sex]
  if (calorieTargetKcal < floor) {
    clamps.push({
      ruleId: 'QAE-SAF-005',
      tier: 'HIGH',
      field: 'calorieTargetKcal',
      original: calorieTargetKcal,
      adjusted: floor,
      reasonCodes: ['calorieFloorApplied'],
    })
    calorieTargetKcal = floor
  }

  const sealed = { goalType, calorieTargetKcal } as IssuablePlan
  sealedPlans.add(sealed)
  return { verdict: clamps.length > 0 ? 'clamped' : 'pass', blocks, clamps, plan: sealed }
}

/**
 * Runtime non-bypass guard: downstream consumers call this on every plan they
 * receive. A plan that did not pass through validatePlanCandidate fails by name.
 */
export function assertIssuable(plan: object): void {
  if (!sealedPlans.has(plan)) {
    throw new Error('QAE-SAFETY-BYPASS: plan was not issued by SafetyPolicy.validatePlanCandidate')
  }
}

// ---- Composite legality (ChangeBudget guard, DECISION-MODEL §3.3) ----

export type CompositeComponent =
  | { kind: 'changeCalories'; deltaKcal: number }
  | { kind: 'changeStepTarget'; delta: number }
  | { kind: 'changeTrainingVolume'; deltaBp: number }
  | { kind: 'changeTrainingFrequency'; delta: number }
  | { kind: 'scheduleDeload' }
  | { kind: 'holdProgression' }

export interface CompositeCheckResult {
  allowed: boolean
  reasonCodes: ReasonCode[]
  offendingKinds: string[]
}

const MAX_COMPOSITE_COMPONENTS = 3

/** A recovery composite may contain ONLY protective components. */
function isProtective(component: CompositeComponent): boolean {
  switch (component.kind) {
    case 'changeCalories':
      return component.deltaKcal >= 0
    case 'changeStepTarget':
      return component.delta <= 0
    case 'changeTrainingVolume':
      return component.deltaBp <= 0
    case 'changeTrainingFrequency':
      return component.delta <= 0
    case 'scheduleDeload':
    case 'holdProgression':
      return true
  }
}

export function checkComposite(components: readonly CompositeComponent[]): CompositeCheckResult {
  if (components.length === 0 || components.length > MAX_COMPOSITE_COMPONENTS) {
    return { allowed: false, reasonCodes: ['compositeContainsNonProtectiveAction'], offendingKinds: ['size'] }
  }
  const offending = components.filter((c) => !isProtective(c)).map((c) => c.kind)
  if (offending.length > 0) {
    return { allowed: false, reasonCodes: ['compositeContainsNonProtectiveAction'], offendingKinds: offending }
  }
  return { allowed: true, reasonCodes: [], offendingKinds: [] }
}
