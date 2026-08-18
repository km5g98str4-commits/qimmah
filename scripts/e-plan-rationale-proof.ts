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
import { defaultOnboardingProfile, toLegacyProfile } from '@/lib/onboardingProfile'
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
// [SOVEREIGN-PLAN-001] «الورك» صار **منطقة مشتقّة معترفًا بها**: يحرسها النموذج
// بأحمال الهينج وثني الركبة العميق والارتطام. فلم يعد مثالًا صالحًا لغير المتعرَّف
// عليه — والتأكيد لم يُحذف بل انقسم: مثال جديد غير معترف به، ومثال الورك يصعد إلى
// «مُطبَّق». حذفه كان سيخفي بالضبط ما تغيّر.
const recognizedHip = rationaleFor({ injuries: 'hip pain' })
check('a hip complaint is now a recognized (derived) region, not silently dropped', outcomeOf(recognizedHip, 'injuryFilter') === 'applied')
check('the hip complaint still never leaks its raw text', !JSON.stringify(recognizedHip).includes('hip pain'))
const unrecognizedInjury = rationaleFor({ injuries: 'ACL reconstruction' })
check('an unrecognized injury note never claims that filtering happened', outcomeOf(unrecognizedInjury, 'injuryFilter') === 'unrecognized')
check('an unrecognized injury note still never leaks its raw text', !JSON.stringify(unrecognizedInjury).includes('ACL reconstruction'))

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
  'a five-day split with a real focus declares it as a driver, the four-day one does not',
  rationaleFor({ trainingDays: 5, muscleFocus: 'lower' }).decisions.find((d) => d.area === 'split')?.drivers.some((dr) => dr.key === 'muscleFocus') === true
    && base.decisions.find((d) => d.area === 'split')?.drivers.some((dr) => dr.key === 'muscleFocus') === false,
)
check(
  'session duration changes measured weekly volume',
  outcomeOf(rationaleFor({ workoutDuration: 30 }), 'weeklyVolume') !== outcomeOf(rationaleFor({ workoutDuration: 90 }), 'weeklyVolume'),
)
check(
  'consistency changes measured weekly volume through the lighter first week',
  outcomeOf(rationaleFor({ consistency: 'onoff' }), 'weeklyVolume') !== outcomeOf(rationaleFor({ consistency: 'regular' }), 'weeklyVolume'),
)
check(
  'a real muscle focus changes measured weekly volume',
  outcomeOf(rationaleFor({ muscleFocus: 'lower' }), 'weeklyVolume') !== outcomeOf(rationaleFor({ muscleFocus: 'balanced' }), 'weeklyVolume'),
)

const calorieDrivers = ['goalType', 'gender', 'weightKg', 'heightCm', 'age', 'activityLevel', 'trainingDays']
const calorieDecision = base.decisions.find((d) => d.area === 'calorieTarget')
check('the calorie reason names every input used by the equation', calorieDrivers.every((key) => calorieDecision?.drivers.some((driver) => driver.key === key)))
check('weight changes the calorie target', outcomeOf(rationaleFor({ weightKg: 62 }), 'calorieTarget') !== outcomeOf(rationaleFor({ weightKg: 92 }), 'calorieTarget'))
check('height changes the calorie target', outcomeOf(rationaleFor({ heightCm: 155 }), 'calorieTarget') !== outcomeOf(rationaleFor({ heightCm: 190 }), 'calorieTarget'))
check('sex changes the calorie target', outcomeOf(rationaleFor({ gender: 'female' }), 'calorieTarget') !== outcomeOf(rationaleFor({ gender: 'male' }), 'calorieTarget'))
check('daily activity changes the calorie target', outcomeOf(rationaleFor({ activityLevel: 'sedentary' }), 'calorieTarget') !== outcomeOf(rationaleFor({ activityLevel: 'very_active' }), 'calorieTarget'))
check('age changes the calorie target', outcomeOf(rationaleFor({ age: 24 }), 'calorieTarget') !== outcomeOf(rationaleFor({ age: 54 }), 'calorieTarget'))
check('training days change the calorie target', outcomeOf(rationaleFor({ trainingDays: 2 }), 'calorieTarget') !== outcomeOf(rationaleFor({ trainingDays: 6 }), 'calorieTarget'))

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

console.log('\n═══ 8) A FIELD PINNED BY THE BRIDGE IS NEVER SHOWN AS AN ANSWER (§5) ═══')
// الفحص على المصدر لا على الافتراض: نمرّر ملفّات عبر جسر الإعداد الحقيقي
// (`toLegacyProfile`) ثم نطالب التعليل بألّا يعرض أي حقل يثبّته الجسر سائقًا.
// الحقول المثبَّتة الخمسة — onboardingProfile.ts:250,283,289,290,291.
const BRIDGE_PINNED_KEYS = ['muscleFocus', 'equipment', 'schedulingStyle', 'preferredDays', 'nutritionStyle']

const bridgeProfiles: Profile[] = [
  toLegacyProfile(defaultOnboardingProfile()),
  toLegacyProfile({
    ...defaultOnboardingProfile(),
    profile: { age: 27, sex: 'male' },
    bodyMetrics: { heightCm: 178, currentWeightKg: 82 },
    goal: { type: 'bulk' },
    trainingPreferences: { daysPerWeek: 5, sessionDurationMin: 60, experience: 'intermediate', environment: 'commercial_gym', consistency: 'consistent' },
  }),
  toLegacyProfile({
    ...defaultOnboardingProfile(),
    profile: { age: 34, sex: 'female' },
    bodyMetrics: { heightCm: 165, currentWeightKg: 70 },
    goal: { type: 'cut' },
    trainingPreferences: { daysPerWeek: 3, sessionDurationMin: 45, experience: 'beginner', environment: 'home_gym', consistency: 'returning' },
  }),
]

check('the bridge really does pin muscleFocus to balanced', bridgeProfiles.every((p) => p.muscleFocus === 'balanced'))
check('the bridge really does pin equipment to empty', bridgeProfiles.every((p) => (p.equipment ?? []).length === 0))
check('a five-day bridge profile is among the cases', bridgeProfiles.some((p) => p.trainingDays === 5))

for (const [i, p] of bridgeProfiles.entries()) {
  const r = buildPlanRationale(p, generatePlan(p))
  const driverKeys = r.decisions.flatMap((d) => d.drivers.map((dr) => String(dr.key)))
  check(`bridge profile ${i + 1}: no pinned field appears as an active driver`, driverKeys.every((k) => !BRIDGE_PINNED_KEYS.includes(k)))
  check(`bridge profile ${i + 1}: no muscleFocus decision is emitted`, r.decisions.every((d) => d.area !== 'muscleFocus'))
  check(`bridge profile ${i + 1}: muscleFocus is declared inactive instead`, r.inactiveAxes.some((a) => a.axis === 'muscleFocus' && a.reason === 'pinnedByBridge'))
  check(`bridge profile ${i + 1}: the declared neutral value is the pinned one`, r.inactiveAxes.find((a) => a.axis === 'muscleFocus')?.neutralValue === 'balanced')
  check(`bridge profile ${i + 1}: the honest axes still leave real drivers`, driverKeys.includes('trainingDays') && driverKeys.includes('goalType'))
}

console.log('\n═══ 9) THE GUARD DROPS ITSELF WHEN A REAL ANSWER ARRIVES ═══')
// مقارنة بالقيمة المثبَّتة لا بوجود الحقل: أي اختيار حقيقي يعيد المحور سائقًا
// معلنًا بلا تعديل في هذا الملف — فالحارس مؤقّت بطبيعته لا دائم.
const realFocus = rationaleFor({ muscleFocus: 'lower', trainingDays: 5 })
check('a real focus is reported as a driver again', realFocus.decisions.some((d) => d.drivers.some((dr) => dr.key === 'muscleFocus')))
check('a real focus emits its own decision again', realFocus.decisions.some((d) => d.area === 'muscleFocus'))
check('a real focus is no longer listed as inactive', realFocus.inactiveAxes.every((a) => a.axis !== 'muscleFocus'))
check('the pinned value stays guarded', rationaleFor({ muscleFocus: 'balanced' }).inactiveAxes.some((a) => a.axis === 'muscleFocus'))
check(
  'the error only ever understates personalisation, never overstates it',
  rationaleFor({ muscleFocus: 'balanced' }).decisions.every((d) => d.area !== 'muscleFocus'),
)

console.log('\n═══ 10) THREE REAL PROFILES PRODUCE DISTINCT PLANS ═══')
const acceptanceProfiles = [
  profileFor({
    age: 22,
    goalType: 'maintenance',
    trainingDays: 3,
    workoutDuration: 30,
    trainingLevel: 'beginner',
    experienceBand: 'lt1m',
    workoutEnvironment: 'home',
    gymType: 'home',
    gymAccess: 'home',
  }),
  profileFor({
    age: 31,
    goalType: 'bulking',
    trainingDays: 4,
    workoutDuration: 60,
    trainingLevel: 'intermediate',
    experienceBand: '1to2y',
    workoutEnvironment: 'gym',
    gymType: 'full',
    gymAccess: 'full',
  }),
  profileFor({
    age: 39,
    goalType: 'cutting',
    trainingDays: 6,
    workoutDuration: 90,
    trainingLevel: 'advanced',
    experienceBand: 'gt2y',
    workoutEnvironment: 'gym',
    gymType: 'full',
    gymAccess: 'full',
  }),
]
const acceptancePlans = acceptanceProfiles.map((profile) => generatePlan(profile))
const acceptanceFingerprints = acceptancePlans.map((plan) => JSON.stringify({
  template: plan.suggestedWorkoutTemplateId,
  firstDay: plan.workoutPlan.days[0]?.exercises.map((exercise) => exercise.exerciseId),
  calories: plan.targets.targetCalories,
  protein: plan.targets.proteinGrams,
}))
check('all three profile fingerprints are distinct', new Set(acceptanceFingerprints).size === 3)
check('all three profile schedules are non-empty', acceptancePlans.every((plan) => plan.workoutPlan.days.length > 0 && plan.workoutPlan.days[0].exercises.length > 0))
check('the profiles resolve to three different split templates', new Set(acceptancePlans.map((plan) => plan.suggestedWorkoutTemplateId)).size === 3)

console.log(`\nE plan rationale: ${passed} passed, ${failures.length} failed`)
if (failures.length) {
  console.error(`Failed checks:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
