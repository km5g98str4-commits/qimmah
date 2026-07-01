import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { useCustomization } from '@/lib/customizationContext'
import { BMI_NOTE, targetCaloriesFor } from '@/lib/calculators'
import { profileScreenStrings } from '@/i18n/dict/profileScreen'
import type { Lang } from '@/lib/appPreferences'

/** قسم «حساباتي» — ملخّص الأهداف المقدّرة في الصفحة الرئيسية. */
export function MyTargets({ lang = 'ar' }: { lang?: Lang }) {
  const d = profileScreenStrings[lang]
  const { customization } = useCustomization()
  const t = customization.targets
  const p = customization.profile
  // السعرات المستهدفة الموحّدة (مصدر الحقيقة) — تتفق مع الرئيسية وتبويب التغذية.
  const calories = t.targetCalories || targetCaloriesFor(p.goal, t)

  // وزن الهدف يُسأل ويُعرض فقط لهدفَي التنشيف/التضخيم؛ القوة لا وزن هدف لها
  // (وزن الهدف = الوزن الحالي والمدة = 0، فإظهارها مضلّل). نخفيها للقوة.
  const isWeightGoal = p.goalType === 'cutting' || p.goalType === 'bulking'
  const weekly = t.weeklyWeightChangeKg
  const etaSub = weekly !== 0 ? `${d.weekEta} · ${Math.abs(weekly)} ${d.weekPerWeek}` : d.weekEta

  const cards: { icon: string; label: string; value: string; sub?: string }[] = [
    { icon: 'Scale', label: d.bmiLabel, value: `${t.bmi}`, sub: t.bmiLabel },
    { icon: 'Flame', label: d.targetCalories, value: `${calories}`, sub: d.caloriesPerDay },
    { icon: 'Salad', label: d.protein, value: `${t.proteinGrams}`, sub: d.gramsPerDay },
    { icon: 'Droplets', label: d.water, value: `${t.waterLiters}`, sub: d.litersPerDay },
    ...(isWeightGoal
      ? [
          { icon: 'Target', label: d.targetWeightCard, value: `${p.targetWeightKg}`, sub: d.targetWeightUnit },
          { icon: 'CalendarDays', label: d.estimatedDuration, value: `${t.estimatedWeeksToGoal}`, sub: etaSub },
        ]
      : []),
  ]

  return (
    <section id="targets" className="section bg-beige">
      <div className="container-page">
        <SectionHeading
          eyebrow={d.targetsEyebrow}
          icon="BarChart3"
          title={d.targetsTitle}
          description={d.targetsDescription}
        />

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map((c) => (
            <div key={c.label} className="card p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary-c">
                <Icon name={c.icon} className="h-5 w-5" />
              </span>
              <p className="mt-4 text-xs text-ink-500">{c.label}</p>
              <p className="mt-1 text-xl font-black text-ink-900">{c.value}</p>
              {c.sub && <p className="text-[11px] text-ink-400">{c.sub}</p>}
            </div>
          ))}
        </div>

        {/* تنبيه مؤشر BMI */}
        <p className="mt-4 flex items-start gap-2 text-xs text-ink-400">
          <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {BMI_NOTE}
        </p>

        {/* اقتراح التمرين */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
            <Icon name="Dumbbell" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs text-ink-500">{d.suggestedSplit}</p>
            <p className="text-sm font-bold text-ink-900">{t.suggestedTrainingSplit}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
