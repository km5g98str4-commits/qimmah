// إعادة ضبط قِمّة بالكامل — يحذف مفاتيح قِمّة فقط دون المساس بأي مفاتيح أخرى.

export const QIMMAH_KEYS = [
  'qimmah:customization:v1',
  'qimmah:onboarding:v1',
  // سجلّ الحسابات التي أكملت الإعداد (بوابة الإعداد لكل حساب).
  'qimmah:onboarding:accounts:v1',
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
  // الأوسمة والإنجازات
  'qimmah:achievements:v1',
]

// مفاتيح ذات لاحقة ديناميكية (منعزلة لكل حساب) تُمسح بالبادئة لا بالمطابقة التامة.
// مثال: مهام اليوم `qimmah:todo:v1:<userId>` / `qimmah:todo:v1:guest`.
const QIMMAH_KEY_PREFIXES = ['qimmah:todo:v1:']

/** يحذف مفاتيح قِمّة فقط، ثم يعيد التحميل إلى شاشة البداية. */
export function resetQimmah(): void {
  if (typeof window === 'undefined') return
  QIMMAH_KEYS.forEach((k) => window.localStorage.removeItem(k))
  // اكنس المفاتيح ذات البادئة (لكل الحسابات على هذا الجهاز).
  for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
    const key = window.localStorage.key(i)
    if (key && QIMMAH_KEY_PREFIXES.some((p) => key.startsWith(p))) {
      window.localStorage.removeItem(key)
    }
  }
  window.location.hash = '/start'
  window.location.reload()
}
