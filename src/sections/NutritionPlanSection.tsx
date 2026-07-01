import { useState } from 'react'
import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { QuickMealLogger } from '@/components/nutrition/QuickMealLogger'
import { CalorieExplainer } from '@/components/nutrition/CalorieExplainer'
import { useCustomization } from '@/lib/customizationContext'
import { mealAlternatives, mealDisplayName, mealTypeLabels, planTotals } from '@/lib/nutritionPlan'
import type { PlanMeal } from '@/types/nutrition'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'

/** قسم «خطة الأكل» في الرئيسية — تسجيل الوجبات، الأهداف، الوجبات، وتبديل الوجبة. */
export function NutritionPlanSection({ lang }: { lang: Lang }) {
  const { customization, applyCustomization } = useCustomization()
  const np = customization.nutritionPlan
  const t = getStrings(lang).nutrition
  const [swapFor, setSwapFor] = useState<string | null>(null)

  // أهداف التسجيل — من خطة الأكل إن وُجدت، وإلا من الحسابات الذكية (حتى يعمل المسجّل دائمًا)
  const logCalories = np.targetCalories || customization.targets.maintenanceCalories || 2000
  const logProtein = np.targetProtein || customization.targets.proteinGrams || 120

  // المسجّل السريع يظهر دائمًا في الرئيسية — حتى لو لم تُفعَّل خطة وجبات.
  if (!np.enabled || np.meals.length === 0) {
    return (
      <section id="nutrition" className="section bg-beige">
        <div className="container-page">
          <SectionHeading eyebrow={t.title} icon="Salad" title={t.title} description={t.desc} />
          <div className="mt-10">
            <QuickMealLogger lang={lang} targetCalories={logCalories} targetProtein={logProtein} />
          </div>
          <div className="mt-6">
            <CalorieExplainer />
          </div>
          <p className="mt-4 text-center text-xs text-ink-400">{t.empty}</p>
        </div>
      </section>
    )
  }

  const totals = planTotals(np.meals)

  const swapMeal = (mealId: string, alt: PlanMeal) => {
    const meals = np.meals.map((m) =>
      m.id === mealId
        ? { ...alt, id: m.id, order: m.order } // حافظ على المعرّف والترتيب
        : m,
    )
    applyCustomization({ ...customization, nutritionPlan: { ...np, meals } })
    setSwapFor(null)
  }

  const targets = [
    { label: t.calories, planned: Math.round(totals.calories), target: np.targetCalories, unit: '' },
    { label: t.protein, planned: Math.round(totals.protein), target: np.targetProtein, unit: 'غ' },
    { label: t.carbs, planned: Math.round(totals.carbs), target: np.targetCarbs, unit: 'غ' },
    { label: t.fat, planned: Math.round(totals.fat), target: np.targetFat, unit: 'غ' },
  ]

  return (
    <section id="nutrition" className="section bg-beige">
      <div className="container-page">
        <SectionHeading eyebrow={t.title} icon="Salad" title={t.title} description={t.desc} />

        {/* تسجيل الوجبات السريع + التقدّم اليومي (مأكول/الهدف/المتبقّي) */}
        <div className="mt-10">
          <QuickMealLogger lang={lang} targetCalories={np.targetCalories} targetProtein={np.targetProtein} />
        </div>

        {/* شفافية الحساب: كيف نحسب سعراتك؟ (بناء الثقة بالأرقام) */}
        <div className="mt-6">
          <CalorieExplainer />
        </div>

        {/* الأهداف مقابل المخطّط */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {targets.map((m) => {
            const diff = m.planned - m.target
            return (
              <div key={m.label} className="card p-5">
                <p className="text-xs text-ink-500">{m.label}</p>
                <p className="mt-1 text-xl font-black text-ink-900">
                  {m.planned}
                  <span className="text-sm font-bold text-ink-400"> / {m.target}{m.unit}</span>
                </p>
                <p className={`mt-1 text-[11px] font-bold ${diff > 0 ? 'text-danger' : 'text-success'}`}>
                  {t.diff}: {diff > 0 ? '+' : ''}{diff}{m.unit}
                </p>
              </div>
            )
          })}
        </div>

        {/* قائمة الوجبات + تبديل الوجبة */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {np.meals.map((meal) => {
            const alts = swapFor === meal.id ? mealAlternatives(meal, customization.profile.dietPattern) : []
            return (
              <div key={meal.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-ink-900">{mealDisplayName(meal, lang)}</p>
                  <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary-c">
                    {mealTypeLabels[meal.mealType][lang === 'en' ? 'en' : 'ar']}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-500">
                  <Macro icon="Flame" value={`${meal.calories}`} label={t.calories} />
                  <Macro icon="Salad" value={`${meal.protein}غ`} label={t.protein} />
                  <Macro icon="CalendarDays" value={`${meal.carbs}غ`} label={t.carbs} />
                  <Macro icon="Droplets" value={`${meal.fat}غ`} label={t.fat} />
                </div>

                <button
                  type="button"
                  onClick={() => setSwapFor(swapFor === meal.id ? null : meal.id)}
                  className="btn-ghost mt-4 px-3 py-1.5 text-xs"
                >
                  <Icon name="RefreshCw" className="h-3.5 w-3.5" />
                  {t.swapMeal}
                </button>

                {swapFor === meal.id && (
                  <div className="mt-3 rounded-xl border border-line bg-page p-3">
                    <p className="mb-2 text-[11px] font-bold text-ink-500">{t.swapMealTitle}</p>
                    {alts.length === 0 ? (
                      <p className="text-xs text-ink-400">{t.noAlternatives}</p>
                    ) : (
                      <ul className="space-y-2">
                        {alts.map((alt) => (
                          <li key={alt.nameAr}>
                            <button
                              type="button"
                              onClick={() => swapMeal(meal.id, alt)}
                              className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-surface p-2.5 text-start hover:border-primary-c"
                            >
                              <span className="min-w-0 truncate text-sm text-ink-900">{mealDisplayName(alt, lang)}</span>
                              <span className="shrink-0 text-[11px] font-bold text-orange-300">{alt.calories} · {alt.protein}غ</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="mt-6 flex items-start gap-2 text-xs text-ink-400">
          <Icon name="AlertTriangle" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t.estimateNote}
        </p>
      </div>
    </section>
  )
}

function Macro({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon name={icon} className="h-3.5 w-3.5 text-primary-c" />
      <span className="font-bold text-ink-900">{value}</span>
      <span>{label}</span>
    </span>
  )
}
