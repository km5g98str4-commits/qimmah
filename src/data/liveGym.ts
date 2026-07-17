import type { Lang } from '@/lib/appPreferences'

export interface EnergyLevelOption {
  value: 1 | 2 | 3 | 4 | 5
  ar: string
  en: string
}

export const LIVE_GYM_ENERGY_LEVELS: EnergyLevelOption[] = [
  { value: 1, ar: 'منخفضة جدًا', en: 'Very low' },
  { value: 2, ar: 'منخفضة', en: 'Low' },
  { value: 3, ar: 'متوازنة', en: 'Steady' },
  { value: 4, ar: 'مرتفعة', en: 'High' },
  { value: 5, ar: 'في القمة', en: 'Peak' },
]

const COPY = {
  ar: {
    dashboard: 'لوحة التمرين الحية',
    elapsed: 'وقت التمرين',
    heartRate: 'نبض القلب',
    heartRateUnit: 'نبضة/د',
    watchConnected: 'قراءة حية من الساعة',
    watchUnavailable: 'لا توجد قراءة من الساعة',
    currentExercise: 'التمرين الحالي',
    currentSet: 'المجموعة',
    remainingSets: 'المجموعات المتبقية',
    restTimer: 'مؤقت الراحة',
    notResting: 'بين المجموعات',
    energy: 'مستوى طاقتك',
    energyHint: 'حدّثه بما يناسب شعورك الآن',
  },
  en: {
    dashboard: 'Live workout dashboard',
    elapsed: 'Workout time',
    heartRate: 'Heart rate',
    heartRateUnit: 'bpm',
    watchConnected: 'Live watch reading',
    watchUnavailable: 'No watch reading',
    currentExercise: 'Current exercise',
    currentSet: 'Set',
    remainingSets: 'Sets remaining',
    restTimer: 'Rest timer',
    notResting: 'Between sets',
    energy: 'Your energy',
    energyHint: 'Update it to match how you feel now',
  },
} as const

export function liveGymCopy(lang: Lang) {
  return lang === 'en' ? COPY.en : COPY.ar
}
