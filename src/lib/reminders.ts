// تذكير التمرين — تنبيهات محلية على الجهاز فقط (iOS الأصلي عبر @capacitor/local-notifications).
//
// المبادئ:
//   • مدعوم على iOS **فقط** (المرحلة 3). الويب و Android → remindersSupported()=false
//     فتبقى الواجهة صادقة بلا وعود زائفة (Android يُراجَع ويُفعَّل لاحقًا).
//   • على iOS: تذكير يومي متكرّر واحد في وقت التمرين المختار (أصغر تنفيذ يخدم
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

// المرحلة 3 لـ iOS فقط. لا نعامل كل منصّة أصلية كمدعومة — Android يُراجَع ويُفعَّل لاحقًا.
function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios'
}

/** هل تدعم هذه المنصّة تذكيرات محلية مجدوَلة تعمل والتطبيق مغلق؟ (iOS فقط حاليًا) */
export function remindersSupported(): boolean {
  return isIOS()
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
  if (!isIOS()) return 'unsupported'
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
  if (!isIOS()) return 'unsupported'
  try {
    const LN = await getPlugin()
    const res = await LN.checkPermissions()
    return res.display === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

/**
 * مصدر الحقيقة للجدولة (iOS فقط). **يتحقّق أولًا** من التفعيل وصحّة الوقت والإذن،
 * ثم يقرّر: إمّا يجدول تذكيرًا يوميًا متكرّرًا (يستبدل القائم بنفس المعرّف)، وإمّا
 * يُلغي القائم فقط عندما يجب ألّا يوجد تذكير — فلا نُلغي إشعارًا صالحًا قبل التحقّق.
 * يُستدعى عند: الإقلاع/الاستئناف، تغيير التفضيل، تفعيل التذكير.
 */
export async function syncWorkoutReminder(): Promise<void> {
  if (!isIOS()) return
  try {
    const LN = await getPlugin()
    const prefs = loadReminderPrefs()

    // 1) تحقّق من صحّة الوقت والتفعيل قبل لمس أي إشعار قائم.
    const [hourStr, minStr] = prefs.trainingTime.split(':')
    const hour = Number(hourStr)
    const minute = Number(minStr)
    const timeValid =
      Number.isInteger(hour) && hour >= 0 && hour <= 23 &&
      Number.isInteger(minute) && minute >= 0 && minute <= 59

    const cancel = () => LN.cancel({ notifications: [{ id: WORKOUT_REMINDER_ID }] })

    // يجب ألّا يوجد تذكير (مطفأ أو وقت غير صالح) → عندها فقط نُلغي القائم.
    if (!prefs.trainingEnabled || !timeValid) {
      await cancel()
      return
    }

    // 2) تحقّق من الإذن قبل الجدولة. بلا إذن → لا تُبقِ تذكيرًا مجدوَلًا.
    const perm = await LN.checkPermissions()
    if (perm.display !== 'granted') {
      await cancel()
      return
    }

    // 3) جدولة يومية متكرّرة **صريحة** (repeats:true) بنفس المعرّف — يستبدل أي إشعار
    //    قائم دون إلغاء مسبق، فلا فجوة ولا تراكم. on:{hour,minute} = وقت ثابت يوميًا.
    const { title, body } = notifContent()
    await LN.schedule({
      notifications: [
        {
          id: WORKOUT_REMINDER_ID,
          title,
          body,
          schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
        },
      ],
    })
  } catch {
    /* لا نكسر التطبيق إن تعذّرت الجدولة */
  }
}

/** يُلغي كل تذكيرات قِمّة — يُستدعى من إعادة الضبط/حذف الحساب قبل مسح البيانات. */
export async function cancelAllReminders(): Promise<void> {
  if (!isIOS()) return
  try {
    const LN = await getPlugin()
    await LN.cancel({ notifications: [{ id: WORKOUT_REMINDER_ID }] })
  } catch {
    /* تجاهل */
  }
}
