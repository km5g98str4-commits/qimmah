import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  type Customization,
  getDefaultCustomization,
  loadCustomization,
  saveCustomization,
  clearCustomization,
} from './customization'
import { generatePlan } from './planGenerator'

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

/** يبني نسخة عرض غنية للنموذج (دون حفظ) — خطة مولّدة ومتّسقة. */
function buildDemoCustomization(): Customization {
  const base = getDefaultCustomization()
  // النموذج التجريبي فقط يستخدم اسمًا توضيحيًا «أحمد محمد» (لا يظهر في إعداد المستخدم الحقيقي).
  const demoProfile = { ...base.profile, name: 'أحمد محمد' }
  const g = generatePlan(demoProfile)
  return {
    ...base,
    // هوية عيّنة للنموذج فقط (واضح أنها تجريبية) — لا تُكتب في تخزين المستخدم.
    identity: {
      ...base.identity,
      userName: 'أحمد (نموذج)',
      mainGoal: 'الوصول إلى 78 كجم وتحسين شكل الجسم',
    },
    profile: demoProfile,
    targets: g.targets,
    workoutPlan: g.workoutPlan,
    routine: g.weeklySchedule,
    nutritionPlan: g.nutritionPlan,
    commitmentPlan: g.commitmentPlan,
    measurementPlan: g.measurementPlan,
    wellnessPlan: {
      ...base.wellnessPlan,
      // عيّنة دواء للمتابعة (الجرعة مُدخلة كمثال فقط — ليست توصية)
      medications: [
        {
          id: 'demo-med-1',
          medicationId: 'vitamin-d-rx',
          dose: 'حبة',
          timing: 'مع الإفطار',
          frequency: 'أسبوعيًا',
          beforeAfterFood: 'with',
          notes: '',
          doctorNote: 'حسب وصف الطبيب',
          order: 0,
        },
      ],
    },
  }
}

/** مزوّد للعرض فقط (النموذج) — بيانات تجريبية غنية، بلا حفظ وبلا تغيير ألوان عامة. */
export function DemoCustomizationProvider({ children }: { children: ReactNode }) {
  const [customization] = useState<Customization>(() => buildDemoCustomization())
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

export function useCustomization(): CustomizationContextValue {
  const ctx = useContext(CustomizationContext)
  if (!ctx) throw new Error('useCustomization يجب استخدامه داخل CustomizationProvider')
  return ctx
}
