import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'

interface StartViewProps {
  lang: Lang
  hasStartedSetup: boolean
  onLogin: () => void
  onContinueGuest: () => void
  onSeeDemo: () => void
  onContinueSetup: () => void
}

/** شاشة البداية — المدخل العام: تسجيل دخول أو متابعة كضيف أو مشاهدة نموذج. */
export function StartView({
  lang,
  hasStartedSetup,
  onLogin,
  onContinueGuest,
  onSeeDemo,
  onContinueSetup,
}: StartViewProps) {
  const t = getStrings(lang)

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-page px-5 py-12">
      <div className="pointer-events-none absolute inset-0 bg-radial-brand" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:44px_44px] opacity-60" />

      <div className="relative w-full max-w-md">
        {/* الهوية */}
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary text-white shadow-glow">
            <Icon name="Dumbbell" className="h-8 w-8" strokeWidth={2.5} />
          </span>
          <h1 className="mt-5 text-3xl font-black text-ink-900">{t.brand}</h1>
          <p className="mt-1 text-sm font-bold text-primary-c">{t.tagline}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">{t.start.positioning}</p>
        </div>

        {/* الأزرار */}
        <div className="mt-9 space-y-3">
          <button type="button" onClick={onLogin} className="btn-primary w-full py-4 text-base">
            <Icon name="LogIn" className="h-5 w-5" />
            {t.start.login}
          </button>

          {hasStartedSetup ? (
            <button type="button" onClick={onContinueSetup} className="btn-ghost w-full py-4 text-base">
              <Icon name="Sparkles" className="h-5 w-5" />
              {t.start.continueSetup}
            </button>
          ) : (
            <button type="button" onClick={onContinueGuest} className="btn-ghost w-full py-4 text-base">
              <Icon name="User" className="h-5 w-5" />
              {t.start.continueGuest}
            </button>
          )}

          <button
            type="button"
            onClick={onSeeDemo}
            className="block w-full py-2 text-center text-sm font-bold text-ink-500 transition-colors hover:text-ink-900"
          >
            {t.start.seeDemo}
          </button>
        </div>

        <p className="mt-7 flex items-center justify-center gap-1.5 text-center text-xs text-ink-400">
          <Icon name="ShieldCheck" className="h-3.5 w-3.5" />
          {t.start.guestNote}
        </p>
      </div>
    </div>
  )
}
