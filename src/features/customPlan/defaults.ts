// أدوات مساعدة لباني الجدول المخصّص: أسماء أيام مقترحة + بناء/تعديل شكل WorkoutPlan.

import type { PlanDay, WorkoutPlan } from '@/types/workout'
import { createPlanExercise } from '@/lib/workoutPlan'

export interface DayName {
  ar: string
  en: string
}

/** تقسيمات مقترحة افتراضية حسب عدد الأيام — أسماء واقعية قابلة للتعديل. */
const SPLITS: Record<number, DayName[]> = {
  2: [
    { ar: 'علوي', en: 'Upper' },
    { ar: 'سفلي', en: 'Lower' },
  ],
  3: [
    { ar: 'دفع', en: 'Push' },
    { ar: 'سحب', en: 'Pull' },
    { ar: 'أرجل', en: 'Legs' },
  ],
  4: [
    { ar: 'صدر + ترايسبس', en: 'Chest + Triceps' },
    { ar: 'ظهر + بايسبس', en: 'Back + Biceps' },
    { ar: 'أرجل', en: 'Legs' },
    { ar: 'أكتاف + بطن', en: 'Shoulders + Abs' },
  ],
  5: [
    { ar: 'صدر', en: 'Chest' },
    { ar: 'ظهر', en: 'Back' },
    { ar: 'أرجل', en: 'Legs' },
    { ar: 'أكتاف', en: 'Shoulders' },
    { ar: 'ذراعين', en: 'Arms' },
  ],
  6: [
    { ar: 'دفع', en: 'Push' },
    { ar: 'سحب', en: 'Pull' },
    { ar: 'أرجل', en: 'Legs' },
    { ar: 'دفع', en: 'Push' },
    { ar: 'سحب', en: 'Pull' },
    { ar: 'أرجل', en: 'Legs' },
  ],
}

export const MIN_DAYS = 2
export const MAX_DAYS = 6

/** اسم اليوم المقترح حسب عدد الأيام وموضعه (صفري) — يرجع اسمًا عامًّا عند غياب تقسيمة. */
export function defaultDayName(count: number, index: number): DayName {
  const preset = SPLITS[count]
  if (preset && preset[index]) return preset[index]
  return { ar: `اليوم ${index + 1}`, en: `Day ${index + 1}` }
}

/** معرّف يوم فريد ومستقر داخل الجلسة (لا يعتمد على عشوائية محظورة في السكربتات). */
function newDayId(index: number): string {
  return `custom-day-${index + 1}`
}

/** يبني يومًا فارغًا باسم مقترح. */
export function makeEmptyDay(count: number, index: number): PlanDay {
  const name = defaultDayName(count, index)
  return { id: newDayId(index), nameAr: name.ar, nameEn: name.en, exercises: [] }
}

/** جدول مخصّص فارغ بعدد أيام محدّد وأسماء مقترحة. */
export function makeEmptyCustomPlan(count: number): WorkoutPlan {
  return {
    templateId: 'custom',
    days: Array.from({ length: count }, (_, i) => makeEmptyDay(count, i)),
  }
}

/**
 * يضبط عدد أيام الجدول: يُبقي الأيام الحالية (بتماريها وأسمائها المعدّلة) ويضيف/يحذف من النهاية.
 * الأيام المضافة تأخذ أسماء مقترحة حسب العدد الجديد.
 */
export function resizeDays(plan: WorkoutPlan, count: number): WorkoutPlan {
  const days: PlanDay[] = []
  for (let i = 0; i < count; i++) {
    days.push(plan.days[i] ?? makeEmptyDay(count, i))
  }
  return { ...plan, templateId: 'custom', days }
}

/** يعيد ترقيم ترتيب التمارين داخل يوم (order = الفهرس) بعد إضافة/حذف/تحريك. */
export function reindex(day: PlanDay): PlanDay {
  return { ...day, exercises: day.exercises.map((pe, i) => ({ ...pe, order: i })) }
}

/** يضيف تمرينًا لآخر اليوم بقيمه الافتراضية من المكتبة (بمعرّف فريد داخل اليوم). */
export function addExerciseToDay(day: PlanDay, exerciseId: string): PlanDay {
  const pe = createPlanExercise(exerciseId, day.id, day.exercises.length)
  const existing = new Set(day.exercises.map((e) => e.id))
  let id = pe.id
  let n = 1
  while (existing.has(id)) id = `${pe.id}-${n++}`
  return reindex({ ...day, exercises: [...day.exercises, { ...pe, id }] })
}

/** يحذف تمرينًا من اليوم بمعرّف عنصر الخطة. */
export function removeExerciseFromDay(day: PlanDay, planExerciseId: string): PlanDay {
  return reindex({ ...day, exercises: day.exercises.filter((pe) => pe.id !== planExerciseId) })
}

/** يحرّك تمرينًا لأعلى/أسفل داخل اليوم (dir = -1 أعلى، +1 أسفل). */
export function moveExercise(day: PlanDay, index: number, dir: -1 | 1): PlanDay {
  const target = index + dir
  if (target < 0 || target >= day.exercises.length) return day
  const next = [...day.exercises]
  ;[next[index], next[target]] = [next[target], next[index]]
  return reindex({ ...day, exercises: next })
}

/** عدد كل التمارين في الجدول. */
export function totalExercises(plan: WorkoutPlan): number {
  return plan.days.reduce((sum, d) => sum + d.exercises.length, 0)
}

/** هل الجدول صالح للحفظ؟ (تمرين واحد على الأقل في يوم واحد على الأقل). */
export function isPlanSaveable(plan: WorkoutPlan): boolean {
  return plan.days.some((d) => d.exercises.length > 0)
}
