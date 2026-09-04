import type { MealIngredient, MealType, NutritionPlan, PlanMeal } from '@/types/nutrition'
import type { Targets, CalorieGoal } from '@/types/profile'
import type { DietPattern } from '@/types/onboarding'
import type { Lang } from '@/lib/appPreferences'
import { getIngredient } from '@/data/mealIngredients'
import { getMealTemplate, mealTemplates } from '@/data/mealTemplates'
import { targetCaloriesFor } from '@/lib/calculators'
import { templateAllowedForDiet } from '@/lib/dietFilter'

const round = (n: number) => Math.round(n)

export interface Macros {
  calories: number
  protein: number
  carbs: number
  fat: number
}

/** يحسب ماكروز وجبة من مكوناتها وحصصها. */
export function computeMealMacros(ingredients: MealIngredient[]): Macros {
  return ingredients.reduce<Macros>(
    (acc, mi) => {
      const ing = getIngredient(mi.ingredientId)
      if (!ing) return acc
      const s = mi.servings || 0
      return {
        calories: acc.calories + ing.calories * s,
        protein: acc.protein + ing.protein * s,
        carbs: acc.carbs + ing.carbs * s,
        fat: acc.fat + ing.fat * s,
      }
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

/** ينشئ وجبة خطة من قالب (بحساب الماكروز). */
export function createPlanMealFromTemplate(templateId: string, order: number): PlanMeal {
  const tpl = getMealTemplate(templateId)
  if (!tpl) return createEmptyMeal(order)
  const ingredients: MealIngredient[] = tpl.ingredientIds.map((id) => ({
    ingredientId: id,
    servings: tpl.defaultServings?.[id] ?? 1,
  }))
  const m = computeMealMacros(ingredients)
  return {
    id: `meal-${tpl.id}-${order}`,
    nameAr: tpl.nameAr,
    nameEn: tpl.nameEn,
    mealType: tpl.mealType,
    ingredients,
    calories: round(m.calories),
    protein: round(m.protein),
    carbs: round(m.carbs),
    fat: round(m.fat),
    notes: '',
    order,
  }
}

/** وجبة فارغة جديدة (يضيف المستخدم مكوناتها). */
export function createEmptyMeal(order: number, id?: string): PlanMeal {
  return {
    id: id ?? `meal-custom-${order}`,
    nameAr: 'وجبة جديدة',
    nameEn: 'New meal',
    mealType: 'snack',
    ingredients: [],
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    notes: '',
    order,
  }
}

/** الخطة الافتراضية — أهدافها من الحسابات الذكية + وجبات أولية. */
export function defaultNutritionPlan(targets: Targets, goal: CalorieGoal): NutritionPlan {
  if (targets.numericNutritionStatus !== 'available') {
    return {
      enabled: true,
      targetCalories: 0,
      targetProtein: 0,
      targetCarbs: 0,
      targetFat: 0,
      targetWaterLiters: 0,
      meals: [],
      style: 'simple_guidance',
      mealsPerDay: 4,
    }
  }
  const seed = ['high-protein-breakfast', 'chicken-rice', 'greek-yogurt-snack', 'light-dinner']
  return {
    enabled: true,
    targetCalories: targets.targetCalories || targetCaloriesFor(goal, targets),
    targetProtein: targets.proteinGrams,
    targetCarbs: targets.carbsGrams,
    targetFat: targets.fatGrams,
    targetWaterLiters: targets.waterLiters,
    meals: seed.map((id, i) => createPlanMealFromTemplate(id, i)),
    style: 'meal_suggestions',
    mealsPerDay: seed.length,
  }
}

/** مجموع ماكروز كل الوجبات المخطّطة. */
export function planTotals(meals: PlanMeal[]): Macros {
  return meals.reduce<Macros>(
    (a, m) => ({
      calories: a.calories + m.calories,
      protein: a.protein + m.protein,
      carbs: a.carbs + m.carbs,
      fat: a.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

/**
 * بدائل وجبة بسعرات/بروتين متقاربة — فلتر بسيط من قوالب الوجبات.
 * النطاق التقريبي: ±25% للسعرات و±30غ للبروتين، مع تفضيل نفس نوع الوجبة.
 * يحترم النمط الغذائي (نباتي/صرف/بيسكتاريان) فيستبعد البدائل غير المتوافقة.
 */
export function mealAlternatives(meal: PlanMeal, dietPattern?: DietPattern): PlanMeal[] {
  const candidates = mealTemplates
    .filter((tpl) => templateAllowedForDiet(tpl, dietPattern))
    .map((tpl) => createPlanMealFromTemplate(tpl.id, meal.order))
    .filter((alt) => alt.nameAr !== meal.nameAr) // استبعد نفس الوجبة بالاسم
  const calLow = meal.calories * 0.75
  const calHigh = meal.calories * 1.25
  const within = candidates.filter(
    (alt) =>
      alt.calories >= calLow &&
      alt.calories <= calHigh &&
      Math.abs(alt.protein - meal.protein) <= 30,
  )
  // رتّب: نفس نوع الوجبة أولًا، ثم الأقرب بالسعرات
  return within
    .sort((a, b) => {
      const at = a.mealType === meal.mealType ? 0 : 1
      const bt = b.mealType === meal.mealType ? 0 : 1
      if (at !== bt) return at - bt
      return Math.abs(a.calories - meal.calories) - Math.abs(b.calories - meal.calories)
    })
    .slice(0, 4)
}

export function ingredientDisplayName(nameAr: string, nameEn: string, lang: Lang): string {
  return lang === 'en' ? nameEn || nameAr : nameAr || nameEn
}

export function mealDisplayName(m: PlanMeal, lang: Lang): string {
  return lang === 'en' ? m.nameEn : m.nameAr
}

export const mealTypeLabels: Record<MealType, { ar: string; en: string }> = {
  breakfast: { ar: 'فطور', en: 'Breakfast' },
  lunch: { ar: 'غداء', en: 'Lunch' },
  dinner: { ar: 'عشاء', en: 'Dinner' },
  snack: { ar: 'سناك', en: 'Snack' },
  pre_workout: { ar: 'قبل التمرين', en: 'Pre-workout' },
  post_workout: { ar: 'بعد التمرين', en: 'Post-workout' },
}
