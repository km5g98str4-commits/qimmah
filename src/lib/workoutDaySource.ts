// مصدر الحقيقة الوحيد ليوم التمرين — الحالي والتالي.
// [QIM-WEB-FOUNDER-UX-005] الحزمة ٥.
//
// ═══ العطل البنيوي الذي أنشأ هذه الوحدة ═══
// كان لسؤال «أي تمرين اليوم؟» **جوابان مستقلّان**، واختلافهما مسألة وقت لا خطأ
// عابر — ولذلك تعذّر تكراره على المؤسس مرّة وظهر مرّة:
//
//   ١) **مُحدِّد اليوم مختلف.** «اليوم» (`todayV2Model`) يقرأ الجدول الأسبوعي
//      الحقيقي عبر `scheduledDayFor`، بينما تبويب «التمرين» الحيّ (`WorkoutView`)
//      كان يقرأ `todayPlanDay` — تدويرًا أعمى `getDay() % days.length` موسومًا
//      `@deprecated` في مصدره. يتصادفان حين يوافق ترتيب أيام الأسبوع الجدول،
//      ويفترقان في كل تاريخ آخر.
//
//   ٢) **الخطة نفسها مختلفة.** «اليوم» كان يقرأ `customization.workoutPlan`
//      (المولَّدة) دائمًا، و«التمرين» يقرأ الجدول المخصّص إن اعتمده المستخدم.
//      فمن بنى جدولًا مخصّصًا كان يرى خطّتين مختلفتين في شاشتين — وهذا فرق
//      **دائم** لا يحتاج تاريخًا معيّنًا ليظهر.
//
// كلا الفرقين يُحسم هنا وحده. أي شاشة تسأل عن يوم التمرين تسأل هذه الوحدة، ولا
// تكرّر المنطق (أمر المؤسس: «Do NOT copy logic into multiple views»).

import type { WorkoutPlan } from '@/types/workout'
import type { Customization } from '@/lib/customization'
import { loadCustomPlanRecord } from '@/features/customPlan'
import { scheduledDayFor, type ResolveDayOptions, type ScheduledDay } from '@/lib/workoutCalendar'

/** كم يومًا نتقدّم بحثًا عن التمرين التالي قبل أن نُقرّ بعدم وجوده. */
const NEXT_LOOKAHEAD_DAYS = 14

/**
 * الخطة الفعّالة لهذا المالك: المخصّصة إن وُجدت **واعتُمدت**، وإلا المولَّدة.
 *
 * `source === 'custom'` وحده لا يكفي: سجلّ مخصّص بلا أيام خطةٌ فارغة، واعتمادها
 * يعني شاشة تمرين بلا تمارين. فالشرطان معًا كما في `WorkoutView` تمامًا — نُقل
 * المنطق ولم يُعَد اختراعه.
 */
export function activeWorkoutPlan(userId: string | null | undefined, customization: Customization): WorkoutPlan {
  const record = loadCustomPlanRecord(userId)
  const hasCustom = !!record && record.plan.days.length > 0
  return record?.source === 'custom' && hasCustom ? record.plan : customization.workoutPlan
}

/**
 * تمرين **اليوم** لهذا المالك — الجواب الوحيد المعتمد.
 * `undefined` فقط حين لا خطة أصلًا؛ ويوم الراحة يُعاد بصدق لا كتمرين.
 */
export function currentWorkout(
  userId: string | null | undefined,
  customization: Customization,
  date: Date = new Date(),
  opts: ResolveDayOptions = {},
): ScheduledDay | undefined {
  return scheduledDayFor(activeWorkoutPlan(userId, customization), date, opts)
}

/** التمرين التالي مع تاريخه — أول يوم تدريب بعد `from`. */
export interface NextWorkout {
  day: ScheduledDay & { type: 'training' }
  /** كم يومًا بعد `from` (١ = غدًا). */
  inDays: number
  date: Date
}

/**
 * التمرين **التالي** بعد تاريخ معطى.
 *
 * يتقدّم يومًا بيوم عبر نفس المُحدِّد بدل حساب «الفهرس + ١»: الجدول قد يحمل
 * راحات وتجاوزات، فالقفزة الحسابية تُعطي يومًا لا يقع فيه تمرين. والبحث محدود
 * بأسبوعين — بعدها لا تمرين قادم فعلًا (خطة بلا أيام تدريب مجدولة).
 */
export function nextWorkout(
  userId: string | null | undefined,
  customization: Customization,
  from: Date = new Date(),
): NextWorkout | undefined {
  const plan = activeWorkoutPlan(userId, customization)
  if (!plan.days.length) return undefined
  for (let offset = 1; offset <= NEXT_LOOKAHEAD_DAYS; offset += 1) {
    // منتصف النهار يحمي من انزياح التوقيت الصيفي عند إضافة الأيام — نفس
    // الاحتياط المستعمل في `workoutCalendar`.
    const probe = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset, 12, 0, 0, 0)
    // [SOVEREIGN-PLAN-003] مرساة «الجلسة الأولى» لا تتسرّب هنا: شرطها أن يكون
    // التاريخ **هو اليوم**، وكل تحقيق أدناه مستقبليّ (offset ≥ 1). فلو تسرّبت
    // لأعلن الاستشراف «اليوم ١ غدًا» أبدًا ما دام المستخدم لم يتمرّن.
    const resolved = scheduledDayFor(plan, probe)
    if (resolved?.type === 'training') return { day: resolved, inDays: offset, date: probe }
  }
  return undefined
}
