// إعادة ضبط قِمّة بالكامل — يحذف مفاتيح قِمّة فقط دون المساس بأي مفاتيح أخرى.

import { resetAnalytics } from './analytics'
import { cancelAllReminders } from './reminders'
import { wipeUserData } from './accountScope'

// مفاتيح إضافية يمسحها «إعادة الضبط/الحذف» الكامل ولا يمسحها مسح تبديل الحساب:
// سجلّ الحسابات (فيُعاد الإعداد عند عودة الحساب) ورمز الجلسة (تسجيل خروج).
const FULL_RESET_EXTRA_KEYS = ['qimmah:onboarding:accounts:v1', 'qimmah:supabase-auth:v1']

/**
 * يحذف كل بيانات مستخدم قِمّة ثم يعيد التحميل إلى شاشة البداية.
 *
 * المسح صار عبر `wipeUserData()` (مسح بالبادئة مع قائمة سماح عامّة) بدل قائمة تضمين
 * ثابتة — فيُمسح **كل** مفتاح بيانات مستخدم بما فيها المفاتيح التي كانت القائمة القديمة
 * تُغفلها (الخطوات، الخطة المخصّصة، مفاتيح v2، الجلسة النشطة…). هذا يُصلح الخلل المعروف
 * في resetQimmah.
 *
 * async لأنّ إلغاء تذكيرات iOS المجدوَلة يمرّ عبر جسر أصلي. آمن للاستدعاء fire-and-forget:
 * المسح المحلي الحرج يتمّ **أولًا** ولا يعتمد على أي نظام خارجي.
 */
export async function resetQimmah(): Promise<void> {
  if (typeof window === 'undefined') return
  // أسقط حالة التحليلات في الذاكرة أولًا (طابور/دفعة معلّقة + الموافقة والمعرّف المجهول
  // المخزَّنان في cache) — لا يكفي مسح localStorage وحده لأن المعرّف القديم يبقى في الذاكرة.
  resetAnalytics()
  // مسح fail-safe لكل بيانات المستخدم (كل `qimmah:*` عدا قائمة السماح العامّة).
  wipeUserData()
  // إعادة الضبط/الحذف الكامل تتجاوز مسح التبديل: تمسح سجلّ الحسابات وتُنهي الجلسة أيضًا.
  FULL_RESET_EXTRA_KEYS.forEach((k) => {
    try {
      window.localStorage.removeItem(k)
    } catch {
      /* تجاهل */
    }
  })
  // ألغِ تذكيرات iOS المجدوَلة (best-effort، محتوى الخطأ) — لا يحجب المسح/إعادة التحميل.
  try {
    await cancelAllReminders()
  } catch {
    /* لا يمنع الإكمال */
  }
  window.location.hash = '/start'
  window.location.reload()
}
