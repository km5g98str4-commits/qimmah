import type { MeasurementLog } from '@/types/progress'
import { getMeasurementLogs, saveMeasurementLog as saveMeasurementLogHistory, setMeasurementLogs } from './historyStore'

export function loadLogs(): MeasurementLog[] {
  // historyStore is the canonical source hydrated by syncService. Reading the
  // retired key here made cloud-restored measurements invisible to Progress.
  return getMeasurementLogs()
}

export function saveLogs(logs: MeasurementLog[]): void {
  setMeasurementLogs(logs)
}

/** يضيف سجلًّا جديدًا (الأحدث أولًا) ويعيد القائمة المحدّثة. */
export function addLog(log: MeasurementLog): MeasurementLog[] {
  return saveMeasurementLogHistory(log).slice(0, 200)
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
