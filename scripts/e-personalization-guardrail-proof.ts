// إثبات E مباشر لحدّ generatePlan:
// - القاصر مع cutting/bulking يحصل على maintenance في كل مخرجات المحرّك.
// - عمر 18 يبقى حدًا عكسيًا يعيد أهداف البالغين.
// - خطة المبتدئ لا تضم تمرينًا متقدّمًا ولا مصطلحات حمل متقدّمة يملكها المحرّك.

import { defaultProfile, MINOR_GOAL_RESTRICTION_NOTE } from '@/lib/calculators'
import { generatePlan, type GeneratedPlan } from '@/lib/planGenerator'
import { getExercise } from '@/data/exercises'
import type { GoalType, Profile } from '@/types/profile'

let passed = 0
const failures: string[] = []

function check(label: string, condition: boolean): void {
  if (condition) {
    passed++
    console.log(`  ✓ ${label}`)
  } else {
    failures.push(label)
    console.log(`  ✗ ${label}`)
  }
}

function profileFor(age: number, goalType: GoalType, overrides: Partial<Profile> = {}): Profile {
  return {
    ...defaultProfile,
    age,
    goalType,
    // قيمة متعارضة عمدًا: يثبت الإثبات أن GoalType المنظَّم، لا نص/غلاف العرض،
    // هو ما يقود generatePlan عند حدّه.
    goal: 'maintain',
    trainingDays: 4,
    workoutDuration: 60,
    trainingLevel: 'intermediate',
    experienceLevel: 'intermediate',
    experienceBand: '1to2y',
    splitMode: 'auto',
    muscleFocus: 'balanced',
    injuries: '',
    ...overrides,
  }
}

function workoutPrescription(plan: GeneratedPlan): string {
  return JSON.stringify(
    plan.workoutPlan.days.map((day) =>
      day.exercises.map(({ exerciseId, sets, reps, restSec, optional }) => ({
        exerciseId,
        sets,
        reps,
        restSec,
        optional: optional === true,
      })),
    ),
  )
}

function commitmentIds(plan: GeneratedPlan): string {
  return plan.commitmentPlan.items.map((item) => item.commitmentId).join(',')
}

function ownedText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(ownedText).join(' ')
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).map(ownedText).join(' ')
  }
  return ''
}

console.log('\n═══ 1) AGES 13/15/17 — CUTTING/BULKING COLLAPSE TO MAINTENANCE ═══')
for (const age of [13, 15, 17]) {
  const minorMaintenance = generatePlan(profileFor(age, 'maintenance'))
  const minorCutting = generatePlan(profileFor(age, 'cutting'))
  const minorBulking = generatePlan(profileFor(age, 'bulking'))

  for (const [goal, plan] of [
    ['cutting', minorCutting],
    ['bulking', minorBulking],
  ] as const) {
    check(`age ${age} ${goal}: target calories equal maintenance`, plan.targets.targetCalories === minorMaintenance.targets.targetCalories)
    check(`age ${age} ${goal}: target calories equal TDEE`, plan.targets.targetCalories === plan.targets.tdee)
    check(`age ${age} ${goal}: macros equal maintenance`, (
      plan.targets.proteinGrams === minorMaintenance.targets.proteinGrams
      && plan.targets.fatGrams === minorMaintenance.targets.fatGrams
      && plan.targets.carbsGrams === minorMaintenance.targets.carbsGrams
    ))
    check(`age ${age} ${goal}: nutrition prescription equals maintenance`, JSON.stringify(plan.nutritionPlan) === JSON.stringify(minorMaintenance.nutritionPlan))
    check(`age ${age} ${goal}: sets/reps/rest equal maintenance`, workoutPrescription(plan) === workoutPrescription(minorMaintenance))
    check(`age ${age} ${goal}: commitments equal maintenance`, commitmentIds(plan) === commitmentIds(minorMaintenance))
    check(`age ${age} ${goal}: label equals maintenance`, plan.planLabelAr === minorMaintenance.planLabelAr)
    check(`age ${age} ${goal}: explanation equals maintenance`, plan.explanationAr === minorMaintenance.explanationAr)
    check(`age ${age} ${goal}: restriction is explained`, plan.warningsAr.includes(MINOR_GOAL_RESTRICTION_NOTE))
    check(`age ${age} ${goal}: no cut/bulk wording leaks into label/explanation/warnings`, (
      !`${plan.planLabelAr} ${plan.explanationAr} ${plan.warningsAr.join(' ')}`.match(/تنشيف|تضخيم|cutting|bulking/i)
    ))
  }
  check(`age ${age}: cutting and bulking produce the same restricted warnings`, JSON.stringify(minorCutting.warningsAr) === JSON.stringify(minorBulking.warningsAr))
}

console.log('\n═══ 2) AGE 18 — ADULT GOALS ARE NOT GENERALIZED AWAY ═══')
const adultMaintenance = generatePlan(profileFor(18, 'maintenance'))
const adultCutting = generatePlan(profileFor(18, 'cutting'))
const adultBulking = generatePlan(profileFor(18, 'bulking'))

check('18 cutting: calorie deficit is restored', adultCutting.targets.targetCalories < adultCutting.targets.maintenanceCalories)
check('18 bulking: calorie surplus is restored', adultBulking.targets.targetCalories > adultBulking.targets.maintenanceCalories)
check('18 cutting: workout prescription differs from maintenance', workoutPrescription(adultCutting) !== workoutPrescription(adultMaintenance))
check('18 bulking: workout prescription differs from maintenance', workoutPrescription(adultBulking) !== workoutPrescription(adultMaintenance))
check('18 cutting: commitments differ from maintenance', commitmentIds(adultCutting) !== commitmentIds(adultMaintenance))
check('18 bulking: commitments differ from maintenance', commitmentIds(adultBulking) !== commitmentIds(adultMaintenance))
check('18 cutting: label and explanation preserve cutting', `${adultCutting.planLabelAr} ${adultCutting.explanationAr}`.includes('تنشيف'))
check('18 bulking: label and explanation preserve bulking', `${adultBulking.planLabelAr} ${adultBulking.explanationAr}`.includes('تضخيم'))
check('18 cutting: no minor restriction warning', !adultCutting.warningsAr.includes(MINOR_GOAL_RESTRICTION_NOTE))
check('18 bulking: no minor restriction warning', !adultBulking.warningsAr.includes(MINOR_GOAL_RESTRICTION_NOTE))

console.log('\n═══ 3) BEGINNER OUTPUT — NO ADVANCED EXERCISES OR LOAD TERMS ═══')
const beginner = generatePlan(profileFor(25, 'maintenance', {
  trainingLevel: 'beginner',
  experienceLevel: 'beginner',
  experienceBand: 'lt1m',
  workoutEnvironment: 'home',
  gymType: 'home',
  gymAccess: 'home',
  splitMode: 'auto',
  splitChoice: undefined,
}))
const beginnerExerciseIds = beginner.workoutPlan.days.flatMap((day) =>
  day.exercises.map((exercise) => exercise.exerciseId),
)
const advancedExerciseIds = beginnerExerciseIds.filter((id) => getExercise(id)?.level === 'advanced')
const forbiddenTerms = [/\bRIR\b/i, /\bRPE\b/i, /\bDeload\b/i, /\b1RM\b/i, /\bAMRAP\b/i]
const beginnerText = ownedText(beginner)

check('beginner plan is non-empty', beginnerExerciseIds.length > 0)
check('beginner receives no advanced-level exercise', advancedExerciseIds.length === 0)
check('beginner engine output contains none of RIR/RPE/Deload/1RM/AMRAP', forbiddenTerms.every((term) => !term.test(beginnerText)))

console.log(`\nE personalization guardrail: ${passed} passed, ${failures.length} failed`)
if (failures.length) {
  console.error(`Failed checks:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
