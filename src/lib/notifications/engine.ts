import { Capacitor } from '@capacitor/core'
import type { Lang } from '@/lib/appPreferences'
import { getLastUser } from '@/lib/accountScope'
import { trackLocal } from '@/lib/tracking'
import { loadNotificationPrefs } from './prefs'
import { readPlanWeek } from './planWeek'
import { allNotificationIds, planNotifications } from './schedule'
import type { NotificationPermission, NotificationSyncState, PlannedNotification } from './types'

interface DesiredRuntime {
  ownerId: string | null
  recoveryActive: boolean
  lang: Lang
  generation: number
}

let runtime: DesiredRuntime = { ownerId: null, recoveryActive: false, lang: 'ar', generation: 0 }
let queue: Promise<NotificationSyncState> = Promise.resolve('inactive')

export function notificationsSupported(): boolean {
  return Capacitor.getPlatform() === 'ios'
}

async function plugin() {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  return LocalNotifications
}

/**
 * يُسقط كل إشعارات قِمّة المعروفة — **المجدولة والمسلَّمة معًا**. [CTO-72] البند ٦.
 *
 * ═══ الفجوة التي أُغلقت هنا ═══
 * `cancel()` تُلغي **المعلَّق** (ما لم يرنّ بعد) ولا تمسّ ما **رنّ فعلًا** وجلس في
 * مركز الإشعارات وعلى شاشة القفل. فكان هذا المسار مفتوحًا:
 *   ٦:٠٠ يرنّ تذكير التمرين، ومتنُه يحمل **عنوان يوم خطة المستخدم** («دفع»)
 *   وتذكير المكمّلات يُعلن أن صاحب الجهاز يتابع أدوية
 *   ← المستخدم يضغط «إعادة ضبط البيانات» أو «حذف حسابي نهائيًا»
 *   ← `resetQimmah` يمسح التخزين ويُلغي **المعلَّق** فقط
 *   ← **بقايا حساب مُلغى تبقى مقروءة على شاشة القفل بلا فتح التطبيق.**
 *
 * ⚠️ **تصحيح لتوصيف سابق:** النصّ الحيّ اليوم **لا يذكر أسماء** المكمّلات —
 * `data/notificationCopy.ts` عامّ عمدًا («تذكير عام — التزم بتعليمات مختصك»)
 * ويحرسه تأكيد قائم. لكن `lib/notifications/copy.ts` **يتيم بلا مستورد** ويحمل
 * `supplementsCopy` التي تبني «موعد: كرياتين، أوميغا ٣…» من بيانات المستخدم —
 * سلاحٌ موضوع لا مطلَق. توصيله يومًا يضع الأسماء على شاشة القفل، فيحرسه الآن
 * تأكيد يحمرّ عند أول استيراد له (§2-٦: اليتيم يُعلَن، والخطر منه يُحرَس).
 *
 * والعلاج عند جذره لا عند `resetQimmah`: كل مصالحة تمرّ من هنا — تبديل الحساب،
 * تسجيل الخروج، الاستعادة، إعادة الضبط، الحذف — فسدُّها هنا يسدّها للجميع دفعةً
 * واحدة، بدل خمسة نداءات موزّعة يُنسى أحدها.
 *
 * **الحذف مُصفّى بمعرّفاتنا** (`allNotificationIds`) لا `removeAllDelivered...`:
 * المدى المعروف ملك قِمّة وحدها، والتصفية تُبقي الفعل موصوفًا بدل «امسح كل شيء».
 *
 * ولا `catch` هنا: فشل التنظيف يصعد إلى `reconcileNotificationSchedule` فيعيد
 * `'error'` — والحالة **ليست نظيفة فعلًا**، فادّعاء غير ذلك كذبٌ صامت (§2-٣).
 */
async function cancelKnown(): Promise<void> {
  if (!notificationsSupported()) return
  const localNotifications = await plugin()
  const ids = allNotificationIds()
  await localNotifications.cancel({ notifications: ids.map((id) => ({ id })) })
  const delivered = await localNotifications.getDeliveredNotifications()
  const ours = (delivered?.notifications ?? []).filter((item) => ids.includes(Number(item.id)))
  if (ours.length > 0) await localNotifications.removeDeliveredNotifications({ notifications: ours })
}

async function schedule(items: PlannedNotification[]): Promise<void> {
  if (!items.length) return
  const localNotifications = await plugin()
  await localNotifications.schedule({
    notifications: items.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      schedule: item.weekday === -1
        ? { on: { hour: item.hour, minute: item.minute }, repeats: true, allowWhileIdle: true }
        : { on: { weekday: item.weekday + 1, hour: item.hour, minute: item.minute }, repeats: true, allowWhileIdle: true },
    })),
  })
}

/**
 * [CTO-68] الحدث ٦ — قرار إذن الإشعارات، **عند جذره**: نداء الطلب نفسه.
 * كل مدخل في الواجهة يطلب الإذن يمرّ من هنا، فلا يُفلت قرارٌ لأن سطحًا جديدًا نسي
 * أن يسجّل. و«غير مدعوم» تُسجَّل كذلك — لتمييز الرفض الحقيقي من غياب القناة أصلًا.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  const decided = (decision: NotificationPermission): NotificationPermission => {
    trackLocal('notification_permission_decided', { decision })
    return decision
  }
  if (!notificationsSupported()) return decided('unsupported')
  try {
    const result = await (await plugin()).requestPermissions()
    return decided(result.display === 'granted' ? 'granted' : 'denied')
  } catch {
    return decided('denied')
  }
}

export async function notificationPermissionStatus(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'unsupported'
  try {
    const result = await (await plugin()).checkPermissions()
    return result.display === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

/**
 * Serial owner/recovery reconciliation. Every generation cancels all Qimmah IDs
 * before scheduling the latest owner's allowlisted plan, so an older async call
 * can never re-appear after an account switch.
 */
export function reconcileNotificationSchedule(ownerId: string | null, recoveryActive: boolean, lang: Lang): Promise<NotificationSyncState> {
  const desired: DesiredRuntime = { ownerId, recoveryActive, lang, generation: runtime.generation + 1 }
  runtime = desired
  queue = queue.catch(() => 'error').then(async () => {
    if (!notificationsSupported()) return 'unsupported'
    try {
      await cancelKnown()
      if (desired.generation !== runtime.generation) return 'inactive'
      if (!desired.ownerId || desired.recoveryActive) return 'inactive'
      if (getLastUser() !== desired.ownerId) return 'inactive'
      const prefs = loadNotificationPrefs(desired.ownerId)
      if (!prefs.masterEnabled) return 'inactive'
      const permission = await notificationPermissionStatus()
      if (permission !== 'granted') return 'denied'
      const planned = planNotifications(prefs, readPlanWeek(), desired.lang)
      if (desired.generation !== runtime.generation || runtime.ownerId !== desired.ownerId || runtime.recoveryActive) return 'inactive'
      await schedule(planned)
      return 'scheduled'
    } catch {
      return 'error'
    }
  })
  return queue
}

export function cancelAllNotifications(): Promise<NotificationSyncState> {
  return reconcileNotificationSchedule(null, true, runtime.lang)
}

/** Legacy UI refreshes the already-established runtime; it cannot lower the recovery guard or change owner. */
export function refreshNotificationSchedule(): Promise<NotificationSyncState> {
  return reconcileNotificationSchedule(runtime.ownerId, runtime.recoveryActive, runtime.lang)
}

export function notificationRuntimeSnapshot(): Readonly<DesiredRuntime> {
  return { ...runtime }
}
