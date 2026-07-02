// مخطّط مصدر الحقيقة للإعداد (Qimmah Phase 1 — Smart Foundation).
// هذا الكائن هو مصدر الحقيقة الوحيد: كل خطة/هدف/تقسيمة/التزام يُشتق منه.
// كل الحقول اختيارية ما لم يكن لها قيمة افتراضية آمنة — لا بيانات وهمية.

import type { ExperienceLevel } from '@/types/profile'

export type { ExperienceLevel }

/** إصدار المخطّط — يُزاد عند تغيير كاسر لشكل التخزين. */
export const ONBOARDING_SCHEMA_VERSION = 1

export type Sex = 'male' | 'female'

/** الهدف — ثلاثة مسارات منطقية (يطابق GoalValue في باني الخطة). */
// ملاحظة (P2.5): أُلغي مسار «القوة»؛ أي بيانات قديمة بقيمة 'strength' تُهاجَر إلى 'bulk' عند التحميل.
// P10: أُضيف مسار «المحافظة على العضل» (maintain) = سعرات صيانة (TDEE) بلا عجز/فائض.
export type OnbGoalType = 'bulk' | 'cut' | 'maintain'

/** الانتظام (إعداد) — «new» تُخزَّن تلقائيًا للمبتدئ ولا يُسأل عنها. */
export type OnbConsistency = 'new' | 'on_and_off' | 'consistent' | 'returning'

/** بيئة التمرين — تُخزَّن صراحةً (المنزل/وزن الجسم واضحان للمولّد). */
export type Environment = 'commercial_gym' | 'small_gym' | 'home_gym' | 'bodyweight'

/** نمط اختيار التقسيمة — تلقائي (يختاره المنتج) أو متقدّم (يختاره المستخدم). */
export type SplitMode = 'auto' | 'advanced'

/** خيارات التقسيمة المتقدّمة — تظهر فقط عند splitMode=advanced. */
export type AdvancedSplit = 'full_body' | 'upper_lower' | 'push_pull_legs' | 'arnold' | 'bro_split'

/** مستوى النشاط اليومي (NEAT) خارج التمرين. */
export type NeatLevel = 'sedentary' | 'light' | 'moderate' | 'high'

/** أسلوب التغذية — كيف تُقدَّم: اقتراح وجبات / ماكروز فقط / إرشاد مبسّط. */
export type NutritionStyle = 'meal_suggestions' | 'macros_only' | 'simple_guidance'

/** توزيع حجم الوجبات — يبيّن أين تتركّز السعرات (P2.5، يؤثّر على اقتراح الوجبات فقط). */
export type MealDistribution = 'balanced' | 'fewer_larger' | 'more_smaller'

/** وقت الجوع الأكثر — يميل توزيع السعرات للصباح أو المساء (P2.5، اقتراح الوجبات فقط). */
export type AppetiteTiming = 'balanced' | 'morning' | 'evening'

/** نمط الأكل (اختياري — لا يحجب توليد الخطة). */
export type DietPattern = 'none' | 'vegetarian' | 'vegan' | 'pescatarian' | 'low_carb' | 'keto'

/** وضع تتبّع المكملات/الأدوية — الافتراضي «none» والقوائم تبدأ فارغة. */
export type WellnessTrackingMode = 'none' | 'basic' | 'detailed'

/** هوية وعمر وجنس المستخدم. */
export interface OnbProfile {
  /** الاسم اختياري تمامًا — لا اسم وهمي افتراضي. */
  name?: string
  sex?: Sex
  age?: number
}

/** قياسات الجسم. */
export interface OnbBodyMetrics {
  heightCm?: number
  currentWeightKg?: number
  /** وزن الهدف — يُطلب فقط لمسارَي bulk/cut؛ يُشتق للباقي. */
  targetWeightKg?: number
}

/** الهدف الأساسي الذي تُبنى حوله الخطة. */
export interface OnbGoal {
  type?: OnbGoalType
}

/** تفضيلات التمرين. */
export interface OnbTrainingPreferences {
  experience?: ExperienceLevel
  /** يظهر فقط لغير المبتدئ؛ المبتدئ = «new». */
  consistency?: OnbConsistency
  environment?: Environment
  /** أيام التمرين بالأسبوع (3–6). */
  daysPerWeek?: number
  sessionDurationMin?: number
  splitMode?: SplitMode
  /** يُملأ فقط عند splitMode=advanced. */
  advancedSplit?: AdvancedSplit
}

/** ملف النشاط اليومي خارج التمرين. */
export interface OnbActivityProfile {
  neat?: NeatLevel
  /** تقدير الخطوات اليومية — اختياري بالكامل. */
  stepEstimate?: number
}

/** تفضيلات التغذية. */
export interface OnbNutritionPreferences {
  style?: NutritionStyle
  /** عدد الوجبات — يُطلب فقط عند style=meal_suggestions. */
  mealsPerDay?: number
  /** توزيع حجم الوجبات — يُطلب فقط عند style=meal_suggestions (P2.5). */
  mealDistribution?: MealDistribution
  /** وقت الجوع الأكثر — يُطلب فقط عند style=meal_suggestions (P2.5). */
  appetiteTiming?: AppetiteTiming
}

/** تفضيلات الأكل — اختيارية، لا تحجب توليد الخطة. */
export interface OnbFoodPreferences {
  dietPattern?: DietPattern
  /** معرّفات/أسماء أطعمة يفضّل تجنّبها (إدخال مستخدم — لا بيانات وهمية). */
  dislikedFoods: string[]
  /** حساسيات غذائية شائعة. */
  allergies: string[]
}

/** القيود/الإصابات — اختيارية، بلا نصائح طبية. */
export interface OnbLimitations {
  /** مفاصل/مناطق فيها إصابة أو حساسية حركية. */
  injuries: string[]
  notes?: string
}

/** تتبّع المكملات/الأدوية — يبدأ فارغًا والافتراضي «none». */
export interface OnbWellnessTracking {
  mode: WellnessTrackingMode
  supplements: string[]
  medications: string[]
}

/** تفضيلات التطبيق — العربية مثبّتة (لا تبديل إنجليزي في هذه المرحلة). */
export interface OnbAppPreferences {
  language: 'ar'
  reminders: boolean
}

/** بيانات وصفية للحالة والمصدر. */
export interface OnbMeta {
  schemaVersion: number
  completed: boolean
  completedAt?: string
  /** آخر خطوة وصلها المستخدم (للاستئناف). */
  lastStep?: number
  /** مصدر البيانات — onboarding أو migrated من شكل قديم. */
  source: 'onboarding' | 'migrated'
}

/** كائن مصدر الحقيقة الكامل للإعداد. */
export interface OnboardingProfile {
  profile: OnbProfile
  bodyMetrics: OnbBodyMetrics
  goal: OnbGoal
  trainingPreferences: OnbTrainingPreferences
  activityProfile: OnbActivityProfile
  nutritionPreferences: OnbNutritionPreferences
  foodPreferences: OnbFoodPreferences
  limitations: OnbLimitations
  wellnessTracking: OnbWellnessTracking
  appPreferences: OnbAppPreferences
  _meta: OnbMeta
}
