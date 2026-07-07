# Qimmah — Release Checklist (internal)

## Gates (must pass — CI-equivalent)
- [ ] `npm run typecheck` (tsc strict, no errors)
- [ ] `npm run lint` (eslint, `--max-warnings 0`)
- [ ] `npm run build` (vite production build)
- [ ] `npx cap sync ios` (native assets updated)
- [ ] `npx cap doctor` (only "Xcode not installed" acceptable off-macOS)

## Web / Cloudflare Pages
- [ ] `main` deploys to production (`qimmah-8qp.pages.dev`); preview branches to subdomains.
- [ ] `BUILD_LABEL` (footer/console) shows the deployed commit hash.
- [ ] `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` point to the **production** Supabase
      project (not the shared template default hardcoded in `supabaseClient.ts`).

## Backend / Supabase (see `docs/ios/milestone-4a-backend-privacy.md`)
- [ ] RLS enabled on all 5 user tables with own-row select/insert/update/**delete** policies.
- [ ] `delete_own_account` function deployed (security definer, granted to `authenticated`).
- [ ] Verified account deletion end-to-end with a throwaway account (auth user + all 5
      tables gone).
- [ ] Email confirmation flow works (Supabase Auth email templates configured).

## Privacy / App Store Connect
- [ ] Public Privacy Policy URL live (not just in-app).
- [ ] Support URL / contact live.
- [ ] App Privacy Labels filled: Email + Health/Fitness + User Content + User ID, linked to
      identity, **no tracking**, **no third-party ad sharing**.

## iOS build (on Mac)
- [ ] Official app icons + splash generated (`@capacitor/assets`) — no default placeholders.
- [ ] Signing Team set; provisioning profile valid.
- [ ] `NSCameraUsageDescription` present (barcode).
- [ ] Runs on a real device: safe areas (notch/home indicator), keyboard, scrolling,
      camera permission prompt + scan, offline behavior.
- [ ] No visible "coming soon"/disabled placeholder controls (removed in hardening).

## App Store review risk sign-off
- [ ] 4.2 minimum functionality — at least one native capability (recommend local reminders)
      or a clear justification.
- [ ] 3.1.1 IAP — iOS v1 is free; no external purchase paths in the native build.
- [ ] 5.1.1(v) — in-app account deletion present and functional.
- [ ] No medical claims; health disclaimers present.

## Product QA
- [ ] First-run: Sign Up → onboarding → dashboard → log a workout → log a dish → see it in
      weekly progress.
- [ ] Language toggle ar⇄en switches text + direction everywhere.
- [ ] Data survives app restart and (signed in) syncs to cloud.
