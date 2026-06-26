// محرّك الحسابات الذكية — تقديرات للتنظيم والمتابعة فقط (ليست نصيحة طبية).

import type {
  ActivityLevel,
  CalorieGoal,
  Gender,
  Profile,
  Targets,
  TrainingLevel,
  WorkoutEnvironment,
} from '@/types/profile'

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
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
  { value: 'maintain', label: 'محافظة على الوزن' },
  { value: 'bulk', label: 'تضخيم (زيادة كتلة)' },
]
export const environmentOptions: { value: WorkoutEnvironment; label: string }[] = [
  { value: 'gym', label: 'نادي' },
  { value: 'home', label: 'منزل' },
]

const round = (n: number) => Math.round(n)
const round1 = (n: number) => Math.round(n * 10) / 10

/** BMR — Mifflin-St Jeor؛ «غير محدّد» = متوسط تقريبي. */
function bmrFor(gender: Gender, weight: number, height: number, age: number): number {
  const baseline = 10 * weight + 6.25 * height - 5 * age
  if (gender === 'male') return baseline + 5
  if (gender === 'female') return baseline - 161
  return baseline - 78 // متوسط تقريبي بين الذكر والأنثى
}

function bmiLabelFor(bmi: number): string {
  if (bmi <= 0) return ''
  if (bmi < 18.5) return 'نقص وزن'
  if (bmi < 25) return 'وزن طبيعي'
  if (bmi < 30) return 'زيادة وزن'
  return 'سمنة'
}

function calorieFloor(gender: Gender): number {
  if (gender === 'male') return 1500
  if (gender === 'female') return 1200
  return 1350
}

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
  const tdee = round(bmr * (ACTIVITY_MULTIPLIER[p.activityLevel] ?? 1.2))
  const maintenance = tdee
  const cutting = Math.max(round(tdee - 400), calorieFloor(p.gender))
  const bulking = round(tdee + 250)

  // السعرات والبروتين حسب الهدف
  let calories = maintenance
  let proteinPerKg = 1.6
  if (p.goal === 'cut') {
    calories = cutting
    proteinPerKg = 2.0
  } else if (p.goal === 'bulk') {
    calories = bulking
    proteinPerKg = 1.8
  }

  const protein = round(proteinPerKg * w)
  const fat = round(0.8 * w)
  const carbs = Math.max(0, round((calories - protein * 4 - fat * 9) / 4))
  const water = round1((35 * w) / 1000)
  const bmi = round1(w / Math.pow(h / 100, 2))

  // الوزن والمدة المقدّرة
  const diff = p.targetWeightKg - w
  let weeklyChange = 0
  let weeks = 0
  if (diff < -0.05) {
    weeklyChange = -0.5
    weeks = Math.ceil(Math.abs(diff) / 0.5)
  } else if (diff > 0.05) {
    weeklyChange = 0.25
    weeks = Math.ceil(diff / 0.25)
  }

  return {
    bmi,
    bmiLabel: bmiLabelFor(bmi),
    bmr,
    tdee,
    maintenanceCalories: maintenance,
    cuttingCalories: cutting,
    bulkingCalories: bulking,
    proteinGrams: protein,
    fatGrams: fat,
    carbsGrams: carbs,
    waterLiters: water,
    weeklyWeightChangeKg: weeklyChange,
    estimatedWeeksToGoal: weeks,
    suggestedTrainingSplit: suggestedSplit(p.trainingDays, p.trainingLevel, p.workoutEnvironment),
    notes: p.gender === 'unspecified' ? 'تقدير تقريبي (لم يُحدَّد الجنس).' : '',
  }
}

/** ملف شخصي افتراضي للعرض/الانطلاق. */
export const defaultProfile: Profile = {
  name: 'زياد العبدالله',
  gender: 'male',
  age: 24,
  heightCm: 178,
  weightKg: 86,
  targetWeightKg: 78,
  activityLevel: 'moderate',
  trainingLevel: 'intermediate',
  goal: 'cut',
  trainingDays: 4,
  workoutEnvironment: 'gym',
  injuries: '',
  healthNotes: '',
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
    p.trainingDays,
    p.trainingLevel,
    p.workoutEnvironment,
  ].join('|')
}
