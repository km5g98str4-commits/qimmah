// نصوص شاشة «حسابي» — بيانات الجسم + الأهداف المقدّرة.
// المصدر العربي (خليجي) هو الأصل، والإنجليزية طبيعية للياقة.

import type { Lang } from '@/lib/appPreferences'

export interface ProfileScreenStrings {
  // ProfileData — ترويسة القسم
  sectionEyebrow: string
  sectionTitle: string
  sectionDescription: string
  // ProfileData — بطاقات بيانات الجسم
  age: string
  ageUnit: string
  height: string
  heightUnit: string
  currentWeight: string
  weightUnit: string
  targetWeight: string
  activityLevel: string
  activityMedium: string
  todayCalories: string
  caloriesUnit: string
  // MyTargets — الأهداف المقدّرة
  targetsEyebrow: string
  targetsTitle: string
  targetsDescription: string
  bmiLabel: string
  targetCalories: string
  caloriesPerDay: string
  protein: string
  gramsPerDay: string
  water: string
  litersPerDay: string
  targetWeightCard: string
  targetWeightUnit: string
  estimatedDuration: string
  weekEta: string
  weekPerWeek: string
  suggestedSplit: string
}

const ar: ProfileScreenStrings = {
  sectionEyebrow: 'بياناتك الأساسية',
  sectionTitle: 'حالتك الحالية بالأرقام',
  sectionDescription: 'العمر، الطول، الوزن، والوزن الهدف — الأساس اللي تُبنى عليه خطتك.',
  age: 'العمر',
  ageUnit: 'سنة',
  height: 'الطول',
  heightUnit: 'سم',
  currentWeight: 'الوزن الحالي',
  weightUnit: 'كجم',
  targetWeight: 'الوزن الهدف',
  activityLevel: 'مستوى النشاط',
  activityMedium: 'متوسط',
  todayCalories: 'سعرات اليوم',
  caloriesUnit: 'سعرة',
  targetsEyebrow: 'حساباتي',
  targetsTitle: 'أرقامك المستهدفة في لمحة',
  targetsDescription: 'تقديرات مبنية على بياناتك — للتنظيم والمتابعة فقط، وليست بديلًا عن مختص.',
  bmiLabel: 'مؤشر الكتلة BMI',
  targetCalories: 'سعرات الهدف',
  caloriesPerDay: 'سعرة / يوم',
  protein: 'البروتين',
  gramsPerDay: 'غرام / يوم',
  water: 'الماء',
  litersPerDay: 'لتر / يوم',
  targetWeightCard: 'الوزن الهدف',
  targetWeightUnit: 'كجم',
  estimatedDuration: 'مدة تقديرية',
  weekEta: 'أسبوع',
  weekPerWeek: 'كجم/أسبوع',
  suggestedSplit: 'التقسيمة المقترحة',
}

const en: ProfileScreenStrings = {
  sectionEyebrow: 'Your core data',
  sectionTitle: 'Your current stats in numbers',
  sectionDescription: 'Age, height, weight, and target weight — the foundation your plan is built on.',
  age: 'Age',
  ageUnit: 'yrs',
  height: 'Height',
  heightUnit: 'cm',
  currentWeight: 'Current weight',
  weightUnit: 'kg',
  targetWeight: 'Target weight',
  activityLevel: 'Activity level',
  activityMedium: 'Moderate',
  todayCalories: 'Daily calories',
  caloriesUnit: 'cal',
  targetsEyebrow: 'My numbers',
  targetsTitle: 'Your target numbers at a glance',
  targetsDescription: 'Estimates based on your data — for tracking and organizing only, not a substitute for a professional.',
  bmiLabel: 'BMI',
  targetCalories: 'Target calories',
  caloriesPerDay: 'cal / day',
  protein: 'Protein',
  gramsPerDay: 'g / day',
  water: 'Water',
  litersPerDay: 'L / day',
  targetWeightCard: 'Target weight',
  targetWeightUnit: 'kg',
  estimatedDuration: 'Estimated time',
  weekEta: 'weeks',
  weekPerWeek: 'kg/week',
  suggestedSplit: 'Suggested split',
}

export const profileScreenStrings: Record<Lang, ProfileScreenStrings> = { ar, en }
