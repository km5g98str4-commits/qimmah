import { cn } from '@/lib/cn'
import { muscleGroupLabel } from '@/data/muscleGroups'
import { useLang } from '@/i18n'
import type { MuscleId } from '@/types/muscles'

// رقائق العضلات المستهدفة لتمرين — تُعرض في بطاقات التمرين.
// الأسماء من القاموس المشترك (muscleGroups) حسب اللغة الحالية (P10.1).

interface MuscleChipsProps {
  primary: MuscleId[]
  secondary?: MuscleId[]
  className?: string
}

export function MuscleChips({ primary, secondary = [], className }: MuscleChipsProps) {
  const lang = useLang()
  if (!primary.length && !secondary.length) return null
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {primary.map((m) => (
        <span key={`p-${m}`} className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary-c">
          {muscleGroupLabel(m, lang)}
        </span>
      ))}
      {secondary.map((m) => (
        <span key={`s-${m}`} className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-medium text-ink-500">
          {muscleGroupLabel(m, lang)}
        </span>
      ))}
    </div>
  )
}
