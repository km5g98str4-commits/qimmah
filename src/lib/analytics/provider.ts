// عقد مزوّد التحليلات — طبقة تجريد تسمح باستبدال الوجهة لاحقًا (PostHog/Plausible/
// endpoint ذاتي/Supabase) بتغيير سطر setProvider واحد، دون لمس أي موقع استدعاء.

import type { AnalyticsEventName } from './events'

/** حدث ملتقَط جاهز للإرسال — بيانات غير معرِّفة للهوية فقط. */
export interface CapturedEvent {
  name: AnalyticsEventName
  props: Record<string, unknown>
  /** معرّف مجهول عشوائي محلي — غير مرتبط بحساب المصادقة أو البريد. */
  anonId: string
  /** طابع زمني بالميلي ثانية. */
  ts: number
}

/** أي مزوّد تحليلات يجب أن يحقّق هذا العقد. */
export interface AnalyticsProvider {
  capture(event: CapturedEvent): void
  /** إفراغ أي دفعة معلّقة (اختياري). */
  flush?(): void
  /**
   * إسقاط أي حالة معلّقة فورًا دون إرسال: تُمسح الطابور وتُلغى المؤقتات (اختياري).
   * يُستدعى عند سحب الموافقة أو إعادة الضبط — فلا تُرسَل أحداث سابقة بعدها.
   */
  reset?(): void
}

// المزوّد الحالي — يبدأ صامتًا (no-op) حتى يضبطه initAnalytics.
let current: AnalyticsProvider = { capture() {} }

export function setProvider(p: AnalyticsProvider): void {
  current = p
}

export function getProvider(): AnalyticsProvider {
  return current
}
