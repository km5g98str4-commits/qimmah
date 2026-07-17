export interface HeartRateReading {
  bpm: number
  measuredAt: number
  source: 'watch' | 'health'
}

export const HEART_RATE_EVENT = 'qimmah:heart-rate'
export const HEART_RATE_STALE_MS = 45_000

interface HeartRateBridge {
  start?: () => void | Promise<void>
  stop?: () => void | Promise<void>
  getLatest?: () => unknown | Promise<unknown>
}

declare global {
  interface Window {
    /** Optional native bridge. Heart-rate samples remain ephemeral and are never persisted. */
    QimmahHeartRateBridge?: HeartRateBridge
  }
}

export function elapsedWorkoutSec(startedAt: number, now: number): number {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return 0
  return Math.max(0, Math.floor((now - startedAt) / 1000))
}

export function remainingWorkoutSets(total: number, completed: number): number {
  if (!Number.isFinite(total) || !Number.isFinite(completed)) return 0
  return Math.max(0, Math.floor(total) - Math.max(0, Math.floor(completed)))
}

export function parseHeartRateReading(value: unknown, now: number = Date.now()): HeartRateReading | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as { bpm?: unknown; measuredAt?: unknown; source?: unknown }
  const bpm = typeof candidate.bpm === 'number' ? Math.round(candidate.bpm) : NaN
  const measuredAt = typeof candidate.measuredAt === 'number' ? candidate.measuredAt : now
  if (!Number.isFinite(bpm) || bpm < 30 || bpm > 240) return null
  if (!Number.isFinite(measuredAt) || measuredAt > now + 60_000) return null
  const source = candidate.source === 'health' ? 'health' : 'watch'
  return { bpm, measuredAt, source }
}

export function freshHeartRate(reading: HeartRateReading | null, now: number): HeartRateReading | null {
  if (!reading || now - reading.measuredAt > HEART_RATE_STALE_MS) return null
  return reading
}

/**
 * Starts the optional native/watch stream and listens for validated samples.
 * The web app never invents or stores a reading; without a bridge it remains disconnected.
 */
export function subscribeToHeartRate(onReading: (reading: HeartRateReading) => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  let disposed = false
  const accept = (value: unknown) => {
    const reading = parseHeartRateReading(value)
    if (!disposed && reading) onReading(reading)
  }
  const onEvent = (event: Event) => accept((event as CustomEvent<unknown>).detail)
  window.addEventListener(HEART_RATE_EVENT, onEvent)

  const bridge = window.QimmahHeartRateBridge
  if (bridge?.getLatest) Promise.resolve(bridge.getLatest()).then(accept).catch(() => undefined)
  if (bridge?.start) Promise.resolve(bridge.start()).catch(() => undefined)

  return () => {
    disposed = true
    window.removeEventListener(HEART_RATE_EVENT, onEvent)
    if (bridge?.stop) Promise.resolve(bridge.stop()).catch(() => undefined)
  }
}
