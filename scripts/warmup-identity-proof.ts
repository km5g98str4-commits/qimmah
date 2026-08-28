// إثبات سلوكي: **الإحماء ليس جهازًا** — [FOUNDER-QA] الإصلاح P0.
//
// ═══ العطل المحروس (بلاغ المؤسس) ═══
// بطاقة إحماء تعرض «جهاز ضغط الصدر» بصورة الجهاز. سببه أن `buildWarmupPlan`
// كان يشتقّ **كل** خطوة من تمارين اليوم، وفرعُ «غير البار» يُصدر «مجموعة خفيفة
// من نفس التمرين» حاملةً معرّف الجهاز واسمه — فيوم الأجهزة إحماؤه هو الجهاز.
//
// ═══ ما يثبته هذا الملف ═══
// يشغّل الباني الحقيقي على أيام حقيقية ويؤكّد أن الإحماء يحمل **حركته الخاصّة**:
// معرّفًا من خارج تمارين اليوم، نمطه `mobility` في الكتالوج، بأداة `bodyweight`،
// وله وسيط معتمد. ثم **يهاجم** كل ذلك بمحاكاة السلوك القديم ويشترط سقوطه بفحصه
// المسمّى لا باستثناء تقني (§4.2).

import { buildWarmupPlan, WARMUP_MOBILITY_STEPS, WARMUP_MOBILITY_SECONDS } from '@/lib/warmupPlan'
import type { WarmupPlan, WarmupStep } from '@/lib/warmupPlan'
import { exercises, getExercise } from '@/data/exercises'
import { approvedImageFor, approvedVideoFor } from '@/lib/exerciseProductionMedia'
import { defaultPlateConfig } from '@/lib/strength/plates'
import type { Muscle, MovementPattern, PlanDay, PlanExercise } from '@/types/workout'

let pass = 0
let fail = 0
const check = (label: string, cond: boolean): void => {
  if (cond) {
    pass++
    console.log(`  ✓ ${label}`)
  } else {
    fail++
    console.log(`  ✗ FAIL: ${label}`)
  }
}

const config = defaultPlateConfig()

const pe = (exerciseId: string, order: number, extra: Partial<PlanExercise> = {}): PlanExercise => ({
  id: `pe-${order}`,
  exerciseId,
  sets: 4,
  reps: '8–10',
  restSec: 120,
  order,
  ...extra,
})

const day = (id: string, exercises: PlanExercise[]): PlanDay => ({
  id,
  nameAr: 'يوم الأجهزة',
  nameEn: 'Machine day',
  exercises,
})

const noKnownWeight = { plateConfig: config, workingKgFor: () => Number.NaN }

// ─────────────────────────────────────────────────────────────────────────────
// الفحوص المسمّاة — دوالّ على (خطة، يوم) كي **تُهاجَم بخطة مزوَّرة** لاحقًا.
// كل واحدة تُشغَّل مرّتين: على الخطة الحقيقية (تصدق) وعلى محاكاة السلوك القديم
// (تكذب). فحصٌ لا يمكن أن يكذب لا يثبت شيئًا.
// ─────────────────────────────────────────────────────────────────────────────

/** ⭐ الفحص الحاكم الذي طلبه البلاغ: خطوة إحماء من خارج اليوم، نمطها `mobility`. */
const ASSERT_OWN_MOVEMENT = 'الإحماء يحمل خطوة من خارج تمارين اليوم نمطها mobility'
function assertOwnMovement(plan: WarmupPlan, d: PlanDay): boolean {
  const dayIds = new Set(d.exercises.map((x) => x.exerciseId))
  return plan.steps.some(
    (s) => !dayIds.has(s.exerciseId) && getExercise(s.exerciseId)?.movementPattern === 'mobility',
  )
}

/**
 * توجد خطوة mobility، **ولا واحدة** منها تحمل معرّف تمرين من اليوم.
 *
 * شرط الوجود ليس زينة: بدونه يمرّ الفحص على خطة بلا مرونة أصلًا (`every` على
 * قائمة فارغة = صحيح) — وهو بالضبط السلوك القديم. فحصٌ لا يمكن أن يكذب لا يثبت
 * شيئًا (§4.2)، وقد سقط هذا الفحص فعلًا في صيغته الأولى فشُدَّ.
 */
const ASSERT_NO_DAY_ID_AS_MOBILITY = 'توجد خطوة mobility ولا واحدة منها تحمل معرّف تمرين من اليوم'
function assertNoDayIdAsMobility(plan: WarmupPlan, d: PlanDay): boolean {
  const dayIds = new Set(d.exercises.map((x) => x.exerciseId))
  const drills = plan.steps.filter((s) => s.kind === 'mobility')
  return drills.length > 0 && drills.every((s) => !dayIds.has(s.exerciseId))
}

/** حركات المرونة من الكتالوج حصرًا — لا معرّف مخترع (§5). */
const ASSERT_DRILLS_IN_CATALOG = 'كل حركة مرونة موجودة في الكتالوج بنمط mobility وأداة bodyweight'
function assertDrillsInCatalog(plan: WarmupPlan): boolean {
  const drills = plan.steps.filter((s) => s.kind === 'mobility')
  if (drills.length === 0) return false
  return drills.every((s) => {
    const ex = getExercise(s.exerciseId)
    return !!ex && ex.movementPattern === 'mobility' && ex.equipment.includes('bodyweight')
  })
}

/** اسم الخطوة هو اسم الحركة في الكتالوج — لا اسم مُلفَّق ولا معرّف خام. */
const ASSERT_DRILL_NAMES_FROM_CATALOG = 'أسماء حركات المرونة مأخوذة من الكتالوج بالعربية والإنجليزية'
function assertDrillNamesFromCatalog(plan: WarmupPlan): boolean {
  const drills = plan.steps.filter((s) => s.kind === 'mobility')
  if (drills.length === 0) return false
  return drills.every((s) => {
    const ex = getExercise(s.exerciseId)
    return !!ex && s.nameAr === ex.nameAr && s.nameEn === ex.nameEn && s.nameAr !== s.exerciseId
  })
}

/** خطوة المرونة تتصدّر — الإحماء يبدأ بحركته لا بالجهاز. */
const ASSERT_MOBILITY_FIRST = 'خطوة المرونة تسبق أي خطوة مشتقّة من تمارين اليوم'
function assertMobilityFirst(plan: WarmupPlan): boolean {
  const firstStrength = plan.steps.findIndex((s) => s.kind !== 'mobility')
  const lastMobility = plan.steps.map((s) => s.kind).lastIndexOf('mobility')
  return lastMobility >= 0 && firstStrength > lastMobility
}

const ALL_ASSERTIONS: { id: string; run: (p: WarmupPlan, d: PlanDay) => boolean }[] = [
  { id: ASSERT_OWN_MOVEMENT, run: assertOwnMovement },
  { id: ASSERT_NO_DAY_ID_AS_MOBILITY, run: assertNoDayIdAsMobility },
  { id: ASSERT_DRILLS_IN_CATALOG, run: assertDrillsInCatalog },
  { id: ASSERT_DRILL_NAMES_FROM_CATALOG, run: assertDrillNamesFromCatalog },
  { id: ASSERT_MOBILITY_FIRST, run: assertMobilityFirst },
]

// ─────────────────────────────────────────────────────────────────────────────

console.log('\n① يوم الأجهزة — الحالة التي بلّغ عنها المؤسس بالضبط')
const MACHINE_DAY = day('d-machines', [
  pe('chest-press-machine', 1),
  pe('lat-pulldown', 2),
  pe('leg-press', 3),
])
{
  const plan = buildWarmupPlan(MACHINE_DAY, noKnownWeight)
  for (const a of ALL_ASSERTIONS) check(a.id, a.run(plan, MACHINE_DAY) === true)
  check(
    `عدد حركات المرونة = الميزانية المعلَنة (${WARMUP_MOBILITY_STEPS})`,
    plan.steps.filter((s) => s.kind === 'mobility').length === WARMUP_MOBILITY_STEPS,
  )
  check(
    'حركة المرونة بالزمن لا بالتكرار — بالثابت المعلَن',
    plan.steps.filter((s) => s.kind === 'mobility').every((s) => s.seconds === WARMUP_MOBILITY_SECONDS),
  )
  check(
    '`mobilityExerciseIds` يطابق خطوات المرونة فعلًا — لا حقلًا تزيينيًّا',
    plan.mobilityExerciseIds.join(',') ===
      plan.steps.filter((s) => s.kind === 'mobility').map((s) => s.exerciseId).join(','),
  )
  check(
    'الجهاز ما زال حاضرًا كخطوة تسخين مُعلَنة — الفرع النافع لم يُحذف',
    plan.steps.some((s) => s.kind === 'light' && s.exerciseId === 'chest-press-machine'),
  )
}

console.log('\n② محاكاة السلوك القديم — كل فحص أعلاه يجب أن يسقط باسمه')
{
  // السلوك القديم حرفيًّا: كل خطوة من تمارين اليوم، بمعرّف الجهاز واسمه.
  const legacySteps: WarmupStep[] = MACHINE_DAY.exercises.map((x) => {
    const ex = getExercise(x.exerciseId)
    return {
      kind: 'light',
      exerciseId: x.exerciseId,
      nameAr: ex?.nameAr ?? x.exerciseId,
      nameEn: ex?.nameEn ?? x.exerciseId,
      reps: 10,
      label: 'light',
      seconds: 40,
    }
  })
  const legacyPlan: WarmupPlan = {
    steps: legacySteps,
    estMinutes: 2,
    sourceExerciseIds: MACHINE_DAY.exercises.map((x) => x.exerciseId),
    mobilityExerciseIds: [],
  }
  for (const a of ALL_ASSERTIONS) {
    let verdict: boolean | string
    try {
      verdict = a.run(legacyPlan, MACHINE_DAY)
    } catch (err) {
      // سقوط باستثناء تقني ليس إثباتًا (§4.2) — يُسمّى ويُعدّ فشلًا.
      verdict = `EXCEPTION:${(err as Error)?.constructor?.name ?? 'unknown'}`
    }
    check(`«الإحماء = الجهاز» يُسقط «${a.id}» بفحصه المسمّى`, verdict === false)
  }

  // التفاف أدقّ: إعادة تسمية النوع إلى `mobility` بلا تغيير المعرّف — «تجميل الوسم».
  const relabeled: WarmupPlan = {
    ...legacyPlan,
    steps: legacySteps.map((s) => ({ ...s, kind: 'mobility', label: 'mobility' }) as WarmupStep),
    mobilityExerciseIds: MACHINE_DAY.exercises.map((x) => x.exerciseId),
  }
  check(
    `«وسم الجهاز mobility بلا تغييره» يُسقط «${ASSERT_OWN_MOVEMENT}» بفحصه المسمّى`,
    assertOwnMovement(relabeled, MACHINE_DAY) === false,
  )
  check(
    `«وسم الجهاز mobility بلا تغييره» يُسقط «${ASSERT_NO_DAY_ID_AS_MOBILITY}» بفحصه المسمّى`,
    assertNoDayIdAsMobility(relabeled, MACHINE_DAY) === false,
  )
  check(
    `«وسم الجهاز mobility بلا تغييره» يُسقط «${ASSERT_DRILLS_IN_CATALOG}» بفحصه المسمّى`,
    assertDrillsInCatalog(relabeled) === false,
  )
}

console.log('\n③ الحتمية — نفس اليوم يعطي نفس الإحماء دائمًا، بلا عشوائية')
{
  const first = JSON.stringify(buildWarmupPlan(MACHINE_DAY, noKnownWeight))
  let identical = true
  for (let i = 0; i < 200; i++) {
    if (JSON.stringify(buildWarmupPlan(MACHINE_DAY, noKnownWeight)) !== first) identical = false
  }
  check('٢٠٠ بناء متتالٍ لنفس اليوم تعطي نفس الخطة حرفيًّا', identical)

  // ويومان مختلفان في الأنماط يعطيان مرونة مختلفة — وإلا فالاختيار ليس مشتقًّا.
  const legDay = day('d-legs', [pe('barbell-back-squat', 1), pe('leg-curl', 2)])
  const pushDay = day('d-push', [pe('chest-press-machine', 1), pe('shoulder-press-machine', 2)])
  const legIds = buildWarmupPlan(legDay, noKnownWeight).mobilityExerciseIds.join(',')
  const pushIds = buildWarmupPlan(pushDay, noKnownWeight).mobilityExerciseIds.join(',')
  check(`يوم الأرجل ويوم الدفع يعطيان مرونة مختلفة (${legIds} ≠ ${pushIds})`, legIds !== pushIds)
  check('مرونة يوم الأرجل تخصّ الأرجل — أرجحة/كاحل/ورك/هامسترنج', /leg-swings|ankle|hip|hamstring/.test(legIds))
  check('مرونة يوم الدفع تخصّ الجزء العلوي — كتف/صدري', /arm-circles|thoracic|shoulder/.test(pushIds))
}

console.log('\n④ تغطية الكتالوج — كل نمط حركة وكل عضلة تُحلّ إلى حركة مصدَّقة')
{
  const patterns: MovementPattern[] = ['push', 'pull', 'squat', 'hinge', 'lunge', 'isolation', 'carry', 'core', 'cardio', 'mobility']
  const muscles: Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'hamstrings', 'quads', 'calves', 'core', 'cardio']

  // عيّنة حقيقية: أول تمرين في الكتالوج لكل نمط، وأول تمرين لكل عضلة.
  const seen = new Set<string>()
  let daysBuilt = 0
  let emptyMobility = 0
  const probe = (exerciseId: string): void => {
    const d = day(`probe-${exerciseId}`, [pe(exerciseId, 1)])
    const plan = buildWarmupPlan(d, noKnownWeight)
    daysBuilt++
    if (plan.mobilityExerciseIds.length === 0) emptyMobility++
    for (const id of plan.mobilityExerciseIds) seen.add(id)
  }

  const CATALOG_PROBES: Record<string, string> = {}
  for (const p of patterns) CATALOG_PROBES[`pattern:${p}`] = ''
  for (const m of muscles) CATALOG_PROBES[`muscle:${m}`] = ''

  // اختيار العيّنة من الكتالوج نفسه — لا قائمة معرّفات مكتوبة بيد تشيخ.
  for (const ex of exercises) {
    const pk = `pattern:${ex.movementPattern}`
    if (CATALOG_PROBES[pk] === '') CATALOG_PROBES[pk] = ex.id
    const mk = `muscle:${ex.primaryMuscle}`
    if (CATALOG_PROBES[mk] === '') CATALOG_PROBES[mk] = ex.id
  }

  /**
   * قياسٌ لا دعوى: عضوان في النوع بلا تمرين واحد في الكتالوج — `carry` نمطٌ
   * معلَن ولم يُستعمل، و`legs` عضلة عامّة استُبدلت بـquads/hamstrings/glutes.
   * يُثبَّتان بالاسم كي **يسقط هذا الفحص إن تغيّر الكتالوج** فيُراجَع جدول
   * المرونة معه، بدل أن يمرّ نمط جديد بلا حركة تخصّه.
   */
  const KNOWN_UNUSED = ['muscle:legs', 'pattern:carry']
  const unrepresented = Object.entries(CATALOG_PROBES).filter(([, id]) => id === '').map(([k]) => k).sort()
  check(
    `الأعضاء بلا تمرين في الكتالوج هي المعروفة بالضبط (${unrepresented.join(',') || 'لا شيء'})`,
    unrepresented.join(',') === KNOWN_UNUSED.join(','),
  )
  for (const id of Object.values(CATALOG_PROBES)) if (id) probe(id)

  check(`بُنيت خطط لـ${daysBuilt} تمرينًا ممثِّلًا`, daysBuilt > 0)
  check(
    `كل يوم غير-مرونة أنتج حركة مرونة واحدة على الأقل (بلا مرونة: ${emptyMobility})`,
    emptyMobility === 0,
  )
  const drills = [...seen].sort()
  check(
    `الحركات المُستعمَلة كلّها من الكتالوج بنمط mobility وأداة bodyweight (${drills.length}: ${drills.join(' · ')})`,
    drills.length > 0 &&
      drills.every((id) => {
        const ex = getExercise(id)
        return !!ex && ex.movementPattern === 'mobility' && ex.equipment.includes('bodyweight')
      }),
  )
  check(
    'كل حركة مُستعمَلة لها صورة معتمدة (APPROVED) — فالوسيط لن يكون بديلًا',
    drills.every((id) => approvedImageFor(id) !== null),
  )
  check(
    'كل حركة مُستعمَلة لها مرجع فيديو معتمد (APPROVED)',
    drills.every((id) => approvedVideoFor(id) !== null),
  )
}

console.log('\n⑤ ما لم يُكسَر — سلّم البار والوعد المشتقّ')
{
  const d = day('d-barbell', [pe('barbell-bench-press', 1, { startingWeight: '80' })])
  const plan = buildWarmupPlan(d, { plateConfig: config })
  const ramps = plan.steps.filter((s) => s.kind === 'ramp')
  check('سلّم التحميل بالبار ما زال يُبنى', ramps.length > 0)
  check('لا درجة تبلغ وزن العمل أو تتجاوزه', ramps.every((s) => (s.weightKg ?? 0) < 80))
  check('درجات السلّم كلّها من تمرين اليوم نفسه', ramps.every((s) => s.exerciseId === 'barbell-bench-press'))
  const seconds = plan.steps.reduce((n, s) => n + s.seconds, 0)
  check('المدّة ما زالت مشتقّة من الخطوات — بما فيها المرونة', plan.estMinutes === Math.max(1, Math.round(seconds / 60)))
  check('يوم فارغ: لا مرونة ولا وعد', buildWarmupPlan(day('d-empty', [])).mobilityExerciseIds.length === 0)
}

console.log('\n⑥ يوم مرونة أصلًا — لا يُكرَّر ما في اليوم، ولا تُخترع حركة بديلة')
{
  const d = day('d-mobility', [pe('cat-cow', 1), pe('arm-circles', 2), pe('child-pose', 3)])
  const plan = buildWarmupPlan(d, noKnownWeight)
  check('لا خطوة مرونة تكرّر حركة موجودة في اليوم', assertNoDayIdAsMobility(plan, d))
  check(
    'ما اختير من مرونة (إن وُجد) من الكتالوج حصرًا',
    plan.mobilityExerciseIds.every((id) => getExercise(id)?.movementPattern === 'mobility'),
  )
}

console.log(`\n${'─'.repeat(46)}`)
if (fail === 0) {
  console.log(`✅ هويّة الإحماء: ${pass} فحصًا، 0 فشل.`)
} else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
