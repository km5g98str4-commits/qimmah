// أنواع الملف الشخصي والأهداف المحسوبة (Qimmah v2 — أساس الخطة).

export type Gender = 'male' | 'female' | 'unspecified'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced'
export type CalorieGoal = 'cut' | 'maintain' | 'bulk'
export type WorkoutEnvironment = 'gym' | 'home'

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
  trainingDays: number
  workoutEnvironment: WorkoutEnvironment
  injuries: string
  healthNotes: string
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
  proteinGrams: number
  fatGrams: number
  carbsGrams: number
  waterLiters: number
  weeklyWeightChangeKg: number
  estimatedWeeksToGoal: number
  suggestedTrainingSplit: string
  notes: string
}
