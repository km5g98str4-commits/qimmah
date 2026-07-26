// Q19 — pure active-session progression reducer.
//
// Extracted from WorkoutV2.finishSet so the "which exercise/set is next, and is
// the whole day done?" decision is unit-testable in isolation (the view keeps
// owning the side effects: haptics, rest timer, persistence). Behaviour is
// byte-for-byte the previous inline logic — this is a refactor, not a change.
//
// The invariant Q19 protects: a day is complete ONLY on the last set of the LAST
// exercise. Finishing every set of one exercise advances to the next exercise —
// it never ends the day early while later exercises remain.

export interface SessionPosition {
  exIndex: number
  setIndex: number
}

export interface SessionStep {
  /** Position AFTER this set is finished. Unchanged when the day completes. */
  exIndex: number
  setIndex: number
  /** True only on the last set of the last exercise. */
  dayComplete: boolean
}

/**
 * Advance one set. `setsPerExercise[i]` is the planned set count of exercise i,
 * in the same order the day is performed.
 *
 *   • more sets left in this exercise      → next set, same exercise
 *   • last set of a non-final exercise     → first set of the next exercise
 *   • last set of the final exercise       → dayComplete (position held)
 */
export function stepActiveSession(pos: SessionPosition, setsPerExercise: readonly number[]): SessionStep {
  const total = setsPerExercise.length
  const setsHere = setsPerExercise[pos.exIndex] ?? 0
  const lastSet = pos.setIndex >= setsHere - 1
  const lastExercise = pos.exIndex >= total - 1

  if (lastSet && lastExercise) {
    return { exIndex: pos.exIndex, setIndex: pos.setIndex, dayComplete: true }
  }
  if (!lastSet) {
    return { exIndex: pos.exIndex, setIndex: pos.setIndex + 1, dayComplete: false }
  }
  return { exIndex: pos.exIndex + 1, setIndex: 0, dayComplete: false }
}
