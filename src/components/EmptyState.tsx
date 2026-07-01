import { Icon } from './Icon'
import { cn } from '@/lib/cn'

// حالة فارغة ودودة قابلة لإعادة الاستخدام — نبرة خليجية دافئة وتشجيعية.
// تُستخدم في اللوحة/التغذية/التمرين حين لا توجد بيانات بعد.

interface EmptyStateProps {
  icon?: string
  title: string
  body?: string
  /** نص زر الإجراء (اختياري). */
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({ icon = 'Sparkles', title, body, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex animate-fade-in flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-10 text-center',
        className,
      )}
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary-c">
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <p className="max-w-xs text-base font-black leading-relaxed text-ink-900">{title}</p>
      {body && <p className="max-w-sm text-sm leading-relaxed text-ink-500">{body}</p>}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="btn-primary press mt-2">
          {actionLabel}
        </button>
      )}
    </div>
  )
}
