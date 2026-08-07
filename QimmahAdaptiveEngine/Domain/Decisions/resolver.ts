// QAE DecisionResolver — the locked runtime pipeline ([CTO-QAE-002]/[CTO-QAE-003]):
//   Evidence → Candidate Rules → Safety → Conflict Resolution → Change Budget → Proposal
// Pure function of its inputs. No system time, no randomness, no mutable module
// state, no side effects. Every rejection carries a reason code; every proposal
// carries complete provenance and is runtime-sealed.

import type { Confidence, ReasonCode } from '../Shared/core'
import { ordinalCompare } from '../Shared/numeric'
import { localDate, localDateToDays } from '../Shared/time'
import { checkComposite } from '../Safety/safetyPolicy'
import { evaluatePredicate } from './predicates'
import { buildManifest } from './manifest'
import {
  CONFIDENCE_ORDER,
  PRIORITY_CLASS_ORDER,
  QAE_ENGINE_VERSION,
  type DecisionRequest,
  type DecisionResult,
  type PipelineProposal,
  type ReasonTrace,
  type RuleDef,
  type RuleSetManifest,
  type SuppressionRecord,
} from './model'

const KEEP_PLAN_ORIGIN = 'QAE-DEC-000'

// Runtime seal (layer 2 of three — DECISION_PROVENANCE.md §3).
const sealedProposals = new WeakSet<object>()

export function assertPipelineProposal(proposal: object): void {
  if (!sealedProposals.has(proposal)) {
    throw new Error('QAE-PROVENANCE-BYPASS: proposal was not issued by the DecisionResolver')
  }
}

const confidenceRank = (c: Confidence): number => CONFIDENCE_ORDER.indexOf(c)
const classRank = (c: RuleDef['priorityClass']): number => PRIORITY_CLASS_ORDER.indexOf(c)

/** Total ordering: class rank, then score desc, then ruleId ordinal (NUMERIC-CONTRACT §3). */
export function compareRules(a: RuleDef, b: RuleDef): number {
  const byClass = classRank(a.priorityClass) - classRank(b.priorityClass)
  if (byClass !== 0) return byClass
  if (a.priorityScore !== b.priorityScore) return b.priorityScore - a.priorityScore
  return ordinalCompare(a.ruleId, b.ruleId)
}

export interface SingleRuleEvaluation {
  status: 'fired' | 'notFired' | 'insufficientEvidence'
  reasonCodes: ReasonCode[]
  gaps: string[]
}

/** Every rule is individually testable through this single generic evaluator. */
export function evaluateRule(rule: RuleDef, request: DecisionRequest): SingleRuleEvaluation {
  const gaps: string[] = []
  for (const spec of rule.requiredEvidence) {
    const meta = request.series.find((s) => s.metric === spec.metric)
    if (!meta) {
      gaps.push(`${spec.metric}:missing`)
      continue
    }
    if (meta.validCount < spec.minValidObservations) gaps.push(`${spec.metric}:validCount<${spec.minValidObservations}`)
    if (meta.spanDays < spec.minSpanDays) gaps.push(`${spec.metric}:spanDays<${spec.minSpanDays}`)
    if (confidenceRank(meta.confidence) < confidenceRank(spec.minConfidence)) {
      gaps.push(`${spec.metric}:confidence<${spec.minConfidence}`)
    }
  }
  if (gaps.length > 0) return { status: 'insufficientEvidence', reasonCodes: ['insufficientEvidence'], gaps }
  const pass = rule.preconditions.every((p) => evaluatePredicate(p, request.facts))
  if (!pass) return { status: 'notFired', reasonCodes: ['preconditionNotMet'], gaps: [] }
  return { status: 'fired', reasonCodes: [...rule.reasonCodes], gaps: [] }
}

function daysBetween(dateA: string, dateB: string): number {
  return Math.abs(localDateToDays(dateB) - localDateToDays(dateA))
}

export function resolve(
  request: DecisionRequest,
  rules: readonly RuleDef[],
  perDomainVersions: Record<string, string>,
): DecisionResult {
  const manifest: RuleSetManifest = buildManifest(rules, perDomainVersions)
  const today = localDate(request.now.epochMs, request.now.tzOffsetMinutes)

  const trace: ReasonTrace = { fired: [], suppressed: [], notFired: [], insufficientEvidence: [] }
  const ordered = [...rules].sort(compareRules)

  // 1–2 · Evidence gates + candidate rule generation.
  const candidates: RuleDef[] = []
  for (const rule of ordered) {
    const ev = evaluateRule(rule, request)
    if (ev.status === 'fired') {
      trace.fired.push(rule.ruleId)
      candidates.push(rule)
    } else if (ev.status === 'notFired') {
      trace.notFired.push({ ruleId: rule.ruleId, reasonCodes: ev.reasonCodes })
    } else {
      trace.insufficientEvidence.push({ ruleId: rule.ruleId, gaps: ev.gaps })
    }
  }

  const suppress = (rule: RuleDef, by: string, codes: ReasonCode[]): void => {
    const record: SuppressionRecord = { ruleId: rule.ruleId, suppressedBy: by, reasonCodes: codes }
    trace.suppressed.push(record)
  }

  // 3 · Safety screen: composite legality (fixed component order is preserved as declared).
  const screened: RuleDef[] = []
  for (const rule of candidates) {
    if (rule.action.changeClass === 'compositeSafetyRecovery') {
      const legal = checkComposite(rule.action.components ?? [])
      if (!legal.allowed) {
        suppress(rule, 'QAE-SAF-COMPOSITE', legal.reasonCodes)
        continue
      }
    }
    screened.push(rule)
  }

  // 4 · Same-variable conflict resolution (ordered list ⇒ first wins).
  const winnersByVariable = new Map<string, RuleDef>()
  for (const rule of screened) {
    const existing = winnersByVariable.get(rule.action.targetVariable)
    if (existing) {
      suppress(rule, existing.ruleId, ['conflictResolvedByPriority'])
    } else {
      winnersByVariable.set(rule.action.targetVariable, rule)
    }
  }

  // 5 · Cooldowns (accepted AND rejected count — the engine does not re-nag).
  const afterCooldown: RuleDef[] = []
  for (const rule of winnersByVariable.values()) {
    let suppressed = false
    for (const entry of request.adaptationHistory) {
      if (entry.targetVariable !== rule.action.targetVariable) continue
      const age = daysBetween(entry.decidedOnDate, today)
      if (entry.outcome === 'accepted' && age < rule.cooldownDays) {
        suppress(rule, 'QAE-DEC-COOLDOWN', ['cooldownActive'])
        suppressed = true
        break
      }
      if (entry.outcome === 'rejected' && entry.direction === rule.action.direction && age < rule.cooldownDays) {
        suppress(rule, 'QAE-DEC-COOLDOWN', ['proposalRejectedCooldown'])
        suppressed = true
        break
      }
    }
    if (!suppressed) afterCooldown.push(rule)
  }

  // 6 · Change budget: ≤1 major-or-composite + ≤1 minor ([CTO-QAE-001] §5).
  const accepted: RuleDef[] = []
  let majorUsed = false
  let minorUsed = false
  for (const rule of afterCooldown) {
    const isMajor = rule.action.changeClass === 'major' || rule.action.changeClass === 'compositeSafetyRecovery'
    if (isMajor) {
      if (majorUsed) {
        suppress(rule, 'QAE-DEC-BUDGET', ['changeBudgetExhausted'])
        continue
      }
      majorUsed = true
    } else {
      if (minorUsed) {
        suppress(rule, 'QAE-DEC-BUDGET', ['changeBudgetExhausted'])
        continue
      }
      minorUsed = true
    }
    accepted.push(rule)
  }

  // 7 · Proposals with complete provenance (all fields mandatory).
  const provenanceFor = (origin: string): PipelineProposal['provenance'] => ({
    origin,
    pipelineStage: 'budgeted',
    engineVersion: QAE_ENGINE_VERSION,
    ruleManifest: manifest.contentHash,
    oracleVersion: request.oracleVersion,
    timestamp: request.now.epochMs,
    seed: request.seed,
  })

  const proposals: PipelineProposal[] = accepted.map((rule) => {
    const proposal: PipelineProposal = {
      proposalId: `p-${rule.ruleId}-${manifest.contentHash.slice(0, 8)}`,
      ruleId: rule.ruleId,
      action: rule.action,
      priorityClass: rule.priorityClass,
      priorityScore: rule.priorityScore,
      changeClass: rule.action.changeClass,
      reasonCodes: [...rule.reasonCodes],
      requiresApproval: true,
      provenance: provenanceFor(rule.ruleId),
    }
    sealedProposals.add(proposal)
    return proposal
  })

  // keepPlan is a first-class, explained outcome — never an absence of output.
  if (proposals.length === 0) {
    const strongest = trace.suppressed[0]?.reasonCodes ?? trace.notFired[0]?.reasonCodes ?? []
    const keep: PipelineProposal = {
      proposalId: `p-${KEEP_PLAN_ORIGIN}-${manifest.contentHash.slice(0, 8)}`,
      ruleId: KEEP_PLAN_ORIGIN,
      action: { kind: 'keepPlan', targetVariable: 'none', direction: 'neutral', magnitude: 0, changeClass: 'minor' },
      priorityClass: 'optimization',
      priorityScore: 0,
      changeClass: 'minor',
      reasonCodes: ['noCandidateFired', ...strongest],
      requiresApproval: false,
      provenance: provenanceFor(KEEP_PLAN_ORIGIN),
    }
    sealedProposals.add(keep)
    proposals.push(keep)
  }

  return { proposals, trace, manifest }
}
