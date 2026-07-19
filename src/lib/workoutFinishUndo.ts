// Snapshot & restore for the workout-finish undo window (Rule D — "اقترح لا
// تُغيّر"). Finishing a workout now writes only after an explicit confirm, and a
// short undo window can fully reverse that write. Rather than invert each store
// (sessions + exercise history + achievements + summary + sync queue), we
// snapshot every `qimmah:` localStorage entry before the commit and restore it
// on undo — a single, store-agnostic reversal that cannot miss a side effect.
//
// Enumeration uses the Web Storage API (`length`/`key`), so it works in the
// browser and under a shim that implements them (see the finish-confirm proof).

const PREFIX = 'qimmah:'

export type StorageSnapshot = Record<string, string>

/** Capture every `qimmah:` entry so a confirmed save can be fully reversed. */
export function snapshotWorkoutStorage(): StorageSnapshot {
  const snap: StorageSnapshot = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(PREFIX)) continue
      const v = localStorage.getItem(k)
      if (v != null) snap[k] = v
    }
  } catch {
    /* storage unavailable — nothing to snapshot; undo becomes a no-op */
  }
  return snap
}

/**
 * Restore `qimmah:` storage to a prior snapshot: remove keys the commit added,
 * and write back every captured value. Non-`qimmah:` keys are never touched.
 */
export function restoreWorkoutStorage(snap: StorageSnapshot): void {
  try {
    // Collect current qimmah keys first (mutating while enumerating is unsafe).
    const current: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) current.push(k)
    }
    // Drop anything the save introduced that wasn't in the snapshot.
    for (const k of current) {
      if (!(k in snap)) localStorage.removeItem(k)
    }
    // Put every captured value back exactly as it was.
    for (const k of Object.keys(snap)) localStorage.setItem(k, snap[k])
  } catch {
    /* storage unavailable — best-effort; the live React state still reverts */
  }
}
