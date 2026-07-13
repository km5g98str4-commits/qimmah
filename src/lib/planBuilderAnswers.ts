// نموذج إجابات «باني الخطة» وتحويلها إلى مصدر الحقيقة (OnboardingProfile).
// مُفصول عن مكوّن PlanBuilder ليبقى منطقًا نقيًا قابلًا للاختبار (P2.6).

import type {
  AdvancedSplit,
  AppetiteTiming,
  DietPattern,
  Environment,
  ExperienceLevel,
  MealDistribution,
  NeatLevel,
  NutritionStyle as OnbNutritionStyle,
  OnbConsistency,
  OnboardingProfile,
  Sex,
  SplitMode,
  WellnessTrackingMode,
} from '@/types/onboarding'
import { HEALTH_CONSENT_POLICY_VERSION, ONBOARDING_SCHEMA_VERSION } from '@/types/onboarding'
import type { GoalValue } from '@/data/planBuilder'

export interface Answers {
  // profile + bodyMetrics
  /** الاسم — اختياري تمامًا وقابل للتخطّي (لا اسم وهمي افتراضي). */
  name: string
  goalValue?: GoalValue
  sex?: Sex
  age: number
  heightCm: number
  weightKg: number
  targetWeightKg: number
  targetTouched: boolean
  // trainingPreferences
  experienceLevel?: ExperienceLevel
  consistency?: OnbConsistency
  environment?: Environment
  trainingDays: number
  daysTouched: boolean
  sessionDurationMin: number
  splitMode: SplitMode
  advancedSplit?: AdvancedSplit
  // activityProfile
  neat: NeatLevel
  includeSteps: boolean
  stepEstimate: number
  // nutritionPreferences
  nutritionStyle: OnbNutritionStyle
  mealsPerDay: number
  mealDistribution: MealDistribution
  appetiteTiming: AppetiteTiming
  // foodPreferences (optional)
  dietPattern: DietPattern
  allergies: string[]
  // limitations + wellness (optional)
  injuries: string[]
  wellnessMode: WellnessTrackingMode
  healthDataConsent: boolean
}

export const defaultAnswers: Answers = {
  name: '',
  age: 25,
  heightCm: 170,
  weightKg: 75,
  targetWeightKg: 70,
  targetTouched: false,
  trainingDays: 3,
  daysTouched: false,
  sessionDurationMin: 60,
  splitMode: 'auto',
  neat: 'moderate',
  includeSteps: false,
  stepEstimate: 8000,
  nutritionStyle: 'meal_suggestions',
  mealsPerDay: 4,
  mealDistribution: 'balanced',
  appetiteTiming: 'balanced',
  dietPattern: 'none',
  allergies: [],
  injuries: [],
  wellnessMode: 'none',
  healthDataConsent: false,
}

export const isBeginnerLevel = (l?: ExperienceLevel) => l === 'beginner'
export const showsTargetWeight = (g?: GoalValue) => g === 'cut' || g === 'bulk'

/** يبني كائن مصدر الحقيقة من الإجابات — لا اسم وهمي، قوائم تتبّع فارغة. */
export function buildOnboardingProfile(a: Answers): OnboardingProfile {
  const beginner = isBeginnerLevel(a.experienceLevel)
  const trimmedName = a.name.trim()
  return {
    // الاسم اختياري: يُحفظ فقط لو كتبه المستخدم (لا اسم وهمي عند التخطّي).
    profile: { name: trimmedName || undefined, sex: a.sex, age: a.age },
    bodyMetrics: {
      heightCm: a.heightCm,
      currentWeightKg: a.weightKg,
      targetWeightKg: showsTargetWeight(a.goalValue) ? a.targetWeightKg : undefined,
    },
    goal: { type: a.goalValue },
    trainingPreferences: {
      experience: a.experienceLevel,
      consistency: beginner ? 'new' : a.consistency,
      environment: a.environment,
      daysPerWeek: a.trainingDays,
      sessionDurationMin: a.sessionDurationMin,
      // المبتدئ لا يختار التقسيمة — تبقى «تلقائي» دائمًا (P2.6: تثبيت الإجابة لا الـ UI فقط).
      splitMode: beginner ? 'auto' : a.splitMode,
      advancedSplit: !beginner && a.splitMode === 'advanced' ? a.advancedSplit : undefined,
    },
    activityProfile: {
      neat: a.neat,
      stepEstimate: a.includeSteps ? a.stepEstimate : undefined,
    },
    nutritionPreferences: {
      style: a.nutritionStyle,
      mealsPerDay: a.nutritionStyle === 'meal_suggestions' ? a.mealsPerDay : undefined,
      // توزيع الحجم/وقت الجوع يُطلبان ويُحفظان فقط عند اقتراح الوجبات (P2.5).
      mealDistribution: a.nutritionStyle === 'meal_suggestions' ? a.mealDistribution : undefined,
      appetiteTiming: a.nutritionStyle === 'meal_suggestions' ? a.appetiteTiming : undefined,
    },
    foodPreferences: { dietPattern: a.dietPattern, dislikedFoods: [], allergies: a.allergies },
    limitations: { injuries: a.injuries },
    wellnessTracking: { mode: a.wellnessMode, supplements: [], medications: [] },
    appPreferences: { language: 'ar', reminders: false },
    consents: {
      healthData: {
        accepted: a.healthDataConsent,
        acceptedAt: a.healthDataConsent ? new Date().toISOString() : undefined,
        policyVersion: HEALTH_CONSENT_POLICY_VERSION,
      },
    },
    _meta: {
      schemaVersion: ONBOARDING_SCHEMA_VERSION,
      completed: true,
      completedAt: new Date().toISOString(),
      source: 'onboarding',
    },
  }
}
