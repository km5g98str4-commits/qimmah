// إشعار نهاية الراحة (P5، مُقوّى في P14) — أحادي (one-shot) عند rest.endsAt.
//
// العقد (يربطه Codex في WorkoutV2 — لا واجهة هنا):
//   • بدء راحة   → scheduleRestEndNotification(endsAt, lang, now, { ownerId })
//   • «+وقت»    → scheduleRestEndNotification(newEndsAt, ...) — الاستبدال مدمج
//                  (يُلغى القديم قبل الجدولة، فلا إشعارين لراحة واحدة).
//   • تخطٍّ/انتهاء الراحة في المقدّمة/إنهاء الجلسة/تجاهلها → cancelRestEndNotification({ ownerId })
//   • إقلاع بارد (Cold start) → reconcileRestEndOnColdStart({...}) قبل أي جدولة.
//
// الحراسة: لا-شيء على الويب (Capacitor ليس iOS)، ولا جدولة بلا إذن ممنوح،
// ولا جدولة لوقت مضى. المعرّف ضمن NOTIFICATION_ID_RANGES فيلغيه cancelKnown
// عند كل مصالحة للمحرّك (تبديل حساب/استرداد) — لا إشعار يتيم.
//
// P14 — ما أُصلح:
//   ① الإلغاء صار **قبل** فحص «وقت مضى»: إعادة جدولة بـ endsAt ماضٍ كانت تُرجع
//      'skipped' وتترك إشعار الراحة القديم معلّقًا فيرنّ بعد انتهاء الراحة فعليًا.
//   ② أثر معلّق مخزّن (endsAt) موسوم بالمالك ⇒ الإقلاع البارد يعرف أن هناك إشعارًا
//      مجدولًا ويستطيع الحكم عليه: بائت (endsAt مضى) أو يتيم (لا جلسة نشطة) ⇒ يُلغى
//      ويُزال من مركز الإشعارات. بدونه كان الإشعار يرنّ بعد قتل التطبيق ولا أحد يلغيه.
//   ③ removeDelivered: تنظيف مركز الإشعارات من إشعار راحة بائت (اختياري في المنفذ).
//
// «المنفذ» (port) قابل للحقن في الاختبارات فقط — الافتراضي يمرّ عبر محرّك
// الإشعارات القائم (نفس صلاحياته) و@capacitor/local-notifications كسولًا.

import type { Lang } from '@/lib/appPreferences'
import { notificationMessage } from '@/data/notificationCopy'
import { NOTIFICATION_ID_RANGES } from './schedule'
import { notificationPermissionStatus, notificationsSupported } from './engine'
import type { NotificationPermission } from './types'

export const REST_END_NOTIFICATION_ID: number = NOTIFICATION_ID_RANGES.restEnd[0]

/** أثر الإشعار المعلّق، موسوم بالمالك (نفس نمط qimmah:active-workout:v2:<owner>). */
export const REST_END_PENDING_KEY_BASE = 'qimmah:restEndPending:v1'

export function restEndPendingKey(ownerId: string | null | undefined): string {
  return `${REST_END_PENDING_KEY_BASE}:${ownerId ?? 'guest'}`
}

export interface RestEndPort {
  supported(): boolean
  permission(): Promise<NotificationPermission>
  scheduleAt(item: { id: number; title: string; body: string; at: Date }): Promise<void>
  cancel(id: number): Promise<void>
  /** إزالة إشعار سُلّم فعلًا من مركز الإشعارات (اختياري — للتنظيف عند الإقلاع البارد). */
  removeDelivered?(id: number): Promise<void>
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
  async removeDelivered(id) {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    // يُزيل الإشعار من مركز الإشعارات إن كان قد سُلّم بينما التطبيق مقتول.
    await LocalNotifications.removeDeliveredNotifications({ notifications: [{ id, title: '', body: '' }] })
  },
}

let port: RestEndPort = defaultPort

/** (للاختبارات فقط) يحقن منفذًا وهميًا — null يعيد الافتراضي. */
export function setRestEndPortForTests(p: RestEndPort | null): void {
  port = p ?? defaultPort
}

// ── الأثر المعلّق (لا يحمل أي بيانات تمرين — طابع زمني فقط) ──────────────────

interface PendingRecord {
  endsAt: number
  scheduledAt: number
}

function readPending(ownerId: string | null | undefined): PendingRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(restEndPendingKey(ownerId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PendingRecord>
    if (typeof parsed.endsAt !== 'number' || !Number.isFinite(parsed.endsAt)) return null
    return { endsAt: parsed.endsAt, scheduledAt: typeof parsed.scheduledAt === 'number' ? parsed.scheduledAt : 0 }
  } catch {
    return null
  }
}

function writePending(ownerId: string | null | undefined, record: PendingRecord | null): void {
  if (typeof window === 'undefined') return
  try {
    if (record) window.localStorage.setItem(restEndPendingKey(ownerId), JSON.stringify(record))
    else window.localStorage.removeItem(restEndPendingKey(ownerId))
  } catch {
    /* تخزين ممتلئ/محجوب — الإلغاء الشامل في cancelKnown يبقى شبكة الأمان */
  }
}

/** الأثر المعلّق لمالك (للاختبار/التشخيص) — null إذا لا إشعار راحة مجدول. */
export function pendingRestEnd(ownerId: string | null | undefined): { endsAt: number } | null {
  const record = readPending(ownerId)
  return record ? { endsAt: record.endsAt } : null
}

// ── الجدولة والإلغاء ─────────────────────────────────────────────────────────

export type RestEndScheduleResult = 'scheduled' | 'unsupported' | 'denied' | 'skipped' | 'error'

export interface RestEndOwnerOptions {
  /** معرّف المالك — يوسم الأثر المعلّق فلا يخلط حسابين على جهاز واحد. */
  ownerId?: string | null
}

/**
 * يجدول إشعار نهاية الراحة عند endsAt — يستبدل أي إشعار راحة سابق.
 * لا يرمي أبدًا: النتيجة تصف ما حدث ('unsupported' على الويب = لا-شيء صامت).
 *
 * P14: الإلغاء يسبق فحص «وقت مضى» — فحتى الجدولة المُتخطّاة تنظّف ما قبلها.
 */
export async function scheduleRestEndNotification(
  endsAtMs: number,
  lang: Lang,
  nowMs: number = Date.now(),
  options: RestEndOwnerOptions = {},
): Promise<RestEndScheduleResult> {
  if (!port.supported()) return 'unsupported'
  try {
    if ((await port.permission()) !== 'granted') return 'denied'
    // استبدال لا تراكم: راحة واحدة نشطة = إشعار واحد كحد أقصى. يُنفَّذ **قبل** فحص
    // الوقت الماضي، وإلا بقي إشعار الراحة السابق معلّقًا بعد إعادة جدولة متخطّاة.
    await port.cancel(REST_END_NOTIFICATION_ID)
    if (!Number.isFinite(endsAtMs) || endsAtMs <= nowMs) {
      writePending(options.ownerId, null)
      return 'skipped'
    }
    const copy = notificationMessage('restEnd', lang)
    await port.scheduleAt({ id: REST_END_NOTIFICATION_ID, title: copy.title, body: copy.body, at: new Date(endsAtMs) })
    writePending(options.ownerId, { endsAt: endsAtMs, scheduledAt: nowMs })
    return 'scheduled'
  } catch {
    return 'error'
  }
}

/** يلغي إشعار نهاية الراحة (تخطٍّ/اكتمال في المقدّمة/إنهاء الجلسة). لا يرمي. */
export async function cancelRestEndNotification(options: RestEndOwnerOptions = {}): Promise<void> {
  // الأثر يُمسح دائمًا، حتى على الويب — فلا يبقى أثر كاذب لإقلاع لاحق على iOS.
  writePending(options.ownerId, null)
  if (!port.supported()) return
  try {
    await port.cancel(REST_END_NOTIFICATION_ID)
  } catch {
    /* أفضل-جهد — الإلغاء الشامل في cancelKnown يلتقط أي بقايا */
  }
}

// ── مصالحة الإقلاع البارد ────────────────────────────────────────────────────

export type RestEndColdStartAction =
  /** لا أثر معلّق — لا شيء لعمله. */
  | 'none'
  /** الويب/منصة بلا إشعارات — لا-شيء صامت (الأثر يُمسح مع ذلك). */
  | 'unsupported'
  /** الأثر معلّق وراحته مضت ⇒ أُلغي وأُزيل من مركز الإشعارات (بائت). */
  | 'cleared-stale'
  /** الأثر معلّق بلا راحة نشطة الآن ⇒ أُلغي (يتيم بعد تجاهل/إنهاء الجلسة). */
  | 'cleared-orphan'
  /** الراحة ما زالت جارية ونفس endsAt ⇒ الإشعار المجدول صحيح، يُترك كما هو. */
  | 'kept'

export interface RestEndColdStartResult {
  action: RestEndColdStartAction
  /** endsAt الذي كان مخزّنًا في الأثر (للتشخيص/التقرير). */
  pendingEndsAt: number | null
}

/**
 * تُستدعى **مرة واحدة عند الإقلاع البارد** (قبل أي جدولة راحة جديدة):
 *
 *   • أثر بـ endsAt مضى  ⇒ الراحة انتهت والتطبيق كان مقتولًا: يُلغى الإشعار
 *     ويُزال من مركز الإشعارات، فلا يرنّ/يبقى معروضًا بعد انتهاء الراحة.
 *   • أثر بلا راحة نشطة في الجلسة المستعادة ⇒ يتيم: يُلغى.
 *   • أثر مطابق لراحة ما زالت جارية ⇒ يُترك (الإشعار المجدول هو الصحيح).
 *
 * `activeRestEndsAt` = endsAt للراحة في الجلسة المستعادة، أو null إن لا راحة/لا جلسة.
 * لا يرمي أبدًا.
 */
export async function reconcileRestEndOnColdStart(args: {
  ownerId?: string | null
  activeRestEndsAt?: number | null
  nowMs?: number
}): Promise<RestEndColdStartResult> {
  const nowMs = args.nowMs ?? Date.now()
  const pending = readPending(args.ownerId)
  if (!pending) return { action: 'none', pendingEndsAt: null }
  if (!port.supported()) {
    writePending(args.ownerId, null)
    return { action: 'unsupported', pendingEndsAt: pending.endsAt }
  }

  const activeEndsAt = typeof args.activeRestEndsAt === 'number' && Number.isFinite(args.activeRestEndsAt)
    ? args.activeRestEndsAt
    : null

  // ما زالت الراحة نفسها جارية ⇒ الإشعار المجدول صحيح، لا نلمسه.
  if (activeEndsAt !== null && activeEndsAt > nowMs && activeEndsAt === pending.endsAt) {
    return { action: 'kept', pendingEndsAt: pending.endsAt }
  }

  const stale = pending.endsAt <= nowMs
  try {
    await port.cancel(REST_END_NOTIFICATION_ID)
    if (stale) await port.removeDelivered?.(REST_END_NOTIFICATION_ID)
  } catch {
    /* أفضل-جهد */
  }
  writePending(args.ownerId, null)
  return { action: stale ? 'cleared-stale' : 'cleared-orphan', pendingEndsAt: pending.endsAt }
}
