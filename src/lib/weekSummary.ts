// ملخّص اليوم السابع (ADV-20 + Q-212 المصحّحة) — [CTO-70] البند ٥.
//
// **الترتيب إلزامي**: السلوك أولًا ← تحصين الميزان ← الوزن أخيرًا ← عرض الحساب.
// السبب: من يرى وزنه أولًا يحكم على أسبوعه برقم يتقلّب بالماء والملح، فيترك
// التطبيق وهو ملتزم فعلًا. السلوك هو ما فعله بيده، والوزن يأتي بعد تحصينه.
//
// كل الأرقام هنا من **أحداث التتبّع الفعلية** لا من تقدير: تمرّ بقاعدة السؤالين
// (هل هو متاح؟ وهل هو الصحيح لهذا السياق؟)، وما لا نعرفه يُعرض «—» لا رقمًا مخترعًا.

import { readEvents } from '@/lib/tracking'
import { trackingDayStamp, journeyDayIndex } from '@/lib/tracking/signals'
import { readJson, writeJson, removeKey } from '@/lib/safeStorage'
import { getLastUser } from '@/lib/accountScope'

export const WEEK_SUMMARY_KEY_BASE = 'qimmah:weekSummary:v1'
/** عدد أيام الأسبوع المرصود. */
export const WEEK_DAYS = 7

export interface WeekSummaryStats {
  /** أيام ظهر فيها أي نشاط مسجَّل — «التزمت س من ٧». */
  activeDays: number
  totalDays: number
  /** تمارين مكتملة فعلًا (لا مبدوءة). */
  workouts: number
  /** وجبات مسجَّلة. */
  meals: number
}

export function weekSummaryKey(uid?: string | null): string {
  const owner = uid === undefined ? (getLastUser() ?? null) ?? 'guest' : uid ?? 'guest'
  return `${WEEK_SUMMARY_KEY_BASE}:${owner}`
}

/** هل عُرض الملخّص لهذا المالك؟ يُعرض **مرّة واحدة** ولا يتحوّل إلى شاشة متكرّرة. */
export function weekSummarySeen(uid?: string | null): boolean {
  if (typeof window === 'undefined') return false
  return readJson<unknown>(weekSummaryKey(uid), null) !== null
}

export function markWeekSummarySeen(uid?: string | null, now: Date = new Date()): void {
  if (typeof window === 'undefined') return
  writeJson(weekSummaryKey(uid), { at: now.toISOString() })
}

export function clearWeekSummary(uid?: string | null): void {
  if (typeof window === 'undefined') return
  removeKey(weekSummaryKey(uid))
}

/**
 * يُعرض عند فتح **اليوم الثامن** (أي بعد اكتمال الأسبوع الأول)، ومرّة واحدة.
 * لا يُعرض ليوم ٧ نفسه: اليوم لم ينتهِ بعد، وتلخيصه وهو جارٍ يعدّ أرقامًا ناقصة.
 */
export function shouldShowWeekSummary(uid?: string | null, now: Date = new Date()): boolean {
  const day = journeyDayIndex(now)
  if (day === null || day < WEEK_DAYS + 1) return false
  return !weekSummarySeen(uid)
}

/**
 * يحسب أرقام السلوك من أحداث التتبّع خلال الأيام السبعة الأولى للرحلة.
 *
 * «التزمت س من ٧» تُقاس بعدد **الأيام التي فيها نشاط مسجَّل** — وهو ما نملك
 * دليلًا عليه فعلًا. لا نقيسها بأيام الخطة لأن خطة ٣ أيام تجعل «٣ من ٧» تبدو
 * تقصيرًا وهي التزام كامل؛ ولا نخترع نسبة التزام لا نرصدها.
 */
export function buildWeekSummary(now: Date = new Date()): WeekSummaryStats {
  const events = readEvents()
  if (events.length === 0) return { activeDays: 0, totalDays: WEEK_DAYS, workouts: 0, meals: 0 }

  const startStamp = trackingDayStamp(new Date(events[0].ts))
  const startMs = Date.parse(`${startStamp}T00:00:00`)
  const windowEnd = startMs + WEEK_DAYS * 86_400_000
  const inWindow = events.filter((e) => e.ts >= startMs && e.ts < windowEnd && e.ts <= now.getTime())

  // «يوم فيه نشاط» = يوم سُجّل فيه فعل حقيقي للمستخدم، لا مجرّد فتح التطبيق.
  const ACTIVITY = new Set(['workout_session_completed', 'workout_session_started', 'meal_entry_logged', 'first_win_completed'])
  const activeStamps = new Set(inWindow.filter((e) => ACTIVITY.has(e.name)).map((e) => trackingDayStamp(new Date(e.ts))))

  return {
    activeDays: activeStamps.size,
    totalDays: WEEK_DAYS,
    // المكتمل وحده — بدء تمرين ليس إنجازه، وعدّه إنجازًا يكذب على المستخدم.
    workouts: inWindow.filter((e) => e.name === 'workout_session_completed').length,
    meals: inWindow.filter((e) => e.name === 'meal_entry_logged').length,
  }
}
