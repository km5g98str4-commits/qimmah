// الذكاء التدريبي — يولّد ملاحظات عربية بسيطة من سجلّ الأداء وجلسات التمرين والتغطية العضلية.
//
// أمثلة:
// - ثبات الأداء على الهدف لجلستين → اقترح زيادة الوزن 2.5 كجم.
// - عدم بلوغ التكرارات المستهدفة لجلستين → ثبّت الوزن.
// - تسجيل ألم → جرّب بديلًا أو خفّف الحمل.
// - عضلة ناقصة هذا الأسبوع → نبّه المستخدم.

import type { ExerciseHistory } from './exerciseHistory'
import type { WorkoutSession, SessionExercise } from './workoutSessions'
import type { WeeklyCoverageResult } from '@/types/muscles'
import { getExercise } from '@/data/exercises'
import { muscleLabelAr } from '@/data/muscleGroups'

export type InsightKind = 'progress' | 'hold' | 'pain' | 'undertrained'
export type InsightTone = 'success' | 'warning' | 'danger' | 'info'

export interface TrainingInsight {
  id: string
  kind: InsightKind
  text: string
  tone: InsightTone
  exerciseId?: string
}

interface InsightInput {
  sessions: WorkoutSession[]
  history: ExerciseHistory
  coverage?: WeeklyCoverageResult
}

const numOf = (w?: string): number => {
  if (!w) return NaN
  const m = String(w).match(/[\d.]+/)
  return m ? Number(m[0]) : NaN
}

function sessionTime(s: WorkoutSession): string {
  return s.finishedAt ?? s.startedAt ?? `${s.date}T12:00:00`
}

/** هل بلغ التمرين كل تكراراته المستهدفة في هذه الجلسة؟ */
function metTarget(se: SessionExercise): boolean {
  const sets = se.sets ?? []
  if (!sets.length) return !!se.completed
  return sets.every((s) => s.completed && (!numOf(s.targetReps) || numOf(s.actualReps) >= numOf(s.targetReps)))
}

function exName(exerciseId: string): string {
  return getExercise(exerciseId)?.nameAr ?? exerciseId
}

/** يولّد قائمة ملاحظات تدريبية مرتّبة (الأهم أولًا). */
export function generateInsights({ sessions, history, coverage }: InsightInput): TrainingInsight[] {
  const insights: TrainingInsight[] = []

  const sorted = [...sessions].sort((a, b) => (sessionTime(a) < sessionTime(b) ? 1 : -1))

  // جمع آخر ظهورات كل تمرين (الأحدث أولًا)
  const occurrences: Record<string, SessionExercise[]> = {}
  sorted.forEach((s) => {
    s.exercises.forEach((se) => {
      occurrences[se.exerciseId] = occurrences[se.exerciseId] ?? []
      occurrences[se.exerciseId].push(se)
    })
  })

  Object.entries(occurrences).forEach(([exId, occ]) => {
    const recent = occ.slice(0, 2)
    const rec = history[exId]

    // 1) ألم في آخر ظهور
    const painful = recent.find((se) => (se.painNote ?? '').trim().length > 0)
    if (painful) {
      insights.push({
        id: `pain-${exId}`,
        kind: 'pain',
        tone: 'danger',
        exerciseId: exId,
        text: `سجّلت ألمًا في «${exName(exId)}». جرّب بديلًا أو خفّف الحمل.`,
      })
      return // لا نعطي توصية تقدّم/تثبيت مع وجود ألم
    }

    // 2) ثبات على الهدف لجلستين → زيادة الوزن
    if ((rec?.streakFullReps ?? 0) >= 2) {
      insights.push({
        id: `progress-${exId}`,
        kind: 'progress',
        tone: 'success',
        exerciseId: exId,
        text: `أداؤك ثابت في «${exName(exId)}». جرّب زيادة الوزن 2.5 كجم في التمرين القادم.`,
      })
      return
    }

    // 3) عدم بلوغ التكرارات لجلستين → تثبيت الوزن
    if (recent.length >= 2 && recent.every((se) => !metTarget(se))) {
      insights.push({
        id: `hold-${exId}`,
        kind: 'hold',
        tone: 'warning',
        exerciseId: exId,
        text: `ثبّت الوزن في «${exName(exId)}» حتى تكمل التكرارات المستهدفة.`,
      })
    }
  })

  // 4) عضلات ناقصة هذا الأسبوع
  if (coverage) {
    coverage.missingMuscles.slice(0, 3).forEach((m) => {
      insights.push({
        id: `undertrained-${m}`,
        kind: 'undertrained',
        tone: 'info',
        text: `عضلة ${muscleLabelAr(m)} ناقصة هذا الأسبوع.`,
      })
    })
  }

  // ترتيب: ألم → تثبيت → تقدّم → نواقص
  const order: Record<InsightKind, number> = { pain: 0, hold: 1, progress: 2, undertrained: 3 }
  return insights.sort((a, b) => order[a.kind] - order[b.kind])
}
