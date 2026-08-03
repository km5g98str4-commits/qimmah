# App Store — App Privacy Labels (fill-in sheet)

> **Draft for owner review — not legal advice.** Follow this verbatim in **App Store Connect → App Privacy**.
> Grounded in `DATA-INVENTORY.md`. Apple’s rule: data is **“Collected”** only if it is **transmitted off the
> device** or handled by a third-party SDK. With optional sync enabled, nutrition, water, steps, achievements,
> plans, and tasks can leave the device and therefore must be disclosed as collected.
>
> **Two answers depend on the production build config — set them by the checkbox below:**
> - [x] **Diagnostics/Usage Data = Not Collected** — now a *structural* fact, not a build-time choice.
>   [CTO-71] deleted the transmit-capable analytics layer outright; there is no endpoint variable and no
>   HTTP provider in the codebase. Usage events are written to a local ring buffer (`src/lib/tracking/`)
>   that has **no network primitive at all** — guarded by `test:analytics`.
> - [ ] The App Store build **does NOT** set `VITE_SENTRY_DSN` → crash diagnostics are not transmitted (default).
> - [ ] The App Store build **DOES** set `VITE_SENTRY_DSN` → disclose Diagnostics → Crash Data as not linked and not used for tracking.

## A. Tracking — the top question
**Does this app use data for tracking?** → **NO.**
Justification: no ads, no data brokers, and no third-party analytics/attribution SDK; optional Sentry is limited
to scrubbed error monitoring and is not used for cross-app/cross-site tracking. The only
optional identifier (`anonId`) is app-generated, random, and explicitly **not** linked to the account or shared
for cross-app/cross-site tracking (`analytics/provider.ts:9-12`). No ATT prompt is needed.

> **Verified against Apple's published definitions (adversarially confirmed, 3-0):**
> - Apple: *“Tracking refers to … linking user or device data collected from your app with … data collected
>   from other companies' apps, websites, or offline properties for targeted advertising or advertising
>   measurement … or sharing … with data brokers.”* → Qimmah does none of these ⇒ **Tracking = No.**
>   Source: <https://developer.apple.com/app-store/user-privacy-and-data-use/> and
>   <https://developer.apple.com/app-store/app-privacy-details/>
> - Apple: *“Collect refers to transmitting data off the device and storing it … for longer than the time it
>   takes to service the request.”* → the app’s optional sync makes the synced health/fitness records Collected.
> - Apple: data *“linked solely on the end-user's device and … not sent off the device in a way that can
>   identify the end-user or device”* is **not** tracking ⇒ no ATT required.
> **Common fitness-app mistake:** declaring Health/Fitness as *tracking* or showing an ATT prompt for
> first-party, non-advertising analytics — not required here.

## B. Data types — enter each as Collected? / Linked to identity? / Used for tracking? + purpose

| Apple data type | Collected? | Linked to user? | Tracking? | Purpose(s) to select | Justification (code) |
|---|---|---|---|---|---|
| **Contact Info → Email Address** | **Yes** | **Yes** | No | App Functionality | Account sign-in (`authContext.tsx:62`) |
| **Contact Info → Name** | **Yes** | **Yes** | No | App Functionality | Optional display name (`authContext.tsx:62,121`) |
| **Health & Fitness → Health** | **Yes** | **Yes** | No | App Functionality | Body measurements, nutrition, water, and supplements/medications can sync (`syncService.ts`, `syncStores.ts`) |
| **Health & Fitness → Fitness** | **Yes** | **Yes** | No | App Functionality | Workouts, sets, reps, PRs, manual/opt-in HealthKit steps, and achievements can sync (`healthKit.ts`, `syncStores.ts`) |
| **Identifiers → User ID** | **Yes** | **Yes** | No | App Functionality | Supabase `user_id` keys all synced rows (`syncService.ts:141`) |
| **User Content → Other User Content** | **Yes** | **Yes** | No | App Functionality | Free-text daily/commitment notes synced in `daily_logs` (`commitmentTracking.ts:49`) |
| **Usage Data → Product Interaction** | **Only if analytics endpoint set** (else **No**) | **No** | No | Analytics | Anonymous event counts, random `anonId`, no PII (`analytics/events.ts:4-45`) |
| **Diagnostics → Crash Data / Other** | **Only if analytics endpoint or Sentry DSN is set** (else **No**) | **No** | No | Analytics | Anonymous `unhandled_error`, or scrubbed Sentry exception/release/navigation data (`monitoring.ts`) |

## C. Data types to mark **NOT Collected** (with the reason, in case Apple asks)

| Apple data type | Why Not Collected |
|---|---|
| **Precise/Coarse Location** | No location API or permission (`Info.plist` has no `NSLocation*`) |
| **Financial Info / Purchases** | No active subscription/IAP in this version (Terms §8) |
| **Contacts** | No contacts access |
| **Browsing / Search History** | Not collected |
| **Identifiers → Device ID (IDFA/IDFV)** | Not accessed; no `AdSupport`/`AppTrackingTransparency` |
| **Sensitive Info** | Medications/supplements are declared under Health & Fitness → Health (above), not sold/shared |
| **Photos or Videos** | Camera frames are decoded on-device for barcodes and never stored/transmitted (`Info.plist NSCameraUsageDescription`) |

## D. Third parties to note (context for the review team; not a separate label field)
- **Supabase** — processor for auth + synced data (§B rows).
- **Open Food Facts** — receives only the scanned barcode number, no user data (`openFoodFacts.ts:88`).
- **GitHub/jsDelivr** — serves exercise demo images; receives an image request (device IP), no user data.
- **YouTube** — external search link only (no in-app embed/SDK).
- **Sentry** — optional error processor only when `VITE_SENTRY_DSN` is configured; PII/storage payloads are scrubbed before send.
- **Apple Health** — read-only source for daily step totals after an explicit settings action; no advertising/tracking use.

## E. Reminder before submitting
- The analytics row is settled structurally (see header). Only `VITE_SENTRY_DSN` still depends on the build.
- Confirm the Supabase project has RLS enabled (data-isolation claim) — **OWNER-TO-CONFIRM**.
- App age rating: eligibility age is **12** (Terms §3). Answer Apple's 2025 age-rating questionnaire
  truthfully for the app's fitness/wellness content and let Apple **compute** the band; ensure the stated
  **12+** eligibility is not below Apple's computed band. Note 12 < 13: keep the app out of the Kids Category
  and use no child-directed data practices (it already has **no ads and no tracking**). See the App Store
  pack `docs/appstore/03-age-rating.md`.
