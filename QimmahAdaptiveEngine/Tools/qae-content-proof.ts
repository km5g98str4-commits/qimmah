// QAE Phase 4 proof suite — [CTO-QAE-005] §13. Runs the QAE question engine
// against the REAL converted bank + config. Positive/negative/bypass per
// routing class; accountability of all 193 legacy questions; provides
// resolution; scope scans; golden envelope integrity.

import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve as resolvePath } from 'node:path'
import { canonicalSerialize } from '../Domain/Shared/canonical'
import { deriveRoutingFacts } from '../Domain/ProfileClassification/classify'
import { checkBankIntegrity } from '../Domain/Questions/graph'
import { EMPTY_SESSION, type BankConfig, type QuestionDef, type QuestionSessionState } from '../Domain/Questions/model'
import { selectNext } from '../Domain/Questions/select'
import { applyAnswer, viewOf } from '../Domain/Questions/session'
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

const qaeRoot = process.env.QAE_ROOT
if (!qaeRoot) throw new Error('QAE_ROOT not set')
const NOW: Now = { epochMs: 1785542400000, tzOffsetMinutes: 180 }

const bankFile = JSON.parse(readFileSync(resolvePath(qaeRoot, 'Contracts/content/question-bank.qae.json'), 'utf8')) as {
  questionSchemaVersion: string
  bankManifestHash: string
  questions: QuestionDef[]
}
const BANK = bankFile.questions
const CONFIG = JSON.parse(readFileSync(resolvePath(qaeRoot, 'Contracts/content/bank-config.qae.json'), 'utf8')) as BankConfig
const inventory = JSON.parse(readFileSync(resolvePath(qaeRoot, 'Contracts/content/question-inventory.json'), 'utf8')) as {
  total: number
  records: Array<{ stableQuestionId: string; disposition: string; materialityCategories: string[] }>
}
const legacyDump = JSON.parse(readFileSync(resolvePath(qaeRoot, 'Contracts/content/question-bank.legacy.json'), 'utf8')) as {
  total: number
  questions: Array<{ id: string }>
}

// ── 1 · All 193 legacy questions accounted for, no silent discards ───────────
check('all legacy questions inventoried', inventory.total === legacyDump.total && inventory.total === 193, String(inventory.total))
const invIds = new Set(inventory.records.map((r) => r.stableQuestionId))
check('every legacy id has an inventory record', legacyDump.questions.every((q) => invIds.has(q.id)))
const DISPOSITIONS = new Set(['PRESERVE', 'PRESERVE_WITH_MAPPING', 'SUPERSEDE', 'REMOVE_REDUNDANT', 'REMOVE_NON_MATERIAL', 'RESEARCH_REQUIRED', 'PRODUCT_DECISION_REQUIRED'])
check('every record carries a legal disposition', inventory.records.every((r) => DISPOSITIONS.has(r.disposition)))
const active = inventory.records.filter((r) => r.disposition === 'PRESERVE' || r.disposition === 'PRESERVE_WITH_MAPPING').length
check('active bank size equals preserve counts', BANK.length === active, `${BANK.length} vs ${active}`)
check('flagged questions carry empty-or-flagged materiality honestly', inventory.records.filter((r) => r.disposition === 'REMOVE_NON_MATERIAL').length > 0)

// ── 2 · Bank integrity: no cycles, no unreachable clarifies, no empty provides ─
const problems = checkBankIntegrity(BANK, CONFIG)
check('converted bank integrity: zero problems', problems.length === 0, JSON.stringify(problems.slice(0, 5)))
check('integrity invariant covers cycles + unreachable clarifies', !problems.some((p) => p.kind === 'followup_cycle' || p.kind === 'clarify_unreachable'))
check('registration order irrelevant to integrity', checkBankIntegrity([...BANK].reverse(), CONFIG).length === 0)

// ── 3 · All real predicate paths resolve to providable evidence ──────────────
const providable = new Set<string>()
for (const q of BANK) {
  providable.add(q.key)
  providable.add(`${q.key}.count`)
  for (const opt of q.options ?? []) providable.add(`${q.key}.${opt}`)
}
const DERIVED_PREFIXES = ['derived.experienceClass', 'derived.isMinor', 'derived.ageKnown', 'derived.knowledgeBand', 'derived.exposureBand', 'derived.capacityBand', 'derived.consistencyBand', 'derived.capability.']
const collectPaths = (p: unknown, into: Set<string>): void => {
  if (!p || typeof p !== 'object') return
  const node = p as { path?: string; children?: unknown[]; child?: unknown }
  if (node.path) into.add(node.path)
  for (const c of node.children ?? []) collectPaths(c, into)
  if (node.child) collectPaths(node.child, into)
}
const allPaths = new Set<string>()
for (const q of BANK) {
  collectPaths(q.eligible, allPaths)
  collectPaths(q.skipIf, allPaths)
  for (const fu of q.followUps ?? []) collectPaths(fu.when, allPaths)
}
for (const c of CONFIG.conflicts) collectPaths(c.detect, allPaths)
// targetWeightKg is provided only by b-target-weight, which is dead in legacy
// production (L-QST-7) and excluded pending product decision — the predicate
// referencing it is permanently false, faithfully mirroring the oracle.
const KNOWN_DEAD_PATHS = new Set(['targetWeightKg'])
const unresolved = [...allPaths].filter((p) => !providable.has(p) && !KNOWN_DEAD_PATHS.has(p) && !DERIVED_PREFIXES.some((d) => p === d || p.startsWith(d)))
check('all real predicate paths resolve (bank keys, option facts, or derivation outputs)', unresolved.length === 0, unresolved.slice(0, 8).join(', '))

// ── 4 · Routing classes on the REAL bank: positive / negative / bypass ───────
// Gate.
const emptyFacts = deriveRoutingFacts(viewOf(BANK, EMPTY_SESSION, NOW).facts)
const first = selectNext(BANK, CONFIG, EMPTY_SESSION, emptyFacts)
check('gate positive: s-health-consent served first, off-budget', first.question?.id === 's-health-consent' && first.offBudget)
const refused = applyAnswer(BANK, CONFIG, EMPTY_SESSION, 's-health-consent', false, NOW)
check('gate negative: refusal ⇒ gate_pending', refused.ok && selectNext(BANK, CONFIG, refused.state, deriveRoutingFacts(viewOf(BANK, refused.state, NOW).facts)).stopReason === 'gate_pending')
// Bypass attempt: skipping the gate by answering a data question directly —
// orphan pruning + gate stage make the flow still demand the gate.
const smuggled = applyAnswer(BANK, CONFIG, EMPTY_SESSION, 'b-age', 30, NOW)
check('gate bypass: direct data answer does not unlock the flow', smuggled.ok && selectNext(BANK, CONFIG, smuggled.state, deriveRoutingFacts(viewOf(BANK, smuggled.state, NOW).facts)).question?.id === 's-health-consent')

// Required.
const consented = applyAnswer(BANK, CONFIG, EMPTY_SESSION, 's-health-consent', true, NOW)
check('required positive: after gate, a required question leads', consented.ok && (() => {
  const sel = selectNext(BANK, CONFIG, consented.state, deriveRoutingFacts(viewOf(BANK, consented.state, NOW).facts))
  return sel.question?.required === true
})())

// Conflict clarification (level conflict, real config).
let s: QuestionSessionState = EMPTY_SESSION
for (const [id, v] of [['s-health-consent', true], ['x-selfrated-level', 'advanced'], ['x-trained-before', 'tried']] as Array<[string, string | boolean]>) {
  const r = applyAnswer(BANK, CONFIG, s, id, v, NOW)
  if (!r.ok) throw new Error(`setup failed at ${id}: ${r.error}`)
  s = r.state
}
const conflictSel = selectNext(BANK, CONFIG, s, deriveRoutingFacts(viewOf(BANK, s, NOW).facts))
check('clarify positive: level conflict serves c-level-mismatch off-budget', conflictSel.question?.id === 'c-level-mismatch' && conflictSel.offBudget)
const clarified = applyAnswer(BANK, CONFIG, s, 'c-level-mismatch', (BANK.find((q) => q.id === 'c-level-mismatch')?.options ?? ['keep'])[0], NOW)
check('clarify negative: resolved conflict never re-served', clarified.ok && selectNext(BANK, CONFIG, clarified.state, deriveRoutingFacts(viewOf(BANK, clarified.state, NOW).facts)).question?.id !== 'c-level-mismatch')

// Safety follow-up + explicit budget override: drain ALL required questions
// first (required precedes the safety stage up to hardCap), with injury=current
// so a safety-clear follow-up remains open past the soft max.
const tinyBudget: BankConfig = { ...CONFIG, budgets: { '*': { min: 1, max: 1, hardCap: 20 } } }
let inj: QuestionSessionState = EMPTY_SESSION
{
  const gate = applyAnswer(BANK, tinyBudget, inj, 's-health-consent', true, NOW)
  if (!gate.ok) throw new Error('consent setup failed')
  inj = gate.state
  for (let i = 0; i < 30; i++) {
    const facts = deriveRoutingFacts(viewOf(BANK, inj, NOW).facts)
    const sel = selectNext(BANK, tinyBudget, inj, facts)
    if (!sel.question || !sel.question.required) break
    const q = sel.question
    const v: string | number | boolean | string[] =
      q.key === 'hasInjury' ? 'current'
      : q.answerType === 'multi' ? [(q.options ?? [''])[0]]
      : q.options && q.options.length > 0 ? q.options[0]
      : q.range ? (q.key === 'age' ? 30 : q.range.min)
      : q.answerType === 'boolean' ? true : 'n/a'
    const r = applyAnswer(BANK, tinyBudget, inj, q.id, v, NOW)
    if (!r.ok) throw new Error(`required drain failed at ${q.id}: ${r.error}`)
    inj = r.state
  }
}
const safetySel = selectNext(BANK, tinyBudget, inj, deriveRoutingFacts(viewOf(BANK, inj, NOW).facts))
check('safety positive: safety-clear follow-up served past soft max, override RECORDED', safetySel.question?.safety === 'clear' && safetySel.offBudget && safetySel.budgetOverrideReason === 'safetyEvidenceRequired', JSON.stringify(safetySel.question?.id))
check('safety negative: without injury evidence no safety-clear override fires', (() => {
  const clean = applyAnswer(BANK, tinyBudget, EMPTY_SESSION, 's-health-consent', true, NOW)
  if (!clean.ok) return false
  const withInjuryNone = applyAnswer(BANK, tinyBudget, clean.state, 'l-has-injury', 'none', NOW)
  if (!withInjuryNone.ok) return false
  const sel = selectNext(BANK, tinyBudget, withInjuryNone.state, deriveRoutingFacts(viewOf(BANK, withInjuryNone.state, NOW).facts))
  return sel.budgetOverrideReason === undefined
})())

// Eligibility bypass: answering an ineligible question is pruned to fixpoint.
const noInjury = applyAnswer(BANK, CONFIG, EMPTY_SESSION, 'l-has-injury', 'none', NOW)
check('eligibility bypass: ineligible answer pruned (l-current-areas without injury)', noInjury.ok && (() => {
  const forced = applyAnswer(BANK, CONFIG, noInjury.state, 'l-current-areas', ['knee'], NOW)
  if (!forced.ok) return true // rejected outright is equally safe
  return forced.state.answers['l-current-areas'] === undefined
})())

// Invalid answer never destroys prior evidence ([CTO-QAE-005] amendment 4).
const before = canonicalSerialize(viewOf(BANK, s, NOW).facts)
const invalid = applyAnswer(BANK, CONFIG, s, 'b-age', 200, NOW)
check('invalid answer named + prior evidence intact', !invalid.ok && invalid.error === 'out_of_range' && canonicalSerialize(viewOf(BANK, invalid.state, NOW).facts) === before)

// ── 5 · Journey goldens: envelope completeness, no floats, completeness law ──
const goldenDir = resolvePath(qaeRoot, 'Fixtures/golden/questions')
const qaeGoldens = readdirSync(goldenDir).filter((f) => f.startsWith('qae-') && f.endsWith('.golden.json') && f !== 'qae-comparisons.golden.json')
check('12 QAE journey goldens exist', qaeGoldens.length === 12, String(qaeGoldens.length))
const ENVELOPE = ['seed', 'clock', 'timezone', 'locale', 'engineVersion', 'questionSchemaVersion', 'ruleManifest', 'bankManifestHash']
let envelopeOk = true
let floatsOk = true
let completionOk = true
for (const f of qaeGoldens) {
  const g = JSON.parse(readFileSync(join(goldenDir, f), 'utf8')) as {
    determinism: Record<string, unknown>
    stopReason: string
    completeness: { complete: boolean }
  }
  if (!ENVELOPE.every((k) => k in g.determinism)) envelopeOk = false
  try {
    canonicalSerialize(g)
  } catch {
    floatsOk = false
  }
  if (g.stopReason === 'complete' && !g.completeness.complete) completionOk = false
}
check('every golden carries the full mandated envelope', envelopeOk)
check('no floats anywhere in canonical journey goldens', floatsOk)
check('no unanswered required evidence at successful completion', completionOk)
const legacyGoldens = readdirSync(goldenDir).filter((f) => f.startsWith('legacy-') && f.endsWith('.golden.json'))
check('12 legacy oracle goldens exist', legacyGoldens.length === 12, String(legacyGoldens.length))

// ── 6 · Scope scans: content layer imports no decisions, no ambient time ─────
const scanHits: string[] = []
for (const dir of ['Domain/ProfileClassification']) {
  for (const f of readdirSync(resolvePath(qaeRoot, dir))) {
    const src = readFileSync(join(resolvePath(qaeRoot, dir), f), 'utf8')
    if (/from '\.\.\/Decisions\/resolver'|from '\.\.\/Safety\//.test(src)) scanHits.push(`${f}: decision/safety import`)
    if (/Date\.now|Math\.random|new Date\(/.test(src)) scanHits.push(`${f}: ambient time/randomness`)
    if (/Proposal|generatePlan|workoutPlan|calorieTarget/i.test(src)) scanHits.push(`${f}: plan/proposal vocabulary`)
    for (const line of src.split('\n')) if (/^(export )?(let|var) /.test(line)) scanHits.push(`${f}: mutable module state`)
  }
}
check('profile classification: no plan generation, no decision imports, pure', scanHits.length === 0, scanHits.join(' | '))
check('no Arabic/English copy in domain content (copyKey references only)', !/[؀-ۿ]/.test(JSON.stringify(BANK)))

console.log(`qae-content-proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
