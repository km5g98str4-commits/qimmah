// محرّك 1RM التقديري (e1RM) — Qimmah Strength.
//
// اختيار الصيغة حسب مدى التكرارات (موثّق):
//   • Brzycki:  w · 36 / (37 − reps)  — أدقّ في التكرارات المنخفضة (≤ ١٠)، لكنه
//     ينهار قرب ٣٧ تكرارًا، فلا نستخدمه للأعلى.
//   • Epley:    w · (1 + reps/30)      — مستقرّ للتكرارات الأعلى (> ١٠).
//   • عند reps = 1 كلاهما = الوزن نفسه.
// النتيجة تقديرية دائمًا («تقديري») — إشارة لا حكم.

import { getWorkoutSessions } from '@/lib/historyStore'
import type { SessionExercise, WorkoutSession } from '@/lib/workoutSessions'

const num = (v?: string | number): number => {
  if (v === undefined) return NaN
  const m = String(v).match(/-?[\d.]+/)
  return m ? Number(m[0]) : NaN
}

/** Epley 1RM. */
export function epley(weight: number, reps: number): number {
  return weight * (1 + reps / 30)
}
/** Brzycki 1RM (يُقيَّد دون ٣٧ تكرارًا). */
export function brzycki(weight: number, reps: number): number {
  if (reps >= 37) return NaN
  return (weight * 36) / (37 - reps)
}

/** الصيغة المختارة حسب المدى، مقرّبة لأقرب ٠٫٥ كجم. NaN لمدخلات غير صالحة. */
export function e1rm(weight: number, reps: number): number {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) return NaN
  if (reps === 1) return round05(weight)
  const raw = reps <= 10 ? brzycki(weight, reps) : epley(weight, reps)
  return round05(raw)
}
const round05 = (n: number): number => Math.round(n * 2) / 2

/** أفضل e1RM في تمرين واحد من جلسة (أعلى قيمة عبر المجموعات المكتملة). NaN إن لا شيء. */
export function sessionExerciseE1RM(se: SessionExercise): number {
  let best = NaN
  for (const s of se.sets ?? []) {
    if (!s.completed) continue
    const actualReps = num(s.actualReps)
    const reps = Number.isFinite(actualReps) ? actualReps : num(s.targetReps)
    const est = e1rm(num(s.weightKg), reps)
    if (Number.isFinite(est) && (Number.isNaN(best) || est > best)) best = est
  }
  return best
}

export interface E1rmPoint { date: string; e1rm: number }

/** سلسلة e1RM المؤرّخة لتمرين (تصاعديًا) من الجلسات المنتهية الحقيقية. */
export function e1rmSeries(exerciseId: string, sessions: WorkoutSession[] = getWorkoutSessions()): E1rmPoint[] {
  const pts: E1rmPoint[] = []
  for (const s of sessions) {
    if (!s.finishedAt) continue
    const se = s.exercises.find((e) => e.exerciseId === exerciseId)
    if (!se) continue
    const est = sessionExerciseE1RM(se)
    if (Number.isFinite(est)) pts.push({ date: s.date, e1rm: est })
  }
  return pts.sort((a, b) => Date.parse(`${a.date}T00:00:00`) - Date.parse(`${b.date}T00:00:00`))
}

/** أفضل e1RM على الإطلاق لتمرين (أعلى نقطة في السلسلة). */
export function bestE1RM(exerciseId: string, sessions?: WorkoutSession[]): number {
  const s = e1rmSeries(exerciseId, sessions)
  return s.length ? Math.max(...s.map((p) => p.e1rm)) : NaN
}

/**
 * سرعة التقدّم (كجم/أسبوع) من ميل e1RM بين أول وآخر نقطة — تقديرية.
 * تُرجِع null إن كانت النقاط < ٢ أو المدة صفر (لا نخترع اتجاهًا).
 */
export function velocityKgPerWeek(exerciseId: string, sessions?: WorkoutSession[]): number | null {
  const s = e1rmSeries(exerciseId, sessions)
  if (s.length < 2) return null
  const first = s[0]
  const last = s[s.length - 1]
  const weeks = (Date.parse(`${last.date}T00:00:00`) - Date.parse(`${first.date}T00:00:00`)) / (7 * 86_400_000)
  if (weeks <= 0) return null
  return Math.round(((last.e1rm - first.e1rm) / weeks) * 10) / 10
}
