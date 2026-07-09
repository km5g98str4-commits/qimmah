// إعادة ضبط قِمّة بالكامل — يحذف مفاتيح قِمّة فقط دون المساس بأي مفاتيح أخرى.

import { resetAnalytics } from './analytics'
import { cancelAllReminders } from './reminders'

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
  // التحليلات: الموافقة + المعرّف المجهول + معالم «أول مرّة» — تُمسح عند حذف الحساب
  // (تُقطع هوية التحليلات) ويُولَّد معرّف جديد بعدها.
  'qimmah:analytics:v1',
  'qimmah:analytics:milestones:v1',
]

// مفاتيح ذات لاحقة ديناميكية (منعزلة لكل حساب) تُمسح بالبادئة لا بالمطابقة التامة.
// مثال: مهام اليوم `qimmah:todo:v1:<userId>` / `qimmah:todo:v1:guest`.
const QIMMAH_KEY_PREFIXES = ['qimmah:todo:v1:']

/**
 * يحذف مفاتيح قِمّة فقط، ثم يعيد التحميل إلى شاشة البداية.
 *
 * async لأنّ إلغاء تذكيرات iOS المجدوَلة يمرّ عبر جسر أصلي. آمن للاستدعاء fire-and-forget
 * (المستدعون لا ينتظرونه): الدالة مكتفية ذاتيًا وتعيد التحميل بنفسها في النهاية. المسح
 * المحلي الحرج يتمّ **أولًا** ولا يعتمد على أي نظام خارجي، وإلغاء الإشعار best-effort
 * محتوى الخطأ (try/catch) فلا يمنع خطأ الإلغاء المسح أو إعادة التحميل.
 */
export async function resetQimmah(): Promise<void> {
  if (typeof window === 'undefined') return
  // أسقط حالة التحليلات في الذاكرة أولًا (طابور/دفعة معلّقة + الموافقة والمعرّف المجهول
  // المخزَّنان في cache) — لا يكفي مسح localStorage وحده لأن المعرّف القديم يبقى في الذاكرة.
  resetAnalytics()
  // المسح المحلي الحرج أولًا (لا يعتمد على أي جسر أصلي) — يُضمن حتى لو تعثّر إلغاء الإشعار.
  QIMMAH_KEYS.forEach((k) => window.localStorage.removeItem(k))
  // اكنس المفاتيح ذات البادئة (لكل الحسابات على هذا الجهاز).
  for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
    const key = window.localStorage.key(i)
    if (key && QIMMAH_KEY_PREFIXES.some((p) => key.startsWith(p))) {
      window.localStorage.removeItem(key)
    }
  }
  // ألغِ تذكيرات iOS المجدوَلة (best-effort، محتوى الخطأ) — لا يحجب المسح/إعادة التحميل.
  // (cancelAllReminders لا يرمي أصلًا؛ الـ try هنا حزام أمان إضافي.)
  try {
    await cancelAllReminders()
  } catch {
    /* لا يمنع الإكمال */
  }
  window.location.hash = '/start'
  window.location.reload()
}
