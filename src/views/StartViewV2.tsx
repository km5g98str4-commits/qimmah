import type { Lang } from '@/lib/appPreferences'
import { LanguageToggle } from '@/i18n'
import { V2_WELCOME } from '@/design-system/v2/labels'

interface StartViewV2Props {
  lang: Lang
  onLogin: () => void
  onSignup: () => void
}

/**
 * Welcome / Start — Qimmah Design v2.1 (Founder Refinement Pass).
 *
 * Preview-gated: rendered only when the v2 design flag is active (see
 * StartView). Momentum direction — graphite canvas, an ember hero glow, the
 * Ascent Bar mark, and a confident start-aligned (RTL) hero. Copy is the
 * approved warm-MSA set from V2_WELCOME. Functional routes are unchanged:
 * `onSignup` is the primary path, `onLogin` the secondary — same actions the
 * v1 screen wired.
 */
export function StartViewV2({ lang, onLogin, onSignup }: StartViewV2Props) {
  const c = V2_WELCOME[lang] ?? V2_WELCOME.ar

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden bg-page px-6 pb-8"
      style={{ paddingTop: 'max(1.25rem, var(--safe-top))', paddingBottom: 'max(2rem, var(--safe-bottom))' }}
    >
      {/* Ember hero glow over the graphite canvas (Momentum). */}
      <div className="pointer-events-none absolute inset-0 bg-app-hero" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:44px_44px] opacity-[0.18]" aria-hidden="true" />

      <div className="app-container relative z-10 flex flex-1 flex-col">
        {/* Top: language toggle only — no dead-centered logo. */}
        <div className="flex justify-end pt-1">
          <LanguageToggle variant="compact" />
        </div>

        {/* Hero — start-aligned (RTL), athletic, headline-led. */}
        <div className="flex flex-1 flex-col items-start justify-center text-start">
          <div className="flex items-center gap-3">
            <AscentBar className="h-11 w-11" />
            <span className="text-4xl font-black tracking-tight text-ink-900">{c.brand}</span>
          </div>

          {/* Ember kicker bar — a small Momentum accent under the wordmark. */}
          <span className="mt-6 block h-1 w-12 rounded-full bg-primary" aria-hidden="true" />

          <h1 className="mt-4 text-4xl font-black leading-[1.15] tracking-tight text-ink-900 sm:text-5xl">
            <span className="block">{c.headline[0]}</span>
            <span className="block text-primary">{c.headline[1]}</span>
          </h1>

          <p className="mt-5 max-w-sm text-base leading-relaxed text-ink-500">{c.support}</p>
        </div>

        {/* Actions — one primary (ember), one calm secondary. */}
        <div className="space-y-3">
          <button type="button" onClick={onSignup} className="btn-primary w-full py-4 text-base">
            {c.primary}
          </button>
          <button
            type="button"
            onClick={onLogin}
            className="w-full py-3 text-center text-sm font-semibold text-ink-700 transition-colors hover:text-ink-900"
          >
            {c.secondary}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Ascent Bar — the Qimmah brand mark: ascending bars rising toward a summit,
 * the tallest in ember (Momentum). Abstract, geometric, no photographic or
 * Kufi decoration. Uses theme tokens (no invented hex).
 */
function AscentBar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" role="img" aria-label="Qimmah">
      <g strokeLinecap="round">
        <line x1="7" y1="33" x2="7" y2="26" stroke="rgb(var(--c-ink-500))" strokeWidth="4" />
        <line x1="17" y1="33" x2="17" y2="20" stroke="rgb(var(--c-ink-700))" strokeWidth="4" />
        <line x1="27" y1="33" x2="27" y2="13" stroke="var(--c-primary)" strokeWidth="4" />
      </g>
      {/* Summit spark on the tallest bar. */}
      <path d="M27 13 L33 6" stroke="var(--c-primary)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}
