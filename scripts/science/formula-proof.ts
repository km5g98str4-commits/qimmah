// Scientific formula proof vectors against the live Qimmah implementations.
// Hand calculations and citations are documented in docs/features/FORMULAS.md.

import {
  ADULT_MIN_AGE,
  computeTargets,
  defaultProfile,
  MINOR_BMI_LABEL,
  MINOR_PLAN_NOTE,
  totalActivityMultiplier,
  WATER_MAX_LITERS,
  WATER_MIN_LITERS,
} from '@/lib/calculators'
import { computeAdherence, computeProtein, computeVolume, computeWeight, linregSlopePerDay, rollingSmooth } from '@/lib/insights/metrics'
import type { InsightInput } from '@/lib/insights/types'
import { brzycki, e1rm, epley, velocityKgPerWeek } from '@/lib/strength/e1rm'
import { computeLoadout, defaultPlateConfig, totalFromPerSide } from '@/lib/strength/plates'
import { generateWarmup } from '@/lib/strength/warmup'
import type { SetLog, WorkoutSession } from '@/lib/workoutSessions'
import type { Profile } from '@/types/profile'

let passed = 0
let failed = 0

function check(label: string, actual: unknown, expected: unknown): void {
  const ok = Object.is(actual, expected)
  console.log(`${ok ? '✓' : '✗'} ${label}: actual=${String(actual)} expected=${String(expected)}`)
  if (ok) passed++
  else failed++
}

function near(label: string, actual: number | null, expected: number, epsilon = 1e-9): void {
  const ok = actual !== null && Math.abs(actual - expected) <= epsilon
  console.log(`${ok ? '✓' : '✗'} ${label}: actual=${String(actual)} expected=${expected} ±${epsilon}`)
  if (ok) passed++
  else failed++
}

function profile(overrides: Partial<Profile>): Profile {
  return { ...defaultProfile, ...overrides }
}

function verifyTargets(label: string, p: Profile, expected: Partial<ReturnType<typeof computeTargets>>): void {
  const actual = computeTargets(p)
  for (const [key, value] of Object.entries(expected)) {
    check(`${label}.${key}`, actual[key as keyof typeof actual], value)
  }
}

console.log('\nCALORIE, MACRO, WATER, BMI, AND FORECAST VECTORS')
verifyTargets('male-cut-30', profile({
  gender: 'male', age: 30, heightCm: 178, weightKg: 85, targetWeightKg: 78,
  activityLevel: 'moderate', trainingDays: 4, goal: 'cut', goalType: 'cutting',
}), {
  bmr: 1818, tdee: 2636, targetCalories: 2236, proteinGrams: 153, fatGrams: 67,
  carbsGrams: 255, waterLiters: 3, bmi: 26.8, weeklyWeightChangeKg: -0.4,
  estimatedWeeksToGoal: 20,
})

verifyTargets('female-bulk-35', profile({
  gender: 'female', age: 35, heightCm: 165, weightKg: 62, targetWeightKg: 68,
  activityLevel: 'light', trainingDays: 3, goal: 'bulk', goalType: 'bulking',
}), {
  bmr: 1315, tdee: 1677, targetCalories: 1977, proteinGrams: 112, fatGrams: 59,
  carbsGrams: 250, waterLiters: 2.5, bmi: 22.8, weeklyWeightChangeKg: 0.3,
  estimatedWeeksToGoal: 22,
})

verifyTargets('male-maintain-18', profile({
  gender: 'male', age: 18, heightCm: 172, weightKg: 68, targetWeightKg: 68,
  activityLevel: 'active', trainingDays: 5, goal: 'maintain', goalType: 'maintenance',
}), {
  bmr: 1670, tdee: 2630, targetCalories: 2630, proteinGrams: 122, fatGrams: 79,
  carbsGrams: 358, waterLiters: 2.5, bmi: 23, weeklyWeightChangeKg: 0,
  estimatedWeeksToGoal: 0,
})

verifyTargets('female-cut-45', profile({
  gender: 'female', age: 45, heightCm: 160, weightKg: 75, targetWeightKg: 65,
  activityLevel: 'sedentary', trainingDays: 0, goal: 'cut', goalType: 'cutting',
}), {
  bmr: 1364, tdee: 1637, targetCalories: 1237, proteinGrams: 135, fatGrams: 37,
  carbsGrams: 91, waterLiters: 2.5, bmi: 29.3, weeklyWeightChangeKg: -0.4,
  estimatedWeeksToGoal: 28,
})

// Supported minor boundary: no adult-derived numeric prescription is computed or exposed.
verifyTargets('onboarding-min-age12', profile({
  gender: 'female', age: 12, heightCm: 120, weightKg: 30, targetWeightKg: 30,
  activityLevel: 'sedentary', trainingDays: 0, goal: 'maintain', goalType: 'maintenance',
}), {
  numericNutritionStatus: 'suppressed-under18', bmr: 0, tdee: 0, maintenanceCalories: 0,
  targetCalories: 0, proteinGrams: 0, fatGrams: 0, carbsGrams: 0, waterLiters: 0,
  bmi: 0, bmiLabel: '', weeklyWeightChangeKg: 0, estimatedWeeksToGoal: 0,
})

// Water is now clamped to WATER_MAX_LITERS (4.0). Pre-fix this vector returned 9.0 L —
// the guardrail regression below asserts it can never return there again.
verifyTargets('onboarding-max', profile({
  gender: 'male', age: 80, heightCm: 220, weightKg: 250, targetWeightKg: 250,
  activityLevel: 'very_active', trainingDays: 7, goal: 'maintain', goalType: 'maintenance',
}), { bmr: 3480, tdee: 5655, targetCalories: 5655, proteinGrams: 450, fatGrams: 170, carbsGrams: 581, waterLiters: 4, bmi: 51.7 })

check('zero-training activity multiplier', totalActivityMultiplier('sedentary', 0), 1.2)
check('seven-day activity multiplier', totalActivityMultiplier('very_active', 7), 1.625)

// ── SCIENTIFIC GUARDRAIL REGRESSION ────────────────────────────────────────
// These assertions lock in the two safety fixes and must never regress:
//   1) Water is clamped to [2.5, 4.0] L — the 9 L max-bound output can never return.
//   2) Under-18 users never receive adult-derived BMI, calorie, macro, hydration, or
//      forecast numbers. They receive explicit suppression state and qualitative guidance.
// The matrix covers age 12/17/18, both sexes, min/max weight+height, cut/bulk/maintain,
// and zero activity, as required by the mission.
console.log('\nSCIENTIFIC GUARDRAIL REGRESSION')

const targetsFor = (o: Partial<Profile>) => computeTargets(profile(o))

// (1) WATER GUARDRAIL — no output above WATER_MAX_LITERS at any allowed weight.
check('water cap: male 250kg is 4.0 L (was 9.0)', targetsFor({ gender: 'male', weightKg: 250, heightCm: 220, age: 80, targetWeightKg: 250, goalType: 'maintenance', goal: 'maintain', activityLevel: 'very_active', trainingDays: 7 }).waterLiters, WATER_MAX_LITERS)
check('water cap: female 250kg is 4.0 L', targetsFor({ gender: 'female', weightKg: 250, heightCm: 210, age: 70, targetWeightKg: 200, goalType: 'cutting', goal: 'cut', activityLevel: 'very_active', trainingDays: 7 }).waterLiters, WATER_MAX_LITERS)
check('water floor: min 15kg is 2.5 L', targetsFor({ gender: 'female', weightKg: 15, heightCm: 100, age: 18, targetWeightKg: 15, goalType: 'maintenance', goal: 'maintain', activityLevel: 'sedentary', trainingDays: 0 }).waterLiters, WATER_MIN_LITERS)
// Explicit "never 9 L again" across a sweep of the top of the allowed weight range.
for (const kg of [115, 150, 200, 250]) {
  const w = targetsFor({ gender: 'male', weightKg: kg, heightCm: 200, age: 30, targetWeightKg: kg, goalType: 'maintenance', goal: 'maintain', activityLevel: 'moderate', trainingDays: 4 }).waterLiters
  check(`water never exceeds cap at ${kg}kg`, w <= WATER_MAX_LITERS && w >= WATER_MIN_LITERS, true)
}

// (2) MINOR NUMERIC GUARDRAIL — under 18 gets no adult-derived numeric prescription.
for (const age of [12, 15, 17]) {
  for (const gender of ['male', 'female'] as const) {
    const t = targetsFor({ gender, age, heightCm: 160, weightKg: 60, targetWeightKg: 60, goalType: 'maintenance', goal: 'maintain', activityLevel: 'sedentary', trainingDays: 0 })
    check(`minor ${gender} age ${age}: explicit suppression state`, t.numericNutritionStatus, 'suppressed-under18')
    check(`minor ${gender} age ${age}: no BMI number or label`, t.bmi === 0 && t.bmiLabel === '', true)
    check(`minor ${gender} age ${age}: no calorie/macro/hydration numbers`,
      [t.bmr, t.tdee, t.maintenanceCalories, t.targetCalories, t.proteinGrams, t.fatGrams, t.carbsGrams, t.waterLiters].every((value) => value === 0), true)
    check(`minor ${gender} age ${age}: plan note present`, t.notes.includes(MINOR_PLAN_NOTE), true)
  }
}
// Adult boundary: exactly ADULT_MIN_AGE (18) is treated as an adult again.
for (const gender of ['male', 'female'] as const) {
  const t = targetsFor({ gender, age: ADULT_MIN_AGE, heightCm: 172, weightKg: 68, targetWeightKg: 68, goalType: 'maintenance', goal: 'maintain', activityLevel: 'active', trainingDays: 5 })
  check(`adult ${gender} age 18: not the minor label`, t.bmiLabel !== MINOR_BMI_LABEL, true)
  check(`adult ${gender} age 18: adult BMI label present`, t.bmiLabel.startsWith('حسب BMI:'), true)
  check(`adult ${gender} age 18: no minor note`, t.notes.includes(MINOR_PLAN_NOTE), false)
}

// Minor cut/bulk/maintain all keep suppression (goal must not re-open the adult path).
for (const goalType of ['cutting', 'bulking', 'maintenance'] as const) {
  const goal = goalType === 'cutting' ? 'cut' : goalType === 'bulking' ? 'bulk' : 'maintain'
  const t = targetsFor({ gender: 'male', age: 12, heightCm: 120, weightKg: 30, targetWeightKg: 30, goalType, goal, activityLevel: 'sedentary', trainingDays: 0 })
  check(`minor age 12 ${goalType}: suppression remains authoritative`, t.numericNutritionStatus, 'suppressed-under18')
}

// ── MINOR NUMERIC SUPPRESSION ───────────────────────────────────────────────
// Under-18 users receive no numeric prescription for ANY stored goalType, and no
// weight-change forecast is applied.
// A non-maintenance target weight is deliberately ignored so no cut/bulk leaks through.
for (const age of [12, 15, 17]) {
  for (const goalType of ['cutting', 'bulking', 'maintenance'] as const) {
    const goal = goalType === 'cutting' ? 'cut' : goalType === 'bulking' ? 'bulk' : 'maintain'
    // targetWeightKg set 8kg below current on purpose — a cut/bulk pipeline would react to it.
    const t = targetsFor({ gender: 'male', age, heightCm: 165, weightKg: 60, targetWeightKg: 52, goalType, goal, activityLevel: 'moderate', trainingDays: 4 })
    check(`minor age ${age} ${goalType}: target, maintenance, and TDEE are suppressed`, t.targetCalories === 0 && t.maintenanceCalories === 0 && t.tdee === 0, true)
    check(`minor age ${age} ${goalType}: suppression state survives stored goal`, t.numericNutritionStatus, 'suppressed-under18')
    check(`minor age ${age} ${goalType}: no weekly weight change`, t.weeklyWeightChangeKg, 0)
    check(`minor age ${age} ${goalType}: no ETA weeks`, t.estimatedWeeksToGoal, 0)
    check(`minor age ${age} ${goalType}: keeps «تقديري» minor plan note`, t.notes.includes(MINOR_PLAN_NOTE), true)
  }
}
// Adult boundary (18) with cutting: the deficit is RESTORED — full goals return at 18.
{
  const t = targetsFor({ gender: 'male', age: ADULT_MIN_AGE, heightCm: 165, weightKg: 60, targetWeightKg: 52, goalType: 'cutting', goal: 'cut', activityLevel: 'moderate', trainingDays: 4 })
  check('adult age 18 cutting: target < maintenance (deficit applied)', t.targetCalories < t.maintenanceCalories, true)
  check('adult age 18 cutting: target == cuttingCalories', t.targetCalories, t.cuttingCalories)
  check('adult age 18 cutting: weight-change forecast present', t.weeklyWeightChangeKg < 0, true)
}

console.log('\nINSIGHTS VECTORS')
near('OLS slope y=2x+1', linregSlopePerDay([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }]), 2)
const DAY = 86_400_000
const smooth = rollingSmooth([{ t: 0, v: 70 }, { t: DAY, v: 72 }, { t: 7 * DAY, v: 80 }], 7)
check('centered smoother first observation', smooth[0].v, 71)
check('centered smoother isolated last observation', smooth[2].v, 80)

const NOW = new Date(2026, 6, 16, 12).getTime()
const base: InsightInput = {
  nowMs: NOW,
  lang: 'ar',
  sessions: [],
  plan: { daysPerWeek: 4, targetProtein: 160, muscleGroups: [] },
  weights: [],
  proteinByDate: {},
  prBests: {},
}
const session = (date: string, volume = 0): InsightInput['sessions'][number] => ({ date, volume, muscleGroups: [], topSets: [] })
const adherence = computeAdherence({ ...base, sessions: [session('2026-07-15'), session('2026-07-14'), session('2026-07-12'), session('2026-07-10'), session('2026-07-08')] })
check('current adherence 3/4', adherence.pct, 75)
check('four-week adherence mean (75+50+0+0)/4', adherence.fourWeekAvgPct, 31)

const volume = computeVolume({ ...base, sessions: [session('2026-07-15', 200), session('2026-07-08', 100)] })
check('weekly volume delta (200-100)/100', volume.deltaPct, 100)

const protein = computeProtein({ ...base, proteinByDate: {
  '2026-07-16': 160, '2026-07-15': 144, '2026-07-14': 143, '2026-07-13': 180,
} })
check('protein hit days at >=90% target', protein.hitDays, 3)
check('protein logged days', protein.loggedDays, 4)

const weight = computeWeight({ ...base, weights: [
  { date: '2026-06-25', kg: 80 }, { date: '2026-07-02', kg: 79.8 },
  { date: '2026-07-09', kg: 79.6 }, { date: '2026-07-16', kg: 79.4 },
] })
check('weight slope kg/week', weight.slopeKgPerWeek, -0.2)
check('three-week plateau within 1.2kg full band', weight.plateau, true)

console.log('\nSTRENGTH VECTORS')
near('Epley 100kg x 12', epley(100, 12), 140)
near('Brzycki 100kg x 5', brzycki(100, 5), 112.5)
check('Qimmah hybrid <=10, rounded 0.5kg', e1rm(100, 5), 112.5)
check('Qimmah hybrid >10, rounded 0.5kg', e1rm(100, 12), 140)

const set = (weightKg: number): SetLog => ({ setNumber: 1, targetReps: '5', actualReps: '5', weightKg: String(weightKg), completed: true })
const workout = (id: string, date: string, weightKg: number): WorkoutSession => ({
  id, date, startedAt: `${date}T18:00:00Z`, finishedAt: `${date}T19:00:00Z`,
  workoutDayId: 'proof', workoutDayName: 'proof', exercises: [{
    exerciseId: 'bench', exerciseNameAr: 'بنش', targetSets: 1, targetReps: '5',
    targetRestSec: 90, completed: true, sets: [set(weightKg)],
  }],
})
check('endpoint e1RM velocity: (117-112.5)/2 weeks', velocityKgPerWeek('bench', [
  workout('a', '2026-07-01', 100), workout('b', '2026-07-15', 104),
]), 2.3)

const load100 = computeLoadout(100, defaultPlateConfig())
check('plate loadout reaches 100kg exactly', load100.achievedKg, 100)
check('bar + 2x per-side plates identity', totalFromPerSide(load100.perSide, load100.barKg), 100)
const warmup = generateWarmup(100, defaultPlateConfig(), 5)
check('warm-up ramp weights', warmup.map((step) => step.weightKg).join(','), '20,40,60,80,100')
check('warm-up ramp repetitions', warmup.map((step) => step.reps).join(','), '10,8,5,3,5')

console.log(`\nFormula proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
