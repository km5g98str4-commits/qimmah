// مولّد الخطة بقواعد ثابتة (بلا أي AI/خادم).
// يأخذ الملف الشخصي + الهدف ويولّد: أهداف، جدول تمرين، خطة أكل، التزامات، قياسات.

import type { Profile, Targets, GoalType } from '@/types/profile'
import type { CommitmentPlan } from '@/types/progress'
import type { MeasurementPlan } from '@/types/progress'
import type { NutritionPlan, PlanMeal } from '@/types/nutrition'
import type { WorkoutPlan } from '@/types/workout'
import type { RoutineRow } from '@/lib/customization'
import { computeTargets, calorieGoalFromGoalType, goalTypeLabel } from '@/lib/calculators'
import { generatePlanFromTemplate } from '@/lib/workoutPlan'
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
  warningsAr: string[]
}

/** يختار قالب التمرين حسب القواعد. */
export function recommendTemplateId(p: Profile): string {
  if (p.workoutEnvironment === 'home') return 'home-workout'
  const days = Math.max(1, Math.min(7, p.trainingDays))
  const lvl = p.trainingLevel
  const gt = p.goalType

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
export function buildWeeklySchedule(templateId: string, trainingDays: number): RoutineRow[] {
  const tpl = getTemplate(templateId)
  const days = Math.max(1, Math.min(7, trainingDays))
  const trainIdx = TRAIN_PATTERN[days] ?? TRAIN_PATTERN[3]
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
  const targetCalories = goal === 'cut' ? targets.cuttingCalories : goal === 'bulk' ? targets.bulkingCalories : targets.maintenanceCalories
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

/** المولّد الكامل. */
export function generatePlan(profile: Profile): GeneratedPlan {
  const p: Profile = { ...profile, goal: calorieGoalFromGoalType(profile.goalType) }
  const targets = computeTargets(p)
  const templateId = recommendTemplateId(p)
  const tpl = getTemplate(templateId)
  const workoutPlan = generatePlanFromTemplate(templateId)
  const weeklySchedule = buildWeeklySchedule(templateId, p.trainingDays)
  const { plan: nutritionPlan, warning: nutritionWarning } = generateNutrition(p, targets)

  const warnings: string[] = []
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
    warningsAr: warnings,
  }
}
