// سجل أداء التمارين — آخر/أفضل وزن وتكرارات + عدد الجلسات.
//
// القراءة/الكتابة تمرّان عبر المتجر التاريخي الدائم (historyStore) حتى لا يبقى
// السجل فارغًا بعد التمرين ولا يتشتّت بين مفتاحين.

import type { SessionExercise } from './workoutSessions'
import { getExerciseHistory, saveExerciseHistory } from './historyStore'

// — مفتاح قديم (للتوافق فقط؛ الكتابة الفعلية في historyStore) —
export const EXERCISE_HISTORY_KEY = 'qimmah:exerciseHistory:v1'

export interface ExerciseRecord {
  lastWeight?: string
  bestWeight?: string
  lastReps?: string
  bestEstimatedOneRepMax?: number
  lastCompletedAt?: string
  totalSessions?: number
  /** عدد الجلسات المتتالية التي أُكملت فيها كل التكرارات على نفس الوزن. */
  streakFullReps?: number
}

export type ExerciseHistory = Record<string, ExerciseRecord>

export function loadHistory(): ExerciseHistory {
  return getExerciseHistory()
}

export function saveHistory(history: ExerciseHistory): void {
  saveExerciseHistory(history)
}

export function getRecord(exerciseId: string): ExerciseRecord | undefined {
  return loadHistory()[exerciseId]
}

const numOf = (w?: string): number => {
  if (!w) return NaN
  const m = String(w).match(/[\d.]+/)
  return m ? Number(m[0]) : NaN
}

/** أثقل وزن في مجموعة مكتملة لهذا التمرين (مع fallback للحقول القديمة). NaN إن لا يوجد. */
export function topCompletedWeight(se: SessionExercise): number {
  let top = NaN
  ;(se.sets ?? []).forEach((s) => {
    if (!s.completed) return
    const w = numOf(s.weightKg)
    if (w > 0 && (Number.isNaN(top) || w > top)) top = w
  })
  if (Number.isNaN(top) && se.weight) {
    const w = numOf(se.weight)
    if (w > 0) top = w
  }
  return top
}

/** أسماء/أوزان التمارين التي حقّقت رقمًا قياسيًا في هذه الجلسة (مقارنةً بالسجل قبل التحديث). */
export function detectSessionPRs(prevHistory: ExerciseHistory, se: SessionExercise): boolean {
  const top = topCompletedWeight(se)
  if (Number.isNaN(top) || top <= 0) return false
  const prevBest = numOf(prevHistory[se.exerciseId]?.bestWeight)
  return Number.isNaN(prevBest) || top > prevBest
}

/** Epley 1RM = w * (1 + reps/30). */
function oneRepMax(weight: number, reps: number): number {
  if (Number.isNaN(weight) || Number.isNaN(reps) || reps <= 0) return NaN
  return Math.round(weight * (1 + reps / 30))
}

/** يحدّث سجل تمرين من نتيجة جلسة (يستخدم أثقل مجموعة منجزة). */
export function recordExercise(
  history: ExerciseHistory,
  se: SessionExercise,
  completedAt: string,
): ExerciseHistory {
  // تمرين تخطّاه المستخدم (لا مجموعة منجزة ولا علامة إكمال) لا يُحدّث السجل —
  // حتى يبقى «آخر إنجاز» وعدّاد الجلسات دقيقًا ولا تتلوّث الأرقام القياسية.
  const anyCompleted = !!se.completed || (se.sets ?? []).some((s) => s.completed)
  if (!anyCompleted) return history

  const sets = (se.sets ?? []).filter((s) => s.completed && numOf(s.weightKg) > 0)
  let topWeight = NaN
  let topReps = NaN
  sets.forEach((s) => {
    const w = numOf(s.weightKg)
    if (Number.isNaN(topWeight) || w > topWeight) {
      topWeight = w
      topReps = numOf(s.actualReps) || numOf(s.targetReps)
    }
  })
  if (Number.isNaN(topWeight) && se.weight) {
    topWeight = numOf(se.weight)
    topReps = numOf(se.repsDone) || numOf(se.targetReps)
  }

  const prev = history[se.exerciseId] ?? {}
  if (Number.isNaN(topWeight)) {
    return {
      ...history,
      [se.exerciseId]: { ...prev, lastCompletedAt: completedAt, totalSessions: (prev.totalSessions ?? 0) + 1 },
    }
  }

  const prevBest = numOf(prev.bestWeight)
  const best = Number.isNaN(prevBest) || topWeight > prevBest ? `${topWeight}` : prev.bestWeight
  const orm = oneRepMax(topWeight, topReps)
  const prevOrm = prev.bestEstimatedOneRepMax ?? 0
  const allFull =
    (se.sets?.length ?? 0) > 0 &&
    se.sets!.every((s) => s.completed && (!numOf(s.targetReps) || numOf(s.actualReps) >= numOf(s.targetReps)))
  const sameWeightAsLast = prev.lastWeight ? numOf(prev.lastWeight) === topWeight : false
  const streak = allFull ? (sameWeightAsLast ? (prev.streakFullReps ?? 0) + 1 : 1) : 0

  return {
    ...history,
    [se.exerciseId]: {
      lastWeight: `${topWeight}`,
      bestWeight: best,
      lastReps: Number.isNaN(topReps) ? prev.lastReps : `${topReps}`,
      bestEstimatedOneRepMax: Number.isNaN(orm) ? prevOrm : Math.max(prevOrm, orm),
      lastCompletedAt: completedAt,
      totalSessions: (prev.totalSessions ?? 0) + 1,
      streakFullReps: streak,
    },
  }
}

/** اقتراح تقدّم بسيط بناءً على السجل. */
export function progressionHint(rec?: ExerciseRecord): string | null {
  if (!rec) return null
  if ((rec.streakFullReps ?? 0) >= 2) return 'جرّب زيادة الوزن 2.5–5 كجم في المرة القادمة.'
  return null
}

// — توافق قديم —
export function recordWeight(
  history: ExerciseHistory,
  exerciseId: string,
  weight: string | undefined,
  completedAt: string,
): ExerciseHistory {
  if (!weight || !weight.trim()) return history
  const prev = history[exerciseId] ?? {}
  const newNum = numOf(weight)
  const bestNum = numOf(prev.bestWeight)
  const best = !Number.isNaN(newNum) && (Number.isNaN(bestNum) || newNum > bestNum) ? weight : prev.bestWeight
  return { ...history, [exerciseId]: { ...prev, lastWeight: weight, bestWeight: best, lastCompletedAt: completedAt } }
}
