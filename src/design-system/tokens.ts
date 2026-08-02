// Qimmah — semantic design tokens: typed contract for TS/JS access.
//
// Values live ONLY in `tokens.css` (single source of truth). This module
// exposes the semantic token *names* and a helper to read them, so components
// that need a token in JS (e.g. a canvas chart color, an inline style) stay
// decoupled from raw values and follow the approved-token drop-in seam.
//
// v2 values are the approved Momentum roles sampled from the v2.1 PDF. v1
// continues to resolve through its legacy aliases unless the v2 seam is active.

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
  /* Qimmah Design v2.1 — approved Momentum semantic roles. */
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
    ember: '--v2-ember',
    emberText: '--v2-ember-text',
    blue: '--v2-blue',
    blueText: '--v2-blue-text',
    green: '--v2-green',
    greenText: '--v2-green-text',
    teal: '--v2-teal',
    tealText: '--v2-teal-text',
    error: '--v2-error',
    cream: '--v2-cream',
    paper: '--v2-paper',
    paperMuted: '--v2-paper-muted',
    border: '--v2-border',
    inkStrong: '--v2-ink-strong',
    ink: '--v2-ink',
    inkMuted: '--v2-ink-muted',
    inkFaint: '--v2-ink-faint',
    darkCanvas: '--v2-dark-canvas',
    darkPaper: '--v2-dark-paper',
    darkPaperActive: '--v2-dark-paper-active',
    darkBorder: '--v2-dark-border',
    darkInkStrong: '--v2-dark-ink-strong',
    darkInkMuted: '--v2-dark-ink-muted',
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
