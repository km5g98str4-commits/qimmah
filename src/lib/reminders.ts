// Compatibility API for existing workout/progress surfaces. The implementation
// delegates to the owner-scoped notification engine so legacy callers cannot
// create a second schedule or bypass account/recovery reconciliation.

import {
  cancelAllNotifications,
  notificationPermissionStatus,
  notificationsSupported,
  refreshNotificationSchedule,
  requestNotificationPermission,
  type NotificationPermission,
} from './notifications'

export type ReminderPermission = NotificationPermission

export function remindersSupported(): boolean {
  return notificationsSupported()
}

export function requestReminderPermission(): Promise<ReminderPermission> {
  return requestNotificationPermission()
}

export function reminderPermissionStatus(): Promise<ReminderPermission> {
  return notificationPermissionStatus()
}

export function syncWorkoutReminder(): Promise<unknown> {
  return refreshNotificationSchedule()
}

export function cancelAllReminders(): Promise<unknown> {
  return cancelAllNotifications()
}
