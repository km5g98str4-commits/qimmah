// نبض الأسبوع — نموذج قراءة نقي لسبعة أيام حقيقية.
//
// ═══ لماذا وحدة مستقلّة ═══
// «نبض أسبوعك» يجيب سؤالًا واحدًا: **كم يومًا من أيام خطتي أنجزتها هذا الأسبوع؟**
// وهو سؤال عن بيانات موجودة فعلًا — الجدول الأسبوعي والجلسات المنتهية — لا عن
// تقدير. فالوحدة تقرأ المصدرين القانونيين ولا تخترع ثالثًا:
//
//   • **أيام الخطة** من `currentWorkout` (نفس مُحدِّد يوم التمرين الذي تسأله
//     شاشتا «اليوم» و«التمرين»)، فلا يظهر يوم تدريب هنا ويوم راحة هناك.
//   • **الإنجاز** من `dayCompletion` (نفس مُصنِّف الاكتمال الذي يميّز `completed`
//     عن `ended_early`)، فلا يُحتسب إنهاءٌ مبكر إنجازًا كاملًا.
//
// ═══ الصدق قبل الطمأنينة (§5) ═══
// `percent` يساوي `null` حين لا يوجد **أي** يوم تدريب مجدول هذا الأسبوع — لأن
// نسبةً بلا مقام ليست معلومة ناقصة بل رقم مخترَع. والقادم الجديد بلا جلسات
// يحصل على `hasData: false` فتعرض الواجهة سطرًا صادقًا بدل مربّعات ملوّنة
// تدّعي تاريخًا لا وجود له.
//
// ⚠️ **عيب في المرجع البصري رُفض عمدًا:** لقطة «مستخدم جديد» في المرجع تقول
// «لا توجد بيانات بعد» وتعرض ثلاثة أيام خضراء في نفس البطاقة. التناقض لا يُنسخ.

import type { Customization } from '@/lib/customization'
import { currentWorkout } from '@/lib/workoutDaySource'
import { dayCompletion } from '@/lib/workoutSessionEngine'
import { getWorkoutSessions } from '@/lib/historyStore'
import { loadWeeklySchedule, type WeekStart } from '@/lib/workoutCalendar'
import { getDayStamp } from '@/lib/today'

export const PULSE_DAYS = 7

/**
 * حالة اليوم الواحد في الشريط. الترتيب دلالي لا زمني:
 *   • `completed` — جلسة مكتملة فعلًا في ذلك التاريخ.
 *   • `partial`   — إنهاء مبكر: تقدّم حقيقي لا يُعلَن اكتمالًا.
 *   • `missed`    — يوم تدريب **مضى** بلا جلسة. لا لوم في نبرته ولا لون أحمر (§6).
 *   • `today`     — يوم تدريب اليوم، لم يُنجَز بعد.
 *   • `planned`   — يوم تدريب قادم.
 *   • `rest`      — راحة بقرار الجدول (لا لغياب خطة).
 *   • `none`      — لا خطة تحسم هذا اليوم أصلًا.
 */
export type PulseDayState = 'completed' | 'partial' | 'missed' | 'today' | 'planned' | 'rest' | 'none'

export interface PulseDay {
  /** ختم اليوم YYYY-MM-DD. */
  stamp: string
  /** فهرس يوم الأسبوع بترقيم JS (0=الأحد … 6=السبت) — الواجهة تشتقّ منه التسمية. */
  weekday: number
  isToday: boolean
  isFuture: boolean
  state: PulseDayState
}

export interface WeeklyPulse {
  days: PulseDay[]
  /** أيام تدريب مجدولة هذا الأسبوع (المقام). */
  plannedCount: number
  /** أيام أُنجزت فعلًا (`completed` وحدها — البدء ليس إنجازًا). */
  completedCount: number
  /** نسبة الإنجاز، أو `null` بلا مقام حقيقي — لا نسبة مخترَعة. */
  percent: number | null
  /** هل يوجد ما يُعرض أصلًا؟ بلا جلسة وبلا جدول لا نبض بعد. */
  hasData: boolean
}

/** أول أيام الأسبوع الجاري لبداية أسبوع معطاة (السبت افتراضًا في السياق السعودي). */
function weekStartDate(now: Date, weekStart: WeekStart): Date {
  // منتصف النهار يحمي من انزياح التوقيت الصيفي عند إضافة/طرح الأيام — نفس
  // الاحتياط المتّبع في `workoutCalendar`.
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0)
  const back = (base.getDay() - weekStart + 7) % 7
  base.setDate(base.getDate() - back)
  return base
}

/**
 * يبني نبض الأسبوع من البيانات الحيّة وحدها.
 *
 * قراءة واحدة للجلسات تُمرَّر إلى `dayCompletion` سبع مرّات — الدالة نقية وتقبل
 * القائمة صراحةً، فلا سبع قراءات للتخزين ولا منطق اكتمال مكرَّر هنا.
 */
export function buildWeeklyPulse(
  userId: string | null,
  customization: Customization,
  now: Date = new Date(),
): WeeklyPulse {
  const sessions = getWorkoutSessions()
  const weekStart: WeekStart = loadWeeklySchedule()?.weekStart ?? 6
  const start = weekStartDate(now, weekStart)
  const todayStamp = getDayStamp(now)

  /**
   * هل لهذا المستخدم تاريخ أصلًا؟ يُقرَّر **قبل** الحلقة لأنه يحكم دلالة «ما تم».
   *
   * يوم تدريب مضى بلا جلسة لا يكون فواتًا إلا لمن كان يتمرّن. القادم الجديد الذي
   * فتح التطبيق اليوم كان يرى شرطةَ «ما تم» على يوم سبقه — علامةَ تقصير عن يوم
   * لم يكن فيه مستخدمًا أصلًا. وهذا لوم بلا مُلام (§6: لا لوم · لا ضغط).
   */
  const hasHistory = sessions.length > 0

  const days: PulseDay[] = []
  let plannedCount = 0
  let completedCount = 0

  for (let i = 0; i < PULSE_DAYS; i += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12, 0, 0, 0)
    const stamp = getDayStamp(date)
    const isToday = stamp === todayStamp
    const isFuture = stamp > todayStamp

    const scheduled = currentWorkout(userId, customization, date)
    const isTraining = scheduled?.type === 'training'
    if (isTraining) plannedCount += 1

    const completion = dayCompletion(stamp, sessions)
    let state: PulseDayState
    if (completion.state === 'complete') {
      state = 'completed'
      completedCount += 1
    } else if (completion.state === 'partial') {
      state = 'partial'
    } else if (!scheduled) {
      state = 'none'
    } else if (!isTraining) {
      state = 'rest'
    } else if (isToday) {
      state = 'today'
    } else if (isFuture || !hasHistory) {
      state = 'planned'
    } else {
      state = 'missed'
    }

    days.push({ stamp, weekday: date.getDay(), isToday, isFuture, state })
  }

  return {
    days,
    plannedCount,
    completedCount,
    // بلا يوم تدريب مجدول لا مقام، وبلا مقام لا نسبة — «—» أصدق من رقم.
    percent: plannedCount > 0 ? Math.round((completedCount / plannedCount) * 100) : null,
    /**
     * **النبض تاريخ لا خطّة.** كان الشرط هنا `sessions.length > 0 || plannedCount > 0`،
     * فاستقبل القادمَ الجديد بـ«أكملت ٠ من ٤ · ٠٪» في يومه الأول: جملة صحيحة
     * حرفيًّا، وهي مع ذلك **لوحة أصفار** — نفس ما أزاله [CTO-72] البند ١، وما
     * يمنعه الأمر صراحةً («do NOT display a fake 75% or fake completed days…
     * show an honest empty state»).
     *
     * الخطة وحدها تكفي لرسم **شكل** الأسبوع (تدريب/راحة/اليوم)، ولا تكفي لادّعاء
     * نبض. فالمربّعات تبقى مرسومة والسطر يقول الحقيقة: لا بيانات بعد.
     */
    hasData: sessions.length > 0,
  }
}
