import { useId } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { buildMedalCoin } from '@/lib/medalArt'
import type { AchievementCategory } from '@/data/achievements'

interface MedalBadgeProps {
  /** فئة الوسام — تحدّد لون القرص المعدني. */
  category: AchievementCategory
  /** اسم الأيقونة المركزية (lucide). */
  icon: string
  /** مفتوح = لون كامل + توهّج، مقفل = رمادي مُطفأ + قفل. */
  unlocked: boolean
  /** حجم القرص بالبكسل (افتراضي 72). */
  size?: number
  className?: string
}

/**
 * وسام قِمّة (Apple-style) — قرص SVG معدني بلون الفئة، أيقونة مركزية حادّة، ولمعان خفيف.
 * مقفل = رمادي مُطفأ مع شارة قفل. البصريات فقط — لا يمسّ منطق الفتح.
 */
export function MedalBadge({ category, icon, unlocked, size = 72, className }: MedalBadgeProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  // قرص الوسام SVG ثابت مُولّد داخليًا (لا مدخلات مستخدم) — آمن للحقن.
  const coin = buildMedalCoin({ category, unlocked, uid, size })
  const glyphSize = Math.round(size * 0.4)

  return (
    <span
      className={cn('relative inline-grid place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-0" aria-hidden="true" dangerouslySetInnerHTML={{ __html: coin }} />
      <span
        className="relative grid place-items-center"
        style={{ width: glyphSize, height: glyphSize }}
      >
        <Icon
          name={icon}
          className={cn(
            'h-full w-full',
            unlocked ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]' : 'text-ink-500/70',
          )}
          strokeWidth={2.25}
        />
      </span>
      {!unlocked && (
        <span
          className="absolute -bottom-0.5 -end-0.5 grid place-items-center rounded-full border border-line bg-surface text-ink-400 shadow-sm"
          style={{ width: Math.round(size * 0.32), height: Math.round(size * 0.32) }}
          aria-hidden="true"
        >
          <Icon name="Lock" className="h-1/2 w-1/2" strokeWidth={2.5} />
        </span>
      )}
    </span>
  )
}
