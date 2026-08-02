import { hasSavedCustomization, loadCustomization, type RoutineRow } from '@/lib/customization'
import type { PlanWeek, PlanWeekday } from './types'

const DAY_TO_WEEKDAY: Record<string, number> = {
  الأحد: 0,
  الإثنين: 1,
  الاثنين: 1,
  الثلاثاء: 2,
  الأربعاء: 3,
  الاربعاء: 3,
  الخميس: 4,
  الجمعة: 5,
  السبت: 6,
}

function rowToWeekday(row: RoutineRow): PlanWeekday | null {
  const weekday = DAY_TO_WEEKDAY[row.day.trim()]
  return weekday === undefined ? null : { weekday, isRestDay: row.type === 'rest', title: row.title || null }
}

/** Reads only the user's saved routine; a default/demo plan is never scheduled. */
export function readPlanWeek(): PlanWeek {
  if (!hasSavedCustomization()) return null
  const days = loadCustomization().routine.map(rowToWeekday).filter((day): day is PlanWeekday => day !== null)
  return days.length ? days : null
}

