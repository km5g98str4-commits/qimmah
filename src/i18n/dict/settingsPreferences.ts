import type { Lang } from '@/lib/appPreferences'

interface SettingsPreferencesCopy {
  groupTitle: string
  unitsTitle: string
  unitsValue: string
  unitsNote: string
  numbersTitle: string
  numbersNote: string
}

export const settingsPreferencesStrings: Record<Lang, SettingsPreferencesCopy> = {
  ar: {
    groupTitle: 'اللغة والوحدات والأرقام',
    unitsTitle: 'الوحدات',
    unitsValue: 'متري · كجم · سم · لتر',
    unitsNote: 'قِمّة يدعم الوحدات المترية حاليًا.',
    numbersTitle: 'الأرقام',
    numbersNote: 'تظهر بالأرقام العربية مع الواجهة العربية، وتتغيّر للاتينية مع الإنجليزية.',
  },
  en: {
    groupTitle: 'Language, units & numbers',
    unitsTitle: 'Units',
    unitsValue: 'Metric · kg · cm · L',
    unitsNote: 'Qimmah currently supports metric units.',
    numbersTitle: 'Numbers',
    numbersNote: 'Numbers use Arabic digits in Arabic and switch to Latin digits in English.',
  },
}
