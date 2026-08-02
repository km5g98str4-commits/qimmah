# Qimmah — Analytics Layer (internal)

Phase 2. A **lightweight, privacy-friendly, provider-abstracted** telemetry layer.
No Google Analytics, no Firebase, no advertising SDKs, no external dependency of any kind.

## Design

```
call site ──▶ track(event, props) ──▶ [consent gate] ──▶ [pre-init buffer] ──▶ provider.capture()
                                            │                                        │
                                    qimmah:analytics:v1                     noop | console | http
                                    (consent + anonId)                      (chosen at initAnalytics)
```

- **`src/lib/analytics/events.ts`** — the 15 event names (single source of truth) + a strict
  per-event props type. Nothing outside this list can be tracked; TypeScript rejects unknown
  names/props at every call site.
- **`src/lib/analytics/provider.ts`** — the `AnalyticsProvider` contract (`capture`, optional
  `flush`) + `setProvider`/`getProvider` registry. **Swap the destination by changing one line.**
- **`src/lib/analytics/consent.ts`** — consent state + anonymous id, both in
  `qimmah:analytics:v1`. Opt-out model (default `granted`).
- **`src/lib/analytics/milestones.ts`** — `firstOnce()` backing the three `first_*` events
  (`qimmah:analytics:milestones:v1`).
- **`src/lib/analytics/index.ts`** — public facade: `initAnalytics()`, `track()`, `getConsent()`,
  `setConsent()`, `firstOnce()`. Buffers events fired before init, flushes after.
- **`src/lib/analytics/providers/`** — `noop` (default), `console` (DEV), `http` (activated only
  when `VITE_ANALYTICS_ENDPOINT` is set **and is a valid HTTPS URL**; batched
  `sendBeacon`/`fetch keepalive`). Empty, non-HTTPS, or malformed endpoint ⇒ **no network
  provider** (console in DEV, no-op in prod).

## Events (exactly 15 — scope is closed)

| Group | Event | Props (non-identifying only) | Fires at |
|---|---|---|---|
| Activation | `onboarding_completed` | `planMode: 'auto'\|'custom'` | `PlanBuilder` finish |
| Activation | `first_workout_logged` | — | first ever workout, via `firstOnce` |
| Activation | `first_meal_logged` | — | first ever meal, via `firstOnce` |
| Core | `workout_logged` | `exercises: number, prs: number` | `finishWorkout.persistFinishedSession` |
| Core | `meal_logged` | `mealSlot?: string` | `nutritionTracking.addLog` (not in demo mode) |
| Core | `app_opened` | — | `App` bootstrap effect (once per load) |
| Funnel | `signup_started` | — | `LoginView` submit (signup branch) |
| Funnel | `signup_succeeded` | `needsConfirmation: boolean` | `LoginView` on `signUp` ok |
| Funnel | `onboarding_step_viewed` | `step: number, key: string` | `PlanBuilder` on each step change |
| Funnel | `onboarding_abandoned` | `step: number` | `PlanBuilder` back-out from step 0 |
| Feature health | `barcode_scan_result` | `result: 'found'\|'not-found'\|'network-error'` | `ScanFoodPanel.handleDetected` |
| Feature health | `reminder_enabled` | `kind: 'training'` | `ProgressView` reminder toggle off→on |
| Feature health | `plan_generated` | `source: 'onboarding'\|'custom'` | `PlanBuilder` auto build + custom save |
| Stability | `unhandled_error` | `source, name?` | error boundaries + window `error`/`unhandledrejection` |
| Stability | `route_changed` | `route: string, from?: string` | `App` on `view` change |

## Privacy guarantees

- **Default opt-out model.** Analytics defaults to `granted` (anonymous, non-PII usage stats
  on a legitimate-interest basis) with a **clear off switch** in Settings → Privacy. Turning it
  off sets consent `denied` and stops all collection immediately — see *Consent* below. The
  consent model is opt-out by design; nothing in these fixes changes that.
- **Anonymous only.** The id is a random `crypto.randomUUID()` stored locally. It is **never**
  the Supabase `user.id`, email, or display name. No event carries the auth identity.
- **No PII in any payload.** Props are enums/counts/route names only — never a dish name,
  the scanned barcode value, an error message/stack, weight/measurement values, or free text.
  `unhandled_error` sends the error *name* (e.g. `TypeError`), not the message. The strict
  per-event types in `events.ts` make it impossible to attach an out-of-contract field.
- **Consent-gated, stops instantly.** `setConsent('denied')` (a) blocks every future `track()`,
  (b) **clears the in-memory pre-init buffer**, and (c) calls the provider's `reset()` to
  **drop the queued batch and cancel the pending flush timer** — so a queued event can no longer
  be flushed by `pagehide`/`visibilitychange` after opt-out. `getConsent()`/`setConsent()` are
  the only controls.
- **HTTPS-only endpoint.** The HTTP provider is created **only** for a syntactically valid
  `https:` URL. An empty, non-HTTPS (e.g. `http://`), or malformed `VITE_ANALYTICS_ENDPOINT`
  yields no network provider (console in DEV, no-op in prod) — the app never sends analytics
  over plain HTTP or to an invalid destination.
- **Wiped on account deletion.** `resetQimmah()` first calls `resetAnalytics()` — which clears
  the provider queue/timer **and the in-memory consent+anonId cache** — then removes
  `qimmah:analytics:v1` + `qimmah:analytics:milestones:v1` from `localStorage`. So neither the
  stored nor the cached identity survives; a fresh anonymous id is minted afterward.
- **No network by default.** Production builds with no valid `VITE_ANALYTICS_ENDPOINT` send
  nothing (no-op provider). The HTTP provider is opt-in via env and batches over `sendBeacon`.
- **Fail-safe.** Every `track()` is wrapped in try/catch and no-ops outside the browser; the
  layer can never throw into the render path.

## App Store privacy label implications

If this app is submitted with analytics **enabled** (i.e. a real HTTPS endpoint configured),
declare the following in App Store Connect → App Privacy:

- **Usage Data → Product Interaction / Other Usage Data:** collected. Purpose: **Analytics** and
  **App Functionality** only.
- **Linked to identity: NO.** The anonymous id is a random local UUID with no link to the user's
  Supabase account, email, or name; it is not merged with identity anywhere.
- **Used for Tracking: NO.** No cross-app/website tracking, no advertising identifiers, no data
  sharing with third-party ad networks or data brokers. No advertising SDK is present.
- **Diagnostics → Crash/Other Diagnostic Data:** the `unhandled_error` event carries only an
  error *name* (no message/stack), so if enabled, declare Diagnostics too (Analytics purpose).

If the app ships with **no endpoint** (the default), nothing is transmitted off-device and the
usage-data declaration can reflect "not collected" for the transmitted-data sense — but confirm
the shipped configuration before filling the labels. Keep this section in sync with
`docs/ios/milestone-4a-backend-privacy.md`.

## Verify events in the dev console

1. `npm run dev` (DEV build ⇒ the console provider is active automatically).
2. Open the browser devtools **Console**.
3. Exercise a flow; each event logs as
   `[analytics] <event_name>  { ...props, anonId, ts }` (orange label).
   - Load the app → `app_opened`, then `route_changed`.
   - Sign up → `signup_started`, `signup_succeeded`.
   - Walk onboarding → `onboarding_step_viewed` per step → `plan_generated` → `onboarding_completed`.
   - Finish a workout → `workout_logged` (+ `first_workout_logged` the first time).
   - Log a dish → `meal_logged` (+ `first_meal_logged` the first time).
   - Scan a barcode → `barcode_scan_result`.
   - Toggle the training reminder on → `reminder_enabled`.
4. Toggle **Settings → Privacy → Anonymous analytics** off → the console goes silent (consent
   `denied`); toggle on → events resume.
5. To test the real network path in dev, set `VITE_ANALYTICS_ENDPOINT` to a valid **HTTPS** URL
   in `.env` and watch the **Network** tab for batched POSTs to that URL instead of console logs.
   (An `http://`, malformed, or empty value logs a dev warning and sends nothing.)

## Swapping the provider later

Implement `AnalyticsProvider` and call `setProvider(myProvider)` inside `initAnalytics()`
(or replace `createHttpProvider`). No call site changes — all 15 `track()` sites stay identical.
