import { useMemo, useState } from 'react'
import { StepHeader } from '../StepHeader'
import { Icon } from '@/components/Icon'
import { IngredientPicker } from '@/components/IngredientPicker'
import type { WizardCtx } from '../stepProps'
import type { MealType, NutritionPlan, PlanMeal } from '@/types/nutrition'
import { mealTemplates } from '@/data/mealTemplates'
import { getIngredient } from '@/data/mealIngredients'
import {
  computeMealMacros,
  createEmptyMeal,
  createPlanMealFromTemplate,
  ingredientDisplayName,
  mealTypeLabels,
} from '@/lib/nutritionPlan'
import { targetCaloriesFor } from '@/lib/calculators'
import { NUM_LIMITS, parseSafeNumber } from '@/lib/validation'

const inputCls = 'w-full rounded-lg border border-line bg-beige px-2.5 py-1.5 text-sm text-ink-900 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

/** خطوة خطة الأكل — أهداف + قوالب وجبات + باني وجبات من المكونات. */
export function StepNutrition({ ctx }: { ctx: WizardCtx }) {
  const np = ctx.data.nutritionPlan
  const setNp = (partial: Partial<NutritionPlan>) => ctx.update({ nutritionPlan: { ...np, ...partial } })
  const [pickerMealId, setPickerMealId] = useState<string | null>(null)
  const [tplOpen, setTplOpen] = useState(false)
  const [tplType, setTplType] = useState<MealType | 'all'>('all')
  const [tplQ, setTplQ] = useState('')

  const reindex = (meals: PlanMeal[]) => meals.map((m, i) => ({ ...m, order: i }))
  const updateMeal = (id: string, partial: Partial<PlanMeal>) =>
    setNp({ meals: np.meals.map((m) => (m.id === id ? { ...m, ...partial } : m)) })
  const withMacros = (m: PlanMeal): PlanMeal => {
    const x = computeMealMacros(m.ingredients)
    return { ...m, calories: Math.round(x.calories), protein: Math.round(x.protein), carbs: Math.round(x.carbs), fat: Math.round(x.fat) }
  }

  const smartTargets = {
    targetCalories: targetCaloriesFor(ctx.data.profile.goal, ctx.data.targets),
    targetProtein: ctx.data.targets.proteinGrams,
    targetCarbs: ctx.data.targets.carbsGrams,
    targetFat: ctx.data.targets.fatGrams,
    targetWaterLiters: ctx.data.targets.waterLiters,
  }
  const useSmart = () => setNp(smartTargets)
  // هل تختلف أهداف الأكل عن الحسابات الذكية؟
  const differsFromSmart =
    np.targetCalories !== smartTargets.targetCalories ||
    np.targetProtein !== smartTargets.targetProtein ||
    np.targetCarbs !== smartTargets.targetCarbs ||
    np.targetFat !== smartTargets.targetFat ||
    np.targetWaterLiters !== smartTargets.targetWaterLiters

  const addTemplate = (templateId: string) =>
    setNp({ meals: reindex([...np.meals, createPlanMealFromTemplate(templateId, np.meals.length)]) })
  const addCustomMeal = () =>
    setNp({ meals: reindex([...np.meals, createEmptyMeal(np.meals.length, `meal-custom-${Date.now()}`)]) })
  const removeMeal = (id: string) => setNp({ meals: reindex(np.meals.filter((m) => m.id !== id)) })
  const moveMeal = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= np.meals.length) return
    const list = np.meals.slice()
    ;[list[i], list[j]] = [list[j], list[i]]
    setNp({ meals: reindex(list) })
  }
  const addIngredient = (mealId: string, ingredientId: string) => {
    setNp({
      meals: np.meals.map((m) =>
        m.id === mealId ? withMacros({ ...m, ingredients: [...m.ingredients, { ingredientId, servings: 1 }] }) : m,
      ),
    })
    setPickerMealId(null)
  }
  const setServings = (mealId: string, idx: number, servings: number) =>
    setNp({
      meals: np.meals.map((m) =>
        m.id === mealId
          ? withMacros({ ...m, ingredients: m.ingredients.map((ig, k) => (k === idx ? { ...ig, servings } : ig)) })
          : m,
      ),
    })
  const removeIngredient = (mealId: string, idx: number) =>
    setNp({
      meals: np.meals.map((m) =>
        m.id === mealId ? withMacros({ ...m, ingredients: m.ingredients.filter((_, k) => k !== idx) }) : m,
      ),
    })
  const recalc = (mealId: string) =>
    setNp({ meals: np.meals.map((m) => (m.id === mealId ? withMacros(m) : m)) })

  const filteredTemplates = useMemo(() => {
    const q = tplQ.trim().toLowerCase()
    return mealTemplates.filter((t) => {
      if (tplType !== 'all' && t.mealType !== tplType) return false
      if (q && !`${t.nameAr} ${t.nameEn}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [tplQ, tplType])

  return (
    <div>
      <StepHeader icon="Salad" title="خطة الأكل" description="حدّد أهدافك واختر وجباتك الجاهزة أو ابنِها من المكونات." />

      {/* تفعيل المتابعة */}
      <button
        type="button"
        onClick={() => setNp({ enabled: !np.enabled })}
        className={`mb-5 flex w-full items-center justify-between rounded-2xl border p-4 ${np.enabled ? 'border-primary-soft bg-primary-soft' : 'border-line bg-surface'}`}
      >
        <span className="flex items-center gap-2.5">
          <span className={`grid h-9 w-9 place-items-center rounded-xl ${np.enabled ? 'bg-primary text-white' : 'bg-beige text-ink-400'}`}>
            <Icon name="Salad" className="h-5 w-5" />
          </span>
          <span className="text-sm font-bold text-ink-900">أريد متابعة الأكل</span>
        </span>
        <span className={`relative h-6 w-11 rounded-full ${np.enabled ? 'bg-primary' : 'bg-line'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow ${np.enabled ? 'start-0.5' : 'end-0.5'}`} />
        </span>
      </button>

      {/* إشعار اختلاف الأهداف عن الحسابات الذكية */}
      {np.enabled && differsFromSmart && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-gold-400/40 bg-gold-200/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm text-ink-700">
            <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
            توجد اختلافات بين حساباتك وخطة الأكل.
          </p>
          <button type="button" onClick={useSmart} className="btn-primary px-4 py-2 text-sm">
            <Icon name="BarChart3" className="h-4 w-4" />
            تحديث خطة الأكل من حساباتي
          </button>
        </div>
      )}

      {/* الأهداف */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-ink-900">الأهداف الغذائية</h3>
          <button type="button" onClick={useSmart} className="btn-ghost px-3 py-2 text-xs">
            <Icon name="BarChart3" className="h-4 w-4" />
            استخدم حساباتي الذكية
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Target label="سعرات" value={np.targetCalories} max={NUM_LIMITS.dailyCalories.max} onChange={(v) => setNp({ targetCalories: v })} />
          <Target label="بروتين (غ)" value={np.targetProtein} max={1000} onChange={(v) => setNp({ targetProtein: v })} />
          <Target label="كارب (غ)" value={np.targetCarbs} max={2000} onChange={(v) => setNp({ targetCarbs: v })} />
          <Target label="دهون (غ)" value={np.targetFat} max={1000} onChange={(v) => setNp({ targetFat: v })} />
          <Target label="ماء (لتر)" value={np.targetWaterLiters} step="0.1" max={15} onChange={(v) => setNp({ targetWaterLiters: v })} />
        </div>
      </div>

      {/* وجبات جاهزة */}
      <div className="mt-5">
        <button type="button" onClick={() => setTplOpen((v) => !v)} className="btn-ghost w-full py-3">
          <Icon name="Plus" className="h-4 w-4" />
          أضف وجبة جاهزة
        </button>
        {tplOpen && (
          <div className="mt-3 rounded-2xl border border-line bg-surface p-3">
            <div className="mb-2 flex flex-wrap gap-2">
              <input className={inputCls + ' max-w-[12rem]'} value={tplQ} onChange={(e) => setTplQ(e.target.value)} placeholder="ابحث…" />
              <select className="rounded-lg border border-line bg-surface px-2.5 py-2 text-xs font-bold text-ink-700" value={tplType} onChange={(e) => setTplType(e.target.value as MealType | 'all')}>
                <option value="all">كل الأنواع</option>
                {(Object.keys(mealTypeLabels) as MealType[]).map((mt) => (
                  <option key={mt} value={mt}>{mealTypeLabels[mt].ar}</option>
                ))}
              </select>
            </div>
            <ul className="max-h-64 space-y-1.5 overflow-y-auto">
              {filteredTemplates.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-page p-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink-900">{t.nameAr} — {t.nameEn}</span>
                    <span className="text-[11px] text-ink-400">{mealTypeLabels[t.mealType].ar}</span>
                  </span>
                  <button type="button" onClick={() => addTemplate(t.id)} className="btn-primary px-3 py-1.5 text-xs">أضف</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* قائمة الوجبات */}
      <div className="mt-5 space-y-4">
        {np.meals.map((meal, mi) => (
          <div key={meal.id} className="card p-4">
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <input className={inputCls} value={meal.nameAr} onChange={(e) => updateMeal(meal.id, { nameAr: e.target.value })} placeholder="اسم الوجبة (عربي)" />
              <input className={inputCls} value={meal.nameEn} onChange={(e) => updateMeal(meal.id, { nameEn: e.target.value })} placeholder="Meal name (English)" />
            </div>

            {/* المكونات */}
            <ul className="space-y-1.5">
              {meal.ingredients.map((ig, k) => {
                const data = getIngredient(ig.ingredientId)
                return (
                  <li key={`${ig.ingredientId}-${k}`} className="flex items-center gap-2 rounded-lg border border-line bg-page p-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-ink-900">{data ? ingredientDisplayName(data.nameAr, data.nameEn, 'ar') : ig.ingredientId}</span>
                    <input type="number" inputMode="decimal" min={0} max={50} step="0.5" className="w-16 rounded-lg border border-line bg-beige px-2 py-1 text-xs text-ink-900 focus:outline-none" value={ig.servings} onChange={(e) => setServings(meal.id, k, parseSafeNumber(e.target.value, { min: 0, max: 50 }))} />
                    <span className="text-[10px] text-ink-400">حصة</span>
                    <button type="button" onClick={() => removeIngredient(meal.id, k)} className="grid h-6 w-6 place-items-center rounded text-rose-500 hover:bg-rose-500/10" aria-label="حذف"><Icon name="X" className="h-3.5 w-3.5" /></button>
                  </li>
                )
              })}
            </ul>

            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setPickerMealId(meal.id)} className="btn-ghost px-3 py-1.5 text-xs"><Icon name="Plus" className="h-3.5 w-3.5" />أضف مكوّن</button>
              <button type="button" onClick={() => recalc(meal.id)} className="btn-ghost px-3 py-1.5 text-xs"><Icon name="RotateCcw" className="h-3.5 w-3.5" />احسب من المكونات</button>
            </div>

            {/* الماكروز (قابلة للتعديل اليدوي) */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              <Target label="سعرات" value={meal.calories} onChange={(v) => updateMeal(meal.id, { calories: v })} />
              <Target label="بروتين" value={meal.protein} onChange={(v) => updateMeal(meal.id, { protein: v })} />
              <Target label="كارب" value={meal.carbs} onChange={(v) => updateMeal(meal.id, { carbs: v })} />
              <Target label="دهون" value={meal.fat} onChange={(v) => updateMeal(meal.id, { fat: v })} />
            </div>

            <div className="mt-3 flex items-center justify-end gap-1">
              <button type="button" onClick={() => moveMeal(mi, -1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-500 hover:bg-beige" aria-label="أعلى"><Icon name="ChevronLeft" className="h-4 w-4 rotate-90" /></button>
              <button type="button" onClick={() => moveMeal(mi, 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-500 hover:bg-beige" aria-label="أسفل"><Icon name="ChevronLeft" className="h-4 w-4 -rotate-90" /></button>
              <button type="button" onClick={() => removeMeal(meal.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20" aria-label="حذف"><Icon name="X" className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={addCustomMeal} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-beige py-3 text-sm font-bold text-ink-700 hover:border-primary-soft hover:text-primary-c">
        <Icon name="Plus" className="h-4 w-4" />
        أضف وجبة مخصّصة
      </button>

      <p className="mt-5 flex items-start gap-2 rounded-xl border border-gold-400/40 bg-gold-200/40 p-3 text-xs leading-relaxed text-ink-700">
        <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
        القيم الغذائية تقديرية وقد تختلف حسب المنتج وطريقة التحضير.
      </p>

      {pickerMealId && (
        <IngredientPicker lang="ar" onAdd={(id) => addIngredient(pickerMealId, id)} onClose={() => setPickerMealId(null)} />
      )}
    </div>
  )
}

function Target({ label, value, step, max, onChange }: { label: string; value: number; step?: string; max?: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-ink-400">{label}</span>
      <input type="number" inputMode="decimal" min={0} max={max} step={step ?? '1'} className={inputCls} value={value} onChange={(e) => onChange(parseSafeNumber(e.target.value, { min: 0, max: max ?? Number.MAX_SAFE_INTEGER }))} />
    </label>
  )
}
