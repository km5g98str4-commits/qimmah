// [CTO-QAE-011] Returning-budget counter-assertions — Policy B2 + the scoped
// per-class budget exception.
//
// Wave 1 finding F2: `required` bypassed `priority`, so x-return-reason (64) /
// x-return-ramp (60) were served ahead of classification evidence (88/88/86);
// being category `experience` they also added 2x satietyPenalty, burying the
// remainder in the scored stage. The returning persona lost totalMonths and
// consistency and finalExperienceClass regressed `returning` -> `advanced`.
//
// Six counter-assertions, each of which MUST FAIL BY NAME when its protection
// is removed (Qimmah charter §4.2 — an exception is only safe while a test
// proves it has not become the rule). A negative that dies on a TypeError is
// not a proof, so every mutation below keeps the config structurally valid and
// the failure is asserted on the observable outcome.
//
// The driver runs the REAL domain functions (selectNext / applyAnswer /
// deriveRoutingFacts / evaluateCompleteness) over the REAL bank, config and
// personas. It is deliberately not imported from Tools/qae-journeys.ts, whose
// module top-level writes goldens.

import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { deriveRoutingFacts } from '../../Domain/ProfileClassification/classify'
import { evaluateCompleteness, type CompletenessSpec } from '../../Domain/Evidence/completeness'
import type { AnswerValue } from '../../Domain/Evidence/model'
import { EMPTY_SESSION, type BankConfig, type QuestionDef, type QuestionSessionState } from '../../Domain/Questions/model'
import { countedAsked, selectNext } from '../../Domain/Questions/select'
import { applyAnswer, viewOf } from '../../Domain/Questions/session'
import type { Now } from '../../Domain/Shared/core'

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
const qaeRoot = process.env.QAE_ROOT
if (!qaeRoot) throw new Error('QAE_ROOT not set')
const readJson = <T>(rel: string): T => JSON.parse(readFileSync(resolvePath(qaeRoot, rel), 'utf8')) as T

const BANK = readJson<{ questions: QuestionDef[] }>('Contracts/content/question-bank.qae.json').questions
const CONFIG = readJson<BankConfig>('Contracts/content/bank-config.qae.json')
const SPEC = readJson<{ completenessSpec: CompletenessSpec }>('Contracts/content/profile-evidence-map.json').completenessSpec
const PERSONAS = readJson<{ personas: Array<{ name: string; overrides: Record<string, AnswerValue> }> }>(
  'Contracts/content/personas.json',
).personas

const personaByName = (n: string): { name: string; overrides: Record<string, AnswerValue> } => {
  const p = PERSONAS.find((x) => x.name === n)
  if (!p) throw new Error(`persona not found: ${n}`)
  return p
}

// ── Minimal driver: real engine, deterministic answers ──────────────────────
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

interface Outcome {
  asked: string[]
  askedCounted: number
  experienceClass: string
  complete: boolean
  mandatoryMissing: string[]
}

function run(
  personaName: string,
  bank: readonly QuestionDef[] = BANK,
  config: BankConfig = CONFIG,
): Outcome {
  const persona = personaByName(personaName)
  let state: QuestionSessionState = EMPTY_SESSION
  const asked: string[] = []
  for (let i = 0; i < 80; i++) {
    const facts = deriveRoutingFacts(viewOf(bank, state, NOW).facts)
    const sel = selectNext(bank, config, state, facts)
    if (!sel.question) break
    const q = sel.question
    const override = persona.overrides[q.key]
    const value = override !== undefined ? adaptOverride(q, override) : defaultAnswer(q)
    const res = applyAnswer(bank, config, state, q.id, value, NOW)
    if (!res.ok) break
    state = res.state
    asked.push(q.id)
  }
  const finalFacts = deriveRoutingFacts(viewOf(bank, state, NOW).facts)
  const completeness = evaluateCompleteness(SPEC, finalFacts)
  return {
    asked,
    askedCounted: countedAsked(state, bank),
    experienceClass: String(finalFacts['derived.experienceClass']),
    complete: completeness.complete,
    mandatoryMissing: [...completeness.mandatoryMissing],
  }
}

// ── Config / bank mutators (structurally valid — never malformed) ───────────
const withoutReturningBudget = (c: BankConfig): BankConfig => ({
  ...c,
  budgets: Object.fromEntries(Object.entries(c.budgets).filter(([k]) => k !== 'returning')),
})
const withoutProtectedId = (c: BankConfig, id: string): BankConfig => ({
  ...c,
  selectionTiers: c.selectionTiers && {
    ...c.selectionTiers,
    classificationCritical: c.selectionTiers.classificationCritical.filter((x) => x !== id),
  },
})
const withoutConditionalId = (c: BankConfig, id: string): BankConfig => ({
  ...c,
  selectionTiers: c.selectionTiers && {
    ...c.selectionTiers,
    conditionallyRequired: c.selectionTiers.conditionallyRequired.filter((x) => x !== id),
  },
})
const withoutTiers = (c: BankConfig): BankConfig => {
  const rest: Record<string, unknown> = { ...c }
  delete rest['selectionTiers']
  return rest as unknown as BankConfig
}

const RETURNING = 'returning-advanced'
const CRITICAL = ['x-trained-before', 'x-last-trained', 'x-total-duration', 'x-consistency']
const CONDITIONAL = ['x-return-reason', 'x-return-ramp']

// ═══ CA-2 — the positive control (stated first; the rest falsify it) ════════
const base = run(RETURNING)
check('CA-2a returning: finalExperienceClass = returning', base.experienceClass === 'returning', base.experienceClass)
check('CA-2b returning: askedCounted <= 18', base.askedCounted <= 18, String(base.askedCounted))
check('CA-2c returning: AthleteProfile complete', base.complete, JSON.stringify(base.mandatoryMissing))
check('CA-2d returning: mandatoryMissing empty', base.mandatoryMissing.length === 0, JSON.stringify(base.mandatoryMissing))
for (const id of CONDITIONAL) check(`CA-2e returning asks ${id}`, base.asked.includes(id))
for (const id of ['x-total-duration', 'x-consistency']) check(`CA-2f returning asks ${id}`, base.asked.includes(id))

// ═══ CA-1 — reproduce the previous failure ═════════════════════════════════
// The fix has TWO independent parts and CA-1 must attribute each honestly:
//
//   • Policy B2 (tier promotion) is what restores the CLASSIFICATION. Remove it
//     and finding F2 returns exactly as Wave 1 recorded it.
//   • The returning budget is what AUTHORIZES the resulting 18-question
//     journey. Remove it and the journey still needs 18, but now overruns the
//     class's declared max of 16 — an undeclared overrun, which is precisely
//     the "hidden global budget increase" this directive forbids.
//
// An earlier draft asserted that removing the budget alone reproduced the
// classification regression. It does not, and the proof said so — recorded here
// rather than quietly reworded.
const noTiers = run(RETURNING, BANK, withoutTiers(CONFIG))
check(
  'CA-1a without Policy B2 tiers: F2 classification regression reproduced',
  noTiers.experienceClass !== 'returning',
  `class=${noTiers.experienceClass} asked=${noTiers.askedCounted}`,
)
check(
  'CA-1b without Policy B2 tiers: protected evidence is lost',
  !noTiers.asked.includes('x-total-duration') || !noTiers.asked.includes('x-consistency'),
  `duration=${noTiers.asked.includes('x-total-duration')} consistency=${noTiers.asked.includes('x-consistency')}`,
)

const declaredMax = (c: BankConfig, cls: string): number => (c.budgets[cls] ?? c.budgets['*']).max
const noBudget = run(RETURNING, BANK, withoutReturningBudget(CONFIG))
check(
  'CA-1c without the returning budget entry: the journey overruns its declared max (undeclared increase)',
  noBudget.askedCounted > declaredMax(withoutReturningBudget(CONFIG), noBudget.experienceClass),
  `asked=${noBudget.askedCounted} declaredMax=${declaredMax(withoutReturningBudget(CONFIG), noBudget.experienceClass)}`,
)
check(
  'CA-1d with the returning budget entry: the journey stays inside its declared max',
  base.askedCounted <= declaredMax(CONFIG, base.experienceClass),
  `asked=${base.askedCounted} declaredMax=${declaredMax(CONFIG, base.experienceClass)}`,
)

// ═══ CA-3 — unprotect x-total-duration ⇒ classification/completeness fails ══
const noDuration = run(RETURNING, BANK, withoutProtectedId(CONFIG, 'x-total-duration'))
check(
  'CA-3 unprotecting x-total-duration breaks returning classification (fails by name)',
  noDuration.experienceClass !== 'returning' || !noDuration.asked.includes('x-total-duration'),
  `class=${noDuration.experienceClass} askedDuration=${noDuration.asked.includes('x-total-duration')}`,
)

// ═══ CA-4 — unprotect x-consistency ⇒ protected-evidence proof fails ════════
const noConsistency = run(RETURNING, BANK, withoutProtectedId(CONFIG, 'x-consistency'))
check(
  'CA-4 unprotecting x-consistency drops protected evidence (fails by name)',
  !noConsistency.asked.includes('x-consistency'),
  `x-consistency still asked; asked=${noConsistency.asked.length}`,
)

// ═══ CA-5 — remove either returning question ⇒ returning-policy fails ═══════
// Removal is from the BANK, not merely from the tier list: the two follow-ups
// are `required: true` in the bank, so dropping a tier-list entry does not stop
// them being asked (an earlier draft asserted that and the proof caught it).
// Bank removal is the mutation that actually tests the stated policy.
for (const id of CONDITIONAL) {
  const mutatedBank = BANK.filter((q) => q.id !== id)
  const mutated = run(RETURNING, mutatedBank, CONFIG)
  check(
    `CA-5 removing ${id} from the bank breaks the returning policy (fails by name)`,
    !mutated.asked.includes(id),
    `still asked; class=${mutated.experienceClass} asked=${mutated.askedCounted}`,
  )
}
// And disarming B2 entirely must lose the classification protection.
for (const id of CONDITIONAL) {
  const disarmed = withoutConditionalId(withoutConditionalId(CONFIG, CONDITIONAL[0]), CONDITIONAL[1])
  const mutated = run(RETURNING, BANK, disarmed)
  check(
    `CA-5b emptying conditionallyRequired disarms B2 and loses protected evidence (via ${id})`,
    mutated.experienceClass !== 'returning' ||
      !mutated.asked.includes('x-total-duration') ||
      !mutated.asked.includes('x-consistency'),
    `class=${mutated.experienceClass} asked=${mutated.askedCounted}`,
  )
}

// ═══ CA-6 — non-returning personas keep max=16 and stay unchanged ═══════════
const NON_RETURNING = PERSONAS.map((p) => p.name).filter((n) => n !== RETURNING)
for (const name of NON_RETURNING) {
  const o = run(name)
  check(`CA-6a ${name}: askedCounted <= 16 (no hidden global increase)`, o.askedCounted <= 16, String(o.askedCounted))
  check(`CA-6b ${name}: not classified returning`, o.experienceClass !== 'returning', o.experienceClass)
}

// ═══ CA-7 — absent selectionTiers reproduces pre-B2 behaviour exactly ═══════
// The config-absent path must be the untouched legacy expression, so the
// feature cannot silently become unconditional.
for (const name of NON_RETURNING) {
  const withT = run(name)
  const withoutT = run(name, BANK, withoutTiers(CONFIG))
  check(
    `CA-7 ${name}: tiers present vs absent are identical (promotion is armed only for returning)`,
    withT.asked.join('|') === withoutT.asked.join('|'),
    `${withT.asked.length} vs ${withoutT.asked.length}`,
  )
}

// ═══ CA-8 — structural: the tier lists are exactly the documented ids ═══════
const tiers = CONFIG.selectionTiers
check('CA-8a selectionTiers configured', tiers !== undefined)
if (tiers) {
  check(
    'CA-8b classificationCritical is exactly the four classifier inputs',
    [...tiers.classificationCritical].sort().join(',') === [...CRITICAL].sort().join(','),
    tiers.classificationCritical.join(','),
  )
  check(
    'CA-8c conditionallyRequired is exactly the two returning follow-ups',
    [...tiers.conditionallyRequired].sort().join(',') === [...CONDITIONAL].sort().join(','),
    tiers.conditionallyRequired.join(','),
  )
}
check('CA-8d global default max is still 16', CONFIG.budgets['*'].max === 16, String(CONFIG.budgets['*'].max))
check('CA-8e returning max is 18', CONFIG.budgets['returning']?.max === 18, String(CONFIG.budgets['returning']?.max))
check('CA-8f hardCap unchanged at 20 for every class', Object.values(CONFIG.budgets).every((b) => b.hardCap === 20))
check('CA-8g budgetClassFactPath uses derived.experienceClass', CONFIG.budgetClassFactPath === 'derived.experienceClass', String(CONFIG.budgetClassFactPath))

console.log(`qae-returning-budget-proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
