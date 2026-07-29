import { Capacitor, registerPlugin } from '@capacitor/core'
import { ingestExternalSteps, type DaySteps } from './stepCounter'
import { importHealthWeight, removeHealthWeight, latestWeightImport } from './measurementLog'
import { safeWriteJson } from '@/lib/safeStorage'

/**
 * حالة صلاحية جسر الصحة القديم (خطوات/وزن/نبض).
 *
 * P14 — عقد الصدق: **iOS لا يكشف أبدًا رفض قراءة نوع صحي**؛ `requestAuthorization`
 * ينجح حتى لو رفض المستخدم كل شيء، والاستعلام المرفوض يعود فارغًا لا خاطئًا. لذلك:
 *   • 'authorized'    = تدفّق الطلب اكتمل (لا يعني «مُنح»).
 *   • 'unknown'       = تعذّر تشغيل التدفّق/الاستعلام — «ما وصلنا شيء ولا نعرف السبب».
 *   • 'unavailable'   = HealthKit غير متاح على هذا الجهاز (iPad/غير مدعوم).
 *   • 'denied'        = **مهجورة (deprecated)، لا ينتجها الجسر ولا هذه الوحدة بعد P14.**
 *                        باقية في الاتحاد فقط للتوافق مع حالات مخزّنة قديمة.
 * الصياغة المعروضة لا تدّعي الرفض أبدًا (انظر data/nativeSettings.ts).
 */
export type HealthKitPermission = 'not-determined' | 'authorized' | 'unknown' | 'denied' | 'unavailable'

/** هل هذه الحالة تعني «ما وصلتنا بيانات ولا نعرف السبب»؟ (لا تدّعي رفضًا). */
export function isUnknownHealthPermission(permission: HealthKitPermission): boolean {
  return permission === 'unknown' || permission === 'denied' || permission === 'not-determined'
}

/** The metrics Qimmah can read, each gated by its own point-of-use consent (standard F6/F7). */
export type HealthMetric = 'steps' | 'weight' | 'heartRate'

export interface HealthKitDailyTotal {
  date: string
  steps: number
}

export interface HealthPointSample {
  /** kg for weight, bpm for heart rate. */
  value: number
  /** ISO timestamp of the sample. */
  date: string
}

interface HealthKitStepsPlugin {
  isAvailable(): Promise<{ available: boolean }>
  requestAuthorization(options?: { metrics?: HealthMetric[] }): Promise<{ permission: HealthKitPermission }>
  getDailySteps(options: { days: number }): Promise<{ permission: HealthKitPermission; days: HealthKitDailyTotal[] }>
  getLatestBodyMass(): Promise<{ permission: HealthKitPermission; sample: { kg: number; date: string } | null }>
  getLatestHeartRate(): Promise<{ permission: HealthKitPermission; sample: { bpm: number; date: string } | null }>
}

export interface HealthKitSyncResult {
  permission: HealthKitPermission
  days: DaySteps[]
  today: number
}

/** Per-metric connection result surfaced to the settings screen (68). */
export interface HealthMetricResult {
  permission: HealthKitPermission
  /** ISO timestamp of the freshest value we ingested, or null when nothing was available. */
  lastUpdate: string | null
  /** Live point value for display (weight kg / heart-rate bpm). null when unavailable. */
  sample: HealthPointSample | null
}

export const HEALTHKIT_PREF_KEY = 'qimmah:healthkit:v1'
const HealthKitSteps = registerPlugin<HealthKitStepsPlugin>('HealthKitSteps')

export function isHealthKitPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}

// ── Persisted per-metric state ────────────────────────────────────────────
// Shape stays backward-compatible: legacy `{ enabled, permission }` = steps.

interface MetricState {
  enabled: boolean
  permission: HealthKitPermission
  lastUpdate: string | null
}

interface HealthState {
  /** Legacy steps flag, kept so older readers (startup refresh) still work. */
  enabled: boolean
  permission: HealthKitPermission
  metrics: Partial<Record<HealthMetric, MetricState>>
}

function readState(): HealthState {
  const empty: HealthState = { enabled: false, permission: 'not-determined', metrics: {} }
  if (typeof window === 'undefined') return empty
  try {
    const raw = JSON.parse(window.localStorage.getItem(HEALTHKIT_PREF_KEY) ?? '{}')
    return {
      enabled: raw.enabled === true,
      permission: raw.permission ?? 'not-determined',
      metrics: raw.metrics ?? {},
    }
  } catch {
    return empty
  }
}

function writeState(state: HealthState): void {
  safeWriteJson(HEALTHKIT_PREF_KEY, state)
}

function saveMetric(metric: HealthMetric, patch: MetricState): void {
  const state = readState()
  state.metrics = { ...state.metrics, [metric]: patch }
  if (metric === 'steps') {
    // Mirror into the legacy top-level fields the startup refresh path reads.
    state.enabled = patch.enabled
    state.permission = patch.permission
  }
  writeState(state)
}

export function metricState(metric: HealthMetric): MetricState {
  const stored = readState().metrics[metric]
  if (stored) return stored
  if (metric === 'steps') {
    // Fall back to legacy flags for users connected before per-metric state existed.
    const legacy = readState()
    return { enabled: legacy.enabled, permission: legacy.permission, lastUpdate: null }
  }
  return { enabled: false, permission: 'not-determined', lastUpdate: null }
}

export function isHealthKitEnabled(): boolean {
  return metricState('steps').enabled
}

export function isMetricConnected(metric: HealthMetric): boolean {
  return metricState(metric).enabled
}

function ingestDays(days: HealthKitDailyTotal[]): DaySteps[] {
  const ingested = days.map((day) => ingestExternalSteps({ date: day.date, steps: day.steps, source: 'healthkit' }))
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('qimmah:steps-updated'))
  return ingested
}

async function ensureAvailable(plugin: HealthKitStepsPlugin, nativeHealthKit: boolean): Promise<boolean> {
  if (!nativeHealthKit) return false
  const capability = await plugin.isAvailable()
  return capability.available
}

// ── Steps ───────────────────────────────────────────────────────────────

/** Explicit settings action: the only function allowed to request the steps scope. */
export async function connectHealthKit(
  plugin: HealthKitStepsPlugin = HealthKitSteps,
  nativeHealthKit = isHealthKitPlatform(),
): Promise<HealthKitSyncResult> {
  if (!(await ensureAvailable(plugin, nativeHealthKit))) {
    saveMetric('steps', { enabled: false, permission: 'unavailable', lastUpdate: null })
    return { permission: 'unavailable', days: [], today: 0 }
  }

  const authorization = await plugin.requestAuthorization({ metrics: ['steps'] })
  if (authorization.permission !== 'authorized') {
    saveMetric('steps', { enabled: false, permission: authorization.permission, lastUpdate: null })
    return { permission: authorization.permission, days: [], today: 0 }
  }

  const result = await plugin.getDailySteps({ days: 14 })
  if (result.permission !== 'authorized') {
    saveMetric('steps', { enabled: false, permission: result.permission, lastUpdate: null })
    return { permission: result.permission, days: [], today: 0 }
  }
  const days = ingestDays(result.days)
  saveMetric('steps', { enabled: true, permission: 'authorized', lastUpdate: new Date().toISOString() })
  return { permission: 'authorized', days, today: days.at(-1)?.steps ?? 0 }
}

/** Startup refresh after prior opt-in. It never calls requestAuthorization. */
export async function refreshHealthKitStepsIfEnabled(
  plugin: HealthKitStepsPlugin = HealthKitSteps,
  nativeHealthKit = isHealthKitPlatform(),
): Promise<HealthKitSyncResult | null> {
  if (!nativeHealthKit || !isHealthKitEnabled()) return null
  try {
    const result = await plugin.getDailySteps({ days: 14 })
    if (result.permission !== 'authorized') {
      saveMetric('steps', { enabled: false, permission: result.permission, lastUpdate: null })
      return { permission: result.permission, days: [], today: 0 }
    }
    const days = ingestDays(result.days)
    saveMetric('steps', { enabled: true, permission: 'authorized', lastUpdate: new Date().toISOString() })
    return { permission: 'authorized', days, today: days.at(-1)?.steps ?? 0 }
  } catch {
    // بريدج غير متاح/استعلام فشل — ليس رفضًا (iOS لا يخبرنا بالرفض إطلاقًا).
    return { permission: 'unknown', days: [], today: 0 }
  }
}

/** Forget the steps opt-in. Imported step totals stay (they blend with manual entry by design). */
export function disconnectSteps(): void {
  saveMetric('steps', { enabled: false, permission: 'not-determined', lastUpdate: null })
}

// ── Weight (bodyMass) — optional, default manual ──────────────────────────

/** Point-of-use action: request the weight scope, import the latest sample, label it 'health'. */
export async function connectHealthWeight(
  plugin: HealthKitStepsPlugin = HealthKitSteps,
  nativeHealthKit = isHealthKitPlatform(),
): Promise<HealthMetricResult> {
  if (!(await ensureAvailable(plugin, nativeHealthKit))) {
    saveMetric('weight', { enabled: false, permission: 'unavailable', lastUpdate: null })
    return { permission: 'unavailable', lastUpdate: null, sample: null }
  }
  const authorization = await plugin.requestAuthorization({ metrics: ['weight'] })
  if (authorization.permission !== 'authorized') {
    saveMetric('weight', { enabled: false, permission: authorization.permission, lastUpdate: null })
    return { permission: authorization.permission, lastUpdate: null, sample: null }
  }
  const result = await plugin.getLatestBodyMass()
  if (result.permission !== 'authorized' || !result.sample) {
    // Connected but no reading available — honest empty, no invented weight.
    saveMetric('weight', { enabled: result.permission === 'authorized', permission: result.permission, lastUpdate: null })
    return { permission: result.permission, lastUpdate: null, sample: null }
  }
  importHealthWeight(result.sample.kg, result.sample.date)
  saveMetric('weight', { enabled: true, permission: 'authorized', lastUpdate: result.sample.date })
  return { permission: 'authorized', lastUpdate: result.sample.date, sample: { value: result.sample.kg, date: result.sample.date } }
}

/** Disconnect weight import and remove the Health-sourced logs. Manual entries stay untouched. */
export function disconnectHealthWeight(): void {
  removeHealthWeight()
  saveMetric('weight', { enabled: false, permission: 'not-determined', lastUpdate: null })
}

/** Most recent Health-imported weight, for the settings row. null when none imported. */
export function importedWeightSummary(): HealthPointSample | null {
  const log = latestWeightImport()
  if (!log) return null
  const kg = Number(String(log.values.weightKg ?? '').match(/-?[\d.]+/)?.[0])
  if (!Number.isFinite(kg)) return null
  return { value: kg, date: log.date }
}

// ── Heart rate — display-only, never fabricated ───────────────────────────

/**
 * Read the latest heart-rate sample. Returns a sample only when a paired device has
 * actually written one; otherwise `sample: null` → the UI shows "unavailable" with no
 * number (standard honesty rule, screens 35/78). Never persisted.
 */
export async function readHeartRate(
  plugin: HealthKitStepsPlugin = HealthKitSteps,
  nativeHealthKit = isHealthKitPlatform(),
): Promise<HealthMetricResult> {
  if (!(await ensureAvailable(plugin, nativeHealthKit))) {
    saveMetric('heartRate', { enabled: false, permission: 'unavailable', lastUpdate: null })
    return { permission: 'unavailable', lastUpdate: null, sample: null }
  }
  const authorization = await plugin.requestAuthorization({ metrics: ['heartRate'] })
  if (authorization.permission !== 'authorized') {
    saveMetric('heartRate', { enabled: false, permission: authorization.permission, lastUpdate: null })
    return { permission: authorization.permission, lastUpdate: null, sample: null }
  }
  const result = await plugin.getLatestHeartRate()
  if (result.permission !== 'authorized' || !result.sample) {
    // Authorized but no paired-device data — "unavailable", not a made-up bpm.
    saveMetric('heartRate', { enabled: result.permission === 'authorized', permission: result.permission, lastUpdate: null })
    return { permission: result.permission, lastUpdate: null, sample: null }
  }
  saveMetric('heartRate', { enabled: true, permission: 'authorized', lastUpdate: result.sample.date })
  return {
    permission: 'authorized',
    lastUpdate: result.sample.date,
    sample: { value: Math.round(result.sample.bpm), date: result.sample.date },
  }
}

export function disconnectHeartRate(): void {
  saveMetric('heartRate', { enabled: false, permission: 'not-determined', lastUpdate: null })
}
