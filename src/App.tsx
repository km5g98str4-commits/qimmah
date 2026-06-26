import { useCallback, useEffect, useState } from 'react'
import { StartView } from '@/views/StartView'
import { SetupView } from '@/views/SetupView'
import { DashboardView } from '@/views/DashboardView'
import { DemoView } from '@/views/DemoView'
import type { AppView } from '@/components/AppNav'
import { useCustomization } from '@/lib/customizationContext'
import { type Customization, getDefaultCustomization } from '@/lib/customization'
import { loadOnboarding, markCompleted } from '@/lib/onboarding'
import { applyLanguage } from '@/lib/appPreferences'
import { type AppRoute, routeFromHash, setHashRoute } from '@/lib/appRoutes'

// اللغة مثبّتة على العربية حاليًا (الإنجليزية مخفية حتى اكتمال الترجمة).
const LANG = 'ar' as const

/** يطبّق حراسة الإعداد: #/dashboard لإعداد غير مكتمل → الإعداد إن بدأ، وإلا البداية. */
function guardRoute(route: AppRoute): AppRoute {
  const ob = loadOnboarding()
  if (route === 'dashboard' && !ob.completed) return (ob.lastStep ?? 0) > 0 ? 'setup' : 'start'
  return route
}

function initialRoute(): AppRoute {
  const r = routeFromHash()
  if (r) return guardRoute(r)
  return loadOnboarding().completed ? 'dashboard' : 'start'
}

/** قشرة تطبيق قِمّة v2 — توجيه بسيط عبر hash (بلا مكتبات خارجية). */
export default function App() {
  const { applyCustomization } = useCustomization()

  useEffect(() => {
    applyLanguage(LANG)
  }, [])

  const [view, setView] = useState<AppRoute>(() => initialRoute())
  const [startStep, setStartStep] = useState<number>(() => loadOnboarding().lastStep ?? 0)
  const [showSuccess, setShowSuccess] = useState(false)
  const dismissSuccess = useCallback(() => setShowSuccess(false), [])

  // view → hash
  useEffect(() => {
    setHashRoute(view)
  }, [view])

  // hash → view (تنقّل المتصفح / تحديث الصفحة) مع الحراسة
  useEffect(() => {
    const onHash = () => {
      const r = routeFromHash()
      if (r) setView(guardRoute(r))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const openSetup = () => {
    const ob = loadOnboarding()
    setStartStep(ob.completed ? 1 : (ob.lastStep ?? 0))
    setView('setup')
  }

  const closeSetup = (completed?: boolean) => {
    const done = completed || loadOnboarding().completed
    setView(done ? 'dashboard' : 'start')
    if (completed) setShowSuccess(true)
  }

  const closeDemo = () => setView(loadOnboarding().completed ? 'dashboard' : 'start')

  // استيراد نسخة سابقة من ملف على الجهاز
  const importFromFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const p = JSON.parse(String(reader.result)) as Partial<Customization>
        const base = getDefaultCustomization()
        applyCustomization({
          identity: { ...base.identity, ...(p.identity ?? {}) },
          colors: { ...base.colors, ...(p.colors ?? {}) },
          sections: { ...base.sections, ...(p.sections ?? {}) },
          profile: { ...base.profile, ...(p.profile ?? {}) },
          targets: { ...base.targets, ...(p.targets ?? {}) },
          targetsMeta: { ...base.targetsMeta, ...(p.targetsMeta ?? {}) },
          workoutPlan: p.workoutPlan ?? base.workoutPlan,
          nutritionPlan: p.nutritionPlan ? { ...base.nutritionPlan, ...p.nutritionPlan } : base.nutritionPlan,
          wellnessPlan: p.wellnessPlan ? { ...base.wellnessPlan, ...p.wellnessPlan } : base.wellnessPlan,
          commitmentPlan: p.commitmentPlan ? { ...base.commitmentPlan, ...p.commitmentPlan } : base.commitmentPlan,
          measurementPlan: p.measurementPlan ? { ...base.measurementPlan, ...p.measurementPlan } : base.measurementPlan,
          workouts: p.workouts ?? base.workouts,
          supplements: p.supplements ?? base.supplements,
          meals: p.meals ?? base.meals,
          metrics: p.metrics ?? base.metrics,
          routine: p.routine ?? base.routine,
        })
        markCompleted()
        setView('dashboard')
      } catch {
        /* ملف غير صالح — تجاهل */
      }
    }
    reader.readAsText(file)
  }

  // تنقّل شريط التطبيق
  const navigate = (v: AppView) => {
    if (v === 'setup') openSetup()
    else setView(v)
  }

  if (view === 'start') {
    const ob = loadOnboarding()
    return (
      <StartView
        lang={LANG}
        hasStartedSetup={!ob.completed && (ob.lastStep ?? 0) > 0}
        onStartSetup={openSetup}
        onSeeDemo={() => setView('demo')}
        onImportFile={importFromFile}
      />
    )
  }

  if (view === 'setup') {
    return <SetupView onClose={closeSetup} initialStep={startStep} />
  }

  if (view === 'demo') {
    return <DemoView lang={LANG} onNavigate={navigate} onBack={closeDemo} />
  }

  return (
    <DashboardView
      lang={LANG}
      onNavigate={navigate}
      onOpenSetup={openSetup}
      showSuccess={showSuccess}
      onDismissSuccess={dismissSuccess}
    />
  )
}
