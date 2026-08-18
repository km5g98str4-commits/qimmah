// إثبات محرّك باني الجدول اليدوي (P6) — يعمل فوق localStorage مُحاكى عبر
// run-plan-builder-proof.mjs. يغطّي: الإنشاء/الإضافة/الترتيب/النقل/النسخ/تكرار
// الأسبوع/الحذف الآمن مع سلامة مراجع التقويم (P4) وخريطة الاستبدال، القوالب
// المسمّاة (حفظ/سرد/تطبيق/حذف/عزل مالك/سقف)، المحقّقات (وقت الجلسة heuristic
// ٩ دقائق/تمرين + الحجم العضلي الأسبوعي — تحذيرات لا موانع)، وجولة تصدير/استيراد
// كاملة عبر سجلّ النقل، والتوافق الخلفي لسجلات customPlan القديمة (بلا اسم خطة).

import {
  MAX_PLAN_DAYS,
  MAX_TEMPLATES,
  PLAN_TEMPLATES_KEY,
  addDay,
  addExerciseFromLibrary,
  applyCalendarDayRemoval,
  applyTemplate,
  cleanSubstitutionMap,
  copyDayAs,
  createManualPlan,
  deleteTemplate,
  duplicateDay,
  duplicateWeek,
  estimateSessionMinutes,
  listTemplates,
  moveExerciseToDay,
  planReferenceViolations,
  removeDay,
  removeExercise,
  reorderExercise,
  saveTemplate,
  validatePlan,
} from '@/features/customPlan/builder'
import { loadCustomPlanRecord, saveCustomPlan } from '@/features/customPlan/storage'
import {
  WORKOUT_CALENDAR_KEY,
  loadWeeklySchedule,
  saveWeeklySchedule,
  setTrainingWeekdays,
  validateSchedule,
} from '@/lib/workoutCalendar'
import { DATA_KEYS } from '@/lib/userDataKeys'
import { setSyncRuntime } from '@/lib/syncQueue'
import { buildExportBundle, applyImport } from '@/lib/portability'
import { STORE_BY_ID } from '@/lib/portability/registry'
import { wipeUserData } from '@/lib/accountScope'
import type { WorkoutPlan } from '@/types/workout'

// [QIM-WEB-FOUNDER-UX-003/حزمة ٢] هذا الإثبات يمارس **كتّاب حالة مدفوعة**
// (تمرين/تغذية/قياسات). بعد بوّابة الوصول صار الافتراض منعًا، فيلزم أن يعلن
// الإثبات شخصيته: مستخدم مُفعَّل. هذا **ليس إضعافًا للبوّابة** — موضوع الإثبات
// سلوك التخزين لا الاستحقاق، وحارس الاستحقاق نفسه يحرسه `test:access-gate`
// و`test:e2e:preview-gate` بشخصيتَي معاينة ومُفعَّل.
import { setEntitlement } from '@/lib/access/entitlementStore'
setEntitlement({ status: 'active', source: 'mock' })


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

const ls = globalThis.localStorage

/** يبني خطة N أيام دفع/سحب/أرجل بتمارين حقيقية من المكتبة. */
function buildPlan(days: Array<{ type: 'push' | 'pull' | 'legs'; exercises: string[] }>): WorkoutPlan {
  let plan = createManualPlan({ ar: 'خطتي', en: 'My Plan' })
  for (const d of days) {
    const r = addDay(plan, d.type)
    if (r.status !== 'ok') throw new Error(`addDay failed: ${JSON.stringify(r)}`)
    plan = r.plan
    const dayId = plan.days[plan.days.length - 1].id
    for (const ex of d.exercises) {
      const a = addExerciseFromLibrary(plan, dayId, ex)
      if (a.status !== 'ok') throw new Error(`addExercise failed: ${ex}`)
      plan = a.plan
    }
  }
  return plan
}

const PUSH = ['barbell-bench-press', 'incline-dumbbell-press', 'cable-crossover']
const PULL = ['barbell-row', 'lat-pulldown-machine', 'seated-cable-row']
const LEGS = ['deadlift', 'dumbbell-row']

console.log('\n=== إثبات باني الجدول اليدوي (P6) ===')

console.log('\n① الإنشاء والإضافة من المكتبة')
{
  const empty = createManualPlan({ ar: '  خطة القوة  ' })
  check('createManualPlan: templateId=custom واسم عربي مشذّب واسم إنجليزي غائب', empty.templateId === 'custom' && empty.nameAr === 'خطة القوة' && empty.nameEn === undefined && empty.days.length === 0)

  const d1 = addDay(empty, 'push')
  check('addDay(push): يوم بمعرّف حتمي وتسمية ثنائية', d1.status === 'ok' && d1.plan.days[0].id === 'custom-day-1' && d1.plan.days[0].nameAr === 'دفع' && d1.plan.days[0].nameEn === 'Push')
  const d2 = d1.status === 'ok' ? addDay(d1.plan, 'custom', { ar: 'يوم الجمعة', en: 'Friday Day' }) : d1
  check('addDay(label): التسمية المخصّصة تتجاوز النوع', d2.status === 'ok' && d2.plan.days[1].nameAr === 'يوم الجمعة' && d2.plan.days[1].nameEn === 'Friday Day')

  if (d2.status !== 'ok') throw new Error('setup failed')
  const withEx = addExerciseFromLibrary(d2.plan, 'custom-day-1', 'barbell-bench-press')
  check('addExerciseFromLibrary: افتراضيات المكتبة (reps 6–10 · راحة 120)', withEx.status === 'ok' && withEx.plan.days[0].exercises[0].reps === '6–10' && withEx.plan.days[0].exercises[0].restSec === 120 && withEx.plan.days[0].exercises[0].order === 0)

  const custom = withEx.status === 'ok' ? addExerciseFromLibrary(withEx.plan, 'custom-day-1', 'push-up', { sets: 5, reps: '15–20', restSec: 45 }) : withEx
  check('الوصفة الاختيارية (sets/reps/rest) تتجاوز الافتراضيات', custom.status === 'ok' && custom.plan.days[0].exercises[1].sets === 5 && custom.plan.days[0].exercises[1].reps === '15–20' && custom.plan.days[0].exercises[1].restSec === 45)

  const unknown = addExerciseFromLibrary(d2.plan, 'custom-day-1', 'not-a-real-exercise')
  check('معرّف تمرين خارج المكتبة → رفض exercise-not-in-library', unknown.status === 'rejected' && unknown.errors[0].code === 'exercise-not-in-library' && unknown.errors[0].messageAr.length > 0 && unknown.errors[0].messageEn.length > 0)

  const badDay = addExerciseFromLibrary(d2.plan, 'no-such-day', 'push-up')
  check('يوم غير موجود → رفض day-not-found', badDay.status === 'rejected' && badDay.errors[0].code === 'day-not-found')

  const badSets = addExerciseFromLibrary(d2.plan, 'custom-day-1', 'push-up', { sets: 0 })
  const badReps = addExerciseFromLibrary(d2.plan, 'custom-day-1', 'push-up', { reps: '   ' })
  const badRest = addExerciseFromLibrary(d2.plan, 'custom-day-1', 'push-up', { restSec: 700 })
  check('وصفة غير صالحة (sets=0 / reps فارغة / rest=700) → رفض', badSets.status === 'rejected' && badReps.status === 'rejected' && badRest.status === 'rejected' && badSets.errors[0].code === 'invalid-prescription')

  let seven = createManualPlan()
  for (let i = 0; i < MAX_PLAN_DAYS; i++) {
    const r = addDay(seven, 'push')
    if (r.status === 'ok') seven = r.plan
  }
  const eighth = addDay(seven, 'pull')
  check(`اليوم الثامن فوق الحدّ (${MAX_PLAN_DAYS}) → رفض max-days`, seven.days.length === MAX_PLAN_DAYS && eighth.status === 'rejected' && eighth.errors[0].code === 'max-days')
}

console.log('\n② الترتيب داخل اليوم والنقل بين الأيام')
{
  const plan = buildPlan([{ type: 'push', exercises: PUSH }, { type: 'pull', exercises: PULL }])
  const pushDay = plan.days[0].id
  const pullDay = plan.days[1].id

  const re = reorderExercise(plan, pushDay, 0, 2)
  check('reorder(0→2): بنش ينتقل للنهاية وorder يُعاد ترقيمه', re.status === 'ok' && re.plan.days[0].exercises[2].exerciseId === 'barbell-bench-press' && re.plan.days[0].exercises.every((e, i) => e.order === i))
  const noop = reorderExercise(plan, pushDay, 1, 1)
  check('reorder(1→1): بلا تغيير', noop.status === 'ok' && noop.plan === plan)
  const oob = reorderExercise(plan, pushDay, 0, 9)
  check('reorder خارج النطاق → رفض index-out-of-range', oob.status === 'rejected' && oob.errors[0].code === 'index-out-of-range')

  const rowId = plan.days[0].exercises[0].id
  const moved = moveExerciseToDay(plan, pushDay, rowId, pullDay, 1)
  check('move بين يومين: يهبط في الموضع 1 والمصدر يفقده والترقيم سليم', moved.status === 'ok' && moved.plan.days[0].exercises.length === 2 && moved.plan.days[1].exercises.length === 4 && moved.plan.days[1].exercises[1].exerciseId === 'barbell-bench-press' && planReferenceViolations(moved.plan).length === 0)
  const sameDay = moveExerciseToDay(plan, pushDay, rowId, pushDay)
  check('move لنفس اليوم → رفض same-day', sameDay.status === 'rejected' && sameDay.errors[0].code === 'same-day')
  const noRow = moveExerciseToDay(plan, pushDay, 'ghost-row', pullDay)
  check('صفّ غير موجود → رفض plan-exercise-not-found', noRow.status === 'rejected' && noRow.errors[0].code === 'plan-exercise-not-found')
}

console.log('\n③ النسخ: duplicateDay · copyDayAs · duplicateWeek')
{
  const plan = buildPlan([{ type: 'push', exercises: PUSH }, { type: 'pull', exercises: PULL }, { type: 'legs', exercises: LEGS }])

  const dup = duplicateDay(plan, plan.days[0].id)
  check('duplicateDay: نسخة تُلحق بالنهاية بنفس التمارين ومعرّفات جديدة', dup.status === 'ok' && dup.plan.days.length === 4 && dup.plan.days[3].exercises.map((e) => e.exerciseId).join() === PUSH.join() && dup.plan.days[3].id !== plan.days[0].id && planReferenceViolations(dup.plan).length === 0)

  const copied = copyDayAs(plan, plan.days[0].id, plan.days[2].id)
  check('copyDayAs: محتوى «دفع» يستبدل تمارين الهدف ويبقى معرّفه واسمه', copied.status === 'ok' && copied.plan.days[2].id === plan.days[2].id && copied.plan.days[2].nameAr === plan.days[2].nameAr && copied.plan.days[2].exercises.map((e) => e.exerciseId).join() === PUSH.join() && planReferenceViolations(copied.plan).length === 0)
  check('copyDayAs: المصدر لم يتغيّر', copied.status === 'ok' && copied.plan.days[0].exercises.map((e) => e.exerciseId).join() === PUSH.join())
  const self = copyDayAs(plan, plan.days[0].id, plan.days[0].id)
  check('copyDayAs فوق نفسه → رفض same-day', self.status === 'rejected' && self.errors[0].code === 'same-day')

  const week = duplicateWeek(plan)
  check('duplicateWeek: ٣ أيام → ٦ بنسخ مطابقة ومعرّفات فريدة', week.status === 'ok' && week.plan.days.length === 6 && week.plan.days[3].exercises.map((e) => e.exerciseId).join() === PUSH.join() && week.plan.days[5].exercises.map((e) => e.exerciseId).join() === LEGS.join() && planReferenceViolations(week.plan).length === 0)
  const four = duplicateDay(plan, plan.days[0].id)
  const overflow = four.status === 'ok' ? duplicateWeek(four.plan) : four
  check('duplicateWeek لأربعة أيام (٨ > ٧) → رفض week-duplicate-overflow', overflow.status === 'rejected' && overflow.errors[0].code === 'week-duplicate-overflow')
}

console.log('\n④ الحذف الآمن: سلامة مراجع تقويم P4 + خريطة الاستبدال')
{
  ls.clear()
  const plan = buildPlan([{ type: 'push', exercises: PUSH }, { type: 'pull', exercises: PULL }, { type: 'legs', exercises: LEGS }])
  // جدول أسبوعي: سبت→يوم0، اثنين→يوم1، أربعاء→يوم2 (بداية الأسبوع السبت).
  const saved = setTrainingWeekdays(plan, [6, 1, 3], 6)
  check('تمهيد: جدول P4 محفوظ (سبت/اثنين/أربعاء)', saved.status === 'saved' && loadWeeklySchedule()?.weekdays[1] === 1)
  // تجاوزا «يوم فائت»: أحدهما يشير لليوم المحذوف والآخر ليوم أعلى.
  const withOverrides = loadWeeklySchedule()
  if (withOverrides) {
    saveWeeklySchedule({ ...withOverrides, overrides: { '2026-07-30': 1, '2026-07-31': 2 } })
  }

  const removed = removeDay(plan, plan.days[1].id)
  check('removeDay: يومان باقيان + patch يحمل الفهرس المحذوف', removed.status === 'ok' && removed.plan.days.length === 2 && removed.removedIndex === 1 && planReferenceViolations(removed.plan).length === 0)

  if (removed.status === 'ok') {
    const patched = applyCalendarDayRemoval(removed.calendarPatch)
    const sched = loadWeeklySchedule()
    check('التقويم: الاثنين (كان → اليوم المحذوف) صار راحة ووُسم في التقرير', patched.status === 'updated' && patched.clearedWeekdays.includes(1) && sched?.weekdays[1] === 'rest')
    check('التقويم: الأربعاء انزاح 2→1 (يشير لنفس يوم الأرجل)', sched?.weekdays[3] === 1)
    check('التقويم: التجاوز المشير للمحذوف مُسح والأعلى انزاح 2→1', patched.status === 'updated' && patched.clearedOverrides.includes('2026-07-30') && sched?.overrides['2026-07-31'] === 1 && sched?.overrides['2026-07-30'] === undefined)
    check('التقويم: لا تخصيص يشير لفهرس خارج الخطة الجديدة + الحارس راضٍ', sched !== null && sched.weekdays.every((a) => a === 'rest' || a < removed.plan.days.length) && validateSchedule(sched).length === 0 && sched.daysPerWeek === 2)
    const again = applyCalendarDayRemoval({ removedIndex: 5, remainingDayCount: 2 })
    check('patch لا يمسّ شيئًا (فهرس لا يشير له أحد) → skipped/no-change', again.status === 'skipped' && again.reason === 'no-change')
  }

  ls.clear()
  const noSched = applyCalendarDayRemoval({ removedIndex: 0, remainingDayCount: 1 })
  check('بلا جدول مخزّن → skipped/no-schedule', noSched.status === 'skipped' && noSched.reason === 'no-schedule')

  const rowId = plan.days[0].exercises[1].id
  const rmEx = removeExercise(plan, plan.days[0].id, rowId)
  check('removeExercise: الصفّ يختفي والترقيم يُعاد', rmEx.status === 'ok' && rmEx.plan.days[0].exercises.length === 2 && rmEx.plan.days[0].exercises.every((e, i) => e.order === i) && planReferenceViolations(rmEx.plan).length === 0)
  const ghost = removeExercise(plan, plan.days[0].id, 'ghost')
  check('حذف صفّ غير موجود → رفض', ghost.status === 'rejected' && ghost.errors[0].code === 'plan-exercise-not-found')

  if (rmEx.status === 'ok') {
    const keep = rmEx.plan.days[0].exercises[0].id
    const subs = { [rowId]: 'push-up', [keep]: 'dumbbell-fly', 'ghost-row': 'pull-up' }
    const cleaned = cleanSubstitutionMap(subs, rmEx.plan)
    check('cleanSubstitutionMap: يسقط المحذوف واليتيم ويبقي الحيّ', cleaned[keep] === 'dumbbell-fly' && cleaned[rowId] === undefined && cleaned['ghost-row'] === undefined && Object.keys(cleaned).length === 1)
  }
}

console.log('\n⑤ القوالب المسمّاة: حفظ/سرد/تطبيق/حذف + عزل المالك + السقف')
{
  ls.clear()
  const UID = 'user-A-11111111'
  const plan = buildPlan([{ type: 'push', exercises: PUSH }, { type: 'pull', exercises: PULL }])

  const noName = saveTemplate(UID, { ar: '   ' }, plan)
  check('اسم فارغ → رفض invalid-name', noName.status === 'rejected' && noName.errors[0].code === 'invalid-name')
  const emptyPlan = saveTemplate(UID, { ar: 'فارغ' }, createManualPlan())
  check('خطة بلا تمارين → رفض empty-template', emptyPlan.status === 'rejected' && emptyPlan.errors[0].code === 'empty-template')

  const savedT = saveTemplate(UID, { ar: 'دفع وسحب', en: 'Push & Pull' }, plan)
  check('saveTemplate: tpl-1 باسم ثنائي', savedT.status === 'ok' && savedT.template.id === 'tpl-1' && savedT.template.nameEn === 'Push & Pull')
  check('listTemplates: قالب واحد للمالك', listTemplates(UID).length === 1)
  check('عزل المالك: قوالب A لا تظهر لمالك آخر ولا للضيف', listTemplates('user-B-22222222').length === 0 && listTemplates(null).length === 0)

  const applied = applyTemplate(UID, 'tpl-1')
  check('applyTemplate: الخطة تعود مطابقة (deep copy)', applied.status === 'ok' && JSON.stringify(applied.plan) === JSON.stringify(plan))
  if (applied.status === 'ok') {
    applied.plan.days[0].exercises.pop()
    const reApplied = applyTemplate(UID, 'tpl-1')
    check('تعديل الخطة المطبَّقة لا يمسّ القالب المخزّن', reApplied.status === 'ok' && reApplied.plan.days[0].exercises.length === PUSH.length)
  }
  const unknownT = applyTemplate(UID, 'tpl-99')
  check('قالب غير موجود → رفض template-not-found', unknownT.status === 'rejected' && unknownT.errors[0].code === 'template-not-found')

  for (let i = listTemplates(UID).length; i < MAX_TEMPLATES; i++) saveTemplate(UID, { ar: `قالب ${i + 1}` }, plan)
  const over = saveTemplate(UID, { ar: 'فوق السقف' }, plan)
  check(`السقف ${MAX_TEMPLATES}: الحفظ فوقه → رفض max-templates`, listTemplates(UID).length === MAX_TEMPLATES && over.status === 'rejected' && over.errors[0].code === 'max-templates')

  check('deleteTemplate: يحذف مرّة ويرفض الثانية', deleteTemplate(UID, 'tpl-1') === true && deleteTemplate(UID, 'tpl-1') === false && listTemplates(UID).length === MAX_TEMPLATES - 1)

  // localStorage معادٍ: سجلّ تالف لا يرمي، وقالب مشوّه يُسقط بصمت.
  ls.setItem(PLAN_TEMPLATES_KEY, '{broken json')
  check('سجلّ تالف → قائمة فارغة بلا رمي', listTemplates(UID).length === 0)
  ls.setItem(PLAN_TEMPLATES_KEY, JSON.stringify({ [UID]: [{ id: 'x' }, { id: 'ok', nameAr: 'سليم', plan: { templateId: 'custom', days: [] }, createdAt: '', updatedAt: '' }] }))
  check('قالب مشوّه يُسقط والسليم يبقى', listTemplates(UID).length === 1 && listTemplates(UID)[0].id === 'ok')
}

console.log('\n⑥ المحقّقات: وقت الجلسة (heuristic ٩ دقائق) + الحجم العضلي — تحذيرات لا موانع')
{
  const plan = buildPlan([{ type: 'push', exercises: PUSH.concat(['push-up', 'dumbbell-fly']) }])
  check('estimateSessionMinutes: ٥ تمارين → ٤٥ دقيقة (نفس heuristic النماذج)', estimateSessionMinutes(plan.days[0].exercises.length ? plan.days[0] : plan.days[0]) === 45)
  check('estimateSessionMinutes: يوم فارغ → ٠ · تمرين واحد → ٢٠ (حدّ أدنى)', estimateSessionMinutes({ id: 'x', nameAr: 'س', nameEn: 'X', exercises: [] }) === 0 && estimateSessionMinutes({ ...plan.days[0], exercises: plan.days[0].exercises.slice(0, 1) }) === 20)

  const eight = buildPlan([{ type: 'push', exercises: [...PUSH, ...PULL, 'push-up', 'dumbbell-fly'] }])
  const longWarnings = validatePlan(eight, { targetSessionMinutes: 60 })
  check('٨ تمارين (~٧٠ دقيقة) فوق هدف ٦٠ → تحذير session-too-long', longWarnings.some((w) => w.code === 'session-too-long' && w.messageAr.includes('70') && w.messageEn.includes('70')))

  const withEmpty = addDay(plan, 'legs')
  check('يوم فارغ → تحذير empty-day', withEmpty.status === 'ok' && validatePlan(withEmpty.plan).some((w) => w.code === 'empty-day' && w.subject === withEmpty.plan.days[1].id))

  const tiny = buildPlan([{ type: 'push', exercises: ['push-up'] }])
  check('خطة ضئيلة → تحذير low-muscle-volume لعضلة مستهدفة', validatePlan(tiny, { level: 'intermediate' }).some((w) => w.code === 'low-muscle-volume'))

  let heavy = buildPlan([{ type: 'push', exercises: [] }])
  for (let i = 0; i < 6; i++) {
    const r = addExerciseFromLibrary(heavy, heavy.days[0].id, 'barbell-bench-press', { sets: 4 })
    if (r.status === 'ok') heavy = r.plan
  }
  const heavyWarnings = validatePlan(heavy)
  check('٦ × بنش × ٤ مجموعات → تحذير high-muscle-volume (إفراط)', heavyWarnings.some((w) => w.code === 'high-muscle-volume'))
  check('المحقّق لا يمنع أبدًا: يعيد تحذيرات فقط والخطة تبقى صالحة البنية', Array.isArray(heavyWarnings) && planReferenceViolations(heavy).length === 0)
}

console.log('\n⑦ التصدير/الاستيراد عبر سجلّ النقل: جولة كاملة تحفظ الخطة والقوالب')
{
  ls.clear()
  const UID = 'user-A-11111111'
  setSyncRuntime(UID, false)
  const plan = buildPlan([{ type: 'push', exercises: PUSH }, { type: 'pull', exercises: PULL }])
  saveCustomPlan(UID, plan)
  const tpl = saveTemplate(UID, { ar: 'قالب النقل' }, plan)
  check('تمهيد: خطة مخصّصة + قالب محفوظان', loadCustomPlanRecord(UID)?.plan.days.length === 2 && tpl.status === 'ok')
  check('السجلّ المركزي: qimmah:planTemplates:v1 مسجّل (user/scoped/exported/مُزامَن P12)', DATA_KEYS.some((d) => d.key === PLAN_TEMPLATES_KEY && d.kind === 'user' && d.scoped && d.exported && d.synced))
  check('سجلّ النقل: متجر planTemplates معرّف (ownerMap)', STORE_BY_ID.planTemplates?.kind === 'ownerMap' && STORE_BY_ID.planTemplates.key === PLAN_TEMPLATES_KEY)

  const bundle = buildExportBundle(UID)
  check('الحزمة تحمل customPlan + planTemplates بعدّاد صحيح', 'customPlan' in bundle.stores && 'planTemplates' in bundle.stores && bundle.counts.planTemplates === 1)

  wipeUserData(UID)
  check('بعد المسح: لا خطة ولا قوالب', loadCustomPlanRecord(UID) === undefined && listTemplates(UID).length === 0)

  const result = applyImport(bundle, UID, UID)
  const restoredPlan = loadCustomPlanRecord(UID)?.plan
  const restoredTpls = listTemplates(UID)
  check('الاستيراد يعيد الخطة كاملة (يومان بنفس التمارين والاسم)', result.storesApplied > 0 && restoredPlan?.days.length === 2 && restoredPlan?.nameAr === 'خطتي' && restoredPlan?.days[0].exercises.map((e) => e.exerciseId).join() === PUSH.join())
  check('الاستيراد يعيد القوالب تحت المالك نفسه', restoredTpls.length === 1 && restoredTpls[0].nameAr === 'قالب النقل' && JSON.stringify(restoredTpls[0].plan.days) === JSON.stringify(plan.days))
  check('سلامة المراجع بعد الجولة: كل التمارين في المكتبة', restoredPlan !== undefined && planReferenceViolations(restoredPlan).length === 0)
}

console.log('\n⑧ التوافق الخلفي: سجلّ customPlan قديم (بلا اسم خطة) يبقى صالحًا — لا هجرة مطلوبة')
{
  ls.clear()
  const UID = 'legacy-user'
  // سجلّ بشكل ما قبل P6 تمامًا (لا nameAr/nameEn في الخطة).
  ls.setItem('qimmah:customPlan:v1', JSON.stringify({
    [UID]: {
      plan: { templateId: 'custom', days: [{ id: 'd1', nameAr: 'دفع', nameEn: 'Push', exercises: [] }] },
      source: 'custom',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  }))
  const rec = loadCustomPlanRecord(UID)
  check('السجلّ القديم يُقرأ كما هو (الاسم اختياري — undefined)', rec !== undefined && rec.plan.days.length === 1 && rec.plan.nameAr === undefined)
  const renamed = { ...rec!.plan, nameAr: 'خطة محدّثة' }
  saveCustomPlan(UID, renamed)
  const roundTrip = loadCustomPlanRecord(UID)
  check('إضافة الاسم لاحقًا تدور بلا كسر (حقل اختياري متوافق خلفيًّا)', roundTrip?.plan.nameAr === 'خطة محدّثة' && roundTrip.plan.days.length === 1)
  check('لا مفتاح تقويم أو هجرة كُتبا عرضًا أثناء الإثبات', ls.getItem(WORKOUT_CALENDAR_KEY) === null)
}

console.log(`\n=== النتيجة: ${pass} ✓ / ${fail} ✗ ===`)
if (fail > 0) process.exit(1)
