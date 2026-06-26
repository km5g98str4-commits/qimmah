import type { MeasurementLog } from '@/types/progress'

// سجلّات القياسات (محلي فقط).

export const MEASUREMENT_LOGS_KEY = 'qimmah:measurementLogs:v1'

export function loadLogs(): MeasurementLog[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(MEASUREMENT_LOGS_KEY)
    return raw ? (JSON.parse(raw) as MeasurementLog[]) : []
  } catch {
    return []
  }
}

export function saveLogs(logs: MeasurementLog[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MEASUREMENT_LOGS_KEY, JSON.stringify(logs))
}

/** يضيف سجلًّا جديدًا (الأحدث أولًا) ويعيد القائمة المحدّثة. */
export function addLog(log: MeasurementLog): MeasurementLog[] {
  const next = [log, ...loadLogs()].slice(0, 200)
  saveLogs(next)
  return next
}

export function deleteLog(id: string): MeasurementLog[] {
  const next = loadLogs().filter((l) => l.id !== id)
  saveLogs(next)
  return next
}

export function latestLog(logs: MeasurementLog[]): MeasurementLog | undefined {
  return logs[0]
}

export type Trend = 'up' | 'down' | 'same' | null

const numOf = (v: string | number | undefined): number => {
  if (v === undefined) return NaN
  const m = String(v).match(/-?[\d.]+/)
  return m ? Number(m[0]) : NaN
}

/** اتجاه القيمة بين آخر سجلّين يحتويان النوع. */
export function trendFor(logs: MeasurementLog[], typeId: string): Trend {
  const withValue = logs.filter((l) => l.values[typeId] !== undefined && l.values[typeId] !== '')
  if (withValue.length < 2) return null
  const current = numOf(withValue[0].values[typeId])
  const previous = numOf(withValue[1].values[typeId])
  if (Number.isNaN(current) || Number.isNaN(previous)) return null
  if (current > previous) return 'up'
  if (current < previous) return 'down'
  return 'same'
}
