// أسماء أحداث التحليلات — مصدر الحقيقة الوحيد.
// لا يُضاف أو يُطلق أي حدث خارج هذه القائمة (نطاق Phase 2 مغلق).
//
// كل الخصائص أدناه **غير معرِّفة للهوية**: تعدادات/أرقام/مفاتيح ثابتة فقط.
// ممنوع تمرير معرّف الحساب أو البريد أو الاسم أو نص المستخدم أو قيمة الباركود.

export const ANALYTICS_EVENTS = [
  // — تفعيل (Activation) —
  'onboarding_completed',
  'first_workout_logged',
  'first_meal_logged',
  // — أساسية (Core) —
  'workout_logged',
  'meal_logged',
  'app_opened',
  // — القمع (Funnel) —
  'signup_started',
  'signup_succeeded',
  'onboarding_step_viewed',
  'onboarding_abandoned',
  // — صحة الميزات (Feature health) —
  'barcode_scan_result',
  'reminder_enabled',
  'plan_generated',
  // — الاستقرار (Stability) —
  'unhandled_error',
  'route_changed',
] as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number]

/** خصائص كل حدث — نوع صارم يمنع انحراف الأسماء أو تسريب أي حقل معرِّف للهوية. */
export interface EventProps {
  onboarding_completed: { planMode?: 'auto' | 'custom' }
  first_workout_logged: Record<string, never>
  first_meal_logged: Record<string, never>
  workout_logged: { exercises: number; prs: number }
  meal_logged: { mealSlot?: string }
  app_opened: Record<string, never>
  signup_started: Record<string, never>
  signup_succeeded: { needsConfirmation: boolean }
  onboarding_step_viewed: { step: number; key: string }
  onboarding_abandoned: { step: number }
  barcode_scan_result: { result: 'found' | 'not-found' | 'network-error' }
  reminder_enabled: { kind: 'training' }
  plan_generated: { source: 'onboarding' | 'custom' }
  unhandled_error: { source: 'render' | 'route' | 'window' | 'promise'; name?: string }
  route_changed: { route: string; from?: string }
}
