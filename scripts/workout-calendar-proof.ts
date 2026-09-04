// إثبات تقويم التمرين الأسبوعي (P4) — يشغَّل على shim للتخزين عبر
// run-workout-calendar-proof.mjs. يغطي: الاقتراحات 2..6 أيام والتقسيمات المسمّاة،
// يوم الراحة الصادق (API + النموذجين)، تغيّر المنطقة الزمنية، قرار اليوم الفائت
// وتطبيقه (القاعدة D)، بداية الأسبوع سبت/أحد، حارس الأيام المتتالية، والهجرة ×٢.

import type { PlanDay, WorkoutPlan } from '@/types/workout'
import {
  WORKOUT_CALENDAR_KEY,
  applyMissedDecision,
  detectMissedDay,
  ensureCalendarMigrated,
  loadWeeklySchedule,
  longestTrainingRun,
  namedSplitForDays,
  resetCalendarMigrationAttemptForTests,
  saveWeeklySchedule,
  scheduledDayFor,
  setTrainingWeekdays,
  suggestedSchedule,
  suggestedTrainingWeekdays,
  validateSchedule,
  type NamedSplit,
} from '@/lib/workoutCalendar'
import { todayPlanDay } from '@/lib/workoutPlan'
import { buildTodayV2Model } from '@/lib/todayV2Model'
import { buildWorkoutV2Model } from '@/lib/workoutV2Model'
import { getDefaultCustomization, type Customization } from '@/lib/customization'
import { getDayStamp } from '@/lib/today'
import { SYNC_QUEUE_PREFIX, setSyncFeatureEnabledForTests, setSyncRuntime } from '@/lib/syncQueue'

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

/** خطة وهمية بعدد أيام n — يكفي الشكل البنيوي (الاختبار لا يحتاج تمارين حقيقية). */
function makePlan(n: number): WorkoutPlan {
  const days: PlanDay[] = Array.from({ length: n }, (_, i) => ({
    id: `d${i}`,
    nameAr: `اليوم ${i + 1}`,
    nameEn: `Day ${i + 1}`,
    exercises: [{ id: `d${i}-x-0`, exerciseId: 'x', sets: 3, reps: '8–12', restSec: 90, startingWeight: '', notes: '', order: 0 }],
  }))
  return { templateId: 'custom', days }
}

/** تخصيص فيه خطة حقيقية (٣ أيام جسم كامل افتراضية) — كما في إثبات اليوم v2. */
function baseCustomization(extra?: Partial<Customization>): Customization {
  const c = getDefaultCustomization()
  return {
    ...c,
    profile: { ...c.profile, name: 'أحمد', goal: 'cut', workoutDuration: 45 },
    targetsMeta: { ...c.targetsMeta, manuallyEdited: true },
    nutritionPlan: { ...c.nutritionPlan, targetCalories: 2200, targetProtein: 160 },
    ...extra,
  }
}
const seedOnboarded = () => ls.setItem('qimmah:onboarding:profile:v1', '{}')
const seedMigratedFlag = () => ls.setItem('qimmah:history:migrated:v1', 'done')
const stamp = getDayStamp()
const seedSteps = (n: number) => ls.setItem('qimmah:steps:v1', JSON.stringify({ [stamp]: n }))
/** جلسة منتهية **أمس** — تُخرج الملف من حالة «الجلسة الأولى معلّقة». */
const seedPriorFinishedSession = () => {
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const ys = getDayStamp(y)
  ls.setItem('qimmah:history:workoutSessions:v1', JSON.stringify([{ id: `s-${ys}`, date: ys, workoutDayId: 'd0', workoutDayName: 'اليوم ١', startedAt: `${ys}T10:00:00.000Z`, finishedAt: `${ys}T11:00:00.000Z`, status: 'completed', exercises: [] }]))
}

// مراسي تواريخ ثابتة (٢٠٢٦-٠٧): الخميس 23، الأربعاء 22، الجمعة 24، السبت 25.
const THU = new Date(2026, 6, 23, 12)
const noSchedule = () => ls.removeItem(WORKOUT_CALENDAR_KEY)

console.log('\n① التقسيمات المسمّاة فقط + اقتراحات 2..6 أيام (تحترم الحارس)')
{
  const expected: Record<number, NamedSplit> = { 1: 'full_body', 2: 'full_body', 3: 'full_body', 4: 'upper_lower', 5: 'upper_lower_focus', 6: 'push_pull_legs', 7: 'push_pull_legs' }
  const allowed = new Set(['full_body', 'upper_lower', 'upper_lower_focus', 'push_pull_legs'])
  check('كل عدد أيام 1..7 يُسند لتقسيمة مسمّاة (لا اختراع)', [1, 2, 3, 4, 5, 6, 7].every((d) => allowed.has(namedSplitForDays(d)) && namedSplitForDays(d) === expected[d]))
  for (let d = 2; d <= 6; d++) {
    const s = suggestedSchedule(makePlan(d), d)
    const trainCount = s.weekdays.filter((a) => a !== 'rest').length
    const violations = validateSchedule(s)
    check(`اقتراح ${d} أيام/أسبوع: العدد صحيح + بلا مخالفات + تقسيمة ${expected[d]}`, trainCount === d && violations.length === 0 && s.split === expected[d])
  }
}

console.log('\n② بداية الأسبوع: السبت (الافتراضي السعودي) مقابل الأحد')
{
  check('٣ أيام من السبت: سبت/إثنين/أربعاء', JSON.stringify(suggestedTrainingWeekdays(3, 6).slice().sort()) === JSON.stringify([1, 3, 6]))
  check('٣ أيام من الأحد: أحد/ثلاثاء/خميس', JSON.stringify(suggestedTrainingWeekdays(3, 0).slice().sort()) === JSON.stringify([0, 2, 4]))
  // إسناد أيام الخطة يتبع ترتيب الأسبوع: أول يوم تدريب في الأسبوع = يوم الخطة 0.
  const sat = suggestedSchedule(makePlan(3), 3, 6)
  const sun = suggestedSchedule(makePlan(3), 3, 0)
  check('بداية السبت: السبت هو يوم الخطة 0', sat.weekdays[6] === 0 && sat.weekdays[1] === 1 && sat.weekdays[3] === 2)
  check('بداية الأحد: الأحد هو يوم الخطة 0', sun.weekdays[0] === 0 && sun.weekdays[2] === 1 && sun.weekdays[4] === 2)
}

console.log('\n③ حلّ اليوم: تدريب/راحة صادقة + احتياط التدوير القديم')
{
  ls.clear()
  const plan = makePlan(3)
  // بلا جدول مضبوط: الاحتياط القديم (التدوير) — سلوك المستخدمين الحاليين محفوظ.
  // [SOVEREIGN-PLAN-003] الاحتياط صار مرسًى ببداية الأسبوع (السبت=٠) بدل
  // `getDay()` الخام؛ ومرساة «الجلسة الأولى» تسبقه، فنُعطّلها صراحةً هنا لفحصه.
  const legacy = scheduledDayFor(plan, THU, { firstSessionPending: false, now: THU })
  check('بلا جدول: احتياط التدوير مرسًى ببداية الأسبوع (لا راحة مزيّفة)', legacy?.type === 'training' && legacy.source === 'legacy-rotation' && legacy.planDayIndex === (THU.getDay() - 6 + 7) % 7 % 3)
  // القطيعة المقصودة مع `todayPlanDay` المهجور: هو `getDay() % n` حرفيًا — وهو ما
  // كان يستقبل مستخدم الأربعاء على خطة رباعية بـ«اليوم ٤». التطابق **مرفوض** الآن.
  const settledToday = scheduledDayFor(plan, new Date(), { firstSessionPending: false })
  const rawIndex = new Date().getDay() % plan.days.length
  check('الاحتياط لم يعد يطابق todayPlanDay المهجور إلا مصادفةً حسابية', settledToday?.type === 'training' && settledToday.planDayIndex === (new Date().getDay() - 6 + 7) % 7 % plan.days.length && (settledToday.planDayIndex === rawIndex ? todayPlanDay(plan)?.id === settledToday.day.id : true))
  // الجلسة الأولى تسبق الاحتياط: بلا جلسة سابقة يبدأ الجديد من «اليوم ١» دائمًا.
  const firstEver = scheduledDayFor(plan, THU, { now: THU })
  check('مستخدم جديد (بلا جلسة سابقة): الخميس يعطي «اليوم ١» بمصدر first-session', firstEver?.type === 'training' && firstEver.source === 'first-session' && firstEver.planDayIndex === 0)
  // جدول سبت/إثنين/أربعاء:
  const saved = setTrainingWeekdays(plan, [6, 1, 3], 6)
  check('حفظ سبت/إثنين/أربعاء مقبول', saved.status === 'saved')
  const thu = scheduledDayFor(plan, THU)
  check('الخميس راحة — تُعاد بصدق { type: rest }', thu?.type === 'rest' && thu.source === 'schedule')
  const wed = scheduledDayFor(plan, new Date(2026, 6, 22, 12))
  check('الأربعاء = يوم الخطة 2 (بترتيب الأسبوع من السبت)', wed?.type === 'training' && wed.planDayIndex === 2 && wed.day.id === 'd2')
  const sat = scheduledDayFor(plan, new Date(2026, 6, 25, 12))
  check('السبت = يوم الخطة 0', sat?.type === 'training' && sat.planDayIndex === 0)
  check('خطة فارغة → undefined (لا يوم مخترع)', scheduledDayFor({ templateId: 'custom', days: [] }, THU) === undefined)
}

console.log('\n④ النموذجان يعكسان الراحة بصدق (workoutAvailable=false + restDay)')
{
  ls.clear()
  seedMigratedFlag()
  seedOnboarded()
  seedSteps(4000) // سجلّ حقيقي → الحالة normal لا newUser
  // [SOVEREIGN-PLAN-003] هذا القسم يفحص **المستخدم المستقرّ**: جلسة منتهية سابقة
  // تُنهي مرساة «الجلسة الأولى»، وإلا فيوم الراحة الأول لا يُعرَض راحةً بحقّ.
  seedPriorFinishedSession()
  const c = baseCustomization()
  const todayWd = new Date().getDay()
  // جدول لا يتضمّن اليوم — أيام متباعدة (+1/+3/+5) فلا تتابع مخالفًا أيًّا كان اليوم.
  const others = [(todayWd + 1) % 7, (todayWd + 3) % 7, (todayWd + 5) % 7]
  const saved = setTrainingWeekdays(c.workoutPlan, others, 6)
  const today = buildTodayV2Model(c, 'ar')
  check('جدول بلا اليوم الحالي محفوظ', saved.status === 'saved')
  check('todayV2: restDay=true واليوم لا يدفع للتمرين', today.restDay === true && today.hero.destination !== 'workout')
  check('todayV2: عمود التدريب غير جاهز (لا تدوير خفي)', today.pillars[0].state !== 'ready')
  const w = buildWorkoutV2Model(c, 'ar')
  check('workoutV2: available=false + restDay=true + لا تمارين', w.available === false && w.restDay === true && w.exercises.length === 0)
  // يوم تدريب: جدول يتضمّن اليوم.
  const withToday = setTrainingWeekdays(c.workoutPlan, [todayWd, (todayWd + 2) % 7, (todayWd + 4) % 7], 6)
  const t3 = buildTodayV2Model(c, 'ar')
  const w3 = buildWorkoutV2Model(c, 'ar')
  check('يوم تدريب مجدول: النموذجان يقدّمان التمرين', withToday.status === 'saved' && t3.restDay === false && w3.available === true && w3.restDay === false)
}

console.log('\n⑤ تغيّر المنطقة الزمنية — الحلّ يتبع اليوم المحلي للجهاز، حتميًا')
{
  ls.clear()
  const plan = makePlan(3)
  setTrainingWeekdays(plan, [6, 1, 3], 6) // سبت/إثنين/أربعاء — الإثنين تدريب والثلاثاء راحة
  const epoch = Date.UTC(2026, 6, 20, 23, 0) // الإثنين 23:00 UTC = الثلاثاء 11:00 أوكلاند
  const prevTZ = process.env.TZ
  process.env.TZ = 'UTC'
  const utcDate = new Date(epoch)
  const underUTC = scheduledDayFor(plan, utcDate)
  check('تحت UTC: اللحظة إثنين محليًا → تدريب', utcDate.getDay() === 1 && underUTC?.type === 'training')
  process.env.TZ = 'Pacific/Auckland'
  const nzDate = new Date(epoch)
  const underNZ = scheduledDayFor(plan, nzDate)
  check('تحت أوكلاند: اللحظة نفسها ثلاثاء محليًا → راحة (لا انجراف صامت)', nzDate.getDay() === 2 && underNZ?.type === 'rest')
  if (prevTZ === undefined) delete process.env.TZ
  else process.env.TZ = prevTZ
  // حتمية حدود اليوم: منتصف الليل و23:59 من نفس اليوم المحلي يعطيان نفس النتيجة.
  const early = scheduledDayFor(plan, new Date(2026, 6, 20, 0, 0))
  const late = scheduledDayFor(plan, new Date(2026, 6, 20, 23, 59))
  check('نفس اليوم المحلي (00:00 و23:59) → نفس الحلّ', JSON.stringify(early) === JSON.stringify(late))
}

console.log('\n⑥ اليوم الفائت: قرار مطلوب للواجهة — لا تعديل تلقائي (القاعدة D)')
{
  ls.clear()
  const plan = makePlan(3)
  // أيام التدريب داخل نافذة الاكتشاف (٦ أيام قبل الخميس 23): السبت 18، الإثنين 20، الأربعاء 22.
  // «التاريخ الأساسي»: السبت والإثنين منجزان — الأربعاء وحده الفائت قيد الاختبار.
  const doneBefore = ['2026-07-18', '2026-07-20']
  const freshSchedule = () => {
    noSchedule() // يمسح القرارات/التجاوزات السابقة — كل حالة فرعية تبدأ نظيفة
    setTrainingWeekdays(plan, [6, 1, 3], 6) // سبت/إثنين/أربعاء
    return loadWeeklySchedule()
  }
  const schedule = freshSchedule()
  const decision = detectMissedDay(schedule, plan, doneBefore, THU)
  check('يوم فائت مكتشف بقرار كامل الخيارات', decision !== null && decision.type === 'missed' && decision.date === '2026-07-22' && decision.planDayIndex === 2 && JSON.stringify(decision.options) === JSON.stringify(['move_to_next', 'skip', 'reschedule']))
  check('الأقدم فالأحدث: بلا تاريخ أساسي يُكتشف الأحدث أولًا (الأربعاء لا الإثنين)', detectMissedDay(schedule, plan, [], THU)?.date === '2026-07-22')
  check('جلسة منتهية في التاريخ نفسه → لا قرار', detectMissedDay(schedule, plan, [...doneBefore, '2026-07-22'], THU) === null)
  check('الاكتشاف نقي: لا كتابة على الجدول', JSON.stringify(loadWeeklySchedule()) === JSON.stringify(schedule))

  // skip: تسجيل فقط — الجدول لا يتغيّر ولا يُعاد الاكتشاف.
  const skipped = applyMissedDecision(decision!, { choice: 'skip' }, THU)
  check('skip يُسجَّل ويوقف إعادة الاكتشاف', skipped.status === 'applied' && detectMissedDay(loadWeeklySchedule(), plan, doneBefore, THU) === null)
  check('skip لا يضيف تجاوزات', skipped.status === 'applied' && Object.keys(skipped.schedule.overrides).length === 0)

  // move_to_next: التمرين الفائت يُؤدَّى في أقرب يوم تدريب قادم (السبت 25).
  const d2 = detectMissedDay(freshSchedule(), plan, doneBefore, THU)!
  const moved = applyMissedDecision(d2, { choice: 'move_to_next' }, THU)
  const satAfterMove = scheduledDayFor(plan, new Date(2026, 6, 25, 12))
  check('move_to_next: السبت القادم يحمل اليوم الفائت (تجاوز صريح)', moved.status === 'applied' && satAfterMove?.type === 'training' && satAfterMove.source === 'override' && satAfterMove.planDayIndex === 2)

  // reschedule إلى يوم راحة صالح (الجمعة 24): راحة → تدريب باليوم الفائت.
  const d3 = detectMissedDay(freshSchedule(), plan, doneBefore, THU)!
  const resched = applyMissedDecision(d3, { choice: 'reschedule', toDate: '2026-07-24' }, THU)
  const fri = scheduledDayFor(plan, new Date(2026, 6, 24, 12))
  check('reschedule ليوم راحة صالح يُطبَّق', resched.status === 'applied' && fri?.type === 'training' && fri.source === 'override' && fri.planDayIndex === 2)
  // reschedule إلى يوم تدريب أصلًا → مرفوض.
  const d4 = detectMissedDay(freshSchedule(), plan, doneBefore, THU)!
  const clash = applyMissedDecision(d4, { choice: 'reschedule', toDate: '2026-07-25' }, THU)
  check('reschedule فوق يوم تدريب → مرفوض بمخالفة واضحة', clash.status === 'rejected' && clash.violations[0].code === 'target-already-training')
  // بلا جدول: لا مفهوم لليوم الفائت.
  noSchedule()
  check('بلا جدول: لا قرار (الاحتياط القديم بلا أيام فائتة)', detectMissedDay(loadWeeklySchedule(), plan, [], THU) === null)
}

console.log('\n⑦ حارس التتابع: منع ٣+ أيام متتالية حين يخالف قواعد التقسيمة')
{
  ls.clear()
  const plan3 = makePlan(3)
  const run3 = setTrainingWeekdays(plan3, [1, 2, 3], 6) // إثنين/ثلاثاء/أربعاء — جسم كامل
  check('جسم كامل ×٣ متتالية → مرفوض', run3.status === 'rejected' && run3.violations.some((v) => v.code === 'consecutive-training-run'))
  check('نص المخالفة ثنائي اللغة', run3.status === 'rejected' && run3.violations[0].messageAr.length > 0 && run3.violations[0].messageEn.length > 0)
  const wrap = setTrainingWeekdays(plan3, [5, 6, 0], 6) // جمعة/سبت/أحد — امتداد دائري عبر حدود الأسبوع
  check('الامتداد الدائري (جمعة→أحد) يُكشف أيضًا', wrap.status === 'rejected' && wrap.violations.some((v) => v.code === 'consecutive-training-run'))
  const plan4 = makePlan(4)
  const ul4 = setTrainingWeekdays(plan4, [1, 2, 3, 4], 6) // ٤ متتالية علوي/سفلي
  check('علوي/سفلي ×٤ متتالية → مرفوض (الحد ٣)', ul4.status === 'rejected' && ul4.violations.some((v) => v.code === 'consecutive-training-run'))
  const ul4ok = setTrainingWeekdays(plan4, [6, 0, 2, 3], 6)
  check('علوي/سفلي بامتدادات ≤٢ → مقبول', ul4ok.status === 'saved')
  const ppl6 = setTrainingWeekdays(makePlan(6), [0, 1, 2, 3, 4, 5], 6)
  check('دفع/سحب/أرجل ×٦ متتالية → مقبول (مصمّمة للتتابع)', ppl6.status === 'saved')
  const seven = suggestedSchedule(makePlan(7), 7)
  check('٧ أيام بلا راحة → مخالفة no-rest-day (لا حفظ صامت)', validateSchedule(seven).some((v) => v.code === 'no-rest-day') && saveWeeklySchedule(seven).status === 'rejected')
  // reschedule يخلق ٤ متتالية لجسم كامل → مرفوض من الحارس.
  const sunPlan = makePlan(3)
  setTrainingWeekdays(sunPlan, [0, 1, 3], 0) // أحد/إثنين/أربعاء (بداية الأحد)
  const dMissed = detectMissedDay(loadWeeklySchedule(), sunPlan, [], THU)!
  const badResched = applyMissedDecision(dMissed, { choice: 'reschedule', toDate: '2026-07-28' }, THU) // الثلاثاء → أحد..أربعاء ٤ متتالية
  check('reschedule يخلق تتابعًا مخالفًا → مرفوض', badResched.status === 'rejected' && badResched.violations[0].code === 'consecutive-training-run')
  check('longestTrainingRun: كل الأسبوع تدريب = 7', longestTrainingRun([0, 1, 2, 0, 1, 2, 0]) === 7)
}

console.log('\n⑧ الهجرة: خطة قائمة → جدول حقيقي، idempotent ×٢، ولا كتابة بلا خطة')
{
  ls.clear()
  resetCalendarMigrationAttemptForTests()
  // بلا خطة محفوظة: الهجرة لا تكتب شيئًا — الاحتياط القديم يبقى.
  const r0 = ensureCalendarMigrated()
  check('بلا خطة محفوظة: الهجرة تمرّ بلا كتابة', r0.status === 'done' && ls.getItem(WORKOUT_CALENDAR_KEY) === null)
  const legacyStill = scheduledDayFor(makePlan(3), THU)
  check('السلوك القديم محفوظ (تدوير احتياطي)', legacyStill?.type === 'training' && legacyStill.source === 'legacy-rotation')

  // خطة محفوظة (تخصيص فيه trainingDays=4): الهجرة تشتق جدولًا على نمط TRAIN_PATTERN.
  ls.clear()
  ls.setItem('qimmah:customization:v1', JSON.stringify({ profile: { trainingDays: 4 } }))
  resetCalendarMigrationAttemptForTests()
  const r1 = ensureCalendarMigrated()
  const migrated = loadWeeklySchedule()
  check('الهجرة كتبت جدولًا صالحًا موسومًا source=migration', r1.status === 'done' && migrated !== null && migrated.source === 'migration')
  check('٤ أيام تدريب على نمط TRAIN_PATTERN (سبت/أحد/ثلاثاء/أربعاء)', migrated !== null && migrated.weekdays.filter((a) => a !== 'rest').length === 4 && migrated.weekdays[6] !== 'rest' && migrated.weekdays[0] !== 'rest' && migrated.weekdays[2] !== 'rest' && migrated.weekdays[3] !== 'rest')
  check('جدول الهجرة يمرّ على الحارس', migrated !== null && validateSchedule(migrated).length === 0)
  const raw1 = ls.getItem(WORKOUT_CALENDAR_KEY)
  resetCalendarMigrationAttemptForTests()
  const r2 = ensureCalendarMigrated()
  check('التشغيل الثاني skipped والتخزين لم يتغيّر (idempotent)', r2.status === 'skipped' && ls.getItem(WORKOUT_CALENDAR_KEY) === raw1)

  // جدول ضبطه المستخدم قبل الهجرة لا يُداس.
  ls.clear()
  ls.setItem('qimmah:customization:v1', JSON.stringify({ profile: { trainingDays: 3 } }))
  const userSaved = setTrainingWeekdays(makePlan(3), [0, 2, 4], 0)
  const userRaw = ls.getItem(WORKOUT_CALENDAR_KEY)
  resetCalendarMigrationAttemptForTests()
  ensureCalendarMigrated()
  check('جدول المستخدم الموجود لا تدوسه الهجرة', userSaved.status === 'saved' && ls.getItem(WORKOUT_CALENDAR_KEY) === userRaw)
}

console.log('\n⑨ صدق الحفظ: فشل التخزين لا يدّعي النجاح ولا يطلق مزامنة')
{
  ls.clear()
  const plan = makePlan(3)
  const first = setTrainingWeekdays(plan, [0, 2, 4], 0)
  const before = ls.getItem(WORKOUT_CALENDAR_KEY)
  const userId = 'calendar-storage-proof-user'
  ls.setItem('qimmah:dataOwner:v1', JSON.stringify({ owner: userId, stampedAt: new Date().toISOString() }))
  ls.setItem(`qimmah:syncConsent:v1:${userId}`, JSON.stringify({ enabled: true }))
  setSyncFeatureEnabledForTests(true)
  setSyncRuntime(userId, false)
  const queueKey = `${SYNC_QUEUE_PREFIX}${userId}`
  ls.removeItem(queueKey)

  ;(globalThis as typeof globalThis & { __qimmahFailStorageKey?: string }).__qimmahFailStorageKey = WORKOUT_CALENDAR_KEY
  const failed = setTrainingWeekdays(plan, [1, 3, 5], 0)
  const failedMissed = first.status === 'saved'
    ? applyMissedDecision({ type: 'missed', date: '2026-07-22', weekday: 3, planDayIndex: 2, options: ['move_to_next', 'skip', 'reschedule'] }, { choice: 'skip' }, THU)
    : null
  delete (globalThis as typeof globalThis & { __qimmahFailStorageKey?: string }).__qimmahFailStorageKey

  check('كتابة الجدول تحت QuotaExceededError تُعاد failed:quota لا saved', failed.status === 'failed' && failed.reason === 'quota')
  check('قرار اليوم الفائت تحت فشل التخزين لا يُعاد applied', failedMissed?.status === 'failed' && failedMissed.reason === 'quota')
  check('آخر جدول صالح يبقى كما هو بعد فشل الكتابة', ls.getItem(WORKOUT_CALENDAR_KEY) === before)
  check('فشل الكتابة المحلية لا يُدرج عملية مزامنة كاذبة', ls.getItem(queueKey) === null)

  setSyncRuntime(null, false)
  setSyncFeatureEnabledForTests(undefined)
}

console.log(`\n${'─'.repeat(46)}`)
if (fail === 0) {
  console.log(`✅ كل فحوص تقويم التمرين نجحت — ${pass} فحصًا.`)
} else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
