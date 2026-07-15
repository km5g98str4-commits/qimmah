// تخزين تفضيلات الإشعارات — مملوك لكل حساب (owner-scoped)، لا مشترك بين الحسابات على
// نفس الجهاز. المفتاح يحمل معرّف الحساب فيُمسح تلقائيًا عبر wipeUserData() (بادئة qimmah:
// غير مدرجة في GLOBAL_SAFE_KEYS بـ accountScope.ts) عند تسجيل الخروج/حذف الحساب.

import type { NotificationPrefs } from './types'

const KEY_PREFIX = 'qimmah:notifications:v1:'

export function notificationPrefsKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  version: 1,
  masterEnabled: false,
  quietHours: { start: '08:00', end: '21:00' },
  workoutDay: { enabled: true, time: '18:00' },
  restDay: { enabled: true, time: '10:00' },
  water: { enabled: false, cadenceHours: 2 },
  weeklyBrief: { enabled: true, weekday: 0, time: '19:00' }, // الأحد مساءً
  supplements: { enabled: false, time: '09:00' },
}

function isValidTime(t: unknown): t is string {
  return typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t)
}

function sanitizeSimple(v: unknown, fallback: { enabled: boolean; time: string }) {
  const p = (v ?? {}) as Partial<{ enabled: boolean; time: string }>
  return {
    enabled: Boolean(p.enabled),
    time: isValidTime(p.time) ? p.time : fallback.time,
  }
}

/** يقرأ ويطهّر تفضيلات محفوظة — أي حقل ناقص/تالف يعود للافتراضي الآمن بدل الانهيار. */
function sanitize(raw: Partial<NotificationPrefs> | null | undefined): NotificationPrefs {
  const d = DEFAULT_NOTIFICATION_PREFS
  if (!raw || typeof raw !== 'object') return { ...d }
  const qh = (raw.quietHours ?? {}) as Partial<QuietHoursLike>
  const water = (raw.water ?? {}) as Partial<{ enabled: boolean; cadenceHours: number }>
  const weekly = (raw.weeklyBrief ?? {}) as Partial<{ enabled: boolean; weekday: number; time: string }>
  return {
    version: 1,
    masterEnabled: Boolean(raw.masterEnabled),
    quietHours: {
      start: isValidTime(qh.start) ? qh.start : d.quietHours.start,
      end: isValidTime(qh.end) ? qh.end : d.quietHours.end,
    },
    workoutDay: sanitizeSimple(raw.workoutDay, d.workoutDay),
    restDay: sanitizeSimple(raw.restDay, d.restDay),
    water: {
      enabled: Boolean(water.enabled),
      cadenceHours:
        Number.isInteger(water.cadenceHours) && (water.cadenceHours as number) >= 1 && (water.cadenceHours as number) <= 6
          ? (water.cadenceHours as number)
          : d.water.cadenceHours,
    },
    weeklyBrief: {
      enabled: Boolean(weekly.enabled),
      weekday:
        Number.isInteger(weekly.weekday) && (weekly.weekday as number) >= 0 && (weekly.weekday as number) <= 6
          ? (weekly.weekday as number)
          : d.weeklyBrief.weekday,
      time: isValidTime(weekly.time) ? weekly.time : d.weeklyBrief.time,
    },
    supplements: sanitizeSimple(raw.supplements, d.supplements),
  }
}

interface QuietHoursLike {
  start: string
  end: string
}

export function loadNotificationPrefs(userId: string): NotificationPrefs {
  if (typeof window === 'undefined' || !userId) return { ...DEFAULT_NOTIFICATION_PREFS }
  try {
    const raw = window.localStorage.getItem(notificationPrefsKey(userId))
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS }
    return sanitize(JSON.parse(raw) as Partial<NotificationPrefs>)
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS }
  }
}

export function saveNotificationPrefs(userId: string, prefs: NotificationPrefs): void {
  if (typeof window === 'undefined' || !userId) return
  window.localStorage.setItem(notificationPrefsKey(userId), JSON.stringify(sanitize(prefs)))
}

/** يمسح تفضيلات حساب محدَّد صراحةً (مسار احتياطي — wipeUserData يكفي عادة عبر البادئة). */
export function clearNotificationPrefs(userId: string): void {
  if (typeof window === 'undefined' || !userId) return
  window.localStorage.removeItem(notificationPrefsKey(userId))
}
