import { NutritionPlanSection } from '@/sections/NutritionPlanSection'
import { WellnessSection } from '@/sections/WellnessSection'
import { useCustomization } from '@/lib/customizationContext'
import type { Lang } from '@/lib/appPreferences'

/** تبويب التغذية — خطة الأكل والماء + المكملات/الأدوية. */
export function NutritionView({ lang }: { lang: Lang }) {
  const { customization } = useCustomization()
  const s = customization.sections
  return (
    <div className="space-y-2 py-2">
      {s.meals ? <NutritionPlanSection lang={lang} /> : null}
      {(s.supplements || s.medications) && <WellnessSection lang={lang} />}
    </div>
  )
}
