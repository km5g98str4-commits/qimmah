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
}

/**
 * Approved v2.1 Welcome / Start copy (Founder Refinement Pass) — warm MSA.
 * Arabic is the source of truth; English mirrors it for the bilingual toggle.
 * Rendered by the v2 Welcome slice (StartViewV2), preview-gated.
 */
export const V2_WELCOME: Record<'ar' | 'en', V2WelcomeCopy> = {
  ar: {
    brand: 'قِمّة',
    headline: ['درّب بوضوح.', 'تقدّم بثقة.'],
    support: 'تمرينك وتغذيتك وتقدمك في مكان واحد — بالعربية، وبخطوات واضحة.',
    primary: 'ابدأ الآن',
    secondary: 'لديك حساب؟ تسجيل الدخول',
  },
  en: {
    brand: 'Qimmah',
    headline: ['Train with clarity.', 'Progress with confidence.'],
    support: 'Your training, nutrition, and progress in one place — Arabic-first, in clear steps.',
    primary: 'Start now',
    secondary: 'Have an account? Log in',
  },
} as const
