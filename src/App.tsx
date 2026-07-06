import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
// شاشة البداية (الهبوط) تبقى مُحمّلة مباشرةً لأول رسم سريع.
import { StartView } from '@/views/StartView'
import { AppLoading } from '@/components/AppLoading'
import { VerifyEmailView } from '@/views/VerifyEmailView'
import { RouteErrorBoundary } from '@/components/ErrorBoundary'
import { DashboardSkeleton, ProgressSkeleton, TabSkeleton } from '@/components/ViewSkeletons'
import { InstallPrompt } from '@/components/InstallPrompt'

// باقي الشاشات مُقسّمة إلى حِزم عند الطلب (code-splitting) لتقليل حزمة الدخول الأولى.
// تُبنى عبر مصنع لأنّ React.lazy يخزّن فشل الاستيراد نهائيًا — زرّ «أعد المحاولة» في
// حدّ الأخطاء يستدعي المصنع من جديد فيُعاد استيراد الحزمة الفاشلة فعليًا.
function createLazyViews() {
  return {
    LoginView: lazy(() => import('@/views/LoginView').then((m) => ({ default: m.LoginView }))),
    SetupView: lazy(() => import('@/views/SetupView').then((m) => ({ default: m.SetupView }))),
    DashboardView: lazy(() => import('@/views/DashboardView').then((m) => ({ default: m.DashboardView }))),
    WorkoutView: lazy(() => import('@/views/WorkoutView').then((m) => ({ default: m.WorkoutView }))),
    ExerciseLibraryView: lazy(() =>
      import('@/views/ExerciseLibraryView').then((m) => ({ default: m.ExerciseLibraryView })),
    ),
    NutritionView: lazy(() => import('@/views/NutritionView').then((m) => ({ default: m.NutritionView }))),
    ProgressView: lazy(() => import('@/views/ProgressView').then((m) => ({ default: m.ProgressView }))),
    ProfileView: lazy(() => import('@/views/ProfileView').then((m) => ({ default: m.ProfileView }))),
    CalcExplainerView: lazy(() =>
      import('@/views/CalcExplainerView').then((m) => ({ default: m.CalcExplainerView })),
    ),
    DemoView: lazy(() => import('@/views/DemoView').then((m) => ({ default: m.DemoView }))),
    SettingsView: lazy(() => import('@/views/SettingsView').then((m) => ({ default: m.SettingsView }))),
    PrivacyView: lazy(() => import('@/views/PrivacyView').then((m) => ({ default: m.PrivacyView }))),
    TermsView: lazy(() => import('@/views/TermsView').then((m) => ({ default: m.TermsView }))),
    ContactView: lazy(() => import('@/views/ContactView').then((m) => ({ default: m.ContactView }))),
    NotFoundView: lazy(() => import('@/views/NotFoundView').then((m) => ({ default: m.NotFoundView }))),
    ReviewPanelView: lazy(() =>
      import('@/features/products/reviewPanel/ReviewPanelView').then((m) => ({ default: m.ReviewPanelView })),
    ),
    MyStatsView: lazy(() => import('@/views/MyStatsView').then((m) => ({ default: m.MyStatsView }))),
  }
}
import { MobileShell, type MainTab } from '@/components/MobileShell'
import type { AppBadge } from '@/components/AppNav'
import { useAuth } from '@/lib/authContext'
import { isAccountOnboarded, isOnboardingComplete, markCompleted } from '@/lib/onboarding'
import { ensureOnboardingProfile } from '@/lib/onboardingProfile'
import { currentUserId, hydrateOnboardingFromProfile } from '@/lib/onboardingSync'
import { useLanguage } from '@/i18n'
import { type AppRoute, MAIN_TABS, isUnknownRouteHash, routeFromHash, setHashRoute } from '@/lib/appRoutes'
import { SuccessToast } from '@/components/SuccessToast'
import { AchievementToaster } from '@/features/achievements/AchievementToaster'
import { BUILD_LABEL } from '@/lib/buildInfo'

/**
 * حراسة المسار: التبويبات الرئيسية لا تُفتح أبدًا قبل إكمال إعداد حقيقي **لهذا الحساب**
 * (وبالتالي حساب جديد يُطالَب بالإعداد ولو أُكمل على الجهاز بحساب آخر).
 */
function guardRoute(route: AppRoute, userId: string | null): AppRoute {
  // لا حساب = لا وصول: الإعداد (الأسئلة) والتبويبات ومكتبة التمارين و«لوحتي» والإعدادات
  // وصفحة الحساب والحاسبة والعرض التوضيحي كلها تتطلّب حسابًا أولًا. لا وضع ضيف ولا تصفّح بلا حساب.
  const needsAccount =
    MAIN_TABS.includes(route) ||
    route === 'exercises' ||
    route === 'stats' ||
    route === 'setup' ||
    route === 'settings' ||
    route === 'calc' ||
    route === 'demo'
  if (needsAccount && !userId) return 'start'
  // بعد الحساب: التبويبات تتطلّب إعدادًا مكتملًا وإلا معالج الإعداد (الأسئلة).
  if (MAIN_TABS.includes(route) || route === 'exercises' || route === 'stats') {
    if (!isOnboardingComplete(userId)) return 'setup'
  }
  return route
}

function initialRoute(userId: string | null): AppRoute {
  const r = routeFromHash()
  if (r) return guardRoute(r, userId)
  // مسار route غير معروف (مثل #/asdf) → صفحة 404 بدل التحويل الصامت.
  // المرساة النصية (مثل #today من روابط الفوتر) ليست مسارًا فلا تُقذف إلى 404.
  if (isUnknownRouteHash()) {
    return 'notfound'
  }
  // بلا حساب → شاشة الحساب (تسجيل دخول/إنشاء حساب). بحساب → اللوحة أو الأسئلة.
  if (!userId) return 'start'
  return isOnboardingComplete(userId) ? 'dashboard' : 'setup'
}

/** قشرة تطبيق قِمّة — توجيه بسيط عبر hash (بلا مكتبات خارجية). */
export default function App() {
  const auth = useAuth()
  // اللغة الحية من سياق i18n — التبديل يعيد رسم كل الشاشات فورًا (بلا إعادة تحميل).
  const { lang: LANG } = useLanguage()
  // داخل التطبيق لا يوجد ضيف بعد الآن (كل التبويبات خلف حساب)، فالشارة دائمًا «حساب».
  const badge: AppBadge = 'account'
  // المالك الحالي لقرار البوابة: معرّف الحساب المسجّل، أو null لوضع الضيف.
  const uid = auth.user?.id ?? null

  useEffect(() => {
    // تطبيق اللغة/الاتجاه يتكفّل به LanguageProvider. هنا هجرات لمرّة واحدة فقط.
    ensureOnboardingProfile()
    // معرّف البناء في الـ console — للتحقق من نشر النسخة الصحيحة.
    console.info(`%cقِمّة ${BUILD_LABEL}`, 'color:#F26A21;font-weight:bold')
  }, [])

  const [view, setView] = useState<AppRoute>(() => initialRoute(auth.user?.id ?? null))
  // حِزم الشاشات الكسولة — تُستبدل بنسخة جديدة عند «أعد المحاولة» بعد فشل تحميل حزمة.
  const [V, setV] = useState(createLazyViews)
  const retryLazyViews = useCallback(() => setV(createLazyViews()), [])
  // هل حُسم مسار الإقلاع الأول *بعد* جهوزية المصادقة؟ يمنع تثبيت شاشة البداية/الدخول
  // بينما الجلسة ما زالت تُستعاد بشكل غير متزامن (سبب مطالبة المستخدم بالدخول كل مرة).
  const didInitialAuthRoute = useRef(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const dismissSuccess = useCallback(() => setShowSuccess(false), [])
  // وضع شاشة الحساب (تسجيل دخول/إنشاء حساب) — يُحدَّد من زرّ شاشة البداية.
  const [loginMode, setLoginMode] = useState<'login' | 'signup'>('login')

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
      } else if (isUnknownRouteHash()) {
        // مسار route غير معروف (مثل #/xyz) → صفحة 404 المخصّصة (نُبقي الرابط ظاهرًا).
        // مرساة تمرير عادية (#today) تُتجاهَل ولا تُعدّ 404.
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
    // الأسئلة/الإعداد لا تُفتح أبدًا بلا حساب — مرور عبر البوابة صراحةً.
    if (!uid) {
      setView('start')
      return
    }
    setView('setup')
  }, [uid])

  /** دخول التطبيق بعد تسجيل الدخول/إنشاء الحساب — بوابة لكل حساب (لا وضع ضيف). */
  const enterApp = useCallback(async () => {
    const signedInId = await currentUserId()
    if (!signedInId) {
      // لا حساب → يعود لشاشة الحساب (لا دخول بلا تسجيل).
      setView('login')
      return
    }
    // مسجّل دخول — القرار لكل حساب: السجلّ المحلي، وإلا الملف السحابي.
    // الأسئلة (الإعداد) تبدأ الآن فقط بعد الحساب.
    let onboarded = isAccountOnboarded(signedInId)
    if (!onboarded) onboarded = await hydrateOnboardingFromProfile(signedInId)
    if (onboarded) setView('dashboard')
    else openSetup()
  }, [openSetup])

  const closeSetup = (completed?: boolean) => {
    const done = completed || isOnboardingComplete(uid)
    // كل وجهة تمرّ عبر البوابة. مستخدم مسجّل لم يُكمل الأسئلة يبقى في الإعداد (لا يُقذف
    // لشاشة الحساب)، وغير المسجّل فقط يعود لشاشة تسجيل الدخول/إنشاء الحساب.
    setView(guardRoute(done ? 'dashboard' : uid ? 'setup' : 'start', uid))
    if (completed) setShowSuccess(true)
  }

  // مخرج طوارئ للإعداد: يُعلّم الحساب/الجهاز مكتمل الإعداد ويدخل اللوحة فورًا. يستخدمه زرّ
  // «تخطّي» الدائم في المعالج وحاجز الأخطاء — فلا يُحبَس مستخدم أبدًا حتى لو تعطّلت خطوة.
  const skipOnboarding = useCallback(() => {
    markCompleted(uid)
    setView(guardRoute('dashboard', uid))
    setShowSuccess(true)
  }, [uid])

  const closeDemo = () => setView(guardRoute(isOnboardingComplete(uid) ? 'dashboard' : uid ? 'setup' : 'start', uid))

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

  // ——— بوّابة تأكيد البريد (P0، دفاع عميق): حساب مسجّل ببريد لم يُؤكَّد بعد لا يُمنح وصولًا
  //     كاملًا — يُحوَّل لشاشة التأكيد. الضيف/غير المسجّل بالبريد يمرّ (emailVerified=true). ———
  if (!auth.emailVerified) {
    return <VerifyEmailView lang={LANG} onSignedOut={() => setView('login')} />
  }

  // ——— بناء عنصر الشاشة الحالية ثم لفّه بحدّ Suspense (أسفل المزوّدات حتى تبقى حالتها
  //     محفوظة أثناء تحميل الحِزم عند الطلب) ———
  let content: ReactNode

  if (view === 'start') {
    content = (
      <StartView
        lang={LANG}
        onLogin={() => { setLoginMode('login'); setView('login') }}
        onSignup={() => { setLoginMode('signup'); setView('login') }}
      />
    )
  } else if (view === 'login') {
    content = <V.LoginView lang={LANG} initialMode={loginMode} onSuccess={enterApp} onBack={() => setView('start')} />
  } else if (view === 'privacy') {
    content = <V.PrivacyView lang={LANG} onBack={() => navigate(beforeLegalRef.current)} />
  } else if (view === 'terms') {
    content = <V.TermsView lang={LANG} onBack={() => navigate(beforeLegalRef.current)} />
  } else if (view === 'contact') {
    content = <V.ContactView lang={LANG} onBack={() => window.history.back()} />
  } else if (view === 'notfound') {
    const goHome = () => {
      const target = isOnboardingComplete(uid) ? 'dashboard' : 'start'
      setView(guardRoute(target, uid))
    }
    content = <V.NotFoundView lang={LANG} onHome={goHome} onBack={() => window.history.back()} />
  } else if (view === 'setup') {
    // النمط يُشتقّ من حالة الحساب وقت العرض: مكتمل → محرّرات متقدّمة (تعديل الخطة)؛
    // غير مكتمل → معالج الإعداد الأولي (وزنه/هدفه هو).
    const onboarded = isOnboardingComplete(uid)
    content = <V.SetupView onClose={closeSetup} onForceComplete={skipOnboarding} initialStep={0} mode={onboarded ? 'advanced' : 'onboarding'} />
  } else if (view === 'demo') {
    content = <V.DemoView lang={LANG} onNavigate={navigate} onBack={closeDemo} />
  } else if (view === 'settings') {
    content = (
      <V.SettingsView
        lang={LANG}
        onNavigate={navigate}
        onEditPlan={openSetup}
        onLogin={() => setView('login')}
        onOpenPrivacy={() => setView('privacy')}
        onOpenTerms={() => setView('terms')}
        onOpenProductReview={() => setView('productReview')}
        onOpenCalc={() => setView('calc')}
      />
    )
  } else if (view === 'productReview') {
    // أداة طاقم داخلية فقط — تُعرَض في التطوير فقط؛ في الإنتاج الوصول إليها (حتى عبر
    // #/productReview مباشرةً) مُقصى ويُعاد المستخدم لشاشة «غير موجود».
    content = import.meta.env.DEV ? (
      <V.ReviewPanelView lang={LANG} onBack={() => setView('settings')} />
    ) : (
      <V.NotFoundView lang={LANG} onHome={() => setView('dashboard')} onBack={() => setView('dashboard')} />
    )
  } else if (view === 'calc') {
    content = <V.CalcExplainerView lang={LANG} onBack={() => navigate('profile')} />
  } else {
    // ——— التبويبات الرئيسية داخل قشرة الجوال ———
    content = (
      <>
        <MobileShell
          lang={LANG}
          tab={(view === 'exercises' ? 'workout' : view === 'stats' ? 'dashboard' : view) as MainTab}
          badge={badge}
          onNavigate={navigate}
          onOpenSettings={() => setView('settings')}
        >
          {/* الرئيسية والتقدّم: fallback هيكلي لكل مسار (بدل AppLoading العام) — البيانات
              محلية متزامنة فلا يظهر الهيكل إلا أثناء تحميل حزمة الشاشة عند الطلب. */}
          {view === 'dashboard' && (
            <Suspense fallback={<DashboardSkeleton />}>
              <V.DashboardView lang={LANG} onNavigate={navigate} />
            </Suspense>
          )}
          {view === 'workout' && (
            <Suspense fallback={<TabSkeleton />}>
              <V.WorkoutView lang={LANG} onNavigate={navigate} />
            </Suspense>
          )}
          {view === 'exercises' && (
            <Suspense fallback={<TabSkeleton />}>
              <V.ExerciseLibraryView lang={LANG} />
            </Suspense>
          )}
          {view === 'nutrition' && (
            <Suspense fallback={<TabSkeleton />}>
              <V.NutritionView lang={LANG} />
            </Suspense>
          )}
          {view === 'progress' && (
            <Suspense fallback={<ProgressSkeleton />}>
              <V.ProgressView lang={LANG} />
            </Suspense>
          )}
          {view === 'profile' && (
            <Suspense fallback={<TabSkeleton />}>
              <V.ProfileView lang={LANG} onNavigate={navigate} />
            </Suspense>
          )}
          {view === 'stats' && (
            <Suspense fallback={<TabSkeleton />}>
              <V.MyStatsView lang={LANG} />
            </Suspense>
          )}
        </MobileShell>

        {showSuccess && <SuccessToast onClose={dismissSuccess} />}

        {/* احتفالات الأوسمة والأرقام القياسية — فوق كل الشاشات الرئيسية */}
        <AchievementToaster />
      </>
    )
  }

  // حدّ أخطاء المسارات فوق Suspense: فشل تحميل حزمة أو انهيار شاشة يعرض بطاقة
  // «أعد المحاولة» (تعيد إنشاء الحِزم الكسولة وتعيد الاستيراد) — لا شاشة بيضاء.
  return (
    <RouteErrorBoundary onRetry={retryLazyViews}>
      <Suspense fallback={<AppLoading />}>{content}</Suspense>
      {/* دعوة تثبيت التطبيق (P12) — شريط سفلي قابل للإغلاق، لا يظهر مثبّتًا أو بعد الإغلاق. */}
      <InstallPrompt lang={LANG} />
    </RouteErrorBoundary>
  )
}
