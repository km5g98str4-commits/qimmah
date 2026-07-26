// حالة ربط «صحتي من Apple» — أربع حالات صادقة، لا خامسة (Q18).
//
// المشكلة التي يحلّها: الأساس المجمّع (connect.ts) كان جاهزًا بالكامل وبلا مستدعٍ
// واحد، والمستخدم لا يجد الربط أصلًا. هذه الطبقة تشتقّ حالة واحدة واضحة تكفي
// لبطاقة أعلى الإعدادات وزرّ واحد، وتُبقي التفاصيل لصفحة الربط.
//
// ── لماذا لا توجد حالة «مرفوض» ──
// iOS **لا يكشف** رفض صلاحية القراءة: `requestAuthorization` ينجح سواء وافق
// المستخدم أو رفض، و`authorizationStatus` للقراءة يُرجع `notDetermined` عمدًا
// حمايةً للخصوصية. فالتمييز بين «رفض» و«وافق لكن لا بيانات» **مستحيل** من داخل
// التطبيق. لذلك بعد اكتمال الطلب ولا بيانات نقول «يحتاج مراجعة» ونشرح كيف
// يراجعها المستخدم من تطبيق «صحتي» — ولا ندّعي رفضًا بلا دليل.
import {
  hasRequestedHealthAccess,
  healthConnectionSummary,
  healthRequestedAt,
  isHealthReadPlatform,
  type MetricDataState,
} from './connect'

/**
 * الحالات الأربع المعتمدة:
 *   • unavailable   — الجهاز/النظام لا يدعم القراءة أصلًا (كل ما ليس iOS أصليًا).
 *   • not-connected — متاح، ولم يُطلب التفويض على هذا الجهاز بعد.
 *   • needs-review  — اكتمل الطلب ولم تصل بيانات من أي مقياس مفعّل.
 *   • connected     — اكتمل الطلب ووصلت بيانات فعلية من مقياس واحد على الأقل.
 */
export type HealthLinkStatus = 'unavailable' | 'not-connected' | 'needs-review' | 'connected'

export interface HealthLinkSnapshot {
  status: HealthLinkStatus
  /** عدد المقاييس التي شملها الطلب المجمّع بعد ترشيح توفّر الجهاز. */
  requestedCount: number
  /** عدد المقاييس المفعّلة الآن (لم تُفصل يدويًا). */
  enabledCount: number
  /** عدد المقاييس التي وصلت منها عيّنات فعلية. */
  withDataCount: number
  /** إجمالي المقاييس المعروفة — للمقام في «٣ من ٢٨». */
  totalCount: number
  requestedAt: string | null
  /** هل اكتمل تدفّق الطلب المجمّع على هذا الجهاز؟ (يحسم نصّ الزرّ.) */
  hasRequested: boolean
}

/** مدخلات الاشتقاق — مُحقونة كي تُختبر الحالات الأربع بلا جهاز. */
export interface HealthLinkInputs {
  /** هل المنصّة تدعم القراءة؟ (iOS أصلي فقط) */
  available: boolean
  /** هل اكتمل تدفّق الطلب المجمّع؟ */
  requested: boolean
  requestedAt: string | null
  /** صف لكل مقياس معروف. */
  rows: readonly { enabled: boolean; dataState: MetricDataState }[]
}

/**
 * الاشتقاق الخالص. ترتيب الفحص مقصود:
 * التوفّر أولًا (لا معنى لأي حالة أخرى على جهاز غير مدعوم)، ثم «هل طُلب»، ثم
 * وجود بيانات فعلية — وهو **الدليل الوحيد** الذي نملكه على أن الربط يعمل.
 */
export function deriveHealthLinkState(input: HealthLinkInputs): HealthLinkSnapshot {
  const totalCount = input.rows.length
  const enabledCount = input.rows.filter((r) => r.enabled).length
  const withDataCount = input.rows.filter((r) => r.enabled && r.dataState === 'has-data').length

  if (!input.available) {
    return {
      status: 'unavailable',
      requestedCount: 0,
      enabledCount: 0,
      withDataCount: 0,
      totalCount,
      requestedAt: null,
      hasRequested: false,
    }
  }

  const base = {
    requestedCount: input.requested ? enabledCount : 0,
    enabledCount,
    withDataCount,
    totalCount,
    requestedAt: input.requestedAt,
    hasRequested: input.requested,
  }

  if (!input.requested) return { status: 'not-connected', ...base, requestedCount: 0 }
  // اكتمل الطلب: البيانات الواصلة هي الدليل الوحيد. لا بيانات ⇒ «يحتاج مراجعة»
  // (قد يكون رفضًا، وقد يكون لا توجد بيانات في «صحتي» أصلًا — لا نعرف ولا ندّعي).
  return { status: withDataCount > 0 ? 'connected' : 'needs-review', ...base }
}

/** اللقطة الحقيقية من حالة الجهاز — غلاف رقيق حول الاشتقاق الخالص أعلاه. */
export function healthLinkSnapshot(): HealthLinkSnapshot {
  const available = isHealthReadPlatform()
  // على جهاز غير مدعوم لا نقرأ الحالة المحفوظة أصلًا — التوفّر يحسم كل شيء.
  const rows = healthConnectionSummary().map((r) => ({ enabled: r.enabled, dataState: r.dataState }))
  return deriveHealthLinkState({
    available,
    requested: available && hasRequestedHealthAccess(),
    requestedAt: available ? healthRequestedAt() : null,
    rows,
  })
}
