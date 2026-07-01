import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
// شاشة البداية (الهبوط) تبقى مُحمّلة مباشرةً لأول رسم سريع.
import { StartView } from '@/views/StartView'
import { AppLoading } from '@/components/AppLoading'
// باقي الشاشات مُقسّمة إلى حِزم عند الطلب (code-splitting) لتقليل حزمة الدخول الأولى.
const LoginView = lazy(() => import('@/views/LoginView').then((m) => ({ default: m.LoginView })))
const SetupView = lazy(() => import('@/views/SetupView').then((m) => ({ default: m.SetupView })))
const DashboardView = lazy(() => import('@/views/DashboardView').then((m) => ({ default: m.DashboardView })))
const WorkoutView = lazy(() => import('@/views/WorkoutView').then((m) => ({ default: m.WorkoutView })))
const ExerciseLibraryView = lazy(() =>
  import('@/views/ExerciseLibraryView').then((m) => ({ default: m.ExerciseLibraryView })),
)
const NutritionView = lazy(() => import('@/views/NutritionView').then((m) => ({ default: m.NutritionView })))
const ProgressView = lazy(() => import('@/views/ProgressView').then((m) => ({ default: m.ProgressView })))
const ProfileView = lazy(() => import('@/views/ProfileView').then((m) => ({ default: m.ProfileView })))
const DemoView = lazy(() => import('@/views/DemoView').then((m) => ({ default: m.DemoView })))
const SettingsView = lazy(() => import('@/views/SettingsView').then((m) => ({ default: m.SettingsView })))
const PrivacyView = lazy(() => import('@/views/PrivacyView').then((m) => ({ default: m.PrivacyView })))
const TermsView = lazy(() => import('@/views/TermsView').then((m) => ({ default: m.TermsView })))
const ContactView = lazy(() => import('@/views/ContactView').then((m) => ({ default: m.ContactView })))
const NotFoundView = lazy(() => import('@/views/NotFoundView').then((m) => ({ default: m.NotFoundView })))
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
  // hash موجود لكنه غير معروف (مثل #/asdf) → صفحة 404 بدل التحويل الصامت.
  if (typeof window !== 'undefined' && window.location.hash && window.location.hash !== '#/') {
    return 'notfound'
  }
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

  // آخر مسار غير قانوني (للرجوع الآمن من الخصوصية/الشروط دون الاعتماد على history.back
  // الذي قد يقذف المستخدم خارج التطبيق عند فتح الصفحة مباشرةً/التحديث).
  const beforeLegalRef = useRef<AppRoute>('start')
  useEffect(() => {
    if (view !== 'privacy' && view !== 'terms') beforeLegalRef.current = view
  }, [view])

  // view → hash (نُبقي مسار 404 على hash الخاطئ كما هو حتى لا نطمس الرابط الأصلي).
  useEffect(() => {
    if (view !== 'notfound') setHashRoute(view)
  }, [view])

  // hash → view (تنقّل المتصفح / تحديث الصفحة) مع الحراسة
  useEffect(() => {
    const onHash = () => {
      const r = routeFromHash()
      if (r) {
        setView(guardRoute(r))
      } else if (window.location.hash && window.location.hash !== '#/') {
        // مسار غير معروف (مثل #/xyz) → صفحة 404 المخصّصة (نُبقي الرابط ظاهرًا).
        setView('notfound')
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

  // ——— بناء عنصر الشاشة الحالية ثم لفّه بحدّ Suspense (أسفل المزوّدات حتى تبقى حالتها
  //     محفوظة أثناء تحميل الحِزم عند الطلب) ———
  let content: ReactNode

  if (view === 'start') {
    const ob = loadOnboarding()
    content = (
      <StartView
        lang={LANG}
        hasStartedSetup={!ob.completed && (ob.lastStep ?? 0) > 0}
        onBuildPlan={openSetup}
        onLogin={() => setView('login')}
        onContinueGuest={enterApp}
        onSeeDemo={() => setView('demo')}
      />
    )
  } else if (view === 'login') {
    content = <LoginView lang={LANG} onSuccess={enterApp} onGuest={enterApp} onBack={() => setView('start')} />
  } else if (view === 'privacy') {
    content = <PrivacyView lang={LANG} onBack={() => navigate(beforeLegalRef.current)} />
  } else if (view === 'terms') {
    content = <TermsView lang={LANG} onBack={() => navigate(beforeLegalRef.current)} />
  } else if (view === 'contact') {
    content = <ContactView lang={LANG} onBack={() => window.history.back()} />
  } else if (view === 'notfound') {
    const goHome = () => {
      const target = loadOnboarding().completed ? 'dashboard' : 'start'
      setView(guardRoute(target))
    }
    content = <NotFoundView lang={LANG} onHome={goHome} onBack={() => window.history.back()} />
  } else if (view === 'setup') {
    content = <SetupView onClose={closeSetup} initialStep={startStep} mode={setupMode} />
  } else if (view === 'demo') {
    content = <DemoView lang={LANG} onNavigate={navigate} onBack={closeDemo} />
  } else if (view === 'settings') {
    content = (
      <SettingsView
        lang={LANG}
        onNavigate={navigate}
        onEditPlan={openSetup}
        onLogin={() => setView('login')}
        onOpenPrivacy={() => setView('privacy')}
        onOpenTerms={() => setView('terms')}
      />
    )
  } else {
    // ——— التبويبات الرئيسية داخل قشرة الجوال ———
    content = (
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

  return <Suspense fallback={<AppLoading />}>{content}</Suspense>
}
