# Qimmah — Data Inventory (code-grounded)

> **Draft for owner + legal review — NOT legal advice.** Every row traces to a file/line read in
> `origin/integration/wave2` (`f0cf693`). Where the answer is not decidable from the repo (e.g. the
> hosting region of the Supabase project, or whether a production build sets an analytics endpoint),
> the cell is marked **OWNER-TO-CONFIRM**. No practice is asserted that is not in the code.

## 0. Foundational facts (verified)

| Fact | Evidence |
|---|---|
| **No third-party analytics/ads/attribution SDK** (no Firebase, GA, Meta, AppsFlyer, Amplitude, Mixpanel, Sentry) | `package.json` dependencies — only Capacitor, `@supabase/supabase-js`, `@zxing/*` (barcode), `lucide-react`, `react`, `react-body-highlighter`, `@fontsource/*` |
| **No IDFA / App Tracking Transparency / advertising APIs** | grep of `src` + `Info.plist`: no `AppTrackingTransparency`, `advertisingIdentifier`, `IDFA`, `AdSupport` |
| **No location, contacts, photo-library, or microphone access** | `Info.plist` declares only `NSCameraUsageDescription`; no `NSLocation*`, `NSContacts*`, `NSPhotoLibrary*`, `NSMicrophone*` |
| **Fonts are self-hosted (bundled), no font-CDN egress** | `src/design-system/fonts.ts:1` (“Self-hosted fonts — bundled via @fontsource … NO runtime”); `index.html:78` |
| **Local-first architecture** — device is source of truth, cloud is optional backup | `src/lib/syncService.ts:1-11` |
| **First-party diagnostics are OFF by default** (noop) — HTTP egress only if `VITE_ANALYTICS_ENDPOINT` is set at build time | `src/lib/analytics/index.ts:44-64` |

## 1. Data categories

| # | Category | Exactly what | Where stored | Purpose | Linked to identity? | Tracking? | Third parties | Evidence (file:line) |
|---|---|---|---|---|---|---|---|---|
| 1 | **Account credentials** | Email, password, optional display name | Supabase Auth (server); session JWT on device (`qimmah:supabase-auth:v1`) | Sign-in, cloud sync | **Yes** | No | Supabase | `authContext.tsx:62`; `supabaseClient.ts:80-84` |
| 2 | **Profile & body metrics** | Name, age (input 12–90), gender, height, weight, target weight, experience level, goal (تنشيف/محافظة/تضخيم) | Device (`customization:v1`, `onboarding:profile:v1`) + Supabase `profiles.data` when signed in | Build plan; BMR/calorie targets | **Yes** (when signed in) | No | Supabase | `StepBody.tsx:77`; `validation.ts:6`; `calculators.ts:125`; `onboardingSync.ts:69` |
| 3 | **Workout logs** | Session date/time, exercises, sets, weights, reps | Device (`history:workoutSessions:v1`) + Supabase `workout_sessions` | Progress, plan adaptation | **Yes** | No | Supabase | `syncService.ts:141`; `workoutSessions.ts:42` |
| 4 | **Exercise performance history** | Per-exercise best/last weight, reps, est. 1RM, streaks | Device (`history:exerciseHistory:v1`) + Supabase `exercise_history` | Personal records, strength trend | **Yes** | No | Supabase | `syncService.ts:153`; `exerciseHistory.ts:12` |
| 5 | **Body measurements** | Weight, waist, body-fat %, other measures + notes | Device (`history:measurementLogs:v1`) + Supabase `measurement_logs` | Weight/body trend | **Yes** | No | Supabase | `syncService.ts:166` |
| 6 | **Daily logs** | Commitment checkmarks + **free-text notes**, workout-completed flag, generic “today” flags | Device (`history:dailyLogs:v1`) + Supabase `daily_logs` | Consistency/streaks | **Yes** | No | Supabase | `syncService.ts:178`; `historyStore.ts` (`DailyLog`); `commitmentTracking.ts:49` |
| 7 | **Supplements & medications** | Names of tracked supplements/medications (+ daily checkmarks) | Names in `profiles` (via profile) → **synced**; daily checkmarks device-only (`wellnessToday:v1`) | Wellness tracking | **Yes** (names) | No | Supabase | `customization.ts:30-31,84-96`; `onboardingSync.ts:69` |
| 8 | **Injuries / limitations** | Selected injury areas (knee, shoulder, …) | `profiles` (via profile) → synced | Exclude unsafe exercises | **Yes** | No | Supabase | `design-system/v2/labels.ts` (injuries); `onboardingSync.ts:69` |
| 9 | **Nutrition logs** | Logged foods, calories, macros | **Device-only** (`nutritionToday:v1`, `history:nutritionLogs:v1`, `nutrition:v2`) — **not** in the sync engine | Daily nutrition tracking | Device-only | No | — | `syncService.ts` (no nutrition table); `nutritionV2Model.ts:14` |
| 10 | **Water intake** | Daily ml logged | **Device-only** (`nutrition:v2` / `history:waterLogs:v1`) — not synced | Hydration tracking | Device-only | No | — | `nutritionV2Model.ts:61`; `syncService.ts` (absent) |
| 11 | **Steps** | Manually entered daily step count | **Device-only** (`steps:v1`) — **no HealthKit/Google Fit** (deferred) | Movement pillar | Device-only | No | — | `stepCounter.ts:2,16-21` |
| 12 | **Achievements** | Earned badges/milestones | **Device-only** (`achievements:v1`) — not synced | Motivation | Device-only | No | — | `syncService.ts` (absent) |
| 13 | **Barcode (food) scans** | The scanned **barcode number** only (product lookup) | Sent to Open Food Facts; result cached on device (`off:cache:v1`) | Look up product nutrition | No | No | **Open Food Facts** | `openFoodFacts.ts:88-89` |
| 14 | **Camera** | Live frames decoded **on-device** for barcodes; images not stored or transmitted | Not stored | Barcode scanning only | No | No | — | `Info.plist` (`NSCameraUsageDescription`); `BarcodeCamera.tsx` (zxing) |
| 15 | **Exercise demo media** | Fetches static demo images by exercise | Loaded from GitHub raw / jsDelivr CDN; local fallback frame | Show exercise form | No (no user data sent) | No | **GitHub / jsDelivr** | `exerciseMedia.ts:29`; `ExerciseMedia.tsx:66` |
| 16 | **“Watch form” video** | Opens an **external** YouTube *search* URL (no embed, no SDK) | N/A (external browser) | Optional form reference | No | No | YouTube (external link only) | `workoutPlan.ts:92`; `exercises.ts:13` |
| 17 | **Diagnostics / product analytics** | Anonymous event counts (e.g. `workout_logged`, `route_changed`) — **counts/enums only, never id/email/name/barcode** | **None by default** (noop). If `VITE_ANALYTICS_ENDPOINT` set → batched to that endpoint | Product health | No (random `anonId`, unlinked) | No | Owner-chosen endpoint (**OWNER-TO-CONFIRM**) | `analytics/index.ts:44-64`; `analytics/events.ts:4-45`; `analytics/provider.ts:9-12` |
| 18 | **Device preferences** | Language, UI density, install/banner-dismissed flags, v2 design flag | Device-only (survive account wipe) | UX | No | No | — | `accountScope.ts:25-38` |
| 19 | **Reminders** | Local notification schedule (training) | Device-only via Capacitor Local Notifications; **no network** | Workout reminders | No | No | — | `reminders.ts:34,109-115` |

## 2. What leaves the device, to whom

| Destination | Trigger | Payload | Contains identity/PII? |
|---|---|---|---|
| **Supabase** (`ledlypcyrtnzvjvhykwz.supabase.co`, or `VITE_SUPABASE_URL`) | Sign-in + sync (signed-in users only) | Categories 1–8 above (profile, workouts, measurements, daily logs, meds/supplements/injuries), keyed by `user_id` | Yes (account-linked health/fitness data) |
| **Open Food Facts** (`world.openfoodfacts.org`) | User scans/searches a food barcode | Barcode number + static `User-Agent: Qimmah/1.0` | No |
| **GitHub raw / jsDelivr** | Viewing an exercise with a remote demo image | HTTP GET for the image (device IP visible to CDN) | No |
| **YouTube** (`youtube.com/results?...`) | User taps “watch form” | Opens external search URL in the browser | No |
| **Analytics endpoint** | Only if `VITE_ANALYTICS_ENDPOINT` configured **and** consent granted | Batched anonymous event counts (`{events:[…]}`) with random `anonId` | No |

Hosting region of the Supabase project is not encoded in the repo → **OWNER-TO-CONFIRM** (cross-border transfer, §PDPL).

## 3. Account deletion (verified end-to-end)

1. `supabase.rpc('delete_own_account')` — a security-definer Postgres function deletes the caller’s auth user; **no service-role key in the client**. `authContext.tsx:374`.
2. If the RPC fails (e.g. not deployed), the app deletes **no** rows and does **not** end the session — no partial delete, no false success. `authContext.tsx:382-385`.
3. On success, best-effort self-delete of rows in `profiles`, `workout_sessions`, `exercise_history`, `measurement_logs`, `daily_logs` (RLS, keyed by `user_id`). `authContext.tsx:388-397`.
4. Local wipe: every `qimmah:*` key except a small public allowlist (language, UI flags, anonymous caches) is removed, plus the accounts registry and auth session; analytics in-memory state reset. `resetQimmah.ts:22-42`; `accountScope.ts:25-38`.

## 4. Consent posture (flag for §PDPL)

Analytics consent **defaults to `granted`** (`consent.ts:18` `DEFAULT_CONSENT = 'granted'`) — an opt-out model. This is inert while the provider is `noop` (no endpoint), but if an endpoint is ever configured it would collect anonymous events without an explicit opt-in. See PDPL gap checklist item C-1.

## 5. Second-pass verification (security-review data-flow lens)

Re-checked every store and egress against the code to confirm nothing was missed:

- **Per-store sync status — exhaustive.** Confirmed **device-only, never synced** (not referenced in `syncService.ts` or `onboardingSync.ts`): `achievements`, `customPlan`, `commitmentsToday`, `steps`, `stepGoal`, `nutrition:v2`, `nutritionToday`, `wellnessToday`, `active-workout`, `workout-summary`, `todo`, `reminders`, `products`. Only `workout_sessions`, `exercise_history`, `measurement_logs`, `daily_logs`, and `profiles` leave the device. (Note: daily commitment state reaches the server via `daily_logs` even though the `commitmentsToday:v1` key itself isn’t uploaded — captured in category #6.)
- **No file/photo uploads.** No `storage.from` / `.upload(` / `getPublicUrl` / `createSignedUrl` anywhere in `src`. **No Supabase Storage use.**
- **“القياسات والصور / photos” is a label + type only.** `MeasurementCategory` includes `'photo'` (`types/progress.ts:44`) and the Profile row reads “measurements & photos”, but **no progress-photo capture or upload is implemented**. The only photo handling is `features/products/reviewPanel` — an **internal staff tool gated to `import.meta.env.DEV`** (unreachable in production, `App.tsx`) that displays Open-Food-Facts product images by URL, not user photos. **Camera = barcode decoding only.**
- **Runtime remote media = exercise demo images only** (`exerciseMedia.ts` → GitHub/jsDelivr); other media (`machineImages`, gifs) are bundled/local — no additional runtime egress.
- **Conclusion:** the inventory in §1 is complete; no additional data flow (steps, achievements, water, photos, storage) was found beyond what is listed.
