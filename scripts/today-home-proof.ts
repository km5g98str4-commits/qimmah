// إثبات سلوكي لنبض الأسبوع — [QIMMAH-TODAY-SOVEREIGN-REDESIGN-001].
//
// يقود `buildWeeklyPulse` فوق localStorage مُحاكى ليثبت أنّ البطاقة تقرأ **تاريخًا
// حقيقيًّا** لا شكلًا: الجلسة المكتملة داخل الأسبوع تُحتسب، والتي خارجه لا تُحتسب،
// وبلا جلسات لا نبض ولو كانت الخطة كاملة.

import { getDefaultCustomization, type Customization } from '@/lib/customization'
import { buildWeeklyPulse } from '@/lib/weeklyPulse'

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

/** أحد ثابت (٢٠٢٦-٠٨-١٦) — الأسبوع يبدأ السبت ١٥ وينتهي الجمعة ٢١. */
const NOW = new Date(2026, 7, 16, 12, 0, 0, 0)
const SAT = '2026-08-15'
const SUN = '2026-08-16'
const MON = '2026-08-17'
const TUE = '2026-08-18'
const LAST_WEEK_THU = '2026-08-13'

const ex = (id: string, sets: number) => ({ id: `p-${id}`, exerciseId: id, sets, reps: '8-12', restSec: 90, order: 0 })

function baseCustomization(): Customization {
  const c = getDefaultCustomization()
  return {
    ...c,
    profile: { ...c.profile, name: 'أحمد', goal: 'cut', workoutDuration: 45 },
    targetsMeta: { ...c.targetsMeta, manuallyEdited: true },
    workoutPlan: {
      templateId: 'proof',
      days: [
        { id: 'd1', nameAr: 'الصدر والكتف', nameEn: 'Chest', exercises: [ex('a', 4), ex('b', 3), ex('c', 3)] },
        { id: 'd2', nameAr: 'الظهر', nameEn: 'Back', exercises: [ex('d', 4), ex('e', 4)] },
      ],
    },
  }
}

/** جدول: تدريب سبت/أحد/إثنين، وراحة ما عداها (ترقيم JS: 6/0/1). */
function seedSchedule(trainingWeekdays: number[]): void {
  const weekdays = Array.from({ length: 7 }, (_, i) => (trainingWeekdays.includes(i) ? i % 2 : 'rest'))
  ls.setItem(
    'qimmah:workoutCalendar:v1',
    JSON.stringify({ version: 1, weekdays, split: 'upper_lower', daysPerWeek: trainingWeekdays.length, weekStart: 6, overrides: {}, missedDecisions: {}, source: 'user', updatedAt: `${SUN}T00:00:00.000Z` }),
  )
}

function seedSessions(stamps: string[], status: 'completed' | 'ended_early' = 'completed'): void {
  ls.setItem('qimmah:history:migrated:v1', 'done')
  ls.setItem(
    'qimmah:history:workoutSessions:v1',
    JSON.stringify(
      stamps.map((s, i) => ({
        id: `s${i}`,
        date: s,
        startedAt: `${s}T07:00:00.000Z`,
        finishedAt: status === 'completed' ? `${s}T08:00:00.000Z` : undefined,
        status,
        workoutDayId: 'd1',
        workoutDayName: 'الصدر والكتف',
        exercises: [{ exerciseId: 'a', targetSets: 4, targetReps: '8', targetRestSec: 90, completed: true, sets: [{ completed: true }, { completed: true }] }],
      })),
    ),
  )
}

const dayOf = (pulse: ReturnType<typeof buildWeeklyPulse>, stamp: string) => pulse.days.find((d) => d.stamp === stamp)

console.log('\n① الأسبوع سبعة أيام تبدأ من السبت (weekStart 6)')
{
  ls.clear()
  seedSchedule([6, 0, 1])
  const p = buildWeeklyPulse(null, baseCustomization(), NOW)
  check('سبعة أيام بالضبط', p.days.length === 7)
  check('أول يوم هو السبت ١٥', p.days[0].stamp === SAT)
  check('آخر يوم هو الجمعة ٢١', p.days[6].stamp === '2026-08-21')
  check('اليوم مُعلَّم على الأحد وحده', p.days.filter((d) => d.isToday).length === 1 && dayOf(p, SUN)?.isToday === true)
}

console.log('\n② بلا جلسات إطلاقًا → لا نبض بعد، ولا يوم مكتمل واحد')
{
  ls.clear()
  seedSchedule([6, 0, 1])
  const p = buildWeeklyPulse(null, baseCustomization(), NOW)
  check('`hasData` كاذبة رغم وجود خطة كاملة', p.hasData === false)
  check('لا يوم مكتمل', p.completedCount === 0)
  // الحارس الحقيقي ضدّ عيب المرجع: «لا بيانات» فوق مربّعات خضراء.
  check('لا مربّع بحالة مكتمل/جزئي على الإطلاق', p.days.every((d) => d.state !== 'completed' && d.state !== 'partial'))
  check('أيام الخطة تبقى مرسومة (شكل الأسبوع معلوم)', p.plannedCount === 3)
  // لا لوم بلا مُلام: من لا تاريخ له لم «يفوّت» يوم سبتٍ سبق تحميله للتطبيق.
  check('لا يوم مُعلَّم «ما تم» لمن لا تاريخ له', p.days.every((day) => day.state !== 'missed'))
  check('السبت الماضي يُعرض «مخطط» لا «ما تم»', dayOf(p, SAT)?.state === 'planned')
}

console.log('\n③ الجلسة المكتملة داخل الأسبوع تُحتسب — والتي خارجه لا')
{
  ls.clear()
  seedSchedule([6, 0, 1])
  seedSessions([SAT, LAST_WEEK_THU])
  const p = buildWeeklyPulse(null, baseCustomization(), NOW)
  check('`hasData` صادقة', p.hasData === true)
  check('السبت مكتمل', dayOf(p, SAT)?.state === 'completed')
  check('المكتمل واحد لا اثنان (جلسة الأسبوع الماضي خارج النافذة)', p.completedCount === 1)
  check('النسبة ٣٣٪ = ١ من ٣', p.percent === 33)
}

console.log('\n④ الإنهاء المبكر جزئي لا مكتمل — البدء ليس إنجازًا')
{
  ls.clear()
  seedSchedule([6, 0, 1])
  seedSessions([SAT], 'ended_early')
  const p = buildWeeklyPulse(null, baseCustomization(), NOW)
  check('السبت جزئي', dayOf(p, SAT)?.state === 'partial')
  check('لا يُحتسب في المكتمل', p.completedCount === 0)
  check('النسبة صفر لا ٣٣٪', p.percent === 0)
}

console.log('\n⑤ دلالات الأيام: راحة · اليوم · مخطط · ما تم')
{
  ls.clear()
  seedSchedule([6, 0, 1]) // سبت/أحد/إثنين تدريب
  seedSessions([]) // مصفوفة فارغة تُبقي المفتاح موجودًا بلا جلسة
  seedSessions(['2026-08-01']) // جلسة قديمة: `hasData` صادقة بلا أثر على هذا الأسبوع
  const p = buildWeeklyPulse(null, baseCustomization(), NOW)
  check('السبت (تدريب مضى بلا جلسة) = ما تم', dayOf(p, SAT)?.state === 'missed')
  check('الأحد (تدريب اليوم) = اليوم', dayOf(p, SUN)?.state === 'today')
  check('الإثنين (تدريب قادم) = مخطط', dayOf(p, MON)?.state === 'planned')
  check('الثلاثاء (خارج الجدول) = راحة', dayOf(p, TUE)?.state === 'rest')
  check('«ما تم» و«مخطط» حالتان متمايزتان لا واحدة', dayOf(p, SAT)?.state !== dayOf(p, MON)?.state)
}

console.log('\n⑥ بلا يوم تدريب مجدول → لا مقام فلا نسبة (لا رقم مخترَع)')
{
  ls.clear()
  seedSchedule([]) // كل الأسبوع راحة
  seedSessions([SAT])
  const p = buildWeeklyPulse(null, baseCustomization(), NOW)
  check('لا أيام مخططة', p.plannedCount === 0)
  check('النسبة `null` لا صفر', p.percent === null)
  check('المكتمل يبقى مقيسًا رغم غياب الخطة', p.completedCount === 1)
}

console.log('\n⑦ بلا خطة إطلاقًا → لا ادّعاء تدريب ولا راحة مجدولة')
{
  ls.clear()
  const c = baseCustomization()
  const p = buildWeeklyPulse(null, { ...c, workoutPlan: { templateId: 'empty', days: [] } }, NOW)
  check('كل الأيام «بلا خطة»', p.days.every((d) => d.state === 'none'))
  check('لا أيام مخططة ولا نسبة', p.plannedCount === 0 && p.percent === null)
  check('لا نبض', p.hasData === false)
}

console.log(`\n${fail === 0 ? '✅' : '❌'} نبض الأسبوع: ${pass} فحصًا، ${fail} فشلًا.`)
if (fail > 0) process.exit(1)
