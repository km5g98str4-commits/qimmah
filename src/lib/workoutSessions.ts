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

/**
 * (P5) حالة الجلسة الصادقة:
 *   • in_progress: جلسة نشطة لم تُحفظ نهايتها بعد.
 *   • completed: كل تمارين الجلسة المطلوبة أُنجزت.
 *   • ended_early: إنهاء مبكر مؤكَّد — بعض التمارين لم تكتمل (اليوم **ليس** مكتملًا).
 *   • abandoned: جلسة مستعادة قديمة صُنّفت مهجورة — المجموعات المنفّذة تبقى محفوظة.
 * غياب الحقل = جلسة قديمة (قبل P5): تُقرأ completed عند وجود finishedAt (توافق خلفي).
 */
export type SessionStatus = 'in_progress' | 'completed' | 'ended_early' | 'abandoned'

export interface WorkoutSession {
  id: string
  date: string
  startedAt: string
  finishedAt?: string
  workoutDayId: string
  workoutDayName: string
  exercises: SessionExercise[]
  /** (P5) حالة الجلسة — اختيارية للتوافق الخلفي؛ الغياب = completed القديمة. */
  status?: SessionStatus
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

/**
 * @deprecated (P5) «أي finishedAt = يوم مكتمل» لم تعد صادقة: الإنهاء المبكر
 * (ended_early) له finishedAt لكنه **لا** يكمل اليوم. استخدم `todaysCompletion()`
 * من `@/lib/workoutSessionEngine` (تفرّق complete/partial/none). تبقى هذه الدالة
 * بسلوكها القديم حرفيًا (أي جلسة منتهية اليوم) للمستهلكين القدامى فقط.
 */
export function todaysFinishedSession(): WorkoutSession | undefined {
  const today = getDayStamp()
  return getWorkoutSessions().find((s) => s.date === today && s.finishedAt)
}
