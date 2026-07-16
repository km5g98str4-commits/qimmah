# Release-Candidate Checklist — Qimmah / قِمّة

Generated 2026-07-16. Two canonical branches, both **UNMERGED** pending the owner's
on-device verification:

- `integration/wave5` — the integrated commissioned trunk (v2 behind `VITE_DESIGN_V2=true`).
- `design/v21-promotion` — the promotion build (**v2 is the flagless default; v1 retired**).

## 1. Automated gate — `integration/wave5`

Fresh `npm ci` → `typecheck` (0) → `lint --max-warnings 0` (0) → `build` → `test:gate` → three-profile smoke.

| Suite | Checks | Status |
|---|---:|---|
| `active-session` | 31 | ✅ |
| `today-v2` | 32 | ✅ |
| `progress-v2` | 11 | ✅ |
| `data-portability` | 12 | ✅ |
| `portability` | 44 | ✅ |
| `notifications` | 30 | ✅ |
| `insights` | 28 | ✅ |
| `strength` | 33 | ✅ |
| `sync` | 35 | ✅ |
| `onboarding-async` | 29 | ✅ |
| `fixforward` | 17 | ✅ |
| `isolation` | 39 | ✅ |
| `reset-recovery` | 33 | ✅ |
| `seed` | 35 | ✅ |
| `catalog media` | 274 files | ✅ |
| `food-db` | 23 | ✅ |
| `coaching` | 37 | ✅ |
| `policy` | 14 | ✅ |
| **Total** | **483 assertions + 274 media** | ✅ |

- `typecheck` / `lint --max-warnings 0` / `build`: ✅ clean.
- Browser E2E (`test:e2e:onboarding`): consent gate, all onboarding steps, retry — ✅ (credential-free).
- `test:e2e:auth` (live Supabase auth): **OWNER** — self-runs `supabase start`; needs a Docker daemon.
  Offline preflight verified 19 PASS · 0 FAIL here.

## 2. Automated gate — `design/v21-promotion` (flagless v2 default)

`npm ci` → `typecheck` (0) → `lint` (0) → `build` (flagless) → `test:gate` (18 suites) →
three-profile smoke (`fresh`/`reviewer`/`veteran`) **zero console errors**. ✅

- v2-default proof: no `VITE_DESIGN` flag exists in source; `DashboardView` renders `<TodayV2>`
  unconditionally; `designPreview.ts`/`uiMode.ts` deleted.

## 3. Native proof (iOS Simulator)

Both branches: `build` → `npx cap sync ios` (5 plugins, SPM) →
`xcodebuild -project ios/App/App.xcodeproj -scheme App` (iphonesimulator) **BUILD SUCCEEDED** →
install `com.qimmah.mobile` on iPhone 17 Pro (iOS 26) → launch → render → home-icon visible.
Artifacts: `docs/proof/native/wave5/*`, `docs/proof/native/promotion/*`.

## 4. OWNER release actions (cannot be automated / verified here)

- [ ] **Device verification** on a physical iPhone — **delete the app before every reinstall** that
      changes the iOS shell, icons, or storage (see `OWNER-BUILD.md`, 15-item manual list).
- [ ] **Supabase**: apply the latest migrations to the production project, then run `npm run db:verify`
      (RLS verification) against production.
- [ ] **Reset-redirect URLs**: register `com.qimmah.mobile://reset` (and the web `#/reset` URL) in the
      Supabase Auth redirect allowlist; confirm the deep-link lands on the new-password screen.
- [ ] **Live auth E2E**: run `npm run test:e2e:auth` on a machine with a Docker daemon (disposable/local
      Supabase only — never production). See `LIVE-AUTH.md`.
- [ ] **Paid Apple Developer account**: enrol / confirm active; set the signing Team in Xcode.
- [ ] **TestFlight**: archive a Release build, upload, and run internal testing.
- [ ] **App Store forms**: privacy nutrition labels, age rating, category, screenshots, description,
      keywords, support URL.
- [ ] **Legal**: finalise the legal-entity contact **email**, **domain**, and support **handle**;
      replace the `[OWNER-EMAIL]` placeholder across `site/` and store metadata.
- [ ] **Merge decision**: merging either canonical branch is the owner's word after device verification.

## 5. Do-not-do (standing directives)

- Do **not** merge `design/v21-promotion` anywhere — owner's word only, post device-verification.
- Do **not** merge `codex/v21-completion` — it overlaps commissioned systems; salvage-reviewed, no
  superior fragment (see `WAVE5-REVIEWS.md`).
