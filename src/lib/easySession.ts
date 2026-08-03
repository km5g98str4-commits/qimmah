// بروتوكول التعثّر — النسخة المخفّفة ليوم واحد (ADV-18) — [CTO-70] البند ٣.
//
// **يعدّل جلسة اليوم فقط، لا الخطة.** العلم مختوم باليوم ومربوط بالمالك، فينتهي
// مفعوله تلقائيًا بانتهاء اليوم بلا أي كتابة في الخطة المحفوظة. أي تعديل خطة
// حقيقي يبقى ملك مسار الاقتراح-بسبب القائم (§8 قرار مقفل ٣: اقتراح لا تعديل صامت).

import { readJson, writeJson, removeKey } from '@/lib/safeStorage'
import { getLastUser } from '@/lib/accountScope'
import { getDayStamp } from '@/lib/today'

export const EASY_SESSION_KEY_BASE = 'qimmah:easySession:v1'

interface EasySessionState {
  /** ختم اليوم الذي فُعّل فيه التخفيف — غير اليوم الحالي = منتهٍ. */
  date: string
}

export function easySessionKey(uid?: string | null): string {
  const owner = uid === undefined ? (getLastUser() ?? null) ?? 'guest' : uid ?? 'guest'
  return `${EASY_SESSION_KEY_BASE}:${owner}`
}

/** يفعّل التخفيف لليوم الحالي وحده. */
export function enableEasyToday(uid?: string | null, now: Date = new Date()): void {
  if (typeof window === 'undefined') return
  writeJson(easySessionKey(uid), { date: getDayStamp(now) } satisfies EasySessionState)
}

export function clearEasyToday(uid?: string | null): void {
  if (typeof window === 'undefined') return
  removeKey(easySessionKey(uid))
}

/** هل التخفيف مفعَّل **لهذا اليوم**؟ ختم يوم قديم يُعامَل منتهيًا. */
export function isEasyToday(uid?: string | null, now: Date = new Date()): boolean {
  if (typeof window === 'undefined') return false
  const raw = readJson<unknown>(easySessionKey(uid), null)
  if (!raw || typeof raw !== 'object') return false
  return (raw as Partial<EasySessionState>).date === getDayStamp(now)
}

/**
 * مدّة النسخة المخفّفة بالدقائق — مشتقّة من **المدّة المعروضة نفسها** (ثلثها)
 * ومحصورة بين ٥ و١٥. فلا يظهر رقمان متناقضان للمستخدم، ولا يُخترع رقم ثابت.
 * مثال المجلس: ٢٥ ⇒ ٨.
 */
export function easyMinutesFor(fullMin: number): number {
  if (!Number.isFinite(fullMin) || fullMin <= 0) return 0
  return Math.min(15, Math.max(5, Math.round(fullMin / 3)))
}

/**
 * عدد التمارين في النسخة المخفّفة — نفس نسبة المدّة مطبَّقة على عدد التمارين،
 * وواحد على الأقل. الترتيب محفوظ: يأخذ **أوائل** تمارين اليوم لا عيّنة عشوائية،
 * فما يُنجزه المستخدم هو بداية جلسته الحقيقية لا جلسة أخرى.
 */
export function easyExerciseCount(total: number, fullMin: number): number {
  if (total <= 0) return 0
  const easy = easyMinutesFor(fullMin)
  if (easy <= 0 || fullMin <= 0) return total
  return Math.min(total, Math.max(1, Math.round((total * easy) / fullMin)))
}
