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
// Arabic tone (dialect wave, supersedes the old "warm MSA" baseline): casual
// white Saudi/Gulf dialect — friendly, clear, respectful, no hype, no heavy
// slang. Canonical guide: docs/content/DIALECT-TONE-GUIDE.md.

/**
 * Final v2.1 bottom-tab labels — the central tab dictionary (enforced by the
 * policy gate). Bilingual so the nav follows the active language; Arabic stays
 * the approved §03 copy.
 */
export const V2_TAB_LABELS = {
  today: { ar: 'اليوم', en: 'Today' },
  workout: { ar: 'التمارين', en: 'Workout' },
  log: { ar: 'تسجيل', en: 'Log' },
  nutrition: { ar: 'التغذية', en: 'Nutrition' },
  progress: { ar: 'التقدّم', en: 'Progress' },
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
  { value: 'cut', label: 'تنشيف', description: 'تنزّل الدهون وتحافظ على عضلك' },
  { value: 'maintain', label: 'محافظة', description: 'تثبّت وزنك وتحسّن شكلك وأداءك' },
  { value: 'bulk', label: 'تضخيم', description: 'تبني عضل بزيادة محسوبة' },
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
  /** Full-screen plan-assembly loading state (shown while the plan is generated). */
  building: { title: string; subtitle: string }
  /** Visible plan-generation failure + retry (never a silent drop into the app). */
  error: { title: string; message: string; retry: string }
  /** Per-step inline validation messages shown when Next is tapped incomplete. */
  validation: { goal: string; training: string; equipment: string }
  /** sr-only fieldset legends for each choice group (a11y — not shown visually). */
  legends: { goal: string; days: string; duration: string; place: string; pref: string; injuries: string }
}

/** Approved v2.1 onboarding copy (warm MSA). Rendered by OnboardingV2 (preview-gated). */
export const V2_ONBOARDING: Record<'ar' | 'en', V2OnboardingCopy> = {
  ar: {
    back: 'رجوع',
    next: 'التالي',
    stepOf: (n) => `الخطوة ${['١', '٢', '٣'][n - 1] ?? n} من ٣`,
    goal: { title: 'وش هدفك الحين؟', note: 'تقدر تغيّره في أي وقت.' },
    training: {
      title: 'نجهّز جدولك',
      subtitle: 'أسئلة قصيرة عشان نقترح خطة تناسب وقتك وهدفك.',
      daysQ: 'كم يوم تتمرن بالأسبوع؟',
      durationQ: 'وش مدة التمرين اللي تناسبك؟',
      daysUnit: 'أيام',
      summaryTitle: 'خطتك تتكوّن',
      perSession: 'للجلسة',
      suitsGoal: 'تناسب هدف',
    },
    equipment: {
      title: 'وين وكيف تتمرّن؟',
      subtitle: 'نختار التمارين المناسبة للمعدات اللي عندك.',
      placeQ: 'مكان التمرين',
      prefQ: 'وش تفضّل؟',
      injuryQ: 'عندك إصابة أو تمرين ممنوع؟',
      injuryNote: 'نستبعد الحركات اللي ما تناسبك تلقائيًا.',
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
      previewNote: 'خطتك تنبنى وتنحفظ على هذا الجهاز. المزامنة السحابية تحتاج تسجيل الدخول.',
    },
    building: {
      title: 'نجهّز خطتك',
      subtitle: 'نرتّب أيامك وتمارينك…',
    },
    error: {
      title: 'ما قدرنا نجهّز الخطة',
      message: 'صارت مشكلة ونحن نجهّز خطتك. تأكّد من اتصالك وجرّب مرة ثانية.',
      retry: 'جرّب مرة ثانية',
    },
    validation: {
      goal: 'اختر هدفك أول عشان تكمّل.',
      training: 'اختر عدد الأيام ومدة التمرين عشان تكمّل.',
      equipment: 'اختر مكان التمرين ووش تفضّل عشان تكمّل.',
    },
    legends: {
      goal: 'اختيار الهدف',
      days: 'عدد أيام التمرين في الأسبوع',
      duration: 'مدة التمرين',
      place: 'مكان التمرين',
      pref: 'تفضيل المعدات',
      injuries: 'الإصابات أو التمارين الممنوعة',
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
    building: {
      title: 'Setting up your plan',
      subtitle: 'Arranging your days and workouts…',
    },
    error: {
      title: 'Couldn’t build the plan',
      message: 'Something went wrong while preparing your plan. Check your connection and try again.',
      retry: 'Try again',
    },
    validation: {
      goal: 'Pick your goal to continue.',
      training: 'Pick your days and session length to continue.',
      equipment: 'Pick where you train and what you prefer to continue.',
    },
    legends: {
      goal: 'Choose your goal',
      days: 'Training days per week',
      duration: 'Session length',
      place: 'Training place',
      pref: 'Equipment preference',
      injuries: 'Injuries or movements to avoid',
    },
  },
} as const

export const V2_WELCOME: Record<'ar' | 'en', V2WelcomeCopy> = {
  ar: {
    brand: 'قِمّة',
    headline: ['درّب بوضوح.', 'تقدّم بثقة.'],
    support: 'تمرينك وتغذيتك وتقدمك في مكان واحد — بالعربية، وبخطوات واضحة.',
    primary: 'ابدأ الآن',
    secondary: 'عندك حساب؟ تسجيل الدخول',
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
