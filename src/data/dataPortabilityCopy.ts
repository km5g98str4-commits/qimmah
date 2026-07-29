import type { Lang } from '@/lib/appPreferences'

export interface DataPortabilityCopy {
  actionTitle: string
  actionDescription: string
  preparing: string
  success: string
  error: string
  safetyNote: string
}

const COPY: Record<Lang, DataPortabilityCopy> = {
  ar: {
    actionTitle: 'تنزيل نسخة من بياناتي',
    actionDescription: 'ملف JSON يضم بيانات حسابك المتاحة على هذا الجهاز',
    preparing: 'نجهّز نسختك…',
    success: 'نسخة بياناتك جاهزة.',
    error: 'ما قدرنا نجهّز النسخة. جرّب مرة ثانية.',
    safetyNote: 'ممكن يحتوي الملف بيانات صحية شخصية. احفظه في مكان آمن.',
  },
  en: {
    actionTitle: 'Export my data',
    actionDescription: 'A JSON file containing account data available on this device',
    preparing: 'Preparing your copy…',
    success: 'Your data copy is ready.',
    error: "Couldn't prepare the copy. Try again.",
    safetyNote: 'This file may contain personal health data. Store it securely.',
  },
}

export function dataPortabilityCopy(lang: Lang): DataPortabilityCopy {
  return COPY[lang]
}
