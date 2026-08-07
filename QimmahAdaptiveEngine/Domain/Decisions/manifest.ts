// Rule-set manifest: content-addressed identity of the exact rules in force.
// A matching hash IS the rule set (DECISION_PROVENANCE.md §4).

import { canonicalSerialize } from '../Shared/canonical'
import { sha256Hex } from '../Shared/sha256'
import type { RuleDef, RuleSetManifest } from './model'

export function buildManifest(rules: readonly RuleDef[], perDomainVersions: Record<string, string>): RuleSetManifest {
  const body = canonicalSerialize({
    perDomainVersions,
    rules: [...rules]
      .sort((a, b) => (a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0))
      .map((r) => ({
        ruleId: r.ruleId,
        version: r.version,
        domain: r.domain,
        priorityClass: r.priorityClass,
        priorityScore: r.priorityScore,
        preconditions: r.preconditions,
        requiredEvidence: r.requiredEvidence,
        action: r.action,
        reasonCodes: r.reasonCodes,
        cooldownDays: r.cooldownDays,
        safetyImpact: r.safetyImpact,
      })),
  })
  return { perDomainVersions, contentHash: sha256Hex(body) }
}
