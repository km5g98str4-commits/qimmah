// Candidate-exercise eligibility + deterministic ranking ([CTO-QAE-007] §E–§G).
//
// Two explicit evaluation modes:
//   PARITY             — reproduces the characterized legacy 4-stage selector
//                        (hardExclude → suitability → rank) byte-comparably
//                        against the 17 training goldens.
//   APPROVED_DEVIATION — the QAE staged order (§E): MovementPattern →
//                        RequiredEquipment → Safety → Difficulty → Stability →
//                        FatigueCost → preference/history scoring → rank.
//                        Every behavioral difference from legacy is a NAMED
//                        deviation in Contracts/training/approved-deviations.json.
//
// Determinism (§F): no registration order, no object iteration order, no
// locale, no translated names. Final tie-break: ordinal exerciseId.
// Same profile + catalog manifest + policy version ⇒ same ranking.

import { ordinalCompare } from '../Shared/numeric'
import type { ExerciseCatalog, ExerciseMetadata } from '../Catalog/model'
import { checkCatalogIntegrity } from '../Catalog/model'
import type { TrainingCapabilityProfile } from './capability'
import type { MovementRequirement } from './requirements'

export const TRAINING_SELECTION_POLICY_VERSION = '1.0.0'

export type EvaluationMode = 'PARITY' | 'APPROVED_DEVIATION'

export type ExclusionReason =
  | 'missing_metadata'
  | 'environment'
  | 'equipment'
  | 'safety_contraindication'
  | 'user_excluded'
  | 'level_cap'
  | 'stability_cap'
  | 'fatigue_cap'
  | 'pattern_mismatch'

export interface Exclusion {
  exerciseId: string
  reason: ExclusionReason
  /** which rule fired — auditable, mirrors blocklist-migration ruleIds */
  ruleId: string
}

export interface RankedCandidate {
  exerciseId: string
  scoreCenti: number
  parts: Record<string, number>
}

export interface CandidateResult {
  mode: EvaluationMode
  policyVersion: string
  catalogManifestHash: string
  ranked: RankedCandidate[]
  excluded: Exclusion[]
}

// ── Characterized legacy scoring tables (exerciseSelection.ts, verbatim) ─────
const GOAL_PATTERN_BONUS: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  bulk: { push: 3, pull: 3, squat: 3, hinge: 2, isolation: 2 },
  cut: { push: 2, pull: 2, squat: 2, hinge: 2, cardio: 3, isolation: 1 },
  maintain: { push: 2, pull: 2, squat: 2, hinge: 2, core: 2, mobility: 1 },
}

const LEVELS: readonly string[] = ['beginner', 'intermediate', 'advanced']

/** Characterized legacy area→detailed-muscle load map (exerciseSelection.ts AREA_TO_DETAILED). */
export const AREA_TO_DETAILED: Readonly<Record<string, readonly string[]>> = {
  shoulder: ['front_delts', 'side_delts', 'rear_delts'],
  elbow: ['biceps', 'triceps', 'forearms'],
  wrist: ['forearms'],
  lower_back: ['lower_back'],
  upper_back: ['upper_back', 'traps', 'lats'],
  hip: ['glutes', 'hamstrings'],
  knee: ['quads', 'hamstrings'],
  ankle: ['calves'],
  neck: ['traps'],
  core: ['abs', 'obliques'],
}

/** PARITY-mode profile view — the characterized legacy selector inputs. */
export interface ParityProfileView {
  place: 'gym' | 'home' | 'outdoor' | 'mixed'
  equipment: string[]
  excludedExercises: string[]
  activeLimitationAreas: string[]
  needsClearance: boolean
  excludedPatterns: string[]
  excludedMuscles: string[]
  noOverhead: boolean
  noImpact: boolean
  maxExerciseLevel: 'beginner' | 'intermediate' | 'advanced'
  primaryGoal: 'cut' | 'bulk' | 'maintain'
  preferredExercises: string[]
  trainingStyle: 'machines' | 'free_weights' | 'bodyweight' | 'mixed'
  musclePriorities: string[]
  requiredPatterns: string[]
}

function environmentAllowsLegacy(ex: ExerciseMetadata, place: ParityProfileView['place']): boolean {
  if (ex.legacyEnvironment === 'both') return true
  if (place === 'gym') return ex.legacyEnvironment === 'gym'
  if (place === 'home') return ex.legacyEnvironment === 'home'
  if (place === 'outdoor') return ex.legacyEnvironment === 'home'
  return true
}

function isOverheadTagged(ex: ExerciseMetadata): boolean {
  return ex.contraindications.includes('overhead')
}
function isImpactTagged(ex: ExerciseMetadata): boolean {
  return ex.contraindications.includes('impact')
}
function touchesArea(ex: ExerciseMetadata, areas: readonly string[]): boolean {
  const detailed = new Set<string>([...ex.primaryMuscles, ...ex.secondaryMuscles])
  return areas.some((area) => (AREA_TO_DETAILED[area] ?? []).some((m) => detailed.has(m)))
}

function styleBonusLegacy(style: ParityProfileView['trainingStyle'], ex: ExerciseMetadata): number {
  if (style === 'machines') return ex.equipmentRequired.includes('machine') || ex.equipmentRequired.includes('cable') ? 3 : 0
  if (style === 'free_weights') return ex.equipmentRequired.includes('barbell') || ex.equipmentRequired.includes('dumbbell') ? 3 : 0
  if (style === 'bodyweight') return ex.equipmentRequired.includes('bodyweight') ? 3 : 0
  return 1
}

/**
 * PARITY mode — the characterized legacy 4-stage pipeline over QAE metadata.
 * Exclusion checks run in the LEGACY order (first reason wins).
 * Deviation D1 (approved by [CTO-QAE-007] §F): tie-break is ordinal
 * exerciseId, never locale-collated.
 */
export function selectCandidatesParity(catalog: ExerciseCatalog, view: ParityProfileView): CandidateResult {
  const excluded: Exclusion[] = []
  const kept: ExerciseMetadata[] = []
  const banned = new Set(view.excludedExercises.map((id) => catalog.aliases[id] ?? id))
  const owned = new Set(view.equipment)
  // Deterministic iteration: catalog sorted by exerciseId (extraction guarantees it; re-sort defensively).
  const pool = [...catalog.exercises].sort((a, b) => ordinalCompare(a.exerciseId, b.exerciseId))

  for (const ex of pool) {
    if (banned.has(ex.exerciseId)) { excluded.push({ exerciseId: ex.exerciseId, reason: 'user_excluded', ruleId: 'legacy-user-excluded' }); continue }
    if (!environmentAllowsLegacy(ex, view.place)) { excluded.push({ exerciseId: ex.exerciseId, reason: 'environment', ruleId: 'legacy-environment' }); continue }
    if (!ex.equipmentRequired.every((e) => owned.has(e))) { excluded.push({ exerciseId: ex.exerciseId, reason: 'equipment', ruleId: 'legacy-equipment-gate' }); continue }
    if (view.excludedPatterns.includes(ex.movementPattern)) { excluded.push({ exerciseId: ex.exerciseId, reason: 'safety_contraindication', ruleId: 'legacy-safety-pattern' }); continue }
    if (view.excludedMuscles.includes(ex.primaryMuscleCoarse)) { excluded.push({ exerciseId: ex.exerciseId, reason: 'safety_contraindication', ruleId: 'legacy-safety-muscle' }); continue }
    if (view.activeLimitationAreas.length > 0 && view.needsClearance && touchesArea(ex, view.activeLimitationAreas)) {
      excluded.push({ exerciseId: ex.exerciseId, reason: 'safety_contraindication', ruleId: 'legacy-safety-area-touch' }); continue
    }
    if (view.noOverhead && isOverheadTagged(ex)) { excluded.push({ exerciseId: ex.exerciseId, reason: 'safety_contraindication', ruleId: 'legacy-overhead' }); continue }
    if (view.noImpact && isImpactTagged(ex)) { excluded.push({ exerciseId: ex.exerciseId, reason: 'safety_contraindication', ruleId: 'legacy-impact' }); continue }
    kept.push(ex)
  }

  const cap = LEVELS.indexOf(view.maxExerciseLevel) + 1
  const suitable: ExerciseMetadata[] = []
  for (const ex of kept) {
    if (ex.technicalDifficulty > cap) { excluded.push({ exerciseId: ex.exerciseId, reason: 'level_cap', ruleId: 'legacy-level-cap' }); continue }
    suitable.push(ex)
  }

  const preferred = new Set(view.preferredExercises.map((id) => catalog.aliases[id] ?? id))
  const priorities = new Set(view.musclePriorities)
  const goalBonus = GOAL_PATTERN_BONUS[view.primaryGoal] ?? {}
  const ranked = suitable
    .map((ex) => {
      const parts: Record<string, number> = {
        goal: goalBonus[ex.movementPattern] ?? 0,
        preference: preferred.has(ex.exerciseId) ? 5 : 0,
        style: styleBonusLegacy(view.trainingStyle, ex),
        priority: priorities.has(ex.primaryMuscleCoarse) ? 4 : 0,
        level: 2 - Math.abs(ex.technicalDifficulty - cap),
        pattern: view.requiredPatterns.includes(ex.movementPattern) ? 3 : 0,
        quality: ex.declaredSubstitutes.length > 0 ? 1 : 0,
      }
      let score = 0
      for (const k of Object.keys(parts).sort(ordinalCompare)) score += parts[k]
      return { exerciseId: ex.exerciseId, scoreCenti: score * 100, parts }
    })
    .sort((a, b) => (b.scoreCenti !== a.scoreCenti ? b.scoreCenti - a.scoreCenti : ordinalCompare(a.exerciseId, b.exerciseId)))

  return { mode: 'PARITY', policyVersion: TRAINING_SELECTION_POLICY_VERSION, catalogManifestHash: catalog.catalogManifestHash, ranked, excluded }
}

/**
 * APPROVED_DEVIATION mode — the QAE staged order (§E) over capability profile
 * + movement requirement. Missing metadata is FAIL-SAFE ineligibility (never a
 * guess). Beginner machine-dominance and style are RANKING preferences —
 * safety and suitability stages run first and outrank them.
 */
export function selectCandidates(
  catalog: ExerciseCatalog,
  capability: TrainingCapabilityProfile,
  requirement: MovementRequirement,
  history?: { preferredExerciseIds?: string[]; excludedExerciseIds?: string[]; recentlyUsedExerciseIds?: string[] },
): CandidateResult {
  const excluded: Exclusion[] = []
  const integrityIssues = new Set(checkCatalogIntegrity(catalog).map((i) => i.exerciseId))
  const banned = new Set((history?.excludedExerciseIds ?? []).map((id) => catalog.aliases[id] ?? id))
  const preferred = new Set((history?.preferredExerciseIds ?? []).map((id) => catalog.aliases[id] ?? id))
  const recent = new Set((history?.recentlyUsedExerciseIds ?? []).map((id) => catalog.aliases[id] ?? id))
  const pool = [...catalog.exercises].sort((a, b) => ordinalCompare(a.exerciseId, b.exerciseId))
  const constraintSet = new Set(capability.injuryConstraints)

  const survivors: ExerciseMetadata[] = []
  for (const ex of pool) {
    // Fail-safe: structurally broken metadata never reaches a plan.
    if (integrityIssues.has(ex.exerciseId)) { excluded.push({ exerciseId: ex.exerciseId, reason: 'missing_metadata', ruleId: 'qae-metadata-failsafe' }); continue }
    // Stage 1 — MovementPattern / muscle requirement.
    const muscleOk = requirement.muscles.includes(ex.primaryMuscleCoarse)
    const roleOk = requirement.role === 'any' || ex.mechanics === requirement.role
    if (!muscleOk || !roleOk) { excluded.push({ exerciseId: ex.exerciseId, reason: 'pattern_mismatch', ruleId: 'qae-requirement' }); continue }
    // Stage 2 — RequiredEquipment via capabilities (bodyweight always granted).
    const capOk = ex.minimumEquipmentCapability.every((e) => capability.equipmentCapabilities[e] === true)
    if (!capOk) { excluded.push({ exerciseId: ex.exerciseId, reason: 'equipment', ruleId: 'legacy-equipment-gate' }); continue }
    // Stage 3 — Safety / contraindications (outranks everything below).
    if (banned.has(ex.exerciseId)) { excluded.push({ exerciseId: ex.exerciseId, reason: 'user_excluded', ruleId: 'legacy-user-excluded' }); continue }
    const hit = ex.contraindications.find((t) => constraintSet.has(t))
    if (hit !== undefined) { excluded.push({ exerciseId: ex.exerciseId, reason: 'safety_contraindication', ruleId: `legacy-injury-${hit}` }); continue }
    // Stage 4 — Experience/Difficulty ceiling.
    if (ex.technicalDifficulty > capability.exerciseComplexityCeiling) { excluded.push({ exerciseId: ex.exerciseId, reason: 'level_cap', ruleId: 'legacy-level-cap' }); continue }
    // Stage 5 — Stability ceiling.
    if (ex.stabilityDemand > capability.stabilityCeiling) { excluded.push({ exerciseId: ex.exerciseId, reason: 'stability_cap', ruleId: 'qae-stability-ceiling' }); continue }
    // Stage 6 — Fatigue-cost ceiling (conservative returning ramp).
    if (ex.fatigueCost > capability.fatigueCeiling) { excluded.push({ exerciseId: ex.exerciseId, reason: 'fatigue_cap', ruleId: 'qae-fatigue-ceiling' }); continue }
    survivors.push(ex)
  }

  // Stages 7–8 — preference & history: SCORING only, never filters.
  const ranked = survivors
    .map((ex) => {
      const parts: Record<string, number> = {}
      parts.patternFit = requirement.patterns && requirement.patterns.includes(ex.movementPattern) ? 300 : 0
      parts.machinePolicy = capability.machineDominantPolicy && ex.loadMedium === 'machine' ? 250 : 0
      parts.style =
        capability.preferredTrainingStyle === 'machines' && (ex.loadMedium === 'machine' || ex.loadMedium === 'cable') ? 150
        : capability.preferredTrainingStyle === 'free_weights' && ex.loadMedium === 'freeWeight' ? 150
        : capability.preferredTrainingStyle === 'bodyweight' && ex.loadMedium === 'bodyweight' ? 150
        : capability.preferredTrainingStyle === 'mixed' ? 50
        : 0
      parts.preference = preferred.has(ex.exerciseId) ? 200 : 0
      parts.historyNovelty = recent.has(ex.exerciseId) ? -100 : 0
      parts.bandFit = ex.suitableExperienceBands.includes(capability.experienceBand) ? 100 : 0
      parts.substitutable = ex.declaredSubstitutes.length > 0 ? 25 : 0
      let score = 0
      for (const k of Object.keys(parts).sort(ordinalCompare)) score += parts[k]
      return { exerciseId: ex.exerciseId, scoreCenti: score, parts }
    })
    .sort((a, b) => (b.scoreCenti !== a.scoreCenti ? b.scoreCenti - a.scoreCenti : ordinalCompare(a.exerciseId, b.exerciseId)))

  return { mode: 'APPROVED_DEVIATION', policyVersion: TRAINING_SELECTION_POLICY_VERSION, catalogManifestHash: catalog.catalogManifestHash, ranked, excluded }
}
