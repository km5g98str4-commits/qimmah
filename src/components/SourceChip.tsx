import type { Lang } from '@/lib/appPreferences'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'

/** Provenance variants from the v3.0 component library (Source chip). */
export type SourceKind = 'health' | 'estimate' | 'manual' | 'self-report' | 'unavailable'

const LABELS: Record<SourceKind, { ar: string; en: string; icon: string }> = {
  health: { ar: 'صحة Apple', en: 'Apple Health', icon: 'Activity' },
  estimate: { ar: 'تقدير', en: 'Estimate', icon: 'Sparkles' },
  manual: { ar: 'يدوي', en: 'Manual', icon: 'User' },
  'self-report': { ar: 'تقييم ذاتي', en: 'Self-report', icon: 'ClipboardList' },
  unavailable: { ar: 'غير متوفّر', en: 'Unavailable', icon: 'CircleSlash' },
}

const TONES: Record<SourceKind, string> = {
  health: 'bg-primary/10 text-primary',
  estimate: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  manual: 'bg-ink-500/10 text-ink-500',
  'self-report': 'bg-ink-500/10 text-ink-500',
  unavailable: 'bg-ink-500/10 text-ink-400',
}

/** A small labeled chip declaring where a number came from. Honesty at a glance. */
export function SourceChip({ kind, lang, className }: { kind: SourceKind; lang: Lang; className?: string }) {
  const meta = LABELS[kind]
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', TONES[kind], className)}
    >
      <Icon name={meta.icon} className="h-3 w-3" />
      {lang === 'ar' ? meta.ar : meta.en}
    </span>
  )
}
