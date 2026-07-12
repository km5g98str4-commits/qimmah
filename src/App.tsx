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
const CalcExplainerView = lazy(() =>
  import('@/views/CalcExplainerView').then((m) => ({ default: m.CalcExplainerView })),
)
const DemoView = lazy(() => import('@/views/DemoView').then((m) => ({ default: m.DemoView })))
const SettingsView = lazy(() => import('@/views/SettingsView').then((m) => ({ default: m.SettingsView })))
const PrivacyView = lazy(() => import('@/views/PrivacyView').then((m) => ({ default: m.PrivacyView })))
const TermsView = lazy(() => import('@/views/TermsView').then((m) => ({ default: m.TermsView })))
const ContactView = lazy(() => import('@/views/ContactView').then((m) => ({ default: m.ContactView })))
const NotFoundView = lazy(() => import('@/views/NotFoundView').then((m) => ({ default: m.NotFoundView })))
const ReviewPanelView = lazy(() =>
  import('@/features/products/reviewPanel/ReviewPanelView').then((m) => ({ default: m.ReviewPanelView })),
)
import { MobileShell, type MainTab } from '@/components/MobileShell'
import type { AppBadge } from '@/components/AppNav'
import { useAuth } from '@/lib/authContext'
import { isAccountOnboarded, isOnboardingComplete, loadOnboarding } from '@/lib/onboarding'
import { ensureOnboardingProfile } from '@/lib/onboardingProfile'
import { currentUserId, hydrateOnboardingFromProfile } from '@/lib/onboardingSync'
import { useLanguage } from '@/i18n'
import { type AppRoute, MAIN_TABS, routeFromHash, setHashRoute } from '@/lib/appRoutes'
import { SuccessToast } from '@/components/SuccessToast'
import { AchievementToaster } from '@/features/achievements/AchievementToaster'
import { BUILD_LABEL } from '@/lib/buildInfo'
import { isDesignV2Preview, loadDesignV2Fonts } from '@/config/designV2'

/**
 * حراسة المسار: التبويبات الرئيسية لا تُفتح أبدًا قبل إكمال إعداد حقيقي **لهذا الحساب**
 * (وبالتالي حساب جديد يُطالَب بالإعداد ولو أُكمل على الجهاز بحساب آخر).
 */
function guardRoute(route: AppRoute, userId: string | null): AppRoute {
  // التبويبات الرئيسية + مكتبة التمارين كلها تتطلّب إعدادًا مكتملًا.
  if (MAIN_TABS.includes(route) || route === 'exercises') {
    if (!isOnboardingComplete(userId)) {
      // مسجّل دخول لم يُكمل → مباشرةً لمعالج الإعداد؛ ضيف بمسودة بدأها → استئناف الإعداد؛
      // وإلا شاشة البداية.
      if (userId) return 'setup'
      return (loadOnboarding().lastStep ?? 0) > 0 ? 'setup' : 'start'
    }
  }
  return route
}

function initialRoute(userId: string | null): AppRoute {
  const r = routeFromHash()
  if (r) return guardRoute(r, userId)
  // hash موجود لكنه غير معروف (مثل #/asdf) → صفحة 404 بدل التحويل الصامت.
  if (typeof window !== 'undefined' && window.location.hash && window.location.hash !== '#/') {
    return 'notfound'
  }
  return isOnboardingComplete(userId) ? 'dashboard' : 'start'
}

/** قشرة تطبيق قِمّة — توجيه بسيط عبر hash (بلا مكتبات خارجية). */
export default function App() {
  const designV2 = isDesignV2Preview()
  const auth = useAuth()
  // اللغة الحية من سياق i18n — التبديل يعيد رسم كل الشاشات فورًا (بلا إعادة تحميل).
  const { lang: LANG } = useLanguage()
  const badge: AppBadge = auth.user ? 'account' : 'guest'
  // المالك الحالي لقرار البوابة: معرّف الحساب المسجّل، أو null لوضع الضيف.
  const uid = auth.user?.id ?? null

  useEffect(() => {
    loadDesignV2Fonts()
    // تطبيق اللغة/الاتجاه يتكفّل به LanguageProvider. هنا هجرات لمرّة واحدة فقط.
    ensureOnboardingProfile()
    // معرّف البناء في الـ console — للتحقق من نشر النسخة الصحيحة.
    console.info(`%cقِمّة ${BUILD_LABEL}`, 'color:#F26A21;font-weight:bold')
  }, [])

  const [view, setView] = useState<AppRoute>(() => initialRoute(auth.user?.id ?? null))
  // هل حُسم مسار الإقلاع الأول *بعد* جهوزية المصادقة؟ يمنع تثبيت شاشة البداية/الدخول
  // بينما الجلسة ما زالت تُستعاد بشكل غير متزامن (سبب مطالبة المستخدم بالدخول كل مرة).
  const didInitialAuthRoute = useRef(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const dismissSuccess = useCallback(() => setShowSuccess(false), [])

  // آخر مسار غير قانوني (للرجوع الآمن من الخصوصية/الشروط دون الاعتماد على history.back
  // الذي قد يقذف المستخدم خارج التطبيق عند فتح الصفحة مباشرةً/التحديث).
  const beforeLegalRef = useRef<AppRoute>('start')
  useEffect(() => {
    if (view !== 'privacy' && view !== 'terms') beforeLegalRef.current = view
  }, [view])

  // view → hash (نُبقي مسار 404 على hash الخاطئ كما هو حتى لا نطمس الرابط الأصلي).
  // مهم: لا نكتب الـ hash قبل حسم مسار الإقلاع الأول بعد استعادة الجلسة، وإلّا طمسنا
  // الرابط الأصلي (مثل #/dashboard) بقيمة العرض المؤقتة أثناء التحميل فيُطالَب المستخدم
  // بالدخول رغم وجود جلسة صالحة.
  useEffect(() => {
    if (auth.loading || !didInitialAuthRoute.current) return
    if (view !== 'notfound') setHashRoute(view)
  }, [view, auth.loading])

  // hash → view (تنقّل المتصفح / تحديث الصفحة) مع الحراسة لكل حساب.
  useEffect(() => {
    const onHash = () => {
      const r = routeFromHash()
      if (r) {
        setView(guardRoute(r, uid))
      } else if (window.location.hash && window.location.hash !== '#/') {
        // مسار غير معروف (مثل #/xyz) → صفحة 404 المخصّصة (نُبقي الرابط ظاهرًا).
        setView('notfound')
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [uid])

  // مصالحة حالة الحساب بعد جهوزية المصادقة (تحديث الصفحة / تسجيل الدخول):
  // نزامن علامة الإكمال من الملف السحابي ثم نُعيد حراسة الشاشة الحالية بحالة الحساب
  // الصحيحة — فحساب جديد لم يُكمل الإعداد لا يبقى على اللوحة بعد التحديث.
  useEffect(() => {
    if (auth.loading) return
    let cancelled = false
    void (async () => {
      if (uid && !isAccountOnboarded(uid)) await hydrateOnboardingFromProfile(uid)
      if (cancelled) return
      if (!didInitialAuthRoute.current) {
        // أول حسم للمسار بعد استعادة الجلسة: نحسب مسار الإقلاع بمعرّف الحساب الحقيقي
        // (مع احترام الـ hash) فيهبط المستخدم المسجَّل حيث كان — لا على شاشة الدخول.
        // بدون هذا يبقى العرض عالقًا على 'start' لأنّ guardRoute لا يرفع مسارًا غير رئيسي.
        didInitialAuthRoute.current = true
        const landing = initialRoute(uid)
        setView(landing)
        // اكتب الـ hash صراحةً: عند تساوي القيمة مع الحالة الأولية يتخطّى تأثير المزامنة
        // التحديث، فنضمن بقاء سلوك الضيف/الروابط العميقة كما كان تمامًا.
        if (landing !== 'notfound') setHashRoute(landing)
      } else {
        setView((v) => guardRoute(v, uid))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [auth.loading, uid])

  // فتح شاشة الإعداد — النمط (معالج أولي مقابل محرّرات متقدّمة) يُشتقّ من حالة الحساب
  // وقت العرض، فلا حاجة لحالة نمط مخزّنة قد تتقادم.
  const openSetup = useCallback(() => {
    setView('setup')
  }, [])

  /** دخول التطبيق بعد تسجيل الدخول أو المتابعة كضيف — بوابة لكل حساب. */
  const enterApp = useCallback(async () => {
    const signedInId = await currentUserId()
    if (!signedInId) {
      // ضيف — علم الجهاز كما كان.
      if (loadOnboarding().completed) setView('dashboard')
      else openSetup()
      return
    }
    // مسجّل دخول — القرار لكل حساب: السجلّ المحلي، وإلا الملف السحابي.
    let onboarded = isAccountOnboarded(signedInId)
    if (!onboarded) onboarded = await hydrateOnboardingFromProfile(signedInId)
    if (onboarded) setView('dashboard')
    else openSetup()
  }, [openSetup])

  const closeSetup = (completed?: boolean) => {
    const done = completed || isOnboardingComplete(uid)
    setView(done ? 'dashboard' : 'start')
    if (completed) setShowSuccess(true)
  }

  const closeDemo = () => setView(isOnboardingComplete(uid) ? 'dashboard' : 'start')

  // تنقّل عام — يمرّ عبر الحراسة حتى لا تُفتح لوحة بلا إعداد.
  const navigate = (v: AppRoute) => {
    if (v === 'setup') openSetup()
    else setView(guardRoute(v, uid))
  }

  // ——— بوابة الإقلاع: أثناء استعادة جلسة المصادقة نعرض حالة تحميل قصيرة (لا شاشة دخول)
  //     حتى لا يُطالَب مستخدم لديه جلسة صالحة بتسجيل الدخول من جديد. ———
  if (auth.loading) {
    return <AppLoading />
  }

  // ——— بناء عنصر الشاشة الحالية ثم لفّه بحدّ Suspense (أسفل المزوّدات حتى تبقى حالتها
  //     محفوظة أثناء تحميل الحِزم عند الطلب) ———
  let content: ReactNode

  if (view === 'start') {
    const ob = loadOnboarding()
    content = (
      <StartView
        lang={LANG}
        designV2={designV2}
        hasStartedSetup={!isOnboardingComplete(uid) && (ob.lastStep ?? 0) > 0}
        onBuildPlan={openSetup}
        onLogin={() => setView('login')}
        onContinueGuest={enterApp}
        onSeeDemo={() => setView('demo')}
      />
    )
  } else if (view === 'login') {
    content = (
      <LoginView
        lang={LANG}
        designV2={designV2}
        onSuccess={enterApp}
        onGuest={enterApp}
        onBack={() => setView('start')}
      />
    )
  } else if (view === 'privacy') {
    content = <PrivacyView lang={LANG} onBack={() => navigate(beforeLegalRef.current)} />
  } else if (view === 'terms') {
    content = <TermsView lang={LANG} onBack={() => navigate(beforeLegalRef.current)} />
  } else if (view === 'contact') {
    content = <ContactView lang={LANG} onBack={() => window.history.back()} />
  } else if (view === 'notfound') {
    const goHome = () => {
      const target = isOnboardingComplete(uid) ? 'dashboard' : 'start'
      setView(guardRoute(target, uid))
    }
    content = <NotFoundView lang={LANG} onHome={goHome} onBack={() => window.history.back()} />
  } else if (view === 'setup') {
    // النمط يُشتقّ من حالة الحساب وقت العرض: مكتمل → محرّرات متقدّمة (تعديل الخطة)؛
    // غير مكتمل → معالج الإعداد الأولي (وزنه/هدفه هو).
    const onboarded = isOnboardingComplete(uid)
    content = <SetupView onClose={closeSetup} initialStep={0} mode={onboarded ? 'advanced' : 'onboarding'} />
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
        onOpenProductReview={() => setView('productReview')}
      />
    )
  } else if (view === 'productReview') {
    content = <ReviewPanelView lang={LANG} onBack={() => setView('settings')} />
  } else if (view === 'calc') {
    content = <CalcExplainerView lang={LANG} onBack={() => navigate('profile')} />
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

        {/* احتفالات الأوسمة والأرقام القياسية — فوق كل الشاشات الرئيسية */}
        <AchievementToaster />
      </>
    )
  }

  return (
    <div className={designV2 ? 'design-v2 min-h-screen' : undefined}>
      <Suspense fallback={<AppLoading />}>{content}</Suspense>
    </div>
  )
}
