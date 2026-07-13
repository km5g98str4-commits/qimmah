// Dev-only preview toggle for the Qimmah v2.1 design seam (Slice 1A).
//
// Activates the already-prepared `[data-design="v2"]` token seam (tokens.css)
// so the founder can preview v2.1 live in the existing app — WITHOUT any screen
// redesign. Strictly development-only: in production this is a no-op and the
// document never gets a `data-design` attribute, so the default UI is unchanged.
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
 * No-op in production. Never throws, never touches user data or analytics.
 */
export function initDesignPreview(): void {
  if (typeof document === 'undefined') return

  // Production opt-in (Slice: promotion switch). A build made with
  // `VITE_DESIGN_V2=true npm run build` ships v2.1 turned on everywhere — this is
  // how the owner runs v2 on his physical iPhone. The flag is a build-time
  // constant Vite inlines: when it is NOT set, `import.meta.env.VITE_DESIGN_V2`
  // is `undefined`, this whole block is dead-code-eliminated, and behaviour is
  // byte-identical to today (the DEV-only preview below). Provably inert unless
  // explicitly set at build time.
  if (import.meta.env.VITE_DESIGN_V2 === 'true') {
    document.documentElement.dataset.design = 'v2'
    return
  }

  // Hard gate: normal production builds ignore every preview flag.
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
 * initDesignPreview(). Safe in production — the attribute is never set there,
 * so this returns false and views render their v1 layout. Read once at render
 * (the flag only changes on a full reload via `?design=`), so no reactivity
 * is needed.
 */
export function isDesignV2(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.design === 'v2'
}
