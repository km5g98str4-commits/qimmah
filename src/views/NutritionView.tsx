import { useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'
import { ProgressBar } from '@/components/ProgressBar'
import { QuickMealLogger } from '@/components/nutrition/QuickMealLogger'
import { useCustomization } from '@/lib/customizationContext'
import { MEAL_SLOTS, useNutritionToday, type LoggedFood, type MealSlot } from '@/lib/nutritionTracking'
import { inRange, NUM_LIMITS, NUM_MESSAGES, sanitizeNumericInput } from '@/lib/validation'
import { getStrings } from '@/config/strings'
import { nutritionScreenStrings } from '@/i18n/dict/nutritionScreen'
import type { Lang } from '@/lib/appPreferences'
import { useAccess } from '@/lib/access/useAccess'

interface NutritionViewProps {
  lang: Lang
  quickLogIntent?: 'meal' | 'water' | 'routine' | null
  onQuickLogIntentHandled?: () => void
}

const round = (n: number) => Math.round(n)

// أزرار «نسخ»/«مفضّلة» غير مفعّلة بعد — مخفيّة حتى تُبنى الميزة فعليًا (لا تُربك المستخدم).

/** أقسام الوجبات المعروضة حسب عدد الوجبات من الإعداد (meals_per_day). */
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
export function NutritionView({ lang, quickLogIntent, onQuickLogIntentHandled }: NutritionViewProps) {
  const { customization } = useCustomization()
  const t = getStrings(lang).nutrition
  const d = nutritionScreenStrings[lang]
  const { state, totals, addWater, removeLog, updateLogQuantity } = useNutritionToday()
  const np = customization.nutritionPlan

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
  useEffect(() => {
    if (quickLogIntent !== 'meal' && quickLogIntent !== 'water') return
    try { window.sessionStorage.removeItem('qimmah:quick-log-intent') } catch { /* transient storage unavailable */ }
    if (quickLogIntent === 'meal') setAutoOpen('breakfast')
    onQuickLogIntentHandled?.()
  }, [quickLogIntent, onQuickLogIntentHandled])
  useEffect(() => {
    const consume = (raw: string | null) => {
      if (raw === null) return
      // المسح أولًا: أي خروج بعده (قيمة مجهولة، أو حجب Premium) لا يترك نيّة معلّقة.
      try { window.sessionStorage.removeItem('qimmah:quick-log-intent') } catch { /* تخزين غير متاح */ }
      if (raw !== 'meal' && raw !== 'water') return
      if (raw === 'meal') setAutoOpen('breakfast')
    }
    try { consume(window.sessionStorage.getItem('qimmah:quick-log-intent')) } catch { /* تخزين غير متاح */ }
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      try { window.sessionStorage.removeItem('qimmah:quick-log-intent') } catch { /* تخزين غير متاح */ }
      if (detail === 'meal') setAutoOpen('breakfast')
    }
    window.addEventListener('qimmah:quick-log', onEvent)
    return () => window.removeEventListener('qimmah:quick-log', onEvent)
  }, [])

  const targetCalories = np.targetCalories || customization.targets.targetCalories || customization.targets.maintenanceCalories || 2000
  const targetProtein = np.targetProtein || customization.targets.proteinGrams || 120
  const targetCarbs = np.targetCarbs || customization.targets.carbsGrams || 200
  const targetFat = np.targetFat || customization.targets.fatGrams || 70
  const targetWaterMl = Math.round((np.targetWaterLiters || customization.targets.waterLiters || 3) * 1000)

  // أسلوب العرض من الإعداد (مصدر الحقيقة). افتراضيًا «اقتراح وجبات» للمستخدمين الحاليين.
  const style = np.style ?? 'meal_suggestions'
  // أقسام الوجبات تُبنى حسب عدد الوجبات من الإعداد (meals_per_day) عند اقتراح الوجبات.
  const mealSlots = mealSlotsForCount(np.mealsPerDay)

  const eaten = round(totals.calories)
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

      <div className="space-y-0">
        {/* معادلة السعرات */}
        {/* [WP-4B] «المتبقّي» بطل الكتلة لا خانة رابعة بحجم جيرانها.
            كانت الخانات الأربع بنفس الوزن (`text-lg` لكلٍّ)، فالعين تمسح أربعة
            أرقام لتستنتج الرقم الوحيد الذي جاءت لأجله. صار المتبقّي رقمًا كبيرًا
            مستقلًّا، والمعادلة تحته سطرًا مساندًا يشرح من أين جاء. */}
        <div className="card p-5">
          <p className="text-xs font-bold text-ink-500">{t.equationNote}</p>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-black leading-none text-primary-c">{remaining}</span>
            <span className="text-sm font-bold text-ink-500">{t.remaining}</span>
          </div>

          <ProgressBar current={eaten} target={targetCalories || 1} color="bg-orange-500" className="mt-3.5" />

          {/* المعادلة المساندة — أرقام أصغر ولون ثانوي، فلا تنافس البطل. */}
          <div className="mt-3.5 flex items-end justify-between gap-1 border-t border-line pt-3">
            <EqCell label={t.needCals} value={targetCalories} />
            <Op symbol={d.opMinus} />
            <EqCell label={t.foodCals} value={eaten} />
            <Op symbol={d.opPlus} />
            <EqCell label={t.exerciseCals} value={exerciseCals} />
          </div>
        </div>

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
          <MacroCard label={t.protein} eaten={round(totals.protein)} target={targetProtein} unit={d.gramsUnit} color="#22c55e" />
          <MacroCard label={t.carbs} eaten={round(totals.carbs)} target={targetCarbs} unit={d.gramsUnit} color="#0ea5e9" />
          <MacroCard label={t.fat} eaten={round(totals.fat)} target={targetFat} unit={d.gramsUnit} color="#e0941f" />
          <MacroCard label={t.water} eaten={state.waterMl} target={targetWaterMl} unit={d.mlUnit} color="#F26A21" />
        </div>

        {/* حالة فارغة — تحفيز لتسجيل أول وجبة */}
        {state.log.length === 0 && (
          <div className="mt-4 card flex flex-col items-center gap-2 p-6 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary-c">
              <Icon name="Utensils" className="h-5 w-5" />
            </span>
            <p className="text-sm font-black text-ink-900">{t.emptyStateTitle}</p>
            <p className="max-w-xs text-xs text-ink-400">{t.emptyStateHint}</p>
          </div>
        )}

        {/* التسجيل: اقتراح وجبات → أقسام وجبات حسب عدد الوجبات؛ ماكروز فقط → مسجّل موحّد */}
        {style === 'meal_suggestions' ? (
          <div className="mt-6 space-y-4">
            {mealSlots.map((slot) => (
              <MealCard
                key={slot.id}
                lang={lang}
                slot={slot}
                autoOpen={autoOpen === slot.id || (autoOpen === 'breakfast' && slot.id === mealSlots[0].id)}
                onAutoOpenHandled={() => setAutoOpen(null)}
                items={state.log.filter((e) => slotForEntry(e.meal, mealSlots) === slot.id)}
                targetCalories={targetCalories}
                targetProtein={targetProtein}
                onRemove={removeLog}
                onUpdateQuantity={updateLogQuantity}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <QuickMealLogger lang={lang} targetCalories={targetCalories} targetProtein={targetProtein} />
          </div>
        )}

        {/* الماء */}
        <WaterPanel lang={lang} waterMl={state.waterMl} targetMl={targetWaterMl} onAdd={addWater} />

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
function quantityLabel(e: LoggedFood, d: { gramsUnit: string; servingsUnit: string }): string {
  const g = typeof e.grams === 'number' && e.grams > 0 ? e.grams : null
  const s = typeof e.servings === 'number' && e.servings > 0 ? e.servings : null
  if (g !== null && s !== null) return `${g}${d.gramsUnit} · ${round2(s)} ${d.servingsUnit}`
  if (g !== null) return `${g}${d.gramsUnit}`
  if (s !== null) return `${round2(s)} ${d.servingsUnit}`
  return ''
}
const round2 = (n: number) => Math.round(n * 100) / 100

/** خانة مساندة في المعادلة — وزن ثانوي عمدًا: البطل هو «المتبقّي» فوقها. */
function EqCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <p className="text-sm font-bold text-ink-700">{value}</p>
      <p className="truncate text-[10px] text-ink-400">{label}</p>
    </div>
  )
}

function MacroCard({ label, eaten, target, unit, color }: { label: string; eaten: number; target: number; unit: string; color: string }) {
  const pct = target > 0 ? Math.min(1, eaten / target) : 0
  return (
    // [WP-4B] البطاقة كانت `flex` أفقيًا: الحلقة ٤٠بكسل + نصّ بجانبها داخل عمود
    // من عمودين على ٣٧٥بكسل ⇒ النصّ يُقصّ («بروتين» و«١٢٠ / ١٥٠غ» يتزاحمان).
    // العمودي يعطي كل سطر عرض البطاقة كاملًا، فلا قصّ في العربية ولا الإنجليزية.
    <div className="card flex flex-col items-start gap-2.5 p-4">
      <div className="flex w-full items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-bold text-ink-500">{label}</p>
        <Ring pct={pct} color={color} />
      </div>
      <p className="min-w-0 text-base font-black leading-none text-ink-900">
        {eaten}
        {/* الهدف لا يُقصّ: `whitespace-nowrap` يمنع كسر «/ ١٥٠غ» على سطرين. */}
        <span className="whitespace-nowrap text-[11px] font-bold text-ink-400"> / {target}{unit}</span>
      </p>
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
            <p className="mt-1 truncate text-[11px] text-ink-400">{cals} {d.caloriesUnit} · {prot}{d.gramsUnit} {d.caloriesDotProteinG}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleAdding}
          aria-expanded={adding}
          className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-ink-700 transition-colors hover:bg-beige"
        >
          <Icon name="Plus" className="h-3.5 w-3.5" />
          {t.addShort}
        </button>
      </div>

      {items.length > 0 && (
        <ul className="divide-y divide-line">
          {items.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink-900">{e.label}</span>
                  <span className="block text-[11px] text-ink-400">
                    {quantityLabel(e, d)}
                    {quantityLabel(e, d) && ' · '}
                    {e.calories} {d.caloriesUnit} · {e.protein}{d.gramsUnit}
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
                    <input
                      type="number"
                      inputMode="decimal"
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
                      className="mt-1 block min-h-[44px] w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink-900 outline-none focus:border-primary-c"
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

      {adding && (
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


/** لوحة الماء — +250/+500 + إدخال كمية مخصّصة (50–3000 مل). */
function WaterPanel({ lang, waterMl, targetMl, onAdd: rawAdd }: { lang: Lang; waterMl: number; targetMl: number; onAdd: (ml: number) => boolean }) {
  const t = getStrings(lang).nutrition
  const d = nutritionScreenStrings[lang]
  const { guard } = useAccess()
  const [ml, setMl] = useState('')
  const [saveError, setSaveError] = useState(false)
  const onAdd = guard('nutrition.water', (amountMl: number, onSaved?: () => void) => {
    if (rawAdd(amountMl)) {
      setSaveError(false)
      onSaved?.()
      return
    }
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

  return (
    <div className="mt-4 card p-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-bold text-ink-700">
          <Icon name="Droplets" className="h-4 w-4 text-primary-c" />
          {t.water}
        </span>
        <span className="text-sm font-black text-primary-c">{(waterMl / 1000).toFixed(2)} / {(targetMl / 1000).toFixed(1)} {d.litersUnit}</span>
      </div>
      <ProgressBar current={waterMl} target={targetMl || 1} color="bg-primary" className="mt-3 h-1.5" />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => addPreset(250)} className="btn-ghost min-h-[44px] px-3 py-2 text-xs">{t.addWater250}</button>
        <button type="button" onClick={() => addPreset(500)} className="btn-ghost min-h-[44px] px-3 py-2 text-xs">{t.addWater500}</button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={ml}
          onChange={(e) => setMl(sanitizeNumericInput(e.target.value, { max }))}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          placeholder={t.customWaterPlaceholder}
          className="min-h-[44px] w-40 rounded-lg border border-line bg-page px-3 py-2 text-xs text-ink-900 outline-none focus:border-primary-c"
        />
        <button type="button" onClick={submit} disabled={!valid} className="btn-primary min-h-[44px] px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40">{t.customWaterAdd}</button>
      </div>
      {ml !== '' && !valid && <p className="mt-1.5 text-[11px] font-bold text-danger">{NUM_MESSAGES.waterMl}</p>}
      {saveError && <p role="alert" className="v2-error-panel mt-2 rounded-xl border px-3 py-2 text-xs font-bold text-ink-900">{d.saveFailed}</p>}
    </div>
  )
}
