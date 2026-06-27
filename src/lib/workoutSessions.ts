// سجلّات جلسات التمرين (محلي فقط).

import { getDayStamp } from './today'

export const WORKOUT_SESSIONS_KEY = 'qimmah:workoutSessions:v1'

export type Difficulty = 'easy' | 'medium' | 'hard'

/** سجلّ مجموعة واحدة (set) داخل التمرين. */
export interface SetLog {
  setNumber: number
  targetReps: string
  actualReps: string
  weightKg: string
  completed: boolean
  rpe?: number
  notes?: string
}

export interface SessionExercise {
  exerciseId: string
  exerciseNameAr?: string
  exerciseNameEn?: string
  targetSets: number
  targetReps: string
  targetRestSec: number
  completed: boolean
  sets?: SetLog[]
  // حقول قديمة للتوافق
  weight?: string
  repsDone?: string
  difficulty?: Difficulty
  painNote?: string
  notes?: string
}

export interface WorkoutSession {
  id: string
  date: string
  startedAt: string
  finishedAt?: string
  workoutDayId: string
  workoutDayName: string
  exercises: SessionExercise[]
}

export function loadSessions(): WorkoutSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(WORKOUT_SESSIONS_KEY)
    return raw ? (JSON.parse(raw) as WorkoutSession[]) : []
  } catch {
    return []
  }
}

export function saveSessions(sessions: WorkoutSession[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(WORKOUT_SESSIONS_KEY, JSON.stringify(sessions))
}

/** يضيف جلسة جديدة (الأحدث أولًا، نحتفظ بآخر 50). */
export function addSession(session: WorkoutSession): void {
  const all = [session, ...loadSessions()].slice(0, 50)
  saveSessions(all)
}

export function lastSession(): WorkoutSession | undefined {
  return loadSessions()[0]
}

/** هل توجد جلسة مكتملة اليوم؟ */
export function todaysFinishedSession(): WorkoutSession | undefined {
  const today = getDayStamp()
  return loadSessions().find((s) => s.date === today && s.finishedAt)
}
