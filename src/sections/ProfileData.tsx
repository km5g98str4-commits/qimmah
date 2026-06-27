import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { sectionCopy } from '@/config/content'
import { useCustomization } from '@/lib/customizationContext'
import { activityOptions, targetCaloriesFor } from '@/lib/calculators'

/** قسم البيانات الأساسية — بطاقات العمر/الطول/الوزن/الهدف من بيانات المستخدم الحيّة. */
export function ProfileData() {
  const { customization } = useCustomization()
  const p = customization.profile
  const activityLabel = activityOptions.find((a) => a.value === p.activityLevel)?.label ?? 'متوسط'
  const calories = targetCaloriesFor(p.goal, customization.targets)

  const fields: { icon: string; label: string; value: string; unit?: string }[] = [
    { icon: 'Users', label: 'العمر', value: `${p.age}`, unit: 'سنة' },
    { icon: 'Maximize', label: 'الطول', value: `${p.heightCm}`, unit: 'سم' },
    { icon: 'Scale', label: 'الوزن الحالي', value: `${p.weightKg}`, unit: 'كجم' },
    { icon: 'Target', label: 'الوزن الهدف', value: `${p.targetWeightKg}`, unit: 'كجم' },
    { icon: 'Activity', label: 'مستوى النشاط', value: activityLabel },
    { icon: 'Flame', label: 'سعرات اليوم', value: calories.toLocaleString('en-US'), unit: 'سعرة' },
  ]

  return (
    <section id="profile" className="section bg-beige">
      <div className="container-page">
        <SectionHeading {...sectionCopy.profile} />

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {fields.map((f) => (
            <div key={f.label} className="card p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary-c">
                <Icon name={f.icon} className="h-5 w-5" />
              </span>
              <p className="mt-4 text-xs text-ink-500">{f.label}</p>
              <p className="mt-1">
                <span className="text-xl font-black text-ink-900">{f.value}</span>
                {f.unit && <span className="ms-1 text-xs text-ink-500">{f.unit}</span>}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
