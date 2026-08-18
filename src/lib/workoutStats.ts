// إحصاءات تمرين مشتقّة من الجلسات المحفوظة (سلسلة، إنجاز الأسبوع، مدة تقديرية).

import type { PlanDay } from '@/types/workout'
import { getDayStamp } from './today'
import { loadSessions, type WorkoutSession } from './workoutSessions'

/** أيام التمرين المنجزة الفريدة (جلسة منتهية) مرتّبة تنازليًا. */
function finishedDays(sessions: WorkoutSession[]): string[] {
  const days = new Set<string>()
  sessions.forEach((s) => {
    if (s.finishedAt) days.add(s.date)
  })
  return [...days].sort().reverse()
}

function dayStampOffset(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  return getDayStamp(d)
}

/** سلسلة الأيام المتتالية المنتهية حتى اليوم أو الأمس. */
export function workoutStreak(sessions = loadSessions()): number {
  const days = new Set(finishedDays(sessions))
  if (days.size === 0) return 0
  // ابدأ من اليوم؛ وإن لم يتمرّن اليوم بعد لكن تمرّن أمس نبدأ من الأمس.
  let start = 0
  if (!days.has(dayStampOffset(0))) {
    if (days.has(dayStampOffset(1))) start = 1
    else return 0
  }
  let count = 0
  for (let i = start; ; i++) {
    if (days.has(dayStampOffset(i))) count++
    else break
  }
  return count
}

/** عدد أيام التمرين المنتهية خلال آخر ٧ أيام. */
export function weeklyCompleted(sessions = loadSessions()): number {
  const recent = new Set<string>()
  for (let i = 0; i < 7; i++) recent.add(dayStampOffset(i))
  return finishedDays(sessions).filter((d) => recent.has(d)).length
}

/**
 * ثوان العمل التقديرية للمجموعة الواحدة — الثابت الوحيد في نموذج المدّة.
 * مُصدَّر كي يستهلكه الإثبات بدل أن يعيد كتابته (رقم مكرَّر = نموذج ثانٍ).
 */
export const WORK_SECONDS_PER_SET = 40

/** الراحة الافتراضية حين لا يحملها العنصر. */
export const DEFAULT_REST_SECONDS = 60

/**
 * مدّة الجلسة التقديرية بالثواني — **المصدر الوحيد** لنموذج المدّة.
 * `estimateDurationMin` أدناه غلافٌ بالدقائق، ومحرّك الخطة يقيس به نفسه
 * (`fitPlanToSessionBudget` في `planGenerator`) — فما نولّده وما نعرضه رقمٌ واحد.
 */
export function estimateDurationSec(day: PlanDay | undefined): number {
  if (!day) return 0
  return day.exercises.reduce(
    (sum, pe) => sum + Math.max(1, pe.sets) * (WORK_SECONDS_PER_SET + (pe.restSec || DEFAULT_REST_SECONDS)),
    0,
  )
}

/**
 * مدة تقديرية لليوم بالدقائق (زمن مجموعة ~٤٠ث + الراحة).
 *
 * [SOVEREIGN-003] D2 — **المصدر الواحد المُعلَن**. كان في المستودع نموذجان
 * متنافسان لمدّة الجلسة نفسها: هذا، و`Math.max(20, Math.round(total * 9 / 5) * 5)`
 * في `workoutV2Model` (تسعُ دقائق لكل تمرين، تقريبٌ لأقرب ٥) — فكان تبويب
 * «التمرين» يقول رقمًا وتبويب «اليوم» يقول غيره لنفس الجلسة. أُزيل الثاني
 * ووُصل مستهلكوه بهذا، ويحرس الوحدانيةَ تأكيدٌ نصّي في
 * `run-plan-coherence-proof.mjs` يسقط بالاسم عند ظهور أي حساب مدّة جديد.
 */
export function estimateDurationMin(day: PlanDay | undefined): number {
  if (!day) return 0
  return Math.max(5, Math.round(estimateDurationSec(day) / 60))
}
