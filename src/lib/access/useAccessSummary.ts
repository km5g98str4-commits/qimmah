// هوك مؤشّر الوصول — سطر صادق يتحدّث، وتجربةٌ تنتهي في وقتها.
// [SOVEREIGN-COMMERCE-001]
//
// ═══ الفجوة الثانية التي يغلقها ═══
// المزوّد يُعيد حسم الاستحقاق عند التركيب وعند كل حدث مصادقة فقط. فجلسةٌ تُترك
// مفتوحة تتجاوز الـ٧٢ ساعة تبقى `active` في العميل حتى يوقظها تحديثُ رمزٍ
// (نحو ساعة). في تلك النافذة تنجح الكتابة **محلّيًا** على استحقاق انتهى —
// ولا شيء يُمنح على الخادم، لكن الواجهة تكذب على المستخدم.
// الحلّ لا يحتاج آلة جديدة: `remainingMs()` موجود بلا مستدعٍ منذ كُتب، ويكفي
// أن نجدول عنده إعادةَ حسم واحدة.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Lang } from '@/lib/appPreferences'
import { useAccess } from './useAccess'
import { summarizeAccess, type AccessSummary } from './accessSummary'

/** نبضة العرض — دقيقة واحدة: العدّاد بالدقائق، فما دونها إعادةُ رسم بلا خبر. */
const TICK_MS = 60_000

/**
 * يلخّص الوصول الحالي، ويُبقي العدّاد حيًّا، **ويعيد الحسم عند انتهاء التجربة**.
 *
 * الحساب كلّه من `performance.now()` عبر `remainingMs()` — عدّاد تصاعدي لا
 * يتأثّر بتغيير ساعة النظام. فمن يُرجع ساعة جهازه لا يكسب ثانية، ومن يقدّمها
 * لا يخسر واحدة.
 */
export function useAccessSummary(lang: Lang): AccessSummary {
  const { entitlement, refresh } = useAccess()
  const [tick, setTick] = useState(0)
  const detail = entitlement.detail ?? null

  const summary = useMemo(
    () => summarizeAccess(entitlement, lang, typeof performance !== 'undefined' ? performance.now() : undefined),
    // `tick` مقصود في الاعتماديات: هو ما يُعيد الحساب مع مرور الوقت.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entitlement, lang, tick],
  )

  // نبضة العرض — لا تعمل إلا حين يوجد عدّاد فعلًا.
  const hasCountdown = summary.remainingMs !== null && summary.remainingMs > 0
  useEffect(() => {
    if (!hasCountdown) return
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS)
    return () => clearInterval(id)
  }, [hasCountdown])

  // إعادة الحسم عند اللحظة نفسها — لا انتظار لتحديث رمزٍ بعد ساعة.
  const scheduledFor = useRef<number | null>(null)
  useEffect(() => {
    if (!detail || detail.expiresAtMs === null) { scheduledFor.current = null; return }
    if (scheduledFor.current === detail.expiresAtMs) return
    scheduledFor.current = detail.expiresAtMs
    const left = summary.remainingMs
    if (left === null || left <= 0) return
    // ثانيةٌ زائدة: نسأل الخادم **بعد** انقضاء مدّته لا عندها بالضبط، فلا
    // يُردّ علينا بحالةٍ ما زالت فعّالة بفارق أجزاء الثانية.
    const id = setTimeout(() => { void refresh() }, left + 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, refresh])

  return summary
}
