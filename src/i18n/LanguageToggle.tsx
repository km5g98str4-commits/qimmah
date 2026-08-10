// مبدّل اللغة عربي/English — يعتمد على سياق اللغة (بلا تمرير props).
// نوعان: segmented (زرّان جنبًا إلى جنب) و compact (زر أيقونة للهيدر).

import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import { useLanguage } from './LanguageContext'

interface LanguageToggleProps {
  variant?: 'segmented' | 'compact'
  className?: string
}

export function LanguageToggle({ variant = 'segmented', className }: LanguageToggleProps) {
  const { lang, t, setLang, toggle } = useLanguage()

  if (variant === 'compact') {
    // زر أيقونة مضغوط — يبدّل بين اللغتين مباشرة (مناسب للهيدر).
    const nextLabel = lang === 'ar' ? 'English' : 'العربية'
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={`${t.lang.label}: ${nextLabel}`}
        title={nextLabel}
        className={cn(
          'inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1 text-[11px] font-black text-ink-700 transition-colors hover:text-ink-900',
          className,
        )}
      >
        <Icon name="Globe" className="h-3.5 w-3.5" />
        <span>{lang === 'ar' ? 'EN' : 'ع'}</span>
      </button>
    )
  }

  // مبدّل مقسّم — يعرض اللغتين ويبرز المفعّلة.
  return (
    <div
      role="group"
      aria-label={t.lang.label}
      className={cn('inline-flex rounded-xl border border-line bg-surface p-1', className)}
    >
      {(['ar', 'en'] as const).map((code) => {
        const active = lang === code
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            className={cn(
              // [CTO-009/WP-7] ≥44بكسل: كان `py-1.5` يعطي ٣٢بكسل.
              'min-h-[44px] rounded-lg px-4 text-sm font-black transition-colors',
              active ? 'bg-primary text-white shadow-glow' : 'text-ink-500 hover:text-ink-900',
            )}
          >
            {code === 'ar' ? t.lang.ar : t.lang.en}
          </button>
        )
      })}
    </div>
  )
}
