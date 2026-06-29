// عدّاد الخطوات (محلي فقط) — إدخال يدوي للخطوات اليومية + هدف يومي قابل للتعديل.
// لا مزامنة مع Apple Health / Google Fit (مؤجَّلة). كل القيم تُحفظ في localStorage لكل يوم.

import { getDayStamp } from './today'

export const STEP_LOG_KEY = 'qimmah:steps:v1'
export const STEP_GOAL_KEY = 'qimmah:stepGoal:v1'

export const DEFAULT_STEP_GOAL = 10000
const MIN_GOAL = 1000
const MAX_GOAL = 100000
const MAX_STEPS = 200000 // سقف منطقي يمنع القيم الشاذّة

/** خطوات يوم واحد. */
export interface DaySteps {
  date: string // YYYY-MM-DD
  steps: number
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

/** خطوات يوم محدّد (افتراضيًا اليوم). */
export function getSteps(date = getDayStamp()): number {
  return loadStepLog()[date] ?? 0
}

/** يضبط خطوات يوم محدّد إلى قيمة مطلقة (افتراضيًا اليوم) ويُعيد القيمة المحفوظة. */
export function setSteps(steps: number, date = getDayStamp()): number {
  const log = loadStepLog()
  const value = clampSteps(steps)
  if (value <= 0) delete log[date]
  else log[date] = value
  persist(log)
  return value
}

/** يضيف (أو يطرح) خطوات ليوم محدّد ويُعيد المجموع الجديد. */
export function addSteps(delta: number, date = getDayStamp()): number {
  return setSteps(getSteps(date) + delta, date)
}

/** آخر ٧ أيام (الأقدم → الأحدث) للرسم المصغّر؛ الأيام بلا تسجيل = 0. */
export function weeklySteps(now = new Date()): DaySteps[] {
  const log = loadStepLog()
  const out: DaySteps[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const date = getDayStamp(d)
    out.push({ date, steps: log[date] ?? 0 })
  }
  return out
}
