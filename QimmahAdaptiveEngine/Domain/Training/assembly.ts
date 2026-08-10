// Day assembly ([CTO-QAE-013] §1) — PARITY-mode reproduction of the legacy slot
// engine, built strictly from Docs/QAE-TRAINING-ASSEMBLY-CHARACTERIZATION.md.
//
// Pure · deterministic · integer-only · locale-independent · timezone-independent.
// No UI strings, no question ids, no Date, no locale collation. Inputs are frozen
// domain objects; the catalog is addressed by metadata, never by name.
//
// The ONE intentional difference from legacy is deviation D6 (defect L-TRN-2):
// legacy orders by `id.localeCompare(id)` in both buildMuscleRankMap and
// sortCandidates, so under a different ICU locale the rank map — and therefore
// the entire A/B allocation — can shift. QAE uses ordinal comparison. See
// Contracts/training/approved-deviations.json.

import { ordinalCompare } from '../Shared/numeric'
import type { ExerciseCatalog, ExerciseMetadata, MovementPattern } from '../Catalog/model'
import { DAY_SLOTS, type DayKind, type MovementRequirement } from './requirements'

export const TRAINING_ASSEMBLY_POLICY_VERSION = '1.0.0'

// ── Characterized legacy constants ─────────────────────────────────────────

/** planGenerator.ts:116 — COMPOUND_PATTERNS. */
const COMPOUND_PATTERNS: ReadonlySet<MovementPattern> = new Set<MovementPattern>([
  'squat',
  'hinge',
  'push',
  'pull',
  'lunge',
])

/** planGenerator.ts:114 — a full-body day never drops below this. */
export const FULL_BODY_MIN = 5

/** planGenerator.ts:83-94 — base session volume by tier. */
export type ExpTier = 'beginner' | 'novice' | 'intermediate' | 'advanced'
const BASE_PER_SESSION: Readonly<Record<ExpTier, number>> = {
  beginner: 5,
  novice: 5,
  intermediate: 6,
  advanced: 6,
}

/** planGenerator.ts:350-360 — TYPE_MUSCLES, the day-muscle fill pool. */
export const DAY_MUSCLES: Readonly<Record<DayKind, readonly string[]>> = {
  full: ['quads', 'chest', 'back', 'shoulders', 'hamstrings', 'glutes', 'biceps', 'triceps', 'calves', 'core'],
  upper: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
  lower: ['quads', 'hamstrings', 'glutes', 'calves', 'core'],
  push: ['chest', 'shoulders', 'triceps'],
  pull: ['back', 'biceps', 'shoulders'],
  arms: ['biceps', 'triceps'],
  core: ['core'],
}

export type AccessoryCategory = 'triceps' | 'biceps' | 'abs'

/** planGenerator.ts:375-387 — accessoryCategory(type, variation). */
export function accessoryCategoryFor(kind: DayKind, variation: number): AccessoryCategory | null {
  switch (kind) {
    case 'push':
      return 'triceps'
    case 'pull':
      return 'biceps'
    case 'full':
    case 'lower':
      return 'abs'
    case 'upper':
    case 'arms':
      return variation % 2 === 0 ? 'triceps' : 'biceps'
    case 'core':
      return 'abs'
    default:
      return null
  }
}

/**
 * planGenerator.ts:100-110 — five discrete duration bands, then clamp [3, 9].
 * `sessionMinutes <= 0` is characterized as 60. Integer-only.
 */
export function deriveTargetCount(tier: ExpTier, sessionMinutes: number): number {
  const base = BASE_PER_SESSION[tier]
  const m = sessionMinutes > 0 ? sessionMinutes : 60
  let delta: number
  if (m <= 30) delta = -2
  else if (m <= 45) delta = -1
  else if (m <= 60) delta = 0
  else if (m <= 75) delta = 1
  else delta = 2
  const n = base + delta
  return n < 3 ? 3 : n > 9 ? 9 : n
}

// ── Contracts ──────────────────────────────────────────────────────────────

export type FillReason = 'slot' | 'dayMuscleFill' | 'wholePoolFill' | 'accessory'

export interface AssembledExercise {
  exerciseId: string
  order: number
  optional: boolean
  /** index into DAY_SLOTS[kind] when this pick satisfied a requirement, else null */
  requirementIndex: number | null
  fillReason: FillReason
}

export interface AssembledDay {
  dayId: string
  kind: DayKind
  variation: number
  nVar: number
  targetCount: number
  exercises: readonly AssembledExercise[]
  /** requirement indices that no eligible exercise could satisfy */
  unfilledRequirements: readonly number[]
  /** true when the day ended below its target because the pool was exhausted */
  short: boolean
}

export interface AssemblyInput {
  /** ordered day kinds; split generation is NOT assembly's job */
  daySpecs: readonly { kind: DayKind }[]
  /** eligible exercise ids — order-independent, deduplicated internally */
  poolIds: readonly string[]
  targetPerDay: number
  machinesOnly: boolean
  preferMachines: boolean
  /** already cable-filtered accessory ids per category (characterized pickAccessory input) */
  accessoryPool: Readonly<Record<AccessoryCategory, readonly string[]>>
}

export interface AssemblyResult {
  days: readonly AssembledDay[]
  policyVersion: string
  catalogManifestHash: string
  /** deterministic, human-readable decision trace for proofs */
  trace: readonly string[]
}

// ── Internals (each mirrors a named legacy function) ────────────────────────

/** planGenerator.ts:119-121 — exerciseRole, by movement pattern. */
function roleOf(ex: ExerciseMetadata): 'compound' | 'isolation' {
  return COMPOUND_PATTERNS.has(ex.movementPattern) ? 'compound' : 'isolation'
}

/** planGenerator.ts:171-173 — isMachineExercise. */
function isMachine(ex: ExerciseMetadata): boolean {
  return ex.equipmentRequired.includes('machine')
}

/**
 * planGenerator.ts:410-416 — sortCandidates.
 * D6: ordinal id comparison instead of `localeCompare` (defect L-TRN-2).
 */
function sortCandidates(list: readonly ExerciseMetadata[], preferMachines: boolean): ExerciseMetadata[] {
  return [...list].sort((a, b) => {
    if (preferMachines) {
      const d = (isMachine(a) ? 0 : 1) - (isMachine(b) ? 0 : 1)
      if (d !== 0) return d
    }
    return ordinalCompare(a.exerciseId, b.exerciseId)
  })
}

/**
 * planGenerator.ts:424-442 — buildMuscleRankMap.
 * Grouped by primaryMuscleCoarse, ordinal-sorted, indexed 0,1,2… Computed once
 * for the whole pool so ranks never drift as slots consume exercises.
 * D6: ordinal instead of `localeCompare`.
 */
function buildMuscleRankMap(pool: readonly ExerciseMetadata[]): Map<string, number> {
  const rank = new Map<string, number>()
  const byMuscle = new Map<string, ExerciseMetadata[]>()
  for (const ex of pool) {
    const list = byMuscle.get(ex.primaryMuscleCoarse) ?? []
    list.push(ex)
    byMuscle.set(ex.primaryMuscleCoarse, list)
  }
  // Iterate muscle groups in ordinal key order so the map is independent of
  // catalog registration / object insertion order.
  for (const key of [...byMuscle.keys()].sort(ordinalCompare)) {
    const list = byMuscle.get(key) as ExerciseMetadata[]
    list
      .slice()
      .sort((a, b) => ordinalCompare(a.exerciseId, b.exerciseId))
      .forEach((ex, i) => rank.set(ex.exerciseId, i))
  }
  return rank
}

/**
 * planGenerator.ts:443-451 — partitionOrder.
 * A PREFERENCE, not a filter: this variation's share first, the remainder after.
 */
function partitionOrder(
  sorted: readonly ExerciseMetadata[],
  variation: number,
  nVar: number,
  rank: ReadonlyMap<string, number>,
): ExerciseMetadata[] {
  if (nVar <= 1 || sorted.length <= 1) return [...sorted]
  const v = ((variation % nVar) + nVar) % nVar
  const mine: ExerciseMetadata[] = []
  const rest: ExerciseMetadata[] = []
  for (const ex of sorted) ((rank.get(ex.exerciseId) ?? 0) % nVar === v ? mine : rest).push(ex)
  return [...mine, ...rest]
}

/**
 * planGenerator.ts:453-473 — pickForSlot.
 * Patterns are SOFT: the list narrows to pattern matches only when at least one
 * exists; otherwise every muscle/role match remains eligible.
 */
function pickForSlot(
  req: MovementRequirement,
  pool: readonly ExerciseMetadata[],
  used: ReadonlySet<string>,
  variation: number,
  nVar: number,
  preferMachines: boolean,
  rank: ReadonlyMap<string, number>,
): string | undefined {
  let cands = pool.filter(
    (ex) =>
      req.muscles.includes(ex.primaryMuscleCoarse) &&
      (req.role === 'any' || roleOf(ex) === req.role) &&
      !used.has(ex.exerciseId),
  )
  if (req.patterns) {
    const byPattern = cands.filter((ex) => req.patterns?.includes(ex.movementPattern))
    if (byPattern.length > 0) cands = byPattern
  }
  if (cands.length === 0) return undefined
  const ordered = partitionOrder(sortCandidates(cands, preferMachines), variation, nVar, rank)
  return ordered[0].exerciseId
}

/** planGenerator.ts:394-405 — pickAccessory: walk from `variation % len`. */
function pickAccessory(
  categoryPool: readonly string[],
  variation: number,
  used: ReadonlySet<string>,
): string | null {
  if (categoryPool.length === 0) return null
  for (let k = 0; k < categoryPool.length; k++) {
    const cand = categoryPool[(variation + k) % categoryPool.length]
    if (!used.has(cand)) return cand
  }
  return null
}

// ── Assembly ───────────────────────────────────────────────────────────────

/**
 * Reproduces planGenerator.ts:475-525 (buildDayExercises) plus the day loop at
 * :736-765. Order of stages is load-bearing and matches the characterization:
 * slots → day-muscle fill → whole-pool fill (machinesOnly only) → accessory.
 */
export function assembleDays(catalog: ExerciseCatalog, input: AssemblyInput): AssemblyResult {
  const byId = new Map<string, ExerciseMetadata>()
  for (const ex of catalog.exercises) byId.set(ex.exerciseId, ex)

  // Deduplicate and resolve the pool deterministically (ordinal), so callers may
  // pass any order — permutation invariance is structural, not incidental.
  const pool: ExerciseMetadata[] = [...new Set(input.poolIds)]
    .sort(ordinalCompare)
    .map((id) => byId.get(id))
    .filter((ex): ex is ExerciseMetadata => ex !== undefined)

  const rank = buildMuscleRankMap(pool)
  const trace: string[] = []

  // Per-kind totals drive A/B: nVar = how many days of this kind exist.
  const kindTotal = new Map<DayKind, number>()
  for (const spec of input.daySpecs) kindTotal.set(spec.kind, (kindTotal.get(spec.kind) ?? 0) + 1)

  const seenPerKind = new Map<DayKind, number>()
  const days: AssembledDay[] = input.daySpecs.map((spec, dayIndex) => {
    const kind = spec.kind
    const variation = seenPerKind.get(kind) ?? 0
    seenPerKind.set(kind, variation + 1)
    const nVar = kindTotal.get(kind) ?? 1
    const dayId = `gen-${dayIndex + 1}-${kind}`
    const targetCount = kind === 'full' ? Math.max(input.targetPerDay, FULL_BODY_MIN) : input.targetPerDay

    const used = new Set<string>()
    const picks: Array<{ id: string; requirementIndex: number | null; fillReason: FillReason }> = []
    const unfilled: number[] = []

    // Stage 1 — slots, in declaration order.
    const requirements = DAY_SLOTS[kind]
    requirements.forEach((req, ri) => {
      if (picks.length >= targetCount) return
      const id = pickForSlot(req, pool, used, variation, nVar, input.preferMachines, rank)
      if (id === undefined) {
        unfilled.push(ri)
        return
      }
      picks.push({ id, requirementIndex: ri, fillReason: 'slot' })
      used.add(id)
    })

    // Stage 2 — day-muscle fill (unconditional).
    if (picks.length < targetCount) {
      const muscles = DAY_MUSCLES[kind]
      const extra = partitionOrder(
        sortCandidates(
          pool.filter((ex) => !used.has(ex.exerciseId) && muscles.includes(ex.primaryMuscleCoarse)),
          input.preferMachines,
        ),
        variation,
        nVar,
        rank,
      )
      for (const ex of extra) {
        if (picks.length >= targetCount) break
        picks.push({ id: ex.exerciseId, requirementIndex: null, fillReason: 'dayMuscleFill' })
        used.add(ex.exerciseId)
        trace.push(`${dayId}: dayMuscleFill ${ex.exerciseId}`)
      }
    }

    // Stage 3 — whole-pool fill, ONLY for machines-only environments.
    if (input.machinesOnly && picks.length < targetCount) {
      const extra = partitionOrder(
        sortCandidates(
          pool.filter((ex) => !used.has(ex.exerciseId)),
          input.preferMachines,
        ),
        variation,
        nVar,
        rank,
      )
      for (const ex of extra) {
        if (picks.length >= targetCount) break
        picks.push({ id: ex.exerciseId, requirementIndex: null, fillReason: 'wholePoolFill' })
        used.add(ex.exerciseId)
        trace.push(`${dayId}: wholePoolFill ${ex.exerciseId}`)
      }
    }

    const short = picks.length < targetCount
    if (short) trace.push(`${dayId}: short ${picks.length}/${targetCount} — pool exhausted`)

    // Stage 4 — accessory, appended after all fills, machines-only only.
    let accessoryId: string | null = null
    if (input.machinesOnly) {
      const cat = accessoryCategoryFor(kind, variation)
      if (cat !== null) {
        accessoryId = pickAccessory(input.accessoryPool[cat], variation, used)
        if (accessoryId !== null) {
          picks.push({ id: accessoryId, requirementIndex: null, fillReason: 'accessory' })
          used.add(accessoryId)
          trace.push(`${dayId}: accessory(${cat}) ${accessoryId}`)
        }
      }
    }

    const exercises: AssembledExercise[] = picks.map((p, i) => ({
      exerciseId: p.id,
      order: i,
      // Characterized: only the FINAL element, and only when it is the accessory.
      optional: i === picks.length - 1 && accessoryId !== null && p.id === accessoryId,
      requirementIndex: p.requirementIndex,
      fillReason: p.fillReason,
    }))

    return { dayId, kind, variation, nVar, targetCount, exercises, unfilledRequirements: unfilled, short }
  })

  return {
    days,
    policyVersion: TRAINING_ASSEMBLY_POLICY_VERSION,
    catalogManifestHash: catalog.catalogManifestHash,
    trace,
  }
}
