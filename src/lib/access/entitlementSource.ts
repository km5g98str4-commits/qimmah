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
import {
  backendAvailable,
  claimPendingGrantsOnServer,
  fetchEntitlement,
  redeemCodeOnServer,
  startTrialOnServer,
  type EntitlementDetail,
  type TrialOutcome,
} from './entitlementBackend'

/** مفتاح مخزن التقليد — لا يُقرأ إلا في وضع التقليد (انظر `mockEnabled`). */
const MOCK_KEY = 'qimmah:entitlement-mock:v1'

/** هل بُني التطبيق في وضع التقليد؟ قرار **وقت البناء** لا وقت التشغيل. */
export function mockEnabled(): boolean {
  return import.meta.env.VITE_ENTITLEMENT_MODE === 'mock'
}

/** نتائج استبدال كود التفعيل — الحالات التي تطلبها واجهة المؤسس (§D). */
export type RedeemOutcome =
  | 'success'
  | 'invalid'
  | 'already_used'
  | 'expired'
  | 'revoked'
  | 'not_authenticated'
  | 'offline'

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
export async function resolveEntitlement(): Promise<{
  status: EntitlementStatus
  source: EntitlementSource
  detail?: EntitlementDetail | null
  lastError?: string
}> {
  // وضع التقليد قرار وقت بناء، ويسبق كل شيء — تستخدمه إثباتات المصفوفة وحدها.
  if (mockEnabled()) return { status: readMockActive() ? 'active' : 'none', source: 'mock' }
  // [OVERNIGHT-3] عقد الخادم صار موجودًا. بلا ضبط Supabase تبقى الإجابة `none`
  // **بصدق**: لا مصدر ⇒ لا استحقاق. ومع الضبط تُسأل قاعدة البيانات، وأي فشل
  // يعود `none` مع سبب عام — الفشل يُغلق ولا يفتح.
  if (!backendAvailable()) return { status: 'none', source: 'none', lastError: 'backend_unconfigured' }
  const result = await fetchEntitlement()
  return { status: result.status, source: 'backend', detail: result.detail, lastError: result.error }
}

/**
 * يستبدل كود تفعيل. في وضع التقليد يُطابَق الكود بالجدول أعلاه؛ وفي الإنتاج —
 * حيث لا خادم بعد — يعيد `offline` **بصدق** بدل أن يدّعي فشلًا أو نجاحًا لم
 * يحدث. الصدق قبل الطمأنينة (الميثاق §6).
 */
export async function redeemActivationCode(code: string): Promise<RedeemOutcome> {
  const normalized = normalizeActivationCode(code)
  if (!normalized) return 'invalid'
  if (mockEnabled()) {
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
  // [OVERNIGHT-3] الاستبدال صار حقيقيًا. `offline` تبقى إجابة صادقة حين لا
  // يوجد خادم مضبوط — لا ادّعاء فشل ولا ادّعاء نجاح لم يحدث.
  if (!backendAvailable()) return 'offline'
  const outcome = await redeemCodeOnServer(normalized)
  switch (outcome) {
    case 'success': return 'success'
    case 'already_used': return 'already_used'
    case 'invalid': return 'invalid'
    // «موقوف» و«غير مسجَّل» ليستا «كودًا خاطئًا» — تُعرضان بنصّهما لا مبتلعتين.
    case 'revoked': return 'revoked'
    case 'not_authenticated': return 'not_authenticated'
    default: return 'offline'
  }
}

/**
 * تطبيع الكود قبل الإرسال — مُتسامح مع اللصق، صارم في المحتوى.
 *
 * يقبل ما يلصقه الناس فعلًا من رسالة بريد: مسافات وشرطات وأسطر جديدة وحروفًا
 * صغيرة وأرقامًا عربية-هندية. ويرفض ما عدا ذلك بدل «تنظيفه» بصمت — فالتحويل
 * الصامت قد يصنع كودًا صالحًا من كود خاطئ.
 */
export function normalizeActivationCode(raw: string): string {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩'
  return raw
    .replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)))
    .replace(/[\s\u200f\u200e-]+/g, '')
    .trim()
    .toUpperCase()
}

/** بدء التجربة — ٧٢ ساعة يحسمها الخادم وحده. */
export async function startTrial(): Promise<TrialOutcome> {
  if (mockEnabled()) {
    try {
      window.sessionStorage.setItem(MOCK_KEY, 'active')
      return 'started'
    } catch {
      return 'offline'
    }
  }
  if (!backendAvailable()) return 'offline'
  return startTrialOnServer()
}

/** استلام منحة اشتُريت قبل إنشاء الحساب. صامتة عند عدم وجود شيء. */
export async function claimPendingGrants(): Promise<boolean> {
  if (mockEnabled()) return false
  if (!backendAvailable()) return false
  return claimPendingGrantsOnServer()
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
