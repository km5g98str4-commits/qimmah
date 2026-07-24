// طبقة الاتصال الصحي المجمّع (P9) — الواجهة الوحيدة بين قِمّة وجسر HealthKit الواسع.
//
// قرار المالك (موثّق في docs/data/HEALTHKIT-FOUNDATION.md):
//   • طلب تفويض واحد مجمّع لكل المقاييس — يُستدعى فقط من فعل مستخدم صريح بعد
//     «شاشة الفائدة» (الشاشة نفسها عقد Codex — هذه الوحدة توفّر الـ API فقط).
//   • لا يُطلب التفويض عند الإقلاع أبدًا: هذه الوحدة لا تنفّذ شيئًا عند الاستيراد،
//     وrequestAllHealthAccess هي الدالة الوحيدة المسموح لها بفتح ورقة التفويض.
//
// عقد الصدق (HONESTY):
//   • iOS لا يكشف أبدًا ما إذا رفض المستخدم قراءة نوع ما — النتيجة الفارغة تعني
//     «لا بيانات أو مرفوض» (unknown-or-denied). ممنوع منعًا باتًا إظهار «مرفوض».
//   • الإدخال اليدوي يبقى متاحًا لكل مقياس بغضّ النظر عن حالة الاتصال.
//   • فصل مقياس = تطهير كل عيّناته المستوردة (متجر العيّنات) دون لمس أي إدخال يدوي.
//   • خصوصية: لا قيمة صحية تمرّ إلى track() إطلاقًا (حارس grep في البرهان).

import { Capacitor, registerPlugin } from '@capacitor/core'
import { ALL_HEALTH_METRICS, metricDef, resolveMetric, type HealthMetric, type LegacyHealthMetric } from './metrics'
import {
  normalizeQuantity,
  normalizeSleep,
  normalizeWorkout,
  type RawQuantitySample,
  type RawSleepSample,
  type RawWorkoutSample,
} from './normalize'
import { anchorFor, ingestSamples, purgeMetricSamples, samplesFor, saveAnchor } from './store'

// ── عقد الجسر السويفت (HealthKitStepsPlugin.swift) ─────────────────────────

/** حالة صفحة عيّنات من الجسر — error = فشل استعلام عابر، ليس رفضًا أبدًا. */
export type SamplePageStatus = 'ok' | 'unavailable' | 'error'

interface SamplePage<T> {
  status: SamplePageStatus
  samples: T[]
  /** مرساة الصفحة التالية (base64) — تُحفظ لكل مقياس للاستعلام التزايدي. */
  anchor?: string
  hasMore?: boolean
}

/** جزء الجسر الذي تستهلكه هذه الطبقة (نفس البرنامج المساعد الأصلي HealthKitSteps). */
export interface HealthReadBridge {
  isAvailable(): Promise<{ available: boolean }>
  /** المقاييس التي يحلّها هذا الجهاز/النظام فعلًا (حراسة أنواع iOS 16). */
  supportedMetrics(): Promise<{ available: boolean; metrics: string[] }>
  requestAuthorization(options?: { metrics?: string[] }): Promise<{ permission: string }>
  getQuantitySamples(options: { metric: string; days?: number; limit?: number; anchor?: string }): Promise<SamplePage<RawQuantitySample>>
  getSleepSamples(options: { days?: number; limit?: number; anchor?: string }): Promise<SamplePage<RawSleepSample>>
  getWorkouts(options: { days?: number; limit?: number }): Promise<SamplePage<RawWorkoutSample>>
}

const HealthBridge = registerPlugin<HealthReadBridge>('HealthKitSteps')

export function isHealthReadPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}

// ── حالة الاتصال المحفوظة ───────────────────────────────────────────────────

export const HEALTH_CONNECTION_KEY = 'qimmah:health:connection:v1'

/** نافذة التاريخ المحدودة الافتراضية (أيام) — لا نقرأ أعمق من حاجة العرض. */
export const DEFAULT_HISTORY_DAYS = 90

/** سقف صفحات الاستعلام الواحد — يمنع أي حلقة جلب جامحة. */
const MAX_PAGES_PER_SYNC = 8

/**
 * حالة بيانات المقياس — الصادقة الوحيدة المسموح عرضها:
 *   • not-connected: المستخدم لم يفعّل المقياس (أو فصله).
 *   • has-data: وصلتنا عيّنات فعلية.
 *   • unknown-or-denied: مفعّل بلا عيّنات — «لا بيانات أو مرفوض»، لا نعرف ولا ندّعي.
 * لا توجد حالة 'denied' هنا عمدًا — iOS يخفي رفض القراءة ولن نختلقه.
 */
export type MetricDataState = 'not-connected' | 'has-data' | 'unknown-or-denied'

interface ConnectionEnvelope {
  version: 1
  /** اكتمل تدفّق الطلب المجمّع الواحد على هذا الجهاز. */
  requested: boolean
  requestedAt: string | null
  /** المقاييس التي مُرّرت فعلًا في الطلب (بعد ترشيح توفّر الجهاز). */
  requestedMetrics: HealthMetric[]
  enabled: Partial<Record<HealthMetric, boolean>>
  lastSync: Partial<Record<HealthMetric, string>>
}

const EMPTY_ENVELOPE: ConnectionEnvelope = {
  version: 1,
  requested: false,
  requestedAt: null,
  requestedMetrics: [],
  enabled: {},
  lastSync: {},
}

function readConnection(): ConnectionEnvelope {
  if (typeof window === 'undefined') return { ...EMPTY_ENVELOPE, requestedMetrics: [], enabled: {}, lastSync: {} }
  try {
    const raw = window.localStorage.getItem(HEALTH_CONNECTION_KEY)
    if (!raw) return { ...EMPTY_ENVELOPE, requestedMetrics: [], enabled: {}, lastSync: {} }
    const parsed = JSON.parse(raw) as Partial<ConnectionEnvelope>
    return {
      version: 1,
      requested: parsed.requested === true,
      requestedAt: typeof parsed.requestedAt === 'string' ? parsed.requestedAt : null,
      requestedMetrics: Array.isArray(parsed.requestedMetrics) ? (parsed.requestedMetrics as HealthMetric[]) : [],
      enabled: parsed.enabled && typeof parsed.enabled === 'object' ? parsed.enabled : {},
      lastSync: parsed.lastSync && typeof parsed.lastSync === 'object' ? parsed.lastSync : {},
    }
  } catch {
    return { ...EMPTY_ENVELOPE, requestedMetrics: [], enabled: {}, lastSync: {} }
  }
}

function writeConnection(envelope: ConnectionEnvelope): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HEALTH_CONNECTION_KEY, JSON.stringify(envelope))
  } catch {
    /* تخزين ممتلئ — الحالة تُعاد قراءتها من HealthKit في المزامنة التالية */
  }
}

// ── الطلب المجمّع الواحد (فعل مستخدم صريح فقط — أبدًا عند الإقلاع) ───────────

export interface AggregatedRequestResult {
  /** completed = ورقة التفويض عُرضت واكتمل التدفّق (لا يعني «مُنح» — iOS يخفي ذلك). */
  status: 'completed' | 'unavailable' | 'error'
  /** المقاييس التي شملها الطلب بعد ترشيح توفّر الجهاز/النظام. */
  metrics: HealthMetric[]
}

/**
 * الطلب المجمّع الواحد: يُستدعى مرة واحدة من شاشة الفائدة (عقد Codex) — يمرّر كل
 * المقاييس المدعومة على هذا الجهاز في نداء requestAuthorization واحد فيعرض iOS
 * ورقة صحة واحدة. لا يُستدعى عند الإقلاع أبدًا.
 */
export async function requestAllHealthAccess(
  bridge: HealthReadBridge = HealthBridge,
  nativeHealth = isHealthReadPlatform(),
): Promise<AggregatedRequestResult> {
  if (!nativeHealth) return { status: 'unavailable', metrics: [] }
  try {
    const capability = await bridge.isAvailable()
    if (!capability.available) return { status: 'unavailable', metrics: [] }

    // ترشيح التوفّر: أنواع iOS 16 (حرارة المعصم، تعافي النبض) تسقط تلقائيًا على أنظمة أقدم.
    const supported = await bridge.supportedMetrics()
    const supportedSet = new Set(supported.metrics)
    const metrics = ALL_HEALTH_METRICS.filter((metric) => supportedSet.has(metric))
    if (!metrics.length) return { status: 'unavailable', metrics: [] }

    await bridge.requestAuthorization({ metrics: [...metrics] })

    const envelope = readConnection()
    envelope.requested = true
    envelope.requestedAt = new Date().toISOString()
    envelope.requestedMetrics = metrics
    for (const metric of metrics) envelope.enabled[metric] = true
    writeConnection(envelope)
    return { status: 'completed', metrics }
  } catch {
    // فشل التدفّق نفسه (وليس رفض المستخدم — ذاك لا يصلنا أصلًا).
    return { status: 'error', metrics: [] }
  }
}

/** هل اكتمل تدفّق الطلب المجمّع على هذا الجهاز؟ (لعقد شاشة الإعدادات). */
export function hasRequestedHealthAccess(): boolean {
  return readConnection().requested
}

// ── المزامنة (قراءة فقط — لا تطلب التفويض أبدًا) ────────────────────────────

export interface MetricSyncResult {
  metric: HealthMetric
  /** ok = اكتمل الاستعلام (وقد يكون فارغًا) · unavailable/error صادقتان كما هما. */
  status: SamplePageStatus
  /** عدد العيّنات المطبَّعة المستوردة في هذه المزامنة (بعد إزالة التكرار قد يقل المخزون عنها). */
  imported: number
  /** حجم مخزون المقياس بعد الدمج. */
  stored: number
  dataState: MetricDataState
}

function recordSync(metric: HealthMetric): void {
  const envelope = readConnection()
  envelope.lastSync[metric] = new Date().toISOString()
  writeConnection(envelope)
}

/**
 * يزامن مقياسًا واحدًا: استعلام مرسّى/مقسّم صفحات ضمن نافذة التاريخ المحدودة،
 * تطبيع، إزالة تكرار، ثم حفظ المرساة. لا يستدعي requestAuthorization أبدًا.
 */
export async function syncMetric(
  metric: HealthMetric | LegacyHealthMetric,
  bridge: HealthReadBridge = HealthBridge,
  nativeHealth = isHealthReadPlatform(),
  days = DEFAULT_HISTORY_DAYS,
): Promise<MetricSyncResult> {
  const id = resolveMetric(metric)
  if (!nativeHealth) return { metric: id, status: 'unavailable', imported: 0, stored: samplesFor(id).length, dataState: metricDataState(id) }

  const def = metricDef(id)
  let imported = 0
  let stored = samplesFor(id).length
  let status: SamplePageStatus = 'ok'

  try {
    if (def.kind === 'workout') {
      const page = await bridge.getWorkouts({ days })
      status = page.status
      if (page.status === 'ok') {
        const normalized = page.samples.map(normalizeWorkout).filter((sample) => sample !== null)
        imported = normalized.length
        stored = ingestSamples(id, normalized)
      }
    } else {
      // كمّي أو نوم: نفس عقد المرساة/الصفحات.
      let anchor = anchorFor(id) ?? undefined
      for (let pageIndex = 0; pageIndex < MAX_PAGES_PER_SYNC; pageIndex += 1) {
        const page = def.kind === 'category'
          ? await bridge.getSleepSamples({ days, anchor })
          : await bridge.getQuantitySamples({ metric: id, days, anchor })
        status = page.status
        if (page.status !== 'ok') break
        const normalized = def.kind === 'category'
          ? (page.samples as RawSleepSample[]).map(normalizeSleep).filter((sample) => sample !== null)
          : (page.samples as RawQuantitySample[]).map((raw) => normalizeQuantity(id, raw)).filter((sample) => sample !== null)
        imported += normalized.length
        stored = ingestSamples(id, normalized)
        if (page.anchor) {
          anchor = page.anchor
          saveAnchor(id, page.anchor)
        }
        if (!page.hasMore) break
      }
    }
  } catch {
    status = 'error'
  }

  if (status === 'ok') recordSync(id)
  return { metric: id, status, imported, stored, dataState: metricDataState(id) }
}

/**
 * تحديث كل المقاييس المفعّلة (بعد اكتمال الطلب المجمّع). قراءة صرفة —
 * لا يفتح ورقة تفويض أبدًا، فهو آمن للاستدعاء من شاشة الإعدادات أو عند العودة.
 */
export async function syncAllEnabled(
  bridge: HealthReadBridge = HealthBridge,
  nativeHealth = isHealthReadPlatform(),
  days = DEFAULT_HISTORY_DAYS,
): Promise<MetricSyncResult[]> {
  const envelope = readConnection()
  const enabled = ALL_HEALTH_METRICS.filter((metric) => envelope.enabled[metric] === true)
  const results: MetricSyncResult[] = []
  for (const metric of enabled) {
    results.push(await syncMetric(metric, bridge, nativeHealth, days))
  }
  return results
}

// ── الحالة الصادقة + الفصل لكل مقياس ────────────────────────────────────────

/** الحالة الصادقة للمقياس — لا تُرجع 'denied' أبدًا (انظر MetricDataState). */
export function metricDataState(metric: HealthMetric | LegacyHealthMetric): MetricDataState {
  const id = resolveMetric(metric)
  if (readConnection().enabled[id] !== true) return 'not-connected'
  return samplesFor(id).length > 0 ? 'has-data' : 'unknown-or-denied'
}

/**
 * فصل مقياس واحد: يطهّر كل عيّناته المستوردة ومرساته (نمط التطهير الموسوم
 * بالمصدر) ويطفئ علمه. الإدخالات اليدوية في متاجرها الأصلية لا تُمسّ إطلاقًا.
 */
export function disconnectMetric(metric: HealthMetric | LegacyHealthMetric): void {
  const id = resolveMetric(metric)
  purgeMetricSamples(id)
  const envelope = readConnection()
  envelope.enabled[id] = false
  delete envelope.lastSync[id]
  writeConnection(envelope)
}

/** إعادة تفعيل مقياس سبق فصله (بعد اكتمال الطلب المجمّع — لا ورقة جديدة). */
export function reconnectMetric(metric: HealthMetric | LegacyHealthMetric): void {
  const id = resolveMetric(metric)
  const envelope = readConnection()
  if (!envelope.requested) return // لا تفعيل قبل تدفّق الطلب الصريح
  envelope.enabled[id] = true
  writeConnection(envelope)
}

// ── عقد شاشة الإعدادات (Codex) ──────────────────────────────────────────────

export interface MetricConnectionRow {
  metric: HealthMetric
  nameAr: string
  nameEn: string
  enabled: boolean
  dataState: MetricDataState
  lastSync: string | null
  storedSamples: number
}

/** لقطة لكل المقاييس — تغذّي صفوف شاشة الإعدادات مباشرة (عقد Codex). */
export function healthConnectionSummary(): MetricConnectionRow[] {
  const envelope = readConnection()
  return ALL_HEALTH_METRICS.map((metric) => {
    const def = metricDef(metric)
    return {
      metric,
      nameAr: def.name.ar,
      nameEn: def.name.en,
      enabled: envelope.enabled[metric] === true,
      dataState: metricDataState(metric),
      lastSync: envelope.lastSync[metric] ?? null,
      storedSamples: samplesFor(metric).length,
    }
  })
}
