// إحصاءات تمرين واحد من سجلّ الجلسات — للتاريخ والرسوم والأرقام في تفاصيل التمرين.
// قراءة فقط: لا يكتب شيئًا (لا يمسّ منطق الحفظ).

import { loadSessions, type WorkoutSession } from './workoutSessions'
import type { ProgressPoint } from '@/types'

const numOf = (w?: string): number => {
  if (!w) return NaN
  const m = String(w).match(/[\d.]+/)
  return m ? Number(m[0]) : NaN
}

function oneRepMax(weight: number, reps: number): number {
  if (Number.isNaN(weight) || Number.isNaN(reps) || reps <= 0) return NaN
  return Math.round(weight * (1 + reps / 30))
}

function sessionTime(s: WorkoutSession): string {
  return s.finishedAt ?? s.startedAt ?? `${s.date}T12:00:00`
}

/** سطر تاريخ لجلسة واحدة لمست هذا التمرين. */
export interface ExerciseSessionRow {
  date: string
  dayName: string
  topWeight: number
  topReps: number
  volume: number
  sets: number
}

export interface ExerciseRecords {
  bestWeight: number
  bestReps: number
  bestVolume: number
  bestOneRepMax: number
}

export interface ExerciseStats {
  history: ExerciseSessionRow[]
  records: ExerciseRecords
  /** نقاط رسم وزن أعلى مجموعة عبر الجلسات (تصاعديًا زمنيًا). */
  weightTrend: ProgressPoint[]
  totalSessions: number
}

/** يحسب إحصاءات تمرين من كل الجلسات المحفوظة. */
export function exerciseStats(exerciseId: string): ExerciseStats {
  const all = loadSessions()
    .filter((s) => s.exercises.some((e) => e.exerciseId === exerciseId))
    .sort((a, b) => (sessionTime(a) < sessionTime(b) ? 1 : -1)) // الأحدث أولًا

  const rows: ExerciseSessionRow[] = []
  all.forEach((s) => {
    const se = s.exercises.find((e) => e.exerciseId === exerciseId)
    if (!se) return
    const sets = (se.sets ?? []).filter((st) => st.completed)
    let topWeight = NaN
    let topReps = NaN
    let volume = 0
    sets.forEach((st) => {
      const w = numOf(st.weightKg)
      const r = numOf(st.actualReps) || numOf(st.targetReps)
      if (!Number.isNaN(w) && !Number.isNaN(r)) volume += w * r
      if (!Number.isNaN(w) && (Number.isNaN(topWeight) || w > topWeight)) {
        topWeight = w
        topReps = r
      }
    })
    // توافق قديم: حقل وزن مفرد
    if (Number.isNaN(topWeight) && se.weight) {
      topWeight = numOf(se.weight)
      topReps = numOf(se.repsDone) || numOf(se.targetReps)
    }
    rows.push({
      date: s.date,
      dayName: s.workoutDayName,
      topWeight: Number.isNaN(topWeight) ? 0 : topWeight,
      topReps: Number.isNaN(topReps) ? 0 : topReps,
      volume: Math.round(volume),
      sets: sets.length,
    })
  })

  const records: ExerciseRecords = {
    bestWeight: Math.max(0, ...rows.map((r) => r.topWeight)),
    bestReps: Math.max(0, ...rows.map((r) => r.topReps)),
    bestVolume: Math.max(0, ...rows.map((r) => r.volume)),
    bestOneRepMax: Math.max(0, ...rows.map((r) => oneRepMax(r.topWeight, r.topReps) || 0)),
  }

  // نقاط الرسم: أقدم → أحدث، وزن أعلى مجموعة
  const trendRows = [...rows].reverse().filter((r) => r.topWeight > 0)
  const weightTrend: ProgressPoint[] = trendRows.map((r) => ({
    label: r.date.slice(5), // MM-DD
    value: r.topWeight,
  }))

  return { history: rows, records, weightTrend, totalSessions: rows.length }
}
