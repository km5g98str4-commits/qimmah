// تسميات ثنائية اللغة للخيارات المشتقّة من الحسابات (calculators.ts) — تُعرض في الواجهة.
// هذا الملف لا يمسّ منطق الحسابات؛ فقط يوفّر ترجمة إنجليزية للتسميات العربية الموجودة
// حتى لا تبقى القيم عربية في وضع اللغة الإنجليزية (قوائم، شرائح الهدف/النشاط، إلخ).

import type { Lang } from '@/lib/appPreferences'
import type {
  ActivityLevel,
  CalorieGoal,
  GoalType,
  Gender,
  NutritionStyle,
  TrainingLevel,
  WorkoutEnvironment,
} from '@/types/profile'

const genderEn: Record<Gender, string> = {
  male: 'Male',
  female: 'Female',
  unspecified: 'Prefer not to say',
}

const activityEn: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (little movement)',
  light: 'Lightly active',
  moderate: 'Moderately active',
  active: 'Active',
  very_active: 'Very active',
}

const trainingLevelEn: Record<TrainingLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

const calorieGoalEn: Record<CalorieGoal, string> = {
  cut: 'Cut (lose fat)',
  maintain: 'Maintain weight',
  bulk: 'Bulk (gain mass)',
}

const environmentEn: Record<WorkoutEnvironment, string> = {
  gym: 'Gym',
  home: 'Home',
}

const goalTypeEn: Record<GoalType, string> = {
  cutting: 'Cutting',
  bulking: 'Bulking',
  maintenance: 'Maintain',
  returning: 'Return after a break',
  health: 'General health',
  recomposition: 'Body recomposition',
}

const nutritionStyleEn: Record<NutritionStyle, string> = {
  simple: 'Simple',
  high_protein: 'High protein',
  saudi: 'Saudi / Gulf',
  economical: 'Budget',
  flexible: 'Flexible (IIFYM)',
}

/**
 * يبني مساعِد ترجمة لمجموعة خيارات: في العربية يُرجِع التسمية العربية الأصلية،
 * وفي الإنجليزية يُرجِع الترجمة، مع الرجوع للأصل إن لم توجد ترجمة.
 */
function makeLabeler<T extends string>(en: Record<T, string>) {
  return (value: T, arLabel: string, lang: Lang): string => (lang === 'en' ? en[value] ?? arLabel : arLabel)
}

export const genderLabelI18n = makeLabeler(genderEn)
export const activityLabelI18n = makeLabeler(activityEn)
export const trainingLevelLabelI18n = makeLabeler(trainingLevelEn)
export const calorieGoalLabelI18n = makeLabeler(calorieGoalEn)
export const environmentLabelI18n = makeLabeler(environmentEn)
export const goalTypeLabelI18n = makeLabeler(goalTypeEn)
export const nutritionStyleLabelI18n = makeLabeler(nutritionStyleEn)
