import type { PlanDay, PlanExercise, WorkoutPlan } from '@/types/workout'
import type { Lang } from '@/lib/appPreferences'
import { getExercise } from '@/data/exercises'
import { getTemplate } from '@/data/workoutTemplates'
import { workoutDayNameAr, workoutDayNameEn } from '@/lib/workoutDayLabel'

/** يبني عنصر خطة من تمرين في المكتبة بقيمه الافتراضية. */
export function createPlanExercise(exerciseId: string, dayId: string, order: number): PlanExercise {
  const ex = getExercise(exerciseId)
  return {
    id: `${dayId}-${exerciseId}-${order}`,
    exerciseId,
    sets: ex?.defaultSets ?? 3,
    reps: ex?.defaultReps ?? '8–12',
    restSec: ex?.defaultRestSec ?? 90,
    startingWeight: '',
    notes: '',
    order,
  }
}

/** يولّد خطة تمرين كاملة من قالب. */
export function generatePlanFromTemplate(templateId: string): WorkoutPlan {
  const tpl = getTemplate(templateId)
  if (!tpl) return { templateId: 'custom', days: [] }
  return {
    templateId: tpl.id,
    days: tpl.days.map<PlanDay>((d, di) => ({
      id: d.id,
      nameAr: workoutDayNameAr(d.nameAr, di),
      nameEn: workoutDayNameEn(d.nameEn, di),
      exercises: d.exerciseIds.map((exId, i) => createPlanExercise(exId, d.id, i)),
    })),
  }
}

export function emptyPlan(): WorkoutPlan {
  return { templateId: 'custom', days: [] }
}

/**
 * اسم التمرين الأساسي (سطر واحد): العربية أساسية في الوضع العربي، الإنجليزية في الوضع الإنجليزي.
 * (P2.7) أُلغي اللصق «إنجليزي — عربي» المزدوج؛ الاسم الثانوي يُعرض كسطر منفصل عبر exerciseNameParts.
 */
export function exerciseDisplayName(
  nameAr: string,
  nameEn: string,
  lang: Lang,
): string {
  if (lang === 'en') return nameEn || nameAr
  return nameAr || nameEn
}

/** جزأا اسم التمرين الموحّدان: أساسي (عربي) + ثانوي (إنجليزي أصغر) في الوضع العربي. */
export interface ExerciseNameParts {
  primary: string
  secondary: string
}

/** يُرجّع الاسم الأساسي + الثانوي بشكل متّسق (عربي أساسي، إنجليزي ثانوي). */
export function exerciseNameParts(nameAr: string, nameEn: string, lang: Lang): ExerciseNameParts {
  if (lang === 'en') return { primary: nameEn || nameAr, secondary: '' }
  const primary = nameAr || nameEn
  const secondary = nameEn && nameAr && nameEn !== nameAr ? nameEn : ''
  return { primary, secondary }
}

/** اسم عنصر الخطة (سطر واحد، يراعي الأسماء المخصّصة). */
export function planExerciseName(pe: PlanExercise, lang: Lang): string {
  const ex = getExercise(pe.exerciseId)
  const ar = pe.customNameAr || ex?.nameAr || ''
  const en = pe.customNameEn || ex?.nameEn || ''
  return exerciseDisplayName(ar, en, lang)
}

/** جزأا اسم عنصر الخطة (أساسي/ثانوي) يراعي الأسماء المخصّصة. */
export function planExerciseNameParts(pe: PlanExercise, lang: Lang): ExerciseNameParts {
  const ex = getExercise(pe.exerciseId)
  const ar = pe.customNameAr || ex?.nameAr || ''
  const en = pe.customNameEn || ex?.nameEn || ''
  return exerciseNameParts(ar, en, lang)
}

/** رابط الفيديو لعنصر الخطة (تخصيص ثم مكتبة). */
export function planExerciseVideo(pe: PlanExercise): string {
  if (pe.videoUrl) return pe.videoUrl
  return getExercise(pe.exerciseId)?.videoUrl ?? ''
}

/** (P12) رابط بحث يوتيوب عن أداء التمرين — احتياطي عند غياب videoUrl. */
export function exerciseVideoSearchUrl(nameEn: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(nameEn)}+form`
}

/** يختار يوم اليوم من الخطة حسب يوم الأسبوع (تدوير على عدد الأيام). */
export function todayPlanDay(plan: WorkoutPlan): PlanDay | undefined {
  if (!plan.days.length) return undefined
  const index = new Date().getDay() % plan.days.length
  return plan.days[index]
}
