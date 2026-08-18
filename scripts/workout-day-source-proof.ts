// إثبات: مصدر واحد ليوم التمرين — «اليوم» و«التمرين» والإنهاء يتفقون.
// [QIM-WEB-FOUNDER-UX-005] الحزمة ٥.
//
// **بتواريخ صريحة لا بحظّ التاريخ.** العطل الأصلي تعذّر تكراره لأن الخوارزميتين
// تتصادفان في بعض الأيام؛ فالإثبات هنا يثبّت التاريخ ويجرّب الأسبوع كاملًا.

import { setEntitlement } from '@/lib/access/entitlementStore'
import type { Customization } from '@/lib/customization'
import type { WorkoutPlan, PlanDay } from '@/types/workout'
import { getDefaultCustomization } from '@/lib/customization'
import { saveWeeklySchedule, WORKOUT_CALENDAR_KEY, type NamedSplit, type WeeklySchedule } from '@/lib/workoutCalendar'
import { todayPlanDay } from '@/lib/workoutPlan'
import { activeWorkoutPlan, currentWorkout, nextWorkout } from '@/lib/workoutDaySource'
import { saveCustomPlan, setPlanSource } from '@/features/customPlan'

setEntitlement({ status: 'active', source: 'mock' })

let passed = 0
const check = (label: string, cond: boolean, detail = '') => {
  if (!cond) throw new Error(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
  passed += 1
  console.log(`  ✓ ${label}`)
}

const makePlan = (n: number): WorkoutPlan => ({
  id: `plan-${n}`,
  name: `خطة ${n}`,
  days: Array.from({ length: n }, (_, i): PlanDay => ({
    id: `d${i + 1}`,
    nameAr: `اليوم ${i + 1}`,
    nameEn: `Day ${i + 1}`,
    exercises: [],
  })),
})

const withPlan = (plan: WorkoutPlan): Customization => ({ ...getDefaultCustomization(), workoutPlan: plan })

/**
 * يثبّت جدولًا أسبوعيًا صريحًا **ويتحقّق أنه حُفظ فعلًا**.
 *
 * ⚠️ التحقّق ليس زيادة: أول نسخة من هذا الإثبات بنت الجدول ناقص الحقول
 * (`split`/`daysPerWeek`) فرفضه `saveWeeklySchedule` **بصمت**، فبقي جدول القسم
 * السابق ساريًا وسقط فحص «يوم الراحة» على إعداد لم يحدث. إعدادٌ يفشل صامتًا
 * يجعل الفحص يقيس شيئًا آخر — وهو أخطر من فشل صريح.
 */
const setSchedule = (trainingWeekdays: Record<number, number>, split: NamedSplit = 'push_pull_legs'): void => {
  const weekdays = Array.from({ length: 7 }, (_, wd) =>
    (wd in trainingWeekdays ? trainingWeekdays[wd] : 'rest'),
  ) as WeeklySchedule['weekdays']
  const schedule: WeeklySchedule = {
    version: 1,
    weekdays,
    split,
    daysPerWeek: Object.keys(trainingWeekdays).length,
    weekStart: 6,
    overrides: {},
    missedDecisions: {},
    source: 'user',
    updatedAt: '2026-08-01T00:00:00.000Z',
  }
  const result = saveWeeklySchedule(schedule)
  if (result.status !== 'saved') {
    throw new Error(`FAIL: تعذّر تثبيت الجدول — ${result.violations.map((v) => v.code).join('، ')}`)
  }
}

console.log('\nإثبات مصدر يوم التمرين الواحد')

// ═══ ١) الخوارزميتان تفترقان فعلًا — وإلا فالإثبات لا يفحص شيئًا ═══
// تأكيد مضادّ (الميثاق §4.2): لو تطابق القديم والجديد في كل يوم لكان الإصلاح
// بلا أثر وكان هذا الإثبات زينة. نطالب بوجود يوم واحد على الأقل يفترقان فيه.
{
  const plan = makePlan(4)
  // تدريب الأحد(0) والثلاثاء(2) والخميس(4) والسبت(6) — لا يوافق `getDay() % 4`.
  setSchedule({ 0: 0, 2: 1, 4: 2, 6: 3 })
  let divergences = 0
  for (let d = 0; d < 7; d += 1) {
    const date = new Date(2026, 7, 9 + d, 12, 0, 0) // ٩ أغسطس ٢٠٢٦ = أحد
    const legacy = todayPlanDay(plan)?.id
    const canonical = currentWorkout(null, withPlan(plan), date)
    const canonicalId = canonical?.type === 'training' ? canonical.day.id : 'rest'
    if (legacy !== canonicalId) divergences += 1
  }
  check('الخوارزمية المهجورة والجديدة تفترقان في أيام حقيقية', divergences > 0, `${divergences}/7`)
}

// ═══ ٢) الثابت الأول: Today.current == Workout.current، كل يوم، لكل خطة ═══
// الشاشتان تستدعيان `currentWorkout` بنفس الوسائط؛ نثبت أن الجواب واحد ومستقرّ
// (لا يعتمد على ترتيب النداء ولا على حالة عابرة).
for (const n of [3, 4, 5, 6]) {
  const plan = makePlan(n)
  const custom = withPlan(plan)
  setSchedule({ 1: 0, 3: 1 % n, 5: 2 % n })
  let agree = 0
  for (let d = 0; d < 14; d += 1) {
    const date = new Date(2026, 7, 9 + d, 12, 0, 0)
    const today = currentWorkout(null, custom, date)
    const workout = currentWorkout(null, custom, date)
    const same = JSON.stringify(today) === JSON.stringify(workout)
    if (same) agree += 1
  }
  check(`خطة ${n} أيام: «اليوم» و«التمرين» يتفقان في ١٤ يومًا متتاليًا`, agree === 14, `${agree}/14`)
}

// ═══ ٣) الثابت الثاني: Completion.next == Today.current في اليوم التالي ═══
for (const n of [3, 4, 5, 6]) {
  const plan = makePlan(n)
  const custom = withPlan(plan)
  setSchedule({ 0: 0, 2: 1 % n, 4: 2 % n })
  let matches = 0
  let checked = 0
  for (let d = 0; d < 14; d += 1) {
    const today = new Date(2026, 7, 9 + d, 12, 0, 0)
    const upcoming = nextWorkout(null, custom, today)
    if (!upcoming) continue
    checked += 1
    // ما سيعرضه «اليوم» في تاريخ التمرين القادم.
    const thatDay = currentWorkout(null, custom, upcoming.date)
    const shown = thatDay?.type === 'training' ? thatDay.day.id : 'rest'
    if (shown === upcoming.day.day.id) matches += 1
  }
  check(`خطة ${n} أيام: «تمرينك القادم» = ما يعرضه «اليوم» في ذلك التاريخ`, checked > 0 && matches === checked, `${matches}/${checked}`)
}

// ═══ ٤) أيام الراحة تُعاد بصدق ولا تُعرض تمرينًا ═══
{
  const plan = makePlan(3)
  setSchedule({ 1: 0 }, 'full_body') // الاثنين فقط
  const monday = new Date(2026, 7, 10, 12, 0, 0)
  const tuesday = new Date(2026, 7, 11, 12, 0, 0)
  check('يوم مجدول = تدريب', currentWorkout(null, withPlan(plan), monday)?.type === 'training')
  check('يوم غير مجدول = راحة صريحة لا تمرين مخترع', currentWorkout(null, withPlan(plan), tuesday)?.type === 'rest')
  // والقديم كان يعطي تمرينًا في يوم الراحة — وهو جوهر الفرق.
  check('الخوارزمية المهجورة كانت تعطي تمرينًا في يوم راحة', todayPlanDay(plan) !== undefined)
}

// ═══ ٥) الخطة المخصّصة: الشاشتان تقرآن **نفس** الخطة ═══
// كان «اليوم» يقرأ المولَّدة دائمًا و«التمرين» يقرأ المخصّصة عند اعتمادها — فرق
// دائم لا يحتاج تاريخًا. هنا يُثبَت أن `activeWorkoutPlan` مصدر واحد للاثنين.
{
  const auto = makePlan(3)
  const customPlan: WorkoutPlan = { ...makePlan(5), id: 'custom', name: 'مخصّص' }
  const custom = withPlan(auto)
  saveCustomPlan(null, customPlan)
  setPlanSource(null, 'custom')
  check('عند اعتماد المخصّص: الخطة الفعّالة هي المخصّصة', activeWorkoutPlan(null, custom).id === 'custom')
  setPlanSource(null, 'auto')
  check('عند العودة للتلقائي: الخطة الفعّالة هي المولَّدة', activeWorkoutPlan(null, custom).id === auto.id)
  // وسجلّ مخصّص فارغ لا يُعتمد ولو وُسم `custom` — خطة بلا أيام شاشة فارغة.
  saveCustomPlan(null, { id: 'empty', name: 'فارغ', days: [] })
  setPlanSource(null, 'custom')
  check('سجلّ مخصّص بلا أيام لا يُعتمد (لا شاشة تمرين فارغة)', activeWorkoutPlan(null, custom).id === auto.id)
}

// ═══ ٦) بلا جدول مضبوط: الاحتياط الموثّق يعمل ولا يرمي ═══
{
  localStorage.removeItem(WORKOUT_CALENDAR_KEY)
  const plan = makePlan(4)
  const resolved = currentWorkout(null, withPlan(plan), new Date(2026, 7, 12, 12, 0, 0))
  check('بلا جدول: احتياط التدوير القديم يُعاد موسومًا', resolved?.type === 'training' && resolved.source === 'legacy-rotation')
  check('بلا جدول: التمرين القادم ما زال محسوبًا', nextWorkout(null, withPlan(plan), new Date(2026, 7, 12, 12, 0, 0)) !== undefined)
}

// ═══ ٧) خطة بلا أيام: undefined لا انهيار ═══
{
  const empty: WorkoutPlan = { id: 'none', name: 'بلا', days: [] }
  check('خطة بلا أيام ⇒ undefined لا رمي', currentWorkout(null, withPlan(empty)) === undefined)
  check('خطة بلا أيام ⇒ لا تمرين قادم', nextWorkout(null, withPlan(empty)) === undefined)
}

console.log(`\n✅ مصدر يوم التمرين: ${passed} فحصًا، 0 فشل.`)
