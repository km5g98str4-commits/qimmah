import { useEffect, useMemo, useState } from 'react'
import type { QuickLogTarget } from '@/components/MobileShell'
import { Icon } from '@/components/Icon'
import { MinorGoalNotice } from '@/components/MinorGoalNotice'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { useCustomization } from '@/lib/customizationContext'
import { loadLogs } from '@/lib/measurementLog'
import { formatNumeralsIn } from '@/lib/numberFormat'
import { getDayStamp } from '@/lib/today'
import { buildTodayV2Model, type TodayCard } from '@/lib/todayV2Model'
import { buildWeeklyPulse } from '@/lib/weeklyPulse'
import { useNutritionToday } from '@/lib/nutritionTracking'
import { playHaptic } from '@/lib/nativeFeedback'
import { trackLocal } from '@/lib/tracking'
import { todayHomeStrings } from '@/i18n/dict/todayHome'
import { DailyRingsCard } from '@/components/today/DailyRingsCard'
import { NextActionCard } from '@/components/today/NextActionCard'
import { QuickActions } from '@/components/today/QuickActions'
import { WaterCard } from '@/components/today/WaterCard'
import { StepsCard } from '@/components/today/StepsCard'
import { WeeklyPulseCard } from '@/components/today/WeeklyPulseCard'
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

const DAY_MS = 86_400_000

/**
 * الرئيسية — [QIMMAH-TODAY-SOVEREIGN-REDESIGN-001].
 *
 * ═══ الترتيب يجيب أسئلة، لا يرصّ بطاقات ═══
 *   ① وين أنا اليوم؟   → الترويسة (تحية + تاريخ + صورة)
 *   ② وش يهمّني الحين؟ → «باقي لك اليوم» (حلقات السعرات والماكروز)
 *   ③ وش أسوي بعده؟    → بطاقة الإجراء التالي (مصدرها `model.hero` وحده)
 *   ④ كيف ماشي معي؟   → الماء · نبض الأسبوع
 *   ⑤ وش غير ذلك؟     → فعلان سريعان + رؤية واحدة إن وُجدت
 *
 * ═══ لماذا الحلقات عادت بعد أن حُذفت في [CTO-73] ═══
 * الحذف كان لسبب **مقيس** لا ذوقي: البطاقات كانت تحجز ثلث الطية. قرار المؤسس
 * أعادها، والواجب حلّ المشكلة لا استنساخها — فالحلقة الكبيرة تشارك صفَّها مع
 * العنوان والنسبة بدل أن تُوسَّط، والصغيرة صفٌّ واحد. التفصيل في `DailyRingsCard`.
 *
 * ═══ مصادر البيانات الحيّة (لا طبقة بيانات مُفرَّعة) ═══
 *   • الحالة/البطل/التمرين → `buildTodayV2Model` (الجدول · الجلسات · الخطة)
 *   • السعرات والماكروز والماء → `useNutritionToday()` — **نفس** هوك شاشة التغذية
 *     الحيّة، مشترك في الكاتب الواحد. ولذلك يتحرّك المؤشّر لحظة إضافة كوب ماء،
 *     وهو ما كان يستحيل مع `useMemo` على `customization` وحدها.
 *   • نبض الأسبوع → `buildWeeklyPulse` (الجدول + الجلسات المكتملة)
 *   • الوزن → `loadMeasurementLogs`
 */
export function TodayV2({ lang, onNavigate, onQuickLog }: TodayV2Props) {
  const { customization } = useCustomization()
  // الرئيسية هي السطح الحيّ الدائم — تركيب محرّك الأوسمة هنا يُعيد وصله ببيانات
  // المستخدم الحقيقية (بروتين اليوم/الهدف/أيام الخطة). بلا هذا يبقى المحرّك
  // معزولًا وتصير أوسمة البروتين غير قابلة للفتح. لا أثر بصري.
  useAchievementsEngine()
  const auth = useAuth()
  const ar = lang !== 'en'
  const d = todayHomeStrings[lang]
  const uid = auth.user?.id ?? null
  const model = useMemo(() => buildTodayV2Model(customization, lang, uid), [customization, lang, uid])

  // مصدر التغذية **التفاعلي**: أي كتابة (من هنا أو من شاشة التغذية أو من تبويب
  // آخر) تُبطل اللقطة وتُعيد الرسم. الأهداف تُقرأ من الخطة مباشرةً — نفس السطر
  // الذي يقرأه `buildNutritionV2Model`، لا اشتقاق ثانٍ.
  const { state: dayLog, totals, addWater } = useNutritionToday()
  const plan = customization.nutritionPlan
  const calories = { consumed: totals.calories, target: plan?.targetCalories ?? 0 }
  const protein = { consumed: totals.protein, target: plan?.targetProtein ?? 0 }
  const carbs = { consumed: totals.carbs, target: plan?.targetCarbs ?? 0 }
  const fat = { consumed: totals.fat, target: plan?.targetFat ?? 0 }
  const waterTargetMl = Math.round((plan?.targetWaterLiters ?? 0) * 1000)
  const hasMeal = dayLog.log.length > 0

  const pulse = useMemo(
    () => buildWeeklyPulse(uid, customization, new Date()),
    // تُعاد القراءة حين تتغيّر الخطة أو يُنجَز تمرين (تنقلب `model.state`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customization, uid, model.state],
  )

  // آخر وزن مسجَّل — عدد أيام حقيقي، أو `null` فيُقال «ما فيه قياس» صراحةً.
  const weightLogs = useMemo(
    () =>
      loadLogs()
        .filter((log) => log.values.weightKg !== undefined && log.values.weightKg !== '')
        .map((log) => log.date)
        .sort(),
    [],
  )
  const lastWeightStamp = weightLogs.at(-1) ?? null
  const todayStamp = getDayStamp()
  const daysSinceWeight =
    lastWeightStamp === null
      ? null
      : Math.round(
          (Date.parse(`${todayStamp}T00:00:00`) - Date.parse(`${lastWeightStamp}T00:00:00`)) / DAY_MS,
        )
  const todayWeightLogged = daysSinceWeight === 0

  // [CTO-68] الحدث ١٣ — عودة بعد يوم فائت: أول عرض لحالة «العودة بعد انقطاع».
  // مرّة واحدة في اليوم لا مرّة في كل تركيب: الشاشة تُركَّب مع كل رجوع لتبويب اليوم،
  // والمقصود عودةُ المستخدم لا عددُ زياراته للتبويب. المخزن نفسه هو دفتر منع التكرار.
  useEffect(() => {
    if (model.state !== 'returnAfterBreak') return
    if (hasEventToday('return_after_missed_day')) return
    trackLocal('return_after_missed_day', { daysAway: model.daysSinceLastWorkout ?? 0 })
  }, [model.state, model.daysSinceLastWorkout])

  // [CTO-70] البند ١ — أول انتصار. يُعرض للقادم الجديد حتى يُنجزه، ثم يبقى معلَّمًا
  // «تم» بقية اليوم. الاعتماديات على أرقام اليوم لأن الإنجاز يقع في سطح آخر
  // (تسجيل ماء/وجبة/بدء تمرين) فتُعاد القراءة عند أول عودة للوحة.
  const firstWin = useMemo(
    () => loadFirstWin(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totals.calories, dayLog.waterMl, model.state],
  )
  // [SOVEREIGN-TODAY-001] الاقتراح يعرف حال اليوم: لا وعدَ بإحماء يوم لا إحماء فيه.
  const firstWinSuggestion = useMemo(() => suggestFirstWin(new Date(), model.warmupMinutes > 0), [model.warmupMinutes])
  // البطاقة ترحيبية لا دائمة: تُعرض للقادم الجديد ما دام لم يُنجز، وتبقى معلَّمة «تم»
  // بقيّة يوم الإنجاز وحده ثم تختفي. من لديه تاريخ فعلي ليس قادمًا جديدًا فلا تُلاحقه.
  const firstWinDoneToday = firstWin.completed && !!firstWin.at && getDayStamp(new Date(firstWin.at)) === getDayStamp()
  const showFirstWin = ((!firstWin.completed && model.state === 'newUser') || firstWinDoneToday) && model.state !== 'returnAfterBreak'

  // [CTO-70] البند ٢ — سطح إذن الإشعارات: مرّة واحدة، **بعد** أول انتصار.
  // الترتيب مقصود: نطلب الإذن بعد أن يرى المستخدم قيمة، لا قبلها.
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
  const lastWeightText = (() => {
    if (!weekOpen || lastWeightStamp === null) return null
    const value = loadLogs().find((log) => log.date === lastWeightStamp)?.values.weightKg
    return value === undefined || value === '' ? null : String(value)
  })()

  const trainPillar = model.pillars.find((pillar) => pillar.key === 'train')

  /**
   * [CTO-72] البند ١ — اللوحة تفتح بحالة فارغة ذكية.
   *
   * القادم الجديد بلا أي تسجيل لا يرى حلقات أصفار (لوحة قياس معطّلة)، بل بطاقة
   * إعداد تقول ما الذي سيحدث. `hasTodaySignal` مشتقّ من نفس المصادر التي تُغذّي
   * البطاقات — لا علم منفصل يشيخ — ويزول عند **أول** تسجيل: كوب ماء واحد يُعيد
   * اللوحة كاملة. والقيد `newUser` مقصود: صاحب تاريخ يفتح صباح يوم جديد **يريد**
   * رؤية حلقاته صفرًا؛ تلك أرقام يومه لا فراغ.
   */
  const hasTodaySignal =
    totals.calories > 0 ||
    dayLog.waterMl > 0 ||
    hasMeal ||
    todayWeightLogged ||
    trainPillar?.state === 'done' ||
    trainPillar?.state === 'active'
  const blankSlate = model.state === 'newUser' && !hasTodaySignal
  // بلا أهداف محسوبة لا حلقات: «—» في أربع حلقات ليست معلومة (§5).
  const hasAnyTarget = calories.target > 0 || protein.target > 0 || carbs.target > 0 || fat.target > 0
  const showRings = !blankSlate && hasAnyTarget

  const quick = (target: QuickLogTarget, fallback: AppRoute) => {
    if (onQuickLog) onQuickLog(target)
    else onNavigate(fallback)
  }
  const openCard = (card: TodayCard) => {
    void playHaptic('selection')
    if (card.destination === 'nutrition') quick('meal', 'nutrition')
    else if (card.destination) onNavigate(card.destination)
  }

  /**
   * حدّ التوطين (القرار المعتمد C) — النموذج يؤلّف جمله بأرقام لاتينية، والتحويل
   * هنا عند العرض. بلا هذا يعرض سطر «باقي 35g بروتين» أرقامًا لاتينية بينما حلقة
   * البروتين فوقه تعرض «٣٥»: نفس الحقيقة بنظامين، وهو عين BUG-019.
   */
  const loc = (text: string) => formatNumeralsIn(text, lang)

  /**
   * صفّ واحد داخل بطاقة النبض — تذكير/تنبيه حقيقي من النموذج، أو لا شيء.
   *
   * ويُستبعَد ما نبرته `nutrition` حين تُعرض الحلقات: أوّل تنبيه في اليوم العادي
   * هو «باقي ٣٥غ بروتين»، وهو **نفس الرقم** الظاهر في حلقة البروتين على بعد
   * شاشة واحدة. تكرارُه لا يضيف معلومة؛ يستهلك صفًّا ويضعف ثقة القارئ بالبقيّة.
   */
  const pulseNudge = blankSlate
    ? null
    : (model.cards.find((card) => !(showRings && card.tone === 'nutrition')) ?? null)

  return (
    <div data-today-root dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light bg-page px-4 pb-36 pt-4 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-md space-y-4">
        {/* ① وين أنا اليوم؟ — التاريخ سياقٌ صغير فوق التحية، والصورة مدخل للملف. */}
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* [R3-UX-BIDI] سطر التاريخ يُصفّ في `flex` من جزأين، ولا يُركَّب نصًّا
                واحدًا. الفاصل «·» محايد الاتجاه؛ لو بقي داخل النصّ لكان ترتيبه
                البصري نتيجةَ حلّ المحايدات على جيرانه لا نتيجةَ ما كُتب هنا.
                بالتصفيف يصير الترتيب البصري = ترتيب الـDOM قطعًا، و`<bdi>` يعزل
                الجزء الحامل للأرقام فلا يبتلعه أو يقلبه أيّ نصّ يجاوره لاحقًا.
                والسطر الكامل يُنطَق مرّة واحدة من `dateLabel` — والفاصل مخفيّ عن
                قارئ الشاشة لأنه علامة تنسيق لا كلمة. */}
            <p aria-label={loc(model.dateLabel)} className="flex flex-wrap items-baseline gap-x-1.5 text-sm font-bold text-ink-500">
              <span aria-hidden="true">{loc(model.dateParts.weekday)}</span>
              {model.dateParts.detail !== '' && (
                <>
                  <span aria-hidden="true" className="text-ink-400">·</span>
                  <bdi aria-hidden="true">{loc(model.dateParts.detail)}</bdi>
                </>
              )}
            </p>
            {/* `h2` لا `h1`: القشرة (`MobileShell`) تملك `h1` الصفحة، وعنوانان من
                المستوى الأول على شاشة واحدة يكسران شجرة العناوين لقارئ الشاشة. */}
            <h2 className="mt-0.5 truncate text-3xl font-black leading-tight tracking-tight">{loc(model.greeting)}</h2>
          </div>
          {model.avatarInitial && (
            <button
              type="button"
              onClick={() => { void playHaptic('selection'); onNavigate('profile') }}
              aria-label={ar ? 'حسابي' : 'My account'}
              className="v2-pressable grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-lg font-black text-ink-700"
            >
              {model.avatarInitial}
            </button>
          )}
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
            warmupMinutes={model.warmupMinutes}
            onPick={(kind) => {
              // الضغطة توصّل للسطح الحيّ؛ الإنجاز يُسجَّل عند وقوع الفعل هناك.
              if (kind === 'warmup') onNavigate('workout')
              else if (kind === 'water') quick('water', 'nutrition')
              else quick('meal', 'nutrition')
            }}
          />
        )}

        {/* ② وش يهمّني الحين؟ — الحلقات لصاحب الأرقام، وبطاقة إعداد للقادم الجديد. */}
        {!showRings ? (
          <section aria-labelledby="today-setup-title" className="rounded-3xl border border-line bg-surface p-4 shadow-card">
            <h2 id="today-setup-title" className="text-lg font-black">{d.noTargetsTitle}</h2>
            <p className="mt-1 text-base leading-relaxed text-ink-500">{d.noTargetsBody}</p>
            <ul className="mt-3 space-y-2">
              {model.cards.map((card) => (
                <li key={card.label}>
                  <button
                    type="button"
                    onClick={() => openCard(card)}
                    className="v2-pressable flex min-h-[3.25rem] w-full items-center gap-3 rounded-2xl border border-line bg-page px-3.5 py-2.5 text-start"
                  >
                    <Icon name={card.icon} className="h-4 w-4 shrink-0 text-ink-500" />
                    <span className="min-w-0 flex-1 text-base font-bold leading-snug">{loc(card.label)}</span>
                    <Icon name={ar ? 'ChevronLeft' : 'ChevronRight'} className="h-4 w-4 shrink-0 text-[color:var(--c-primary)]" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <DailyRingsCard
            lang={lang}
            calories={calories}
            protein={protein}
            carbs={carbs}
            fat={fat}
            onOpen={() => onNavigate('nutrition')}
          />
        )}

        {/* ③ وش أسوي بعده؟ — البطاقة تصيّر `model.hero` ولا تستنتج شيئًا. */}
        <NextActionCard
          lang={lang}
          hero={model.hero}
          training={model.training}
          durationMin={model.durationMin}
          restDay={model.restDay}
          onNavigate={() => {
            if (model.hero.destination === 'nutrition') quick('meal', 'nutrition')
            else if (model.hero.destination) onNavigate(model.hero.destination)
          }}
        />

        {/* ④ كيف ماشي معي؟ */}
        <WaterCard lang={lang} consumedMl={dayLog.waterMl} targetMl={waterTargetMl} onAdd={addWater} />

        {/* [R4-UX-STEPS] الخطوات تُكتب هنا لا في مكان آخر. `StepsView` تعرض ثم
            تحيل إلى الإعدادات، وزرّها «حدّث من Apple Health» لا يفعل شيئًا في
            المتصفّح — فبناء الويب بلا قارئ عدّاد أصلًا. من غير هذه البطاقة لا
            يملك مستخدم الويب طريقًا واحدًا لإدخال رقمه. */}
        <StepsCard lang={lang} onOpenDetail={() => onNavigate('steps')} />

        <QuickActions
          lang={lang}
          daysSinceWeight={daysSinceWeight}
          onLogMeal={() => quick('meal', 'nutrition')}
          onLogWeight={() => onNavigate('progress')}
        />

        <WeeklyPulseCard lang={lang} pulse={pulse}>
          {pulseNudge && (
            <button
              type="button"
              onClick={() => openCard(pulseNudge)}
              className="v2-pressable mt-3 flex min-h-[44px] w-full items-center gap-2 border-t border-line pt-3 text-start"
            >
              <Icon name={pulseNudge.icon} className="h-4 w-4 shrink-0 text-ink-400" />
              <span className="min-w-0 flex-1 text-sm font-bold leading-snug text-ink-700">{loc(pulseNudge.label)}</span>
              <Icon name={ar ? 'ChevronLeft' : 'ChevronRight'} className="h-4 w-4 shrink-0 text-[color:var(--c-primary)]" />
            </button>
          )}
        </WeeklyPulseCard>

        {/* ⑤ «رؤى الأسبوع» (`InsightCardsView`) **لا تُعرض هنا بعد الآن.**
            كانت تجيب نفس سؤال بطاقة النبض بعبارة أقسى («التزامك ٠٪ — أقل من
            خطتك») فيقول سطران متجاوران الحقيقة نفسها، وأحدهما بنبرة لوم (§6).
            الميزة **حيّة كما هي** في شاشة التقدّم (`ProgressV2:118`) — وهي موضعها
            الطبيعي: النبض «كيف أسبوعي؟» والرؤى «وش لاحظنا عبر الوقت؟». */}

        {/* سطر الثقة — التقدير يُسمّى تقديرًا، والتفصيل خلف مدخل حقيقي لا سمة مخفيّة. */}
        <div className="px-1 pb-1 text-center">
          {model.trustNote && <p className="text-sm leading-relaxed text-ink-400">{loc(model.trustNote)}</p>}
          {hasAnyTarget && (
            <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{d.estimateNote}</p>
          )}
          <button
            type="button"
            onClick={() => { void playHaptic('selection'); onNavigate('calc') }}
            className="v2-pressable mt-1.5 inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-[color:var(--v2-blue-text)] underline underline-offset-4"
          >
            {d.howWeCalculate}
          </button>
        </div>
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
