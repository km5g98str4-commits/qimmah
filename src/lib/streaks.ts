// أساس السلاسل والملخّص الأسبوعي — يعتمد على المتجر التاريخي الدائم.
//
// كل الحسابات محلية (local-first) وتعمل في وضع الضيف. لا ترمي استثناءات.

import { getDailyLogs, getNutritionLogs, getWorkoutSessions } from './historyStore'

/** ختم اليوم المحلي (YYYY-MM-DD). */
function dayStamp(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(d.getDate() + n)
  return x
}

/** مجموعة تواريخ الأيام التي أُكملت فيها جلسة تمرين. */
function workoutDays(): Set<string> {
  const set = new Set<string>()
  getWorkoutSessions().forEach((s) => {
    if (s.finishedAt) set.add(s.date)
  })
  // ادمج لقطات اليوم التي تحمل workoutCompleted.
  const logs = getDailyLogs()
  Object.values(logs).forEach((l) => {
    if (l.workoutCompleted) set.add(l.date)
  })
  return set
}

/**
 * سلسلة التمرين الحالية (أيام متتالية فيها تمرين).
 * تبدأ العدّ من اليوم أو من الأمس (حتى لا تنكسر قبل تمرين اليوم).
 */
export function workoutStreak(today = new Date()): number {
  const days = workoutDays()
  if (days.size === 0) return 0
  // ابدأ من اليوم إن وُجد تمرين، وإلا من الأمس.
  let cursor = days.has(dayStamp(today)) ? today : addDays(today, -1)
  let streak = 0
  // حدّ أمان 365 يومًا.
  for (let i = 0; i < 366; i++) {
    if (days.has(dayStamp(cursor))) {
      streak++
      cursor = addDays(cursor, -1)
    } else {
      break
    }
  }
  return streak
}

/** عدد أيام التمرين خلال آخر 7 أيام (يشمل اليوم). */
export function weeklyWorkoutCount(today = new Date()): number {
  const days = workoutDays()
  let count = 0
  for (let i = 0; i < 7; i++) {
    if (days.has(dayStamp(addDays(today, -i)))) count++
  }
  return count
}

/**
 * أيام الالتزام بالتغذية خلال آخر 7 أيام.
 * يوم «ملتزم» = سجّل وجبة واحدة منجزة على الأقل أو ماء > 0.
 */
export function weeklyNutritionAdherence(today = new Date()): number {
  const logs = getNutritionLogs()
  let count = 0
  for (let i = 0; i < 7; i++) {
    const log = logs[dayStamp(addDays(today, -i))]
    if (!log) continue
    const anyMeal = Object.values(log.doneMeals ?? {}).some(Boolean)
    if (anyMeal || (log.waterMl ?? 0) > 0) count++
  }
  return count
}

export interface WeekSummary {
  /** عدد أيام التمرين هذا الأسبوع (آخر 7 أيام). */
  workoutDays: number
  /** سلسلة التمرين الحالية. */
  currentStreak: number
  /** أيام الالتزام بالتغذية (آخر 7 أيام). */
  nutritionDays: number
  /** هل تمرّن المستخدم اليوم؟ */
  workedOutToday: boolean
  /** أطول سلسلة تمرين مسجّلة. */
  bestStreak: number
}

/** أطول سلسلة تمرين عبر كامل التاريخ. */
export function bestWorkoutStreak(): number {
  const days = [...workoutDays()].sort()
  if (days.length === 0) return 0
  let best = 1
  let run = 1
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1])
    const cur = new Date(days[i])
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000)
    if (diff === 1) {
      run++
      best = Math.max(best, run)
    } else if (diff > 1) {
      run = 1
    }
  }
  return best
}

/** ملخّص الأسبوع الحالي — للوحة المعلومات. */
export function currentWeekSummary(today = new Date()): WeekSummary {
  return {
    workoutDays: weeklyWorkoutCount(today),
    currentStreak: workoutStreak(today),
    nutritionDays: weeklyNutritionAdherence(today),
    workedOutToday: workoutDays().has(dayStamp(today)),
    bestStreak: bestWorkoutStreak(),
  }
}
