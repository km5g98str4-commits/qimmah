import { SectionHeading } from '@/components/SectionHeading'
import { ProgressBar } from '@/components/ProgressBar'
import { meals, macroTargets } from '@/data/meals'

/** قسم الوجبات والماكروز — قائمة الوجبات + تقدّم الأهداف الغذائية. */
export function Meals() {
  return (
    <section id="meals" className="section bg-ink-900/30">
      <div className="container-page">
        <SectionHeading
          eyebrow="التغذية والماكروز"
          icon="Salad"
          title="تحكّم كامل في سعراتك وماكروزك"
          description="سجّل وجباتك واحسب البروتين والكربوهيدرات والدهون، وتابع اقترابك من أهدافك اليومية."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-5">
          {/* أهداف الماكروز */}
          <div className="card p-6 lg:col-span-2">
            <p className="text-sm font-bold text-white">أهداف اليوم</p>
            <div className="mt-6 space-y-5">
              {macroTargets.map((m) => (
                <div key={m.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">{m.label}</span>
                    <span className="text-slate-400">
                      <span className="font-bold text-white">{m.current}</span> / {m.target} {m.unit}
                    </span>
                  </div>
                  <ProgressBar current={m.current} target={m.target} color={m.color} className="mt-2" />
                </div>
              ))}
            </div>
          </div>

          {/* قائمة الوجبات */}
          <div className="card overflow-hidden lg:col-span-3">
            <div className="border-b border-white/[0.06] p-5">
              <p className="text-sm font-bold text-white">وجبات اليوم</p>
            </div>
            <ul className="divide-y divide-white/[0.04]">
              {meals.map((meal) => (
                <li key={meal.name} className="flex items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{meal.name}</p>
                    <p className="text-xs text-slate-400">{meal.time}</p>
                  </div>
                  <div className="hidden shrink-0 gap-3 text-center text-[11px] text-slate-400 sm:flex">
                    <span>
                      <span className="block font-bold text-brand-300">{meal.protein}</span>بروتين
                    </span>
                    <span>
                      <span className="block font-bold text-sky-300">{meal.carbs}</span>كارب
                    </span>
                    <span>
                      <span className="block font-bold text-gold-300">{meal.fats}</span>دهون
                    </span>
                  </div>
                  <span className="shrink-0 rounded-lg bg-orange-500/15 px-2.5 py-1 text-xs font-bold text-orange-300">
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
