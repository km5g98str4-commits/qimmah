// مسوّدة التمرين النشط — تحفظ ما سُجِّل أثناء التمرين لحظة بلحظة.
//
// المشكلة التي تحلّها: كانت حالة وضع التمرين في الذاكرة فقط، فإغلاق الشاشة أو
// تحديث الصفحة أو مكالمة واردة تمسح كل المجموعات المسجّلة بلا أي تحذير.
// الآن تُحفظ المسوّدة بعد كل تغيير، وتُستأنف تلقائيًا عند العودة لنفس اليوم،
// وتُمسح عند الإنهاء أو الإلغاء الصريح.
//
// المسوّدة ليست جلسة: الجلسة تُكتب في historyStore عند الإنهاء فقط.

import { writeJson } from './safeStorage'

export const ACTIVE_WORKOUT_KEY = 'qimmah:activeWorkout:v1'

/** مدّة صلاحية المسوّدة — بعدها تُعدّ منسيّة ولا تُستأنف. */
const MAX_AGE_MS = 20 * 60 * 60 * 1000

export interface ActiveWorkoutDraft<TState = unknown> {
  /** معرّف يوم الخطة — الاستئناف يتم لنفس اليوم فقط. */
  dayId: string
  /** ختم اليوم (YYYY-MM-DD) لعرضه للمستخدم. */
  date: string
  /** وقت بدء الجلسة (ISO). */
  startedAt: string
  /** آخر تحديث (ISO) — لحساب العمر. */
  updatedAt: string
  /** حالة التمارين كما يخزّنها وضع التمرين. */
  state: TState
  /** بدائل التمارين المختارة أثناء الجلسة. */
  swap?: Record<string, string>
  /** التمرين الحالي المعروض. */
  current?: number
  /** عدد التمارين المكتملة — لعرضه في رسالة الاستئناف. */
  doneCount?: number
}

function safeParse(raw: string | null): ActiveWorkoutDraft | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Partial<ActiveWorkoutDraft>
    if (!p || typeof p !== 'object') return null
    if (typeof p.dayId !== 'string' || typeof p.startedAt !== 'string' || p.state === undefined) return null
    return {
      dayId: p.dayId,
      date: typeof p.date === 'string' ? p.date : '',
      startedAt: p.startedAt,
      updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : p.startedAt,
      state: p.state,
      swap: typeof p.swap === 'object' && p.swap ? (p.swap as Record<string, string>) : undefined,
      current: typeof p.current === 'number' ? p.current : 0,
      doneCount: typeof p.doneCount === 'number' ? p.doneCount : 0,
    }
  } catch {
    // مسوّدة تالفة: نتجاهلها بدل أن نُسقط الشاشة.
    return null
  }
}

/** يقرأ المسوّدة المحفوظة إن كانت لنفس اليوم وحديثة بما يكفي. */
export function loadDraft<TState>(dayId: string): ActiveWorkoutDraft<TState> | null {
  if (typeof window === 'undefined') return null
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(ACTIVE_WORKOUT_KEY)
  } catch {
    return null
  }
  const d = safeParse(raw)
  if (!d) return null
  if (d.dayId !== dayId) return null
  const age = Date.now() - new Date(d.updatedAt).getTime()
  if (!Number.isFinite(age) || age > MAX_AGE_MS) {
    clearDraft()
    return null
  }
  return d as ActiveWorkoutDraft<TState>
}

/** هل توجد مسوّدة صالحة (لأي يوم)؟ — لعرض شارة «تمرين لم يكتمل». */
export function peekDraft(): ActiveWorkoutDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const d = safeParse(window.localStorage.getItem(ACTIVE_WORKOUT_KEY))
    if (!d) return null
    const age = Date.now() - new Date(d.updatedAt).getTime()
    return Number.isFinite(age) && age <= MAX_AGE_MS ? d : null
  } catch {
    return null
  }
}

/** يحفظ المسوّدة — يتجاهل امتلاء التخزين بصمت (التمرين أهم من المسوّدة). */
export function saveDraft<TState>(draft: Omit<ActiveWorkoutDraft<TState>, 'updatedAt'>): void {
  if (typeof window === 'undefined') return
  const payload: ActiveWorkoutDraft<TState> = { ...draft, updatedAt: new Date().toISOString() }
  // الكتابة الآمنة لا ترمي أبدًا: امتلاء التخزين لا يُسقط شاشة التمرين.
  writeJson(ACTIVE_WORKOUT_KEY, payload)
}

/** يمسح المسوّدة (عند الإنهاء أو التخلّي الصريح). */
export function clearDraft(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(ACTIVE_WORKOUT_KEY)
  } catch {
    // تجاهل
  }
}
