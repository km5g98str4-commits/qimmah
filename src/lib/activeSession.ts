// حفظ التمرين النشط (v1) — لقطة قابلة للاستئناف بعد إغلاق التطبيق/قتله.
//
// المبدأ: وضع التمرين (WorkoutMode) يحتفظ بحالته في ذاكرة React فقط، فقتل التطبيق
// وسط التمرين يضيّع الجولات المُدخلة. هذه الوحدة تسلسل الحالة إلى localStorage
// بمفتاح مربوط بالحساب (owner-scoped) على كل تغيير، وتتحقّق منها بصرامة عند
// الإقلاع فتُعرض «استئناف» للقطة الطازجة (< 12 ساعة) فقط.
//
// مؤقّت الراحة يُخزَّن كطابعين زمنيين (endsAt/durationSec) لا كعدّاد متناقص، حتى
// يبقى صحيحًا بعد رجوع التطبيق من الخلفية (تُجمّد مؤقتات JS على iOS في الخلفية).

import type { PlanDay } from '@/types/workout'
import type { Difficulty, SetLog } from '@/lib/workoutSessions'

/** حالة تمرين واحد داخل الجلسة — مطابقة بنيويًا لـ ExState في WorkoutMode. */
export interface ActiveExerciseState {
  sets: SetLog[]
  difficulty?: Difficulty
  rpe?: number
  painNote: string
  notes: string
}

/** مؤقّت الراحة كطابعين زمنيين (مقاوم لتجميد الخلفية). */
export interface RestSnapshot {
  /** لحظة انتهاء الراحة (epoch ms). */
  endsAt: number
  /** مدّة الراحة الأصلية بالثواني (للعرض فقط). */
  durationSec: number
}

/** لقطة كاملة لجلسة تمرين نشطة، قابلة للتسلسل. */
export interface ActiveSessionSnapshot {
  version: 1
  /** لحظة آخر حفظ (epoch ms) — تُستخدم لفحص الطزاجة. */
  savedAt: number
  /** بدء الجلسة (ISO) — يبذر معرّف الجلسة فتبقى الجلسة المُستأنَفة idempotent. */
  startedAt: string
  /** لقطة اليوم كاملة (الخطة قد تتغيّر غدًا أو بعد إعادة توليد). */
  day: PlanDay
  current: number
  state: Record<string, ActiveExerciseState>
  swap: Record<string, string>
  altSlots: Record<string, [string, string]>
  rest: RestSnapshot | null
}

export const ACTIVE_SESSION_KEY_BASE = 'qimmah:activeSession:v1'

/** أقصى عمر للقطة قابلة للاستئناف: ١٢ ساعة. */
export const ACTIVE_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000

/** مفتاح تخزين مربوط بالحساب (ضيف لغير المسجّل) — يمنع اختلاط الجلسات بين حسابين. */
export function activeSessionKey(ownerId: string | null | undefined): string {
  return `${ACTIVE_SESSION_KEY_BASE}:${ownerId ?? 'guest'}`
}

// ————————————————————— حساب مؤقّت الراحة (خالص، قابل للاختبار) —————————————————————

/** الثواني المتبقية للراحة محسوبةً من الطابع الزمني (لا من عدّاد متراكم). */
export function restRemainingSec(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000))
}

/** هل انتهت الراحة؟ (رجوع من خلفية طويلة → true). */
export function restIsFinished(rest: RestSnapshot | null, now: number): boolean {
  return rest != null && now >= rest.endsAt
}

// ————————————————————— التحقّق —————————————————————

function isSetLog(v: unknown): v is SetLog {
  if (!v || typeof v !== 'object') return false
  const s = v as Partial<SetLog>
  return (
    typeof s.setNumber === 'number' &&
    typeof s.targetReps === 'string' &&
    typeof s.actualReps === 'string' &&
    typeof s.weightKg === 'string' &&
    typeof s.completed === 'boolean'
  )
}

function isExerciseState(v: unknown): v is ActiveExerciseState {
  if (!v || typeof v !== 'object') return false
  const s = v as Partial<ActiveExerciseState>
  if (!Array.isArray(s.sets) || s.sets.length === 0) return false
  if (!s.sets.every(isSetLog)) return false
  if (typeof s.painNote !== 'string' || typeof s.notes !== 'string') return false
  return true
}

/**
 * حارس صارم: هل القيمة لقطة قابلة للاستئمان *ولهذا اليوم تحديدًا*؟ يرفض:
 * إصدارًا مختلفًا، لقطة قديمة (> maxAge)، يومًا بلا تمارين، فهرسًا خارج النطاق،
 * أو حالة لا تغطّي كل تمارين اليوم (لقطة خطة قديمة).
 */
export function isRestorableSnapshot(
  value: unknown,
  now: number,
  maxAgeMs: number = ACTIVE_SESSION_MAX_AGE_MS,
): value is ActiveSessionSnapshot {
  if (!value || typeof value !== 'object') return false
  const s = value as Partial<ActiveSessionSnapshot>
  if (s.version !== 1) return false
  if (typeof s.savedAt !== 'number' || !Number.isFinite(s.savedAt)) return false
  // الطزاجة: نرفض ما مضى عليه أكثر من الحدّ (تحرّك الساعة للخلف يُبقيها طازجة — بيانات حقيقية).
  if (now - s.savedAt > maxAgeMs) return false
  if (typeof s.startedAt !== 'string' || !s.startedAt) return false
  const day = s.day as PlanDay | undefined
  if (!day || typeof day !== 'object' || !Array.isArray(day.exercises) || day.exercises.length === 0) return false
  if (!Number.isInteger(s.current) || (s.current as number) < 0 || (s.current as number) >= day.exercises.length) return false
  if (!s.state || typeof s.state !== 'object') return false
  // كل تمرين في يوم اللقطة يجب أن تكون له حالة صالحة (وإلا فاللقطة لا تطابق هذا اليوم).
  const state = s.state as Record<string, unknown>
  for (const pe of day.exercises) {
    if (!isExerciseState(state[pe.id])) return false
  }
  if (s.swap != null && typeof s.swap !== 'object') return false
  if (s.altSlots != null && typeof s.altSlots !== 'object') return false
  if (s.rest != null) {
    const r = s.rest as Partial<RestSnapshot>
    if (typeof r.endsAt !== 'number' || typeof r.durationSec !== 'number') return false
  }
  return true
}

// ————————————————————— التخزين (آمن، لا يرمي أبدًا) —————————————————————

/** يقرأ لقطة قابلة للاستئناف لهذا الحساب أو null. يمسح تلقائيًا أي لقطة تالفة/قديمة. */
export function loadActiveSession(
  ownerId: string | null | undefined,
  now: number = Date.now(),
): ActiveSessionSnapshot | null {
  if (typeof window === 'undefined') return null
  const key = activeSessionKey(ownerId)
  let parsed: unknown = null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    parsed = JSON.parse(raw)
  } catch {
    parsed = null
  }
  if (isRestorableSnapshot(parsed, now)) return parsed
  // تالفة أو قديمة — نظّفها فلا تُعرض مجددًا.
  clearActiveSession(ownerId)
  return null
}

/** يحفظ لقطة الجلسة النشطة (يتجاهل أخطاء التخزين بصمت). */
export function saveActiveSession(ownerId: string | null | undefined, snapshot: ActiveSessionSnapshot): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(activeSessionKey(ownerId), JSON.stringify(snapshot))
  } catch {
    /* تجاهل امتلاء/حجب التخزين */
  }
}

/** يمسح لقطة الجلسة النشطة لهذا الحساب (عند الإنهاء/الإغلاق/التجاهل). */
export function clearActiveSession(ownerId: string | null | undefined): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(activeSessionKey(ownerId))
  } catch {
    /* تجاهل */
  }
}
