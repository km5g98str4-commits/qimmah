// [CTO-QAE-005] §§8–9, 12 — QAE question journeys over the converted content
// bank: real adaptive behavior, fatigue metrics, budget-override visibility,
// the five comparison pairs, and goldens with the mandated determinism
// envelope. Double-run + permuted-bank byte-identity verified by the runner.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import type { Now } from '../Domain/Shared/core'
import { canonicalSerialize } from '../Domain/Shared/canonical'
import { deriveRoutingFacts } from '../Domain/ProfileClassification/classify'
import type { AnswerValue, FactMap } from '../Domain/Evidence/model'
import { evaluateCompleteness, type CompletenessSpec } from '../Domain/Evidence/completeness'
import { EMPTY_SESSION, type BankConfig, type QuestionDef, type QuestionSessionState } from '../Domain/Questions/model'
import { countedAsked, selectNext } from '../Domain/Questions/select'
import { applyAnswer, skipQuestion, viewOf } from '../Domain/Questions/session'
import { QAE_ENGINE_VERSION } from '../Domain/Decisions/model'

const qaeRoot = process.env.QAE_ROOT
if (!qaeRoot) throw new Error('QAE_ROOT not set')

const NOW: Now = { epochMs: 1785542400000, tzOffsetMinutes: 180 }

interface Persona {
  name: string
  overrides: Record<string, AnswerValue>
  inject?: Array<{ afterAsked: number; questionId: string; value: AnswerValue; note?: string }>
}

const bankFile = JSON.parse(readFileSync(resolvePath(qaeRoot, 'Contracts/content/question-bank.qae.json'), 'utf8')) as {
  questionSchemaVersion: string
  bankManifestHash: string
  questions: QuestionDef[]
}
const config = JSON.parse(readFileSync(resolvePath(qaeRoot, 'Contracts/content/bank-config.qae.json'), 'utf8')) as BankConfig
const evidenceMap = JSON.parse(readFileSync(resolvePath(qaeRoot, 'Contracts/content/profile-evidence-map.json'), 'utf8')) as {
  completenessSpec: CompletenessSpec
}
const personasFile = JSON.parse(readFileSync(resolvePath(qaeRoot, 'Contracts/content/personas.json'), 'utf8')) as { personas: Persona[] }

const BANK = bankFile.questions

function defaultAnswer(q: QuestionDef): AnswerValue | null {
  if (q.answerType === 'multi') return q.options && q.options.length > 0 ? [q.options[0]] : []
  if (q.answerType === 'openList') return []
  if (q.options && q.options.length > 0) return q.options[0]
  if (q.range) return q.range.min
  if (q.answerType === 'boolean') return false
  if (q.answerType === 'text') return 'n/a'
  return null
}

function adaptOverride(q: QuestionDef, value: AnswerValue): AnswerValue {
  if (q.answerType === 'multi' || q.answerType === 'openList') return Array.isArray(value) ? value : [String(value)]
  if (q.answerType === 'number' && typeof value === 'string') {
    const n = Number(value)
    return Number.isSafeInteger(n) ? n : value
  }
  return value
}

interface JourneyStep {
  step: number
  selectedId: string
  stage: string
  offBudget: boolean
  budgetOverrideReason: string | null
  answer: AnswerValue | null
  answerSource: 'persona' | 'default' | 'skip'
  rejected: string | null
  newEvidencePaths: string[]
}

export interface QaeJourney {
  persona: string
  determinism: {
    seed: number
    clock: { epochMs: number }
    timezone: { tzOffsetMinutes: number }
    locale: string
    engineVersion: string
    questionSchemaVersion: string
    ruleManifest: string
    bankManifestHash: string
  }
  injectedAnswers: Array<{ questionId: string; value: AnswerValue; atAsked: number }>
  steps: JourneyStep[]
  stopReason: string | null
  metrics: {
    askedCounted: number
    skipped: number
    clarifications: number
    budgetOverrides: number
    bankSize: number
    touched: number
    bankAvoidedBp: number
  }
  completeness: { complete: boolean; mandatoryMissing: string[] }
  finalExperienceClass: string
}

function stageOf(q: QuestionDef, offBudget: boolean): string {
  if (q.id === config.gateQuestionId) return 'gate'
  if (q.category === 'clarify') return 'conflictClarify'
  if (offBudget && q.safety === 'clear') return 'safetyFollowUp'
  if (q.required) return 'required'
  return 'scored'
}

export function runJourney(persona: Persona, bank: readonly QuestionDef[]): QaeJourney {
  let state: QuestionSessionState = EMPTY_SESSION
  const steps: JourneyStep[] = []
  const injected: Array<{ questionId: string; value: AnswerValue; atAsked: number }> = []
  const pendingInjections = [...(persona.inject ?? [])]
  let stopReason: string | null = null
  let skipped = 0
  let budgetOverrides = 0
  let finalFacts: FactMap = {}

  for (let i = 0; i < 80; i++) {
    for (let k = pendingInjections.length - 1; k >= 0; k--) {
      const inj = pendingInjections[k]
      if (countedAsked(state, bank) >= inj.afterAsked) {
        const target = bank.find((b) => b.id === inj.questionId)
        if (target) {
          const res = applyAnswer(bank, config, state, inj.questionId, adaptOverride(target, inj.value), NOW)
          if (res.ok) {
            state = res.state
            injected.push({ questionId: inj.questionId, value: inj.value, atAsked: countedAsked(state, bank) })
          }
        }
        pendingInjections.splice(k, 1)
      }
    }
    const baseFacts = viewOf(bank, state, NOW).facts
    const facts = deriveRoutingFacts(baseFacts)
    finalFacts = facts
    const sel = selectNext(bank, config, state, facts)
    if (!sel.question) {
      stopReason = sel.stopReason
      break
    }
    if (sel.budgetOverrideReason) budgetOverrides++
    const q = sel.question

    let answerSource: JourneyStep['answerSource'] = 'persona'
    let value: AnswerValue | null = Object.prototype.hasOwnProperty.call(persona.overrides, q.key)
      ? adaptOverride(q, persona.overrides[q.key])
      : ((answerSource = 'default'), defaultAnswer(q))
    let rejected: string | null = null
    let newPaths: string[] = []
    if (value !== null) {
      let res = applyAnswer(bank, config, state, q.id, value, NOW)
      if (!res.ok && answerSource === 'persona') {
        rejected = res.error
        answerSource = 'default'
        value = defaultAnswer(q)
        res = value === null ? res : applyAnswer(bank, config, state, q.id, value, NOW)
      }
      if (res.ok) {
        state = res.state
        newPaths = res.emitted.map((e) => e.fieldPath)
      } else {
        rejected = rejected ?? res.error
        answerSource = 'skip'
        value = null
        state = skipQuestion(state, q.id)
        skipped++
      }
    } else {
      answerSource = 'skip'
      state = skipQuestion(state, q.id)
      skipped++
    }

    steps.push({
      step: i,
      selectedId: q.id,
      stage: stageOf(q, sel.offBudget),
      offBudget: sel.offBudget,
      budgetOverrideReason: sel.budgetOverrideReason ?? null,
      answer: value,
      answerSource,
      rejected,
      newEvidencePaths: newPaths,
    })
  }

  const touched = new Set(state.history.map((h) => h.questionId)).size
  const clarifications = steps.filter((s) => s.stage === 'conflictClarify').length
  const completeness = evaluateCompleteness(evidenceMap.completenessSpec, finalFacts)
  return {
    persona: persona.name,
    determinism: {
      seed: 0,
      clock: { epochMs: NOW.epochMs },
      timezone: { tzOffsetMinutes: NOW.tzOffsetMinutes },
      locale: 'ar-SA',
      engineVersion: QAE_ENGINE_VERSION,
      questionSchemaVersion: bankFile.questionSchemaVersion,
      ruleManifest: 'question-content(no-decision-rules)',
      bankManifestHash: bankFile.bankManifestHash,
    },
    injectedAnswers: injected,
    steps,
    stopReason,
    metrics: {
      askedCounted: countedAsked(state, bank),
      skipped,
      clarifications,
      budgetOverrides,
      bankSize: bank.length,
      touched,
      bankAvoidedBp: Math.round(((bank.length - touched) / bank.length) * 10000),
    },
    completeness: { complete: completeness.complete, mandatoryMissing: completeness.mandatoryMissing },
    finalExperienceClass: String(finalFacts['derived.experienceClass'] ?? 'complete_beginner'),
  }
}

// ── Run all personas, verify determinism + registration-order independence ───
mkdirSync(resolvePath(qaeRoot, 'Fixtures/golden/questions'), { recursive: true })
const journeys = new Map<string, QaeJourney>()
for (const persona of personasFile.personas) {
  const run1 = runJourney(persona, BANK)
  const run2 = runJourney(persona, BANK)
  if (canonicalSerialize(run1) !== canonicalSerialize(run2)) throw new Error(`QAE journey nondeterministic: ${persona.name}`)
  const permuted = runJourney(persona, [...BANK].reverse())
  if (JSON.stringify(run1.steps.map((s) => s.selectedId)) !== JSON.stringify(permuted.steps.map((s) => s.selectedId))) {
    throw new Error(`QAE journey depends on bank registration order: ${persona.name}`)
  }
  journeys.set(persona.name, run1)
  writeFileSync(resolvePath(qaeRoot, `Fixtures/golden/questions/qae-${persona.name}.golden.json`), JSON.stringify(run1, null, 2) + '\n')
}

// ── The five comparison pairs ([CTO-QAE-005] §9) ─────────────────────────────
const PAIRS: Array<[string, string, string]> = [
  ['A-beginner-vs-advanced', 'beginner-gym', 'advanced-gym'],
  ['B-home-vs-gym', 'home-dumbbells', 'gym-full'],
  ['C-injury-vs-none', 'injury-knee', 'beginner-gym'],
  ['D-minor-vs-adult', 'minor-16', 'beginner-gym'],
  ['E-returning-vs-active-advanced', 'returning-advanced', 'advanced-gym'],
]

const predicatePaths = (q: QuestionDef): string[] => {
  const paths = new Set<string>()
  const walk = (p: unknown): void => {
    if (!p || typeof p !== 'object') return
    const node = p as { path?: string; children?: unknown[]; child?: unknown }
    if (node.path) paths.add(node.path)
    for (const c of node.children ?? []) walk(c)
    if (node.child) walk(node.child)
  }
  walk(q.eligible)
  walk(q.skipIf)
  return [...paths].sort()
}

const comparisons = PAIRS.map(([pairId, aName, bName]) => {
  const a = journeys.get(aName)
  const b = journeys.get(bName)
  if (!a || !b) throw new Error(`missing journey for pair ${pairId}`)
  const aIds = a.steps.map((s) => s.selectedId)
  const bIds = b.steps.map((s) => s.selectedId)
  const aSet = new Set(aIds)
  const bSet = new Set(bIds)
  const common = aIds.filter((id) => bSet.has(id))
  const onlyA = aIds.filter((id) => !bSet.has(id))
  const onlyB = bIds.filter((id) => !aSet.has(id))
  const explain = (ids: string[]): Array<{ questionId: string; evidenceResponsible: string[] }> =>
    ids.map((id) => {
      const q = BANK.find((x) => x.id === id)
      return { questionId: id, evidenceResponsible: q ? predicatePaths(q) : [] }
    })
  return {
    pairId,
    personas: [aName, bName],
    commonQuestions: [...new Set(common)],
    onlyIn: { [aName]: onlyA, [bName]: onlyB },
    whyTheyDiffer: {
      [aName]: explain(onlyA),
      [bName]: explain(onlyB),
      note: 'evidenceResponsible lists the eligibility/skip predicate paths gating each differing question; empty = ordering/budget-driven difference (satiety, priority, budget class)',
    },
    differenceCount: onlyA.length + onlyB.length,
  }
})
writeFileSync(resolvePath(qaeRoot, 'Fixtures/golden/questions/qae-comparisons.golden.json'), JSON.stringify(comparisons, null, 2) + '\n')

const metricRows = [...journeys.values()].map((j) => ({
  persona: j.persona,
  asked: j.metrics.askedCounted,
  clarifications: j.metrics.clarifications,
  skipped: j.metrics.skipped,
  bankAvoidedBp: j.metrics.bankAvoidedBp,
  stop: j.stopReason,
  complete: j.completeness.complete,
  mandatoryMissing: j.completeness.mandatoryMissing,
  experienceClass: j.finalExperienceClass,
}))
writeFileSync(resolvePath(qaeRoot, 'Fixtures/golden/questions/qae-summary.json'), JSON.stringify({ metricRows, comparisons: comparisons.map((c) => ({ pairId: c.pairId, differenceCount: c.differenceCount })) }, null, 2) + '\n')
console.log(JSON.stringify({ metricRows, pairDifferences: comparisons.map((c) => ({ pair: c.pairId, diff: c.differenceCount })) }, null, 2))
