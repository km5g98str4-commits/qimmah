import type { Lang } from '@/lib/appPreferences'
import type { EnergyLevelOption } from '@/types/workout'

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
    watchUnavailable: 'بانتظار قراءة من المصدر',
    heartRateHidden: 'يظهر النبض عند توفر مصدر صحي متصل',
    energyUnset: 'اختر مستوى طاقتك',
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
    watchUnavailable: 'Waiting for a reading',
    heartRateHidden: 'Heart rate appears when a connected health source is available',
    energyUnset: 'Select your energy',
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
