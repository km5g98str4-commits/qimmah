// أنواع نظام التغذية (Qimmah v2): مكونات، قوالب وجبات، وخطة تغذية.

export type IngredientCategory =
  | 'protein'
  | 'carb'
  | 'fat'
  | 'vegetable'
  | 'fruit'
  | 'dairy'
  | 'drink'
  | 'other'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout'

export interface Ingredient {
  id: string
  nameAr: string
  nameEn: string
  category: IngredientCategory
  servingLabelAr: string
  servingLabelEn: string
  calories: number
  protein: number
  carbs: number
  fat: number
  notesAr?: string
  notesEn?: string
}

export interface MealTemplate {
  id: string
  nameAr: string
  nameEn: string
  mealType: MealType
  ingredientIds: string[]
  defaultServings?: Record<string, number>
  notesAr?: string
  notesEn?: string
}

export interface MealIngredient {
  ingredientId: string
  servings: number
}

export interface PlanMeal {
  id: string
  nameAr: string
  nameEn: string
  mealType: MealType
  ingredients: MealIngredient[]
  calories: number
  protein: number
  carbs: number
  fat: number
  notes?: string
  order: number
}

/** أسلوب عرض التغذية المشتقّ من الإعداد (مصدر الحقيقة) — يقود واجهة التبويب. */
export type NutritionDisplayStyle = 'meal_suggestions' | 'macros_only' | 'simple_guidance'

export interface NutritionPlan {
  enabled: boolean
  targetCalories: number
  targetProtein: number
  targetCarbs: number
  targetFat: number
  targetWaterLiters: number
  meals: PlanMeal[]
  /** أسلوب العرض من الإعداد — يحدّد إظهار اقتراح الوجبات أو الماكروز فقط. */
  style?: NutritionDisplayStyle
  /** عدد الوجبات من الإعداد — يبني عدد أقسام الوجبات عند اقتراح الوجبات. */
  mealsPerDay?: number
}
