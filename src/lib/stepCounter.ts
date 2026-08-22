// عدّاد الخطوات المحلي — إدخال يدوي دائم + مصدر HealthKit اختياري من غلاف iOS.
// كل القيم تهبط في المتجر نفسه لكل يوم، مع حفظ المصدر بوضوح.

import { getDayStamp } from './today'
import { safeWriteJson, type WriteResult } from '@/lib/safeStorage'
import { isNativePlatform } from '@/lib/pwa'

export const STEP_LOG_KEY = 'qimmah:steps:v1'
export const STEP_SOURCE_KEY = 'qimmah:stepSource:v1'
export const STEP_GOAL_KEY = 'qimmah:stepGoal:v1'

export const DEFAULT_STEP_GOAL = 10000
const MIN_GOAL = 1000
const MAX_GOAL = 100000
const MAX_STEPS = 200000 // سقف منطقي يمنع القيم الشاذّة

/**
 * مصدر بيانات الخطوات. HealthKit يدفع الإجماليات عبر ingestExternalSteps،
 * بينما Google Fit يبقى محجوزًا لغلاف Android مستقبلي.
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
  safeWriteJson(STEP_GOAL_KEY, clampGoal(goal))
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
  safeWriteJson(STEP_LOG_KEY, log)
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
  safeWriteJson(STEP_SOURCE_KEY, sources)
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
 * السيم (Integration Seam): نقطة دخول وحيدة ومُصنّفة بالأنواع يستدعيها الغلاف
 * الأصلي ليدفع خطوات يوم ما إلى متجر الويب.
 *
 * هذه الدالة لا تتصل بالمنصّة بنفسها؛ plugin HealthKit المحلي يقرأ بإذن المستخدم
 * ثم يمرّر الإجماليات هنا، مع بقاء الإدخال اليدوي بلا تغيير.
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

// ===== [R3-UX-STEPS] الإدخال اليدوي الصادق =====

/**
 * حدث تغيّر الخطوات — تلتقطه كل الأسطح فتعيد القراءة من المصدر الواحد.
 * كان يُطلقه `healthKit` وحده، فكانت كتابة يدوية في سطح لا تظهر في سطح آخر
 * إلا بإعادة تركيبه. الآن يُطلق من نقطة الكتابة نفسها فيسري على كل كاتب.
 */
export const STEPS_UPDATED_EVENT = 'qimmah:steps-updated'

function announceStepsChanged(): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent(STEPS_UPDATED_EVENT))
  } catch {
    // بيئة بلا CustomEvent (اختبار عقدي) — الكتابة تمّت، والإعلان زينة.
  }
}

/**
 * كيف تصل الخطوات إلى قِمّة على **هذه** المنصّة — [R3-UX-STEPS].
 *
 * ═══ لماذا هذا التمييز موجود أصلًا ═══
 * جسر `window.QimmahSteps` مسجَّل في كل بيئة (`main.tsx`)، لكن **لا أحد يدفع
 * فيه شيئًا في المتصفّح**: قراءة HealthKit تعيش في plugin أصلي لا وجود له في
 * بناء الويب. فوجود الجسر ليس دليل تتبّع تلقائي — وأي نصّ يقول «نتتبّع خطواتك»
 * في الويب يَعِد بما لا يحدث (§5).
 *
 *   • `'manual-only'` — بناء الويب: لا مصدر تلقائي إطلاقًا. ما يكتبه المستخدم
 *     هو كلّ ما نعرفه، ونقولها له صراحةً.
 *   • `'bridge-available'` — الغلاف الأصلي: الجسر **قد** يدفع مجاميع Apple
 *     Health إن ربطها المستخدم من الإعدادات. «قد» لا «سوف»: الربط قراره،
 *     وiOS لا يكشف الرفض أصلًا (انظر عقد الصدق في `healthKit.ts`).
 */
export type StepEntryMode = 'manual-only' | 'bridge-available'

export function stepEntryMode(): StepEntryMode {
  return isNativePlatform() ? 'bridge-available' : 'manual-only'
}

/** نتيجة كتابة يدوية — الرقم المحفوظ **ونتيجة التخزين** معًا. */
export interface StepWriteResult {
  /** `true` فقط حين وصلت البيانات التخزين فعلًا. */
  ok: boolean
  /** سبب الفشل حين `ok === false` — للرسالة الصادقة لا للسجلّ فقط. */
  reason: WriteResult
  /** القيمة بعد القصّ — ما سيُقرأ لاحقًا إن نجحت الكتابة. */
  steps: number
}

/**
 * كتابة يدوية **تُفصح عن فشلها** — [R3-UX-STEPS] · §5.
 *
 * `setSteps` تُرجع الرقم وحده وتبتلع نتيجة التخزين، فتستطيع واجهةٌ أن تعرض
 * «تم الحفظ» على كتابة لم تقع (حصّة ممتلئة · تخزين محجوب). هذه الدالة تُرجع
 * النتيجتين معًا فلا تملك الواجهة عذرًا لادّعاء نجاح.
 *
 * تكتب السجلّ ثم المصدر، وتُبلّغ فشل **أيّهما** — فسجلّ بلا مصدره حالة ناقصة.
 */
export function writeSteps(steps: number, date = getDayStamp(), source: StepSource = DEFAULT_SOURCE): StepWriteResult {
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
  const logResult = safeWriteJson(STEP_LOG_KEY, log)
  const sourceResult = safeWriteJson(STEP_SOURCE_KEY, sources)
  const failed = logResult !== 'ok' ? logResult : sourceResult
  if (failed === 'ok') announceStepsChanged()
  return { ok: failed === 'ok', reason: failed, steps: value }
}

/** كتابة الهدف اليومي بنفس عقد الصدق. */
export function writeStepGoal(goal: number): StepWriteResult {
  const value = clampGoal(goal)
  const result = safeWriteJson(STEP_GOAL_KEY, value)
  if (result === 'ok') announceStepsChanged()
  return { ok: result === 'ok', reason: result, steps: value }
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
