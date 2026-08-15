// حدود الاستحقاق — أين تأتي الحقيقة من، وما المُقلَّد صراحةً.
// [QIM-WEB-FOUNDER-UX-003] الحزمة ٢ · مطلب §C «لا استحقاق وهمي في العميل».
//
// ═══ ما هو حقيقي وما هو مُقلَّد — معلَن لا مدفون ═══
//   • **الافتراضي (وبناء الإنتاج): لا مصدر استحقاق إطلاقًا** ⇒ `none` دائمًا.
//     أي أن البناء المنشور اليوم **لا يستطيع منح Premium لأحد**، وهو الوضع
//     الصادق ما دام عقد الخادم لم يُوصَل بعد. لم يُربط أي Backend في هذه الحزمة.
//   • **وضع التقليد** يُفعَّل ببناء صريح `VITE_ENTITLEMENT_MODE=mock` — يستخدمه
//     إثبات المصفوفة وحده لاختبار شخصية «مشترك». لا يُبنى به الإنتاج.
//
// ═══ ما لا يمنح الاستحقاق أبدًا (نصّ المؤسس §4) ═══
//   العودة من صفحة الدفع · معطى في العنوان · قيمة في `localStorage` تقول
//   «مدفوع» · أي حالة في الواجهة. ولذلك **لا يقرأ هذا الملف العنوان إطلاقًا**،
//   ومخزن التقليد يعيش في `sessionStorage` تحت مفتاح وضع-التقليد فقط، فلا يمكن
//   لبناء الإنتاج أن يقرأه أصلًا مهما كُتب في الجهاز.

import type { EntitlementStatus } from './paidActions'
import type { EntitlementSource } from './entitlementStore'

/** مفتاح مخزن التقليد — لا يُقرأ إلا في وضع التقليد (انظر `mockEnabled`). */
const MOCK_KEY = 'qimmah:entitlement-mock:v1'

/** هل بُني التطبيق في وضع التقليد؟ قرار **وقت البناء** لا وقت التشغيل. */
export function mockEnabled(): boolean {
  return import.meta.env.VITE_ENTITLEMENT_MODE === 'mock'
}

/** نتائج استبدال كود التفعيل — الحالات التي تطلبها واجهة المؤسس (§D). */
export type RedeemOutcome = 'success' | 'invalid' | 'already_used' | 'expired' | 'offline'

/**
 * أكواد اختبار وضع التقليد. **موجودة في وضع التقليد وحده**، ولا تُشحن في بناء
 * الإنتاج لأن `mockEnabled()` تقطع الطريق قبل قراءتها.
 *
 * ولاحظ الغياب المقصود: لا يوجد كود «يكشف» أن كودًا آخر موجود. كل ما ليس في
 * هذا الجدول يعيد `invalid` **واحدة عامّة** — فلا يصير الحقل أوراكل يُستدلّ به
 * على وجود الأكواد (مطلب المؤسس §D).
 */
const MOCK_CODES: Record<string, RedeemOutcome> = {
  'QIMMAH-TEST-OK': 'success',
  'QIMMAH-TEST-USED': 'already_used',
  'QIMMAH-TEST-EXPIRED': 'expired',
  'QIMMAH-TEST-OFFLINE': 'offline',
}

function readMockActive(): boolean {
  if (!mockEnabled()) return false
  try {
    return window.sessionStorage.getItem(MOCK_KEY) === 'active'
  } catch {
    return false
  }
}

/**
 * يحسم الاستحقاق الحالي.
 *
 * بلا وضع تقليد: `none` — **لا محاولة اتصال ولا تخمين**. حين يصل عقد الخادم
 * يُستبدل جسم هذه الدالة وحده، ولا يتغيّر أي مستدعٍ.
 */
export async function resolveEntitlement(): Promise<{ status: EntitlementStatus; source: EntitlementSource }> {
  if (!mockEnabled()) return { status: 'none', source: 'none' }
  return { status: readMockActive() ? 'active' : 'none', source: 'mock' }
}

/**
 * يستبدل كود تفعيل. في وضع التقليد يُطابَق الكود بالجدول أعلاه؛ وفي الإنتاج —
 * حيث لا خادم بعد — يعيد `offline` **بصدق** بدل أن يدّعي فشلًا أو نجاحًا لم
 * يحدث. الصدق قبل الطمأنينة (الميثاق §6).
 */
export async function redeemActivationCode(code: string): Promise<RedeemOutcome> {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return 'invalid'
  if (!mockEnabled()) return 'offline'
  const outcome = MOCK_CODES[normalized] ?? 'invalid'
  if (outcome === 'success') {
    try {
      window.sessionStorage.setItem(MOCK_KEY, 'active')
    } catch {
      return 'offline'
    }
  }
  return outcome
}

/** يُنهي جلسة التقليد (تسجيل خروج/اختبار). لا أثر له في الإنتاج. */
export function clearMockEntitlement(): void {
  if (!mockEnabled()) return
  try {
    window.sessionStorage.removeItem(MOCK_KEY)
  } catch {
    /* التخزين غير متاح — لا شيء نمسحه */
  }
}
