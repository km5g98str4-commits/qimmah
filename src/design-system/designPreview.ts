// Preview/promotion toggle for the approved Qimmah v2.1 design seam.
//
// Activates the already-prepared `[data-design="v2"]` token seam (tokens.css)
// so the founder can preview v2.1 live in the existing app — WITHOUT any screen
// redesign. Production HTML is stamped by vite.config because v2.1 is now the
// approved default; this module preserves the reversible development `?design=` seam.
//
// Reversible: delete this file + its single call in main.tsx to remove it.

const STORAGE_KEY = 'qimmah:design-preview'

/** Read `?design=` from the current URL (v1 | v2 | null). */
function urlDesignParam(): 'v1' | 'v2' | null {
  try {
    const v = new URLSearchParams(window.location.search).get('design')
    return v === 'v1' || v === 'v2' ? v : null
  } catch {
    return null
  }
}

/**
 * DEV only: resolve whether the v2 preview should be on, and set/clear the
 * `data-design` attribute accordingly. Precedence:
 *   • `?design=v2` → enable + persist   • `?design=v1` → disable + clear
 *   • otherwise → follow persisted localStorage flag
 * Production keeps the build-stamped attribute. Never touches user data/analytics.
 */
export function initDesignPreview(): void {
  if (typeof document === 'undefined') return

  // Explicit build-time promotion remains supported for nonstandard modes.
  if (import.meta.env.VITE_DESIGN_V2 === 'true') {
    document.documentElement.dataset.design = 'v2'
    return
  }

  // Production trusts the attribute stamped into index.html; URL/storage preview
  // flags remain hard-gated to development.
  if (!import.meta.env.DEV) return

  let enabled = false
  try {
    const param = urlDesignParam()
    if (param === 'v2') {
      localStorage.setItem(STORAGE_KEY, 'v2')
      enabled = true
    } else if (param === 'v1') {
      localStorage.removeItem(STORAGE_KEY)
      enabled = false
    } else {
      enabled = localStorage.getItem(STORAGE_KEY) === 'v2'
    }
  } catch {
    // localStorage unavailable (private mode) → fall back to URL only.
    enabled = urlDesignParam() === 'v2'
  }

  if (enabled) {
    document.documentElement.dataset.design = 'v2'
  } else {
    delete document.documentElement.dataset.design
  }
}

/**
 * Is the v2.1 preview currently active? Reads the attribute set by
 * initDesignPreview()/the production HTML stamp. Read once at render
 * (the flag only changes on a full reload via `?design=`), so no reactivity
 * is needed.
 */
export function isDesignV2(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.design === 'v2'
}
