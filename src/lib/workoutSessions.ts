// سجلّات جلسات التمرين — واجهة رفيعة فوق المتجر التاريخي الدائم (historyStore).
//
// كل القراءة/الكتابة تمرّ عبر historyStore حتى تبقى لوحة المعلومات والسلاسل
// والتقدّم على مصدر حقيقة واحد (يحلّ مشكلة «العدّادات الثابتة» وسجل التمرين الفارغ).

import { getDayStamp } from './today'
import { getWorkoutSessions, saveWorkoutSession, setWorkoutSessions } from './historyStore'

// — مفتاح قديم (للتوافق فقط؛ الكتابة الفعلية في historyStore) —
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
  return getWorkoutSessions()
}

export function saveSessions(sessions: WorkoutSession[]): void {
  setWorkoutSessions(sessions)
}

/** يضيف/يحدّث جلسة (الأحدث أولًا، idempotent بالمعرّف). */
export function addSession(session: WorkoutSession): void {
  saveWorkoutSession(session)
}

export function lastSession(): WorkoutSession | undefined {
  return getWorkoutSessions()[0]
}

/** هل توجد جلسة مكتملة اليوم؟ */
export function todaysFinishedSession(): WorkoutSession | undefined {
  const today = getDayStamp()
  return getWorkoutSessions().find((s) => s.date === today && s.finishedAt)
}
