// Substitution engine ([CTO-QAE-013] §6).
//
// Pure · deterministic · integer-only · locale-independent. No UI strings, no
// question ids, no Date, no locale collation.
//
// PRECEDENCE DOES NOT OVERRIDE ELIGIBILITY. This is the governing rule and the
// reason eligibility is applied as a gate *before* tiering rather than as a
// score: a declared substitute that is unsafe, contraindicated, out of the
// experience band, or unavailable in the athlete's environment is SKIPPED, not
// preferred. Preference only orders the survivors.
//
//   tier 1  declared substitute        (metadata.declaredSubstitutes, in order)
//   tier 2  same substitutionGroup
//   tier 3  same movement pattern
//   within a tier: equipment closeness → stability/complexity closeness
//                  → ordinal exerciseId  (never a localized name — defect L-TRN-2)
//
// Returns an explicit `none` result when nothing eligible exists; it never
// falls back to the original exercise.

import { ordinalCompare } from '../Shared/numeric'
import type { ContraindicationTag, ExerciseCatalog, ExerciseMetadata } from '../Catalog/model'
import type { ExperienceBand } from '../Catalog/model'

export const TRAINING_SUBSTITUTION_POLICY_VERSION = '1.0.0'

export type SubstitutionTier = 'declared' | 'group' | 'pattern'

export type SubstitutionRejectionReason =
  | 'isOriginal'
  | 'notInEligiblePool'
  | 'explicitlyExcluded'
  | 'contraindicated'
  | 'experienceBandExceeded'
  | 'technicalDifficultyExceeded'
  | 'stabilityDemandExceeded'
  | 'unknownExerciseId'

export interface SubstitutionContext {
  /** ids available in the athlete's environment (equipment already resolved) */
  eligibleIds: readonly string[]
  /** ids removed for safety/preference — never returned at any tier */
  excludedIds: readonly string[]
  experienceBand: ExperienceBand
  maxTechnicalDifficulty: 1 | 2 | 3
  maxStabilityDemand: 1 | 2 | 3
  /** injury/movement tags the athlete must avoid */
  contraindicatedTags: readonly ContraindicationTag[]
}

export interface SubstitutionRejection {
  exerciseId: string
  tier: SubstitutionTier
  reason: SubstitutionRejectionReason
}

export type SubstitutionResult =
  | {
      kind: 'substitute'
      exerciseId: string
      tier: SubstitutionTier
      /** every candidate considered and refused, in evaluation order */
      rejected: readonly SubstitutionRejection[]
      policyVersion: string
      catalogManifestHash: string
    }
  | {
      kind: 'none'
      reason: 'noEligibleCandidate'
      rejected: readonly SubstitutionRejection[]
      policyVersion: string
      catalogManifestHash: string
    }

const BAND_RANK: Readonly<Record<ExperienceBand, number>> = { beginner: 0, intermediate: 1, advanced: 2 }

/**
 * The eligibility gate. Applied identically at every tier — which is what makes
 * "precedence does not override eligibility" structural rather than a comment.
 */
function rejectionFor(
  candidate: ExerciseMetadata | undefined,
  candidateId: string,
  originalId: string,
  ctx: SubstitutionContext,
  eligible: ReadonlySet<string>,
  excluded: ReadonlySet<string>,
): SubstitutionRejectionReason | null {
  if (candidate === undefined) return 'unknownExerciseId'
  if (candidateId === originalId) return 'isOriginal'
  if (excluded.has(candidateId)) return 'explicitlyExcluded'
  if (!eligible.has(candidateId)) return 'notInEligiblePool'
  for (const tag of ctx.contraindicatedTags) {
    if (candidate.contraindications.includes(tag) || candidate.jointStress.includes(tag)) return 'contraindicated'
  }
  const allowed = candidate.suitableExperienceBands
  if (allowed.length > 0 && !allowed.includes(ctx.experienceBand)) {
    // An exercise whose lowest suitable band is above the athlete's is out.
    const minBand = Math.min(...allowed.map((b) => BAND_RANK[b]))
    if (BAND_RANK[ctx.experienceBand] < minBand) return 'experienceBandExceeded'
  }
  if (candidate.technicalDifficulty > ctx.maxTechnicalDifficulty) return 'technicalDifficultyExceeded'
  if (candidate.stabilityDemand > ctx.maxStabilityDemand) return 'stabilityDemandExceeded'
  return null
}

/** Equipment closeness: how much of the original's kit the candidate reuses. */
function equipmentDistance(original: ExerciseMetadata, candidate: ExerciseMetadata): number {
  const want = new Set(original.equipmentRequired)
  let shared = 0
  for (const e of candidate.equipmentRequired) if (want.has(e)) shared++
  const union = new Set([...original.equipmentRequired, ...candidate.equipmentRequired]).size
  // integer-only: smaller is closer
  return union - shared
}

function profileDistance(original: ExerciseMetadata, candidate: ExerciseMetadata): number {
  return (
    Math.abs(original.stabilityDemand - candidate.stabilityDemand) +
    Math.abs(original.technicalDifficulty - candidate.technicalDifficulty)
  )
}

function orderCandidates(original: ExerciseMetadata, list: readonly ExerciseMetadata[]): ExerciseMetadata[] {
  return [...list].sort(
    (a, b) =>
      equipmentDistance(original, a) - equipmentDistance(original, b) ||
      profileDistance(original, a) - profileDistance(original, b) ||
      ordinalCompare(a.exerciseId, b.exerciseId),
  )
}

/**
 * Find the best eligible substitute for `originalId`, or an explicit `none`.
 * Deterministic: identical inputs (in any catalog order) give identical output.
 */
export function findSubstitute(
  catalog: ExerciseCatalog,
  originalId: string,
  ctx: SubstitutionContext,
): SubstitutionResult {
  const byId = new Map(catalog.exercises.map((e) => [e.exerciseId, e]))
  const eligible = new Set(ctx.eligibleIds)
  const excluded = new Set(ctx.excludedIds)
  const rejected: SubstitutionRejection[] = []
  const original = byId.get(originalId)

  const envelope = (tier: SubstitutionTier, ids: readonly string[]): string | null => {
    const survivors: ExerciseMetadata[] = []
    // Evaluate in a deterministic order so `rejected` is stable too.
    for (const id of [...new Set(ids)].sort(ordinalCompare)) {
      const cand = byId.get(id)
      const reason = rejectionFor(cand, id, originalId, ctx, eligible, excluded)
      if (reason !== null) {
        rejected.push({ exerciseId: id, tier, reason })
        continue
      }
      survivors.push(cand as ExerciseMetadata)
    }
    if (survivors.length === 0) return null
    if (original === undefined) return survivors.sort((a, b) => ordinalCompare(a.exerciseId, b.exerciseId))[0].exerciseId
    return orderCandidates(original, survivors)[0].exerciseId
  }

  const done = (exerciseId: string, tier: SubstitutionTier): SubstitutionResult => ({
    kind: 'substitute',
    exerciseId,
    tier,
    rejected,
    policyVersion: TRAINING_SUBSTITUTION_POLICY_VERSION,
    catalogManifestHash: catalog.catalogManifestHash,
  })

  if (original === undefined) {
    return {
      kind: 'none',
      reason: 'noEligibleCandidate',
      rejected: [{ exerciseId: originalId, tier: 'declared', reason: 'unknownExerciseId' }],
      policyVersion: TRAINING_SUBSTITUTION_POLICY_VERSION,
      catalogManifestHash: catalog.catalogManifestHash,
    }
  }

  // Tier 1 — declared substitutes, in their declared order (still gated).
  const declaredPick = envelope('declared', original.declaredSubstitutes)
  if (declaredPick !== null) return done(declaredPick, 'declared')

  // Tier 2 — same substitutionGroup.
  const groupIds = catalog.exercises
    .filter((e) => e.exerciseId !== originalId && e.substitutionGroup === original.substitutionGroup)
    .map((e) => e.exerciseId)
  const groupPick = envelope('group', groupIds)
  if (groupPick !== null) return done(groupPick, 'group')

  // Tier 3 — same movement pattern.
  const patternIds = catalog.exercises
    .filter((e) => e.exerciseId !== originalId && e.movementPattern === original.movementPattern)
    .map((e) => e.exerciseId)
  const patternPick = envelope('pattern', patternIds)
  if (patternPick !== null) return done(patternPick, 'pattern')

  return {
    kind: 'none',
    reason: 'noEligibleCandidate',
    rejected,
    policyVersion: TRAINING_SUBSTITUTION_POLICY_VERSION,
    catalogManifestHash: catalog.catalogManifestHash,
  }
}
