// مزوّد الاستحقاق + بوّابة Premium الواحدة.
// [QIM-WEB-FOUNDER-UX-003] الحزمة ٢.
//
// يملك ثلاثة أشياء ولا رابع: (١) حسم الاستحقاق ومزامنته إلى المخزن العادي الذي
// تقرؤه طبقة التخزين، (٢) حالة «أي فعل حاول المستخدم فعله» ليُعرض عليه نداء
// واحد متّسق، (٣) استبدال كود التفعيل.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getEntitlement, setEntitlement, subscribeEntitlement, type EntitlementSnapshot } from './entitlementStore'
import { canPerform } from './guard'
import type { PaidAction } from './paidActions'
import { AccessContext, type AccessContextValue } from './context'
import { claimPendingGrants, redeemActivationCode, resolveEntitlement, startTrial } from './entitlementSource'
import { applyOfflineGrace } from './entitlementCache'
import { getSupabase } from '@/lib/supabaseClient'
import type { TrialOutcome } from './entitlementBackend'
import {
  clearTrialIntent as clearIntent,
  hasTrialIntent as hasIntent,
  consumesTrialIntent,
  readTrialIntent,
  recordTrialIntent as recordIntent,
  trialDidStart,
  type TrialIntentOrigin,
} from './trialIntent'



export function EntitlementProvider({ children }: { children: ReactNode }) {
  const [entitlement, setSnapshot] = useState<EntitlementSnapshot>(getEntitlement)
  const [blockedAction, setBlockedAction] = useState<PaidAction | null>(null)
  const [trialResume, setTrialResume] = useState<TrialOutcome | null>(null)

  // المخزن العادي هو مصدر الحقيقة؛ الحالة هنا مرآة له فتُعاد الواجهة عند تغيّره.
  useEffect(() => subscribeEntitlement(setSnapshot), [])

  /**
   * [OFFLINE-ENTITLEMENT-001] القراءة ثم **سياسة السماح** ثم المخزن.
   *
   * الترتيب هو المعنى: `resolveEntitlement` تسأل الخادم ولا تتذكّر شيئًا، ثم
   * `applyOfflineGrace` تفعل ثلاثة أشياء لا رابع لها — تحفظ الإجابة الموجبة
   * الطازجة، وتمسحها فور أوّل ردٍّ سالب (إلغاء · استرداد · انتهاء · خروج)،
   * وتعيدها بحدودها حين **يتعذّر الوصول** إلى الخادم وحدها. فمن دفع لا يُطالَب
   * بالدفع ثانيةً لأن شبكته انقطعت، ومن لم يدفع لا يُفتح له شيء.
   */
  const refresh = useCallback(async () => {
    const resolved = await resolveEntitlement()
    const settled = applyOfflineGrace(resolved)
    setEntitlement({
      status: settled.status,
      source: settled.source,
      detail: settled.detail ?? null,
      lastError: settled.lastError,
      cacheReason: settled.cacheReason,
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
          // [SOVEREIGN-COMMERCE-001] استئناف نيّة التجربة — **بعد** حسم
          // الاستحقاق لا قبله: من فُتح له وصول بمنحة معلّقة (شراء سبق التسجيل)
          // لا يُحرق له حقّ التجربة على منحةٍ يملكها أصلًا.
          if (event === 'SIGNED_IN' && !cancelled) await resumeTrialIntentRef.current()
        })()
      })
      unsubscribe = () => data.subscription.unsubscribe()
    })()
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [refresh])

  /**
   * [OFFLINE-ENTITLEMENT-001] **عودة الشبكة تُعيد السؤال فورًا.**
   *
   * سماح الانقطاع لا يعني إلا شيئًا واحدًا: «الخادم غير متاح الآن». فلحظة
   * عودته يجب أن يُسأل، وإلا صار السماح تأجيلًا للإلغاء والاسترداد إلى أن
   * يتصادف حدثُ مصادقة. وهذا هو ما يجعل «الخادم يفوز فورًا» جملةً تنفيذية لا
   * وعدًا: الإلغاء يصل في أوّل ثانية اتصال، لا بعد ثلاثة أيام.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onReconnect = () => { void refresh() }
    window.addEventListener('online', onReconnect)
    return () => window.removeEventListener('online', onReconnect)
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

  /**
   * الاستئناف. **لا يمنح شيئًا بنفسه**: يعيد طرح السؤال على `start_trial`،
   * والجواب للخادم. وإن لم يكن الجواب `'started'` فالتجربة لم تبدأ — تُعرض
   * رسالتها الصادقة ولا يُقال «بدأت».
   */
  const resumeTrialIntent = useCallback(async (): Promise<TrialOutcome | null> => {
    if (!readTrialIntent()) return null
    const outcome = await startTrial()
    // القرار في `trialIntent` لا هنا — دالّة نقيّة تُنفَّذ في الإثباتات لا تُحاكى.
    if (consumesTrialIntent(outcome)) clearIntent()
    if (trialDidStart(outcome)) await refresh()
    setTrialResume(outcome)
    return outcome
  }, [refresh])

  // مرجع ثابت كي لا يُعاد تركيب اشتراك المصادقة كلّما تغيّر `refresh`.
  const resumeTrialIntentRef = useRef(resumeTrialIntent)
  useEffect(() => { resumeTrialIntentRef.current = resumeTrialIntent }, [resumeTrialIntent])

  const recordTrialIntent = useCallback((origin: TrialIntentOrigin) => recordIntent(origin), [])
  const hasTrialIntent = useCallback(() => hasIntent(), [])
  const clearTrialIntent = useCallback(() => { clearIntent(); setTrialResume(null) }, [])
  const acknowledgeTrialResume = useCallback(() => setTrialResume(null), [])

  const closeGate = useCallback(() => setBlockedAction(null), [])

  const value = useMemo<AccessContextValue>(
    () => ({
      entitlement, can, guard, blockedAction, closeGate, redeem, refresh, beginTrial,
      recordTrialIntent, hasTrialIntent, clearTrialIntent, trialResume, acknowledgeTrialResume,
    }),
    [entitlement, can, guard, blockedAction, closeGate, redeem, refresh, beginTrial,
     recordTrialIntent, hasTrialIntent, clearTrialIntent, trialResume, acknowledgeTrialResume],
  )

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}
