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

export interface NutritionPlan {
  enabled: boolean
  targetCalories: number
  targetProtein: number
  targetCarbs: number
  targetFat: number
  targetWaterLiters: number
  meals: PlanMeal[]
}

// ————————————————————————————————————————————————————————————————
// Food Database v2 — قاعدة بيانات الأطعمة (foundation قابلة للتوسّع)
//
// مصدر قانوني فقط: بيانات قِمّة المنسوخة يدويًا (qimmah_curated) أو مجموعات بيانات
// مفتوحة (open_dataset) أو أطعمة يضيفها المستخدم (user_custom). لا scraping لأي تطبيق.
// schema موازٍ لـ FoodItem القديم؛ لا يكسر أي مستهلك حالي.
// ————————————————————————————————————————————————————————————————

/** فئات الطعام (إنجليزية ثابتة لسهولة الفلترة والتوسّع). */
export type FoodV2Category =
  | 'rice'
  | 'meat'
  | 'chicken'
  | 'fish'
  | 'bread'
  | 'dairy'
  | 'fruit'
  | 'vegetable'
  | 'snack'
  | 'drink'
  | 'dessert'
  | 'restaurant'
  | 'supplement'
  | 'other'

/** المطبخ/الأصل — لترتيب الأولوية للمستخدم السعودي/الخليجي. */
export type Cuisine = 'saudi' | 'gulf' | 'levant' | 'egyptian' | 'international'

/** مصدر بيانات الصنف (قانوني فقط). */
export type FoodSource = 'qimmah_curated' | 'open_dataset' | 'user_custom'

/** مستوى الثقة في القيم الغذائية (لا ادّعاء دقة طبية). */
export type Confidence = 'high' | 'medium' | 'low'

/** وصف الحصة المنزلية مع الغرامات إن عُرفت. */
export interface FoodServing {
  label_ar: string
  label_en: string
  grams?: number
  /** عدد الوحدات في هذه الحصة (مثال: «3 تمرات» → 3، «كوب» → 1). */
  quantity: number
}

/** القيم الغذائية لكل حصة. */
export interface FoodMacros {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sugar?: number
  sodiumMg?: number
}

/** القيم الغذائية لكل 100غ (تُشتق آليًا متى توفّرت الغرامات). */
export interface FoodPer100g {
  calories: number
  protein: number
  carbs: number
  fat: number
}

/** صنف طعام في قاعدة v2. */
export interface FoodV2 {
  id: string
  name_ar: string
  name_en: string
  brand_ar?: string
  brand_en?: string
  category: FoodV2Category
  cuisine?: Cuisine
  serving: FoodServing
  perServing: FoodMacros
  per100g?: FoodPer100g
  source: FoodSource
  confidence: Confidence
  notes_ar?: string
  aliases_ar?: string[]
  aliases_en?: string[]
}
