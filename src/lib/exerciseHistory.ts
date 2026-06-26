// سجل أوزان التمارين — آخر وزن وأفضل وزن لكل تمرين (محلي فقط).

export const EXERCISE_HISTORY_KEY = 'qimmah:exerciseHistory:v1'

export interface ExerciseRecord {
  lastWeight?: string
  bestWeight?: string
  lastCompletedAt?: string
}

export type ExerciseHistory = Record<string, ExerciseRecord>

export function loadHistory(): ExerciseHistory {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(EXERCISE_HISTORY_KEY)
    return raw ? (JSON.parse(raw) as ExerciseHistory) : {}
  } catch {
    return {}
  }
}

export function saveHistory(history: ExerciseHistory): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(EXERCISE_HISTORY_KEY, JSON.stringify(history))
}

export function getRecord(exerciseId: string): ExerciseRecord | undefined {
  return loadHistory()[exerciseId]
}

const numOf = (w?: string): number => {
  if (!w) return NaN
  const m = String(w).match(/[\d.]+/)
  return m ? Number(m[0]) : NaN
}

/** يحدّث آخر/أفضل وزن لتمرين عند إدخال وزن جديد. */
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
  return {
    ...history,
    [exerciseId]: { lastWeight: weight, bestWeight: best, lastCompletedAt: completedAt },
  }
}
