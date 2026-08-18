// إثبات القدرة على الأدوات [SOVEREIGN-PLAN-001].
//
// **يقيس الخطة المولَّدة النهائية**: يفتح كل تمرين مولَّد ويسأل «هل يتطلّب أداةً
// لا يملكها هذا المستخدم؟» — لا يفحص البوّابة وحدها، لأن البوّابة **كانت** سليمة
// داخليًا (٠ تسريب مقيس) والنموذج نفسه هو ما كان خطأً: «منزل» يعني ضمنًا بارًا
// ومقعدًا ودمبلات، فـ٣٣٫٦٪ من الخانات المنزلية تطلب عدّة لم يعلنها أحد.

import { generatePlan } from '@/lib/planGenerator'
import { getExercise } from '@/data/exercises'
import {
  FIXTURE_DEPENDENT_IDS,
  catalogTokensFor,
  makeExerciseGate,
  resolveGymAccess,
  resolveMachinesOnly,
} from '@/lib/equipmentAccess'
import { toAnswersFromV2, type V2Place } from '@/lib/onboardingV2Adapter'
import { buildOnboardingProfile } from '@/lib/planBuilderAnswers'
import { toLegacyProfile } from '@/lib/onboardingProfile'
import type { Equipment, Profile } from '@/types/profile'

let pass = 0
let fail = 0
const failures: string[] = []
const check = (label: string, cond: boolean): void => {
  if (cond) pass++
  else {
    fail++
    failures.push(label)
    console.log(`✗ ${label}`)
  }
}

function baseProfile(place: V2Place, days: number, duration: number): Profile {
  const answers = toAnswersFromV2({
    goal: 'maintain',
    days,
    duration,
    place,
    neat: 'moderate',
    dietPattern: 'none',
    hasInjury: false,
    injuries: [],
    healthDataConsent: true,
    age: 28,
    gender: 'male',
    heightCm: 176,
    weightKg: 84,
    intent: 'plan',
    level: 'intermediate',
    trainedBefore: 'months',
    totalMonths: 'm6_12',
    lastTrained: 'now',
    consistency: 'mostly',
  })
  return toLegacyProfile(buildOnboardingProfile(answers))
}

function planIds(p: Profile): string[] {
  return generatePlan(p).workoutPlan.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))
}
function dayCounts(p: Profile): number[] {
  return generatePlan(p).workoutPlan.days.map((d) => d.exercises.length)
}

/** لماذا يستحيل على هذا المستخدم أداء التمرين — يُحسب من رموز الكتالوج لا من قائمة نتائج. */
function unavailableReason(id: string, owned: readonly Equipment[]): string | null {
  const ex = getExercise(id)
  if (!ex) return `${id}: معرّف مجهول`
  const allowed = catalogTokensFor(owned)
  const missing = ex.equipment.filter((e) => !allowed.has(e))
  if (missing.length) return `${ex.id}: يحتاج ${missing.join('+')}`
  if (!owned.includes('pullup_bar') && FIXTURE_DEPENDENT_IDS.has(ex.id)) return `${ex.id}: يحتاج تجهيزة مثبَّتة`
  return null
}

// ————————————————————————————————————————————————————————————————
// الشخصيات السبع
// ————————————————————————————————————————————————————————————————

const PERSONAS: Array<{ name: string; place: V2Place; equipment: Equipment[] }> = [
  { name: 'bodyweight-only', place: 'home', equipment: ['bodyweight'] },
  { name: 'dumbbells-only', place: 'home', equipment: ['dumbbell'] },
  { name: 'machines-only', place: 'machines', equipment: ['machine'] },
  { name: 'full-gym', place: 'gym', equipment: ['dumbbell', 'barbell', 'bench', 'machine', 'cable', 'bands', 'smith', 'pullup_bar'] },
  { name: 'home+bands', place: 'home', equipment: ['bands', 'bodyweight'] },
  { name: 'home+dumbbells', place: 'home', equipment: ['dumbbell', 'bench'] },
  { name: 'minimal', place: 'home', equipment: ['bands'] },
]

const DAYS = [3, 4, 5, 6]
const DURATIONS = [30, 45, 60, 75]

console.log('== الشخصيات × الأيام × المدد ==')
for (const persona of PERSONAS) {
  let redSlots = 0
  let plans = 0
  let minDay = Infinity
  const sample: string[] = []
  for (const days of DAYS) {
    for (const duration of DURATIONS) {
      const p: Profile = { ...baseProfile(persona.place, days, duration), equipment: persona.equipment }
      const ids = planIds(p)
      plans++
      for (const id of ids) {
        const why = unavailableReason(id, persona.equipment)
        if (why) {
          redSlots++
          if (sample.length < 3) sample.push(`${days}d/${duration}m → ${why}`)
        }
      }
      for (const c of dayCounts(p)) minDay = Math.min(minDay, c)
    }
  }
  sample.forEach((s) => console.log(`    ${s}`))
  console.log(`   ${persona.name}: ${plans} خطة · أقصر يوم ${minDay} تمارين`)
  check(`[${persona.name}] zero generated exercises require unavailable equipment`, redSlots === 0)
  check(`[${persona.name}] every profile still receives a complete non-empty plan`, minDay >= 3)
}

// ————————————————————————————————————————————————————————————————
// التأكيد المضادّ (١) — القياس ليس تحصيل حاصل
// ————————————————————————————————————————————————————————————————

console.log('\n== التأكيد المضادّ ==')
// الخط الأساسي المقيس في R1: خطة المنزل **المشتقّة من المكان** تطلب عدّة غير معلنة.
const homePlaceDerived = baseProfile('home', 4, 60)
check('the place-derived home profile really declares nothing', (homePlaceDerived.equipment ?? []).length === 0)
const bodyweightOwner: Equipment[] = ['bodyweight']
const placeDerivedIds = planIds(homePlaceDerived)
const wouldBeUnavailable = placeDerivedIds.filter((id) => unavailableReason(id, bodyweightOwner) !== null)
console.log(`   خطة المنزل المشتقّة من المكان: ${wouldBeUnavailable.length}/${placeDerivedIds.length} خانة تطلب عدّة يفتقدها مالك وزن الجسم`)
check(
  '(مضادّ) the place-derived home plan DOES demand undeclared gear — the assertion above is not vacuous',
  wouldBeUnavailable.length > 0,
)
const bodyweightIds = planIds({ ...homePlaceDerived, equipment: bodyweightOwner })
check('(مضادّ) declaring equipment actually changes the generated plan', bodyweightIds.join(',') !== placeDerivedIds.join(','))

// إسقاط أداة واحدة يُسقط ما يعتمد عليها — البوّابة تقيس الأداة لا الاسم.
const withBench = planIds({ ...homePlaceDerived, equipment: ['dumbbell', 'bench'] })
const withoutBench = planIds({ ...homePlaceDerived, equipment: ['dumbbell'] })
const benchOnly = withBench.filter((id) => (getExercise(id)?.equipment ?? []).includes('bench'))
console.log(`   بمقعد: ${benchOnly.length} خانة تحتاج مقعدًا · بلا مقعد: ${withoutBench.filter((id) => (getExercise(id)?.equipment ?? []).includes('bench')).length}`)
check('(مضادّ) dropping `bench` removes every bench-dependent exercise', benchOnly.length > 0 && withoutBench.every((id) => !(getExercise(id)?.equipment ?? []).includes('bench')))

// التجهيزات المثبَّتة: العقلة تفتح ما يصنّفه الكتالوج «وزن جسم» وهو ليس كذلك.
const noBar = planIds({ ...homePlaceDerived, equipment: ['bodyweight'] })
const withBar = planIds({ ...homePlaceDerived, equipment: ['bodyweight', 'pullup_bar'] })
check('(مضادّ) without a pull-up bar, no fixture-dependent movement is prescribed', noBar.every((id) => !FIXTURE_DEPENDENT_IDS.has(id)))
check('(مضادّ) declaring a pull-up bar unlocks at least one fixture-dependent movement', withBar.some((id) => FIXTURE_DEPENDENT_IDS.has(id)))

// ————————————————————————————————————————————————————————————————
// «نادي» ≠ «أجهزة فقط»
// ————————————————————————————————————————————————————————————————

console.log('\n== نادي مقابل أجهزة فقط ==')
let identical = 0
let configs = 0
for (const days of DAYS) {
  for (const duration of DURATIONS) {
    for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
      const gym: Profile = { ...baseProfile('gym', days, duration), trainingLevel: level, experienceBand: undefined }
      const machines: Profile = { ...baseProfile('machines', days, duration), trainingLevel: level, experienceBand: undefined }
      configs++
      if (JSON.stringify(generatePlan(gym).workoutPlan) === JSON.stringify(generatePlan(machines).workoutPlan)) identical++
    }
  }
}
console.log(`   تهيئات متطابقة: ${identical} / ${configs} (كانت ٤٨/٤٨)`)
check('«نادي» and «أجهزة فقط» no longer produce byte-identical plans in any configuration', identical === 0)

const gymProfile = baseProfile('gym', 4, 60)
const gymIds = planIds(gymProfile)
const gymFreeWeights = gymIds.filter((id) => {
  const eq = getExercise(id)?.equipment ?? []
  return eq.includes('barbell') || eq.includes('dumbbell')
})
console.log(`   عضو النادي التجاري يستلم ${gymFreeWeights.length} خانة وزن حرّ`)
check('a commercial-gym member finally receives free-weight movements', gymFreeWeights.length > 0)
check('the machines-only intent is decoupled from gym size', resolveMachinesOnly(gymProfile) === false)
check('«أجهزة فقط» still resolves to the machine pool', resolveMachinesOnly(baseProfile('machines', 4, 60)) === true)

const machineIds = planIds(baseProfile('machines', 4, 60))
check(
  'the machines-only plan is genuinely machine-based',
  machineIds.filter((id) => (getExercise(id)?.equipment ?? []).includes('machine')).length >= machineIds.length - 2,
)

// نيّة صريحة مستقلّة عن المكان (الحقل المقترح `preferMachines`).
const gymWantsMachines = { ...gymProfile, preferMachines: true } as Profile
check('an explicit machines intent overrides gym size (the Settings switch finally has a field)', resolveMachinesOnly(gymWantsMachines) === true)
check('the explicit intent actually changes the delivered plan', planIds(gymWantsMachines).join(',') !== gymIds.join(','))
const machinesWantsFree = { ...baseProfile('machines', 4, 60), preferMachines: false } as Profile
check('the intent can also be turned OFF for a small gym', resolveMachinesOnly(machinesWantsFree) === false)

// ————————————————————————————————————————————————————————————————
// فرع وزن الجسم صار قابلًا للوصول
// ————————————————————————————————————————————————————————————————

console.log('\n== فرع وزن الجسم ==')
const bwProfile: Profile = { ...homePlaceDerived, equipment: ['bodyweight'] }
const bwIds = planIds(bwProfile)
console.log(`   خطة وزن الجسم: ${bwIds.length} خانة · ${new Set(bwIds).size} تمرينًا مميّزًا`)
check('the bodyweight branch is reachable from the onboarding data model', bwIds.length > 0)
check('every bodyweight-only exercise really needs nothing but the body', bwIds.every((id) => (getExercise(id)?.equipment ?? []).every((e) => e === 'bodyweight')))
check('a bodyweight-only user is never handed a barbell program', bwIds.every((id) => !(getExercise(id)?.equipment ?? []).includes('barbell')))

// ————————————————————————————————————————————————————————————————
// التوافق الخلفي
// ————————————————————————————————————————————————————————————————

console.log('\n== التوافق الخلفي ==')
for (const place of ['gym', 'home', 'machines'] as V2Place[]) {
  const p = baseProfile(place, 4, 60)
  const withUndefined: Profile = { ...p, equipment: undefined }
  const withEmpty: Profile = { ...p, equipment: [] }
  check(`[${place}] an absent equipment list behaves exactly like an empty one`, planIds(withUndefined).join(',') === planIds(withEmpty).join(','))
  const gate = makeExerciseGate(withEmpty)
  check(`[${place}] the place ruleset still governs when nothing was declared`, typeof gate === 'function' && planIds(withEmpty).every((id) => gate(getExercise(id)!)))
}
check('resolveGymAccess is untouched by the equipment authority', resolveGymAccess(baseProfile('home', 4, 60)) === 'home')

console.log(`\nequipment-capability proof: ${pass} passed, ${fail} failed`)
if (fail > 0) {
  console.log('failed checks:')
  failures.forEach((f) => console.log(`  - ${f}`))
  process.exit(1)
}
