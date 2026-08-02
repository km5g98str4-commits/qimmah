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

const MUSCLE_TO_GROUP: Record<Muscle, { ar: string; en: string } | null> = {
  chest: { ar: 'الصدر', en: 'chest' }, back: { ar: 'الظهر', en: 'back' }, shoulders: { ar: 'الأكتاف', en: 'shoulders' },
  biceps: { ar: 'الذراع', en: 'arms' }, triceps: { ar: 'الذراع', en: 'arms' },
  legs: { ar: 'الأرجل', en: 'legs' }, glutes: { ar: 'الأرجل', en: 'legs' }, hamstrings: { ar: 'الأرجل', en: 'legs' }, quads: { ar: 'الأرجل', en: 'legs' }, calves: { ar: 'الأرجل', en: 'legs' },
  core: { ar: 'الجذع', en: 'core' }, cardio: null,
}

function groupFor(muscle: Muscle | undefined, lang: 'ar' | 'en'): string | null {
  const group = muscle ? MUSCLE_TO_GROUP[muscle] : null
  return group?.[lang] ?? null
}

function sessionGroups(s: WorkoutSession, lang: 'ar' | 'en'): string[] {
  const set = new Set<string>()
  for (const ex of s.exercises) {
    const m = getExercise(ex.exerciseId)?.primaryMuscle
    const g = groupFor(m, lang)
    if (g) set.add(g)
  }
  return [...set]
}

function sessionTopSets(s: WorkoutSession, lang: 'ar' | 'en'): { exerciseId: string; name: string; weightKg: number }[] {
  return s.exercises.map((ex) => {
    let top = 0
    for (const st of ex.sets ?? []) if (st.completed) top = Math.max(top, numOf(st.weightKg))
    const catalogExercise = getExercise(ex.exerciseId)
    const name = lang === 'ar' ? catalogExercise?.nameAr ?? ex.exerciseNameAr : catalogExercise?.nameEn
    return { exerciseId: ex.exerciseId, name: name ?? ex.exerciseId, weightKg: top }
  }).filter((t) => t.weightKg > 0)
}

/** يبني مُدخل المحرّك من المتاجر (يُستدعى عند العرض؛ آمن على الخادم يُعيد فارغًا). */
export function buildInsightInput(nowMs: number, lang: 'ar' | 'en' = 'ar'): InsightInput {
  const finished = loadSessions().filter((s) => s.finishedAt)
  const sessions = finished.map((s) => ({
    date: s.date,
    volume: sessionVolume(s),
    muscleGroups: sessionGroups(s, lang),
    topSets: sessionTopSets(s, lang),
  }))

  const c = loadCustomization()
  const muscleGroups = [...new Set(c.workoutPlan.days.flatMap((day) => day.exercises).map((exercise) => {
    const muscle = getExercise(exercise.exerciseId)?.primaryMuscle
    return groupFor(muscle, lang)
  }).filter((group): group is string => Boolean(group)))]
  const plan = {
    daysPerWeek: c.workoutPlan?.days?.length || 0,
    targetProtein: c.nutritionPlan?.targetProtein ? numOf(c.nutritionPlan.targetProtein) : null,
    muscleGroups,
  }

  const weights = loadLogs()
    .map((l) => ({ date: l.date, kg: numOf(l.values?.weightKg) }))
    .filter((w) => w.kg > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  const proteinByDate: Record<string, number | null> = {}
  for (const [date, log] of Object.entries(getNutritionLogs())) {
    proteinByDate[date] = log?.loggedFood ? numOf(log.loggedFood.protein) : null
  }

  const prBests: Record<string, { name: string; best: number }> = {}
  for (const [id, rec] of Object.entries(loadHistory())) {
    const best = numOf(rec.bestWeight)
    const exercise = getExercise(id)
    if (best > 0) prBests[id] = { name: (lang === 'ar' ? exercise?.nameAr : exercise?.nameEn) ?? id, best }
  }

  return { nowMs, lang, sessions, plan, weights, proteinByDate, prBests }
}
