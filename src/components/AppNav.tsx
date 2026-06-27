import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'

export type NavBadgeKind = 'demo' | 'guest' | 'cloud'

export interface NavBadge {
  kind: NavBadgeKind
  /** نص إضافي (مثل البريد) للحساب السحابي. */
  label?: string
}

interface AppNavProps {
  lang: Lang
  current: 'dashboard' | 'demo'
  onHome: () => void
  /** فتح الإعدادات — يُخفى في وضع النموذج. */
  onSettings?: () => void
  badge?: NavBadge
}

const BADGE_STYLES: Record<NavBadgeKind, string> = {
  demo: 'bg-primary text-white',
  guest: 'bg-white/15 text-white',
  cloud: 'bg-success/20 text-success',
}

const BADGE_ICONS: Record<NavBadgeKind, string> = {
  demo: 'Sparkles',
  guest: 'Smartphone',
  cloud: 'Cloud',
}

/** شريط تطبيق مدمج (داكن) — شعار + الرئيسية + الإعدادات + شارة الوضع. */
export function AppNav({ lang, current, onHome, onSettings, badge }: AppNavProps) {
  const t = getStrings(lang)
  const badgeLabel = (kind: NavBadgeKind) =>
    kind === 'demo' ? t.account.badgeDemo : kind === 'guest' ? t.account.badgeGuest : t.account.badgeCloud

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-900 text-white">
      <div className="container-page flex h-14 items-center justify-between gap-3">
        <button type="button" onClick={onHome} className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white shadow-glow">
            <Icon name="Dumbbell" className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-black tracking-tight text-white">{t.brand}</span>
        </button>

        <div className="flex items-center gap-2">
          {badge && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black',
                BADGE_STYLES[badge.kind],
              )}
              title={badge.label}
            >
              <Icon name={BADGE_ICONS[badge.kind]} className="h-3 w-3" />
              <span className="hidden sm:inline">
                {badge.kind === 'cloud' && badge.label ? badge.label : badgeLabel(badge.kind)}
              </span>
            </span>
          )}

          {current !== 'demo' && (
            <>
              <button
                type="button"
                onClick={onHome}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:text-sm"
              >
                <Icon name="Home" className="h-4 w-4" />
                <span className="hidden sm:inline">{t.nav.home}</span>
              </button>
              {onSettings && (
                <button
                  type="button"
                  onClick={onSettings}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:text-sm"
                >
                  <Icon name="Settings" className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.nav.settings}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  )
}
