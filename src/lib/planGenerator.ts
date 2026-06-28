// مولّد الخطة بقواعد ثابتة (بلا أي AI/خادم).
// يأخذ الملف الشخصي + الهدف ويولّد: أهداف، جدول تمرين، خطة أكل، التزامات، قياسات.

import type {
  ActivityLevel,
  ExperienceBand,
  GoalType,
  MuscleFocus,
  Profile,
  Targets,
  TrainingLevel,
} from '@/types/profile'
import type { CommitmentPlan } from '@/types/progress'
import type { MeasurementPlan } from '@/types/progress'
import type { NutritionPlan, PlanMeal } from '@/types/nutrition'
import type { Muscle, WorkoutPlan } from '@/types/workout'
import type { RoutineRow } from '@/lib/customization'
import { computeTargets, calorieGoalFromGoalType, goalTypeLabel } from '@/lib/calculators'
import { generatePlanFromTemplate } from '@/lib/workoutPlan'
import { getExercise } from '@/data/exercises'
import { getTemplate } from '@/data/workoutTemplates'
import { createPlanMealFromTemplate, planTotals } from '@/lib/nutritionPlan'
import { createPlanCommitment } from '@/lib/commitmentPlan'

export interface GeneratedPlan {
  targets: Targets
  suggestedWorkoutTemplateId: string
  weeklySchedule: RoutineRow[]
  workoutPlan: WorkoutPlan
  nutritionPlan: NutritionPlan
  commitmentPlan: CommitmentPlan
  measurementPlan: MeasurementPlan
  explanationAr: string
  planLabelAr: string
  warningsAr: string[]
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** مستوى التدريب من مدّة الخبرة. */
export function levelFromExperience(band?: ExperienceBand): TrainingLevel {
  if (band === 'lt1m' || band === '1to6m') return 'beginner'
  if (band === '6to12m' || band === '1to2y') return 'intermediate'
  if (band === 'gt2y') return 'advanced'
  return 'intermediate'
}

/** مستوى النشاط مشتقّ من عدد أيام التمرين. */
export function deriveActivityLevel(days: number): ActivityLevel {
  if (days <= 2) return 'light'
  if (days <= 4) return 'moderate'
  if (days <= 6) return 'active'
  return 'very_active'
}

/** وزن هدف منطقي مشتقّ من الوزن والهدف (حين لا يُسأل عنه صراحةً). */
export function deriveTargetWeight(weightKg: number, gt: GoalType): number {
  if (gt === 'cutting') return Math.round(weightKg * 0.92)
  if (gt === 'bulking' || gt === 'strength') return Math.round(weightKg * 1.05)
  return weightKg // recomposition / health / maintenance / returning
}

/** يختار قالب التمرين حسب القواعد (يراعي إمكانية الوصول والأدوات إن توفّرت). */
export function recommendTemplateId(p: Profile): string {
  const access = p.gymAccess ?? (p.workoutEnvironment === 'home' ? 'home' : 'full')
  const equip = p.equipment ?? []
  const days = clamp(p.trainingDays, 1, 7)
  const lvl = p.trainingLevel
  const gt = p.goalType

  // بيئات محدودة الأدوات → تمارين مناسبة فقط
  if (access === 'bodyweight' || access === 'home') return 'home-workout'
  if (access === 'small') {
    const hasBarbell = equip.includes('barbell')
    const hasMachine = equip.includes('machine') || equip.includes('cable')
    if (!hasBarbell && hasMachine) return 'machine-only'
    if (!hasBarbell && !hasMachine) return 'home-workout'
    // عنده بار → نكمل بمنطق النادي الكامل
  }

  if (gt === 'returning') return days >= 4 ? 'beginner-gym' : 'full-body-3'

  if (lvl === 'beginner') {
    if (days <= 3) return 'full-body-3'
    return 'beginner-gym' // 4+ أيام للمبتدئ: برنامج بسيط
  }
  if (lvl === 'intermediate') {
    if (days <= 3) return gt === 'bulking' || gt === 'strength' ? 'push-pull-legs' : 'full-body-3'
    if (days === 4) return gt === 'bulking' || gt === 'strength' ? 'muscle-gain' : 'upper-lower-4'
    if (days === 5) return 'muscle-gain'
    return 'push-pull-legs' // 6
  }
  // advanced
  if (days <= 4) return gt === 'bulking' || gt === 'strength' ? 'muscle-gain' : 'upper-lower-4'
  if (days === 5) return 'muscle-gain'
  return 'push-pull-legs'
}

const WEEKDAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
// توزيع أيام التمرين على الأسبوع (فهارس الأيام المدرَّبة)
const TRAIN_PATTERN: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
}

function dayType(nameEn: string): RoutineRow['type'] {
  const n = nameEn.toLowerCase()
  if (n.includes('push')) return 'push'
  if (n.includes('pull')) return 'pull'
  if (n.includes('leg') || n.includes('lower')) return 'legs'
  if (n.includes('cardio')) return 'cardio'
  return 'full'
}

/** يبني جدولًا أسبوعيًا متّسقًا مع أيام القالب (تدوير الأيام عبر الأسبوع). */
export function buildWeeklySchedule(
  templateId: string,
  trainingDays: number,
  preferredDays?: number[],
): RoutineRow[] {
  const tpl = getTemplate(templateId)
  const days = Math.max(1, Math.min(7, trainingDays))
  let trainIdx: number[]
  if (preferredDays && preferredDays.length) {
    trainIdx = [...new Set(preferredDays)].filter((i) => i >= 0 && i < 7).sort((a, b) => a - b).slice(0, days)
    // أكمل من النمط الافتراضي إن اختار المستخدم أيامًا أقل من المطلوب
    if (trainIdx.length < days) {
      for (const i of TRAIN_PATTERN[days] ?? []) {
        if (trainIdx.length >= days) break
        if (!trainIdx.includes(i)) trainIdx.push(i)
      }
      trainIdx.sort((a, b) => a - b)
    }
  } else {
    trainIdx = TRAIN_PATTERN[days] ?? TRAIN_PATTERN[3]
  }
  const rows: RoutineRow[] = []
  let c = 0
  WEEKDAYS.forEach((d, i) => {
    if (tpl && trainIdx.includes(i)) {
      const td = tpl.days[c % tpl.days.length]
      rows.push({ day: d, title: td.nameAr, type: dayType(td.nameEn) })
      c++
    } else {
      rows.push({ day: d, title: 'راحة واستشفاء', type: 'rest' })
    }
  })
  return rows
}

const STYLE_TEMPLATES: Record<Profile['nutritionStyle'], { breakfast: string; lunch: string; dinner: string; snack: string }> = {
  simple: { breakfast: 'eggs-and-bread', lunch: 'chicken-rice', dinner: 'light-dinner', snack: 'greek-yogurt-snack' },
  high_protein: { breakfast: 'high-protein-breakfast', lunch: 'chicken-rice', dinner: 'salmon-quinoa', snack: 'greek-yogurt-snack' },
  saudi: { breakfast: 'fava-bread-breakfast', lunch: 'kabsa-chicken', dinner: 'light-dinner', snack: 'nuts-dates-snack' },
  economical: { breakfast: 'oats-and-whey', lunch: 'chicken-rice', dinner: 'beef-rice', snack: 'tuna-sandwich' },
  flexible: { breakfast: 'oats-and-whey', lunch: 'chicken-sweet-potato', dinner: 'light-dinner', snack: 'cottage-fruit' },
}

/** يولّد خطة أكل تقريبية من الأهداف والتفضيلات (يحاول الاقتراب من السعرات/البروتين). */
export function generateNutrition(p: Profile, targets: Targets): { plan: NutritionPlan; warning?: string } {
  const goal = calorieGoalFromGoalType(p.goalType)
  const targetCalories =
    targets.targetCalories ||
    (goal === 'cut' ? targets.cuttingCalories : goal === 'bulk' ? targets.bulkingCalories : targets.maintenanceCalories)
  const mealsCount = Math.max(3, Math.min(5, p.mealsPerDay))
  const s = STYLE_TEMPLATES[p.nutritionStyle] ?? STYLE_TEMPLATES.high_protein

  const slots: string[] = [s.breakfast, s.lunch, s.dinner]
  if (mealsCount >= 4) slots.push(s.snack)
  if (mealsCount >= 5) slots.push('protein-shake')

  let meals: PlanMeal[] = slots.map((id, i) => createPlanMealFromTemplate(id, i))

  // محاولة تقريب السعرات ضمن ±10% عبر معامل قياس بسيط على الماكروز المعروضة
  const totals0 = planTotals(meals)
  if (totals0.calories > 0) {
    const factor = targetCalories / totals0.calories
    const clamped = Math.max(0.6, Math.min(1.6, factor)) // لا نبالغ في التحجيم
    if (Math.abs(factor - 1) > 0.1) {
      meals = meals.map((m) => ({
        ...m,
        calories: Math.round(m.calories * clamped),
        protein: Math.round(m.protein * clamped),
        carbs: Math.round(m.carbs * clamped),
        fat: Math.round(m.fat * clamped),
      }))
    }
  }

  const totals = planTotals(meals)
  const within =
    targetCalories > 0 && Math.abs(totals.calories - targetCalories) / targetCalories <= 0.12 &&
    targets.proteinGrams > 0 && Math.abs(totals.protein - targets.proteinGrams) / targets.proteinGrams <= 0.15

  const plan: NutritionPlan = {
    enabled: p.trackNutrition,
    targetCalories,
    targetProtein: targets.proteinGrams,
    targetCarbs: targets.carbsGrams,
    targetFat: targets.fatGrams,
    targetWaterLiters: targets.waterLiters,
    meals,
  }
  return { plan, warning: within ? undefined : 'هذه أمثلة وجبات مبدئية وليست خطة كاملة مطابقة للأهداف.' }
}

const COMMITMENTS_BY_GOAL: Record<GoalType, string[]> = {
  cutting: ['today-workout', 'steps-10k', 'water-target', 'sleep-7h', 'protein-target'],
  bulking: ['today-workout', 'protein-target', 'calories-target', 'sleep-7h', 'post-workout-meal'],
  strength: ['today-workout', 'warm-up', 'protein-target', 'sleep-7h', 'water-target'],
  returning: ['today-workout', 'stretching', 'light-walk', 'water-target', 'sleep-7h'],
  health: ['today-workout', 'steps-10k', 'water-target', 'sleep-7h', 'vegetables'],
  maintenance: ['today-workout', 'protein-target', 'water-target', 'sleep-7h', 'steps-10k'],
  recomposition: ['today-workout', 'protein-target', 'steps-10k', 'water-target', 'sleep-7h'],
}

export function generateCommitments(gt: GoalType): CommitmentPlan {
  const ids = COMMITMENTS_BY_GOAL[gt] ?? COMMITMENTS_BY_GOAL.health
  return { enabled: true, items: ids.map((id, i) => createPlanCommitment(id, i)) }
}

/** الخطة الافتراضية للقياسات (بدون «المزاج»). */
export function defaultMeasurementPlan(): MeasurementPlan {
  return { enabled: true, selectedTypeIds: ['weightKg', 'waistCm', 'bodyFatPercent', 'progressPhotoNote'] }
}

// عضلات كل تركيز — لزيادة حجم العمل عليها.
const FOCUS_MUSCLES: Record<MuscleFocus, Muscle[]> = {
  balanced: [],
  upper: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
  lower: ['quads', 'hamstrings', 'glutes', 'calves'],
  core: ['core'],
  chest: ['chest'],
  back: ['back'],
  shoulders: ['shoulders'],
  arms: ['biceps', 'triceps'],
}

const COMPOUND_PATTERNS = new Set(['squat', 'hinge', 'push', 'pull', 'lunge'])

/** يزيد مجموعة واحدة على تمارين العضلات المستهدفة (توزيع حجم العمل). */
function applyMuscleFocus(plan: WorkoutPlan, focus: MuscleFocus): WorkoutPlan {
  const muscles = FOCUS_MUSCLES[focus] ?? []
  if (!muscles.length) return plan
  const set = new Set(muscles)
  return {
    ...plan,
    days: plan.days.map((d) => ({
      ...d,
      exercises: d.exercises.map((pe) => {
        const ex = getExercise(pe.exerciseId)
        if (ex && set.has(ex.primaryMuscle) && pe.sets < 5) return { ...pe, sets: pe.sets + 1 }
        return pe
      }),
    })),
  }
}

/** هدف القوة: تكرارات أقل وراحة أطول على المركّبات. */
function applyStrengthScheme(plan: WorkoutPlan): WorkoutPlan {
  return {
    ...plan,
    days: plan.days.map((d) => ({
      ...d,
      exercises: d.exercises.map((pe) => {
        const ex = getExercise(pe.exerciseId)
        if (ex && COMPOUND_PATTERNS.has(ex.movementPattern)) {
          return { ...pe, reps: '4–6', restSec: Math.max(pe.restSec, 150) }
        }
        return pe
      }),
    })),
  }
}

/** رجوع بعد انقطاع: تخفيف حجم الأسبوع الأول (مجموعة أقل، حد أدنى مجموعتان). */
function applyDeload(plan: WorkoutPlan): WorkoutPlan {
  return {
    ...plan,
    days: plan.days.map((d) => ({
      ...d,
      exercises: d.exercises.map((pe) => ({ ...pe, sets: Math.max(2, pe.sets - 1) })),
    })),
  }
}

/** اسم/وسم الخطة المختصر. */
export function planLabel(p: Profile, templateId: string): string {
  const tpl = getTemplate(templateId)
  const days = clamp(p.trainingDays, 1, 7)
  return `خطة ${goalTypeLabel(p.goalType)} · ${days} أيام${tpl ? ` · ${tpl.nameAr}` : ''}`
}

/** المولّد الكامل. */
export function generatePlan(profile: Profile): GeneratedPlan {
  const p: Profile = { ...profile, goal: calorieGoalFromGoalType(profile.goalType) }
  const targets = computeTargets(p)
  const templateId = recommendTemplateId(p)
  const tpl = getTemplate(templateId)
  const isReturning = p.goalType === 'returning' || p.consistency === 'returning'

  let workoutPlan = generatePlanFromTemplate(templateId)
  if (p.goalType === 'strength') workoutPlan = applyStrengthScheme(workoutPlan)
  workoutPlan = applyMuscleFocus(workoutPlan, p.muscleFocus ?? 'balanced')
  if (isReturning) workoutPlan = applyDeload(workoutPlan)

  const weeklySchedule = buildWeeklySchedule(templateId, p.trainingDays, p.preferredDays)
  const { plan: nutritionPlan, warning: nutritionWarning } = generateNutrition(p, targets)

  const warnings: string[] = []
  if (isReturning) warnings.push('خفّفنا حجم أسبوعك الأول للرجوع بأمان — زِد تدريجيًا بعدها.')
  if (p.trainingLevel === 'beginner' && p.trainingDays >= 5) {
    warnings.push('للمبتدئ ننصح بـ3–4 أيام في البداية لبناء الالتزام والاستشفاء.')
  }
  // فحص تكرار الأرجل لخطط التضخيم متعددة الأيام
  if ((p.goalType === 'bulking' || p.goalType === 'recomposition') && p.trainingDays >= 4) {
    const legDays = weeklySchedule.filter((d) => d.type === 'legs' || d.type === 'full').length
    if (legDays < 2) warnings.push('تأكد من تدريب الأرجل مرتين أسبوعيًا على الأقل في خطط التضخيم.')
  }
  if (nutritionWarning) warnings.push(nutritionWarning)

  const explanationAr = tpl
    ? `اخترنا «${tpl.nameAr}» لأنك ${goalTypeLabel(p.goalType)} بمستوى ${p.trainingLevel === 'beginner' ? 'مبتدئ' : p.trainingLevel === 'intermediate' ? 'متوسط' : 'متقدّم'} و${p.trainingDays} أيام تمرين${p.workoutEnvironment === 'home' ? ' في المنزل' : ''}.`
    : 'تم توليد جدول مناسب لبياناتك.'

  return {
    targets,
    suggestedWorkoutTemplateId: templateId,
    weeklySchedule,
    workoutPlan,
    nutritionPlan,
    commitmentPlan: generateCommitments(p.goalType),
    measurementPlan: defaultMeasurementPlan(),
    explanationAr,
    planLabelAr: planLabel(p, templateId),
    warningsAr: warnings,
  }
}
