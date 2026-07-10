// Self-hosted fonts — Tajawal (the current, unchanged font family).
//
// Bundled via @fontsource so the app has NO runtime dependency on Google Fonts /
// external CDN. This matters for the native iPhone build (local WebView origin,
// offline first launch) — the CDN <link> would silently fall back to system-ui.
//
// Same family, same weights the app already used (400/500/700/800/900). Each
// weight file includes the Arabic + Latin subsets, so Arabic-first and English
// rendering are both preserved. This is NOT a typography change — only where the
// bytes come from. The final font family remains a Cloud Design decision.

import '@fontsource/tajawal/400.css'
import '@fontsource/tajawal/500.css'
import '@fontsource/tajawal/700.css'
import '@fontsource/tajawal/800.css'
import '@fontsource/tajawal/900.css'
