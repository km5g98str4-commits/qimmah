import { Capacitor, registerPlugin } from '@capacitor/core'
import { ingestExternalSteps, type DaySteps } from './stepCounter'

export type HealthKitPermission = 'not-determined' | 'authorized' | 'denied' | 'unavailable'

export interface HealthKitDailyTotal {
  date: string
  steps: number
}

interface HealthKitStepsPlugin {
  isAvailable(): Promise<{ available: boolean }>
  requestAuthorization(): Promise<{ permission: HealthKitPermission }>
  getDailySteps(options: { days: number }): Promise<{ permission: HealthKitPermission; days: HealthKitDailyTotal[] }>
}

export interface HealthKitSyncResult {
  permission: HealthKitPermission
  days: DaySteps[]
  today: number
}

export const HEALTHKIT_PREF_KEY = 'qimmah:healthkit:v1'
const HealthKitSteps = registerPlugin<HealthKitStepsPlugin>('HealthKitSteps')

export function isHealthKitPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}

export function isHealthKitEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return JSON.parse(window.localStorage.getItem(HEALTHKIT_PREF_KEY) ?? '{}').enabled === true
  } catch {
    return false
  }
}

function saveHealthKitState(enabled: boolean, permission: HealthKitPermission): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(HEALTHKIT_PREF_KEY, JSON.stringify({ enabled, permission }))
}

function ingestDays(days: HealthKitDailyTotal[]): DaySteps[] {
  const ingested = days.map((day) => ingestExternalSteps({ date: day.date, steps: day.steps, source: 'healthkit' }))
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('qimmah:steps-updated'))
  return ingested
}

/** Explicit settings action: this is the only function allowed to request HealthKit permission. */
export async function connectHealthKit(
  plugin: HealthKitStepsPlugin = HealthKitSteps,
  nativeHealthKit = isHealthKitPlatform(),
): Promise<HealthKitSyncResult> {
  if (!nativeHealthKit) return { permission: 'unavailable', days: [], today: 0 }
  const capability = await plugin.isAvailable()
  if (!capability.available) return { permission: 'unavailable', days: [], today: 0 }

  const authorization = await plugin.requestAuthorization()
  if (authorization.permission !== 'authorized') {
    saveHealthKitState(false, authorization.permission)
    return { permission: authorization.permission, days: [], today: 0 }
  }

  const result = await plugin.getDailySteps({ days: 14 })
  if (result.permission !== 'authorized') {
    saveHealthKitState(false, result.permission)
    return { permission: result.permission, days: [], today: 0 }
  }
  const days = ingestDays(result.days)
  saveHealthKitState(true, 'authorized')
  return { permission: 'authorized', days, today: days.at(-1)?.steps ?? 0 }
}

/** Startup refresh after prior opt-in. It never calls requestAuthorization. */
export async function refreshHealthKitStepsIfEnabled(
  plugin: HealthKitStepsPlugin = HealthKitSteps,
  nativeHealthKit = isHealthKitPlatform(),
): Promise<HealthKitSyncResult | null> {
  if (!nativeHealthKit || !isHealthKitEnabled()) return null
  try {
    const result = await plugin.getDailySteps({ days: 14 })
    if (result.permission !== 'authorized') {
      saveHealthKitState(false, result.permission)
      return { permission: result.permission, days: [], today: 0 }
    }
    const days = ingestDays(result.days)
    return { permission: 'authorized', days, today: days.at(-1)?.steps ?? 0 }
  } catch {
    return { permission: 'denied', days: [], today: 0 }
  }
}
