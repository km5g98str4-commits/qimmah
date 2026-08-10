// Split generation ([CTO-QAE-014] §3) — PARITY reproduction of the legacy
// splitDays()/splitId(), characterized from src/lib/planGenerator.ts:539-597.
//
// Pure · deterministic · integer-only · locale-independent · timezone-independent.
// No UI strings (the legacy day names are display concerns and stay in the host),
// no question ids, no runtime import of shipping code.
//
// Parity first: no "better" split logic. Every branch below is the legacy
// branch, in the legacy order.

import type { DayKind } from './requirements'

export const TRAINING_SPLIT_POLICY_VERSION = '1.0.0'

/** Legacy MuscleFocus (src/types/profile.ts:25) — display-neutral. */
export type MuscleFocus =
  | 'balanced'
  | 'upper'
  | 'lower'
  | 'core'
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'

export type SplitId =
  | 'gen-fullbody'
  | 'gen-upper-lower-4'
  | 'gen-upper-lower-5'
  | 'gen-ppl-6'
  | 'gen-ppl-7'

export interface SplitPlan {
  splitId: SplitId
  /** ordered day kinds — exactly what assembly consumes */
  daySpecs: readonly { kind: DayKind }[]
  /** the days value actually used after clamping */
  effectiveDays: number
  policyVersion: string
}

/** planGenerator.ts:571 — clamp(days, 1, 7). Non-integers floor toward the range. */
function clampDays(days: number): number {
  if (!Number.isFinite(days)) return 1
  const n = Math.trunc(days)
  return n < 1 ? 1 : n > 7 ? 7 : n
}

/**
 * planGenerator.ts:552-567 — focusDay().
 * NOTE the characterized default: `arms` covers 'arms', 'balanced', and any
 * unknown/absent focus. Only 5-day splits consult it.
 */
export function focusDayKind(focus?: MuscleFocus): DayKind {
  switch (focus) {
    case 'lower':
      return 'lower'
    case 'upper':
    case 'chest':
    case 'back':
    case 'shoulders':
      return 'upper'
    case 'core':
      return 'core'
    case 'arms':
    default:
      return 'arms'
  }
}

/** planGenerator.ts:590-597 — splitId(days). */
export function splitIdFor(days: number): SplitId {
  const d = clampDays(days)
  if (d <= 3) return 'gen-fullbody'
  if (d === 4) return 'gen-upper-lower-4'
  if (d === 5) return 'gen-upper-lower-5'
  if (d === 6) return 'gen-ppl-6'
  return 'gen-ppl-7'
}

/**
 * planGenerator.ts:570-588 — splitDays(days, focus).
 *
 * Characterized branches, verbatim:
 *   d <= 2  → d × full
 *   d === 3 → full, full, full
 *   d === 4 → upper, lower, upper, lower
 *   d === 5 → upper, lower, upper, lower, focusDay(focus)
 *   d === 6 → push, pull, lower, push, pull, lower   (pplDay('legs') ⇒ 'lower')
 *   d === 7 → the 6-day cycle plus a trailing full day
 *
 * A/B implication: repeated kinds are what give assembly its `variation` /
 * `nVar`. A 4-day split yields upper×2 and lower×2, so nVar = 2 for both.
 */
export function generateSplit(days: number, focus?: MuscleFocus): SplitPlan {
  const d = clampDays(days)
  const k = (kind: DayKind): { kind: DayKind } => ({ kind })
  let daySpecs: { kind: DayKind }[]

  if (d <= 2) daySpecs = Array.from({ length: d }, () => k('full'))
  else if (d === 3) daySpecs = [k('full'), k('full'), k('full')]
  else if (d === 4) daySpecs = [k('upper'), k('lower'), k('upper'), k('lower')]
  else if (d === 5) daySpecs = [k('upper'), k('lower'), k('upper'), k('lower'), k(focusDayKind(focus))]
  else if (d === 6) daySpecs = [k('push'), k('pull'), k('lower'), k('push'), k('pull'), k('lower')]
  else daySpecs = [k('push'), k('pull'), k('lower'), k('push'), k('pull'), k('lower'), k('full')]

  return { splitId: splitIdFor(d), daySpecs, effectiveDays: d, policyVersion: TRAINING_SPLIT_POLICY_VERSION }
}
