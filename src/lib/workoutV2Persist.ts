// Fix-forward A — Qimmah v2.1 (wave3 integration). Maps a finished v2 Active
// Workout into the canonical WorkoutSession shape so it persists through the
// SAME path v1 uses (persistFinishedSession → addSession → historyStore, which
// now auto-enqueues sync). This is what makes Progress (strength/momentum),
// Today (after-workout state), and Profile (stats) react to a v2 workout.
//
// Pure and dependency-light (types only) so the mapping is unit-tested without
// a browser — the persistence call itself lives in the view.

import type { SessionExercise, SetLog, WorkoutSession } from './workoutSessions'
import type { WorkoutV2Model } from './workoutV2Model'

/** The subset of the v2 Active state needed to build a session (rows per exercise id). */
export interface V2ActiveSnapshot {
  startedAt: number
  rows: Record<string, { weight: number; reps: number; done: boolean }[]>
}

/**
 * Build a canonical WorkoutSession from the v2 active snapshot + plan model.
 * `date` is the local day stamp and `finishedAtMs` the completion time — passed
 * in (not read from the clock) so the mapping stays pure and testable.
 */
export function buildV2WorkoutSession(
  active: V2ActiveSnapshot,
  model: WorkoutV2Model,
  opts: { date: string; finishedAtMs: number },
): WorkoutSession {
  const exercises: SessionExercise[] = model.exercises.map((ex) => {
    const rows = active.rows[ex.id] ?? []
    const sets: SetLog[] = rows.map((r, i) => ({
      setNumber: i + 1,
      targetReps: ex.reps,
      actualReps: String(r.reps),
      weightKg: String(r.weight),
      completed: r.done,
    }))
    return {
      exerciseId: ex.exerciseId,
      exerciseNameAr: ex.nameAr,
      exerciseNameEn: ex.nameEn,
      targetSets: ex.sets,
      targetReps: ex.reps,
      targetRestSec: ex.restSec,
      completed: sets.length > 0 && sets.every((s) => s.completed),
      sets,
    }
  })
  return {
    id: `session-v2-${active.startedAt}`,
    date: opts.date,
    startedAt: new Date(active.startedAt).toISOString(),
    finishedAt: new Date(opts.finishedAtMs).toISOString(),
    workoutDayId: `v2-${model.session.title || 'session'}`,
    workoutDayName: model.session.title,
    exercises,
  }
}
