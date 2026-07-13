# App Store — App Review notes + demo account plan

> Paste the "Review Notes" block into App Store Connect → App Review Information → Notes.
> Fill the demo credentials placeholders after the owner seeds the account.

## Review Notes (paste into App Store Connect)

```
Qimmah is an Arabic-first (RTL) fitness & nutrition app for the Saudi/Gulf market.

LANGUAGE
- The UI defaults to Arabic. To review in English: open the app → Settings (الإعدادات) →
  Language toggle → English. All primary screens are localized.

SIGN-IN / ACCOUNT
- Email + password only (Supabase). No third-party/social login, so Sign in with Apple is
  not applicable (Guideline 4.8 exception — own account system only).
- Account deletion is in the app: Settings → Account → Delete account (type-to-confirm).
  It permanently deletes the account and its data (Guideline 5.1.1(v)).
- Demo account below is pre-seeded so all screens show real data.

CAMERA (barcode only)
- The only permission is Camera, used solely to scan food-product barcodes
  (NSCameraUsageDescription states this). To test: Nutrition (التغذية) → Add meal →
  Scan → point at any packaged-food EAN/UPC barcode. Known-good test barcode: [OWNER-PROVIDES,
  e.g. a common bottled-water EAN-13]. If a barcode isn't in the Open Food Facts database,
  the app shows an honest "not found" state — that is expected behavior, not a bug.
- No photos are stored or transmitted; frames are decoded on-device.

PRIVACY
- No ads, no third-party tracking, no ATT prompt. Analytics are off by default. Data is
  local-first; cloud sync runs only when signed in.

REMINDERS
- Local notifications only, requested only when the user enables a workout reminder
  (Settings) — never at launch. No push server.

NOTES
- Fitness/nutrition guidance only; medication/supplement entries are user tracking, not
  medical advice (disclaimers in-app).
```

## How the reviewer reaches the v2.1 surfaces  ⚠ OWNER-DECISION
The v2.1 design renders **only** when the build is produced with **`VITE_DESIGN_V2=true`**
(`src/design-system/designPreview.ts`). The **submitted archive must be built with that flag on**,
or App Review will see the v1 UI (and the screenshots won't match).
- **Owner action:** build with `VITE_DESIGN_V2=true npm run build` before `npx cap sync ios`, then
  archive. Confirm the shipped screens match the screenshots (`04-screenshots-plan.md`).
- If v1 is intentionally shipped for v1.0, regenerate screenshots from v1 instead — keep listing and
  build consistent. **Decide which surface ships and keep everything aligned.**

## Demo account plan (owner seeds; reviewer uses)
Provide a demo account on the **production** Supabase project (so sync + deletion work end-to-end).

**Credentials (fill after seeding):**
- Email: `demo@qimmah.app` (or an owner-chosen reviewer inbox) — **[OWNER-TO-CREATE]**
- Password: `[OWNER-SETS-STRONG-PASSWORD]`

**Seeding steps the owner runs (once):**
1. Sign up the demo user in the app (or via Supabase dashboard) on the production project.
2. Complete onboarding fully (goal + body + schedule + a couple of meals/wellness answers) so a
   plan is generated (`SetupView` → `planGenerator`).
3. Log **one workout** in Active Workout mode (a few sets) so Progress/PRs populate.
4. Log **one meal** (search or barcode) and **water**, and **one weight** entry, so Nutrition +
   Progress screens aren't empty.
5. Optionally add one supplement + one medication (to show the wellness tracker).
6. Verify the six review surfaces render with data, in Arabic, then hand the credentials to review.

> Keep the demo account's data non-sensitive and generic. Because account deletion is testable, do
> **not** reuse the demo account for anything else — if a reviewer deletes it, re-seed before the next
> submission.

**TO-CONFIRM:** demo credentials; a known-good test barcode number; that the submitted build's
`VITE_DESIGN_V2` matches the screenshots.
