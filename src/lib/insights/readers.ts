// محرّك الرؤى — المُهايئ (impure): يجمع InsightInput من المتاجر الحقيقية.
// هذا الملف وحده يلمس المتاجر؛ النواة (metrics/generate) تبقى نقيّة وقابلة للاختبار.

import { loadSessions, type WorkoutSession } from '@/lib/workoutSessions'
import { sessionVolume } from '@/lib/progressStats'
import { loadHistory } from '@/lib/exerciseHistory'
import { loadLogs } from '@/lib/measurementLog'
import { getNutritionLogs } from '@/lib/historyStore'
import { getExercise } from '@/data/exercises'
import { loadCustomization } from '@/lib/customization'
import type { Muscle } from '@/types/workout'
import type { InsightInput } from './types'

const numOf = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// عضلة أساسية (تعداد خشن) → مجموعة عربية تطابق MUSCLE_GROUPS.
const MUSCLE_TO_GROUP: Record<Muscle, string | null> = {
  chest: 'الصدر', back: 'الظهر', shoulders: 'الأكتاف',
  biceps: 'الذراع', triceps: 'الذراع',
  legs: 'الأرجل', glutes: 'الأرجل', hamstrings: 'الأرجل', quads: 'الأرجل', calves: 'الأرجل',
  core: 'الكور', cardio: null,
}

function sessionGroups(s: WorkoutSession): string[] {
  const set = new Set<string>()
  for (const ex of s.exercises) {
    const m = getExercise(ex.exerciseId)?.primaryMuscle
    const g = m ? MUSCLE_TO_GROUP[m] : null
    if (g) set.add(g)
  }
  return [...set]
}

function sessionTopSets(s: WorkoutSession): { exerciseId: string; nameAr: string; weightKg: number }[] {
  return s.exercises.map((ex) => {
    let top = 0
    for (const st of ex.sets ?? []) if (st.completed) top = Math.max(top, numOf(st.weightKg))
    return { exerciseId: ex.exerciseId, nameAr: getExercise(ex.exerciseId)?.nameAr ?? ex.exerciseNameAr ?? ex.exerciseId, weightKg: top }
  }).filter((t) => t.weightKg > 0)
}

/** يبني مُدخل المحرّك من المتاجر (يُستدعى عند العرض؛ آمن على الخادم يُعيد فارغًا). */
export function buildInsightInput(nowMs: number, lang: 'ar' | 'en' = 'ar'): InsightInput {
  const finished = loadSessions().filter((s) => s.finishedAt)
  const sessions = finished.map((s) => ({
    date: s.date,
    volume: sessionVolume(s),
    muscleGroups: sessionGroups(s),
    topSets: sessionTopSets(s),
  }))

  const c = loadCustomization()
  const plan = {
    daysPerWeek: c.workoutPlan?.days?.length || 0,
    targetProtein: c.nutritionPlan?.targetProtein ? numOf(c.nutritionPlan.targetProtein) : null,
  }

  const weights = loadLogs()
    .map((l) => ({ date: l.date, kg: numOf(l.values?.weightKg) }))
    .filter((w) => w.kg > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  const proteinByDate: Record<string, number | null> = {}
  for (const [date, log] of Object.entries(getNutritionLogs())) {
    proteinByDate[date] = log?.loggedFood ? numOf(log.loggedFood.protein) : null
  }

  const prBests: Record<string, { nameAr: string; best: number }> = {}
  for (const [id, rec] of Object.entries(loadHistory())) {
    const best = numOf(rec.bestWeight)
    if (best > 0) prBests[id] = { nameAr: getExercise(id)?.nameAr ?? id, best }
  }

  return { nowMs, lang, sessions, plan, weights, proteinByDate, prBests }
}
