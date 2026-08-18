import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  type Customization,
  type CustomizationLoadState,
  type RecoveryOutcome,
  getDefaultCustomization,
  readCustomization,
  recoverCustomizationFromOnboarding,
  saveCustomization,
  clearCustomization,
} from './customization'
import { onStorageFailure, type StorageFailure, type WriteResult } from './safeStorage'

interface CustomizationContextValue {
  customization: Customization
  /**
   * [SOVEREIGN-RECOVERY-001] حالة القراءة الصريحة. كل سطح يستطيع الآن التفريق:
   * `absent` = لا خطة بعد · `recoverable` = تعذّرت القراءة ونقدر نعيد بناءها من
   * الإعداد · `unreadable` = تعذّرت ولا مصدر · `storage-blocked` = التخزين محجوب.
   * وحين لا تكون `saved`، فـ`customization.isDefault === true` — أي **ليست خطته**.
   */
  planState: CustomizationLoadState
  /**
   * يطبّق نسخة جديدة كاملة ويحفظها. **يُرجع نتيجة الكتابة** — فمن يعرض شاشة
   * نجاح ملزَم بفحصها (الميثاق §5: لا شاشة نجاح قبل تأكيد الكتابة).
   */
  applyCustomization: (next: Customization) => WriteResult
  /** يمسح المحفوظ ويعيد القيم الافتراضية من config/data. */
  resetCustomization: () => void
  /**
   * يعيد بناء الخطة من ملف الإعداد السليم — **بلا اشتراط استحقاق**: استرجاع ما
   * أتلفه تخزيننا ليس `plan.saveEdit`. يُستدعى بقبول المستخدم لا تلقائيًا
   * (الميثاق §8/قرار ٣: تغييرات الخطة اقتراح دائمًا في v1).
   */
  recoverPlan: () => Promise<RecoveryOutcome>
  /**
   * آخر فشل كتابة عالمي. كان `onStorageFailure` **بلا مشترك واحد** في التطبيق
   * كلّه — أي أن آلة الصدق كانت مبنيّة ولا أحد يسمعها. هذا هو المشترك.
   */
  storageFailure: StorageFailure | null
  /** نتيجة آخر كتابة تخصيص (`null` = لم تُحاوَل بعد). `'ok'` وحدها تعني الهبوط. */
  lastWrite: WriteResult | null
}

const CustomizationContext = createContext<CustomizationContextValue | null>(null)

/** يطبّق ألوان التخصيص كمتغيرات CSS على عنصر الجذر — تنعكس على كل الواجهة. */
function applyColorVars(colors: Customization['colors']) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--c-primary', colors.primary)
  root.style.setProperty('--c-accent', colors.accent)
}

/** مزوّد التخصيص — يقرأ من localStorage عند الإقلاع ويوفّر البيانات لكل التطبيق. */
export function CustomizationProvider({ children }: { children: ReactNode }) {
  const [load, setLoad] = useState(() => readCustomization())
  const [storageFailure, setStorageFailure] = useState<StorageFailure | null>(null)
  const [lastWrite, setLastWrite] = useState<WriteResult | null>(null)
  const customization = load.customization

  // طبّق الألوان عند الإقلاع وعند كل تغيير
  useEffect(() => {
    applyColorVars(customization.colors)
  }, [customization.colors])

  // المشترك الوحيد في مؤشّر فشل التخزين — بلا هذا يبقى المؤشّر يصرخ في غرفة فارغة.
  useEffect(() => onStorageFailure(setStorageFailure), [])

  const applyCustomization = useCallback((next: Customization): WriteResult => {
    // البيانات تبقى معروضة أيًّا كانت النتيجة (هي مُدخَل المستخدم، لا اختلاق):
    // ما يتغيّر هو أننا **نقول الحقيقة** عن هبوطها على القرص.
    const clean: Customization = { ...next }
    delete clean.isDefault
    const result = saveCustomization(clean)
    // عند الفشل: الحالة تُقرأ من التخزين نفسه (محجوب/غائب/تالف) بينما القيمة
    // المعروضة تبقى **قيمة المستخدم** — لا تُفقد، ولا تُقدَّم على أنها محفوظة.
    setLoad({ state: result === 'ok' ? 'saved' : readCustomization().state, customization: clean })
    setLastWrite(result)
    return result
  }, [])

  const resetCustomization = useCallback(() => {
    clearCustomization()
    setLoad({ state: 'absent', customization: { ...getDefaultCustomization(), isDefault: true } })
    setLastWrite(null)
  }, [])

  const recoverPlan = useCallback(async (): Promise<RecoveryOutcome> => {
    const outcome = await recoverCustomizationFromOnboarding()
    setLoad(readCustomization())
    setLastWrite(outcome.ok ? 'ok' : (outcome.write ?? null))
    return outcome
  }, [])

  const value = useMemo(
    () => ({
      customization,
      planState: load.state,
      applyCustomization,
      resetCustomization,
      recoverPlan,
      storageFailure,
      lastWrite,
    }),
    [customization, load.state, applyCustomization, resetCustomization, recoverPlan, storageFailure, lastWrite],
  )

  return <CustomizationContext.Provider value={value}>{children}</CustomizationContext.Provider>
}

/**
 * مزوّد قيمة ثابتة للعرض فقط — بلا حفظ وبلا تغيير ألوان عامة.
 * يستخدمه وضع النموذج (demoCustomization) — انتقل بناء بيانات النموذج إلى ملفه
 * الخاص (P11.5) كي لا يسحب مولّد الخطط إلى حزمة الإقلاع عبر هذا المزوّد المشترك.
 */
export function StaticCustomizationProvider({
  customization,
  children,
}: {
  customization: Customization
  children: ReactNode
}) {
  const value = useMemo<CustomizationContextValue>(
    () => ({
      customization,
      planState: 'saved' as const,
      applyCustomization: () => 'ok' as const,
      resetCustomization: () => {},
      recoverPlan: async () => ({ ok: false, reason: 'not-needed' }) as RecoveryOutcome,
      storageFailure: null,
      lastWrite: null,
    }),
    [customization],
  )
  return <CustomizationContext.Provider value={value}>{children}</CustomizationContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCustomization(): CustomizationContextValue {
  const ctx = useContext(CustomizationContext)
  if (!ctx) throw new Error('useCustomization يجب استخدامه داخل CustomizationProvider')
  return ctx
}
