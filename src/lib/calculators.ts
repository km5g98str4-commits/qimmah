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

// Source classification (reviewed 2026-07-16): NON-STANDARD Qimmah heuristic;
// no primary source was found for this exact NEAT + 0.025/training-day model. See docs/features/FORMULAS.md.
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

// — ثوابت الماكروز والسعرات (مصدر حقيقة واحد، تستهلكها صفحة «كيف نحسب أرقامك») —
/** Evidence: Morton et al. (2018), doi:10.1136/bjsports-2017-097608; plateau 1.62 g/kg/d (95% CI 1.03–2.20). */
/** البروتين لكل كيلو من وزن الجسم — 1.8غ/كجم لكل الأهداف (ضمن نطاق 1.6–2.2 الموصى به رياضيًا). */
export const PROTEIN_PER_KG = 1.8
/** Consensus: National Academies DRI (2002/2005), adult fat AMDR 20–35%; 27% is Qimmah's in-range selection. */
/** نسبة سعرات الدهون من إجمالي السعرات المستهدفة (~25–30% — نستخدم 27%). */
export const FAT_CALORIE_RATIO = 0.27
/** Source classification: NON-STANDARD fixed Qimmah policy; individual response is not encoded. */
/** عجز التنشيف بالسعرات تحت TDEE. */
export const CUT_DEFICIT = 400
/** Source classification: NON-STANDARD fixed Qimmah policy; individual response is not encoded. */
/** فائض التضخيم بالسعرات فوق TDEE. */
export const BULK_SURPLUS = 300
/** Historical source: Wishnofsky (1958), PMID 13594881; static 7700 kcal/kg rule, not a dynamic forecast. */
/** طاقة الكيلوغرام من نسيج الجسم (تقريبي) — لاشتقاق معدّل تغيّر الوزن الأسبوعي من العجز/الفائض. */
export const KCAL_PER_KG = 7700
/**
 * إصدار صيغة الحساب — يُضمَّن في بصمة الملف الشخصي حتى تُعاد الحسابات تلقائيًا
 * للمستخدمين الحاليين عند تغيّر المعادلات (بروتين 1.8، دهون نسبة سعرات).
 */
export const CALC_FORMULA_VERSION = 'p10-protein1.8-fat27'

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
  { value: 'maintain', label: 'محافظة على العضل' },
  { value: 'bulk', label: 'تضخيم (زيادة كتلة)' },
]
export const environmentOptions: { value: WorkoutEnvironment; label: string }[] = [
  { value: 'gym', label: 'نادي' },
  { value: 'home', label: 'منزل' },
]
export const goalTypeOptions: { value: GoalType; label: string }[] = [
  { value: 'cutting', label: 'تنشيف' },
  { value: 'bulking', label: 'تضخيم' },
  { value: 'maintenance', label: 'محافظة على العضل' },
  { value: 'returning', label: 'رجوع بعد انقطاع' },
  { value: 'health', label: 'صحة عامة' },
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
  if (g === 'bulking') return 'bulk'
  return 'maintain' // maintenance / returning / health / recomposition
}

export function goalTypeLabel(g: GoalType): string {
  return goalTypeOptions.find((o) => o.value === g)?.label ?? ''
}

const round = (n: number) => Math.round(n)
const round1 = (n: number) => Math.round(n * 10) / 10
/** تقريب لأقرب نصف لتر (0.5). */
const roundHalf = (n: number) => Math.round(n * 2) / 2

/** ثابت الجنس في معادلة ميفلين–سانت جيور: +5 ذكر، −161 أنثى، −78 غير محدّد (متوسط تقريبي). */
export function mifflinSexConstant(gender: Gender): number {
  if (gender === 'male') return 5
  if (gender === 'female') return -161
  return -78
}

/** Primary source: Mifflin et al. (1990), doi:10.1093/ajcn/51.2.241, PMID 2305711. */
/** BMR — Mifflin-St Jeor؛ «غير محدّد» = متوسط تقريبي. */
function bmrFor(gender: Gender, weight: number, height: number, age: number): number {
  return 10 * weight + 6.25 * height - 5 * age + mifflinSexConstant(gender)
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
 * قبل تطبيق الحد الأدنى: تنشيف −400، تضخيم +300، وغيرها (ثبات/صحة/رجوع) = TDEE.
 * مهم (P2.5): التنشيف والتضخيم يبنيان على نفس الـ TDEE (نفس معامل النشاط NEAT + أيام×0.025)؛
 * الفرق فقط في الإزاحة (−400 / +300)، فلا يستخدم التضخيم معاملًا مختلفًا عن التنشيف.
 */
function rawCaloriesForGoalType(goalType: GoalType, tdee: number): number {
  switch (goalType) {
    case 'cutting':
      return round(tdee - CUT_DEFICIT)
    case 'bulking':
      return round(tdee + BULK_SURPLUS)
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

  // السعرات المستهدفة الفعلية حسب الهدف المنظَّم (cut/bulk/maintain…)
  const calories = targetCaloriesForGoalType(p.goalType, tdee, p.gender)
  // تنبيه السعرات المنخفضة (نصّ فقط) — نقارن الخام قبل الأرضية بعتبة الأمان.
  const rawCalories = rawCaloriesForGoalType(p.goalType, tdee)
  const isLowCalorie = rawCalories < lowCalorieThreshold(p.gender, bmr)

  // General Atwater factors: National Academies, Dietary Reference Intakes for Energy (2023),
  // https://doi.org/10.17226/26818. The fixed 27% split remains a Qimmah policy.
  // الماكروز محسوبة على السعرات المستهدفة الفعلية:
  // بروتين 1.8غ/كجم لكل الأهداف، دهون ~27% من السعرات، والباقي كارب.
  const protein = round(PROTEIN_PER_KG * w)
  const fat = round((calories * FAT_CALORIE_RATIO) / 9)
  const carbs = Math.max(0, round((calories - protein * 4 - fat * 9) / 4))
  // Source classification: NON-STANDARD weight-based heuristic. EFSA (2010), doi:10.2903/j.efsa.2010.1459,
  // gives sex-specific population AIs, not 35 mL/kg or this universal 2.5 L floor.
  // الماء: وزن×0.035 لأقرب نصف لتر، بحدّ أدنى 2.5 لتر.
  const water = Math.max(2.5, roundHalf(w * 0.035))
  // Consensus classification reference: WHO adult BMI fact sheet (updated 2025); formula is kg/m².
  // BMI remains descriptive, not diagnostic; ages 5–19 require BMI-for-age (see FORMULAS.md).
  const bmi = round1(w / Math.pow(h / 100, 2))

  // الوزن والمدة المقدّرة — يُشتقّ معدّل التغيّر الأسبوعي من نفس العجز/الفائض الذي تفرضه
  // الخطة (عجز 400 → ≈0.36 كجم/أسبوع، فائض 300 → ≈0.27 كجم/أسبوع) عبر 7700 سعرة/كجم،
  // فلا يتناقض الرقم المعروض مع السعرات المستهدفة. المدة تُحسب بالمعدّل الدقيق قبل التقريب.
  const diff = p.targetWeightKg - w
  let weeklyChange = 0
  let weeks = 0
  if (diff < -0.05) {
    const rate = (CUT_DEFICIT * 7) / KCAL_PER_KG
    weeklyChange = -round1(rate)
    weeks = Math.ceil(Math.abs(diff) / rate)
  } else if (diff > 0.05) {
    const rate = (BULK_SURPLUS * 7) / KCAL_PER_KG
    weeklyChange = round1(rate)
    weeks = Math.ceil(diff / rate)
  }

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
    CALC_FORMULA_VERSION,
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
