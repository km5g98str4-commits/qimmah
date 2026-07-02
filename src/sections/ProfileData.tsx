import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { useCustomization } from '@/lib/customizationContext'
import { activityOptions, targetCaloriesFor } from '@/lib/calculators'
import { activityLabelI18n } from '@/lib/i18nLabels'
import { profileScreenStrings } from '@/i18n/dict/profileScreen'
import type { Lang } from '@/lib/appPreferences'

/** قسم البيانات الأساسية — بطاقات العمر/الطول/الوزن/الهدف من بيانات المستخدم الحيّة. */
export function ProfileData({ lang = 'ar' }: { lang?: Lang }) {
  const d = profileScreenStrings[lang]
  const { customization } = useCustomization()
  const p = customization.profile
  const activityLabelAr = activityOptions.find((a) => a.value === p.activityLevel)?.label ?? d.activityMedium
  const activityLabel = activityLabelI18n(p.activityLevel, activityLabelAr, lang)
  const calories = targetCaloriesFor(p.goal, customization.targets)

  const fields: { icon: string; label: string; value: string; unit?: string }[] = [
    { icon: 'Users', label: d.age, value: `${p.age}`, unit: d.ageUnit },
    { icon: 'Maximize', label: d.height, value: `${p.heightCm}`, unit: d.heightUnit },
    { icon: 'Scale', label: d.currentWeight, value: `${p.weightKg}`, unit: d.weightUnit },
    { icon: 'Target', label: d.targetWeight, value: `${p.targetWeightKg}`, unit: d.weightUnit },
    { icon: 'Activity', label: d.activityLevel, value: activityLabel },
    { icon: 'Flame', label: d.todayCalories, value: calories.toLocaleString('en-US'), unit: d.caloriesUnit },
  ]

  return (
    <section id="profile" className="section bg-beige">
      <div className="container-page">
        <SectionHeading
          eyebrow={d.sectionEyebrow}
          icon="Ruler"
          title={d.sectionTitle}
          description={d.sectionDescription}
        />

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
