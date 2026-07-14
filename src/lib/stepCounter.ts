// عدّاد الخطوات (محلي فقط) — إدخال يدوي للخطوات اليومية + هدف يومي قابل للتعديل.
// لا مزامنة مع Apple Health / Google Fit (مؤجَّلة). كل القيم تُحفظ في localStorage لكل يوم.

import { getDayStamp } from './today'
import { enqueueSyncDelete, enqueueSyncOperation } from './syncQueue'

export const STEP_LOG_KEY = 'qimmah:steps:v1'
export const STEP_SOURCE_KEY = 'qimmah:stepSource:v1'
export const STEP_GOAL_KEY = 'qimmah:stepGoal:v1'

export const DEFAULT_STEP_GOAL = 10000
const MIN_GOAL = 1000
const MAX_GOAL = 100000
const MAX_STEPS = 200000 // سقف منطقي يمنع القيم الشاذّة

/**
 * مصدر بيانات الخطوات. حاليًا 'manual' فقط فعليًا؛ بقية القيم محجوزة لغلاف
 * iOS/Android مستقبلي يدفع البيانات عبر ingestExternalSteps (انظر السيم بالأسفل).
 */
export type StepSource = 'manual' | 'healthkit' | 'google-fit' | 'external'

const DEFAULT_SOURCE: StepSource = 'manual'
const VALID_SOURCES: readonly StepSource[] = ['manual', 'healthkit', 'google-fit', 'external']

/** يتحقّق أن المصدر ضمن القيم المعروفة وإلا يرجع 'external'. */
function normalizeSource(s: unknown): StepSource {
  return VALID_SOURCES.includes(s as StepSource) ? (s as StepSource) : 'external'
}

/** خطوات يوم واحد مع مصدرها. */
export interface DaySteps {
  date: string // YYYY-MM-DD
  steps: number
  source: StepSource
}

/** يقصّ قيمة الخطوات إلى عدد صحيح غير سالب ضمن السقف. */
function clampSteps(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v) || v <= 0) return 0
  return Math.min(MAX_STEPS, Math.round(v))
}

/** يقصّ الهدف اليومي ضمن نطاق معقول. */
export function clampGoal(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v) || v <= 0) return DEFAULT_STEP_GOAL
  return Math.min(MAX_GOAL, Math.max(MIN_GOAL, Math.round(v)))
}

// ===== الهدف اليومي =====

export function loadStepGoal(): number {
  if (typeof window === 'undefined') return DEFAULT_STEP_GOAL
  try {
    const raw = window.localStorage.getItem(STEP_GOAL_KEY)
    if (!raw) return DEFAULT_STEP_GOAL
    return clampGoal(JSON.parse(raw))
  } catch {
    return DEFAULT_STEP_GOAL
  }
}

export function saveStepGoal(goal: number): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STEP_GOAL_KEY, JSON.stringify(clampGoal(goal)))
}

// ===== سجلّ الخطوات اليومي =====

/** يقرأ خريطة الخطوات الكاملة { date: steps } بعد تنقية القيم. */
export function loadStepLog(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STEP_LOG_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, number> = {}
    for (const [date, val] of Object.entries(parsed)) {
      const steps = clampSteps(val)
      if (steps > 0) out[date] = steps
    }
    return out
  } catch {
    return {}
  }
}

function persist(log: Record<string, number>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STEP_LOG_KEY, JSON.stringify(log))
}

/** يقرأ خريطة مصادر الخطوات { date: source }. */
function loadSourceLog(): Record<string, StepSource> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STEP_SOURCE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, StepSource> = {}
    for (const [date, val] of Object.entries(parsed)) out[date] = normalizeSource(val)
    return out
  } catch {
    return {}
  }
}

function persistSources(sources: Record<string, StepSource>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STEP_SOURCE_KEY, JSON.stringify(sources))
}

/** خطوات يوم محدّد (افتراضيًا اليوم). */
export function getSteps(date = getDayStamp()): number {
  return loadStepLog()[date] ?? 0
}

/** مصدر خطوات يوم محدّد (افتراضيًا اليوم) — 'manual' إن لم يُسجَّل. */
export function getStepSource(date = getDayStamp()): StepSource {
  return loadSourceLog()[date] ?? DEFAULT_SOURCE
}

/**
 * يضبط خطوات يوم محدّد إلى قيمة مطلقة ويُعيد القيمة المحفوظة.
 * المصدر افتراضيًا 'manual' (الإدخال اليدوي). الغلاف الأصلي يمرّر مصدره عبر ingestExternalSteps.
 */
export function setSteps(steps: number, date = getDayStamp(), source: StepSource = DEFAULT_SOURCE): number {
  const log = loadStepLog()
  const sources = loadSourceLog()
  const value = clampSteps(steps)
  if (value <= 0) {
    delete log[date]
    delete sources[date]
  } else {
    log[date] = value
    sources[date] = normalizeSource(source)
  }
  persist(log)
  persistSources(sources)
  return value
}

/** Full confirmed restore: replace all day rows and emit owner-guarded sync ops. */
export function replaceStepLog(days: readonly DaySteps[]): void {
  const before = loadStepLog()
  const log: Record<string, number> = {}
  const sources: Record<string, StepSource> = {}
  days.slice(0, 5000).forEach((day) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date)) return
    const steps = clampSteps(day.steps)
    if (steps <= 0) return
    log[day.date] = steps
    sources[day.date] = normalizeSource(day.source)
  })
  persist(log)
  persistSources(sources)
  Object.keys(before).filter((date) => !(date in log)).forEach((date) => enqueueSyncDelete('step_logs', date))
  Object.entries(log).forEach(([date, steps]) => enqueueSyncOperation('step_logs', date, { date, steps, source: sources[date] }))
}

/** يضيف (أو يطرح) خطوات ليوم محدّد ويُعيد المجموع الجديد (يبقى الإدخال يدويًا). */
export function addSteps(delta: number, date = getDayStamp()): number {
  return setSteps(getSteps(date) + delta, date)
}

/**
 * حمولة الخطوات القادمة من مصدر خارجي (غلاف iOS/Android مستقبلي).
 * هذا هو العقد الوحيد الذي يجب أن يستدعيه الغلاف الأصلي.
 */
export interface ExternalStepPayload {
  /** ختم اليوم YYYY-MM-DD؛ افتراضيًا اليوم الحالي. */
  date?: string
  /** إجمالي خطوات اليوم (قيمة مطلقة، لا فرق تراكمي). */
  steps: number
  /** من أرسل البيانات: healthkit / google-fit / external. */
  source: StepSource
}

/**
 * السيم (Integration Seam): نقطة دخول وحيدة ومُصنّفة بالأنواع يستدعيها غلاف أصلي
 * مستقبلي (مثلًا تطبيق آيفون يقرأ Apple Health) ليدفع خطوات يوم ما داخل الويب.
 *
 * ⚠️ لا تتصل هذه الدالة بأي واجهة HealthKit / Google Fit — هذا مستحيل في تطبيق ويب.
 * هي فقط تخزّن القيمة المُمرّرة محليًا (نفس مخزن الإدخال اليدوي) مع تسجيل مصدرها،
 * بحيث يكفي الغلاف الأصلي أن يستدعيها دون لمس منطق التخزين.
 *
 * @returns حالة اليوم بعد الحفظ (الخطوات + المصدر).
 */
export function ingestExternalSteps(payload: ExternalStepPayload): DaySteps {
  const date = payload.date || getDayStamp()
  const source = normalizeSource(payload.source)
  const steps = setSteps(payload.steps, date, source)
  return { date, steps, source: steps > 0 ? source : DEFAULT_SOURCE }
}

/**
 * جسر الخطوات المكشوف للغلاف الأصلي. يقرأ غلاف iOS/Android خطوات اليوم من
 * المنصّة الأصلية ثم يستدعي window.QimmahSteps.ingest({...}) لدفعها للويب.
 */
export interface QimmahStepBridge {
  /** نسخة العقد — تتيح للغلاف التحقّق من التوافق قبل الدفع. */
  readonly version: 1
  /** السيم الوحيد لدفع الخطوات (انظر ingestExternalSteps). */
  ingest(payload: ExternalStepPayload): DaySteps
}

declare global {
  interface Window {
    QimmahSteps?: QimmahStepBridge
  }
}

/**
 * يسجّل جسر الخطوات على window ليتمكّن غلاف أصلي مستقبلي من دفع البيانات.
 * تُستدعى مرّة واحدة عند الإقلاع. آمنة على الخادم (no-op بلا window).
 */
export function registerStepBridge(): void {
  if (typeof window === 'undefined') return
  window.QimmahSteps = {
    version: 1,
    ingest: ingestExternalSteps,
  }
}

/** آخر ٧ أيام (الأقدم → الأحدث) للرسم المصغّر؛ الأيام بلا تسجيل = 0. */
export function weeklySteps(now = new Date()): DaySteps[] {
  const log = loadStepLog()
  const sources = loadSourceLog()
  const out: DaySteps[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const date = getDayStamp(d)
    out.push({ date, steps: log[date] ?? 0, source: sources[date] ?? DEFAULT_SOURCE })
  }
  return out
}
