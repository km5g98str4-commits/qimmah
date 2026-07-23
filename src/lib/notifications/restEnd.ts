// إشعار نهاية الراحة (P5) — أحادي (one-shot) عند rest.endsAt داخل الجلسة النشطة.
//
// العقد (يربطه Codex في WorkoutV2 — لا واجهة هنا):
//   • بدء راحة   → scheduleRestEndNotification(endsAt, lang)
//   • «+وقت»    → scheduleRestEndNotification(newEndsAt, lang) — الاستبدال مدمج
//                  (يُلغى القديم قبل الجدولة، فلا إشعارين لراحة واحدة).
//   • تخطٍّ/انتهاء الراحة في المقدّمة/إنهاء الجلسة → cancelRestEndNotification().
// الحراسة: لا-شيء على الويب (Capacitor ليس iOS)، ولا جدولة بلا إذن ممنوح،
// ولا جدولة لوقت مضى. المعرّف ضمن NOTIFICATION_ID_RANGES فيلغيه cancelKnown
// عند كل مصالحة للمحرّك (تبديل حساب/استرداد) — لا إشعار يتيم.
//
// «المنفذ» (port) قابل للحقن في الاختبارات فقط — الافتراضي يمرّ عبر محرّك
// الإشعارات القائم (نفس صلاحياته) و@capacitor/local-notifications كسولًا.

import type { Lang } from '@/lib/appPreferences'
import { notificationMessage } from '@/data/notificationCopy'
import { NOTIFICATION_ID_RANGES } from './schedule'
import { notificationPermissionStatus, notificationsSupported } from './engine'
import type { NotificationPermission } from './types'

export const REST_END_NOTIFICATION_ID: number = NOTIFICATION_ID_RANGES.restEnd[0]

export interface RestEndPort {
  supported(): boolean
  permission(): Promise<NotificationPermission>
  scheduleAt(item: { id: number; title: string; body: string; at: Date }): Promise<void>
  cancel(id: number): Promise<void>
}

const defaultPort: RestEndPort = {
  supported: notificationsSupported,
  permission: notificationPermissionStatus,
  async scheduleAt(item) {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.schedule({
      notifications: [{ id: item.id, title: item.title, body: item.body, schedule: { at: item.at, allowWhileIdle: true } }],
    })
  },
  async cancel(id) {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id }] })
  },
}

let port: RestEndPort = defaultPort

/** (للاختبارات فقط) يحقن منفذًا وهميًا — null يعيد الافتراضي. */
export function setRestEndPortForTests(p: RestEndPort | null): void {
  port = p ?? defaultPort
}

export type RestEndScheduleResult = 'scheduled' | 'unsupported' | 'denied' | 'skipped' | 'error'

/**
 * يجدول إشعار نهاية الراحة عند endsAt — يستبدل أي إشعار راحة سابق.
 * لا يرمي أبدًا: النتيجة تصف ما حدث ('unsupported' على الويب = لا-شيء صامت).
 */
export async function scheduleRestEndNotification(
  endsAtMs: number,
  lang: Lang,
  nowMs: number = Date.now(),
): Promise<RestEndScheduleResult> {
  if (!port.supported()) return 'unsupported'
  try {
    if ((await port.permission()) !== 'granted') return 'denied'
    if (!Number.isFinite(endsAtMs) || endsAtMs <= nowMs) return 'skipped'
    // استبدال لا تراكم: راحة واحدة نشطة = إشعار واحد كحد أقصى.
    await port.cancel(REST_END_NOTIFICATION_ID)
    const copy = notificationMessage('restEnd', lang)
    await port.scheduleAt({ id: REST_END_NOTIFICATION_ID, title: copy.title, body: copy.body, at: new Date(endsAtMs) })
    return 'scheduled'
  } catch {
    return 'error'
  }
}

/** يلغي إشعار نهاية الراحة (تخطٍّ/اكتمال في المقدّمة/إنهاء الجلسة). لا يرمي. */
export async function cancelRestEndNotification(): Promise<void> {
  if (!port.supported()) return
  try {
    await port.cancel(REST_END_NOTIFICATION_ID)
  } catch {
    /* أفضل-جهد — الإلغاء الشامل في cancelKnown يلتقط أي بقايا */
  }
}
