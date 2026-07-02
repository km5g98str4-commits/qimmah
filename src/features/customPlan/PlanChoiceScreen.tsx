import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { customPlanStrings } from './strings'
import type { PlanSource } from './storage'

interface PlanChoiceScreenProps {
  lang: Lang
  value?: PlanSource
  onChange: (value: PlanSource) => void
}

/**
 * شاشة اختيار طريقة الجدول داخل الإعداد (بعد الأساسيات): جدول تلقائي حسب الهدف
 * أو تصميم يدوي بالباني المخصّص. بطاقتان كبيرتان واضحتان، RTL بالهوية الداكنة.
 */
export function PlanChoiceScreen({ lang, value, onChange }: PlanChoiceScreenProps) {
  const d = customPlanStrings[lang]
  return (
    <div className="animate-fade-up">
      <h2 className="text-2xl font-black leading-tight text-ink-900">{d.choiceTitle}</h2>
      <p className="mt-2 text-sm text-ink-500">{d.choiceHint}</p>
      <div className="mt-6 space-y-3">
        <ChoiceCard
          icon="Sparkles"
          title={d.autoTitle}
          desc={d.autoDesc}
          badge={d.recommendedBadge}
          selected={value === 'auto'}
          onClick={() => onChange('auto')}
        />
        <ChoiceCard
          icon="SlidersHorizontal"
          title={d.customTitle}
          desc={d.customDesc}
          selected={value === 'custom'}
          onClick={() => onChange('custom')}
        />
      </div>
    </div>
  )
}

function ChoiceCard({
  icon,
  title,
  desc,
  badge,
  selected,
  onClick,
}: {
  icon: string
  title: string
  desc: string
  badge?: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-start gap-3 rounded-2xl border p-4 text-start transition-colors active:scale-[0.99]',
        selected ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:border-primary-soft',
      )}
    >
      <span
        className={cn(
          'grid h-12 w-12 shrink-0 place-items-center rounded-xl',
          selected ? 'bg-primary text-white' : 'bg-beige text-ink-500',
        )}
      >
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-base font-black text-ink-900">{title}</span>
          {badge && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-white">{badge}</span>
          )}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-ink-500">{desc}</span>
      </span>
      <span
        className={cn(
          'mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2',
          selected ? 'border-primary bg-primary text-white' : 'border-line text-transparent',
        )}
      >
        <Icon name="Check" className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    </button>
  )
}
