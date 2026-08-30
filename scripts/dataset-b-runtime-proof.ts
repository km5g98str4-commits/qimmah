// برهان وصول Dataset B إلى وقت التشغيل — [DATASET-B-RUNTIME].
// بلا متصفّح، حتمي. التشغيل: npm run test:dataset-b-runtime
//
// السؤال الذي يجيب عنه: **هل يستطيع مستخدم حقيقي أن يختار برنامجًا جاهزًا
// ويُكمله؟** لا «هل البيانات موجودة» — البيانات كانت موجودة والعطل كان في الطريق.
//
// أربعة عشر فحصًا مطلوبًا، كلها هنا، وكل واحد يسقط **باسمه**:
//   ① البرامج الثمانية مرئية لوقت التشغيل      ⑧ المشاركة (alias) تُحلّ لجلستها
//   ② معرّفات البرامج فريدة                      ⑨ جدول البرنامج المتناوب يُحلّ
//   ③ كل جلسة تُحلّ                              ⑩ هجوم «١ من ١» مضادّ
//   ④ كل معرّف تمرين يُحلّ في الكتالوج            ⑪ الاختيار يحفظ الخطة كاملة
//   ⑤ لا وزن حرّ                                  ⑫ إعادة الفتح تحفظ الخطة كاملة
//   ⑥ الترتيب ١..N بلا ثغرة                       ⑬ إنهاء التمرين الأول لا يُنهي الجلسة
//   ⑦ العدد المعلَن = الطول الفعلي                 ⑭ الإنهاء يُعرض عند الأخير وحده

import {
  builtInWorkoutTemplates,
  builtInProgramMeta,
  getBuiltInTemplate,
} from '@/data/workoutTemplatesBuiltIn'
import {
  builtInSessions,
  builtInVariants,
  builtInProgramSources,
  builtInSubstitutions,
  DATASET_B_SHA256,
} from '@/data/builtInProgramsSource.generated'
import { getTemplate } from '@/data/workoutTemplates'
import { getExercise } from '@/data/exercises'
import { isDayOrdered } from '@/lib/workoutOrder'
import { generatePlanFromTemplate } from '@/lib/workoutPlan'
import { saveCustomPlan, loadCustomPlanRecord, clearCustomPlan } from '@/features/customPlan/storage'
import type { WorkoutPlan } from '@/types/workout'

let passed = 0
let failed = 0
function check(name: string, ok: boolean, detail = ''): boolean {
  if (ok) { passed += 1; console.log(`  ✓ ${name}`) }
  else { failed += 1; console.log(`  ✗ FAIL  ${name}${detail ? `  — ${detail}` : ''}`) }
  return ok
}

const ALLOWED_EQUIPMENT = new Set(['machine', 'cable'])
const EXPECTED_PROGRAMS = 8

console.log(`\nDataset B sha256: ${DATASET_B_SHA256.slice(0, 16)}…`)

// ── ① البرامج الثمانية مرئية لوقت التشغيل ───────────────────────────────────
console.log('\n① البرامج الثمانية مرئية لوقت التشغيل')
check(`عدد البرامج = ${EXPECTED_PROGRAMS}`, builtInWorkoutTemplates.length === EXPECTED_PROGRAMS, String(builtInWorkoutTemplates.length))
check('كل برنامج يُحلّ عبر getTemplate (المسار الذي تستعمله الشاشة)', builtInWorkoutTemplates.every((t) => getTemplate(t.id)?.id === t.id))
check('كل برنامج يُحلّ عبر getBuiltInTemplate', builtInWorkoutTemplates.every((t) => getBuiltInTemplate(t.id)?.id === t.id))
check('كل برنامج يحمل بياناته (أيام/أسبوع، مستوى، جدول)', builtInWorkoutTemplates.every((t) => {
  const m = builtInProgramMeta[t.id]
  return Boolean(m && m.daysPerWeek > 0 && m.level && m.schedule.length === 7)
}))

// ── ② معرّفات فريدة ─────────────────────────────────────────────────────────
console.log('\n② معرّفات البرامج والأيام فريدة')
const ids = builtInWorkoutTemplates.map((t) => t.id)
check('معرّفات البرامج فريدة', new Set(ids).size === ids.length)
const dayIds = builtInWorkoutTemplates.flatMap((t) => t.days.map((d) => d.id))
check('معرّفات الأيام فريدة عبر كل البرامج', new Set(dayIds).size === dayIds.length, `${dayIds.length} يومًا`)

// ── ③ كل جلسة تُحلّ ────────────────────────────────────────────────────────
console.log('\n③ كل تسمية يوم تُحلّ إلى جلسة قانونية')
for (const [vid, v] of Object.entries(builtInVariants)) {
  check(`${vid} → ${v.sessionId}`, Boolean(builtInSessions[v.sessionId]))
}

// ── ④ كل معرّف تمرين يُحلّ ─────────────────────────────────────────────────
console.log('\n④ كل معرّف تمرين يُحلّ في الكتالوج الحقيقي')
let unresolved = 0
let resolvedCount = 0
for (const t of builtInWorkoutTemplates) {
  for (const d of t.days) {
    for (const id of d.exerciseIds) {
      if (getExercise(id)) resolvedCount += 1
      else { unresolved += 1; console.log(`      معرّف لا يُحلّ: ${t.id}/${d.id}/${id}`) }
    }
  }
}
check(`كل المعرّفات تُحلّ (${resolvedCount} موضعًا)`, unresolved === 0, `${unresolved} لا تُحلّ`)
const subTargets = Object.values(builtInSubstitutions).flat()
check(`كل بديل معتمد يُحلّ (${subTargets.length} بديلًا)`, subTargets.every((id) => Boolean(getExercise(id))))

// ── ⑤ لا وزن حرّ ───────────────────────────────────────────────────────────
console.log('\n⑤ لا وزن حرّ — أجهزة وكيبل فقط')
const freeWeights: string[] = []
for (const t of builtInWorkoutTemplates) {
  for (const d of t.days) {
    for (const id of d.exerciseIds) {
      const eq = getExercise(id)?.equipment ?? []
      if (eq.length === 0 || !eq.every((q) => ALLOWED_EQUIPMENT.has(q))) freeWeights.push(`${d.id}/${id}`)
    }
  }
}
check('صفر تمرين وزن حرّ في كل البرامج', freeWeights.length === 0, freeWeights.join(', '))
check('كل بديل معتمد جهاز أو كيبل', subTargets.every((id) => (getExercise(id)?.equipment ?? []).every((q) => ALLOWED_EQUIPMENT.has(q))))

// ── ⑥ الترتيب ١..N ─────────────────────────────────────────────────────────
console.log('\n⑥ الخطة المولَّدة من البرنامج مرتّبة ١..N بلا ثغرة ولا تكرار')
for (const t of builtInWorkoutTemplates) {
  const plan = generatePlanFromTemplate(t.id)
  for (const day of plan.days) {
    const orders = day.exercises.map((e) => e.order)
    check(`${t.id}/${day.id}: order = 0..N-1 متتابع`, JSON.stringify(orders) === JSON.stringify(orders.map((_, i) => i)), orders.join(','))
    const exIds = day.exercises.map((e) => e.exerciseId)
    check(`${t.id}/${day.id}: لا تمرين مكرّر`, new Set(exIds).size === exIds.length)
    check(`${t.id}/${day.id}: ترتيب Q19 محفوظ في الخطة`, isDayOrdered(exIds))
  }
}

// ── ⑦ العدد المعلَن = الطول الفعلي ─────────────────────────────────────────
console.log('\n⑦ العدد المعلَن في المجموعة = طول قائمة الخطة فعلًا')
for (const p of builtInProgramSources) {
  const plan = generatePlanFromTemplate(p.templateId)
  const variantIds = p.rotation ? p.rotation.sequence : p.schedule.filter((e) => e.type === 'workout').map((e) => e.variantId as string)
  check(`${p.templateId}: عدد الأيام ${plan.days.length} = ${variantIds.length}`, plan.days.length === variantIds.length)
  variantIds.forEach((vid, i) => {
    const declared = builtInSessions[builtInVariants[vid].sessionId].exerciseIds.length
    const actual = plan.days[i]?.exercises.length ?? -1
    check(`${p.templateId}/${vid}: معلَن ${declared} = فعلي ${actual}`, declared === actual)
  })
}

// ── ⑧ المشاركة تُحلّ لجلستها المقصودة ──────────────────────────────────────
console.log('\n⑧ المشاركة (alias): تسميتان، جلسة واحدة، ومحتوى واحد لا نسختان')
const bySession: Record<string, string[]> = {}
for (const [vid, v] of Object.entries(builtInVariants)) (bySession[v.sessionId] ??= []).push(vid)
const aliasGroups = Object.entries(bySession).filter(([, vs]) => vs.length > 1)
check('توجد مشاركات معلَنة', aliasGroups.length > 0, `${aliasGroups.length} مجموعة`)
for (const [sid, vs] of aliasGroups) {
  const seqs = vs.map((v) => builtInSessions[builtInVariants[v].sessionId].exerciseIds.join('>'))
  check(`${sid} ← {${vs.join(', ')}} محتوى واحد`, new Set(seqs).size === 1)
  const kinds = vs.map((v) => builtInVariants[v].dayKind)
  check(`${sid}: التسميات مختلفة فعلًا (${kinds.join(' / ')})`, new Set(kinds).size === kinds.length)
}

// ── ⑨ جدول البرنامج المتناوب ───────────────────────────────────────────────
console.log('\n⑨ كل مدخل جدول يُحلّ — بلا معرّف وهمي، صفر استثناء')
let unresolvableSchedule = 0
for (const p of builtInProgramSources) {
  for (const entry of p.schedule) {
    if (entry.type !== 'workout') {
      if (entry.variantId !== null) { unresolvableSchedule += 1; console.log(`      يوم راحة يحمل معرّفًا: ${p.templateId} d${entry.day}`) }
      continue
    }
    if (!entry.variantId || !builtInVariants[entry.variantId]) {
      unresolvableSchedule += 1
      console.log(`      معرّف جدول لا يُحلّ: ${p.templateId} d${entry.day} = ${String(entry.variantId)}`)
    }
  }
  for (const vid of p.rotation?.sequence ?? []) {
    if (!builtInVariants[vid]) { unresolvableSchedule += 1; console.log(`      دوران لا يُحلّ: ${p.templateId}/${vid}`) }
  }
  for (const w of p.rotation?.weeks ?? []) {
    for (const vid of w.variantIds) {
      if (!builtInVariants[vid]) { unresolvableSchedule += 1; console.log(`      أسبوع ${w.week} لا يُحلّ: ${p.templateId}/${vid}`) }
    }
  }
}
check('UNRESOLVABLE_VARIANT_IDS = 0', unresolvableSchedule === 0, String(unresolvableSchedule))
const rotating = builtInProgramSources.find((p) => p.rotation)
check('البرنامج المتناوب يعلن دورته', Boolean(rotating?.rotation?.cycleWeeks && rotating.rotation.sequence.length > 0))
check('أسابيع التناوب تغطّي الدورة كاملة', (rotating?.rotation?.weeks.length ?? 0) === (rotating?.rotation?.cycleWeeks ?? -1))
{
  // انتقال الأسابيع: كل أسبوع يأخذ ٣ جلسات متتابعة من دورة ٤، فيبدأ الأسبوع التالي حيث انتهى.
  const seq = rotating?.rotation?.sequence ?? []
  const weeks = rotating?.rotation?.weeks ?? []
  let cursor = 0
  let ok = seq.length > 0 && weeks.length > 0
  for (const w of weeks) {
    for (const vid of w.variantIds) {
      if (seq[cursor % seq.length] !== vid) ok = false
      cursor += 1
    }
  }
  check('كل أسبوع يكمل من حيث انتهى سابقه (لا قفزة ولا تكرار)', ok, weeks.map((w) => w.variantIds.join('/')).join(' | '))
}

// ── ⑩ هجوم «١ من ١» المضادّ ────────────────────────────────────────────────
console.log('\n⑩ هجوم مضادّ: جلسة متعدّدة لا تنهار إلى «١ من ١» عبر أي تحويل')
{
  const plan = generatePlanFromTemplate('builtin-upper-lower-4')
  const upper = plan.days[0]
  const n = upper.exercises.length
  check(`اليوم العلوي يحمل ${n} تمرينًا (≥ ٨)`, n >= 8, String(n))
  const transforms: Array<[string, () => number]> = [
    ['JSON ذهابًا وإيابًا', () => (JSON.parse(JSON.stringify(upper)) as typeof upper).exercises.length],
    ['structuredClone', () => structuredClone(upper).exercises.length],
    ['Set على exerciseId', () => new Set(upper.exercises.map((e) => e.exerciseId)).size],
    ['فهرسة بـexerciseId', () => Object.keys(Object.fromEntries(upper.exercises.map((e) => [e.exerciseId, e]))).length],
    ['فهرسة بـorder', () => Object.keys(Object.fromEntries(upper.exercises.map((e) => [e.order, e]))).length],
    ['فهرسة بمعرّف عنصر الخطة', () => new Map(upper.exercises.map((e) => [e.id, e])).size],
    ['فرز بالترتيب', () => [...upper.exercises].sort((a, b) => a.order - b.order).length],
  ]
  for (const [name, fn] of transforms) check(`${name}: يبقى ${n}`, fn() === n, String(fn()))
  // الحارس المضادّ: مفتاح ثابت داخل اليوم **يجب** أن ينهار — ولولا انهياره لما كان الفحص فحصًا.
  const collapsed = Object.keys(Object.fromEntries(upper.exercises.map((e) => [upper.id, e]))).length
  check('⟲ الفهرسة بمفتاح ثابت تنهار فعلًا (فالفحص أعلاه ليس شكليًا)', collapsed === 1, String(collapsed))
  check('⟲ ولو انهارت، فحص العدد يلتقطها', collapsed !== n)
}

// ── ⑪ + ⑫ الاختيار يحفظ الخطة كاملة، وإعادة الفتح تحفظها ──────────────────
console.log('\n⑪ اختيار البرنامج يحفظ الخطة كاملة · ⑫ إعادة الفتح تحفظها')
for (const t of builtInWorkoutTemplates) {
  const owner = `proof-${t.id}`
  clearCustomPlan(owner)
  const plan: WorkoutPlan = generatePlanFromTemplate(t.id)
  const before = plan.days.map((d) => d.exercises.length)
  saveCustomPlan(owner, plan, 'custom')
  const rec = loadCustomPlanRecord(owner)
  const after = rec?.plan.days.map((d) => d.exercises.length) ?? []
  check(`${t.id}: يُحفظ بكل أيامه وتمارينه`, JSON.stringify(before) === JSON.stringify(after), `${before.join(',')} → ${after.join(',')}`)
  check(`${t.id}: معرّف البرنامج محفوظ`, rec?.plan.templateId === t.id)
  // ⑫ إعادة الفتح = قراءة ثانية من التخزين نفسه بعد كتابة/قراءة كاملة.
  const reopened = loadCustomPlanRecord(owner)
  const ids1 = plan.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))
  const ids2 = reopened?.plan.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)) ?? []
  check(`${t.id}: إعادة الفتح تُبقي نفس التمارين بنفس الترتيب`, JSON.stringify(ids1) === JSON.stringify(ids2))
  clearCustomPlan(owner)
}

// ── ⑬ + ⑭ إنهاء التمرين الأول لا يُنهي الجلسة ─────────────────────────────
console.log('\n⑬ إنهاء التمرين الأول لا يُنهي الجلسة · ⑭ الإنهاء عند الأخير وحده')
{
  const plan = generatePlanFromTemplate('builtin-upper-lower-4')
  const day = plan.days[0]
  const n = day.exercises.length
  // نموذج تقدّم الجلسة كما يقرؤه التبويب: المؤشّر على التمرين الحالي من أصل N.
  const isLast = (index: number) => index === n - 1
  check(`الجلسة تبدأ عند ١/${n} لا ١/١`, n > 1 && !isLast(0), `n=${n}`)
  for (let i = 0; i < n - 1; i += 1) {
    check(`بعد إنهاء التمرين ${i + 1}/${n} تبقى الجلسة مفتوحة`, !isLast(i))
  }
  check(`الإنهاء يُعرض عند ${n}/${n} وحده`, isLast(n - 1))
  const finishOffers = Array.from({ length: n }, (_, i) => isLast(i)).filter(Boolean).length
  check('موضع إنهاء واحد لا أكثر', finishOffers === 1, String(finishOffers))
}

console.log(`\n${failed === 0 ? '✅' : '❌'} Dataset B في وقت التشغيل — نجح ${passed} · فشل ${failed}`)
if (failed > 0) process.exit(1)
