// QAE Phase 1 proof suite ([CTO-QAE-002]).
// Proves: (1) SafetyPolicy foundation behavior incl. tier order and the U1
// unknown-age supersession, with named-check counter-attacks (charter §4.2);
// (2) oracle compatibility of the minors policy (QAE vs legacy calculators);
// (3) canonical serialization + localDate determinism vectors.
// Bundled by run-qae-proof.mjs (esbuild, @→src alias for the oracle imports).

import { effectiveGoalTypeForAge, isMinorAge } from '@/lib/calculators'
import {
  assertIssuable,
  checkComposite,
  SAFETY_TIER_ORDER,
  validatePlanCandidate,
  type CompositeComponent,
} from '../Domain/Safety/safetyPolicy'
import { canonicalSerialize } from '../Domain/Shared/canonical'
import { localDate } from '../Domain/Shared/time'
import { divRoundHalfAwayFromZero, ordinalCompare, quantize } from '../Domain/Shared/numeric'
import type { GoalType, Sex } from '../Domain/Shared/core'

let passed = 0
let failed = 0
const fail = (name: string, detail: string): void => {
  failed++
  console.error(`✗ ${name} — ${detail}`)
}
const check = (name: string, ok: boolean, detail = ''): void => {
  if (ok) {
    passed++
  } else {
    fail(name, detail)
  }
}

// ── أ · Minors policy: QAE vs oracle compatibility matrix ────────────────────
const AGES = [14, 15, 17, 18, 25] as const
const GOALS: GoalType[] = ['cut', 'bulk', 'maintain']
const LEGACY_GOAL: Record<GoalType, 'cutting' | 'bulking' | 'maintenance'> = {
  cut: 'cutting',
  bulk: 'bulking',
  maintain: 'maintenance',
}
let matrixTotal = 0
let matrixMatch = 0
for (const age of AGES) {
  for (const goal of GOALS) {
    matrixTotal++
    const oracleGoal = effectiveGoalTypeForAge(LEGACY_GOAL[goal], age)
    const res = validatePlanCandidate(
      { sex: 'male', ageYears: age, requestedGoalType: goal },
      { goalType: goal, calorieTargetKcal: 2200 },
    )
    const qaeGoal = res.plan ? LEGACY_GOAL[res.plan.goalType] : 'blocked'
    if (qaeGoal === oracleGoal) matrixMatch++
    check(`أ: parity age=${age} goal=${goal}`, qaeGoal === oracleGoal, `oracle=${oracleGoal} qae=${qaeGoal}`)
  }
}
// Minor clamps are visible, never silent.
const minorRes = validatePlanCandidate(
  { sex: 'male', ageYears: 17, requestedGoalType: 'cut' },
  { goalType: 'cut', calorieTargetKcal: 2200 },
)
check('أ: minor clamp visible', minorRes.verdict === 'clamped' && minorRes.clamps[0]?.reasonCodes.includes('minorGoalRestricted'))
check('أ: minor clamp tier CRITICAL', minorRes.clamps[0]?.tier === 'CRITICAL')

// ── ب · U1 supersession: unknown age is NOT adult (deliberate oracle deviation) ──
check('ب: oracle L-SAF-1 confirmed (age 0 not minor)', isMinorAge(0) === false)
const unknownAge = validatePlanCandidate(
  { sex: 'male', ageYears: null, requestedGoalType: 'cut' },
  { goalType: 'cut', calorieTargetKcal: 2200 },
)
check('ب: QAE blocks unknown age by name', unknownAge.verdict === 'blocked' && unknownAge.blocks[0]?.reasonCodes.includes('ageUnknownBlocking'))
check('ب: unknown age yields NO issuable plan', unknownAge.plan === undefined)
const below13 = validatePlanCandidate(
  { sex: 'female', ageYears: 12, requestedGoalType: 'maintain' },
  { goalType: 'maintain', calorieTargetKcal: 2000 },
)
check('ب: below app minimum blocks by name', below13.verdict === 'blocked' && below13.blocks[0]?.reasonCodes.includes('ageBelowAppMinimum'))

// ── ج · Nutrition bounds: VLCD + floors, clamps visible ──────────────────────
const vlcd = validatePlanCandidate(
  { sex: 'male', ageYears: 30, requestedGoalType: 'cut' },
  { goalType: 'cut', calorieTargetKcal: 700 },
)
check('ج: VLCD blocked by name', vlcd.verdict === 'blocked' && vlcd.blocks[0]?.reasonCodes.includes('vlcdBlocked'))
check('ج: VLCD block tier CRITICAL', vlcd.blocks[0]?.tier === 'CRITICAL')
const FLOORS: Array<[Sex, number]> = [['male', 1500], ['female', 1200], ['unspecified', 1350]]
for (const [sex, floor] of FLOORS) {
  const res = validatePlanCandidate(
    { sex, ageYears: 30, requestedGoalType: 'cut' },
    { goalType: 'cut', calorieTargetKcal: floor - 100 },
  )
  const clamp = res.clamps.find((c) => c.field === 'calorieTargetKcal')
  check(`ج: floor ${sex} clamps to ${floor} visibly`, res.verdict === 'clamped' && clamp?.adjusted === floor && clamp.reasonCodes.includes('calorieFloorApplied'), JSON.stringify(res))
  check(`ج: floor ${sex} keeps original value in clamp`, clamp?.original === floor - 100)
}

// ── د · Tier order: CRITICAL preempts HIGH ───────────────────────────────────
// Candidate violating BOTH the VLCD line (CRITICAL) and the floor (HIGH):
// resolution must begin with CRITICAL — a block, not a floor clamp.
const both = validatePlanCandidate(
  { sex: 'female', ageYears: 25, requestedGoalType: 'cut' },
  { goalType: 'cut', calorieTargetKcal: 750 },
)
check('د: CRITICAL evaluated before HIGH', both.verdict === 'blocked' && both.blocks[0]?.tier === 'CRITICAL' && both.clamps.every((c) => c.field !== 'calorieTargetKcal'))
check('د: tier order is frozen', Object.isFrozen(SAFETY_TIER_ORDER) && SAFETY_TIER_ORDER[0] === 'CRITICAL')

// ── هـ · Non-bypass counter-attack (charter §4.2: attack the gate) ───────────
const legit = validatePlanCandidate(
  { sex: 'male', ageYears: 30, requestedGoalType: 'cut' },
  { goalType: 'cut', calorieTargetKcal: 2000 },
)
let legitOk = false
try {
  if (legit.plan) {
    assertIssuable(legit.plan)
    legitOk = true
  }
} catch {
  legitOk = false
}
check('هـ: sealed plan passes assertIssuable', legitOk)
// Attack: a structurally identical forgery that skipped SafetyPolicy.
const forged = { goalType: 'cut', calorieTargetKcal: 500 }
let forgeryCaughtByName = false
try {
  assertIssuable(forged)
} catch (e) {
  forgeryCaughtByName = e instanceof Error && e.message.startsWith('QAE-SAFETY-BYPASS')
}
check('هـ: forged plan fails BY NAME (QAE-SAFETY-BYPASS)', forgeryCaughtByName)

// ── و · Composite legality ([CTO-QAE-001] §5 counter-test, mandated) ─────────
const deload: CompositeComponent[] = [
  { kind: 'changeTrainingVolume', deltaBp: -1000 },
  { kind: 'holdProgression' },
]
check('و: legitimate deload composite allowed', checkComposite(deload).allowed)
const smuggled: CompositeComponent[] = [
  { kind: 'changeCalories', deltaKcal: -300 },
  { kind: 'changeStepTarget', delta: 3000 },
  { kind: 'changeTrainingVolume', deltaBp: 2000 },
]
const smuggledRes = checkComposite(smuggled)
check('و: budget-bypass bundle rejected by name', !smuggledRes.allowed && smuggledRes.reasonCodes.includes('compositeContainsNonProtectiveAction'))
check('و: rejection names every offender', smuggledRes.offendingKinds.length === 3)
check('و: oversized composite rejected', !checkComposite([...deload, { kind: 'scheduleDeload' }, { kind: 'changeStepTarget', delta: -500 }]).allowed)
check('و: calorie INCREASE is protective', checkComposite([{ kind: 'changeCalories', deltaKcal: 150 }]).allowed)

// ── ز · Canonical serialization determinism ──────────────────────────────────
const a = { z: 1, a: [3, 2, { b: true, a: null }], m: 'نص' }
const b = { m: 'نص', a: [3, 2, { a: null, b: true }], z: 1 }
check('ز: key order does not affect canonical form', canonicalSerialize(a) === canonicalSerialize(b))
let floatCaught = false
try {
  canonicalSerialize({ x: 1.5 })
} catch (e) {
  floatCaught = e instanceof Error && e.message.startsWith('QAE-CANONICAL-VIOLATION')
}
check('ز: float rejected by name', floatCaught)
check('ز: undefined fields dropped deterministically', canonicalSerialize({ a: 1, b: undefined }) === '{"a":1}')

// ── ح · localDate arithmetic vectors ─────────────────────────────────────────
check('ح: epoch origin UTC', localDate(0, 0) === '1970-01-01')
check('ح: one ms before epoch, UTC', localDate(-1, 0) === '1969-12-31')
check('ح: UTC+3 crosses midnight', localDate(Date.UTC(2026, 7, 7, 22, 30), 180) === '2026-08-08')
check('ح: UTC-7 stays previous day', localDate(Date.UTC(2026, 7, 8, 3, 0), -420) === '2026-08-07')
check('ح: fixture clock @ +03:00', localDate(1785542400000, 180) === '2026-08-01')
check('ح: leap day', localDate(Date.UTC(2028, 1, 29, 12, 0), 0) === '2028-02-29')
let tzCaught = false
try {
  localDate(0, 900)
} catch (e) {
  tzCaught = e instanceof Error && e.message.startsWith('QAE-TIME-VIOLATION')
}
check('ح: out-of-range tz offset fails by name', tzCaught)

// ── ط · Numeric primitives ───────────────────────────────────────────────────
check('ط: half away from zero (positive)', divRoundHalfAwayFromZero(5, 2) === 3)
check('ط: half away from zero (negative)', divRoundHalfAwayFromZero(-5, 2) === -3)
check('ط: quantize kcal to 50', quantize(1976, 50) === 2000 && quantize(1974, 50) === 1950)
check('ط: ordinal compare is locale-free', ordinalCompare('a', 'b') === -1 && ordinalCompare('b', 'a') === 1 && ordinalCompare('a', 'a') === 0)

// ─────────────────────────────────────────────────────────────────────────────
console.log(`qae-proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
console.log(`oracle-compatibility(minors matrix): ${matrixMatch}/${matrixTotal} = ${Math.round((matrixMatch / matrixTotal) * 100)}%`)
