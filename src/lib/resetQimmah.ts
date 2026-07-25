// إعادة ضبط قِمّة بالكامل — يحذف مفاتيح قِمّة فقط دون المساس بأي مفاتيح أخرى.

import { STEP_GOAL_KEY, STEP_LOG_KEY, STEP_SOURCE_KEY } from './stepCounter'
import { ACTIVE_WORKOUT_KEY } from './activeWorkout'

export const QIMMAH_KEYS = [
  'qimmah:customization:v1',
  'qimmah:onboarding:v1',
  // مصدر الحقيقة للإعداد (Phase 1) — لازم يُمسح وإلا بقيت بيانات إعداد قديمة بعد الضبط.
  'qimmah:onboarding:profile:v1',
  'qimmah:today:v1',
  'qimmah:nutritionToday:v1',
  'qimmah:wellnessToday:v1',
  'qimmah:commitmentsToday:v1',
  'qimmah:measurementLogs:v1',
  'qimmah:workoutSessions:v1',
  'qimmah:exerciseHistory:v1',
  'qimmah:prefs:v1',
  // تفضيل وضع الواجهة (بسيط/متقدّم)
  'qimmah:uiMode:v1',
  // تفضيلات التذكير + بيانات المزامنة (إن وُجدت)
  'qimmah:reminders:v1',
  'qimmah:sync:meta:v1',
  'qimmah:supabase-auth:v1',
  // المتجر التاريخي الدائم (v1)
  'qimmah:history:workoutSessions:v1',
  'qimmah:history:exerciseHistory:v1',
  'qimmah:history:dailyLogs:v1',
  'qimmah:history:measurementLogs:v1',
  'qimmah:history:nutritionLogs:v1',
  'qimmah:history:waterLogs:v1',
  'qimmah:history:supplementLogs:v1',
  'qimmah:history:medicationLogs:v1',
  'qimmah:history:migrated:v1',
  // الخطوات اليدوية + الهدف + مصدر البيانات — تُستورد من مالكها كي لا تتخلّف القائمة.
  STEP_LOG_KEY,
  STEP_SOURCE_KEY,
  STEP_GOAL_KEY,
  // مسوّدة التمرين النشط (استئناف جلسة لم تُنهَ).
  ACTIVE_WORKOUT_KEY,
]

/** يحذف مفاتيح قِمّة فقط، ثم يعيد التحميل إلى شاشة البداية. */
export function resetQimmah(): void {
  if (typeof window === 'undefined') return
  QIMMAH_KEYS.forEach((k) => window.localStorage.removeItem(k))
  window.location.hash = '/start'
  window.location.reload()
}
