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
import { redeemActivationCode, resolveEntitlement } from './entitlementSource'


export function EntitlementProvider({ children }: { children: ReactNode }) {
  const [entitlement, setSnapshot] = useState<EntitlementSnapshot>(getEntitlement)
  const [blockedAction, setBlockedAction] = useState<PaidAction | null>(null)

  // المخزن العادي هو مصدر الحقيقة؛ الحالة هنا مرآة له فتُعاد الواجهة عند تغيّره.
  useEffect(() => subscribeEntitlement(setSnapshot), [])

  const refresh = useCallback(async () => {
    const resolved = await resolveEntitlement()
    setEntitlement({ status: resolved.status, source: resolved.source })
  }, [])

  useEffect(() => {
    void refresh()
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

  const closeGate = useCallback(() => setBlockedAction(null), [])

  const value = useMemo<AccessContextValue>(
    () => ({ entitlement, can, guard, blockedAction, closeGate, redeem, refresh }),
    [entitlement, can, guard, blockedAction, closeGate, redeem, refresh],
  )

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}
