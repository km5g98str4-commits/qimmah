// Q19 proof — template ordering law + active-session progression + restore.
// Offline, deterministic, no DOM. Run: npm run test:workout-order
//
// Asserts:
//   ① every template day is in canonical order (compound → isolation → calves),
//      first lift is a compound, calves/core are last, and the order is NOT
//      alphabetical (guards against an accidental .sort()).
//   ② the four "known" programs survive (full-body, upper-lower, ppl-3, ppl-6)
//      and 'custom' stays an empty structural day (no personalization started).
//   ③ finishing every set of ONE exercise advances to the next — the day is
//      never complete after a single exercise.
//   ④ finishing the last set of the LAST exercise completes the day, having
//      visited every exercise in template order exactly once.
//   ⑤ a persisted mid-session snapshot is restorable and resumes at the exact
//      exercise/set, with the correct "next exercise" ahead of it.

import { workoutTemplates, getTemplate } from '@/data/workoutTemplates'
import { exerciseOrderRank, isCompoundExercise, orderDayExerciseIds, isDayOrdered, COMPOUND_CEILING, FINISHER_RANK } from '@/lib/workoutOrder'
import { stepActiveSession } from '@/lib/workoutV2Session'
import { isUsableActiveWorkout, nextExerciseAfter } from '@/lib/workoutSessionEngine'
import { getExercise } from '@/data/exercises'
import type { WorkoutV2Model } from '@/lib/workoutV2Model'

let passed = 0
let failed = 0
function check(name: string, ok: boolean, detail = ''): boolean {
  if (ok) { passed += 1; console.log(`  ✓ ${name}`) }
  else { failed += 1; console.log(`  ✗ FAIL  ${name}${detail ? `  — ${detail}` : ''}`) }
  return ok
}

const realDays = workoutTemplates.flatMap((t) => t.days.filter((d) => d.exerciseIds.length > 0).map((d) => ({ d })))

// ── ① ordering law ──────────────────────────────────────────────────────────
console.log('\n① كل يوم في القوالب مرتّب بقانون التطلّب (لا أبجدي/عشوائي)')
for (const { d } of realDays) {
  const ids = d.exerciseIds
  check(`${d.id}: مرتّب تصاعديًا حسب الرتبة (مركّب→عزل→سمانة)`, isDayOrdered(ids), ids.map(exerciseOrderRank).join(','))
  check(`${d.id}: idempotent تحت الفرز القانوني`, JSON.stringify(orderDayExerciseIds(ids)) === JSON.stringify(ids))
  check(`${d.id}: أول حركة مركّبة (الأساسية أولًا)`, isCompoundExercise(ids[0]), ids[0])

  const calfIdx = ids.findIndex((id) => getExercise(id)?.primaryMuscle === 'calves')
  if (calfIdx >= 0) check(`${d.id}: السمانة في الأخير`, calfIdx === ids.length - 1, `at ${calfIdx}/${ids.length - 1}`)

  // No isolation before a compound.
  const firstIso = ids.findIndex((id) => exerciseOrderRank(id) >= COMPOUND_CEILING)
  const lastCompound = ids.map(exerciseOrderRank).reduce((acc, r, i) => (r < COMPOUND_CEILING ? i : acc), -1)
  check(`${d.id}: لا عزل قبل أي مركّب`, firstIso === -1 || lastCompound < firstIso)

  // NOT alphabetical (unless a 1-item day happens to coincide).
  const alpha = [...ids].sort()
  if (ids.length > 2) check(`${d.id}: ليس ترتيبًا أبجديًا`, JSON.stringify(ids) !== JSON.stringify(alpha))
}

// A day with a deliberately-scrambled order is repaired by the law (sanity of the tool).
{
  const scrambled = ['seated-calf-raise-machine', 'pec-deck-machine', 'leg-press-machine', 'glute-machine']
  const fixed = orderDayExerciseIds(scrambled)
  check('الأداة تُصلح يومًا مبعثرًا: مركّبات ثم عزل ثم سمانة',
    JSON.stringify(fixed) === JSON.stringify(['leg-press-machine', 'glute-machine', 'pec-deck-machine', 'seated-calf-raise-machine']),
    fixed.join(','))
  check('الفرز مستقرّ: يحفظ ترتيب المؤلّف داخل نفس الرتبة',
    JSON.stringify(orderDayExerciseIds(['chest-press-machine', 'incline-chest-press-machine'])) === JSON.stringify(['chest-press-machine', 'incline-chest-press-machine']))
}

// ── ② known programs preserved, custom untouched ─────────────────────────────
console.log('\n② القوالب المعروفة محفوظة و«المخصّص» يبقى يومًا فارغًا')
for (const id of ['full-body', 'upper-lower', 'ppl-3', 'ppl-6']) {
  check(`قالب معروف موجود: ${id}`, !!getTemplate(id))
}
const custom = getTemplate('custom')
check('custom: يوم واحد فارغ (لا personalization)', !!custom && custom.days.length === 1 && custom.days[0].exerciseIds.length === 0)

// ── ③ finishing ONE exercise advances, does not end the day ──────────────────
console.log('\n③ إكمال تمرينٍ واحد يتقدّم للتالي ولا يُنهي اليوم')
{
  const setsPerEx = [4, 3, 5] // 3 exercises
  let pos = { exIndex: 0, setIndex: 0 }
  let completedDay = false
  // finish all 4 sets of exercise 0
  for (let s = 0; s < 4; s += 1) {
    const step = stepActiveSession(pos, setsPerEx)
    completedDay = completedDay || step.dayComplete
    pos = { exIndex: step.exIndex, setIndex: step.setIndex }
  }
  check('بعد إنهاء كل مجموعات التمرين الأول: اليوم غير مكتمل', !completedDay)
  check('بعد إنهاء التمرين الأول: انتقلنا للتمرين الثاني (exIndex=1, setIndex=0)', pos.exIndex === 1 && pos.setIndex === 0, JSON.stringify(pos))
}

// ── ④ finishing the LAST set of the LAST exercise completes the day ──────────
console.log('\n④ إكمال آخر مجموعة من آخر تمرين يُكمل اليوم — بزيارة كل التمارين بالترتيب')
{
  const setsPerEx = [3, 2, 4]
  const totalSets = setsPerEx.reduce((a, b) => a + b, 0)
  let pos = { exIndex: 0, setIndex: 0 }
  const visitedExercises: number[] = [0]
  let completeAt = -1
  for (let i = 0; i < totalSets; i += 1) {
    const step = stepActiveSession(pos, setsPerEx)
    if (step.dayComplete) { completeAt = i; break }
    if (step.exIndex !== pos.exIndex) visitedExercises.push(step.exIndex)
    pos = { exIndex: step.exIndex, setIndex: step.setIndex }
  }
  check('اليوم يكتمل عند المجموعة الأخيرة تمامًا (لا قبلها)', completeAt === totalSets - 1, `completeAt=${completeAt}, total=${totalSets}`)
  check('زار كل التمارين بالترتيب 0→1→2', JSON.stringify(visitedExercises) === JSON.stringify([0, 1, 2]), visitedExercises.join('→'))
}

// A real template day drives the same reducer end-to-end.
{
  const day = getTemplate('upper-lower')!.days[0]
  const setsPerEx = day.exerciseIds.map(() => 3)
  let pos = { exIndex: 0, setIndex: 0 }
  let steps = 0
  let done = false
  while (steps < 999) {
    const step = stepActiveSession(pos, setsPerEx)
    steps += 1
    if (step.dayComplete) { done = true; break }
    pos = { exIndex: step.exIndex, setIndex: step.setIndex }
  }
  check('يوم قالب حقيقي: يكتمل بعد كل المجموعات', done && steps === setsPerEx.length * 3, `steps=${steps}`)
}

// ── ⑤ restore a mid-session snapshot ─────────────────────────────────────────
console.log('\n⑤ استعادة جلسة مُخزّنة في منتصفها — تستأنف عند نفس التمرين/المجموعة')
{
  const day = getTemplate('ppl-3')!.days[0] // push day
  const slotIds = day.exerciseIds
  // A snapshot paused at exercise index 1, set index 1, exercise 0 fully done.
  const rows: Record<string, { weight: number; reps: number; done: boolean }[]> = {}
  slotIds.forEach((id, i) => {
    rows[id] = Array.from({ length: 3 }, (_, s) => ({ weight: 20, reps: 10, done: i === 0 || (i === 1 && s === 0) }))
  })
  const persisted = { exIndex: 1, setIndex: 1, startedAt: 1_000, rows }

  check('اللقطة صالحة للاستعادة (isUsableActiveWorkout)', isUsableActiveWorkout(persisted, slotIds))
  check('لقطة exIndex خارج المدى تُرفض', !isUsableActiveWorkout({ ...persisted, exIndex: 99 }, slotIds))
  check('لقطة بصفوف ناقصة تُرفض', !isUsableActiveWorkout({ ...persisted, rows: {} }, slotIds))

  // The model the view builds off the same day → "next exercise" ahead of us.
  const model = { exercises: slotIds.map((id) => ({ id })) } as unknown as WorkoutV2Model
  const currentSlot = slotIds[persisted.exIndex]
  check('التمرين التالي بعد الحالي = الفتحة رقم 2', nextExerciseAfter(model, currentSlot) === slotIds[2], String(nextExerciseAfter(model, currentSlot)))

  // Resuming from the snapshot and finishing continues to day completion.
  const setsPerEx = slotIds.map(() => 3)
  let pos = { exIndex: persisted.exIndex, setIndex: persisted.setIndex }
  let done = false
  for (let i = 0; i < 99; i += 1) {
    const step = stepActiveSession(pos, setsPerEx)
    if (step.dayComplete) { done = true; break }
    pos = { exIndex: step.exIndex, setIndex: step.setIndex }
  }
  check('الاستئناف من اللقطة يصل لإكمال اليوم', done)
}

// ── before/after ordering table (for the record) ─────────────────────────────
console.log('\n— جدول الترتيب (رتبة كل تمرين: <500 مركّب، 500 عزل، 900 سمانة) —')
for (const { d } of realDays) {
  console.log(`  ${d.id}: ${d.exerciseIds.map((id) => `${id}(${exerciseOrderRank(id)})`).join('  ›  ')}`)
}

console.log(`\n${passed}/${passed + failed} فحصًا نجح`)
if (failed > 0) { console.log('✗ Q19 order/session proof FAILED'); process.exit(1) }
console.log('✅ ترتيب القوالب + تقدّم الجلسة + الاستعادة — مثبَت.')
void FINISHER_RANK
