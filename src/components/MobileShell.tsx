import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { InstallBanner } from './InstallBanner'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import type { AppRoute } from '@/lib/appRoutes'
import type { AppBadge } from './AppNav'
import { LanguageToggle } from '@/i18n'

export type MainTab = 'dashboard' | 'workout' | 'nutrition' | 'progress' | 'profile'

interface MobileShellProps {
  lang: Lang
  tab: MainTab
  badge: AppBadge
  onNavigate: (route: AppRoute) => void
  onOpenSettings: () => void
  children: ReactNode
}

interface TabDef {
  id: MainTab
  route: AppRoute
  label: string
  icon: string
}

/** قشرة التطبيق على الجوال — هيدر مدمج أعلى + شريط تنقّل سفلي ثابت. */
export function MobileShell({ lang, tab, badge, onNavigate, onOpenSettings, children }: MobileShellProps) {
  const t = getStrings(lang)

  const tabs: TabDef[] = [
    { id: 'dashboard', route: 'dashboard', label: t.tabs.home, icon: 'Flame' },
    { id: 'workout', route: 'workout', label: t.tabs.workout, icon: 'Dumbbell' },
    { id: 'nutrition', route: 'nutrition', label: t.tabs.nutrition, icon: 'Salad' },
    { id: 'progress', route: 'progress', label: t.tabs.progress, icon: 'BarChart3' },
    { id: 'profile', route: 'profile', label: t.tabs.profile, icon: 'User' },
  ]

  const badgeLabel = badge === 'account' ? t.badge.account : t.badge.guest
  const badgeIcon = badge === 'account' ? 'CheckCircle2' : 'User'
  const badgeClass =
    badge === 'account'
      ? 'bg-primary-soft text-primary-c'
      : 'border border-line bg-beige text-ink-500'

  return (
    <div className="min-h-screen bg-page">
      <div className="app-container flex min-h-screen flex-col border-x border-line/60">
        {/* هيدر مدمج */}
        <header className="sticky top-0 z-40 glass">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <button type="button" onClick={() => onNavigate('dashboard')} className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white shadow-glow">
                <Icon name="Dumbbell" className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="text-base font-extrabold text-ink-900">{t.brand}</span>
            </button>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black',
                  badgeClass,
                )}
              >
                <Icon name={badgeIcon} className="h-3 w-3" />
                {badgeLabel}
              </span>
              <LanguageToggle variant="compact" />
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label={t.nav.settings}
                className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-surface text-ink-500 transition-colors hover:text-ink-900"
              >
                <Icon name="Settings" className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* شريط تثبيت التطبيق — قابل للإغلاق، يظهر فقط عند الحاجة */}
        <InstallBanner lang={lang} onOpenSettings={onOpenSettings} />

        {/* المحتوى */}
        <main className="flex-1 pb-24">{children}</main>
      </div>

      {/* شريط التنقّل السفلي — ثابت، مع مسافة أمان */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 backdrop-blur-xl"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        <div className="app-container grid grid-cols-5">
          {tabs.map((tb) => {
            const active = tb.id === tab
            return (
              <button
                key={tb.id}
                type="button"
                onClick={() => onNavigate(tb.route)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold transition-colors',
                  active ? 'text-primary-c' : 'text-ink-500 hover:text-ink-700',
                )}
              >
                <span
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-xl transition-colors',
                    active ? 'bg-primary-soft' : 'bg-transparent',
                  )}
                >
                  <Icon name={tb.icon} className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                </span>
                {tb.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
