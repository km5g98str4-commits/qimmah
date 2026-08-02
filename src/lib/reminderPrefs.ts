// Compatibility seam for the existing workout-summary/progress controls.
// Storage now lives in the owner-scoped multi-reminder engine.

import { getLastUser } from './accountScope'
import { loadNotificationPrefs, saveNotificationPrefs } from './notifications/prefs'

export const REMINDER_PREFS_KEY = 'qimmah:reminders:v1'

export interface ReminderPrefs {
  trainingEnabled: boolean
  trainingTime: string
}

function ownerId(): string {
  return getLastUser() ?? 'guest'
}

export function loadReminderPrefs(): ReminderPrefs {
  const prefs = loadNotificationPrefs(ownerId())
  return {
    trainingEnabled: prefs.masterEnabled && prefs.workoutDay.enabled,
    trainingTime: prefs.workoutDay.time,
  }
}

export function saveReminderPrefs(next: ReminderPrefs): void {
  const owner = ownerId()
  const prefs = loadNotificationPrefs(owner)
  saveNotificationPrefs(owner, {
    ...prefs,
    masterEnabled: next.trainingEnabled ? true : prefs.masterEnabled,
    workoutDay: { enabled: Boolean(next.trainingEnabled), time: next.trainingTime },
  })
}
