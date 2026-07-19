// One-handed reach preference — Qimmah Design Standard v3.0, screen 27. Which
// hand holds the phone during a workout, so the active-session controls sit in
// that thumb's arc and the +/− order mirrors to it. Device-level ergonomics
// (not owner-scoped): it describes the hand, not the account. Framework-free +
// storage-guarded → unit-testable and safe when localStorage is unavailable.

export type Handedness = 'right' | 'left'

const KEY = 'qimmah:handedness'

/** Read the saved reach hand; defaults to 'right' (most common) and on any error. */
export function getHandedness(): Handedness {
  try {
    return localStorage.getItem(KEY) === 'left' ? 'left' : 'right'
  } catch {
    return 'right'
  }
}

/** Persist the reach hand. No-throw on storage failure (stays in memory for the session). */
export function setHandedness(h: Handedness): void {
  try {
    localStorage.setItem(KEY, h)
  } catch {
    /* storage unavailable — caller keeps it in component state */
  }
}

/** Flip helper for the L/R toggle. */
export function otherHand(h: Handedness): Handedness {
  return h === 'left' ? 'right' : 'left'
}
