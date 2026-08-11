// Performance record + load contract ([CTO-QAE-019] §3-§9).
//
// Records what actually happened, and normalizes it into the facts a FUTURE
// progression evaluator needs. It makes NO progression decision: no add-weight,
// add-reps, double progression, deload, plateau or weekly adaptation.
//
// Pure · deterministic · integer-only · locale-independent · timezone-independent.
// No UI strings, no question ids.

import { ordinalCompare } from '../Shared/numeric'
import type { Now } from '../Shared/core'
import type { ProgressionKind } from '../Catalog/model'

export const PERFORMANCE_SCHEMA_VERSION = '1.0.0'

// ── Load model (§4) ────────────────────────────────────────────────────────
//
// Not every exercise has kilograms. The load is a discriminated union so an
// ambiguous or absent value can never masquerade as "0 kg", and so a machine
// stack number is never comparable to an absolute mass.

/** Canonical mass unit: GRAMS. Integer-only; conversion belongs at the edges. */
export type Grams = number

export type Load =
  /** external mass, e.g. barbell total including bar */
  | { kind: 'externalGrams'; grams: Grams }
  /**
   * dumbbells. `perHandGrams` is the ONLY accepted encoding — a single "total"
   * number is rejected at validation, because per-hand vs total silently
   * alternating is the classic corruption in lifting logs.
   */
  | { kind: 'dumbbellPerHandGrams'; perHandGrams: Grams; hands: 1 | 2 }
  /** bodyweight movement carrying no external load — NOT the same as 0 kg */
  | { kind: 'bodyweightOnly' }
  /** bodyweight plus added mass (weighted pull-up, dip belt) */
  | { kind: 'bodyweightPlusGrams'; addedGrams: Grams }
  /** assisted bodyweight (assist machine/band reduces effective load) */
  | { kind: 'bodyweightAssistedGrams'; assistGrams: Grams }
  /**
   * machine stack position. Deliberately NOT grams: stack numbers are not
   * comparable across machines, so they carry the machine id and stay opaque.
   */
  | { kind: 'machineStackStep'; step: number; machineExerciseId: string }
  /** explicitly unknown — recorded, never inferred */
  | { kind: 'unknown' }

export type LoadError =
  | 'negativeLoad'
  | 'nonFiniteLoad'
  | 'nonIntegerLoad'
  | 'ambiguousDumbbellEncoding'
  | 'machineStackNotComparable'

export type LoadValidation = { ok: true } | { ok: false; error: LoadError }

/** §5 — typed errors for ambiguity; nothing is coerced. */
export function validateLoad(load: Load): LoadValidation {
  const num = (v: number): LoadError | null => {
    if (!Number.isFinite(v)) return 'nonFiniteLoad'
    if (!Number.isSafeInteger(v)) return 'nonIntegerLoad'
    if (v < 0) return 'negativeLoad'
    return null
  }
  switch (load.kind) {
    case 'externalGrams': {
      const e = num(load.grams)
      return e === null ? { ok: true } : { ok: false, error: e }
    }
    case 'dumbbellPerHandGrams': {
      const e = num(load.perHandGrams)
      if (e !== null) return { ok: false, error: e }
      if (load.hands !== 1 && load.hands !== 2) return { ok: false, error: 'ambiguousDumbbellEncoding' }
      return { ok: true }
    }
    case 'bodyweightPlusGrams': {
      const e = num(load.addedGrams)
      return e === null ? { ok: true } : { ok: false, error: e }
    }
    case 'bodyweightAssistedGrams': {
      const e = num(load.assistGrams)
      return e === null ? { ok: true } : { ok: false, error: e }
    }
    case 'machineStackStep': {
      const e = num(load.step)
      if (e !== null) return { ok: false, error: e }
      if (load.machineExerciseId.length === 0) return { ok: false, error: 'machineStackNotComparable' }
      return { ok: true }
    }
    case 'bodyweightOnly':
    case 'unknown':
      return { ok: true }
    default: {
      const never: never = load
      return never
    }
  }
}

/** Is the load a known, comparable quantity a progression rule could act on? */
export function isLoadKnown(load: Load): boolean {
  switch (load.kind) {
    case 'externalGrams':
    case 'dumbbellPerHandGrams':
    case 'bodyweightPlusGrams':
    case 'bodyweightAssistedGrams':
      return true
    // A machine stack step is RECORDED but not comparable across machines, so a
    // progression rule may not treat it as a load quantity without the machine
    // context. Reported honestly rather than promoted.
    case 'machineStackStep':
    case 'bodyweightOnly':
    case 'unknown':
      return false
    default: {
      const never: never = load
      return never
    }
  }
}

// ── Completion (§6) ────────────────────────────────────────────────────────

export type SetCompletionStatus = 'completed' | 'partial' | 'skipped' | 'notStarted'

export interface CompletedSet {
  exerciseId: string
  /** 0-based, semantically meaningful — sets are NEVER reordered */
  setIndex: number
  prescribedReps: number
  actualReps: number
  load: Load
  /** reported RIR; absent means not reported — never inferred */
  achievedRir?: number
  completionStatus: SetCompletionStatus
}

export interface CompletedExercise {
  exerciseId: string
  prescribedSets: number
  prescribedRepMin: number
  prescribedRepMax: number
  prescribedRir: number
  sets: readonly CompletedSet[]
}

export interface CompletedSession {
  planVersionId: string
  sessionId: string
  dayId: string
  startedAt: Now
  completedAt?: Now
  exercises: readonly CompletedExercise[]
}

// ── Accepted progression policy (§8) ───────────────────────────────────────
//
// Makes the charter Q4 boundary explicit BEFORE Wave 10 executes it: accepting
// a plan means accepting a progression METHOD, so a load increment that
// satisfies the accepted criteria is plan EXECUTION, not a silent plan change.
// No decision is made here.

export interface AcceptedProgressionPolicy {
  method: ProgressionKind
  policyVersion: string
  rulesVersion: string
  /** empty = applies to every exercise in the plan */
  applicableExerciseIds: readonly string[]
  applicableEquipmentClasses: readonly string[]
}

// ── Performance evidence (§9) ──────────────────────────────────────────────

export type EvidenceConfidence = 'none' | 'low' | 'moderate' | 'high'

export interface ExercisePerformanceEvidence {
  exerciseId: string
  prescribedSets: number
  prescribedSetsAttempted: number
  prescribedSetsCompleted: boolean
  /** every completed set reached at least the prescribed rep minimum */
  repTargetReached: boolean
  /** any set exceeded the prescribed rep maximum */
  repTopExceeded: boolean
  achievedRirAvailable: boolean
  /** lowest reported RIR across sets, when reported */
  minAchievedRir?: number
  loadKnown: boolean
  performanceComplete: boolean
  evidenceConfidence: EvidenceConfidence
}

export interface PerformanceEvidence {
  schemaVersion: string
  planVersionId: string
  sessionId: string
  dayId: string
  exercises: readonly ExercisePerformanceEvidence[]
  sessionComplete: boolean
  evidenceConfidence: EvidenceConfidence
}

/**
 * CompletedSession → PerformanceEvidence. Facts only; NO recommendation.
 * Missing performance is never inferred: an unreported RIR stays unavailable,
 * an unknown load stays unknown, and a skipped set is not treated as a failure
 * to hit reps.
 */
export function toPerformanceEvidence(session: CompletedSession): PerformanceEvidence {
  const exercises: ExercisePerformanceEvidence[] = session.exercises
    .map((ex) => {
      // Sets are ordered by their semantically meaningful index, never by input
      // order — but they are NOT reordered by any other key.
      const sets = [...ex.sets].sort((a, b) => a.setIndex - b.setIndex)
      const attempted = sets.filter((s) => s.completionStatus === 'completed' || s.completionStatus === 'partial')
      const completed = sets.filter((s) => s.completionStatus === 'completed')
      const rirs = sets.map((s) => s.achievedRir).filter((v): v is number => typeof v === 'number')
      const loadKnown = sets.length > 0 && sets.every((s) => isLoadKnown(s.load))
      const prescribedSetsCompleted = completed.length >= ex.prescribedSets
      const repTargetReached = completed.length > 0 && completed.every((s) => s.actualReps >= ex.prescribedRepMin)
      const repTopExceeded = completed.some((s) => s.actualReps > ex.prescribedRepMax)
      const performanceComplete = prescribedSetsCompleted && loadKnown && rirs.length === sets.length

      let confidence: EvidenceConfidence = 'none'
      if (attempted.length === 0) confidence = 'none'
      else if (!prescribedSetsCompleted) confidence = 'low'
      else if (!loadKnown || rirs.length === 0) confidence = 'moderate'
      else confidence = 'high'

      return {
        exerciseId: ex.exerciseId,
        prescribedSets: ex.prescribedSets,
        prescribedSetsAttempted: attempted.length,
        prescribedSetsCompleted,
        repTargetReached,
        repTopExceeded,
        achievedRirAvailable: rirs.length > 0,
        ...(rirs.length > 0 ? { minAchievedRir: Math.min(...rirs) } : {}),
        loadKnown,
        performanceComplete,
        evidenceConfidence: confidence,
      }
    })
    .sort((a, b) => ordinalCompare(a.exerciseId, b.exerciseId))

  const sessionComplete = exercises.length > 0 && exercises.every((e) => e.prescribedSetsCompleted)
  const worst: EvidenceConfidence = exercises.reduce<EvidenceConfidence>((acc, e) => {
    const rank: Record<EvidenceConfidence, number> = { none: 0, low: 1, moderate: 2, high: 3 }
    return rank[e.evidenceConfidence] < rank[acc] ? e.evidenceConfidence : acc
  }, 'high')

  return {
    schemaVersion: PERFORMANCE_SCHEMA_VERSION,
    planVersionId: session.planVersionId,
    sessionId: session.sessionId,
    dayId: session.dayId,
    exercises,
    sessionComplete,
    evidenceConfidence: exercises.length === 0 ? 'none' : worst,
  }
}
