// تفضيلات التذكير (محلي فقط) — لا تنبيهات نظام، فقط تخزين تفضيل المستخدم.
// دعم التنبيهات الكامل لاحقًا في تطبيق الجوال.

export const REMINDER_PREFS_KEY = 'qimmah:reminders:v1'

export interface ReminderPrefs {
  trainingEnabled: boolean
  trainingTime: string // "HH:MM" 24h
}

const DEFAULT: ReminderPrefs = { trainingEnabled: false, trainingTime: '18:00' }

function isValidTime(t: unknown): t is string {
  return typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t)
}

export function loadReminderPrefs(): ReminderPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT }
  try {
    const raw = window.localStorage.getItem(REMINDER_PREFS_KEY)
    if (!raw) return { ...DEFAULT }
    const p = JSON.parse(raw) as Partial<ReminderPrefs>
    return {
      trainingEnabled: Boolean(p.trainingEnabled),
      trainingTime: isValidTime(p.trainingTime) ? p.trainingTime : DEFAULT.trainingTime,
    }
  } catch {
    return { ...DEFAULT }
  }
}

export function saveReminderPrefs(prefs: ReminderPrefs): void {
  if (typeof window === 'undefined') return
  const safe: ReminderPrefs = {
    trainingEnabled: Boolean(prefs.trainingEnabled),
    trainingTime: isValidTime(prefs.trainingTime) ? prefs.trainingTime : DEFAULT.trainingTime,
  }
  window.localStorage.setItem(REMINDER_PREFS_KEY, JSON.stringify(safe))
}
