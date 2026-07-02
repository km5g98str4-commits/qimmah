// الذكاء التدريبي — يولّد ملاحظات بسيطة من سجلّ الأداء وجلسات التمرين والتغطية العضلية،
// بلغة الواجهة الحالية (عربي/إنجليزي) عبر قاموس i18n/dict/insights (P10.1).
//
// أمثلة:
// - ثبات الأداء على الهدف لجلستين → اقترح زيادة الوزن 2.5 كجم.
// - عدم بلوغ التكرارات المستهدفة لجلستين → ثبّت الوزن.
// - تسجيل ألم → جرّب بديلًا أو خفّف الحمل.
// - عضلة ناقصة هذا الأسبوع → نبّه المستخدم.

import type { ExerciseHistory } from './exerciseHistory'
import type { WorkoutSession, SessionExercise } from './workoutSessions'
import type { WeeklyCoverageResult } from '@/types/muscles'
import type { Lang } from '@/lib/appPreferences'
import { getExercise } from '@/data/exercises'
import { muscleGroupLabel } from '@/data/muscleGroups'
import { insightsStrings, type InsightsStrings } from '@/i18n/dict/insights'

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
  /** لغة نصوص الملاحظات — الافتراضي العربية (توافقًا مع الاستدعاءات القديمة). */
  lang?: Lang
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

/** اسم التمرين بلغة الواجهة (الإنجليزي عند lang=en مع العربي احتياطًا). */
function exName(exerciseId: string, lang: Lang): string {
  const ex = getExercise(exerciseId)
  if (!ex) return exerciseId
  return lang === 'en' ? ex.nameEn || ex.nameAr : ex.nameAr || ex.nameEn
}

/** يعبّئ قالب ملاحظة بوسائطه ({exercise}/{muscle}). */
function fmt(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => params[key] ?? '')
}

/** يولّد قائمة ملاحظات تدريبية مرتّبة (الأهم أولًا) بلغة الواجهة. */
export function generateInsights({ sessions, history, coverage, lang = 'ar' }: InsightInput): TrainingInsight[] {
  const insights: TrainingInsight[] = []
  const d: InsightsStrings = insightsStrings[lang]

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
    const name = exName(exId, lang)

    // 1) ألم في آخر ظهور
    const painful = recent.find((se) => (se.painNote ?? '').trim().length > 0)
    if (painful) {
      insights.push({
        id: `pain-${exId}`,
        kind: 'pain',
        tone: 'danger',
        exerciseId: exId,
        text: fmt(d.pain, { exercise: name }),
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
        text: fmt(d.progress, { exercise: name }),
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
        text: fmt(d.hold, { exercise: name }),
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
        text: fmt(d.undertrained, { muscle: muscleGroupLabel(m, lang) }),
      })
    })
  }

  // ترتيب: ألم → تثبيت → تقدّم → نواقص
  const order: Record<InsightKind, number> = { pain: 0, hold: 1, progress: 2, undertrained: 3 }
  return insights.sort((a, b) => order[a.kind] - order[b.kind])
}
