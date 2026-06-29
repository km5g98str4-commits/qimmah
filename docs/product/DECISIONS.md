# Qimmah Decisions Log

## Splash / 404 / Contact — 2026-06-29

Agent: Splash + 404 + Contact pages (isolated). Branch: `claude/splash-404-contact-c5gch2`
(designated by harness; based on `origin/integration/phase1-smart-foundation`).

### Feature 1 — Splash screen
- New `src/components/SplashScreen.tsx`, mounted as a sibling overlay to `<App />`
  in `src/main.tsx` (root mount only). It is a pure visual layer: App renders
  underneath immediately, so onboarding/auth logic is never blocked or delayed.
- Reuses existing brand identity (Dumbbell icon in `bg-primary` rounded square +
  wordmark `product.name` + `product.tagline`) on the dark brand page background —
  no new logo invented.
- Shows ~1.7s then fades out (450ms) and unmounts. Respects
  `prefers-reduced-motion`: skips the entrance animation and the fade (shows then
  removes instantly).

### Feature 2 — 404 / Not Found
- New `src/views/NotFoundView.tsx` (Arabic, RTL, dark, mirrors Privacy/Terms style).
- Integrated into the EXISTING hash router fallback in `src/App.tsx`: an unknown
  hash (e.g. `#/asdf`) now resolves to an internal `notfound` view instead of the
  previous silent redirect to dashboard/start. The bad hash is kept in the URL
  (view→hash sync skips `notfound`) so it behaves like a real 404.
- `notfound` is added to the `AppRoute` type but intentionally NOT to `ROUTES`, so
  it is fallback-only and never directly navigable / never matched by `routeFromHash`.
- Primary button «ارجع للرئيسية» routes to dashboard or start (guarded by onboarding
  state); secondary «الشاشة السابقة» uses `history.back()`.

### Feature 3 — Contact / Support
- New `src/views/ContactView.tsx` at `#/contact`, registered like `#/privacy` /
  `#/terms`: one route entry (`appRoutes.ts`) + one render branch (`App.tsx`) +
  one menu link in `Footer.tsx` next to الخصوصية/الشروط.
- Contact method: email with a `mailto:` CTA and a separate "report a problem"
  `mailto:` (pre-filled subject). No fake socials/phones/stats.
- **PLACEHOLDER to confirm:** support email `support@qimmah.app` — no real contact
  existed in the repo (`product.contactUrl` was `#goal`). Replace with the real
  support address before release.

### Strings
- All new copy is data-driven in `src/config/strings.ts` (`notFound`, `contact`
  blocks, both `ar` + `en`) per project rules — no hardcoded text in components.

### Shared files touched (router/entry/menu only, per isolation rule)
- `src/main.tsx` (root mount of splash), `src/App.tsx` (route branches + fallback),
  `src/lib/appRoutes.ts` (route entries), `src/components/Footer.tsx` (one menu link),
  `src/config/strings.ts` (copy). No onboarding/dashboard/workout/nutrition/training/
  engine/store/schema files touched.

### QA
- build / lint / typecheck all pass on a clean base and after changes.
