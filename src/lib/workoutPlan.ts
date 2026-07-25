import type { PlanDay, PlanExercise, WorkoutPlan } from '@/types/workout'
import type { Lang } from '@/lib/appPreferences'
import { getExercise } from '@/data/exercises'
import { getTemplate } from '@/data/workoutTemplates'

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
    days: tpl.days.map<PlanDay>((d) => ({
      id: d.id,
      nameAr: d.nameAr,
      nameEn: d.nameEn,
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

/** صفّ واحد من الجدول الأسبوعي (يكفي منه النوع لتحديد أيام الراحة). */
export interface WeekRow {
  type: string
}

/**
 * فهرس اليوم داخل الجدول الأسبوعي المخزَّن — الجدول يبدأ بالسبت،
 * بينما getDay() يبدأ بالأحد، فنُزيح بمقدار يوم واحد.
 */
export function weekRowIndex(now: Date = new Date()): number {
  return (now.getDay() + 1) % 7
}

/**
 * يختار تمرين اليوم من الخطة اعتمادًا على الجدول الأسبوعي للمستخدم.
 *
 * قبل ذلك كان الاختيار `getDay() % days.length`، وهو خطأ مزدوج: يتجاهل أيام
 * الراحة تمامًا (فيظهر تمرين كل يوم من السبت للجمعة)، ويكرّر نفس اليوم مرّتين
 * في الأسبوع عشوائيًا. الآن: يوم الراحة يُعيد undefined، وأيام التدريب تأخذ
 * أيام الخطة بالترتيب.
 *
 * `week` اختياري للتوافق: بدونه نعود للسلوك القديم بدل أن نكسر مستدعيًا قديمًا.
 */
export function todayPlanDay(
  plan: WorkoutPlan,
  week?: WeekRow[],
  now: Date = new Date(),
): PlanDay | undefined {
  if (!plan.days.length) return undefined
  if (!week || week.length !== 7) return plan.days[now.getDay() % plan.days.length]

  const idx = weekRowIndex(now)
  if (week[idx]?.type === 'rest') return undefined

  // ترتيب هذا اليوم بين أيام التدريب في الأسبوع → يوم الخطة المقابل.
  let trainingIndex = 0
  for (let i = 0; i < idx; i++) {
    if (week[i]?.type !== 'rest') trainingIndex++
  }
  return plan.days[trainingIndex % plan.days.length]
}

/** هل اليوم يوم راحة حسب الجدول الأسبوعي؟ */
export function isRestDay(week?: WeekRow[], now: Date = new Date()): boolean {
  if (!week || week.length !== 7) return false
  return week[weekRowIndex(now)]?.type === 'rest'
}
