import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { InstallBanner } from './InstallBanner'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import type { AppRoute } from '@/lib/appRoutes'
import type { AppBadge } from './AppNav'
import { LanguageToggle } from '@/i18n'
import { V2_TAB_LABELS } from '@/design-system/v2/labels'

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
  /** v2 center action «تسجيل» — a raised quick-log button, not a plain tab. */
  action?: boolean
}

/** قشرة التطبيق على الجوال — هيدر مدمج أعلى + شريط تنقّل سفلي ثابت. */
export function MobileShell({ lang, tab, badge, onNavigate, onOpenSettings, children }: MobileShellProps) {
  const t = getStrings(lang)
  const ar = lang !== 'en'
  // v2.1 §03 — final tab labels + center «تسجيل» action, RTL order per the PDF.
  const tabs: TabDef[] = [
        { id: 'dashboard', route: 'dashboard', label: V2_TAB_LABELS.today, icon: 'Home' },
        { id: 'workout', route: 'workout', label: V2_TAB_LABELS.workout, icon: 'Dumbbell' },
        // Center action: quick-log → the nutrition logging surface (most-logged).
        { id: 'nutrition', route: 'nutrition', label: V2_TAB_LABELS.log, icon: 'Plus', action: true },
        { id: 'nutrition', route: 'nutrition', label: V2_TAB_LABELS.nutrition, icon: 'Salad' },
        { id: 'progress', route: 'progress', label: V2_TAB_LABELS.progress, icon: 'BarChart3' },
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
        <header className="sticky top-0 z-40 glass" style={{ paddingTop: 'var(--safe-top)' }}>
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
                onClick={() => onNavigate('profile')}
                aria-label={ar ? 'ملفك التدريبي' : 'Your training profile'}
                aria-current={tab === 'profile' ? 'page' : undefined}
                className={cn(
                  'grid h-11 w-11 place-items-center rounded-full border transition-colors',
                  tab === 'profile' ? 'border-primary bg-primary-soft text-primary-c' : 'border-line bg-surface text-ink-500 hover:text-ink-900',
                )}
              >
                <Icon name="User" className="h-5 w-5" />
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
        aria-label={ar ? 'التنقّل الرئيسي' : 'Primary navigation'}
      >
        <div className="app-container grid grid-cols-5">
          {tabs.map((tb) => {
            if (tb.action) {
              // Center «تسجيل» — a raised quick-log action, visually distinct.
              return (
                <div key="log-action" className="flex items-start justify-center">
                  <button
                    type="button"
                    onClick={() => onNavigate(tb.route)}
                    aria-label={tb.label}
                    className="-mt-5 flex flex-col items-center gap-1 text-[10px] font-bold text-primary-c"
                  >
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-glow ring-4 ring-surface">
                      <Icon name={tb.icon} className="h-6 w-6" strokeWidth={2.75} />
                    </span>
                    {tb.label}
                  </button>
                </div>
              )
            }
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
