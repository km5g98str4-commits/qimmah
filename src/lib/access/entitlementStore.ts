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

/** من أين جاءت الحقيقة — يُعرض في التقارير ولا يُخفى. */
export type EntitlementSource = 'mock' | 'backend' | 'none'

export interface EntitlementSnapshot {
  status: EntitlementStatus
  source: EntitlementSource
  /** آخر سبب رفض من الخادم (عام دائمًا — لا يكشف وجود الأكواد). */
  lastError?: string
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
  if (next.status === current.status && next.source === current.source && next.lastError === current.lastError) return
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
