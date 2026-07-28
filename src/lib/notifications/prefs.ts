import type { NotificationPrefs } from './types'
import { safeRemove, safeWriteJson } from '@/lib/safeStorage'

const KEY_PREFIX = 'qimmah:notifications:v1:'
const LEGACY_KEY = 'qimmah:reminders:v1'

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  version: 1,
  masterEnabled: false,
  quietHours: { start: '21:00', end: '08:00' },
  workoutDay: { enabled: true, time: '18:00' },
  restDay: { enabled: true, time: '10:00' },
  water: { enabled: false, cadenceHours: 2 },
  weeklyBrief: { enabled: true, weekday: 0, time: '19:00' },
  supplements: { enabled: false, time: '09:00' },
}

export function notificationPrefsKey(ownerId: string): string {
  return `${KEY_PREFIX}${ownerId}`
}

export function isValidNotificationTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function copyDefaults(): NotificationPrefs {
  return {
    ...DEFAULT_NOTIFICATION_PREFS,
    quietHours: { ...DEFAULT_NOTIFICATION_PREFS.quietHours },
    workoutDay: { ...DEFAULT_NOTIFICATION_PREFS.workoutDay },
    restDay: { ...DEFAULT_NOTIFICATION_PREFS.restDay },
    water: { ...DEFAULT_NOTIFICATION_PREFS.water },
    weeklyBrief: { ...DEFAULT_NOTIFICATION_PREFS.weeklyBrief },
    supplements: { ...DEFAULT_NOTIFICATION_PREFS.supplements },
  }
}

function simple(value: unknown, fallback: { enabled: boolean; time: string }) {
  const input = value && typeof value === 'object' ? value as Partial<typeof fallback> : {}
  return {
    enabled: Boolean(input.enabled),
    time: isValidNotificationTime(input.time) ? input.time : fallback.time,
  }
}

export function sanitizeNotificationPrefs(value: unknown): NotificationPrefs {
  const fallback = copyDefaults()
  if (!value || typeof value !== 'object') return fallback
  const input = value as Partial<NotificationPrefs>
  const quiet = input.quietHours && typeof input.quietHours === 'object' ? input.quietHours : fallback.quietHours
  const water = input.water && typeof input.water === 'object' ? input.water : fallback.water
  const weekly = input.weeklyBrief && typeof input.weeklyBrief === 'object' ? input.weeklyBrief : fallback.weeklyBrief
  return {
    version: 1,
    masterEnabled: Boolean(input.masterEnabled),
    quietHours: {
      start: isValidNotificationTime(quiet.start) ? quiet.start : fallback.quietHours.start,
      end: isValidNotificationTime(quiet.end) ? quiet.end : fallback.quietHours.end,
    },
    workoutDay: simple(input.workoutDay, fallback.workoutDay),
    restDay: simple(input.restDay, fallback.restDay),
    water: {
      enabled: Boolean(water.enabled),
      cadenceHours: Number.isInteger(water.cadenceHours) && water.cadenceHours >= 1 && water.cadenceHours <= 6
        ? water.cadenceHours
        : fallback.water.cadenceHours,
    },
    weeklyBrief: {
      enabled: Boolean(weekly.enabled),
      weekday: Number.isInteger(weekly.weekday) && weekly.weekday >= 0 && weekly.weekday <= 6
        ? weekly.weekday
        : fallback.weeklyBrief.weekday,
      time: isValidNotificationTime(weekly.time) ? weekly.time : fallback.weeklyBrief.time,
    },
    supplements: simple(input.supplements, fallback.supplements),
  }
}

function migrateLegacy(ownerId: string): NotificationPrefs | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(LEGACY_KEY)
  if (!raw) return null
  try {
    const legacy = JSON.parse(raw) as { trainingEnabled?: unknown; trainingTime?: unknown }
    const migrated = copyDefaults()
    migrated.masterEnabled = Boolean(legacy.trainingEnabled)
    migrated.workoutDay.enabled = Boolean(legacy.trainingEnabled)
    if (isValidNotificationTime(legacy.trainingTime)) migrated.workoutDay.time = legacy.trainingTime
    saveNotificationPrefs(ownerId, migrated)
    safeRemove(LEGACY_KEY)
    return migrated
  } catch {
    safeRemove(LEGACY_KEY)
    return null
  }
}

export function loadNotificationPrefs(ownerId: string): NotificationPrefs {
  if (typeof window === 'undefined' || !ownerId) return copyDefaults()
  try {
    const raw = window.localStorage.getItem(notificationPrefsKey(ownerId))
    if (!raw) return migrateLegacy(ownerId) ?? copyDefaults()
    return sanitizeNotificationPrefs(JSON.parse(raw))
  } catch {
    return copyDefaults()
  }
}

export function saveNotificationPrefs(ownerId: string, prefs: NotificationPrefs): NotificationPrefs {
  const safe = sanitizeNotificationPrefs(prefs)
  if (ownerId) safeWriteJson(notificationPrefsKey(ownerId), safe)
  return safe
}

export function clearNotificationPrefs(ownerId: string): void {
  if (ownerId) safeRemove(notificationPrefsKey(ownerId))
}

