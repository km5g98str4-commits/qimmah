import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { LanguageToggle } from '@/i18n'

interface StartViewProps {
  lang: Lang
  onLogin: () => void
  onSignup: () => void
}

/**
 * شاشة البداية (Sprint UI 1) — عالم «ليل عميق + حجر دافئ».
 * أجواء مجرّدة فقط: تدرّج فجر معدني + خطوط كنتور قمّة هندسية (بلا أي صورة فوتوغرافية).
 * تجيب: أين أنا؟ (العلامة + الشعار) · ماذا أفعل؟ (إنشاء حساب/دخول) · لماذا أثق؟ (سطر صدق).
 * إجراء أساسي واحد فقط بلون العلامة (إنشاء حساب)؛ الباقي ثانوي.
 */
export function StartView({ lang, onLogin, onSignup }: StartViewProps) {
  const t = getStrings(lang)

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-page px-5 pb-8 pt-6" style={{ paddingTop: 'max(1.5rem, var(--safe-top))' }}>
      {/* أجواء مجرّدة: فجر معدني دافئ + شبكة خافتة + كنتور قمّة هندسي (لا صور) */}
      <div className="pointer-events-none absolute inset-0 bg-app-hero" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:44px_44px] opacity-25" />
      <SummitContours />

      <div className="app-container relative z-10 flex flex-1 flex-col">
        {/* مبدّل اللغة — أعلى */}
        <div className="flex justify-end">
          <LanguageToggle variant="compact" />
        </div>

        {/* الهوية — أين أنا؟ */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="grid h-20 w-20 place-items-center rounded-3xl bg-primary text-white shadow-glow">
            <Icon name="Mountain" className="h-10 w-10" strokeWidth={2.25} />
          </span>
          <h1 className="mt-6 text-5xl font-black tracking-tight text-ink-900">{t.brand}</h1>
          <p className="mt-4 text-lg font-bold text-ink-900">{t.start.headline}</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-500">{t.start.positioning}</p>
        </div>

        {/* ماذا أفعل؟ — إجراء أساسي واحد (بلون العلامة) + ثانوي */}
        <div className="space-y-3">
          <button type="button" onClick={onSignup} className="btn-primary w-full py-4 text-base">
            <Icon name="UserPlus" className="h-5 w-5" />
            {t.auth.createAccount}
          </button>
          <button type="button" onClick={onLogin} className="btn-ghost w-full py-4 text-base">
            <Icon name="LogIn" className="h-5 w-5" />
            {t.start.login}
          </button>

          {/* لماذا أثق؟ — سطر صدق هادئ (بلا دليل اجتماعي، بلا مبالغة) */}
          <p className="pt-1 text-center text-xs font-medium text-ink-400">{t.start.trust}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * خطوط كنتور القمّة — هندسة مجرّدة توحي بقمّة/تضاريس (لا صورة فوتوغرافية).
 * ثابتة تمامًا (بلا حركة) وخافتة كي لا تنافس المحتوى. مزخرفة لكنها تُعرّف عالم العلامة.
 */
function SummitContours() {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 top-0 h-[52%] w-full opacity-[0.14]"
      viewBox="0 0 400 300"
      fill="none"
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
    >
      {/* قمّة متداخلة كخطوط ارتفاع طوبوغرافية، تتلاشى للأعلى */}
      <g stroke="var(--c-primary)" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round">
        <polyline points="20,300 150,120 200,175 250,90 380,300" opacity="0.9" />
        <polyline points="0,300 150,160 205,210 255,135 400,300" opacity="0.6" />
        <polyline points="-10,300 150,205 210,248 260,185 410,300" opacity="0.4" />
        <polyline points="60,60 150,120 205,80" opacity="0.5" />
      </g>
    </svg>
  )
}
