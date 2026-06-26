import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { useCustomization } from '@/lib/customizationContext'
import { mealDisplayName, mealTypeLabels, planTotals } from '@/lib/nutritionPlan'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'

/** قسم «خطة الأكل» في الرئيسية — الأهداف والوجبات والمجاميع والفروق. */
export function NutritionPlanSection({ lang }: { lang: Lang }) {
  const { customization } = useCustomization()
  const np = customization.nutritionPlan
  const t = getStrings(lang).nutrition

  if (!np.enabled || np.meals.length === 0) {
    return (
      <section id="nutrition" className="section bg-beige">
        <div className="container-page">
          <SectionHeading eyebrow={t.title} icon="Salad" title={t.title} description={t.desc} />
          <div className="mt-10 rounded-2xl border border-line bg-surface p-10 text-center">
            <p className="text-sm text-ink-500">{t.empty}</p>
          </div>
        </div>
      </section>
    )
  }

  const totals = planTotals(np.meals)
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

        {/* الأهداف مقابل المخطّط */}
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
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

        {/* قائمة الوجبات */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {np.meals.map((meal) => (
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
            </div>
          ))}
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
