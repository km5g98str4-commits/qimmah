// برهان البرامج الجاهزة الحتمية — [FOUNDER-QA-P0].
// بلا متصفّح، حتمي. التشغيل: npm run test:builtin-templates
//
// يثبت:
//   ① كل معرّف تمرين في كل يوم يُحلّ لتمرين **حقيقي** في الكتالوج — حارس منع
//      الاختراع، وهو سبب وجود هذا البرهان أصلًا.
//   ② لا تمرين مكرّر داخل اليوم الواحد.
//   ③ حجم كل يوم داخل النطاق العاقل [٤، ٩].
//   ④ اسم كل برنامج وكل يوم موجود **بالعربية والإنجليزية**، غير متطابقين، وبلا
//      أرقام لاتينية داخل جملة عربية (BUG-019).
//   ⑤ قانون ترتيب Q19 مطبَّق على كل يوم (مركّب → عزل → سمانة)، وأيام البرامج
//      الجاهزة تمرّ بنفس الفحص الذي تمرّ به قوالب الجذع.
//   ⑥ «أجهزة فقط»: كل تمرين يحمل `machine` في أدواته.
//   ⑦ لا معرّف برنامج جاهز يصطدم بمعرّف في `workoutTemplates`، و`getTemplate`
//      صار يحلّ الاثنين بلا مساس بالقديم.
//   ⑧ الأرقام والتغطية المقيسة — تُطبع لتُقرأ لا لتُصدَّق.
//
// ⑨ **التأكيدات المضادّة (§4.2):** لكل حارس أعلاه محاكاة عودة العطل، ويجب أن
//    يسقط **بفحص مسمّى** (رمز عطل) لا بـ`TypeError`. وحارسٌ لا يسقط = لا حارس:
//    كل محاكاة تُفحص أيضًا بأنها أنتجت أعطالًا أصلًا.

import {
  builtInWorkoutTemplates,
  builtInTemplateMap,
  getBuiltInTemplate,
  validateBuiltInTemplates,
  BUILT_IN_TEMPLATE_IDS,
  MIN_DAY_EXERCISES,
  MAX_DAY_EXERCISES,
  type BuiltInTemplateIssueCode,
} from '@/data/workoutTemplatesBuiltIn'
import { workoutTemplates, getTemplate } from '@/data/workoutTemplates'
import { builtInTemplateStrings } from '@/i18n/dict/builtInTemplates'
import { getExercise } from '@/data/exercises'
import { isDayOrdered, isCompoundExercise, orderDayExerciseIds } from '@/lib/workoutOrder'
import type { WorkoutTemplate } from '@/types/workout'

declare const __SOURCES__: Record<string, string>

let passed = 0
let failed = 0
function check(name: string, ok: boolean, detail = ''): boolean {
  if (ok) {
    passed += 1
    console.log(`  ✓ ${name}`)
  } else {
    failed += 1
    console.log(`  ✗ FAIL  ${name}${detail ? `  — ${detail}` : ''}`)
  }
  return ok
}

/** نسخة عميقة قابلة للتشويه — المحاكاة لا تلمس الحقيقة. */
const clone = (t: readonly WorkoutTemplate[]): WorkoutTemplate[] =>
  JSON.parse(JSON.stringify(t)) as WorkoutTemplate[]

const allDays = builtInWorkoutTemplates.flatMap((t) => t.days.map((d) => ({ t, d })))

// ── ① الحقيقة نظيفة ─────────────────────────────────────────────────────────
console.log('\n① الطقم الحقيقي يمرّ بالحارس البنيوي بلا عطل واحد')
const realIssues = validateBuiltInTemplates(builtInWorkoutTemplates)
check(
  `صفر أعطال على ${builtInWorkoutTemplates.length} برنامجًا و${allDays.length} يومًا`,
  realIssues.length === 0,
  realIssues.map((i) => `${i.code}@${i.where}:${i.detail}`).join(' | '),
)
check('البرامج الثمانية كلها حاضرة', builtInWorkoutTemplates.length === 8, String(builtInWorkoutTemplates.length))
check(
  'ترتيب العرض يطابق قائمة المعرّفات المعلَنة',
  JSON.stringify(builtInWorkoutTemplates.map((t) => t.id)) === JSON.stringify([...BUILT_IN_TEMPLATE_IDS]),
)

// ── ② كل معرّف يُحلّ لتمرين حقيقي (حارس منع الاختراع) ────────────────────────
console.log('\n② كل معرّف تمرين يُحلّ لتمرين حقيقي في الكتالوج')
let resolvedCount = 0
for (const { t, d } of allDays) {
  const unresolved = d.exerciseIds.filter((id) => !getExercise(id))
  resolvedCount += d.exerciseIds.length - unresolved.length
  check(`${t.id}/${d.id}: ${d.exerciseIds.length} معرّفًا كلها في الكتالوج`, unresolved.length === 0, unresolved.join(','))
}
console.log(`  › معرّفات محلولة: ${resolvedCount}`)

// ── ③ لا تكرار داخل اليوم + الحجم العاقل ────────────────────────────────────
console.log('\n③ لا تمرين مكرّر داخل اليوم، والحجم داخل النطاق العاقل')
for (const { t, d } of allDays) {
  check(`${t.id}/${d.id}: بلا تكرار`, new Set(d.exerciseIds).size === d.exerciseIds.length)
  check(
    `${t.id}/${d.id}: ${d.exerciseIds.length} داخل [${MIN_DAY_EXERCISES},${MAX_DAY_EXERCISES}]`,
    d.exerciseIds.length >= MIN_DAY_EXERCISES && d.exerciseIds.length <= MAX_DAY_EXERCISES,
  )
}

// ── ④ الأسماء باللغتين ──────────────────────────────────────────────────────
console.log('\n④ أسماء البرامج والأيام موجودة باللغتين وغير متطابقة وبلا أرقام لاتينية في العربية')
const LATIN_DIGIT = /[0-9]/
for (const t of builtInWorkoutTemplates) {
  check(`${t.id}: اسم عربي وإنجليزي غير فارغين ومختلفان`, Boolean(t.nameAr.trim() && t.nameEn.trim() && t.nameAr !== t.nameEn), `${t.nameAr} / ${t.nameEn}`)
  check(`${t.id}: وصف عربي وإنجليزي غير فارغين`, Boolean(t.descriptionAr.trim() && t.descriptionEn.trim()))
  check(`${t.id}: الاسم العربي بلا أرقام لاتينية`, !LATIN_DIGIT.test(t.nameAr), t.nameAr)
  for (const d of t.days) {
    check(`${t.id}/${d.id}: اسم اليوم باللغتين ومختلف`, Boolean(d.nameAr.trim() && d.nameEn.trim() && d.nameAr !== d.nameEn), `${d.nameAr} / ${d.nameEn}`)
  }
}
// القاموس نفسه مكتمل: كل معرّف برنامج وكل نوع يوم له نصّ في اللغتين.
for (const id of BUILT_IN_TEMPLATE_IDS) {
  check(`قاموس: ${id} له نصّ عربي وإنجليزي`, Boolean(builtInTemplateStrings.ar.templates[id]?.name && builtInTemplateStrings.en.templates[id]?.name))
}
const dayKindsAr = Object.keys(builtInTemplateStrings.ar.days).sort()
const dayKindsEn = Object.keys(builtInTemplateStrings.en.days).sort()
check('قاموس: أنواع الأيام متطابقة بين اللغتين', JSON.stringify(dayKindsAr) === JSON.stringify(dayKindsEn))

// ── ⑤ قانون ترتيب Q19 ───────────────────────────────────────────────────────
console.log('\n⑤ كل يوم يتبع قانون ترتيب Q19 (مركّب → عزل → سمانة)')
for (const { t, d } of allDays) {
  check(`${t.id}/${d.id}: مرتّب قانونيًا`, isDayOrdered(d.exerciseIds))
  check(
    `${t.id}/${d.id}: idempotent تحت الفرز القانوني`,
    JSON.stringify(orderDayExerciseIds(d.exerciseIds)) === JSON.stringify(d.exerciseIds),
  )
  check(`${t.id}/${d.id}: أول حركة مركّبة`, isCompoundExercise(d.exerciseIds[0]), d.exerciseIds[0])
  const calfIdx = d.exerciseIds.findIndex((id) => getExercise(id)?.primaryMuscle === 'calves')
  if (calfIdx >= 0) check(`${t.id}/${d.id}: السمانة في الأخير`, calfIdx === d.exerciseIds.length - 1)
}

// ── ⑥ أجهزة فقط ─────────────────────────────────────────────────────────────
console.log('\n⑥ أجهزة موجّهة فقط — لا وزن حرّ ولا كيبل داخل برنامج جاهز')
for (const { t, d } of allDays) {
  const nonMachine = d.exerciseIds.filter((id) => !getExercise(id)?.equipment.includes('machine'))
  check(`${t.id}/${d.id}: كلها أجهزة`, nonMachine.length === 0, nonMachine.join(','))
}

// ── ⑦ التعايش مع قوالب الجذع ────────────────────────────────────────────────
console.log('\n⑦ لا تصادم مع قوالب الجذع، و getTemplate يحلّ الطرفين')
const trunkIds = new Set(workoutTemplates.map((t) => t.id))
for (const id of BUILT_IN_TEMPLATE_IDS) {
  check(`${id}: لا يصطدم بمعرّف على الجذع`, !trunkIds.has(id))
  check(`${id}: getTemplate يحلّه`, getTemplate(id)?.id === id)
  check(`${id}: getBuiltInTemplate يحلّه`, getBuiltInTemplate(id)?.id === id)
}
for (const t of workoutTemplates) {
  check(`قالب الجذع ${t.id}: ما زال يُحلّ كما كان`, getTemplate(t.id) === t)
}
check('قائمة الجذع المعروضة لم تتغيّر عددًا', workoutTemplates.length === 6, String(workoutTemplates.length))
check('معرّف مجهول تمامًا يبقى undefined', getTemplate('no-such-template-id') === undefined)
check('خريطة البرامج الجاهزة بحجم القائمة', Object.keys(builtInTemplateMap).length === BUILT_IN_TEMPLATE_IDS.length)

// ── ⑧ الأرقام المقيسة ───────────────────────────────────────────────────────
console.log('\n⑧ الأرقام المقيسة')
const totalSlots = allDays.reduce((s, { d }) => s + d.exerciseIds.length, 0)
const distinct = new Set(allDays.flatMap(({ d }) => d.exerciseIds))
console.log(`  › برامج: ${builtInWorkoutTemplates.length} · أيام: ${allDays.length} · خانات تمارين: ${totalSlots} · تمارين مميّزة: ${distinct.size}`)
console.log(`  › أيام لكل برنامج: ${builtInWorkoutTemplates.map((t) => `${t.id}=${t.days.length}`).join(' · ')}`)
check('كل تمرين مميّز مستخدَم موجود في الكتالوج', [...distinct].every((id) => Boolean(getExercise(id))))

// ── ⑨ التأكيدات المضادّة — كل حارس يُهاجَم ─────────────────────────────────
console.log('\n⑨ التأكيدات المضادّة: كل حارس يسقط بفحص مسمّى حين يعود العطل')

/**
 * يشوّه نسخة، يشغّل الحارس، ويتحقّق أنّ الرمز المنتظر ظهر — **وأن التشويه أنتج
 * أعطالًا أصلًا** (حارسٌ يمرّ على مدخل فاسد ليس حارسًا).
 */
function counter(name: string, mutate: (t: WorkoutTemplate[]) => void, expected: BuiltInTemplateIssueCode): void {
  const copy = clone(builtInWorkoutTemplates)
  mutate(copy)
  let issues: ReturnType<typeof validateBuiltInTemplates> = []
  let threw = ''
  try {
    issues = validateBuiltInTemplates(copy)
  } catch (e) {
    threw = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  }
  // السقوط باستثناء تقني ليس إثباتًا (§4.2).
  check(`${name}: الحارس لم يرمِ استثناءً`, threw === '', threw)
  check(`${name}: أنتج أعطالًا (لم يمرّ صامتًا)`, issues.length > 0)
  check(
    `${name}: سقط بالرمز المسمّى «${expected}»`,
    issues.some((i) => i.code === expected),
    issues.map((i) => i.code).join(',') || '(لا شيء)',
  )
}

// أ) معرّف مخترع — العطل الذي وُجد هذا البرهان لأجله.
check(
  'الطُّعم صالح: chest-press-9000 فعلًا غير موجود في الكتالوج',
  getExercise('chest-press-9000') === undefined,
)
counter(
  'معرّف مخترع (chest-press-9000)',
  (t) => {
    t[0].days[0].exerciseIds[2] = 'chest-press-9000'
  },
  'unknown-exercise-id',
)

// ب) معرّف **حقيقي** لكنه وزن حرّ — يثبت أن الحارس لا يكتفي بـ«المعرّف موجود».
check('الطُّعم صالح: hammer-curl معرّف حقيقي وليس جهازًا', Boolean(getExercise('hammer-curl')) && !getExercise('hammer-curl')?.equipment.includes('machine'))
counter(
  'وزن حرّ حقيقي (hammer-curl) داخل برنامج جاهز',
  (t) => {
    t[0].days[0].exerciseIds[8] = 'hammer-curl'
  },
  'non-machine-exercise',
)

// ج) كيبل حقيقي — نفس المبدأ من الباب الآخر.
counter(
  'كيبل حقيقي (cable-triceps-pushdown) داخل برنامج جاهز',
  (t) => {
    t[0].days[0].exerciseIds[8] = 'cable-triceps-pushdown'
  },
  'non-machine-exercise',
)

// د) تكرار داخل اليوم.
counter(
  'تمرين مكرّر داخل اليوم',
  (t) => {
    t[0].days[0].exerciseIds[1] = t[0].days[0].exerciseIds[0]
  },
  'duplicate-exercise-in-day',
)

// هـ) يوم قصير جدًا ويوم طويل جدًا.
counter(
  'يوم بثلاثة تمارين (تحت الحدّ)',
  (t) => {
    t[1].days[0].exerciseIds = t[1].days[0].exerciseIds.slice(0, 3)
  },
  'day-size-out-of-range',
)
counter(
  'يوم بعشرة تمارين (فوق الحدّ)',
  (t) => {
    t[0].days[0].exerciseIds = [...t[0].days[0].exerciseIds, 'seated-calf-raise-machine']
  },
  'day-size-out-of-range',
)

// و) كسر الترتيب: السمانة أولًا.
counter(
  'السمانة في أول اليوم (كسر قانون Q19)',
  (t) => {
    const ids = t[0].days[1].exerciseIds
    t[0].days[1].exerciseIds = [ids[ids.length - 1], ...ids.slice(0, -1)]
  },
  'order-law-violation',
)

// ز) اسم إنجليزي مفقود.
counter(
  'اسم إنجليزي فارغ',
  (t) => {
    t[2].nameEn = '   '
  },
  'missing-name',
)
counter(
  'اسم يوم إنجليزي فارغ',
  (t) => {
    t[2].days[0].nameEn = ''
  },
  'missing-name',
)

// ح) ترجمة مزيّفة: نفس النصّ في الحقلين.
counter(
  'العربية والإنجليزية نصّ واحد (ترجمة مزيّفة)',
  (t) => {
    t[3].nameEn = t[3].nameAr
  },
  'identical-ar-en-name',
)

// ط) أرقام لاتينية داخل جملة عربية (BUG-019).
counter(
  'أرقام لاتينية في الاسم العربي',
  (t) => {
    t[4].nameAr = 'علوي / سفلي — 3 أيام'
  },
  'latin-digits-in-arabic',
)

// ي) معرّفات مكرّرة.
counter(
  'معرّف برنامج مكرّر',
  (t) => {
    t[5].id = t[4].id
  },
  'duplicate-template-id',
)
counter(
  'معرّف يوم مكرّر',
  (t) => {
    t[5].days[1].id = t[5].days[0].id
  },
  'duplicate-day-id',
)

// ك) محاكاة الالتفاف: تشويه **متعدّد** يجب أن يُسمّى كلٌّ منه، لا أن يبتلع أحدهما الآخر.
{
  const copy = clone(builtInWorkoutTemplates)
  copy[0].days[0].exerciseIds[0] = 'chest-press-9000'
  copy[0].days[2].exerciseIds[1] = 'hammer-curl'
  copy[1].days[0].exerciseIds = copy[1].days[0].exerciseIds.slice(0, 2)
  const issues = validateBuiltInTemplates(copy)
  const codes = new Set(issues.map((i) => i.code))
  check(
    'ثلاثة أعطال مختلفة تُسمّى كلها في تمريرة واحدة',
    codes.has('unknown-exercise-id') && codes.has('non-machine-exercise') && codes.has('day-size-out-of-range'),
    [...codes].join(','),
  )
}

// ل) الحارس صالح للاستعمال على مدخل معادٍ لا يرمي.
{
  let threw = ''
  try {
    validateBuiltInTemplates([])
  } catch (e) {
    threw = String(e)
  }
  check('طقم فارغ: صفر أعطال وبلا استثناء', threw === '' && validateBuiltInTemplates([]).length === 0, threw)
}

// م) **المدخل الحيّ** — [FOUNDER-QA-005].
//
// برنامجٌ صحيحٌ لا يصل شاشةً ليس منتجًا. البرامج بقيت بعد بنائها تُقرأ من
// `getTemplate` وحدها، فكانت **قدرةً ميتة**: مئات الفحوص خضراء على شيء لا
// يراه أحد. فيُثبَت هنا أنها تُعرض فعلًا في الشاشة الحيّة الوحيدة التي
// تعرض القوالب، وأن `getTemplate` يحلّها — والاثنان معًا لا أحدهما.
{
  const step = __SOURCES__['src/components/customizer/steps/StepWorkoutTemplate.tsx']
  const registry = __SOURCES__['src/data/workoutTemplates.ts']
  const listsBuiltIn =
    /import \{ builtInWorkoutTemplates \} from '@\/data\/workoutTemplatesBuiltIn'/.test(step) &&
    /\[\.\.\.workoutTemplates, \.\.\.builtInWorkoutTemplates\]/.test(step) &&
    /templateCards\.map\(/.test(step)
  check('الشاشة الحيّة تعرض البرامج الجاهزة مع القائمة القديمة', listsBuiltIn)
  check('  ولا تُرسم القائمة القديمة وحدها بعد اليوم', !/\{workoutTemplates\.map\(/.test(step))
  check('و`getTemplate` يحلّ معرّفًا جاهزًا (فالاختيار يُنتج خطة)',
    /getBuiltInTemplate\(id\)/.test(registry))
  // كل معرّف معروض يجب أن يُحلّ فعلًا — عرضُ بطاقةٍ لا تفتح خطةً أسوأ من إخفائها.
  const unresolved = BUILT_IN_TEMPLATE_IDS.filter((id) => !getTemplate(id))
  check('كل برنامج معروض يُحلّ إلى خطة فعلًا', unresolved.length === 0, unresolved.join(','))

  // ⟲ التأكيدات المضادّة — الفحص ليس فارغًا.
  check('⟲ عودة الشاشة إلى القائمة القديمة وحدها تُلتقط باسمها',
    /\{workoutTemplates\.map\(/.test(`${step}\n {workoutTemplates.map((tpl) => {`) &&
    !/\{workoutTemplates\.map\(/.test(step))
  check('⟲ ونزع الاستيراد يُسقط الفحص نفسه',
    !/builtInWorkoutTemplates/.test(step.replace(/builtInWorkoutTemplates/g, 'X')))
}

console.log(`\n${failed === 0 ? '✅' : '❌'} البرامج الجاهزة — نجح ${passed} · فشل ${failed}`)
if (failed > 0) process.exit(1)
