// Qimmah — semantic design tokens: typed contract for TS/JS access.
//
// Values live ONLY in `tokens.css` (single source of truth). This module
// exposes the semantic token *names* and a helper to read them, so components
// that need a token in JS (e.g. a canvas chart color, an inline style) stay
// decoupled from raw values and follow the approved-token drop-in seam.
//
// ⚠️ The current resolved values are TEMPORARY (inherited from the existing dark
// build) and are NOT an approved visual direction — see
// docs/design/DESIGN-SOURCE-OF-TRUTH.md.

/** Semantic token names available as CSS custom properties (`var(--…)`). */
export const tokens = {
  color: {
    bgPage: '--color-bg-page',
    surface: '--color-surface',
    surfaceRaised: '--color-surface-raised',
    border: '--color-border',
    textPrimary: '--color-text-primary',
    textSecondary: '--color-text-secondary',
    textMuted: '--color-text-muted',
    textDisabled: '--color-text-disabled',
    actionPrimary: '--color-action-primary',
    actionAccent: '--color-action-accent',
    focusRing: '--color-focus-ring',
    success: '--color-success',
    info: '--color-info',
    warning: '--color-warning',
    danger: '--color-danger',
    destructive: '--color-destructive',
    stateWorkout: '--color-state-workout',
    stateNutrition: '--color-state-nutrition',
    stateProgress: '--color-state-progress',
    stateReminder: '--color-state-reminder',
    skeleton: '--color-skeleton',
  },
  motion: {
    durationInstant: '--motion-duration-instant',
    durationFast: '--motion-duration-fast',
    durationBase: '--motion-duration-base',
    durationSlow: '--motion-duration-slow',
    easeStandard: '--motion-ease-standard',
    easeDecelerate: '--motion-ease-decelerate',
    easeAccelerate: '--motion-ease-accelerate',
  },
  layout: {
    maxWidth: '--layout-max-width',
    tabbarHeight: '--layout-tabbar-height',
    touchMin: '--layout-touch-min',
    safeTop: '--safe-area-top',
    safeBottom: '--safe-area-bottom',
  },
  /* Qimmah Design v2.1 (SEAM ONLY) — names for the approved-direction aliases
     defined in tokens.css. Active only under `[data-design="v2"]`; values are
     PENDING the Momentum hex drop (currently alias the v1 source). Present so
     future slices (e.g. charts reading data colors) reference one contract. */
  v2: {
    brandPrimary: '--v2-brand-primary',
    actionPrimary: '--v2-action-primary',
    surfaceCanvas: '--v2-surface-canvas',
    surfaceNextStep: '--v2-surface-next-step',
    feedbackError: '--v2-feedback-error',
    data1: '--v2-data-1',
    data2: '--v2-data-2',
    data3: '--v2-data-3',
    data4: '--v2-data-4',
  },
} as const

/** `var(--token)` reference for inline styles: `style={{ color: cssVar(tokens.color.textPrimary) }}`. */
export function cssVar(name: string): string {
  return `var(${name})`
}

/** Resolve a token's computed value at runtime (e.g. for canvas charts). */
export function readToken(name: string, el: Element | null = null): string {
  if (typeof window === 'undefined') return ''
  const target = el ?? document.documentElement
  return getComputedStyle(target).getPropertyValue(name).trim()
}
