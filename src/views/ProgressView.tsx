import { ProgressSection } from '@/sections/ProgressSection'
import { CommitmentsSection } from '@/sections/CommitmentsSection'
import { CurrentGoal } from '@/sections/CurrentGoal'
import { MuscleCoverageTeaser } from '@/sections/MuscleCoverageTeaser'
import { useCustomization } from '@/lib/customizationContext'
import type { Lang } from '@/lib/appPreferences'

/** تبويب التقدّم — القياسات والالتزامات وتغطية العضلات والهدف. */
export function ProgressView({ lang }: { lang: Lang }) {
  const { customization } = useCustomization()
  const s = customization.sections
  return (
    <div className="space-y-2 py-2">
      <CurrentGoal />
      <MuscleCoverageTeaser />
      {s.measurements && <ProgressSection lang={lang} />}
      {s.commitments && <CommitmentsSection lang={lang} />}
    </div>
  )
}
