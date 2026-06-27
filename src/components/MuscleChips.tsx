import { cn } from '@/lib/cn'
import { muscleLabelAr } from '@/data/muscleGroups'
import type { MuscleId } from '@/types/muscles'

// رقائق العضلات المستهدفة لتمرين — تُعرض في بطاقات التمرين.

interface MuscleChipsProps {
  primary: MuscleId[]
  secondary?: MuscleId[]
  className?: string
}

export function MuscleChips({ primary, secondary = [], className }: MuscleChipsProps) {
  if (!primary.length && !secondary.length) return null
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {primary.map((m) => (
        <span key={`p-${m}`} className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary-c">
          {muscleLabelAr(m)}
        </span>
      ))}
      {secondary.map((m) => (
        <span key={`s-${m}`} className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-medium text-ink-500">
          {muscleLabelAr(m)}
        </span>
      ))}
    </div>
  )
}
