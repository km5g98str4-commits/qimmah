# Release Runbook — Qimmah (iOS + web)

End-to-end release flow with **rollback points (RP-n)** at each risk step. This is
the operational runbook; the pass/fail gate list lives in `docs/release-checklist.md`
and iOS signing in `docs/ios-setup.md`. Traces to `integration/wave3`.

## Branch model

```
feature/*  →  integration/waveN  →  main  →  (deploy)
```
- Feature branches merge into an integration `waveN` (`--no-ff`) after per-branch review.
- Waves are validated as a whole (gates below), then a **PR to `main`** — never a
  direct push. Never force-push `main` (`docs/MERGE-DEPLOY-PLAN.md` §3).
- **RP-0:** everything before the `main` PR is reversible by not merging the PR.

## Step 1 — Gates (must all pass on the release branch)

Run from the repo root (owner Mac, Node 18+):
```bash
npm ci
npm run typecheck        # tsc -b --noEmit
npm run lint             # eslint … --max-warnings 0
npm run build            # tsc -b && vite build
# all proof suites (see docs/TESTING.md):
for s in active-session today-v2 sync onboarding-async fixforward isolation reset-recovery; do npm run test:$s || break; done
```
All green ⇒ proceed. Any red ⇒ **stop, fix on the branch, re-run the FULL gate.**
- **RP-1:** gates are read-only on `main`; a failure here never touches production.

## Step 2 — Native sync + build (iOS)

```bash
npx cap sync ios          # copies dist/ + updates 5 plugins (incl. @capacitor/keyboard)
```
Open `ios/App/App.xcodeproj` in Xcode (or CLI):
```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -destination 'generic/platform=iOS Simulator' build   # smoke build
```
Verify on a simulator: launch, safe-area/StatusBar correct, no white flash
(`capacitor.config.ts` → SplashScreen `launchAutoHide:false`, StatusBar `overlaysWebView:false`).
- **RP-2:** simulator build is local; nothing shipped. Discard by not archiving.

## Step 3 — Archive → TestFlight

1. Bump `CFBundleShortVersionString` / `CFBundleVersion` in Xcode (target **App**).
   Marketing version currently `1.0.0` (`package.json`).
2. Xcode → **Product → Archive** (Release, real-device destination, signing per `docs/ios-setup.md`).
3. **Distribute App → App Store Connect → Upload** → TestFlight.
4. Internal testers smoke: onboarding → workout finish → nutrition log → progress → reset flow.
   For rich demo data use `docs/content/DEMO-ACCOUNTS.md` (dev seed, on branch `content/catalog-audit-seed`).
- **RP-3:** a bad TestFlight build is replaced by uploading a higher build number;
  testers stay on the previous build. No user impact (TestFlight only).

## Step 4 — App Store submission

1. App Store Connect → new version → attach the TestFlight build.
2. Confirm **App Privacy** labels (`docs/legal/app-privacy-labels.md`, `legal/appstore-pack`) match reality: health/fitness local, account email, anonymous analytics, no tracking.
3. Review-risk sign-off (`docs/release-checklist.md` §"App Store review risk").
4. Submit; use **phased release** so rollout is gradual.
- **RP-4 (post-release):** if a critical bug ships, in App Store Connect **pause phased
  release**, then either expedite a fix build or **remove from sale** temporarily.
  There is no "un-ship"; forward-fix via a new build is the primary path.

## Step 5 — Web / marketing site

Two deploy configs are present — **confirm the live target with the owner before relying on either:**
- `netlify.toml` (`command = npm run build`, `publish = dist`) — Netlify.
- `docs/MERGE-DEPLOY-PLAN.md` / `docs/release-checklist.md` reference **Cloudflare Pages** (project `qimmah`, auto-deploy from `main`).

> ⚠️ **Discrepancy to resolve:** the repo ships a `netlify.toml` while the release
> docs name Cloudflare Pages. Only one should be authoritative. Whichever is live
> auto-deploys from `main` on merge — so the `main` PR merge is the web deploy trigger.
- **RP-5:** web host dashboards keep prior deploys; roll back by promoting the last-good deploy.

## Backend (Supabase) release

Schema changes are **forward migrations** in `supabase/migrations/` (see `scripts/db/apply-guide.md`).
- Apply on **staging** first; verify RLS with `node scripts/db/run-verify-rls.mjs`.
- RLS own-row policies (`…120005`) and `delete_own_account` (`…120007`) must stay intact.
- **RP-6:** migrations are additive/ordered; a bad migration is corrected by a new
  forward migration (never edit an applied one). Data is local-first, so a paused
  sync never loses user data (`src/lib/syncQueue.ts` persists the queue).

## Rollback quick-map

| Point | If it goes wrong | Action |
|---|---|---|
| RP-1 gates | red | stop, fix branch, re-run full gate |
| RP-2 simulator | broken | don't archive |
| RP-3 TestFlight | bad build | upload higher build # |
| RP-4 App Store | critical bug | pause phased release / expedite fix / remove from sale |
| RP-5 web | bad deploy | promote last-good deploy |
| RP-6 Supabase | bad migration | new forward migration; sync queue protects data |
