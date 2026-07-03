import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  type Customization,
  getDefaultCustomization,
  loadCustomization,
  saveCustomization,
  clearCustomization,
} from './customization'

interface CustomizationContextValue {
  customization: Customization
  /** يطبّق نسخة جديدة كاملة ويحفظها في localStorage (يُستدعى عند الحفظ من المركز). */
  applyCustomization: (next: Customization) => void
  /** يمسح المحفوظ ويعيد القيم الافتراضية من config/data. */
  resetCustomization: () => void
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
  const [customization, setCustomization] = useState<Customization>(() => loadCustomization())

  // طبّق الألوان عند الإقلاع وعند كل تغيير
  useEffect(() => {
    applyColorVars(customization.colors)
  }, [customization.colors])

  const applyCustomization = useCallback((next: Customization) => {
    setCustomization(next)
    saveCustomization(next)
  }, [])

  const resetCustomization = useCallback(() => {
    clearCustomization()
    setCustomization(getDefaultCustomization())
  }, [])

  const value = useMemo(
    () => ({ customization, applyCustomization, resetCustomization }),
    [customization, applyCustomization, resetCustomization],
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
      applyCustomization: () => {},
      resetCustomization: () => {},
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
