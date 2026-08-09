// QAE AthleteProfile — the frozen contract every downstream engine consumes
// ([CTO-QAE-006]). Downstream engines NEVER read question IDs: they read these
// normalized fields only. Question→field mapping lives in the provenance
// registry (Contracts/profile/athlete-profile-fields.json), which is audit
// metadata — not an engine surface.

import type { Confidence } from '../Shared/core'

export const ATHLETE_PROFILE_SCHEMA_VERSION = '1.0.0'

export type Sex = 'male' | 'female' | 'unspecified'
export type Goal = 'cut' | 'bulk' | 'maintain'
export type Band = 'beginner' | 'intermediate' | 'advanced'
export type ExposureBand = 'none' | 'sporadic' | 'consistent'
export type PlanningClass = 'complete_beginner' | 'beginner' | 'early_intermediate' | 'intermediate' | 'advanced' | 'returning'
export type ReturningStatus = 'active' | 'returning' | 'neverTrained' | 'unknown'
export type WeightTargetStatus = 'collected' | 'notCollected' | 'notApplicableMinor'
export type PregnancyContext = 'pregnant' | 'postpartum' | 'none' | 'notApplicable' | 'unknown'

export interface AthleteProfile {
  schemaVersion: string
  /** incomplete ⇒ no downstream engine may consume this profile for a plan */
  status: 'complete' | 'incomplete'

  identity: {
    /** null = unknown = BLOCKING (U1). Never defaults to adult. */
    ageYears: number | null
    sex: Sex | null
  }

  body: {
    heightMm: number | null
    currentWeightGrams: number | null
    targetWeightGrams: number | null
    /** L-QST-7 contract fix: presence is a STATUS, never an assumption. */
    weightTargetStatus: WeightTargetStatus
  }

  goal: {
    primaryGoal: Goal | null
    secondaryGoal: string | null
    /** minors are folded to maintain here — the one goal downstream engines read */
    effectiveGoal: Goal | null
    minorGoalRestrictions: boolean
  }

  training: {
    experienceLevel: PlanningClass
    experienceBand: {
      trainingKnowledge: Band
      recentTrainingExposure: { band: ExposureBand; monthsSinceConsistent: number }
      currentWorkCapacity: { band: Band; conservative: boolean }
      consistencyHistory: { band: ExposureBand; tenureMonths: number }
    }
    returningStatus: ReturningStatus
    consistency: string | null
    availableDaysPerWeek: number | null
    sessionDurationMinutes: number | null
    environment: string | null
    equipmentCapabilities: Record<string, boolean>
    movementCompetency: {
      overhead: string | null
      hinge: string | null
      squatDepth: string | null
      impact: string | null
      standing: string | null
    }
    trainingHistory: {
      trainedBefore: string | null
      totalMonthsBucket: string | null
      lastTrainedBucket: string | null
      tenureMonths: number
    }
    preferredTrainingStyle: string | null
  }

  safety: {
    injuryAreas: string[]
    pastInjuryAreas: string[]
    painOnMovement: string[]
    /** user-described severity category 0–10 (approved scale) — reported, never diagnosed */
    reportedPainLevel: number | null
    /** reported-area tags for metadata contraindication filtering — evidence, not diagnosis */
    contraindications: string[]
    safetyFlags: string[]
    needsClearance: boolean
    pregnancyContext: PregnancyContext
  }

  lifestyle: {
    baselineStepsBucket: string | null
    /** numeric baseline arrives from OBSERVED data later; questionnaire yields buckets only */
    baselineStepsPerDay: number | null
    baselineStepsConfidence: Confidence
    activityContext: { sittingBucket: string | null }
    sleepBand: string | null
    stressLevel: string | null
    /** Ramadan seam: host-provided only, never inferred ([CTO-QAE-005] §10) */
    fastingContext: { provided: boolean }
  }

  adherence: {
    reported: { value: string | null; confidence: Confidence }
    /** populated by DataQuality from real logs post-launch; structurally present now */
    observed: { value: string | null; confidence: Confidence }
  }

  dataQuality: {
    missingEvidence: string[]
    contradictions: string[]
    confidenceCenti: number
  }
}

/** field → {sources, rule} — audit metadata generated at build time; engines never read it */
export type ProfileProvenance = Record<string, { sources: string[]; rule: string }>

export interface BuiltProfile {
  profile: AthleteProfile
  provenance: ProfileProvenance
}
