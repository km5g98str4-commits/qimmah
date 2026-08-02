import { Capacitor } from '@capacitor/core'
import type { Lang } from '@/lib/appPreferences'
import { getLastUser } from '@/lib/accountScope'
import { loadNotificationPrefs } from './prefs'
import { readPlanWeek } from './planWeek'
import { allNotificationIds, planNotifications } from './schedule'
import type { NotificationPermission, NotificationSyncState, PlannedNotification } from './types'

interface DesiredRuntime {
  ownerId: string | null
  recoveryActive: boolean
  lang: Lang
  generation: number
}

let runtime: DesiredRuntime = { ownerId: null, recoveryActive: false, lang: 'ar', generation: 0 }
let queue: Promise<NotificationSyncState> = Promise.resolve('inactive')

export function notificationsSupported(): boolean {
  return Capacitor.getPlatform() === 'ios'
}

async function plugin() {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  return LocalNotifications
}

async function cancelKnown(): Promise<void> {
  if (!notificationsSupported()) return
  const localNotifications = await plugin()
  await localNotifications.cancel({ notifications: allNotificationIds().map((id) => ({ id })) })
}

async function schedule(items: PlannedNotification[]): Promise<void> {
  if (!items.length) return
  const localNotifications = await plugin()
  await localNotifications.schedule({
    notifications: items.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      schedule: item.weekday === -1
        ? { on: { hour: item.hour, minute: item.minute }, repeats: true, allowWhileIdle: true }
        : { on: { weekday: item.weekday + 1, hour: item.hour, minute: item.minute }, repeats: true, allowWhileIdle: true },
    })),
  })
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'unsupported'
  try {
    const result = await (await plugin()).requestPermissions()
    return result.display === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

export async function notificationPermissionStatus(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'unsupported'
  try {
    const result = await (await plugin()).checkPermissions()
    return result.display === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

/**
 * Serial owner/recovery reconciliation. Every generation cancels all Qimmah IDs
 * before scheduling the latest owner's allowlisted plan, so an older async call
 * can never re-appear after an account switch.
 */
export function reconcileNotificationSchedule(ownerId: string | null, recoveryActive: boolean, lang: Lang): Promise<NotificationSyncState> {
  const desired: DesiredRuntime = { ownerId, recoveryActive, lang, generation: runtime.generation + 1 }
  runtime = desired
  queue = queue.catch(() => 'error').then(async () => {
    if (!notificationsSupported()) return 'unsupported'
    try {
      await cancelKnown()
      if (desired.generation !== runtime.generation) return 'inactive'
      if (!desired.ownerId || desired.recoveryActive) return 'inactive'
      if (getLastUser() !== desired.ownerId) return 'inactive'
      const prefs = loadNotificationPrefs(desired.ownerId)
      if (!prefs.masterEnabled) return 'inactive'
      const permission = await notificationPermissionStatus()
      if (permission !== 'granted') return 'denied'
      const planned = planNotifications(prefs, readPlanWeek(), desired.lang)
      if (desired.generation !== runtime.generation || runtime.ownerId !== desired.ownerId || runtime.recoveryActive) return 'inactive'
      await schedule(planned)
      return 'scheduled'
    } catch {
      return 'error'
    }
  })
  return queue
}

export function cancelAllNotifications(): Promise<NotificationSyncState> {
  return reconcileNotificationSchedule(null, true, runtime.lang)
}

/** Legacy UI refreshes the already-established runtime; it cannot lower the recovery guard or change owner. */
export function refreshNotificationSchedule(): Promise<NotificationSyncState> {
  return reconcileNotificationSchedule(runtime.ownerId, runtime.recoveryActive, runtime.lang)
}

export function notificationRuntimeSnapshot(): Readonly<DesiredRuntime> {
  return { ...runtime }
}
