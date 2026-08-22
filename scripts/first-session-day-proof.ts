// إثبات ترتيب اليوم الأول — [SOVEREIGN-PLAN-003].
//
// ═══ العطلان ═══
// (أ) **الاحتياط**: `legacyRotation` كان `date.getDay() % plan.days.length` —
//     فهرسة JS الخام على خطة لا تعرف الأحد. أربعاء + خطة ٤ أيام ⇒ الفهرس ٣،
//     أي أن أول ما يراه المستخدم الجديد هو **«اليوم ٤»**.
// (ب) **الفرع السليم**: الجدول يربط يوم الخطة ٠ بالسبت (بداية الأسبوع). فمن
//     أنهى التخصيص إثنين/خميس/جمعة كان يُستقبَل بـ«راحة» قبل أن يتمرّن مرّة.
//
// ═══ القاعدة المُثبَتة ═══
// الجلسة الأولى تبدأ من **أول يوم في الخطة**، أيًّا كان يوم الأسبوع. وبعد أن
// تُنجَز، يستأنف الجدول الأسبوعي عمله كاملًا بلا تغيير عمّا كان.

import type { PlanDay, WorkoutPlan } from '@/types/workout'
import {
  WORKOUT_CALENDAR_KEY,
  isFirstSessionPending,
  scheduledDayFor,
  setTrainingWeekdays,
  suggestedSchedule,
  saveWeeklySchedule,
} from '@/lib/workoutCalendar'
import { HISTORY_KEYS } from '@/lib/historyStore'
import { getDayStamp } from '@/lib/today'

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

const ls = globalThis.localStorage

function makePlan(n: number): WorkoutPlan {
  const days: PlanDay[] = Array.from({ length: n }, (_, i) => ({
    id: `d${i}`,
    nameAr: `اليوم ${i + 1}`,
    nameEn: `Day ${i + 1}`,
    exercises: [{ id: `d${i}-x-0`, exerciseId: 'x', sets: 3, reps: '8–12', restSec: 90, startingWeight: '', notes: '', order: 0 }],
  }))
  return { templateId: 'custom', days }
}

const WEEKDAY_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
// أسبوع كامل مرساةً: ٢٠٢٦-٠٨-١٦ أحد … ٢٠٢٦-٠٨-٢٢ سبت.
const WEEK = Array.from({ length: 7 }, (_, i) => new Date(2026, 7, 16 + i, 12))

// سجلّ التاريخ يهاجر مرّة واحدة عند أول قراءة؛ نختمه «تمّت» كي تُقرأ البذرة كما هي.
const seedHistoryMigrated = () => ls.setItem('qimmah:history:migrated:v1', 'done')

/** يزرع جلسة منتهية بتاريخ معطى — «مستخدم مستقرّ» بدل مستخدم جديد. */
function seedFinishedSession(stamp: string): void {
  seedHistoryMigrated()
  ls.setItem(
    HISTORY_KEYS.workoutSessions,
    JSON.stringify([{ id: `s-${stamp}`, date: stamp, workoutDayId: 'd0', workoutDayName: 'اليوم ١', startedAt: `${stamp}T10:00:00.000Z`, finishedAt: `${stamp}T11:00:00.000Z`, status: 'completed', exercises: [] }]),
  )
}
function clearSessions(): void {
  ls.removeItem(HISTORY_KEYS.workoutSessions)
}
function dayBefore(d: Date): string {
  return getDayStamp(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 12))
}

console.log('\n═══ ١) العطل الأصلي بالحرف: أربعاء + خطة ٤ أيام ═══')
{
  ls.clear()
  const plan = makePlan(4)
  const WED = WEEK[3]
  check('التاريخ المرساة أربعاء فعلًا', WED.getDay() === 3)
  // التدوير الخام القديم (محسوبًا هنا لا مستوردًا) — ما كان يراه المستخدم.
  check('الصيغة القديمة كانت تعطي الفهرس ٣ = «اليوم ٤»', WED.getDay() % plan.days.length === 3)
  const fresh = scheduledDayFor(plan, WED, { firstSessionPending: true, now: WED })
  check('الآن: مستخدم جديد يوم أربعاء يبدأ من «اليوم ١»', fresh?.type === 'training' && fresh.planDayIndex === 0 && fresh.source === 'first-session')
  // ومع ذلك: الاحتياط نفسه (لمستخدم مستقرّ بلا جدول) لم يعد يعطي «اليوم ٤».
  const settled = scheduledDayFor(plan, WED, { firstSessionPending: false, now: WED })
  check('الاحتياط مرسًى ببداية الأسبوع: الأربعاء = الفهرس ٠ لا ٣', settled?.type === 'training' && settled.source === 'legacy-rotation' && settled.planDayIndex === 0)
  const sat = scheduledDayFor(plan, WEEK[6], { firstSessionPending: false, now: WEEK[6] })
  check('الاحتياط: السبت (بداية الأسبوع) = الفهرس ٠', sat?.type === 'training' && sat.planDayIndex === 0)
  const mon = scheduledDayFor(plan, WEEK[1], { firstSessionPending: false, now: WEEK[1] })
  check('الاحتياط: الإثنين = الفهرس ٢ (سبت٠ أحد١ إثنين٢)', mon?.type === 'training' && mon.planDayIndex === 2)
}

console.log('\n═══ ٢) المصفوفة الكاملة: ٧ أيام أسبوع × ٣..٦ أيام خطة ═══')
{
  let freshOk = 0
  let restGreetings = 0
  const badFresh: string[] = []
  for (let days = 3; days <= 6; days++) {
    const plan = makePlan(days)
    for (const date of WEEK) {
      ls.clear()
      // جدول حقيقي مضبوط (الحالة السليمة) — لا احتياط.
      saveWeeklySchedule(suggestedSchedule(plan, days, 6))
      // لولا المرساة: ماذا كان المستخدم الجديد سيرى؟
      const without = scheduledDayFor(plan, date, { firstSessionPending: false, now: date })
      if (without?.type === 'rest') restGreetings++
      const withAnchor = scheduledDayFor(plan, date, { firstSessionPending: true, now: date })
      if (withAnchor?.type === 'training' && withAnchor.planDayIndex === 0 && withAnchor.day.id === 'd0' && withAnchor.source === 'first-session') freshOk++
      else badFresh.push(`${WEEKDAY_AR[date.getDay()]}/${days}د`)
    }
  }
  check(`الجلسة الأولى = «اليوم ١» في ٢٨/٢٨ تركيبة (فعليًا ${freshOk})`, freshOk === 28)
  if (badFresh.length) console.log('    ' + badFresh.join(' · '))
  check(`المرور مستحقّ: بلا المرساة كانت ${restGreetings} تركيبة تستقبل الجديد بـ«راحة»`, restGreetings > 0)
}

console.log('\n═══ ٣) المستخدم المستقرّ: جدوله لم يتغيّر بحرف ═══')
{
  const changed: string[] = []
  let compared = 0
  for (let days = 3; days <= 6; days++) {
    const plan = makePlan(days)
    for (const date of WEEK) {
      ls.clear()
      saveWeeklySchedule(suggestedSchedule(plan, days, 6))
      // المرجع: الحلّ بلا أي مرساة (السلوك قبل هذه الموجة، فرع الجدول لم يُمَس).
      const baseline = scheduledDayFor(plan, date, { firstSessionPending: false, now: date })
      // الواقع: جلسة منتهية أمس ⇒ المرساة لا تنطبق، والقراءة من التخزين لا بالحقن.
      seedFinishedSession(dayBefore(date))
      const actual = scheduledDayFor(plan, date, { now: date })
      compared++
      if (JSON.stringify(baseline) !== JSON.stringify(actual)) changed.push(`${WEEKDAY_AR[date.getDay()]}/${days}د`)
    }
  }
  check(`جدول المستقرّ مطابق بايت ببايت في ${compared}/٢٨ تركيبة`, compared === 28 && changed.length === 0)
  if (changed.length) console.log('    ' + changed.join(' · '))
}

console.log('\n═══ ٤) المرساة تعمل مرّة واحدة — والجدول يستأنف بعدها ═══')
{
  const plan = makePlan(4)
  const MON = WEEK[1]
  ls.clear()
  setTrainingWeekdays(plan, [6, 0, 2, 3], 6) // سبت/أحد/ثلاثاء/أربعاء — الإثنين راحة
  check('الإثنين راحة في الجدول المضبوط', scheduledDayFor(plan, MON, { firstSessionPending: false, now: MON })?.type === 'rest')
  clearSessions()
  check('قبل أي جلسة: الإثنين يعطي «اليوم ١» لا راحة', scheduledDayFor(plan, MON, { now: MON })?.planDayIndex === 0)
  // أنهى جلسته اليوم نفسه: البطاقة **لا** تنقلب إلى راحة أمام عينيه.
  seedFinishedSession(getDayStamp(MON))
  const sameDay = scheduledDayFor(plan, MON, { now: MON })
  check('بعد إنهائها في اليوم نفسه: البطاقة تبقى «اليوم ١» (لا تنكر ما فعله)', sameDay?.type === 'training' && sameDay.planDayIndex === 0)
  // في اليوم التالي (ثلاثاء) الجدول يستأنف: الثلاثاء = يوم الخطة ٢.
  const TUE = WEEK[2]
  const next = scheduledDayFor(plan, TUE, { now: TUE })
  check('اليوم التالي: الجدول الأسبوعي يستأنف (الثلاثاء = الفهرس ٢، المصدر schedule)', next?.type === 'training' && next.source === 'schedule' && next.planDayIndex === 2)
}

console.log('\n═══ ٥) isFirstSessionPending — الحدّ بالحرف ═══')
{
  const TODAY = new Date()
  ls.clear()
  check('بلا جلسات إطلاقًا ⇒ معلّقة', isFirstSessionPending(TODAY) === true)
  seedFinishedSession(getDayStamp(TODAY))
  check('جلسة **اليوم** لا تُنهي التعليق (لئلّا تنقلب البطاقة أمام المستخدم)', isFirstSessionPending(TODAY) === true)
  seedFinishedSession(dayBefore(TODAY))
  check('جلسة **أمس** تُنهيه', isFirstSessionPending(TODAY) === false)
  // جلسة بلا finishedAt = بدأ ولم يُنهِ — لا تُحتسب.
  ls.setItem(HISTORY_KEYS.workoutSessions, JSON.stringify([{ id: 's1', date: dayBefore(TODAY), workoutDayId: 'd0', workoutDayName: 'x', startedAt: '2026-01-01T00:00:00.000Z', status: 'in_progress', exercises: [] }]))
  check('جلسة غير منتهية أمس لا تُحتسب — التعليق باقٍ', isFirstSessionPending(TODAY) === true)
}

console.log('\n═══ ٦) محاكاة الالتفاف (counter-proof) ═══')
{
  const plan = makePlan(4)
  const WED = WEEK[3]
  ls.clear()
  saveWeeklySchedule(suggestedSchedule(plan, 4, 6))
  // (أ) المرساة **مقيّدة باليوم**: تاريخ مستقبلي لا يأخذها ولو كانت الجلسة معلّقة.
  const future = new Date(2026, 7, 26, 12) // بعد أسبوع
  const probed = scheduledDayFor(plan, future, { firstSessionPending: true, now: WED })
  check('تاريخ مستقبلي + جلسة معلّقة ⇒ المرساة لا تنطبق (لا «اليوم ١» أبدًا في الاستشراف)', probed?.source !== 'first-session')
  // (ب) لو كانت المرساة تُرجع الفهرس من يوم الأسبوع لسقط هذا: كل أيام الأسبوع فهرس ٠.
  const indices = new Set(WEEK.map((d) => scheduledDayFor(plan, d, { firstSessionPending: true, now: d })?.planDayIndex))
  check('المرساة لا تقرأ يوم الأسبوع إطلاقًا — الفهرس ٠ في السبعة كلها', indices.size === 1 && indices.has(0))
  // (ج) خطة فارغة تبقى undefined — المرساة لا تخترع يومًا.
  check('خطة بلا أيام ⇒ undefined حتى مع المرساة (لا يوم مخترع)', scheduledDayFor({ templateId: 'custom', days: [] }, WED, { firstSessionPending: true, now: WED }) === undefined)
  // (د) العودة إلى الصيغة القديمة تُسقط الفحص بفحص مسمّى لا بانفجار.
  const legacyRaw = WED.getDay() % plan.days.length
  const settled = scheduledDayFor(plan, WED, { firstSessionPending: false, now: WED })
  ls.removeItem(WORKOUT_CALENDAR_KEY)
  const settledNoSchedule = scheduledDayFor(plan, WED, { firstSessionPending: false, now: WED })
  check(`الصيغة القديمة (${legacyRaw}) ≠ الاحتياط الجديد (${settledNoSchedule?.type === 'training' ? settledNoSchedule.planDayIndex : 'راحة'}) — الفرق مقيس لا مدّعًى`, settledNoSchedule?.type === 'training' && settledNoSchedule.planDayIndex !== legacyRaw)
  check('وجود الجدول يفوز على الاحتياط دائمًا', settled?.source === 'schedule' || settled?.type === 'rest')
}

console.log(`\n${failures.length === 0 ? '✅' : '❌'} first-session-day: ${passed} نجحت · ${failures.length} فشلت`)
if (failures.length) {
  failures.forEach((f) => console.log(`  - ${f}`))
  process.exit(1)
}
