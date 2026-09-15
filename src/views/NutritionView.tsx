import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { ProgressBar } from '@/components/ProgressBar'
import { QuickMealLogger } from '@/components/nutrition/QuickMealLogger'
import { AllergyNotice } from '@/components/AllergyNotice'
import { useCustomization } from '@/lib/customizationContext'
import { MEAL_SLOTS, useNutritionToday, type AddWaterFn, type LoggedFood, type MealSlot } from '@/lib/nutritionTracking'
import { useNutritionDay } from '@/lib/nutritionDay'
import { earliestNutritionDate, HISTORY_RETENTION_DAYS } from '@/lib/nutritionHistory'
import { getDayStamp, shiftDayStamp, weekdayName } from '@/lib/today'
import { useIsDemo } from '@/lib/demoMode'
import {
  computeDayTargets,
  getCarryoverSettings,
  getDayBaseTarget,
  recordDayBaseTarget,
  setCarryoverEnabled,
  type DayTargetBreakdown,
} from '@/lib/nutritionCarryover'
import type { WaterTier } from '@/lib/nutritionV2Model'
import { waterGuardStrings } from '@/i18n/dict/waterGuard'
import { inRange, NUM_LIMITS, numLimitMessage, sanitizeNumericInput } from '@/lib/validation'
import { getStrings } from '@/config/strings'
import { nutritionScreenStrings } from '@/i18n/dict/nutritionScreen'
import type { Lang } from '@/lib/appPreferences'
import { useAccess } from '@/lib/access/useAccess'
import { formatNumber, formatNumeralsIn } from '@/lib/numberFormat'
import { clearQuickLogIntent, takeQuickLogIntent, type QuickLogIntent } from '@/lib/quickLogIntent'
import { hasNumericNutritionPrescription } from '@/lib/calculators'
import { profileChoiceStrings } from '@/i18n/dict/profileChoices'
import { cn } from '@/lib/cn'

interface NutritionViewProps {
  lang: Lang
}

const round = (n: number) => Math.round(n)

// أزرار «نسخ»/«مفضّلة» غير مفعّلة بعد — مخفيّة حتى تُبنى الميزة فعليًا (لا تُربك المستخدم).

/**
 * أقسام الوجبات المعروضة حسب عدد الوجبات من الإعداد (meals_per_day).
 *
 * **بنية واحدة لكل مستخدم.** كان `nutritionPlan.style` يبدّل هذه البنية كلّها:
 * من اختار «أرقامي فقط» في الإعداد كان يفقد أقسام الوجبات ومعها عرض الكمية
 * وتعديلها، ويهبط على مسجّل واحد مسطّح. وهذا **أوسع بكثير** من وعد السؤال
 * («بلا اقتراح وجبات» ≠ «بلا تتبّع موزّع على وجبات»)، وهو سبب رؤية مستخدمَين
 * على نفس النسخة شاشتَي تغذية مختلفتين بنيويًّا. العدد وحده يبقى تفضيلًا.
 */
function mealSlotsForCount(count?: number) {
  const ids: MealSlot[] =
    count == null
      ? ['breakfast', 'lunch', 'dinner', 'snack']
      : count <= 2
        ? ['breakfast', 'dinner']
        : count === 3
          ? ['breakfast', 'lunch', 'dinner']
          : ['breakfast', 'lunch', 'dinner', 'snack']
  return MEAL_SLOTS.filter((s) => ids.includes(s.id))
}

/** يضمن ظهور أي عنصر مسجّل حتى لو كانت خانته غير معروضة (تُطوى لآخر قسم متاح). */
function slotForEntry(meal: MealSlot | undefined, visible: { id: MealSlot }[]): MealSlot {
  const m = meal ?? 'snack'
  if (visible.some((s) => s.id === m)) return m
  return visible[visible.length - 1].id
}

/** تبويب التغذية — متتبّع يومي للوجبات والماكروز والماء (موبايل أولًا). */
export function NutritionView({ lang }: NutritionViewProps) {
  const { customization } = useCustomization()
  const t = getStrings(lang).nutrition
  const d = nutritionScreenStrings[lang]
  const { addWater, resetWater } = useNutritionToday()
  const np = customization.nutritionPlan
  const hasNumericTargets = hasNumericNutritionPrescription(customization.targets)
  const agePolicy = profileChoiceStrings[lang]
  const demo = useIsDemo()

  /**
   * اليوم المعروض يُخزَّن **إزاحةً بالأيام لا ختمًا ثابتًا**.
   *
   * لو خزّنّا «2026-09-15» وبقي التطبيق مفتوحًا بعد منتصف الليل، لظلّ المستخدم
   * على يومٍ صار أمسًا وهو يحسبه اليوم — ثم يسجّل عشاءه في اليوم الخطأ. الإزاحة
   * تجعل «٠» تعني **اليوم الحالي دائمًا**: يتغيّر التقويم فيتبعه المعروض من
   * تلقائه، بلا مؤقّت ولا مزامنة ساعة.
   */
  const [dayOffset, setDayOffset] = useState(0)
  const todayStamp = getDayStamp()
  const viewDate = dayOffset === 0 ? todayStamp : shiftDayStamp(todayStamp, -dayOffset)
  const day = useNutritionDay(viewDate)

  /**
   * [QIM-WEB-FOUNDER-UX-004/حزمة ٤] استهلاك نيّة التسجيل السريع — **في المسار الحيّ**.
   *
   * العطل البنيوي: `App.tsx` يكتب `qimmah:quick-log-intent` ويُطلق
   * `qimmah:quick-log`، والمستمع الوحيد كان في `NutritionV2` **غير المركَّب**.
   * فالضغط على «سجّل وجبة» في «اليوم» ينقل إلى التغذية ولا يفتح شيئًا، وتبقى
   * النيّة عالقة في `sessionStorage` بلا مستهلك — أحد أوضح مصادر «ضغطت وما صار شي».
   *
   * ثلاث ضمانات: نيّة واحدة = فتحة واحدة · تُمسح **قبل** الفتح فلا يعيدها
   * التحديث إلى الأبد · وقيمة غير معروفة تُمسح وتُتجاهَل بلا رمي.
   */
  const [autoOpen, setAutoOpen] = useState<MealSlot | null>(null)
  /**
   * «ماء» كانت نيّة معلَنة بلا مستهلك: الورقة تعرض ثلاثة أزرار، فيضغط المستخدم
   * «ماء» فتُمسح نيّته ويهبط على التغذية **ولا يحدث شيء** — ولوحة الماء أسفل
   * الشاشة لا تُرى بلا تمرير. زرٌّ يعلن فعلًا ولا يفعله هو تعريف الزرّ الميت.
   *
   * والعلاج تركيز لا كتابة: نأخذه إلى لوحة الماء ونضع التركيز على أول إجراء
   * فيها. لا نضيف ماءً نيابةً عنه — `nutrition.water` فعل مدفوع، وإضافته تلقائيًا
   * تكتب بيانات لم يطلبها وتلتفّ على بوّابة Premium معًا.
   */
  const [focusWater, setFocusWater] = useState(false)
  useEffect(() => {
    // النيّة تعني «سجّل الآن» — والتسجيل يقع على اليوم الحالي. فإن كان المستخدم
    // يتصفّح يومًا ماضيًا نُعيده لليوم أوّلًا، وإلّا فتحنا لوحة تسجيل معطَّلة.
    const apply = (intent: QuickLogIntent | null) => {
      if (intent === 'meal') { setDayOffset(0); setAutoOpen('breakfast') }
      else if (intent === 'water') { setDayOffset(0); setFocusWater(true) }
    }
    apply(takeQuickLogIntent(['meal', 'water']))
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      clearQuickLogIntent()
      if (detail === 'meal') { setDayOffset(0); setAutoOpen('breakfast') }
      else if (detail === 'water') { setDayOffset(0); setFocusWater(true) }
    }
    window.addEventListener('qimmah:quick-log', onEvent)
    return () => window.removeEventListener('qimmah:quick-log', onEvent)
  }, [])

  /** هدف السعرات **الأساسي** من الخطة — لا يمسّه الترحيل أبدًا. */
  const baseTargetCalories = hasNumericTargets ? np.targetCalories || customization.targets.targetCalories || customization.targets.maintenanceCalories || 2000 : 0
  const targetProtein = hasNumericTargets ? np.targetProtein || customization.targets.proteinGrams || 120 : 0
  const targetCarbs = hasNumericTargets ? np.targetCarbs || customization.targets.carbsGrams || 200 : 0
  const targetFat = hasNumericTargets ? np.targetFat || customization.targets.fatGrams || 70 : 0
  const targetWaterMl = hasNumericTargets ? Math.round((np.targetWaterLiters || customization.targets.waterLiters || 3) * 1000) : 0

  /**
   * يسجّل هدف **اليوم الحالي** الأساسي وقت عرضه. بلا هذا السجلّ لا يعرف الترحيل
   * غدًا ما كان هدف أمس، ولا يجوز أن يفترضه من هدف اليوم: تغيير الخطة بينهما
   * يجعل الاثنين مختلفين. لا كتابة في وضع العرض التجريبي.
   */
  useEffect(() => {
    if (demo || !hasNumericTargets || baseTargetCalories <= 0) return
    recordDayBaseTarget(todayStamp, baseTargetCalories)
  }, [demo, hasNumericTargets, baseTargetCalories, todayStamp])

  // ── إعداد ترحيل فائض السعرات ───────────────────────────────────────────────
  const [carryoverVersion, setCarryoverVersion] = useState(0)
  const [carryoverError, setCarryoverError] = useState(false)
  const carryoverSettings = useMemo(() => {
    void carryoverVersion
    return demo ? { enabled: false, enabledAt: null } : getCarryoverSettings()
  }, [demo, carryoverVersion])
  const toggleCarryover = () => {
    const result = setCarryoverEnabled(!carryoverSettings.enabled, todayStamp)
    if (result === 'ok') {
      setCarryoverError(false)
      setCarryoverVersion((v) => v + 1)
    } else {
      setCarryoverError(true)
    }
  }

  /**
   * هدف اليوم المعروض — ثلاثة أرقام منفصلة لا رقم واحد مبهم:
   * الأساسي · تعديل الترحيل · المعدَّل. ويوم ماضٍ لم يُسجَّل هدفه يعود بـ«لا هدف
   * معروف» بدل أن يُلبَس هدف اليوم (لا رقم يقول عن نفسه ما ليس هو).
   */
  const recordedPastBase = day.isToday ? null : getDayBaseTarget(viewDate)
  const dayBase = day.isToday ? baseTargetCalories : (recordedPastBase ?? 0)
  const dayTargetKnown = hasNumericTargets && dayBase > 0
  const targets: DayTargetBreakdown = useMemo(
    () =>
      computeDayTargets({
        base: dayBase,
        date: viewDate,
        settings: demo ? { enabled: false, enabledAt: null } : carryoverSettings,
        gender: customization.profile.gender,
      }),
    // `day.totals` ضمن التبعيات عمدًا: تعديل طعام أمس يغيّر خصم اليوم فورًا.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dayBase, viewDate, demo, carryoverSettings, customization.profile.gender, day.totals.calories, carryoverVersion],
  )
  const targetCalories = dayTargetKnown ? targets.effective : 0

  // أقسام الوجبات تُبنى حسب عدد الوجبات من الإعداد (meals_per_day) — لكل مستخدم.
  const mealSlots = mealSlotsForCount(np.mealsPerDay)

  // ── حدود التصفّح ───────────────────────────────────────────────────────────
  const earliest = useMemo(() => {
    // `todayStamp` مرجعٌ مقصود: `earliestNutritionDate` تقرأ اليوم بنفسها، فربطها
    // به يعيد حساب أرضية التصفّح عند عبور منتصف الليل بدل تجميدها على يوم أمس.
    void todayStamp
    return demo ? null : earliestNutritionDate()
  }, [demo, todayStamp])
  const retentionFloor = shiftDayStamp(todayStamp, -HISTORY_RETENTION_DAYS)
  const oldestReachable = earliest && earliest > retentionFloor ? earliest : retentionFloor
  const canGoBack = viewDate > oldestReachable
  const atOldest = !canGoBack

  const displayTotals = day.legacyTotals ?? day.totals
  const eaten = round(displayTotals.calories)
  const exerciseCals = 0 // لا نتتبّع السعرات المحروقة بعد — نعرضها 0 بصدق
  const remaining = targetCalories - eaten + exerciseCals

  return (
    <div className="overflow-x-hidden px-4 py-4">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">
          <Icon name="Salad" className="h-5 w-5" />
        </span>
        <h1 className="text-lg font-black text-ink-900">{t.tabTitle}</h1>
      </div>

      <DayNav
        lang={lang}
        date={viewDate}
        offset={dayOffset}
        canGoBack={canGoBack}
        atOldest={atOldest}
        onPrev={() => setDayOffset((v) => v + 1)}
        onNext={() => setDayOffset((v) => Math.max(0, v - 1))}
        onToday={() => setDayOffset(0)}
      />

      <div className="space-y-0">
        {/*
          تحذير الحساسيات — على السطح الحيّ، لا على التوأم.

          العطل المُثبَت: المكوّن كان مركَّبًا في `NutritionV2` وحده — وهو خارج
          رسم الوحدات (`test:canonical-surface`) — فبقي الإثبات أخضر ولم يرَ
          التحذيرَ مستخدمٌ واحد. هذا شكل BUG-019 نفسه، والمالك الحيّ هنا.

          يظهر فقط لمن سجّل حساسية (`foodPreferences.allergies`)؛ بلا ذلك
          يُرجِع المكوّن `null` فلا لافتة بلا سبب ولا فراغ (`mb-4` عليه هو).
        */}
        <AllergyNotice lang={lang} className="mb-4" />

        {/* معادلة السعرات */}
        {/* [WP-4B] «المتبقّي» بطل الكتلة لا خانة رابعة بحجم جيرانها.
            كانت الخانات الأربع بنفس الوزن (`text-lg` لكلٍّ)، فالعين تمسح أربعة
            أرقام لتستنتج الرقم الوحيد الذي جاءت لأجله. صار المتبقّي رقمًا كبيرًا
            مستقلًّا، والمعادلة تحته سطرًا مساندًا يشرح من أين جاء. */}
        {hasNumericTargets ? (dayTargetKnown ? <div className="card p-5" data-testid="nutrition-equation">
          <p className="text-xs font-bold text-ink-500">{t.equationNote}</p>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-black leading-none text-primary-c">{formatNumber(remaining, lang)}</span>
            <span className="text-sm font-bold text-ink-500">{t.remaining}</span>
          </div>

          <ProgressBar current={eaten} target={targetCalories || 1} color="bg-orange-500" className="mt-3.5" />

          {/* المعادلة المساندة — أرقام أصغر ولون ثانوي، فلا تنافس البطل. */}
          <div className="mt-3.5 flex items-end justify-between gap-1 border-t border-line pt-3">
            <EqCell label={t.needCals} value={targetCalories} lang={lang} />
            <Op symbol={d.opMinus} />
            <EqCell label={t.foodCals} value={eaten} lang={lang} />
            <Op symbol={d.opPlus} />
            <EqCell label={t.exerciseCals} value={exerciseCals} lang={lang} />
          </div>

          {/* الهدف تغيّر؟ يُشرح سببه — لا رقم ينزل بلا تفسير. */}
          {targets.carryover < 0 && <CarryoverBreakdown lang={lang} targets={targets} todayStamp={todayStamp} />}
        </div> : (
          <div className="card p-5" data-testid="nutrition-target-unknown">
            <p className="text-xs font-bold text-ink-500">{t.foodCals}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-black leading-none text-primary-c">{formatNumber(eaten, lang)}</span>
              <span className="text-sm font-bold text-ink-500">{d.caloriesUnit}</span>
            </div>
            <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink-500">{d.dayTargetUnknown}</p>
          </div>
        )) : (
          <div className="card p-5" data-testid="nutrition-under18-guidance">
            <h2 className="text-sm font-black text-ink-900">{agePolicy.minorNutritionGuidanceTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">{agePolicy.minorNutritionGuidanceBody}</p>
          </div>
        )}

        {/*
          [QIM-WEB-FOUNDER-UX-004/حزمة ٤] عمودان دائمًا — **لا `sm:grid-cols-4`.**

          العطل مقيس: الشبكة كانت تتحوّل إلى أربعة أعمدة عند عرض **النافذة**
          ≥640بكسل، بينما الحاوية مقفولة على `app-container` = `max-w-md`
          (448بكسل). فالبطاقة تصير ≈95بكسل، ويبقى للوسم ١٣بكسل مقابل نصّ
          ٣٠بكسل ⇒ «بروتين» تُقصّ إلى حرف واحد. قِيس عند ٨٩٤ و١٢٨٠ (وهو ما
          أبلغ عنه QA بـ«حتى ~894px»)، ولم يظهر عند ٣٢٠ إطلاقًا.

          السبب أن نقطة التوقّف تسأل عن **النافذة** والحاوية لا تتبع النافذة.
          فأُزيلت النقطة بدل مطاردتها بأرقام: عمودان يعطيان كل وسم عرضًا كافيًا
          عند كل عرض ممكن للحاوية، والأربع بطاقات تصير ٢×٢ — تخطيط يتبع المساحة
          المتاحة فعلًا لأنه لا يسأل عن غيرها.
        */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MacroCard label={t.protein} eaten={round(displayTotals.protein)} target={dayTargetKnown ? targetProtein : null} unit={d.gramsUnit} color="#22c55e" lang={lang} />
          <MacroCard label={t.carbs} eaten={round(displayTotals.carbs)} target={dayTargetKnown ? targetCarbs : null} unit={d.gramsUnit} color="#0ea5e9" lang={lang} incomplete={day.totals.unknown.carbs} incompleteLabel={t.nutrientsIncomplete} />
          <MacroCard label={t.fat} eaten={round(displayTotals.fat)} target={dayTargetKnown ? targetFat : null} unit={d.gramsUnit} color="#e0941f" lang={lang} incomplete={day.totals.unknown.fat} incompleteLabel={t.nutrientsIncomplete} />
          <MacroCard label={t.water} eaten={day.waterMl} target={dayTargetKnown ? targetWaterMl : null} unit={d.mlUnit} color="#F26A21" lang={lang} />
        </div>

        {/* يوم أقدم من دفتر التفاصيل: مجاميعه معروفة وأصنافه ليست — يُقال لا يُخفى. */}
        {day.legacyTotals && (
          <div data-testid="nutrition-day-totals-only" className="mt-4 card p-4">
            <p className="text-sm font-black text-ink-900">{d.dayTotalsOnly}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{d.dayTotalsOnlyHint}</p>
          </div>
        )}

        {/* حالة فارغة — اليوم يُحفَّز على التسجيل، والماضي يُقال عنه الصدق. */}
        {day.log.length === 0 && !day.legacyTotals && (
          <div className="mt-4 card flex flex-col items-center gap-2 p-6 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary-c">
              <Icon name="Utensils" className="h-5 w-5" />
            </span>
            <p className="text-sm font-black text-ink-900">{day.canAdd ? t.emptyStateTitle : d.dayEmpty}</p>
            {day.canAdd && <p className="max-w-xs text-xs text-ink-400">{t.emptyStateHint}</p>}
          </div>
        )}

        {/*
          ═══ بنية واحدة لكل مستخدم ═══
          كان هنا فرعٌ على `nutritionPlan.style`: «اقتراح وجبات» يعطي أقسام
          الوجبات، وأيّ قيمة أخرى تعطي مسجّلًا واحدًا مسطّحًا بلا كمية ولا تعديل.
          فمستخدمان على **نفس البناء** كانا يريان بنيتَي تغذية مختلفتين لأن
          إجابةً في الإعداد بدّلت المعمار لا المحتوى. الفرع أُزيل: التتبّع واحد،
          والتفضيل يبقى في عدد الأقسام وفي وصف الخطة لا في شكل الشاشة.
        */}
        <div className="mt-6 space-y-4" data-testid="nutrition-meal-sections">
          {!day.canAdd && (
            <p data-testid="nutrition-past-readonly" className="rounded-xl border border-line bg-surface px-3 py-2.5 text-xs leading-relaxed text-ink-500">
              {d.pastDayReadOnly}
            </p>
          )}
          {mealSlots.map((slot) => (
            <MealCard
              key={slot.id}
              lang={lang}
              slot={slot}
              canAdd={day.canAdd}
              autoOpen={day.canAdd && (autoOpen === slot.id || (autoOpen === 'breakfast' && slot.id === mealSlots[0].id))}
              onAutoOpenHandled={() => setAutoOpen(null)}
              items={day.log.filter((e) => slotForEntry(e.meal, mealSlots) === slot.id)}
              targetCalories={targetCalories}
              targetProtein={targetProtein}
              onRemove={day.removeLog}
              onUpdateQuantity={day.updateLogQuantity}
            />
          ))}
        </div>

        {/* الماء — تفاعليّ لليوم الحالي، وقراءةً فقط للماضي (لا كاتب ماء للماضي). */}
        {day.isToday ? (
          <WaterPanel lang={lang} waterMl={day.waterMl} targetMl={targetWaterMl} onAdd={addWater} onReset={resetWater} focusRequested={focusWater} onFocusHandled={() => setFocusWater(false)} />
        ) : (
          <div className="mt-4 card p-5" data-testid="nutrition-past-water">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-bold text-ink-700">
                <Icon name="Droplets" className="h-4 w-4 text-primary-c" />
                {d.dayWater}
              </span>
              <span className="text-sm font-black text-primary-c">
                {formatNumber(Number((day.waterMl / 1000).toFixed(2)), lang)} {d.litersUnit}
              </span>
            </div>
          </div>
        )}

        {/* إعداد ترحيل الفائض — بجوار الهدف الذي يعدّله، لا مدفونًا في شاشة ثانية. */}
        {hasNumericTargets && day.isToday && (
          <CarryoverSetting
            lang={lang}
            enabled={carryoverSettings.enabled}
            onToggle={toggleCarryover}
            failed={carryoverError}
            noneToday={carryoverSettings.enabled && targets.carryover === 0}
          />
        )}

        <p className="mt-6 flex items-start gap-2 text-[11px] text-ink-400">
          <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t.estimateNote}
        </p>
      </div>
    </div>
  )
}

function Op({ symbol }: { symbol: string }) {
  return <span className="pb-5 text-base font-black text-ink-300">{symbol}</span>
}

/** تاريخ اليوم بالتقويم المحلي — يُبنى من الختم نفسه، بلا أي تحويل UTC. */
function dateFromStamp(stamp: string): Date {
  const [y, m, dd] = stamp.split('-').map(Number)
  return new Date(y, (m || 1) - 1, dd || 1, 12)
}

/** تسمية اليوم المعروض: «اليوم» · «أمس» · ثم اسم اليوم وتاريخه. */
function dayLabel(stamp: string, offset: number, lang: Lang, d: { dayToday: string; dayYesterday: string }): string {
  if (offset === 0) return d.dayToday
  if (offset === 1) return d.dayYesterday
  return weekdayName(lang, dateFromStamp(stamp))
}

/**
 * التاريخ المعروض — **باسم الشهر لا بثلاثة أرقام موصولة بشرطات**.
 *
 * السبب مقيس لا تجميلي: `٢٠٢٦-٠٩-١٥` تُعيد ترتيب مجموعاتها الرقمية في سياق
 * عربي (الأرقام الهندية صنفها AN في خوارزمية الاتجاه)، فتُقرأ على الشاشة
 * «١٥-٠٩-٢٠٢٦» — تاريخ صحيح الشكل **خاطئ المعنى**، ولا يملك القارئ ما يميّز
 * أيّهما قُصد. اسم الشهر يثبّت الترتيب بلا اعتماد على الاتجاه أصلًا.
 *
 * و`-u-ca-gregory` صريح: `ar-SA` وحدها تعطي التقويم الهجري، وتبديل تقويم
 * المستخدم من سطر تاريخ **قرار منتج** لا تفصيلة تنسيق.
 */
function formatDayDate(stamp: string, lang: Lang): string {
  const date = dateFromStamp(stamp)
  try {
    const locale = lang === 'en' ? 'en-US-u-ca-gregory' : 'ar-u-ca-gregory'
    const text = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
    // نظام الأرقام يتبع تفضيل المستخدم لا اللغة وحدها (سياسة الأرقام).
    return formatNumeralsIn(text, lang)
  } catch {
    return formatNumeralsIn(stamp, lang)
  }
}

/**
 * شريط تصفّح الأيام.
 *
 * ═══ الاتجاه ═══
 * الأسهم **منطقية لا ثابتة**: «السابق» يشير للخلف في اتجاه القراءة، فيصير
 * `ChevronRight` في العربية و`ChevronLeft` في الإنجليزية. الترتيب في الشيفرة
 * واحد، والمتصفّح يعكسه مع `dir="rtl"`؛ الأيقونة وحدها تحتاج القلب.
 * والتاريخ الرقمي يُعزل بـ`dir="ltr"` كي لا تتبعثر `2026-09-15` في RTL.
 */
function DayNav({
  lang, date, offset, canGoBack, atOldest, onPrev, onNext, onToday,
}: {
  lang: Lang
  date: string
  offset: number
  canGoBack: boolean
  atOldest: boolean
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}) {
  const d = nutritionScreenStrings[lang]
  const ar = lang !== 'en'
  const prevIcon = ar ? 'ChevronRight' : 'ChevronLeft'
  const nextIcon = ar ? 'ChevronLeft' : 'ChevronRight'
  const isToday = offset === 0
  return (
    <div className="mb-4" data-testid="nutrition-day-nav">
      <div className="card flex items-center gap-2 p-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canGoBack}
          data-testid="nutrition-day-prev"
          aria-label={d.dayPrev}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink-600 transition-colors hover:bg-beige disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Icon name={prevIcon} className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p data-testid="nutrition-day-label" className="truncate text-sm font-black text-ink-900">{dayLabel(date, offset, lang, d)}</p>
          {/* لا `dir="ltr"` هنا: النصّ صار لغة طبيعية (اسم شهر + رقمان)، فيتبع
              اتجاه الصفحة صحيحًا. وفرض LTR على نصّ عربي هو ما يقلبه. */}
          <p data-testid="nutrition-day-date" className="truncate text-[11px] text-ink-400">{formatDayDate(date, lang)}</p>
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={isToday}
          data-testid="nutrition-day-next"
          aria-label={d.dayNext}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink-600 transition-colors hover:bg-beige disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Icon name={nextIcon} className="h-4 w-4" />
        </button>
      </div>

      {!isToday && (
        <button
          type="button"
          onClick={onToday}
          data-testid="nutrition-day-back-to-today"
          className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-primary-c underline-offset-4 hover:underline"
        >
          <Icon name="RotateCcw" className="h-3.5 w-3.5" />
          {d.backToToday}
        </button>
      )}
      {atOldest && <p className="mt-2 text-[11px] text-ink-400">{d.dayOldest}</p>}
    </div>
  )
}

/**
 * شرح تغيّر الهدف — **ثلاثة أسطر لا رقم واحد**.
 *
 * المطلب صريح: ألّا يرى المستخدم «١٨٠٠» بلا سياق. فالأساسي والتعديل والمعدَّل
 * تُعرض معًا، ومصدر الخصم يُسمّى بيومه. وحين يقصّ الحدّ الأدنى الآمن الخصمَ
 * يُقال ذلك صراحةً بدل أن يبدو الحساب مكسورًا.
 */
function CarryoverBreakdown({ lang, targets, todayStamp }: { lang: Lang; targets: DayTargetBreakdown; todayStamp: string }) {
  const d = nutritionScreenStrings[lang]
  const sourceLabel =
    targets.sourceDate === null
      ? ''
      : targets.sourceDate === shiftDayStamp(todayStamp, -1)
        ? d.dayYesterday
        : weekdayName(lang, dateFromStamp(targets.sourceDate))
  return (
    <div data-testid="carryover-breakdown" className="mt-3.5 space-y-1.5 border-t border-line pt-3">
      <Row label={d.carryoverBaseRow} value={formatNumber(targets.base, lang)} testId="carryover-base" />
      <Row label={d.carryoverAdjustRow(sourceLabel)} value={`${d.opMinus}${formatNumber(Math.abs(targets.carryover), lang)}`} testId="carryover-adjust" tone="warn" />
      <Row label={d.carryoverEffectiveRow} value={formatNumber(targets.effective, lang)} testId="carryover-effective" tone="strong" />
      {targets.floorApplied && (
        <p data-testid="carryover-floor-note" className="pt-1 text-[11px] leading-relaxed text-ink-500">
          {d.carryoverFloorNote(formatNumber(targets.floor, lang))}
        </p>
      )}
    </div>
  )
}

function Row({ label, value, testId, tone = 'plain' }: { label: string; value: string; testId?: string; tone?: 'plain' | 'warn' | 'strong' }) {
  return (
    <div data-testid={testId} className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 flex-1 truncate text-xs text-ink-500">{label}</span>
      <span
        className={cn(
          'shrink-0 text-sm tabular-nums',
          tone === 'strong' ? 'font-black text-ink-900' : tone === 'warn' ? 'font-bold text-amber-600' : 'font-bold text-ink-700',
        )}
      >
        {value}
      </span>
    </div>
  )
}

/**
 * مفتاح ترحيل الفائض — **مطفأ افتراضيًا** (لا يُشغَّل نيابةً عن أحد).
 *
 * نبرته ملاحظة لا تحذير: يشرح ما يفعله ويعد صراحةً بأن الهدف الأساسي لا يتغيّر،
 * لأن ذلك بالضبط هو الخوف الذي يمنع المستخدم من تجربته.
 */
function CarryoverSetting({
  lang, enabled, onToggle, failed, noneToday,
}: {
  lang: Lang
  enabled: boolean
  onToggle: () => void
  failed: boolean
  noneToday: boolean
}) {
  const d = nutritionScreenStrings[lang]
  return (
    <div className="mt-4 card p-4" data-testid="carryover-setting">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        data-testid="carryover-toggle"
        className="flex w-full min-h-[44px] items-center justify-between gap-3 text-start"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-ink-900">{d.carryoverTitle}</span>
          <span className="mt-1 block text-[11px] leading-relaxed text-ink-500">{d.carryoverHint}</span>
        </span>
        <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', enabled ? 'bg-primary' : 'bg-line')}>
          <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all', enabled ? 'end-0.5' : 'start-0.5')} />
        </span>
      </button>
      <p className="mt-2 text-[11px] font-bold text-ink-400">{enabled ? d.carryoverOn : d.carryoverOff}</p>
      {noneToday && <p data-testid="carryover-none" className="mt-1 text-[11px] text-ink-400">{d.carryoverNoneToday}</p>}
      {failed && <p role="alert" className="v2-error-panel mt-2 rounded-xl border px-3 py-2 text-xs font-bold text-ink-900">{d.carryoverSaveFailed}</p>}
    </div>
  )
}

/**
 * [WP-4B] كمية الصنف المسجَّل — **الغرام هو السلطة الحسابية**، والحصة مكافئ
 * معروض بجانبه لا بديل عنه.
 *
 * ولا تُختلق حصة أبدًا: `LoggedFood` لا يخزّن `servingGrams`، فلا يُشتقّ حجم
 * الحصة قسمةً. تُعرض الحصة **فقط** حين سُجِّلت فعلًا مع الجرامات — وهو ما يفعله
 * `QuickMealLogger` حين يكون للصنف حصة معروفة (يكتب `grams` و`servings` معًا).
 * صنف بلا حصة معروفة يظهر بجراماته وحدها، وصنف قديم بلا جرامات يظهر بحصصه
 * وحدها. لا سطر ثالث يخمّن.
 */
function quantityLabel(e: LoggedFood, d: { gramsUnit: string; servingsUnit: string }, lang: Lang): string {
  const g = typeof e.grams === 'number' && e.grams > 0 ? e.grams : null
  const s = typeof e.servings === 'number' && e.servings > 0 ? e.servings : null
  if (g !== null && s !== null) return `${formatNumber(g, lang)}${d.gramsUnit} · ${formatNumber(round2(s), lang)} ${d.servingsUnit}`
  if (g !== null) return `${formatNumber(g, lang)}${d.gramsUnit}`
  if (s !== null) return `${formatNumber(round2(s), lang)} ${d.servingsUnit}`
  return ''
}
const round2 = (n: number) => Math.round(n * 100) / 100

/** خانة مساندة في المعادلة — وزن ثانوي عمدًا: البطل هو «المتبقّي» فوقها. */
function EqCell({ label, value, lang }: { label: string; value: number; lang: Lang }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <p className="text-sm font-bold text-ink-700">{formatNumber(value, lang)}</p>
      <p className="truncate text-[10px] text-ink-400">{label}</p>
    </div>
  )
}

function MacroCard({ label, eaten, target, unit, color, lang, incomplete = 0, incompleteLabel }: { label: string; eaten: number; target: number | null; unit: string; color: string; lang: Lang; incomplete?: number; incompleteLabel?: (n: string) => string }) {
  const pct = target !== null && target > 0 ? Math.min(1, eaten / target) : 0
  return (
    // [WP-4B] البطاقة كانت `flex` أفقيًا: الحلقة ٤٠بكسل + نصّ بجانبها داخل عمود
    // من عمودين على ٣٧٥بكسل ⇒ النصّ يُقصّ («بروتين» و«١٢٠ / ١٥٠غ» يتزاحمان).
    // العمودي يعطي كل سطر عرض البطاقة كاملًا، فلا قصّ في العربية ولا الإنجليزية.
    <div className="card flex flex-col items-start gap-2.5 p-4">
      <div className="flex w-full items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-bold text-ink-500">{label}</p>
        {target !== null && <Ring pct={pct} color={color} />}
      </div>
      <p className="min-w-0 text-base font-black leading-none text-ink-900">
        {formatNumber(eaten, lang)}
        {/* الهدف لا يُقصّ: `whitespace-nowrap` يمنع كسر «/ ١٥٠غ» على سطرين. */}
        {target !== null && <span className="whitespace-nowrap text-[11px] font-bold text-ink-400"> / {formatNumber(target, lang)}{unit}</span>}
      </p>
      {/* [PARTIAL-NUTRITION-001] المجموع ناقص حين تُسجَّل أصناف بلا هذا المغذّي — يُعلَن لا يُجمع صفرًا. */}
      {incomplete > 0 && incompleteLabel && (
        <p data-testid="macro-incomplete" className="text-[10px] font-bold text-amber-600">{incompleteLabel(formatNumber(incomplete, lang))}</p>
      )}
    </div>
  )
}

/** حلقة تقدّم SVG محلية (بلا مكتبات) — نسبة المأكول إلى الهدف. */
function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 15
  const c = 2 * Math.PI * r
  const dash = Math.max(0, Math.min(1, pct)) * c
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10 shrink-0 -rotate-90" role="img" aria-hidden="true">
      <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-line" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
      />
    </svg>
  )
}

function MealCard({
  lang,
  slot,
  items,
  targetCalories,
  targetProtein,
  onRemove,
  onUpdateQuantity,
  canAdd = true,
  autoOpen = false,
  onAutoOpenHandled,
}: {
  lang: Lang
  slot: { id: MealSlot; ar: string; en: string; icon: string }
  items: LoggedFood[]
  targetCalories: number
  targetProtein: number
  onRemove: (id: string) => boolean
  onUpdateQuantity: (id: string, value: number, unit: 'g' | 'serving') => boolean
  /**
   * الإضافة متاحة على اليوم الحالي وحده. ويومٌ ماضٍ **لا يُعرَض له زرّ مطفأ**:
   * السبب مكتوب مرّة واحدة أعلى الأقسام، والزرّ يغيب — زرٌّ يُرى ولا يعمل أسوأ
   * من زرٍّ لا يُرى. التعديل والحذف يبقيان: تصحيح الماضي حقّ لا إضافة إليه.
   */
  canAdd?: boolean
  /** نيّة «سجّل وجبة» القادمة من «اليوم» — تُفتح مرّة واحدة ثم تُستهلك. */
  autoOpen?: boolean
  onAutoOpenHandled?: () => void
}) {
  const t = getStrings(lang).nutrition
  const d = nutritionScreenStrings[lang]
  const [adding, setAdding] = useState(false)
  // [QIM-WEB-FOUNDER-UX-003/حزمة ٢] «أضف» نفسه يقود إلى البوّابة في المعاينة —
  // نصّ المؤسس: «يضغط أضف ← يظهر له Premium gate»، لا أن نطرده من التغذية.
  const { guard } = useAccess()
  const toggleAdding = guard('nutrition.addFood', () => setAdding((v) => !v))
  const [editing, setEditing] = useState<{ id: string; value: string; unit: 'g' | 'serving' } | null>(null)
  const [saveError, setSaveError] = useState(false)
  const remove = guard('nutrition.removeFood', (id: string) => {
    if (onRemove(id)) {
      if (editing?.id === id) setEditing(null)
      setSaveError(false)
    } else {
      setSaveError(true)
    }
  })
  const saveQuantity = guard('nutrition.addFood', () => {
    if (!editing) return
    const value = Number(editing.value)
    const max = editing.unit === 'g' ? 3000 : 20
    if (!Number.isFinite(value) || value <= 0 || value > max) return
    if (onUpdateQuantity(editing.id, value, editing.unit)) {
      setEditing(null)
      setSaveError(false)
    } else {
      setSaveError(true)
    }
  })
  /**
   * النيّة تمرّ من **نفس الحارس** الذي يمرّ منه الزرّ: مستخدم المعاينة يرى بوّابة
   * Premium لا لوحة تسجيل، فلا يفتح مسار الطفرة من باب خلفي. والاستهلاك يقع
   * مرّة واحدة مهما تكرّر الرسم.
   */
  const openFromIntent = guard('nutrition.addFood', () => setAdding(true))
  useEffect(() => {
    if (!autoOpen) return
    onAutoOpenHandled?.()
    openFromIntent()
    // مرّة واحدة لكل نيّة — التبعيات المستقرّة مقصودة.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen])
  const cals = items.reduce((a, e) => a + e.calories, 0)
  const prot = items.reduce((a, e) => a + e.protein, 0)

  return (
    <div className="card overflow-hidden">
      {/* [WP-4B] الترويسة تتنفّس (p-4 ⇐ p-4.5/py-5) واسم الوجبة يكبر: هو عنوان
          القسم لا سطر جانبي. و«أضف» كان `btn-primary` — لوحًا برتقاليًا مصمتًا
          يسحب العين من اسم الوجبة وسعراتها في كل بطاقة، أي أن الإجراء الثانوي
          كان أثقل بصريًا من المعلومة الأساسية. صار محايدًا بحدّ، ويبقى هدف
          اللمس ≥44بكسل. */}
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-c">
            <Icon name={slot.icon} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-black leading-tight text-ink-900">{lang === 'en' ? slot.en : slot.ar}</p>
            <p className="mt-1 truncate text-[11px] text-ink-400">{formatNumber(cals, lang)} {d.caloriesUnit} · {formatNumber(prot, lang)}{d.gramsUnit} {d.caloriesDotProteinG}</p>
          </div>
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={toggleAdding}
            aria-expanded={adding}
            className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-ink-700 transition-colors hover:bg-beige"
          >
            <Icon name="Plus" className="h-3.5 w-3.5" />
            {t.addShort}
          </button>
        )}
      </div>

      {items.length > 0 && (
        <ul className="divide-y divide-line">
          {items.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink-900">{e.label}</span>
                  <span className="block text-[11px] text-ink-400">
                    {quantityLabel(e, d, lang)}
                    {quantityLabel(e, d, lang) && ' · '}
                    {formatNumber(e.calories, lang)} {d.caloriesUnit} · {formatNumber(e.protein, lang)}{d.gramsUnit}
                  </span>
                </span>
                {((e.unit === 'g' && e.grams) || (e.unit === 'serving' && e.servings)) && (
                  <button
                    type="button"
                    onClick={() => {
                      const unit = e.unit ?? 'g'
                      setEditing({ id: e.id, unit, value: String(unit === 'g' ? e.grams : e.servings) })
                      setSaveError(false)
                    }}
                    aria-label={`${d.editEntry}: ${e.label}`}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-beige hover:text-ink-900"
                  >
                    <Icon name="Pencil" className="h-4 w-4" />
                  </button>
                )}
                <button type="button" onClick={() => remove(e.id)} aria-label={`${t.removeEntry}: ${e.label}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-beige hover:text-danger">
                  <Icon name="Trash2" className="h-4 w-4" />
                </button>
              </div>
              {editing?.id === e.id && (
                <div className="mt-3 rounded-xl border border-line bg-page p-3">
                  <label className="text-xs font-bold text-ink-700">
                    {d.quantity} ({editing.unit === 'g' ? d.gramsUnit : d.servingsUnit})
                    {/* `type="text"` لا `number`: تعقيم HTML لـ`type=number` يُفرِّغ القيمة
                        قبل أن تصل React، فلا يُنقذ الأرقامَ العربية أيُّ طيّ داخل التطبيق. */}
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      min={editing.unit === 'g' ? 1 : 0.25}
                      max={editing.unit === 'g' ? 3000 : 20}
                      step={editing.unit === 'g' ? 1 : 0.25}
                      value={editing.value}
                      onChange={(event) => setEditing({
                        ...editing,
                        value: sanitizeNumericInput(event.target.value, {
                          max: editing.unit === 'g' ? 3000 : 20,
                          decimal: editing.unit === 'serving',
                        }),
                      })}
                      className="mt-1 block min-h-[44px] w-full rounded-lg border border-line bg-surface px-3 text-base text-ink-900 outline-none focus:border-primary-c"
                    />
                  </label>
                  {editing.value !== '' && (!Number.isFinite(Number(editing.value)) || Number(editing.value) <= 0) && (
                    <p className="mt-1.5 text-xs font-bold text-danger">{d.invalidQuantity}</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={saveQuantity} disabled={!Number.isFinite(Number(editing.value)) || Number(editing.value) <= 0} className="btn-primary min-h-[44px] flex-1 text-xs disabled:cursor-not-allowed disabled:opacity-40">{d.saveEdit}</button>
                    <button type="button" onClick={() => { setEditing(null); setSaveError(false) }} className="btn-ghost min-h-[44px] flex-1 text-xs">{d.cancelEdit}</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {saveError && <p role="alert" className="v2-error-panel mx-4 mt-3 rounded-xl border px-3 py-2 text-xs font-bold text-ink-900">{d.saveFailed}</p>}

      {adding && canAdd && (
        <div className="border-t border-line p-4">
          <QuickMealLogger
            lang={lang}
            targetCalories={targetCalories}
            targetProtein={targetProtein}
            defaultMeal={slot.id}
            embedded
            onLogged={() => setAdding(false)}
          />
        </div>
      )}
    </div>
  )
}


/**
 * لوحة الماء — +250/+500 + إدخال كمية مخصّصة (50–3000 مل).
 *
 * ═══ الحارس ليس هنا ═══
 * سياسة الطبقات (`WATER_TIER_POLICY`) تعيش في الكاتب الواحد `addWaterToDay`؛
 * هذه اللوحة **تعرض** نتيجته المسمّاة فقط: نجاح · تعذّر حفظ · أو كتابة موقوفة
 * تنتظر تأكيدًا. فلو نُسِخت اللوحة غدًا لسطح ثالث لَبقي الحارس قائمًا.
 */
function WaterPanel({ lang, waterMl, targetMl, onAdd: rawAdd, onReset, focusRequested = false, onFocusHandled }: { lang: Lang; waterMl: number; targetMl: number; onAdd: AddWaterFn; onReset: () => boolean; focusRequested?: boolean; onFocusHandled?: () => void }) {
  const t = getStrings(lang).nutrition
  const d = nutritionScreenStrings[lang]
  const w = waterGuardStrings[lang]
  const { guard } = useAccess()
  const [ml, setMl] = useState('')
  const [saveError, setSaveError] = useState(false)
  const [resetError, setResetError] = useState(false)
  const [askReset, setAskReset] = useState(false)
  const [pending, setPending] = useState<{ tier: Exclude<WaterTier, 'normal'>; projectedMl: number; deltaMl: number; onSaved?: () => void } | null>(null)
  // وصول نيّة «ماء»: تُظهر اللوحة وتضع التركيز على أوّل إجراء — بلا كتابة.
  const presetRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!focusRequested) return
    presetRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    presetRef.current?.focus({ preventScroll: true })
    onFocusHandled?.()
  }, [focusRequested, onFocusHandled])
  const liters = (value: number) =>
    formatNumber(Math.max(0, value) / 1000, lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const onAdd = guard('nutrition.water', (amountMl: number, onSaved?: () => void, acknowledgedTier?: WaterTier) => {
    const outcome = rawAdd(amountMl, { targetMl, acknowledgedTier })
    if (outcome.ok) {
      setSaveError(false)
      setPending(null)
      onSaved?.()
      return
    }
    if (outcome.reason === 'confirm') {
      setSaveError(false)
      setPending({ tier: outcome.tier, projectedMl: outcome.projectedMl, deltaMl: amountMl, onSaved })
      return
    }
    setPending(null)
    setSaveError(true)
  })
  const { min, max } = NUM_LIMITS.waterMl
  const amount = Number(ml)
  const valid = inRange(amount, min, max)
  const submit = () => {
    if (!valid) return
    onAdd(Math.round(amount), () => setMl(''))
  }
  const addPreset = (amountMl: number) => {
    onAdd(amountMl)
  }
  // الباقي — نفس حساب النموذج، مصدرًا واحدًا للرقم المعروض.
  const remainingMl = targetMl > 0 ? Math.max(0, Math.round(targetMl) - Math.round(Math.max(0, waterMl))) : 0
  const doReset = () => {
    setAskReset(false)
    setPending(null)
    setResetError(!onReset())
  }

  return (
    <div className="mt-4 card p-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-bold text-ink-700">
          <Icon name="Droplets" className="h-4 w-4 text-primary-c" />
          {t.water}
        </span>
        <span className="text-sm font-black text-primary-c">
          {formatNumber(Number((waterMl / 1000).toFixed(2)), lang)}
          {targetMl > 0 && <> / {formatNumber(Number((targetMl / 1000).toFixed(1)), lang)}</>} {d.litersUnit}
        </span>
      </div>
      {targetMl > 0 && (
        <p data-testid="water-remaining" className="mt-1 text-xs font-bold text-ink-500">
          {remainingMl > 0 ? w.litersRemaining(liters(remainingMl)) : w.litersTargetMet}
        </p>
      )}
      {targetMl > 0 && <ProgressBar current={waterMl} target={targetMl} color="bg-primary" className="mt-3 h-1.5" />}
      <div className="mt-3 flex flex-wrap gap-2">
        {/* الوسم للقيادة الآلية: نصّ الزرّ يمرّ بـ`formatNumeralsIn` فيصير «+٢٥٠ مل»
            في العربية، وأي إثبات يمسكه برقم لاتيني يبور عند أول جلسة عربية —
            وهو ما وقع فعلًا في `preview-gate`. الوسم عقدٌ لا يتغيّر بالتحرير ولا باللغة. */}
        <button ref={presetRef} data-testid="water-preset-250" type="button" onClick={() => addPreset(250)} className="btn-ghost min-h-[44px] px-3 py-2 text-xs">{formatNumeralsIn(t.addWater250, lang)}</button>
        <button data-testid="water-preset-500" type="button" onClick={() => addPreset(500)} className="btn-ghost min-h-[44px] px-3 py-2 text-xs">{formatNumeralsIn(t.addWater500, lang)}</button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {/* `type="text"` لا `number` — نفس سبب حقل الكمية أعلاه. */}
        <label htmlFor="custom-water-amount" className="sr-only">{t.customWater}</label>
        <input
          id="custom-water-amount"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          min={min}
          max={max}
          value={ml}
          aria-invalid={ml !== '' && !valid ? true : undefined}
          aria-describedby={ml !== '' && !valid ? 'custom-water-msg' : undefined}
          onChange={(e) => setMl(sanitizeNumericInput(e.target.value))}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          placeholder={formatNumeralsIn(t.customWaterPlaceholder, lang)}
          className="min-h-[44px] w-40 rounded-lg border border-line bg-page px-3 py-2 text-base text-ink-900 outline-none focus:border-primary-c"
        />
        <button type="button" onClick={submit} disabled={!valid} className="btn-primary min-h-[44px] px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40">{t.customWaterAdd}</button>
      </div>
      {ml !== '' && !valid && <p id="custom-water-msg" role="alert" className="mt-1.5 text-[11px] font-bold text-danger">{numLimitMessage('waterMl', lang)}</p>}

      {/* تأكيد الكمية غير المعتادة — الكتابة **لم تقع**؛ نعرض ما سيصير إليه اليوم. */}
      {pending && (
        <div data-testid="water-confirm" role="group" aria-live="polite" className="mt-3 rounded-xl border border-line bg-page px-3 py-2.5">
          <p className="text-sm font-black text-ink-900">{pending.tier === 'extreme' ? w.confirmExtremeTitle : w.confirmElevatedTitle}</p>
          <p className="mt-1 text-xs text-ink-700">
            {pending.tier === 'extreme' ? w.confirmExtremeBody(liters(pending.projectedMl)) : w.confirmElevatedBody(liters(pending.projectedMl), liters(targetMl))}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" data-testid="water-confirm-yes" onClick={() => onAdd(pending.deltaMl, pending.onSaved, pending.tier)} className="btn-primary min-h-[44px] px-3 py-2 text-xs">
              {pending.tier === 'extreme' ? w.confirmExtremeYes : w.confirmYes}
            </button>
            <button type="button" data-testid="water-confirm-no" onClick={() => setPending(null)} className="btn-ghost min-h-[44px] px-3 py-2 text-xs">{w.confirmNo}</button>
          </div>
        </div>
      )}

      {/* تصفير ماء اليوم (طلب المؤسس ٤) — `resetWater` كان مبنيًّا بلا راسم. */}
      {waterMl > 0 && !askReset && (
        <button type="button" data-testid="water-reset" onClick={() => { setResetError(false); setAskReset(true) }} className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-ink-500 underline-offset-4 hover:underline">
          <Icon name="RotateCcw" className="h-3.5 w-3.5" />
          {w.resetWater}
        </button>
      )}
      {askReset && (
        <div data-testid="water-reset-confirm" role="group" aria-live="polite" className="mt-3 rounded-xl border border-line bg-page px-3 py-2.5">
          <p className="text-xs text-ink-700">{w.resetConfirmBody(liters(waterMl))}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" data-testid="water-reset-yes" onClick={doReset} className="btn-primary min-h-[44px] px-3 py-2 text-xs">{w.resetConfirmYes}</button>
            <button type="button" onClick={() => setAskReset(false)} className="btn-ghost min-h-[44px] px-3 py-2 text-xs">{w.resetCancel}</button>
          </div>
        </div>
      )}

      {saveError && <p role="alert" className="v2-error-panel mt-2 rounded-xl border px-3 py-2 text-xs font-bold text-ink-900">{d.saveFailed}</p>}
      {resetError && <p role="alert" className="v2-error-panel mt-2 rounded-xl border px-3 py-2 text-xs font-bold text-ink-900">{w.resetFailed}</p>}
    </div>
  )
}
