// إثبات طبقة تعليل الخطة (حارة E · المرحلة الثانية — الموجة ١).
//
// الفحص كلّه على **المفاتيح والقيم المنظَّمة**، لا على نصّ معروض:
//   ١) لا نصّ عرض يتسرّب — لا حرف عربي في أي قيمة، ولا نصّ الإصابة (§9).
//   ٢) المحاور غير المفعّلة معلَنة بسلوك محايد ولا تدّعي تخصيصًا (§5).
//   ٣) كل مدخل مذكور يقود مخرَجًا فعلًا — تغييره يغيّر ناتجه.
//   ٤) القياسات مطابقة لمخرجات الخطة فعليًا لا مُعاد اشتقاقها.
//   ٥) اللغة لا تغيّر القيمة المخزّنة (نفس الملف = نفس التعليل بايت ببايت).

import { defaultProfile } from '@/lib/calculators'
import { generatePlan } from '@/lib/planGenerator'
import { getExercise } from '@/data/exercises'
import {
  buildPlanRationale,
  PLAN_TRAINING_FOCUS_DEFAULT,
  type PlanDecisionArea,
  type PlanRationale,
} from '@/lib/planRationale'
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

function profileFor(overrides: Partial<Profile> = {}): Profile {
  return {
    ...defaultProfile,
    age: 28,
    goalType: 'bulking' as GoalType,
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

function rationaleFor(overrides: Partial<Profile> = {}): PlanRationale {
  const p = profileFor(overrides)
  return buildPlanRationale(p, generatePlan(p))
}

function outcomeOf(r: PlanRationale, area: PlanDecisionArea): string | number | undefined {
  return r.decisions.find((d) => d.area === area)?.outcome.value
}

const base = rationaleFor()

console.log('\n═══ 1) NO DISPLAY TEXT — KEYS AND STRUCTURED VALUES ONLY ═══')
const ARABIC = /[؀-ۿ]/
const serialized = JSON.stringify(base)
check('rationale carries no Arabic character anywhere', !ARABIC.test(serialized))
check(
  'every driver value is a structured token or a number',
  base.decisions.every((d) =>
    d.drivers.every(
      (dr) => typeof dr.value === 'number' || /^[A-Za-z0-9_\-–]+$/.test(String(dr.value)),
    ),
  ),
)
check(
  'every outcome value is a structured token or a number',
  base.decisions.every(
    (d) =>
      typeof d.outcome.value === 'number' || /^[A-Za-z0-9_\-–]+$/.test(String(d.outcome.value)),
  ),
)
check('every decision declares a valid basis', base.decisions.every((d) => d.basis === 'measured' || d.basis === 'structural'))
check('rationale exposes both measured and structural decisions', (
  base.decisions.some((d) => d.basis === 'measured') && base.decisions.some((d) => d.basis === 'structural')
))

console.log('\n═══ 2) SENSITIVE INPUT NEVER LEAVES THE ENGINE (§9) ═══')
const injuryText = 'ألم في الركبة اليمنى knee pain'
const injured = rationaleFor({ injuries: injuryText })
check('raw injury text is absent from the rationale', !JSON.stringify(injured).includes('knee'))
check('raw injury text is absent in Arabic too', !JSON.stringify(injured).includes('الركبة'))
check('injury presence is reported as a stable token', outcomeOf(injured, 'injuryFilter') === 'applied')
check('no declared injury reports notApplied', outcomeOf(base, 'injuryFilter') === 'notApplied')

console.log('\n═══ 3) INACTIVE AXES ARE DECLARED, NOT CLAIMED (§5) ═══')
const focusAxis = base.inactiveAxes.find((a) => a.axis === 'trainingFocus')
check('trainingFocus is declared inactive', Boolean(focusAxis))
check('trainingFocus neutral value is general', focusAxis?.neutralValue === 'general')
check('trainingFocus neutral value equals the exported default', focusAxis?.neutralValue === PLAN_TRAINING_FOCUS_DEFAULT)
check('trainingFocus reason is fieldNotCollected', focusAxis?.reason === 'fieldNotCollected')
check('pastPerformance is declared inactive', base.inactiveAxes.some((a) => a.axis === 'pastPerformance'))
check(
  'no decision claims trainingFocus or pastPerformance as a driver',
  base.decisions.every((d) => d.drivers.every((dr) => dr.key !== ('trainingFocus' as never) && dr.key !== ('pastPerformance' as never))),
)
check(
  'the engine writes no starting weight — the inactive claim matches reality',
  generatePlan(profileFor()).workoutPlan.days.every((day) => day.exercises.every((ex) => !ex.startingWeight)),
)

console.log('\n═══ 4) EVERY DECLARED DRIVER ACTUALLY DRIVES ITS OUTCOME ═══')
check('training days change the split outcome', outcomeOf(rationaleFor({ trainingDays: 6 }), 'split') !== outcomeOf(base, 'split'))
check(
  'session minutes change the session size',
  outcomeOf(rationaleFor({ workoutDuration: 30 }), 'sessionSize') !== outcomeOf(rationaleFor({ workoutDuration: 90 }), 'sessionSize'),
)
check(
  'goal type changes the rep range',
  outcomeOf(rationaleFor({ goalType: 'cutting' }), 'repRange') !== outcomeOf(rationaleFor({ goalType: 'bulking' }), 'repRange'),
)
check(
  'goal type changes the calorie target',
  outcomeOf(rationaleFor({ goalType: 'cutting' }), 'calorieTarget') !== outcomeOf(rationaleFor({ goalType: 'bulking' }), 'calorieTarget'),
)
check(
  'gym access changes the resolved pool',
  outcomeOf(rationaleFor({ workoutEnvironment: 'home', gymType: 'home', gymAccess: 'home' }), 'equipmentPool') !== outcomeOf(base, 'equipmentPool'),
)
check('muscle focus changes its own outcome', outcomeOf(rationaleFor({ muscleFocus: 'lower' }), 'muscleFocus') === 'applied')
check('an on-and-off history reports a lighter first week', outcomeOf(rationaleFor({ consistency: 'onoff' }), 'startingLoad') === 'reduced')
check('a regular history reports a standard first week', outcomeOf(rationaleFor({ consistency: 'regular' }), 'startingLoad') === 'standard')
check(
  'the five-day split declares muscle focus as a driver, the four-day one does not',
  rationaleFor({ trainingDays: 5 }).decisions.find((d) => d.area === 'split')?.drivers.some((dr) => dr.key === 'muscleFocus') === true
    && base.decisions.find((d) => d.area === 'split')?.drivers.some((dr) => dr.key === 'muscleFocus') === false,
)

console.log('\n═══ 5) MEASURED VALUES MATCH THE PLAN, NOT A RE-DERIVATION ═══')
const plan = generatePlan(profileFor())
const rationale = buildPlanRationale(profileFor(), plan)
const knownSets = plan.workoutPlan.days
  .flatMap((d) => d.exercises)
  .filter((ex) => Boolean(getExercise(ex.exerciseId)))
  .reduce((sum, ex) => sum + ex.sets, 0)
check('weekly volume total equals the sum of the plan sets', outcomeOf(rationale, 'weeklyVolume') === knownSets)
check('per-muscle sets add up to the same total', rationale.weeklyVolume.reduce((s, v) => s + v.sets, 0) === knownSets)
check('no muscle claims more sessions than there are training days', rationale.weeklyVolume.every((v) => v.sessions <= plan.workoutPlan.days.length))
check('every muscle with sets has at least one session', rationale.weeklyVolume.every((v) => v.sets === 0 || v.sessions >= 1))
check(
  'session size equals the largest day in the plan',
  outcomeOf(rationale, 'sessionSize') === plan.workoutPlan.days.reduce((m, d) => Math.max(m, d.exercises.length), 0),
)
check('split outcome equals the template the engine actually chose', outcomeOf(rationale, 'split') === plan.suggestedWorkoutTemplateId)
check('calorie outcome equals the computed target', outcomeOf(rationale, 'calorieTarget') === plan.targets.targetCalories)

console.log('\n═══ 6) AGE GUARDRAIL IS REPORTED ONLY WHEN IT APPLIES ═══')
const minor = rationaleFor({ age: 15, goalType: 'cutting' })
check('a minor cutting goal reports the guardrail', outcomeOf(minor, 'ageGuardrail') === 'maintenance')
check('the restricted goal drives the rep range too', minor.decisions.find((d) => d.area === 'repRange')?.drivers[0]?.value === 'maintenance')
check('an adult reports no guardrail', rationaleFor({ age: 28, goalType: 'cutting' }).decisions.every((d) => d.area !== 'ageGuardrail'))

console.log('\n═══ 7) THE STORED VALUE IS STABLE — SAME PROFILE, SAME RATIONALE ═══')
check('the rationale is deterministic for the same profile', JSON.stringify(rationaleFor()) === JSON.stringify(rationaleFor()))
check(
  'a name change (display data) does not move a single structured value',
  JSON.stringify(rationaleFor({ name: 'Ziyad' })) === JSON.stringify(rationaleFor({ name: 'زياد' })),
)

console.log(`\nE plan rationale: ${passed} passed, ${failures.length} failed`)
if (failures.length) {
  console.error(`Failed checks:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
