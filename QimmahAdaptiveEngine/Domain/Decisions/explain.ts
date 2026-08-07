// Explainability layers ([CTO-QAE-003]/[CTO-QAE-004]): DeveloperReason is the
// SINGLE SOURCE. Audit and User layers are DERIVED from the developer-level
// record — never authored independently — so the layers can never disagree.
// The engine never emits user copy: the user layer is reason CODES for host i18n.

import type { DecisionResult } from './model'

/** DeveloperReason token: mechanical camelCase → SCREAMING_SNAKE, one code → one token forever. */
export function developerToken(reasonCode: string): string {
  return reasonCode.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()
}

/** The single-source record every layer derives from. */
export interface DeveloperReasonEntry {
  token: string
  code: string
  subject: string
  event: 'proposed' | 'suppressed' | 'notFired' | 'insufficientEvidence'
  detail: string
}

export interface Explanations {
  /** Layer 1 — the source. */
  developerEntries: DeveloperReasonEntry[]
  developer: string[]
  /** Layer 2 — derived: deterministic structured sentences from entry fields. */
  audit: string[]
  /** Layer 3 — derived: the codes of user-relevant entries, for host i18n mapping. */
  user: string[]
}

function auditSentence(e: DeveloperReasonEntry): string {
  switch (e.event) {
    case 'proposed':
      return `Rule ${e.subject} proposed: ${e.detail} [${e.token}].`
    case 'suppressed':
      return `Rule ${e.subject} suppressed ${e.detail} [${e.token}].`
    case 'notFired':
      return `Rule ${e.subject} did not fire [${e.token}].`
    case 'insufficientEvidence':
      return `Rule ${e.subject} lacked evidence: ${e.detail}.`
  }
}

export function explainDecision(result: DecisionResult): Explanations {
  // Build the single source first; every other layer is a projection of it.
  const entries: DeveloperReasonEntry[] = []

  for (const proposal of result.proposals) {
    for (const code of proposal.reasonCodes) {
      entries.push({
        token: developerToken(code),
        code,
        subject: proposal.ruleId,
        event: 'proposed',
        detail:
          `${proposal.action.kind} on ${proposal.action.targetVariable} ` +
          `(${proposal.action.direction}, magnitude ${proposal.action.magnitude}, class ${proposal.changeClass})`,
      })
    }
  }
  for (const s of result.trace.suppressed) {
    for (const code of s.reasonCodes) {
      entries.push({ token: developerToken(code), code, subject: s.ruleId, event: 'suppressed', detail: `by ${s.suppressedBy}` })
    }
  }
  for (const n of result.trace.notFired) {
    for (const code of n.reasonCodes) {
      entries.push({ token: developerToken(code), code, subject: n.ruleId, event: 'notFired', detail: '' })
    }
  }
  for (const g of result.trace.insufficientEvidence) {
    entries.push({
      token: developerToken('insufficientEvidence'),
      code: 'insufficientEvidence',
      subject: g.ruleId,
      event: 'insufficientEvidence',
      detail: g.gaps.join(', '),
    })
  }

  return {
    developerEntries: entries,
    developer: entries.map((e) => e.token),
    audit: entries.map(auditSentence),
    user: entries.filter((e) => e.event === 'proposed').map((e) => e.code),
  }
}
