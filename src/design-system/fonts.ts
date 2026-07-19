// Self-hosted fonts — bundled via @fontsource so the app has NO runtime
// dependency on Google Fonts / external CDN. This matters for the native iPhone
// build (local WebView origin, offline first launch) — a CDN <link> would
// silently fall back to system-ui.
//
// ── v1 (current default) ──────────────────────────────────────────────────
// Tajawal is the font the app renders today. Same family, same weights the app
// already used (400/500/700/800/900), Arabic + Latin subsets.
import '@fontsource/tajawal/400.css'
import '@fontsource/tajawal/500.css'
import '@fontsource/tajawal/700.css'
import '@fontsource/tajawal/800.css'
import '@fontsource/tajawal/900.css'

// ── v2.1 (prepared, not yet default) ──────────────────────────────────────
// Qimmah Design v2.1 (Founder Refinement Pass) approves IBM Plex Sans Arabic as
// the UI typeface and Readex Pro for brand/display only. We SELF-HOST them now
// so the migration is a token flip, not a new dependency — but the default
// build still renders Tajawal (v1). These faces are declared (@font-face) but
// the browser fetches a weight ONLY when a `font-family` actually references it,
// which happens exclusively under the `[data-design="v2"]` seam in tokens.css.
// So in the default build nothing extra is downloaded at runtime.
//
// Lean by design: only the Arabic + Latin subsets of the weights the v2.1 UI
// needs (400/500/600/700 for UI; 600/700 for display). No Cyrillic/Greek/etc.

// UI typeface — IBM Plex Sans Arabic (Arabic + Latin, functional weights).
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-500.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-700.css'
import '@fontsource/ibm-plex-sans-arabic/latin-400.css'
import '@fontsource/ibm-plex-sans-arabic/latin-500.css'
import '@fontsource/ibm-plex-sans-arabic/latin-600.css'
import '@fontsource/ibm-plex-sans-arabic/latin-700.css'

// Display / brand typeface — Readex Pro (Arabic + Latin, display weights only).
// Reserved for brand/display moments, never functional UI copy.
import '@fontsource/readex-pro/arabic-600.css'
import '@fontsource/readex-pro/arabic-700.css'
import '@fontsource/readex-pro/latin-600.css'
import '@fontsource/readex-pro/latin-700.css'

// Numeral / data face — JetBrains Mono (v3.0 §E2: numbers · labels · data).
// Self-hosted Latin subset only (digits are Latin); referenced by --font-numeric
// under the v2 seam. Theme-independent — loaded once, renders in light and dark.
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import '@fontsource/jetbrains-mono/latin-600.css'
