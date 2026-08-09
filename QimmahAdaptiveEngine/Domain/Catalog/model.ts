// ExerciseMetadataCatalog — canonical exercise metadata types ([CTO-QAE-007] §B).
// NO UI strings anywhere in this contract: exerciseId is the stable
// name-independent identity; display names live in host dictionaries.
// The catalog is DATA passed in (Contracts/exercises/exercise-catalog.qae.json);
// this module never reads files.

export type MovementPattern = 'push' | 'pull' | 'squat' | 'hinge' | 'lunge' | 'isolation' | 'core' | 'cardio' | 'mobility'
export type AxialLoad = 'none' | 'moderate' | 'high'
export type Laterality = 'bilateral' | 'unilateral'
export type Mechanics = 'compound' | 'isolation'
export type Support = 'supported' | 'unsupported'
export type LoadMedium = 'machine' | 'freeWeight' | 'cable' | 'bodyweight' | 'band'
export type ExperienceBand = 'beginner' | 'intermediate' | 'advanced'
export type ContraindicationTag = 'knee' | 'shoulder' | 'lower_back' | 'wrist' | 'elbow' | 'ankle' | 'overhead' | 'impact'
export type ProgressionKind = 'linear' | 'double' | 'rep' | 'timed'
export type MetadataConfidence = 'characterized' | 'derived' | 'assigned'

export interface ExerciseMetadata {
  /** stable canonical slug — never a display name, never localized */
  exerciseId: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  primaryMuscleCoarse: string
  movementPattern: MovementPattern
  /** ALL listed tools are required (characterized legacy rule) */
  equipmentRequired: string[]
  /** alternative complete equipment sets; empty = no legacy representation */
  equipmentAlternatives: string[][]
  technicalDifficulty: 1 | 2 | 3
  stabilityDemand: 1 | 2 | 3
  fatigueCost: 1 | 2 | 3
  axialLoad: AxialLoad
  jointStress: ContraindicationTag[]
  laterality: Laterality
  mechanics: Mechanics
  support: Support
  loadMedium: LoadMedium
  suitableExperienceBands: ExperienceBand[]
  /** evidence tags for metadata filtering — never diagnosis */
  contraindications: ContraindicationTag[]
  /** pattern:coarseMuscle same-shape family */
  substitutionGroup: string
  declaredSubstitutes: string[]
  progressionCompatibility: ProgressionKind[]
  /** capability keys that must ALL be present; empty = bodyweight-only */
  minimumEquipmentCapability: string[]
  legacyEnvironment: 'gym' | 'home' | 'both'
  metadataConfidence: MetadataConfidence
  provenance: { characterized: string; derived: string }
}

export interface ExerciseCatalog {
  schemaVersion: string
  exerciseCount: number
  /** legacy id → canonical id (identity stability across renames) */
  aliases: Record<string, string>
  /** the approved machines-only pool (characterized primaryMachineIdSet) */
  primaryMachineIds: string[]
  exercises: ExerciseMetadata[]
  catalogManifestHash: string
}

/** Resolve any id (legacy alias or canonical) to the canonical id. */
export function canonicalId(catalog: ExerciseCatalog, id: string): string {
  return catalog.aliases[id] ?? id
}

const REQUIRED_FIELDS: ReadonlyArray<keyof ExerciseMetadata> = [
  'exerciseId', 'primaryMuscles', 'secondaryMuscles', 'primaryMuscleCoarse', 'movementPattern',
  'equipmentRequired', 'equipmentAlternatives', 'technicalDifficulty', 'stabilityDemand',
  'fatigueCost', 'axialLoad', 'jointStress', 'laterality', 'mechanics', 'support', 'loadMedium',
  'suitableExperienceBands', 'contraindications', 'substitutionGroup', 'declaredSubstitutes',
  'progressionCompatibility', 'minimumEquipmentCapability', 'legacyEnvironment',
  'metadataConfidence', 'provenance',
]

export interface CatalogIntegrityIssue {
  exerciseId: string
  issue: string
}

/**
 * Structural integrity of a loaded catalog — named findings, no silent
 * tolerance. Missing metadata is a FAIL-SAFE condition: a downstream picker
 * must treat an exercise with integrity issues as ineligible, never guess.
 */
export function checkCatalogIntegrity(catalog: ExerciseCatalog): CatalogIntegrityIssue[] {
  const issues: CatalogIntegrityIssue[] = []
  const ids = new Set<string>()
  for (const ex of catalog.exercises) {
    for (const f of REQUIRED_FIELDS) {
      if (ex[f] === undefined || ex[f] === null) issues.push({ exerciseId: ex.exerciseId ?? '<missing-id>', issue: `missing field ${String(f)}` })
    }
    if (ids.has(ex.exerciseId)) issues.push({ exerciseId: ex.exerciseId, issue: 'duplicate exerciseId' })
    ids.add(ex.exerciseId)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(ex.exerciseId)) issues.push({ exerciseId: ex.exerciseId, issue: 'exerciseId is not a canonical slug' })
    for (const sub of ex.declaredSubstitutes) {
      if (!catalog.exercises.some((c) => c.exerciseId === sub)) issues.push({ exerciseId: ex.exerciseId, issue: `declared substitute '${sub}' not in catalog` })
    }
  }
  for (const [from, to] of Object.entries(catalog.aliases)) {
    if (!ids.has(to)) issues.push({ exerciseId: from, issue: `alias target '${to}' not in catalog` })
  }
  return issues
}
