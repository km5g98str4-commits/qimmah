import { getDayStamp } from './today'
import {
  getStepSource,
  loadStepGoal,
  loadStepLog,
  type DaySteps,
  type StepSource,
} from './stepCounter'

export const ESTIMATED_STEP_LENGTH_M = 0.75

export interface StepsPageModel {
  hasData: boolean
  today: number
  goal: number
  goalProgress: number
  remaining: number
  weekTotal: number
  monthTotal: number
  best: { date: string; steps: number } | null
  streakDays: number
  estimatedDistanceKm: number
  source: StepSource
  week: DaySteps[]
}

function daysEndingAt(now: Date, count: number): string[] {
  const days: string[] = []
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now)
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - offset)
    days.push(getDayStamp(date))
  }
  return days
}

/**
 * Pure calculation layer for the Steps surface. Stored values and source IDs
 * remain stable; localization belongs to the view/dictionary only.
 */
export function calculateStepsPageModel(
  log: Record<string, number>,
  goal: number,
  sourceForDay: (date: string) => StepSource,
  now = new Date(),
): StepsPageModel {
  const weekDays = daysEndingAt(now, 7)
  const monthDays = daysEndingAt(now, 30)
  const todayDate = weekDays.at(-1) ?? getDayStamp(now)
  const today = log[todayDate] ?? 0
  const week = weekDays.map((date) => ({ date, steps: log[date] ?? 0, source: sourceForDay(date) }))
  const entries = Object.entries(log).filter(([, steps]) => Number.isFinite(steps) && steps > 0)
  const bestEntry = entries.reduce<[string, number] | null>((best, entry) => {
    if (!best || entry[1] > best[1]) return entry
    return best
  }, null)

  let streakDays = 0
  const cursor = new Date(now)
  cursor.setHours(12, 0, 0, 0)
  while (log[getDayStamp(cursor)] > 0) {
    streakDays += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return {
    hasData: entries.length > 0,
    today,
    goal,
    goalProgress: goal > 0 ? Math.min(100, Math.round((today / goal) * 100)) : 0,
    remaining: Math.max(0, goal - today),
    weekTotal: week.reduce((sum, day) => sum + day.steps, 0),
    monthTotal: monthDays.reduce((sum, date) => sum + (log[date] ?? 0), 0),
    best: bestEntry ? { date: bestEntry[0], steps: bestEntry[1] } : null,
    streakDays,
    estimatedDistanceKm: Math.round(today * ESTIMATED_STEP_LENGTH_M) / 1000,
    source: sourceForDay(todayDate),
    week,
  }
}

export function buildStepsPageModel(now = new Date()): StepsPageModel {
  return calculateStepsPageModel(loadStepLog(), loadStepGoal(), getStepSource, now)
}
