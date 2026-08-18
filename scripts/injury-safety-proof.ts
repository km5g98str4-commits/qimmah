// إثبات سلامة الإصابات [SOVEREIGN-PLAN-001].
//
// **يقيس الخطة المولَّدة النهائية، لا الدالة.** كل تأكيد هنا يمرّ بالمسار الحيّ
// كاملًا (`toAnswersFromV2` → `buildOnboardingProfile` → `toLegacyProfile` →
// `generatePlan`) ثم يفتح أيام الخطة تمرينًا تمرينًا. فحصُ المرشِّح وحده كان
// سيمرّ قبل الإصلاح أيضًا — المرشِّح **كان** يعمل، وكان أعمى.
//
// خطّ الأساس المرجعي (R2): ٧٢٠/٧٢٠ تهيئة لمصاب ركبة+كتف تصف حركة ممنوعة.
//
// التأكيدات المضادّة (§4.2) — ولا واحد منها يسقط باستثناء تقني:
//   (أ) **ليس فراغًا**: خطة الضابط (بلا إصابة) لنفس التهيئة **تحوي** الحركات
//       الممنوعة — فلو رُدّ المرشِّح لسقط المسح فورًا.
//   (ب) **الفشل مغلقًا**: تمرين مركّب غير مصنَّف يُستبعَد عند إصابة مُعلَنة.
//   (ج) **الخطة تبقى كاملة**: عدد تمارين كل يوم مطابق لخطة الضابط — «آمن» لا
//       يُشترى بإفراغ اليوم.

import { toAnswersFromV2, type V2Place } from '@/lib/onboardingV2Adapter'
import { buildOnboardingProfile } from '@/lib/planBuilderAnswers'
import { toLegacyProfile } from '@/lib/onboardingProfile'
import { generatePlan } from '@/lib/planGenerator'
import { exercises, getExercise } from '@/data/exercises'
import {
  INJURY_RISKY_IDS,
  detectInjuryRegions,
  forbiddenLoadsFor,
  injuryFilterState,
  isUnclassifiedExercise,
  makeInjurySafetyFilter,
  type InjuryRegion,
} from '@/lib/injurySafety'
import { findSubstitutes } from '@/lib/workoutSubstitution'
import type { Exercise, JointLoad } from '@/types/workout'
import type { Profile } from '@/types/profile'
import type { TrainedBefore } from '@/types/onboarding'
import type { V2GoalValue } from '@/design-system/v2/labels'

let pass = 0
let fail = 0
const failures: string[] = []
const check = (label: string, cond: boolean): void => {
  if (cond) {
    pass++
  } else {
    fail++
    failures.push(label)
    console.log(`✗ ${label}`)
  }
}

// ————————————————————————————————————————————————————————————————
// بناء الملف عبر المسار الحيّ نفسه الذي يمشيه الضيف
// ————————————————————————————————————————————————————————————————

interface Config {
  place: V2Place
  days: number
  duration: number
  level: TrainedBefore
  goal: V2GoalValue
}

function profileFor(cfg: Config, injuries: string[]): Profile {
  const answers = toAnswersFromV2({
    goal: cfg.goal,
    days: cfg.days,
    duration: cfg.duration,
    place: cfg.place,
    neat: 'moderate',
    dietPattern: 'none',
    hasInjury: injuries.length > 0,
    injuries,
    healthDataConsent: true,
    age: 28,
    gender: 'male',
    heightCm: 176,
    weightKg: 84,
    intent: 'plan',
    level: 'beginner',
    trainedBefore: cfg.level,
    totalMonths: cfg.level === 'never' ? null : 'm6_12',
    lastTrained: cfg.level === 'never' ? null : 'now',
    consistency: cfg.level === 'never' ? null : 'mostly',
  })
  return toLegacyProfile(buildOnboardingProfile(answers))
}

function planIds(p: Profile): string[] {
  const out: string[] = []
  for (const day of generatePlan(p).workoutPlan.days) for (const pe of day.exercises) out.push(pe.exerciseId)
  return out
}

/** عدد التمارين **الأساسية** لكل يوم (بلا الإضافة الاختيارية المُلحَقة). */
function planCoreCounts(p: Profile): number[] {
  return generatePlan(p).workoutPlan.days.map((d) => d.exercises.filter((e) => !e.optional).length)
}

/**
 * لماذا هذا التمرين ممنوع على هذه المناطق — **يُحسب من البيانات لا من قائمة
 * نتائج مكتوبة يدويًا**، فلا يستطيع الإثبات أن يوافق نفسه.
 */
function contraindicationReason(id: string, regions: Set<InjuryRegion>): string | null {
  const ex = getExercise(id)
  if (!ex) return `${id}: معرّف غير معروف في المكتبة`
  for (const region of regions) {
    if (INJURY_RISKY_IDS[region].has(ex.id)) return `${ex.id}: على قائمة ${region} اليدوية`
  }
  const banned = forbiddenLoadsFor(regions)
  if (isUnclassifiedExercise(ex)) {
    const compound = ['squat', 'hinge', 'push', 'pull', 'lunge'].includes(ex.movementPattern)
    return compound ? `${ex.id}: مركّب غير مصنَّف` : null
  }
  for (const load of ex.jointLoads) if (banned.has(load)) return `${ex.id}: يحمل ${load}`
  return null
}

function violations(ids: string[], regions: Set<InjuryRegion>): string[] {
  const out: string[] = []
  for (const id of ids) {
    const why = contraindicationReason(id, regions)
    if (why) out.push(why)
  }
  return out
}

// ————————————————————————————————————————————————————————————————
// ١) الشخصيات — الستّة المُعلَنة + الورك المشتقّ + التركيبات
// ————————————————————————————————————————————————————————————————

const PERSONAS: Array<{ name: string; injuries: string[] }> = [
  { name: 'shoulder', injuries: ['shoulder'] },
  { name: 'knee', injuries: ['knee'] },
  { name: 'lower_back', injuries: ['lower_back'] },
  { name: 'elbow', injuries: ['elbow'] },
  { name: 'wrist', injuries: ['wrist'] },
  { name: 'ankle', injuries: ['ankle'] },
  // الورك: **منطقة مشتقّة** — لا وجود لها في `InjuryAreaKey`، فلا تصل إلا نصًّا حرًّا.
  { name: 'hip (derived)', injuries: ['hip'] },
  { name: 'knee+shoulder (founder)', injuries: ['knee', 'shoulder'] },
  { name: 'lower_back+wrist', injuries: ['lower_back', 'wrist'] },
  { name: 'shoulder+elbow+wrist', injuries: ['shoulder', 'elbow', 'wrist'] },
  { name: 'all six', injuries: ['knee', 'shoulder', 'lower_back', 'wrist', 'elbow', 'ankle'] },
]

const PLACES: V2Place[] = ['gym', 'home', 'machines']
const DAYS = [3, 4, 5, 6]
const DURATIONS = [30, 45, 60, 75, 90]
const LEVELS: TrainedBefore[] = ['never', 'tried', 'months', 'years']
const GOALS: V2GoalValue[] = ['cut', 'maintain', 'bulk']

const CONFIGS: Config[] = []
for (const place of PLACES)
  for (const days of DAYS)
    for (const duration of DURATIONS)
      for (const level of LEVELS) for (const goal of GOALS) CONFIGS.push({ place, days, duration, level, goal })

check('the sweep replicates R2 exactly: 720 configurations', CONFIGS.length === 720)

// خطط الضابط (بلا إصابة) لكل تهيئة — أساس التأكيد المضادّ (أ) و(ج).
const controlIds = new Map<string, string[]>()
const controlCounts = new Map<string, number[]>()
const keyOf = (c: Config) => `${c.place}|${c.days}|${c.duration}|${c.level}|${c.goal}`
for (const cfg of CONFIGS) {
  const p = profileFor(cfg, [])
  controlIds.set(keyOf(cfg), planIds(p))
  controlCounts.set(keyOf(cfg), planCoreCounts(p))
}

console.log(`\n== المسح: ${PERSONAS.length} شخصية × ${CONFIGS.length} تهيئة ==`)
let sweptPlans = 0
let emptyDays = 0
let shrunkDays = 0
let worstGap = 0
let worstGapWhere = ''
let minDay = Infinity
let minDayWhere = ''
const shrinkByPersona = new Map<string, number>()
for (const persona of PERSONAS) {
  const regions = detectInjuryRegions({ injuries: persona.injuries.join('، ') })
  let redConfigs = 0
  const sample: string[] = []
  for (const cfg of CONFIGS) {
    const p = profileFor(cfg, persona.injuries)
    const gen = generatePlan(p)
    sweptPlans++
    const ids = gen.workoutPlan.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))
    const bad = violations(ids, regions)
    if (bad.length) {
      redConfigs++
      if (sample.length < 3) sample.push(`${keyOf(cfg)} → ${bad.slice(0, 3).join(' · ')}`)
    }
    // (ج) اكتمال الخطة — لا يوم فارغ، ولا **فتحة أساسية** تسقط بحجّة السلامة.
    // القياس على الأساسيات لا على المجموع: الإضافة المُلحَقة (`optional`) قد تسقط
    // بحقّ حين تكون هي نفسها ممنوعة (كل أجهزة البايسبس ممنوعة لمصاب المرفق مثلًا)،
    // وسقوطها الصحيح **يجب ألّا يقنّع** سقوط فتحة أساسية.
    const counts = gen.workoutPlan.days.map((d) => d.exercises.filter((e) => !e.optional).length)
    const ctrl = controlCounts.get(keyOf(cfg)) ?? []
    for (let i = 0; i < counts.length; i++) {
      if (counts[i] === 0) emptyDays++
      if (counts[i] < (ctrl[i] ?? 0)) {
        shrunkDays++
        const gap = (ctrl[i] ?? 0) - counts[i]
        if (gap > worstGap) { worstGap = gap; worstGapWhere = `${persona.name} ${keyOf(cfg)} day${i} ${counts[i]}<${ctrl[i]}` }
        shrinkByPersona.set(persona.name, (shrinkByPersona.get(persona.name) ?? 0) + 1)
      }
      if (counts[i] < minDay) { minDay = counts[i]; minDayWhere = `${persona.name} ${keyOf(cfg)} day${i}` }
    }
  }
  if (sample.length) sample.forEach((s) => console.log(`    ${s}`))
  check(
    `[${persona.name}] zero contraindicated movements across ${CONFIGS.length} configurations (was 720/720 red)`,
    redConfigs === 0,
  )
  check(`[${persona.name}] the injury areas were actually recognized`, regions.size > 0)
}
console.log(`   خطط مولَّدة في المسح: ${sweptPlans} (+${CONFIGS.length} خطة ضابط)`)
console.log(`   أقصر يوم: ${minDay} (${minDayWhere}) · أيام أقصر من الضابط: ${shrunkDays} · أسوأ فارق: ${worstGap} (${worstGapWhere})`)
for (const [k, v] of shrinkByPersona) console.log(`     نقص: ${k} → ${v}`)

check('(ج) اكتمال: لا يوم واحد فارغ في أي خطة مصاب', emptyDays === 0)
check(
  '(ج) اكتمال: كل يوم يحتفظ بكامل فتحاته الأساسية — «آمن» لم يُشترَ بإفراغ الخطة',
  shrunkDays === 0,
)
check('(ج) اكتمال: أقصر يوم على الإطلاق ≥ ٣ تمارين أساسية', minDay >= 3)

// ————————————————————————————————————————————————————————————————
// ٢) حالة المؤسس بالضبط
// ————————————————————————————————————————————————————————————————

const FOUNDER: Config = { place: 'home', days: 5, duration: 75, level: 'never', goal: 'cut' }
const FOUNDER_NAMED = [
  'dumbbell-shoulder-press',
  'front-raise',
  'overhead-triceps-extension',
  'goblet-squat',
  'bodyweight-squat',
]
const founderProfile = profileFor(FOUNDER, ['knee', 'shoulder'])
const founderIds = planIds(founderProfile)
console.log('\n== حالة المؤسس: home · 5 أيام · 75د · never · cut · ركبة+كتف ==')
for (const id of FOUNDER_NAMED) {
  check(`[founder] «${id}» no longer appears in the delivered plan`, !founderIds.includes(id))
}
check(
  '[founder] zero contraindicated movements in the exact reported plan',
  violations(founderIds, detectInjuryRegions({ injuries: 'knee، shoulder' })).length === 0,
)

// (أ) التأكيد المضادّ — الضابط **يستلم** تلك الحركات، فالمسح ليس فراغًا.
const founderControlIds = planIds(profileFor(FOUNDER, []))
const controlNamed = FOUNDER_NAMED.filter((id) => founderControlIds.includes(id))
console.log(`   الضابط (بلا إصابة) يستلم من الخمسة: ${controlNamed.length ? controlNamed.join(', ') : '— لا شيء'}`)
check(
  '(أ) counter-proof: the uninjured control plan DOES receive contraindicated movements — the sweep is not vacuous',
  violations(founderControlIds, detectInjuryRegions({ injuries: 'knee، shoulder' })).length > 0,
)
check(
  '(أ) counter-proof: at least one founder-named movement survives in the control plan',
  controlNamed.length > 0,
)

// (أ٢) القائمة اليدوية وحدها — النموذج القديم — كانت **تقبل** حركات ممنوعة.
const legacyDenylistOnly = (ex: Exercise, regions: Set<InjuryRegion>): boolean => {
  for (const region of regions) if (INJURY_RISKY_IDS[region].has(ex.id)) return false
  return true
}
const kneeShoulder = detectInjuryRegions({ injuries: 'knee، shoulder' })
const admittedByLegacy = exercises.filter(
  (ex) => legacyDenylistOnly(ex, kneeShoulder) && contraindicationReason(ex.id, kneeShoulder) !== null,
)
console.log(`   القائمة اليدوية وحدها كانت تقبل ${admittedByLegacy.length} تمرينًا ممنوعًا من ${exercises.length}`)
check(
  '(أ٢) counter-proof: the id-denylist alone admits contraindicated movements — the joint-load model is load-bearing',
  admittedByLegacy.length > 0,
)
// والعكس: النموذج وحده يفوّت ما تلتقطه القائمة (ثني المرفق/القبضة/ثبات الكاحل) — فالاتحاد ليس زينة.
const loadModelOnly = (ex: Exercise, regions: Set<InjuryRegion>): boolean => {
  const banned = forbiddenLoadsFor(regions)
  if (isUnclassifiedExercise(ex)) return true
  return !ex.jointLoads.some((l) => banned.has(l))
}
const elbowRegions = new Set<InjuryRegion>(['elbow'])
const missedByModel = exercises.filter(
  (ex) => loadModelOnly(ex, elbowRegions) && !legacyDenylistOnly(ex, elbowRegions),
)
console.log(`   النموذج وحده يفوّت ${missedByModel.length} تمرينًا يلتقطه المراجَع اليدوي (المرفق)`)
check(
  '(أ٣) counter-proof: the joint-load model alone misses reviewed cases — dropping the denylist would regress',
  missedByModel.length > 0,
)

// ————————————————————————————————————————————————————————————————
// ٣) (ب) الفشل مغلقًا — غير المصنَّف يُستبعَد
// ————————————————————————————————————————————————————————————————

const template = exercises.find((e) => e.id === 'dumbbell-bench-press')
if (!template) throw new Error('fixture exercise missing: dumbbell-bench-press')
const unclassifiedCompound = { ...template, id: 'proof-unclassified-push' } as Exercise
delete (unclassifiedCompound as { jointLoads?: JointLoad[] }).jointLoads
const reviewedSafeCompound: Exercise = { ...template, id: 'proof-reviewed-push', jointLoads: [] }
const unclassifiedIsolation = { ...template, id: 'proof-unclassified-iso', movementPattern: 'isolation' } as Exercise
delete (unclassifiedIsolation as { jointLoads?: JointLoad[] }).jointLoads

const shoulderFilter = makeInjurySafetyFilter(new Set<InjuryRegion>(['shoulder']))
const noInjuryFilter = makeInjurySafetyFilter(new Set<InjuryRegion>())
check('(ب) an UNCLASSIFIED compound is withheld from a shoulder-injured user', !shoulderFilter(unclassifiedCompound))
check('(ب) a reviewed-and-safe `[]` compound stays eligible — [] is not "unknown"', shoulderFilter(reviewedSafeCompound))
check('(ب) an UNCLASSIFIED isolation is not withheld (the rule is scoped to compounds)', shoulderFilter(unclassifiedIsolation))
check('(ب) with no injury declared, nothing is withheld', noInjuryFilter(unclassifiedCompound))
check('(ب) the fixture really is unclassified, not merely empty', isUnclassifiedExercise(unclassifiedCompound))
check('(ب) `[]` is NOT reported as unclassified', !isUnclassifiedExercise(reviewedSafeCompound))

// ————————————————————————————————————————————————————————————————
// ٤) الاستبدال الحيّ — الباب الذي كان يلتفّ حول كل شيء
// ————————————————————————————————————————————————————————————————

const gymKnee = profileFor({ place: 'gym', days: 4, duration: 60, level: 'years', goal: 'maintain' }, ['knee'])
const gymHealthy = profileFor({ place: 'gym', days: 4, duration: 60, level: 'years', goal: 'maintain' }, [])
const kneeSubs = findSubstitutes('barbell-back-squat', gymKnee, 'busy')
const healthySubs = findSubstitutes('barbell-back-squat', gymHealthy, 'busy')
console.log('\n== الاستبدال الحيّ ==')
console.log(`   قرفصاء بار · مصاب ركبة → ${kneeSubs.length} بديلًا · سليم → ${healthySubs.length}`)
check(
  'a knee-injured user tapping "swap" on a squat is offered NO deep-knee-flexion option',
  kneeSubs.every((o) => contraindicationReason(o.exerciseId, new Set<InjuryRegion>(['knee'])) === null),
)
check('the uninjured user still gets a non-empty swap list — the swap fix is not a blanket "no"', healthySubs.length > 0)

const homeShoulder = profileFor({ place: 'home', days: 4, duration: 60, level: 'years', goal: 'maintain' }, ['shoulder'])
const shoulderSubs = findSubstitutes('overhead-press', homeShoulder, 'busy')
check(
  'a shoulder-injured user swapping an overhead press is offered no overhead-loading option',
  shoulderSubs.every((o) => contraindicationReason(o.exerciseId, new Set<InjuryRegion>(['shoulder'])) === null),
)

// ————————————————————————————————————————————————————————————————
// ٥) العطالة عند النادي/الأجهزة — خمس مناطق من ستّ كانت لا تفعل شيئًا
// ————————————————————————————————————————————————————————————————

console.log('\n== خمول النادي/الأجهزة (كان: ٥ من ٦ مناطق بلا أثر) ==')
const inertBase: Config = { place: 'gym', days: 4, duration: 60, level: 'years', goal: 'maintain' }
for (const place of ['gym', 'machines'] as V2Place[]) {
  const cfg = { ...inertBase, place }
  const control = planIds(profileFor(cfg, [])).join(',')
  for (const area of ['knee', 'shoulder', 'lower_back', 'wrist', 'elbow', 'ankle']) {
    const ids = planIds(profileFor(cfg, [area]))
    const regions = detectInjuryRegions({ injuries: area })
    check(`[${place}/${area}] the delivered plan carries no contraindicated movement`, violations(ids, regions).length === 0)
    const changed = ids.join(',') !== control
    const controlWasClean = violations(control.split(','), regions).length === 0
    check(
      `[${place}/${area}] the answer is no longer inert (plan changed, or the control was already clean)`,
      changed || controlWasClean,
    )
  }
}

// ————————————————————————————————————————————————————————————————
// ٦) الصدق — لا يُدَّعى ترشيح لم يحدث
// ————————————————————————————————————————————————————————————————

console.log('\n== الصدق ==')
const APPLIED_CLAIM = 'راعينا مناطق الإصابة'
const UNRECOGNIZED_CLAIM = 'ما قدرنا نحوّله لقاعدة تمرين'

const appliedPlan = generatePlan(founderProfile)
check('a recognized injury claims protection', appliedPlan.warningsAr.some((w) => w.includes(APPLIED_CLAIM)))

const unrecognizedProfile: Profile = { ...founderProfile, injuries: 'ACL reconstruction', injuryAreas: [] }
const unrecognizedPlan = generatePlan(unrecognizedProfile)
check(
  'an unrecognized constraint NEVER claims protection',
  !unrecognizedPlan.warningsAr.some((w) => w.includes(APPLIED_CLAIM)),
)
check(
  'an unrecognized constraint says so honestly instead of staying silent',
  unrecognizedPlan.warningsAr.some((w) => w.includes(UNRECOGNIZED_CLAIM)),
)
check('injuryFilterState reports unrecognized', injuryFilterState(unrecognizedProfile) === 'unrecognized')

const cleanProfile: Profile = { ...founderProfile, injuries: '', injuryAreas: [] }
const cleanPlan = generatePlan(cleanProfile)
check('no declared injury → no injury claim of any kind', !cleanPlan.warningsAr.some((w) => w.includes(APPLIED_CLAIM) || w.includes(UNRECOGNIZED_CLAIM)))
check('injuryFilterState reports notApplied', injuryFilterState(cleanProfile) === 'notApplied')
check('the injury text never leaks into a warning', !unrecognizedPlan.warningsAr.some((w) => w.includes('ACL')))

// ————————————————————————————————————————————————————————————————
// ٧) التوافق الخلفي — الحقل البنيوي يعمل، وغيابه يبقي سلوك اليوم
// ————————————————————————————————————————————————————————————————

console.log('\n== التوافق الخلفي والمصدر البنيوي ==')
const structuredOnly: Profile = { ...cleanProfile, injuries: '', injuryAreas: ['shoulder'] }
check('structured `injuryAreas` alone drives the filter', injuryFilterState(structuredOnly) === 'applied')
check(
  'a structured-only profile receives a plan with no contraindicated movement',
  violations(planIds(structuredOnly), new Set<InjuryRegion>(['shoulder'])).length === 0,
)
const legacyTextOnly: Profile = { ...cleanProfile, injuries: 'ألم في الكتف', injuryAreas: undefined }
check('legacy free text alone still drives the filter (backward compatible)', injuryFilterState(legacyTextOnly) === 'applied')
check(
  'an absent `injuryAreas` + empty text reproduces today\'s behaviour exactly (control plan identical)',
  planIds({ ...cleanProfile, injuryAreas: undefined }).join(',') === planIds(cleanProfile).join(','),
)

// ————————————————————————————————————————————————————————————————

console.log(`\ninjury-safety proof: ${pass} passed, ${fail} failed`)
if (fail > 0) {
  console.log('failed checks:')
  failures.forEach((f) => console.log(`  - ${f}`))
  process.exit(1)
}
