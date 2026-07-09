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
  when `VITE_ANALYTICS_ENDPOINT` is set; batched `sendBeacon`/`fetch keepalive`).

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

- **Anonymous only.** The id is a random `crypto.randomUUID()` stored locally. It is **never**
  the Supabase `user.id`, email, or display name. No event carries the auth identity.
- **No PII in any payload.** Props are enums/counts/route names only — never a dish name,
  the scanned barcode value, an error message/stack, weight/measurement values, or free text.
  `unhandled_error` sends the error *name* (e.g. `TypeError`), not the message.
- **Consent-gated (opt-out).** Default `granted`; a Settings toggle sets `denied`, after which
  `track()` collects nothing. `getConsent()`/`setConsent()` are the only controls.
- **Wiped on account deletion.** `qimmah:analytics:v1` + `qimmah:analytics:milestones:v1` are in
  `QIMMAH_KEYS`, so `resetQimmah()` clears the id, consent, and milestones; a new anonymous id
  is minted afterward (the old analytics identity is severed).
- **No network by default.** Production builds with no `VITE_ANALYTICS_ENDPOINT` send nothing
  (no-op provider). The HTTP provider is opt-in via env and batches over `sendBeacon`.
- **Fail-safe.** Every `track()` is wrapped in try/catch and no-ops outside the browser; the
  layer can never throw into the render path.

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
5. To test the real network path in dev, set `VITE_ANALYTICS_ENDPOINT` in `.env` and watch the
   **Network** tab for batched POSTs to that URL instead of console logs.

## Swapping the provider later

Implement `AnalyticsProvider` and call `setProvider(myProvider)` inside `initAnalytics()`
(or replace `createHttpProvider`). No call site changes — all 15 `track()` sites stay identical.
