/**
 * Format a duration in seconds as `m:ss` (or `h:mm:ss` once past an hour).
 * Shared by the v2 workout surfaces (live dashboard elapsed clock + rest timer)
 * so the two never drift. Negative/NaN inputs clamp to `0:00`.
 */
export function formatDuration(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const secs = safe % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`
}
