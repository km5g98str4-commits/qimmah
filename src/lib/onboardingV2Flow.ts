// Onboarding v2.1 — pure flow logic (Slice 2, async-feedback + a11y upgrades).
//
// Extracted from the OnboardingV2 view so the state machine is deterministic and
// unit-testable without a browser (see scripts/onboarding-async-proof.ts):
//   • per-step validation (which step-specific message to show on Next),
//   • the finalize status reducer (idle → building → error/done, with retry),
//   • owner-scoped draft persistence built on the existing onboarding store.
//
// Draft isolation: draft round-trips through saveDraft/loadDraft in onboarding.ts,
// which stamp an `owner` (account id, or undefined for a pre-auth guest) and
// refuse to hand a draft to a different owner. The draft lives inside
// `qimmah:onboarding:v1`, which is NOT in accountScope's GLOBAL_SAFE_KEYS, so
// wipeUserData() clears it on account switch/sign-out — no accountScope change.

import { loadDraft, saveDraft } from '@/lib/onboarding'
import type { V2GoalValue } from '@/design-system/v2/labels'
import type { V2Place, V2Pref } from '@/lib/onboardingV2Adapter'

/** Allowed answer sets for the training step (mirrored by the view's segmented controls). */
export const DAYS = [3, 4, 5, 6] as const
export const DURATIONS = [30, 45, 60, 75] as const

/** Version stamp for the persisted v2 draft — a shape change bumps this and old drafts are ignored. */
export const DRAFT_VERSION = 3

/** Full resumable state of the v2 onboarding flow. */
export interface OnboardingV2Draft {
  step: number
  goal: V2GoalValue | null
  days: number
  duration: number
  place: V2Place | null
  pref: V2Pref | null
  hasInjury: boolean
  injuries: string[]
  healthDataConsent: boolean
}

/**
 * Resolve the first render's state synchronously. This prevents the persistence
 * effect from overwriting a saved draft with defaults before React applies an
 * asynchronous mount-effect restore.
 */
export function initialDraftV2(userId?: string | null): OnboardingV2Draft {
  return loadDraftV2(userId) ?? {
    step: 0,
    goal: null,
    days: 4,
    duration: 45,
    place: null,
    pref: null,
    hasInjury: false,
    injuries: [],
    healthDataConsent: false,
  }
}

/** Persisted envelope (version + fields) — the shape actually written to storage. */
interface PersistedDraft extends OnboardingV2Draft {
  v: number
}

/** Which step-specific validation message to surface, or null when the step is complete. */
export type StepValidation = 'goal' | 'healthConsent' | 'training' | 'equipment' | null

/** Async plan-assembly status driving the loading / error / done screens. */
export type FinalizeStatus = 'idle' | 'building' | 'error' | 'done'
export type FinalizeAction = 'start' | 'fail' | 'ok' | 'reset'

/**
 * Finalize state machine. `start` covers both the first attempt (idle → building)
 * and a retry after failure (error → building); `fail` and `ok` are terminal-ish.
 */
export function finalizeReduce(status: FinalizeStatus, action: FinalizeAction): FinalizeStatus {
  switch (action) {
    case 'start':
      return status === 'done' ? status : 'building'
    case 'fail':
      return 'error'
    case 'ok':
      return 'done'
    case 'reset':
      return 'idle'
    default:
      return status
  }
}

type Validatable = Pick<OnboardingV2Draft, 'goal' | 'days' | 'duration' | 'place' | 'pref' | 'healthDataConsent'>

/**
 * Validate one step. Returns the step's message key when incomplete, else null.
 * Step 0 needs a goal; step 2 needs place + preference; step 1 (training) is only
 * incomplete if a control was somehow left off its allowed value set.
 */
export function validateStep(step: number, d: Validatable): StepValidation {
  if (step === 0) {
    if (!d.goal) return 'goal'
    return d.healthDataConsent ? null : 'healthConsent'
  }
  if (step === 1) return DAYS.includes(d.days as (typeof DAYS)[number]) && DURATIONS.includes(d.duration as (typeof DURATIONS)[number]) ? null : 'training'
  if (step === 2) return d.place && d.pref ? null : 'equipment'
  return null
}

/** Can the user advance from this step? */
export function canAdvance(step: number, d: Validatable): boolean {
  return validateStep(step, d) === null
}

// ————————————————————— Draft persistence (owner-scoped, hostile-input safe) —————————————————————

/** Strict guard: is this an untrusted value a usable v2 draft of the CURRENT version? */
function isPersistedDraft(value: unknown): value is PersistedDraft {
  if (!value || typeof value !== 'object') return false
  const d = value as Partial<PersistedDraft>
  if (d.v !== DRAFT_VERSION) return false
  if (!Number.isInteger(d.step) || (d.step as number) < 0 || (d.step as number) > 3) return false
  if (d.goal !== null && d.goal !== 'cut' && d.goal !== 'maintain' && d.goal !== 'bulk') return false
  if (typeof d.days !== 'number' || typeof d.duration !== 'number') return false
  if (d.place !== null && typeof d.place !== 'string') return false
  if (d.pref !== null && typeof d.pref !== 'string') return false
  if (typeof d.hasInjury !== 'boolean') return false
  if (typeof d.healthDataConsent !== 'boolean') return false
  if (!Array.isArray(d.injuries) || !d.injuries.every((x) => typeof x === 'string')) return false
  return true
}

/** Persist the current draft for the current owner (account id, or null/undefined guest). */
export function saveDraftV2(draft: OnboardingV2Draft, userId?: string | null): void {
  const payload: PersistedDraft = { v: DRAFT_VERSION, ...draft }
  saveDraft(payload, userId)
}

/**
 * Load the resumable draft for this owner, or undefined. Never trusts storage:
 * a different owner, an older version, or a malformed value all yield undefined.
 */
export function loadDraftV2(userId?: string | null): OnboardingV2Draft | undefined {
  const raw = loadDraft<unknown>(userId)
  if (!isPersistedDraft(raw)) return undefined
  const { v: _v, ...draft } = raw
  void _v
  return draft
}

/** Drop the draft (on successful finish) — resume must not reopen a completed setup. */
export function clearDraftV2(userId?: string | null): void {
  saveDraft(undefined, userId)
}
