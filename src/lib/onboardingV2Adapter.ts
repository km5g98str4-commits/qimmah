// Adapter: Qimmah v2.1 onboarding (Slice 2B) choices → the existing PlanBuilder
// `Answers` model. Pure and type-safe so the v2 flow reuses the exact same
// downstream plan-generation/persistence as v1 without duplicating any logic.
//
// The v2 flow intentionally asks fewer questions than v1 (no sex/age/body/
// experience/nutrition). Those fall back to `defaultAnswers`; generation is
// safe with them (e.g. undefined experience → the default experience band).

import { defaultAnswers, type Answers } from './planBuilderAnswers'
import type { Environment } from '@/types/onboarding'
import type { V2GoalValue } from '@/design-system/v2/labels'

export type V2Place = 'gym' | 'home' | 'machines'
export type V2Pref = 'machines' | 'free' | 'mixed'

export interface V2OnboardingChoices {
  goal: V2GoalValue | null
  days: number
  duration: number
  place: V2Place | null
  /** Equipment preference — NO existing `Answers` field; collected for UX only. */
  pref: V2Pref | null
  injuries: string[]
  healthDataConsent: boolean
}

/** v2 training place → the closest existing `Environment`. */
const PLACE_TO_ENV: Record<V2Place, Environment> = {
  gym: 'commercial_gym', // نادي — full gym (machines + free weights)
  home: 'home_gym', // منزل — home setup
  machines: 'small_gym', // أجهزة فقط — closest existing (machine-focused, limited)
}

/**
 * Convert v2 onboarding choices into a full `Answers` object. Un-asked fields
 * come from `defaultAnswers`; target weight is derived from the goal the same
 * way v1 does (cut ×0.9, bulk ×1.1, maintain =) so calorie direction is sane.
 *
 * NOTE (documented gap): `choices.pref` (machines/free/mixed) has no field in
 * `Answers`, so it is NOT persisted. We do not invent a backend field.
 */
export function toAnswersFromV2(choices: V2OnboardingChoices): Answers {
  const weightKg = defaultAnswers.weightKg
  const targetWeightKg =
    choices.goal === 'cut'
      ? Math.round(weightKg * 0.9)
      : choices.goal === 'bulk'
        ? Math.round(weightKg * 1.1)
        : weightKg

  return {
    ...defaultAnswers,
    goalValue: choices.goal ?? undefined,
    trainingDays: choices.days,
    daysTouched: true,
    sessionDurationMin: choices.duration,
    environment: choices.place ? PLACE_TO_ENV[choices.place] : undefined,
    injuries: [...choices.injuries],
    healthDataConsent: choices.healthDataConsent,
    targetWeightKg,
    targetTouched: true,
  }
}
