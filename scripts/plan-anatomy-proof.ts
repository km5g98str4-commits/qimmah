// إثبات تشريح يوم الدفع/السحب — [SOVEREIGN-PLAN-002].
//
// ═══ العطل ═══
// الرمز العامّ `'shoulders'` يجمع ثلاثة رؤوس تعمل في اتجاهين متعاكسين: الأمامي
// والجانبي يدفعان، والخلفي يسحب. و`TYPE_MUSCLES` كان يعطي هذا الرمز نفسه ليومَي
// الدفع والسحب معًا، وفتحة «عزل أكتاف» في يوم السحب كانت **بلا قيد نمط أصلًا**.
// فكانت رفرفة أمامي تهبط في يوم ظهر ورفرفة خلفي في يوم صدر.
// وتحته عطل بيانات: ٧٧ من ١٨١ تمرينًا بلا تشريح صريح، فتسقط على خريطة عامّة
// تعطي كل «shoulders» الرمزين «جانبي + أمامي» — أي أن `cable-rear-delt-fly`
// (رفرفة خلفي) كان يُعلن **صفر دالة خلفية**.
//
// ═══ ما يفحصه هذا الإثبات ═══
// ١) البيانات: تغطية ١٨١/١٨١ صريحة + ثوابت تشريحية مسمّاة على الكتالوج.
// ٢) الخطط **المولَّدة** (لا الجدول): لا رأس أمامي محرّك في يوم سحب، ولا رأس
//    خلفي محرّك في يوم دفع — عبر مصفوفة ملفات (بيئة × مستوى × هدف × أيام).
// ٣) لا تجويع: القيد التشريحي لم يُنقص عدد تمارين أي يوم.
// ٤) محاكاة التفاف: نفس دالّة الفحص على خطة ملفّقة **يجب أن تسقط بفحص مسمّى**.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { PlanDay, WorkoutPlan } from '@/types/workout'
import type { MuscleId } from '@/types/muscles'
import type { GymType, Profile } from '@/types/profile'
import { defaultProfile } from '@/lib/calculators'
import { generatePlan } from '@/lib/planGenerator'
import { exercises, getExercise } from '@/data/exercises'

let passed = 0
const failures: string[] = []
function check(label: string, condition: boolean): void {
  if (condition) {
    passed++
    console.log(`  ✓ ${label}`)
  } else {
    failures.push(label)
    console.log(`  ✗ FAIL: ${label}`)
  }
}

// ── ١) البيانات: تغطية صريحة ١٨١/١٨١ ────────────────────────────────────────
//
// `muscleDetailById` خريطة داخلية غير مُصدَّرة (وهذا صحيح — لا تُقرأ من الواجهة)،
// فالتغطية تُقاس من **المصدر نفسه**: مفاتيح الخريطة مقابل معرّفات `ex({ id })`.
// نقيس المصدر لا الناتج عمدًا: الناتج يبدو صحيحًا حتى حين يأتي من الاحتياط العامّ.

console.log('\n═══ ١) تغطية التشريح التفصيلي في الكتالوج ═══')

interface CoverageReport {
  catalogCount: number
  detailCount: number
  missing: string[]
  orphans: string[]
  duplicates: string[]
}

/** يقيس تغطية `muscleDetailById` من نصّ المصدر — دالّة نقية على النصّ. */
export function measureDetailCoverage(source: string): CoverageReport {
  const start = source.indexOf('const muscleDetailById')
  const end = source.indexOf('// خريطة احتياطية')
  const block = source.slice(start, end)
  const keys = [...block.matchAll(/^ {2}'?([a-zA-Z0-9-]+)'?: \{/gm)].map((m) => m[1])
  const catalog = [...source.matchAll(/ex\(\{\s*id: '([^']+)'/g)].map((m) => m[1])
  const detail = new Set(keys)
  return {
    catalogCount: catalog.length,
    detailCount: detail.size,
    missing: catalog.filter((id) => !detail.has(id)),
    orphans: [...detail].filter((id) => !catalog.includes(id)),
    duplicates: keys.filter((v, i) => keys.indexOf(v) !== i),
  }
}

const exercisesSource = readFileSync(resolve(process.cwd(), 'src/data/exercises.ts'), 'utf8')
const coverage = measureDetailCoverage(exercisesSource)
check(
  `كل تمرين في الكتالوج له تشريح صريح — ${coverage.detailCount}/${coverage.catalogCount} (لا سقوط على الاحتياط العامّ)`,
  coverage.catalogCount === 181 && coverage.missing.length === 0,
)
check('لا مدخل يتيم ولا مكرّر في الخريطة', coverage.orphans.length === 0 && coverage.duplicates.length === 0)

console.log('\n═══ ٢) ثوابت تشريحية مسمّاة على الكتالوج ═══')

/** ثابت: التمرين المسمّى يجب أن يحمل هذا الرأس المحرّك، ويُمنع من ذاك. */
const CATALOG_INVARIANTS: { id: string; must: MuscleId[]; mustNot: MuscleId[] }[] = [
  // العطل الأصلي بالاسم: رفرفة خلفي كيبل كانت أمامية+جانبية وبلا خلفية.
  { id: 'cable-rear-delt-fly', must: ['rear_delts'], mustNot: ['front_delts', 'side_delts'] },
  { id: 'rear-delt-fly', must: ['rear_delts'], mustNot: ['front_delts'] },
  { id: 'reverse-pec-deck', must: ['rear_delts'], mustNot: ['front_delts'] },
  { id: 'face-pull', must: ['rear_delts'], mustNot: ['front_delts'] },
  { id: 'rear-delt-row-machine', must: ['rear_delts'], mustNot: ['front_delts'] },
  { id: 'front-raise', must: ['front_delts'], mustNot: ['rear_delts'] },
  { id: 'lateral-raise', must: ['side_delts'], mustNot: ['rear_delts'] },
  { id: 'seated-lateral-raise', must: ['side_delts'], mustNot: ['rear_delts'] },
  { id: 'overhead-press', must: ['front_delts'], mustNot: ['rear_delts'] },
  { id: 'arnold-press', must: ['front_delts'], mustNot: ['rear_delts'] },
  { id: 'pike-push-up', must: ['front_delts'], mustNot: ['rear_delts'] },
]
for (const inv of CATALOG_INVARIANTS) {
  const ex = getExercise(inv.id)
  const detailed = ex?.primaryMusclesDetailed ?? []
  check(
    `${inv.id}: يحمل ${inv.must.join('+')} ولا يحمل ${inv.mustNot.join('/')}`,
    !!ex && inv.must.every((m) => detailed.includes(m)) && !inv.mustNot.some((m) => detailed.includes(m)),
  )
}
// تأكيد مضادّ للاستثناء (§4.2): «الأمامي ممنوع على الخلفي» ليس تعميمًا على كل الأكتاف —
// ضغط الكتف يجمع الأمامي والجانبي بحقّ، ولو تكافأت القاعدتان لسقط هذا الفحص.
{
  const press = getExercise('shoulder-press-machine')?.primaryMusclesDetailed ?? []
  check(
    'الاستثناء محروس: ضغط الكتف يجمع الأمامي+الجانبي معًا (القاعدة ليست «رأس واحد لكل تمرين»)',
    press.includes('front_delts') && press.includes('side_delts'),
  )
}

// ── ٣) الفحص على الخطط المولَّدة ───────────────────────────────────────────
//
// **الادّعاء يُقاس على الناتج لا على الجدول:** جدول الفتحات قد يكون صحيحًا وباب
// الإكمال يُدخل الخطأ من الخلف. فنولّد خططًا حقيقية ونفحص أيامها.

console.log('\n═══ ٣) تماسك التشريح في الخطط المولَّدة ═══')

/** رأس محرّك ممنوع لكل نوع يوم — نفس عقد `TYPE_EXCLUDE_DETAILED` معبَّرًا عنه هنا استقلالًا. */
const BANNED_BY_DAY: { marker: string; banned: MuscleId[]; code: string }[] = [
  { marker: '-push', banned: ['rear_delts'], code: 'rear-delt-on-push-day' },
  { marker: '-pull', banned: ['front_delts'], code: 'front-delt-on-pull-day' },
]

export interface AnatomyViolation {
  code: string
  dayId: string
  exerciseId: string
  muscle: MuscleId
}

/** يفحص خطة مولَّدة ويُرجع كل خرق تشريحي مسمّى — دالّة نقية تُهاجَم أدناه. */
export function anatomyViolations(plan: WorkoutPlan): AnatomyViolation[] {
  const out: AnatomyViolation[] = []
  for (const day of plan.days) {
    for (const rule of BANNED_BY_DAY) {
      if (!day.id.includes(rule.marker)) continue
      for (const pe of day.exercises) {
        const detailed = getExercise(pe.exerciseId)?.primaryMusclesDetailed ?? []
        for (const m of rule.banned) {
          if (detailed.includes(m)) out.push({ code: rule.code, dayId: day.id, exerciseId: pe.exerciseId, muscle: m })
        }
      }
    }
  }
  return out
}

function profileFor(overrides: Partial<Profile> = {}): Profile {
  return {
    ...defaultProfile,
    age: 28,
    goalType: 'bulking',
    trainingDays: 6,
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

const GYMS: GymType[] = ['full_gym', 'small_gym', 'home', 'bodyweight']
const BANDS = ['lt1m', '1to2y', 'gt2y'] as const
const GOALS = ['bulking', 'cutting', 'recomposition'] as const

let matrixPlans = 0
let matrixDays = 0
let pushPullDays = 0
const allViolations: AnatomyViolation[] = []
const starved: string[] = []

for (const gymType of GYMS) {
  for (const experienceBand of BANDS) {
    for (const goalType of GOALS) {
      for (const trainingDays of [5, 6]) {
        for (const workoutDuration of [45, 75]) {
          const plan = generatePlan(profileFor({ gymType, experienceBand, goalType, trainingDays, workoutDuration })).workoutPlan
          matrixPlans++
          matrixDays += plan.days.length
          pushPullDays += plan.days.filter((d) => d.id.includes('-push') || d.id.includes('-pull')).length
          allViolations.push(...anatomyViolations(plan))
          for (const d of plan.days) if (!d.exercises.length) starved.push(`${gymType}/${experienceBand}/${goalType}/${trainingDays}د/${workoutDuration}دق:${d.id}`)
        }
      }
    }
  }
}

check(`مصفوفة ${matrixPlans} خطة (${matrixDays} يومًا، منها ${pushPullDays} يوم دفع/سحب) وُلِّدت فعلًا`, matrixPlans === 144 && pushPullDays > 0)
check(
  `صفر خرق تشريحي في كل الخطط المولَّدة (وُجد ${allViolations.length})`,
  allViolations.length === 0,
)
if (allViolations.length) console.log('    ' + allViolations.slice(0, 8).map((v) => `${v.code}: ${v.exerciseId} في ${v.dayId}`).join('\n    '))
check('لا يوم فارغ — القيد التشريحي لم يُجوّع أي جلسة', starved.length === 0)

// لا تجويع بالعدد: يوم الدفع/السحب يبقى بنفس عدد يوم العلوي المقابل في الملف نفسه.
{
  const plan = generatePlan(profileFor({ gymType: 'full_gym', trainingDays: 6, workoutDuration: 60 })).workoutPlan
  const counts = plan.days.map((d) => d.exercises.length)
  check(`كل أيام PPL تحمل ٥ تمارين فأكثر (فعليًا ${counts.join('/')})`, counts.every((n) => n >= 5))
}

// ── ٤) محاكاة الالتفاف — الفحص نفسه يجب أن يسقط بفحص مسمّى ────────────────
//
// §4.2: «كل شدّ بوابة يُرفَق بمحاكاة التفافٍ تفشل بفحص مسمّى». نُلفّق خطة تحمل
// بالضبط ما أصلحناه، ونمرّرها على **نفس** الدالّة — فإن لم تسقط فالبوابة رخوة.

console.log('\n═══ ٤) محاكاة الالتفاف (counter-proof) ═══')

function fakeDay(id: string, exerciseIds: string[]): PlanDay {
  return {
    id,
    nameAr: id,
    nameEn: id,
    exercises: exerciseIds.map((exerciseId, i) => ({ id: `${id}-${i}`, exerciseId, sets: 3, reps: '8–12', restSec: 60, startingWeight: '', notes: '', order: i })),
  }
}

{
  // الحالة الأصلية بالحرف: رفرفة خلفي كيبل في يوم دفع.
  const forged: WorkoutPlan = { templateId: 'custom', days: [fakeDay('gen-1-push', ['barbell-bench-press', 'cable-rear-delt-fly'])] }
  const v = anatomyViolations(forged)
  check(
    'رفرفة خلفي في يوم دفع ⇒ يسقط بالرمز rear-delt-on-push-day (لا TypeError)',
    v.length === 1 && v[0].code === 'rear-delt-on-push-day' && v[0].exerciseId === 'cable-rear-delt-fly' && v[0].muscle === 'rear_delts',
  )
}
{
  const forged: WorkoutPlan = { templateId: 'custom', days: [fakeDay('gen-2-pull', ['barbell-row', 'front-raise'])] }
  const v = anatomyViolations(forged)
  check(
    'رفرفة أمامي في يوم سحب ⇒ يسقط بالرمز front-delt-on-pull-day (لا TypeError)',
    v.length === 1 && v[0].code === 'front-delt-on-pull-day' && v[0].exerciseId === 'front-raise' && v[0].muscle === 'front_delts',
  )
}
{
  // التفاف على البيانات: تمرين خلفي بلا تشريح صريح كان يمرّ لأن الاحتياط يعطيه
  // «أمامي+جانبي». نحاكيه بمعرّف غير موجود — الاحتياط الأخير هو المصفوفة الفارغة.
  const forged: WorkoutPlan = { templateId: 'custom', days: [fakeDay('gen-1-push', ['this-exercise-does-not-exist'])] }
  check('تمرين مجهول لا يُسقط الفحص بانفجار — يُعامَل بلا رؤوس محرّكة', anatomyViolations(forged).length === 0)
}
{
  // التفاف على التغطية: لو نقص مدخل واحد لوجب أن يُسمّى بالاسم.
  const forgedSource = exercisesSource.replace("  'cable-rear-delt-fly': { primary: ['rear_delts'], secondary: ['upper_back'] },\n", '')
  const forgedCoverage = measureDetailCoverage(forgedSource)
  check(
    'حذف مدخل واحد من الخريطة ⇒ يُسمّى بالاسم في تقرير التغطية',
    forgedCoverage.missing.length === 1 && forgedCoverage.missing[0] === 'cable-rear-delt-fly',
  )
}
{
  // التفاف على «صفر خرق»: لو صار الحوض بلا أي دالة خلفية لمرّ الفحص بلا استحقاق.
  const rearDeltCatalog = exercises.filter((e) => e.primaryMusclesDetailed.includes('rear_delts'))
  const frontDeltCatalog = exercises.filter((e) => e.primaryMusclesDetailed.includes('front_delts'))
  check(
    `المرور مستحقّ: الكتالوج يحوي ${rearDeltCatalog.length} تمرين دالة خلفية و${frontDeltCatalog.length} أمامية — أي أن الخرق كان **ممكنًا**`,
    rearDeltCatalog.length >= 5 && frontDeltCatalog.length >= 5,
  )
}

console.log(`\n${failures.length === 0 ? '✅' : '❌'} plan-anatomy: ${passed} نجحت · ${failures.length} فشلت`)
if (failures.length) {
  failures.forEach((f) => console.log(`  - ${f}`))
  process.exit(1)
}
