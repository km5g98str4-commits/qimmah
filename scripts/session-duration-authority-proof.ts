// إثبات سلطة مدّة الجلسة — [SOVEREIGN-PLAN-004].
//
// ═══ العطل ═══
// خمسة تنفيذات حيّة لسؤال واحد: «كم تستغرق هذه الجلسة؟». حالة المؤسس أعطت ثلاثة
// أرقام لنفس الجلسة: «اليوم» ٧٥ · شريحة WorkoutV2 ٥٥ · شاشة التمرين ٤٠.
//   • الـ٧٥ لم تكن تقديرًا بل **تفضيل المستخدم المُعلَن** في الإعداد.
//   • الـ٥٥ heuristic «٩ دقائق × عدد التمارين» لا يقرأ المجموعات ولا الراحة.
//   • الـ٤٠ مقدِّر المجموعات×الراحة، وحده الذي يقرأ الجلسة — وكان بلا بدل انتقال.
//
// ═══ ما يُثبَت هنا ═══
// ١) الصيغة تقرأ ما يتغيّر فعلًا (مجموعات · راحة · عدد · إحماء · انتقال).
// ٢) الـheuristic المهجور **لا يقرأ** شيئًا من ذلك — فرق مقيس لا مدّعًى.
// ٣) السطوح المملوكة تُخرج **الرقم نفسه** لنفس الجلسة.
// ٤) المقارنة مُعلَن/مُقدَّر تُصنَّف ولا تُترك رقمين عاريين.
// ٥) محاكاة التفاف تسقط بفحوص مسمّاة.

import type { PlanDay } from '@/types/workout'
import {
  DEFAULT_WARMUP_MIN,
  EXERCISE_TRANSITION_SEC,
  SESSION_DURATION_TOLERANCE_MIN,
  SET_WORK_SEC,
  compareSessionDuration,
  estimateDurationMin,
  estimateSessionMinutes,
} from '@/lib/workoutStats'
import { estimateSessionMinutes as builderEstimate, validatePlan } from '@/features/customPlan/builder'
import { buildWorkoutV2Model } from '@/lib/workoutV2Model'
import { getDefaultCustomization } from '@/lib/customization'
import { saveWeeklySchedule, suggestedSchedule } from '@/lib/workoutCalendar'

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

function day(n: number, sets: number, restSec: number): PlanDay {
  return {
    id: 'd0',
    nameAr: 'اليوم ١',
    nameEn: 'Day 1',
    exercises: Array.from({ length: n }, (_, i) => ({ id: `d0-x-${i}`, exerciseId: 'barbell-bench-press', sets, reps: '8–12', restSec, startingWeight: '', notes: '', order: i })),
  }
}

/** الـheuristic المهجور — مكتوب هنا لا مستوردًا: مرجع للمقارنة لا مصدرًا حيًّا. */
const legacyNineMin = (n: number) => (n > 0 ? Math.max(20, Math.round((n * 9) / 5) * 5) : 0)

console.log('\n═══ ١) الصيغة تقرأ الجلسة فعلًا ═══')
{
  const base = day(6, 3, 90)
  const moreSets = day(6, 5, 90)
  const moreRest = day(6, 3, 150)
  const fewer = day(3, 3, 90)
  check(`٦ تمارين × ٣ مجموعات × راحة ٩٠ث ⇒ ${estimateSessionMinutes(base)} دقيقة`, estimateSessionMinutes(base) === 45)
  check(`زيادة المجموعات ٣→٥ ترفع التقدير (${estimateSessionMinutes(base)} → ${estimateSessionMinutes(moreSets)})`, estimateSessionMinutes(moreSets) > estimateSessionMinutes(base))
  check(`زيادة الراحة ٩٠→١٥٠ث ترفع التقدير (${estimateSessionMinutes(base)} → ${estimateSessionMinutes(moreRest)})`, estimateSessionMinutes(moreRest) > estimateSessionMinutes(base))
  check(`إنقاص التمارين ٦→٣ يخفض التقدير (${estimateSessionMinutes(base)} → ${estimateSessionMinutes(fewer)})`, estimateSessionMinutes(fewer) < estimateSessionMinutes(base))
  check('يوم بلا تمارين ⇒ ٠ (لا حدّ أدنى مخترع)', estimateSessionMinutes({ ...base, exercises: [] }) === 0 && estimateSessionMinutes(undefined) === 0)
  check(`الإحماء داخل الحساب وقابل للاستبعاد صراحةً (${estimateSessionMinutes(base, { warmupMin: 0 })} بلا إحماء)`, estimateSessionMinutes(base, { warmupMin: 0 }) <= estimateSessionMinutes(base))
  check(`إحماء أطول يرفع التقدير (${estimateSessionMinutes(base, { warmupMin: 12 })} عند ١٢ دقيقة إحماء)`, estimateSessionMinutes(base, { warmupMin: 12 }) > estimateSessionMinutes(base))
  check(`بدل الانتقال (${EXERCISE_TRANSITION_SEC}ث) وزمن المجموعة (${SET_WORK_SEC}ث) والإحماء (${DEFAULT_WARMUP_MIN}د) ثوابت مُصدَّرة لا أرقام مدفونة`, EXERCISE_TRANSITION_SEC > 0 && SET_WORK_SEC > 0 && DEFAULT_WARMUP_MIN >= 0)
  check('التقريب لأقرب خمس — الرقم يُعلن نفسه تقديرًا', [base, moreSets, moreRest, fewer].every((d) => estimateSessionMinutes(d) % 5 === 0))
}

console.log('\n═══ ٢) الـheuristic المهجور أعمى — الفرق مقيس ═══')
{
  const light = day(6, 3, 45)
  const heavy = day(6, 5, 150)
  check(`٩ دقائق/تمرين تعطي الرقم نفسه (${legacyNineMin(6)}) لجلستين مختلفتين تمامًا`, legacyNineMin(6) === legacyNineMin(6))
  check(`المقدِّر المعتمد يفرّق بينهما: ${estimateSessionMinutes(light)} مقابل ${estimateSessionMinutes(heavy)}`, estimateSessionMinutes(heavy) - estimateSessionMinutes(light) >= 20)
  check(`حالة المؤسس: الشريحة كانت ${legacyNineMin(6)} والتقدير الصادق ${estimateSessionMinutes(day(6, 3, 90))}`, legacyNineMin(6) === 55 && estimateSessionMinutes(day(6, 3, 90)) === 45)
}

console.log('\n═══ ٣) سطح واحد لا ثلاثة ═══')
{
  const d = day(6, 3, 90)
  const canonical = estimateSessionMinutes(d)
  check(`باني الخطة اليدوي يُخرج الرقم نفسه (${builderEstimate(d)})`, builderEstimate(d) === canonical)
  check(`الاسم المهجور يُفوّض حرفيًا (${estimateDurationMin(d)})`, estimateDurationMin(d) === canonical)
  // نموذج WorkoutV2 من خطة حقيقية: الشريحة والبرنامج يقرآن نفس المقدِّر.
  const c = getDefaultCustomization()
  saveWeeklySchedule(suggestedSchedule(c.workoutPlan, c.workoutPlan.days.length, 6))
  const model = buildWorkoutV2Model(c, 'ar')
  if (model.available) {
    const dayFromModel: PlanDay = { id: 'x', nameAr: 'x', nameEn: 'x', exercises: model.exercises.map((e, i) => ({ id: e.id, exerciseId: e.exerciseId, sets: e.sets, reps: e.reps, restSec: e.restSec, startingWeight: '', notes: '', order: i })) }
    check(`WorkoutV2: الشريحة والبرنامج = المقدِّر المعتمد (${model.session.durationMin})`, model.session.durationMin === model.program.estimatedDurationMin && model.session.durationMin === estimateSessionMinutes(dayFromModel))
  } else {
    check('WorkoutV2: يوم راحة/غير متاح ⇒ لا رقم يُدّعى', model.session.durationMin === 0)
  }
  // تحذير «أطول من هدفك» يقيس ما يتغيّر فعلًا الآن.
  const long = { templateId: 'custom', days: [day(8, 5, 180)] }
  const short = { templateId: 'custom', days: [day(3, 3, 45)] }
  check('تحذير الجلسة الطويلة يُطلَق للجلسة الثقيلة وحدها (سقف ٦٠)', validatePlan(long, { targetSessionMinutes: 60 }).some((w) => w.code === 'session-too-long') && !validatePlan(short, { targetSessionMinutes: 60 }).some((w) => w.code === 'session-too-long'))
}

console.log('\n═══ ٤) المُعلَن مقابل المُقدَّر — رقمان لا يُتركان عاريين ═══')
{
  check('٧٥ مُعلَنة و٤٥ مُقدَّرة ⇒ shorter بفارق ٣٠', JSON.stringify(compareSessionDuration(75, 45)) === JSON.stringify({ fit: 'shorter', declaredMin: 75, estimatedMin: 45, deltaMin: 30 }))
  check('٤٥ مُعلَنة و٦٠ مُقدَّرة ⇒ longer بفارق ١٥', compareSessionDuration(45, 60).fit === 'longer' && compareSessionDuration(45, 60).deltaMin === 15)
  check(`فرق ${SESSION_DURATION_TOLERANCE_MIN} دقائق أو أقل = match (تقريب لا اختلاف)`, compareSessionDuration(45, 50).fit === 'match' && compareSessionDuration(45, 40).fit === 'match')
  check('بلا مُعلَن (٠) ⇒ no-declared، ولا يُخترع فرق', compareSessionDuration(0, 45).fit === 'no-declared' && compareSessionDuration(0, 45).deltaMin === 0)
  check('بلا تقدير (يوم راحة) ⇒ no-declared كذلك — لا مقارنة بلا طرفين', compareSessionDuration(75, 0).fit === 'no-declared')
}

console.log('\n═══ ٥) محاكاة الالتفاف (counter-proof) ═══')
{
  const d = day(6, 3, 90)
  // (أ) لو عاد أحد السطوح إلى heuristic ٩ دقائق لسقط هذا الفحص بالاسم.
  check(`الرقم المعتمد (${estimateSessionMinutes(d)}) ≠ heuristic ٩ دقائق (${legacyNineMin(6)}) — التطابق مستحيل هنا`, estimateSessionMinutes(d) !== legacyNineMin(6))
  // (ب) قيم فاسدة لا تُسقط الحساب بانفجار ولا تُنتج NaN.
  const junk: PlanDay = { id: 'j', nameAr: 'j', nameEn: 'j', exercises: [{ id: 'j0', exerciseId: 'x', sets: 0, reps: '', restSec: 0, startingWeight: '', notes: '', order: 0 }] }
  const j = estimateSessionMinutes(junk)
  check(`مجموعات ٠ وراحة ٠ ⇒ رقم صالح (${j}) لا NaN ولا انفجار`, Number.isFinite(j) && j >= 5)
  check('مدخل مُعلَن غير رقمي ⇒ no-declared لا NaN', compareSessionDuration(Number.NaN, 45).fit === 'no-declared')
  // (ج) «التقدير يساوي المُعلَن» ليس مرورًا مجانيًا: الطرفان مستقلّان فعلًا.
  check('المقارنة لا تشتقّ أحد الطرفين من الآخر', compareSessionDuration(45, 45).fit === 'match' && compareSessionDuration(45, 90).fit === 'longer')
}

console.log(`\n${failures.length === 0 ? '✅' : '❌'} session-duration-authority: ${passed} نجحت · ${failures.length} فشلت`)
if (failures.length) {
  failures.forEach((f) => console.log(`  - ${f}`))
  process.exit(1)
}
