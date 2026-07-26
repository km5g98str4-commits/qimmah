// Q19 — canonical within-day exercise ordering law.
//
// The order a trainee performs exercises in is not cosmetic: fatigue management
// says the most systemically demanding, multi-joint work comes first (fresh
// nervous system, heaviest loads), isolation work fills the middle-to-end, and
// small stabilisers / calves / core close the session. This module encodes that
// as a RANK derived ENTIRELY from the exercise catalog (movement pattern +
// primary muscle) — never alphabetical, never random, never invented per-id.
//
//   البند ١ (الأكثر تطلّبًا / الأساسي)  → مركّبات الأرجل (سكوات/هينج/لَنج)  = 100
//   البند ٢ (الحركات المركّبة التالية)  → دفع/سحب/حمل (مركّبات علوية)        = 110
//   البند ٣ (تمارين العزل)              → أي حركة أحادية المفصل               = 500
//   البند ٤ (السمانة/الكور/النهايات)    → السمانة والكور دائمًا في الأخير      = 900
//
// The templates in src/data/workoutTemplates.ts are hand-authored to already
// satisfy this law; orderDayExerciseIds is the single source of truth the proof
// (`npm run test:workout-order`) checks them against, and the tool used to derive
// a correct order for any new/edited day. It is a STABLE sort: exercises that
// share a rank keep their authored order, so a deliberately-placed primary lift
// (e.g. the main pulldown ahead of an accessory row) is preserved.

import { getExercise } from '@/data/exercises'
import type { MovementPattern, Muscle } from '@/types/workout'

/** Multi-joint patterns, split so leg compounds lead the big upper compounds. */
const COMPOUND_RANK: Partial<Record<MovementPattern, number>> = {
  squat: 100,
  hinge: 100,
  lunge: 100,
  push: 110,
  pull: 110,
  carry: 110,
}

/** Muscles that always close a session regardless of their movement pattern. */
const FINISHER_MUSCLES: ReadonlySet<Muscle> = new Set<Muscle>(['calves', 'core'])

export const ISOLATION_RANK = 500
export const FINISHER_RANK = 900
/** Anything with rank below this is a compound (multi-joint) lift. */
export const COMPOUND_CEILING = 500

/**
 * Ordering rank for one exercise id. Lower = performed earlier. Unknown ids
 * (custom exercises with no catalog entry) land in the isolation band so a custom
 * day never forces an unknown lift ahead of a known compound.
 */
export function exerciseOrderRank(exerciseId: string): number {
  const ex = getExercise(exerciseId)
  if (!ex) return ISOLATION_RANK
  if (FINISHER_MUSCLES.has(ex.primaryMuscle)) return FINISHER_RANK
  return COMPOUND_RANK[ex.movementPattern] ?? ISOLATION_RANK
}

/** True when the exercise is a multi-joint compound (leads the isolation band). */
export function isCompoundExercise(exerciseId: string): boolean {
  return exerciseOrderRank(exerciseId) < COMPOUND_CEILING
}

/**
 * Canonical order for a day's exercise ids. STABLE: equal-rank exercises keep
 * their input order, so authored intent within a band survives. Pure — never
 * mutates the input array.
 */
export function orderDayExerciseIds(ids: readonly string[]): string[] {
  return ids
    .map((id, i) => ({ id, i, rank: exerciseOrderRank(id) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.id)
}

/** True when `ids` are already in canonical order (idempotent under the sort). */
export function isDayOrdered(ids: readonly string[]): boolean {
  const ranks = ids.map(exerciseOrderRank)
  for (let i = 1; i < ranks.length; i += 1) {
    if (ranks[i] < ranks[i - 1]) return false
  }
  return true
}
