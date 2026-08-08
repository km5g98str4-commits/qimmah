// QAE Evidence model ([CTO-QAE-004] Phase 3 scope).
// A question produces EVIDENCE ONLY — never a decision. Evidence items are the
// sole output of the question engine and the sole input surface for later
// assessment; nothing here knows what any fieldPath MEANS.

import type { Confidence, Now } from '../Shared/core'
import { assertSafeInt } from '../Shared/numeric'

export type FactValue = number | string | boolean

export type EvidenceSource = 'questionnaire' | 'observation' | 'derived' | 'migrated'

export interface EvidenceItem {
  fieldPath: string
  value: FactValue
  source: EvidenceSource
  confidence: Confidence
  recordedAtEpochMs: number
}

export type FactMap = Readonly<Record<string, FactValue>>

/** Fold evidence into a fact map (later items win per path — deterministic order is the caller's contract). */
export function factsFromEvidence(items: readonly EvidenceItem[]): Record<string, FactValue> {
  const facts: Record<string, FactValue> = {}
  for (const item of items) facts[item.fieldPath] = item.value
  return facts
}

export type AnswerValue = number | string | boolean | readonly string[]

export interface AnswerNormalizationSpec {
  /** text/openList added by [CTO-QAE-005] migration (legacy free-text & open-list answers). */
  answerType: 'number' | 'single' | 'boolean' | 'multi' | 'text' | 'openList'
  key: string
  options?: readonly string[]
  range?: { min: number; max: number }
}

export type NormalizationResult =
  | { ok: true; evidence: EvidenceItem[] }
  | { ok: false; error: 'out_of_range' | 'option_not_available' | 'type_mismatch' }

/**
 * Deterministic answer → evidence normalization. Numbers must be safe integers
 * within the declared range; enum answers must be declared options; multi
 * answers emit one boolean fact per selected option (sorted) plus a count —
 * facts stay scalar (NUMERIC-CONTRACT-friendly, predicate-evaluable).
 */
export function normalizeAnswer(spec: AnswerNormalizationSpec, value: AnswerValue, now: Now): NormalizationResult {
  const stamp = (fieldPath: string, v: FactValue): EvidenceItem => ({
    fieldPath,
    value: v,
    source: 'questionnaire',
    confidence: 'high',
    recordedAtEpochMs: now.epochMs,
  })

  switch (spec.answerType) {
    case 'number': {
      if (typeof value !== 'number' || !Number.isSafeInteger(value)) return { ok: false, error: 'type_mismatch' }
      if (spec.range && (value < spec.range.min || value > spec.range.max)) return { ok: false, error: 'out_of_range' }
      assertSafeInt(value, `normalizeAnswer.${spec.key}`)
      return { ok: true, evidence: [stamp(spec.key, value)] }
    }
    case 'boolean': {
      if (typeof value !== 'boolean') return { ok: false, error: 'type_mismatch' }
      return { ok: true, evidence: [stamp(spec.key, value)] }
    }
    case 'single': {
      if (typeof value !== 'string') return { ok: false, error: 'type_mismatch' }
      if (!spec.options?.includes(value)) return { ok: false, error: 'option_not_available' }
      return { ok: true, evidence: [stamp(spec.key, value)] }
    }
    case 'multi': {
      if (!Array.isArray(value)) return { ok: false, error: 'type_mismatch' }
      const selected = [...(value as readonly string[])]
      if (selected.some((v) => typeof v !== 'string' || !spec.options?.includes(v))) {
        return { ok: false, error: 'option_not_available' }
      }
      const unique = [...new Set(selected)].sort()
      return {
        ok: true,
        evidence: [
          ...unique.map((opt) => stamp(`${spec.key}.${opt}`, true)),
          stamp(`${spec.key}.count`, unique.length),
        ],
      }
    }
    case 'text': {
      // Free text: stored verbatim as a string fact. Never parsed for meaning
      // in the domain (the legacy free-text injury regex is a named defect).
      if (typeof value !== 'string') return { ok: false, error: 'type_mismatch' }
      return { ok: true, evidence: [stamp(spec.key, value)] }
    }
    case 'openList': {
      // Open-vocabulary list (e.g. disliked exercise ids): per-item facts +
      // count, sorted/deduped — same shape as multi, no declared options.
      if (!Array.isArray(value)) return { ok: false, error: 'type_mismatch' }
      const items = [...(value as readonly string[])]
      if (items.some((v) => typeof v !== 'string')) return { ok: false, error: 'type_mismatch' }
      const unique = [...new Set(items)].sort()
      return {
        ok: true,
        evidence: [
          ...unique.map((item) => stamp(`${spec.key}.${item}`, true)),
          stamp(`${spec.key}.count`, unique.length),
        ],
      }
    }
  }
}
