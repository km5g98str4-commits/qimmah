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

/** اسم التمرين حسب اللغة: العربية = «إنجليزي — عربي» (الاسم الإنجليزي أولًا)، الإنجليزية = إنجليزي فقط. */
export function exerciseDisplayName(
  nameAr: string,
  nameEn: string,
  lang: Lang,
): string {
  if (lang === 'en') return nameEn
  return nameEn && nameAr ? `${nameEn} — ${nameAr}` : nameEn || nameAr
}

/** اسم عنصر الخطة (يراعي الأسماء المخصّصة). */
export function planExerciseName(pe: PlanExercise, lang: Lang): string {
  const ex = getExercise(pe.exerciseId)
  const ar = pe.customNameAr || ex?.nameAr || ''
  const en = pe.customNameEn || ex?.nameEn || ''
  return exerciseDisplayName(ar, en, lang)
}

/** رابط الفيديو لعنصر الخطة (تخصيص ثم مكتبة). */
export function planExerciseVideo(pe: PlanExercise): string {
  if (pe.videoUrl) return pe.videoUrl
  return getExercise(pe.exerciseId)?.videoUrl ?? ''
}

/** يختار يوم اليوم من الخطة حسب يوم الأسبوع (تدوير على عدد الأيام). */
export function todayPlanDay(plan: WorkoutPlan): PlanDay | undefined {
  if (!plan.days.length) return undefined
  const index = new Date().getDay() % plan.days.length
  return plan.days[index]
}
