// محرّك الحسابات الذكية — تقديرات للتنظيم والمتابعة فقط (ليست نصيحة طبية).

import type {
  ActivityLevel,
  CalorieGoal,
  Gender,
  GoalType,
  NutritionStyle,
  Profile,
  Targets,
  TrainingLevel,
  WorkoutEnvironment,
} from '@/types/profile'

// — معامل النشاط: نفصل حركة الحياة (NEAT) عن التمرين عمدًا حتى لا نحتسب التمرين مرّتين —
// المعاملات القياسية 1.2–1.9 تتضمّن التمرين أصلًا؛ لذلك نأخذ NEAT أصغر ثم نضيف
// إضافة بسيطة لكل جلسة (أيام×0.025) بدل القفزة الكبيرة في الجداول التقليدية.
// NEAT: خامل/خفيف = 1.20، متوسط = 1.35، نشِط/عالٍ = 1.45.
const NEAT_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.2,
  moderate: 1.35,
  active: 1.45,
  very_active: 1.45,
}

/** إضافة التمرين لكل يوم/أسبوع — صغيرة عمدًا لتفادي مضاعفة احتساب التمرين. */
const TRAINING_ADD_PER_DAY = 0.025
/** سقف إجمالي معامل النشاط (NEAT + تمرين). */
const ACTIVITY_MULTIPLIER_CAP = 1.9

/**
 * معامل النشاط الكلّي = NEAT + (أيام التمرين × 0.025)، بسقف 1.9.
 * يفصل حركة الحياة عن التمرين لتفادي تضخيم السعرات.
 */
export function totalActivityMultiplier(activityLevel: ActivityLevel, trainingDays: number): number {
  const neat = NEAT_MULTIPLIER[activityLevel] ?? NEAT_MULTIPLIER.sedentary
  const days = Math.max(0, Math.min(7, Math.round(trainingDays || 0)))
  return Math.min(ACTIVITY_MULTIPLIER_CAP, neat + days * TRAINING_ADD_PER_DAY)
}

// خيارات للقوائم المنسدلة (عربية)
// TODO(data-driven): هذه القوائم نصوص عربية للعرض، ومكانها الصحيح `src/data`/`src/config`
// حسب قاعدة المشروع «لا hardcoding للنصوص داخل lib» (CLAUDE.md + .claude/rules/product.md).
// النقل يمسّ ملفات خارج نطاق هذه الموجة (مستهلكوها كثيرون) — يُنفَّذ في موجة تخصيص مستقلة.
export const genderOptions: { value: Gender; label: string }[] = [
  { value: 'male', label: 'ذكر' },
  { value: 'female', label: 'أنثى' },
  { value: 'unspecified', label: 'غير محدّد' },
]
export const activityOptions: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'خامل (قليل الحركة)' },
  { value: 'light', label: 'نشاط خفيف' },
  { value: 'moderate', label: 'نشاط متوسط' },
  { value: 'active', label: 'نشِط' },
  { value: 'very_active', label: 'نشِط جدًا' },
]
export const trainingLevelOptions: { value: TrainingLevel; label: string }[] = [
  { value: 'beginner', label: 'مبتدئ' },
  { value: 'intermediate', label: 'متوسط' },
  { value: 'advanced', label: 'متقدّم' },
]
export const goalOptions: { value: CalorieGoal; label: string }[] = [
  { value: 'cut', label: 'تنشيف (إنقاص دهون)' },
  { value: 'maintain', label: 'محافظة على الوزن' },
  { value: 'bulk', label: 'تضخيم (زيادة كتلة)' },
]
export const environmentOptions: { value: WorkoutEnvironment; label: string }[] = [
  { value: 'gym', label: 'نادي' },
  { value: 'home', label: 'منزل' },
]
export const goalTypeOptions: { value: GoalType; label: string }[] = [
  { value: 'cutting', label: 'تنشيف' },
  { value: 'bulking', label: 'تضخيم' },
  { value: 'maintenance', label: 'ثبات' },
  { value: 'returning', label: 'رجوع بعد انقطاع' },
  { value: 'health', label: 'صحة عامة' },
  { value: 'strength', label: 'زيادة قوة' },
]
export const nutritionStyleOptions: { value: NutritionStyle; label: string }[] = [
  { value: 'simple', label: 'بسيط' },
  { value: 'high_protein', label: 'عالي البروتين' },
  { value: 'saudi', label: 'سعودي/خليجي' },
  { value: 'economical', label: 'اقتصادي' },
  { value: 'flexible', label: 'مرن بالسعرات' },
]

/** يربط الهدف المنظَّم بهدف السعرات (للحاسبة). */
export function calorieGoalFromGoalType(g: GoalType): CalorieGoal {
  if (g === 'cutting') return 'cut'
  if (g === 'bulking' || g === 'strength') return 'bulk'
  return 'maintain' // maintenance / returning / health / recomposition
}

export function goalTypeLabel(g: GoalType): string {
  return goalTypeOptions.find((o) => o.value === g)?.label ?? ''
}

const round = (n: number) => Math.round(n)
const round1 = (n: number) => Math.round(n * 10) / 10
/** تقريب لأقرب نصف لتر (0.5). */
const roundHalf = (n: number) => Math.round(n * 2) / 2

/** BMR — Mifflin-St Jeor؛ «غير محدّد» = متوسط تقريبي. */
function bmrFor(gender: Gender, weight: number, height: number, age: number): number {
  const baseline = 10 * weight + 6.25 * height - 5 * age
  if (gender === 'male') return baseline + 5
  if (gender === 'female') return baseline - 161
  return baseline - 78 // متوسط تقريبي بين الذكر والأنثى
}

// تنبيه: مؤشر BMI لا يفرّق بين العضلات والدهون — نستخدم صياغة محايدة لا تحكم على الجسم.
export const BMI_NOTE = 'مؤشر BMI لا يفرّق بين العضلات والدهون، لذلك يُستخدم كمؤشر عام فقط.'

function bmiLabelFor(bmi: number): string {
  if (bmi <= 0) return ''
  if (bmi < 18.5) return 'حسب BMI: أقل من الطبيعي'
  if (bmi < 25) return 'حسب BMI: ضمن النطاق الطبيعي'
  if (bmi < 30) return 'حسب BMI: أعلى من الطبيعي'
  return 'حسب BMI: أعلى من الطبيعي بوضوح'
}

function calorieFloor(gender: Gender): number {
  if (gender === 'male') return 1500
  if (gender === 'female') return 1200
  return 1350
}

/**
 * السعرات المستهدفة الخام حسب الهدف المنظَّم (goalType) فوق صيانة الوزن (TDEE)
 * قبل تطبيق الحد الأدنى: تنشيف −400، تضخيم +300، قوة +150، وغيرها (ثبات/صحة/رجوع) = TDEE.
 */
function rawCaloriesForGoalType(goalType: GoalType, tdee: number): number {
  switch (goalType) {
    case 'cutting':
      return round(tdee - 400)
    case 'bulking':
      return round(tdee + 300)
    case 'strength':
      return round(tdee + 150)
    case 'maintenance':
    case 'returning':
    case 'health':
    default:
      return round(tdee)
  }
}

/** السعرات المستهدفة النهائية مع حدّ أدنى آمن (لا حظر — مجرّد أرضية). */
function targetCaloriesForGoalType(goalType: GoalType, tdee: number, gender: Gender): number {
  const raw = rawCaloriesForGoalType(goalType, tdee)
  return goalType === 'cutting' ? Math.max(raw, calorieFloor(gender)) : raw
}

/**
 * عتبة التنبيه على انخفاض السعرات (نصّ تنبيه فقط — ليست نصيحة طبية ولا حظرًا):
 * أقل من BMR للإناث / أقل من 1500 للذكور (وللجنس غير المحدّد نستخدم 1500).
 */
function lowCalorieThreshold(gender: Gender, bmr: number): number {
  return gender === 'female' ? bmr : 1500
}

/** نصّ تنبيه السعرات المنخفضة — إعلامي ومحايد، بلا تشخيص أو وصفة. */
export const LOW_CALORIE_NOTE =
  'السعرات المستهدفة منخفضة نسبيًا؛ تأكد من تغطية احتياجك من البروتين والطاقة، وارفعها إذا شعرت بإرهاق.'

/** اقتراح تقسيمة التمرين (قابل للتعديل من المستخدم). */
function suggestedSplit(
  days: number,
  level: TrainingLevel,
  env: WorkoutEnvironment,
): string {
  if (env === 'home') return 'تمرين منزلي (وزن الجسم وأدوات بسيطة)'
  if (level === 'beginner') return days >= 4 ? 'علوي/سفلي (Upper/Lower)' : 'جسم كامل (Full Body)'
  if (days <= 3) return 'جسم كامل (Full Body)'
  if (days === 4) return 'علوي/سفلي (Upper/Lower)'
  if (days === 5) return '٥ أيام: علوي/سفلي + يوم تركيز'
  if (days >= 6) return 'دفع/سحب/أرجل (Push/Pull/Legs)'
  return 'جسم كامل (Full Body)'
}

// ===== المدّة المقدّرة ومعدّل التغيّر — مشتقّان من العجز/الفائض الفعلي =====

/** تقدير شائع: ≈7700 سعرة تعادل كيلوغرام دهون واحدًا. */
const KCAL_PER_KG_FAT = 7700
/** سقف عقلاني للمدّة المقدّرة (٥ سنوات) — يمنع أرقامًا سخيفة عند معدّل ضئيل جدًا. */
const MAX_ESTIMATED_WEEKS = 260

/**
 * معدّل تغيّر الوزن الأسبوعي **مشتقًّا من السعرات المستهدفة فعليًا** لا من رقم ثابت:
 *   (السعرات المستهدفة − TDEE) × ٧ ÷ ٧٧٠٠.
 * سالب = نقصان، موجب = زيادة، صفر = هدف محافظة.
 * سبب الاشتقاق: المعدّل الثابت القديم (٠.٥ للتنشيف و٠.٢٥ للتضخيم) كان مستقلًا عن العجز
 * المطبَّق (−٤٠٠ سعرة/يوم ≈ ٠.٣٦ كجم/أسبوع)، فيرى المستخدم رقمين متناقضين.
 */
export function weeklyWeightChangeFrom(tdee: number, targetCalories: number): number {
  if (!Number.isFinite(tdee) || !Number.isFinite(targetCalories) || tdee <= 0) return 0
  const weekly = ((targetCalories - tdee) * 7) / KCAL_PER_KG_FAT
  const rounded = Math.round(weekly * 100) / 100
  return Object.is(rounded, -0) ? 0 : rounded
}

/**
 * المدّة المقدّرة بالأسابيع = فرق الوزن ÷ المعدّل الأسبوعي الفعلي (بلا قسمة على صفر).
 * تُرجع 0 بمعنى «لا مدّة تقديرية» في ثلاث حالات:
 *  - معدّل صفري (هدف محافظة/ثبات).
 *  - فرق وزن مهمَل (≤ ٠.٠٥ كجم).
 *  - تعارض الاتجاه (عجز سعرات مع هدف زيادة أو العكس) — رقم مضلّل لا يُعرض.
 */
export function estimatedWeeksFrom(weightDiffKg: number, weeklyChangeKg: number): number {
  if (!Number.isFinite(weightDiffKg) || !weeklyChangeKg) return 0
  if (Math.abs(weightDiffKg) <= 0.05) return 0
  if (Math.sign(weightDiffKg) !== Math.sign(weeklyChangeKg)) return 0
  const weeks = Math.ceil(Math.abs(weightDiffKg) / Math.abs(weeklyChangeKg))
  return Math.min(weeks, MAX_ESTIMATED_WEEKS)
}

export function emptyTargets(): Targets {
  return {
    bmi: 0,
    bmiLabel: '',
    bmr: 0,
    tdee: 0,
    maintenanceCalories: 0,
    cuttingCalories: 0,
    bulkingCalories: 0,
    targetCalories: 0,
    proteinGrams: 0,
    fatGrams: 0,
    carbsGrams: 0,
    waterLiters: 0,
    weeklyWeightChangeKg: 0,
    estimatedWeeksToGoal: 0,
    suggestedTrainingSplit: '',
    notes: '',
  }
}

/** يحسب كل الأهداف من بيانات الملف الشخصي. */
export function computeTargets(p: Profile): Targets {
  const w = p.weightKg
  const h = p.heightCm
  const age = p.age
  if (w <= 0 || h <= 0) return emptyTargets()

  const bmr = round(bmrFor(p.gender, w, h, age))
  // معامل النشاط الكلّي = NEAT (حركة الحياة) + إضافة التمرين (أيام×0.025)، بسقف 1.9.
  const tdee = round(bmr * totalActivityMultiplier(p.activityLevel, p.trainingDays))
  const maintenance = tdee
  const cutting = Math.max(round(tdee - 400), calorieFloor(p.gender))
  const bulking = round(tdee + 300)

  // السعرات المستهدفة الفعلية حسب الهدف المنظَّم (cut/bulk/strength…)
  const calories = targetCaloriesForGoalType(p.goalType, tdee, p.gender)
  // تنبيه السعرات المنخفضة (نصّ فقط) — نقارن الخام قبل الأرضية بعتبة الأمان.
  const rawCalories = rawCaloriesForGoalType(p.goalType, tdee)
  const isLowCalorie = rawCalories < lowCalorieThreshold(p.gender, bmr)

  // الماكروز محسوبة على السعرات المستهدفة الفعلية:
  // بروتين 2.0غ/كجم، دهون 0.9غ/كجم، والباقي كارب.
  const protein = round(2.0 * w)
  const fat = round(0.9 * w)
  const carbs = Math.max(0, round((calories - protein * 4 - fat * 9) / 4))
  // الماء: وزن×0.035 لأقرب نصف لتر، بحدّ أدنى 2.5 لتر.
  const water = Math.max(2.5, roundHalf(w * 0.035))
  const bmi = round1(w / Math.pow(h / 100, 2))

  // الوزن والمدة المقدّرة — مشتقّان من العجز/الفائض المطبَّق فعليًا (لا معدّل ثابت)،
  // فيتّسق الرقمان دائمًا: ما يُعرض من سعرات هو ما يفسّر معدّل التغيّر والمدّة.
  const diff = p.targetWeightKg - w
  const weeklyChange = weeklyWeightChangeFrom(tdee, calories)
  const weeks = estimatedWeeksFrom(diff, weeklyChange)

  return {
    bmi,
    bmiLabel: bmiLabelFor(bmi),
    bmr,
    tdee,
    maintenanceCalories: maintenance,
    cuttingCalories: cutting,
    bulkingCalories: bulking,
    targetCalories: calories,
    proteinGrams: protein,
    fatGrams: fat,
    carbsGrams: carbs,
    waterLiters: water,
    weeklyWeightChangeKg: weeklyChange,
    estimatedWeeksToGoal: weeks,
    suggestedTrainingSplit: suggestedSplit(p.trainingDays, p.trainingLevel, p.workoutEnvironment),
    notes: [
      p.gender === 'unspecified' ? 'تقدير تقريبي (لم يُحدَّد الجنس).' : '',
      isLowCalorie ? LOW_CALORIE_NOTE : '',
    ]
      .filter(Boolean)
      .join(' '),
  }
}

/** ملف شخصي افتراضي للانطلاق — بلا اسم حقيقي (يُدخله المستخدم في الإعداد). */
export const defaultProfile: Profile = {
  name: '',
  gender: 'male',
  age: 24,
  heightCm: 178,
  weightKg: 86,
  targetWeightKg: 78,
  activityLevel: 'moderate',
  trainingLevel: 'intermediate',
  goal: 'cut',
  goalType: 'cutting',
  trainingDays: 4,
  workoutDuration: 60,
  workoutEnvironment: 'gym',
  injuries: '',
  healthNotes: '',
  trackNutrition: true,
  mealsPerDay: 4,
  nutritionStyle: 'high_protein',
  dislikedFoods: '',
}

/** السعرات المستهدفة حسب هدف الملف الشخصي. */
export function targetCaloriesFor(goal: CalorieGoal, t: Targets): number {
  if (goal === 'cut') return t.cuttingCalories
  if (goal === 'bulk') return t.bulkingCalories
  return t.maintenanceCalories
}

/** بصمة الحقول المؤثّرة على الحسابات — لكشف تغيّر الملف الشخصي. */
export function profileHash(p: Profile): string {
  return [
    p.gender,
    p.age,
    p.heightCm,
    p.weightKg,
    p.targetWeightKg,
    p.activityLevel,
    p.goal,
    p.goalType,
    p.trainingDays,
    p.trainingLevel,
    p.workoutEnvironment,
  ].join('|')
}
