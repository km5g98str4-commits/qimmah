// مزوّد الاستحقاق + بوّابة Premium الواحدة.
// [QIM-WEB-FOUNDER-UX-003] الحزمة ٢.
//
// يملك ثلاثة أشياء ولا رابع: (١) حسم الاستحقاق ومزامنته إلى المخزن العادي الذي
// تقرؤه طبقة التخزين، (٢) حالة «أي فعل حاول المستخدم فعله» ليُعرض عليه نداء
// واحد متّسق، (٣) استبدال كود التفعيل.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getEntitlement, setEntitlement, subscribeEntitlement, type EntitlementSnapshot } from './entitlementStore'
import { canPerform } from './guard'
import type { PaidAction } from './paidActions'
import { AccessContext, type AccessContextValue } from './context'
import { claimPendingGrants, redeemActivationCode, resolveEntitlement, startTrial } from './entitlementSource'
import { getSupabase } from '@/lib/supabaseClient'
import type { TrialOutcome } from './entitlementBackend'


export function EntitlementProvider({ children }: { children: ReactNode }) {
  const [entitlement, setSnapshot] = useState<EntitlementSnapshot>(getEntitlement)
  const [blockedAction, setBlockedAction] = useState<PaidAction | null>(null)

  // المخزن العادي هو مصدر الحقيقة؛ الحالة هنا مرآة له فتُعاد الواجهة عند تغيّره.
  useEffect(() => subscribeEntitlement(setSnapshot), [])

  const refresh = useCallback(async () => {
    const resolved = await resolveEntitlement()
    setEntitlement({
      status: resolved.status,
      source: resolved.source,
      detail: resolved.detail ?? null,
      lastError: resolved.lastError,
    })
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // [OVERNIGHT-3] الاستحقاق يتبع الجلسة. بلا هذا الاشتراك يبقى المستخدم على
  // استحقاق اللحظة التي أُقلع فيها التطبيق: من يسجّل دخوله بعد الشراء يبقى
  // ممنوعًا حتى يعيد التحميل يدويًا، ومن يخرج يحتفظ بفتحٍ لم يعد له.
  // وعند الدخول تحديدًا نطلب المِنَح المعلّقة أوّلًا — الشراء يسبق إنشاء
  // الحساب أحيانًا — ثم نقرأ الاستحقاق **مرّة واحدة** بعدها.
  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | null = null
    void (async () => {
      const supabase = await getSupabase()
      if (!supabase || cancelled) return
      const { data } = supabase.auth.onAuthStateChange((event) => {
        void (async () => {
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') await claimPendingGrants()
          // الخروج لا يعني «تأكّدنا أنه غير مشترك» بل «لم نعد نعرف» — والمخزن
          // يعود إلى `loading` المغلقة، ثم يُحسم من المصدر.
          await refresh()
        })()
      })
      unsubscribe = () => data.subscription.unsubscribe()
    })()
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [refresh])

  const can = useCallback((action: PaidAction) => canPerform(action), [])

  const guard = useCallback(
    <A extends unknown[]>(action: PaidAction, run: (...args: A) => void) =>
      (...args: A) => {
        if (!canPerform(action)) {
          setBlockedAction(action)
          return
        }
        run(...args)
      },
    [],
  )

  const redeem = useCallback(
    async (code: string) => {
      const outcome = await redeemActivationCode(code)
      // النجاح لا يُعلَن من الواجهة: نُعيد الحسم من المصدر ثم نعرض النتيجة. فلا
      // تفتح الواجهة الأفعال بناءً على ردّ محلّي (مطلب المؤسس §C).
      if (outcome === 'success') await refresh()
      return outcome
    },
    [refresh],
  )

  /**
   * بدء التجربة. **نفس القاعدة**: النجاح يعني «الخادم قال نعم»، ثم نُعيد
   * القراءة. لا تفتح الواجهة سبعين ساعة بناءً على ردّ محلّي، ولا تحسب انتهاءها
   * بساعة الجهاز.
   */
  const beginTrial = useCallback(async (): Promise<TrialOutcome> => {
    const outcome = await startTrial()
    if (outcome === 'started') await refresh()
    return outcome
  }, [refresh])

  const closeGate = useCallback(() => setBlockedAction(null), [])

  const value = useMemo<AccessContextValue>(
    () => ({ entitlement, can, guard, blockedAction, closeGate, redeem, refresh, beginTrial }),
    [entitlement, can, guard, blockedAction, closeGate, redeem, refresh, beginTrial],
  )

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}
