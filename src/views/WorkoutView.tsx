import { useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'
import { WorkoutMode } from '@/components/WorkoutMode'
import { WorkoutSummary } from '@/components/WorkoutSummary'
import type { Lang } from '@/lib/appPreferences'
import { formatNumber, formatNumeralsIn } from '@/lib/numberFormat'
import type { AppRoute } from '@/lib/appRoutes'
import { useAuth } from '@/lib/authContext'
import { useCustomization } from '@/lib/customizationContext'
import { planExerciseName } from '@/lib/workoutPlan'
import { currentWorkout, nextWorkout } from '@/lib/workoutDaySource'
import { clearActiveWorkout, completedSetCount, loadActiveWorkout, type ActiveWorkout } from '@/lib/activeWorkout'
import { SessionGuardDialog, type SessionGuardKind } from '@/components/SessionGuardDialog'
import { planTitle } from '@/lib/planGenerator'
import { cn } from '@/lib/cn'
import {
  CustomPlanBuilder,
  customPlanStrings,
  loadCustomPlanRecord,
  saveCustomPlan,
  setPlanSource,
  type PlanSource,
} from '@/features/customPlan'
import { getStrings } from '@/config/strings'
import { workoutScreenStrings } from '@/i18n/dict/workoutScreen'
import { commitFinishedSession } from '@/lib/finishWorkout'
import { restoreWorkoutStorage, snapshotWorkoutStorage } from '@/lib/workoutFinishUndo'
import type { WriteResult } from '@/lib/safeStorage'
import { trackLocal } from '@/lib/tracking'
import { completeFirstWin } from '@/lib/firstWin'
import { WarmupScreen } from '@/components/workout/WarmupScreen'
import { buildWarmupPlan, type WarmupPlan } from '@/lib/warmupPlan'
import { loadWarmupPref, saveWarmupPref } from '@/lib/strength/warmup'
import { estimateDurationMin } from '@/lib/workoutStats'
import { cappedSessionMinutes, easyExerciseCount, easyMinutesFor, isEasyToday } from '@/lib/easySession'
import { journeyDayIndex } from '@/lib/tracking/signals'
import { evaluateAchievements, registerWorkoutPRs } from '@/features/achievements/engine'
import { weeklyAdherenceStreak } from '@/lib/streaks'
import type { WorkoutSession } from '@/lib/workoutSessions'
import type { PlanDay } from '@/types/workout'
import { useAccess } from '@/lib/access/useAccess'

interface FinishSummary {
  session: WorkoutSession
  prs: string[]
  streakWeeks: number
  nextDayLabel?: string
}

interface WorkoutViewProps {
  lang: Lang
  onNavigate: (route: AppRoute) => void
}

/** تبويب التمرين — بدء سريع، خطتي المولّدة، وقوالبي. لا «قوالب جاهزة» — الخطة تُولَّد من بياناتك. */
export function WorkoutView({ lang, onNavigate }: WorkoutViewProps) {
  const { customization } = useCustomization()
  const auth = useAuth()
  const { guard: guardPaid } = useAccess()
  const userId = auth.user?.id ?? null
  const autoPlan = customization.workoutPlan

  // مصدر الجدول لكل حساب: مخصّص (إن وُجد واعتُمد) أو التلقائي المولّد.
  const [customRec, setCustomRec] = useState(() => loadCustomPlanRecord(userId))
  useEffect(() => {
    setCustomRec(loadCustomPlanRecord(userId))
  }, [userId])
  const source: PlanSource = customRec?.source ?? 'auto'
  const hasCustom = !!customRec && customRec.plan.days.length > 0
  const plan = source === 'custom' && hasCustom ? customRec.plan : autoPlan
  /**
   * [QIM-WEB-FOUNDER-UX-005/حزمة ٥] كان هنا `todayPlanDay(plan)` — التدوير
   * الأعمى الموسوم `@deprecated` في مصدره (`getDay() % days.length`)، ولا يعرف
   * الجدول الأسبوعي ولا أيام الراحة. و«اليوم» يقرأ الجدول الحقيقي. فالشاشتان
   * تتصادفان بالتاريخ وتفترقان به — وهو سبب تقطّع البلاغ.
   * الآن كلتاهما تسأل `currentWorkout`؛ ويوم الراحة يُعاد بصدق فلا يُعرض تمرينًا.
   */
  const scheduled = currentWorkout(userId, customization)
  const planDay = scheduled?.type === 'training' ? scheduled.day : undefined

  const cp = customPlanStrings[lang]
  const [builderOpen, setBuilderOpen] = useState<null | 'create' | 'edit'>(null)
  const [savedToast, setSavedToast] = useState(false)

  const refreshCustom = () => setCustomRec(loadCustomPlanRecord(userId))
  const switchSource = (s: PlanSource) => {
    setPlanSource(userId, s)
    refreshCustom()
  }

  // (ح-١) الجلسة الجارية لهذه الهوية — تُقرأ عند الدخول وبعد كل تغيّر في الحساب.
  const [pendingResume, setPendingResume] = useState<ActiveWorkout | undefined>(() =>
    loadActiveWorkout(userId),
  )
  useEffect(() => {
    setPendingResume(loadActiveWorkout(userId))
  }, [userId])
  const [resumeFrom, setResumeFrom] = useState<ActiveWorkout | undefined>(undefined)

  const [activeDay, setActiveDay] = useState<PlanDay | null>(null)
  const [summary, setSummary] = useState<FinishSummary | null>(null)
  /** فشل كتابة الجلسة — يُعرض بصدق ولا يُبتلع ([CTO-71] البند ٢). */
  const [saveError, setSaveError] = useState<WriteResult | null>(null)
  const tw = getStrings(lang).workout
  const d = workoutScreenStrings[lang]

  /**
   * [CTO-70] البند ٣ — النسخة المخفّفة ليوم واحد.
   * تقتطع **أوائل** تمارين اليوم (لا عيّنة عشوائية) فما يُنجزه المستخدم بداية
   * جلسته الحقيقية. والاقتطاع في الذاكرة فقط: `plan` المحفوظة لا تُمَس إطلاقًا،
   * والعلم مختوم باليوم فينتهي وحده — لا تعديل خطة ولا كتابة دائمة.
   */
  const applyEasyIfActive = (day: PlanDay): PlanDay => {
    const fullMin = customization.profile.workoutDuration > 0 ? customization.profile.workoutDuration : 0
    if (fullMin <= 0 || day.exercises.length === 0) return day

    // [CTO-70] البند ٤ — سقف الأسبوع الأول (≤١٥ دقيقة)، ثم البند ٣ — التخفيف
    // اليدوي. الأصغر منهما يفوز: من ضغط «ابدأ بنسخة أخفّ» في أسبوعه الأول
    // يحصل على الأخفّ فعلًا لا على السقف وحده.
    const capMin = cappedSessionMinutes(fullMin, journeyDayIndex())
    const targetMin = isEasyToday(userId) ? Math.min(capMin, easyMinutesFor(fullMin)) : capMin
    if (targetMin >= fullMin) return day

    const keep = easyExerciseCount(day.exercises.length, fullMin, targetMin)
    if (keep <= 0 || keep >= day.exercises.length) return day
    return { ...day, exercises: day.exercises.slice(0, keep) }
  }

  /**
   * [SOVEREIGN-TODAY-001] المهمّة ١ — الإحماء مرحلة قبل أول مجموعة عمل.
   *
   * كان `startDay` يدخل الجلسة الكاملة فورًا **ويستدعي** `completeFirstWin('warmup')`
   * في نفس اللحظة: أي أن التطبيق يُعلّم «إحماء دقيقتين» منجزًا لحظة بدء جلسة
   * ٤٥ دقيقة، بلا خطوة إحماء واحدة في المسار الحيّ. الآن الجلسة تُقرأ
   * «إحماء ← تمارين ← إنهاء»، والانتصار الأول يُسجَّل عند **إتمام** الإحماء لا
   * عند نيّة البدء — ومن تخطّاه لا يُحتسب له (النصّ في الشاشة يقولها صراحةً).
   */
  const [pendingWarmup, setPendingWarmup] = useState<{ day: PlanDay; plan: WarmupPlan } | null>(null)

  /** الدخول الفعلي لوضع الجلسة — نقطة واحدة يمرّ بها الإحماء والتخطّي معًا. */
  const beginSession = (day: PlanDay) => {
    setPendingWarmup(null)
    setResumeFrom(undefined)
    // [CTO-68] الحدث ١٠ — بدء تمرين، لحظة دخول وضع الجلسة.
    trackLocal('workout_session_started', { exercises: day.exercises.length })
    setActiveDay(day)
  }

  // [QIM-WEB-FOUNDER-UX-003/حزمة ٢] الطبقة الأولى — تجربة نظيفة: بوّابة Premium
  // بدل استثناء. الطبقة الثانية (`assertPaid` داخل `saveActiveWorkout`) هي التي
  // تصمد أمام الالتفاف؛ هذه تجعل الرفض مفهومًا لا مخيفًا.
  const startDay = guardPaid('workout.start', (rawDay: PlanDay) => {
    const day = applyEasyIfActive(rawDay)
    const warmup = buildWarmupPlan(day)
    // بلا خطوات إحماء (يوم بلا تمارين) أو بتعطيل صريح من المستخدم ⇒ لا شاشة
    // فارغة تُعترض الطريق. والوعد في «اليوم» يختفي بنفس الشرط — مصدر واحد.
    if (warmup.steps.length === 0 || !loadWarmupPref(userId).show) {
      beginSession(day)
      return
    }
    setPendingWarmup({ day, plan: warmup })
  })

  /** يوم الجلسة المعلّقة كما هو في الخطة الحالية — القرار على المعرّف لا على الاسم. */
  const resumeDay = pendingResume ? plan.days.find((dd) => dd.id === pendingResume.dayId) : undefined

  const resumeWorkout = () => {
    if (!pendingResume || !resumeDay) return
    setResumeFrom(pendingResume)
    setActiveDay(resumeDay)
    setPendingResume(undefined)
  }

  const discardResume = () => {
    // [CTO-68] الحدث ١٢ — قطع تمرين من نافذة استرجاع جلسة معلّقة، بموضع القطع.
    // المجموعات المنفّذة تُحصى **قبل** المسح — بعده تضيع الحالة.
    const completedSets = completedSetCount(pendingResume)
    trackLocal('workout_session_abandoned', { at: 'recovered-prompt', completedSets })
    clearActiveWorkout(userId)
    setPendingResume(undefined)
  }

  /**
   * [CTO-72] البند ٤ — حارس ترك الجلسة، عند جذره.
   *
   * كان للتخلّي عن جلسة مساران، وكلاهما يمضي **بلا سؤال**:
   *   • ✕ في وضع الجلسة ⇒ خروج فوري. العمل يبقى محفوظًا — فلا فقد، لكن لا طمأنة.
   *   • «ابدأ نظيفًا» ⇒ **مسح نهائي**. قِيس: مجموعة مسجَّلة واحدة، ضغطة واحدة،
   *     و`qimmah:activeWorkout:v1` يصير `{}` بلا حوار وبلا تراجع (§2-٣ من دستور
   *     الجودة: فشل/فقد صامت ممنوع).
   *
   * الحارس واحد لأن السؤال واحد: **هل في هذه الجلسة عمل للمستخدم؟** فإن لم يكن،
   * فالفعلان فوريّان كما كانا (الأمر: «مع بقاء الرجوع الفوري إذا لا تقدم») —
   * سؤالٌ عن قشرة فارغة ضريبةٌ بلا مقابل تُعلّم تجاهل النوافذ.
   * وإن كان، فلكلٍّ نصّه الصادق: التوقّف يطمئن أن العمل باقٍ، والمسح يقول إنه يزول.
   */
  const [guard, setGuard] = useState<{ kind: SessionGuardKind; sets: number } | null>(null)

  const requestDiscardResume = () => {
    const sets = completedSetCount(pendingResume)
    if (sets === 0) {
      discardResume()
      return
    }
    setGuard({ kind: 'discard', sets })
  }

  const startEmpty = guardPaid('workout.startEmpty', () => {
    // تمرين فارغ = بدء جلسة أيضًا (بلا تمارين من الخطة).
    trackLocal('workout_session_started', { exercises: 0 })
    setActiveDay({ id: `empty-${Date.now()}`, nameAr: d.emptyWorkoutNameAr, nameEn: d.emptyWorkoutNameEn, exercises: [] })
  })

  /**
   * الخروج من وضع الجلسة بلا إنهاء — [CTO-68] الحدث ١٢ بموضع القطع «session».
   * الجلسة نفسها **تبقى محفوظة** (تظهر لاحقًا كجلسة معلّقة للاستئناف)؛ الحدث يرصد
   * مغادرة الجلسة لا حذفها، والحذف يرصده `discardResume` بموضعه الخاص.
   */
  const closeWithoutFinishing = () => {
    const saved = loadActiveWorkout(userId)
    trackLocal('workout_session_abandoned', { at: 'session', completedSets: completedSetCount(saved) })
    setActiveDay(null)
    setPendingResume(saved ?? undefined)
  }

  /**
   * [CTO-72] البند ٤ — ما يستدعيه ✕ في وضع الجلسة. بلا تقدّم يخرج فورًا؛
   * ومع تقدّم يسأل أولًا. الحدث `workout_session_abandoned` يبقى في
   * `closeWithoutFinishing` — فلا يُسجَّل قطعٌ لم يقع لأن المستخدم تراجع.
   */
  const requestClose = () => {
    const sets = completedSetCount(loadActiveWorkout(userId))
    if (sets === 0) {
      closeWithoutFinishing()
      return
    }
    setGuard({ kind: 'stop', sets })
  }

  const confirmGuard = () => {
    const kind = guard?.kind
    setGuard(null)
    if (kind === 'stop') closeWithoutFinishing()
    else if (kind === 'discard') discardResume()
  }

  /**
   * [CTO-71] البند ٢ — إنهاء الجلسة بكتابة **متحقَّق منها**.
   *
   * كان يستدعي `persistFinishedSession` ويمضي إلى شاشة الملخّص مهما حدث: تخزين
   * ممتلئ أو محجوب ⇒ تختفي الجلسة بلا أثر ويُعرض «أحسنت». فشل صامت يكذب.
   * الآن نفس نمط V2: تأكيد ← كتابة ← **فحص** ← عند الفشل رسالة صادقة بالعامية،
   * والجلسة **تبقى قائمة** فلا يضيع عمل المستخدم ويستطيع إعادة المحاولة.
   */
  const finish = (session: WorkoutSession) => {
    const snapshot = snapshotWorkoutStorage()
    const commit = commitFinishedSession(session)
    if (!commit.ok) {
      restoreWorkoutStorage(snapshot)
      setSaveError(commit.failure ?? 'error')
      return
    }
    // لا تُمسح لقطة الاستئناف في الطفل قبل الكاتب. نجاح السجلّ ثم فشل تنظيف
    // اللقطة يُعادان معًا إلى ما قبل التأكيد، كي لا نعرض ملخّصًا ونترك تمرينًا
    // معلّقًا يظهر مجددًا بعد reload.
    const clearResult = clearActiveWorkout(userId)
    if (clearResult !== 'ok') {
      restoreWorkoutStorage(snapshot)
      setSaveError(clearResult)
      return
    }
    setSaveError(null)
    const prs = commit.prs
    // [CTO-68] الحدث ١١ — إكمال تمرين، بعد كتابة الجلسة في السجلّ الدائم.
    trackLocal('workout_session_completed', {
      exercises: session.exercises.length,
      sets: session.exercises.reduce((n, ex) => n + (ex.sets?.length ?? 0), 0),
    })
    const daysPerWeek = plan.days.length || 3
    // احتفل بالأرقام القياسية وافتح أوسمة التمرين/السلسلة/الأرقام القياسية فورًا.
    registerWorkoutPRs(prs)
    evaluateAchievements({ daysPerWeek })
    const weekly = weeklyAdherenceStreak(daysPerWeek)
    const prLabels = prs.map((pr) => {
      const name = lang === 'en' ? pr.nameEn || pr.nameAr : pr.nameAr || pr.nameEn
      return `${name || pr.exerciseId} · ${formatNumber(pr.weight, lang)} ${tw.volumeUnit}`
    })
    /**
     * [QIM-WEB-FOUNDER-UX-005/حزمة ٥] تمرينك القادم — من **نفس** مصدر «اليوم».
     *
     * كان هنا تدوير أعمى ثالث: `plan.days[(getDay() + 1) % days.length]`. أي أن
     * شاشة الإنهاء تَعِد بيوم لا علاقة له بما سيعرضه «اليوم» غدًا — والوعد
     * المكسور هنا أسوأ من غيره لأنه يقع في لحظة إنجاز.
     *
     * `nextWorkout` يتقدّم يومًا بيوم عبر الجدول الحقيقي، فيتخطّى الراحات
     * ويحترم التجاوزات. والثابت المطلوب يصير قابلًا للإثبات:
     *   Completion.next == Today.current في اليوم التالي.
     */
    const upcoming = nextWorkout(userId, customization)
    const nextDayLabel = upcoming ? formatNumeralsIn(lang === 'en' ? upcoming.day.day.nameEn : upcoming.day.day.nameAr, lang) : undefined
    setActiveDay(null)
    setSummary({ session, prs: prLabels, streakWeeks: weekly.streakWeeks, nextDayLabel })
  }

  return (
    <div className="px-4 py-4">
      <div className="space-y-8">
        {/* ترويسة */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="eyebrow">
              <Icon name="Dumbbell" className="h-3.5 w-3.5" />
              {d.workoutEyebrow}
            </span>
            {/* [SOVEREIGN-TODAY-001] `h2` لا `h1`: `MobileShell` يصدر `h1` الصفحة،
                وعنوانان من المستوى الأول على شاشة واحدة يكسران شجرة العناوين. */}
            <h2 className="mt-3 text-2xl font-black text-ink-900 sm:text-3xl">{d.workoutHeading}</h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('exercises')}
            aria-label={d.searchLibrary}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-700 shadow-card hover:bg-beige"
          >
            <Icon name="Search" className="h-5 w-5" />
          </button>
        </div>

        {/* بدء سريع */}
        <section>
          <H2 icon="Zap">{d.quickStart}</H2>
          <div className="grid gap-3 sm:grid-cols-2">
            {planDay && planDay.exercises.length > 0 && (
              <button
                type="button"
                onClick={() => startDay(planDay)}
                className="group flex items-center gap-3 rounded-2xl bg-primary p-4 text-start text-white shadow-glow"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20">
                  <Icon name="Flame" className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black">{d.startTodayWorkout}</span>
                  <span dir="auto" className="block truncate text-xs text-white/85">{formatNumeralsIn(lang === 'en' ? planDay.nameEn : planDay.nameAr, lang)} · {formatNumber(planDay.exercises.length, lang)} {d.exercisesUnit}</span>
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={startEmpty}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-start shadow-card hover:bg-beige"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
                <Icon name="Plus" className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-ink-900">{d.startEmptyWorkout}</span>
                <span className="block text-xs text-ink-400">{d.startEmptyDesc}</span>
              </span>
            </button>
          </div>
        </section>

        {/* (ح-١) جلسة لم تُنهَ — تُعرض فقط إن كان يومها ما زال في الخطة الحالية. */}
        {pendingResume && resumeDay && (
          <div className="card border-primary-soft p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
                <Icon name="RotateCcw" className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-ink-900">{d.resumeTitle}</p>
                <p dir="auto" className="mt-0.5 text-xs leading-relaxed text-ink-500">
                  {formatNumeralsIn(d.resumeBody.replace('{day}', lang === 'en' ? resumeDay.nameEn : resumeDay.nameAr), lang)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={resumeWorkout} className="btn-primary px-4 py-2.5 text-xs">
                    <Icon name="Play" className="h-4 w-4" />
                    {d.resumeAction}
                  </button>
                  <button type="button" onClick={requestDiscardResume} className="btn-ghost px-4 py-2.5 text-xs">
                    {d.resumeDiscard}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* خطتي */}
        <section id="workout-myplan">
          <H2 icon="CalendarDays">{d.myPlan}</H2>

          {/* مصدر الجدول (تلقائي/مخصّص) + إدارة الجدول المخصّص */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {hasCustom && (
              <div className="inline-flex rounded-xl border border-line bg-surface p-1" role="tablist" aria-label={cp.planSourceTitle}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={source === 'auto'}
                  onClick={() => switchSource('auto')}
                  className={cn('tap-target inline-flex items-center justify-center rounded-lg px-3 text-xs font-bold transition-colors', source === 'auto' ? 'bg-primary text-white' : 'text-ink-500 hover:text-ink-900')}
                >
                  {cp.useAuto}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={source === 'custom'}
                  onClick={() => switchSource('custom')}
                  className={cn('tap-target inline-flex items-center justify-center rounded-lg px-3 text-xs font-bold transition-colors', source === 'custom' ? 'bg-primary text-white' : 'text-ink-500 hover:text-ink-900')}
                >
                  {cp.useCustom}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setBuilderOpen(hasCustom ? 'edit' : 'create')}
              className="btn-ghost px-3 py-2 text-xs"
            >
              <Icon name={hasCustom ? 'SlidersHorizontal' : 'Plus'} className="h-4 w-4" />
              {hasCustom ? cp.editMyPlan : cp.createCustom}
            </button>
          </div>

          {plan.days.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-8 text-center">
              <p className="text-sm text-ink-500">{d.noPlanYet}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => onNavigate('setup')} className="btn-primary px-4 py-2.5 text-xs">
                  <Icon name="Sparkles" className="h-4 w-4" />
                  {d.createMyPlan}
                </button>
                <button type="button" onClick={() => setBuilderOpen('create')} className="btn-ghost px-4 py-2.5 text-xs">
                  <Icon name="SlidersHorizontal" className="h-4 w-4" />
                  {cp.createCustom}
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-ink-900">
                      {source === 'custom' ? cp.customPlanBadge : planTitle(plan.templateId, lang)}
                    </p>
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-black text-primary-c">
                      {source === 'custom' ? cp.customPlanBadge : cp.autoPlanBadge}
                    </span>
                  </div>
                  <p className="text-xs text-ink-400">{formatNumber(plan.days.length, lang)} {d.daysPerWeek}</p>
                </div>
                <button
                  type="button"
                  onClick={() => (source === 'custom' ? setBuilderOpen('edit') : onNavigate('setup'))}
                  className="btn-ghost shrink-0 px-3 py-2 text-xs"
                >
                  <Icon name={source === 'custom' ? 'SlidersHorizontal' : 'Palette'} className="h-4 w-4" />
                  {d.edit}
                </button>
              </div>

              {/* يوم اليوم */}
              {planDay && (
                <div className="mt-4 rounded-xl border border-line bg-page p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-primary-c">{d.todayWorkout}</p>
                      <p dir="auto" className="truncate text-sm font-bold text-ink-900">{formatNumeralsIn(lang === 'en' ? planDay.nameEn : planDay.nameAr, lang)}</p>
                      <p className="mt-0.5 truncate text-[11px] text-ink-400">
                        {planDay.exercises.slice(0, 4).map((pe) => planExerciseName(pe, lang)).join(' · ') || d.noExercises}
                      </p>
                    </div>
                    {planDay.exercises.length > 0 && (
                      <button type="button" onClick={() => startDay(planDay)} className="btn-primary shrink-0 px-4 py-2.5 text-xs">
                        <Icon name="Flame" className="h-4 w-4" />
                        {d.start}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* بقية الأيام */}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {plan.days.map((pd) => (
                  <button
                    key={pd.id}
                    type="button"
                    onClick={() => startDay(pd)}
                    className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3 text-start hover:bg-beige"
                  >
                    <span className="min-w-0">
                      <span dir="auto" className="block truncate text-sm font-bold text-ink-900">{formatNumeralsIn(lang === 'en' ? pd.nameEn : pd.nameAr, lang)}</span>
                      <span className="block text-[11px] text-ink-400">{formatNumber(pd.exercises.length, lang)} {d.exercisesUnit} · ~{formatNumber(estimateDurationMin(pd), lang)} {d.minShort}</span>
                    </span>
                    <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* [SOVEREIGN-TODAY-001] قسم «قوالبي» أُزيل: عنوانٌ يَعِد بميزة، وجسمه
            يشرح **ميزة أخرى** (توليد الخطة تلقائيًا)، وهو فارغ في كل حالة بلا
            زرّ واحد. يُعلّم المستخدم أن ميزةً موجودة لا يستطيع بلوغها أبدًا.
            نظام القوالب الفعلي (`src/features/customPlan/templates.ts`) كامل
            وبلا واجهة — وصلُه موجة ميزة لا بند تنظيف. */}
      </div>

      {/* باني الجدول المخصّص — إنشاء/تعديل، يعتمد الجدول لهذا الحساب عند الحفظ */}
      {builderOpen && (
        <div className="fixed inset-0 z-[65]">
          <CustomPlanBuilder
            lang={lang}
            initialPlan={builderOpen === 'edit' ? customRec?.plan : undefined}
            onSave={guardPaid('plan.saveEdit', (p) => {
              // [FINAL-CONVERGENCE] لا إشعار نجاح قبل تأكيد الكتابة (ميثاق §5).
              // كان الحفظ يُغلق الباني ويعرض «تم الحفظ» حتى بعد كتابة فاشلة،
              // فتضيع الخطة والمستخدم يقرأ نجاحًا. الآن: فشل ⇒ الباني يبقى
              // مفتوحًا بخطته كما هي، ورسالة صادقة تسمّي السبب.
              const { write } = saveCustomPlan(userId, p)
              if (write !== 'ok') {
                setSaveError(write)
                return
              }
              refreshCustom()
              setBuilderOpen(null)
              setSavedToast(true)
              window.setTimeout(() => setSavedToast(false), 2200)
            })}
            onCancel={() => setBuilderOpen(null)}
          />
          {saveError && (
            <div role="alert" className="pointer-events-none absolute inset-x-0 bottom-0 z-[66] p-4" style={{ paddingBottom: 'max(1rem, var(--safe-bottom))' }}>
              <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-line bg-surface p-4 shadow-card">
                <p className="text-sm font-black text-ink-900">{d.saveFailedTitle}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">
                  {saveError === 'quota' ? d.saveFailedQuota : saveError === 'unavailable' ? d.saveFailedBlocked : d.saveFailedGeneric}
                </p>
                <p className="mt-2 text-xs font-bold leading-relaxed text-ink-700">{d.customPlanKeptOnFailure}</p>
                <button type="button" onClick={() => setSaveError(null)} className="btn-ghost mt-3 min-h-[44px] w-full py-2.5 text-xs">
                  {d.saveBackToWorkout}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* إشعار حفظ الجدول المخصّص */}
      {savedToast && (
        <div className="fixed inset-x-0 bottom-24 z-[75] flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-glow">
            <Icon name="CheckCircle2" className="h-4 w-4" />
            {cp.planSavedToast}
          </div>
        </div>
      )}

      {/* [SOVEREIGN-TODAY-001] المهمّة ١ — الإحماء: المرحلة الأولى من الجلسة،
          فوق الشريط السفلي وتحت وضع الجلسة. تُغلق بالدخول أو بالتخطّي، ولا
          تُعرض لجلسة مُستأنَفة (تلك بدأت أصلًا فالإحماء ورائها). */}
      {pendingWarmup && !activeDay && (
        <div className="fixed inset-0 z-[60]">
          <WarmupScreen
            lang={lang}
            plan={pendingWarmup.plan}
            dayNameAr={pendingWarmup.day.nameAr}
            dayNameEn={pendingWarmup.day.nameEn}
            onStart={() => {
              // [CTO-70] البند ١ — الآن فقط: الإحماء وقع فعلًا، فيُسجَّل.
              completeFirstWin('warmup')
              beginSession(pendingWarmup.day)
            }}
            onSkip={() => beginSession(pendingWarmup.day)}
            onDisable={() => {
              saveWarmupPref(userId, { show: false })
              beginSession(pendingWarmup.day)
            }}
          />
        </div>
      )}

      {/* وضع التمرين — فوق الشريط السفلي */}
      {activeDay && (
        <div className="fixed inset-0 z-[60]">
          <WorkoutMode lang={lang} day={activeDay} userId={userId} resume={resumeFrom} onClose={requestClose} onFinish={finish} onSaveError={setSaveError} />
          {/* [CTO-71] البند ٢ — فشل الحفظ يُقال صراحةً فوق الجلسة القائمة.
              لا شاشة ملخّص ولا «أحسنت»: العمل لم يُحفَظ، والجلسة باقية للمحاولة. */}
          {saveError && (
            <div role="alert" className="pointer-events-none absolute inset-x-0 bottom-0 z-[65] p-4" style={{ paddingBottom: 'max(1rem, var(--safe-bottom))' }}>
              <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-line bg-surface p-4 shadow-card">
                <p className="text-sm font-black text-ink-900">{d.saveFailedTitle}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">
                  {saveError === 'quota' ? d.saveFailedQuota : saveError === 'unavailable' ? d.saveFailedBlocked : d.saveFailedGeneric}
                </p>
                <p className="mt-2 text-xs font-bold leading-relaxed text-ink-700">{d.saveFailedKept}</p>
                <button type="button" onClick={() => setSaveError(null)} className="btn-ghost mt-3 min-h-[44px] w-full py-2.5 text-xs">
                  {d.saveBackToWorkout}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ملخّص نهاية التمرين — المدة وعدد التمارين والحجم والأرقام القياسية */}
      {summary && (
        <div className="fixed inset-0 z-[70]">
          <WorkoutSummary
            lang={lang}
            session={summary.session}
            prs={summary.prs}
            streakWeeks={summary.streakWeeks}
            nextDayLabel={summary.nextDayLabel}
            onBackToToday={() => {
              setSummary(null)
              onNavigate('dashboard')
            }}
            onViewProgress={() => {
              setSummary(null)
              onNavigate('progress')
            }}
          />
        </div>
      )}

      {/* [CTO-72] البند ٤ — حارس ترك الجلسة. z-[80] فوق وضع الجلسة (60) وفوق
          الملخّص (70): سؤالٌ يُغطّى بما يسأل عنه ليس سؤالًا. */}
      {guard && (
        <SessionGuardDialog
          lang={lang}
          kind={guard.kind}
          sets={guard.sets}
          onConfirm={confirmGuard}
          onCancel={() => setGuard(null)}
        />
      )}
    </div>
  )
}

function H2({ icon, children }: { icon: string; children: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-ink-900">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary-c">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      {children}
    </h2>
  )
}
