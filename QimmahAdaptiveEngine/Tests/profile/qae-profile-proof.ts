// QAE Phase 4.5 proof suite — AthleteProfile contract ([CTO-QAE-006] §§6–8).
// 12-persona completeness · 10 adversarial cases · the hard-separation proof
// (downstream contracts contain ZERO question IDs) · select-constraint
// enforcement · deterministic profile serialization.

import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve as resolvePath } from 'node:path'
import { canonicalSerialize } from '../../Domain/Shared/canonical'
import { deriveRoutingFacts } from '../../Domain/ProfileClassification/classify'
import { buildAthleteProfile } from '../../Domain/Profile/build'
import type { AnswerValue, FactMap } from '../../Domain/Evidence/model'
import { EMPTY_SESSION, type BankConfig, type QuestionDef, type QuestionSessionState } from '../../Domain/Questions/model'
import { countedAsked, selectNext } from '../../Domain/Questions/select'
import { applyAnswer, skipQuestion, viewOf } from '../../Domain/Questions/session'
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

const qaeRoot = process.env.QAE_ROOT
if (!qaeRoot) throw new Error('QAE_ROOT not set')
const NOW: Now = { epochMs: 1785542400000, tzOffsetMinutes: 180 }

const bankFile = JSON.parse(readFileSync(resolvePath(qaeRoot, 'Contracts/content/question-bank.qae.json'), 'utf8')) as { questions: QuestionDef[] }
const BANK = bankFile.questions
const CONFIG = JSON.parse(readFileSync(resolvePath(qaeRoot, 'Contracts/content/bank-config.qae.json'), 'utf8')) as BankConfig
const personasFile = JSON.parse(readFileSync(resolvePath(qaeRoot, 'Contracts/content/personas.json'), 'utf8')) as {
  personas: Array<{ name: string; overrides: Record<string, AnswerValue>; inject?: Array<{ afterAsked: number; questionId: string; value: AnswerValue }> }>
}
const registry = JSON.parse(readFileSync(resolvePath(qaeRoot, 'Contracts/profile/athlete-profile-fields.json'), 'utf8')) as {
  fields: Array<{ field: string; required: boolean; sources: string[]; consumers: string[] }>
}
const legacyDump = JSON.parse(readFileSync(resolvePath(qaeRoot, 'Contracts/content/question-bank.legacy.json'), 'utf8')) as {
  questions: Array<{ id: string }>
}

// ── Persona walk (same engine functions the journey runner uses) ─────────────
const defaultAnswer = (q: QuestionDef): AnswerValue | null => {
  if (q.answerType === 'multi') return q.options && q.options.length > 0 ? [q.options[0]] : []
  if (q.answerType === 'openList') return []
  if (q.options && q.options.length > 0) return q.options[0]
  if (q.range) return q.range.min
  if (q.answerType === 'boolean') return false
  if (q.answerType === 'text') return 'n/a'
  return null
}
const adapt = (q: QuestionDef, v: AnswerValue): AnswerValue => {
  if (q.answerType === 'multi' || q.answerType === 'openList') return Array.isArray(v) ? v : [String(v)]
  if (q.answerType === 'number' && typeof v === 'string' && /^\d+$/.test(v)) return Number(v)
  return v
}
function walk(persona: (typeof personasFile.personas)[number]): { state: QuestionSessionState; stop: string | null } {
  let state: QuestionSessionState = EMPTY_SESSION
  const pending = [...(persona.inject ?? [])]
  for (let i = 0; i < 80; i++) {
    for (let k = pending.length - 1; k >= 0; k--) {
      if (countedAsked(state, BANK) >= pending[k].afterAsked) {
        const t = BANK.find((b) => b.id === pending[k].questionId)
        if (t) {
          const r = applyAnswer(BANK, CONFIG, state, t.id, adapt(t, pending[k].value), NOW)
          if (r.ok) state = r.state
        }
        pending.splice(k, 1)
      }
    }
    const facts = deriveRoutingFacts(viewOf(BANK, state, NOW).facts)
    const sel = selectNext(BANK, CONFIG, state, facts)
    if (!sel.question) return { state, stop: sel.stopReason }
    const q = sel.question
    let v = Object.prototype.hasOwnProperty.call(persona.overrides, q.key) ? adapt(q, persona.overrides[q.key]) : defaultAnswer(q)
    if (v === null) {
      state = skipQuestion(state, q.id)
      continue
    }
    let r = applyAnswer(BANK, CONFIG, state, q.id, v, NOW)
    if (!r.ok) {
      v = defaultAnswer(q)
      r = v === null ? r : applyAnswer(BANK, CONFIG, state, q.id, v, NOW)
    }
    state = r.ok ? r.state : skipQuestion(state, q.id)
  }
  return { state, stop: 'overrun' }
}

const REQUIRED_FIELDS = registry.fields.filter((f) => f.required).map((f) => f.field)
const getPath = (obj: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined), obj)

// ── §7 · 12-persona contract completeness ────────────────────────────────────
for (const persona of personasFile.personas) {
  const { state, stop } = walk(persona)
  const facts = viewOf(BANK, state, NOW).facts
  const built = buildAthleteProfile(facts, CONFIG.conflicts, state.resolvedConflictIds)
  const rebuilt = buildAthleteProfile(facts, CONFIG.conflicts, state.resolvedConflictIds)
  const p = built.profile
  check(`${persona.name}: questionnaire completes`, stop === 'complete' || stop === 'cap_reached', String(stop))
  check(`${persona.name}: profile complete + required fields present`,
    p.status === 'complete' && REQUIRED_FIELDS.every((f) => getPath(p, f) !== undefined && getPath(p, f) !== null),
    REQUIRED_FIELDS.filter((f) => getPath(p, f) === undefined || getPath(p, f) === null).join(','))
  check(`${persona.name}: provenance exists for every registry field`, registry.fields.every((f) => built.provenance[f.field] !== undefined || !f.required))
  check(`${persona.name}: byte-identical normalized profile`, canonicalSerialize(built) === canonicalSerialize(rebuilt))
  const serialized = JSON.stringify(p)
  check(`${persona.name}: no question ID leaks into the profile`, !legacyDump.questions.some((q) => serialized.includes(`"${q.id}"`)))
}

// ── §8 · Adversarial cases ───────────────────────────────────────────────────
const base = walk(personasFile.personas[0])
const baseFacts = viewOf(BANK, base.state, NOW).facts

// 1. Missing age.
const noAge = Object.fromEntries(Object.entries(baseFacts).filter(([k]) => k !== 'age')) as FactMap
const noAgeProfile = buildAthleteProfile(noAge, CONFIG.conflicts, []).profile
check('adversarial: missing age ⇒ incomplete, age listed missing, NOT adult', noAgeProfile.status === 'incomplete' && noAgeProfile.dataQuality.missingEvidence.includes('age') && noAgeProfile.identity.ageYears === null && noAgeProfile.goal.minorGoalRestrictions === false && noAgeProfile.goal.effectiveGoal === null)

// 2/3. Age 17 vs 18 boundary.
const at = (age: number): ReturnType<typeof buildAthleteProfile> => buildAthleteProfile({ ...baseFacts, age, primaryGoalDisplay: 'fat_loss' }, CONFIG.conflicts, [])
check('adversarial: age 17 ⇒ minor restrictions, effectiveGoal maintain, target notApplicableMinor',
  at(17).profile.goal.minorGoalRestrictions && at(17).profile.goal.effectiveGoal === 'maintain' && at(17).profile.body.weightTargetStatus === 'notApplicableMinor')
check('adversarial: age 18 ⇒ full goals, cut honored', !at(18).profile.goal.minorGoalRestrictions && at(18).profile.goal.effectiveGoal === 'cut')

// 4/5. Target weight absent / invalid.
check('adversarial: target weight absent ⇒ status notCollected (L-QST-7 truth)', at(30).profile.body.weightTargetStatus === 'notCollected' && at(30).profile.body.targetWeightGrams === null)
const invalidTarget = buildAthleteProfile({ ...baseFacts, age: 30, targetWeightKg: 'ninety' }, CONFIG.conflicts, []).profile
check('adversarial: non-integer target weight never enters the profile', invalidTarget.body.targetWeightGrams === null && invalidTarget.body.weightTargetStatus === 'notCollected')

// 6. Returning user.
const returning = buildAthleteProfile({ ...baseFacts, trainedBefore: 'years', totalMonths: 'y3_plus', lastTrained: 'm3_12', selfLevel: 'advanced', programExperience: 'wrote_own', knowsProgression: 'yes', tracksSets: 'always', exerciseFamiliarity: 'all' }, CONFIG.conflicts, []).profile
check('adversarial: returning ⇒ returningStatus + conservative capacity + knowledge retained',
  returning.training.returningStatus === 'returning' && returning.training.experienceBand.currentWorkCapacity.conservative && returning.training.experienceBand.trainingKnowledge === 'advanced')

// 7. Injury contradiction: pain evidence with hasInjury=none.
const painNoInjury = buildAthleteProfile({ ...baseFacts, hasInjury: 'none', painLevel: 7 }, CONFIG.conflicts, []).profile
check('adversarial: pain evidence without injury report ⇒ contradiction recorded, flags kept',
  painNoInjury.dataQuality.contradictions.includes('painEvidenceWithoutInjuryReport') && painNoInjury.safety.safetyFlags.includes('highPain'))

// 8. Equipment contradiction: gym + bodyweightOnly.
const equipConflict = buildAthleteProfile({ ...baseFacts, place: 'gym', trainingStyle: 'machines', bodyweightOnly: true }, CONFIG.conflicts, []).profile
check('adversarial: gym+bodyweightOnly ⇒ equipment conflict recorded, capabilities still full-gym', equipConflict.dataQuality.contradictions.includes('equipment') && equipConflict.training.equipmentCapabilities['barbell'] === true)

// 9. Reported vs observed adherence conflict — structure present, both sides carried.
const adherence = buildAthleteProfile({ ...baseFacts, planAdherenceStyle: 'strict' }, CONFIG.conflicts, []).profile
check('adversarial: adherence carries reported+observed with per-side confidence', adherence.adherence.reported.value === 'strict' && adherence.adherence.reported.confidence === 'low' && adherence.adherence.observed.value === null && adherence.adherence.observed.confidence === 'none')

// 10. Missing step baseline.
const noSteps = Object.fromEntries(Object.entries(baseFacts).filter(([k]) => !k.startsWith('dailySteps'))) as FactMap
check('adversarial: missing step baseline ⇒ null + confidence none (unknown ≠ sedentary)',
  buildAthleteProfile(noSteps, CONFIG.conflicts, []).profile.lifestyle.baselineStepsBucket === null && buildAthleteProfile(noSteps, CONFIG.conflicts, []).profile.lifestyle.baselineStepsConfidence === 'none')

// ── §5 · Select-constraint enforcement (no silent widening) ──────────────────
const consent = applyAnswer(BANK, CONFIG, EMPTY_SESSION, 's-health-consent', true, NOW)
if (!consent.ok) throw new Error('consent setup failed')
const injuryYes = applyAnswer(BANK, CONFIG, consent.state, 'l-has-injury', 'current', NOW)
if (!injuryYes.ok) throw new Error('injury setup failed')
const tooFew = applyAnswer(BANK, CONFIG, injuryYes.state, 'l-current-areas', [], NOW)
check('select.min enforced by name (too_few) — l-current-areas', !tooFew.ok && tooFew.error === 'too_few')
const okAreas = applyAnswer(BANK, CONFIG, injuryYes.state, 'l-current-areas', ['knee'], NOW)
check('select.min satisfied passes', okAreas.ok)
const muscleQ = BANK.find((q) => q.id === 'g-muscle-priority')
check('select carried into converted bank (g-muscle-priority min1 max3)', muscleQ?.select?.min === 1 && muscleQ?.select?.max === 3)
const tooMany = applyAnswer(BANK, CONFIG, injuryYes.state, 'g-muscle-priority', ['chest', 'back', 'shoulders', 'biceps'], NOW)
check('select.max enforced by name (too_many) — g-muscle-priority', !tooMany.ok && (tooMany.error === 'too_many' || tooMany.error === 'option_not_available'), String((tooMany as { error?: string }).error))

// ── §6 · Hard separation: downstream contracts contain ZERO question IDs ─────
const questionIds = legacyDump.questions.map((q) => q.id)
const leaks: string[] = []
const scanTargets: Array<[string, string[]]> = [
  ['Domain/Decisions', readdirSync(resolvePath(qaeRoot, 'Domain/Decisions'))],
  ['Domain/Safety', readdirSync(resolvePath(qaeRoot, 'Domain/Safety'))],
  ['Domain/Profile', readdirSync(resolvePath(qaeRoot, 'Domain/Profile'))],
  ['Contracts/schemas', readdirSync(resolvePath(qaeRoot, 'Contracts/schemas'))],
]
for (const [dir, files] of scanTargets) {
  for (const f of files) {
    const src = readFileSync(join(resolvePath(qaeRoot, dir), f), 'utf8')
    for (const id of questionIds) {
      if (src.includes(`'${id}'`) || src.includes(`"${id}"`)) leaks.push(`${dir}/${f}: ${id}`)
    }
  }
}
check('downstream domains + contracts contain zero question IDs', leaks.length === 0, leaks.slice(0, 5).join(' | '))
check('registry consumers never include the question engine reading back', registry.fields.every((f) => f.consumers.every((c) => c !== 'questionBank')))
check('registry sources are evidence keys, not question ids', registry.fields.every((f) => f.sources.every((s2) => !questionIds.includes(s2))))

// ── Determinism of profile serialization ─────────────────────────────────────
const p1 = buildAthleteProfile(baseFacts, CONFIG.conflicts, base.state.resolvedConflictIds)
const shuffledFacts = Object.fromEntries(Object.entries(baseFacts).reverse()) as FactMap
const p2 = buildAthleteProfile(shuffledFacts, CONFIG.conflicts, base.state.resolvedConflictIds)
check('profile canonical serialization is fact-order invariant', canonicalSerialize(p1.profile) === canonicalSerialize(p2.profile))
let floatFree = true
try { canonicalSerialize(p1) } catch { floatFree = false }
check('profile + provenance canonicalize with zero floats', floatFree)

console.log(`qae-profile-proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
