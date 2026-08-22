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
  type AccessFailure,
  type EntitlementDetail,
  type TrialOutcome,
} from './entitlementBackend'

/** مفتاح مخزن التقليد — لا يُقرأ إلا في وضع التقليد (انظر `mockEnabled`). */
const MOCK_KEY = 'qimmah:entitlement-mock:v1'

/** هل بُني التطبيق في وضع التقليد؟ قرار **وقت البناء** لا وقت التشغيل. */
export function mockEnabled(): boolean {
  return import.meta.env.VITE_ENTITLEMENT_MODE === 'mock'
}

/**
 * نتائج استبدال كود التفعيل — الحالات التي تطلبها واجهة المؤسس (§D).
 *
 * [SOVEREIGN-COMMERCE-001] **`'expired'` أُزيلت**، ولم تُستبدل.
 * `redeem_access_code` تدمج «منتهٍ» في `invalid_code` **عمدًا** حتى لا يصير
 * الحقل أوراكل على وجود الأكواد (انظر `classifyRedeemError`). فما دام الخادم
 * لا يقول «منتهٍ» أبدًا، فإن نصًّا يقول «هذا الكود منتهي» **لا يمكن أن يكون
 * صادقًا في الإنتاج** — وكان معلّقًا بلا مسار منذ وصول عقد الخادم. حذفناه بدل
 * تركه سطرًا صادق المظهر ميت المسار.
 *
 * وأُضيفت `'empty'`: «ما كتبت كودًا» ليست «كودك خاطئ».
 */
export type RedeemOutcome =
  | 'success'
  | 'empty'
  | 'invalid'
  | 'already_used'
  | 'revoked'
  | 'not_authenticated'
  | AccessFailure

/**
 * أكواد اختبار وضع التقليد. **موجودة في وضع التقليد وحده**، ولا تُشحن في بناء
 * الإنتاج لأن `mockEnabled()` تقطع الطريق قبل قراءتها.
 *
 * ولاحظ الغياب المقصود: لا يوجد كود «يكشف» أن كودًا آخر موجود. كل ما ليس في
 * هذا الجدول يعيد `invalid` **واحدة عامّة** — فلا يصير الحقل أوراكل يُستدلّ به
 * على وجود الأكواد (مطلب المؤسس §D).
 *
 * [SOVEREIGN-COMMERCE-001] **التقليد يعكس الخادم ولا يتقدّم عليه.** كان
 * `QIMMAH-TEST-EXPIRED` يُنتج رسالة «منتهٍ» **لا يستطيع الخادم إنتاجها أبدًا**،
 * فكان يُثبت لنا في المراجعة تمييزًا لا وجود له في الإنتاج. صار يُنتج نفس
 * `invalid` المدموجة — فأصبح **إثباتًا للدمج** بدل أن يكون إخفاءً له.
 */
const MOCK_CODES: Record<string, RedeemOutcome> = {
  'QIMMAH-TEST-OK': 'success',
  'QIMMAH-TEST-USED': 'already_used',
  // مدموج مع «غير معروف» عمدًا — انظر التعليل أعلاه.
  'QIMMAH-TEST-EXPIRED': 'invalid',
  'QIMMAH-TEST-OFFLINE': 'offline',
  'QIMMAH-TEST-TIMEOUT': 'timeout',
  'QIMMAH-TEST-DOWN': 'service_error',
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
  /**
   * [OFFLINE-ENTITLEMENT-001] تصنيف الفشل وهوية الحساب **يعبران كما هما**.
   * هذه الدالّة لا تقرّر شيئًا بهما ولا تلمس تخزينًا؛ من يقرّر هو
   * `applyOfflineGrace` في `entitlementCache`، والمزوّد يركّبهما. وتركُ
   * القرار خارج هنا مقصود: يبقى هذا الملف «ما قاله المصدر الآن» بلا ذاكرة.
   */
  failure?: AccessFailure
  accountId?: string | null
}> {
  // وضع التقليد قرار وقت بناء، ويسبق كل شيء — تستخدمه إثباتات المصفوفة وحدها.
  if (mockEnabled()) return { status: readMockActive() ? 'active' : 'none', source: 'mock' }
  // [OVERNIGHT-3] عقد الخادم صار موجودًا. بلا ضبط Supabase تبقى الإجابة `none`
  // **بصدق**: لا مصدر ⇒ لا استحقاق. ومع الضبط تُسأل قاعدة البيانات، وأي فشل
  // يعود `none` مع سبب عام — الفشل يُغلق ولا يفتح.
  if (!backendAvailable()) return { status: 'none', source: 'none', lastError: 'backend_unconfigured' }
  const result = await fetchEntitlement()
  return {
    status: result.status,
    source: 'backend',
    detail: result.detail,
    lastError: result.error,
    failure: result.failure,
    accountId: result.accountId,
  }
}

/**
 * يستبدل كود تفعيل. في وضع التقليد يُطابَق الكود بالجدول أعلاه؛ وفي الإنتاج —
 * حيث لا خادم بعد — يعيد `offline` **بصدق** بدل أن يدّعي فشلًا أو نجاحًا لم
 * يحدث. الصدق قبل الطمأنينة (الميثاق §6).
 */
export async function redeemActivationCode(code: string): Promise<RedeemOutcome> {
  // [SOVEREIGN-COMMERCE-001] الحقل الفارغ يُجاب عنه **هنا** لا بزرّ معطّل.
  // «ما كتبت شيئًا» حقيقة محلّية مؤكّدة لا تحتاج رحلة شبكة، وليست حكمًا على
  // كودٍ — فلا تُدمج مع `invalid` التي تعني «جرّبناه ولم يُقبل».
  if (!code.trim()) return 'empty'
  // أكواد التقليد تُطابَق بصيغتها المكتوبة (تشمل الشرطات) — التطبيع الموجَّه
  // للخادم يُطبَّق على **مسار الخادم وحده**، لأنه جزء من عقده لا من العرض.
  const mockKey = code.trim().toUpperCase()
  const normalized = normalizeActivationCode(code)
  // مدخل مشوَّه: كلّه فواصل/رموز تُنزع فلا يبقى شيء يُرسَل. رفضٌ محلّي صادق،
  // ويُعرض بنفس رسالة «الكود ما ضبط» — فلا يُستدلّ من الرسالة على شكل الأكواد.
  if (!normalized) return 'invalid'
  if (mockEnabled()) {
    const outcome = MOCK_CODES[mockKey] ?? 'invalid'
    if (outcome === 'success') {
      try {
        window.sessionStorage.setItem(MOCK_KEY, 'active')
      } catch {
        return 'service_error'
      }
    }
    return outcome
  }
  // [SOVEREIGN-COMMERCE-001] غياب الخادم **ليس انقطاع نت**. كان يُقال هنا
  // `offline` فيُلام نتُ المستخدم على بناءٍ لا خادم فيه أصلًا (نسخة المراجعة).
  if (!backendAvailable()) return 'backend_unconfigured'
  const outcome = await redeemCodeOnServer(normalized)
  switch (outcome) {
    case 'success': return 'success'
    case 'already_used': return 'already_used'
    case 'invalid': return 'invalid'
    // «موقوف» و«غير مسجَّل» ليستا «كودًا خاطئًا» — تُعرضان بنصّهما لا مبتلعتين.
    case 'revoked': return 'revoked'
    case 'not_authenticated': return 'not_authenticated'
    // أصناف الفشل تعبر كما هي — كلٌّ برسالته. والافتراض `service_error` لا
    // `offline`: المجهول عطلٌ عندنا حتى يثبت أنه شبكة المستخدم.
    case 'backend_unconfigured': return 'backend_unconfigured'
    case 'timeout': return 'timeout'
    case 'offline': return 'offline'
    default: return 'service_error'
  }
}

/**
 * تطبيع الكود **قبل إرساله للخادم** — مُتسامح مع اللصق، صارم في المحتوى.
 *
 * أبجدية الخادم (`private.normalize_access_code`) هي
 * `A-H J-N P-Z 2-9` — بلا حروف تلتبس (I/O/l) وبلا فواصل إطلاقًا، ويرفض أي
 * كود يحمل شرطة أو مسافة. والناس يلصقون ما وصلهم في البريد كما هو: بشرطات
 * وأسطر جديدة وحروف صغيرة وربّما أرقام عربية-هندية.
 *
 * فالفواصل تُنزع **هنا وحدها**، ثم يُترك الحكم للخادم. ولا يُصحَّح حرف ولا
 * يُستبدل رمز: التحويل الصامت قد يصنع كودًا صالحًا من كود خاطئ.
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
      return 'service_error'
    }
  }
  // [SOVEREIGN-COMMERCE-001] نسخة المراجعة بلا خادم ⇒ تُقال بصراحتها، ولا
  // تُعرض تجربةً «ما قدرنا نوصل للخادم» وكأنها عطلٌ عابر يُعاد منه.
  if (!backendAvailable()) return 'backend_unconfigured'
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
