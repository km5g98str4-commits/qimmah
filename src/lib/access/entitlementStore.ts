// مخزن الاستحقاق — حالة عادية (لا React) قابلة للاشتراك.
// [QIM-WEB-FOUNDER-UX-003] الحزمة ٢.
//
// لماذا خارج React: **الدفاع الثاني في طبقة التخزين**. مطالب المؤسس §25 تمنع
// الالتفاف عبر «استدعاء المعالج يدويًا» أو مسار hash مباشر أو ورقة التسجيل
// السريع. وطبقة المخازن (`nutritionTracking` · `activeWorkout` · `measurementLog`)
// وحدات نقيّة لا ترى سياق React — فلو عاش الاستحقاق في السياق وحده لبقيت تلك
// الطبقة عمياء، ولصار الحارس زينةً في الواجهة.
//
// المصدر الوحيد للكتابة هو `EntitlementProvider`؛ وما عداه يقرأ.

import type { EntitlementStatus } from './paidActions'
import type { EntitlementDetail } from './entitlementBackend'

/**
 * من أين جاءت الحقيقة — يُعرض في التقارير ولا يُخفى.
 *
 * [OFFLINE-ENTITLEMENT-001] `'cache'` = **إجابة الخادم الأخيرة مُعادةً** حين
 * تعذّر سؤاله (`entitlementCache.applyOfflineGrace`). ليست مصدرًا ثالثًا
 * للحقيقة بل صدىً للثاني، ولذلك تُسمّى ولا تُدسّ تحت `'backend'`: من يقرأ
 * تقريرًا يجب أن يرى الفرق بين «سألنا الآن» و«هذا ما قاله آخر مرّة».
 */
export type EntitlementSource = 'mock' | 'backend' | 'cache' | 'none'

export interface EntitlementSnapshot {
  status: EntitlementStatus
  source: EntitlementSource
  /** آخر سبب رفض من الخادم (عام دائمًا — لا يكشف وجود الأكواد). */
  lastError?: string
  /**
   * [OVERNIGHT-3] تفصيل الخادم — **للعرض الصادق وحده**.
   *
   * القرار يبقى في `status` لا هنا: هذا الحقل يجيب «كم بقي من التجربة؟» و«هل
   * هذا Premium أم تجربة؟» فلا تُعرض العبارة نفسها لحالتين مختلفتين. اختياري
   * لأن وضع التقليد ووضع «لا مصدر» لا يملكان تفصيلًا يقولانه.
   */
  detail?: EntitlementDetail | null
  /**
   * [OFFLINE-ENTITLEMENT-001] لماذا قُبلت الذاكرة أو رُفضت — باسمها
   * (`within_grace` · `tampered` · `stale` · `account_mismatch` …). حقل تشخيص
   * **لا يُقرَّر منه شيء**، ووجوده يمنع أن يُلبَس سجلٌّ معبوث ثوبَ «ما فيه نت».
   * نصّ حرّ عمدًا: النوع الدقيق `CacheRejection` يعيش في طبقته، والمخزن حاملٌ
   * لا حاكم.
   */
  cacheReason?: string
}

/**
 * الحالة الابتدائية **مغلقة**: `loading` تمنع كل فعل مدفوع (انظر
 * `isPaidActionAllowed`). لا نبدأ متفائلين ثم نتراجع — التفاؤل هنا يعني فعلًا
 * مدفوعًا نُفِّذ قبل أن نعرف.
 */
let current: EntitlementSnapshot = { status: 'loading', source: 'none' }

type Listener = (snapshot: EntitlementSnapshot) => void
const listeners = new Set<Listener>()

export function getEntitlement(): EntitlementSnapshot {
  return current
}

/** يُستدعى من المزوّد وحده. */
export function setEntitlement(next: EntitlementSnapshot): void {
  if (
    next.status === current.status &&
    next.source === current.source &&
    next.lastError === current.lastError &&
    next.cacheReason === current.cacheReason &&
    next.detail === current.detail
  ) return
  current = next
  for (const fn of listeners) fn(current)
}

export function subscribeEntitlement(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * إعادة الضبط — للاختبارات ولتسجيل الخروج. تعود إلى الحالة **المغلقة** لا إلى
 * `none`: الخروج لا يعني «تأكّدنا أنه غير مشترك»، بل «لم نعد نعرف».
 */
export function resetEntitlement(): void {
  setEntitlement({ status: 'loading', source: 'none' })
}
