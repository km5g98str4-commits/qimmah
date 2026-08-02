import type { MeasurementLog } from '@/types/progress'
import { getMeasurementLogs, saveMeasurementLog as saveMeasurementLogHistory, setMeasurementLogs } from './historyStore'
import { getDayStamp } from './today'

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

// ── Apple Health weight import ─────────────────────────────────────────────
// Weight is manual by default. An imported sample is stored as a separate log
// keyed by its day and tagged `source: 'health'` so it can be labeled and
// removed on disconnect without ever touching the user's manual entries.

/** Deterministic id per day so re-importing updates the same entry instead of duplicating. */
function healthWeightId(dayStamp: string): string {
  return `health-weight-${dayStamp}`
}

/** Upserts the latest Health-sourced weight (kg) for the day of `isoDate`. */
export function importHealthWeight(kg: number, isoDate: string): MeasurementLog {
  const parsed = new Date(isoDate)
  const dayStamp = Number.isNaN(parsed.getTime()) ? getDayStamp() : getDayStamp(parsed)
  const value = Math.round(kg * 10) / 10
  const entry: MeasurementLog = {
    id: healthWeightId(dayStamp),
    date: dayStamp,
    values: { weightKg: value },
    source: 'health',
  }
  const rest = loadLogs().filter((l) => l.id !== entry.id)
  saveLogs([entry, ...rest])
  return entry
}

/** Removes every Health-imported weight log; leaves manual entries intact. */
export function removeHealthWeight(): MeasurementLog[] {
  const next = loadLogs().filter((l) => l.source !== 'health')
  saveLogs(next)
  return next
}

/** Most recent Health-imported weight log, or undefined when none exist. */
export function latestWeightImport(): MeasurementLog | undefined {
  return loadLogs()
    .filter((l) => l.source === 'health' && l.values.weightKg !== undefined && l.values.weightKg !== '')
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
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
