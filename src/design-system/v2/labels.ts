// Qimmah Design v2.1 — approved copy baseline (Founder Refinement Pass).
//
// SLICE 0 — SEAM ONLY. These are the *canonical* v2.1 strings, frozen here so a
// single source exists when later slices redesign the nav and onboarding. They
// are intentionally NOT wired into the live UI yet:
//   • The current bottom tabs (src/config/strings.ts → `tabs`) keep their v1
//     labels and structure — v2.1 introduces a new "تسجيل" (Log) tab, a nav
//     change that belongs to a dedicated screen slice, not Slice 0.
//   • The live goal model (src/data/planBuilder.ts) keeps its current copy —
//     rewording it would change the onboarding screen now.
// Importing this module renders nothing; changing it changes nothing today.
//
// Arabic tone (v2.1): warm Modern Standard Arabic — confident and motivating,
// not heavy slang, not cold/clinical. See docs/design/DESIGN-DECISIONS.md.

/** Final v2.1 bottom-tab labels (order is the intended RTL nav order). */
export const V2_TAB_LABELS = {
  today: 'اليوم',
  workout: 'التمارين',
  log: 'تسجيل',
  nutrition: 'التغذية',
  progress: 'التقدم',
} as const

export type V2TabKey = keyof typeof V2_TAB_LABELS

/** Goal value keys — aligned with the existing model (OnbGoalType / CalorieGoal). */
export type V2GoalValue = 'cut' | 'maintain' | 'bulk'

export interface V2GoalModelEntry {
  value: V2GoalValue
  /** Short label. */
  label: string
  /** One-line description (warm MSA). */
  description: string
}

/** Final v2.1 goal model — تنشيف / محافظة / تضخيم. */
export const V2_GOAL_MODEL: readonly V2GoalModelEntry[] = [
  { value: 'cut', label: 'تنشيف', description: 'خفض الدهون مع الحفاظ على العضلات' },
  { value: 'maintain', label: 'محافظة', description: 'تثبيت الوزن وتحسين الشكل والأداء' },
  { value: 'bulk', label: 'تضخيم', description: 'زيادة الكتلة العضلية بشكل محسوب' },
] as const

export interface V2WelcomeCopy {
  brand: string
  /** Headline delivered as two short confident lines. */
  headline: readonly [string, string]
  support: string
  primary: string
  secondary: string
  /** Calm trust line above the CTA — honest, anti-hype (warm MSA). */
  trust: string
}

/**
 * Approved v2.1 Welcome / Start copy (Founder Refinement Pass) — warm MSA.
 * Arabic is the source of truth; English mirrors it for the bilingual toggle.
 * Rendered by the v2 Welcome slice (StartViewV2), preview-gated.
 */
export interface V2OnboardingCopy {
  back: string
  next: string
  stepOf: (n: number) => string
  goal: { title: string; note: string }
  training: { title: string; subtitle: string; daysQ: string; durationQ: string; daysUnit: string; summaryTitle: string; perSession: string; suitsGoal: string }
  equipment: { title: string; subtitle: string; placeQ: string; prefQ: string; injuryQ: string; injuryNote: string; cta: string }
  places: readonly { value: string; label: string; icon: string }[]
  prefs: readonly { value: string; label: string; icon: string }[]
  injuries: readonly { value: string; label: string }[]
  ready: { eyebrow: string; title: string; subtitle: string; enter: string; previewNote: string }
}

/** Approved v2.1 onboarding copy (warm MSA). Rendered by OnboardingV2 (preview-gated). */
export const V2_ONBOARDING: Record<'ar' | 'en', V2OnboardingCopy> = {
  ar: {
    back: 'رجوع',
    next: 'التالي',
    stepOf: (n) => `الخطوة ${['١', '٢', '٣'][n - 1] ?? n} من ٣`,
    goal: { title: 'ما هدفك الآن؟', note: 'يمكنك تغييره في أي وقت.' },
    training: {
      title: 'نُعد جدولك',
      subtitle: 'أسئلة قصيرة لنقترح خطة تناسب وقتك وهدفك.',
      daysQ: 'كم يوم تتمرن بالأسبوع؟',
      durationQ: 'مدة التمرين المناسبة لك؟',
      daysUnit: 'أيام',
      summaryTitle: 'خطتك تتكوّن',
      perSession: 'للجلسة',
      suitsGoal: 'تناسب هدف',
    },
    equipment: {
      title: 'أين تتمرن؟ وكيف؟',
      subtitle: 'نختار التمارين المناسبة للمعدات المتاحة لك.',
      placeQ: 'مكان التمرين',
      prefQ: 'ماذا تفضّل؟',
      injuryQ: 'عندك إصابة أو تمرين ممنوع؟',
      injuryNote: 'نستبعد الحركات غير المناسبة تلقائيًا.',
      cta: 'اعتمد خطتي',
    },
    places: [
      { value: 'gym', label: 'نادي', icon: 'Building2' },
      { value: 'home', label: 'منزل', icon: 'Home' },
      { value: 'machines', label: 'أجهزة فقط', icon: 'Dumbbell' },
    ],
    prefs: [
      { value: 'machines', label: 'أجهزة', icon: 'Dumbbell' },
      { value: 'free', label: 'أوزان حرة', icon: 'Activity' },
      { value: 'mixed', label: 'مزيج', icon: 'Zap' },
    ],
    injuries: [
      { value: 'knee', label: 'الركبة' },
      { value: 'shoulder', label: 'الكتف' },
      { value: 'lower_back', label: 'أسفل الظهر' },
      { value: 'wrist', label: 'الرسغ' },
      { value: 'elbow', label: 'المرفق' },
      { value: 'ankle', label: 'الكاحل' },
    ],
    ready: {
      eyebrow: 'جاهز',
      title: 'خطتك جاهزة',
      subtitle: 'بنيناها على هدفك ووقتك ومعداتك.',
      enter: 'الدخول للوحة',
      previewNote: 'تُبنى خطتك وتُحفظ على هذا الجهاز. المزامنة السحابية تحتاج تسجيل الدخول.',
    },
  },
  en: {
    back: 'Back',
    next: 'Next',
    stepOf: (n) => `Step ${n} of 3`,
    goal: { title: 'What is your goal now?', note: 'You can change it anytime.' },
    training: {
      title: 'Setting up your schedule',
      subtitle: 'A few quick questions to suggest a plan that fits your time and goal.',
      daysQ: 'How many days per week?',
      durationQ: 'Session length that suits you?',
      daysUnit: 'days',
      summaryTitle: 'Your plan is forming',
      perSession: 'per session',
      suitsGoal: 'suits',
    },
    equipment: {
      title: 'Where do you train? And how?',
      subtitle: 'We pick the right exercises for the equipment you have.',
      placeQ: 'Training place',
      prefQ: 'What do you prefer?',
      injuryQ: 'Any injury or exercise to avoid?',
      injuryNote: 'We automatically exclude unsuitable movements.',
      cta: 'Confirm my plan',
    },
    places: [
      { value: 'gym', label: 'Gym', icon: 'Building2' },
      { value: 'home', label: 'Home', icon: 'Home' },
      { value: 'machines', label: 'Machines only', icon: 'Dumbbell' },
    ],
    prefs: [
      { value: 'machines', label: 'Machines', icon: 'Dumbbell' },
      { value: 'free', label: 'Free weights', icon: 'Activity' },
      { value: 'mixed', label: 'Mixed', icon: 'Zap' },
    ],
    injuries: [
      { value: 'knee', label: 'Knee' },
      { value: 'shoulder', label: 'Shoulder' },
      { value: 'lower_back', label: 'Lower back' },
      { value: 'wrist', label: 'Wrist' },
      { value: 'elbow', label: 'Elbow' },
      { value: 'ankle', label: 'Ankle' },
    ],
    ready: {
      eyebrow: 'Ready',
      title: 'Your plan is ready',
      subtitle: 'Built on your goal, time, and equipment.',
      enter: 'Enter dashboard',
      previewNote: 'Your plan is built and saved on this device. Cloud sync needs sign-in.',
    },
  },
} as const

export const V2_WELCOME: Record<'ar' | 'en', V2WelcomeCopy> = {
  ar: {
    brand: 'قِمّة',
    headline: ['درّب بوضوح.', 'تقدّم بثقة.'],
    support: 'تمرينك وتغذيتك وتقدمك في مكان واحد — بالعربية، وبخطوات واضحة.',
    primary: 'ابدأ الآن',
    secondary: 'لديك حساب؟ تسجيل الدخول',
    trust: 'بلا إعلانات، وبلا مبالغات.',
  },
  en: {
    brand: 'Qimmah',
    headline: ['Train with clarity.', 'Progress with confidence.'],
    support: 'Your training, nutrition, and progress in one place — Arabic-first, in clear steps.',
    primary: 'Start now',
    secondary: 'Have an account? Log in',
    trust: 'No ads. No hype.',
  },
} as const
