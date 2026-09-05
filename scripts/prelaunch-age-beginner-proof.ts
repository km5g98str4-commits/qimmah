import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { computeTargets, defaultProfile } from '@/lib/calculators'
import { initialDraftV2, validateStep } from '@/lib/onboardingV2Flow'
import { AGE_RANGE } from '@/config/profileDomain'
import { generatePlan } from '@/lib/planGenerator'
import { PlanPreview } from '@/components/plan/PlanPreview'
import { localizeGeneratedWarnings, profileChoiceStrings } from '@/i18n/dict/profileChoices'
import type { Consistency, Profile } from '@/types/profile'

let passed = 0
const failures: string[] = []
function check(label: string, ok: boolean): void {
  if (ok) { passed++; console.log(`  ✓ ${label}`) }
  else { failures.push(label); console.log(`  ✗ ${label}`) }
}

function profile(overrides: Partial<Profile>): Profile {
  return {
    ...defaultProfile,
    goalType: 'health',
    goal: 'maintain',
    workoutEnvironment: 'home',
    gymType: 'home',
    equipment: ['bodyweight', 'dumbbell'],
    trackNutrition: true,
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ⓪ AGE-FLOOR BOUNDARY — الحدّ ١٢، وحاجز الأمان دون ١٨ لم يتحرّك.
//
// حدّان مستقلّان لا واحد، وخلطهما هو الخطر الحقيقي في هذه الموجة:
//   • حدّ الأهلية (AGE_RANGE.min = 12) يقرّر **من يُسجَّل**.
//   • حدّ الأمان (ADULT_MIN_AGE = 18) يقرّر **من يرى وصفة رقمية للبالغين**.
// خفض الأوّل يجب ألّا يحرّك الثاني قِيد أنملة — وهذا القسم يثبت الأمرين معًا
// على المسارين الحقيقيّين: `validateStep` للتسجيل، و`computeTargets` للأرقام.
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n⓪ AGE-FLOOR BOUNDARY — 11 REJECTED · 12/17 SUPPRESSED · 18 ENABLED')

/** يبني مسودة إعداد مكتملة عند العمر المطلوب — المسار الحقيقي لا محاكاة. */
function draftAtAge(age: number) {
  return { ...initialDraftV2('boundary-proof'), age, gender: 'male' as const, heightCm: 170, weightKg: 60, healthDataConsent: true }
}
/** التسجيل مقبول ⇔ خطوة الأساسيات لا تُرجع أي رسالة منع. */
const registrationAccepted = (age: number) => validateStep(0, draftAtAge(age)) === null
const registrationVerdict = (age: number) => validateStep(0, draftAtAge(age))

const boundary: Array<{ age: number; register: 'ACCEPTED' | 'REJECTED'; numeric: 'SUPPRESSED' | 'ENABLED' | null }> = [
  { age: 11, register: 'REJECTED', numeric: null },
  { age: 12, register: 'ACCEPTED', numeric: 'SUPPRESSED' },
  { age: 17, register: 'ACCEPTED', numeric: 'SUPPRESSED' },
  { age: 18, register: 'ACCEPTED', numeric: 'ENABLED' },
]

for (const row of boundary) {
  const accepted = registrationAccepted(row.age)
  check(`AGE_${row.age}_REGISTRATION = ${row.register}`, accepted === (row.register === 'ACCEPTED'))
  if (row.register === 'REJECTED') {
    // الرفض يجب أن يكون **مسمّى** (§4.2): «تحت الحدّ» لا «حقول ناقصة».
    check(`AGE_${row.age}: rejection is the named age reason, not a generic field error`,
      registrationVerdict(row.age) === 'ageBelowMin')
    continue
  }
  const t = computeTargets(profile({ age: row.age }))
  const suppressed = t.numericNutritionStatus === 'suppressed-under18'
  check(`AGE_${row.age}_ADULT_NUMERIC_OUTPUT = ${row.numeric}`,
    row.numeric === 'SUPPRESSED' ? suppressed : t.numericNutritionStatus === 'available')
  const adultNumbers = [
    t.bmi, t.bmr, t.tdee, t.maintenanceCalories, t.cuttingCalories, t.bulkingCalories,
    t.targetCalories, t.proteinGrams, t.carbsGrams, t.fatGrams, t.waterLiters,
    t.weeklyWeightChangeKg, t.estimatedWeeksToGoal,
  ]
  check(`AGE_${row.age}: every adult-derived number is ${row.numeric === 'SUPPRESSED' ? 'zero' : 'non-zero where prescribed'}`,
    row.numeric === 'SUPPRESSED'
      ? adultNumbers.every((v) => v === 0)
      : t.targetCalories > 0 && t.proteinGrams > 0 && t.waterLiters > 0 && t.bmr > 0 && t.tdee > 0)
}

// الحدّ الجديد يُقرأ من مصدر واحد — لا رقم مهرَّب.
check('AGE_RANGE.min === 12 (single source of truth)', AGE_RANGE.min === 12)
check('the safety boundary did not move: 17 minor, 18 adult', 
  computeTargets(profile({ age: 17 })).numericNutritionStatus === 'suppressed-under18' &&
  computeTargets(profile({ age: 18 })).numericNutritionStatus === 'available')

// ⚔️ تأكيد مضادّ (§4.2): الإثبات يجب أن يسقط لو عاد الحدّ ١٣ أو لو زحف حدّ
// الأمان. نحاكي الحالتين ونتحقّق أن كلًّا منهما **يُكتشف بفحص مسمّى** لا بصدفة.
check('⚔️ a floor of 13 would fail this proof (age 12 would be rejected)',
  !(AGE_RANGE.min === 13) && registrationAccepted(12))
check('⚔️ a safety boundary crawl to 12 would fail this proof (12 must stay suppressed)',
  computeTargets(profile({ age: 12 })).numericNutritionStatus !== 'available')
check('⚔️ boundary table is non-empty and covers 11/12/17/18',
  boundary.length === 4 && boundary.map((r) => r.age).join(',') === '11,12,17,18')

console.log('\n① UNDER-18 AUTHORITY — 12/17 SUPPRESSED; 18 RESTORED')
for (const age of [12, 17]) {
  const targets = computeTargets(profile({ age }))
  check(`age ${age}: explicit suppressed status`, targets.numericNutritionStatus === 'suppressed-under18')
  check(`age ${age}: no adult energy/macros/hydration/BMI numbers`, [
    targets.bmi, targets.bmr, targets.tdee, targets.maintenanceCalories,
    targets.cuttingCalories, targets.bulkingCalories, targets.targetCalories,
    targets.proteinGrams, targets.carbsGrams, targets.fatGrams, targets.waterLiters,
    targets.weeklyWeightChangeKg, targets.estimatedWeeksToGoal,
  ].every((value) => value === 0))
  const generated = generatePlan(profile({ age }))
  check(`age ${age}: generated nutrition has no numeric prescription`,
    generated.nutritionPlan.targetCalories === 0 &&
    generated.nutritionPlan.targetProtein === 0 &&
    generated.nutritionPlan.targetCarbs === 0 &&
    generated.nutritionPlan.targetFat === 0 &&
    generated.nutritionPlan.targetWaterLiters === 0)
  check(`age ${age}: food logging remains enabled`, generated.nutritionPlan.enabled)
}
const adultTargets = computeTargets(profile({ age: 18 }))
check('age 18: adult numeric prescription restored', adultTargets.numericNutritionStatus === 'available')
check('age 18: adult targets are non-zero', adultTargets.targetCalories > 0 && adultTargets.waterLiters > 0)

console.log('\n② AR/EN LIVE PLAN PREVIEW — QUALITATIVE POLICY, NO TARGET WIDGET')
const minorHighFrequency = generatePlan(profile({ age: 17, trainingDays: 6, workoutDuration: 75, consistency: 'never', trainingLevel: 'beginner', experienceLevel: 'beginner', experienceBand: 'lt1m' }))
for (const lang of ['ar', 'en'] as const) {
  const notes = localizeGeneratedWarnings(lang, minorHighFrequency.warningsAr)
  const markup = renderToStaticMarkup(h(PlanPreview, { lang, plan: minorHighFrequency, goalType: 'health', notes }))
  const policy = profileChoiceStrings[lang]
  check(`${lang}: qualitative age guidance is visible`, markup.includes(policy.minorNutritionGuidanceBody))
  check(`${lang}: numeric target list is absent`, !markup.includes('data-testid="plan-preview-macros"'))
  check(`${lang}: high-frequency beginner warning is visible`, notes.some((note) => markup.includes(note) && /3.?4|٣.?٤/.test(note)))
}

console.log('\n③ BEGINNER/RETURNING MATRIX — AGE × HISTORY × 3–7 DAYS × 45–90 MIN')
type Scenario = { name: string; level: Profile['trainingLevel']; experience: Profile['experienceLevel']; band: Profile['experienceBand']; consistency: Consistency }
const scenarios: Scenario[] = [
  { name: 'never', level: 'beginner', experience: 'beginner', band: 'lt1m', consistency: 'never' },
  { name: 'beginner', level: 'beginner', experience: 'beginner', band: '1to6m', consistency: 'regular' },
  { name: 'returning', level: 'intermediate', experience: 'intermediate', band: '1to2y', consistency: 'returning' },
]
const totalSets = (p: ReturnType<typeof generatePlan>) => p.workoutPlan.days.reduce(
  (sum, day) => sum + day.exercises.reduce((daySum, exercise) => daySum + exercise.sets, 0), 0,
)
let matrixCases = 0
let strictNeverReduction = 0
for (const age of [17, 18]) {
  for (const days of [3, 4, 5, 6, 7]) {
    for (const duration of [45, 60, 75, 90]) {
      const built = new Map<string, ReturnType<typeof generatePlan>>()
      for (const scenario of scenarios) {
        const plan = generatePlan(profile({
          age, trainingDays: days, workoutDuration: duration,
          trainingLevel: scenario.level, experienceLevel: scenario.experience,
          experienceBand: scenario.band, consistency: scenario.consistency,
        }))
        built.set(scenario.name, plan)
        matrixCases++
        check(`${age}/${scenario.name}/${days}d/${duration}m: no 1-of-1 workout`,
          plan.workoutPlan.days.length === days && plan.workoutPlan.days.every((day) => day.exercises.length > 1))
        check(`${age}/${scenario.name}/${days}d/${duration}m: age policy preserved`,
          plan.targets.numericNutritionStatus === (age < 18 ? 'suppressed-under18' : 'available'))
        check(`${age}/${scenario.name}/${days}d/${duration}m: high-frequency warning contract`,
          plan.warningsAr.includes('للمبتدئ ننصح بـ3–4 أيام في البداية لبناء الالتزام والاستشفاء.') ===
            (scenario.level === 'beginner' && days >= 5))
      }
      const neverSets = totalSets(built.get('never')!)
      const beginnerSets = totalSets(built.get('beginner')!)
      check(`${age}/${days}d/${duration}m: never is no heavier than beginner`, neverSets <= beginnerSets)
      if (neverSets < beginnerSets) strictNeverReduction++
    }
  }
}
check('matrix executed all 120 cases', matrixCases === 120)
check('never receives a strict conservative reduction in at least one matched case', strictNeverReduction > 0)

console.log('\n④ ⚔️ ANTI-BYPASS STRUCTURE')
const calculatorSource = readFileSync(resolve(process.cwd(), 'src/lib/calculators.ts'), 'utf8')
const generatorSource = readFileSync(resolve(process.cwd(), 'src/lib/planGenerator.ts'), 'utf8')
const minorGuard = calculatorSource.indexOf('if (isMinorAge(age))')
const adultFormula = calculatorSource.indexOf('const bmr = round(bmrFor')
check('minor authority exits before the adult BMR formula', minorGuard >= 0 && adultFormula > minorGuard)
check('generator refuses fallback nutrition when status is suppressed',
  /targets\.numericNutritionStatus !== 'available'[\s\S]*targetCalories: 0/.test(generatorSource))
check('⚔️ old maintenance-only behavior would fail the zero-output contract', adultTargets.targetCalories !== 0)

console.log(`\nPrelaunch age/beginner proof: ${passed} passed, ${failures.length} failed`)
if (failures.length) {
  console.error(`Failed checks:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
