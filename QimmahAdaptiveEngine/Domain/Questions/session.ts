// Question session — pure functional state transitions: answer application
// (→ evidence emission), follow-up queueing, conflict resolution recording,
// revision with orphan pruning to fixpoint, and full-session replay.
// A session's ONLY product is evidence; no decision types exist here.

import type { Now } from '../Shared/core'
import { evaluatePredicate } from '../Decisions/predicates'
import {
  factsFromEvidence,
  normalizeAnswer,
  type AnswerValue,
  type EvidenceItem,
  type FactMap,
} from '../Evidence/model'
import type { BankConfig, QuestionDef, QuestionSessionState } from './model'

export interface SessionView {
  state: QuestionSessionState
  evidence: EvidenceItem[]
  facts: FactMap
}

export function evidenceFor(bank: readonly QuestionDef[], state: QuestionSessionState, now: Now): EvidenceItem[] {
  const items: EvidenceItem[] = []
  for (const record of state.history) {
    if (!record.answered) continue
    const q = bank.find((b) => b.id === record.questionId)
    if (!q) continue
    const answer = state.answers[q.id]
    if (answer === undefined) continue
    const normalized = normalizeAnswer(
      { answerType: q.answerType, key: q.key, options: q.options, range: q.range, select: q.select },
      answer,
      now,
    )
    if (normalized.ok) items.push(...normalized.evidence)
  }
  return items
}

export function viewOf(bank: readonly QuestionDef[], state: QuestionSessionState, now: Now): SessionView {
  const evidence = evidenceFor(bank, state, now)
  return { state, evidence, facts: factsFromEvidence(evidence) }
}

export type AnswerResult =
  | { ok: true; state: QuestionSessionState; emitted: EvidenceItem[] }
  | { ok: false; error: 'unknown_question' | 'out_of_range' | 'option_not_available' | 'type_mismatch'; state: QuestionSessionState }

export function applyAnswer(
  bank: readonly QuestionDef[],
  config: BankConfig,
  state: QuestionSessionState,
  questionId: string,
  value: AnswerValue,
  now: Now,
): AnswerResult {
  const q = bank.find((b) => b.id === questionId)
  if (!q) return { ok: false, error: 'unknown_question', state }

  const normalized = normalizeAnswer({ answerType: q.answerType, key: q.key, options: q.options, range: q.range, select: q.select }, value, now)
  if (!normalized.ok) return { ok: false, error: normalized.error, state }

  const answers = { ...state.answers, [q.id]: value }
  const priorRecord = state.history.find((h) => h.questionId === q.id)
  const history = priorRecord
    ? state.history.map((h) => (h.questionId === q.id ? { ...h, answered: true, skipped: false } : h))
    : [...state.history, { questionId: q.id, answered: true, skipped: false }]

  // Follow-ups evaluate against the POST-answer facts; touched/queued targets skipped.
  const provisional: QuestionSessionState = { ...state, answers, history }
  const provisionalFacts = factsFromEvidence(evidenceFor(bank, provisional, now))
  const queue = [...state.queue]
  for (const fu of q.followUps ?? []) {
    if (!evaluatePredicate(fu.when, provisionalFacts)) continue
    for (const target of fu.ask) {
      const touched = history.some((h) => h.questionId === target && (h.answered || h.skipped))
      if (!touched && !queue.includes(target)) queue.push(target)
    }
  }

  // Answering a conflict's clarify question resolves that conflict permanently.
  const resolvedConflictIds = [...state.resolvedConflictIds]
  for (const c of config.conflicts) {
    if (c.clarifyQuestionId === q.id && !resolvedConflictIds.includes(c.id)) resolvedConflictIds.push(c.id)
  }

  const next: QuestionSessionState = { answers, history, queue, resolvedConflictIds }
  return { ok: true, state: pruneOrphans(bank, next, now), emitted: normalized.evidence }
}

export function skipQuestion(state: QuestionSessionState, questionId: string): QuestionSessionState {
  const prior = state.history.find((h) => h.questionId === questionId)
  const history = prior
    ? state.history.map((h) => (h.questionId === questionId ? { ...h, skipped: true } : h))
    : [...state.history, { questionId, answered: false, skipped: true }]
  return { ...state, history }
}

/**
 * Orphan pruning to fixpoint: answers whose question is no longer eligible
 * under current facts are removed (with their history rows), then facts are
 * recomputed and the check repeats until stable. Terminates: answers strictly
 * shrink. Characterized legacy semantics; generic here.
 */
export function pruneOrphans(bank: readonly QuestionDef[], state: QuestionSessionState, now: Now): QuestionSessionState {
  let current = state
  for (;;) {
    const facts = factsFromEvidence(evidenceFor(bank, current, now))
    const orphan = Object.keys(current.answers)
      .sort()
      .find((id) => {
        const q = bank.find((b) => b.id === id)
        if (!q) return true
        if (q.eligible && !evaluatePredicate(q.eligible, facts)) return true
        if (q.skipIf && evaluatePredicate(q.skipIf, facts)) return true
        return false
      })
    if (!orphan) return current
    const answers = { ...current.answers }
    delete answers[orphan]
    current = {
      ...current,
      answers,
      history: current.history.filter((h) => h.questionId !== orphan),
      queue: current.queue.filter((id) => id !== orphan),
    }
  }
}

/** Revision = re-answer + prune; the flow never restarts (characterized semantics). */
export function reviseAnswer(
  bank: readonly QuestionDef[],
  config: BankConfig,
  state: QuestionSessionState,
  questionId: string,
  value: AnswerValue,
  now: Now,
): AnswerResult {
  return applyAnswer(bank, config, state, questionId, value, now)
}

/** Question replay: applying a recorded (questionId, value) sequence reproduces the session. */
export function replaySession(
  bank: readonly QuestionDef[],
  config: BankConfig,
  answers: ReadonlyArray<{ questionId: string; value: AnswerValue }>,
  now: Now,
  initial: QuestionSessionState,
): QuestionSessionState {
  let state = initial
  for (const step of answers) {
    const result = applyAnswer(bank, config, state, step.questionId, step.value, now)
    if (!result.ok) throw new Error(`QAE-REPLAY-DIVERGENCE: ${step.questionId} rejected with ${result.error}`)
    state = result.state
  }
  return state
}
