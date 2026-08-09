import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'

export type AppView = 'dashboard' | 'setup' | 'settings'

export type AppBadge = 'guest' | 'account'

interface AppNavProps {
  current: AppView
  lang: Lang
  /** شارة الحالة: ضيف / حساب. */
  badge: AppBadge
  onNavigate: (view: AppView) => void
}

/** شريط تنقّل التطبيق — مبسّط: الشعار + الرئيسية + الإعدادات + شارة الحالة. */
export function AppNav({ current, lang, badge, onNavigate }: AppNavProps) {
  const t = getStrings(lang)

  const badgeLabel = badge === 'account' ? t.badge.account : t.badge.guest
  const badgeIcon = badge === 'account' ? 'CheckCircle2' : 'User'
  const badgeClass =
    badge === 'account'
      ? 'bg-primary-soft text-primary-c'
      : 'border border-line bg-surface text-ink-700'

  const tabs: { id: AppView; label: string; icon: string }[] = [
    { id: 'dashboard', label: t.nav.home, icon: 'Flame' },
    { id: 'settings', label: t.nav.settings, icon: 'Settings' },
  ]

  return (
    <header className="sticky top-0 z-40 glass border-b border-line" style={{ paddingTop: 'var(--safe-top)' }}>
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <button type="button" onClick={() => onNavigate('dashboard')} className="flex items-center gap-2.5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-white shadow-glow">
            <Icon name="Dumbbell" className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-extrabold text-ink-900">{t.brand}</span>
        </button>

        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                aria-label={tab.label}
                className={cn(
                  // [CTO-009/WP-7] ≥44بكسل: كان `py-1.5` يعطي ٢٨بكسل — أصغر من
                  // الحدّ الموصى به للمس، وهذه أزرار تنقّل رئيسية تُضغط كثيرًا.
                  'flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors sm:text-sm',
                  current === tab.id
                    ? 'bg-primary text-white'
                    : 'text-ink-500 hover:bg-beige hover:text-ink-900',
                )}
              >
                <Icon name={tab.icon} className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* شارة الحالة */}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black',
              badgeClass,
            )}
          >
            <Icon name={badgeIcon} className="h-3.5 w-3.5" />
            {badgeLabel}
          </span>
        </div>
      </div>
    </header>
  )
}
