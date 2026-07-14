# App Review — Reviewer Notes + Demo Account Plan

> Goes in **App Store Connect → App Review Information → Notes** (and Sign-In section).
> **Security:** this file contains **no real credentials or keys** — the demo login is a placeholder the owner fills at submission. Do not paste the Supabase anon key here (it is public-by-design but irrelevant to review).

## Notes (paste into App Review → Notes)

Qimmah is an **Arabic-first** fitness app (UI defaults to Arabic, right-to-left). English is available via the **language toggle on the Welcome screen (top corner)** and in **Settings → General → Language**. Reviewing in Arabic is expected and correct.

**Account is required to use the app.** All main tabs are behind sign-in (no guest mode). Please use the demo account below. New accounts require **email verification** before entering the app, so the demo account is pre-verified — no email step needed for you.

**How to reach the main experience:**
1. Welcome → **تسجيل الدخول / Log in** with the demo credentials.
2. If onboarding appears: pick a goal → training days/length → place/equipment → **Enter**. (The demo account is pre-onboarded, so you should land directly on **Today**.)
3. Bottom tabs: **Today · Workout · Nutrition · Progress**; **Profile** via the avatar / Settings.

**Barcode scanning (Nutrition):** Nutrition tab → **إضافة طعام / Add food** → **barcode** button → allow camera → point at any retail grocery **EAN-13/UPC** barcode. Lookup uses the public **Open Food Facts** API (only the barcode number is sent; no user data). If no barcode is handy, **search by name** or **Add manually** works without the camera. Camera use is solely on-device barcode decoding; **no photo/video is stored or transmitted** (`Info.plist NSCameraUsageDescription`).

**Privacy:** No ads, no third-party tracking SDKs, no ATT prompt (not required). Day-to-day data (nutrition, water, steps, achievements) is device-only; account sync covers workouts/measurements/profile. Users can delete their account and data in-app (Profile → Privacy & data → Delete account). Details: `docs/legal/app-privacy-labels.md`.

**No special hardware** beyond the optional camera for barcodes. No login with third-party providers. No web browser, no user-generated public content, no gambling.

---

## Sign-In section (App Review Information → "Sign-in required" = YES)

| Field | Value |
|---|---|
| Sign-in required | **YES** |
| User name | `OWNER-DECISION → paste demo email` (e.g. `appreview@qimmah.app`) |
| Password | `OWNER-DECISION → paste demo password` (do NOT reuse a personal password) |

---

## Demo account seeding steps (owner runs BEFORE submitting)

Do this on the **same build you will upload** (so the account state matches):

1. **Create** the demo account in-app (Sign up) with the review email/password above.
2. **Verify email** (click the link) — required, else App Review can't enter. Confirm you can log in and reach **Today**.
3. **Complete onboarding** once (goal + days + equipment) so a real plan exists → lands on Today with a program.
4. **Log one workout**: Workout tab → start the session → complete a couple of sets → **Save & finish**. (Gives Progress + Profile real data instead of empty states.)
5. **Log one meal + water**: Nutrition tab → add a meal (search or barcode) + a water quick-add. (So Nutrition rings show progress.)
6. **Optional**: add one weight entry (Progress → Weight → Log today's weight) so the trend chart renders.
7. Confirm **Profile** shows non-zero stats, then note the credentials in App Store Connect.

> Result: reviewer logs in and immediately sees populated Today / Workout / Nutrition / Progress / Profile surfaces — no empty-state confusion.

---

## ⚠️ Build gotcha the owner MUST honor (OWNER-DECISION)

The v2.1 surfaces (the ones in the screenshots) render **only** when the uploaded build is compiled with the promotion flag:

```
VITE_DESIGN_V2=true npm run build && npx cap sync ios
```

A normal build (`npm run build`) is **byte-identical to v1** and will NOT show the v2.1 UI (`src/design-system/designPreview.ts:41-46`). **If the wrong build is uploaded, the reviewer and every user sees v1, not the reviewed/screenshotted app.** Verify the Today screen shows the "مسار اليوم" four-ring path before archiving in Xcode.
