// Legacy catalog → QAE ExerciseMetadata extraction ([CTO-QAE-007] §B/§C).
// READ-ONLY over shipping code. Two sources:
//   1. `src/data/exercises.ts` (exported `exercises`, `LEGACY_EXERCISE_ID_MAP`)
//      + `src/data/machineCatalog.ts` (exported `primaryMachineIdSet`).
//   2. `src/lib/planGenerator.ts` SOURCE TEXT for INJURY_RISKY_IDS (the const is
//      not exported; ids are extracted with a guarded parse — counts asserted).
//
// Every derived field carries its rule; per-exercise metadataConfidence says
// whether the load-bearing safety fields are characterized or derived.
// Output: Contracts/exercises/exercise-catalog.qae.json
//         Contracts/exercises/blocklist-migration.json

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { exercises, LEGACY_EXERCISE_ID_MAP, canonicalExerciseId } from '@/data/exercises'
import { primaryMachineIdSet } from '@/data/machineCatalog'

const qaeRoot = process.env.QAE_ROOT
if (!qaeRoot) throw new Error('QAE_ROOT not set')
const repoRoot = resolvePath(qaeRoot, '..')

// ── §C: extract INJURY_RISKY_IDS from planGenerator source (guarded) ─────────
const planGenSource = readFileSync(resolvePath(repoRoot, 'src/lib/planGenerator.ts'), 'utf8')
const AREAS = ['knee', 'shoulder', 'back', 'wrist', 'elbow', 'ankle'] as const
type Area = (typeof AREAS)[number]

function extractInjurySet(area: Area): string[] {
  const m = planGenSource.match(new RegExp(`${area}: new Set\\(\\[([\\s\\S]*?)\\]\\)`))
  if (!m) throw new Error(`blocklist extraction failed: area '${area}' not found in planGenerator source`)
  const ids = [...m[1].matchAll(/'([a-z0-9-]+)'/g)].map((x) => x[1])
  if (ids.length === 0) throw new Error(`blocklist extraction failed: area '${area}' matched zero ids`)
  return ids
}
const INJURY_RISKY_IDS: Record<Area, string[]> = Object.fromEntries(AREAS.map((a) => [a, extractInjurySet(a)])) as Record<Area, string[]>
// Guarded counts — a shipping-side edit that changes a list size fails HERE, by name.
const EXPECTED_COUNTS: Record<Area, number> = { knee: 13, shoulder: 4, back: 9, wrist: 34, elbow: 22, ankle: 12 }
for (const a of AREAS) {
  if (INJURY_RISKY_IDS[a].length !== EXPECTED_COUNTS[a]) {
    throw new Error(`blocklist drift: area '${a}' has ${INJURY_RISKY_IDS[a].length} ids, characterization expected ${EXPECTED_COUNTS[a]} — re-characterize before regenerating`)
  }
}

// Legacy `back` area tag ≙ QAE area vocabulary `lower_back` (bank area ids).
const AREA_TAG: Record<Area, string> = { knee: 'knee', shoulder: 'shoulder', back: 'lower_back', wrist: 'wrist', elbow: 'elbow', ankle: 'ankle' }

// ── Derivation rules (each named; cited in provenance) ───────────────────────
const FREE_WEIGHT = new Set(['barbell', 'dumbbell', 'kettlebell', 'ez-bar', 'plate'])
const COMPOUND_PATTERNS = new Set(['squat', 'hinge', 'push', 'pull', 'lunge'])
const UNILATERAL_HINTS = /single-|bulgarian|walking-lunge|reverse-lunge|step-up|concentration|pistol|kickback|split-squat/

function loadMedium(equipment: readonly string[]): string {
  if (equipment.includes('machine') || equipment.includes('smith')) return 'machine'
  if (equipment.includes('cable') || equipment.includes('rope')) return 'cable'
  if (equipment.some((e) => FREE_WEIGHT.has(e))) return 'freeWeight'
  if (equipment.includes('band')) return 'band'
  return 'bodyweight'
}

interface LegacyExercise {
  id: string
  primaryMuscle: string
  secondaryMuscles: string[]
  primaryMusclesDetailed: string[]
  secondaryMusclesDetailed: string[]
  equipment: string[]
  level: 'beginner' | 'intermediate' | 'advanced'
  movementPattern: string
  environment: string
  alternatives: string[]
}

function isOverheadCharacterized(ex: LegacyExercise): boolean {
  // exerciseSelection.ts:126-129 (characterized verbatim)
  if (ex.movementPattern !== 'push') return false
  return ex.primaryMusclesDetailed.includes('front_delts') || ex.primaryMusclesDetailed.includes('side_delts')
}

// exerciseSelection.ts:131-133 — impact via English-name regex (legacy defect
// L-QST-6). We characterize the RESULT per exercise id, so the QAE tag is
// name-independent even though its legacy origin was not.
function isImpactCharacterized(ex: LegacyExercise, nameEn: string): boolean {
  return ex.movementPattern === 'cardio' && !/bike|row|elliptical|swim|walk/i.test(nameEn)
}

const LEVEL_TO_DIFFICULTY: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3 }

const catalog = (exercises as unknown as Array<LegacyExercise & { nameEn: string }>).map((ex) => {
  const mechanics = COMPOUND_PATTERNS.has(ex.movementPattern) ? 'compound' : 'isolation'
  const laterality = UNILATERAL_HINTS.test(ex.id) ? 'unilateral' : 'bilateral'
  const medium = loadMedium(ex.equipment)
  const supported =
    medium === 'machine' ||
    ex.equipment.includes('bench') ||
    /seated|supported|preacher|lying|leg-press|hack|incline(?!-push)/.test(ex.id)
  const axialLoad =
    ex.equipment.includes('barbell') && (ex.movementPattern === 'squat' || ex.movementPattern === 'hinge')
      ? 'high'
      : (ex.equipment.includes('barbell') && isOverheadCharacterized(ex)) || ex.equipment.includes('smith')
        ? 'moderate'
        : 'none'
  const fatigueCost = axialLoad === 'high' ? 3 : mechanics === 'compound' ? 2 : 1
  // Instability risk tracks EXTERNAL load: an unsupported free-weight compound
  // or any unilateral movement rates 3; unloaded bodyweight compounds (push-up,
  // bodyweight-squat) rate 2 — a beginner ceiling of 2 must not strip the
  // bodyweight-only user of every compound.
  const stabilityDemand =
    medium === 'machine' ? 1
    : (medium === 'freeWeight' && mechanics === 'compound' && !supported) || laterality === 'unilateral' ? 3
    : 2
  const jointStress = AREAS.filter((a) => INJURY_RISKY_IDS[a].includes(ex.id)).map((a) => AREA_TAG[a])
  const contraindications = [
    ...jointStress,
    ...(isOverheadCharacterized(ex) ? ['overhead'] : []),
    ...(isImpactCharacterized(ex, ex.nameEn) ? ['impact'] : []),
  ].sort()
  const progression =
    ex.movementPattern === 'cardio' || ex.movementPattern === 'mobility'
      ? ['timed']
      : medium === 'bodyweight'
        ? ['rep']
        : medium === 'freeWeight' && mechanics === 'compound'
          ? ['double', 'linear']
          : ['double']

  return {
    exerciseId: ex.id,
    primaryMuscles: [...ex.primaryMusclesDetailed].sort(),
    secondaryMuscles: [...ex.secondaryMusclesDetailed].sort(),
    primaryMuscleCoarse: ex.primaryMuscle,
    movementPattern: ex.movementPattern,
    equipmentRequired: [...ex.equipment].sort(),
    equipmentAlternatives: [] as string[][],
    technicalDifficulty: LEVEL_TO_DIFFICULTY[ex.level],
    stabilityDemand,
    fatigueCost,
    axialLoad,
    jointStress: jointStress.sort(),
    laterality,
    mechanics,
    support: supported ? 'supported' : 'unsupported',
    loadMedium: medium,
    suitableExperienceBands: ex.level === 'advanced' ? ['intermediate', 'advanced'] : ['beginner', 'intermediate', 'advanced'],
    contraindications,
    substitutionGroup: `${ex.movementPattern}:${ex.primaryMuscle}`,
    declaredSubstitutes: ex.alternatives.map((a) => canonicalExerciseId(a)).sort(),
    progressionCompatibility: progression,
    minimumEquipmentCapability: [...ex.equipment].filter((e) => e !== 'bodyweight').sort(),
    legacyEnvironment: ex.environment,
    metadataConfidence: 'characterized',
    provenance: {
      characterized: 'exerciseId/muscles/pattern/equipment/difficulty/bands/environment/substitutes verbatim from src/data/exercises.ts; jointStress+contraindications from planGenerator INJURY_RISKY_IDS + exerciseSelection isOverhead/isImpact (result per id — name-independent)',
      derived: 'stabilityDemand/fatigueCost/axialLoad/laterality/support/loadMedium/progressionCompatibility by the named deterministic rules in extract-legacy-catalog.ts; equipmentAlternatives empty (no legacy representation)',
    },
  }
})

catalog.sort((a, b) => (a.exerciseId < b.exerciseId ? -1 : 1))

// ── Blocklist migration record (§C) — every exclusion with source/reason ─────
const blocklistMigration = {
  schemaVersion: '1.0.0',
  description: 'Legacy training exclusion inventory → QAE contraindication/eligibility representation. Proof (Tests/training) asserts legacy ⊆ new, per rule, no silent loss.',
  rules: [
    ...AREAS.map((a) => ({
      ruleId: `legacy-injury-${a}`,
      source: 'src/lib/planGenerator.ts INJURY_RISKY_IDS (extracted, counts guarded)',
      reason: `exercise on the legacy ${a}-injury risk list`,
      confidence: 'characterized',
      qaeRepresentation: `metadata.jointStress includes '${AREA_TAG[a]}' → excluded when capability profile carries injuryConstraint '${AREA_TAG[a]}'`,
      exerciseIds: [...INJURY_RISKY_IDS[a]].sort(),
      presentInCatalog: [...INJURY_RISKY_IDS[a]].filter((id) => catalog.some((c) => c.exerciseId === id)).sort(),
      absentFromCatalog: [...INJURY_RISKY_IDS[a]].filter((id) => !catalog.some((c) => c.exerciseId === id)).sort(),
    })),
    {
      ruleId: 'legacy-overhead',
      source: 'src/lib/personalization/exerciseSelection.ts isOverhead (pattern push ∧ front/side delts primary)',
      reason: 'overhead loading excluded when safety.noOverhead',
      confidence: 'characterized',
      qaeRepresentation: "metadata.contraindications includes 'overhead' → excluded when injuryConstraints include 'overhead'",
      exerciseIds: catalog.filter((c) => c.contraindications.includes('overhead')).map((c) => c.exerciseId),
      presentInCatalog: catalog.filter((c) => c.contraindications.includes('overhead')).map((c) => c.exerciseId),
      absentFromCatalog: [] as string[],
    },
    {
      ruleId: 'legacy-impact',
      source: 'src/lib/personalization/exerciseSelection.ts isImpact (legacy defect L-QST-6: English-name regex; QAE stores the per-id RESULT, name-independent)',
      reason: 'impact loading excluded when safety.noImpact',
      confidence: 'characterized',
      qaeRepresentation: "metadata.contraindications includes 'impact' → excluded when injuryConstraints include 'impact'",
      exerciseIds: catalog.filter((c) => c.contraindications.includes('impact')).map((c) => c.exerciseId),
      presentInCatalog: catalog.filter((c) => c.contraindications.includes('impact')).map((c) => c.exerciseId),
      absentFromCatalog: [] as string[],
    },
    {
      ruleId: 'legacy-equipment-gate',
      source: 'src/lib/equipmentAccess.ts makeEquipmentGate (full: all · small: ban smith/rope · home: dumbbell/barbell/bodyweight/band/bench · bodyweight: bodyweight only)',
      reason: 'exercise requires equipment the environment does not provide',
      confidence: 'characterized',
      qaeRepresentation: 'metadata.minimumEquipmentCapability ⊆ capabilityProfile.equipmentCapabilities (every required tool present)',
      exerciseIds: [] as string[],
      presentInCatalog: [] as string[],
      absentFromCatalog: [] as string[],
    },
    {
      ruleId: 'legacy-level-cap',
      source: 'src/lib/planGenerator.ts levelOk (beginner/novice tiers never get advanced-level exercises) + exerciseSelection suitabilityFilter maxExerciseLevel',
      reason: 'exercise above the experience complexity ceiling',
      confidence: 'characterized',
      qaeRepresentation: 'metadata.technicalDifficulty ≤ capabilityProfile.exerciseComplexityCeiling',
      exerciseIds: catalog.filter((c) => c.technicalDifficulty === 3).map((c) => c.exerciseId),
      presentInCatalog: catalog.filter((c) => c.technicalDifficulty === 3).map((c) => c.exerciseId),
      absentFromCatalog: [] as string[],
    },
    {
      ruleId: 'legacy-free-cable-beginner',
      source: 'src/lib/planGenerator.ts cableOk (free cable — cable without machine — advanced tier only)',
      reason: 'free-cable station gated to advanced users in the shipping generator',
      confidence: 'characterized',
      qaeRepresentation: 'PARITY-mode policy rule: loadMedium cable ∧ ¬machine requires experienceBand advanced (kept as policy, not metadata — it is a picker policy, not an exercise property)',
      exerciseIds: catalog.filter((c) => c.equipmentRequired.includes('cable') && !c.equipmentRequired.includes('machine')).map((c) => c.exerciseId),
      presentInCatalog: catalog.filter((c) => c.equipmentRequired.includes('cable') && !c.equipmentRequired.includes('machine')).map((c) => c.exerciseId),
      absentFromCatalog: [] as string[],
    },
  ],
}

// Blocklist ids that name exercises absent from today's catalog (historical ids
// kept in the legacy lists) — documented, not silently dropped.
const absentTotal = blocklistMigration.rules.flatMap((r) => r.absentFromCatalog)

function canonical(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort)
    if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v as Record<string, unknown>).sort().map((k) => [k, sort((v as Record<string, unknown>)[k])]))
    if (typeof v === 'number' && !Number.isInteger(v)) throw new Error(`float: ${v}`)
    return v
  }
  return JSON.stringify(sort(value), null, 2) + '\n'
}

const catalogBody = {
  schemaVersion: '1.0.0',
  source: 'src/data/exercises.ts (characterized) + named derivation rules',
  exerciseCount: catalog.length,
  aliases: LEGACY_EXERCISE_ID_MAP,
  primaryMachineIds: [...primaryMachineIdSet].sort(),
  exercises: catalog,
}
const bodyText = canonical(catalogBody)
const manifestHash = createHash('sha256').update(bodyText).digest('hex')
writeFileSync(
  resolvePath(qaeRoot, 'Contracts/exercises/exercise-catalog.qae.json'),
  canonical({ ...catalogBody, catalogManifestHash: manifestHash }),
)
writeFileSync(resolvePath(qaeRoot, 'Contracts/exercises/blocklist-migration.json'), canonical(blocklistMigration))

console.log(`extract-legacy-catalog: ${catalog.length} exercises, ${blocklistMigration.rules.length} migration rules, ${absentTotal.length} blocklist ids not in current catalog (documented)`)
console.log(`catalogManifestHash: ${manifestHash}`)
