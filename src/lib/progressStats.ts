// إحصاءات التقدّم — تُشتق من جلسات التمرين وسجل الأداء (محلي فقط، بلا مكتبات رسم).

import { loadSessions, type WorkoutSession } from './workoutSessions'
import { loadHistory } from './exerciseHistory'
import { getExercise } from '@/data/exercises'
import { getDayStamp } from './today'
import type { Muscle } from '@/types/workout'
import { foldDigits } from './numberFormat'

const num = (v: unknown): number => {
  // الطيّ أولًا: `Number('٨٥')` = NaN، فكان حجم الجلسة يصير صفرًا لكل مجموعة
  // سُجّلت بأرقام عربية — والقيم المخزَّنة قبل [LIVE-QA-001ب] ما زالت كذلك.
  const n = Number(foldDigits(String(v ?? '')))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** حجم جلسة واحدة = مجموع (الوزن × التكرارات) لكل المجموعات المكتملة. */
export function sessionVolume(s: WorkoutSession): number {
  let vol = 0
  for (const ex of s.exercises) {
    if (ex.sets?.length) {
      for (const st of ex.sets) {
        if (st.completed) vol += num(st.weightKg) * num(st.actualReps || st.targetReps)
      }
    } else if (ex.weight) {
      // توافق مع الحقول القديمة
      vol += num(ex.weight) * num(ex.repsDone) * num(ex.targetSets)
    }
  }
  return Math.round(vol)
}

export interface VolumePoint {
  date: string
  volume: number
}

/** أحجام آخر الجلسات (الأقدم→الأحدث) للرسم البياني المصغّر. */
export function recentVolumes(limit = 8): VolumePoint[] {
  const finished = loadSessions().filter((s) => s.finishedAt)
  const points = finished.slice(0, limit).map((s) => ({ date: s.date, volume: sessionVolume(s) }))
  return points.reverse()
}

export interface PR {
  exerciseId: string
  nameAr: string
  weight: number
}

/** أفضل الأوزان المسجّلة (PRs) مرتّبة تنازليًا. */
export function topPRs(limit = 5): PR[] {
  const history = loadHistory()
  const prs: PR[] = []
  for (const [id, rec] of Object.entries(history)) {
    const w = num(rec.bestWeight)
    if (w <= 0) continue
    const ex = getExercise(id)
    prs.push({ exerciseId: id, nameAr: ex?.nameAr ?? id, weight: w })
  }
  return prs.sort((a, b) => b.weight - a.weight).slice(0, limit)
}

export interface MuscleCount {
  muscle: Muscle
  count: number
}

/** عدد التمارين لكل عضلة خلال آخر 7 أيام. */
export function musclesThisWeek(): MuscleCount[] {
  const cutoff = getDayStamp(new Date(Date.now() - 7 * 86400000))
  const counts = new Map<Muscle, number>()
  for (const s of loadSessions()) {
    if (!s.finishedAt || s.date < cutoff) continue
    for (const ex of s.exercises) {
      const m = getExercise(ex.exerciseId)?.primaryMuscle
      if (!m) continue
      counts.set(m, (counts.get(m) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([muscle, count]) => ({ muscle, count }))
    .sort((a, b) => b.count - a.count)
}

/** سلسلة الأيام المتتالية (حتى اليوم أو أمس) التي فيها جلسة مكتملة. */
export function workoutStreak(): number {
  const dates = new Set(loadSessions().filter((s) => s.finishedAt).map((s) => s.date))
  if (dates.size === 0) return 0
  let streak = 0
  const cursor = new Date()
  // اسمح بأن تبدأ السلسلة من اليوم أو أمس
  if (!dates.has(getDayStamp(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (dates.has(getDayStamp(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** ملخّص سريع لعدد الجلسات الكلي وعدد جلسات آخر 7 أيام. */
export function workoutCounts(): { total: number; thisWeek: number } {
  const cutoff = getDayStamp(new Date(Date.now() - 7 * 86400000))
  const finished = loadSessions().filter((s) => s.finishedAt)
  return { total: finished.length, thisWeek: finished.filter((s) => s.date >= cutoff).length }
}
