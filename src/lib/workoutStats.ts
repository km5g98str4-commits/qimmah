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

/** مدة تقديرية لليوم بالدقائق (زمن مجموعة ~٤٠ث + الراحة). */
export function estimateDurationMin(day: PlanDay | undefined): number {
  if (!day) return 0
  const sec = day.exercises.reduce((sum, pe) => sum + Math.max(1, pe.sets) * (40 + (pe.restSec || 60)), 0)
  return Math.max(5, Math.round(sec / 60))
}
