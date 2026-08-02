import { SectionHeading } from '@/components/SectionHeading'
import { ProgressBar } from '@/components/ProgressBar'
import { meals, macroTargets } from '@/data/meals'
import { sectionCopy, labels } from '@/config/content'

/** قسم الوجبات والماكروز — قائمة الوجبات + تقدّم الأهداف الغذائية. */
export function Meals() {
  return (
    <section id="meals" className="section bg-beige">
      <div className="container-page">
        <SectionHeading {...sectionCopy.meals} />

        <div className="mt-12 grid gap-6 lg:grid-cols-5">
          {/* أهداف الماكروز */}
          <div className="card p-6 lg:col-span-2">
            <p className="text-sm font-bold text-ink-900">{labels.meals.todayTargets}</p>
            <div className="mt-6 space-y-5">
              {macroTargets.map((m) => (
                <div key={m.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink-700">{m.label}</span>
                    <span className="text-ink-500">
                      <span className="font-bold text-ink-900">{m.current}</span> / {m.target} {m.unit}
                    </span>
                  </div>
                  <ProgressBar current={m.current} target={m.target} color={m.color} className="mt-2" />
                </div>
              ))}
            </div>
          </div>

          {/* قائمة الوجبات */}
          <div className="card overflow-hidden lg:col-span-3">
            <div className="border-b border-line p-5">
              <p className="text-sm font-bold text-ink-900">{labels.meals.todayMeals}</p>
            </div>
            <ul className="divide-y divide-line">
              {meals.map((meal) => (
                <li key={meal.name} className="flex items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">{meal.name}</p>
                    <p className="text-xs text-ink-500">{meal.time}</p>
                  </div>
                  <div className="hidden shrink-0 gap-3 text-center text-[11px] text-ink-500 sm:flex">
                    <span>
                      <span className="block font-bold text-brand-300">{meal.protein}</span>
                      {labels.meals.protein}
                    </span>
                    <span>
                      <span className="block font-bold text-sky-300">{meal.carbs}</span>
                      {labels.meals.carbs}
                    </span>
                    <span>
                      <span className="block font-bold text-gold-300">{meal.fats}</span>
                      {labels.meals.fats}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary-c">
                    {meal.calories} سعرة
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
