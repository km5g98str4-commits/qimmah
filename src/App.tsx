import { useCallback, useEffect, useState } from 'react'
import { StartView } from '@/views/StartView'
import { LoginView } from '@/views/LoginView'
import { SetupView } from '@/views/SetupView'
import { DashboardView } from '@/views/DashboardView'
import { WorkoutView } from '@/views/WorkoutView'
import { ExerciseLibraryView } from '@/views/ExerciseLibraryView'
import { NutritionView } from '@/views/NutritionView'
import { ProgressView } from '@/views/ProgressView'
import { ProfileView } from '@/views/ProfileView'
import { DemoView } from '@/views/DemoView'
import { SettingsView } from '@/views/SettingsView'
import { PrivacyView } from '@/views/PrivacyView'
import { TermsView } from '@/views/TermsView'
import { MobileShell, type MainTab } from '@/components/MobileShell'
import type { AppBadge } from '@/components/AppNav'
import { useAuth } from '@/lib/authContext'
import { loadOnboarding } from '@/lib/onboarding'
import { ensureOnboardingProfile } from '@/lib/onboardingProfile'
import { applyLanguage } from '@/lib/appPreferences'
import { type AppRoute, MAIN_TABS, routeFromHash, setHashRoute } from '@/lib/appRoutes'
import { SuccessToast } from '@/components/SuccessToast'
import { BUILD_LABEL } from '@/lib/buildInfo'

// اللغة مثبّتة على العربية حاليًا (الإنجليزية مخفية حتى اكتمال الترجمة).
const LANG = 'ar' as const

/**
 * حراسة المسار: التبويبات الرئيسية لا تُفتح أبدًا قبل إكمال إعداد حقيقي
 * (وبالتالي لا تظهر بيانات افتراضية/نموذجية في اللوحة الحقيقية).
 */
function guardRoute(route: AppRoute): AppRoute {
  // التبويبات الرئيسية + مكتبة التمارين كلها تتطلّب إعدادًا مكتملًا.
  if (MAIN_TABS.includes(route) || route === 'exercises') {
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
  const auth = useAuth()
  const badge: AppBadge = auth.user ? 'account' : 'guest'

  useEffect(() => {
    applyLanguage(LANG)
    // هجرة لمرّة واحدة لمصدر الحقيقة (تحفظ المستخدمين الحاليين؛ آمنة للجدد).
    ensureOnboardingProfile()
    // معرّف البناء في الـ console — للتحقق من نشر النسخة الصحيحة.
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
        // المسارات الصالحة كلها مُعرّفة في appRoutes ولا تصل هنا.
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

  // تنقّل عام — يمرّ عبر الحراسة حتى لا تُفتح لوحة بلا إعداد.
  const navigate = (v: AppRoute) => {
    if (v === 'setup') openSetup()
    else setView(guardRoute(v))
  }

  // ——— الشاشات العامة (قبل الدخول) ———
  if (view === 'start') {
    const ob = loadOnboarding()
    return (
      <StartView
        lang={LANG}
        hasStartedSetup={!ob.completed && (ob.lastStep ?? 0) > 0}
        onBuildPlan={openSetup}
        onLogin={() => setView('login')}
        onContinueGuest={enterApp}
        onSeeDemo={() => setView('demo')}
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

  // ——— التبويبات الرئيسية داخل قشرة الجوال ———
  return (
    <>
      <MobileShell
        lang={LANG}
        tab={(view === 'exercises' ? 'workout' : view) as MainTab}
        badge={badge}
        onNavigate={navigate}
        onOpenSettings={() => setView('settings')}
      >
        {view === 'dashboard' && <DashboardView lang={LANG} onNavigate={navigate} />}
        {view === 'workout' && <WorkoutView lang={LANG} onNavigate={navigate} />}
        {view === 'exercises' && <ExerciseLibraryView lang={LANG} />}
        {view === 'nutrition' && <NutritionView lang={LANG} />}
        {view === 'progress' && <ProgressView lang={LANG} />}
        {view === 'profile' && <ProfileView lang={LANG} onNavigate={navigate} />}
      </MobileShell>

      {showSuccess && <SuccessToast onClose={dismissSuccess} />}
    </>
  )
}
