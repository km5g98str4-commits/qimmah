import type { Lang } from '@/lib/appPreferences'

export interface OnboardingLifestyleStrings {
  contextTitle: string
  contextWhy: string
  activityQ: string
  dietQ: string
  limitationsTitle: string
  limitationsWhy: string
  hasInjuryQ: string
  hasInjuryNote: string
  yes: string
  no: string
  injuryAreasQ: string
  contextValidation: string
  limitationsValidation: string
  legends: { activity: string; diet: string; hasInjury: string; injuryAreas: string }
}

export const onboardingLifestyleStrings: Record<Lang, OnboardingLifestyleStrings> = {
  ar: {
    contextTitle: 'يومك وأكلك',
    contextWhy: 'حركتك تضبط حساب الطاقة، ونمط أكلك يفلتر اقتراحات الوجبات.',
    activityQ: 'كيف تكون حركتك خارج التمرين؟',
    dietQ: 'وش نمط أكلك؟',
    limitationsTitle: 'القيود والإصابات',
    limitationsWhy: 'جوابك يستبعد الحركات اللي ما تناسب المنطقة المتأثرة.',
    hasInjuryQ: 'عندك إصابة أو حركة ممنوعة؟',
    hasInjuryNote: 'هذا ليس تشخيصًا طبيًا؛ نستخدمه لتصفية الخطة فقط.',
    yes: 'نعم',
    no: 'لا',
    injuryAreasQ: 'وش المنطقة المتأثرة؟',
    contextValidation: 'اختر مكان تمرينك وحركتك ونمط أكلك عشان تكمّل.',
    limitationsValidation: 'اختر نعم أو لا، وحدّد المنطقة إذا اخترت نعم.',
    legends: {
      activity: 'النشاط اليومي خارج التمرين',
      diet: 'نمط الأكل',
      hasInjury: 'وجود إصابة أو حركة ممنوعة',
      injuryAreas: 'المناطق المتأثرة',
    },
  },
  en: {
    contextTitle: 'Your day and food',
    contextWhy: 'Daily movement tunes your energy target, and diet pattern filters meal suggestions.',
    activityQ: 'How active are you outside training?',
    dietQ: 'What is your diet pattern?',
    limitationsTitle: 'Limitations and injuries',
    limitationsWhy: 'Your answer filters movements that do not suit the affected area.',
    hasInjuryQ: 'Any injury or movement to avoid?',
    hasInjuryNote: 'This is not a diagnosis; it is only used to filter your plan.',
    yes: 'Yes',
    no: 'No',
    injuryAreasQ: 'Which area is affected?',
    contextValidation: 'Choose your training place, daily activity, and diet pattern to continue.',
    limitationsValidation: 'Choose yes or no, and select an area if you choose yes.',
    legends: {
      activity: 'Daily activity outside training',
      diet: 'Diet pattern',
      hasInjury: 'Whether an injury or movement limitation exists',
      injuryAreas: 'Affected areas',
    },
  },
}
