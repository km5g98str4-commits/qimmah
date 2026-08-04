import { useEffect, useMemo, useState } from 'react'
import type { QuickLogTarget } from '@/components/MobileShell'
import { Icon } from '@/components/Icon'
import { MinorGoalNotice } from '@/components/MinorGoalNotice'
import { V2_TODAY } from '@/design-system/v2/labels'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { useCustomization } from '@/lib/customizationContext'
import { buildWeeklyInsights } from '@/lib/insights'
import { InsightCardsView } from '@/lib/insights/InsightCardsView'
import { loadLogs } from '@/lib/measurementLog'
import { buildNutritionV2Model } from '@/lib/nutritionV2Model'
import { getDayStamp } from '@/lib/today'
import { buildTodayV2Model } from '@/lib/todayV2Model'
import { playHaptic } from '@/lib/nativeFeedback'
import { trackLocal } from '@/lib/tracking'
import { FirstWinCard } from '@/components/today/FirstWinCard'
import { NotifyAskSheet } from '@/components/today/NotifyAskSheet'
import { MissedDayCard } from '@/components/today/MissedDayCard'
import { WeekSummaryScreen } from '@/components/today/WeekSummaryScreen'
import { buildWeekSummary, markWeekSummarySeen, shouldShowWeekSummary } from '@/lib/weekSummary'
import { easyMinutesFor, enableEasyToday, isThursdayMorning } from '@/lib/easySession'
import { firstWeekStrings } from '@/i18n/dict/firstWeek'
import { loadFirstWin, suggestFirstWin } from '@/lib/firstWin'
import { markNotifyAsked, shouldAskNotify } from '@/lib/notifyAsk'
import { useAuth } from '@/lib/authContext'
import { DEFAULT_NOTIFICATION_PREFS, loadNotificationPrefs, saveNotificationPrefs } from '@/lib/notifications/prefs'
import type { NotificationPrefs } from '@/lib/notifications/types'
import { requestNotificationPermission, reconcileNotificationSchedule } from '@/lib/notifications/engine'
import { hasEventToday, journeyDayIndex } from '@/lib/tracking/signals'
import { useAchievementsEngine } from '@/features/achievements/useAchievements'

interface TodayV2Props {
  lang: Lang
  onNavigate: (route: AppRoute) => void
  onQuickLog?: (target: QuickLogTarget) => void
}

type ActionKey = 'workout' | 'meal' | 'water' | 'progress'

interface TodayAction {
  key: ActionKey
  title: string
  body: string
  cta: string
  icon: string
  tone: 'ember' | 'green' | 'blue' | 'violet'
  done: boolean
  onClick: () => void
}

const ACTION_TONE: Record<TodayAction['tone'], string> = {
  ember: 'var(--v2-pillar-train)',
  green: 'var(--v2-green-text)',
  blue: 'var(--v2-pillar-move)',
  violet: 'var(--v2-pillar-recover)',
}

/**
 * ألوان حلقات الماكروز — سعرات أزرق · كارب كهرماني · بروتين أخضر · دهون بنفسجي.
 * الدهون لا نظير لها في التوكنز (`--v2-pillar-recover` فيروزي = لون التعافي)،
 * فلها لون مسمّى هنا حتى لا تتكرّر دلالة الفيروزي على سطحين مختلفين.
 */
const MACRO_TONE = {
  calories: 'var(--v2-pillar-move)',
  carbs: '#e0941f',
  protein: 'var(--v2-green-text)',
  fat: '#8b8fd6',
} as const

/**
 * الصفحة الرئيسية هي مركز تنفيذ سريع: أربع مهام مفهومة، مرتبة حسب ما بقي فعلًا.
 * المهمة المنجزة لا تختفي؛ تنكمش تحت «تم اليوم» حتى يظل الوصول إليها مباشرًا.
 */
export function TodayV2({ lang, onNavigate, onQuickLog }: TodayV2Props) {
  const { customization } = useCustomization()
  // الرئيسية هي السطح الحيّ الدائم — تركيب محرّك الأوسمة هنا يُعيد وصله ببيانات
  // المستخدم الحقيقية (بروتين اليوم/الهدف/أيام الخطة). بلا هذا يبقى المحرّك
  // معزولًا وتصير أوسمة البروتين غير قابلة للفتح. لا أثر بصري.
  useAchievementsEngine()
  const auth = useAuth()
  const ar = lang !== 'en'
  const copy = V2_TODAY[ar ? 'ar' : 'en']
  const model = useMemo(() => buildTodayV2Model(customization, lang), [customization, lang])
  const nutrition = useMemo(() => buildNutritionV2Model(customization, lang), [customization, lang])
  const todayWeightLogged = loadLogs().some(
    (log) => log.date === getDayStamp() && log.values.weightKg !== undefined && log.values.weightKg !== '',
  )
  // [CTO-68] الحدث ١٣ — عودة بعد يوم فائت: أول عرض لحالة «العودة بعد انقطاع».
  // مرّة واحدة في اليوم لا مرّة في كل تركيب: الشاشة تُركَّب مع كل رجوع لتبويب اليوم،
  // والمقصود عودةُ المستخدم لا عددُ زياراته للتبويب. المخزن نفسه هو دفتر منع التكرار.
  useEffect(() => {
    if (model.state !== 'returnAfterBreak') return
    if (hasEventToday('return_after_missed_day')) return
    trackLocal('return_after_missed_day', { daysAway: model.daysSinceLastWorkout ?? 0 })
  }, [model.state, model.daysSinceLastWorkout])

  // [CTO-70] البند ١ — أول انتصار. يُعرض للقادم الجديد حتى يُنجزه، ثم يبقى معلَّمًا
  // «تم» بقية اليوم. `nutrition`/`model` في التبعيات لأن الإنجاز يقع في سطح آخر
  // (تسجيل ماء/وجبة/بدء تمرين) فتُعاد القراءة عند أول عودة للوحة.
  const firstWin = useMemo(
    () => loadFirstWin(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nutrition.calories.consumed, nutrition.water.consumedMl, model.state],
  )
  const firstWinSuggestion = useMemo(() => suggestFirstWin(), [])
  // البطاقة ترحيبية لا دائمة: تُعرض للقادم الجديد ما دام لم يُنجز، وتبقى معلَّمة «تم»
  // بقيّة يوم الإنجاز وحده ثم تختفي. من لديه تاريخ فعلي ليس قادمًا جديدًا فلا تُلاحقه.
  const firstWinDoneToday = firstWin.completed && !!firstWin.at && getDayStamp(new Date(firstWin.at)) === getDayStamp()
  const showFirstWin = ((!firstWin.completed && model.state === 'newUser') || firstWinDoneToday) && model.state !== 'returnAfterBreak'

  // [CTO-70] البند ٢ — سطح إذن الإشعارات: مرّة واحدة، **بعد** أول انتصار.
  // الترتيب مقصود: نطلب الإذن بعد أن يرى المستخدم قيمة، لا قبلها.
  const uid = auth.user?.id ?? null
  const [askOpen, setAskOpen] = useState(() => shouldAskNotify(loadFirstWin().completed))
  const [askPrefs] = useState<NotificationPrefs>(() => (uid ? loadNotificationPrefs(uid) : DEFAULT_NOTIFICATION_PREFS))
  useEffect(() => {
    if (firstWin.completed && shouldAskNotify(true)) setAskOpen(true)
  }, [firstWin.completed])

  /**
   * التفعيل الذرّي — منسوخ حرفيًا من `NotificationsSettingsV2.onToggleMaster:97`:
   * الإذن أولًا، ورفع `masterEnabled` **فقط** عند `granted`، ثم مصالحة الجدول.
   * القرار يُثبَّت في الحالتين فلا يتكرّر السؤال (الرفض المحترَم هو المسجَّل).
   */
  const acceptNotify = async (time: string): Promise<'granted' | 'denied' | 'unsupported'> => {
    const perm = await requestNotificationPermission()
    if (perm === 'granted' && uid) {
      const next: NotificationPrefs = { ...askPrefs, masterEnabled: true, workoutDay: { ...askPrefs.workoutDay, enabled: true, time } }
      saveNotificationPrefs(uid, next)
      void reconcileNotificationSchedule(uid, auth.recoveryActive, lang)
    }
    markNotifyAsked(perm === 'granted' ? 'accepted' : 'declined')
    if (perm === 'granted') setAskOpen(false)
    return perm
  }

  /**
   * [CTO-71] البند ٦ — تحفّظ [CTO-70] الليلي: سطر الخميس الاستباقي كان يضيع.
   *
   * السبب الحقيقي: `isThursdayMorning()` يُقيَّم **عند كل رسم**. فإذا فتح المستخدم
   * التطبيق ١١:٣٠ صباح الخميس وعلاه سطحٌ أولى منه (ملخّص اليوم ٧ أو سؤال الإذن)
   * ثم أغلقه ١٢:٠٥ — صار الشرط كاذبًا ولم يرَ السطر أبدًا. النافذة استُهلكت بسطح
   * آخر، والسطر استباق: عرضه بعد فوات اليوم يقلبه لومًا (§6).
   *
   * العلاج: تُلتقط النافذة **مرّة عند التركيب** وتبقى لهذه الجلسة. فيُرحَّل السطر
   * إلى ما بعد انزياح السطح — **في صباح الخميس نفسه** لا في يوم آخر.
   */
  const [thursdayWindow] = useState(() => isThursdayMorning())

  // [CTO-70] البند ٥ — ملخّص اليوم السابع: يُعرض عند فتح اليوم ٨، مرّة واحدة.
  const [weekOpen, setWeekOpen] = useState(() => shouldShowWeekSummary(uid))
  const weekStats = useMemo(() => (weekOpen ? buildWeekSummary() : null), [weekOpen])
  useEffect(() => {
    // الحدث يُطلق عند **الوصول للشاشة** لا عند حساب شرطها.
    if (weekOpen) trackLocal('day7_summary_reached', { dayIndex: journeyDayIndex() ?? 8 })
  }, [weekOpen])
  /**
   * آخر وزن مسجَّل — أو `null` فيُقال ذلك صراحةً بدل رقم مخترع.
   * يُحسب عند فتح الشاشة وحدها (قراءة واحدة رخيصة)، فلا حاجة لتذكيره.
   */
  const lastWeight = weekOpen
    ? (loadLogs()
        .filter((l) => l.values.weightKg !== undefined && l.values.weightKg !== '')
        .sort((a, b) => a.date.localeCompare(b.date))
        .at(-1)?.values.weightKg ?? null)
    : null
  const lastWeightText = lastWeight === null ? null : String(lastWeight)

  const trainPillar = model.pillars.find((pillar) => pillar.key === 'train')
  const workoutDone = trainPillar?.state === 'done'
  const mealDone = nutrition.calories.target > 0 && nutrition.calories.consumed >= nutrition.calories.target
  const waterDone = nutrition.water.targetMl > 0 && nutrition.water.consumedMl >= nutrition.water.targetMl
  const hasMeal = nutrition.meals.some((meal) => meal.logged)

  /**
   * [CTO-72] البند ١ — اللوحة تفتح بحالة فارغة ذكية.
   *
   * ما كان يحدث: القادم الجديد يدخل اللوحة فيستقبله **صفٌّ من الأصفار** — أربع
   * حلقات ماكرو تعرض `0`/`0`/`0`/`0` بحجمها الكامل، وسطر `0/2,207 كالوري`
   * فوقها، وبطاقة «نبض أسبوعك» بحجم بطاقة ممتلئة لتقول «نحتاج بيانات أكثر»،
   * وبطاقتا مهمّة تعيدان الرقم نفسه صفرًا («٠ من ٢٬٢٠٧ سعرة» · «٠ من ٣ لتر»).
   * فأول انطباع عن التطبيق **لوحة قياس معطّلة**، لا دعوة للبدء.
   *
   * `hasTodaySignal` يسأل سؤالًا واحدًا: **هل يوجد شيء يُعرض أصلًا اليوم؟**
   * وهو مشتقّ من نفس المصادر التي تُغذّي البطاقات — لا علم منفصل يشيخ.
   *
   * والقيد `model.state === 'newUser'` مقصود: `newUser` تعني «لا تاريخ إطلاقًا»
   * (`!onboarded || !hasHistory` في `todayV2Model`). صاحبُ تاريخٍ يفتح صباح يوم
   * جديد **يريد** رؤية حلقاته صفرًا — تلك أرقام يومه لا فراغ. فالإخفاء للقادم
   * الجديد وحده، ويزول عند **أول** تسجيل: كوب ماء واحد يُعيد اللوحة كاملة.
   */
  const hasTodaySignal =
    nutrition.calories.consumed > 0 ||
    nutrition.water.consumedMl > 0 ||
    hasMeal ||
    todayWeightLogged ||
    trainPillar?.state === 'done' ||
    trainPillar?.state === 'active'
  const blankSlate = model.state === 'newUser' && !hasTodaySignal

  const quick = (target: QuickLogTarget, fallback: AppRoute) => {
    if (onQuickLog) onQuickLog(target)
    else onNavigate(fallback)
  }

  const actions: TodayAction[] = [
    {
      key: 'workout',
      title: copy.workout,
      body: model.hero.destination === 'workout' ? model.hero.subtitle : copy.workoutFallback,
      cta: trainPillar?.state === 'active' ? copy.workoutContinue : copy.workoutCta,
      icon: 'Dumbbell',
      tone: 'ember',
      done: workoutDone,
      onClick: () => onNavigate('workout'),
    },
    {
      key: 'meal',
      title: hasMeal ? copy.meal : copy.firstMeal,
      // البند ١: قبل أول تسجيل نقول ما الذي سيحدث، لا «٠ من ٢٬٢٠٧».
      body: nutrition.calories.target > 0 && !blankSlate
        ? copy.calories(nutrition.calories.consumed, nutrition.calories.target)
        : copy.mealFallback,
      cta: copy.mealCta,
      icon: 'Utensils',
      tone: 'green',
      done: mealDone,
      onClick: () => quick('meal', 'nutrition'),
    },
    {
      key: 'water',
      title: copy.water,
      body: nutrition.water.targetMl > 0 && !blankSlate
        ? copy.waterAmount(nutrition.water.consumedMl, nutrition.water.targetMl)
        : copy.waterFallback,
      cta: copy.waterCta,
      icon: 'Droplets',
      tone: 'blue',
      done: waterDone,
      onClick: () => quick('water', 'nutrition'),
    },
    {
      key: 'progress',
      title: copy.progress,
      body: copy.progressBody,
      cta: copy.progressCta,
      icon: 'TrendingUp',
      tone: 'violet',
      done: todayWeightLogged,
      onClick: () => onNavigate('progress'),
    },
  ]

  const pending = actions.filter((action) => !action.done)
  const completed = actions.filter((action) => action.done)
  const insights = buildWeeklyInsights(ar ? 'ar' : 'en')

  // [CTO-73] التصادم — زرّ «تسجيل» المرفوع كان يغطّي آخر صفّ مهمّة
  // (elementFromPoint في مركزه يعيد «تسجيل»). `pb-28` تُخلّصه.
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light bg-page px-4 pb-36 pt-4 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-md space-y-5">
        {/* [CTO-73] الشاشة ٢ — التحية والتاريخ سطر واحد. كانا سطرين مستقلّين،
            والتاريخ **سياقٌ للتحية** لا خبرٌ ثانٍ يستحقّ صفًّا خاصًّا به. */}
        <header>
          <h2 className="text-2xl font-black tracking-tight">
            {model.greeting}
            <span className="ms-2 align-middle text-sm font-bold text-ink-500">{model.dateLabel}</span>
          </h2>
        </header>

        <MinorGoalNotice lang={lang} />

        {/* [CTO-70] البند ٤ — سطر الخميس الاستباقي (ADV-19/21): يُعرض صباح الخميس
            وحده، **قبل** أن يفوت اليوم لا بعده. استباق لا لوم، ونبرة محايدة. */}
        {thursdayWindow && (
          <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-base leading-relaxed text-ink-700">
            {firstWeekStrings[ar ? 'ar' : 'en'].thursdayHeadsUp}
          </p>
        )}

        {/* [CTO-70] البند ٣ — بروتوكول التعثّر: يحلّ محلّ أول انتصار عند العودة
            بعد انقطاع، فلا تتزاحم بطاقتا ترحيب على نفس الشاشة. */}
        {model.state === 'returnAfterBreak' && (
          <MissedDayCard
            lang={lang}
            fullMin={model.durationMin}
            easyMin={easyMinutesFor(model.durationMin)}
            onStartEasy={() => { enableEasyToday(); onNavigate('workout') }}
          />
        )}

        {/* [CTO-70] البند ١ — أول انتصار: أعلى الشاشة لأنه أول ما يجب أن يُرى. */}
        {showFirstWin && (
          <FirstWinCard
            lang={lang}
            suggestion={firstWinSuggestion}
            done={firstWin.completed}
            doneKind={firstWin.kind}
            onPick={(kind) => {
              // الضغطة توصّل للسطح الحيّ؛ الإنجاز يُسجَّل عند وقوع الفعل هناك.
              if (kind === 'warmup') onNavigate('workout')
              else if (kind === 'water') quick('water', 'nutrition')
              else quick('meal', 'nutrition')
            }}
          />
        )}

        {/* ماكروز اليوم — حلّت محلّ البطاقة البارزة. تلك كانت `bg-ink-900`، وهو
            لون ينقلب فاتحًا في السمة الداكنة فيظهر مربعًا أبيض يضرب الخلفية.
            والمحتوى هنا أنفع: أرقام اليوم مباشرةً بدل تكرار زرّ التمرين.

            [CTO-72] البند ١ — لكنها **أرقام**، والقادم الجديد بلا أرقام. تظهر
            عند أول تسجيل لا قبله: بطاقة أصفار ليست معلومة، هي ضجيج بحجم بطاقة. */}
        {/* [CTO-73] الشاشة ٢ — الماكروز **سطر مضغوط لا أربع بطاقات حلقات**.
            الحلقات كانت تحجز ثلث الطية لتقول أربعة أرقام؛ والسطر يقولها كلّها
            في صفّ واحد قابل للنقر إلى التغذية. لا معلومة نقصت — الحلقات كاملةً
            في شاشة التغذية، وهذا سطرُ حالةٍ لا لوحةُ قياس.

            [CTO-72] البند ١ ساري كما هو: بلا أي تسجيل لا يُعرض السطر أصلًا. */}
        {!blankSlate && (
          <button
            type="button"
            onClick={() => { void playHaptic('selection'); onNavigate('nutrition') }}
            aria-label={`${copy.macrosTitle} — ${copy.macrosLink}`}
            className="v2-pressable flex min-h-[44px] w-full items-center gap-2 overflow-x-auto rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-start"
          >
            <Icon name="Flame" className="h-4 w-4 shrink-0" style={{ color: MACRO_TONE.calories }} />
            <span className="shrink-0 text-sm font-bold text-ink-500">{copy.macroStripLead}</span>
            <span className="flex flex-1 items-center gap-3 whitespace-nowrap">
              <MacroChip label={copy.macroCaloriesLabel} consumed={nutrition.calories.consumed} target={nutrition.calories.target} color={MACRO_TONE.calories} />
              <MacroChip label={copy.macroCarbs} consumed={nutrition.macros.carbs.consumed} target={nutrition.macros.carbs.target} color={MACRO_TONE.carbs} />
              <MacroChip label={copy.macroProtein} consumed={nutrition.macros.protein.consumed} target={nutrition.macros.protein.target} color={MACRO_TONE.protein} />
              <MacroChip label={copy.macroFat} consumed={nutrition.macros.fat.consumed} target={nutrition.macros.fat.target} color={MACRO_TONE.fat} />
            </span>
            <Icon name={ar ? 'ChevronLeft' : 'ChevronRight'} className="h-4 w-4 shrink-0 text-ink-400" />
          </button>
        )}

        {/* ═══ [CTO-73] الشاشة ٢ — «وين أنا اليوم؟» ═══
            كانت أربع مهامّ **متساوية** في مربّعات كبيرة بعمودين، فلا شيء يقول
            «ابدأ من هنا»؛ والشاشة تعرض قائمة لا إجابة.

            الآن: **البطاقة الأولى هي الإجراء التالي** — أبرزُ ما في الشاشة —
            والبقيّة صفوف مضغوطة تحتها. لا مهمّة حُذفت؛ تغيّر **وزنها البصري**
            بحسب دورها. والعنوان صار `sr-only`: الصفوف تقول نفسها، وعنوانٌ فوق
            قائمة بديهية يزاحمها ولا يشرحها (لقارئ الشاشة يبقى كما هو). */}
        <section aria-labelledby="today-remaining-title">
          <h2 id="today-remaining-title" className="sr-only">
            {copy.remainingTitle} — {copy.remainingCount(pending.length)}
          </h2>

          {pending.length > 0 ? (
            <div className="space-y-2.5">
              <ActionCard action={pending[0]} lang={lang} hero eyebrow={copy.heroEyebrow} />
              {pending.slice(1).map((action) => (
                <ActionCard key={action.key} action={action} lang={lang} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-[color:var(--v2-green-text)]">
                <Icon name="Check" className="h-5 w-5" strokeWidth={3} />
              </span>
              <h3 className="mt-4 text-lg font-black">{copy.allDoneTitle}</h3>
              <p className="mt-1 text-base leading-relaxed text-ink-500">{copy.allDoneBody}</p>
            </div>
          )}
        </section>

        {completed.length > 0 && (
          <section aria-labelledby="today-completed-title">
            <h2 id="today-completed-title" className="mb-2 text-base font-black text-ink-700">{copy.completedTitle}</h2>
            <div className="space-y-2">
              {completed.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => { void playHaptic('selection'); action.onClick() }}
                  className="v2-pressable flex min-h-[3.5rem] w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-start"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-[color:var(--v2-green-text)]">
                    <Icon name="Check" className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <span className="min-w-0 flex-1 text-base font-black">{action.title}</span>
                  <span className="text-sm font-bold text-[color:var(--v2-green-text)]">{copy.completed}</span>
                  <Icon name={ar ? 'ChevronLeft' : 'ChevronRight'} className="h-4 w-4 text-ink-400" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* [CTO-72] البند ١ — «نبض أسبوعك» بلا أسبوع ليس نبضًا: بطاقة بحجم
            البطاقة الممتلئة تقول «نحتاج بيانات أكثر». تظهر عند وجود ما يُقرأ. */}
        {!blankSlate && (
          <InsightCardsView
            cards={insights.cards}
            lang={ar ? 'ar' : 'en'}
            onNavigate={onNavigate}
            title={copy.weeklyTitle}
            max={1}
          />
        )}

        {model.trustNote && (
          <p className="px-2 text-center text-sm leading-relaxed text-ink-400">{model.trustNote}</p>
        )}
      </div>

      {/* [CTO-70] البند ٥ — ملخّص اليوم السابع فوق كل شيء: شاشة واحدة كاملة. */}
      {weekOpen && weekStats && (
        <WeekSummaryScreen
          lang={lang}
          stats={weekStats}
          weightKg={lastWeightText}
          // عرض الحساب للضيف وحده — صاحب الحساب لا يُعرض عليه ما يملكه.
          showAccountOffer={!uid}
          onCreateAccount={() => { markWeekSummarySeen(uid); setWeekOpen(false); onNavigate('login') }}
          onClose={() => { markWeekSummarySeen(uid); setWeekOpen(false) }}
        />
      )}

      {/* [CTO-70] البند ٢ — يُعرض مرّة واحدة بعد أول انتصار. الرفض يُثبَّت فلا يعود. */}
      {askOpen && (
        <NotifyAskSheet
          lang={lang}
          prefs={askPrefs}
          onAccept={acceptNotify}
          onDecline={() => { markNotifyAsked('declined'); setAskOpen(false) }}
        />
      )}
    </div>
  )
}

/**
 * بطاقة مهمّة — [CTO-73] الشاشة ٢.
 *
 * صيغتان لدورين مختلفين، لا حجمان لذوق:
 *   • `hero` — **الإجراء التالي**. بطاقة بارزة بلمحة لون وعنوان كبير: هي إجابة
 *     الشاشة عن «وين أنا اليوم؟»، فتأخذ وزنها البصري.
 *   • الافتراضي — صفٌّ مضغوط للمهامّ الباقية: أيقونة · عنوان · حالة · سهم.
 *     المهمّة نفسها والفعل نفسه؛ ما تغيّر هو **ادّعاؤها للانتباه**.
 */
function ActionCard({ action, lang, hero, eyebrow }: { action: TodayAction; lang: Lang; hero?: boolean; eyebrow?: string }) {
  const ar = lang !== 'en'
  const color = ACTION_TONE[action.tone]
  const chevron = ar ? 'ChevronLeft' : 'ChevronRight'

  if (!hero) {
    return (
      <button
        type="button"
        onClick={() => { void playHaptic('selection'); action.onClick() }}
        className="v2-pressable flex min-h-[3.75rem] w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 text-start text-ink-900"
      >
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
        >
          <Icon name={action.icon} className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-black leading-tight">{action.title}</span>
          <span className="mt-0.5 block truncate text-sm text-ink-500">{action.body}</span>
        </span>
        <Icon name={chevron} className="h-4 w-4 shrink-0 text-ink-400" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => { void playHaptic('selection'); action.onClick() }}
      className="v2-pressable relative flex w-full flex-col overflow-hidden rounded-3xl border bg-surface p-4 text-start text-ink-900 shadow-card"
      style={{ borderColor: `color-mix(in srgb, ${color} 32%, rgb(var(--c-line)))` }}
    >
      <span
        className="pointer-events-none absolute -end-8 -top-10 h-28 w-28 rounded-full opacity-20"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="relative flex items-center gap-2">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
        >
          <Icon name={action.icon} className="h-5 w-5" strokeWidth={2.5} />
        </span>
        {/* [CTO-73] AA — لون اللمحة كان لون النغمة (3.5:1 عند 14px). اللمحة
            **تسمية** لا لهجة؛ فأخذت لون النصّ الثانوي، وبقي لون النغمة للفعل. */}
        {eyebrow && (
          <span className="text-sm font-black uppercase tracking-widest text-ink-700">{eyebrow}</span>
        )}
      </span>
      <span className="relative mt-3 block text-xl font-black leading-tight">{action.title}</span>
      <span className="relative mt-1 block text-base leading-relaxed text-ink-500">{action.body}</span>
      <span className="relative mt-3 flex items-center gap-1 text-base font-black" style={{ color }}>
        {action.cta}
        <Icon name={chevron} className="h-4 w-4" />
      </span>
    </button>
  )
}

/**
 * رقاقة ماكرو واحدة داخل السطر المضغوط — [CTO-73] الشاشة ٢.
 *
 * تقول **المتبقّي** لأنه الرقم الذي يُتصرَّف به («باقي لك اليوم»)، لا المستهلَك.
 * وبلا هدف مضبوط تعرض «—» لا رقمًا مخترَعًا (§5: الصدق قبل الطمأنينة) — نفس
 * عقد `MacroRing` التي حلّت محلّها، بمساحة صفٍّ واحد بدل ثلث الطية.
 */
function MacroChip({ label, consumed, target, color }: { label: string; consumed: number; target: number; color: string }) {
  const hasTarget = target > 0
  const remaining = Math.max(0, Math.round(target - consumed))
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-sm font-bold text-ink-500">{label}</span>
      <span dir="ltr" className="text-base font-black tabular-nums" style={{ color }}>
        {hasTarget ? remaining.toLocaleString('en-US') : '—'}
      </span>
    </span>
  )
}
