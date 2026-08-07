// QAE Phase 3 proof suite — Evidence & Question Engine Foundation
// ([CTO-QAE-004]). The bank below is SYNTHETIC data: opaque keys, no domain
// meaning. Proves: evidence-only output, graph integrity, characterized
// selection order, determinism/replay, normalization, revision pruning,
// completeness/gap detection, and the no-domain / no-decision source scans.

import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve as resolvePath } from 'node:path'
import { canonicalSerialize } from '../Domain/Shared/canonical'
import { evaluateCompleteness, detectGaps, type CompletenessSpec } from '../Domain/Evidence/completeness'
import { normalizeAnswer, type AnswerValue } from '../Domain/Evidence/model'
import { checkBankIntegrity } from '../Domain/Questions/graph'
import {
  CTO_DEFAULT_BUDGETS,
  DEFAULT_SCORING,
  EMPTY_SESSION,
  type BankConfig,
  type QuestionDef,
  type QuestionSessionState,
} from '../Domain/Questions/model'
import { budgetFor, countedAsked, selectNext } from '../Domain/Questions/select'
import { applyAnswer, pruneOrphans, replaySession, reviseAnswer, viewOf } from '../Domain/Questions/session'
import type { Now } from '../Domain/Shared/core'

let passed = 0
let failed = 0
const check = (name: string, ok: boolean, detail = ''): void => {
  if (ok) passed++
  else {
    failed++
    console.error(`✗ ${name} — ${detail}`)
  }
}

const NOW: Now = { epochMs: 1785542400000, tzOffsetMinutes: 180 }

// ── Synthetic bank (opaque keys — no domain meaning anywhere) ────────────────
const q = (partial: Partial<QuestionDef> & Pick<QuestionDef, 'id' | 'key' | 'category' | 'answerType' | 'provides'>): QuestionDef => ({
  safety: 'none', priority: 50, required: false, skippable: true, infoGain: 5, sinceBankVersion: 1,
  ...partial,
})

const BANK: QuestionDef[] = [
  q({ id: 'g0', key: 'gateOk', category: 'safety', answerType: 'boolean', provides: ['gateOk'], priority: 100, required: true, skippable: false }),
  q({ id: 'b1', key: 'alpha', category: 'basics', answerType: 'number', range: { min: 1, max: 9 }, provides: ['alpha'], priority: 95, required: true,
      followUps: [{ when: { op: 'gte', path: 'alpha', value: 7 }, ask: ['f1'] }] }),
  q({ id: 'b2', key: 'beta', category: 'basics', answerType: 'single', options: ['p', 'q'], provides: ['beta'], priority: 90, required: true }),
  q({ id: 'x1', key: 'k1', category: 'catA', answerType: 'number', range: { min: 0, max: 99 }, provides: ['k1'], priority: 80, infoGain: 8 }),
  q({ id: 'x2', key: 'k2', category: 'catA', answerType: 'number', range: { min: 0, max: 99 }, provides: ['k2'], priority: 78, infoGain: 8 }),
  q({ id: 'x3', key: 'k3', category: 'catA', answerType: 'number', range: { min: 0, max: 99 }, provides: ['k3'], priority: 76, infoGain: 8 }),
  q({ id: 'y1', key: 'm1', category: 'catB', answerType: 'multi', options: ['o1', 'o2', 'o3'], provides: ['m1.count'], priority: 70, infoGain: 8 }),
  q({ id: 'f1', key: 'fu1', category: 'catB', answerType: 'boolean', provides: ['fu1'], priority: 40, infoGain: 6 }),
  q({ id: 's1', key: 'sc1', category: 'safety', answerType: 'boolean', provides: ['sc1'], priority: 30, safety: 'clear',
      eligible: { op: 'eq', path: 'beta', value: 'q' } }),
  q({ id: 'c1', key: 'cl1', category: 'clarify', answerType: 'single', options: ['keepA', 'keepB'], provides: ['cl1'], priority: 99 }),
  q({ id: 'z1', key: 'low1', category: 'catB', answerType: 'boolean', provides: ['low1'], priority: 60, infoGain: 2 }),
  q({ id: 'd1', key: 'dep1', category: 'catB', answerType: 'boolean', provides: ['dep1'], priority: 55, infoGain: 7,
      eligible: { op: 'eq', path: 'beta', value: 'p' } }),
]

const CONFIG: BankConfig = {
  gateQuestionId: 'g0',
  conflicts: [{ id: 'cf1', detect: { op: 'all', children: [{ op: 'gte', path: 'k1', value: 50 }, { op: 'gte', path: 'k2', value: 50 }] }, clarifyQuestionId: 'c1' }],
  budgets: CTO_DEFAULT_BUDGETS,
  scoring: DEFAULT_SCORING,
}

// ── 1 · Bank integrity: clean bank passes; each defect flagged by name ───────
check('integrity: clean bank has zero problems', checkBankIntegrity(BANK, CONFIG).length === 0, JSON.stringify(checkBankIntegrity(BANK, CONFIG)))
check('integrity: duplicate id flagged', checkBankIntegrity([...BANK, { ...BANK[3] }], CONFIG).some((p) => p.kind === 'duplicate_id'))
check('integrity: unknown followUp flagged', checkBankIntegrity([...BANK.slice(0, 1), { ...BANK[1], followUps: [{ when: { op: 'const', value: true }, ask: ['ghost'] }] }], CONFIG).some((p) => p.kind === 'unknown_followup'))
check('integrity: followUp cycle flagged', checkBankIntegrity([
  q({ id: 'ca', key: 'ca', category: 'catA', answerType: 'boolean', provides: ['ca'], followUps: [{ when: { op: 'const', value: true }, ask: ['cb'] }] }),
  q({ id: 'cb', key: 'cb', category: 'catA', answerType: 'boolean', provides: ['cb'], followUps: [{ when: { op: 'const', value: true }, ask: ['ca'] }] }),
], { ...CONFIG, conflicts: [], gateQuestionId: undefined }).some((p) => p.kind === 'followup_cycle'))
check('integrity: unreachable clarify flagged (L-QST-3 class closed)', checkBankIntegrity([...BANK, q({ id: 'c9', key: 'cl9', category: 'clarify', answerType: 'boolean', provides: ['cl9'] })], CONFIG).some((p) => p.kind === 'clarify_unreachable' && p.subject === 'c9'))
check('integrity: empty provides flagged (evidence-only mandate)', checkBankIntegrity([...BANK, q({ id: 'e9', key: 'e9', category: 'catA', answerType: 'boolean', provides: [] })], CONFIG).some((p) => p.kind === 'empty_provides'))

// ── 2 · Gate: absolute first, refusal stops flow ─────────────────────────────
const empty = EMPTY_SESSION
const v0 = viewOf(BANK, empty, NOW)
const first = selectNext(BANK, CONFIG, empty, v0.facts)
check('gate served first, off-budget', first.question?.id === 'g0' && first.offBudget)
const refusedRes = applyAnswer(BANK, CONFIG, empty, 'g0', false, NOW)
check('gate refusal applies', refusedRes.ok)
if (refusedRes.ok) {
  const vr = viewOf(BANK, refusedRes.state, NOW)
  const afterRefusal = selectNext(BANK, CONFIG, refusedRes.state, vr.facts)
  check('gate refusal ⇒ gate_pending, no data question ever', afterRefusal.question === null && afterRefusal.stopReason === 'gate_pending')
}

// Helper: run a scripted session (answers chosen by the proof, selection consulted each step).
const answerScript: Record<string, AnswerValue> = {
  g0: true, b1: 7, b2: 'q', x1: 60, x2: 60, c1: 'keepA', x3: 10, y1: ['o3', 'o1'], f1: true, s1: false, z1: true,
}
interface Walk { state: QuestionSessionState; askedSequence: string[]; stops: string[] }
const walk = (bank: readonly QuestionDef[], config: BankConfig, script: Record<string, AnswerValue>, maxSteps = 30): Walk => {
  let state = EMPTY_SESSION
  const askedSequence: string[] = []
  const stops: string[] = []
  for (let i = 0; i < maxSteps; i++) {
    const facts = viewOf(bank, state, NOW).facts
    const sel = selectNext(bank, config, state, facts)
    if (!sel.question) {
      stops.push(sel.stopReason ?? 'none')
      break
    }
    askedSequence.push(sel.question.id)
    const value = script[sel.question.id]
    if (value === undefined) {
      stops.push('script_exhausted')
      break
    }
    const res = applyAnswer(bank, config, state, sel.question.id, value, NOW)
    if (!res.ok) {
      stops.push(`error:${res.error}`)
      break
    }
    state = res.state
  }
  return { state, askedSequence, stops }
}

// ── 3 · Selection order: required → conflict clarify → scored; satiety ───────
const full = walk(BANK, CONFIG, answerScript)
check('required precede scored', ['g0', 'b1', 'b2'].every((id, i) => full.askedSequence[i] === id), full.askedSequence.join(','))
const c1Pos = full.askedSequence.indexOf('c1')
const conflictBirth = Math.max(full.askedSequence.indexOf('x1'), full.askedSequence.indexOf('x2'))
check('conflict clarify served immediately once detected', c1Pos === conflictBirth + 1, full.askedSequence.join(','))
check('clarify excluded from countedAsked', countedAsked(full.state, BANK) === full.askedSequence.filter((id) => id !== 'c1').length)
check('conflict resolved permanently (never re-served)', full.askedSequence.filter((id) => id === 'c1').length === 1)
const catAAsked = full.askedSequence.filter((id) => ['x1', 'x2', 'x3'].includes(id))
const y1Pos = full.askedSequence.indexOf('y1')
check('satiety: catB question interleaves before catA exhausts', y1Pos !== -1 && y1Pos < full.askedSequence.indexOf('x3'), full.askedSequence.join(','))
check('follow-up queued and asked (queue bonus path)', full.askedSequence.includes('f1'))
check('safety-clear follow-up served (s1 eligible via beta=q)', full.askedSequence.includes('s1'))
check('eligibility: d1 (beta=p only) never asked', !full.askedSequence.includes('d1'))
check('materiality: every asked question provided new evidence', catAAsked.length === 3)

// ── 4 · Info-gain floor past min ─────────────────────────────────────────────
const lowGainConfig: BankConfig = { ...CONFIG, budgets: { '*': { min: 2, max: 15, hardCap: 20 } } }
const lowWalk = walk(BANK, lowGainConfig, answerScript)
check('past min: infoGain<threshold question dropped, flow completes', !lowWalk.askedSequence.includes('z1') && lowWalk.stops[0] === 'complete', JSON.stringify(lowWalk))

// ── 5 · Budget caps: hardCap → cap_reached ───────────────────────────────────
const tinyCap: BankConfig = { ...CONFIG, budgets: { '*': { min: 1, max: 2, hardCap: 3 } } }
const capWalk = walk(BANK, tinyCap, answerScript)
check('soft max stops scored stage (complete)', capWalk.stops[0] === 'complete' || capWalk.stops[0] === 'cap_reached', JSON.stringify(capWalk.stops))
check('CTO default budget: min 13 / max 16 / hardCap 20', (() => { const b = budgetFor(CONFIG, {}); return b.min === 13 && b.max === 16 && b.hardCap === 20 })())

// ── 6 · Determinism & replay ([CTO-QAE-004]: registration order meaningless) ──
const fullAgain = walk(BANK, CONFIG, answerScript)
check('determinism: identical walk twice', JSON.stringify(full.askedSequence) === JSON.stringify(fullAgain.askedSequence))
const shuffled = [...BANK].reverse()
const shuffledWalk = walk(shuffled, CONFIG, answerScript)
check('bank registration order does not affect the asked sequence', JSON.stringify(full.askedSequence) === JSON.stringify(shuffledWalk.askedSequence), shuffledWalk.askedSequence.join(','))
const replayed = replaySession(BANK, CONFIG, full.askedSequence.map((id) => ({ questionId: id, value: answerScript[id] })), NOW, EMPTY_SESSION)
check('question replay reproduces byte-identical state', canonicalSerialize(viewOf(BANK, replayed, NOW).facts) === canonicalSerialize(viewOf(BANK, full.state, NOW).facts))

// ── 7 · Normalization: named rejections, state unchanged ─────────────────────
const badRange = applyAnswer(BANK, CONFIG, full.state, 'x1', 500, NOW)
check('out_of_range rejected by name, state unchanged', !badRange.ok && badRange.error === 'out_of_range' && badRange.state === full.state)
const badOption = applyAnswer(BANK, CONFIG, full.state, 'b2', 'zz', NOW)
check('option_not_available rejected by name', !badOption.ok && badOption.error === 'option_not_available')
const multiNorm = normalizeAnswer({ answerType: 'multi', key: 'm1', options: ['o1', 'o2', 'o3'] }, ['o3', 'o1', 'o3'], NOW)
check('multi normalization: sorted, deduped, scalar facts + count', multiNorm.ok && JSON.stringify(multiNorm.evidence.map((e) => [e.fieldPath, e.value])) === JSON.stringify([['m1.o1', true], ['m1.o3', true], ['m1.count', 2]]))
const floatAnswer = normalizeAnswer({ answerType: 'number', key: 'n', range: { min: 0, max: 10 } }, 1.5, NOW)
check('float answer rejected (type_mismatch)', !floatAnswer.ok && floatAnswer.error === 'type_mismatch')
check('evidence-only: every emitted item is source=questionnaire', viewOf(BANK, full.state, NOW).evidence.every((e) => e.source === 'questionnaire'))

// ── 8 · Revision + orphan pruning to fixpoint ────────────────────────────────
const preRevision = full.state
check('pre-revision: s1 answered (depends on beta=q)', preRevision.answers['s1'] !== undefined)
const revised = reviseAnswer(BANK, CONFIG, preRevision, 'b2', 'p', NOW)
check('revision applies without restart', revised.ok)
if (revised.ok) {
  check('orphan pruning: s1 (beta=q only) removed after beta→p', revised.state.answers['s1'] === undefined)
  check('orphan pruning: unrelated answers survive (alpha intact)', revised.state.answers['b1'] === 7)
  check('pruning reaches fixpoint (idempotent: second prune is a no-op)', canonicalSerialize(pruneOrphans(BANK, revised.state, NOW)) === canonicalSerialize(revised.state))
}

// ── 9 · Completeness + missing-evidence detection ────────────────────────────
const SPEC: CompletenessSpec = {
  perDomain: { d1: ['alpha', 'beta'], d2: ['k1', 'k2', 'k3'], d3: ['never1'] },
  mandatory: ['alpha', 'beta', 'gateOk'],
}
const emptyCompleteness = evaluateCompleteness(SPEC, {})
check('completeness: empty facts ⇒ incomplete, all mandatory missing', !emptyCompleteness.complete && emptyCompleteness.mandatoryMissing.length === 3 && emptyCompleteness.perDomain['d1'] === 'none')
const doneFacts = viewOf(BANK, full.state, NOW).facts
const doneCompleteness = evaluateCompleteness(SPEC, doneFacts)
check('completeness: full session ⇒ complete, domains high', doneCompleteness.complete && doneCompleteness.perDomain['d1'] === 'high' && doneCompleteness.perDomain['d2'] === 'high')
const gaps = detectGaps(SPEC, {}, BANK.map((b) => ({ id: b.id, provides: b.provides })))
const alphaGap = gaps.find((g) => g.fieldPath === 'alpha')
check('gap detection: mandatory gap materiality 100 with candidate question', alphaGap?.materiality === 100 && alphaGap.candidateQuestionIds.includes('b1'))
check('gap detection: unfillable path has empty candidates (visible, not silent)', gaps.find((g) => g.fieldPath === 'never1')?.candidateQuestionIds.length === 0)
check('gaps ordered by materiality then path', gaps[0].materiality >= gaps[gaps.length - 1].materiality)

// ── 10 · Scope guards: evidence-only, no decisions, no domain, pure ──────────
const qaeRoot = process.env.QAE_ROOT
if (!qaeRoot) throw new Error('QAE_ROOT not set by runner')
const scanHits: string[] = []
for (const dir of ['Domain/Questions', 'Domain/Evidence']) {
  for (const f of readdirSync(resolvePath(qaeRoot, dir))) {
    const src = readFileSync(join(resolvePath(qaeRoot, dir), f), 'utf8')
    for (const line of src.split('\n')) {
      if (/^(export )?(let|var) /.test(line)) scanHits.push(`${dir}/${f}: mutable module state`)
      if (/Date\.now|Math\.random|new Date\(/.test(line)) scanHits.push(`${dir}/${f}: ambient time/randomness`)
      if (/from '\.\.\/Decisions\/resolver'|from '\.\.\/Safety\//.test(line)) scanHits.push(`${dir}/${f}: imports decision/safety runtime`)
    }
    if (/Proposal|calorie|workout|nutrition|recovery|trend/i.test(src)) scanHits.push(`${dir}/${f}: decision/domain vocabulary`)
  }
}
check('scope: questions/evidence import no decision runtime, contain no domain vocabulary, no mutable state', scanHits.length === 0, scanHits.join(' | '))
const frozenState = Object.freeze({ ...EMPTY_SESSION })
const frozenSel = selectNext(BANK, CONFIG, frozenState, Object.freeze({}))
check('pure: frozen state/facts evaluated without mutation', frozenSel.question?.id === 'g0')

console.log(`qae-question-proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
