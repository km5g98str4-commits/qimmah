import { useCallback, useEffect, useState } from 'react'
import { StartView } from '@/views/StartView'
import { SetupView } from '@/views/SetupView'
import { DashboardView } from '@/views/DashboardView'
import { DemoView } from '@/views/DemoView'
import type { AppView } from '@/components/AppNav'
import { useCustomization } from '@/lib/customizationContext'
import { type Customization, getDefaultCustomization } from '@/lib/customization'
import { loadOnboarding, markCompleted } from '@/lib/onboarding'
import { type Lang, applyLanguage, getLanguage, setLanguage } from '@/lib/appPreferences'

type View = 'start' | 'setup' | 'dashboard' | 'demo'

/** قشرة تطبيق قِمّة v2 — موجّه بسيط بين الشاشات (بلا توجيه/مكتبات خارجية). */
export default function App() {
  const { applyCustomization } = useCustomization()

  // اللغة
  const [lang, setLang] = useState<Lang>(() => getLanguage())
  useEffect(() => {
    applyLanguage(lang)
  }, [lang])
  const changeLang = useCallback((l: Lang) => {
    setLanguage(l)
    setLang(l)
  }, [])

  // الشاشة الحالية: إعداد مكتمل → الرئيسية، وإلا شاشة البداية أولًا
  const [view, setView] = useState<View>(() => (loadOnboarding().completed ? 'dashboard' : 'start'))
  const [startStep, setStartStep] = useState<number>(() => loadOnboarding().lastStep ?? 0)
  const [showSuccess, setShowSuccess] = useState(false)
  const dismissSuccess = useCallback(() => setShowSuccess(false), [])

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
        lang={lang}
        hasStartedSetup={!ob.completed && (ob.lastStep ?? 0) > 0}
        onStartSetup={openSetup}
        onSeeDemo={() => setView('demo')}
        onImportFile={importFromFile}
        onChangeLang={changeLang}
      />
    )
  }

  if (view === 'setup') {
    return <SetupView onClose={closeSetup} initialStep={startStep} />
  }

  if (view === 'demo') {
    return <DemoView lang={lang} onNavigate={navigate} onChangeLang={changeLang} onBack={closeDemo} />
  }

  return (
    <DashboardView
      lang={lang}
      onNavigate={navigate}
      onChangeLang={changeLang}
      onOpenSetup={openSetup}
      showSuccess={showSuccess}
      onDismissSuccess={dismissSuccess}
    />
  )
}
