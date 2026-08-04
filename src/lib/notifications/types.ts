export type ReminderKind = 'workoutDay' | 'restDay' | 'water' | 'weeklyBrief' | 'supplements' | 'restEnd'

export interface QuietHours {
  /** Start of the do-not-disturb window, HH:MM. */
  start: string
  /** End of the do-not-disturb window, HH:MM. */
  end: string
}

export interface NotificationPrefs {
  version: 1
  masterEnabled: boolean
  quietHours: QuietHours
  workoutDay: { enabled: boolean; time: string }
  restDay: { enabled: boolean; time: string }
  water: { enabled: boolean; cadenceHours: number }
  weeklyBrief: { enabled: boolean; weekday: number; time: string }
  supplements: { enabled: boolean; time: string }
}

export interface PlanWeekday {
  /** JavaScript weekday: 0=Sunday … 6=Saturday. */
  weekday: number
  isRestDay: boolean
  title: string | null
}

export type PlanWeek = PlanWeekday[] | null

export interface PlannedNotification {
  id: number
  kind: ReminderKind
  title: string
  body: string
  /** -1 means daily; otherwise JavaScript weekday. */
  weekday: number
  hour: number
  minute: number
}

export type NotificationPermission = 'granted' | 'denied' | 'unsupported'
export type NotificationSyncState = 'unsupported' | 'inactive' | 'denied' | 'scheduled' | 'error'

