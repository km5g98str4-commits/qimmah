// [CTO-QAE-005] §1 — Legacy Question Oracle. Runs the REAL legacy engine
// (src/lib/personalization) over the shared personas with an injected clock,
// recording per-step: known facts, candidates, selection + stage + score,
// remaining budget, new evidence, follow-up activation, completion state.
// Same input ⇒ byte-identical sequence (runner verifies by double-run).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import {
  applyAnswer,
  countedAsked,
  createState,
  isEligible,
  selectNext,
  visibleOptions,
  type EngineConfig,
} from '@/lib/personalization/engine'
import { QUESTION_BANK, getQuestion } from '@/lib/personalization/bank'
import { DEFAULT_BUDGET, type AnswerValue, type PersonalizationState, type QuestionDef } from '@/lib/personalization/types'

const qaeRoot = process.env.QAE_ROOT
if (!qaeRoot) throw new Error('QAE_ROOT not set')

const CLOCK_START = 1785542400000
const MULTI_TYPES = new Set(['multi', 'bodyAreas', 'equipment', 'weekdays', 'rank', 'exercises'])

interface Persona {
  name: string
  overrides: Record<string, AnswerValue>
  /** off-flow answers (user volunteers/revises) — recorded, applied once when asked-count reaches the threshold */
  inject?: Array<{ afterAsked: number; questionId: string; value: AnswerValue; note?: string }>
}

function defaultAnswer(qd: QuestionDef, state: PersonalizationState): AnswerValue | null {
  const opts = visibleOptions(qd, state)
  if (opts.length > 0) return MULTI_TYPES.has(qd.answer) ? [opts[0].value] : opts[0].value
  if (qd.range) return qd.range.min
  if (qd.answer === 'boolean') return false
  return null
}

interface StepRecord {
  step: number
  knownFactsBefore: Record<string, AnswerValue>
  candidateIds: string[]
  selectedId: string
  stage: string
  offBudget: boolean
  effectiveScore: number
  remainingSoftBudget: number
  answer: AnswerValue | null
  answerSource: 'persona' | 'default' | 'skip'
  rejectedFirst: string | null
  newEvidence: Record<string, AnswerValue>
  followUpsActivated: string[]
}

export interface OracleJourney {
  persona: string
  oracle: 'src/lib/personalization (legacy engine)'
  clock: { epochMs: number; note: 'injected monotonic fake clock (+1000ms/step)' }
  injectedAnswers: Array<{ questionId: string; value: AnswerValue; atAsked: number }>
  steps: StepRecord[]
  stopReason: string | null
  askedCounted: number
  clarifications: number
  skips: number
  finalExperienceClass: string
}

function stageOf(qd: QuestionDef, state: PersonalizationState, offBudget: boolean): string {
  if (qd.id === 's-health-consent') return 'gate'
  if (qd.category === 'clarify') return 'conflictClarify'
  if (offBudget && qd.safety === 'clear') return 'safetyFollowUp'
  if (qd.required) return 'required'
  return 'scored'
}

function effectiveScore(qd: QuestionDef, state: PersonalizationState): number {
  const queued = new Set(state.queue)
  const perCategory = new Map<string, number>()
  for (const h of state.history) {
    if (h.answeredAt === null) continue
    const q = getQuestion(h.id)
    if (q) perCategory.set(q.category, (perCategory.get(q.category) ?? 0) + 1)
  }
  const EXEMPT = ['basics', 'safety', 'limitations', 'clarify']
  const boost = queued.has(qd.id) ? 15 : 0
  const glut = EXEMPT.includes(qd.category) ? 0 : (perCategory.get(qd.category) ?? 0) * 6
  return qd.priority + boost - glut
}

export function runPersona(persona: Persona): OracleJourney {
  let clock = CLOCK_START
  const cfg: EngineConfig = { budget: DEFAULT_BUDGET, now: () => (clock += 1000) }
  let state = createState('ar', null, cfg.now())
  const steps: StepRecord[] = []
  let stopReason: string | null = null
  let skips = 0

  const injected: Array<{ questionId: string; value: AnswerValue; atAsked: number }> = []
  const pendingInjections = [...(persona.inject ?? [])]
  for (let i = 0; i < 60; i++) {
    for (let k = pendingInjections.length - 1; k >= 0; k--) {
      const inj = pendingInjections[k]
      if (countedAsked(state) >= inj.afterAsked) {
        const res = applyAnswer(state, inj.questionId, inj.value, cfg)
        if (!res.rejected) {
          state = res.state
          injected.push({ questionId: inj.questionId, value: inj.value, atAsked: countedAsked(state) })
        }
        pendingInjections.splice(k, 1)
      }
    }
    const sel = selectNext(state, cfg)
    if (!sel.question) {
      stopReason = sel.reason
      break
    }
    const qd = sel.question
    const candidates = QUESTION_BANK.filter(
      (q) => !state.history.some((h) => h.id === q.id && (h.answeredAt !== null || h.skipped)) && isEligible(q, state),
    ).map((q) => q.id)
    const budgetClass = (state.derived['experienceClass'] as keyof typeof DEFAULT_BUDGET) ?? 'complete_beginner'
    const budget = DEFAULT_BUDGET[budgetClass] ?? DEFAULT_BUDGET.complete_beginner

    let answerSource: StepRecord['answerSource'] = 'persona'
    let value: AnswerValue | null = Object.prototype.hasOwnProperty.call(persona.overrides, qd.key)
      ? persona.overrides[qd.key]
      : ((answerSource = 'default'), defaultAnswer(qd, state))
    let rejectedFirst: string | null = null
    let applied = applyAnswer(state, qd.id, value, cfg)
    if (applied.rejected && answerSource === 'persona') {
      rejectedFirst = applied.rejected
      answerSource = 'default'
      value = defaultAnswer(qd, state)
      applied = applyAnswer(state, qd.id, value, cfg)
    }
    if (applied.rejected) {
      rejectedFirst = rejectedFirst ?? applied.rejected
      answerSource = 'skip'
      value = null
      applied = applyAnswer(state, qd.id, null, cfg)
      skips++
      if (applied.rejected) throw new Error(`oracle stuck at ${qd.id}: ${applied.rejected}`)
    }

    steps.push({
      step: i,
      knownFactsBefore: { ...state.answers },
      candidateIds: candidates,
      selectedId: qd.id,
      stage: stageOf(qd, state, sel.offBudget),
      offBudget: sel.offBudget,
      effectiveScore: effectiveScore(qd, state),
      remainingSoftBudget: Math.max(0, budget.max - countedAsked(state)),
      answer: value,
      answerSource,
      rejectedFirst,
      newEvidence: value === null ? {} : { [qd.key]: value },
      followUpsActivated: applied.queued,
    })
    state = applied.state
  }

  return {
    persona: persona.name,
    oracle: 'src/lib/personalization (legacy engine)',
    clock: { epochMs: CLOCK_START, note: 'injected monotonic fake clock (+1000ms/step)' },
    injectedAnswers: injected,
    steps,
    stopReason,
    askedCounted: countedAsked(state),
    clarifications: state.clarifications.length,
    skips,
    finalExperienceClass: String(state.derived['experienceClass'] ?? 'complete_beginner'),
  }
}

const personasFile = JSON.parse(readFileSync(resolvePath(qaeRoot, 'Contracts/content/personas.json'), 'utf8')) as { personas: Persona[] }
mkdirSync(resolvePath(qaeRoot, 'Fixtures/golden/questions'), { recursive: true })
const summaries: Array<Record<string, unknown>> = []
for (const persona of personasFile.personas) {
  const run1 = runPersona(persona)
  const run2 = runPersona(persona)
  const s1 = JSON.stringify(run1)
  if (s1 !== JSON.stringify(run2)) throw new Error(`oracle nondeterministic for ${persona.name}`)
  writeFileSync(resolvePath(qaeRoot, `Fixtures/golden/questions/legacy-${persona.name}.golden.json`), JSON.stringify(run1, null, 2) + '\n')
  summaries.push({
    persona: persona.name,
    asked: run1.askedCounted,
    steps: run1.steps.length,
    stop: run1.stopReason,
    clarifications: run1.clarifications,
    skips: run1.skips,
    experienceClass: run1.finalExperienceClass,
    sequence: run1.steps.map((s) => s.selectedId),
  })
}
writeFileSync(resolvePath(qaeRoot, 'Fixtures/golden/questions/legacy-summary.json'), JSON.stringify(summaries, null, 2) + '\n')
console.log(JSON.stringify(summaries.map((s) => ({ persona: s.persona, asked: s.asked, stop: s.stop, clarifications: s.clarifications })), null, 2))
