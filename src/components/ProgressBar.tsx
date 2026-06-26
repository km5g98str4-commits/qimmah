import { cn } from '@/lib/cn'

interface ProgressBarProps {
  current: number
  target: number
  color?: string
  className?: string
}

/** شريط تقدّم بسيط يحسب النسبة تلقائيًا (محدود بـ 100%). */
export function ProgressBar({ current, target, color = 'bg-brand-500', className }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((current / target) * 100))
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-line', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-700', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
