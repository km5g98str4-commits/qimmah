import type { Lang } from '@/lib/appPreferences'

interface SettingsPreferencesCopy {
  groupTitle: string
  unitsTitle: string
  unitsValue: string
  unitsNote: string
  numbersTitle: string
  numbersNote: string
  /** أسماء الخيارات الثلاثة للمحوّر. */
  numbersAuto: string
  numbersArabic: string
  numbersLatin: string
  /** وصف مسموع للمجموعة (a11y). */
  numbersGroupLabel: string
  /** تسمية العيّنة الحيّة تحت المحوّر. */
  numbersSampleLabel: string
}

export const settingsPreferencesStrings: Record<Lang, SettingsPreferencesCopy> = {
  ar: {
    groupTitle: 'اللغة والوحدات والأرقام',
    unitsTitle: 'الوحدات',
    unitsValue: 'متري · كجم · سم · لتر',
    unitsNote: 'قِمّة يدعم الوحدات المترية حاليًا.',
    numbersTitle: 'الأرقام',
    // كانت هذه الجملة تقول «تظهر بالأرقام العربية مع الواجهة العربية، وتتغيّر
    // للاتينية مع الإنجليزية» — أي تُثبّت السياسة التي يزيلها هذا المحوّر.
    numbersNote: 'تقدر تخلي الأرقام عربية أو غربية مع أي لغة. «تلقائي» يتبع لغة الواجهة.',
    numbersAuto: 'تلقائي',
    numbersArabic: 'عربية ٠١٢',
    numbersLatin: 'غربية 012',
    numbersGroupLabel: 'شكل الأرقام',
    numbersSampleLabel: 'شكلها عندك',
  },
  en: {
    groupTitle: 'Language, units & numbers',
    unitsTitle: 'Units',
    unitsValue: 'Metric · kg · cm · L',
    unitsNote: 'Qimmah currently supports metric units.',
    numbersTitle: 'Numbers',
    numbersNote: 'Pick Arabic or Western digits with any language. “Automatic” follows the interface language.',
    numbersAuto: 'Automatic',
    numbersArabic: 'Arabic ٠١٢',
    numbersLatin: 'Western 012',
    numbersGroupLabel: 'Number style',
    numbersSampleLabel: 'How yours look',
  },
}
