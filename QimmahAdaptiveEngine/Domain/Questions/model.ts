// QAE Question Engine foundation — generic model ([CTO-QAE-004] Phase 3 scope).
// Questions are DECLARATIVE DATA; the engine knows no domain. A question's only
// output is evidence (Domain/Evidence). Selection mechanics adopt the
// characterized legacy semantics (QUESTION-ENGINE.md §4) with all constants
// supplied as config data — [CTO-QAE-002] U5 budgets are the defaults.

import type { Predicate } from '../Decisions/model'
import type { AnswerValue } from '../Evidence/model'

export type QuestionSafety = 'none' | 'screen' | 'restrict' | 'clear'

export interface QuestionDef {
  id: string
  key: string
  /** host copy reference — Arabic/English strings NEVER live in domain content ([CTO-QAE-005] §11) */
  copyKey?: string
  category: string
  answerType: 'number' | 'single' | 'boolean' | 'multi' | 'text' | 'openList'
  options?: readonly string[]
  range?: { min: number; max: number }
  /** [CTO-QAE-006] §5: selection-count constraints (legacy select semantics preserved). */
  select?: { min?: number; max?: number }
  eligible?: Predicate
  skipIf?: Predicate
  followUps?: ReadonlyArray<{ when: Predicate; ask: readonly string[] }>
  /** fact paths this question fills — MUST be non-empty (evidence-only mandate) */
  provides: readonly string[]
  safety: QuestionSafety
  priority: number
  required: boolean
  skippable: boolean
  infoGain: number
  sinceBankVersion: number
}

export interface ConflictDef {
  id: string
  detect: Predicate
  clarifyQuestionId: string
}

export interface FlowBudget {
  min: number
  max: number
  hardCap: number
}

export interface BankConfig {
  /** answered-true fact path gating everything (e.g. a consent analog); optional */
  gateQuestionId?: string
  conflicts: readonly ConflictDef[]
  /** budget selected by an opaque class fact; fallback key '*' */
  budgets: Readonly<Record<string, FlowBudget>>
  budgetClassFactPath?: string
  scoring: {
    queueBonus: number
    satietyPenaltyPerAnswered: number
    exemptCategories: readonly string[]
    minInfoGainPastMin: number
  }
}

/**
 * [CTO-QAE-002] U5 — the CTO budget numbers as PRODUCT_POLICY default data
 * (≈15 initial adaptive questions; hard cap 20). Content-agnostic keys.
 */
export const CTO_DEFAULT_BUDGETS: Readonly<Record<string, FlowBudget>> = Object.freeze({
  '*': Object.freeze({ min: 13, max: 16, hardCap: 20 }),
})

export const DEFAULT_SCORING: BankConfig['scoring'] = Object.freeze({
  queueBonus: 15,
  satietyPenaltyPerAnswered: 6,
  exemptCategories: Object.freeze(['basics', 'safety', 'limitations', 'clarify']) as readonly string[],
  minInfoGainPastMin: 5,
})

export interface AskRecord {
  questionId: string
  answered: boolean
  skipped: boolean
}

export interface QuestionSessionState {
  answers: Readonly<Record<string, AnswerValue>>
  history: readonly AskRecord[]
  queue: readonly string[]
  resolvedConflictIds: readonly string[]
}

export const EMPTY_SESSION: QuestionSessionState = Object.freeze({
  answers: Object.freeze({}),
  history: Object.freeze([]),
  queue: Object.freeze([]),
  resolvedConflictIds: Object.freeze([]),
})

export type StopReason = 'complete' | 'cap_reached' | 'exhausted' | 'gate_pending'

export interface Selection {
  question: QuestionDef | null
  stopReason: StopReason | null
  offBudget: boolean
  /** [CTO-QAE-005] §8: safety clarification exceeding the soft budget is recorded, never hidden. */
  budgetOverrideReason?: 'safetyEvidenceRequired'
}
