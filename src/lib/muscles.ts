// أسماء العضلات بالعربية/الإنجليزية + اشتقاق العضلات المستهدفة ليوم تمرين.

import type { Muscle, PlanDay } from '@/types/workout'
import type { Lang } from '@/lib/appPreferences'
import { getExercise } from '@/data/exercises'

export const muscleLabels: Record<Muscle, { ar: string; en: string }> = {
  chest: { ar: 'الصدر', en: 'Chest' },
  back: { ar: 'الظهر', en: 'Back' },
  shoulders: { ar: 'الأكتاف', en: 'Shoulders' },
  biceps: { ar: 'البايسبس', en: 'Biceps' },
  triceps: { ar: 'الترايسبس', en: 'Triceps' },
  legs: { ar: 'الأرجل', en: 'Legs' },
  glutes: { ar: 'الجلوتس', en: 'Glutes' },
  hamstrings: { ar: 'الهامسترنق', en: 'Hamstrings' },
  quads: { ar: 'الكوادز', en: 'Quads' },
  calves: { ar: 'السمانة', en: 'Calves' },
  core: { ar: 'الكور', en: 'Core' },
  cardio: { ar: 'كارديو', en: 'Cardio' },
}

export function muscleLabel(m: Muscle, lang: Lang): string {
  const l = muscleLabels[m]
  return l ? (lang === 'en' ? l.en : l.ar) : m
}

/** العضلات الأساسية الفريدة المستهدفة في يوم تمرين (مرتّبة حسب الظهور). */
export function dayTargetMuscles(day: PlanDay | undefined, lang: Lang): string[] {
  if (!day) return []
  const seen = new Set<Muscle>()
  const out: string[] = []
  day.exercises.forEach((pe) => {
    const ex = getExercise(pe.exerciseId)
    if (!ex || seen.has(ex.primaryMuscle)) return
    seen.add(ex.primaryMuscle)
    out.push(muscleLabel(ex.primaryMuscle, lang))
  })
  return out
}
