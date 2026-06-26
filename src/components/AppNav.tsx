import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'

export type AppView = 'dashboard' | 'setup' | 'demo'

interface AppNavProps {
  current: AppView
  lang: Lang
  onNavigate: (view: AppView) => void
  onChangeLang: (lang: Lang) => void
}

/** شريط تنقّل التطبيق — تبديل بين الرئيسية/الإعداد/النموذج + اللغة. */
export function AppNav({ current, lang, onNavigate, onChangeLang }: AppNavProps) {
  const t = getStrings(lang)
  const tabs: { id: AppView; label: string; icon: string }[] = [
    { id: 'dashboard', label: t.nav.home, icon: 'Flame' },
    { id: 'setup', label: t.nav.setup, icon: 'Palette' },
    { id: 'demo', label: t.nav.demo, icon: 'Sparkles' },
  ]

  return (
    <header className="sticky top-0 z-40 glass border-b border-line">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2.5"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white shadow-glow">
            <Icon name="Dumbbell" className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-extrabold text-ink-900">{t.brand}</span>
        </button>

        <nav className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors sm:text-sm',
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

        <button
          type="button"
          onClick={() => onChangeLang(lang === 'ar' ? 'en' : 'ar')}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-xs font-bold text-ink-700 transition-colors hover:bg-beige"
          aria-label={t.lang.label}
        >
          {lang === 'ar' ? 'EN' : 'ع'}
        </button>
      </div>
    </header>
  )
}
