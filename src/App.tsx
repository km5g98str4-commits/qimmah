import { useCallback, useEffect, useState } from 'react'
import { StartView } from '@/views/StartView'
import { LoginView } from '@/views/LoginView'
import { SetupView } from '@/views/SetupView'
import { DashboardView } from '@/views/DashboardView'
import { DemoView } from '@/views/DemoView'
import { PrivacyView } from '@/views/PrivacyView'
import { TermsView } from '@/views/TermsView'
import { SettingsView } from '@/views/SettingsView'
import { Icon } from '@/components/Icon'
import { useCustomization } from '@/lib/customizationContext'
import { useAuth } from '@/lib/authContext'
import { disableGuest, enableGuest, isGuest } from '@/lib/appMode'
import { type Customization, getDefaultCustomization } from '@/lib/customization'
import { loadOnboarding, markCompleted } from '@/lib/onboarding'
import { applyLanguage } from '@/lib/appPreferences'
import { type AppRoute, routeFromHash, setHashRoute } from '@/lib/appRoutes'

// اللغة مثبّتة على العربية حاليًا (الإنجليزية مخفية حتى اكتمال الترجمة).
const LANG = 'ar' as const

const PROTECTED_ROUTES: AppRoute[] = ['setup', 'dashboard', 'settings']

/** شاشة تحميل بسيطة أثناء التحقق من جلسة المصادقة. */
function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-900">
      <span className="grid h-14 w-14 animate-float place-items-center rounded-2xl bg-primary text-white shadow-glow">
        <Icon name="Dumbbell" className="h-7 w-7" strokeWidth={2.5} />
      </span>
    </div>
  )
}

/** قشرة تطبيق قِمّة — توجيه عبر hash مع حراسة حساب (سحابي/ضيف) وعزل النموذج. */
export default function App() {
  const auth = useAuth()
  const { applyCustomization } = useCustomization()

  useEffect(() => {
    applyLanguage(LANG)
  }, [])

  // null = لم يُحسم بعد (ننتظر انتهاء تحميل المصادقة لاختيار وجهة افتراضية).
  const [route, setRouteState] = useState<AppRoute | null>(() => routeFromHash())
  const [startStep, setStartStep] = useState<number>(() => loadOnboarding().lastStep ?? 0)
  const [setupMode, setSetupMode] = useState<'onboarding' | 'advanced'>(() =>
    loadOnboarding().completed ? 'advanced' : 'onboarding',
  )
  const [showSuccess, setShowSuccess] = useState(false)
  const dismissSuccess = useCallback(() => setShowSuccess(false), [])

  const hasAccount = !!auth.user || isGuest()

  // الحراسة: المسارات المحمية تتطلّب حسابًا (سحابيًا أو ضيفًا)، وإلا → البداية.
  const guard = useCallback(
    (r: AppRoute): AppRoute => {
      if (PROTECTED_ROUTES.includes(r) && !hasAccount) return 'start'
      return r
    },
    [hasAccount],
  )

  /** تنقّل صريح داخل التطبيق (يتجاوز حراسة الحساب لأنّ الانتقال مقصود). */
  const setRoute = useCallback((r: AppRoute) => {
    setRouteState(r)
    setHashRoute(r)
  }, [])

  // مزامنة route → hash
  useEffect(() => {
    if (route) setHashRoute(route)
  }, [route])

  // hash → route (تنقّل المتصفح) مع الحراسة
  useEffect(() => {
    const onHash = () => {
      const r = routeFromHash()
      if (r) setRouteState(guard(r))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [guard])

  // بعد انتهاء تحميل المصادقة: احسم الوجهة الافتراضية أو أعد تطبيق الحراسة.
  useEffect(() => {
    if (auth.loading) return
    setRouteState((prev) => {
      if (prev === null) {
        const completed = loadOnboarding().completed
        if (hasAccount && completed) return 'dashboard'
        if (hasAccount) return 'setup'
        return 'start'
      }
      return guard(prev)
    })
  }, [auth.loading, hasAccount, guard])

  const openSetup = useCallback(() => {
    const ob = loadOnboarding()
    setSetupMode(ob.completed ? 'advanced' : 'onboarding')
    setStartStep(ob.completed ? 0 : (ob.lastStep ?? 0))
    setRoute('setup')
  }, [setRoute])

  const closeSetup = (completed?: boolean) => {
    const done = completed || loadOnboarding().completed
    setRoute(done ? 'dashboard' : 'start')
    if (completed) setShowSuccess(true)
  }

  const goHome = useCallback(() => {
    setRoute(loadOnboarding().completed ? 'dashboard' : 'setup')
  }, [setRoute])

  // اختيار «المتابعة كضيف» — يفعّل وضع الضيف ثم يدخل الإعداد أو الرئيسية.
  const continueAsGuest = useCallback(() => {
    enableGuest()
    setRoute(loadOnboarding().completed ? 'dashboard' : 'setup')
  }, [setRoute])

  // نجاح المصادقة السحابية.
  const onAuthed = useCallback(() => {
    setRoute(loadOnboarding().completed ? 'dashboard' : 'setup')
  }, [setRoute])

  // تسجيل الخروج (من الإعدادات) — يرجع للبداية بلا تسريب.
  const logout = useCallback(async () => {
    await auth.signOut()
    disableGuest()
    setRoute('start')
  }, [auth, setRoute])

  const closeDemo = () => setRoute(hasAccount && loadOnboarding().completed ? 'dashboard' : 'start')

  // استيراد نسخة سابقة من ملف على الجهاز (يدخل المستخدم كضيف ويفتح الرئيسية).
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
        enableGuest()
        setRoute('dashboard')
      } catch {
        /* ملف غير صالح — تجاهل */
      }
    }
    reader.readAsText(file)
  }

  // أثناء تحميل المصادقة أو قبل حسم الوجهة → شاشة تحميل.
  if (auth.loading || route === null) return <Splash />

  if (route === 'start') {
    return (
      <StartView
        lang={LANG}
        onLogin={() => setRoute('login')}
        onGuest={continueAsGuest}
        onSeeDemo={() => setRoute('demo')}
        onImportFile={importFromFile}
      />
    )
  }

  if (route === 'login') {
    return (
      <LoginView
        lang={LANG}
        onAuthed={onAuthed}
        onGuest={continueAsGuest}
        onBack={() => setRoute('start')}
      />
    )
  }

  if (route === 'setup') {
    return <SetupView onClose={closeSetup} initialStep={startStep} mode={setupMode} />
  }

  if (route === 'demo') {
    return <DemoView lang={LANG} onExit={closeDemo} />
  }

  const backToHome = () => setRoute(loadOnboarding().completed ? 'dashboard' : 'start')

  if (route === 'privacy') {
    return <PrivacyView onBack={backToHome} />
  }

  if (route === 'terms') {
    return <TermsView onBack={backToHome} />
  }

  if (route === 'settings') {
    return (
      <SettingsView
        lang={LANG}
        onBack={() => setRoute('dashboard')}
        onOpenSetup={openSetup}
        onOpenPrivacy={() => setRoute('privacy')}
        onOpenTerms={() => setRoute('terms')}
        onLogin={() => setRoute('login')}
        onLogout={logout}
      />
    )
  }

  return (
    <DashboardView
      lang={LANG}
      onHome={goHome}
      onOpenSetup={openSetup}
      onOpenSettings={() => setRoute('settings')}
      showSuccess={showSuccess}
      onDismissSuccess={dismissSuccess}
    />
  )
}
