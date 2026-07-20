// Mid-workout exercise substitution — Qimmah Design Standard v3.0, screen 31.
// An EQUIPMENT-AWARE engine that suggests alternatives which PRESERVE the
// movement pattern, so a swap trains the same slot without changing the plan's
// intent. Pure + framework-free (no React, no storage) → unit-testable; the
// WorkoutV2 sheet is the only writer, and only after an explicit choice (Rule D).
//
// It never mutates the plan or history: it just RANKS catalog candidates. The
// three real-world reasons it handles:
//   • busy        — الجهاز مشغول: prefer a DIFFERENT station so you can move now.
//   • unavailable — الجهاز غير متاح: same, but the original is gone, not just busy.
//   • home        — أتمرّن في المنزل اليوم: force the home equipment ruleset.

import type { Profile } from '@/types/profile'
import type { Exercise } from '@/types/workout'
import { exercises, getExercise } from '@/data/exercises'
import { makeEquipmentGate } from '@/lib/equipmentAccess'

export type SubReason = 'busy' | 'unavailable' | 'home'

export interface SubstituteOption {
  exerciseId: string
  nameAr: string
  nameEn: string
  primaryMuscle: string
  movementPattern: string
  equipment: string[]
  /** True when the swap uses a different station than the original (relevant for busy/unavailable). */
  differentStation: boolean
  /** True when the original catalog author hand-picked this as an alternative. */
  curated: boolean
}

/** Two exercises share a station if their equipment sets overlap at all. */
function sharesStation(a: string[], b: string[]): boolean {
  const bs = new Set(b)
  return a.some((e) => bs.has(e))
}

/** Count of shared muscles (primary+secondary) — a stimulus-similarity tie-breaker. */
function muscleOverlap(a: Exercise, b: Exercise): number {
  const bs = new Set<string>([b.primaryMuscle, ...b.secondaryMuscles])
  let n = 0
  for (const m of [a.primaryMuscle, ...a.secondaryMuscles]) if (bs.has(m)) n++
  return n
}

/**
 * Rank equipment-available alternatives for `currentExerciseId` that preserve
 * the movement pattern and primary muscle. `reason` shapes the equipment gate
 * (home forces the home ruleset) and the ordering (busy/unavailable float a
 * different station to the top). Returns at most `limit` options, best first.
 * Never includes the exercise itself. Empty when the id is unknown.
 */
export function findSubstitutes(
  currentExerciseId: string,
  profile: Profile,
  reason: SubReason,
  limit = 6,
): SubstituteOption[] {
  const current = getExercise(currentExerciseId)
  if (!current) return []

  const gate = makeEquipmentGate(profile, { homeOnly: reason === 'home' })
  // A candidate the user could not touch anyway (busy/unavailable) is still a
  // candidate — we only need a DIFFERENT station, which is guaranteed below.
  const preferDifferentStation = reason === 'busy' || reason === 'unavailable'

  const candidates = exercises.filter(
    (ex) =>
      ex.id !== current.id &&
      ex.movementPattern === current.movementPattern && // preserve the movement pattern (hard rule)
      ex.primaryMuscle === current.primaryMuscle && //       same trained muscle
      gate(ex.equipment), //                                  user's equipment ONLY
  )

  const curatedSet = new Set(current.alternatives)

  const scored = candidates.map((ex) => {
    const differentStation = !sharesStation(ex.equipment, current.equipment)
    const curated = curatedSet.has(ex.id)
    // Higher = better. Curated pairings dominate; then (for busy/unavailable) a
    // free different station; then stimulus similarity; then a stable nudge for
    // exercises the plan generator would also treat as trainable everywhere.
    let score = 0
    if (curated) score += 100
    if (preferDifferentStation && differentStation) score += 40
    score += muscleOverlap(current, ex) * 4
    if (ex.environment === 'both') score += 1
    return { ex, differentStation, curated, score }
  })

  scored.sort((a, b) => b.score - a.score || a.ex.id.localeCompare(b.ex.id))

  return scored.slice(0, limit).map(({ ex, differentStation, curated }) => ({
    exerciseId: ex.id,
    nameAr: ex.nameAr,
    nameEn: ex.nameEn,
    primaryMuscle: ex.primaryMuscle,
    movementPattern: ex.movementPattern,
    equipment: ex.equipment,
    differentStation,
    curated,
  }))
}
