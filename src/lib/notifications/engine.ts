// محرّك الإشعارات الأصلي — الطبقة غير الخالصة الوحيدة (Capacitor + LocalNotifications).
// كل الرياضيات (المتى/ماذا) تأتي جاهزة من schedule.ts؛ هذا الملف فقط ينفّذها على الجهاز.
//
// مبادئ صارمة:
//   • الإذن يُطلب فقط من requestNotificationPermission() — يُستدعى حصرًا من فعل صريح في
//     الإعدادات (زرّ). لا استدعاء تلقائي عند الإقلاع/التنقّل إطلاقًا.
//   • خامل تمامًا على الويب: Capacitor.isNativePlatform()=false → كل دالة تعود فورًا بلا أثر.
//   • إعادة الجدولة حتمية (idempotent): نُلغي كل معرّفات قِمّة المعروفة أولًا ثم نُجدول
//     القائمة الجديدة — لا تراكم، لا يتيمة (orphans) من تفضيل سابق أُطفئ.

import { Capacitor } from '@capacitor/core'
import type { NotificationPrefs, PlannedNotification } from './types'
import { planNotifications, allKinds } from './schedule'
import { readPlanWeek } from './planWeek'
import { readSupplementNames } from './supplementNames'

export type NotificationPermission = 'granted' | 'denied' | 'unsupported'

/** أقصى معرّف نظري لكل نوع — نُلغي هذا المدى كاملًا قبل كل إعادة جدولة (حتمية حقيقية). */
const CANCEL_RANGES: Record<string, [number, number]> = {
  workoutDay: [3100, 3106],
  restDay: [3200, 3206],
  water: [3300, 3311],
  weeklyBrief: [3400, 3400],
  supplements: [3500, 3500],
}

function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

async function getPlugin() {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  return LocalNotifications
}

/** كل المعرّفات الممكنة لمحرّك الإشعارات هذا (لا يمسّ 1001 الخاص بـ src/lib/reminders.ts). */
function allPossibleIds(): number[] {
  const ids: number[] = []
  for (const [start, end] of Object.values(CANCEL_RANGES)) {
    for (let id = start; id <= end; id += 1) ids.push(id)
  }
  return ids
}

/** يطلب إذن الإشعارات — استدعِها فقط من فعل مستخدم صريح (زرّ تفعيل في الإعدادات). */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNative()) return 'unsupported'
  try {
    const LN = await getPlugin()
    const res = await LN.requestPermissions()
    return res.display === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

/** الحالة الحالية للإذن دون طلبه. */
export async function notificationPermissionStatus(): Promise<NotificationPermission> {
  if (!isNative()) return 'unsupported'
  try {
    const LN = await getPlugin()
    const res = await LN.checkPermissions()
    return res.display === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

/** يحوّل weekday بأسلوب JS (0=الأحد) إلى اصطلاح Capacitor/GoTrue (1=الأحد…7=السبت). */
function toCapacitorWeekday(jsWeekday: number): number {
  return jsWeekday + 1
}

async function scheduleAll(items: PlannedNotification[]): Promise<void> {
  const LN = await getPlugin()
  if (items.length === 0) return
  await LN.schedule({
    notifications: items.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      schedule:
        n.weekday === -1
          ? { on: { hour: n.hour, minute: n.minute }, repeats: true, allowWhileIdle: true }
          : { on: { weekday: toCapacitorWeekday(n.weekday), hour: n.hour, minute: n.minute }, repeats: true, allowWhileIdle: true },
    })),
  })
}

/**
 * مصدر الحقيقة الوحيد للجدولة — يُلغي كل شيء ثم يُعيد الجدولة من التفضيلات + الخطة
 * الحقيقية الحالية. خامل على الويب. لا يطلب إذنًا (يفترض أنه مُنح مسبقًا)؛ إن لم يكن
 * ممنوحًا يُلغي فقط (لا يُبقي جدولًا يتيمًا بلا إذن فعلي).
 */
export async function syncNotifications(userId: string, prefs: NotificationPrefs): Promise<void> {
  if (!isNative() || !userId) return
  try {
    const LN = await getPlugin()
    await LN.cancel({ notifications: allPossibleIds().map((id) => ({ id })) })

    if (!prefs.masterEnabled) return
    const perm = await LN.checkPermissions()
    if (perm.display !== 'granted') return

    const planWeek = readPlanWeek()
    const supplementNames = readSupplementNames()
    const items = planNotifications(prefs, planWeek, supplementNames)
    await scheduleAll(items)
  } catch {
    /* فشل الجدولة لا يجوز أن يكسر التطبيق */
  }
}

/** يُلغي كل إشعارات هذا المحرّك بلا شرط — يُستدعى من مسار تسجيل الخروج/حذف الحساب/المسح. */
export async function cancelAllNotifications(): Promise<void> {
  if (!isNative()) return
  try {
    const LN = await getPlugin()
    await LN.cancel({ notifications: allPossibleIds().map((id) => ({ id })) })
  } catch {
    /* تجاهل */
  }
}

export { allKinds }
