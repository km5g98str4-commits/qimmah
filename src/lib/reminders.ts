// تذكير التمرين — تنبيهات محلية على الجهاز فقط (iOS الأصلي عبر @capacitor/local-notifications).
//
// المبادئ:
//   • على الويب: لا جدولة في الخلفية إطلاقًا (المتصفّح لا يدعمها بلا خادم Push) —
//     remindersSupported() تُعيد false فتُبقي الواجهة صادقة بلا وعود زائفة.
//   • على iOS الأصلي: تذكير يومي متكرّر واحد في وقت التمرين المختار (أصغر تنفيذ يخدم
//     seam reminderPrefs الحالي: { trainingEnabled, trainingTime }). بلا خادم، بلا Push.
//   • الإذن يُطلب فقط عند تفعيل المستخدم الصريح للتذكير (لا عند الإقلاع).
//   • آمن الفشل: كل استدعاء ملفوف بـ try/catch ولا يرمي في مسار التطبيق.
//
// المكوّن يُحمَّل كسولًا (dynamic import) ولا يدخل حزمة الويب لأنه لا يُستدعى إلا على iOS.

import { Capacitor } from '@capacitor/core'
import { loadReminderPrefs } from './reminderPrefs'
import { getStrings } from '@/config/strings'
import { getLanguage } from './appPreferences'

/** معرّف ثابت للتذكير اليومي — يجعل الإلغاء/الاستبدال حتميًا (لا تراكم إشعارات). */
const WORKOUT_REMINDER_ID = 1001

export type ReminderPermission = 'granted' | 'denied' | 'unsupported'

function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

/** هل تدعم هذه المنصّة تذكيرات محلية مجدوَلة تعمل والتطبيق مغلق؟ (iOS الأصلي فقط) */
export function remindersSupported(): boolean {
  return isNative()
}

async function getPlugin() {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  return LocalNotifications
}

/** نص الإشعار حسب اللغة الحالية وقت الجدولة (يُعاد بناؤه عند المزامنة بعد تبديل اللغة). */
function notifContent(): { title: string; body: string } {
  const p = getStrings(getLanguage()).progress
  return { title: p.reminderNotifTitle, body: p.reminderNotifBody }
}

/**
 * يطلب إذن الإشعارات — يُستدعى **فقط** عند تفعيل المستخدم الصريح للتذكير.
 * يُعيد 'unsupported' على الويب دون إظهار أي مربّع.
 */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (!isNative()) return 'unsupported'
  try {
    const LN = await getPlugin()
    const res = await LN.requestPermissions()
    return res.display === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

/** الحالة الحالية للإذن دون طلبه (granted فقط تسمح بالجدولة). */
export async function reminderPermissionStatus(): Promise<ReminderPermission> {
  if (!isNative()) return 'unsupported'
  try {
    const LN = await getPlugin()
    const res = await LN.checkPermissions()
    return res.display === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

/**
 * مصدر الحقيقة للجدولة: يُلغي التذكير القائم ثم يُعيد جدولته من reminderPrefs.
 * لا يجدول إلا إذا: المنصّة أصلية + التذكير مفعّل + الإذن ممنوح. غير ذلك يبقى ملغى.
 * يُستدعى عند: الإقلاع/الاستئناف، تغيير التفضيل، تفعيل التذكير.
 */
export async function syncWorkoutReminder(): Promise<void> {
  if (!isNative()) return
  try {
    const LN = await getPlugin()
    // ألغِ دائمًا أولًا (idempotent) حتى لا يتراكم أكثر من إشعار.
    await LN.cancel({ notifications: [{ id: WORKOUT_REMINDER_ID }] })

    const prefs = loadReminderPrefs()
    if (!prefs.trainingEnabled) return

    const perm = await LN.checkPermissions()
    if (perm.display !== 'granted') return

    const [hourStr, minStr] = prefs.trainingTime.split(':')
    const hour = Number(hourStr)
    const minute = Number(minStr)
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return

    const { title, body } = notifContent()
    await LN.schedule({
      notifications: [
        {
          id: WORKOUT_REMINDER_ID,
          title,
          body,
          // on:{hour,minute} = تذكير يومي متكرّر (يُحتسب مرّة واحدة ضمن حدّ iOS، بلا تراكم).
          schedule: { on: { hour, minute }, allowWhileIdle: true },
        },
      ],
    })
  } catch {
    /* لا نكسر التطبيق إن تعذّرت الجدولة */
  }
}

/** يُلغي كل تذكيرات قِمّة — يُستدعى من إعادة الضبط/حذف الحساب قبل مسح البيانات. */
export async function cancelAllReminders(): Promise<void> {
  if (!isNative()) return
  try {
    const LN = await getPlugin()
    await LN.cancel({ notifications: [{ id: WORKOUT_REMINDER_ID }] })
  } catch {
    /* تجاهل */
  }
}
