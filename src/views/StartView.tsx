import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { LanguageToggle } from '@/i18n'
import { AscentMark } from '@/components/AscentMark'
import { designV2Copy } from '@/config/designV2'

interface StartViewProps {
  lang: Lang
  designV2?: boolean
  hasStartedSetup: boolean
  onBuildPlan: () => void
  onLogin: () => void
  onContinueGuest: () => void
  onSeeDemo: () => void
}

/** شاشة البداية — مدخل فاخر بمظهر رياضي داكن. */
export function StartView({
  lang,
  designV2 = false,
  hasStartedSetup,
  onBuildPlan,
  onLogin,
  onContinueGuest,
  onSeeDemo,
}: StartViewProps) {
  const t = getStrings(lang)

  if (designV2) {
    return (
      <main className="v2-welcome" dir="rtl">
        <div className="v2-welcome__ascent" aria-hidden="true">
          <AscentMark className="h-full w-full" decorative />
        </div>
        <div className="v2-welcome__content">
          <p className="v2-welcome__latin" lang="en">{designV2Copy.brandLatin}</p>
          <div className="v2-welcome__identity">
            <span className="v2-welcome__icon"><AscentMark className="h-8 w-8" decorative /></span>
            <p className="v2-welcome__brand">{designV2Copy.brandArabic}</p>
          </div>
          <h1 className="v2-welcome__headline">{designV2Copy.welcome.headline}</h1>
          <p className="v2-welcome__subline">{designV2Copy.welcome.subline}</p>
        </div>
        <div className="v2-welcome__actions">
          <button type="button" onClick={onBuildPlan} className="v2-btn-primary w-full">
            {designV2Copy.welcome.primaryCta}
          </button>
          <p className="v2-welcome__login">
            {designV2Copy.welcome.secondaryPrefix}{' '}
            <button type="button" onClick={onLogin}>{designV2Copy.welcome.secondaryCta}</button>
          </p>
        </div>
      </main>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-page px-5 py-10">
      {/* معالجة بصرية داكنة (تدرّجات مجرّدة، بلا أصول خارجية) */}
      <div className="pointer-events-none absolute inset-0 bg-app-hero" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:40px_40px] opacity-40" />
      <div className="pointer-events-none absolute -top-24 start-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary-soft blur-3xl" />

      <div className="app-container relative flex flex-1 flex-col">
        {/* مبدّل اللغة — أعلى الشاشة */}
        <div className="flex justify-end">
          <LanguageToggle variant="compact" />
        </div>

        {/* الهوية — أعلى */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="grid h-20 w-20 place-items-center rounded-3xl bg-primary text-white shadow-glow">
            <Icon name="Dumbbell" className="h-10 w-10" strokeWidth={2.5} />
          </span>
          <h1 className="mt-6 text-5xl font-black tracking-tight text-ink-900">{t.brand}</h1>
          <p className="mt-3 text-lg font-bold text-primary-c">{t.start.headline}</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-500">{t.start.positioning}</p>
        </div>

        {/* الأزرار — أسفل */}
        <div className="space-y-3 pb-2">
          <button type="button" onClick={onBuildPlan} className="btn-primary w-full py-4 text-base">
            <Icon name="Sparkles" className="h-5 w-5" />
            {hasStartedSetup ? t.start.continueSetup : t.start.buildPlan}
          </button>
          <button type="button" onClick={onLogin} className="btn-ghost w-full py-4 text-base">
            <Icon name="LogIn" className="h-5 w-5" />
            {t.start.login}
          </button>
          <div className="flex items-center justify-center gap-5 pt-1">
            <button
              type="button"
              onClick={onContinueGuest}
              className="text-sm font-bold text-ink-500 transition-colors hover:text-ink-900"
            >
              {t.start.continueGuest}
            </button>
            <span className="h-3 w-px bg-line" />
            <button
              type="button"
              onClick={onSeeDemo}
              className="text-sm font-bold text-ink-500 transition-colors hover:text-ink-900"
            >
              {t.start.seeDemo}
            </button>
          </div>
          <p className="flex items-center justify-center gap-1.5 pt-2 text-center text-xs text-ink-400">
            <Icon name="ShieldCheck" className="h-3.5 w-3.5" />
            {t.start.guestNote}
          </p>
        </div>
      </div>
    </div>
  )
}
