// مخزن أحداث التتبّع المحلي — دوّار، معزول بالمالك، بلا أي مسار شبكة.
//
// [CTO-68] البند ١. لا يستورد هذا الملف — ولا أي ملف في `lib/tracking/` — أي
// بدائية شبكة (`fetch`/`sendBeacon`/`XMLHttpRequest`/`WebSocket`/`Image`).
// يحرسه `test:analytics` بفحص مسمّى على المصدر + مصائد تنفيذية تسقط باسمها.

import { readJson, writeJson, removeKey, type WriteResult } from '@/lib/safeStorage'
import { getLastUser } from '@/lib/accountScope'
import type { TrackedEventName } from './registry'

/** أساس المفتاح. المفتاح الفعلي = `<base>:<owner>` — لاحقة المالك تعزل الضيف عن الحساب. */
export const TRACKING_EVENTS_KEY_BASE = 'qimmah:tracking:events:v1'

/**
 * سقف المخزن الدوّار — **١٠٠٠ حدث**، والأقدم يسقط أولًا (FIFO).
 *
 * الحساب (سقف حجم صريح **مقيس** لا مُقدَّر):
 *   أثقل حدث = `food_search_no_result` باستعلام عربي بطول `MAX_PROP_STRING`.
 *   والحرف العربي **بايتان** في UTF-8، فالاستعلام ٦٤ محرفًا = ١٢٨ بايت لا ٦٤:
 *   مغلّف ثابت (`id` ٨ محارف · `ts` ١٣ رقمًا · الاسم · الفواصل) + الخصائص
 *   ≈ **٢١٧ بايت للحدث**، و١٠٠٠ حدث ≈ **٢١٢ كيلوبايت**.
 *   المعتاد أخفّ كثيرًا (أغلب الأحداث بخصائص رقمية قصيرة) ≈ ١٠٠ بايت ≈ ٩٨ كيلوبايت.
 *
 * السقف المُعلَن: **≤ ٢٥٦ كيلوبايت** ≈ ٥٪ من ميزانية localStorage (~٥ ميغابايت)
 * لكامل مساحة `qimmah:*`. التتبّع مستأجر صغير لا يزاحم بيانات المستخدم.
 *
 * > التقدير الأول هنا كان ١٤٩ كيلوبايت — حسب المحرف بايتًا وأهمل تعدّد بايتات
 * > العربية. كشفه **القياس في الإثبات** لا المراجعة. لذلك يقيس الإثبات أسوأ حالة
 * > فعليًا ويسقط عند التجاوز؛ هذا التعليق يوثّق الرقم ولا يُصدّقه أحد بلا قياس.
 */
export const MAX_EVENTS = 1000

/** أقصى طول لأي نص في الخصائص. يحدّ `query` — وهو النص الحرّ الوحيد في السجلّ. */
export const MAX_PROP_STRING = 64

/** السقف المُعلَن بالبايت — يحرسه الإثبات بقياس مخزن ممتلئ بأثقل حدث (المقيس ٢١٢KB). */
export const MAX_SERIALIZED_BYTES = 256 * 1024

/** نموذج الحدث الموحّد: معرّف · طابع زمني · اسم · خصائص مفتاح-قيمة خفيفة. */
export interface TrackedEvent {
  /** معرّف محلّي قصير — تمييز الأحداث المتطابقة داخل نفس الميلي ثانية فقط. */
  id: string
  /** طابع زمني بالميلي ثانية (وقت الجهاز). */
  ts: number
  name: TrackedEventName
  props: Record<string, string | number | boolean>
}

/** معرّف المالك في المفتاح: الحساب المسجّل أو 'guest' — مطابق لـ`ownerToken` في portability. */
export function trackingOwnerToken(uid: string | null | undefined): string {
  return uid ?? 'guest'
}

/** يبني مفتاح localStorage الفعلي لمالك بعينه. */
export function trackingEventsKey(uid: string | null | undefined): string {
  return `${TRACKING_EVENTS_KEY_BASE}:${trackingOwnerToken(uid)}`
}

/**
 * المالك الحالي دون تمرير معامل عبر كل موضع نداء.
 *
 * المصدر هو مؤشّر `accountScope` المخزَّن (`qimmah:lastUser:v1`) — نفس المؤشّر الذي
 * يثبّته `reconcileAccountScope` عند الدخول ويعيده `signOut` إلى «ضيف». فلا مؤشّر
 * ملكية ثانٍ يمكن أن ينحرف عن الأول. `undefined` (تشغيل أول) = ضيف.
 */
export function currentTrackingOwner(): string {
  return trackingOwnerToken(getLastUser() ?? null)
}

/** معرّف قصير عشوائي (٨ محارف) — لا يُشتقّ من أي هوية ولا يُخزَّن للربط بين الأحداث. */
function genEventId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const b = new Uint8Array(4)
      crypto.getRandomValues(b)
      return Array.from(b, (n) => n.toString(16).padStart(2, '0')).join('')
    }
  } catch {
    /* البديل أدناه */
  }
  return Math.random().toString(16).slice(2, 10).padEnd(8, '0')
}

/**
 * يقصّ الخصائص إلى الأنواع الخفيفة المسموحة ويحدّ أطوال النصوص.
 * أي قيمة خارج (نص/رقم/منطقي) تُسقَط — فلا يتسرّب كائن متداخل أو مصفوفة إلى المخزن.
 */
export function sanitizeProps(props: Record<string, unknown> | undefined): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  if (!props) return out
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string') out[k] = v.slice(0, MAX_PROP_STRING)
    else if (typeof v === 'number') out[k] = Number.isFinite(v) ? v : 0
    else if (typeof v === 'boolean') out[k] = v
    // غير ذلك (كائن/مصفوفة/undefined/دالة) يُسقَط عمدًا.
  }
  return out
}

/**
 * يتحقّق بنيويًا من عنصر مقروء — التخزين مدخل غير موثوق (قد يُستورَد من ملف).
 * يستعمله سجلّ النقل أيضًا كبوابة تحقّق قبل أي كتابة عند الاستيراد (§٥).
 */
export function isValidEvent(v: unknown): v is TrackedEvent {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false
  const e = v as Partial<TrackedEvent>
  return typeof e.id === 'string' && typeof e.ts === 'number' && typeof e.name === 'string' && !!e.props && typeof e.props === 'object' && !Array.isArray(e.props)
}

/** يقرأ أحداث مالك بعينه. يعيد مصفوفة فارغة عند الغياب أو التلف — لا يرمي أبدًا. */
export function readEvents(uid?: string | null): TrackedEvent[] {
  if (typeof window === 'undefined') return []
  const owner = uid === undefined ? currentTrackingOwner() : trackingOwnerToken(uid)
  const raw = readJson<unknown>(`${TRACKING_EVENTS_KEY_BASE}:${owner}`, [])
  if (!Array.isArray(raw)) return []
  return raw.filter(isValidEvent).slice(-MAX_EVENTS)
}

/**
 * يُلحق حدثًا بمخزن المالك الحالي مع الدوران عند السقف.
 *
 * يعيد `WriteResult` ولا يبتلعه صامتًا (§٥)، لكنّه **لا يعرض شيئًا للمستخدم ولا
 * يغيّر أي حالة منتج**: لا وعد معلّق على نجاح كتابة حدث تتبّع، فلا يجوز أن يقاطع
 * فشلُه تمرينًا أو وجبة. المستدعي يتجاهل القيمة؛ الإثبات يفحصها.
 */
export function appendEvent(event: TrackedEvent, uid?: string | null): WriteResult {
  if (typeof window === 'undefined') return 'unavailable'
  const owner = uid === undefined ? currentTrackingOwner() : trackingOwnerToken(uid)
  const key = `${TRACKING_EVENTS_KEY_BASE}:${owner}`
  const raw = readJson<unknown>(key, [])
  const list = Array.isArray(raw) ? raw.filter(isValidEvent) : []
  list.push(event)
  // الدوران: الأقدم يسقط أولًا فيبقى الحجم محدودًا مهما طال الاستخدام.
  const trimmed = list.length > MAX_EVENTS ? list.slice(list.length - MAX_EVENTS) : list
  return writeJson(key, trimmed)
}

/** يمسح أحداث مالك بعينه (أو الحالي). يُستدعى من إعادة الضبط/حذف الحساب. */
export function clearEvents(uid?: string | null): void {
  if (typeof window === 'undefined') return
  const owner = uid === undefined ? currentTrackingOwner() : trackingOwnerToken(uid)
  removeKey(`${TRACKING_EVENTS_KEY_BASE}:${owner}`)
}

/** يبني حدثًا كامل الشكل (معرّف + طابع زمني) من اسم وخصائص. */
export function makeEvent(name: TrackedEventName, props?: Record<string, unknown>, now: number = Date.now()): TrackedEvent {
  return { id: genEventId(), ts: now, name, props: sanitizeProps(props) }
}
