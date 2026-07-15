import type { Lang } from '@/lib/appPreferences'
import { LanguageToggle } from '@/i18n'
import { V2_WELCOME } from '@/design-system/v2/labels'
import { CanonicalMark } from '@/components/CanonicalMark'

interface StartViewV2Props {
  lang: Lang
  onLogin: () => void
  onSignup: () => void
}

/**
 * Welcome / Start — Qimmah Design v2.1 (Founder Refinement Pass), polish pass.
 *
 * Preview-gated: rendered only under the dev-only v2 flag (see StartView).
 * Composition is deliberately top→bottom (not centered-in-void): brand + a
 * headline-led hero anchored to the top, an ember glow sitting *behind* the
 * headline, a large faint Ascent motif giving the lower area athletic depth,
 * and the action group anchored in the thumb zone. Copy is the approved warm-
 * MSA set (V2_WELCOME). Functional routes are unchanged — `onSignup` is the
 * primary path, `onLogin` the secondary, exactly as the v1 screen wired them.
 */
export function StartViewV2({ lang, onLogin, onSignup }: StartViewV2Props) {
  const c = V2_WELCOME[lang] ?? V2_WELCOME.ar

  return (
    <div className="v2-surface-dark relative min-h-screen overflow-hidden bg-page">
      {/* Background depth — ember glow behind the headline + faint grid + large
          Ascent motif anchored low. Purely decorative, non-interactive. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="v2-glow-ember absolute start-[-25%] top-[9%] h-[46%] w-[85%] rounded-full blur-[2px]" />
        <div className="absolute inset-0 bg-grid-faint [background-size:46px_46px] opacity-[0.10]" />
        <AscentMotif className="absolute bottom-[16%] end-0 h-[42%] w-[72%]" />
        {/* Ground the bottom so the CTA sits on solid graphite, not the motif. */}
        <div className="v2-bottom-fade absolute inset-x-0 bottom-0 h-40" />
      </div>

      <div
        className="app-container v2-screen-enter relative z-10 flex min-h-screen flex-col px-6"
        style={{ paddingTop: 'max(1rem, var(--safe-top))', paddingBottom: 'max(1.75rem, var(--safe-bottom))' }}
      >
        {/* Top row — language toggle only. */}
        <div className="flex justify-end pt-1">
          <LanguageToggle variant="compact" />
        </div>

        {/* Brand + hero — top-anchored, start-aligned (RTL), headline-led. */}
        <div className="mt-9 flex flex-col items-start text-start">
          <div className="flex items-center gap-2.5">
            <CanonicalMark className="h-9 w-9" />
            <span className="text-3xl font-black tracking-tight text-ink-900">{c.brand}</span>
          </div>

          <span className="mt-8 block h-1 w-10 rounded-full bg-primary" />

          <h1 className="mt-5 font-display text-[2.35rem] font-black leading-[1.14] tracking-tight text-ink-900 sm:text-5xl">
            <span className="block">{c.headline[0]}</span>
            <span className="block text-primary">{c.headline[1]}</span>
          </h1>

          <p className="mt-5 max-w-[19rem] text-[0.95rem] leading-relaxed text-ink-500">{c.support}</p>
        </div>

        {/* Flexible middle — the Ascent motif fills it (no empty void). */}
        <div className="flex-1" />

        {/* Bottom — calm trust line, then one ember primary + calm secondary. */}
        <div className="space-y-3">
          <p className="text-center text-xs font-medium text-ink-500">{c.trust}</p>
          <button type="button" onClick={onSignup} className="btn-primary w-full py-4 text-[1.1875rem] shadow-glow">
            {c.primary}
          </button>
          <button
            type="button"
            onClick={onLogin}
            className="w-full py-2.5 text-center text-sm font-semibold text-ink-700 transition-colors hover:text-ink-900"
          >
            {c.secondary}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Canonical Qimmah mark. Geometry is a 1024-grid projection of the brand spec.
 */
/**
 * Large faint canonical motif — the mark scaled up as a background texture to give
 * the lower half athletic depth and fill the composition (vs. an empty void).
 * Very low opacity, bottom-anchored, ember tail on the peak. Decorative only.
 */
function AscentMotif({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1024 1024" fill="none" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      <path d="M302 640 L512 340 L722 640" stroke="currentColor" strokeWidth="96" strokeLinecap="round" strokeLinejoin="round" opacity="0.16" />
      <circle cx="302" cy="640" r="96" fill="currentColor" opacity="0.2" />
      <circle cx="722" cy="640" r="96" fill="currentColor" opacity="0.2" />
    </svg>
  )
}
