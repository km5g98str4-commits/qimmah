// واجهة التتبّع المحلي — نقطة النداء الوحيدة من كود المنتج.
//
// [CTO-68]. `trackLocal(name, props)` يكتب حدثًا في مخزن المالك على الجهاز.
// **لا وجهة أخرى**: لا مزوّد، ولا طابور إرسال، ولا endpoint. الملف كلّه — ومجلّده —
// خالٍ من بدائيات الشبكة، ويحرسه `test:analytics` بفحص مسمّى + مصائد تنفيذية.

import type { TrackedEventName, TrackedEventProps } from './registry'
import { appendEvent, makeEvent, readEvents, type TrackedEvent } from './store'

export { TRACKED_EVENTS, AWAITING_SURFACE, SETUP_STEP_NAMES, isAwaitingSurface } from './registry'
export type { TrackedEventName, TrackedEventProps, SetupStepName, WorkoutAbandonPoint } from './registry'
export {
  TRACKING_EVENTS_KEY_BASE,
  MAX_EVENTS,
  MAX_PROP_STRING,
  MAX_SERIALIZED_BYTES,
  trackingEventsKey,
  trackingOwnerToken,
  currentTrackingOwner,
  readEvents,
  clearEvents,
  appendEvent,
  makeEvent,
  sanitizeProps,
  isValidEvent,
} from './store'
export type { TrackedEvent } from './store'

/**
 * يسجّل حدثًا محلّيًا. الخصائص مطبوعة صارمًا لكل حدث — لا يمكن تمرير حقل خارج العقد،
 * ولا اسم خارج السجلّ.
 *
 * لا يرمي أبدًا: طبقة التتبّع لا تكسر التطبيق ولا تقاطع تدفّق مستخدم مهما حدث.
 */
export function trackLocal<E extends TrackedEventName>(name: E, props: TrackedEventProps[E]): void {
  try {
    if (typeof window === 'undefined') return
    const event = makeEvent(name, props as Record<string, unknown>)
    appendEvent(event)
    devLog(event)
  } catch {
    /* التتبّع صامت عند الفشل — لا شاشة، ولا أثر على حالة المنتج. */
  }
}

// ————————————————————— عارض المطوّر (البند ٥) —————————————————————
//
// معاينة أثناء التطوير فقط — **لا شاشة مستخدم ولا مدخل إنتاجي**.
// كل ما دونه محكوم بـ`import.meta.env.DEV`، فيسقط من حزمة الإنتاج عند البناء
// (تحصيص شرطي ثابت). ويحرسه الإثبات بفحص على `dist/` بعد البناء.

/** يطبع الحدث فور وقوعه في التطوير — سطر واحد بلا شبكة. */
function devLog(event: TrackedEvent): void {
  if (!import.meta.env.DEV) return
  console.info(
    `%c[qimmah:track]%c ${event.name}`,
    'color:#F26A21;font-weight:bold',
    'color:inherit',
    { ...event.props, ts: new Date(event.ts).toISOString() },
  )
}

/** آخر الأحداث المسجّلة للمالك الحالي (الأحدث أولًا) — أداة فحص للمطوّر. */
export function recentEvents(limit = 50): TrackedEvent[] {
  return readEvents().slice(-limit).reverse()
}

/**
 * يربط عارض المطوّر بالنافذة: `__qimmahEvents()` في وحدة تحكّم المتصفّح.
 * يُستدعى مرّة من `main.tsx`، ولا أثر له إطلاقًا في الإنتاج.
 */
export function initTrackingDevViewer(): void {
  if (!import.meta.env.DEV) return
  if (typeof window === 'undefined') return
  try {
    const w = window as unknown as Record<string, unknown>
    w.__qimmahEvents = (limit = 50) => {
      const rows = recentEvents(limit).map((e) => ({
        time: new Date(e.ts).toLocaleTimeString(),
        event: e.name,
        ...e.props,
      }))
      console.table(rows)
      return rows
    }
    console.info('%c[qimmah:track]%c عارض الأحداث جاهز — نفّذ __qimmahEvents() لعرض آخر الأحداث.', 'color:#F26A21;font-weight:bold', 'color:inherit')
  } catch {
    /* العارض أداة راحة — غيابه لا يعني شيئًا للمنتج. */
  }
}
