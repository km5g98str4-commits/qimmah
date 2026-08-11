// أنواع الملف الشخصي والأهداف المحسوبة (Qimmah v2 — أساس الخطة).

export type Gender = 'male' | 'female' | 'unspecified'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced'
export type CalorieGoal = 'cut' | 'maintain' | 'bulk'
export type WorkoutEnvironment = 'gym' | 'home'

/** الهدف المنظَّم (يقود السعرات والتمرين والتغذية والالتزامات). */
// ملاحظة (P2.5): أُلغي «strength»؛ البيانات القديمة تُهاجَر إلى «bulking» عند التحميل.
export type GoalType =
  | 'cutting'
  | 'bulking'
  | 'maintenance'
  | 'returning'
  | 'health'
  | 'recomposition'

export type NutritionStyle = 'simple' | 'high_protein' | 'saudi' | 'economical' | 'flexible'

/** نمط الأكل (يطابق DietPattern في الإعداد) — يقود تصفية اقتراح الوجبات والبدائل. */
export type DietPattern = 'none' | 'vegetarian' | 'vegan' | 'pescatarian' | 'low_carb' | 'keto'

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
/** نمط اختيار التقسيمة (تلقائي يختاره المحرّك / متقدّم يختاره المستخدم). */
export type SplitMode = 'auto' | 'advanced'
/** خيار التقسيمة المتقدّمة — يطابق AdvancedSplit في مصدر حقيقة الإعداد. */
export type PlannedSplit = 'full_body' | 'upper_lower' | 'push_pull_legs' | 'arnold' | 'bro_split'
export type ExperienceBand = 'lt1m' | '1to6m' | '6to12m' | '1to2y' | 'gt2y'
/** مستوى الخبرة الدلالي (إعداد v2) — يحلّ تناقض «سنوات خبرة» مع «ما بدأت». */
export type ExperienceLevel = 'beginner' | 'novice' | 'intermediate' | 'advanced'
export type GymAccess = 'full' | 'small' | 'home' | 'bodyweight'
/** نوع مكان التمرين الدلالي (إعداد v2). */
export type GymType = 'commercial' | 'small' | 'home' | 'bodyweight'
export type SchedulingStyle = 'fixed' | 'flexible'
/** أدوات متاحة في البيت/النادي الصغير. */
export type Equipment = 'dumbbell' | 'barbell' | 'bench' | 'machine' | 'cable' | 'bands'

/**
 * ═══ تاريخ التدريب — أدلّة الخبرة الصريحة ═══ [CTO-QAE-022] M1a
 *
 * المفردات **هي مفردات المحرّك حرفيًا** (`personalization/bank/core.ts`):
 * `trainedBefore` · `totalMonths` · `lastTrained` · `consistency`. تُكتب كما
 * يقرؤها `classifyExperience` فلا جدول ترجمة بينهما.
 *
 * ⚠️ **لماذا كل حقل اختياري، ولماذا `undefined` ليست عيبًا:**
 * ملايين المستخدمين الحاليين أنهوا الإعداد قبل وجود هذه الأسئلة. غيابها عندهم
 * **واقعة صادقة** — «لم يُسأل» — وتُقرأ كذلك في طبقة QAE فيخرج ملفهم ناقصًا
 * باسم الحقل الناقص. البديل (حشو قيمة افتراضية) يجعل الملف يبدو مكتملًا وهو
 * مبنيّ على جواب لم يقله أحد، وهذا بالضبط ما يمنعه §5 من الميثاق.
 *
 * وتمييز ثالث لا يُخلط: `trainedBefore: 'never'` **دليل حاضر** يقول «ما تمرّن»،
 * وهو ليس `undefined` التي تقول «لا نعرف». الأول يكفي لتصنيف كامل، والثاني لا.
 */
export type TrainedBefore = 'never' | 'tried' | 'months' | 'years'
export type TotalMonthsBucket = 'lt3' | 'm3_6' | 'm6_12' | 'y1_3' | 'y3_plus'
export type LastTrainedBucket = 'now' | 'w2' | 'm1_3' | 'm3_12' | 'y1_plus'
export type TrainingConsistency = 'rare' | 'on_off' | 'mostly' | 'steady'

export interface TrainingHistoryEvidence {
  trainedBefore?: TrainedBefore
  /** لا يُجمع إطلاقًا عند `trainedBefore === 'never'` — وغيابه هناك صحيح لا ناقص. */
  totalMonths?: TotalMonthsBucket
  lastTrained?: LastTrainedBucket
  consistency?: TrainingConsistency
}

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
  /** أسلوب عرض التغذية الدلالي من الإعداد (اقتراح وجبات / ماكروز فقط / إرشاد مبسّط). */
  nutritionDisplayStyle?: 'meal_suggestions' | 'macros_only' | 'simple_guidance'
  /** توزيع حجم الوجبات من الإعداد (P2.5) — يميل تركيز السعرات بين الوجبات. */
  mealDistribution?: 'balanced' | 'fewer_larger' | 'more_smaller'
  /** وقت الجوع الأكثر من الإعداد (P2.5) — يميل توزيع السعرات للصباح/المساء. */
  appetiteTiming?: 'balanced' | 'morning' | 'evening'
  /** نمط الأكل من الإعداد (P3) — يصفّي اقتراح الوجبات/البدائل (نباتي/صرف/بيسكتاريان). */
  dietPattern?: DietPattern
  dislikedFoods: string
  // — حقول «باني الخطة» الاختيارية (تُملأ عند استخدام Plan Builder) —
  muscleFocus?: MuscleFocus
  consistency?: Consistency
  /** نمط اختيار التقسيمة — تلقائي افتراضًا؛ متقدّم يفعّل splitChoice. */
  splitMode?: SplitMode
  /** التقسيمة التي اختارها المستخدم صراحةً (تتجاوز التلقائي عند splitMode=advanced). */
  splitChoice?: PlannedSplit
  experienceBand?: ExperienceBand
  /** مستوى الخبرة الدلالي (إعداد v2) — مصدر الحقيقة للإجابة. */
  experienceLevel?: ExperienceLevel
  /**
   * أدلّة تاريخ التدريب الصريحة (إعداد v2، خطوة ٢). غيابها = «لم يُسأل».
   * تُستهلك في طبقة QAE التشخيصية فقط اليوم؛ `generatePlan` الحيّ لا يقرؤها.
   */
  trainingHistory?: TrainingHistoryEvidence
  gymAccess?: GymAccess
  /** نوع مكان التمرين الدلالي (إعداد v2). */
  gymType?: GymType
  equipment?: Equipment[]
  schedulingStyle?: SchedulingStyle
  /** أيام التمرين المفضّلة كفهارس أسبوع (0=السبت … 6=الجمعة). */
  preferredDays?: number[]
  /** تفضيل تذكيرات محلي (لا إشعارات نظام فعلية بعد). */
  remindersOptIn?: boolean
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
}
