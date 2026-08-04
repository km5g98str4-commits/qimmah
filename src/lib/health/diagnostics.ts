// تشخيص طبقة الصحة (P14) — **بيانات وصفية فقط، ولا قيمة صحية واحدة إطلاقًا**.
//
// الهدف: تقرير جهاز قابل للقراءة من Safari Web Inspector يجيب على سؤال واحد:
// «هل وصلت بيانات هذا المقياس، ومن أي مصدر، وكم استغرق الاستعلام؟» — بلا كشف
// أي رقم صحي (وزن/نبض/سعرات/نوم). القاعدة الصارمة المفروضة بالبرهان:
//   • لا حقل هنا يحمل قيمة عيّنة (value/kg/bpm/kcal/durationMin...).
//   • المصدر يُحفظ كاسم تطبيق/جهاز فقط (metadata كما يعطيه HealthKit).
//   • لا شيء من هذا يمرّ إلى track() ولا يُصدَّر ولا يُزامَن — ذاكرة الجلسة فقط.
//
// الاستخدام على الجهاز: window.__QIMMAH_HEALTH_DIAG__.summary()

import { ALL_HEALTH_METRICS, metricDef, type HealthMetric } from './metrics'

/** حالة آخر استعلام للمقياس — نفس عقد الجسر (لا 'denied' أبدًا: iOS يخفي رفض القراءة). */
export type HealthQueryStatus = 'never' | 'ok' | 'unavailable' | 'error'

/** سطر تشخيص لمقياس واحد — كل الحقول بيانات وصفية. */
export interface HealthMetricDiagnostics {
  metric: HealthMetric
  /** هل شمله تدفّق الطلب المجمّع على هذا الجهاز؟ */
  requested: boolean
  /** هل المقياس مفعّل الآن (لم يُفصل)؟ */
  enabled: boolean
  /** هل وصلت عيّنات فعلية؟ (has-data) — بدون أي قيمة. */
  hasData: boolean
  /** مدّة آخر استعلام بالمللي ثانية — null إذا لم يُستعلم بعد. */
  lastQueryMs: number | null
  /** حالة آخر استعلام. */
  lastStatus: HealthQueryStatus
  /** عدد العيّنات المخزّنة للمقياس (عدد فقط). */
  sampleCount: number
  /** عدد الصفحات التي جُلبت في آخر مزامنة (يكشف حلقة صفحات جامحة). */
  lastPages: number
  /** وحدة الأساس المستخدمة فعليًا في التخزين (kg/m/bpm/min...) — ليست قيمة. */
  unitUsed: string | null
  /** اسم آخر مصدر (تطبيق/جهاز) كما سجّله HealthKit — metadata لا قيمة. */
  source: string | null
}

interface MutableEntry {
  lastQueryMs: number | null
  lastStatus: HealthQueryStatus
  lastPages: number
  unitUsed: string | null
  source: string | null
}

const entries = new Map<HealthMetric, MutableEntry>()

function entryFor(metric: HealthMetric): MutableEntry {
  let entry = entries.get(metric)
  if (!entry) {
    entry = { lastQueryMs: null, lastStatus: 'never', lastPages: 0, unitUsed: null, source: null }
    entries.set(metric, entry)
  }
  return entry
}

/** حقول العيّنة المسموح قراءتها هنا — حارس صريح ضد تسرّب أي قيمة صحية. */
export interface DiagnosableSampleMeta {
  unit?: string
  source?: { name?: string }
}

/**
 * يسجّل نتيجة استعلام مقياس. **لا يستقبل قيمًا**: فقط الوحدة واسم المصدر وعدد
 * الصفحات والمدة — الحمولة الوصفية التي يحتاجها تقرير الجهاز.
 */
export function recordHealthQuery(
  metric: HealthMetric,
  info: { status: HealthQueryStatus; durationMs: number; pages: number; sampleMeta?: DiagnosableSampleMeta | null },
): void {
  const entry = entryFor(metric)
  entry.lastStatus = info.status
  entry.lastQueryMs = Number.isFinite(info.durationMs) ? Math.round(info.durationMs) : null
  entry.lastPages = Number.isFinite(info.pages) ? info.pages : 0
  const unit = info.sampleMeta?.unit
  if (typeof unit === 'string' && unit) entry.unitUsed = unit.slice(0, 24)
  const source = info.sampleMeta?.source?.name
  if (typeof source === 'string' && source) entry.source = source.slice(0, 64)
}

/** يصفّر التشخيص (اختبارات + زر «ابدأ تقريرًا نظيفًا» على الجهاز). */
export function clearHealthDiagnostics(): void {
  entries.clear()
}

/**
 * لقطة التشخيص لكل مقياس — تدمج الحالة المحفوظة (requested/enabled/hasData/count)
 * مع قياسات آخر استعلام. الدوال التابعة تُمرَّر لتفادي الاعتماد الدائري مع connect.ts.
 */
export function healthDiagnostics(deps: {
  requested: boolean
  isEnabled(metric: HealthMetric): boolean
  storedCount(metric: HealthMetric): number
}): HealthMetricDiagnostics[] {
  return ALL_HEALTH_METRICS.map((metric) => {
    const entry = entryFor(metric)
    const sampleCount = deps.storedCount(metric)
    return {
      metric,
      requested: deps.requested,
      enabled: deps.isEnabled(metric),
      hasData: sampleCount > 0,
      lastQueryMs: entry.lastQueryMs,
      lastStatus: entry.lastStatus,
      sampleCount,
      lastPages: entry.lastPages,
      unitUsed: entry.unitUsed ?? metricDef(metric).unit,
      source: entry.source,
    }
  })
}

/** ملخّص نصي مضغوط — سطر لكل مقياس، جاهز للنسخ من كونسول Safari على الجهاز. */
export function healthDiagnosticsSummary(rows: HealthMetricDiagnostics[]): string {
  if (!rows.length) return '(no health metrics)'
  return rows
    .map((r) => {
      const flags = `${r.requested ? 'req' : 'no-req'}/${r.enabled ? 'on' : 'off'}/${r.hasData ? 'data' : 'no-data'}`
      const ms = r.lastQueryMs === null ? '—' : `${r.lastQueryMs}ms`
      return `${r.metric} ${flags} status=${r.lastStatus} n=${r.sampleCount} pages=${r.lastPages} unit=${r.unitUsed ?? '—'} src=${r.source ?? '—'} last=${ms}`
    })
    .join('\n')
}
