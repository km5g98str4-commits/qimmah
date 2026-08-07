// Explainability layers ([CTO-QAE-003]): DeveloperReason → AuditReason → UserReason.
// One structured record, three derived surfaces, never mixed. The engine never
// emits user copy: the user layer is reason CODES for the host i18n mapping.

import type { DecisionResult } from './model'

/** DeveloperReason: mechanical camelCase → SCREAMING_SNAKE, one code → one token forever. */
export function developerToken(reasonCode: string): string {
  return reasonCode.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()
}

export interface Explanations {
  developer: string[]
  audit: string[]
  user: string[]
}

/** AuditReason sentences are generated deterministically from structured fields only. */
export function explainDecision(result: DecisionResult): Explanations {
  const developer: string[] = []
  const audit: string[] = []
  const user: string[] = []

  for (const proposal of result.proposals) {
    for (const code of proposal.reasonCodes) {
      developer.push(developerToken(code))
      user.push(code)
    }
    audit.push(
      `Rule ${proposal.ruleId} proposed ${proposal.action.kind} on ${proposal.action.targetVariable} ` +
        `(${proposal.action.direction}, magnitude ${proposal.action.magnitude}, class ${proposal.changeClass}).`,
    )
  }
  for (const s of result.trace.suppressed) {
    for (const code of s.reasonCodes) developer.push(developerToken(code))
    audit.push(`Rule ${s.ruleId} suppressed by ${s.suppressedBy}: ${s.reasonCodes.join(', ')}.`)
  }
  for (const n of result.trace.notFired) {
    audit.push(`Rule ${n.ruleId} did not fire: ${n.reasonCodes.join(', ')}.`)
  }
  for (const g of result.trace.insufficientEvidence) {
    audit.push(`Rule ${g.ruleId} lacked evidence: ${g.gaps.join(', ')}.`)
  }
  return { developer, audit, user }
}
