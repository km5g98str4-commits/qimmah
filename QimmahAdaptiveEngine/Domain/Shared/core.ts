// QAE canonical core types — the executable mirror of Contracts/schemas/core.schema.json.
// Closed unions; extending any of them is a versioned rule-set change.

export type Sex = 'male' | 'female' | 'unspecified'
export type GoalType = 'cut' | 'bulk' | 'maintain'
export type Confidence = 'none' | 'low' | 'moderate' | 'high'

export type PriorityClass =
  | 'safety'
  | 'minorRestriction'
  | 'injuryRestriction'
  | 'dataIntegrity'
  | 'recovery'
  | 'adherence'
  | 'goalProgress'
  | 'optimization'
  | 'preference'

export type ReasonCode = string

export interface Now {
  epochMs: number
  tzOffsetMinutes: number
}

export interface ReviewPeriod {
  startDate: string
  endDate: string
}

export interface RuleSetManifest {
  perDomainVersions: Record<string, string>
  contentHash: string
}

// Age policy constants — characterized live policy adopted per [CTO-QAE-002] U1/§6.
// App minimum mirrors src/config/profileDomain.ts AGE_RANGE.min; adult line mirrors
// src/lib/calculators.ts ADULT_MIN_AGE. One policy, several enforcement points.
export const APP_MIN_AGE_YEARS = 13
export const ADULT_MIN_AGE_YEARS = 18
