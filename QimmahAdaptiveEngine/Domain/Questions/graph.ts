// Question dependency-graph integrity. Generic bank validation: duplicate ids,
// unknown references, follow-up cycles, unreachable clarify questions (closing
// the legacy L-QST-3 defect class structurally), empty provides (evidence-only
// mandate), priority bounds. Never throws — returns named problems.

import { ordinalCompare } from '../Shared/numeric'
import type { BankConfig, QuestionDef } from './model'

export interface BankProblem {
  kind:
    | 'duplicate_id'
    | 'duplicate_key'
    | 'unknown_followup'
    | 'unknown_conflict_clarify'
    | 'followup_cycle'
    | 'empty_provides'
    | 'bad_priority'
    | 'clarify_unreachable'
    | 'missing_options'
  subject: string
}

export function checkBankIntegrity(bank: readonly QuestionDef[], config: BankConfig): BankProblem[] {
  const problems: BankProblem[] = []
  const ids = new Set<string>()
  const keys = new Set<string>()
  const byId = new Map<string, QuestionDef>()

  for (const q of bank) {
    if (ids.has(q.id)) problems.push({ kind: 'duplicate_id', subject: q.id })
    ids.add(q.id)
    if (keys.has(q.key)) problems.push({ kind: 'duplicate_key', subject: q.key })
    keys.add(q.key)
    byId.set(q.id, q)
    if (q.provides.length === 0) problems.push({ kind: 'empty_provides', subject: q.id })
    if (q.priority < 0 || q.priority > 100) problems.push({ kind: 'bad_priority', subject: q.id })
    if ((q.answerType === 'single' || q.answerType === 'multi') && (!q.options || q.options.length === 0)) {
      problems.push({ kind: 'missing_options', subject: q.id })
    }
    for (const fu of q.followUps ?? []) {
      for (const target of fu.ask) {
        if (!bank.some((b) => b.id === target)) problems.push({ kind: 'unknown_followup', subject: `${q.id}→${target}` })
      }
    }
  }

  for (const c of config.conflicts) {
    if (!byId.has(c.clarifyQuestionId)) {
      problems.push({ kind: 'unknown_conflict_clarify', subject: `${c.id}→${c.clarifyQuestionId}` })
    }
  }

  // Follow-up cycles: deterministic DFS over followUp edges, ids in ordinal order.
  const visiting = new Set<string>()
  const done = new Set<string>()
  const visit = (id: string): boolean => {
    if (done.has(id)) return false
    if (visiting.has(id)) return true
    visiting.add(id)
    const q = byId.get(id)
    let cyclic = false
    for (const fu of q?.followUps ?? []) {
      for (const target of [...fu.ask].sort(ordinalCompare)) {
        if (byId.has(target) && visit(target)) cyclic = true
      }
    }
    visiting.delete(id)
    done.add(id)
    return cyclic
  }
  for (const id of [...ids].sort(ordinalCompare)) {
    if (visit(id)) problems.push({ kind: 'followup_cycle', subject: id })
  }

  // Clarify reachability: clarify-category questions must be reachable via a
  // conflict, a follow-up reference, required status, or safety-clear stage.
  const followUpTargets = new Set(bank.flatMap((q) => (q.followUps ?? []).flatMap((f) => [...f.ask])))
  const conflictClarifies = new Set(config.conflicts.map((c) => c.clarifyQuestionId))
  for (const q of bank) {
    if (q.category !== 'clarify') continue
    const reachable = conflictClarifies.has(q.id) || followUpTargets.has(q.id) || q.required || q.safety === 'clear'
    if (!reachable) problems.push({ kind: 'clarify_unreachable', subject: q.id })
  }

  return problems
}
