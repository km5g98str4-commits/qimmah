import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { useCustomization } from '@/lib/customizationContext'
import { targetCaloriesFor } from '@/lib/calculators'

/** قسم «حساباتي» — ملخّص الأهداف المقدّرة في الصفحة الرئيسية. */
export function MyTargets() {
  const { customization } = useCustomization()
  const t = customization.targets
  const p = customization.profile
  const calories = targetCaloriesFor(p.goal, t)

  const cards: { icon: string; label: string; value: string; sub?: string }[] = [
    { icon: 'Scale', label: 'مؤشر الكتلة BMI', value: `${t.bmi}`, sub: t.bmiLabel },
    { icon: 'Flame', label: 'سعرات الهدف', value: `${calories}`, sub: 'سعرة / يوم' },
    { icon: 'Salad', label: 'البروتين', value: `${t.proteinGrams}`, sub: 'غرام / يوم' },
    { icon: 'Droplets', label: 'الماء', value: `${t.waterLiters}`, sub: 'لتر / يوم' },
    { icon: 'Target', label: 'الوزن الهدف', value: `${p.targetWeightKg}`, sub: 'كجم' },
    { icon: 'CalendarDays', label: 'مدة تقديرية', value: `${t.estimatedWeeksToGoal}`, sub: 'أسبوع' },
  ]

  return (
    <section id="targets" className="section bg-beige">
      <div className="container-page">
        <SectionHeading
          eyebrow="حساباتي"
          icon="BarChart3"
          title="أرقامك المستهدفة في لمحة"
          description="تقديرات مبنية على بياناتك — للتنظيم والمتابعة فقط، وليست بديلًا عن مختص."
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

        {/* اقتراح التمرين */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
            <Icon name="Dumbbell" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs text-ink-500">التقسيمة المقترحة</p>
            <p className="text-sm font-bold text-ink-900">{t.suggestedTrainingSplit}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
