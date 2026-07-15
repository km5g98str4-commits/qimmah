// كشف الأرقام القياسية الموحّد — Qimmah Strength. مصدر حقيقة واحد لأرقام التكرارات
// (1/3/5RM) و e1RM، مشتقّ من جلسات التمرين الحقيقية (historyStore).
//
// التعريف (يمنع الأرقام الكاذبة): الرقم القياسي = تجاوز صارم لأفضل رقم سابق **مُثبَّت**.
// أول ظهور لتمرين/مدى تكرار يُثبِّت خطَّ الأساس بصمت (لا يوجد ما يُكسَر)، فالتخفيف
// (deload) أو التكرار لا يُنتج رقمًا كاذبًا أبدًا. يتكامل مع تدفّق الأوسمة القائم
// عبر تحويل الأرقام إلى PRCelebration ثم registerWorkoutPRs (توسعة لا تكرار).

import { getWorkoutSessions } from '@/lib/historyStore'
import type { SessionExercise, WorkoutSession } from '@/lib/workoutSessions'
import { sessionExerciseE1RM } from './e1rm'

const num = (v?: string | number): number => {
  if (v === undefined) return NaN
  const m = String(v).match(/-?[\d.]+/)
  return m ? Number(m[0]) : NaN
}

export type PRKind = '1RM' | '3RM' | '5RM' | 'e1RM'
export const REP_MAX_KINDS: { kind: PRKind; minReps: number }[] = [
  { kind: '1RM', minReps: 1 },
  { kind: '3RM', minReps: 3 },
  { kind: '5RM', minReps: 5 },
]

export interface StrengthPR {
  exerciseId: string
  kind: PRKind
  valueKg: number
  date: string
}

/** أثقل وزن في مجموعة مكتملة بتكرارات ≥ minReps داخل تمرين واحد. NaN إن لا شيء. */
export function repMaxInExercise(se: SessionExercise, minReps: number): number {
  let best = NaN
  for (const s of se.sets ?? []) {
    if (!s.completed) continue
    const actualReps = num(s.actualReps)
    const reps = Number.isFinite(actualReps) ? actualReps : num(s.targetReps)
    const w = num(s.weightKg)
    if (Number.isFinite(w) && w > 0 && Number.isFinite(reps) && reps >= minReps) {
      if (Number.isNaN(best) || w > best) best = w
    }
  }
  return best
}

function exercisesIn(sessions: WorkoutSession[], exerciseId: string): SessionExercise[] {
  const out: SessionExercise[] = []
  for (const s of sessions) {
    if (!s.finishedAt) continue
    const se = s.exercises.find((e) => e.exerciseId === exerciseId)
    if (se) out.push(se)
  }
  return out
}

/** أفضل رقم سابق لمدى تكرار عبر مجموعة تمارين (NaN إن لم يُثبَّت بعد). */
function priorRepMax(prior: SessionExercise[], minReps: number): number {
  let best = NaN
  for (const se of prior) {
    const rm = repMaxInExercise(se, minReps)
    if (Number.isFinite(rm) && (Number.isNaN(best) || rm > best)) best = rm
  }
  return best
}
function priorBestE1RM(prior: SessionExercise[]): number {
  let best = NaN
  for (const se of prior) {
    const e = sessionExerciseE1RM(se)
    if (Number.isFinite(e) && (Number.isNaN(best) || e > best)) best = e
  }
  return best
}

/**
 * أرقام هذه الجلسة القياسية مقابل الجلسات السابقة. لا يُصدر رقمًا إلا عند وجود خطّ
 * أساس سابق **وتجاوزه صارمًا** — فالجلسة الأولى أو التخفيف لا يُنتجان رقمًا.
 */
export function detectSessionPRs(session: WorkoutSession, prior: WorkoutSession[] = []): StrengthPR[] {
  const prs: StrengthPR[] = []
  for (const se of session.exercises) {
    const priorEx = exercisesIn(prior, se.exerciseId)
    if (priorEx.length === 0) continue // أول ظهور — تثبيت صامت
    // أرقام التكرارات.
    for (const { kind, minReps } of REP_MAX_KINDS) {
      const now = repMaxInExercise(se, minReps)
      const before = priorRepMax(priorEx, minReps)
      if (Number.isFinite(now) && Number.isFinite(before) && now > before) {
        prs.push({ exerciseId: se.exerciseId, kind, valueKg: now, date: session.date })
      }
    }
    // e1RM.
    const nowE = sessionExerciseE1RM(se)
    const beforeE = priorBestE1RM(priorEx)
    if (Number.isFinite(nowE) && Number.isFinite(beforeE) && nowE > beforeE) {
      prs.push({ exerciseId: se.exerciseId, kind: 'e1RM', valueKg: nowE, date: session.date })
    }
  }
  return prs
}

/** أرقام جلسة مقابل كامل التاريخ قبلها (يستبعد الجلسة نفسها بالمعرّف). */
export function detectPRsForSession(session: WorkoutSession, all: WorkoutSession[] = getWorkoutSessions()): StrengthPR[] {
  const prior = all.filter((s) => s.id !== session.id && s.finishedAt && s.date <= session.date)
  return detectSessionPRs(session, prior)
}

/** سجلّ الأرقام القياسية المؤرّخ لتمرين — يمشي زمنيًا ويُصدر حدثًا عند كل كسر لرقم مُثبَّت. */
export function prHistory(exerciseId: string, sessions: WorkoutSession[] = getWorkoutSessions()): StrengthPR[] {
  const chron = sessions
    .filter((s) => s.finishedAt && s.exercises.some((e) => e.exerciseId === exerciseId))
    .sort((a, b) => Date.parse(`${a.date}T00:00:00`) - Date.parse(`${b.date}T00:00:00`))
  const best: Record<string, number> = {}
  const log: StrengthPR[] = []
  for (const s of chron) {
    const se = s.exercises.find((e) => e.exerciseId === exerciseId)!
    for (const { kind, minReps } of REP_MAX_KINDS) {
      const rm = repMaxInExercise(se, minReps)
      if (!Number.isFinite(rm)) continue
      if (best[kind] === undefined) { best[kind] = rm; continue } // تثبيت صامت
      if (rm > best[kind]) { best[kind] = rm; log.push({ exerciseId, kind, valueKg: rm, date: s.date }) }
    }
    const e = sessionExerciseE1RM(se)
    if (Number.isFinite(e)) {
      if (best.e1RM === undefined) best.e1RM = e
      else if (e > best.e1RM) { best.e1RM = e; log.push({ exerciseId, kind: 'e1RM', valueKg: e, date: s.date }) }
    }
  }
  return log.reverse() // الأحدث أولًا
}

/** أفضل رقم حالي لكل نوع (للوحة تطوّر القوة). */
export function currentBests(exerciseId: string, sessions: WorkoutSession[] = getWorkoutSessions()): Partial<Record<PRKind, number>> {
  const ex = exercisesIn(sessions, exerciseId)
  const out: Partial<Record<PRKind, number>> = {}
  for (const { kind, minReps } of REP_MAX_KINDS) {
    const v = priorRepMax(ex, minReps)
    if (Number.isFinite(v)) out[kind] = v
  }
  const e = priorBestE1RM(ex)
  if (Number.isFinite(e)) out.e1RM = e
  return out
}

export interface PRCelebrationLike { nameAr?: string; nameEn?: string; weight: number }
/**
 * يحوّل الأرقام إلى مدخلات تدفّق الأوسمة القائم (registerWorkoutPRs) — توسعة لا تكرار.
 * يُدمج الأنواع لنفس التمرين ليبقى الأثقل ممثِّلًا (لا نُفجّر أربعة أوسمة لمجموعة واحدة).
 */
export function toPRCelebrations(prs: StrengthPR[], name: (id: string) => { ar?: string; en?: string }): PRCelebrationLike[] {
  const byEx = new Map<string, number>()
  for (const pr of prs) byEx.set(pr.exerciseId, Math.max(byEx.get(pr.exerciseId) ?? 0, pr.valueKg))
  return [...byEx.entries()].map(([id, weight]) => ({ nameAr: name(id).ar, nameEn: name(id).en, weight }))
}
