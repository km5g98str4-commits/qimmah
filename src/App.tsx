import { useCallback, useEffect, useState } from 'react'
import { StartView } from '@/views/StartView'
import { LoginView } from '@/views/LoginView'
import { SetupView } from '@/views/SetupView'
import { DashboardView } from '@/views/DashboardView'
import { DemoView } from '@/views/DemoView'
import { SettingsView } from '@/views/SettingsView'
import { PrivacyView } from '@/views/PrivacyView'
import { TermsView } from '@/views/TermsView'
import type { AppView } from '@/components/AppNav'
import { loadOnboarding } from '@/lib/onboarding'
import { applyLanguage } from '@/lib/appPreferences'
import { type AppRoute, routeFromHash, setHashRoute } from '@/lib/appRoutes'
import { BUILD_LABEL } from '@/lib/buildInfo'

// اللغة مثبّتة على العربية حاليًا (الإنجليزية مخفية حتى اكتمال الترجمة).
const LANG = 'ar' as const

/**
 * حراسة المسار: #/dashboard لا يُفتح أبدًا قبل إكمال إعداد حقيقي
 * (وبالتالي لا تظهر بيانات افتراضية/نموذجية في اللوحة الحقيقية).
 */
function guardRoute(route: AppRoute): AppRoute {
  if (route === 'dashboard') {
    const ob = loadOnboarding()
    if (!ob.completed) return (ob.lastStep ?? 0) > 0 ? 'setup' : 'start'
  }
  return route
}

function initialRoute(): AppRoute {
  const r = routeFromHash()
  if (r) return guardRoute(r)
  return loadOnboarding().completed ? 'dashboard' : 'start'
}

/** قشرة تطبيق قِمّة — توجيه بسيط عبر hash (بلا مكتبات خارجية). */
export default function App() {
  useEffect(() => {
    applyLanguage(LANG)
    // معرّف البناء في الـ console — للتحقق من نشر النسخة الصحيحة (Netlify).
    console.info(`%cقِمّة ${BUILD_LABEL}`, 'color:#F26A21;font-weight:bold')
  }, [])

  const [view, setView] = useState<AppRoute>(() => initialRoute())
  const [startStep, setStartStep] = useState<number>(() => loadOnboarding().lastStep ?? 0)
  const [setupMode, setSetupMode] = useState<'onboarding' | 'advanced'>(() =>
    loadOnboarding().completed ? 'advanced' : 'onboarding',
  )
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
      if (r) {
        setView(guardRoute(r))
      } else if (window.location.hash && window.location.hash !== '#/') {
        // مسار غير معروف (مثل #/xyz) → وجهة آمنة + تصحيح العنوان صراحةً.
        // المسارات الصالحة (ومنها #/login) تُعالَج في الفرع أعلاه ولا تصل هنا.
        const target = loadOnboarding().completed ? 'dashboard' : 'start'
        setView(target)
        setHashRoute(target)
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const openSetup = useCallback(() => {
    const ob = loadOnboarding()
    setSetupMode(ob.completed ? 'advanced' : 'onboarding')
    setStartStep(ob.completed ? 0 : (ob.lastStep ?? 0))
    setView('setup')
  }, [])

  /** دخول التطبيق بعد تسجيل الدخول أو المتابعة كضيف. */
  const enterApp = useCallback(() => {
    if (loadOnboarding().completed) setView('dashboard')
    else openSetup()
  }, [openSetup])

  const closeSetup = (completed?: boolean) => {
    const done = completed || loadOnboarding().completed
    setView(done ? 'dashboard' : 'start')
    if (completed) setShowSuccess(true)
  }

  const closeDemo = () => setView(loadOnboarding().completed ? 'dashboard' : 'start')

  // تنقّل شريط التطبيق — يمرّ عبر الحراسة حتى لا تُفتح لوحة بلا إعداد.
  const navigate = (v: AppView) => {
    if (v === 'setup') openSetup()
    else setView(guardRoute(v as AppRoute))
  }

  // ——— الشاشات العامة (قبل الدخول) ———
  if (view === 'start') {
    const ob = loadOnboarding()
    return (
      <StartView
        lang={LANG}
        hasStartedSetup={!ob.completed && (ob.lastStep ?? 0) > 0}
        onLogin={() => setView('login')}
        onContinueGuest={enterApp}
        onSeeDemo={() => setView('demo')}
        onContinueSetup={openSetup}
      />
    )
  }

  if (view === 'login') {
    return <LoginView lang={LANG} onSuccess={enterApp} onGuest={enterApp} onBack={() => setView('start')} />
  }

  if (view === 'privacy') {
    return <PrivacyView lang={LANG} onBack={() => window.history.back()} />
  }

  if (view === 'terms') {
    return <TermsView lang={LANG} onBack={() => window.history.back()} />
  }

  // ——— شاشات داخل التطبيق ———
  if (view === 'setup') {
    return <SetupView onClose={closeSetup} initialStep={startStep} mode={setupMode} />
  }

  if (view === 'demo') {
    return <DemoView lang={LANG} onNavigate={navigate} onBack={closeDemo} />
  }

  if (view === 'settings') {
    return (
      <SettingsView
        lang={LANG}
        onNavigate={navigate}
        onEditPlan={openSetup}
        onLogin={() => setView('login')}
        onOpenPrivacy={() => setView('privacy')}
        onOpenTerms={() => setView('terms')}
      />
    )
  }

  return (
    <DashboardView
      lang={LANG}
      onNavigate={navigate}
      showSuccess={showSuccess}
      onDismissSuccess={dismissSuccess}
    />
  )
}
