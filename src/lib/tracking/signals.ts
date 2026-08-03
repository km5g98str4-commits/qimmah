// إشارات مشتقّة من المخزن نفسه — بلا مفتاح تخزين إضافي.
//
// [CTO-68] الحدث ٧ («فتح اليوم التالي»). الأصل المستعمل هو **آخر حدث في المخزن**:
// طابعه الزمني هو آخر مرّة استُخدم فيها التطبيق فعلًا. فلا نضيف مفتاحًا ثالثًا
// يتتبّع «آخر فتح» ويحتاج مسحًا وعزلًا وتسجيلًا خاصًّا به — المخزن الدوّار يعرف ذلك.
// وآخر حدث لا يسقط بالدوران أبدًا (الدوران يُسقط الأقدم)، فالإشارة لا تُفقد.

import { readEvents } from './store'
import { trackLocal } from './index'
import type { TrackedEventName } from './registry'

/**
 * ختم اليوم المحلي (YYYY-MM-DD).
 *
 * منسوخ عمدًا من `today.ts:getDayStamp` بدل استيراده: ذلك الملف يستورد React
 * و`historyStore`، وطبقة التتبّع يجب أن تبقى خفيفة وخالية من التبعيات الجانبية.
 * التطابق ليس على الثقة — الإثبات يقارن الدالتين على نفس التواريخ ويسقط عند الانحراف.
 */
export function trackingDayStamp(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** فرق الأيام التقويمية المحلية بين ختمين (يتجاهل الساعات فلا يتأثّر بالتوقيت الصيفي). */
export function dayGap(fromStamp: string, toStamp: string): number {
  const [fy, fm, fd] = fromStamp.split('-').map(Number)
  const [ty, tm, td] = toStamp.split('-').map(Number)
  if ([fy, fm, fd, ty, tm, td].some((n) => !Number.isFinite(n))) return 0
  const from = Date.UTC(fy, fm - 1, fd)
  const to = Date.UTC(ty, tm - 1, td)
  return Math.round((to - from) / 86_400_000)
}

/**
 * هل سُجّل هذا الحدث اليوم بالفعل لهذا المالك؟
 *
 * المخزن نفسه هو دفتر منع التكرار — لا علم إضافي ولا مفتاح ثانٍ. يخدم الأحداث التي
 * تُطلق عند **عرض** حالة تتكرّر كل تركيب للشاشة (العودة بعد انقطاع)، فتُسجَّل مرّة
 * في اليوم لا مرّة في كل تبديل تبويب.
 */
export function hasEventToday(name: TrackedEventName, now: Date = new Date()): boolean {
  const todayStamp = trackingDayStamp(now)
  return readEvents().some((e) => e.name === name && trackingDayStamp(new Date(e.ts)) === todayStamp)
}

/**
 * يُطلق «فتح اليوم التالي» إن كان آخر نشاط مسجَّل في يوم تقويمي **سابق**.
 * يُستدعى مرّة واحدة عند إقلاع التطبيق، بعد أن يستقرّ المالك.
 *
 * لا يُطلق شيئًا عند أول تشغيل (لا أحداث سابقة) ولا عند فتح ثانٍ في نفس اليوم —
 * وهو المقصود: الحدث يقيس **العودة في يوم جديد** لا مجرّد الفتح.
 */
export function recordDayOpen(now: Date = new Date()): void {
  try {
    const events = readEvents()
    if (events.length === 0) return
    const last = events[events.length - 1]
    const lastStamp = trackingDayStamp(new Date(last.ts))
    const todayStamp = trackingDayStamp(now)
    if (lastStamp === todayStamp) return
    const gapDays = dayGap(lastStamp, todayStamp)
    if (gapDays <= 0) return // ساعة الجهاز رجعت للخلف — لا نخترع إشارة
    trackLocal('next_day_opened', { gapDays })
  } catch {
    /* إشارة مشتقّة — غيابها لا يؤثّر على المنتج. */
  }
}
