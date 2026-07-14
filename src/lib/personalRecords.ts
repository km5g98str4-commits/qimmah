import { getExercise } from '@/data/exercises'
import { loadSessions, type WorkoutSession } from '@/lib/workoutSessions'
import { topCompletedWeight } from '@/lib/exerciseHistory'

export interface PersonalRecordEvent {
  id: string
  sessionId: string
  exerciseId: string
  nameAr: string
  nameEn: string
  date: string
  achievedAt: string
  weightKg: number
  previousBestKg: number
  improvementKg: number
}

function moment(session: WorkoutSession): number {
  const value = Date.parse(session.finishedAt ?? session.startedAt ?? `${session.date}T12:00:00`)
  return Number.isFinite(value) ? value : Date.parse(`${session.date}T12:00:00`) || 0
}

/**
 * Rebuilds the honest PR timeline from canonical finished sessions. The first
 * valid load establishes a baseline and is intentionally not called a record.
 * No second storage key is introduced, so hydration/import cannot drift from it.
 */
export function derivePersonalRecordEvents(sessions: WorkoutSession[] = loadSessions()): PersonalRecordEvent[] {
  const ordered = sessions
    .filter((session) => Boolean(session.finishedAt))
    .slice()
    .sort((a, b) => moment(a) - moment(b) || a.id.localeCompare(b.id))
  const bestByExercise = new Map<string, number>()
  const events: PersonalRecordEvent[] = []

  ordered.forEach((session) => {
    session.exercises.forEach((exercise) => {
      const weightKg = topCompletedWeight(exercise)
      if (!Number.isFinite(weightKg) || weightKg <= 0 || !exercise.exerciseId) return
      const previousBestKg = bestByExercise.get(exercise.exerciseId)
      if (previousBestKg === undefined) {
        bestByExercise.set(exercise.exerciseId, weightKg)
        return
      }
      if (weightKg <= previousBestKg) return
      const catalog = getExercise(exercise.exerciseId)
      events.push({
        id: `${session.id}:${exercise.exerciseId}:${weightKg}`,
        sessionId: session.id,
        exerciseId: exercise.exerciseId,
        nameAr: exercise.exerciseNameAr ?? catalog?.nameAr ?? exercise.exerciseId,
        nameEn: exercise.exerciseNameEn ?? catalog?.nameEn ?? exercise.exerciseId,
        date: session.date,
        achievedAt: session.finishedAt ?? session.startedAt,
        weightKg,
        previousBestKg,
        improvementKg: Math.round((weightKg - previousBestKg) * 100) / 100,
      })
      bestByExercise.set(exercise.exerciseId, weightKg)
    })
  })

  return events.sort((a, b) => Date.parse(b.achievedAt) - Date.parse(a.achievedAt) || b.id.localeCompare(a.id))
}

export function personalRecordCount(sessions?: WorkoutSession[]): number {
  return derivePersonalRecordEvents(sessions).length
}
