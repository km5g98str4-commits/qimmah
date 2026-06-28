import { useMemo } from 'react'
import { Icon } from '@/components/Icon'
import { useCustomization } from '@/lib/customizationContext'
import { goalTypeLabel, targetCaloriesFor } from '@/lib/calculators'
import { currentWeekSummary } from '@/lib/streaks'
import { getStrings } from '@/config/strings'

/** ملخّص يومي/ترحيب أعلى الرئيسية. */
export function DailySummary() {
  const { customization } = useCustomization()
  const p = customization.profile
  const t = customization.targets
  const name = customization.identity.userName
  const calories = targetCaloriesFor(p.goal, t)
  const tw = getStrings('ar').workout

  // عدد أيام التمرين/الأسبوع من الخطة (للالتزام الأسبوعي).
  const daysPerWeek = customization.workoutPlan.days.length || 3
  // سلسلة وملخّص الأسبوع من السجلّ الدائم (لا من حالة اليوم المؤقتة).
  const week = useMemo(() => currentWeekSummary(daysPerWeek), [daysPerWeek])

  const cards = [
    { icon: 'Target', label: 'الهدف', value: goalTypeLabel(p.goalType) },
    { icon: 'Scale', label: 'وزنك الحالي', value: `${p.weightKg} كجم` },
    { icon: 'TrendingDown', label: 'وزنك الهدف', value: `${p.targetWeightKg} كجم` },
    { icon: 'Flame', label: 'سعرات اليوم', value: `${calories}` },
    { icon: 'Salad', label: 'بروتين', value: `${t.proteinGrams}غ` },
    { icon: 'Droplets', label: 'ماء', value: `${t.waterLiters} ل` },
  ]

  return (
    <section id="summary" className="pt-12 sm:pt-16">
      <div className="container-page">
        <div className="card overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute" />
          <span className="eyebrow">
            <Icon name="Flame" className="h-3.5 w-3.5" />
            خطتك اليوم
          </span>
          <h1 className="mt-3 text-2xl font-black text-ink-900 sm:text-3xl">
            {name?.trim() ? `أهلًا ${name}، هذه خطتك اليوم 👋` : 'هذه خطتك اليوم 👋'}
          </h1>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {cards.map((c) => (
              <div key={c.label} className="rounded-xl border border-line bg-page p-3">
                <Icon name={c.icon} className="h-4 w-4 text-primary-c" />
                <p className="mt-2 text-[11px] text-ink-500">{c.label}</p>
                <p className="text-lg font-black text-ink-900">{c.value}</p>
              </div>
            ))}
          </div>

          {/* سلسلة الالتزام الأسبوعي + التقدّم — من السجلّ الدائم */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-page px-3 py-1.5 text-xs font-bold text-ink-700">
              <Icon name="Flame" className="h-3.5 w-3.5 text-primary-c" />
              {tw.weeklyStreakTitle}: {week.weekly.streakWeeks} {tw.weeksUnit}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-page px-3 py-1.5 text-xs font-bold text-ink-700">
              <Icon name="CheckCircle2" className="h-3.5 w-3.5 text-primary-c" />
              {tw.weeklyDonePrefix} {week.weekly.thisWeekCount} {tw.of} {week.weekly.daysPerWeek} {tw.weeklyWorkoutsWord}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-page px-3 py-1.5 text-xs font-bold text-ink-700">
              <Icon name="Salad" className="h-3.5 w-3.5 text-primary-c" />
              التزام التغذية: {week.nutritionDays}/7
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
