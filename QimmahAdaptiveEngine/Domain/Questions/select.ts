// selectNext — the characterized legacy selection order as a generic engine
// (QUESTION-ENGINE.md §4): gate → conflict clarify (off-budget) → required
// (to hardCap) → safety-clear follow-ups (off-budget) → scored remainder with
// queue bonus, satiety penalty, and the info-gain floor past min. All constants
// come from BankConfig data. Pure function of (bank, config, state, facts).

import { evaluatePredicate } from '../Decisions/predicates'
import { ordinalCompare } from '../Shared/numeric'
import type { FactMap } from '../Evidence/model'
import type { BankConfig, FlowBudget, QuestionDef, QuestionSessionState, Selection } from './model'

const wasTouched = (state: QuestionSessionState, id: string): boolean =>
  state.history.some((h) => h.questionId === id && (h.answered || h.skipped))

/** Asked count excludes the clarify category (characterized: clarifications are off-budget). */
export function countedAsked(state: QuestionSessionState, bank: readonly QuestionDef[]): number {
  return state.history.filter((h) => {
    if (!h.answered && !h.skipped) return false
    const q = bank.find((b) => b.id === h.questionId)
    return q !== undefined && q.category !== 'clarify'
  }).length
}

export function budgetFor(config: BankConfig, facts: FactMap): FlowBudget {
  const classKey = config.budgetClassFactPath ? facts[config.budgetClassFactPath] : undefined
  const budget = (typeof classKey === 'string' && config.budgets[classKey]) || config.budgets['*']
  return { min: budget.min, max: budget.max, hardCap: Math.min(budget.hardCap, 20) }
}

function isEligible(q: QuestionDef, state: QuestionSessionState, facts: FactMap): boolean {
  if (wasTouched(state, q.id)) return false
  // Materiality (evidence-only mandate): a question all of whose provided
  // paths are already known produces no new evidence — never asked.
  if (q.provides.every((p) => p in facts)) return false
  if (q.eligible && !evaluatePredicate(q.eligible, facts)) return false
  if (q.skipIf && evaluatePredicate(q.skipIf, facts)) return false
  return true
}

const byRank = (a: QuestionDef, b: QuestionDef): number =>
  b.priority - a.priority || b.infoGain - a.infoGain || ordinalCompare(a.id, b.id)

export function selectNext(
  bank: readonly QuestionDef[],
  config: BankConfig,
  state: QuestionSessionState,
  facts: FactMap,
): Selection {
  // Stage 0 — gate: nothing precedes it; refusal stops the flow.
  if (config.gateQuestionId) {
    const gate = bank.find((q) => q.id === config.gateQuestionId)
    if (gate && facts[gate.key] !== true) {
      if (!wasTouched(state, gate.id)) return { question: gate, stopReason: null, offBudget: true }
      return { question: null, stopReason: 'gate_pending', offBudget: false }
    }
  }

  const ready = bank.filter((q) => isEligible(q, state, facts))

  // Stage 1 — unresolved conflicts' clarification, off-budget, declaration order.
  for (const conflict of config.conflicts) {
    if (state.resolvedConflictIds.includes(conflict.id)) continue
    if (!evaluatePredicate(conflict.detect, facts)) continue
    const clarify = ready.find((q) => q.id === conflict.clarifyQuestionId)
    if (clarify) return { question: clarify, stopReason: null, offBudget: true }
  }

  const budget = budgetFor(config, facts)
  const asked = countedAsked(state, bank)

  // Stage 2 — mandatory incomplete, up to hardCap.
  const required = ready.filter((q) => q.required).sort(byRank)
  if (required.length > 0 && asked < budget.hardCap) {
    return { question: required[0], stopReason: null, offBudget: false }
  }
  if (asked >= budget.hardCap) return { question: null, stopReason: 'cap_reached', offBudget: false }

  // Stage 2.5 — open safety follow-ups: off-budget relative to the soft max.
  const safetyClear = ready.filter((q) => q.safety === 'clear').sort(byRank)
  if (safetyClear.length > 0) return { question: safetyClear[0], stopReason: null, offBudget: true }

  if (asked >= budget.max) return { question: null, stopReason: 'complete', offBudget: false }

  // Stage 3 — scored remainder (clarify never scored).
  const answeredPerCategory = new Map<string, number>()
  for (const h of state.history) {
    if (!h.answered) continue
    const q = bank.find((b) => b.id === h.questionId)
    if (!q) continue
    answeredPerCategory.set(q.category, (answeredPerCategory.get(q.category) ?? 0) + 1)
  }
  const queued = new Set(state.queue)
  const effective = (q: QuestionDef): number => {
    const bonus = queued.has(q.id) ? config.scoring.queueBonus : 0
    const glut = config.scoring.exemptCategories.includes(q.category)
      ? 0
      : (answeredPerCategory.get(q.category) ?? 0) * config.scoring.satietyPenaltyPerAnswered
    return q.priority + bonus - glut
  }
  const rest = ready
    .filter((q) => q.category !== 'clarify')
    .sort((a, b) => effective(b) - effective(a) || b.infoGain - a.infoGain || ordinalCompare(a.id, b.id))
  if (rest.length === 0) return { question: null, stopReason: 'exhausted', offBudget: false }

  if (asked >= budget.min) {
    const worthwhile = rest.filter((q) => q.infoGain >= config.scoring.minInfoGainPastMin)
    if (worthwhile.length === 0) return { question: null, stopReason: 'complete', offBudget: false }
    return { question: worthwhile[0], stopReason: null, offBudget: false }
  }
  return { question: rest[0], stopReason: null, offBudget: false }
}
