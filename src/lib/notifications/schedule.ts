import type { Lang } from '@/lib/appPreferences'
import { notificationMessage } from '@/data/notificationCopy'
import type { NotificationPrefs, PlanWeek, PlannedNotification, QuietHours } from './types'

export const NOTIFICATION_ID_RANGES = {
  workoutDay: [3100, 3106],
  restDay: [3200, 3206],
  water: [3300, 3311],
  weeklyBrief: [3400, 3400],
  supplements: [3500, 3500],
  legacyWorkout: [1001, 1001],
} as const

const MINUTES_PER_DAY = 24 * 60

function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number)
  return { hour, minute }
}

function minutes(time: string): number {
  const parsed = parseTime(time)
  return parsed.hour * 60 + parsed.minute
}

/** Quiet window is [start,end); it may wrap across midnight. Equal endpoints mean quiet all day. */
export function isWithinQuietHours(hour: number, minute: number, quiet: QuietHours): boolean {
  const value = hour * 60 + minute
  const start = minutes(quiet.start)
  const end = minutes(quiet.end)
  if (start === end) return true
  return start < end ? value >= start && value < end : value >= start || value < end
}

/** Water slots cover the non-quiet window, beginning when quiet hours end. */
export function waterSlots(cadenceHours: number, quiet: QuietHours): Array<{ hour: number; minute: number }> {
  const quietStart = minutes(quiet.start)
  const activeStart = minutes(quiet.end)
  const activeSpan = (quietStart - activeStart + MINUTES_PER_DAY) % MINUTES_PER_DAY
  if (activeSpan === 0) return []
  const step = Math.max(1, Math.min(6, cadenceHours)) * 60
  const slots: Array<{ hour: number; minute: number }> = []
  for (let offset = 0; offset < activeSpan && slots.length < 12; offset += step) {
    const value = (activeStart + offset) % MINUTES_PER_DAY
    slots.push({ hour: Math.floor(value / 60), minute: value % 60 })
  }
  return slots
}

function fixedNotification(
  id: number,
  kind: PlannedNotification['kind'],
  weekday: number,
  time: string,
  quiet: QuietHours,
  lang: Lang,
): PlannedNotification | null {
  const { hour, minute } = parseTime(time)
  if (isWithinQuietHours(hour, minute, quiet)) return null
  const copy = notificationMessage(kind, lang)
  return { id, kind, weekday, hour, minute, ...copy }
}

export function planNotifications(
  prefs: NotificationPrefs,
  planWeek: PlanWeek,
  lang: Lang,
): PlannedNotification[] {
  if (!prefs.masterEnabled) return []
  const planned: PlannedNotification[] = []
  if (planWeek) {
    for (const day of planWeek) {
      const kind = day.isRestDay ? 'restDay' : 'workoutDay'
      const setting = day.isRestDay ? prefs.restDay : prefs.workoutDay
      const range = day.isRestDay ? NOTIFICATION_ID_RANGES.restDay : NOTIFICATION_ID_RANGES.workoutDay
      if (!setting.enabled) continue
      const item = fixedNotification(range[0] + day.weekday, kind, day.weekday, setting.time, prefs.quietHours, lang)
      if (item) planned.push(item)
    }
  }
  if (prefs.water.enabled) {
    const copy = notificationMessage('water', lang)
    waterSlots(prefs.water.cadenceHours, prefs.quietHours).forEach((slot, index) => {
      planned.push({ id: NOTIFICATION_ID_RANGES.water[0] + index, kind: 'water', weekday: -1, ...slot, ...copy })
    })
  }
  if (prefs.weeklyBrief.enabled) {
    const item = fixedNotification(NOTIFICATION_ID_RANGES.weeklyBrief[0], 'weeklyBrief', prefs.weeklyBrief.weekday, prefs.weeklyBrief.time, prefs.quietHours, lang)
    if (item) planned.push(item)
  }
  if (prefs.supplements.enabled) {
    const item = fixedNotification(NOTIFICATION_ID_RANGES.supplements[0], 'supplements', -1, prefs.supplements.time, prefs.quietHours, lang)
    if (item) planned.push(item)
  }
  return planned
}

export function nextOccurrence(item: PlannedNotification, now: Date): Date {
  const next = new Date(now)
  next.setHours(item.hour, item.minute, 0, 0)
  if (item.weekday === -1) {
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
    return next
  }
  let delta = item.weekday - now.getDay()
  if (delta < 0) delta += 7
  if (delta === 0 && next.getTime() <= now.getTime()) delta = 7
  next.setDate(now.getDate() + delta)
  return next
}

export function allNotificationIds(): number[] {
  const ids: number[] = []
  Object.values(NOTIFICATION_ID_RANGES).forEach(([start, end]) => {
    for (let id = start; id <= end; id += 1) ids.push(id)
  })
  return ids
}
