import type { Lang } from '@/lib/appPreferences'
import { LanguageToggle } from '@/i18n'
import { V2_WELCOME } from '@/design-system/v2/labels'

interface StartViewV2Props {
  lang: Lang
  onLogin: () => void
  onSignup: () => void
}

/**
 * Welcome / Start — Qimmah Design v2.1 (Founder Refinement Pass), polish pass.
 *
 * Preview-gated: rendered only under the dev-only v2 flag (see StartView).
 * Composition follows the approved mark-first phone mock: quiet wordmark,
 * large Ascent, compact brand/copy block, and the action group in the thumb
 * zone. Copy is the approved warm-
 * MSA set (V2_WELCOME). Functional routes are unchanged — `onSignup` is the
 * primary path, `onLogin` the secondary, exactly as the v1 screen wired them.
 */
export function StartViewV2({ lang, onLogin, onSignup }: StartViewV2Props) {
  const c = V2_WELCOME[lang] ?? V2_WELCOME.ar

  return (
    <div className="v2-surface-dark relative min-h-screen overflow-hidden bg-page">
      {/* Warm graphite depth. Decorative only. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="v2-glow-ember absolute start-1/2 top-[18%] h-[34%] w-[68%] -translate-x-1/2 rounded-full opacity-40 blur-[12px]" />
        <div className="absolute inset-0 bg-grid-faint [background-size:52px_52px] opacity-[0.05]" />
      </div>

      <div
        className="app-container v2-screen-enter relative z-10 flex min-h-screen flex-col px-6"
        style={{ paddingTop: 'max(1rem, var(--safe-top))', paddingBottom: 'max(1.75rem, var(--safe-bottom))' }}
      >
        <div className="flex items-center justify-between pt-1">
          <span dir="ltr" className="text-[0.62rem] font-semibold tracking-[0.42em] text-ink-400">{c.wordmark}</span>
          <LanguageToggle variant="compact" />
        </div>

        <div className="mt-8 flex flex-col items-center text-center">
          <AscentMotif className="h-40 w-52" />
          <div className="mt-3 grid h-11 w-11 place-items-center rounded-xl bg-primary shadow-glow">
            <AscentMark className="h-7 w-7 text-white" monochrome />
          </div>
          <span className="mt-4 font-display text-[2.35rem] font-black tracking-tight text-ink-900">{c.brand}</span>
          <h1 className="mt-4 font-display text-[1.55rem] font-black leading-[1.3] tracking-tight text-ink-900">
            <span className="block">{c.headline[0]}</span>
            <span className="block text-primary">{c.headline[1]}</span>
          </h1>
          <p className="mt-4 max-w-[17rem] text-[0.82rem] leading-relaxed text-ink-500">{c.support}</p>
        </div>

        {/* Flexible middle — the Ascent motif fills it (no empty void). */}
        <div className="flex-1" />

        <div className="space-y-3">
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
 * Ascent mark — the Qimmah brand glyph (owner-approved v2.1 "noded Ascent"): a
 * chevron rising to an apex with two base nodes. Canonical geometry on a 1024
 * grid — apex (512,340), nodes (302,640)/(722,640), stroke 96, node radius 96
 * (see docs/brand/MARK-SPEC.md). Rendered in ember on the dark hero.
 */
function AscentMark({ className, monochrome = false }: { className?: string; monochrome?: boolean }) {
  const color = monochrome ? 'currentColor' : 'var(--c-primary)'
  return (
    <svg className={className} viewBox="0 0 1024 1024" fill="none" role="img" aria-label="Qimmah">
      <path d="M302 640 L512 340 L722 640" fill="none" stroke={color} strokeWidth={96} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="302" cy="640" r="96" fill={color} />
      <circle cx="722" cy="640" r="96" fill={color} />
    </svg>
  )
}

/**
 * Large Ascent motif — the canonical mark as the first visual in the mock.
 */
function AscentMotif({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1024 1024" fill="none" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      <g opacity="0.32">
        <path d="M302 640 L512 340 L722 640" fill="none" stroke="var(--v2-ember)" strokeWidth={96} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="302" cy="640" r="96" fill="var(--v2-ember)" />
        <circle cx="722" cy="640" r="96" fill="var(--v2-ember)" />
      </g>
    </svg>
  )
}
