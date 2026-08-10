// Prescription metadata curation + confidence gate ([CTO-QAE-015] §3, §7).
//
// Pure · deterministic · integer-only · locale-independent. No UI strings.
//
// WHY THIS LAYER EXISTS
// The catalog carries ONE metadataConfidence per exercise ('characterized' for all
// 181), yet its own provenance records that stabilityDemand / fatigueCost /
// axialLoad were DERIVED heuristically. A prescription consumer reading
// metadataConfidence would therefore treat a heuristic as a characterization.
// This layer adds PER-FIELD provenance and a gate that refuses to serve a field
// below the tier a decision requires.
//
// CATALOG VALUES ARE NOT MUTATED. Curation records the reviewed value beside the
// current catalog value; a disagreement becomes a `pendingCorrection` that does
// NOT feed selection or assembly. That is what makes 17/17 parity structurally
// undisturbable this wave ([CTO-QAE-015] §8).
//
// SCOPE: no sets, reps, load, volume, progression, deload or adaptation.

import { ordinalCompare } from '../Shared/numeric'
import type { AxialLoad, ExerciseCatalog, ExerciseMetadata } from '../Catalog/model'

export const PRESCRIPTION_METADATA_SCHEMA_VERSION = '1.0.0'

export type CuratedField = 'stabilityDemand' | 'fatigueCost' | 'axialLoad'

/** Tiers. VERIFIED_EVIDENCE is reserved for primary-source checks — currently none. */
export type MetadataConfidenceTier =
  | 'VERIFIED_EVIDENCE'
  | 'CHARACTERIZED'
  | 'PRODUCT_POLICY'
  | 'ASSUMPTION'
  | 'DERIVED'

const TIER_RANK: Readonly<Record<MetadataConfidenceTier, number>> = {
  VERIFIED_EVIDENCE: 4,
  CHARACTERIZED: 3,
  PRODUCT_POLICY: 2,
  ASSUMPTION: 1,
  DERIVED: 0,
}

export interface CurationRecord {
  exerciseId: string
  field: CuratedField
  /** the reviewed value produced by the named criteria */
  value: number | AxialLoad
  /** the value currently in the catalog (consumed by selection/assembly) */
  catalogValue: number | AxialLoad
  /** true when review disagrees with the catalog — recorded, NOT applied this wave */
  pendingCorrection: boolean
  confidence: MetadataConfidenceTier
  method: string
  rationale: string
  /** the criteria ids from QAE-PRESCRIPTION-METADATA-SCALES.md that fired */
  criteria: readonly string[]
  reviewedAtVersion: string
  reviewStatus: 'curated' | 'unreviewed'
  exceptions: readonly string[]
}

export interface CurationSet {
  schemaVersion: string
  cohortSize: number
  records: readonly CurationRecord[]
}

// ── Criteria (§1–§3 of the scales doc), applied deterministically ──────────

const SUPPORTED = new Set(['supported'])

/** stabilityDemand: 1 guided/supported · 2 free bilateral braced · 3 free + reduced base */
export function curateStability(ex: ExerciseMetadata): { value: 1 | 2 | 3; criteria: string[]; rationale: string } {
  const criteria: string[] = []
  const machineGuided = ex.loadMedium === 'machine' || ex.equipmentRequired.includes('machine') || ex.equipmentRequired.includes('smith')
  if (machineGuided) {
    criteria.push('S1.guidedPath')
    return { value: 1, criteria, rationale: 'implement fixes the movement path; athlete supplies little stabilisation' }
  }
  if (ex.laterality === 'unilateral') {
    criteria.push('S3.reducedBase')
    return { value: 3, criteria, rationale: 'unilateral loading reduces the base of support' }
  }
  if (SUPPORTED.has(ex.support)) {
    criteria.push('S2.freePathSupportedTorso')
    return { value: 2, criteria, rationale: 'free path with a supported torso — free path outranks the support' }
  }
  criteria.push('S2.freeBilateralBracedBase')
  return { value: 2, criteria, rationale: 'free path, bilateral, planted base' }
}

/** axialLoad: none / moderate / high by load path, never by risk. */
export function curateAxial(ex: ExerciseMetadata): { value: AxialLoad; criteria: string[]; rationale: string } {
  const criteria: string[] = []
  const spinalPatterns = new Set(['squat', 'hinge', 'lunge'])
  const supported = ex.support === 'supported'
  const machineGuided = ex.loadMedium === 'machine' || ex.equipmentRequired.includes('machine')

  if (!spinalPatterns.has(ex.movementPattern) && ex.movementPattern !== 'push') {
    criteria.push('A0.noSpinalLoadPath')
    return { value: 'none', criteria, rationale: 'load path does not pass through a loaded spine' }
  }
  if (machineGuided || supported) {
    criteria.push('A1.supportedOrGuided')
    return { value: 'moderate', criteria, rationale: 'spine is loaded but the path is supported or machine-guided' }
  }
  if (spinalPatterns.has(ex.movementPattern)) {
    criteria.push('A2.unsupportedLoadedSpine')
    return { value: 'high', criteria, rationale: 'substantial external load through an unsupported spine' }
  }
  criteria.push('A1.standingPressModerate')
  return { value: 'moderate', criteria, rationale: 'standing press loads the spine but under a bounded load ceiling' }
}

/** fatigueCost: conservative relative PROGRAMMING COST class — never a physiological measure. */
export function curateFatigue(
  ex: ExerciseMetadata,
  stability: 1 | 2 | 3,
  axial: AxialLoad,
): { value: 1 | 2 | 3; criteria: string[]; rationale: string } {
  const criteria: string[] = []
  if (ex.mechanics === 'isolation') {
    criteria.push('F1.isolationSingleJoint')
    return { value: 1, criteria, rationale: 'single-joint, small muscle mass, limited load ceiling' }
  }
  // Compound. INV-7 keeps 3 compound-only, which this branch already guarantees.
  const heavyMarkers =
    (stability === 3 ? 1 : 0) + (axial === 'high' ? 1 : 0) + (ex.technicalDifficulty === 3 ? 1 : 0)
  if (heavyMarkers >= 2) {
    criteria.push('F3.multiJointHighLoadCeiling')
    return { value: 3, criteria, rationale: 'multi-joint with a high load ceiling and >=2 heavy markers (stability/axial/technical)' }
  }
  criteria.push('F2.compoundBoundedCeiling')
  return { value: 2, criteria, rationale: 'compound with a bounded loading ceiling, or supported/guided' }
}

// ── Cohort ─────────────────────────────────────────────────────────────────

/**
 * Cohort = major compounds ∪ approved machine core ∪ every id in the 17 goldens.
 * `goldenIds` is supplied by the caller so the domain never reads fixtures.
 */
export function curationCohort(catalog: ExerciseCatalog, goldenIds: readonly string[]): string[] {
  const ids = new Set<string>()
  for (const ex of catalog.exercises) if (ex.mechanics === 'compound') ids.add(ex.exerciseId)
  for (const id of catalog.primaryMachineIds) ids.add(id)
  for (const id of goldenIds) ids.add(id)
  return [...ids].filter((id) => catalog.exercises.some((e) => e.exerciseId === id)).sort(ordinalCompare)
}

export function buildCurationSet(catalog: ExerciseCatalog, goldenIds: readonly string[]): CurationSet {
  const cohort = curationCohort(catalog, goldenIds)
  const byId = new Map(catalog.exercises.map((e) => [e.exerciseId, e]))
  const records: CurationRecord[] = []

  for (const id of cohort) {
    const ex = byId.get(id)
    if (ex === undefined) continue
    const s = curateStability(ex)
    const a = curateAxial(ex)
    const f = curateFatigue(ex, s.value, a.value)

    const mk = (
      field: CuratedField,
      value: number | AxialLoad,
      catalogValue: number | AxialLoad,
      criteria: string[],
      rationale: string,
    ): CurationRecord => ({
      exerciseId: id,
      field,
      value,
      catalogValue,
      pendingCorrection: value !== catalogValue,
      confidence: 'CHARACTERIZED',
      method: 'criteriaBasedCharacterization',
      rationale,
      criteria,
      reviewedAtVersion: PRESCRIPTION_METADATA_SCHEMA_VERSION,
      reviewStatus: 'curated',
      exceptions: [],
    })

    records.push(mk('stabilityDemand', s.value, ex.stabilityDemand, s.criteria, s.rationale))
    records.push(mk('axialLoad', a.value, ex.axialLoad, a.criteria, a.rationale))
    records.push(mk('fatigueCost', f.value, ex.fatigueCost, f.criteria, f.rationale))
  }

  records.sort((x, y) => ordinalCompare(x.exerciseId, y.exerciseId) || ordinalCompare(x.field, y.field))
  return { schemaVersion: PRESCRIPTION_METADATA_SCHEMA_VERSION, cohortSize: cohort.length, records }
}

// ── The confidence gate (§7) ───────────────────────────────────────────────

export type MetadataLookup =
  | { ok: true; value: number | AxialLoad; confidence: MetadataConfidenceTier }
  | { ok: false; reason: 'insufficientMetadata'; have: MetadataConfidenceTier; need: MetadataConfidenceTier }
  | { ok: false; reason: 'notCurated'; have: 'DERIVED'; need: MetadataConfidenceTier }

/**
 * The ONLY sanctioned way for a future prescription consumer to read one of the
 * three curated fields. It never guesses and never silently serves derived data:
 * below the required tier it returns `insufficientMetadata` / `notCurated` and
 * the caller must take its conservative fallback.
 */
export function readPrescriptionMetadata(
  curation: CurationSet,
  exerciseId: string,
  field: CuratedField,
  requiredTier: MetadataConfidenceTier = 'CHARACTERIZED',
): MetadataLookup {
  const rec = curation.records.find((r) => r.exerciseId === exerciseId && r.field === field)
  if (rec === undefined) return { ok: false, reason: 'notCurated', have: 'DERIVED', need: requiredTier }
  if (TIER_RANK[rec.confidence] < TIER_RANK[requiredTier]) {
    return { ok: false, reason: 'insufficientMetadata', have: rec.confidence, need: requiredTier }
  }
  return { ok: true, value: rec.value, confidence: rec.confidence }
}
