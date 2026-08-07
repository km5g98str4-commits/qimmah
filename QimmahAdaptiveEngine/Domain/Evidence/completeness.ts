// Evidence completeness evaluation + missing-evidence detection.
// Generic: specs are data (fieldPaths per named domain); the evaluator knows
// nothing about what any domain or path means.

import type { Confidence } from '../Shared/core'
import { ordinalCompare } from '../Shared/numeric'
import type { FactMap } from './model'

export interface CompletenessSpec {
  /** named group (e.g. a future 'training'/'safety') → required fact paths; names are opaque here */
  perDomain: Readonly<Record<string, readonly string[]>>
  /** paths that BLOCK finalization while missing */
  mandatory: readonly string[]
}

export interface EvidenceGap {
  fieldPath: string
  blocks: string[]
  materiality: number
  candidateQuestionIds: string[]
}

export interface CompletenessResult {
  perDomain: Record<string, Confidence>
  mandatoryMissing: string[]
  complete: boolean
}

export function evaluateCompleteness(spec: CompletenessSpec, facts: FactMap): CompletenessResult {
  const perDomain: Record<string, Confidence> = {}
  for (const domain of Object.keys(spec.perDomain).sort()) {
    const paths = spec.perDomain[domain]
    const present = paths.filter((p) => p in facts).length
    perDomain[domain] =
      paths.length === 0 || present === paths.length
        ? 'high'
        : present === 0
          ? 'none'
          : present * 2 >= paths.length
            ? 'moderate'
            : 'low'
  }
  const mandatoryMissing = spec.mandatory.filter((p) => !(p in facts)).sort(ordinalCompare)
  return { perDomain, mandatoryMissing, complete: mandatoryMissing.length === 0 }
}

export interface QuestionProvider {
  id: string
  provides: readonly string[]
}

/**
 * Missing-evidence detection: which paths are unknown, what they block, and
 * which questions could fill them. Materiality = mandatory(100) or count of
 * blocked domains scaled — a pure structural measure, no domain heuristics.
 */
export function detectGaps(
  spec: CompletenessSpec,
  facts: FactMap,
  providers: readonly QuestionProvider[],
): EvidenceGap[] {
  const blocksByPath = new Map<string, string[]>()
  for (const domain of Object.keys(spec.perDomain).sort()) {
    for (const path of spec.perDomain[domain]) {
      if (path in facts) continue
      const blocks = blocksByPath.get(path) ?? []
      blocks.push(domain)
      blocksByPath.set(path, blocks)
    }
  }
  for (const path of spec.mandatory) {
    if (!(path in facts) && !blocksByPath.has(path)) blocksByPath.set(path, [])
  }
  const gaps: EvidenceGap[] = []
  for (const [fieldPath, blocks] of blocksByPath) {
    const mandatory = spec.mandatory.includes(fieldPath)
    gaps.push({
      fieldPath,
      blocks,
      materiality: mandatory ? 100 : Math.min(90, blocks.length * 30),
      candidateQuestionIds: providers
        .filter((q) => q.provides.includes(fieldPath))
        .map((q) => q.id)
        .sort(ordinalCompare),
    })
  }
  return gaps.sort((a, b) => b.materiality - a.materiality || ordinalCompare(a.fieldPath, b.fieldPath))
}
