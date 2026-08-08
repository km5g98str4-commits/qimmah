// QAE Decision Pipeline — domain-agnostic model ([CTO-QAE-003] Phase 2 scope).
// Rules are DECLARATIVE DATA: the pipeline contains zero domain intelligence.
// No nutrition/training/adaptation/question/recovery logic lives here.

import type { Confidence, Now, PriorityClass, ReasonCode } from '../Shared/core'
import type { CompositeComponent } from '../Safety/safetyPolicy'

export const QAE_ENGINE_VERSION = '0.3.0'
/** [CTO-QAE-004] §2: versioned independently of the engine — the Proposal SHAPE can migrate while the engine stays compatible. */
export const DECISION_SCHEMA_VERSION = '1.0.0'

/** Ordered for conflict resolution; index = rank (lower wins). */
export const PRIORITY_CLASS_ORDER: readonly PriorityClass[] = Object.freeze([
  'safety',
  'minorRestriction',
  'injuryRestriction',
  'dataIntegrity',
  'recovery',
  'adherence',
  'goalProgress',
  'optimization',
  'preference',
])

export const CONFIDENCE_ORDER: readonly Confidence[] = Object.freeze(['none', 'low', 'moderate', 'high'])

export type Direction = 'increase' | 'decrease' | 'neutral'
export type ChangeClass = 'major' | 'minor' | 'compositeSafetyRecovery'
export type FactValue = number | string | boolean

export interface EvidenceSeriesMeta {
  metric: string
  validCount: number
  spanDays: number
  confidence: Confidence
}

export interface AdaptationHistoryEntry {
  targetVariable: string
  direction: Direction
  decidedOnDate: string
  outcome: 'accepted' | 'rejected' | 'expired'
}

export interface DecisionRequest {
  now: Now
  seed: number
  oracleVersion: string
  facts: Readonly<Record<string, FactValue>>
  series: readonly EvidenceSeriesMeta[]
  adaptationHistory: readonly AdaptationHistoryEntry[]
}

export interface EvidenceSpec {
  metric: string
  minValidObservations: number
  minSpanDays: number
  minConfidence: Confidence
}

export interface DeclarativeAction {
  kind: string
  targetVariable: string
  direction: Direction
  magnitude: number
  changeClass: ChangeClass
  components?: readonly CompositeComponent[]
}

export type Predicate =
  | { op: 'const'; value: boolean }
  | { op: 'all' | 'any'; children: readonly Predicate[] }
  | { op: 'not'; child: Predicate }
  | { op: 'eq' | 'ne'; path: string; value: FactValue }
  | { op: 'in' | 'nin'; path: string; values: readonly FactValue[] }
  | { op: 'gt' | 'gte' | 'lt' | 'lte'; path: string; value: number }
  // [CTO-QAE-005] additive migration: presence ops needed by the legacy bank's
  // answered/unanswered conditions. exists = the fact path is known.
  | { op: 'exists' | 'notExists'; path: string }

export interface RuleDef {
  ruleId: string
  version: string
  domain: string
  priorityClass: PriorityClass
  priorityScore: number
  preconditions: readonly Predicate[]
  requiredEvidence: readonly EvidenceSpec[]
  action: DeclarativeAction
  reasonCodes: readonly ReasonCode[]
  cooldownDays: number
  safetyImpact: 'none' | 'protective' | 'restrictive'
}

export type RuleOutcome =
  | { kind: 'fired'; ruleId: string }
  | { kind: 'notFired'; ruleId: string; reasonCodes: ReasonCode[] }
  | { kind: 'insufficientEvidence'; ruleId: string; gaps: string[] }

export interface DecisionProvenance {
  origin: string
  pipelineStage: 'resolved' | 'budgeted' | 'safetyScreened'
  engineVersion: string
  decisionSchemaVersion: string
  ruleManifest: string
  oracleVersion: string
  timestamp: number
  seed: number
}

export interface PipelineProposal {
  proposalId: string
  ruleId: string
  action: DeclarativeAction
  priorityClass: PriorityClass
  priorityScore: number
  changeClass: ChangeClass
  reasonCodes: ReasonCode[]
  requiresApproval: boolean
  provenance: DecisionProvenance
}

export interface SuppressionRecord {
  ruleId: string
  suppressedBy: string
  reasonCodes: ReasonCode[]
}

export interface ReasonTrace {
  fired: string[]
  suppressed: SuppressionRecord[]
  notFired: Array<{ ruleId: string; reasonCodes: ReasonCode[] }>
  insufficientEvidence: Array<{ ruleId: string; gaps: string[] }>
}

export interface RuleSetManifest {
  perDomainVersions: Record<string, string>
  contentHash: string
}

export interface DecisionResult {
  proposals: PipelineProposal[]
  trace: ReasonTrace
  manifest: RuleSetManifest
}
