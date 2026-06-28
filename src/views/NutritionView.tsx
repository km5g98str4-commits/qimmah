import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { ProgressBar } from '@/components/ProgressBar'
import { QuickMealLogger } from '@/components/nutrition/QuickMealLogger'
import { useCustomization } from '@/lib/customizationContext'
import { MEAL_SLOTS, useNutritionToday, type LoggedFood, type MealSlot } from '@/lib/nutritionTracking'
import { inRange, NUM_LIMITS, NUM_MESSAGES, sanitizeNumericInput } from '@/lib/validation'
import { FOOD_ESTIMATE_NOTE } from '@/data/foodItems'
import { getStrings } from '@/config/strings'
import type { Lang } from '@/lib/appPreferences'

interface NutritionViewProps {
  lang: Lang
}

const round = (n: number) => Math.round(n)

/** تبويب التغذية — متتبّع يومي للوجبات والماكروز والماء (موبايل أولًا). */
export function NutritionView({ lang }: NutritionViewProps) {
  const { customization } = useCustomization()
  const t = getStrings(lang).nutrition
  const { state, totals, addWater, removeLog } = useNutritionToday()
  const np = customization.nutritionPlan

  const targetCalories = np.targetCalories || customization.targets.targetCalories || customization.targets.maintenanceCalories || 2000
  const targetProtein = np.targetProtein || customization.targets.proteinGrams || 120
  const targetCarbs = np.targetCarbs || customization.targets.carbsGrams || 200
  const targetFat = np.targetFat || customization.targets.fatGrams || 70
  const targetWaterMl = Math.round((np.targetWaterLiters || customization.targets.waterLiters || 3) * 1000)

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
        <div className="card p-5">
          <p className="text-xs font-bold text-ink-500">{t.equationNote}</p>
          <div className="mt-3 flex items-end justify-between gap-2">
            <EqCell label={t.needCals} value={targetCalories} />
            <Op symbol="−" />
            <EqCell label={t.foodCals} value={eaten} />
            <Op symbol="+" />
            <EqCell label={t.exerciseCals} value={exerciseCals} />
            <Op symbol="=" />
            <EqCell label={t.remaining} value={remaining} highlight />
          </div>
          <ProgressBar current={eaten} target={targetCalories || 1} color="bg-orange-500" className="mt-4" />
        </div>

        {/* ملخّص الماكروز + الماء */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MacroCard label={t.protein} eaten={round(totals.protein)} target={targetProtein} unit="غ" color="bg-brand-500" />
          <MacroCard label={t.carbs} eaten={round(totals.carbs)} target={targetCarbs} unit="غ" color="bg-sky-500" />
          <MacroCard label={t.fat} eaten={round(totals.fat)} target={targetFat} unit="غ" color="bg-gold-500" />
          <MacroCard label={t.water} eaten={state.waterMl} target={targetWaterMl} unit="مل" color="bg-primary" />
        </div>

        {/* الوجبات */}
        <div className="mt-6 space-y-4">
          {MEAL_SLOTS.map((slot) => (
            <MealCard
              key={slot.id}
              lang={lang}
              slot={slot}
              items={state.log.filter((e) => (e.meal ?? 'snack') === slot.id)}
              targetCalories={targetCalories}
              targetProtein={targetProtein}
              onRemove={removeLog}
            />
          ))}
        </div>

        {/* الماء */}
        <WaterPanel lang={lang} waterMl={state.waterMl} targetMl={targetWaterMl} onAdd={addWater} />

        <p className="mt-6 flex items-start gap-2 text-[11px] text-ink-400">
          <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {FOOD_ESTIMATE_NOTE}
        </p>
      </div>
    </div>
  )
}

function Op({ symbol }: { symbol: string }) {
  return <span className="pb-5 text-base font-black text-ink-300">{symbol}</span>
}

function EqCell({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <p className={`text-lg font-black ${highlight ? 'text-primary-c' : 'text-ink-900'}`}>{value}</p>
      <p className="truncate text-[10px] text-ink-400">{label}</p>
    </div>
  )
}

function MacroCard({ label, eaten, target, unit, color }: { label: string; eaten: number; target: number; unit: string; color: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-black text-ink-900">
        {eaten}<span className="text-[11px] font-bold text-ink-400"> / {target}{unit}</span>
      </p>
      <ProgressBar current={eaten} target={target || 1} color={color} className="mt-2 h-1.5" />
    </div>
  )
}

function MealCard({
  lang,
  slot,
  items,
  targetCalories,
  targetProtein,
  onRemove,
}: {
  lang: Lang
  slot: { id: MealSlot; ar: string; en: string; icon: string }
  items: LoggedFood[]
  targetCalories: number
  targetProtein: number
  onRemove: (id: string) => void
}) {
  const t = getStrings(lang).nutrition
  const [adding, setAdding] = useState(false)
  const cals = items.reduce((a, e) => a + e.calories, 0)
  const prot = items.reduce((a, e) => a + e.protein, 0)

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-line p-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary-c">
            <Icon name={slot.icon} className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink-900">{lang === 'en' ? slot.en : slot.ar}</p>
            <p className="text-[11px] text-ink-400">{cals} سعرة · {prot}غ بروتين</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* أزرار نائبة: نسخ/مفضّلة (قريبًا) */}
          <PlaceholderBtn icon="Layers" title={`${t.copy} · ${t.soon}`} />
          <PlaceholderBtn icon="Sparkles" title={`${t.favorite} · ${t.soon}`} />
          <button type="button" onClick={() => setAdding((v) => !v)} className="btn-primary px-3 py-1.5 text-xs">
            <Icon name="Plus" className="h-3.5 w-3.5" />
            {t.addShort}
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <ul className="divide-y divide-line">
          {items.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink-900">{e.label}</span>
                <span className="block text-[11px] text-ink-400">{e.calories} سعرة · {e.protein}غ</span>
              </span>
              <button type="button" onClick={() => onRemove(e.id)} aria-label={t.removeEntry} className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-beige hover:text-danger">
                <Icon name="Trash2" className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

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

function PlaceholderBtn({ icon, title }: { icon: string; title: string }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-300"
      onClick={(e) => e.preventDefault()}
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
    </button>
  )
}

/** لوحة الماء — +250/+500 + إدخال كمية مخصّصة (50–3000 مل). */
function WaterPanel({ lang, waterMl, targetMl, onAdd }: { lang: Lang; waterMl: number; targetMl: number; onAdd: (ml: number) => void }) {
  const t = getStrings(lang).nutrition
  const [ml, setMl] = useState('')
  const { min, max } = NUM_LIMITS.waterMl
  const amount = Number(ml)
  const valid = inRange(amount, min, max)
  const submit = () => {
    if (!valid) return
    onAdd(Math.round(amount))
    setMl('')
  }

  return (
    <div className="mt-4 card p-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-bold text-ink-700">
          <Icon name="Droplets" className="h-4 w-4 text-primary-c" />
          {t.water}
        </span>
        <span className="text-sm font-black text-primary-c">{(waterMl / 1000).toFixed(2)} / {(targetMl / 1000).toFixed(1)} لتر</span>
      </div>
      <ProgressBar current={waterMl} target={targetMl || 1} color="bg-primary" className="mt-3 h-1.5" />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onAdd(250)} className="btn-ghost px-3 py-2 text-xs">{t.addWater250}</button>
        <button type="button" onClick={() => onAdd(500)} className="btn-ghost px-3 py-2 text-xs">{t.addWater500}</button>
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
          className="w-40 rounded-lg border border-line bg-page px-3 py-2 text-xs text-ink-900 outline-none focus:border-primary-c"
        />
        <button type="button" onClick={submit} disabled={!valid} className="btn-primary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40">{t.customWaterAdd}</button>
      </div>
      {ml !== '' && !valid && <p className="mt-1.5 text-[11px] font-bold text-danger">{NUM_MESSAGES.waterMl}</p>}
    </div>
  )
}
