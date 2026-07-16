// Last-workout summary — the small owner-scoped local snapshot that backs the
// "last workout" card. Owner scoping mirrors the active-session key
// (qimmah:active-workout:v2:<owner>) so account A's summary can never surface for
// account B on a shared device (isolation finding #7). The scoped key is NOT in
// accountScope's GLOBAL_SAFE_KEYS, so wipeUserData() clears it on account
// switch / sign-out via the prefix-scan allowlist — no wipe-registry edit needed.
import { getLastUser } from '@/lib/accountScope'

const SUMMARY_KEY_BASE = 'qimmah:workout-summary:v2'

export interface WorkoutSummary {
  date: string
  title: string
  totalSets: number
  volume: number
  durationMin: number
}

/** Owner-scoped storage key (guest → `:guest`), matching the active-session pattern. */
export const summaryKey = (ownerId: string | null): string => `${SUMMARY_KEY_BASE}:${ownerId ?? 'guest'}`

/** Persist the last-workout summary for a specific owner. Never throws. */
export function saveWorkoutSummary(ownerId: string | null, summary: WorkoutSummary): void {
  try {
    localStorage.setItem(summaryKey(ownerId), JSON.stringify(summary))
  } catch {
    /* storage full / unavailable — the summary is a convenience, not source of truth */
  }
}

/** Read the last-workout summary for a specific owner, or null. Never throws / never trusts storage. */
export function loadWorkoutSummary(ownerId: string | null): WorkoutSummary | null {
  try {
    const raw = localStorage.getItem(summaryKey(ownerId))
    return raw ? (JSON.parse(raw) as WorkoutSummary) : null
  } catch {
    return null
  }
}

/**
 * One-time migration of the pre-scoping flat `qimmah:workout-summary:v2` value.
 * The flat key predates owner scoping and cannot be safely attributed to an
 * arbitrary account. We hand it to the current owner ONLY when the device's last
 * owner is that same owner (no account switch happened since it was written — a
 * real switch would already have wiped it via reconcileAccountScope). Any other
 * case (a guest context, or a different last owner) is ambiguous and discarded.
 * The flat key is ALWAYS removed so it can never surface for another account.
 */
export function migrateLegacySummary(ownerId: string | null): void {
  if (typeof window === 'undefined') return
  let legacy: string | null = null
  try {
    legacy = localStorage.getItem(SUMMARY_KEY_BASE)
  } catch {
    return
  }
  if (legacy === null) return
  try {
    if (ownerId && getLastUser() === ownerId) {
      const scoped = summaryKey(ownerId)
      if (localStorage.getItem(scoped) === null) localStorage.setItem(scoped, legacy)
    }
    localStorage.removeItem(SUMMARY_KEY_BASE)
  } catch {
    /* storage unavailable — leave as-is, retried on the next mount */
  }
}
