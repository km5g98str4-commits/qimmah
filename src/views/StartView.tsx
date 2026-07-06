import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { LanguageToggle } from '@/i18n'

interface StartViewProps {
  lang: Lang
  onLogin: () => void
  onSignup: () => void
}

/** شاشة البداية — مدخل فاخر بمظهر رياضي داكن. خياران فقط: إنشاء حساب أو تسجيل دخول. */
export function StartView({ lang, onLogin, onSignup }: StartViewProps) {
  const t = getStrings(lang)

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

        {/* الأزرار — أسفل: خياران فقط (إنشاء حساب / تسجيل دخول) */}
        <div className="space-y-3 pb-2">
          <button type="button" onClick={onSignup} className="btn-primary w-full py-4 text-base">
            <Icon name="UserPlus" className="h-5 w-5" />
            {t.auth.createAccount}
          </button>
          <button type="button" onClick={onLogin} className="btn-ghost w-full py-4 text-base">
            <Icon name="LogIn" className="h-5 w-5" />
            {t.start.login}
          </button>
        </div>
      </div>
    </div>
  )
}
