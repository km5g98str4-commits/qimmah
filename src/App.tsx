import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
// شاشة البداية (الهبوط) تبقى مُحمّلة مباشرةً لأول رسم سريع.
import { StartView } from '@/views/StartView'
import { RouteErrorBoundary } from '@/components/ErrorBoundary'
import { DashboardSkeleton, ProgressSkeleton, TabSkeleton } from '@/components/ViewSkeletons'

// باقي الشاشات مُقسّمة إلى حِزم عند الطلب (code-splitting) لتقليل حزمة الدخول الأولى.
// تُبنى عبر مصنع لأنّ React.lazy يخزّن فشل الاستيراد نهائيًا — زرّ «أعد المحاولة» في
// حدّ الأخطاء يستدعي المصنع من جديد فيُعاد استيراد الحزمة الفاشلة فعليًا.
function createLazyViews() {
  return {
    LoginView: lazy(() => import('@/views/LoginView').then((m) => ({ default: m.LoginView }))),
    AccountRequiredView: lazy(() =>
      import('@/views/AccountRequiredView').then((m) => ({ default: m.AccountRequiredView })),
    ),
    VerifyEmailView: lazy(() =>
      import('@/views/VerifyEmailView').then((m) => ({ default: m.VerifyEmailView })),
    ),
    ResetPasswordView: lazy(() =>
      import('@/views/ResetPasswordView').then((m) => ({ default: m.ResetPasswordView })),
    ),
    SetupView: lazy(() => import('@/views/SetupView').then((m) => ({ default: m.SetupView }))),
    DashboardView: lazy(() => import('@/views/DashboardView').then((m) => ({ default: m.DashboardView }))),
    WorkoutView: lazy(() => import('@/views/WorkoutView').then((m) => ({ default: m.WorkoutView }))),
    ExerciseLibraryView: lazy(() =>
      import('@/views/ExerciseLibraryView').then((m) => ({ default: m.ExerciseLibraryView })),
    ),
    NutritionView: lazy(() => import('@/views/NutritionView').then((m) => ({ default: m.NutritionView }))),
    ProgressView: lazy(() => import('@/views/ProgressView').then((m) => ({ default: m.ProgressView }))),
    MeasurementsView: lazy(() => import('@/views/ProgressView').then((m) => ({ default: m.MeasurementsView }))),
    StepsView: lazy(() => import('@/views/StepsView').then((m) => ({ default: m.StepsView }))),
    ProfileView: lazy(() => import('@/views/ProfileView').then((m) => ({ default: m.ProfileView }))),
    CalcExplainerView: lazy(() =>
      import('@/views/CalcExplainerView').then((m) => ({ default: m.CalcExplainerView })),
    ),
    SettingsView: lazy(() => import('@/views/SettingsView').then((m) => ({ default: m.SettingsView }))),
    PrivacyView: lazy(() => import('@/views/PrivacyView').then((m) => ({ default: m.PrivacyView }))),
    TermsView: lazy(() => import('@/views/TermsView').then((m) => ({ default: m.TermsView }))),
    ContactView: lazy(() => import('@/views/ContactView').then((m) => ({ default: m.ContactView }))),
    NotFoundView: lazy(() => import('@/views/NotFoundView').then((m) => ({ default: m.NotFoundView }))),
    ReviewPanelView: import.meta.env.DEV
      ? lazy(() => import('@/features/products/reviewPanel/ReviewPanelView').then((m) => ({ default: m.ReviewPanelView })))
      : null,
    MyStatsView: lazy(() => import('@/views/MyStatsView').then((m) => ({ default: m.MyStatsView }))),
    RecoveryView: lazy(() => import('@/views/RecoveryView').then((m) => ({ default: m.RecoveryView }))),
    // المركز التنفيذي — حزمة مستقلّة لا تدخل حزمة الإقلاع. الحارس داخل المكوّن
    // نفسه، فجلب الحزمة **لا يمنح شيئًا**: من ليس مؤسسًا يرى شاشة المنع.
    AdminRoute: lazy(() => import('@/admin').then((m) => ({ default: m.AdminRoute }))),
    // مرشد قِمّة — حزمة مستقلّة كذلك: محرّك القواعد وسياقه لا يدخلان حزمة
    // الإقلاع، فزائرٌ لا يفتح المرشد لا ينزّل شيئًا منه.
    CoachView: lazy(() => import('@/features/coach/CoachView').then((m) => ({ default: m.CoachView }))),
  }
}
import type { MainTab, QuickLogTarget } from '@/components/MobileShell'
import type { AppBadge } from '@/components/AppNav'
import { useAuth } from '@/lib/authContext'
import { adoptGuestOnboarding, isAccountOnboarded, isOnboardingComplete, markCompleted } from '@/lib/onboarding'
import { reconcileAccountScope } from '@/lib/accountScope'
import { ensureOnboardingProfile } from '@/lib/onboardingProfile'
import { currentUserId, hydrateOnboardingFromProfile } from '@/lib/onboardingSync'
import { useLanguage } from '@/i18n'
import type { Lang } from '@/lib/appPreferences'
import { type AppRoute, MAIN_TABS, isUnknownRouteHash, routeFromHash, setHashRoute } from '@/lib/appRoutes'
import { BUILD_LABEL } from '@/lib/buildInfo'
import { requestQuickLogIntent } from '@/lib/quickLogIntent'
import { trackLocal } from '@/lib/tracking'
import { recordDayOpen } from '@/lib/tracking/signals'
import { useCustomization } from '@/lib/customizationContext'
import { useAccess } from '@/lib/access/useAccess'
import { V2_QUICK_LOG } from '@/design-system/v2/labels'

// Achievement evaluation reads workout + nutrition stores. It is only rendered
// inside authenticated main tabs, so loading it in the public/account shell would
// pull the full food catalogue into the first bundle for no user-visible benefit.
const AchievementToaster = lazy(() =>
  import('@/features/achievements/AchievementToaster').then((m) => ({ default: m.AchievementToaster })),
)

// قشرة التبويبات لا تفيد صفحة البداية أو تسجيل الدخول أو الإعداد. تحميلها مع
// أول تبويب رئيسي يبقي رحلة الدخول أخف، مع بقاء نفس القشرة ومكوّناتها بعد ذلك.
const MobileShell = lazy(() =>
  import('@/components/MobileShell').then((m) => ({ default: m.MobileShell })),
)

// لا يُجلب الحوار قبل أن يحاول المستخدم فعلًا مدفوعًا؛ طبقة الوصول تبقى حاضرة
// وتفشل مغلقة، ثم يُعرض نفس الحوار الموحّد عند أول منع.
const PremiumGate = lazy(() =>
  import('@/components/PremiumGate').then((m) => ({ default: m.PremiumGate })),
)
const SuccessToast = lazy(() =>
  import('@/components/SuccessToast').then((m) => ({ default: m.SuccessToast })),
)
const AppLoading = lazy(() =>
  import('@/components/AppLoading').then((m) => ({ default: m.AppLoading })),
)

function LoadingFallback() {
  return <div className="h-[100dvh] min-h-0 bg-page" aria-busy="true" />
}

/**
 * طبقة بوّابة Premium.
 *
 * [SOVEREIGN-COMMERCE-001] **البوّابة تُغلق عند تبدّل المسار.** كانت `blockedAction`
 * تعيش في المزوّد فوق مبدّل المسارات، وطبقةُ البوّابة خارجه، ومستمع `hashchange`
 * بلا تفكيك — فزرّ الرجوع كان يترك نافذةً حيّة **فوق شاشة أخرى**: المستخدم يرى
 * حوارًا يطالبه بالدفع مقابل فعلٍ لم يعد على الشاشة التي يقف عليها.
 *
 * الإغلاق مشروط بـ**تبدّل** المسار لا بتشغيل الأثر: البوّابة تُفتح فوق مسارها،
 * فلو أغلقنا عند كل تشغيل لأغلقناها في نفس اللحظة التي فُتحت فيها.
 */
function PremiumGateLayer({ lang, route }: { lang: Lang; route: AppRoute }) {
  const { blockedAction, closeGate } = useAccess()
  const lastRoute = useRef(route)
  useEffect(() => {
    if (lastRoute.current === route) return
    lastRoute.current = route
    closeGate()
  }, [route, closeGate])
  if (!blockedAction) return null
  return (
    <Suspense fallback={null}>
      <PremiumGate lang={lang} />
    </Suspense>
  )
}

/**
 * حراسة المسار: التبويبات الرئيسية لا تُفتح أبدًا قبل إكمال إعداد حقيقي **لهذا الحساب**
 * (وبالتالي حساب جديد يُطالَب بالإعداد ولو أُكمل على الجهاز بحساب آخر).
 */
function guardRoute(route: AppRoute, userId: string | null): AppRoute {
  // الزائر المكتمل يستخدم بياناته المحلية فقط؛ كل ما بعد الإعداد يمرّ من نفس الحارس.
  // الزائر غير المكتمل لا يُفتح له التطبيق مباشرةً، بل يبدأ من شاشة البداية/الإعداد.
  const needsAccount =
    MAIN_TABS.includes(route) ||
    route === 'exercises' ||
    route === 'stats' ||
    route === 'recovery' ||
    route === 'steps' ||
    route === 'measurements' ||
    route === 'settings' ||
    route === 'calc'
  const guestReady = !userId && isOnboardingComplete(null)
  // الإعداد هو باب الضيف نفسه؛ لا نعيده للبداية قبل أن يأخذ فرصته في بناء بياناته.
  if (route !== 'setup' && needsAccount && !userId && !guestReady) return 'accountRequired'
  // بعد الحساب: التبويبات تتطلّب إعدادًا مكتملًا وإلا معالج الإعداد (الأسئلة).
  if (MAIN_TABS.includes(route) || route === 'exercises' || route === 'stats' || route === 'recovery' || route === 'steps' || route === 'measurements') {
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
  // [WAVE-A] بلا حساب → شاشة **الهبوط** (`start`)، ونداؤها الأساسي يبدأ الأسئلة
  // مباشرةً بلا حساب. الشاشة نفسها لم تتغيّر موضعًا — تغيّر ما يفعله زرّها الأول.
  // وهي تبقى مطلوبة للعائد الذي فقد جلسته: منها وحدها يصل إلى تسجيل الدخول.
  if (!userId) return 'start'
  return isOnboardingComplete(userId) ? 'dashboard' : 'setup'
}

/** قشرة تطبيق قِمّة — توجيه بسيط عبر hash (بلا مكتبات خارجية). */
export default function App() {
  const auth = useAuth()
  const { customization } = useCustomization()
  // اللغة الحية من سياق i18n — التبديل يعيد رسم كل الشاشات فورًا (بلا إعادة تحميل).
  const { lang: LANG } = useLanguage()
  // مالك الجلسة الحالي: معرّف الحساب المسجّل، أو null لوضع الضيف المحلي.
  const uid = auth.user?.id ?? null
  const badge: AppBadge = uid ? 'account' : 'guest'
  const quickCopy = V2_QUICK_LOG[LANG === 'en' ? 'en' : 'ar']
  const hasMedication = customization.wellnessPlan.medications.length > 0
  const hasSupplement = customization.wellnessPlan.supplements.length > 0
  const routineQuickLabel = hasMedication && hasSupplement
    ? quickCopy.routineBoth
    : hasMedication
      ? quickCopy.routineMedication
      : hasSupplement
        ? quickCopy.routineSupplement
        : quickCopy.routineEmpty

  // عزل الحساب (شبكة أمان): بمجرّد جهوزية المصادقة، إن ظهر حساب مختلف عن آخر ما رأيناه
  // (مثلًا استعادة جلسة لحساب آخر دون مرور بتسجيل خروج) → امسح بقايا السابق قبل الرسم،
  // ثم أعِد التحميل نظيفًا فلا تبقى أي حالة في الذاكرة من الحساب السابق. تسجيل الخروج
  // العادي يمسح مباشرةً في signOut، فهذه الحالة تلتقط المسارات غير المتوقّعة فقط.
  // useLayoutEffect ليتمّ المسح قبل أن يرسم المتصفح واجهة الحساب الجديد.
  useLayoutEffect(() => {
    if (auth.loading) return
    // بوّابة الاستعادة قبل منطق المسح: جلسة PASSWORD_RECOVERY المؤقتة ليست «تبديل حساب».
    // مسحها هنا يحذف بيانات المستخدم ويقذفه من شاشة «كلمة مرور جديدة» (حلقة إعادة تحميل).
    // لذا نختصر أثناء الاستعادة؛ recoveryActive في التبعيات ليُعاد التوفيق بأمان بعد انتهائها.
    if (auth.recoveryActive) return
    const { wiped } = reconcileAccountScope(uid)
    if (wiped && typeof window !== 'undefined') window.location.reload()
  }, [auth.loading, uid, auth.recoveryActive])

  useEffect(() => {
    // تطبيق اللغة/الاتجاه يتكفّل به LanguageProvider. هنا هجرات لمرّة واحدة فقط.
    ensureOnboardingProfile()
    // معرّف البناء في الـ console — للتحقق من نشر النسخة الصحيحة.
    console.info(`%cقِمّة ${BUILD_LABEL}`, 'color:#F26A21;font-weight:bold')
  }, [])

  // [CTO-68] الحدث ٧ — «فتح اليوم التالي». يُؤجَّل حتى تستقرّ المصادقة: قبلها يكون
  // مؤشّر المالك «ضيف» افتراضًا، فتُكتب عودةُ صاحب حساب في مخزن الضيف. مرّة واحدة
  // لكل تحميل عبر الحارس المرجعي (تغيّر uid لاحقًا تبديلُ حساب لا فتحُ يوم).
  const dayOpenLogged = useRef(false)
  useEffect(() => {
    if (auth.loading || dayOpenLogged.current) return
    dayOpenLogged.current = true
    recordDayOpen()
  }, [auth.loading])

  // جدولة إشعارات iOS من مالك الجلسة الحالي فقط. كل مصالحة تلغي معرّفات قِمّة
  // أولًا؛ الاستعادة/الخروج/تبديل الحساب لا يمكن أن يترك جدول المالك السابق.
  useEffect(() => {
    if (auth.loading) return
    let active = true
    const reconcile = () => {
      void import('@/lib/notifications').then(({ reconcileNotificationSchedule }) => {
        if (active) void reconcileNotificationSchedule(uid, auth.recoveryActive, LANG)
      }).catch(() => { /* Native reminders are optional; app startup must continue. */ })
    }
    reconcile()
    const onVisible = () => {
      if (document.visibilityState === 'visible') reconcile()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [auth.loading, auth.recoveryActive, uid, LANG])

  const [view, setView] = useState<AppRoute>(() => initialRoute(auth.user?.id ?? null))
  // حِزم الشاشات الكسولة — تُستبدل بنسخة جديدة عند «أعد المحاولة» بعد فشل تحميل حزمة.
  const [V, setV] = useState(createLazyViews)
  const retryLazyViews = useCallback(() => setV(createLazyViews()), [])
  // هل حُسم مسار الإقلاع الأول *بعد* جهوزية المصادقة؟ يمنع تثبيت شاشة البداية/الدخول
  // بينما الجلسة ما زالت تُستعاد بشكل غير متزامن (سبب مطالبة المستخدم بالدخول كل مرة).
  const didInitialAuthRoute = useRef(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const dismissSuccess = useCallback(() => setShowSuccess(false), [])
  /**
   * [QIM-WEB-FOUNDER-UX-006/حزمة ٦] وضع شاشة الحساب **يُشتقّ من المسار**.
   * كان `useState` هنا وفي `LoginView` معًا، فالعنوان لا يتحرّك مع التبديل.
   */
  const authMode: 'login' | 'signup' | 'forgot' =
    view === 'signup' ? 'signup' : view === 'forgot' ? 'forgot' : 'login'
  const goAuth = useCallback((mode: 'login' | 'signup' | 'forgot') => {
    setView(mode === 'signup' ? 'signup' : mode === 'forgot' ? 'forgot' : 'login')
  }, [])

  /**
   * وجهة الضيف من شاشة البداية/الحساب.
   * الضيف **المكتمل** يدخل معاينته على «اليوم»؛ ومحرّر الخطة لا يُفتح إلا بفعل
   * «تعديل خطتي» صريح. كان كلاهما يُرسَل إلى `setup` فيهبط العائد على المحرّر.
   */
  const enterAsGuest = useCallback(() => {
    setView(isOnboardingComplete(null) ? guardRoute('dashboard', null) : 'setup')
  }, [])

  // آخر مسار غير قانوني (للرجوع الآمن من الخصوصية/الشروط دون الاعتماد على history.back
  // الذي قد يقذف المستخدم خارج التطبيق عند فتح الصفحة مباشرةً/التحديث).
  const beforeLegalRef = useRef<AppRoute>('start')
  useEffect(() => {
    if (view !== 'privacy' && view !== 'terms') beforeLegalRef.current = view
  }, [view])
  // تُفتح صفحة شرح الحساب من الإعداد أو التقدّم؛ الرجوع يعيد المستخدم إلى
  // المصدر الحقيقي بدل افتراض أن نقطة الدخول هي الملف الشخصي دائمًا.
  const beforeCalcRef = useRef<AppRoute>('profile')
  useEffect(() => {
    if (view !== 'calc') beforeCalcRef.current = view
  }, [view])

  // view → hash (نُبقي مسار 404 على hash الخاطئ كما هو حتى لا نطمس الرابط الأصلي).
  // مهم: لا نكتب الـ hash قبل حسم مسار الإقلاع الأول بعد استعادة الجلسة، وإلّا طمسنا
  // الرابط الأصلي (مثل #/dashboard) بقيمة العرض المؤقتة أثناء التحميل فيُطالَب المستخدم
  // بالدخول رغم وجود جلسة صالحة.
  useEffect(() => {
    if (auth.loading || !didInitialAuthRoute.current) return
    if (view !== 'notfound' && view !== 'accountRequired') setHashRoute(view)
  }, [view, auth.loading])

  // استعادة كلمة المرور مصدر حقيقته حدث PASSWORD_RECOVERY (لا الـ hash): متى نُشِّط، نُثبّت
  // العرض على شاشة إعادة التعيين ونكتب الـ hash صراحةً — فحتى لو هبط الرابط على جذر التطبيق
  // (بلا #/reset) يصل المستخدم لشاشة كلمة المرور الجديدة بدل قذفه لتسجيل الدخول.
  useEffect(() => {
    if (auth.recoveryActive && view !== 'reset') {
      setView('reset')
      setHashRoute('reset')
    }
  }, [auth.recoveryActive, view])

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
    // أثناء استعادة كلمة المرور لا نحسب مسار إقلاع ولا نكتب hash — بوّابة الاستعادة تتكفّل
    // بالعرض، وأي حساب جلسة استعادة (uid) يجب ألّا يُحوَّل للأسئلة/اللوحة.
    if (auth.recoveryActive) {
      didInitialAuthRoute.current = true
      return
    }
    let cancelled = false
    void (async () => {
      // ترتيب القرار: السجلّ المحلي ← تبنّي إعداد الضيف على هذا الجهاز (فوري، بلا شبكة)
      // ← الملف السحابي (للحساب العائد على جهاز جديد).
      if (uid && !isAccountOnboarded(uid) && !adoptGuestOnboarding(uid)) {
        await hydrateOnboardingFromProfile(uid)
      }
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
  }, [auth.loading, uid, auth.recoveryActive])

  // فتح شاشة الإعداد — النمط (معالج أولي مقابل محرّرات متقدّمة) يُشتقّ من حالة الحساب
  // وقت العرض، فلا حاجة لحالة نمط مخزّنة قد تتقادم. الضيف المحلي مسموح له بالإعداد.
  const openSetup = useCallback(() => {
    setView('setup')
  }, [])

  /** دخول التطبيق بعد تسجيل الدخول/إنشاء الحساب — بوابة لكل حساب (لا وضع ضيف). */
  const enterApp = useCallback(async () => {
    const signedInId = await currentUserId()
    if (!signedInId) {
      // لا حساب → يعود لشاشة الحساب (لا دخول بلا تسجيل).
      goAuth('login')
      return
    }
    // مسجّل دخول — القرار لكل حساب: السجلّ المحلي، وإلا الملف السحابي.
    // [WAVE-A] نُقض «الأسئلة تبدأ فقط بعد الحساب»: الأسئلة تسبق الحساب الآن،
    // وهذا المسار خاصّ بمن **سجّل فعلًا** — فيُسأل هل أكمل إعداده أم لا.
    let onboarded = isAccountOnboarded(signedInId)
    // من أكمل إعداده كضيف ثم أنشأ حسابًا لحفظ تقدّمه يدخل على خطته، لا على معالج جديد.
    if (!onboarded) onboarded = adoptGuestOnboarding(signedInId)
    if (!onboarded) onboarded = await hydrateOnboardingFromProfile(signedInId)
    if (onboarded) setView('dashboard')
    else openSetup()
  }, [openSetup, goAuth])

  const closeSetup = (completed?: boolean) => {
    const done = completed || isOnboardingComplete(uid)
    // كل وجهة تمرّ عبر البوابة. مستخدم مسجّل لم يُكمل الأسئلة يبقى في الإعداد (لا يُقذف
    // لشاشة الحساب)، وغير المسجّل فقط يعود لشاشة تسجيل الدخول/إنشاء الحساب.
    setView(guardRoute(done ? 'dashboard' : uid ? 'setup' : 'start', uid))
    if (completed) setShowSuccess(true)
  }

  /**
   * [QIM-WEB-FOUNDER-UX-004/حزمة ٤] الدخول من شاشة التسليم — **بلا إشعار نجاح**.
   *
   * سببان، وكلاهما مقيس:
   *   • تكرار: التسليم عرض للتوّ «جهزنا خطتك» بخطته وأرقامها. إشعارٌ يقول
   *     «تم تجهيز خطتك» بعده مباشرةً يعيد الخبر نفسه في اللحظة نفسها.
   *   • تداخل: الإشعار بطاقة عائمة ٦ ثوانٍ. رفعناها في الحزمة ١ فوق شريط
   *     التنقّل، لكنها تبقى فوق **المحتوى**؛ وقِيس أنها تبتلع نقر «أضف» في
   *     التغذية خلال تلك الثواني — وهو بالضبط شكل العطل الذي وصفه المؤسس:
   *     «يشتغل مرة وما يشتغل مرة». نافذة ستّ ثوانٍ تُنتج تقطّعًا لا يُفسَّر.
   *
   * لا يوسَم الإعداد مكتملًا من مسار خطأ: الحاجز الموحّد يعيد المحاولة ويحفظ
   * المسودة، فلا تتحول مشكلة عرض إلى خطة مكتملة كذبًا.
   */
  const enterFromHandoff = useCallback(() => {
    markCompleted(uid)
    setView(guardRoute('dashboard', uid))
  }, [uid])

  // تنقّل عام — يمرّ عبر الحراسة حتى لا تُفتح لوحة بلا إعداد.
  const navigate = (v: AppRoute) => {
    if (v === 'setup') openSetup()
    else setView(guardRoute(v, uid))
  }

  /**
   * التسجيل السريع — النيّة تُكتب **بعد** حسم المقصد لا قبله.
   *
   * كان المسار يكتب النيّة ثم ينادي `navigate`. وحين يحوّل الحارس الوجهة
   * (ضيف بلا حساب ⇒ `accountRequired`، أو إعداد ناقص ⇒ `setup`) تبقى النيّة
   * في التخزين بلا مستهلك، فتخطف **زيارة لاحقة مشروعة**: يفتح المستخدم
   * «التغذية» بعد يوم فتنفتح عليه فطوره من نيّة قديمة لا يذكرها.
   *
   * والكتابة نفسها تمرّ الآن بالمالك المحروس: التخزين المحجوب كان يرمي داخل
   * معالج النقر فيموت زرّ التسجيل السريع كلّه.
   */
  const openQuickLog = (target: QuickLogTarget) => {
    const intended: AppRoute = target === 'routine' ? 'profile' : 'nutrition'
    const destination = guardRoute(intended, uid)
    if (destination !== intended) {
      // الحارس حوّل الوجهة — لا نيّة تُكتب، فلا نيّة تعلق.
      setView(destination)
      return
    }
    requestQuickLogIntent(target)
    navigate(intended)
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('qimmah:quick-log', { detail: target })), 0)
  }

  // ——— بوابة الإقلاع: أثناء استعادة جلسة المصادقة نعرض حالة تحميل قصيرة (لا شاشة دخول)
  //     حتى لا يُطالَب مستخدم لديه جلسة صالحة بتسجيل الدخول من جديد. ———
  if (auth.loading) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <AppLoading />
      </Suspense>
    )
  }

  // ——— بوّابة الاستعادة (فوق كل البوّابات): جلسة استعادة كلمة المرور يجب أن تهبط دائمًا على
  //     شاشة «كلمة مرور جديدة» — لا تُقذف لتسجيل الدخول ولا لتأكيد البريد ولا للأسئلة، ولو
  //     لم يكن hash هو #/reset (قالب Supabase الافتراضي أو Deep Link على iOS). مصدر الحقيقة:
  //     حدث PASSWORD_RECOVERY أو مؤشّر استعادة في عنوان الإقلاع. ———
  if (view === 'reset' || auth.recoveryActive) {
    return (
      <RouteErrorBoundary onRetry={retryLazyViews}>
        <Suspense fallback={<LoadingFallback />}>
          <V.ResetPasswordView
            lang={LANG}
            onDone={() => {
              auth.endRecovery()
              goAuth('login')
            }}
          />
        </Suspense>
      </RouteErrorBoundary>
    )
  }

  // ——— بوّابة تأكيد البريد (P0، دفاع عميق): حساب مسجّل ببريد لم يُؤكَّد بعد لا يُمنح وصولًا
  //     كاملًا — يُحوَّل لشاشة التأكيد. الضيف/غير المسجّل بالبريد يمرّ (emailVerified=true). ———
  if (!auth.emailVerified) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <V.VerifyEmailView lang={LANG} onSignedOut={() => goAuth('login')} />
      </Suspense>
    )
  }

  // ——— بناء عنصر الشاشة الحالية ثم لفّه بحدّ Suspense (أسفل المزوّدات حتى تبقى حالتها
  //     محفوظة أثناء تحميل الحِزم عند الطلب) ———
  let content: ReactNode

  if (view === 'start') {
    content = (
      <StartView
        lang={LANG}
        // [CTO-68] الحدث ٤ — توزيع الشاشة الأولى. يُلتقط عند **الاختيار** لا عند
        // العرض، فالتوزيع يقيس ما فعله القادم الجديد لا ما رآه.
        onLogin={() => { trackLocal('entry_choice_made', { choice: 'login' }); goAuth('login') }}
        onGuest={() => { trackLocal('entry_choice_made', { choice: 'guest' }); enterAsGuest() }}
      />
    )
  } else if (view === 'login' || view === 'signup' || view === 'forgot') {
    content = (
      <V.LoginView
        lang={LANG}
        mode={authMode}
        onModeChange={goAuth}
        onSuccess={enterApp}
        onBack={() => setView('start')}
      />
    )
    // ملاحظة: مسار 'reset' يُعالَج في بوّابة الاستعادة أعلى الدالة (فوق كل البوّابات).
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
  } else if (view === 'accountRequired') {
    content = (
      <V.AccountRequiredView
        lang={LANG}
        onLogin={() => goAuth('login')}
        onGuest={enterAsGuest}
        onBack={() => setView('start')}
      />
    )
  } else if (view === 'setup') {
    // النمط يُشتقّ من حالة الحساب وقت العرض: مكتمل → محرّرات متقدّمة (تعديل الخطة)؛
    // غير مكتمل → معالج الإعداد الأولي (وزنه/هدفه هو).
    const onboarded = isOnboardingComplete(uid)
    content = (
      <V.SetupView
        onClose={closeSetup}
        onEnterFromHandoff={enterFromHandoff}
        // [WAVE-A] من شاشة الكشف إلى إنشاء الحساب — مسار حقيقي لا رسالة.
        onCreateAccount={() => { trackLocal('entry_choice_made', { choice: 'signup' }); goAuth('signup') }}
        initialStep={0}
        mode={onboarded ? 'advanced' : 'onboarding'}
      />
    )
  } else if (view === 'settings') {
    content = (
      <V.SettingsView
        lang={LANG}
        onNavigate={navigate}
        onEditPlan={openSetup}
        onLogin={() => goAuth('login')}
        onOpenPrivacy={() => setView('privacy')}
        onOpenTerms={() => setView('terms')}
        onOpenProductReview={() => setView('productReview')}
        onOpenCalc={() => navigate('calc')}
      />
    )
  } else if (view === 'productReview') {
    // أداة طاقم داخلية فقط — تُعرَض في التطوير فقط؛ في الإنتاج الوصول إليها (حتى عبر
    // #/productReview مباشرةً) مُقصى ويُعاد المستخدم لشاشة «غير موجود».
    content = import.meta.env.DEV && V.ReviewPanelView ? (
      <V.ReviewPanelView lang={LANG} onBack={() => setView('settings')} />
    ) : (
      <V.NotFoundView lang={LANG} onHome={() => setView('dashboard')} onBack={() => setView('dashboard')} />
    )
  } else if (view === 'admin') {
    // لا حراسة مسار هنا عمدًا: `AdminRoute` يحسم الدور بنفسه من `app_metadata`،
    // ويرسم شاشة المنع لكل من ليس مؤسسًا. وتحويل الضيف إلى «أنشئ حسابًا» كذبة:
    // الحساب لا يمنح الدور.
    content = <V.AdminRoute />
  } else if (view === 'coach') {
    // [SOVEREIGN-COACH-002] المرشد مسارٌ كامل لا نافذة: يُفتح بالرابط ويُغلق
    // بالرجوع، فيبقى قابلًا للمشاركة والاختبار كبقيّة الشاشات.
    content = <V.CoachView lang={LANG} onBack={() => setView('dashboard')} onNavigate={navigate} />
  } else if (view === 'calc') {
    content = (
      <V.CalcExplainerView
        lang={LANG}
        onBack={() => navigate(beforeCalcRef.current)}
        onEditProfile={openSetup}
      />
    )
  } else if (view === 'recovery') {
    content = <V.RecoveryView lang={LANG} onBack={() => navigate('dashboard')} onNavigate={navigate} />
  } else if (view === 'steps') {
    content = <V.StepsView lang={LANG} onBack={() => navigate('progress')} onOpenSettings={() => navigate('settings')} />
  } else {
    // ——— التبويبات الرئيسية داخل قشرة الجوال ———
    content = (
      <>
          <Suspense fallback={<TabSkeleton />}>
            <MobileShell
              lang={LANG}
              tab={(view === 'exercises' ? 'workout' : view === 'stats' ? 'dashboard' : view === 'measurements' ? 'progress' : view) as MainTab}
              badge={badge}
              onNavigate={navigate}
              onOpenSettings={() => setView('settings')}
              onQuickLog={openQuickLog}
              routineQuickLabel={routineQuickLabel}
            >
          {/* الرئيسية والتقدّم: fallback هيكلي لكل مسار (بدل AppLoading العام) — البيانات
              محلية متزامنة فلا يظهر الهيكل إلا أثناء تحميل حزمة الشاشة عند الطلب. */}
          {view === 'dashboard' && (
            <Suspense fallback={<DashboardSkeleton />}>
              <V.DashboardView lang={LANG} onNavigate={navigate} onQuickLog={openQuickLog} />
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
              <V.ProgressView lang={LANG} onNavigate={navigate} />
            </Suspense>
          )}
          {view === 'measurements' && (
            <Suspense fallback={<ProgressSkeleton />}>
              <V.MeasurementsView lang={LANG} onNavigate={navigate} />
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
          </Suspense>

        {showSuccess && (
          <Suspense fallback={null}>
            <SuccessToast onClose={dismissSuccess} />
          </Suspense>
        )}

        {/* احتفالات الأوسمة والأرقام القياسية — فوق كل الشاشات الرئيسية */}
        <Suspense fallback={null}>
          <AchievementToaster />
        </Suspense>
      </>
    )
  }

  // حدّ أخطاء المسارات فوق Suspense: فشل تحميل حزمة أو انهيار شاشة يعرض بطاقة
  // «أعد المحاولة» (تعيد إنشاء الحِزم الكسولة وتعيد الاستيراد) — لا شاشة بيضاء.
  return (
    <>
      {/* رابط التخطّي (QEA-005 — WCAG 2.4.1) — أول عنصر قابل للتركيز في الصفحة، قبل أي
          قشرة تطبيق. مخفي بصريًا افتراضيًا، يظهر عند تركيز لوحة المفاتيح (Tab من عنوان
          الصفحة). الهدف id="main-content" ثابت عبر كل الشاشات (وسم/تبويب/شاشة بداية…). */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[999] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg"
      >
        {LANG === 'en' ? 'Skip to main content' : 'تخطَّ إلى المحتوى الرئيسي'}
      </a>
      <RouteErrorBoundary onRetry={retryLazyViews}>
        <div id="main-content" tabIndex={-1} className="outline-none">
          <Suspense fallback={<LoadingFallback />}>{content}</Suspense>
        </div>
        {/*
          [QIM-WEB-FOUNDER-UX-003/حزمة ١] لا شريط تثبيت **ثابتًا** فوق جذر التطبيق.

          كان هنا `<InstallPrompt/>` بـ`fixed inset-x-0 bottom-0 z-[60]` وارتفاع
          مقيس ١٧٢بكسل على شاشة ٣٩٠×٧٨٠. وشريط التنقّل السفلي في القشرة `z-50`
          **داخل** التدفّق. فالنتيجة المقيسة: `elementFromPoint` في مركز كل عنصر
          من عناصر التنقّل الخمسة — وفي مركز «كمّل كضيف» على الهبوط، و«ادخل وشوف
          خطتي» على التسليم — كان يعيد الشريط لا الزرّ. أي أن **قاع التطبيق كله
          كان غير قابل للنقر** على أندرويد/كروم حيث يُطلق `beforeinstallprompt`.
          وهذا هو مصدر «يشتغل مرة وما يشتغل مرة»: النقر البرمجي يتجاوز اختبار
          الإصابة، والإصبع لا يتجاوزه.

          ولم تُحذف وظيفة: دعوة التثبيت **منفَّذة مرّتين** في هذا المستودع، وهذه
          هي النسخة الخاطئة. النسخة الصحيحة `InstallBanner` تُرسم في مسار القشرة
          (`MobileShell`) فلا يمكنها بنيويًا أن تعلو شيئًا، ودليل آيفون الدائم في
          الإعدادات (`InstallGuideSection`) لم يُمَس. ملف `InstallPrompt.tsx`
          يبقى كما هو — حذفه يخصّ موجة تنظيف الكود الميت المستقلّة (قرار المؤسس ١).

          يحرس هذا: `test:bottom-overlay` (بنيوي) و`test:e2e:install-overlap` (متصفّح).
        */}
        {/* بوّابة Premium — نداء واحد لكل فعل محجوب، من أي شاشة. تُرسم هنا مرّة
            واحدة فلا يبني كل سطح نافذته الخاصّة فتتفرّق الرسالة. */}
        <PremiumGateLayer lang={LANG} route={view} />
      </RouteErrorBoundary>
    </>
  )
}
