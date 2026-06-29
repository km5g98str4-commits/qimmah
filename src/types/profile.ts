// أنواع الملف الشخصي والأهداف المحسوبة (Qimmah v2 — أساس الخطة).

export type Gender = 'male' | 'female' | 'unspecified'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced'
export type CalorieGoal = 'cut' | 'maintain' | 'bulk'
export type WorkoutEnvironment = 'gym' | 'home'

/** الهدف المنظَّم (يقود السعرات والتمرين والتغذية والالتزامات). */
export type GoalType =
  | 'cutting'
  | 'bulking'
  | 'maintenance'
  | 'returning'
  | 'health'
  | 'strength'
  | 'recomposition'

export type NutritionStyle = 'simple' | 'high_protein' | 'saudi' | 'economical' | 'flexible'

// — حقول «باني الخطة» (Plan Builder) — كلها اختيارية للحفاظ على شكل البيانات المحفوظة —
export type MuscleFocus =
  | 'balanced'
  | 'upper'
  | 'lower'
  | 'core'
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
export type Consistency = 'never' | 'onoff' | 'regular' | 'returning'
export type ExperienceBand = 'lt1m' | '1to6m' | '6to12m' | '1to2y' | 'gt2y'
/** مستوى الخبرة الدلالي (إعداد v2) — يحلّ تناقض «سنوات خبرة» مع «ما بدأت». */
export type ExperienceLevel = 'beginner' | 'novice' | 'intermediate' | 'advanced'
export type GymAccess = 'full' | 'small' | 'home' | 'bodyweight'
/** نوع مكان التمرين الدلالي (إعداد v2). */
export type GymType = 'commercial' | 'small' | 'home' | 'bodyweight'
export type SchedulingStyle = 'fixed' | 'flexible'
/** أدوات متاحة في البيت/النادي الصغير. */
export type Equipment = 'dumbbell' | 'barbell' | 'bench' | 'machine' | 'cable' | 'bands'

/** خيارات التقسيمة المتقدّمة (Phase 1 — من إعداد المستخدم). */
export type AdvancedSplit = 'full_body' | 'upper_lower' | 'push_pull_legs' | 'arnold' | 'bro_split'

/** بيانات الجسم/الملف الشخصي التي تُبنى عليها الحسابات. */
export interface Profile {
  name: string
  gender: Gender
  age: number
  heightCm: number
  weightKg: number
  targetWeightKg: number
  activityLevel: ActivityLevel
  trainingLevel: TrainingLevel
  goal: CalorieGoal
  goalType: GoalType
  trainingDays: number
  workoutDuration: number
  workoutEnvironment: WorkoutEnvironment
  injuries: string
  healthNotes: string
  trackNutrition: boolean
  mealsPerDay: number
  nutritionStyle: NutritionStyle
  dislikedFoods: string
  // — حقول «باني الخطة» الاختيارية (تُملأ عند استخدام Plan Builder) —
  muscleFocus?: MuscleFocus
  consistency?: Consistency
  experienceBand?: ExperienceBand
  /** مستوى الخبرة الدلالي (إعداد v2) — مصدر الحقيقة للإجابة. */
  experienceLevel?: ExperienceLevel
  gymAccess?: GymAccess
  /** نوع مكان التمرين الدلالي (إعداد v2). */
  gymType?: GymType
  equipment?: Equipment[]
  schedulingStyle?: SchedulingStyle
  /** أيام التمرين المفضّلة كفهارس أسبوع (0=السبت … 6=الجمعة). */
  preferredDays?: number[]
  /** تفضيل تذكيرات محلي (لا إشعارات نظام فعلية بعد). */
  remindersOptIn?: boolean
  /**
   * نمط التقسيمة — «auto» يختار المنتج، «advanced» يحترم advancedSplit.
   * (Phase 1 — من إعداد المستخدم)
   */
  splitMode?: 'auto' | 'advanced'
  /**
   * اختيار التقسيمة المتقدّمة — يُستخدم فقط عند splitMode=advanced.
   * (Phase 1 — من إعداد المستخدم)
   */
  advancedSplit?: AdvancedSplit
  /**
   * أسلوب عرض التغذية من الإعداد — يختلف عن nutritionStyle (طريقة الطبخ).
   * (Phase 1 — من إعداد المستخدم)
   */
  nutritionDisplayStyle?: 'meal_suggestions' | 'macros_only' | 'simple_guidance'
}

/** أهداف مقدّرة قابلة للتعديل اليدوي. */
export interface Targets {
  bmi: number
  bmiLabel: string
  bmr: number
  tdee: number
  maintenanceCalories: number
  cuttingCalories: number
  bulkingCalories: number
  /** السعرات المستهدفة الفعلية حسب الهدف المنظَّم (goalType) — مصدر الحقيقة للمتابعة. */
  targetCalories: number
  proteinGrams: number
  fatGrams: number
  carbsGrams: number
  waterLiters: number
  weeklyWeightChangeKg: number
  estimatedWeeksToGoal: number
  suggestedTrainingSplit: string
  notes: string
  /**
   * تنبيه عند انخفاض السعرات غير الاعتيادي (ليس نصيحة طبية).
   * (Phase 1 — Agent C)
   */
  lowCalorieWarning?: string
}

// __PROBE__
